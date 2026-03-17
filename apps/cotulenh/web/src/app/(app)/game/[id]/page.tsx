import { getGame } from '@/lib/actions/game';
import { GamePageClient } from '@/components/game/game-page-client';
import { notFound } from 'next/navigation';

type GamePageProps = {
  params: Promise<{ id: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { id } = await params;
  const result = await getGame(id);

  if (!result.success) {
    if (result.error === 'not-found') {
      notFound();
    }
    return (
      <div className="flex h-full items-center justify-center p-[var(--space-4)]">
        <div className="text-center">
          <p className="text-[var(--text-lg)] font-semibold text-[var(--color-text)]">
            {result.error === 'unauthorized'
              ? 'Ban khong co quyen xem tran dau nay'
              : 'Khong the tai tran dau'}
          </p>
          <a
            href="/dashboard"
            className="mt-[var(--space-4)] inline-block border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
          >
            Quay lai
          </a>
        </div>
      </div>
    );
  }

  return <GamePageClient gameData={result.data} />;
}
