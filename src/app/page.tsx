"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import WeightHistory from '../components/WeightHistory';
import dummyProfile from '../lib/pms-profile.json';
import { format, parseISO } from 'date-fns';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// === ミニコンポーネント: クイックアクションボタン ===
const QuickAction = ({ icon, label, onClick, colorClass }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm ${colorClass}`}
  >
    <span className="text-2xl mb-1">{icon}</span>
    <span className="text-xs font-bold">{label}</span>
  </button>
);

// === ミニコンポーネント: ステータスチップ ===
const StatChip = ({ label, value, unit, icon }: any) => (
  <div className="bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-sm flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-gray-500 font-bold">{label}</span>
    </div>
    <div className="text-sm font-bold text-gray-800">
      {value} <span className="text-[10px] text-gray-400">{unit}</span>
    </div>
  </div>
);

export default function Home() {
  const { system_settings } = dummyProfile;
  const [latestLog, setLatestLog] = useState<any>(null);
  const [weightData, setWeightData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, "daily_logs"), orderBy("date", "desc"), limit(30));
        const snap = await getDocs(q);
        const logs = snap.docs.map(d => d.data());
        
        if (logs.length > 0) setLatestLog(logs[0]);
        
        setWeightData([...logs].reverse()
          .filter(l => l.health_metrics?.weight_kg)
          .map(l => ({
            month: format(parseISO(l.date), 'MM/dd'),
            weight: l.health_metrics.weight_kg
          }))
        );
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // 今日の日付
  const todayStr = format(new Date(), "M月d日 (E)");

  // 最新の食事画像を取得（背景用）
  const latestFoodImage = latestLog?.nutrition?.meals?.find((m:any) => m.imageUrl)?.imageUrl;

  return (
    <main className="min-h-screen bg-[#F2F4F8] text-gray-800 pb-12">
      
      {/* === 1. ヘッダーエリア (シンプルかつ大胆に) === */}
      <header className="px-6 pt-8 pb-6 max-w-5xl mx-auto flex justify-between items-end">
        <div>
          <p className="text-gray-400 text-sm font-bold tracking-wider uppercase mb-1">{todayStr}</p>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
            Hello, <br/>
            <span className="text-indigo-600">{system_settings.user_profile.display_name}</span>
          </h1>
        </div>
        <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white shadow-md overflow-hidden">
           {/* アイコンの代わりにダミー画像 */}
           <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
        </div>
      </header>

      {/* === 2. メイングッド (Bento Layout) === */}
      <div className="px-4 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 grid-rows-[auto_auto]">

        {/* --- [A] Current Status Card (左上・でかい) --- */}
        <div className="col-span-2 md:col-span-2 row-span-2 bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-9xl">⚖️</span>
          </div>
          
          <div>
            <h2 className="text-gray-400 font-bold text-sm uppercase tracking-widest mb-2">Current Weight</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black tracking-tighter text-gray-900">
                {latestLog?.health_metrics?.weight_kg || "--"}
              </span>
              <span className="text-xl text-gray-500 font-bold">kg</span>
            </div>
            <p className="text-sm text-green-600 font-bold mt-1 flex items-center gap-1">
              <span>📉</span> 目標まであと {(latestLog?.health_metrics?.weight_kg - system_settings.app_constants.target_weight_kg).toFixed(1)} kg
            </p>
          </div>

          <div className="mt-8 h-48 -mx-2">
            {/* グラフコンポーネントを埋め込み */}
            <WeightHistory data={weightData} />
          </div>
        </div>

        {/* --- [B] Food Journal Link (右上・中くらい) --- */}
        <Link href="/food" className="col-span-2 md:col-span-2 bg-black rounded-[32px] p-6 shadow-lg text-white relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          {/* 背景画像がある場合は表示 */}
          {latestFoodImage && (
             <div className="absolute inset-0 z-0 opacity-60">
               <img src={latestFoodImage} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
             </div>
          )}
          
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                Food Journal
              </span>
              <span className="text-2xl">↗</span>
            </div>
            
            <div>
              <div className="text-3xl font-bold mb-1">
                 {latestLog?.nutrition?.total_intake_kcal || 0} <span className="text-lg font-normal opacity-80">kcal</span>
              </div>
              <p className="text-gray-300 text-sm">Today's Intake</p>
              
              {/* マクロ栄養素バー */}
              <div className="flex gap-1 mt-3 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="bg-green-400 h-full" style={{width: '30%'}}></div>
                <div className="bg-yellow-400 h-full" style={{width: '40%'}}></div>
                <div className="bg-red-400 h-full" style={{width: '30%'}}></div>
              </div>
            </div>
          </div>
        </Link>

        {/* --- [C] Sleep Score (左下) --- */}
        <div className="col-span-1 bg-indigo-600 rounded-[32px] p-5 text-white shadow-lg shadow-indigo-200 flex flex-col justify-between aspect-square">
          <span className="text-2xl">💤</span>
          <div>
            <div className="text-4xl font-bold">{latestLog?.sleep?.score || "--"}</div>
            <div className="text-indigo-200 text-xs font-bold mt-1">Sleep Score</div>
          </div>
        </div>

        {/* --- [D] Quick Add Actions (右下・グリッド) --- */}
        <div className="col-span-1 grid grid-rows-2 gap-3">
           <Link href="/upload" className="bg-white rounded-[24px] flex items-center justify-center text-gray-700 shadow-sm hover:bg-gray-50 border border-gray-100 transition-colors">
             <span className="text-xl mr-2">✏️</span> <span className="font-bold text-xs">Record</span>
           </Link>
           <button className="bg-white rounded-[24px] flex items-center justify-center text-gray-700 shadow-sm hover:bg-gray-50 border border-gray-100 transition-colors">
             <span className="text-xl mr-2">⚙️</span> <span className="font-bold text-xs">Settings</span>
           </button>
        </div>

        {/* --- [E] Recent Activity (下部・横長) --- */}
        <div className="col-span-2 md:col-span-4 bg-white rounded-[32px] p-6 shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-white mt-2">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
            Recent Activities
          </h3>
          <div className="space-y-3">
            {/* ダミーではなく、実際のデータがあれば表示 */}
            {latestLog?.workout_performed ? (
              <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-xl">🏋️‍♀️</div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">{latestLog.workout_performed.menu_name}</h4>
                  <p className="text-xs text-gray-500">{latestLog.workout_performed.duration_min} min • {latestLog.workout_performed.intensity}</p>
                </div>
                <span className="text-xs font-bold text-gray-400">Today</span>
              </div>
            ) : (
              <div className="text-gray-400 text-sm py-2">今日のトレーニング記録はありません</div>
            )}
            
             <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors opacity-60">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">💧</div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">Water Intake</h4>
                  <p className="text-xs text-gray-500">Target: 2500ml</p>
                </div>
                <span className="text-xs font-bold text-gray-400">{latestLog?.nutrition?.water_intake_ml || 0}ml</span>
              </div>
          </div>
        </div>

      </div>
    </main>
  );
}