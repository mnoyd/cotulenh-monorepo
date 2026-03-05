import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('puzzles page redesign', () => {
  it('uses CommandCenter', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/puzzles/+page.svelte'), 'utf8');
    expect(source).toContain('CommandCenter');
  });

  it('has no card containers or rounded badges', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/puzzles/+page.svelte'), 'utf8');
    expect(source).not.toContain('puzzle-card');
    expect(source).not.toContain('border-radius: 12px');
    expect(source).not.toContain('border-radius: 9999px');
  });

  it('has no icon imports', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/puzzles/+page.svelte'), 'utf8');
    expect(source).not.toContain('Puzzle');
    expect(source).not.toContain('Play');
    expect(source).not.toContain('ChevronRight');
  });

  it('uses text links for play action', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/puzzles/+page.svelte'), 'utf8');
    expect(source).toContain('text-link');
  });
});
