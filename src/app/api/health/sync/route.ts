import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

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
  userId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { records, userId }: SyncRequest = await req.json();

    if (!records?.length || !userId) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 });
    }

    const adminDb = await getAdminDb();
    const userRef = adminDb.collection('users').doc(userId);
    let synced = 0;
    let skipped = 0;

    // 500件ずつバッチ処理
    const chunkSize = 500;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const batch = adminDb.batch();

      for (const record of chunk) {
        const docId = record.timestamp.replace(/[:.]/g, '-');
        const docRef = userRef.collection('health_log').doc(docId);
        const existing = await docRef.get();

        if (existing.exists) {
          skipped++;
          continue;
        }

        const data: Record<string, unknown> = {
          timestamp: Timestamp.fromDate(new Date(record.timestamp)),
        };
        if (record.weight   != null) data.weight  = record.weight;
        if (record.bodyFat  != null) data.bodyFat = record.bodyFat;
        if (record.bmi      != null) data.bmi     = record.bmi;
        if (record.lbm      != null) data.lbm     = record.lbm;
        if (record.steps    != null) data.steps   = record.steps;

        batch.set(docRef, data);
        synced++;
      }

      await batch.commit();
    }

    return NextResponse.json({ success: true, synced, skipped });
  } catch (e: any) {
    console.error('[/api/health/sync] エラー:', e);
    return NextResponse.json(
      { error: e.message ?? '同期中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
