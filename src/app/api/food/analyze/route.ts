import { NextRequest, NextResponse } from 'next/server';
import { analyzeFoodImage } from '@/lib/ai-analyzer';
import { getAdminStorage, verifyAuthToken } from '@/lib/firebase-admin';

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

    const { base64Image } = await req.json();

    if (!base64Image) {
      return NextResponse.json({ error: '画像データがありません' }, { status: 400 });
    }
    console.log('[analyze] 3. base64受信');

    // base64 → Firebase Storage にアップロード（Admin SDKでCORSなし）
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const adminStorage = await getAdminStorage();
    const bucket = adminStorage.bucket();
    const fileName = `users/${uid}/meals/${Date.now()}.jpg`;
    const file = bucket.file(fileName);
    await file.save(imageBuffer, { metadata: { contentType: 'image/jpeg' } });
    await file.makePublic();
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    console.log('[analyze] 4. Storage アップロード完了:', imageUrl.slice(0, 60) + '...');

    // OpenAIに base64 を渡して解析
    const result = await analyzeFoodImage(base64Image);
    console.log('[analyze] 5. 解析完了 items:', result.items.length);

    // imageUrl も一緒に返す（クライアントが save 時に使う）
    return NextResponse.json({ ...result, imageUrl });
  } catch (e: any) {
    console.error('[/api/food/analyze] エラー:', e);

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
