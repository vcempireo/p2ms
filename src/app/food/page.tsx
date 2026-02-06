"use client";

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

// === コンポーネント: 詳細表示用の食事カード ===
const MealDetailCard = ({ meal }: { meal: any }) => (
  <div className="flex gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
    {/* 左: 画像 (大きく表示) */}
    <div className="w-1/3 min-w-[100px] aspect-square rounded-xl overflow-hidden relative">
      {meal.imageUrl ? (
        <img src={meal.imageUrl} alt={meal.type} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">No Image</div>
      )}
      <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
        {meal.time}
      </span>
    </div>

    {/* 右: スペック & AI */}
    <div className="flex-1 space-y-2">
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-gray-800 text-lg">{meal.type}</h4>
        <span className="font-mono text-gray-500 text-sm">{meal.nutrition.calories} kcal</span>
      </div>
      
      <p className="text-sm text-gray-600 line-clamp-1 font-medium">{meal.menus.join(' / ')}</p>
      
      {/* AIコメント風表示 */}
      <div className="bg-blue-50 p-3 rounded-lg rounded-tl-none text-sm text-gray-700 leading-snug relative mt-2">
        <span className="text-xs font-bold text-blue-600 block mb-1">🤖 AI Feedback</span>
        {meal.ai_analysis}
      </div>
    </div>
  </div>
);

export default function FoodPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 1, 1)); // 2026年2月スタート
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // 選択中の日付
  const [logs, setLogs] = useState<Record<string, any>>({}); // 日付をキーにしたログデータ
  const [loading, setLoading] = useState(true);

  // カレンダー生成用
  const calendarDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // データ取得
  useEffect(() => {
    const fetchLogs = async () => {
      const q = query(collection(db, "daily_logs"), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      const logMap: Record<string, any> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        logMap[data.date] = data;
      });
      setLogs(logMap);
      
      // データがある最新の日を選択状態にする
      if (snapshot.docs.length > 0 && !selectedDate) {
        setSelectedDate(parseISO(snapshot.docs[0].data().date));
      }
      setLoading(false);
    };
    fetchLogs();
  }, []);

  // 月変更
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // 選択された日のデータ
  const selectedLog = selectedDate ? logs[format(selectedDate, 'yyyy-MM-dd')] : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* === ヘッダー === */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          ← Dashboard
        </Link>
        <h1 className="text-lg font-bold">Food Journal</h1>
        <div className="w-16"></div> {/* レイアウト調整用 */}
      </header>

      <main className="max-w-md mx-auto p-4">
        
        {/* === 月切り替え & サマリー === */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full">◀</button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">{format(currentMonth, 'yyyy年 M月')}</h2>
            <p className="text-xs text-gray-400">Total Entries: {Object.keys(logs).filter(k => k.startsWith(format(currentMonth, 'yyyy-MM'))).length}</p>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full">▶</button>
        </div>

        {/* === カレンダー・ギャラリー (ここがメイン！) === */}
        <div className="grid grid-cols-7 gap-1 mb-8">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs text-gray-400 py-1 font-bold">{d}</div>
          ))}
          
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const log = logs[dateKey];
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            
            // サムネイル画像（昼食、なければ夕食、なければ朝食）
            const thumbUrl = log?.nutrition?.meals?.find((m:any) => m.type === '昼食')?.imageUrl 
                          || log?.nutrition?.meals?.[0]?.imageUrl;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square relative rounded-lg overflow-hidden transition-all duration-200 border-2 
                  ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 scale-105 z-10 shadow-lg' : 'border-transparent hover:opacity-80'}`}
              >
                {/* 背景: 画像がある場合 */}
                {thumbUrl ? (
                  <img src={thumbUrl} alt="meal" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full ${log ? 'bg-green-100' : 'bg-gray-50'}`}></div>
                )}

                {/* 日付オーバーレイ */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className={`text-sm font-bold ${thumbUrl ? 'text-white drop-shadow-md' : 'text-gray-400'}`}>
                    {format(day, 'd')}
                  </span>
                  {log && !thumbUrl && (
                    <span className="text-[8px] text-green-600 font-bold">●</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* === 選択された日の詳細フィード === */}
        {selectedDate && (
          <div className="animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-black text-white px-2 py-1 rounded text-sm">
                {format(selectedDate, 'M/d (E)', { locale: ja })}
              </span>
              <span className="text-sm font-normal text-gray-500 ml-auto">
                Total: {selectedLog?.nutrition?.total_intake_kcal || 0} kcal
              </span>
            </h3>

            {selectedLog?.nutrition?.meals ? (
              <div className="space-y-2">
                {selectedLog.nutrition.meals.map((meal: any, idx: number) => (
                  <MealDetailCard key={idx} meal={meal} />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-400">No records for this day.</p>
                <Link href="/upload" className="mt-2 inline-block text-blue-600 font-bold text-sm">
                  + データを追加する
                </Link>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}