'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import WeightHistory from '../components/WeightHistory';
import TodayFoodSummary from '../components/TodayFoodSummary';
import { useAuth } from '@/components/AuthProvider';
import dummyProfile from '../lib/pms-profile.json';
import { format, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { collection, query, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { HealthLog } from '@/lib/types';
import { ChevronRight, TrendingDown, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

type StatKey = 'bmi' | 'bodyFat' | 'lbm' | 'steps';

// 小数点を揃えるユーティリティ（steps は整数、それ以外は小数1桁）
const fmt = (v: number | undefined, key: StatKey): string => {
  if (v == null) return '--';
  if (key === 'steps') return Math.round(v).toLocaleString();
  return (Math.round(v * 10) / 10).toString();
};

export default function Home() {
  const { user } = useAuth();
  const { system_settings } = dummyProfile;
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [latestWeight, setLatestWeight] = useState<HealthLog | null>(null);
  const [latestStats, setLatestStats] = useState<{ bmi?: number; bodyFat?: number; lbm?: number; steps?: number }>({});
  const [weightData, setWeightData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStat, setSelectedStat] = useState<StatKey | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'health_log'),
          orderBy('timestamp', 'desc'),
          limit(200)
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map((d) => d.data() as HealthLog);
        setLogs(fetched);
        // 各フィールドは別タイムスタンプで記録されるため、それぞれ最新値を探す
        const withWeight = fetched.find(l => l.weight != null);
        if (withWeight) setLatestWeight(withWeight);
        setLatestStats({
          bmi:     fetched.find(l => l.bmi     != null)?.bmi,
          bodyFat: fetched.find(l => l.bodyFat != null)?.bodyFat,
          lbm:     fetched.find(l => l.lbm     != null)?.lbm,
          steps:   fetched.find(l => l.steps   != null)?.steps,
        });
        setWeightData(
          [...fetched].reverse()
            .filter((l) => l.weight)
            .map((l) => ({
              month: format((l.timestamp as Timestamp).toDate(), 'M/d'),
              weight: l.weight,
            }))
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const todayStr = format(new Date(), 'M月d日（E）', { locale: ja });
  const currentWeight = latestWeight?.weight;
  const targetWeight = system_settings.app_constants.target_weight_kg;
  const diff = currentWeight ? (currentWeight - targetWeight).toFixed(1) : null;

  const firstName = system_settings.user_profile.name.split(' ').pop() ?? system_settings.user_profile.name;
  const displayName = user?.displayName?.split(' ')[0] ?? firstName;

  const STATS: { key: StatKey; label: string; unit: string; color: string; emoji: string }[] = [
    { key: 'bmi',     label: 'BMI',    unit: '',   color: 'bg-ios-blue',   emoji: '📊' },
    { key: 'bodyFat', label: '体脂肪率', unit: '%', color: 'bg-ios-orange', emoji: '🔥' },
    { key: 'lbm',     label: '除脂肪体重', unit: 'kg', color: 'bg-ios-green', emoji: '💪' },
    { key: 'steps',   label: '歩数',   unit: '歩', color: 'bg-ios-purple', emoji: '🚶' },
  ];

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
            <Link href="/weight" className="flex items-center gap-1 text-ios-blue text-sm font-medium">
              詳細 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="h-36 px-2 pb-3">
            <WeightHistory data={weightData} />
          </div>
        </div>

        {/* ─── 今日の食事サマリー ─── */}
        <TodayFoodSummary />

        {/* ─── スタッツ行 ─── */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          {STATS.map(({ key, label, unit, color, emoji }) => (
            <StatCard
              key={key}
              label={label}
              value={fmt(latestStats[key], key)}
              unit={unit}
              color={color}
              emoji={emoji}
              onTap={() => setSelectedStat(key)}
            />
          ))}
        </div>

      </div>

      {/* ─── スタッツ詳細シート ─── */}
      {selectedStat && (
        <StatDetailSheet
          statKey={selectedStat}
          logs={logs}
          onClose={() => setSelectedStat(null)}
        />
      )}
    </main>
  );
}

// ─── スタッツカード ─────────────────────────────────────────────
function StatCard({ label, value, unit, color, emoji, onTap }: {
  label: string; value: string | number; unit: string; color: string; emoji: string; onTap: () => void;
}) {
  return (
    <div
      className="bg-ios-card rounded-2xl shadow-ios-sm p-4 active:opacity-70 transition-opacity cursor-pointer"
      onClick={onTap}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center text-lg`}>
          {emoji}
        </div>
        <ChevronRight className="w-4 h-4 text-ios-tertiary" />
      </div>
      <p className="text-xs text-ios-secondary font-medium">{label}</p>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-2xl font-bold text-ios-label">{value}</span>
        {unit && <span className="text-sm text-ios-secondary">{unit}</span>}
      </div>
    </div>
  );
}

// ─── スタッツ詳細シート ──────────────────────────────────────────
const STAT_CONFIG: Record<StatKey, {
  label: string; unit: string; decimals: number; field: keyof HealthLog;
  color: string; strokeColor: string;
  categories?: { max: number; label: string; color: string }[];
}> = {
  bmi: {
    label: 'BMI', unit: '', decimals: 1, field: 'bmi',
    color: 'text-ios-blue', strokeColor: '#007AFF',
    categories: [
      { max: 18.5, label: '低体重', color: 'text-ios-blue' },
      { max: 25,   label: '普通体重', color: 'text-ios-green' },
      { max: 30,   label: '肥満（1度）', color: 'text-ios-orange' },
      { max: Infinity, label: '肥満（2度以上）', color: 'text-ios-red' },
    ],
  },
  bodyFat: {
    label: '体脂肪率', unit: '%', decimals: 1, field: 'bodyFat',
    color: 'text-ios-orange', strokeColor: '#FF9500',
    categories: [
      { max: 10,  label: 'アスリート', color: 'text-ios-blue' },
      { max: 20,  label: '標準（低め）', color: 'text-ios-green' },
      { max: 25,  label: '標準', color: 'text-ios-green' },
      { max: 30,  label: '過剰', color: 'text-ios-orange' },
      { max: Infinity, label: '肥満', color: 'text-ios-red' },
    ],
  },
  lbm: {
    label: '除脂肪体重', unit: 'kg', decimals: 1, field: 'lbm',
    color: 'text-ios-green', strokeColor: '#34C759',
  },
  steps: {
    label: '歩数', unit: '歩', decimals: 0, field: 'steps',
    color: 'text-ios-purple', strokeColor: '#AF52DE',
    categories: [
      { max: 5000,    label: '少なめ', color: 'text-ios-orange' },
      { max: 8000,    label: '普通', color: 'text-ios-blue' },
      { max: Infinity, label: '活発', color: 'text-ios-green' },
    ],
  },
};

function StatDetailSheet({ statKey, logs, onClose }: {
  statKey: StatKey; logs: HealthLog[]; onClose: () => void;
}) {
  const cfg = STAT_CONFIG[statKey];

  // チャートデータ（古い順・直近60日）
  const cutoff = subDays(new Date(), 60);
  const chartData = [...logs]
    .reverse()
    .filter(l => l[cfg.field] != null && (l.timestamp as Timestamp).toDate() >= cutoff)
    .map(l => ({
      date: format((l.timestamp as Timestamp).toDate(), 'M/d'),
      value: l[cfg.field] as number,
    }));

  // 最新値
  const latest = logs.find(l => l[cfg.field] != null);
  const currentVal = latest?.[cfg.field] as number | undefined;
  const displayVal = currentVal != null
    ? cfg.decimals === 0
      ? Math.round(currentVal).toLocaleString()
      : (Math.round(currentVal * 10) / 10).toString()
    : '--';

  // カテゴリ判定
  const category = cfg.categories && currentVal != null
    ? cfg.categories.find(c => currentVal < c.max)
    : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-ios-card rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto">
        {/* ドラッグバー・閉じる */}
        <div className="relative pt-3 pb-2 flex justify-center">
          <div className="w-10 h-1 bg-black/20 rounded-full" />
          <button onClick={onClose} className="absolute right-4 top-3 w-8 h-8 bg-black/[0.06] rounded-full flex items-center justify-center">
            <X className="w-4 h-4 text-ios-secondary" />
          </button>
        </div>

        <div className="px-5 pb-28 space-y-4">
          {/* 現在値 */}
          <div>
            <p className="text-xs text-ios-secondary font-medium uppercase tracking-wider">{cfg.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-5xl font-bold tracking-tight ${cfg.color}`}>{displayVal}</span>
              {cfg.unit && <span className="text-xl text-ios-secondary">{cfg.unit}</span>}
              {category && (
                <span className={`text-sm font-semibold ml-1 ${category.color}`}>{category.label}</span>
              )}
            </div>
            {latest && (
              <p className="text-xs text-ios-tertiary mt-1">
                {format((latest.timestamp as Timestamp).toDate(), 'yyyy年M月d日', { locale: ja })} 時点
              </p>
            )}
          </div>

          {/* チャート */}
          {chartData.length > 1 ? (
            <div className="bg-ios-bg rounded-2xl p-3">
              <p className="text-xs text-ios-secondary font-medium mb-2">直近60日</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: '#8E8E93', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#8E8E93', fontSize: 10 }} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="bg-ios-label/90 text-white text-xs px-3 py-2 rounded-xl">
                            <p className="font-semibold">{payload[0].value}{cfg.unit}</p>
                            <p className="text-white/70">{label}</p>
                          </div>
                        ) : null
                      }
                    />
                    <Line type="monotone" dataKey="value" stroke={cfg.strokeColor} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-ios-bg rounded-2xl p-6 text-center">
              <p className="text-ios-tertiary text-sm">グラフ表示には2件以上のデータが必要です</p>
            </div>
          )}

          {/* カテゴリ一覧（BMI・体脂肪・歩数） */}
          {cfg.categories && (
            <div className="bg-ios-bg rounded-2xl overflow-hidden">
              <p className="text-xs text-ios-secondary font-medium px-4 pt-3 pb-2 uppercase tracking-wider">目安</p>
              {cfg.categories.filter(c => c.max !== Infinity).map((c, i, arr) => {
                const prev = arr[i - 1]?.max ?? 0;
                const isActive = currentVal != null && currentVal >= prev && currentVal < c.max;
                return (
                  <div key={c.label} className={`flex items-center justify-between px-4 py-2.5 border-t border-black/[0.06] ${isActive ? 'bg-blue-50/50' : ''}`}>
                    <span className={`text-sm ${isActive ? 'font-semibold text-ios-label' : 'text-ios-secondary'}`}>{c.label}</span>
                    <span className={`text-xs font-medium ${isActive ? c.color : 'text-ios-tertiary'}`}>
                      {prev === 0 ? `< ${c.max}` : `${prev} 〜 ${c.max}`}{statKey === 'steps' ? '歩' : statKey === 'bodyFat' ? '%' : ''}
                      {isActive && ' ← 現在'}
                    </span>
                  </div>
                );
              })}
              {/* 最後のカテゴリ */}
              {(() => {
                const last = cfg.categories[cfg.categories.length - 1];
                const prev = cfg.categories[cfg.categories.length - 2]?.max ?? 0;
                const isActive = currentVal != null && currentVal >= prev;
                return (
                  <div className={`flex items-center justify-between px-4 py-2.5 border-t border-black/[0.06] ${isActive ? 'bg-blue-50/50' : ''}`}>
                    <span className={`text-sm ${isActive ? 'font-semibold text-ios-label' : 'text-ios-secondary'}`}>{last.label}</span>
                    <span className={`text-xs font-medium ${isActive ? last.color : 'text-ios-tertiary'}`}>
                      {prev}以上{isActive && ' ← 現在'}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
