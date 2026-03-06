/**
 * 食事RawData（base64画像付き）インポートスクリプト
 * 使い方: npx ts-node --project tsconfig.scripts.json scripts/import-raw-food-data.ts
 *
 * 処理内容:
 *   1. 既存の meal_summary / food_raw_log を削除
 *   2. RawData.csv から base64画像 → Firebase Storage にアップロード
 *   3. meal_summary / food_raw_log を実データで再作成
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { parse } from 'csv-parse';
import { parse as parseSync } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (getApps().length === 0) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const storage = getStorage();
const UID = 'tqUkyNIfUrXmD7hfemPbcny2DAY2';
const DOWNLOADS = path.join(process.env.HOME ?? '', 'Downloads');
const MAX_BATCH = 400;

// 時間帯からmealTypeを判定
function getMealType(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour <= 10) return '朝食';
  if (hour >= 11 && hour <= 15) return '昼食';
  if (hour >= 16 && hour <= 21) return '夕食';
  return '間食';
}

// タイムスタンプを分単位で正規化（グルーピングキー）
function toMinuteKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
}

interface FoodItem {
  menu: string;
  estimatedAmount: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  otherNutrients: string;
  base64: string;
}

interface MealGroup {
  mealTime: Date;
  mealType: string;
  aiSummary: string;
  items: FoodItem[];
}

// ============================================================
// SummaryData.csv から aiSummary と mealType のマップを作成
// ============================================================
function parseSummaryData(): Map<string, { mealType: string; aiSummary: string }> {
  const filePath = path.join(DOWNLOADS, 'カロリーPFC解析 - SummaryData.csv');
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows: string[][] = parseSync(content, { relax_column_count: true, skip_empty_lines: true });

  const map = new Map<string, { mealType: string; aiSummary: string }>();
  for (const row of rows.slice(1)) {
    const [timestampStr, mealType, , , aiSummary] = row;
    if (!timestampStr) continue;
    // 分単位のキーで照合
    const d = new Date(timestampStr.trim().replace(/\//g, '-').replace(' ', 'T') + '+09:00');
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
    map.set(key, { mealType: mealType?.trim() || '', aiSummary: aiSummary?.trim() || '' });
  }
  console.log(`  SummaryData: ${map.size}件のaiSummary/mealTypeを読み込み`);
  return map;
}

// ============================================================
// 既存データ削除
// ============================================================
async function deleteExistingData() {
  console.log('既存の meal_summary / food_raw_log を削除中...');
  const userRef = db.collection('users').doc(UID);

  for (const colName of ['meal_summary', 'food_raw_log']) {
    const snap = await userRef.collection(colName).get();
    let deleted = 0;
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += Math.min(400, snap.docs.length - i);
    }
    console.log(`  ${colName}: ${deleted}件削除`);
  }
}

// ============================================================
// CSVをストリームで読み込んで食事グループを構築
// ============================================================
async function parseCsv(): Promise<Map<string, MealGroup>> {
  console.log('\nCSVを解析中（重いので少し待ってください）...');
  const filePath = path.join(DOWNLOADS, 'カロリーPFC解析 - RawData.csv');

  // SummaryDataからaiSummaryとmealTypeを取得
  const summaryMap = parseSummaryData();

  return new Promise((resolve, reject) => {
    const groups = new Map<string, MealGroup>();
    const parser = fs
      .createReadStream(filePath)
      .pipe(parse({ relax_column_count: true, skip_empty_lines: true }));

    let isHeader = true;
    let rowCount = 0;

    parser.on('data', (row: string[]) => {
      if (isHeader) { isHeader = false; return; }

      // time(0), Image_Base64(1), メニュー(2), AI評価(3), 推定量(4),
      // カロリー(5), タンパク質(6), 脂質(7), 炭水化物(8), 食物繊維(9), その他(10)
      const [timeStr, base64, menu, , estimatedAmount, cal, prot, fat, carbs, fiber, other] = row;

      if (!timeStr || !menu) return;

      const mealDate = new Date(timeStr.trim().replace(/\//g, '-').replace(' ', 'T') + '+09:00');
      if (isNaN(mealDate.getTime())) return;

      const key = toMinuteKey(mealDate);

      if (!groups.has(key)) {
        const summary = summaryMap.get(key);
        groups.set(key, {
          mealTime: mealDate,
          mealType: summary?.mealType || getMealType(mealDate),
          aiSummary: summary?.aiSummary || '',
          items: [],
        });
      }

      groups.get(key)!.items.push({
        menu: menu.trim(),
        estimatedAmount: estimatedAmount?.trim() || '',
        calories: parseFloat(cal) || 0,
        protein: parseFloat(prot) || 0,
        fat: parseFloat(fat) || 0,
        carbs: parseFloat(carbs) || 0,
        fiber: parseFloat(fiber) || 0,
        otherNutrients: other?.trim() || '',
        base64: base64?.trim() || '',
      });

      rowCount++;
    });

    parser.on('end', () => {
      console.log(`  ${rowCount}食品レコード / ${groups.size}食事グループ を検出`);
      resolve(groups);
    });

    parser.on('error', reject);
  });
}

// ============================================================
// 画像をFirebase Storageにアップロード
// ============================================================
async function uploadImage(base64: string, mealTime: Date): Promise<string> {
  const bucket = storage.bucket();
  const fileName = `users/${UID}/meals/${mealTime.getTime()}.jpg`;
  const file = bucket.file(fileName);

  const imageBuffer = Buffer.from(base64, 'base64');
  await file.save(imageBuffer, { metadata: { contentType: 'image/jpeg' } });
  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}

// ============================================================
// meal_summary + food_raw_log を作成
// ============================================================
async function importMeals(groups: Map<string, MealGroup>) {
  console.log(`\n${groups.size}食事をインポート中...`);
  const userRef = db.collection('users').doc(UID);
  let done = 0;

  for (const [, meal] of groups) {
    // 画像アップロード（最初のアイテムのbase64を使用）
    const firstBase64 = meal.items.find((i) => i.base64)?.base64 || '';
    let imageUrl = '';
    if (firstBase64) {
      try {
        imageUrl = await uploadImage(firstBase64, meal.mealTime);
      } catch (e) {
        console.warn(`  画像アップロード失敗: ${meal.mealTime.toISOString()}`);
      }
    }

    // 栄養素合計
    const totalCalories = meal.items.reduce((s, i) => s + i.calories, 0);
    const totalProtein  = meal.items.reduce((s, i) => s + i.protein, 0);
    const totalFat      = meal.items.reduce((s, i) => s + i.fat, 0);
    const totalCarbs    = meal.items.reduce((s, i) => s + i.carbs, 0);
    const totalFiber    = meal.items.reduce((s, i) => s + i.fiber, 0);
    const mealTimestamp = Timestamp.fromDate(meal.mealTime);

    // meal_summary を作成
    const mealSummaryRef = userRef.collection('meal_summary').doc();
    await mealSummaryRef.set({
      mealTime: mealTimestamp,
      mealType: meal.mealType,
      imageUrl,
      menus: meal.items.map((i) => i.menu),
      aiSummary: meal.aiSummary,
      totalCalories,
      totalProtein,
      totalFat,
      totalCarbs,
      totalFiber,
      aiProvider: 'manual',
      aiModel: 'manual',
    });

    // food_raw_log をバッチで作成
    const batch = db.batch();
    meal.items.forEach((item) => {
      const logRef = userRef.collection('food_raw_log').doc();
      batch.set(logRef, {
        timestamp: mealTimestamp,
        imageUrl,
        menu: item.menu,
        estimatedAmount: item.estimatedAmount,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        fiber: item.fiber,
        otherNutrients: item.otherNutrients,
        mealType: meal.mealType,
        mealSummaryId: mealSummaryRef.id,
        aiProvider: 'manual',
        aiModel: 'manual',
      });
    });
    await batch.commit();

    done++;
    if (done % 10 === 0 || done === groups.size) {
      process.stdout.write(`\r  ${done}/${groups.size} 食事完了...`);
    }
  }

  console.log(`\n[meal_summary + food_raw_log] 完了`);
}

// ============================================================
// メイン
// ============================================================
async function main() {
  console.log(`\nUID: ${UID}\n`);

  await deleteExistingData();
  const groups = await parseCsv();
  await importMeals(groups);

  console.log('\n✅ インポート完了');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
