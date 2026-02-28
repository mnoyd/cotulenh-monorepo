import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';

describe('auth callback route', () => {
  let mockSupabase: {
    auth: {
      verifyOtp: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        verifyOtp: vi.fn()
      }
    };
  });

  function createMockEvent(params: Record<string, string>): Parameters<typeof GET>[0] {
    const url = new URL('http://localhost:5173/auth/callback');
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return {
      url,
      locals: {
        supabase: mockSupabase
      }
    } as unknown as Parameters<typeof GET>[0];
  }

  it('redirects to home on valid token_hash and type', async () => {
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });

    const event = createMockEvent({
      token_hash: 'valid-hash',
      type: 'email'
    });

    try {
      await GET(event);
      // If redirect is thrown, we won't reach here
      expect.unreachable('should have thrown redirect');
    } catch (e: unknown) {
      const redirect = e as { status: number; location: string };
      expect(redirect.status).toBe(303);
      expect(redirect.location).toBe('/');
    }

    expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'valid-hash',
      type: 'email'
    });
  });

  it('redirects to custom next param on success', async () => {
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });

    const event = createMockEvent({
      token_hash: 'valid-hash',
      type: 'email',
      next: '/play'
    });

    try {
      await GET(event);
      expect.unreachable('should have thrown redirect');
    } catch (e: unknown) {
      const redirect = e as { status: number; location: string };
      expect(redirect.status).toBe(303);
      expect(redirect.location).toBe('/play');
    }
  });

  it('redirects to /auth/error when token is missing', async () => {
    const event = createMockEvent({});

    try {
      await GET(event);
      expect.unreachable('should have thrown redirect');
    } catch (e: unknown) {
      const redirect = e as { status: number; location: string };
      expect(redirect.status).toBe(303);
      expect(redirect.location).toBe('/auth/error');
    }

    expect(mockSupabase.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('redirects to /auth/error when verifyOtp fails', async () => {
    mockSupabase.auth.verifyOtp.mockResolvedValue({
      data: null,
      error: { message: 'Token expired' }
    });

    const event = createMockEvent({
      token_hash: 'invalid-hash',
      type: 'email'
    });

    try {
      await GET(event);
      expect.unreachable('should have thrown redirect');
    } catch (e: unknown) {
      const redirect = e as { status: number; location: string };
      expect(redirect.status).toBe(303);
      expect(redirect.location).toBe('/auth/error');
    }
  });
});
