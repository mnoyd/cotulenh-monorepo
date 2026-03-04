import { describe, it, expect, vi } from 'vitest';
import { load } from './+layout.server';

describe('play/online layout server load', () => {
  it('redirects unauthenticated users to login', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({ session: null, user: null })
      },
      url: new URL('http://localhost/play/online')
    } as unknown as Parameters<typeof load>[0];

    await expect(load(mockEvent)).rejects.toEqual(
      expect.objectContaining({
        status: 303,
        location: expect.stringContaining('/auth/login')
      })
    );
  });

  it('allows authenticated users through', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({
          session: { user: { id: '123' } },
          user: { id: '123' }
        })
      },
      url: new URL('http://localhost/play/online')
    } as unknown as Parameters<typeof load>[0];

    const result = await load(mockEvent);
    expect(result).toBeUndefined();
  });

  it('skips auth for invite link routes (public)', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({ session: null, user: null })
      },
      url: new URL('http://localhost/play/online/invite/abc12345')
    } as unknown as Parameters<typeof load>[0];

    // Should NOT redirect — invite routes are public
    const result = await load(mockEvent);
    expect(result).toBeUndefined();
  });
});
