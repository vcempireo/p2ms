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

- [ ] **画像転送の軽量化アイデア（相談）**
  現在: クライアント側でbase64化 → JSONに乗せてAPIへ送信（元サイズ+33%、タイムアウトリスク大）

  **推奨案: Firebase Storage経由**
  1. クライアントで圧縮（1024px/0.85品質、現状維持）
  2. `uploadBytes()` で `/food_images/{uid}/{timestamp}.jpg` に直アップ
  3. `getDownloadURL()` でURLを取得
  4. `/api/food/analyze` にはURLだけ送る（JSONが数十バイトになる）
  5. APIサーバー側でURLからfetchして画像バイナリをAIに渡す

  メリット: APIペイロード激減・タイムアウト解消・画像がStorageに永続保存される
  PC2側で `/api/food/analyze` のリクエスト形式変更が必要 → `{ storageUrl: string }` or `{ base64Image: string }` 両対応でもOK

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
