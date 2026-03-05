import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layoutPath = resolve(process.cwd(), 'src/routes/+layout.svelte');

describe('48px icon rail', () => {
  it('uses 48px width, not 80px', () => {
    const source = readFileSync(layoutPath, 'utf8');
    expect(source).toContain('width: 48px');
    expect(source).toContain('margin-left: 48px');
    expect(source).not.toContain('width: 80px');
  });

  it('has no text labels in sidebar', () => {
    const source = readFileSync(layoutPath, 'utf8');
    expect(source).not.toContain('sidebar-label');
  });

  it('uses left border accent for active state', () => {
    const source = readFileSync(layoutPath, 'utf8');
    expect(source).toContain('border-left');
  });
});
