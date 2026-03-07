'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import SoulOSViewer from '@/components/SoulOSViewer';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  const [soulError, setSoulError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({});

  // Health Auto Export 連携用トークン
  const [webhookToken, setWebhookToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const idToken = await user.getIdToken();
        const headers = { Authorization: `Bearer ${idToken}` };

        // Soul OS取得
        const soulRes = await fetch('/api/soul/profile', { headers });
        const soulData = await soulRes.json();
        if (!soulRes.ok) {
          setSoulError(`API Error ${soulRes.status}: ${soulData.error}`);
        } else {
          setSoulContent(soulData.profile?.content ?? null);
          if (soulData.profile) {
            setProfile(prev => ({
              ...prev,
              birthDate: soulData.profile.birthDate,
              birthTime: soulData.profile.birthTime,
              birthPlace: soulData.profile.birthPlace,
            }));
          }
        }

        // profile/core から身体データ取得
        const profileSnap = await getDoc(doc(db, 'users', user.uid, 'profile', 'core'));
        if (profileSnap.exists()) {
          const p = profileSnap.data();
          setProfile(prev => ({
            ...prev,
            birthDate:  p.birthDate  ?? prev.birthDate,
            birthTime:  p.birthTime  ?? prev.birthTime,
            birthPlace: p.birthPlace ?? prev.birthPlace,
            bloodType:  p.bloodType,
            ethnicity:  p.ethnicity,
            height:     p.height,
          }));
        }

        // webhookトークン取得
        const tokenRes = await fetch('/api/health/webhook-token', { headers });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          setWebhookToken(tokenData.token);
        }
      } catch (e: any) {
        setSoulError(e.message ?? '不明なエラー');
        setSoulContent(null);
      } finally {
        setSoulLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // webhookトークンを生成/再生成
  const generateToken = async () => {
    if (!user || tokenLoading) return;
    setTokenLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/health/webhook-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      setWebhookToken(data.token);
    } finally {
      setTokenLoading(false);
    }
  };

  // webhook URLをクリップボードにコピー
  const copyWebhookUrl = () => {
    if (!user || !webhookToken) return;
    const url = `${location.origin}/api/health/webhook?uid=${user.uid}&token=${webhookToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

        {/* Health Auto Export 連携 */}
        <div className="bg-ios-card rounded-2xl shadow-ios-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-black/[0.06] flex items-center gap-2">
            <span className="text-lg">❤️</span>
            <h2 className="font-semibold text-ios-label">ヘルスデータ連携</h2>
            <span className="text-xs text-ios-secondary ml-auto">Health Auto Export</span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-ios-secondary leading-relaxed">
              「Health Auto Export」アプリのWebhook URLに以下のURLを設定すると、体重・体脂肪・歩数などが自動連携されます。
            </p>

            {webhookToken ? (
              <div className="space-y-2">
                <div className="bg-ios-bg rounded-xl px-3 py-2 flex items-center gap-2">
                  <code className="text-xs text-ios-label flex-1 truncate">
                    {`${typeof window !== 'undefined' ? location.origin : ''}/api/health/webhook?uid=${user?.uid}&token=${webhookToken}`}
                  </code>
                  <button
                    onClick={copyWebhookUrl}
                    className="flex-shrink-0 text-ios-blue p-1 active:opacity-60"
                  >
                    {copied ? <Check className="w-4 h-4 text-ios-green" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={generateToken}
                  disabled={tokenLoading}
                  className="flex items-center gap-1.5 text-xs text-ios-secondary active:opacity-60"
                >
                  <RefreshCw className={`w-3 h-3 ${tokenLoading ? 'animate-spin' : ''}`} />
                  URLを再生成（流出時）
                </button>
              </div>
            ) : (
              <button
                onClick={generateToken}
                disabled={tokenLoading}
                className="w-full py-2.5 bg-ios-blue text-white text-sm font-medium rounded-xl active:opacity-80"
              >
                {tokenLoading ? '生成中...' : 'Webhook URLを生成'}
              </button>
            )}

            <div className="text-xs text-ios-tertiary space-y-1 pt-1">
              <p>📱 対応データ: 体重 / 体脂肪率 / BMI / 除脂肪体重 / 歩数</p>
              <p>⚙️ アプリ設定: Export Format → REST API、Method → POST</p>
            </div>
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
            ) : soulError ? (
              <p className="text-ios-red text-xs p-2">{soulError}</p>
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
