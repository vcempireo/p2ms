'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { HealthLog } from '@/lib/types';
import { format, subMonths, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

type Period = '1M' | '3M' | 'ALL';

const PERIOD_LABELS: Record<Period, string> = {
  '1M': '1ヶ月',
  '3M': '3ヶ月',
  'ALL': '全期間',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ios-label/90 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-xl">
      <p className="font-semibold">{payload[0].value} kg</p>
      <p className="text-white/70">{payload[0].payload.fullDate}</p>
    </div>
  );
};

export default function WeightPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('3M');

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'health_log'),
          orderBy('timestamp', 'asc')
        );
        const snap = await getDocs(q);
        setLogs(snap.docs.map(d => d.data() as HealthLog));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  // 期間フィルタ済みのグラフデータ
  const chartData = useMemo(() => {
    const withWeight = logs.filter(l => l.weight != null);
    const cutoff = period === 'ALL' ? null
      : period === '3M' ? subMonths(new Date(), 3)
      : subDays(new Date(), 30);

    return withWeight
      .filter(l => !cutoff || (l.timestamp as Timestamp).toDate() >= cutoff)
      .map(l => ({
        date: format((l.timestamp as Timestamp).toDate(), 'M/d'),
        fullDate: format((l.timestamp as Timestamp).toDate(), 'yy/MM/dd'),
        weight: l.weight,
      }));
  }, [logs, period]);

  // 最新データ（weight有り）
  const latestWithWeight = [...logs].reverse().find(l => l.weight != null);
  const latestWithBmi    = [...logs].reverse().find(l => l.bmi != null && l.weight != null);

  // 身長をBMI・体重から逆算（BMI = kg / m²）
  const estimatedHeight = latestWithBmi
    ? Math.round(Math.sqrt(latestWithBmi.weight! / latestWithBmi.bmi!) * 100)
    : null;

  // 適正体重（身長(m)² × 22）
  const standardWeight = estimatedHeight
    ? Math.round((estimatedHeight / 100) ** 2 * 22 * 10) / 10
    : null;

  // 最小・最大体重
  const weightValues = logs.filter(l => l.weight != null).map(l => l.weight!);
  const minWeight = weightValues.length ? Math.min(...weightValues) : null;
  const maxWeight = weightValues.length ? Math.max(...weightValues) : null;
  const totalLoss  = (maxWeight != null && latestWithWeight?.weight != null)
    ? Math.round((maxWeight - latestWithWeight.weight) * 10) / 10
    : null;

  return (
    <div className="min-h-screen bg-ios-bg pb-28">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-ios-bg/80 backdrop-blur-xl border-b border-black/[0.06]">
        <div className="max-w-md mx-auto flex items-center h-14 px-4 gap-2">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-ios-blue" />
          </button>
          <h1 className="text-base font-semibold text-ios-label">体重</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* 現在体重カード */}
        <div className="bg-ios-card rounded-2xl shadow-ios-sm p-5">
          <p className="text-xs text-ios-secondary font-medium uppercase tracking-wider">現在</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-5xl font-bold tracking-tight text-ios-label">
              {loading ? '--' : latestWithWeight?.weight ?? '--'}
            </span>
            <span className="text-lg text-ios-secondary font-medium">kg</span>
          </div>
          {latestWithWeight && (
            <p className="text-xs text-ios-tertiary mt-1">
              {format((latestWithWeight.timestamp as Timestamp).toDate(), 'yy/MM/dd')} 時点
            </p>
          )}
        </div>

        {/* 期間トグル */}
        <div className="bg-ios-card rounded-2xl shadow-ios-sm overflow-hidden">
          <div className="flex border-b border-black/[0.06]">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors
                  ${period === p ? 'text-ios-blue bg-blue-50' : 'text-ios-secondary'}`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* チャート */}
          <div className="h-52 px-2 py-3">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-ios-blue border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-ios-tertiary text-sm">データなし</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: '#8E8E93', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#8E8E93', fontSize: 10 }} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip content={<CustomTooltip />} />
                  {/* 適正体重ライン */}
                  {standardWeight && (
                    <ReferenceLine y={standardWeight} stroke="#34C759" strokeDasharray="4 2" strokeWidth={1.5} />
                  )}
                  <Line type="monotone" dataKey="weight" stroke="#007AFF" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#007AFF', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 適正体重・ステータス */}
        {standardWeight && latestWithWeight?.weight && (
          <div className="bg-ios-card rounded-2xl shadow-ios-sm p-4 space-y-3">
            <p className="text-xs font-semibold text-ios-secondary uppercase tracking-wider">
              適正体重（推定身長 {estimatedHeight}cm）
            </p>
            <div className="flex items-center gap-3">
              {/* ゲージ */}
              <div className="flex-1 space-y-1">
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                  {/* 適正範囲バー（BMI 18.5〜24.9） */}
                  {(() => {
                    const h = (estimatedHeight! / 100);
                    const minOk = Math.round(18.5 * h * h * 10) / 10;
                    const maxOk = Math.round(24.9 * h * h * 10) / 10;
                    const rangeMin = minOk - 5;
                    const rangeMax = maxOk + 5;
                    const range = rangeMax - rangeMin;
                    const okLeft = ((minOk - rangeMin) / range) * 100;
                    const okWidth = ((maxOk - minOk) / range) * 100;
                    const currentPos = Math.min(100, Math.max(0, ((latestWithWeight!.weight! - rangeMin) / range) * 100));
                    return (
                      <>
                        <div className="absolute h-full bg-green-100 rounded-full" style={{ left: `${okLeft}%`, width: `${okWidth}%` }} />
                        <div className="absolute top-0 w-3 h-3 bg-ios-blue rounded-full border-2 border-white shadow" style={{ left: `calc(${currentPos}% - 6px)` }} />
                      </>
                    );
                  })()}
                </div>
                <div className="flex justify-between text-[10px] text-ios-tertiary">
                  <span>低体重</span>
                  <span className="text-ios-green">適正範囲</span>
                  <span>肥満</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-ios-bg rounded-xl p-3 text-center">
                <p className="text-[10px] text-ios-secondary">適正体重</p>
                <p className="text-lg font-bold text-ios-green mt-0.5">{standardWeight} kg</p>
              </div>
              <div className="bg-ios-bg rounded-xl p-3 text-center">
                <p className="text-[10px] text-ios-secondary">現在との差</p>
                <p className={`text-lg font-bold mt-0.5 ${latestWithWeight.weight! > standardWeight ? 'text-ios-orange' : 'text-ios-blue'}`}>
                  {latestWithWeight.weight! > standardWeight ? '+' : ''}{Math.round((latestWithWeight.weight! - standardWeight) * 10) / 10} kg
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 統計サマリー */}
        <div className="bg-ios-card rounded-2xl shadow-ios-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-ios-secondary uppercase tracking-wider">全期間サマリー</p>
          </div>
          <div className="px-4 pb-4 grid grid-cols-3 gap-2">
            {[
              { label: '最高',  value: maxWeight,    unit: 'kg', color: 'text-ios-red'   },
              { label: '最低',  value: minWeight,    unit: 'kg', color: 'text-ios-blue'  },
              { label: '総減量', value: totalLoss != null && totalLoss > 0 ? totalLoss : null, unit: 'kg↓', color: 'text-ios-green' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="bg-ios-bg rounded-xl p-3 text-center">
                <p className="text-[10px] text-ios-secondary">{label}</p>
                <p className={`text-lg font-bold mt-0.5 ${color}`}>{value ?? '--'}</p>
                <p className="text-[10px] text-ios-tertiary">{unit}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
