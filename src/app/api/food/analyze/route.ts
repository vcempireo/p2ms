import { NextRequest, NextResponse } from 'next/server';
import { analyzeFoodImage } from '@/lib/ai-analyzer';
import { verifyAuthToken } from '@/lib/firebase-admin';

// Vercel の実行時間制限を60秒に設定（デフォルトは10秒）
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    console.log('[analyze] 1. リクエスト受信');

    // 認証チェック（未ログインユーザーによるAPIコスト悪用を防ぐ）
    const uid = await verifyAuthToken(req);
    if (!uid) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    console.log('[analyze] 2. 認証OK uid:', uid);

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: '画像URLがありません' }, { status: 400 });
    }
    console.log('[analyze] 3. imageUrl受信:', imageUrl.slice(0, 60) + '...');

    const result = await analyzeFoodImage(imageUrl);
    console.log('[analyze] 4. 解析完了 items:', result.items.length);

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[/api/food/analyze] エラー:', e);

    // JSONパースエラーの場合（AIの返答が不正なフォーマット）
    if (e instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'AI の返答を解析できませんでした。もう一度お試しください。' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: e.message ?? '解析中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
