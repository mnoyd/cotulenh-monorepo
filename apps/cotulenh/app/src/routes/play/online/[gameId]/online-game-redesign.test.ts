import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pagePath = resolve(process.cwd(), 'src/routes/play/online/[gameId]/+page.svelte');

describe('online game page redesign', () => {
  it('uses CommandCenter', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('CommandCenter');
  });

  it('uses section-header and divider classes', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('section-header');
    expect(source).toContain('divider');
  });

  it('uses text-link for game actions', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('text-link');
  });

  it('has no border-radius: 6px card styling', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).not.toContain('border-radius: 6px');
  });
});
