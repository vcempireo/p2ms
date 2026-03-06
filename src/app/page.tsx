'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import WeightHistory from '../components/WeightHistory';
import TodayFoodSummary from '../components/TodayFoodSummary';
import { useAuth } from '@/components/AuthProvider';
import dummyProfile from '../lib/pms-profile.json';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronRight, TrendingDown } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const { system_settings } = dummyProfile;
  const [latestLog, setLatestLog] = useState<any>(null);
  const [weightData, setWeightData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'daily_logs'), orderBy('date', 'desc'), limit(30));
        const snap = await getDocs(q);
        const logs = snap.docs.map((d) => d.data());
        if (logs.length > 0) setLatestLog(logs[0]);
        setWeightData(
          [...logs].reverse()
            .filter((l) => l.health_metrics?.weight_kg)
            .map((l) => ({
              month: format(parseISO(l.date), 'M/d'),
              weight: l.health_metrics.weight_kg,
            }))
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const todayStr = format(new Date(), 'M月d日（E）', { locale: ja });
  const currentWeight = latestLog?.health_metrics?.weight_kg;
  const targetWeight = system_settings.app_constants.target_weight_kg;
  const diff = currentWeight ? (currentWeight - targetWeight).toFixed(1) : null;

  // ファーストネームだけ取り出す
  const firstName = system_settings.user_profile.name.split(' ').pop() ?? system_settings.user_profile.name;
  // ログインユーザーがいれば名前を上書き
  const displayName = user?.displayName?.split(' ')[0] ?? firstName;

  return (
    <main className="min-h-screen bg-ios-bg page-content">

      {/* ─── ヘッダー ─── */}
      <header className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-ios-secondary font-medium tracking-wide">{todayStr}</p>
          <h1 className="text-2xl font-bold text-ios-label mt-0.5">
            こんにちは、{displayName}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-ios-blue overflow-hidden flex items-center justify-center">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-sm">{displayName[0]}</span>
          )}
        </div>
      </header>

      <div className="px-5 space-y-4">

        {/* ─── 体重カード ─── */}
        <div className="bg-ios-card rounded-2xl shadow-ios-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between">
            <div>
              <p className="text-xs text-ios-secondary font-medium uppercase tracking-wider">体重</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-5xl font-bold tracking-tight text-ios-label">
                  {loading ? '--' : currentWeight ?? '--'}
                </span>
                <span className="text-lg text-ios-secondary font-medium">kg</span>
              </div>
              {diff && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3.5 h-3.5 text-ios-green" />
                  <span className="text-xs text-ios-green font-semibold">
                    目標まであと {diff} kg
                  </span>
                </div>
              )}
            </div>
            <Link href="/mypage" className="flex items-center gap-1 text-ios-blue text-sm font-medium">
              詳細 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {/* グラフ */}
          <div className="h-36 px-2 pb-3">
            <WeightHistory data={weightData} />
          </div>
        </div>

        {/* ─── 今日の食事サマリー ─── */}
        <TodayFoodSummary />

        {/* ─── スタッツ行 ─── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="BMI"
            value={latestLog?.health_metrics?.bmi ?? '--'}
            unit=""
            color="bg-ios-blue"
            emoji="📊"
          />
          <StatCard
            label="体脂肪率"
            value={latestLog?.health_metrics?.body_fat_percentage ?? '--'}
            unit="%"
            color="bg-ios-orange"
            emoji="🔥"
          />
          <StatCard
            label="除脂肪体重"
            value={latestLog?.health_metrics?.lean_body_mass ?? '--'}
            unit="kg"
            color="bg-ios-green"
            emoji="💪"
          />
          <StatCard
            label="歩数"
            value={latestLog?.health_metrics?.steps
              ? latestLog.health_metrics.steps.toLocaleString()
              : '--'}
            unit="歩"
            color="bg-ios-purple"
            emoji="🚶"
          />
        </div>

      </div>
    </main>
  );
}

// ─── スタッツカード ─────────────────────────────────────────────
function StatCard({ label, value, unit, color, emoji }: {
  label: string; value: string | number; unit: string; color: string; emoji: string;
}) {
  return (
    <div className="bg-ios-card rounded-2xl shadow-ios-sm p-4">
      <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center text-lg mb-3`}>
        {emoji}
      </div>
      <p className="text-xs text-ios-secondary font-medium">{label}</p>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-2xl font-bold text-ios-label">{value}</span>
        {unit && <span className="text-sm text-ios-secondary">{unit}</span>}
      </div>
    </div>
  );
}
