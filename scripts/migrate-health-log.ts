/**
 * health_log 移行スクリプト
 * 旧形式（docId = タイムスタンプベース or auto-ID）→ 新形式（docId = JST日付）
 *
 * 使い方: npx ts-node --project tsconfig.scripts.json scripts/migrate-health-log.ts
 *
 * 処理内容:
 *   1. 全ユーザーの health_log を走査
 *   2. docId が "YYYY-MM-DD" 形式でないドキュメントを旧形式と判定
 *   3. timestamp フィールドから JST 日付を算出して新しい docId で書き込み（merge: true）
 *   4. 旧ドキュメントを削除
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Timestamp → JST日付キー（YYYY-MM-DD）
function toDateKey(ts: Timestamp): string {
  const jstMs = ts.toMillis() + 9 * 60 * 60 * 1000;
  return new Date(jstMs).toISOString().slice(0, 10);
}

async function migrateUser(uid: string): Promise<{ migrated: number; skipped: number }> {
  const healthLogRef = db.collection('users').doc(uid).collection('health_log');
  const snapshot = await healthLogRef.get();

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    // 既に新形式（YYYY-MM-DD）ならスキップ
    if (DATE_KEY_RE.test(doc.id)) {
      skipped++;
      continue;
    }

    const data = doc.data();
    const ts: Timestamp | undefined = data.timestamp;

    if (!ts) {
      console.warn(`  [skip] uid=${uid} docId=${doc.id} → timestamp なし`);
      skipped++;
      continue;
    }

    const newDocId = toDateKey(ts);
    const newRef = healthLogRef.doc(newDocId);

    // 新docIdに書き込み（既存データとマージ）
    await newRef.set(data, { merge: true });
    // 旧docを削除
    await doc.ref.delete();

    console.log(`  uid=${uid}: ${doc.id} → ${newDocId}`);
    migrated++;
  }

  return { migrated, skipped };
}

async function main() {
  console.log('\n=== health_log 移行スクリプト ===\n');

  const usersSnapshot = await db.collection('users').get();

  if (usersSnapshot.empty) {
    console.log('ユーザーが見つかりませんでした。');
    process.exit(0);
  }

  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    console.log(`\nUID: ${uid}`);
    const { migrated, skipped } = await migrateUser(uid);
    console.log(`  → 移行: ${migrated}件、スキップ（既に新形式）: ${skipped}件`);
    totalMigrated += migrated;
    totalSkipped += skipped;
  }

  console.log(`\n✅ 移行完了: 合計 ${totalMigrated}件移行、${totalSkipped}件スキップ`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
