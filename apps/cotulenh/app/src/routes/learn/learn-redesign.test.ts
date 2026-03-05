import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('learn pages redesign', () => {
  it('learn hub uses CommandCenter', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/learn/+page.svelte'), 'utf8');
    expect(source).toContain('CommandCenter');
  });

  it('learn hub has flat subject list, no cards', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/routes/learn/+page.svelte'), 'utf8');
    expect(source).toContain('flat-list');
    expect(source).not.toContain('border-radius: 12px');
  });
});
