# P²MS 実装 TODO

## Milestone 1: Firebase設定 + 認証基盤 ✅
- [x] `.env.local.example` 作成
- [x] `src/lib/types.ts` に食事・ユーザー関連の型を追加
- [x] `src/lib/firebase.ts` に Auth・Storage を追加
- [x] `src/lib/firebase-admin.ts` 作成（APIルート用Admin SDK・遅延初期化）
- [x] `src/components/AuthProvider.tsx` 作成（Googleログイン状態管理）
- [x] `src/app/login/page.tsx` 作成（Googleログイン画面）
- [x] `src/app/layout.tsx` に AuthProvider を組み込む

## Milestone 2: コア機能（写真 → AI解析 → Firestore保存）✅
- [x] `src/lib/ai-analyzer.ts` 作成（AIモデル切り替えロジック: OpenAI/Gemini/Anthropic）
- [x] `src/app/api/food/analyze/route.ts` 作成
- [x] `src/app/api/food/save/route.ts` 作成
- [x] `src/app/api/health/sync/route.ts` 作成
- [x] `src/components/FoodAnalysisWizard.tsx` 作成（撮影→解析→確認→保存）
- [x] `src/app/food/new/page.tsx` 作成（食事記録ページ）

## Milestone 3: UI仕上げ ✅
- [x] `src/components/TodayFoodSummary.tsx` 作成（今日のカロリー・PFC表示）
- [x] `src/app/page.tsx` 更新（TodayFoodSummary に差し替え、食事記録ボタンを /food/new へ）
- [x] `src/app/food/page.tsx` 更新（meal_summary からカレンダー表示、AIモデル表示）
- [x] `next.config.js` に Firebase Storage ドメインを追加

---

## 次のステップ（今後の課題）
- [ ] `.env.local` を実際の値で作成してローカル動作確認
- [ ] Firebase Console で Googleログインを有効化
- [ ] Firebase Console で Firestoreルールを設定
- [ ] Firebase Console で Storage を有効化・ルール設定
- [ ] Vercel にデプロイして環境変数を設定
