import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import { generatePairings, type Participant } from './pairing.ts';

// Deterministic "shuffle" for testing — returns array as-is
const noShuffle = <T>(arr: T[]): T[] => arr;

Deno.test('returns empty pairs for 0 participants', () => {
  const result = generatePairings([], noShuffle);
  assertEquals(result.pairs.length, 0);
  assertEquals(result.byePlayer, null);
});

Deno.test('returns bye for single participant', () => {
  const participants: Participant[] = [{ user_id: 'a', score: 0, games_played: 0 }];
  const result = generatePairings(participants, noShuffle);
  assertEquals(result.pairs.length, 0);
  assertEquals(result.byePlayer?.user_id, 'a');
});

Deno.test('pairs 2 participants correctly', () => {
  const participants: Participant[] = [
    { user_id: 'a', score: 1, games_played: 1 },
    { user_id: 'b', score: 0, games_played: 1 }
  ];
  const result = generatePairings(participants, noShuffle);
  assertEquals(result.pairs.length, 1);
  assertEquals(result.pairs[0][0].user_id, 'a');
  assertEquals(result.pairs[0][1].user_id, 'b');
  assertEquals(result.byePlayer, null);
});

Deno.test('pairs 4 participants with score grouping', () => {
  const participants: Participant[] = [
    { user_id: 'a', score: 2, games_played: 2 },
    { user_id: 'b', score: 1, games_played: 2 },
    { user_id: 'c', score: 2, games_played: 2 },
    { user_id: 'd', score: 0, games_played: 2 }
  ];
  const result = generatePairings(participants, noShuffle);
  assertEquals(result.pairs.length, 2);
  assertEquals(result.byePlayer, null);
  // Score 2 group: a, c; Score 1: b; Score 0: d
  // Pairs: (a, c), (b, d)
  assertEquals(result.pairs[0][0].user_id, 'a');
  assertEquals(result.pairs[0][1].user_id, 'c');
  assertEquals(result.pairs[1][0].user_id, 'b');
  assertEquals(result.pairs[1][1].user_id, 'd');
});

Deno.test('assigns bye to lowest-score player with odd count', () => {
  const participants: Participant[] = [
    { user_id: 'a', score: 3, games_played: 3 },
    { user_id: 'b', score: 2, games_played: 3 },
    { user_id: 'c', score: 1, games_played: 3 }
  ];
  const result = generatePairings(participants, noShuffle);
  assertEquals(result.pairs.length, 1);
  assertEquals(result.byePlayer?.user_id, 'c');
  assertEquals(result.pairs[0][0].user_id, 'a');
  assertEquals(result.pairs[0][1].user_id, 'b');
});

Deno.test('handles all participants with same score', () => {
  const participants: Participant[] = [
    { user_id: 'a', score: 0, games_played: 0 },
    { user_id: 'b', score: 0, games_played: 0 },
    { user_id: 'c', score: 0, games_played: 0 },
    { user_id: 'd', score: 0, games_played: 0 }
  ];
  const result = generatePairings(participants, noShuffle);
  assertEquals(result.pairs.length, 2);
  assertEquals(result.byePlayer, null);
});

Deno.test('pairs 5 participants with bye for last', () => {
  const participants: Participant[] = [
    { user_id: 'a', score: 4, games_played: 4 },
    { user_id: 'b', score: 3, games_played: 4 },
    { user_id: 'c', score: 2, games_played: 4 },
    { user_id: 'd', score: 1, games_played: 4 },
    { user_id: 'e', score: 0, games_played: 4 }
  ];
  const result = generatePairings(participants, noShuffle);
  assertEquals(result.pairs.length, 2);
  assertEquals(result.byePlayer?.user_id, 'e');
});
