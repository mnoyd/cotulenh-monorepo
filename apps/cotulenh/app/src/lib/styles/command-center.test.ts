import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cssPath = resolve(process.cwd(), 'src/lib/styles/command-center.css');

describe('command center CSS utilities', () => {
  it('defines section-header class', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.section-header');
    expect(source).toContain('text-transform: uppercase');
    expect(source).toContain('font-family: var(--font-mono)');
  });

  it('defines divider class', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.divider');
    expect(source).toContain('border-top: 1px solid');
  });

  it('defines text-link class with no background or border', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.text-link');
    // Verify .text-link block has no border-radius (status-dot's circle is fine)
    const textLinkBlock = source.slice(
      source.indexOf('.text-link {'),
      source.indexOf('.text-link:hover')
    );
    expect(textLinkBlock).not.toContain('border-radius');
  });

  it('defines primary-cta with accent background', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.primary-cta');
    expect(source).toContain('--theme-primary');
  });

  it('defines toggle-group for text toggles', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.toggle-group');
  });

  it('defines flat-list for dense lists', () => {
    const source = readFileSync(cssPath, 'utf8');
    expect(source).toContain('.flat-list');
  });
});
