import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actions, load } from './+page.server';

describe('login form action', () => {
  let mockSupabase: {
    auth: {
      signInWithPassword: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        signInWithPassword: vi.fn()
      }
    };
  });

  function createMockEvent(
    formFields: Record<string, string>,
    searchParams?: Record<string, string>
  ) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(formFields)) {
      formData.set(key, value);
    }
    const params = new URLSearchParams(searchParams);
    return {
      request: {
        formData: async () => formData
      },
      url: new URL(`http://localhost/auth/login?${params.toString()}`),
      locals: {
        supabase: mockSupabase
      }
    } as unknown as Parameters<typeof actions.default>[0];
  }

  it('redirects to home on valid login', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null
    });

    const event = createMockEvent({
      email: 'test@example.com',
      password: 'password123'
    });

    await expect(actions.default(event)).rejects.toEqual(
      expect.objectContaining({ status: 303, location: '/' })
    );
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('redirects to redirectTo on valid login when provided', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null
    });

    const event = createMockEvent(
      { email: 'test@example.com', password: 'password123' },
      { redirectTo: '/user/profile' }
    );

    await expect(actions.default(event)).rejects.toEqual(
      expect.objectContaining({ status: 303, location: '/user/profile' })
    );
  });

  it('prevents open redirect - ignores absolute URLs', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null
    });

    const event = createMockEvent(
      { email: 'test@example.com', password: 'password123' },
      { redirectTo: 'https://evil.com/steal' }
    );

    await expect(actions.default(event)).rejects.toEqual(
      expect.objectContaining({ status: 303, location: '/' })
    );
  });

  it('prevents open redirect - ignores protocol-relative URLs', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null
    });

    const event = createMockEvent(
      { email: 'test@example.com', password: 'password123' },
      { redirectTo: '//evil.com/steal' }
    );

    await expect(actions.default(event)).rejects.toEqual(
      expect.objectContaining({ status: 303, location: '/' })
    );
  });

  it('returns fail(400) for invalid credentials (generic error)', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' }
    });

    const event = createMockEvent({
      email: 'test@example.com',
      password: 'wrongpassword'
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.form).toBe('loginFailed');
    // Should NOT reveal whether email or password was wrong
    expect(JSON.stringify(result)).not.toContain('Invalid login credentials');
  });

  it('returns fail(400) for empty email', async () => {
    const event = createMockEvent({
      email: '',
      password: 'password123'
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.email).toBe('emailRequired');
  });

  it('returns fail(400) for invalid email format', async () => {
    const event = createMockEvent({
      email: 'not-an-email',
      password: 'password123'
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.email).toBe('emailInvalid');
  });

  it('returns fail(400) for empty password', async () => {
    const event = createMockEvent({
      email: 'test@example.com',
      password: ''
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.password).toBe('passwordRequired');
  });

  it('preserves email on validation failure', async () => {
    const event = createMockEvent({
      email: 'test@example.com',
      password: ''
    });

    const result = await actions.default(event);
    expect(result?.data?.email).toBe('test@example.com');
  });

  it('preserves email on auth failure', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' }
    });

    const event = createMockEvent({
      email: 'test@example.com',
      password: 'wrongpassword'
    });

    const result = await actions.default(event);
    expect(result?.data?.email).toBe('test@example.com');
  });
});

describe('login load function', () => {
  it('redirects authenticated users to home', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({
          session: { user: { id: '123' } },
          user: { id: '123' }
        })
      }
    } as unknown as Parameters<typeof load>[0];

    await expect(load(mockEvent)).rejects.toEqual(
      expect.objectContaining({ status: 303, location: '/' })
    );
  });

  it('does not redirect unauthenticated users', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({
          session: null,
          user: null
        })
      }
    } as unknown as Parameters<typeof load>[0];

    // Should return undefined (no redirect)
    const result = await load(mockEvent);
    expect(result).toBeUndefined();
  });
});
