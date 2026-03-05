import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('online hub redesign', () => {
  it('uses CommandCenter', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/online/+page.svelte'),
      'utf8'
    );
    expect(source).toContain('CommandCenter');
  });

  it('has no card containers', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/online/+page.svelte'),
      'utf8'
    );
    expect(source).not.toContain('border-radius: 12px');
  });

  it('uses section-header and divider classes', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/online/+page.svelte'),
      'utf8'
    );
    expect(source).toContain('section-header');
    expect(source).toContain('divider');
  });
});
