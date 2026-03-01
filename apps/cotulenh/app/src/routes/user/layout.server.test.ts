import { describe, it, expect, vi } from 'vitest';
import { load } from './+layout.server';

describe('user layout server load', () => {
  it('redirects unauthenticated users to login', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({ session: null, user: null })
      },
      url: new URL('http://localhost/user')
    } as unknown as Parameters<typeof load>[0];

    await expect(load(mockEvent)).rejects.toEqual(
      expect.objectContaining({
        status: 303,
        location: expect.stringContaining('/auth/login')
      })
    );
  });

  it('allows unauthenticated visitors to public profile routes', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({ session: null, user: null })
      },
      url: new URL('http://localhost/user/profile/SomePlayer')
    } as unknown as Parameters<typeof load>[0];

    const result = await load(mockEvent);
    expect(result).toEqual({});
  });

  it('still redirects unauthenticated users on own profile route', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({ session: null, user: null })
      },
      url: new URL('http://localhost/user/profile')
    } as unknown as Parameters<typeof load>[0];

    await expect(load(mockEvent)).rejects.toEqual(
      expect.objectContaining({
        status: 303,
        location: expect.stringContaining('/auth/login')
      })
    );
  });

  it('allows unauthenticated visitors to URL-encoded public profile routes', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({ session: null, user: null })
      },
      url: new URL('http://localhost/user/profile/Ng%C6%B0%E1%BB%9Di%20Ch%C6%A1i')
    } as unknown as Parameters<typeof load>[0];

    const result = await load(mockEvent);
    expect(result).toEqual({});
  });

  it('allows authenticated users through', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({
          session: { user: { id: '123' } },
          user: { id: '123' }
        })
      },
      url: new URL('http://localhost/user')
    } as unknown as Parameters<typeof load>[0];

    const result = await load(mockEvent);
    expect(result).toBeUndefined();
  });
});
