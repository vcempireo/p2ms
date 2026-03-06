/**
 * ダミーデータシードスクリプト
 * 使い方: npx ts-node --project tsconfig.scripts.json scripts/seed-dummy-data.ts <UID>
 *
 * 生成するデータ:
 *   - /users/{uid}/health_log  : 2年分（日次）
 *   - /users/{uid}/meal_summary: 2年分（1日2〜3食）
 *
 * ※ daily_logs はフィールド構成が不明なためスキップ
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local を読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Firebase Admin 初期化
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

// ランダム数値（min〜maxの小数点1桁）
const rand = (min: number, max: number) =>
  Math.round((Math.random() * (max - min) + min) * 10) / 10;

// 整数ランダム
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// 指定日の開始時刻（ローカル時間）
const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

// ============================
// health_log シード
// ============================
async function seedHealthLog(uid: string, days: number) {
  console.log(`health_log: ${days}日分を生成中...`);

  // 体重・体脂肪率の初期値（緩やかに変化するトレンドを作る）
  let weight = 72.0;
  let bodyFat = 20.0;

  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH = 400;

  const today = startOfDay(new Date());

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    // 微小なランダム変動 + 長期トレンド（徐々に減量）
    weight += rand(-0.3, 0.25);
    weight = Math.max(65, Math.min(80, weight)); // 65〜80kgの範囲に収める
    bodyFat += rand(-0.2, 0.18);
    bodyFat = Math.max(14, Math.min(28, bodyFat));

    const bmi = Math.round((weight / (1.72 * 1.72)) * 10) / 10;
    const lbm = Math.round((weight * (1 - bodyFat / 100)) * 10) / 10;

    // 朝7時前後に計測
    const measureTime = new Date(date);
    measureTime.setHours(7, randInt(0, 30), 0);

    // JST日付をdocIdに使う（1日1ドキュメント設計）
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateKey = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    const ref = db
      .collection('users')
      .doc(uid)
      .collection('health_log')
      .doc(dateKey);

    batch.set(ref, {
      timestamp: Timestamp.fromDate(measureTime),
      weight: Math.round(weight * 10) / 10,
      bodyFat: Math.round(bodyFat * 10) / 10,
      bmi,
      lbm,
      steps: randInt(3000, 14000),
    }, { merge: true });

    batchCount++;

    // Firestoreのバッチ上限（500件）に近づいたらコミット
    if (batchCount >= MAX_BATCH) {
      await batch.commit();
      batchCount = 0;
      console.log(`  health_log: ${days - i}件投入済み...`);
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`health_log: 完了（${days}件）`);
}

// ============================
// meal_summary シード
// ============================

const MEAL_TYPES = ['朝食', '昼食', '夕食'] as const;

// 食事ごとの時間帯
const MEAL_HOURS: Record<string, number> = {
  朝食: 7,
  昼食: 12,
  夕食: 19,
};

// 食事ごとのカロリー目安
const MEAL_CALORIES: Record<string, [number, number]> = {
  朝食: [350, 600],
  昼食: [500, 800],
  夕食: [600, 900],
};

// サンプルメニュー
const MENUS: Record<string, string[][]> = {
  朝食: [
    ['ご飯', '味噌汁', '目玉焼き'],
    ['トースト', 'スクランブルエッグ', 'サラダ'],
    ['オートミール', 'バナナ', 'プロテイン'],
    ['おにぎり', 'ゆで卵'],
  ],
  昼食: [
    ['鶏胸肉定食', '味噌汁', 'サラダ'],
    ['サラダチキン', 'ブロッコリー', '玄米'],
    ['蕎麦', 'サラダ'],
    ['チキンサンドイッチ', 'スープ'],
  ],
  夕食: [
    ['鶏むね肉のソテー', 'ブロッコリー', 'ご飯'],
    ['刺身定食', '味噌汁', 'サラダ'],
    ['豆腐ハンバーグ', '野菜炒め', 'ご飯'],
    ['焼き魚', '小鉢2品', 'ご飯', '味噌汁'],
  ],
};

async function seedMealSummary(uid: string, days: number) {
  console.log(`meal_summary: ${days}日分を生成中...`);

  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH = 400;
  let total = 0;

  const today = startOfDay(new Date());

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    // 1日2〜3食（夕食は稀にスキップ）
    const mealTypesToday = MEAL_TYPES.filter(() => Math.random() > 0.1);

    for (const mealType of mealTypesToday) {
      const [calMin, calMax] = MEAL_CALORIES[mealType];
      const totalCalories = randInt(calMin, calMax);
      const totalProtein = rand(15, 45);
      const totalFat = rand(8, 30);
      const totalCarbs = rand(40, 120);
      const totalFiber = rand(2, 8);

      const mealTime = new Date(date);
      mealTime.setHours(MEAL_HOURS[mealType], randInt(0, 30), 0);

      const menus =
        MENUS[mealType][randInt(0, MENUS[mealType].length - 1)];

      const ref = db
        .collection('users')
        .doc(uid)
        .collection('meal_summary')
        .doc();

      batch.set(ref, {
        mealTime: Timestamp.fromDate(mealTime),
        mealType,
        imageUrl: '',
        menus,
        aiSummary: `${menus.join('、')}を食べました。`,
        totalCalories,
        totalProtein,
        totalFat,
        totalCarbs,
        totalFiber,
        aiProvider: 'openai',
        aiModel: 'gpt-4o',
      });

      batchCount++;
      total++;

      if (batchCount >= MAX_BATCH) {
        await batch.commit();
        batchCount = 0;
        console.log(`  meal_summary: ${total}件投入済み...`);
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`meal_summary: 完了（${total}件）`);
}

// ============================
// メイン
// ============================
async function main() {
  const uid = process.argv[2];
  if (!uid) {
    console.error('使い方: npx ts-node scripts/seed-dummy-data.ts <UID>');
    process.exit(1);
  }

  const DAYS = 365 * 2; // 2年分

  console.log(`\nUID: ${uid}`);
  console.log(`対象期間: ${DAYS}日間（約2年分）\n`);

  await seedHealthLog(uid, DAYS);
  await seedMealSummary(uid, DAYS);

  console.log('\n✅ シード完了');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
