import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actions } from './+page.server';

describe('registration form action', () => {
  let mockSupabase: {
    auth: {
      signUp: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        signUp: vi.fn()
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
      url: new URL('http://localhost:5173/auth/register'),
      locals: {
        supabase: mockSupabase
      }
    } as unknown as Parameters<typeof actions.default>[0];
  }

  it('returns success on valid signup', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: {} }, error: null });

    const event = createMockEvent({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Commander'
    });

    const result = await actions.default(event);
    expect(result).toEqual({ success: true, redirectTo: '' });
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: {
          display_name: 'Commander'
        }
      }
    });
  });

  it('returns fail(400) for invalid email', async () => {
    const event = createMockEvent({
      email: 'not-an-email',
      password: 'password123',
      displayName: 'Commander'
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.email).toBe('emailInvalid');
  });

  it('returns fail(400) for missing fields', async () => {
    const event = createMockEvent({
      email: '',
      password: '',
      displayName: ''
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors).toBeDefined();
  });

  it('returns generic failure on Supabase error (no email enumeration)', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' }
    });

    const event = createMockEvent({
      email: 'existing@example.com',
      password: 'password123',
      displayName: 'Commander'
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.form).toBe('registrationFailed');
    // Should NOT reveal the email already exists
    expect(JSON.stringify(result)).not.toContain('already registered');
  });

  it('returns fail(400) for short password', async () => {
    const event = createMockEvent({
      email: 'test@example.com',
      password: 'short',
      displayName: 'Commander'
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.password).toBe('passwordMinLength');
  });

  it('returns fail(400) for short display name', async () => {
    const event = createMockEvent({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'AB'
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.displayName).toBe('displayNameMinLength');
  });

  it('normalizes display name before signup', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: {} }, error: null });

    const event = createMockEvent({
      email: 'test@example.com',
      password: 'password123',
      displayName: '  Commander   One  '
    });

    await actions.default(event);

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: {
          display_name: 'Commander One'
        }
      }
    });
  });

  it('returns fail(400) for display name with blocked characters', async () => {
    const event = createMockEvent({
      email: 'test@example.com',
      password: 'password123',
      displayName: '<b>Commander</b>'
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.displayName).toBe('displayNameInvalidChars');
  });

  it('passes emailRedirectTo when redirectTo param is present', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: {} }, error: null });

    const event = createMockEvent({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Commander',
      redirectTo: '/play/online/invite/abc12345'
    });

    const result = await actions.default(event);
    expect(result).toEqual({ success: true, redirectTo: '/play/online/invite/abc12345' });
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: { display_name: 'Commander' },
        emailRedirectTo: 'http://localhost:5173/auth/callback?next=%2Fplay%2Fonline%2Finvite%2Fabc12345'
      }
    });
  });

  it('ignores non-relative redirectTo to prevent open redirect', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: {} }, error: null });

    const event = createMockEvent({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Commander',
      redirectTo: 'https://evil.com/phish'
    });

    const result = await actions.default(event);
    expect(result).toEqual({ success: true, redirectTo: '' });
    // Should NOT include emailRedirectTo with the evil URL
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: { display_name: 'Commander' }
      }
    });
  });
});
