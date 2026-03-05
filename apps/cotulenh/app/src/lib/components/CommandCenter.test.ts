import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(process.cwd(), 'src/lib/components/CommandCenter.svelte');

describe('CommandCenter layout component', () => {
  it('defines 2-column grid with 320px right panel', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('command-center');
    expect(source).toContain('center-area');
    expect(source).toContain('right-panel');
    expect(source).toContain('320px');
  });

  it('uses TabPanel for right-side tabs', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain("import TabPanel from './TabPanel.svelte'");
  });

  it('accepts center snippet and tabs array', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('center');
    expect(source).toContain('tabs');
    expect(source).toContain('Snippet');
  });

  it('has mobile overlay toggle', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('mobile-panel-toggle');
    expect(source).toContain('mobile-panel-overlay');
  });

  it('imports command-center.css for utility classes', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('command-center.css');
  });
});
