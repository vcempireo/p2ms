# P²MS プロジェクト メモリ

## プロジェクト概要
個人用統合ヘルスマネジメントシステム。将来的にアプリ販売も想定。
- Firebase Project ID: p2ms-core
- 開発者アカウント: vcempireo@gmail.com
- 本番ホスティング: Vercel予定

## 技術スタック
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS（モバイルファースト）
- Firebase Firestore / Storage / Auth（Googleログイン）
- OpenAI GPT-4o Vision（AIモデル切り替え対応）
- パッケージマネージャ: npm

## 実装済み機能（2026-03-05時点）
- Googleログイン（Firebase Auth）
- 食事写真AI解析（GPT-4o Vision / Gemini / Claude 切り替え対応）
- Firestore保存（food_raw_log / meal_summary / health_log）
- Firebase Storageへの画像アップロード
- 今日の食事サマリー表示（TodayFoodSummary）
- 食事履歴カレンダー（/food）
- HealthKit同期API（/api/health/sync）

## Firestoreコレクション構成
/users/{uid}/food_raw_log/{docId}  # 1食品1ドキュメント
/users/{uid}/meal_summary/{docId}  # 1食事単位
/users/{uid}/health_log/{docId}    # HealthKitデータ
※既存の daily_logs コレクションも残存（旧CSVインポーター用）

## 重要なファイル
- src/lib/firebase.ts        # Auth/Firestore/Storage（クライアント）
- src/lib/firebase-admin.ts  # Admin SDK（遅延初期化・APIルート専用）
- src/lib/ai-analyzer.ts     # AIモデル切り替えロジック
- src/lib/types.ts           # 型定義（MealType/MealSummary等）
- src/components/AuthProvider.tsx       # ログイン状態管理
- src/components/FoodAnalysisWizard.tsx # 食事記録ウィザード
- src/app/api/food/analyze/route.ts     # AI解析API
- src/app/api/food/save/route.ts        # 保存API
- src/app/api/health/sync/route.ts      # HealthKit同期API

## AIモデル切り替え方法
.env.local の AI_PROVIDER と AI_MODEL を変更するだけ
- openai: gpt-4o
- gemini: gemini-1.5-pro
- anthropic: claude-3-5-sonnet-20241022

## ユーザー好み・注意事項
- コメントは日本語
- 勝手に実装せず確認を取ってから進める
- モバイルファースト必須
- 説明は素人にもわかる言葉で

## 既知の注意点
- layout.tsx に `export const dynamic = 'force-dynamic'` が必要（Firebase SSRエラー回避）
- firebase-admin.ts は遅延初期化（ビルド時エラー回避）
- Gemini/Anthropic SDKは webpackIgnore で動的import
