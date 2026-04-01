'use client';

import type { GameData } from '@/lib/types/game';
import { generatePgn, getPgnFilename } from '@/lib/pgn-export';

type PgnExportControlsProps = {
  gameData: GameData;
  onCopySuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export function PgnExportControls({ gameData, onCopySuccess, onError }: PgnExportControlsProps) {
  const btnBase =
    'min-h-[44px] flex-1 border border-[var(--color-border)] px-[var(--space-3)] text-[var(--text-sm)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]';

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard-not-supported');
      }

      const pgn = generatePgn(gameData);
      await navigator.clipboard.writeText(pgn);
      onCopySuccess?.('Da sao chep PGN');
    } catch {
      onError?.('Khong the sao chep');
    }
  };

  const handleDownload = () => {
    try {
      const pgn = generatePgn(gameData);
      const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = getPgnFilename(gameData);
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      onError?.('Khong the tai xuong PGN');
    }
  };

  return (
    <div
      className="flex shrink-0 items-center gap-[var(--space-2)] border-t border-[var(--color-border)] p-[var(--space-2)]"
      data-testid="pgn-export-controls"
    >
      <button
        type="button"
        className={btnBase}
        onClick={() => void handleCopy()}
        data-testid="pgn-copy"
      >
        Sao chep PGN
      </button>
      <button type="button" className={btnBase} onClick={handleDownload} data-testid="pgn-download">
        Tai xuong
      </button>
    </div>
  );
}
