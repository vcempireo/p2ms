# P²MS - Claude への指示書

## プロジェクト概要
個人用統合ヘルスマネジメントシステム（将来的にアプリ販売も想定）。
- Firebase Project ID: p2ms-core
- 本番ホスティング: Vercel予定

## 技術スタック
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS（モバイルファースト）
- Firebase Firestore / Storage / Auth（Googleログイン）
- OpenAI GPT-4o Vision（AI解析）
- パッケージマネージャ: npm

## 開発ルール
- コメントは日本語で書く
- 勝手に実装せず、必ずユーザーに確認してから進める
- モバイルファースト必須（スマホUIを最優先）
- 説明はわかりやすい言葉で（専門用語を避ける）
- 過剰な実装をしない。必要最小限のコードで済ませる

## 2台PC体制での開発分担

### PC1 - HEALTHY-PC.local（UI・フロントエンド担当）
- 担当範囲: `src/app/**`（APIルートを除く）、`src/components/**`、`src/styles/**`
- ブランチ命名: `feature/ui-*`

### PC2 - heal.local（サーバーサイド担当）
- 担当範囲: `src/app/api/**`、`src/lib/**`、`scripts/**`
- ブランチ命名: `feature/api-*`

### 共有ファイル（変更前に要確認）
- `src/lib/types.ts` ← 両PCが参照するため、変更時は相手PCと調整する

## 重要なファイル
- `src/lib/firebase.ts` - Auth/Firestore/Storage（クライアント）
- `src/lib/firebase-admin.ts` - Admin SDK（APIルート専用・遅延初期化）
- `src/lib/ai-analyzer.ts` - AIモデル切り替えロジック
- `src/lib/types.ts` - 型定義（共有ファイル）
- `src/components/AuthProvider.tsx` - ログイン状態管理
- `src/components/FoodAnalysisWizard.tsx` - 食事記録ウィザード

## Firestoreコレクション構成
```
/users/{uid}/food_raw_log/{docId}   # 1食品1ドキュメント
/users/{uid}/meal_summary/{docId}   # 1食事単位
/users/{uid}/health_log/{docId}     # HealthKitデータ
/daily_logs/{docId}                 # 旧CSVインポーターデータ（読み取り専用扱い）
```

## 既知の注意点
- `layout.tsx` に `export const dynamic = 'force-dynamic'` が必要（Firebase SSRエラー回避）
- `firebase-admin.ts` は遅延初期化（ビルド時エラー回避）
- Gemini/Anthropic SDKは webpackIgnore で動的import
