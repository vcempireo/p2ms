# HANDOFF.md - PC間の引き継ぎメモ

作業開始時に必ず読むこと。対応したらチェック（[x]）を入れてから消す。

---

## PC1（HEALTHY-PC）→ PC2（heal.local）へ

- [ ] 特になし

---

## PC2（heal.local）→ PC1（HEALTHY-PC）へ

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
