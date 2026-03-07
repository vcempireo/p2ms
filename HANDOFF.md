# HANDOFF.md - PC間の引き継ぎメモ

作業開始時に必ず読むこと。対応したらチェック（[x]）を入れてから消す。

---

## PC1（HEALTHY-PC）→ PC2（heal.local）へ

（現在対応待ちなし）

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

---

## 📩 最新のタスク・指示 (LINEからの入力)
> **日時**: 2026/3/7 17:33:46
> **指名対象**: [@FE / フロントエンド]
> **指示内容**:
> テスト指示だよ

---

## 📩 最新のタスク・指示 (LINEからの入力)
> **日時**: 2026/3/7 17:42:42
> **指名対象**: [@FE / フロントエンド]
> **指示内容**:
> テスト指示だよ
