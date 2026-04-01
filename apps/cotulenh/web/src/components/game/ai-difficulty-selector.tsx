'use client';

import type { AiDifficulty } from '@/lib/ai-engine';

type AiDifficultySelectorProps = {
  onSelect: (difficulty: AiDifficulty) => void;
  disabled?: boolean;
};

const difficulties: Array<{
  key: AiDifficulty;
  label: string;
  description: string;
  testId: string;
}> = [
  { key: 'easy', label: 'Dễ', description: 'Nước đi ngẫu nhiên', testId: 'difficulty-easy' },
  {
    key: 'medium',
    label: 'Trung bình',
    description: 'Ưu tiên bắt quân',
    testId: 'difficulty-medium'
  },
  {
    key: 'hard',
    label: 'Khó',
    description: 'Tính trước 1 nước',
    testId: 'difficulty-hard'
  }
];

export function AiDifficultySelector({ onSelect, disabled }: AiDifficultySelectorProps) {
  return (
    <div className="flex flex-col items-center gap-[var(--space-4)] p-[var(--space-4)]">
      <h2 className="text-[length:var(--text-2xl)] font-bold text-[var(--color-text)]">
        Chọn độ khó
      </h2>
      <div className="flex flex-col gap-[var(--space-3)] w-full max-w-xs">
        {difficulties.map((d) => (
          <button
            key={d.key}
            data-testid={d.testId}
            disabled={disabled}
            onClick={() => onSelect(d.key)}
            className="flex flex-col items-center gap-[var(--space-1)] min-h-[56px] px-[var(--space-4)] py-[var(--space-3)] border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-[length:var(--text-lg)] font-semibold">{d.label}</span>
            <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              {d.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
