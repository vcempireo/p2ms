/**
 * 食事の総合評価を生成するモジュール（GASのgpt-4o-mini評価に相当）
 * 画像解析（GPT-4o）とは別に、安価・高速なモデルでaiSummaryを生成する
 */

interface MealEvalInput {
  mealType: string;
  menus: string[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber: number;
}

const EVAL_PROMPT = (input: MealEvalInput) => `
あなたは健康管理AIです。以下の食事データを総合評価してください。

【食事タイプ】${input.mealType}
【メニュー】${input.menus.join('、')}
【合計栄養素】
- カロリー: ${input.totalCalories} kcal
- タンパク質: ${input.totalProtein}g
- 脂質: ${input.totalFat}g
- 炭水化物: ${input.totalCarbs}g
- 発酵性食物繊維: ${input.totalFiber}g

以下の観点で3〜4文で簡潔に評価してください:
1. カロリー・PFCバランスの総評
2. 良い点（目標に合致している部分）
3. 気をつけるべき点（血糖値スパイク・高GI食品など）
`.trim();

/**
 * GPT-4o-miniで食事の総合評価を生成する
 * 失敗しても保存処理には影響しない（エラーは握りつぶす）
 */
export async function generateMealSummary(input: MealEvalInput): Promise<string> {
  const model = process.env.SUMMARY_AI_MODEL ?? 'gpt-4o-mini';

  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: EVAL_PROMPT(input) }],
      max_tokens: 400,
    });

    return response.choices[0]?.message?.content?.trim() ?? '';
  } catch (e) {
    console.error('[meal-evaluator] aiSummary生成失敗（保存は続行）:', e);
    return '';
  }
}
