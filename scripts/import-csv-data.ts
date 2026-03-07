/**
 * CSVデータ一括インポートスクリプト
 * 使い方: npx ts-node --project tsconfig.scripts.json scripts/import-csv-data.ts
 *
 * 対象CSVファイル（~/Downloads/に置くこと）:
 *   - カロリーPFC解析 - SummaryData.csv      → /users/{uid}/meal_summary
 *   - P²MS_HealthKit_Log.ver0.00 - HealthKitログ.csv → /users/{uid}/health_log
 *   - P²MS_Core.ver0.00 - 週間メニュー.csv   → /users/{uid}/workout_log（新規コレクション）
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { parse } from 'csv-parse/sync';
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
  });
}

const db = getFirestore();
const UID = 'tqUkyNIfUrXmD7hfemPbcny2DAY2';
const DOWNLOADS = path.join(process.env.HOME ?? '', 'Downloads');
const MAX_BATCH = 400;

// ============================================================
// バッチ書き込みヘルパー
// ============================================================
async function commitBatches(
  items: { ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }[],
  merge = false
) {
  for (let i = 0; i < items.length; i += MAX_BATCH) {
    const batch = db.batch();
    const chunk = items.slice(i, i + MAX_BATCH);
    chunk.forEach(({ ref, data }) => batch.set(ref, data, { merge }));
    await batch.commit();
    console.log(`  ${i + chunk.length}/${items.length} 件投入済み...`);
  }
}

// ============================================================
// 1. meal_summary インポート
//    カロリーPFC解析 - SummaryData.csv
// ============================================================
async function importMealSummary() {
  const filePath = path.join(DOWNLOADS, 'カロリーPFC解析 - SummaryData.csv');
  console.log('\n[meal_summary] インポート開始...');

  const content = fs.readFileSync(filePath, 'utf-8');
  const rows: string[][] = parse(content, {
    relax_column_count: true,
    skip_empty_lines: true,
  });

  // 1行目はヘッダーなのでスキップ
  const dataRows = rows.slice(1);
  const userRef = db.collection('users').doc(UID);
  const items: { ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }[] = [];

  for (const row of dataRows) {
    // timestamp(0), mealType(1), imageUrl(2), menus(3), aiSummary(4),
    // calories(5), protein(6), fat(7), carbs(8), fiber(9), otherNutrients(10)
    const [timestampStr, mealType, imageUrl, menusRaw, aiSummary, cal, prot, fat, carbs, fiber] = row;

    if (!timestampStr) continue;

    // YYYY/MM/DD HH:MM → Date
    const mealDate = new Date(timestampStr.replace(/\//g, '-').replace(' ', 'T') + ':00+09:00');
    if (isNaN(mealDate.getTime())) continue;

    // メニューは改行区切りで配列化
    const menus = menusRaw
      ? menusRaw.split('\n').map((m) => m.trim()).filter(Boolean)
      : [];

    const data: Record<string, unknown> = {
      mealTime: Timestamp.fromDate(mealDate),
      mealType: mealType?.trim() || '不明',
      imageUrl: imageUrl?.trim() || '',
      menus,
      aiSummary: aiSummary?.trim() || '',
      totalCalories: parseFloat(cal) || 0,
      totalProtein: parseFloat(prot) || 0,
      totalFat: parseFloat(fat) || 0,
      totalCarbs: parseFloat(carbs) || 0,
      totalFiber: parseFloat(fiber) || 0,
      aiProvider: 'manual',
      aiModel: 'manual',
    };

    items.push({ ref: userRef.collection('meal_summary').doc(), data });
  }

  await commitBatches(items);
  console.log(`[meal_summary] 完了（${items.length}件）`);
}

// ============================================================
// 2. health_log インポート
//    P²MS_HealthKit_Log.ver0.00 - HealthKitログ.csv
// ============================================================
async function importHealthLog() {
  const filePath = path.join(DOWNLOADS, 'P²MS_HealthKit_Log.ver0.00 - HealthKitログ.csv');
  console.log('\n[health_log] インポート開始...');

  const content = fs.readFileSync(filePath, 'utf-8');
  const rows: string[][] = parse(content, {
    relax_column_count: true,
    skip_empty_lines: true,
  });

  // 1行目はヘッダーなのでスキップ
  const dataRows = rows.slice(1);
  const userRef = db.collection('users').doc(UID);
  const items: { ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }[] = [];

  for (const row of dataRows) {
    // 日時(0), "weight"(1), weight値(2), "bodyFat"(3), bodyFat値(4),
    // "BMI"(5), bmi値(6), "LBM"(7), lbm値(8), "Steps"(9), steps値(10)
    const [dateStr, , weightStr, , bodyFatStr, , bmiStr, , lbmStr, , stepsStr] = row;

    if (!dateStr || dateStr === '日時') continue;

    // YYYY/MM/DD → 朝7時として扱う
    const dateFormatted = dateStr.trim().replace(/\//g, '-');
    const measureDate = new Date(`${dateFormatted}T07:00:00+09:00`);
    if (isNaN(measureDate.getTime())) continue;

    const weight = parseFloat(weightStr) || 0;
    const bodyFat = parseFloat(bodyFatStr) || 0;
    const bmi = parseFloat(bmiStr) || 0;
    const lbm = parseFloat(lbmStr) || 0;
    const steps = parseInt(stepsStr) || 0;

    const data: Record<string, unknown> = {
      timestamp: Timestamp.fromDate(measureDate),
    };

    // 0の場合はその日のデータなしとして除外
    if (weight > 0) data.weight = weight;
    if (bodyFat > 0) data.bodyFat = bodyFat;
    if (bmi > 0) data.bmi = bmi;
    if (lbm > 0) data.lbm = lbm;
    if (steps > 0) data.steps = steps;

    // JST日付をドキュメントIDに使う（1日1ドキュメント設計）
    items.push({ ref: userRef.collection('health_log').doc(dateFormatted), data });
  }

  // merge: true で書き込み（同日データが複数回来てもマージ）
  await commitBatches(items, true);
  console.log(`[health_log] 完了（${items.length}件）`);
}

// ============================================================
// 3. workout_log インポート（新規コレクション）
//    P²MS_Core.ver0.00 - 週間メニュー.csv
// ============================================================
async function importWorkoutLog() {
  const filePath = path.join(DOWNLOADS, 'P²MS_Core.ver0.00 - 週間メニュー.csv');
  console.log('\n[workout_log] インポート開始...');

  const content = fs.readFileSync(filePath, 'utf-8');
  const rows: string[][] = parse(content, {
    relax_column_count: true,
    skip_empty_lines: true,
  });

  // 1行目はヘッダーなのでスキップ
  const dataRows = rows.slice(1);
  const userRef = db.collection('users').doc(UID);
  const items: { ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }[] = [];

  for (const row of dataRows) {
    // 日付(0), 曜日(1), 時間(2), メニュ(3), 種目(4), 目標(5),
    // 1セット(6), AI評価(7), アドバイス(8),
    // 2セット(9), AI評価(10), アドバイス(11),
    // 3セット(12), AI評価(13), アドバイス(14),
    // 4セット(15), AI評価(16), アドバイス(17), リマインド(18)
    const [dateStr, , timeStr, plan, exercise, goal,
      s1, ai1, adv1,
      s2, ai2, adv2,
      s3, ai3, adv3,
      s4, ai4, adv4,
    ] = row;

    if (!dateStr || !exercise || exercise.trim() === '休み') continue;

    const timeFormatted = timeStr?.trim() || '12:00';
    const dateFormatted = dateStr.trim().replace(/\//g, '-');
    const workoutDate = new Date(`${dateFormatted}T${timeFormatted}:00+09:00`);
    if (isNaN(workoutDate.getTime())) continue;

    // セットデータを配列化（空のセットは除外）
    const sets = [
      { reps: s1, aiScore: parseFloat(ai1) || null, advice: adv1?.trim() || null },
      { reps: s2, aiScore: parseFloat(ai2) || null, advice: adv2?.trim() || null },
      { reps: s3, aiScore: parseFloat(ai3) || null, advice: adv3?.trim() || null },
      { reps: s4, aiScore: parseFloat(ai4) || null, advice: adv4?.trim() || null },
    ]
      .filter((s) => s.reps?.trim())
      .map((s) => {
        const set: Record<string, unknown> = { reps: s.reps?.trim() };
        if (s.aiScore !== null && !isNaN(s.aiScore as number)) set.aiScore = s.aiScore;
        if (s.advice) set.advice = s.advice;
        return set;
      });

    const data: Record<string, unknown> = {
      date: Timestamp.fromDate(workoutDate),
      plan: plan?.trim() || '',
      exercise: exercise.trim(),
      goal: goal?.trim() || '',
      sets,
    };

    items.push({ ref: userRef.collection('workout_log').doc(), data });
  }

  await commitBatches(items);
  console.log(`[workout_log] 完了（${items.length}件）`);
}

// ============================================================
// メイン
// ============================================================
async function main() {
  console.log(`\nUID: ${UID}`);
  console.log('CSVインポートを開始します...\n');

  await importMealSummary();
  await importHealthLog();
  await importWorkoutLog();

  console.log('\n✅ 全インポート完了');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
