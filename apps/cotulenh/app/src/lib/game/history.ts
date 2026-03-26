import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@cotulenh/common';
import type { TranslationKey } from '$lib/i18n/types';

export interface GameHistoryItem {
  id: string;
  opponentDisplayName: string;
  playerColor: 'red' | 'blue';
  status: string;
  winner: 'red' | 'blue' | null;
  resultReason: string | null;
  timeControl: { timeMinutes: number; incrementSeconds: number };
  startedAt: string;
  endedAt: string | null;
}

export interface DurationParts {
  minutes: number;
  seconds: number;
}

const RESULT_REASON_TO_KEY: Record<string, TranslationKey> = {
  checkmate: 'gameHistory.reason.checkmate',
  resign: 'gameHistory.reason.resign',
  resignation: 'gameHistory.reason.resignation',
  timeout: 'gameHistory.reason.timeout',
  stalemate: 'gameHistory.reason.stalemate',
  draw: 'gameHistory.reason.draw',
  draw_by_agreement: 'gameHistory.reason.draw_by_agreement',
  draw_by_timeout_with_pending_offer: 'gameHistory.reason.draw_by_timeout_with_pending_offer',
  dispute: 'gameHistory.reason.dispute',
  commander_captured: 'gameHistory.reason.commander_captured',
  fifty_moves: 'gameHistory.reason.fifty_moves',
  threefold_repetition: 'gameHistory.reason.threefold_repetition',
  abandonment: 'gameHistory.reason.abandonment',
  stale_cleanup: 'gameHistory.reason.stale_cleanup'
};

async function queryGameHistory(
  supabase: SupabaseClient,
  userId: string
): Promise<GameHistoryItem[]> {
  const { data, error } = await supabase
    .from('games')
    .select(
      `
			id, status, winner, result_reason, time_control, started_at, ended_at,
			red_player, blue_player,
			red_profile:profiles!games_red_player_fkey(display_name),
			blue_profile:profiles!games_blue_player_fkey(display_name)
		`
    )
    .or(`red_player.eq.${userId},blue_player.eq.${userId}`)
    .neq('status', 'started')
    .order('ended_at', { ascending: false, nullsFirst: false });

  if (error) {
    logger.error(error, 'Failed to load game history');
    return [];
  }

  return (data ?? []).map((game) => {
    const isRedPlayer = game.red_player === userId;
    const blueProfile = game.blue_profile as unknown as { display_name: string } | null;
    const redProfile = game.red_profile as unknown as { display_name: string } | null;
    return {
      id: game.id,
      opponentDisplayName: isRedPlayer
        ? (blueProfile?.display_name ?? '???')
        : (redProfile?.display_name ?? '???'),
      playerColor: isRedPlayer ? ('red' as const) : ('blue' as const),
      status: game.status,
      winner: game.winner,
      resultReason: game.result_reason,
      timeControl: game.time_control as { timeMinutes: number; incrementSeconds: number },
      startedAt: game.started_at,
      endedAt: game.ended_at
    };
  });
}

export async function getGameHistory(
  supabase: SupabaseClient,
  userId: string
): Promise<GameHistoryItem[]> {
  return queryGameHistory(supabase, userId);
}

export async function getPublicGameHistory(
  supabase: SupabaseClient,
  profileUserId: string
): Promise<GameHistoryItem[]> {
  return queryGameHistory(supabase, profileUserId);
}

export function computeGameStats(games: GameHistoryItem[]): {
  gamesPlayed: number;
  wins: number;
  losses: number;
} {
  let wins = 0;
  let losses = 0;
  let gamesPlayed = 0;

  for (const game of games) {
    if (game.status === 'aborted') continue;
    gamesPlayed++;

    if (game.winner === game.playerColor) {
      wins++;
    } else if (game.winner !== null) {
      losses++;
    }
  }

  return { gamesPlayed, wins, losses };
}

export function getGameResult(game: GameHistoryItem): 'win' | 'loss' | 'draw' | 'aborted' {
  if (game.status === 'aborted') return 'aborted';
  if (game.winner === null) return 'draw';
  return game.winner === game.playerColor ? 'win' : 'loss';
}

export function formatDuration(startedAt: string, endedAt: string | null): string {
  const parts = getDurationParts(startedAt, endedAt);
  if (!parts) return '—';
  return `${parts.minutes}m ${parts.seconds}s`;
}

export function formatTimeControl(tc: { timeMinutes: number; incrementSeconds: number }): string {
  return `${tc.timeMinutes}+${tc.incrementSeconds}`;
}

export function getDurationParts(startedAt: string, endedAt: string | null): DurationParts | null {
  if (!endedAt) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60
  };
}

export function getGameHistoryReasonKey(resultReason: string | null): TranslationKey | null {
  if (!resultReason) return null;
  return RESULT_REASON_TO_KEY[resultReason] ?? null;
}
