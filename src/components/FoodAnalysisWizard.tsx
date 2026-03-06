'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { AnalyzedFoodItem, AnalyzeResponse, MealType, getMealType } from '@/lib/types';
import { Camera, Images, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useFoodAnalysis } from './FoodAnalysisContext';

const AI_DISPLAY: Record<string, string> = {
  openai: 'GPT',
  gemini: 'Gemini',
  anthropic: 'Claude',
};

const MEAL_TYPES = ['朝食', '昼食', '夕食', '間食'] as const;

type Step = 'photo' | 'review' | 'saving' | 'done';

export default function FoodAnalysisWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('photo');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [items, setItems] = useState<AnalyzedFoodItem[]>([]);
  const [mealType, setMealType] = useState(getMealType(new Date()));
  const { state: analysisState, startAnalysis, setDone, setError: setGlobalError, reset } = useFoodAnalysis();
  const isAnalyzing = analysisState.phase === 'analyzing';
  const analyzeError = analysisState.phase === 'error' ? analysisState.message : null;
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // IDトークン取得ヘルパー
  const getAuthHeader = async () => {
    const idToken = await user?.getIdToken();
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };
  };

  // バックグラウンドで解析を実行（全体45秒でタイムアウト・ページを離れても継続）
  const runAnalysis = async (blob: Blob, preview: string, meal: MealType) => {
    if (!user) return;
    startAnalysis(preview, meal);

    const controller = new AbortController();
    // 全体45秒でタイムアウト（uploadBytes は AbortController 非対応のため Promise.race で対応）
    const globalTimeout = setTimeout(() => controller.abort(), 45000);

    try {
      // アップロードに20秒以上かかる場合はタイムアウト
      const storageRef = ref(storage, `users/${user.uid}/meals/${Date.now()}.jpg`);
      const url = await Promise.race([
        (async () => {
          const snapshot = await uploadBytes(storageRef, blob);
          return await getDownloadURL(snapshot.ref);
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('アップロードがタイムアウトしました')), 20000)
        ),
      ]);
      setImageUrl(url);

      const res = await fetch('/api/food/analyze', {
        method: 'POST',
        headers: await getAuthHeader(),
        body: JSON.stringify({ imageUrl: url }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? '解析に失敗しました');
      const result: AnalyzeResponse = await res.json();
      setDone(url, result, result.items);
      setAnalysisResult(result);
      setItems(result.items);
      setStep('review');
    } catch (e: any) {
      const msg = e.message ?? '解析に失敗しました';
      setGlobalError(
        e.name === 'AbortError' || msg.includes('504') || msg.includes('timeout')
          ? '解析がタイムアウトしました（再試行してください）'
          : msg,
        blob
      );
    } finally {
      clearTimeout(globalTimeout);
    }
  };

  // 画像選択 → 圧縮 → バックグラウンド解析を即開始
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    setAnalysisResult(null);
    setItems([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const preview = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewUrl(preview);
        canvas.toBlob((blob) => {
          if (!blob) return;
          setImageBlob(blob);
          runAnalysis(blob, preview, mealType);
        }, 'image/jpeg', 0.85);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const updateItem = (i: number, field: keyof AnalyzedFoodItem, value: string | number) => {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  };

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  // 保存
  const handleSave = async () => {
    if (!imageUrl || !user) return;
    setStep('saving');
    setError(null);
    try {
      const res = await fetch('/api/food/save', {
        method: 'POST',
        headers: await getAuthHeader(),
        body: JSON.stringify({
          imageUrl,
          mealType,
          mealTime: new Date().toISOString(),
          items,
          aiProvider: analysisResult?.aiProvider,
          aiModel: analysisResult?.aiModel,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? '保存に失敗しました');
      setStep('done');
      setTimeout(() => router.push('/'), 2000);
    } catch (e: any) {
      setError(e.message);
      setStep('review');
    }
  };

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein:  acc.protein  + item.protein,
      fat:      acc.fat      + item.fat,
      carbs:    acc.carbs    + item.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  // ────────────────────────────────
  // Step 1: 写真選択（バックグラウンド解析中もここを表示）
  // ────────────────────────────────
  if (step === 'photo') return (
    <div className="space-y-5">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

      {/* 写真エリア */}
      {previewUrl ? (
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden">
            <img src={previewUrl} alt="食事写真" className="w-full h-full object-cover" />
            {/* 解析中バナー（画像上にオーバーレイ） */}
            {isAnalyzing && (
              <div className="absolute bottom-0 inset-x-0 bg-black/50 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="text-white text-sm font-medium">AI が解析中...</span>
              </div>
            )}
            {/* エラーバナー */}
            {analyzeError && (
              <div className="absolute bottom-0 inset-x-0 bg-red-500/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between gap-2">
                <span className="text-white text-xs flex-1">{analyzeError}</span>
                <button
                  onClick={() => imageBlob && previewUrl && runAnalysis(imageBlob, previewUrl, mealType)}
                  className="flex items-center gap-1 bg-white/20 text-white text-xs px-3 py-1.5 rounded-full flex-shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />再試行
                </button>
              </div>
            )}
            {/* 写真削除ボタン */}
            {!isAnalyzing && (
              <button
                onClick={() => { setPreviewUrl(null); setImageBlob(null); setImageUrl(null); reset(); }}
                className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-6 rounded-2xl border-2 border-dashed border-ios-tertiary bg-ios-bg flex items-center justify-center gap-4 active:opacity-70 transition-opacity"
          >
            <div className="w-12 h-12 bg-ios-blue rounded-xl flex items-center justify-center shadow-ios-fab">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-ios-label">カメラで撮影</p>
              <p className="text-sm text-ios-secondary mt-0.5">今すぐ食事を撮る</p>
            </div>
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="w-full py-6 rounded-2xl border-2 border-dashed border-ios-tertiary bg-ios-bg flex items-center justify-center gap-4 active:opacity-70 transition-opacity"
          >
            <div className="w-12 h-12 bg-ios-purple rounded-xl flex items-center justify-center shadow-ios-fab">
              <Images className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-ios-label">ライブラリから選ぶ</p>
              <p className="text-sm text-ios-secondary mt-0.5">保存済みの写真を使う</p>
            </div>
          </button>
        </div>
      )}

      {/* 食事タイプ */}
      <div className="bg-ios-card rounded-2xl shadow-ios-sm overflow-hidden">
        <p className="px-4 pt-4 pb-2 text-xs font-semibold text-ios-secondary uppercase tracking-wider">食事の種類</p>
        <div className="flex border-t border-black/[0.06]">
          {MEAL_TYPES.map((type, i) => (
            <button
              key={type}
              onClick={() => setMealType(type)}
              className={`flex-1 py-3 text-sm font-medium transition-colors
                ${i < MEAL_TYPES.length - 1 ? 'border-r border-black/[0.06]' : ''}
                ${mealType === type ? 'text-ios-blue bg-blue-50' : 'text-ios-secondary'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ────────────────────────────────
  // Step 2: 確認・編集
  // ────────────────────────────────
  if (step === 'review') return (
    <div className="space-y-4">
      {/* プレビュー + AIバッジ */}
      {previewUrl && (
        <div className="flex gap-3 items-center">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
            <img src={previewUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-semibold text-ios-label">{mealType}</p>
            {analysisResult && (
              <span className="inline-block mt-1 text-[11px] font-medium bg-blue-50 text-ios-blue px-2.5 py-1 rounded-full">
                🤖 {AI_DISPLAY[analysisResult.aiProvider] ?? analysisResult.aiProvider} {analysisResult.aiModel}
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 rounded-2xl text-sm text-ios-red">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
        </div>
      )}

      {/* 合計カロリー */}
      <div className="bg-ios-label rounded-2xl p-4 flex justify-between items-center">
        <span className="text-sm font-medium text-white/70">合計カロリー</span>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">{Math.round(totals.calories)}</span>
          <span className="text-sm text-white/70">kcal</span>
        </div>
      </div>

      {/* PFC サマリー */}
      <div className="bg-ios-card rounded-2xl shadow-ios-sm grid grid-cols-4 divide-x divide-black/[0.06]">
        {[
          { label: 'P', value: totals.protein, color: 'text-ios-blue' },
          { label: 'F', value: totals.fat,     color: 'text-ios-orange' },
          { label: 'C', value: totals.carbs,   color: 'text-ios-red' },
        ].map(({ label, value, color }) => (
          <div key={label} className="py-3 text-center">
            <p className={`text-xs font-bold ${color}`}>{label}</p>
            <p className="text-base font-semibold text-ios-label mt-0.5">{value.toFixed(0)}g</p>
          </div>
        ))}
        <div className="py-3 text-center">
          <p className="text-xs font-bold text-ios-green">繊維</p>
          <p className="text-base font-semibold text-ios-label mt-0.5">
            {items.reduce((s, i) => s + i.fiber, 0).toFixed(0)}g
          </p>
        </div>
      </div>

      {/* 食品リスト */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-ios-secondary px-1">認識した食品</p>
        {items.map((item, i) => (
          <div key={i} className="bg-ios-card rounded-2xl shadow-ios-sm p-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <input
                  className="w-full font-semibold text-ios-label bg-transparent border-b border-black/[0.06] pb-1 focus:border-ios-blue outline-none transition-colors"
                  value={item.menu}
                  onChange={(e) => updateItem(i, 'menu', e.target.value)}
                />
                <input
                  className="w-full text-sm text-ios-secondary bg-transparent mt-1 outline-none"
                  value={item.estimatedAmount}
                  onChange={(e) => updateItem(i, 'estimatedAmount', e.target.value)}
                />
              </div>
              <button onClick={() => removeItem(i)} className="text-ios-tertiary hover:text-ios-red transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { key: 'calories' as const, label: 'kcal' },
                { key: 'protein'  as const, label: 'P(g)' },
                { key: 'fat'      as const, label: 'F(g)' },
                { key: 'carbs'    as const, label: 'C(g)' },
                { key: 'fiber'    as const, label: '繊維' },
              ].map(({ key, label }) => (
                <div key={key} className="bg-ios-bg rounded-xl p-2 text-center">
                  <p className="text-[9px] text-ios-secondary">{label}</p>
                  <input
                    type="number"
                    className="w-full text-xs font-semibold text-ios-label text-center bg-transparent outline-none mt-0.5"
                    value={item[key]}
                    onChange={(e) => updateItem(i, key, parseFloat(e.target.value) || 0)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => { setStep('photo'); setItems([]); setAnalysisResult(null); }}
          className="flex-1 py-3.5 rounded-2xl font-semibold text-ios-secondary bg-ios-bg"
        >
          撮り直す
        </button>
        <button
          onClick={handleSave}
          disabled={items.length === 0}
          className="flex-[2] py-3.5 rounded-2xl font-semibold text-white bg-ios-blue disabled:bg-ios-tertiary shadow-ios-fab active:opacity-80 transition-opacity flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          保存する
        </button>
      </div>
    </div>
  );

  // ────────────────────────────────
  // Step 3: 保存中
  // ────────────────────────────────
  if (step === 'saving') return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="w-8 h-8 border-ios-blue border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
      <p className="font-semibold text-ios-label">保存中...</p>
    </div>
  );

  // ────────────────────────────────
  // Step 4: 完了
  // ────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-9 h-9 text-ios-green" />
      </div>
      <p className="font-semibold text-xl text-ios-label">保存しました</p>
      <p className="text-sm text-ios-secondary">ホームへ戻ります...</p>
    </div>
  );
}
