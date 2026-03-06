import { AnalyzedFoodItem, AIProvider } from './types';

/** AI解析APIへのリクエスト結果 */
export interface AnalysisResult {
  items: AnalyzedFoodItem[];
  aiProvider: AIProvider;
  aiModel: string;
}

/**
 * 食事写真をAIで解析する
 * 環境変数 AI_PROVIDER / AI_MODEL でモデルを切り替え可能
 * @param imageUrl Firebase Storage の公開URL
 */
export async function analyzeFoodImage(imageUrl: string): Promise<AnalysisResult> {
  const provider = (process.env.AI_PROVIDER ?? 'openai') as AIProvider;
  const model = process.env.AI_MODEL ?? 'gpt-4o';

  switch (provider) {
    case 'openai':
      return analyzeWithOpenAI(imageUrl, model);
    case 'gemini':
      return analyzeWithGemini(imageUrl, model);
    case 'anthropic':
      return analyzeWithAnthropic(imageUrl, model);
    default:
      throw new Error(`未対応のAIプロバイダ: ${provider}`);
  }
}

// ============================================================
// 食事解析プロンプト（共通）
// ============================================================
const SYSTEM_PROMPT = `あなたは栄養士AIです。
添付の食事写真を分析し、以下のJSON形式で全ての食品を列挙してください。

出力フォーマット（JSON配列のみ・説明文不要）:
[{
  "menu": "食品名（日本語）",
  "estimatedAmount": "推定量（例: 1杯, 100g）",
  "calories": 数値,
  "protein": 数値,
  "fat": 数値,
  "carbs": 数値,
  "fiber": 数値,
  "otherNutrients": "その他の特記すべき栄養素や注意点（日本語）"
}]

注意事項:
- 血糖値スパイクを起こしやすい食品には必ず otherNutrients に言及する
- 発酵性食物繊維（FODMAP）を含む場合は otherNutrients に記載
- 不明な場合は一般的な値で推定し、推定であることを otherNutrients に記載
- 必ずJSON配列のみ返す（マークダウンのコードブロックも不要）`;

// ============================================================
// OpenAI GPT-4o Vision
// ============================================================
async function analyzeWithOpenAI(imageUrl: string, model: string): Promise<AnalysisResult> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content ?? '[]';
  const items: AnalyzedFoodItem[] = JSON.parse(content);

  return { items, aiProvider: 'openai', aiModel: model };
}

// ============================================================
// Google Gemini Vision
// ============================================================
async function analyzeWithGemini(imageUrl: string, model: string): Promise<AnalysisResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { GoogleGenerativeAI } = (await import(/* webpackIgnore: true */ '@google/generative-ai' as any)) as any;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
  const geminiModel = genAI.getGenerativeModel({ model });

  const result = await geminiModel.generateContent([
    SYSTEM_PROMPT,
    {
      fileData: {
        fileUri: imageUrl,
        mimeType: 'image/jpeg',
      },
    },
  ]);

  const content = result.response.text();
  // マークダウンのコードブロックが含まれる場合は除去
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const items: AnalyzedFoodItem[] = JSON.parse(cleaned);

  return { items, aiProvider: 'gemini', aiModel: model };
}

// ============================================================
// Anthropic Claude Vision
// ============================================================
async function analyzeWithAnthropic(imageUrl: string, model: string): Promise<AnalysisResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Anthropic = ((await import(/* webpackIgnore: true */ '@anthropic-ai/sdk' as any)) as any).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: imageUrl,
            },
          },
          { type: 'text', text: SYSTEM_PROMPT },
        ],
      },
    ],
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : '[]';
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const items: AnalyzedFoodItem[] = JSON.parse(cleaned);

  return { items, aiProvider: 'anthropic', aiModel: model };
}
