import dynamic from 'next/dynamic';

import { FEATURES } from '@/lib/constants/feature-flags';

const AiGameClient = dynamic(
  () => import('@/components/game/ai-game-client').then((mod) => ({ default: mod.AiGameClient })),
  { ssr: false }
);

export default function AiGamePage() {
  if (!FEATURES.AI_OPPONENT) {
    return <ComingSoon />;
  }

  return <AiGameClient />;
}

function ComingSoon() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[var(--space-4)] p-[var(--space-4)]">
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[var(--space-6)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(45deg,var(--color-border)_25%,transparent_25%,transparent_75%,var(--color-border)_75%,var(--color-border)),linear-gradient(45deg,var(--color-border)_25%,transparent_25%,transparent_75%,var(--color-border)_75%,var(--color-border))] [background-position:0_0,16px_16px] [background-size:32px_32px]"
        />
        <div className="text-center">
          <h1 className="text-[length:var(--text-2xl)] font-bold text-[var(--color-text)]">
            Sắp ra mắt!
          </h1>
          <p className="mt-[var(--space-2)] text-[var(--color-text-muted)]">
            Chúng tôi đang phát triển tính năng này — sắp ra mắt!
          </p>
          <a
            href="/play"
            className="mt-[var(--space-4)] inline-block min-h-[44px] rounded border border-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
          >
            Tìm đối thủ trực tuyến
          </a>
        </div>
      </div>
    </div>
  );
}
