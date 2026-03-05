'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import FoodAnalysisWizard from '@/components/FoodAnalysisWizard';

export default function FoodNewPage() {
  return (
    <div className="min-h-screen bg-ios-bg">
      {/* ヘッダー（iOS ナビゲーションバー風） */}
      <header className="sticky top-0 z-10 bg-ios-bg/80 backdrop-blur-xl border-b border-black/[0.06]">
        <div className="max-w-md mx-auto flex items-center h-14 px-4">
          <Link href="/" className="flex items-center gap-1 text-ios-blue font-medium">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">キャンセル</span>
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold text-ios-label">
            食事を記録
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 pb-12">
        <FoodAnalysisWizard />
      </main>
    </div>
  );
}
