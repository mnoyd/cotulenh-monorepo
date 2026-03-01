import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actions, load } from './+page.server';

// Mock DOMPurify - track calls to verify sanitization (AC4)
const sanitizeMock = vi.fn((str: string) => str);
vi.mock('dompurify', () => ({
  default: {
    sanitize: (...args: unknown[]) => sanitizeMock(...(args as [string]))
  }
}));

describe('profile page server', () => {
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
  };

  let mockSafeGetSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn()
    };
    mockSafeGetSession = vi.fn().mockResolvedValue({
      session: { user: { id: 'user-123' } },
      user: { id: 'user-123' }
    });
    sanitizeMock.mockClear();
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
        supabase: mockSupabase,
        safeGetSession: mockSafeGetSession
      }
    } as unknown as Parameters<typeof actions.default>[0];
  }

  function createMockLoadEvent() {
    return {
      locals: {
        supabase: mockSupabase,
        safeGetSession: mockSafeGetSession
      }
    } as unknown as Parameters<typeof load>[0];
  }

  describe('load function', () => {
    it('returns profile data and placeholder stats', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              display_name: 'Commander',
              avatar_url: null,
              created_at: '2026-01-15T00:00:00Z'
            },
            error: null
          })
        })
      });
      mockSupabase.from.mockReturnValue({ select: selectMock });

      const event = createMockLoadEvent();
      const result = (await load(event)) as Record<string, unknown>;

      expect(result.profileDetail).toEqual({
        displayName: 'Commander',
        avatarUrl: null,
        createdAt: '2026-01-15T00:00:00Z'
      });
      expect(result.stats).toEqual({
        gamesPlayed: 0,
        wins: 0,
        losses: 0
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
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

      const event = createMockLoadEvent();
      const result = (await load(event)) as Record<string, unknown>;
      const profileDetail = result.profileDetail as Record<string, unknown>;

      expect(profileDetail.displayName).toBe('');
      expect(profileDetail.avatarUrl).toBeNull();
    });
  });

  describe('update action', () => {
    it('returns success on valid display name update', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null })
      });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      const event = createMockEvent({ displayName: 'New Name' });
      const result = await actions.default(event);

      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('returns fail(400) for display name too short', async () => {
      const event = createMockEvent({ displayName: 'AB' });
      const result = await actions.default(event);

      expect(result?.status).toBe(400);
      expect(result?.data?.errors?.displayName).toBe('displayNameMinLength');
    });

    it('returns fail(400) for display name too long', async () => {
      const event = createMockEvent({ displayName: 'A'.repeat(51) });
      const result = await actions.default(event);

      expect(result?.status).toBe(400);
      expect(result?.data?.errors?.displayName).toBe('displayNameMaxLength');
    });

    it('returns fail(400) for empty display name', async () => {
      const event = createMockEvent({ displayName: '' });
      const result = await actions.default(event);

      expect(result?.status).toBe(400);
      expect(result?.data?.errors?.displayName).toBe('displayNameRequired');
    });

    it('returns fail(500) on Supabase error', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
      });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      const event = createMockEvent({ displayName: 'Valid Name' });
      const result = await actions.default(event);

      expect(result?.status).toBe(500);
      expect(result?.data?.errors?.form).toBe('updateFailed');
    });

    it('returns fail(401) when user is not authenticated', async () => {
      mockSafeGetSession.mockResolvedValue({ session: null, user: null });

      const event = createMockEvent({ displayName: 'Valid Name' });
      const result = await actions.default(event);

      expect(result?.status).toBe(401);
      expect(result?.data?.errors?.form).toBe('unauthorized');
    });

    it('preserves display name value on validation error', async () => {
      const event = createMockEvent({ displayName: 'AB' });
      const result = await actions.default(event);

      expect(result?.data?.displayName).toBe('AB');
    });

    it('preserves display name value on Supabase error', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
      });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      const event = createMockEvent({ displayName: 'Valid Name' });
      const result = await actions.default(event);

      expect(result?.data?.displayName).toBe('Valid Name');
    });

    it('calls DOMPurify.sanitize with ALLOWED_TAGS: [] to strip HTML (AC4)', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null })
      });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      const event = createMockEvent({ displayName: '<b>Bold Name</b>' });
      await actions.default(event);

      expect(sanitizeMock).toHaveBeenCalledWith('<b>Bold Name</b>', { ALLOWED_TAGS: [] });
    });
  });
});
