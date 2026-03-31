import { describe, expect, it } from 'vitest';

import { aggregateActivityLeaderboard, rankActivityLeaderboard } from '../leaderboard';

describe('leaderboard aggregation', () => {
  it('counts both players for each completed game and sorts by games played', () => {
    const aggregated = aggregateActivityLeaderboard([
      {
        red_player: 'u1',
        blue_player: 'u2',
        ended_at: '2026-03-31T10:00:00Z',
        status: 'checkmate'
      },
      {
        red_player: 'u1',
        blue_player: 'u3',
        ended_at: '2026-03-30T10:00:00Z',
        status: 'draw'
      }
    ]);

    expect(aggregated).toEqual([
      { userId: 'u1', gamesPlayed: 2, lastActiveAt: '2026-03-31T10:00:00Z' },
      { userId: 'u2', gamesPlayed: 1, lastActiveAt: '2026-03-31T10:00:00Z' },
      { userId: 'u3', gamesPlayed: 1, lastActiveAt: '2026-03-30T10:00:00Z' }
    ]);
  });

  it('ignores rows without ended_at', () => {
    const aggregated = aggregateActivityLeaderboard([
      {
        red_player: 'u1',
        blue_player: 'u2',
        ended_at: null,
        status: 'started'
      }
    ]);

    expect(aggregated).toEqual([]);
  });

  it('applies profile data and ranking', () => {
    const ranked = rankActivityLeaderboard(
      [
        { userId: 'u1', gamesPlayed: 3, lastActiveAt: '2026-03-31T10:00:00Z' },
        { userId: 'u2', gamesPlayed: 1, lastActiveAt: '2026-03-29T10:00:00Z' }
      ],
      [
        { id: 'u1', display_name: 'Nguoi choi 1', rating: 1610, rating_games_played: 42 },
        { id: 'u2', display_name: 'Nguoi choi 2', rating: 1498, rating_games_played: 12 }
      ]
    );

    expect(ranked[0]).toMatchObject({
      userId: 'u1',
      displayName: 'Nguoi choi 1',
      rating: 1610,
      ratingGamesPlayed: 42,
      gamesPlayed: 3,
      rank: 1
    });
    expect(ranked[1]).toMatchObject({
      userId: 'u2',
      displayName: 'Nguoi choi 2',
      rating: 1498,
      ratingGamesPlayed: 12,
      gamesPlayed: 1,
      rank: 2
    });
  });
});
