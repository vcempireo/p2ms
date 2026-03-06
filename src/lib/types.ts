import { Timestamp } from 'firebase/firestore';

// ============================================================
// ワークアウト関連（既存）
// ============================================================

export interface WorkoutResult {
  set: number;
  reps: number;
  weight: number;
}

export interface Workout {
  id: string;
  date: string;
  menu: string;
  name: string;
  goal: string;
  results: WorkoutResult[];
}

export interface WorkoutPattern {
  id: string;
  name: string;
  exercises: { name: string; goal: string }[];
}

// ============================================================
// 食事関連（新規）
// ============================================================

export type MealType = '朝食' | '昼食' | '夕食' | '間食';

export type AIProvider = 'openai' | 'gemini' | 'anthropic';

/** AIが1食品ごとに返す解析結果 */
export interface AnalyzedFoodItem {
  menu: string;
  estimatedAmount: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  otherNutrients: string;
}

/** AI解析APIのレスポンス */
export interface AnalyzeResponse {
  items: AnalyzedFoodItem[];
  aiProvider: AIProvider;
  aiModel: string;
  imageUrl: string; // サーバー側でStorageアップロードしたURL
}

/** Firestore: food_raw_log ドキュメント（1食品 = 1ドキュメント） */
export interface FoodRawLog {
  timestamp: Timestamp;
  imageUrl: string;
  menu: string;
  estimatedAmount: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  otherNutrients: string;
  mealType: MealType;
  mealSummaryId: string;
  aiProvider: AIProvider;
  aiModel: string;
}

/** Firestore: meal_summary ドキュメント（1食事単位） */
export interface MealSummary {
  id?: string; // Firestoreドキュメントのid（取得時に付与）
  mealTime: Timestamp;
  mealType: MealType;
  imageUrl: string;
  menus: string[];
  aiSummary: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber: number;
  aiProvider: AIProvider;
  aiModel: string;
}

/** Firestore: health_log ドキュメント（HealthKitデータ） */
export interface HealthLog {
  timestamp: Timestamp;
  weight?: number;
  bodyFat?: number;
  bmi?: number;
  lbm?: number;
  steps?: number;
}

/** 食事タイプを時間帯から自動判定 */
export const getMealType = (date: Date): MealType => {
  const hour = date.getHours();
  if (hour >= 5 && hour <= 10) return '朝食';
  if (hour >= 11 && hour <= 15) return '昼食';
  if (hour >= 16 && hour <= 21) return '夕食';
  return '間食';
};
