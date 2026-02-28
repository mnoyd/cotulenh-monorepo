import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actions, load } from './+page.server';

// Mock the logger
vi.mock('@cotulenh/common', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('reset-password load function', () => {
  it('redirects to forgot-password?expired=true when no session', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({
          session: null,
          user: null
        })
      }
    } as unknown as Parameters<typeof load>[0];

    await expect(load(mockEvent)).rejects.toEqual(
      expect.objectContaining({ status: 303, location: '/auth/forgot-password?expired=true' })
    );
  });

  it('passes through when session exists', async () => {
    const mockEvent = {
      locals: {
        safeGetSession: vi.fn().mockResolvedValue({
          session: { user: { id: '123' } },
          user: { id: '123' }
        })
      }
    } as unknown as Parameters<typeof load>[0];

    const result = await load(mockEvent);
    expect(result).toEqual({});
  });
});

describe('reset-password form action', () => {
  let mockSupabase: {
    auth: {
      updateUser: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        updateUser: vi.fn().mockResolvedValue({ data: { user: {} }, error: null })
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
      locals: {
        supabase: mockSupabase
      }
    } as unknown as Parameters<typeof actions.default>[0];
  }

  it('redirects to login on successful password update', async () => {
    const event = createMockEvent({
      password: 'newpassword123',
      confirmPassword: 'newpassword123'
    });

    await expect(actions.default(event)).rejects.toEqual(
      expect.objectContaining({
        status: 303,
        location: '/auth/login?message=password-reset-success'
      })
    );
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      password: 'newpassword123'
    });
  });

  it('returns fail(400) for password too short', async () => {
    const event = createMockEvent({
      password: 'short',
      confirmPassword: 'short'
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.password).toBe('passwordMinLength');
  });

  it('returns fail(400) for passwords that do not match', async () => {
    const event = createMockEvent({
      password: 'password123',
      confirmPassword: 'password456'
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.confirmPassword).toBe('passwordMismatch');
  });

  it('returns fail(400) for empty password', async () => {
    const event = createMockEvent({
      password: '',
      confirmPassword: ''
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.password).toBe('passwordRequired');
  });

  it('returns fail(400) for empty confirmPassword', async () => {
    const event = createMockEvent({
      password: 'password123',
      confirmPassword: ''
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.confirmPassword).toBe('confirmPasswordRequired');
  });

  it('returns generic failure when Supabase updateUser errors', async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Password update failed' }
    });

    const event = createMockEvent({
      password: 'newpassword123',
      confirmPassword: 'newpassword123'
    });

    const result = await actions.default(event);
    expect(result?.status).toBe(400);
    expect(result?.data?.errors?.form).toBe('resetFailed');
  });
});
