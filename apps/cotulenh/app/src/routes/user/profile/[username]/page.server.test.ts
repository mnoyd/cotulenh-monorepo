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
		return {
			params: { username },
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
		gamesResult: { data: unknown; error: unknown } = { data: [], error: null }
	) {
		// Profile chain
		const maybeSingleMock = vi.fn().mockResolvedValue(profileResult);
		const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
		const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
		const eqMock = vi.fn().mockReturnValue({ order: orderMock });
		const profileSelectMock = vi.fn().mockReturnValue({ eq: eqMock });

		// Games chain
		const gamesOrderMock = vi.fn().mockResolvedValue(gamesResult);
		const neqMock = vi.fn().mockReturnValue({ order: gamesOrderMock });
		const orMock = vi.fn().mockReturnValue({ neq: neqMock });
		const gamesSelectMock = vi.fn().mockReturnValue({ or: orMock });

		mockSupabase.from.mockImplementation((table: string) => {
			if (table === 'profiles') return { select: profileSelectMock };
			if (table === 'games') return { select: gamesSelectMock };
			return { select: vi.fn() };
		});

		return { eqMock, orderMock, limitMock, maybeSingleMock };
	}

	describe('load function', () => {
		it('returns profile data and real game stats', async () => {
			const event = createMockEvent('Commander');
			mockProfileAndGamesQuery(
				{
					data: {
						id: 'user-1',
						display_name: 'Commander',
						avatar_url: null,
						created_at: '2026-01-15T00:00:00Z'
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
				displayName: 'Commander',
				avatarUrl: null,
				createdAt: '2026-01-15T00:00:00Z'
			});
			expect(result.stats).toEqual({
				gamesPlayed: 1,
				wins: 1,
				losses: 0
			});
			expect(result.canViewAll).toBe(false);
			expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
			expect(mockSupabase.from).toHaveBeenCalledWith('games');
		});

		it('returns game history for the profile user', async () => {
			const event = createMockEvent('Commander');
			mockProfileAndGamesQuery(
				{
					data: {
						id: 'user-1',
						display_name: 'Commander',
						avatar_url: null,
						created_at: '2026-01-15T00:00:00Z'
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
			expect(result.canViewAll).toBe(false);
		});

		it('returns zero stats when user has no games', async () => {
			const event = createMockEvent('NewUser');
			mockProfileAndGamesQuery(
				{
					data: {
						id: 'user-new',
						display_name: 'NewUser',
						avatar_url: null,
						created_at: '2026-03-01T00:00:00Z'
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
			expect(result.canViewAll).toBe(false);
		});

		it('throws 404 when display_name not found', async () => {
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
			mockProfileAndGamesQuery(
				{
					data: {
						id: 'user-pub',
						display_name: 'PublicUser',
						avatar_url: 'https://example.com/avatar.jpg',
						created_at: '2026-02-20T00:00:00Z'
					},
					error: null
				}
			);

			const result = (await load(event)) as Record<string, unknown>;
			const profileDetail = result.profileDetail as Record<string, unknown>;

			expect(profileDetail.displayName).toBe('PublicUser');
			expect(profileDetail.avatarUrl).toBe('https://example.com/avatar.jpg');
			expect(result.canViewAll).toBe(false);
		});

		it('sets canViewAll true when viewing own public profile', async () => {
			const event = createMockEvent('Commander', 'user-1');
			mockProfileAndGamesQuery({
				data: {
					id: 'user-1',
					display_name: 'Commander',
					avatar_url: null,
					created_at: '2026-01-15T00:00:00Z'
				},
				error: null
			});

			const result = (await load(event)) as Record<string, unknown>;

			expect(result.canViewAll).toBe(true);
		});

		it('uses route param as provided without a second decode', async () => {
			const event = createMockEvent('50%Win');
			const { eqMock } = mockProfileAndGamesQuery(
				{
					data: {
						id: 'user-pct',
						display_name: '50%Win',
						avatar_url: null,
						created_at: '2026-01-01T00:00:00Z'
					},
					error: null
				}
			);

			await load(event);

			expect(eqMock).toHaveBeenCalledWith('display_name', '50%Win');
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

		it('limits to one result so duplicate display names do not error', async () => {
			const event = createMockEvent('SharedName');
			const { orderMock, limitMock, maybeSingleMock } = mockProfileAndGamesQuery(
				{
					data: {
						id: 'user-shared',
						display_name: 'SharedName',
						avatar_url: null,
						created_at: '2026-01-01T00:00:00Z'
					},
					error: null
				}
			);

			await load(event);

			expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });
			expect(limitMock).toHaveBeenCalledWith(1);
			expect(maybeSingleMock).toHaveBeenCalledTimes(1);
		});

		it('returns correct data shape with all fields', async () => {
			const event = createMockEvent('FullProfile');
			mockProfileAndGamesQuery(
				{
					data: {
						id: 'user-full',
						display_name: 'FullProfile',
						avatar_url: 'https://example.com/pic.png',
						created_at: '2026-03-01T12:00:00Z'
					},
					error: null
				}
			);

			const result = (await load(event)) as Record<string, unknown>;
			const profileDetail = result.profileDetail as Record<string, unknown>;
			const stats = result.stats as Record<string, unknown>;

			expect(result).toHaveProperty('profileDetail');
			expect(result).toHaveProperty('stats');
			expect(result).toHaveProperty('games');
			expect(profileDetail).toHaveProperty('displayName');
			expect(profileDetail).toHaveProperty('avatarUrl');
			expect(profileDetail).toHaveProperty('createdAt');
			expect(stats).toHaveProperty('gamesPlayed');
			expect(stats).toHaveProperty('wins');
			expect(stats).toHaveProperty('losses');
		});
	});
});
