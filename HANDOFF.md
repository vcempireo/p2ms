# HANDOFF.md - PC間の引き継ぎメモ

作業開始時に必ず読むこと。対応したらチェック（[x]）を入れてから消す。

---

## PC1（HEALTHY-PC）→ PC2（heal.local）へ

（現在対応待ちなし）

---

## PC2（heal.local）→ PC1（HEALTHY-PC）へ

- [ ] **【緊急】FoodAnalysisWizardのアップロードフローを変更してほしい**

  **背景**: クライアントSDKからのFirebase Storageアップロード（`uploadBytes`）が
  Vercel環境で動かない（CORS or 認証問題）。
  Storageアップロードをサーバー側（Admin SDK）に移した。

  **新フロー:**
  ```
  撮影 → Canvas圧縮 → blob → base64変換
       → /api/food/analyze に { base64Image } を送信
       → レスポンスに { items, imageUrl, aiProvider, aiModel } が返ってくる
       → /api/food/save に { imageUrl, ... } を送信
  ```

  **変更点:**
  1. `uploadBytes` / `getDownloadURL` の呼び出しを削除
  2. blobをbase64 data URLに変換して `base64Image` として送信
  3. analyze APIのレスポンスから `imageUrl` を取得して state に保存
  4. save時はそのimageUrlを使う（変更なし）

  **blob → base64 変換例:**
  ```ts
  // canvas.toBlob のコールバック内で
  const reader = new FileReader();
  reader.onload = () => {
    const base64Image = reader.result as string; // "data:image/jpeg;base64,..."
    runAnalysis(base64Image, preview, mealType);
  };
  reader.readAsDataURL(blob);
  ```

  **runAnalysis のシグネチャ変更:**
  ```ts
  // 変更前: runAnalysis(blob: Blob, preview: string, meal: MealType)
  // 変更後: runAnalysis(base64Image: string, preview: string, meal: MealType)

  const res = await fetch('/api/food/analyze', {
    method: 'POST',
    headers: await getAuthHeader(),
    body: JSON.stringify({ base64Image }),  // ← imageUrl ではなく base64Image
  });
  const result = await res.json();
  setImageUrl(result.imageUrl);  // ← APIレスポンスからimageUrlを取得
  ```

  ※ firebase/storage の import（uploadBytes, getDownloadURL, ref）は不要になる

---

## 共通メモ

- `src/lib/types.ts` は共有ファイル。変更前に相手PCと調整すること。
- 全APIルートは `Authorization: Bearer {idToken}` ヘッダーが必須（未認証は401）。
- Soul Architecture生成AIは `SOUL_AI_PROVIDER` / `SOUL_AI_MODEL` で制御（未設定時は `AI_PROVIDER` / `AI_MODEL` にフォールバック）。

## アーキテクチャメモ

### 食事解析フロー（最新版）
```
Client: 撮影 → Canvas圧縮（1024px/0.85）→ base64変換
     → /api/food/analyze に { base64Image } 送信

Server (/api/food/analyze):
  1. 認証チェック
  2. base64 → Firebase Storage（Admin SDK）にアップロード → imageUrl取得
  3. base64 → OpenAI gpt-4o で解析 → items取得
  4. { items, imageUrl, aiProvider, aiModel } を返す

Client: レビュー画面で確認 → /api/food/save に { imageUrl, items, ... } 送信

Server (/api/food/save):
  1. Firestoreに meal_summary + food_raw_log 保存
  2. バックグラウンドで gpt-4o-mini が aiSummary 生成
```

### Firestoreコレクション
```
/users/{uid}/food_raw_log/{docId}   # 1食品1ドキュメント
/users/{uid}/meal_summary/{docId}   # 1食事単位（aiSummaryをバックグラウンド更新）
/users/{uid}/health_log/{docId}     # HealthKitデータ（timestamp, weight, bodyFat, bmi等）
/users/{uid}/soul_architecture/core # Soul Architecture（contentフィールドにMarkdown）
/daily_logs/{docId}                 # 旧データ（読み取り専用）
```
