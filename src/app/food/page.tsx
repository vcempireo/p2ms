'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { MealSummary, AIProvider } from '@/lib/types';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const AI_DISPLAY: Record<AIProvider, string> = {
  openai: 'GPT',
  gemini: 'Gemini',
  anthropic: 'Claude',
};

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function FoodPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [mealsByDate, setMealsByDate] = useState<Record<string, MealSummary[]>>({});
  const [loading, setLoading] = useState(true);

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  useEffect(() => {
    if (!user) return;
    const fetchMonth = async () => {
      setLoading(true);
      const q = query(
        collection(db, 'users', user.uid, 'meal_summary'),
        where('mealTime', '>=', Timestamp.fromDate(startOfMonth(currentMonth))),
        where('mealTime', '<=', Timestamp.fromDate(endOfMonth(currentMonth))),
        orderBy('mealTime', 'asc')
      );
      const snap = await getDocs(q);
      const byDate: Record<string, MealSummary[]> = {};
      snap.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() } as MealSummary;
        const key = format((data.mealTime as Timestamp).toDate(), 'yyyy-MM-dd');
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(data);
      });
      setMealsByDate(byDate);
      setLoading(false);
    };
    fetchMonth();
  }, [user, currentMonth]);

  const selectedKey   = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedMeals = selectedKey ? (mealsByDate[selectedKey] ?? []) : [];
  const selectedTotal = selectedMeals.reduce((s, m) => s + m.totalCalories, 0);

  return (
    <div className="min-h-screen bg-ios-bg page-content">

      {/* ─── ヘッダー ─── */}
      <header className="sticky top-0 z-10 bg-ios-bg/80 backdrop-blur-xl border-b border-black/[0.06]">
        <div className="max-w-md mx-auto flex items-center justify-between h-14 px-5">
          <h1 className="text-base font-semibold text-ios-label">食事ジャーナル</h1>
          <Link href="/food/new" className="flex items-center gap-1 text-ios-blue text-sm font-medium">
            <Plus className="w-4 h-4" />記録
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* ─── 月切り替え ─── */}
        <div className="flex items-center justify-between px-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-ios-blue" />
          </button>
          <div className="text-center">
            <p className="text-base font-semibold text-ios-label">
              {format(currentMonth, 'yyyy年 M月')}
            </p>
            <p className="text-xs text-ios-secondary mt-0.5">
              {Object.keys(mealsByDate).length}日分の記録
            </p>
          </div>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100">
            <ChevronRight className="w-5 h-5 text-ios-blue" />
          </button>
        </div>

        {/* ─── カレンダー ─── */}
        <div className="bg-ios-card rounded-2xl shadow-ios-sm overflow-hidden p-3">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 mb-1">
            {WEEK_LABELS.map((d, i) => (
              <div key={d} className={`text-center text-[11px] font-semibold py-1 ${i === 0 ? 'text-ios-red' : i === 6 ? 'text-ios-blue' : 'text-ios-secondary'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day) => {
              const key       = format(day, 'yyyy-MM-dd');
              const hasMeals  = !!mealsByDate[key]?.length;
              const isSelected= selectedDate && isSameDay(day, selectedDate);
              const thumb     = mealsByDate[key]?.[0]?.imageUrl;
              const dow       = day.getDay();

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square relative rounded-xl overflow-hidden transition-all active:scale-95
                    ${isSelected ? 'ring-2 ring-ios-blue ring-offset-1 scale-[1.04] z-10' : ''}`}
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full ${hasMeals ? 'bg-blue-50' : 'bg-gray-50'}`} />
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-sm font-semibold drop-shadow-sm
                      ${thumb ? 'text-white' : hasMeals ? 'text-ios-blue' : dow === 0 ? 'text-ios-red' : dow === 6 ? 'text-ios-blue' : 'text-ios-secondary'}`}
                    >
                      {format(day, 'd')}
                    </span>
                    {hasMeals && !thumb && (
                      <div className="w-1 h-1 bg-ios-blue rounded-full mt-0.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── 選択日の詳細 ─── */}
        {selectedDate && (
          <div className="space-y-3">
            {/* 日付ヘッダー */}
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-semibold text-ios-label">
                {format(selectedDate, 'M月d日（E）', { locale: ja })}
              </h3>
              {selectedMeals.length > 0 && (
                <span className="text-sm font-medium text-ios-secondary">
                  {Math.round(selectedTotal).toLocaleString()} kcal
                </span>
              )}
            </div>

            {selectedMeals.length > 0 ? (
              selectedMeals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))
            ) : (
              <div className="bg-ios-card rounded-2xl shadow-ios-sm p-8 text-center">
                <p className="text-ios-secondary text-sm">この日の記録はありません</p>
                <Link href="/food/new" className="mt-3 inline-flex items-center gap-1.5 text-ios-blue text-sm font-semibold">
                  <Plus className="w-4 h-4" />食事を記録する
                </Link>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── 食事カード ─────────────────────────────────────────────────
function MealCard({ meal }: { meal: MealSummary }) {
  return (
    <div className="bg-ios-card rounded-2xl shadow-ios-sm overflow-hidden">
      <div className="flex gap-3 p-4">
        {/* サムネイル */}
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
          {meal.imageUrl
            ? <img src={meal.imageUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
          }
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-ios-blue">{meal.mealType}</span>
            <span className="text-sm font-semibold text-ios-label flex-shrink-0">
              {Math.round(meal.totalCalories)} kcal
            </span>
          </div>
          <p className="text-sm text-ios-label font-medium mt-1 leading-snug line-clamp-2">
            {meal.menus.join(' · ')}
          </p>
          {/* PFCミニバー */}
          <div className="flex gap-2 mt-2 text-[11px] text-ios-secondary">
            <span>P {meal.totalProtein.toFixed(0)}g</span>
            <span>F {meal.totalFat.toFixed(0)}g</span>
            <span>C {meal.totalCarbs.toFixed(0)}g</span>
          </div>
        </div>
      </div>

      {/* AIバッジ */}
      <div className="px-4 pb-3">
        <span className="text-[10px] font-medium bg-blue-50 text-ios-blue px-2 py-0.5 rounded-full">
          🤖 {AI_DISPLAY[meal.aiProvider] ?? meal.aiProvider} {meal.aiModel}
        </span>
      </div>
    </div>
  );
}
