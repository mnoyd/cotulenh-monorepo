import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('play page redesign', () => {
  it('PlayDesktop no longer has controls-section', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/PlayDesktop.svelte'),
      'utf8'
    );
    expect(source).not.toContain('controls-section');
    expect(source).not.toContain('controls-grid');
    expect(source).not.toContain('controls-header');
  });

  it('uses CommandCenter with tabs', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/PlayDesktop.svelte'),
      'utf8'
    );
    expect(source).toContain('CommandCenter');
    expect(source).toContain('tabs');
  });

  it('has no decorative title styling', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/play/PlayDesktop.svelte'),
      'utf8'
    );
    expect(source).not.toContain('title-green');
    expect(source).not.toContain('title-cyan');
  });
});
