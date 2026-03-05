'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, Plus, User } from 'lucide-react';

const tabs = [
  { href: '/',        icon: Home,        label: 'ホーム' },
  { href: '/food',    icon: CalendarDays, label: '食事' },
  { href: '/mypage',  icon: User,        label: 'プロフィール' },
];

// BottomNavを表示しないページ
const HIDDEN_PATHS = ['/login', '/food/new'];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50">
      {/* iOS風ブラーバー */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-black/[0.08]">
        <div className="max-w-md mx-auto flex items-center justify-around px-2 safe-bottom h-16">

          {/* 左2タブ */}
          <TabItem tab={tabs[0]} active={pathname === tabs[0].href} />
          <TabItem tab={tabs[1]} active={pathname.startsWith('/food') && !pathname.includes('/new')} />

          {/* 中央FABボタン */}
          <Link
            href="/food/new"
            className="flex items-center justify-center w-14 h-14 bg-ios-blue rounded-full shadow-ios-fab -mt-6 transition-transform active:scale-95"
          >
            <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
          </Link>

          {/* 右1タブ（現状は2つだが将来的に追加可能） */}
          <div className="w-16" /> {/* スペーサー */}
          <TabItem tab={tabs[2]} active={pathname.startsWith('/mypage')} />
        </div>
      </div>
    </nav>
  );
}

function TabItem({ tab, active }: { tab: typeof tabs[0]; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className="flex flex-col items-center justify-center gap-0.5 w-16 py-1 transition-opacity active:opacity-60"
    >
      <Icon
        className={`w-6 h-6 transition-colors ${active ? 'text-ios-blue' : 'text-ios-secondary'}`}
        strokeWidth={active ? 2.5 : 1.5}
      />
      <span className={`text-[10px] font-medium transition-colors ${active ? 'text-ios-blue' : 'text-ios-secondary'}`}>
        {tab.label}
      </span>
    </Link>
  );
}
