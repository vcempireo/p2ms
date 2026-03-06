'use client';

import ReactMarkdown from 'react-markdown';

// セクション定義
const SECTIONS = [
  { key: 'I',   emoji: '🌟', label: '総合定義',           hero: true  },
  { key: 'II',  emoji: '💻', label: 'OSの仕様',           hero: false },
  { key: 'III', emoji: '📱', label: 'プリインストールアプリ', hero: false },
  { key: 'IV',  emoji: '📖', label: 'トリセツ',            hero: false },
  { key: 'V',   emoji: '✨', label: '最終所見',            hero: false },
];

// Markdownをセクションごとに分割（## I. / I. どちらの形式にも対応）
function parseSections(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  // "## I." 形式と "I." 形式の両方に対応
  const regex = /^(?:##\s+)?(I{1,3}|IV|V|VI{0,3}|IX|X)\./gm;
  const parts = content.split(regex);

  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].trim();
    const body = (parts[i + 1] ?? '').trim();
    result[key] = body;
  }
  return result;
}

interface Props {
  content: string;
}

export default function SoulOSViewer({ content }: Props) {
  const sections = parseSections(content);
  const hasAnySections = SECTIONS.some(({ key }) => sections[key]);

  // セクション解析できない場合はそのままMarkdown表示
  if (!hasAnySections) {
    return (
      <div className="prose prose-sm max-w-none
        text-ios-secondary
        prose-headings:text-ios-label prose-headings:font-semibold prose-headings:text-sm prose-headings:mt-3 prose-headings:mb-1
        prose-p:leading-relaxed prose-p:my-1.5
        prose-strong:text-ios-label
        prose-ul:my-1 prose-li:my-0.5
        prose-li:marker:text-ios-blue">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {SECTIONS.map(({ key, emoji, label, hero }) => {
        const body = sections[key];
        if (!body) return null;

        return hero ? (
          // 総合定義はヒーローカード
          <div key={key} className="bg-ios-blue rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{emoji}</span>
              <span className="text-sm font-semibold text-white/80">{label}</span>
            </div>
            <p className="text-white font-medium leading-relaxed text-sm">
              {body.replace(/^#+\s*/gm, '').trim()}
            </p>
          </div>
        ) : (
          // その他のセクションはアコーディオンカード
          <details key={key} className="bg-ios-card rounded-2xl shadow-ios-sm overflow-hidden group">
            <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none">
              <span className="text-xl">{emoji}</span>
              <span className="font-semibold text-ios-label text-sm flex-1">{label}</span>
              <span className="text-ios-tertiary text-xs group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="px-4 pb-4 border-t border-black/[0.06]">
              <div className="pt-3 prose prose-sm max-w-none
                text-ios-secondary
                prose-headings:text-ios-label prose-headings:font-semibold prose-headings:text-sm prose-headings:mt-3 prose-headings:mb-1
                prose-p:leading-relaxed prose-p:my-1.5
                prose-strong:text-ios-label
                prose-ul:my-1 prose-li:my-0.5
                prose-li:marker:text-ios-blue">
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
