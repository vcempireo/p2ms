'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, getRedirectResult, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// ログイン不要なページ（このリストにないページはすべて認証が必要）
const PUBLIC_PATHS = ['/login'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // getRedirectResult完了後にonAuthStateChangedを開始してループを防ぐ
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    getRedirectResult(auth)
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (cancelled) return;
          setUser(currentUser);
          setLoading(false);

          const isPublicPath = PUBLIC_PATHS.includes(pathname);
          if (!currentUser && !isPublicPath) {
            router.replace('/login');
          } else if (currentUser && isPublicPath) {
            router.replace('/');
          }
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [pathname, router]);

  // 認証確認中はローディング表示
  if (loading) {
    return (
      <div className="min-h-screen bg-ios-bg flex items-center justify-center">
        <div className="w-8 h-8 border-ios-blue border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/** ログイン中のユーザー情報を取得するフック */
export const useAuth = () => useContext(AuthContext);
