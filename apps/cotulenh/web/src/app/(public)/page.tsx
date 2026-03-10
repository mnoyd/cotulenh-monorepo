import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BookOpen, Swords, Trophy } from 'lucide-react';

import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = {
  title: 'Cờ Tư Lệnh — Chiến thuật quân sự Việt Nam',
  description:
    'Chơi Cờ Tư Lệnh trực tuyến miễn phí. Học chiến thuật, thách đấu bạn bè, xếp hạng toàn quốc.',
  openGraph: {
    title: 'Cờ Tư Lệnh — Chiến thuật quân sự Việt Nam',
    description:
      'Chơi Cờ Tư Lệnh trực tuyến miễn phí. Học chiến thuật, thách đấu bạn bè, xếp hạng toàn quốc.'
  }
};

const features = [
  {
    icon: BookOpen,
    title: 'Học miễn phí',
    description: 'Bài học tương tác từ cơ bản đến nâng cao'
  },
  {
    icon: Swords,
    title: 'Chơi với bạn bè',
    description: 'Thách đấu trực tuyến theo thời gian thực'
  },
  {
    icon: Trophy,
    title: 'Xếp hạng',
    description: 'Hệ thống xếp hạng Glicko-2 công bằng'
  }
] as const;

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <>
      {/* Hero Section */}
      <section className="flex flex-col items-center px-[var(--space-4)] py-[var(--space-12)] sm:py-[var(--space-16)]">
        <div className="mx-auto w-full max-w-[1200px]">
          {/* Board Visual */}
          <div className="mx-auto mb-[var(--space-8)] w-full max-w-[320px] sm:max-w-[60vw] sm:min-w-[360px] lg:max-w-[480px]">
            <BoardHero />
          </div>

          {/* Headline */}
          <h1 className="mb-[var(--space-6)] text-center text-[var(--text-3xl)] font-bold text-[var(--color-text)]">
            Cờ Tư Lệnh — chiến thuật quân sự Việt Nam
          </h1>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-[var(--space-3)] sm:flex-row sm:justify-center">
            <Link
              href="/learn"
              className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'w-full sm:w-auto')}
            >
              Học chơi
            </Link>
            <Link
              href="/signup"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')}
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="px-[var(--space-4)] pb-[var(--space-12)] sm:pb-[var(--space-16)]">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-[var(--space-4)] sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[var(--space-6)]"
            >
              <feature.icon
                className="mb-[var(--space-3)] size-6 text-[var(--color-primary)]"
                aria-hidden="true"
              />
              <h2 className="mb-[var(--space-2)] text-[var(--text-lg)] font-semibold text-[var(--color-text)]">
                {feature.title}
              </h2>
              <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/** Static SVG board representation — no game engine imports */
function BoardHero() {
  const rows = 12;
  const cols = 9;
  const cellSize = 40;
  const width = cols * cellSize;
  const height = rows * cellSize;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Bàn cờ Tư Lệnh"
    >
      {/* Board grid */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const isRiver = r === 5 || r === 6;
          return (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              className={
                isRiver
                  ? 'fill-[var(--color-primary)] opacity-20'
                  : (r + c) % 2 === 0
                    ? 'fill-[var(--color-surface-elevated)]'
                    : 'fill-[var(--color-border)]'
              }
            />
          );
        })
      )}

      {/* River label */}
      <text
        x={width / 2}
        y={5.5 * cellSize + 4}
        textAnchor="middle"
        className="fill-[var(--color-primary)] text-[10px] font-bold opacity-60"
      >
        SÔNG
      </text>

      {/* Sample pieces — top side (red) */}
      {[
        { col: 4, row: 0, label: 'TL' },
        { col: 3, row: 1, label: 'QĐ' },
        { col: 5, row: 1, label: 'QĐ' },
        { col: 1, row: 0, label: 'PK' },
        { col: 7, row: 0, label: 'PK' },
        { col: 2, row: 2, label: 'XL' },
        { col: 6, row: 2, label: 'XL' }
      ].map((piece) => (
        <g key={`top-${piece.col}-${piece.row}`}>
          <circle
            cx={piece.col * cellSize + cellSize / 2}
            cy={piece.row * cellSize + cellSize / 2}
            r={14}
            className="fill-[var(--color-error)] opacity-80"
          />
          <text
            x={piece.col * cellSize + cellSize / 2}
            y={piece.row * cellSize + cellSize / 2 + 4}
            textAnchor="middle"
            className="fill-white text-[9px] font-bold"
          >
            {piece.label}
          </text>
        </g>
      ))}

      {/* Sample pieces — bottom side (blue) */}
      {[
        { col: 4, row: 11, label: 'TL' },
        { col: 3, row: 10, label: 'QĐ' },
        { col: 5, row: 10, label: 'QĐ' },
        { col: 1, row: 11, label: 'PK' },
        { col: 7, row: 11, label: 'PK' },
        { col: 2, row: 9, label: 'XL' },
        { col: 6, row: 9, label: 'XL' }
      ].map((piece) => (
        <g key={`bottom-${piece.col}-${piece.row}`}>
          <circle
            cx={piece.col * cellSize + cellSize / 2}
            cy={piece.row * cellSize + cellSize / 2}
            r={14}
            className="fill-[var(--color-primary)] opacity-80"
          />
          <text
            x={piece.col * cellSize + cellSize / 2}
            y={piece.row * cellSize + cellSize / 2 + 4}
            textAnchor="middle"
            className="fill-white text-[9px] font-bold"
          >
            {piece.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
