import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, verifyAuthToken } from '@/lib/firebase-admin';

interface HealthRecord {
  timestamp: string;
  weight?: number;
  bodyFat?: number;
  bmi?: number;
  lbm?: number;
  steps?: number;
}

interface SyncRequest {
  records: HealthRecord[];
}

// ISO文字列 → JST日付キー（YYYY-MM-DD）
const toDateKey = (iso: string): string => {
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
};

export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuthToken(req);
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { records }: SyncRequest = await req.json();

    if (!records?.length) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 });
    }

    const adminDb = await getAdminDb();
    const userRef = adminDb.collection('users').doc(userId);

    // 同じ日付のレコードをマージしてから書き込む
    // （1リクエストに同日の体重・歩数が別々に来ることがある）
    const dayMap = new Map<string, Record<string, unknown>>();

    for (const record of records) {
      const dateKey = toDateKey(record.timestamp);
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          timestamp: Timestamp.fromDate(new Date(record.timestamp)),
        });
      }
      const data = dayMap.get(dateKey)!;
      // 同日複数レコードがある場合は後のものを優先（より新しい計測値）
      if (record.weight   != null) data.weight   = record.weight;
      if (record.bodyFat  != null) data.bodyFat  = record.bodyFat;
      if (record.bmi      != null) data.bmi      = record.bmi;
      if (record.lbm      != null) data.lbm      = record.lbm;
      if (record.steps    != null) data.steps    = record.steps;
      // timestampは最新のものに更新
      data.timestamp = Timestamp.fromDate(new Date(record.timestamp));
    }

    // 500件ずつバッチ書き込み（merge: trueで既存データに上書きマージ）
    const entries = Array.from(dayMap.entries());
    const chunkSize = 500;
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      const batch = adminDb.batch();
      for (const [dateKey, data] of chunk) {
        const docRef = userRef.collection('health_log').doc(dateKey);
        batch.set(docRef, data, { merge: true });
      }
      await batch.commit();
    }

    return NextResponse.json({ success: true, saved: entries.length });
  } catch (e: any) {
    console.error('[/api/health/sync] エラー:', e);
    return NextResponse.json(
      { error: e.message ?? '同期中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
