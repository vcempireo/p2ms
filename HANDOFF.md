# HANDOFF.md - PC間の引き継ぎメモ

作業開始時に必ず読むこと。対応したらチェック（[x]）を入れてから消す。

---

## PC1（HEALTHY-PC）→ PC2（heal.local）へ

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
