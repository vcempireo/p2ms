'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { AnalyzedFoodItem, AnalyzeResponse, MealType } from '@/lib/types';

type AnalysisStatus =
  | { phase: 'idle' }
  | { phase: 'analyzing'; previewUrl: string; mealType: MealType }
  | { phase: 'done'; previewUrl: string; mealType: MealType; imageUrl: string; result: AnalyzeResponse; items: AnalyzedFoodItem[] }
  | { phase: 'error'; previewUrl: string; mealType: MealType; imageBlob: Blob; message: string };

interface FoodAnalysisContextType {
  state: AnalysisStatus;
  startAnalysis: (previewUrl: string, mealType: MealType) => void;
  setDone: (imageUrl: string, result: AnalyzeResponse, items: AnalyzedFoodItem[]) => void;
  setError: (message: string, imageBlob: Blob) => void;
  reset: () => void;
}

const FoodAnalysisContext = createContext<FoodAnalysisContextType | null>(null);

export function FoodAnalysisProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AnalysisStatus>({ phase: 'idle' });

  const startAnalysis = useCallback((previewUrl: string, mealType: MealType) => {
    setState({ phase: 'analyzing', previewUrl, mealType });
  }, []);

  const setDone = useCallback((imageUrl: string, result: AnalyzeResponse, items: AnalyzedFoodItem[]) => {
    setState(prev =>
      prev.phase === 'analyzing'
        ? { phase: 'done', previewUrl: prev.previewUrl, mealType: prev.mealType, imageUrl, result, items }
        : prev
    );
  }, []);

  const setError = useCallback((message: string, imageBlob: Blob) => {
    setState(prev =>
      prev.phase === 'analyzing'
        ? { phase: 'error', previewUrl: prev.previewUrl, mealType: prev.mealType, imageBlob, message }
        : prev
    );
  }, []);

  const reset = useCallback(() => setState({ phase: 'idle' }), []);

  return (
    <FoodAnalysisContext.Provider value={{ state, startAnalysis, setDone, setError, reset }}>
      {children}
    </FoodAnalysisContext.Provider>
  );
}

export const useFoodAnalysis = () => {
  const ctx = useContext(FoodAnalysisContext);
  if (!ctx) throw new Error('FoodAnalysisProvider missing');
  return ctx;
};
