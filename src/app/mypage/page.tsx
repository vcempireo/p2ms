'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import SoulOSViewer from '@/components/SoulOSViewer';
import profileData from '../../lib/pms-profile.json';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  changeColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, change, changeColor }) => (
  <div className="bg-pms-card-bg p-4 rounded-xl shadow-sm flex flex-col justify-between">
    <div>
        <p className="text-pms-text-secondary text-sm">{label}</p>
        <p className="text-pms-text-primary text-2xl font-bold mt-1">{value}<span className="text-base ml-1">{unit}</span></p>
    </div>
    {change && <p className={`text-xs mt-2 ${changeColor}`}>{change}</p>}
  </div>
);

const MyPage = () => {
  const { user } = useAuth();
  const { system_settings } = profileData;
  const bmi = 22.3;
  const bodyFatPercentage = 17.5;
  const leanBodyMass = 50.5;

  const [soulContent, setSoulContent] = useState<string | null>(null);
  const [soulLoading, setSoulLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchSoulProfile = async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/soul/profile', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSoulContent(data.profile?.content ?? null);
      } catch {
        setSoulContent(null);
      } finally {
        setSoulLoading(false);
      }
    };
    fetchSoulProfile();
  }, [user]);

  return (
    <div className="p-4 space-y-6 text-pms-text-primary pb-24">

      {/* Goal Card */}
      <div className="bg-pms-card-bg p-5 rounded-xl shadow-sm">
        <p className="text-pms-text-secondary text-sm">目標</p>
        <p className="text-pms-text-primary text-5xl font-bold mt-1">63.3<span className="text-2xl ml-1">kg</span></p>
        <div className="bg-pms-purple-notification text-purple-800 text-sm font-medium px-3 py-1 rounded-full mt-3 inline-block">
          先週に比べ体重に変化が増えているよ
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2">
        {['体重', '食事', '睡眠', 'トレーニング'].map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${tab === '体重' ? 'bg-pms-text-primary text-white' : 'bg-pms-card-bg text-pms-text-secondary hover:bg-gray-100'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="体重" value="63.3" unit="kg" change="前日比 -0.2kg" changeColor="text-green-500"/>
        <StatCard label="BMI" value={bmi} change="前日比 -0.1" changeColor="text-green-500"/>
        <StatCard label="体脂肪率" value={bodyFatPercentage} unit="%" change="前日比 -0.1%" changeColor="text-green-500"/>
        <StatCard label="除脂肪体重" value={leanBodyMass} unit="kg" change="前日比 +0.1kg" changeColor="text-red-500"/>
      </div>

      {/* Soul OS セクション */}
      <div className="bg-ios-card rounded-2xl shadow-ios-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-black/[0.06] flex items-center gap-2">
          <span className="text-lg">🧬</span>
          <h2 className="font-semibold text-ios-label">Soul OS</h2>
          <span className="text-xs text-ios-secondary ml-auto">魂の設計図</span>
        </div>

        <div className="p-4">
          {soulLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-ios-blue border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
            </div>
          ) : soulContent ? (
            <SoulOSViewer content={soulContent} />
          ) : (
            <div className="text-center py-8">
              <p className="text-ios-secondary text-sm">Soul OSがまだ生成されていません</p>
              <p className="text-ios-tertiary text-xs mt-1">オンボーディングで生年月日を入力すると生成されます</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default MyPage;
