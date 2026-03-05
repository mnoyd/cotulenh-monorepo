import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('user pages redesign', () => {
  it('profile uses CommandCenter', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/user/profile/+page.svelte'),
      'utf8'
    );
    expect(source).toContain('CommandCenter');
  });

  it('profile has no avatar circle', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/user/profile/+page.svelte'),
      'utf8'
    );
    expect(source).not.toContain('avatar-placeholder');
    expect(source).not.toContain('border-radius: 50%');
  });

  it('friends uses CommandCenter', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/user/friends/+page.svelte'),
      'utf8'
    );
    expect(source).toContain('CommandCenter');
  });

  it('history uses CommandCenter', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/user/history/+page.svelte'),
      'utf8'
    );
    expect(source).toContain('CommandCenter');
  });

  it('history has no border-radius: 12px cards', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/user/history/+page.svelte'),
      'utf8'
    );
    expect(source).not.toContain('border-radius: 12px');
  });

  it('game replay uses CommandCenter', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/routes/user/history/[gameId]/+page.svelte'),
      'utf8'
    );
    expect(source).toContain('CommandCenter');
  });
});
