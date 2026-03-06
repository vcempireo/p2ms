'use client';

import { useRouter } from 'next/navigation';
import { useFoodAnalysis } from './FoodAnalysisContext';
import { CheckCircle2, RefreshCw } from 'lucide-react';

export default function AnalysisBanner() {
  const { state } = useFoodAnalysis();
  const router = useRouter();

  if (state.phase === 'idle') return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-50 safe-top"
      onClick={state.phase === 'done' || state.phase === 'error' ? () => router.push('/food/new') : undefined}
    >
      {state.phase === 'analyzing' && (
        <div className="bg-ios-label/95 backdrop-blur-xl mx-3 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-ios-fab">
          {state.previewUrl && (
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
              <img src={state.previewUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">AIが解析中...</p>
            <p className="text-white/60 text-xs">{state.mealType} · バックグラウンドで処理中</p>
          </div>
          <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin flex-shrink-0" />
        </div>
      )}

      {state.phase === 'done' && (
        <div className="bg-ios-green mx-3 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-ios-fab cursor-pointer active:opacity-80">
          {state.previewUrl && (
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
              <img src={state.previewUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">解析完了！</p>
            <p className="text-white/80 text-xs">タップして結果を確認</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
        </div>
      )}

      {state.phase === 'error' && (
        <div className="bg-ios-red mx-3 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-ios-fab cursor-pointer active:opacity-80">
          {state.previewUrl && (
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
              <img src={state.previewUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">解析失敗</p>
            <p className="text-white/80 text-xs">タップして再試行</p>
          </div>
          <RefreshCw className="w-5 h-5 text-white flex-shrink-0" />
        </div>
      )}
    </div>
  );
}
