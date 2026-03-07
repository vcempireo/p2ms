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

    // StorageアップロードとAI解析を並行実行
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const fileName = `users/${uid}/meals/${Date.now()}.jpg`;

    // Storage アップロード（失敗しても解析は止めない）
    const uploadPromise = (async (): Promise<string> => {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET
        ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET が未設定です');
      const adminStorage = await getAdminStorage();
      const bucket = adminStorage.bucket(bucketName);
      const file = bucket.file(fileName);
      const downloadToken = crypto.randomUUID();
      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: { firebaseStorageDownloadTokens: downloadToken },
        },
      });
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media&token=${downloadToken}`;
    })().catch((e) => {
      // Storageエラーは警告に留め、解析は続行
      console.warn('[analyze] Storage アップロード失敗（無視して続行）:', e.message);
      return '';
    });

    // AI解析（base64を直接渡す）
    const [imageUrl, result] = await Promise.all([
      uploadPromise,
      analyzeFoodImage(base64Image),
    ]);
    console.log('[analyze] 4. 完了 items:', result.items.length, 'imageUrl:', imageUrl ? '保存済' : '未保存');

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
