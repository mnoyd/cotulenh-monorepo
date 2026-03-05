import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(process.cwd(), 'src/lib/components/TabPanel.svelte');

describe('TabPanel component', () => {
  it('exists with tab-bar and tab-content structure', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('tab-bar');
    expect(source).toContain('tab-button');
    expect(source).toContain('tab-content');
  });

  it('uses monospace uppercase for tab labels', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('font-family: var(--font-mono)');
    expect(source).toContain('text-transform: uppercase');
  });

  it('has no animation or transition', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).not.toContain('transition');
    expect(source).not.toContain('animation');
  });

  it('scrolls tab content independently', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('overflow-y: auto');
  });

  it('has 2px bottom accent underline on active tab', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('border-bottom');
    expect(source).toContain('--theme-primary');
  });
});
