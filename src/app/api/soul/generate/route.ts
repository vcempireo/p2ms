import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyAuthToken, getAdminDb } from '@/lib/firebase-admin';
import { generateSoulArchitecture, SoulInput } from '@/lib/soul-generator';

// Soul Architecture生成はAI呼び出しが長いので余裕を持たせる
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const uid = await verifyAuthToken(req);
    if (!uid) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body: SoulInput = await req.json();
    const { birthDate, birthTime, birthPlace, userName } = body;

    if (!birthDate || !birthPlace) {
      return NextResponse.json({ error: '生年月日と出生地は必須です' }, { status: 400 });
    }

    // AI生成（モデルはSOUL_AI_PROVIDER / SOUL_AI_MODELで切り替え可能）
    const result = await generateSoulArchitecture({
      birthDate,
      birthTime: birthTime ?? '12:00',
      birthPlace,
      userName,
    });

    // Firestoreに保存（固定ID "core" で上書き = 再生成に対応）
    const db = await getAdminDb();
    const ref = db
      .collection('users')
      .doc(uid)
      .collection('soul_architecture')
      .doc('core');

    // 既存バージョンを確認してインクリメント
    const existing = await ref.get();
    const version = existing.exists ? ((existing.data()?.version ?? 0) as number) + 1 : 1;

    await ref.set({
      content: result.content,
      birthDate,
      birthTime: birthTime ?? '12:00',
      birthPlace,
      aiProvider: result.aiProvider,
      aiModel: result.aiModel,
      version,
      generatedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true, version });
  } catch (e: any) {
    console.error('[/api/soul/generate] エラー:', e);
    return NextResponse.json(
      { error: e.message ?? 'Soul Architecture生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
