import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServerClient } from '@supabase/ssr';
import { handle } from './hooks.server';

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn()
}));

// Mock $env/static/public
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key'
}));

describe('hooks.server handle', () => {
  let mockSupabase: {
    auth: {
      getUser: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn()
      }
    };

    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
  });

  function createMockHandleInput() {
    const event = {
      locals: {} as Record<string, unknown>,
      cookies: {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn()
      }
    };
    const resolve = vi.fn().mockResolvedValue(new Response());
    return { event, resolve };
  }

  it('attaches supabase and safeGetSession to event.locals', async () => {
    const { event, resolve } = createMockHandleInput();

    await handle({ event, resolve } as unknown as Parameters<typeof handle>[0]);

    expect(event.locals.supabase).toBeDefined();
    expect(typeof event.locals.safeGetSession).toBe('function');
  });

  it('safeGetSession returns session and user when getUser succeeds', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { access_token: 'token', user: mockUser };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    const { event, resolve } = createMockHandleInput();
    await handle({ event, resolve } as unknown as Parameters<typeof handle>[0]);

    const safeGetSession = event.locals.safeGetSession as () => Promise<{
      session: unknown;
      user: unknown;
    }>;
    const result = await safeGetSession();

    expect(result.user).toEqual(mockUser);
    expect(result.session).toEqual(mockSession);
  });

  it('safeGetSession returns nulls when getUser returns error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Session expired' }
    });

    const { event, resolve } = createMockHandleInput();
    await handle({ event, resolve } as unknown as Parameters<typeof handle>[0]);

    const safeGetSession = event.locals.safeGetSession as () => Promise<{
      session: unknown;
      user: unknown;
    }>;
    const result = await safeGetSession();

    expect(result.session).toBeNull();
    expect(result.user).toBeNull();
    expect(mockSupabase.auth.getSession).not.toHaveBeenCalled();
  });

  it('calls resolve with correct filterSerializedResponseHeaders', async () => {
    const { event, resolve } = createMockHandleInput();

    await handle({ event, resolve } as unknown as Parameters<typeof handle>[0]);

    expect(resolve).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        filterSerializedResponseHeaders: expect.any(Function)
      })
    );

    const filterFn = resolve.mock.calls[0][1].filterSerializedResponseHeaders;
    expect(filterFn('content-range')).toBe(true);
    expect(filterFn('x-supabase-api-version')).toBe(true);
    expect(filterFn('set-cookie')).toBe(false);
  });
});
