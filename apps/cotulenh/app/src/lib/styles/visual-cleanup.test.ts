import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('visual system cleanup', () => {
  it('app.css has no btn-game classes', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
    expect(source).not.toContain('.btn-game-primary');
    expect(source).not.toContain('.btn-game-alert');
    expect(source).not.toContain('.btn-game-secondary');
    expect(source).not.toContain('.btn-game-subtle');
    expect(source).not.toContain('.btn-game-ghost');
  });

  it('sets base font size to 13px', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
    expect(source).toContain('font-size: 13px');
  });

  it('keeps theme variable system', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app.css'), 'utf8');
    expect(source).toContain('--theme-bg-dark');
    expect(source).toContain('--theme-primary');
    expect(source).toContain('@theme');
  });
});
