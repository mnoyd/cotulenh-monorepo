import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actions, load } from './+page.server';

describe('settings page server', () => {
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
    auth: {
      getUser: ReturnType<typeof vi.fn>;
      updateUser: ReturnType<typeof vi.fn>;
    };
  };

  let mockSafeGetSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'user@example.com' } },
          error: null
        }),
        updateUser: vi.fn().mockResolvedValue({ data: {}, error: null })
      }
    };
    mockSafeGetSession = vi.fn().mockResolvedValue({
      session: { user: { id: 'user-123' } },
      user: { id: 'user-123' }
    });
  });

  function createMockLoadEvent() {
    return {
      locals: {
        supabase: mockSupabase,
        safeGetSession: mockSafeGetSession
      }
    } as unknown as Parameters<typeof load>[0];
  }

  function createMockActionEvent(actionName: string, formFields: Record<string, string>) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(formFields)) {
      formData.set(key, value);
    }
    return {
      request: {
        formData: async () => formData
      },
      locals: {
        supabase: mockSupabase,
        safeGetSession: mockSafeGetSession
      }
    } as unknown as Parameters<(typeof actions)[typeof actionName]>[0];
  }

  // --- Load Function Tests ---
  describe('load function', () => {
    it('returns user email and settings', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { settings_json: { soundsEnabled: false, soundVolume: 0.8 } },
            error: null
          })
        })
      });
      mockSupabase.from.mockReturnValue({ select: selectMock });

      const result = (await load(createMockLoadEvent())) as Record<string, unknown>;

      expect(result.email).toBe('user@example.com');
      expect(result.settingsJson).toEqual({ soundsEnabled: false, soundVolume: 0.8 });
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('returns defaults when settings_json is null', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { settings_json: null },
            error: null
          })
        })
      });
      mockSupabase.from.mockReturnValue({ select: selectMock });

      const result = (await load(createMockLoadEvent())) as Record<string, unknown>;

      expect(result.email).toBe('user@example.com');
      expect(result.settingsJson).toEqual({});
    });

    it('returns empty email and settings when user is not authenticated', async () => {
      mockSafeGetSession.mockResolvedValue({ session: null, user: null });

      const result = (await load(createMockLoadEvent())) as Record<string, unknown>;

      expect(result.email).toBe('');
      expect(result.settingsJson).toEqual({});
    });

    it('returns defaults when profile data is null', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'not found' }
          })
        })
      });
      mockSupabase.from.mockReturnValue({ select: selectMock });

      const result = (await load(createMockLoadEvent())) as Record<string, unknown>;

      expect(result.email).toBe('user@example.com');
      expect(result.settingsJson).toEqual({});
    });
  });

  // --- updateEmail Action Tests ---
  describe('updateEmail action', () => {
    it('returns success on valid email update', async () => {
      const event = createMockActionEvent('updateEmail', { email: 'new@example.com' });
      const result = await actions.updateEmail(event);

      expect(result).toEqual({ success: true, action: 'updateEmail' });
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
    });

    it('returns fail(400) for empty email', async () => {
      const event = createMockActionEvent('updateEmail', { email: '' });
      const result = await actions.updateEmail(event);

      expect(result?.status).toBe(400);
      expect(result?.data?.errors?.email).toBe('emailRequired');
    });

    it('returns fail(400) for invalid email format', async () => {
      const event = createMockActionEvent('updateEmail', { email: 'not-valid' });
      const result = await actions.updateEmail(event);

      expect(result?.status).toBe(400);
      expect(result?.data?.errors?.email).toBe('emailInvalid');
    });

    it('returns fail(500) on Supabase auth error', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: null,
        error: { message: 'Auth error' }
      });

      const event = createMockActionEvent('updateEmail', { email: 'new@example.com' });
      const result = await actions.updateEmail(event);

      expect(result?.status).toBe(500);
      expect(result?.data?.errors?.form).toBe('emailUpdateFailed');
    });

    it('returns fail(401) when user is not authenticated', async () => {
      mockSafeGetSession.mockResolvedValue({ session: null, user: null });

      const event = createMockActionEvent('updateEmail', { email: 'new@example.com' });
      const result = await actions.updateEmail(event);

      expect(result?.status).toBe(401);
      expect(result?.data?.errors?.form).toBe('unauthorized');
    });

    it('preserves email value on validation error', async () => {
      const event = createMockActionEvent('updateEmail', { email: 'not-valid' });
      const result = await actions.updateEmail(event);

      expect(result?.data?.email).toBe('not-valid');
    });
  });

  // --- updatePassword Action Tests ---
  describe('updatePassword action', () => {
    it('returns success on valid password change', async () => {
      const event = createMockActionEvent('updatePassword', {
        newPassword: 'newpass123',
        confirmPassword: 'newpass123'
      });
      const result = await actions.updatePassword(event);

      expect(result).toEqual({ success: true, action: 'updatePassword' });
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpass123' });
    });

    it('returns fail(400) for password too short', async () => {
      const event = createMockActionEvent('updatePassword', {
        newPassword: 'short',
        confirmPassword: 'short'
      });
      const result = await actions.updatePassword(event);

      expect(result?.status).toBe(400);
      expect(result?.data?.errors?.newPassword).toBe('passwordMinLength');
    });

    it('returns fail(400) for password mismatch', async () => {
      const event = createMockActionEvent('updatePassword', {
        newPassword: 'securepass123',
        confirmPassword: 'differentpass'
      });
      const result = await actions.updatePassword(event);

      expect(result?.status).toBe(400);
      expect(result?.data?.errors?.confirmPassword).toBe('passwordMismatch');
    });

    it('returns fail(400) for empty password', async () => {
      const event = createMockActionEvent('updatePassword', {
        newPassword: '',
        confirmPassword: ''
      });
      const result = await actions.updatePassword(event);

      expect(result?.status).toBe(400);
      expect(result?.data?.errors?.newPassword).toBe('passwordRequired');
    });

    it('returns fail(500) on Supabase auth error', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: null,
        error: { message: 'Auth error' }
      });

      const event = createMockActionEvent('updatePassword', {
        newPassword: 'securepass123',
        confirmPassword: 'securepass123'
      });
      const result = await actions.updatePassword(event);

      expect(result?.status).toBe(500);
      expect(result?.data?.errors?.form).toBe('passwordUpdateFailed');
    });

    it('returns fail(401) when user is not authenticated', async () => {
      mockSafeGetSession.mockResolvedValue({ session: null, user: null });

      const event = createMockActionEvent('updatePassword', {
        newPassword: 'securepass123',
        confirmPassword: 'securepass123'
      });
      const result = await actions.updatePassword(event);

      expect(result?.status).toBe(401);
      expect(result?.data?.errors?.form).toBe('unauthorized');
    });
  });

  // --- updateSettings Action Tests ---
  describe('updateSettings action', () => {
    it('returns success on valid settings update', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null })
      });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      const settings = JSON.stringify({ soundsEnabled: false, soundVolume: 0.3 });
      const event = createMockActionEvent('updateSettings', { settings });
      const result = await actions.updateSettings(event);

      expect(result).toEqual({ success: true, action: 'updateSettings' });
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          settings_json: { soundsEnabled: false, soundVolume: 0.3 }
        })
      );
    });

    it('returns fail(400) for invalid JSON', async () => {
      const event = createMockActionEvent('updateSettings', { settings: 'not-json' });
      const result = await actions.updateSettings(event);

      expect(result?.status).toBe(400);
      expect(result?.data?.errors?.form).toBe('invalidSettingsJson');
    });

    it('returns fail(500) on DB error', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
      });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      const settings = JSON.stringify({ soundsEnabled: true });
      const event = createMockActionEvent('updateSettings', { settings });
      const result = await actions.updateSettings(event);

      expect(result?.status).toBe(500);
      expect(result?.data?.errors?.form).toBe('settingsUpdateFailed');
    });

    it('returns fail(401) when user is not authenticated', async () => {
      mockSafeGetSession.mockResolvedValue({ session: null, user: null });

      const settings = JSON.stringify({ soundsEnabled: true });
      const event = createMockActionEvent('updateSettings', { settings });
      const result = await actions.updateSettings(event);

      expect(result?.status).toBe(401);
      expect(result?.data?.errors?.form).toBe('unauthorized');
    });
  });
});
