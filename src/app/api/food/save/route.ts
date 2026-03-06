import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, getAdminStorage, verifyAuthToken } from '@/lib/firebase-admin';
import { AnalyzedFoodItem, MealType, AIProvider } from '@/lib/types';

export const maxDuration = 60;

interface SaveRequest {
  imageBase64: string;
  mealType: MealType;
  mealTime: string;       // ISO 8601 文字列
  items: AnalyzedFoodItem[];
  aiProvider: AIProvider;
  aiModel: string;
}

export async function POST(req: NextRequest) {
  try {
    // userIdはトークンから取得（クライアント送信値は信用しない）
    const userId = await verifyAuthToken(req);
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body: SaveRequest = await req.json();
    const { imageBase64, mealType, mealTime, items, aiProvider, aiModel } = body;

    if (!imageBase64 || !items?.length) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 });
    }

    const adminStorage = await getAdminStorage();
    const adminDb = await getAdminDb();

    // === 1. Firebase Storage に画像をアップロード ===
    const bucket = adminStorage.bucket();
    const fileName = `users/${userId}/meals/${Date.now()}.jpg`;
    const file = bucket.file(fileName);

    const imageBuffer = Buffer.from(imageBase64, 'base64');
    await file.save(imageBuffer, {
      metadata: { contentType: 'image/jpeg' },
    });

    // 公開URLを取得
    await file.makePublic();
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // === 2. 栄養素の合計を計算 ===
    const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein  = items.reduce((sum, item) => sum + item.protein, 0);
    const totalFat      = items.reduce((sum, item) => sum + item.fat, 0);
    const totalCarbs    = items.reduce((sum, item) => sum + item.carbs, 0);
    const totalFiber    = items.reduce((sum, item) => sum + item.fiber, 0);

    const mealTimestamp = Timestamp.fromDate(new Date(mealTime));
    const userRef = adminDb.collection('users').doc(userId);

    // === 3. meal_summary ドキュメントを作成 ===
    const mealSummaryRef = userRef.collection('meal_summary').doc();
    await mealSummaryRef.set({
      mealTime: mealTimestamp,
      mealType,
      imageUrl,
      menus: items.map((item) => item.menu),
      aiSummary: '',
      totalCalories,
      totalProtein,
      totalFat,
      totalCarbs,
      totalFiber,
      aiProvider,
      aiModel,
    });

    // === 4. food_raw_log に各食品を保存（バッチ書き込み） ===
    const batch = adminDb.batch();

    items.forEach((item) => {
      const logRef = userRef.collection('food_raw_log').doc();
      batch.set(logRef, {
        timestamp: mealTimestamp,
        imageUrl,
        menu: item.menu,
        estimatedAmount: item.estimatedAmount,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        fiber: item.fiber,
        otherNutrients: item.otherNutrients,
        mealType,
        mealSummaryId: mealSummaryRef.id,
        aiProvider,
        aiModel,
      });
    });

    await batch.commit();

    return NextResponse.json({ success: true, mealSummaryId: mealSummaryRef.id });
  } catch (e: any) {
    console.error('[/api/food/save] エラー:', e);
    return NextResponse.json(
      { error: e.message ?? '保存中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
