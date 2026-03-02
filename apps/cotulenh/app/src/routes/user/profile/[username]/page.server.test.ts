import { describe, it, expect, vi } from 'vitest';

vi.mock('@cotulenh/common', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

import { load } from './+page.server';

describe('public profile page server', () => {
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
  };

  function createMockEvent(username: string) {
    mockSupabase = {
      from: vi.fn()
    };
    return {
      params: { username },
      locals: {
        supabase: mockSupabase
      }
    } as unknown as Parameters<typeof load>[0];
  }

  function mockProfileQuery(result: { data: unknown; error: unknown }) {
    const maybeSingleMock = vi.fn().mockResolvedValue(result);
    const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockSupabase.from.mockReturnValue({ select: selectMock });

    return { eqMock, orderMock, limitMock, maybeSingleMock };
  }

  describe('load function', () => {
    it('returns profile data when display_name exists', async () => {
      const event = createMockEvent('Commander');
      mockProfileQuery({
        data: {
          display_name: 'Commander',
          avatar_url: null,
          created_at: '2026-01-15T00:00:00Z'
        },
        error: null
      });

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

    it('throws 404 when display_name not found', async () => {
      const event = createMockEvent('NonExistent');
      mockProfileQuery({
        data: null,
        error: null
      });

      await expect(load(event)).rejects.toEqual(
        expect.objectContaining({
          status: 404
        })
      );
    });

    it('works without authentication (no session required)', async () => {
      const event = createMockEvent('PublicUser');
      mockProfileQuery({
        data: {
          display_name: 'PublicUser',
          avatar_url: 'https://example.com/avatar.jpg',
          created_at: '2026-02-20T00:00:00Z'
        },
        error: null
      });

      const result = (await load(event)) as Record<string, unknown>;
      const profileDetail = result.profileDetail as Record<string, unknown>;

      expect(profileDetail.displayName).toBe('PublicUser');
      expect(profileDetail.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('uses route param as provided without a second decode', async () => {
      const event = createMockEvent('50%Win');
      const { eqMock } = mockProfileQuery({
        data: {
          display_name: '50%Win',
          avatar_url: null,
          created_at: '2026-01-01T00:00:00Z'
        },
        error: null
      });

      await load(event);

      expect(eqMock).toHaveBeenCalledWith('display_name', '50%Win');
    });

    it('throws 500 on Supabase error', async () => {
      const event = createMockEvent('ErrorUser');
      mockProfileQuery({
        data: null,
        error: { message: 'DB error' }
      });

      await expect(load(event)).rejects.toEqual(
        expect.objectContaining({
          status: 500
        })
      );
    });

    it('limits to one result so duplicate display names do not error', async () => {
      const event = createMockEvent('SharedName');
      const { orderMock, limitMock, maybeSingleMock } = mockProfileQuery({
        data: {
          display_name: 'SharedName',
          avatar_url: null,
          created_at: '2026-01-01T00:00:00Z'
        },
        error: null
      });

      await load(event);

      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(limitMock).toHaveBeenCalledWith(1);
      expect(maybeSingleMock).toHaveBeenCalledTimes(1);
    });

    it('returns correct data shape with all fields', async () => {
      const event = createMockEvent('FullProfile');
      mockProfileQuery({
        data: {
          display_name: 'FullProfile',
          avatar_url: 'https://example.com/pic.png',
          created_at: '2026-03-01T12:00:00Z'
        },
        error: null
      });

      const result = (await load(event)) as Record<string, unknown>;
      const profileDetail = result.profileDetail as Record<string, unknown>;
      const stats = result.stats as Record<string, unknown>;

      expect(result).toHaveProperty('profileDetail');
      expect(result).toHaveProperty('stats');
      expect(profileDetail).toHaveProperty('displayName');
      expect(profileDetail).toHaveProperty('avatarUrl');
      expect(profileDetail).toHaveProperty('createdAt');
      expect(stats).toHaveProperty('gamesPlayed');
      expect(stats).toHaveProperty('wins');
      expect(stats).toHaveProperty('losses');
    });
  });
});
