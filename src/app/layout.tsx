// Firebaseを使うページはビルド時の静的レンダリングを無効にする
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { FoodAnalysisProvider } from '@/components/FoodAnalysisContext';
import AnalysisBanner from '@/components/AnalysisBanner';
import BottomNav from '@/components/BottomNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'P²MS',
  description: 'Personalized Performance Management System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'P²MS',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-ios-bg`}>
        <AuthProvider>
          <FoodAnalysisProvider>
            <AnalysisBanner />
            {children}
            <BottomNav />
          </FoodAnalysisProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
