'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { AnalyzedFoodItem, AnalyzeResponse, getMealType } from '@/lib/types';
import { Camera, X, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

const AI_DISPLAY: Record<string, string> = {
  openai: 'GPT',
  gemini: 'Gemini',
  anthropic: 'Claude',
};

const MEAL_TYPES = ['朝食', '昼食', '夕食', '間食'] as const;

type Step = 'photo' | 'analyzing' | 'review' | 'saving' | 'done';

export default function FoodAnalysisWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('photo');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [items, setItems] = useState<AnalyzedFoodItem[]>([]);
  const [mealType, setMealType] = useState(getMealType(new Date()));
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 画像選択・リサイズ
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
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
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewUrl(compressed);
        setBase64Image(compressed.split(',')[1]);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // AI解析
  const handleAnalyze = async () => {
    if (!base64Image) return;
    setStep('analyzing');
    setError(null);
    try {
      const res = await fetch('/api/food/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? '解析に失敗しました');
      const result: AnalyzeResponse = await res.json();
      setAnalysisResult(result);
      setItems(result.items);
      setStep('review');
    } catch (e: any) {
      setError(e.message);
      setStep('photo');
    }
  };

  const updateItem = (i: number, field: keyof AnalyzedFoodItem, value: string | number) => {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  };

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  // 保存
  const handleSave = async () => {
    if (!base64Image || !user) return;
    setStep('saving');
    setError(null);
    try {
      const res = await fetch('/api/food/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mealType,
          mealTime: new Date().toISOString(),
          items,
          userId: user.uid,
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
  // Step 1: 写真選択
  // ────────────────────────────────
  if (step === 'photo') return (
    <div className="space-y-5">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 rounded-2xl text-sm text-ios-red">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* 写真エリア */}
      {previewUrl ? (
        <div className="relative aspect-square rounded-2xl overflow-hidden">
          <img src={previewUrl} alt="食事写真" className="w-full h-full object-cover" />
          <button
            onClick={() => { setPreviewUrl(null); setBase64Image(null); }}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-square rounded-2xl border-2 border-dashed border-ios-tertiary bg-ios-bg flex flex-col items-center justify-center gap-4 active:opacity-70 transition-opacity"
        >
          <div className="w-16 h-16 bg-ios-blue rounded-2xl flex items-center justify-center shadow-ios-fab">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-ios-label">写真を撮影 / 選択</p>
            <p className="text-sm text-ios-secondary mt-1">タップしてカメラを起動</p>
          </div>
        </button>
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

      {/* 解析ボタン */}
      <button
        onClick={handleAnalyze}
        disabled={!base64Image}
        className="w-full py-4 rounded-2xl font-semibold text-white text-base bg-ios-blue disabled:bg-ios-tertiary disabled:cursor-not-allowed transition-colors shadow-ios-fab active:opacity-80"
      >
        AI で解析する
      </button>
    </div>
  );

  // ────────────────────────────────
  // Step 2: 解析中
  // ────────────────────────────────
  if (step === 'analyzing') return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      {previewUrl && (
        <div className="w-28 h-28 rounded-2xl overflow-hidden opacity-70">
          <img src={previewUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="w-8 h-8 border-3 border-ios-blue border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
      <div className="text-center">
        <p className="font-semibold text-ios-label">AI が解析中...</p>
        <p className="text-sm text-ios-secondary mt-1">栄養素を推定しています</p>
      </div>
    </div>
  );

  // ────────────────────────────────
  // Step 3: 確認・編集
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

            {/* 栄養素グリッド */}
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
          onClick={() => setStep('photo')}
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
  // Step 4: 保存中
  // ────────────────────────────────
  if (step === 'saving') return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="w-8 h-8 border-ios-blue border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
      <p className="font-semibold text-ios-label">保存中...</p>
    </div>
  );

  // ────────────────────────────────
  // Step 5: 完了
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
