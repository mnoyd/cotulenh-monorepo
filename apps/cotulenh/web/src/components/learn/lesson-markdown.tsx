import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

type LessonMarkdownProps = {
  content: string;
  className?: string;
};

function renderInlineMarkdown(text: string): ReactNode[] {
  const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={`${segment}-${index}`}>{segment.slice(2, -2)}</strong>;
    }

    return <span key={`${segment}-${index}`}>{segment}</span>;
  });
}

export function LessonMarkdown({ content, className }: LessonMarkdownProps) {
  const blocks = content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className={cn('space-y-[var(--space-3)]', className)}>
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim());

        if (lines.every((line) => line.startsWith('- '))) {
          return (
            <ul
              key={`list-${index}`}
              className="space-y-[var(--space-1)] pl-[var(--space-4)] text-[var(--text-sm)] text-[var(--color-text-muted)]"
            >
              {lines.map((line, lineIndex) => (
                <li key={`item-${index}-${lineIndex}`} className="list-disc">
                  {renderInlineMarkdown(line.slice(2))}
                </li>
              ))}
            </ul>
          );
        }

        if (lines.length === 1 && lines[0].startsWith('## ')) {
          return (
            <h2
              key={`heading-${index}`}
              className="text-[var(--text-base)] font-semibold text-[var(--color-text)]"
            >
              {renderInlineMarkdown(lines[0].slice(3))}
            </h2>
          );
        }

        return (
          <p
            key={`paragraph-${index}`}
            className="text-[var(--text-sm)] text-[var(--color-text-muted)]"
          >
            {lines.map((line, lineIndex) => (
              <span key={`line-${index}-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInlineMarkdown(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
