import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actions } from './+page.server';

// Mock the logger
vi.mock('@cotulenh/common', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('forgot-password form action', () => {
  let mockSupabase: {
    auth: {
      resetPasswordForEmail: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null })
      }
    };
  });

  function createMockEvent(formFields: Record<string, string>) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(formFields)) {
      formData.set(key, value);
    }
    return {
      request: {
        formData: async () => formData
      },
      url: new URL('http://localhost/auth/forgot-password'),
      locals: {
        supabase: mockSupabase
      }
    } as unknown as Parameters<typeof actions.default>[0];
  }

  it('returns success for a valid email', async () => {
    const event = createMockEvent({ email: 'test@example.com' });
    const result = await actions.default(event);
    expect(result).toEqual({ success: true });
    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: 'http://localhost/auth/callback?next=/auth/reset-password'
    });
  });

  it('returns fail(400) for empty email', async () => {
    const event = createMockEvent({ email: '' });
    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.email).toBe('emailRequired');
  });

  it('returns fail(400) for invalid email format', async () => {
    const event = createMockEvent({ email: 'not-an-email' });
    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.email).toBe('emailInvalid');
  });

  it('returns success even when Supabase returns an error (enumeration prevention)', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'User not found' }
    });

    const event = createMockEvent({ email: 'nonexistent@example.com' });
    const result = await actions.default(event);
    expect(result).toEqual({ success: true });
  });

  it('returns success for unregistered email (enumeration prevention)', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null
    });

    const event = createMockEvent({ email: 'unknown@example.com' });
    const result = await actions.default(event);
    expect(result).toEqual({ success: true });
  });

  it('preserves email on validation failure', async () => {
    const event = createMockEvent({ email: 'bad-email' });
    const result = await actions.default(event);
    expect(result?.data?.email).toBe('bad-email');
  });
});
