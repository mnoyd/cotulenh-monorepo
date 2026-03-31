import { createClient } from '@/lib/supabase/server';

export type GameHistoryEntry = {
  id: string;
  opponentDisplayName: string;
  opponentRating: number;
  opponentRatingGamesPlayed: number;
  result: 'win' | 'loss' | 'draw' | 'aborted';
  resultReason: string | null;
  resultReasonLabel: string;
  timeControl: string;
  endedAt: string | null;
  relativeDate: string;
};

export type GameHistoryData = {
  games: GameHistoryEntry[];
  currentUserId: string;
  totalCount: number;
  page: number;
  pageSize: number;
};

export type GetGameHistoryOptions = {
  page?: number;
  pageSize?: number;
};

type GameRow = {
  id: string;
  status: string;
  winner: 'red' | 'blue' | null;
  result_reason: string | null;
  time_control: { timeMinutes: number; incrementSeconds: number } | null;
  started_at: string;
  ended_at: string | null;
  is_rated: boolean;
  red_player: string;
  blue_player: string;
  red_profile: {
    display_name: string | null;
    rating: number | null;
    rating_games_played: number | null;
  } | null;
  blue_profile: {
    display_name: string | null;
    rating: number | null;
    rating_games_played: number | null;
  } | null;
};

const RESULT_REASON_LABELS: Record<string, string> = {
  checkmate: 'Chiếu hết',
  commander_captured: 'Bắt tướng',
  resign: 'Đầu hàng',
  resignation: 'Đầu hàng',
  timeout: 'Hết giờ',
  stalemate: 'Hòa bí',
  draw: 'Hòa',
  draw_by_agreement: 'Hòa thuận',
  draw_by_timeout_with_pending_offer: 'Hòa do hết giờ',
  dispute: 'Tranh chấp',
  fifty_moves: 'Luật 50 nước',
  threefold_repetition: 'Lặp 3 lần',
  abandonment: 'Bỏ trận',
  stale_cleanup: 'Dọn dẹp'
};

export function getGameResult(
  playerColor: 'red' | 'blue',
  winner: 'red' | 'blue' | null,
  status: string
): 'win' | 'loss' | 'draw' | 'aborted' {
  if (status === 'aborted') return 'aborted';
  if (winner === null) return 'draw';
  return winner === playerColor ? 'win' : 'loss';
}

export function getResultReasonLabel(resultReason: string | null): string {
  if (!resultReason) return '';
  return RESULT_REASON_LABELS[resultReason] ?? resultReason;
}

export function formatTimeControl(
  tc: { timeMinutes: number; incrementSeconds: number } | null
): string {
  if (!tc) return '—';
  return `${tc.timeMinutes}+${tc.incrementSeconds}`;
}

export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return '—';

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày trước`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} tháng trước`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} năm trước`;
}

function mapGameRow(game: GameRow, userId: string): GameHistoryEntry {
  const isRedPlayer = game.red_player === userId;
  const playerColor: 'red' | 'blue' = isRedPlayer ? 'red' : 'blue';
  const opponentProfile = isRedPlayer ? game.blue_profile : game.red_profile;

  return {
    id: game.id,
    opponentDisplayName: opponentProfile?.display_name ?? 'Người chơi',
    opponentRating: opponentProfile?.rating ?? 1500,
    opponentRatingGamesPlayed: opponentProfile?.rating_games_played ?? 0,
    result: getGameResult(playerColor, game.winner, game.status),
    resultReason: game.result_reason,
    resultReasonLabel: getResultReasonLabel(game.result_reason),
    timeControl: formatTimeControl(game.time_control),
    endedAt: game.ended_at,
    relativeDate: formatRelativeDate(game.ended_at)
  };
}

export async function getGameHistory(
  options: GetGameHistoryOptions = {}
): Promise<GameHistoryData> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, options.pageSize ?? 20);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { games: [], currentUserId: '', totalCount: 0, page, pageSize };
  }

  const { data, error, count } = await supabase
    .from('games')
    .select(
      `
      id, status, winner, result_reason, time_control, started_at, ended_at,
      is_rated, red_player, blue_player,
      red_profile:profiles!games_red_player_fkey(display_name, rating, rating_games_played),
      blue_profile:profiles!games_blue_player_fkey(display_name, rating, rating_games_played)
    `,
      { count: 'exact' }
    )
    .or(`red_player.eq.${user.id},blue_player.eq.${user.id}`)
    .neq('status', 'started')
    .order('ended_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error || !data) {
    return { games: [], currentUserId: user.id, totalCount: 0, page, pageSize };
  }

  const games = (data as unknown as GameRow[]).map((game) => mapGameRow(game, user.id));

  return {
    games,
    currentUserId: user.id,
    totalCount: count ?? games.length,
    page,
    pageSize
  };
}
