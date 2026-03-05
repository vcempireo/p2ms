'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
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
    // Firebaseのログイン状態を監視
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      const isPublicPath = PUBLIC_PATHS.includes(pathname);

      if (!currentUser && !isPublicPath) {
        // 未ログインでログイン不要ページ以外にいる場合 → ログインへ
        router.replace('/login');
      } else if (currentUser && isPublicPath) {
        // ログイン済みでログインページにいる場合 → ホームへ
        router.replace('/');
      }
    });

    return () => unsubscribe();
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
