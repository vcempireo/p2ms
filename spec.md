# P²MS 食事AI解析機能 — 実装仕様書

作成日: 2026-03-05
フェーズ: Milestone 1〜3（食事AI解析コア実装）

---

## 1. 現状把握（既存コードの整理）

### 動いているもの
| ファイル | 内容 | 状態 |
|---|---|---|
| `src/lib/firebase.ts` | Firestoreクライアント初期化 | ✅ 動作中（Storage/Auth未設定）|
| `src/app/page.tsx` | ホーム（Bentoグリッド、体重グラフ） | ✅ 動作中 |
| `src/app/food/page.tsx` | 食事カレンダーギャラリー | ✅ UIあり（データは旧スキーマ依存）|
| `src/app/upload/page.tsx` | CSV一括インポーター（HealthKit/筋トレ） | ✅ 動作中 |
| `src/components/FoodForm.tsx` | 食事記録UI | ⚠️ スタブのみ（アラート表示だけ）|
| `src/lib/pms-profile.json` | ユーザー設定・ワークアウトライブラリ | ✅ 参照中 |

### 問題点
- **Firestoreスキーマが旧設計**: 現在 `daily_logs/{date}` の1ドキュメントに全データをネスト。仕様書の設計と乖離。
- **Firebase Storage未設定**: 食事写真の保存先がない。
- **Firebase Auth未設定**: 認証なし（今フェーズはシンプルに対応）。
- **OpenAI API未接続**: GPT-4o Vision呼び出しロジック未実装。
- **APIルート不在**: `/api/food/analyze`、`/api/food/save`、`/api/health/sync` ゼロから作成が必要。

---

## 2. 実装スコープ（今フェーズ）

### 実装する機能
1. Firebase Storage設定追加
2. Firestoreの新コレクション設計（`food_raw_log` / `meal_summary` / `health_log`）
3. API: `POST /api/food/analyze` — GPT-4o Visionで食事写真解析
4. API: `POST /api/food/save` — 解析結果をFirestoreへ保存
5. API: `POST /api/health/sync` — HealthKitデータ一括同期（重複スキップ）
6. 食事記録画面: カメラ→解析→確認→保存の完全フロー
7. ホーム画面: 今日の食事サマリー表示（新コレクション対応）
8. 食事履歴画面: 新コレクションからデータ取得・表示

### 実装しない機能（今フェーズ対象外）
- ワークアウト機能の改修
- Firebase Auth の本格実装（単一ユーザー前提でルール緩和で対応）
- 定番メニューDB（`regular_menus`）の管理UI

---

## 3. 技術設計

### 3.1 Firestoreコレクション設計

```
/users/{userId}/
  /food_raw_log/{docId}    # 1食品 = 1ドキュメント
  /meal_summary/{docId}    # 1食事（食事単位）
  /health_log/{docId}      # HealthKitデータ（柔軟スキーマ）
  /profile/{docId}         # ユーザープロフィール・栄養戦略
  /regular_menus/{docId}   # 定番メニューDB
```

> ※ 既存の `daily_logs` コレクションはこのフェーズでは**触らない**。
> 旧CSVインポーターはそのまま残す。新機能は新コレクションに書き込む。

**food_raw_log ドキュメント**
```typescript
{
  timestamp: Timestamp,
  imageUrl: string,        // Firebase Storage URL
  menu: string,
  estimatedAmount: string,
  calories: number,
  protein: number,
  fat: number,
  carbs: number,
  fiber: number,
  otherNutrients: string,
  mealType: '朝食' | '昼食' | '夕食' | '間食',
  mealSummaryId: string    // 関連するmeal_summaryのID
}
```

**meal_summary ドキュメント**
```typescript
{
  mealTime: Timestamp,
  mealType: '朝食' | '昼食' | '夕食' | '間食',
  imageUrl: string,
  menus: string[],
  aiSummary: string,
  totalCalories: number,
  totalProtein: number,
  totalFat: number,
  totalCarbs: number,
  totalFiber: number
}
```

**health_log ドキュメント**
```typescript
{
  timestamp: Timestamp,
  weight?: number,
  bodyFat?: number,
  bmi?: number,
  lbm?: number,
  steps?: number
}
```

### 3.2 認証設計（Firebase Auth × Googleログイン）

将来的なアプリ販売を見越して、最初からアカウント管理を組み込む。

**ログイン方式:** Googleアカウントでサインイン（Firebase Auth）

**フロー:**
```
未ログイン → /login ページ
  ↓ 「Googleでログイン」ボタン
Firebase Auth（Googleポップアップ）
  ↓ 認証成功
ホーム画面（/）へリダイレクト
```

**Firestoreのデータ構造:**
各ユーザーのデータは自分のIDで完全に分離される。
```
/users/{uid}/food_raw_log/...   # uidはFirebase Authが自動発行
/users/{uid}/meal_summary/...
/users/{uid}/health_log/...
```

**Firestore Security Rules:**
```
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```
→ 自分のデータには自分だけアクセス可能。他ユーザーのデータは見えない。

**開発中の運用:**
- 開発者アカウント: vcempireo@gmail.com
- ローカル開発でも本番と同じGoogleログインを使う（Firebase Emulatorは使わない）

**追加するファイル:**
- `src/app/login/page.tsx` — ログイン画面
- `src/components/AuthProvider.tsx` — アプリ全体でログイン状態を管理
- `src/lib/firebase.ts` — Authクライアント追加

**未ログイン時の保護:**
全ページで `AuthProvider` がログイン状態を確認。未ログインなら `/login` にリダイレクト。

### 3.3 AIモデル設定（切り替え対応）

解析に使うAIモデルは環境変数で管理し、UIにも表示する。

**環境変数:**
```bash
AI_PROVIDER=openai          # openai | gemini | anthropic
AI_MODEL=gpt-4o             # 使用するモデル名（例: gpt-4o, gemini-1.5-pro）
```

**型定義:**
```typescript
type AIProvider = 'openai' | 'gemini' | 'anthropic';

// Firestoreに保存するmeal_summaryにも記録
{
  ...
  aiProvider: AIProvider,   // どのAIで解析したか
  aiModel: string,          // 具体的なモデル名
}
```

**UIでの表示:**
- 解析結果確認画面に「🤖 GPT-4o で解析」のようなバッジを表示
- 保存後の食事カード・詳細画面にも小さく表示
- モデルが変わっても自動的に表示名が切り替わる

---

### 3.4 APIルート設計

#### `POST /api/food/analyze`
- **入力**: `{ base64Image: string }`
- **処理**: 環境変数 `AI_PROVIDER`/`AI_MODEL` で指定されたモデルで解析
- **出力**:
```typescript
{
  items: [{
    menu: string,
    estimatedAmount: string,
    calories: number,
    protein: number,
    fat: number,
    carbs: number,
    fiber: number,
    otherNutrients: string
  }],
  aiProvider: string,   // 実際に使用したプロバイダ
  aiModel: string       // 実際に使用したモデル名
}
```
- **エラー**: タイムアウト60秒、リトライなし、エラーメッセージを返す

#### `POST /api/food/save`
- **入力**:
```typescript
{
  imageBase64: string,      // Storageアップロード用
  mealType: string,
  mealTime: string,         // ISO 8601
  items: AnalyzedFoodItem[],
  aiProvider: string,       // 解析に使ったプロバイダ
  aiModel: string           // 解析に使ったモデル名
}
```
- **処理**:
  1. Firebase Storageに画像をアップロード（Admin SDK）
  2. `meal_summary` ドキュメント作成
  3. 各食品を `food_raw_log` に保存
- **出力**: `{ success: true, mealSummaryId: string }`

#### `POST /api/health/sync`
- **入力**:
```typescript
{
  records: [{
    timestamp: string,
    weight?: number,
    bodyFat?: number,
    bmi?: number,
    lbm?: number,
    steps?: number
  }]
}
```
- **処理**: `timestamp` をドキュメントIDとしてupsert（重複スキップ）
- **出力**: `{ synced: number, skipped: number }`

### 3.4 OpenAI プロンプト設計

```
あなたは栄養士AIです。
添付の食事写真を分析し、以下のJSON形式で全ての食品を列挙してください。

出力フォーマット（JSON配列）:
[{
  "menu": "食品名（日本語）",
  "estimatedAmount": "推定量（例: 1杯, 100g）",
  "calories": 数値,
  "protein": 数値,
  "fat": 数値,
  "carbs": 数値,
  "fiber": 数値,
  "otherNutrients": "その他の特記すべき栄養素（日本語）"
}]

注意:
- 血糖値スパイクを起こしやすい食品には必ず言及する
- 発酵性食物繊維（FODMAP）を含む場合は otherNutrients に記載
- 不明な場合は一般的な値で推定し、推定であることを otherNutrients に記載
- 必ずJSON配列のみ返す（説明文不要）
```

### 3.5 食事タイプ判定ロジック

```typescript
const getMealType = (hour: number): MealType => {
  if (hour >= 5 && hour <= 10) return '朝食';
  if (hour >= 11 && hour <= 15) return '昼食';
  if (hour >= 16 && hour <= 21) return '夕食';
  return '間食';
};
```

---

## 4. 画面設計

### 4.1 食事記録画面（新規 `/record` または `/food/new`）

**ステップ構成（ウィザード形式）:**

```
[Step 1] 写真撮影・選択
  - スマホカメラ起動ボタン（capture="environment"）
  - ギャラリーから選択
  - 撮影後プレビュー表示

[Step 2] AI解析中
  - ローディングアニメーション
  - 「GPT-4oが解析中...」表示

[Step 3] 解析結果確認・編集
  - 食品リスト（menu, amount, cal, P/F/C/F）
  - 各項目は編集可能（インライン編集）
  - 食品の追加・削除ボタン
  - 合計カロリー・PFC表示

[Step 4] 保存確認
  - 食事タイプ確認・変更（自動判定を上書き可）
  - 「保存する」ボタン
  - 保存成功後 → ホームへリダイレクト
```

### 4.2 ホーム画面（更新）

現状のBentoグリッドを維持しつつ、Food Journalカードを新コレクションのデータで更新：
- 今日の合計カロリーを `meal_summary` から集計
- PFCバーを実データで表示

### 4.3 食事履歴画面（`/food`）

現状のカレンダーギャラリーUIを維持しつつ、データ取得先を `meal_summary` に変更：
- サムネイル画像を `meal_summary.imageUrl` から取得
- 日次カロリーを集計して表示

---

## 5. ファイル構成（追加・変更するもの）

```
src/
├── app/
│   ├── api/
│   │   ├── food/
│   │   │   ├── analyze/route.ts   [新規] AI解析（モデル切り替え対応）
│   │   │   └── save/route.ts      [新規] Firestore保存+Storage
│   │   └── health/
│   │       └── sync/route.ts      [新規] HealthKit同期
│   ├── login/
│   │   └── page.tsx               [新規] Googleログイン画面
│   ├── food/
│   │   ├── new/
│   │   │   └── page.tsx           [新規] 食事記録ウィザード
│   │   └── page.tsx               [更新] meal_summaryから読み込み
│   └── page.tsx                   [更新] 今日の食事データ表示
├── components/
│   ├── AuthProvider.tsx           [新規] ログイン状態の管理・未ログインリダイレクト
│   ├── FoodAnalysisWizard.tsx     [新規] 撮影→解析→確認→保存
│   └── TodayFoodSummary.tsx       [新規] 今日のPFCサマリーカード
├── lib/
│   ├── firebase.ts                [更新] Auth・Storage追加
│   ├── firebase-admin.ts          [新規] Admin SDK初期化（APIルート用）
│   ├── ai-analyzer.ts             [新規] AIモデル切り替えロジック
│   └── types.ts                   [更新] FoodItem・User等の型追加
└── .env.local.example             [新規] 必要な環境変数一覧
```

---

## 6. 環境変数

`.env.local.example` に定義する変数:

```bash
# Firebase（フロントエンド）
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK（APIルート用・サーバーサイドのみ）
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# AI設定（モデル切り替えはここだけ変えればOK）
AI_PROVIDER=openai          # openai | gemini | anthropic
AI_MODEL=gpt-4o             # 例: gpt-4o, gemini-1.5-pro, claude-3-5-sonnet-20241022

# 各プロバイダのAPIキー（使うものだけ設定すればOK）
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=

# アプリ設定
NEXT_PUBLIC_USER_ID=owner
```

---

## 7. 依存パッケージ（追加が必要なもの）

```bash
npm install openai firebase-admin
```

---

## 8. 実装しない・後回しにするもの

- メール/パスワード登録（Googleログインのみで十分）
- ユーザー招待・管理画面（将来のアプリ販売時に追加）
- `regular_menus` の管理UI
- カロリー推移グラフ（Recharts自体は既に入っているが今フェーズは省略）
- ワークアウト機能の改修

---

## 9. 懸念事項・確認事項

1. **Firebase Admin SDK の秘密鍵**: Vercelの環境変数に登録する方法を確認（改行のエスケープ問題）
2. **画像サイズ**: スマホ撮影画像はbase64で数MBになりうる。APIルートに渡す前にリサイズが必要（Canvas APIで1024px以下に圧縮）
3. **OpenAI APIタイムアウト**: 60秒のタイムアウト設定。Vercel Proでないとデフォルト10秒制限あり → Vercel の `maxDuration` 設定が必要
4. **既存 daily_logs との共存**: 既存UIは `daily_logs` を参照している。新機能は `food_raw_log`/`meal_summary` に書くため、ホームと食事ページは**両方のコレクション**を参照する過渡期を設ける
