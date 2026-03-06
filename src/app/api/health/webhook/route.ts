import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

// Health Auto Export アプリからのwebhookを受け取るエンドポイント
// 認証: URLパラメータ ?uid=xxx&token=xxx
// Health Auto ExportはBearer認証ヘッダーを送れないためURL認証を使用する

// Health Auto Export のメトリクス名 → 内部フィールド名のマッピング
const METRIC_MAP: Record<string, string> = {
  body_mass: 'weight',
  body_fat_percentage: 'bodyFat',
  body_mass_index: 'bmi',
  lean_body_mass: 'lbm',
  step_count: 'steps',
};

interface HaeDataPoint {
  qty: number;
  date: string; // "2024-01-15 07:30:00 +0900"
}

interface HaeMetric {
  name: string;
  units: string;
  data: HaeDataPoint[];
}

interface HaePayload {
  data: {
    metrics: HaeMetric[];
    workouts?: unknown[];
  };
}

// "2024-01-15 07:30:00 +0900" → JST日付キー "2024-01-15"
// HAEはオフセット付きで送ってくる。UTC変換後に+9hしてJST日付を取り出す
const toDateKey = (haeDate: string): string => {
  const d = new Date(haeDate.replace(' ', 'T'));
  const jstMs = d.getTime() + 9 * 60 * 60 * 1000;
  return new Date(jstMs).toISOString().slice(0, 10);
};

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  if (!uid || !token) {
    return NextResponse.json({ error: 'uid と token が必要です' }, { status: 400 });
  }

  // トークン検証
  const adminDb = await getAdminDb();
  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.webhookToken !== token) {
    return NextResponse.json({ error: '認証失敗' }, { status: 401 });
  }

  let payload: HaePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: '不正なJSONです' }, { status: 400 });
  }

  const metrics = payload?.data?.metrics;
  if (!Array.isArray(metrics)) {
    return NextResponse.json({ error: 'data.metricsが見つかりません' }, { status: 400 });
  }

  // 日付単位でデータをまとめる（同じ日のデータは1ドキュメントにマージ）
  const dayMap = new Map<string, Record<string, unknown>>();

  for (const metric of metrics) {
    const fieldName = METRIC_MAP[metric.name];
    if (!fieldName) continue;

    for (const point of metric.data) {
      const dateKey = toDateKey(point.date);
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          timestamp: Timestamp.fromDate(new Date(point.date.replace(' ', 'T'))),
        });
      }
      const record = dayMap.get(dateKey)!;
      record[fieldName] = point.qty;
      // timestampは最後に来たデータのものを保持
      record.timestamp = Timestamp.fromDate(new Date(point.date.replace(' ', 'T')));
    }
  }

  if (dayMap.size === 0) {
    return NextResponse.json({ success: true, saved: 0 });
  }

  // バッチ書き込み（merge: trueで既存の日付ドキュメントに上書きマージ）
  const userRef = adminDb.collection('users').doc(uid);
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
}
