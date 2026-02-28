import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn()
}));

// Mock $env/static/public
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key'
}));

describe('safeGetSession', () => {
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
  });

  interface AuthResult {
    data: { user?: unknown; session?: unknown };
    error: unknown;
  }

  // Helper to create a safeGetSession that mirrors hooks.server.ts logic
  function createSafeGetSession(supabase: typeof mockSupabase) {
    return async () => {
      const getUserResult = (await supabase.auth.getUser()) as AuthResult;
      const user = getUserResult.data?.user;
      const error = getUserResult.error;
      if (error) {
        return { session: null, user: null };
      }
      const getSessionResult = (await supabase.auth.getSession()) as AuthResult;
      const session = getSessionResult.data?.session;
      return { session, user };
    };
  }

  it('returns session and user when getUser succeeds', async () => {
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

    const safeGetSession = createSafeGetSession(mockSupabase);
    const result = await safeGetSession();

    expect(result.user).toEqual(mockUser);
    expect(result.session).toEqual(mockSession);
  });

  it('returns null session and user when getUser returns error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Session expired' }
    });

    const safeGetSession = createSafeGetSession(mockSupabase);
    const result = await safeGetSession();

    expect(result.session).toBeNull();
    expect(result.user).toBeNull();
    // getSession should NOT be called when getUser fails
    expect(mockSupabase.auth.getSession).not.toHaveBeenCalled();
  });

  it('returns null session and user when no cookie exists (getUser error)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth session missing!' }
    });

    const safeGetSession = createSafeGetSession(mockSupabase);
    const result = await safeGetSession();

    expect(result.session).toBeNull();
    expect(result.user).toBeNull();
  });
});
