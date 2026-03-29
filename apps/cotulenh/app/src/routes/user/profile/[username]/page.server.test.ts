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

  function createMockEvent(username: string, sessionUserId: string | null = null) {
    mockSupabase = {
      from: vi.fn()
    };
    const canonicalUsername = username.toLowerCase();
    return {
      params: { username },
      url: new URL(`http://localhost/@${canonicalUsername}`),
      locals: {
        supabase: mockSupabase,
        safeGetSession: vi.fn().mockResolvedValue({
          user: sessionUserId ? { id: sessionUserId } : null
        })
      }
    } as unknown as Parameters<typeof load>[0];
  }

  function mockProfileAndGamesQuery(
    profileResult: { data: unknown; error: unknown },
    gamesResult: { data: unknown; error: unknown } = { data: [], error: null },
    friendshipResult: { data: unknown; error: unknown } = { data: null, error: null }
  ) {
    const maybeSingleMock = vi.fn().mockResolvedValue(profileResult);
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const profileSelectMock = vi.fn().mockReturnValue({ eq: eqMock });

    // Games chain
    const gamesOrderMock = vi.fn().mockResolvedValue(gamesResult);
    const neqMock = vi.fn().mockReturnValue({ order: gamesOrderMock });
    const orMock = vi.fn().mockReturnValue({ neq: neqMock });
    const gamesSelectMock = vi.fn().mockReturnValue({ or: orMock });

    // Friendships chain (for relationship check)
    const friendshipMaybeSingle = vi.fn().mockResolvedValue(friendshipResult);
    const friendshipEqB = vi.fn().mockReturnValue({ maybeSingle: friendshipMaybeSingle });
    const friendshipEqA = vi.fn().mockReturnValue({ eq: friendshipEqB });
    const friendshipSelectMock = vi.fn().mockReturnValue({ eq: friendshipEqA });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: profileSelectMock };
      if (table === 'games') return { select: gamesSelectMock };
      if (table === 'friendships') return { select: friendshipSelectMock };
      return { select: vi.fn() };
    });

    return { eqMock, maybeSingleMock, friendshipMaybeSingle };
  }

  describe('load function', () => {
    it('returns profile data and real game stats', async () => {
      const event = createMockEvent('Commander');
      mockProfileAndGamesQuery(
        {
          data: {
            id: 'user-1',
            username: 'commander',
            display_name: 'Commander',
            avatar_url: null,
            created_at: '2026-01-15T00:00:00Z',
            rating: 1500
          },
          error: null
        },
        {
          data: [
            {
              id: 'g1',
              status: 'checkmate',
              winner: 'red',
              result_reason: 'checkmate',
              time_control: { timeMinutes: 10, incrementSeconds: 5 },
              started_at: '2026-03-01T10:00:00Z',
              ended_at: '2026-03-01T10:30:00Z',
              red_player: 'user-1',
              blue_player: 'user-2',
              red_profile: { display_name: 'Commander' },
              blue_profile: { display_name: 'Opponent' }
            }
          ],
          error: null
        }
      );

      const result = (await load(event)) as Record<string, unknown>;

      expect(result.profileDetail).toEqual({
        id: 'user-1',
        username: 'commander',
        displayName: 'Commander',
        avatarUrl: null,
        createdAt: '2026-01-15T00:00:00Z',
        rating: 1500
      });
      expect(result.stats).toEqual({
        gamesPlayed: 1,
        wins: 1,
        losses: 0
      });
      expect(result.isOwnProfile).toBe(false);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('games');
    });

    it('returns game history for the profile user', async () => {
      const event = createMockEvent('Commander');
      mockProfileAndGamesQuery(
        {
          data: {
            id: 'user-1',
            username: 'commander',
            display_name: 'Commander',
            avatar_url: null,
            created_at: '2026-01-15T00:00:00Z',
            rating: null
          },
          error: null
        },
        {
          data: [
            {
              id: 'g1',
              status: 'checkmate',
              winner: 'red',
              result_reason: 'checkmate',
              time_control: { timeMinutes: 10, incrementSeconds: 5 },
              started_at: '2026-03-01T10:00:00Z',
              ended_at: '2026-03-01T10:30:00Z',
              red_player: 'user-1',
              blue_player: 'user-2',
              red_profile: { display_name: 'Commander' },
              blue_profile: { display_name: 'Foe' }
            }
          ],
          error: null
        }
      );

      const result = (await load(event)) as Record<string, unknown>;
      const games = result.games as Array<Record<string, unknown>>;

      expect(games).toHaveLength(1);
      expect(games[0].opponentDisplayName).toBe('Foe');
      expect(result.isOwnProfile).toBe(false);
    });

    it('returns zero stats when user has no games', async () => {
      const event = createMockEvent('NewUser');
      mockProfileAndGamesQuery(
        {
          data: {
            id: 'user-new',
            username: 'newuser',
            display_name: 'NewUser',
            avatar_url: null,
            created_at: '2026-03-01T00:00:00Z',
            rating: null
          },
          error: null
        },
        {
          data: [],
          error: null
        }
      );

      const result = (await load(event)) as Record<string, unknown>;

      expect(result.stats).toEqual({
        gamesPlayed: 0,
        wins: 0,
        losses: 0
      });
      expect(result.isOwnProfile).toBe(false);
    });

    it('throws 404 when username not found', async () => {
      const event = createMockEvent('NonExistent');
      mockProfileAndGamesQuery({
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
      mockProfileAndGamesQuery({
        data: {
          id: 'user-pub',
          username: 'publicuser',
          display_name: 'PublicUser',
          avatar_url: 'https://example.com/avatar.jpg',
          created_at: '2026-02-20T00:00:00Z',
          rating: null
        },
        error: null
      });

      const result = (await load(event)) as Record<string, unknown>;
      const profileDetail = result.profileDetail as Record<string, unknown>;

      expect(profileDetail.displayName).toBe('PublicUser');
      expect(profileDetail.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(result.isOwnProfile).toBe(false);
    });

    it('sets isOwnProfile true when viewing own public profile', async () => {
      const event = createMockEvent('Commander', 'user-1');
      mockProfileAndGamesQuery({
        data: {
          id: 'user-1',
          username: 'commander',
          display_name: 'Commander',
          avatar_url: null,
          created_at: '2026-01-15T00:00:00Z',
          rating: 1200
        },
        error: null
      });

      const result = (await load(event)) as Record<string, unknown>;

      expect(result.isOwnProfile).toBe(true);
    });

    it('looks up profiles by lowercase username', async () => {
      const event = createMockEvent('Commander-One');
      const { eqMock } = mockProfileAndGamesQuery({
        data: {
          id: 'user-pct',
          username: 'commander-one',
          display_name: 'Commander One',
          avatar_url: null,
          created_at: '2026-01-01T00:00:00Z',
          rating: null
        },
        error: null
      });

      await load(event);

      expect(eqMock).toHaveBeenCalledWith('username', 'commander-one');
    });

    it('throws 500 on Supabase error', async () => {
      const event = createMockEvent('ErrorUser');
      mockProfileAndGamesQuery({
        data: null,
        error: { message: 'DB error' }
      });

      await expect(load(event)).rejects.toEqual(
        expect.objectContaining({
          status: 500
        })
      );
    });

    it('uses maybeSingle for unique usernames', async () => {
      const event = createMockEvent('shared-name');
      const { maybeSingleMock } = mockProfileAndGamesQuery({
        data: {
          id: 'user-shared',
          username: 'shared-name',
          display_name: 'SharedName',
          avatar_url: null,
          created_at: '2026-01-01T00:00:00Z',
          rating: null
        },
        error: null
      });

      await load(event);

      expect(maybeSingleMock).toHaveBeenCalledTimes(1);
    });

    it('returns correct data shape with all fields', async () => {
      const event = createMockEvent('FullProfile');
      mockProfileAndGamesQuery({
        data: {
          id: 'user-full',
          username: 'fullprofile',
          display_name: 'FullProfile',
          avatar_url: 'https://example.com/pic.png',
          created_at: '2026-03-01T12:00:00Z',
          rating: 1800
        },
        error: null
      });

      const result = (await load(event)) as Record<string, unknown>;
      const profileDetail = result.profileDetail as Record<string, unknown>;
      const stats = result.stats as Record<string, unknown>;

      expect(result).toHaveProperty('profileDetail');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('games');
      expect(result).toHaveProperty('isOwnProfile');
      expect(result).toHaveProperty('relationship');
      expect(result).toHaveProperty('currentUserId');
      expect(profileDetail).toHaveProperty('id');
      expect(profileDetail).toHaveProperty('username');
      expect(profileDetail).toHaveProperty('displayName');
      expect(profileDetail).toHaveProperty('avatarUrl');
      expect(profileDetail).toHaveProperty('createdAt');
      expect(profileDetail).toHaveProperty('rating');
      expect(stats).toHaveProperty('gamesPlayed');
      expect(stats).toHaveProperty('wins');
      expect(stats).toHaveProperty('losses');
    });

    it('returns rating as null when not set', async () => {
      const event = createMockEvent('Unrated');
      mockProfileAndGamesQuery({
        data: {
          id: 'user-unrated',
          username: 'unrated',
          display_name: 'Unrated',
          avatar_url: null,
          created_at: '2026-03-01T00:00:00Z',
          rating: null
        },
        error: null
      });

      const result = (await load(event)) as Record<string, unknown>;
      const profileDetail = result.profileDetail as Record<string, unknown>;

      expect(profileDetail.rating).toBeNull();
    });

    it('returns relationship status for authenticated visitor', async () => {
      const event = createMockEvent('OtherPlayer', 'visitor-1');
      mockProfileAndGamesQuery({
        data: {
          id: 'user-other',
          username: 'otherplayer',
          display_name: 'OtherPlayer',
          avatar_url: null,
          created_at: '2026-03-01T00:00:00Z',
          rating: null
        },
        error: null
      });

      const result = (await load(event)) as Record<string, unknown>;

      expect(result.relationship).toBe('none');
      expect(result.currentUserId).toBe('visitor-1');
    });

    it('maps accepted friendships to accepted relationship', async () => {
      const event = createMockEvent('friend-user', 'visitor-1');
      mockProfileAndGamesQuery(
        {
          data: {
            id: 'user-friend',
            username: 'friend-user',
            display_name: 'Friend User',
            avatar_url: null,
            created_at: '2026-03-01T00:00:00Z',
            rating: null
          },
          error: null
        },
        { data: [], error: null },
        { data: { status: 'accepted', initiated_by: 'visitor-1' }, error: null }
      );

      const result = (await load(event)) as Record<string, unknown>;

      expect(result.relationship).toBe('accepted');
    });

    it('maps pending friendships initiated by other users to pending_received', async () => {
      const event = createMockEvent('pending-user', 'visitor-1');
      mockProfileAndGamesQuery(
        {
          data: {
            id: 'user-pending',
            username: 'pending-user',
            display_name: 'Pending User',
            avatar_url: null,
            created_at: '2026-03-01T00:00:00Z',
            rating: null
          },
          error: null
        },
        { data: [], error: null },
        { data: { status: 'pending', initiated_by: 'user-pending' }, error: null }
      );

      const result = (await load(event)) as Record<string, unknown>;

      expect(result.relationship).toBe('pending_received');
    });

    it('maps blocked friendships to blocked relationship', async () => {
      const event = createMockEvent('blocked-user', 'visitor-1');
      mockProfileAndGamesQuery(
        {
          data: {
            id: 'user-blocked',
            username: 'blocked-user',
            display_name: 'Blocked User',
            avatar_url: null,
            created_at: '2026-03-01T00:00:00Z',
            rating: null
          },
          error: null
        },
        { data: [], error: null },
        { data: { status: 'blocked', initiated_by: 'user-blocked' }, error: null }
      );

      const result = (await load(event)) as Record<string, unknown>;

      expect(result.relationship).toBe('blocked');
    });

    it('redirects /user/profile/[username] to /@username', async () => {
      const event = createMockEvent('TestUser');
      (event as unknown as { url: URL }).url = new URL('http://localhost/user/profile/TestUser');
      mockProfileAndGamesQuery({
        data: null,
        error: null
      });

      await expect(load(event)).rejects.toEqual(
        expect.objectContaining({
          status: 301,
          location: '/@testuser'
        })
      );
    });
  });
});
