# HANDOFF.md - PC間の引き継ぎメモ

作業開始時に必ず読むこと。対応したらチェック（[x]）を入れてから消す。

---

## PC1（HEALTHY-PC）→ PC2（heal.local）へ

- [ ] **【重要】health_log のドキュメント設計を変更した。PC2側のデータ投入スクリプトも合わせてほしい**

  **変更内容:**
  ```
  旧: docId = タイムスタンプベース（2024-01-15T07-30-00-000）、メトリクスごとに別ドキュメント
  新: docId = JST日付（2024-01-15）、同じ日のデータは1ドキュメントにマージ
  ```

  **新しいドキュメント構造:**
  ```ts
  // /users/{uid}/health_log/2024-01-15
  {
    timestamp: Timestamp,  // その日の最後の計測時刻
    weight?: number,
    bodyFat?: number,
    bmi?: number,
    lbm?: number,
    steps?: number,
  }
  ```

  **理由:**
  - 1日1ドキュメントにすることで「最新のBMI」を探すために全件スキャンが不要になる
  - merge: true で書き込むのでHealthKitが別タイムスタンプで送ってきても同日はまとまる
  - NoSQLとして自然な設計（日付がキー＝アクセスパターンと一致）

  **対応をお願いしたいこと:**
  - CSVインポートスクリプト（`scripts/`）があれば docId を日付ベースに変更してほしい
  - `/api/health/sync` と `/api/health/webhook` はPC1側で修正済み
  - 既存の旧形式ドキュメントは放置で良い（新しいデータが来たら日付docが作られるので）

- [ ] **【情報】Health Auto Export webhook エンドポイントをPC1側で実装済み**

  PC2担当範囲だが、UI実装に合わせてAPI側も作成した。レビューしてほしい。

  作成したファイル:
  - `src/app/api/health/webhook/route.ts` - HAEのPOSTデータを受け取る
  - `src/app/api/health/webhook-token/route.ts` - トークン生成・取得

  認証方式: URLパラメータ `?uid=xxx&token=xxx`（HAEはBearer送れないため）
  トークン保存先: Firestore `/users/{uid}` の `webhookToken` フィールド

  Health Auto Export のメトリクス名マッピング:
  - `body_mass` → `weight`
  - `body_fat_percentage` → `bodyFat`
  - `body_mass_index` → `bmi`
  - `lean_body_mass` → `lbm`
  - `step_count` → `steps`

---

## PC2（heal.local）→ PC1（HEALTHY-PC）へ

（現在対応待ちなし）

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
/users/{uid}/health_log/2024-01-15  # HealthKitデータ（docId=JST日付、1日1ドキュメント）
/users/{uid}/soul_architecture/core # Soul Architecture（contentフィールドにMarkdown）
/daily_logs/{docId}                 # 旧データ（読み取り専用）
```
