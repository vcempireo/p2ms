import { NextRequest, NextResponse } from 'next/server';
import { analyzeFoodImage } from '@/lib/ai-analyzer';

// Vercel の実行時間制限を60秒に設定（デフォルトは10秒）
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { base64Image } = await req.json();

    if (!base64Image) {
      return NextResponse.json({ error: '画像データがありません' }, { status: 400 });
    }

    const result = await analyzeFoodImage(base64Image);

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
