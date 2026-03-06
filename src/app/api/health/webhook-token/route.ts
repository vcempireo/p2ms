import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAuthToken } from '@/lib/firebase-admin';

// ユーザーのwebhookトークンを生成・取得するエンドポイント
// Health Auto ExportはBearer認証を送れないため、URLパラメータ認証用のトークンを管理する

export async function POST(req: NextRequest) {
  const userId = await verifyAuthToken(req);
  if (!userId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const adminDb = await getAdminDb();
  const userRef = adminDb.collection('users').doc(userId);

  // ランダムトークンを生成（32文字の16進数）
  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  await userRef.set({ webhookToken: token }, { merge: true });

  return NextResponse.json({ token });
}

// 既存トークンを取得（表示用）
export async function GET(req: NextRequest) {
  const userId = await verifyAuthToken(req);
  if (!userId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const adminDb = await getAdminDb();
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const token = userDoc.data()?.webhookToken ?? null;

  return NextResponse.json({ token });
}
