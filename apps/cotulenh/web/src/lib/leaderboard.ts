import { createClient } from '@/lib/supabase/server';

export type ActivityLeaderboardEntry = {
  userId: string;
  displayName: string;
  rating: number;
  ratingGamesPlayed: number;
  gamesPlayed: number;
  lastActiveAt: string;
  rank: number;
};

type GameRow = {
  red_player: string;
  blue_player: string;
  ended_at: string | null;
  status: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  rating: number | null;
  rating_games_played?: number | null;
};

type AggregatedEntry = {
  userId: string;
  gamesPlayed: number;
  lastActiveAt: string;
};

export type ActivityLeaderboardData = {
  entries: ActivityLeaderboardEntry[];
  currentUserId: string;
  currentUserEntry: ActivityLeaderboardEntry | null;
};

const LEADERBOARD_LIMIT = 50;
const COMPLETED_STATUSES = ['checkmate', 'resign', 'timeout', 'stalemate', 'draw', 'dispute'];

export async function getActivityLeaderboard(): Promise<ActivityLeaderboardData> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { entries: [], currentUserId: '', currentUserEntry: null };
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('red_player, blue_player, ended_at, status')
    .gte('ended_at', monthStart.toISOString())
    .in('status', COMPLETED_STATUSES)
    .order('ended_at', { ascending: false });

  if (gamesError || !games) {
    return { entries: [], currentUserId: user.id, currentUserEntry: null };
  }

  const aggregated = aggregateActivityLeaderboard(games as GameRow[]);
  if (aggregated.length === 0) {
    return { entries: [], currentUserId: user.id, currentUserEntry: null };
  }

  const playerIds = aggregated.map((entry) => entry.userId);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, rating, rating_games_played')
    .in('id', playerIds);

  const rankedEntries = rankActivityLeaderboard(aggregated, profiles as ProfileRow[] | null);
  const entries = rankedEntries.slice(0, LEADERBOARD_LIMIT);
  const currentUserEntry = rankedEntries.find((entry) => entry.userId === user.id) ?? null;

  return {
    entries,
    currentUserId: user.id,
    currentUserEntry
  };
}

export function aggregateActivityLeaderboard(games: GameRow[]): AggregatedEntry[] {
  const entryMap = new Map<string, AggregatedEntry>();

  for (const game of games) {
    if (!game.ended_at) continue;

    for (const playerId of [game.red_player, game.blue_player]) {
      const current = entryMap.get(playerId);
      if (!current) {
        entryMap.set(playerId, {
          userId: playerId,
          gamesPlayed: 1,
          lastActiveAt: game.ended_at
        });
        continue;
      }

      entryMap.set(playerId, {
        userId: playerId,
        gamesPlayed: current.gamesPlayed + 1,
        lastActiveAt:
          new Date(game.ended_at).getTime() > new Date(current.lastActiveAt).getTime()
            ? game.ended_at
            : current.lastActiveAt
      });
    }
  }

  return Array.from(entryMap.values()).sort((left, right) => {
    if (right.gamesPlayed !== left.gamesPlayed) {
      return right.gamesPlayed - left.gamesPlayed;
    }

    return new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime();
  });
}

export function rankActivityLeaderboard(
  aggregated: AggregatedEntry[],
  profiles: ProfileRow[] | null
): ActivityLeaderboardEntry[] {
  const profileMap = new Map<string, ProfileRow>();
  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, profile);
  }

  return aggregated.map((entry, index) => {
    const profile = profileMap.get(entry.userId);

    return {
      userId: entry.userId,
      displayName: profile?.display_name ?? 'Nguoi choi',
      rating: profile?.rating ?? 1500,
      ratingGamesPlayed: profile?.rating_games_played ?? 0,
      gamesPlayed: entry.gamesPlayed,
      lastActiveAt: entry.lastActiveAt,
      rank: index + 1
    };
  });
}
