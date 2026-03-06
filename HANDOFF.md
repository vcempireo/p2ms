# HANDOFF.md - PC間の引き継ぎメモ

作業開始時に必ず読むこと。対応したらチェック（[x]）を入れてから消す。

---

## PC1（HEALTHY-PC）→ PC2（heal.local）へ

- [ ] **【緊急】解析が遅すぎる・コスト問題 → 2段階分割に変更してほしい**

  ユーザーのGASロジックを参考にした設計案。GASでは以下の2段階に分けていた：

  **旧GAS設計（参考）:**
  ```
  Step1: doPost（画像解析）
    → GPT-4o Vision: JSON構造だけ返す（items配列のみ）、max_tokens: 1000
    → シンプルなプロンプト＋response_format: json_object → 速い

  Step2: aggregateNutritionDataIncremental（後からバッチ）
    → GPT-4o-mini: テキストのみでAIコメント生成、max_tokens: 400
    → 画像不要 = 安くて速い
  ```

  **現在の推定問題点:**
  - `/api/food/analyze` が画像解析＋AIコメント生成を1回のAPIで全部やっている
  - プロンプトが複雑 → トークン増 → 遅い＆高い
  - Vercel 10秒タイムアウトで失敗

  **推奨修正:**

  **A. `/api/food/analyze` を軽くする（最重要）**
  ```
  - 画像解析のみに絞る（JSON items配列を返すだけ）
  - response_format: { type: "json_object" } を使う
  - AIコメントはここで生成しない
  - モデルを gemini-1.5-flash に変更（GPT-4oより3〜5倍速い、コスト1/10）
  ```

  **B. AIコメントは `/api/food/save` の中でテキストのみ生成**
  ```
  - 保存時に集計済みデータ（menus, PFC合計）を使ってAIコメント生成
  - 画像不要なので gpt-4o-mini / gemini-1.5-flash で十分
  - max_tokens: 300〜400 で簡潔に
  ```

  **C. `maxDuration = 60` も念のため追加**
  ```ts
  export const maxDuration = 60; // Vercel Pro必要
  ```

  期待効果: 解析時間 30秒 → 5〜8秒、コスト 1/5〜1/10

  ---

  **【参考】旧GASの実際のプロンプト構造:**

  **画像解析プロンプト（`/api/food/analyze` 用）← シンプルにするべき:**
  ```
  {aiRole}

  この画像に写っている食事のすべてリストアップしそれぞれの
  メニュー(menu) / カロリー(calories) / タンパク質(protein) / 脂質(fat) /
  炭水化物(carbs) / 発酵性食物繊維(fermentable_dietary_fiber) /
  その他の栄養素(other_nutrients) を推定してください。

  **重要**: 客観的な栄養推定のみを実施してください。評価やアドバイスは不要です。

  ルール:
  - "items"は各食品オブジェクトの配列
  - 数値はすべて半角数字、単位は含めない

  出力（json object）:
  { "items": [{ "menu": "...", "calories": "...", "protein": "...",
    "fat": "...", "carbs": "...", "fermentable_dietary_fiber": "...",
    "other_nutrients": "...", "estimated_amount": "..." }] }
  ```
  → `response_format: { type: "json_object" }` で確実にJSON取得
  → モデル: gpt-4o / gemini-1.5-flash、max_tokens: 1000

  **サマリープロンプト（`/api/food/save` 用）← テキストのみ・安いモデルで:**
  ```
  {aiRole}

  【食事タイプ】{mealType}
  【メニュー】{menus.join(", ")}
  【合計栄養素】カロリー: {totalCalories}kcal / P: {totalProtein}g /
                F: {totalFat}g / C: {totalCarbs}g / 食物繊維: {totalFiber}g

  この{mealType}全体を総合評価し、以下を含めてください：
  1. 総評（カロリー・PFCバランス）
  2. 良い点
  3. 改善点
  4. 次回へのアドバイス

  簡潔に3〜5文で回答してください。
  ```
  → 画像不要・テキストのみ
  → モデル: gpt-4o-mini / gemini-1.5-flash、max_tokens: 400



- [x] **【重要】`src/app/page.tsx` の体重データ読み込み先を `daily_logs` → `health_log` に変更してほしい**

  現状: `collection(db, 'daily_logs')` を読んでいる（旧コレクション）
  修正: `/users/{uid}/health_log` を読むように変更する

  新しいデータ構造:
  ```ts
  // /users/{uid}/health_log/{docId}
  {
    timestamp: Timestamp,  // ← daily_logsの "date"(string) とは違う
    weight?: number,       // ← daily_logsの "health_metrics.weight_kg" とは違う
    bodyFat?: number,
    bmi?: number,
    lbm?: number,
    steps?: number,
  }
  ```

  変更のポイント:
  - `collection(db, 'daily_logs')` → `collection(db, 'users', uid, 'health_log')`
  - `orderBy('date', 'desc')` → `orderBy('timestamp', 'desc')`
  - `l.health_metrics?.weight_kg` → `l.weight`
  - `format(parseISO(l.date), ...)` → `l.timestamp.toDate()` でDateに変換
  - `uid` は `useAuth()` の `user.uid` から取得する

- [ ] **【お願い】Storageアップロード前に画像を圧縮してほしい（コスト削減）**

  GASでは1024px / 品質0.85で圧縮していた。P²MSでも同様に実装してほしい。

  ```ts
  // Canvas で圧縮する例
  const compress = (file: File): Promise<Blob> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85);
      };
      img.src = URL.createObjectURL(file);
    });
  ```

  Storage直アップはPC2側で対応済み（imageUrlをAPIに渡す形）。

---

## PC2（heal.local）→ PC1（HEALTHY-PC）へ

- [x] **【重要】写真のアップロードフローを変更した。FoodAnalysisWizardの修正が必要。**

  **旧フロー（廃止）:**
  ```
  撮影 → base64変換 → /api/food/analyze に base64を送信
                    → /api/food/save に base64を送信（サーバー側でStorageにアップ）
  ```
  **新フロー:**
  ```
  撮影 → Firebase StorageにクライアントSDKで直接アップロード → imageUrl取得
       → /api/food/analyze に { imageUrl } を送信
       → /api/food/save に { imageUrl, ... } を送信（base64不要）
  ```

  クライアント側のStorage直接アップロード例:
  ```ts
  import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
  import { storage } from '@/lib/firebase';

  const storageRef = ref(storage, `users/${uid}/meals/${Date.now()}.jpg`);
  const snapshot = await uploadBytes(storageRef, imageBlob);
  const imageUrl = await getDownloadURL(snapshot.ref);
  ```

  ※ `uid` は `useAuth()` などから取得する。
  ※ `/api/food/analyze` と `/api/food/save` のリクエストボディの `base64Image` / `imageBase64` を `imageUrl` に置き換えること。

- [ ] `/api/soul/profile` のレスポンス形式:
  ```json
  { "profile": { "content": "Markdown文字列", "version": 1, ... } }
  // 未生成時は { "profile": null }
  ```
  `content` を `react-markdown` で表示推奨（`npm install react-markdown`）

- [ ] `/api/food/save` と `/api/health/sync` のリクエストボディから `userId` を削除済み。
  代わりに `Authorization: Bearer {idToken}` ヘッダーが必須。

- [x] 食事記録の画像入力にギャラリー選択を追加してほしい。カメラ起動だけでなく「ライブラリから選ぶ」選択肢もUIに置く（`FoodAnalysisWizard` の撮影ステップ）。

- [ ] Soul Architectureのテストデータ投入済み:
  - パス: `/users/tqUkyNIfUrXmD7hfemPbcny2DAY2/soul_architecture/core`
  - `content` フィールドにMarkdown全文が入っている

---

## 共通メモ

- `src/lib/types.ts` は共有ファイル。変更前に相手PCと調整すること。
- 全APIルートは `Authorization: Bearer {idToken}` ヘッダーが必須（未認証は401）。
- Soul Architecture生成AIは `SOUL_AI_PROVIDER` / `SOUL_AI_MODEL` で制御（未設定時は `AI_PROVIDER` / `AI_MODEL` にフォールバック）。
