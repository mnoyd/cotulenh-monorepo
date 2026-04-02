/** Shuffle array in place (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type Participant = {
  user_id: string;
  score: number;
  games_played: number;
};

/**
 * Arena-style pairing: sort by score DESC, randomize within same-score groups,
 * pair sequentially (1v2, 3v4, ...). Odd player out gets a bye.
 */
export function generatePairings(
  participants: Participant[],
  shuffleFn: <T>(arr: T[]) => T[] = shuffle
): {
  pairs: [Participant, Participant][];
  byePlayer: Participant | null;
} {
  if (participants.length < 2) {
    return { pairs: [], byePlayer: participants[0] ?? null };
  }

  // Group by score, shuffle within groups, then flatten
  const scoreGroups = new Map<number, Participant[]>();
  for (const p of participants) {
    const key = p.score;
    if (!scoreGroups.has(key)) scoreGroups.set(key, []);
    scoreGroups.get(key)!.push(p);
  }

  const sorted: Participant[] = [];
  const scores = [...scoreGroups.keys()].sort((a, b) => b - a);
  for (const score of scores) {
    sorted.push(...shuffleFn(scoreGroups.get(score)!));
  }

  let byePlayer: Participant | null = null;
  const toPair = [...sorted];

  if (toPair.length % 2 !== 0) {
    // Give bye to the last player (lowest score after shuffle)
    byePlayer = toPair.pop()!;
  }

  const pairs: [Participant, Participant][] = [];
  for (let i = 0; i < toPair.length; i += 2) {
    pairs.push([toPair[i], toPair[i + 1]]);
  }

  return { pairs, byePlayer };
}
