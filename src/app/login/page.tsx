'use client';

import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setError('ログインに失敗しました。もう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ios-bg flex flex-col items-center justify-center px-8">

      {/* ロゴエリア */}
      <div className="text-center mb-16">
        <div className="w-20 h-20 bg-ios-blue rounded-[22px] flex items-center justify-center mx-auto mb-6 shadow-ios-lg">
          <span className="text-4xl">🥗</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-ios-label">P²MS</h1>
        <p className="text-ios-secondary text-sm mt-2 tracking-wide">
          Personal Performance Management
        </p>
      </div>

      {/* ログインカード */}
      <div className="w-full max-w-sm bg-ios-card rounded-2xl shadow-ios-md overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-xl font-semibold text-ios-label">ようこそ</h2>
          <p className="text-ios-secondary text-sm mt-1">
            Googleアカウントでログインしてください
          </p>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 rounded-xl text-sm text-ios-red">
            {error}
          </div>
        )}

        <div className="p-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-ios-bg border border-ios-separator rounded-xl py-3.5 px-5 font-medium text-ios-label hover:bg-gray-100 transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-ios-secondary border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span>{loading ? 'ログイン中...' : 'Googleでログイン'}</span>
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-ios-tertiary mt-8 px-8 leading-relaxed">
        ログインすることで利用規約およびプライバシーポリシーに同意したものとみなされます
      </p>
    </div>
  );
}
