import { describe, it, expect } from 'vitest';
import { reroute } from './hooks';

function makeUrl(pathname: string): URL {
  return new URL(`http://localhost${pathname}`);
}

describe('reroute hook', () => {
  it('rewrites /@username to /user/profile/username', () => {
    const result = reroute({ url: makeUrl('/@alice') } as Parameters<typeof reroute>[0]);
    expect(result).toBe('/user/profile/alice');
  });

  it('rewrites /@username with special characters', () => {
    const result = reroute({ url: makeUrl('/@Ng%C6%B0%E1%BB%9Di-Ch%C6%A1i') } as Parameters<
      typeof reroute
    >[0]);
    expect(result).toBe('/user/profile/Ng%C6%B0%E1%BB%9Di-Ch%C6%A1i');
  });

  it('does not rewrite /@username/subpath', () => {
    const result = reroute({ url: makeUrl('/@alice/games') } as Parameters<typeof reroute>[0]);
    expect(result).toBeUndefined();
  });

  it('does not rewrite non-@ paths', () => {
    const result = reroute({ url: makeUrl('/user/profile/alice') } as Parameters<
      typeof reroute
    >[0]);
    expect(result).toBeUndefined();
  });

  it('does not rewrite root path', () => {
    const result = reroute({ url: makeUrl('/') } as Parameters<typeof reroute>[0]);
    expect(result).toBeUndefined();
  });

  it('does not rewrite /@ without username', () => {
    const result = reroute({ url: makeUrl('/@') } as Parameters<typeof reroute>[0]);
    expect(result).toBeUndefined();
  });
});
