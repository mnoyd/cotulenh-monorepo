import { describe, it, expect, vi } from 'vitest';
import { isRelativePath, requireAuth } from './guards';

describe('isRelativePath', () => {
  it('returns true for /profile', () => {
    expect(isRelativePath('/profile')).toBe(true);
  });

  it('returns true for /', () => {
    expect(isRelativePath('/')).toBe(true);
  });

  it('returns false for //evil.com', () => {
    expect(isRelativePath('//evil.com')).toBe(false);
  });

  it('returns false for https://evil.com', () => {
    expect(isRelativePath('https://evil.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isRelativePath('')).toBe(false);
  });
});

describe('requireAuth', () => {
  it('redirects unauthenticated users to login with redirectTo', async () => {
    const mockLocals = {
      safeGetSession: vi.fn().mockResolvedValue({ session: null, user: null })
    } as unknown as App.Locals;

    const mockUrl = new URL('http://localhost/user/profile');

    await expect(requireAuth(mockLocals, mockUrl)).rejects.toEqual(
      expect.objectContaining({
        status: 303,
        location: expect.stringContaining('/auth/login')
      })
    );

    await expect(requireAuth(mockLocals, mockUrl)).rejects.toEqual(
      expect.objectContaining({
        location: expect.stringContaining('redirectTo=%2Fuser%2Fprofile')
      })
    );
  });

  it('returns void for authenticated users', async () => {
    const mockLocals = {
      safeGetSession: vi.fn().mockResolvedValue({
        session: { user: { id: '123' } },
        user: { id: '123' }
      })
    } as unknown as App.Locals;

    const mockUrl = new URL('http://localhost/user/profile');

    const result = await requireAuth(mockLocals, mockUrl);
    expect(result).toBeUndefined();
  });
});
