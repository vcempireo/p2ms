'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import SoulOSViewer from '@/components/SoulOSViewer';

// 個人データの型
interface UserProfile {
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  bloodType?: string;
  ethnicity?: string;
  height?: number;
}

// 個人データ行
function ProfileRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-black/[0.06] last:border-0">
      <span className="text-sm text-ios-secondary">{label}</span>
      <span className="text-sm font-medium text-ios-label">{value ?? '未設定'}</span>
    </div>
  );
}

const MyPage = () => {
  const { user } = useAuth();
  const [soulContent, setSoulContent] = useState<string | null>(null);
  const [soulLoading, setSoulLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({});

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const idToken = await user.getIdToken();
        const headers = { Authorization: `Bearer ${idToken}` };

        // Soul OS取得
        const soulRes = await fetch('/api/soul/profile', { headers });
        if (soulRes.ok) {
          const soulData = await soulRes.json();
          setSoulContent(soulData.profile?.content ?? null);
          // Soul生成時の入力データをプロフィールに反映
          if (soulData.profile) {
            setProfile(prev => ({
              ...prev,
              birthDate: soulData.profile.birthDate,
              birthTime: soulData.profile.birthTime,
              birthPlace: soulData.profile.birthPlace,
            }));
          }
        }
      } catch {
        setSoulContent(null);
      } finally {
        setSoulLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="min-h-screen bg-ios-bg pb-28">

      {/* ヘッダー */}
      <header className="px-5 pt-14 pb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-ios-blue overflow-hidden flex items-center justify-center flex-shrink-0">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-2xl">
              {user?.displayName?.[0] ?? '?'}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-ios-label">
            {user?.displayName ?? 'ユーザー'}
          </h1>
          <p className="text-sm text-ios-secondary">{user?.email}</p>
        </div>
      </header>

      <div className="px-4 space-y-4">

        {/* 個人データ */}
        <div className="bg-ios-card rounded-2xl shadow-ios-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-ios-secondary uppercase tracking-wider">個人データ</h2>
          </div>
          <div className="px-4">
            <ProfileRow label="生年月日" value={profile.birthDate} />
            <ProfileRow label="出生時刻" value={profile.birthTime} />
            <ProfileRow label="出生地" value={profile.birthPlace} />
            <ProfileRow label="血液型" value={profile.bloodType} />
            <ProfileRow label="人種・民族" value={profile.ethnicity} />
            <ProfileRow
              label="身長"
              value={profile.height ? `${profile.height} cm` : undefined}
            />
          </div>
        </div>

        {/* Soul OS */}
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
    </div>
  );
};

export default MyPage;
