'use client';

import { cn } from '@/lib/utils/cn';

type PieceInfo = {
  type: string;
  color: string;
};

const PIECE_LABELS: Record<string, string> = {
  c: 'Tu lenh',
  i: 'Bo binh',
  t: 'Xe tang',
  m: 'Dan quan',
  e: 'Cong binh',
  a: 'Phao binh',
  d: 'Phong khong',
  s: 'Ten lua',
  f: 'Khong quan',
  n: 'Hai quan',
  h: 'So chi huy'
};

type DeployPieceTrayProps = {
  pieces: PieceInfo[];
  selectedPiece: string | null;
  onSelectPiece: (pieceType: string) => void;
  className?: string;
};

export function DeployPieceTray({
  pieces,
  selectedPiece,
  onSelectPiece,
  className
}: DeployPieceTrayProps) {
  if (pieces.length === 0) return null;

  return (
    <div
      className={cn('flex flex-wrap gap-[var(--space-1)] p-[var(--space-2)]', className)}
      role="toolbar"
      aria-label="Quan co de bo tri"
    >
      {pieces.map((piece, index) => {
        const label = PIECE_LABELS[piece.type] ?? piece.type;
        const isSelected = selectedPiece === `${piece.type}-${index}`;

        return (
          <button
            key={`${piece.type}-${index}`}
            type="button"
            onClick={() => onSelectPiece(`${piece.type}-${index}`)}
            className={cn(
              'min-h-[44px] min-w-[44px] border text-[var(--text-sm)] font-[family-name:var(--font-mono)]',
              isSelected
                ? 'border-[var(--color-deploy-active,var(--color-primary))] bg-[var(--color-surface-elevated)] text-[var(--color-text)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
            )}
            aria-label={label}
            aria-pressed={isSelected}
          >
            {piece.type.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
