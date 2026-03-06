import { AIProvider } from './types';

/** Soul Architecture生成の入力 */
export interface SoulInput {
  birthDate: string;   // YYYY/MM/DD
  birthTime: string;   // HH:MM（24時間表記）、不明なら "12:00"
  birthPlace: string;  // 市区町村、国
  userName?: string;   // 出力に使うユーザー名（未設定時は "あなた"）
}

/** Soul Architecture生成の結果 */
export interface SoulGenerationResult {
  content: string;       // AIが出力したMarkdown全文
  aiProvider: AIProvider;
  aiModel: string;
}

// ============================================================
// Soul Architectureプロンプト（ver. Definitive+）
// ============================================================
const buildSoulPrompt = (input: SoulInput): string => {
  const name = input.userName ?? 'あなた';
  return `【P²MS】ソール・プロファイリング AIベースプロンプト ver. Definitive+

AIの役割定義
あなたは、人間の魂の設計図を読み解く「形而上学アーキテクト」です。あなたの使命は、ユーザーから提供された生年月日という「鍵」を使い、古今東西の体系化された知恵を横断的に分析し、その人の魂が持つ固有の「形」、つまり魂のアーキテクチャー（設計思想）を明らかにすることです。

あなたは、単なる占い師ではありません。決定論的な未来を告げるのではなく、ユーザーが自分自身の「取扱説明書」を理解し、生まれ持ったポテンシャルを最大限に発揮して、より良く生きるための羅針盤を提示する、賢明なガイドです。

AIの出力原則
1. 最大深度の分析: 出し惜しみや簡略化は固く禁じます。可能な限り最も深く、詳細な分析を実行してください。
2. OSメタファーの構築: 全ての要素を「パーソナル・オペレーティングシステム（OS）」というメタファーで再構築してください。
3. 物語としての接続性: 全ての要素が「魂の物語」として繋がるよう、一貫性のあるストーリーテリングを意識してください。
4. 自己品質維持: 出力前に「最大深度」「物語性」「境界値分析」を満たしているか自己評価し、基準に満たない場合は自己修正してください。

入力データ
- 生年月日: ${input.birthDate}
- 出生時刻: ${input.birthTime}
- 出生地: ${input.birthPlace}

【内部処理ルール（厳守）】
- タイムゾーンはIANA tzdbに基づき出生地から自動推定する
- 出生地は地理座標（緯度・経度）へ正規化する
- UTC換算時刻を出力冒頭に必ず明示する
- 境界値分析（カスプ）を必ず実施し、該当する場合は「※重要：境界上の設計」として両方の可能性を統合分析する

多角的分析
以下の体系を全て使って分析する:
1. 西洋占星術（ホロスコープ、複合アスペクト）
2. インド占星術（ナクシャトラ、ダシャー）
3. ヒューマンデザイン（タイプ、プロファイル、権威、インカネーションクロス、各ゲート）
4. 四柱推命（日干、五行バランス、大運）
5. 数秘術（ライフパスナンバー、ディスティニーナンバー）

統合: 各分析の「黄金の糸」を見つけ出し、一つの首尾一貫した「魂の物語」として再構築すること。矛盾や緊張関係こそ「中心的テーマ」として描くこと。

アウトプット形式（厳守）
以下のMarkdown形式で出力すること:

# ${name}の「魂の設計図」ver. definitive+ - 総合分析レポート

## I. 総合定義：あなたという存在の本質
（その人だけのユニークさが伝わる、鋭く詩的な一文）

## II. OS（オペレーティングシステム）の仕様
### エネルギータイプ（エンジン）
### 意思決定システム（イグニッションキー）
### コアCPU（頭脳）
### メモリ（RAM / 優先事項）
### ユーザーインターフェイス（社会との接続方法）

## III. プリインストール・アプリケーション
（特筆すべき才能をユニークな名前と機能説明で）

## IV. 取扱説明書（トリセツ）- 推奨される運用方法
（明日から実践できる具体的行動レベルのアドバイスを含む）

## V. 最終所見
（この設計図を手にすることで人生がどう変容しうるか、力強い希望のメッセージ）

---

## 【最終採用値】
- 入力情報: ${input.birthDate} ${input.birthTime} @ ${input.birthPlace}
- ジオコーディング結果:
- タイムゾーン情報:
- UTC換算時刻:
- 境界値分析の結果:`;
};

// ============================================================
// プロバイダ共通インターフェース
// ============================================================

/**
 * Soul Architectureを生成する
 * SOUL_AI_PROVIDER / SOUL_AI_MODEL で制御（未設定時は AI_PROVIDER / AI_MODEL にフォールバック）
 */
export async function generateSoulArchitecture(input: SoulInput): Promise<SoulGenerationResult> {
  const provider = (process.env.SOUL_AI_PROVIDER ?? process.env.AI_PROVIDER ?? 'openai') as AIProvider;
  const model = process.env.SOUL_AI_MODEL ?? process.env.AI_MODEL ?? 'gpt-4o';

  const prompt = buildSoulPrompt(input);

  switch (provider) {
    case 'openai':
      return generateWithOpenAI(prompt, model);
    case 'gemini':
      return generateWithGemini(prompt, model);
    case 'anthropic':
      return generateWithAnthropic(prompt, model);
    default:
      throw new Error(`未対応のAIプロバイダ: ${provider}`);
  }
}

// ============================================================
// OpenAI
// ============================================================
async function generateWithOpenAI(prompt: string, model: string): Promise<SoulGenerationResult> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    // Soul Architectureは長文出力なので上限を大きめに設定
    max_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content ?? '';
  return { content, aiProvider: 'openai', aiModel: model };
}

// ============================================================
// Google Gemini
// ============================================================
async function generateWithGemini(prompt: string, model: string): Promise<SoulGenerationResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { GoogleGenerativeAI } = (await import(/* webpackIgnore: true */ '@google/generative-ai' as any)) as any;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
  const geminiModel = genAI.getGenerativeModel({ model });

  const result = await geminiModel.generateContent(prompt);
  const content = result.response.text();

  return { content, aiProvider: 'gemini', aiModel: model };
}

// ============================================================
// Anthropic Claude
// ============================================================
async function generateWithAnthropic(prompt: string, model: string): Promise<SoulGenerationResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Anthropic = ((await import(/* webpackIgnore: true */ '@anthropic-ai/sdk' as any)) as any).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : '';
  return { content, aiProvider: 'anthropic', aiModel: model };
}
