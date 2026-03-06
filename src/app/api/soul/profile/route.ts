import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const uid = await verifyAuthToken(req);
    if (!uid) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const db = await getAdminDb();
    const ref = db
      .collection('users')
      .doc(uid)
      .collection('soul_architecture')
      .doc('core');

    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ profile: null });
    }

    const data = snap.data()!;
    return NextResponse.json({
      profile: {
        content: data.content as string,
        birthDate: data.birthDate as string,
        birthTime: data.birthTime as string,
        birthPlace: data.birthPlace as string,
        aiProvider: data.aiProvider as string,
        aiModel: data.aiModel as string,
        version: data.version as number,
        generatedAt: (data.generatedAt as FirebaseFirestore.Timestamp).toDate().toISOString(),
      },
    });
  } catch (e: any) {
    console.error('[/api/soul/profile] エラー:', e);
    return NextResponse.json(
      { error: e.message ?? 'プロフィール取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
