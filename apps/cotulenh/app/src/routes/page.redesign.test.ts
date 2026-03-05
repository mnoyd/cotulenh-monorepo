import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pagePath = resolve(process.cwd(), 'src/routes/+page.svelte');

describe('home page redesign', () => {
  it('uses CommandCenter component', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('CommandCenter');
  });

  it('has primary-cta play button', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('primary-cta');
    expect(source).toContain('href="/play"');
  });

  it('has no feature cards', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).not.toContain('feature-card');
    expect(source).not.toContain('coming-soon-card');
    expect(source).not.toContain('cta-button');
  });

  it('has no decorative icons in content', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).not.toContain('BookOpen');
    expect(source).not.toContain('Gamepad2');
    expect(source).not.toContain('Share2');
    expect(source).not.toContain('Bot');
  });

  it('uses section-header and divider classes', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('section-header');
    expect(source).toContain('divider');
  });

  it('has different view for anon vs logged-in', () => {
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toContain('isAuthenticated');
  });
});
