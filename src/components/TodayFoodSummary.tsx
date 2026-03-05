'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { MealSummary } from '@/lib/types';
import { ChevronRight, Plus } from 'lucide-react';

const CALORIE_GOAL = 2000; // 目標カロリー（将来的にprofileから取得）

export default function TodayFoodSummary() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTodayMeals = async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const q = query(
        collection(db, 'users', user.uid, 'meal_summary'),
        where('mealTime', '>=', Timestamp.fromDate(todayStart)),
        where('mealTime', '<=', Timestamp.fromDate(todayEnd)),
        orderBy('mealTime', 'asc')
      );
      const snap = await getDocs(q);
      setMeals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealSummary)));
      setLoading(false);
    };
    fetchTodayMeals();
  }, [user]);

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.totalCalories,
      protein:  acc.protein  + m.totalProtein,
      fat:      acc.fat      + m.totalFat,
      carbs:    acc.carbs    + m.totalCarbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const caloriePct = Math.min((totals.calories / CALORIE_GOAL) * 100, 100);
  const totalMacro = totals.protein + totals.fat + totals.carbs;

  if (loading) {
    return (
      <div className="bg-ios-card rounded-2xl shadow-ios-sm p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="h-8 bg-gray-100 rounded w-1/2" />
      </div>
    );
  }

  return (
    <Link href="/food" className="block bg-ios-card rounded-2xl shadow-ios-sm overflow-hidden active:opacity-80 transition-opacity">
      {/* ヘッダー行 */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <p className="text-xs text-ios-secondary font-medium uppercase tracking-wider">今日の食事</p>
        <div className="flex items-center gap-1 text-ios-blue text-sm font-medium">
          詳細 <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {meals.length === 0 ? (
        /* 未記録状態 */
        <div className="px-5 pb-5">
          <p className="text-2xl font-bold text-ios-label">0 <span className="text-base font-medium text-ios-secondary">kcal</span></p>
          <Link
            href="/food/new"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 inline-flex items-center gap-1.5 bg-ios-blue text-white text-sm font-semibold px-4 py-2 rounded-xl active:opacity-80"
          >
            <Plus className="w-4 h-4" />
            食事を記録する
          </Link>
        </div>
      ) : (
        <div className="px-5 pb-5 space-y-4">
          {/* カロリー数値 */}
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight text-ios-label">
              {Math.round(totals.calories).toLocaleString()}
            </span>
            <span className="text-base text-ios-secondary font-medium">kcal</span>
            <span className="text-xs text-ios-secondary ml-1">/ {CALORIE_GOAL.toLocaleString()}</span>
          </div>

          {/* カロリー進捗バー */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-ios-orange rounded-full transition-all duration-500"
              style={{ width: `${caloriePct}%` }}
            />
          </div>

          {/* PFCバー */}
          {totalMacro > 0 && (
            <div className="space-y-1.5">
              <MacroBar label="タンパク質" value={totals.protein} total={totalMacro} color="bg-ios-blue" />
              <MacroBar label="脂質"       value={totals.fat}     total={totalMacro} color="bg-ios-orange" />
              <MacroBar label="炭水化物"   value={totals.carbs}   total={totalMacro} color="bg-ios-red" />
            </div>
          )}

          {/* 食事タイプチップ */}
          <div className="flex gap-2 flex-wrap">
            {meals.map((m) => (
              <span
                key={m.id}
                className="text-xs bg-ios-bg text-ios-secondary px-2.5 py-1 rounded-full font-medium"
              >
                {m.mealType}
              </span>
            ))}
          </div>
        </div>
      )}
    </Link>
  );
}

function MacroBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-ios-secondary w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-ios-secondary w-10 text-right">{value.toFixed(1)}g</span>
    </div>
  );
}
