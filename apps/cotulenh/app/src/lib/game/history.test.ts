import { describe, it, expect, vi } from 'vitest';

vi.mock('@cotulenh/common', () => ({
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn()
	}
}));

import {
	getGameHistory,
	computeGameStats,
	getGameResult,
	formatDuration,
	formatTimeControl,
	getDurationParts,
	getGameHistoryReasonKey
} from './history';
import type { GameHistoryItem } from './history';

describe('game history query functions', () => {
	function createMockSupabase(result: { data: unknown; error: unknown }) {
		const orderMock = vi.fn().mockResolvedValue(result);
		const neqMock = vi.fn().mockReturnValue({ order: orderMock });
		const orMock = vi.fn().mockReturnValue({ neq: neqMock });
		const selectMock = vi.fn().mockReturnValue({ or: orMock });
		const fromMock = vi.fn().mockReturnValue({ select: selectMock });

		return {
			supabase: { from: fromMock } as unknown as Parameters<typeof getGameHistory>[0],
			fromMock,
			selectMock,
			orMock,
			neqMock,
			orderMock
		};
	}

	describe('getGameHistory', () => {
		it('returns mapped GameHistoryItem array', async () => {
			const { supabase } = createMockSupabase({
				data: [
					{
						id: 'game-1',
						status: 'checkmate',
						winner: 'red',
						result_reason: 'checkmate',
						time_control: { timeMinutes: 10, incrementSeconds: 5 },
						started_at: '2026-03-01T10:00:00Z',
						ended_at: '2026-03-01T10:30:00Z',
						red_player: 'user-1',
						blue_player: 'user-2',
						red_profile: { display_name: 'Alice' },
						blue_profile: { display_name: 'Bob' }
					}
				],
				error: null
			});

			const result = await getGameHistory(supabase, 'user-1');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: 'game-1',
				opponentDisplayName: 'Bob',
				playerColor: 'red',
				status: 'checkmate',
				winner: 'red',
				resultReason: 'checkmate',
				timeControl: { timeMinutes: 10, incrementSeconds: 5 },
				startedAt: '2026-03-01T10:00:00Z',
				endedAt: '2026-03-01T10:30:00Z'
			});
		});

		it('correctly identifies opponent when user is blue player', async () => {
			const { supabase } = createMockSupabase({
				data: [
					{
						id: 'game-2',
						status: 'resign',
						winner: 'blue',
						result_reason: 'resignation',
						time_control: { timeMinutes: 5, incrementSeconds: 0 },
						started_at: '2026-03-01T10:00:00Z',
						ended_at: '2026-03-01T10:15:00Z',
						red_player: 'user-1',
						blue_player: 'user-2',
						red_profile: { display_name: 'Alice' },
						blue_profile: { display_name: 'Bob' }
					}
				],
				error: null
			});

			const result = await getGameHistory(supabase, 'user-2');

			expect(result[0].opponentDisplayName).toBe('Alice');
			expect(result[0].playerColor).toBe('blue');
		});

		it('returns empty array on Supabase error', async () => {
			const { supabase } = createMockSupabase({
				data: null,
				error: { message: 'DB error' }
			});

			const result = await getGameHistory(supabase, 'user-1');

			expect(result).toEqual([]);
		});

		it('handles null ended_at', async () => {
			const { supabase } = createMockSupabase({
				data: [
					{
						id: 'game-3',
						status: 'aborted',
						winner: null,
						result_reason: null,
						time_control: { timeMinutes: 10, incrementSeconds: 0 },
						started_at: '2026-03-01T10:00:00Z',
						ended_at: null,
						red_player: 'user-1',
						blue_player: 'user-2',
						red_profile: { display_name: 'Alice' },
						blue_profile: { display_name: 'Bob' }
					}
				],
				error: null
			});

			const result = await getGameHistory(supabase, 'user-1');

			expect(result[0].endedAt).toBeNull();
		});

		it('defaults opponent name to ??? when profile is missing', async () => {
			const { supabase } = createMockSupabase({
				data: [
					{
						id: 'game-4',
						status: 'checkmate',
						winner: 'red',
						result_reason: 'checkmate',
						time_control: { timeMinutes: 10, incrementSeconds: 0 },
						started_at: '2026-03-01T10:00:00Z',
						ended_at: '2026-03-01T10:30:00Z',
						red_player: 'user-1',
						blue_player: 'user-2',
						red_profile: null,
						blue_profile: null
					}
				],
				error: null
			});

			const result = await getGameHistory(supabase, 'user-1');

			expect(result[0].opponentDisplayName).toBe('???');
		});

		it('queries games table with correct filters', async () => {
			const { supabase, fromMock, neqMock, orMock, orderMock } = createMockSupabase({
				data: [],
				error: null
			});

			await getGameHistory(supabase, 'test-user');

			expect(fromMock).toHaveBeenCalledWith('games');
			expect(orMock).toHaveBeenCalledWith('red_player.eq.test-user,blue_player.eq.test-user');
			expect(neqMock).toHaveBeenCalledWith('status', 'started');
			expect(orderMock).toHaveBeenCalledWith('ended_at', {
				ascending: false,
				nullsFirst: false
			});
		});
	});

	describe('computeGameStats', () => {
		const makeGame = (
			overrides: Partial<GameHistoryItem>
		): GameHistoryItem => ({
			id: 'g1',
			opponentDisplayName: 'Opp',
			playerColor: 'red',
			status: 'checkmate',
			winner: 'red',
			resultReason: 'checkmate',
			timeControl: { timeMinutes: 10, incrementSeconds: 0 },
			startedAt: '2026-03-01T10:00:00Z',
			endedAt: '2026-03-01T10:30:00Z',
			...overrides
		});

		it('correctly counts wins, losses, and draws', () => {
			const games = [
				makeGame({ winner: 'red', playerColor: 'red' }),
				makeGame({ winner: 'blue', playerColor: 'red' }),
				makeGame({ winner: null, status: 'draw' })
			];

			const stats = computeGameStats(games);

			expect(stats).toEqual({ gamesPlayed: 3, wins: 1, losses: 1 });
		});

		it('excludes aborted games from stats', () => {
			const games = [
				makeGame({ winner: 'red', playerColor: 'red' }),
				makeGame({ status: 'aborted', winner: null })
			];

			const stats = computeGameStats(games);

			expect(stats).toEqual({ gamesPlayed: 1, wins: 1, losses: 0 });
		});

		it('returns zeros for empty game list', () => {
			const stats = computeGameStats([]);

			expect(stats).toEqual({ gamesPlayed: 0, wins: 0, losses: 0 });
		});
	});

	describe('getGameResult', () => {
		const makeGame = (
			overrides: Partial<GameHistoryItem>
		): GameHistoryItem => ({
			id: 'g1',
			opponentDisplayName: 'Opp',
			playerColor: 'red',
			status: 'checkmate',
			winner: 'red',
			resultReason: 'checkmate',
			timeControl: { timeMinutes: 10, incrementSeconds: 0 },
			startedAt: '2026-03-01T10:00:00Z',
			endedAt: '2026-03-01T10:30:00Z',
			...overrides
		});

		it('returns win when player is winner', () => {
			expect(getGameResult(makeGame({ winner: 'red', playerColor: 'red' }))).toBe('win');
		});

		it('returns loss when opponent is winner', () => {
			expect(getGameResult(makeGame({ winner: 'blue', playerColor: 'red' }))).toBe('loss');
		});

		it('returns draw when winner is null and not aborted', () => {
			expect(getGameResult(makeGame({ winner: null, status: 'draw' }))).toBe('draw');
		});

		it('returns aborted for aborted games', () => {
			expect(getGameResult(makeGame({ status: 'aborted', winner: null }))).toBe('aborted');
		});
	});

	describe('formatDuration', () => {
		it('formats duration from timestamps', () => {
			expect(formatDuration('2026-03-01T10:00:00Z', '2026-03-01T10:15:30Z')).toBe('15m 30s');
		});

		it('returns dash for null endedAt', () => {
			expect(formatDuration('2026-03-01T10:00:00Z', null)).toBe('—');
		});

		it('handles zero-length games', () => {
			expect(formatDuration('2026-03-01T10:00:00Z', '2026-03-01T10:00:00Z')).toBe('0m 0s');
		});
	});

	describe('getDurationParts', () => {
		it('returns minutes/seconds parts for a valid range', () => {
			expect(getDurationParts('2026-03-01T10:00:00Z', '2026-03-01T10:15:30Z')).toEqual({
				minutes: 15,
				seconds: 30
			});
		});

		it('returns null when endedAt is null', () => {
			expect(getDurationParts('2026-03-01T10:00:00Z', null)).toBeNull();
		});

		it('clamps negative durations to zero', () => {
			expect(getDurationParts('2026-03-01T10:00:10Z', '2026-03-01T10:00:00Z')).toEqual({
				minutes: 0,
				seconds: 0
			});
		});
	});

	describe('formatTimeControl', () => {
		it('formats time control as X+Y', () => {
			expect(formatTimeControl({ timeMinutes: 10, incrementSeconds: 5 })).toBe('10+5');
		});

		it('formats bullet time control', () => {
			expect(formatTimeControl({ timeMinutes: 1, incrementSeconds: 0 })).toBe('1+0');
		});
	});

	describe('getGameHistoryReasonKey', () => {
		it('maps resignation to localized history reason key', () => {
			expect(getGameHistoryReasonKey('resignation')).toBe('gameHistory.reason.resignation');
		});

		it('maps commander-captured reason emitted by online session', () => {
			expect(getGameHistoryReasonKey('commander_captured')).toBe(
				'gameHistory.reason.commander_captured'
			);
		});

		it('returns null for unknown or missing reason', () => {
			expect(getGameHistoryReasonKey('unknown_reason')).toBeNull();
			expect(getGameHistoryReasonKey(null)).toBeNull();
		});
	});
});
