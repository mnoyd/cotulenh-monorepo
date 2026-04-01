import { CoTuLenh } from '@cotulenh/core';

export type AiDifficulty = 'easy' | 'medium' | 'hard';

/** Material values for piece evaluation (Cờ Tư Lệnh) */
export const PIECE_VALUES: Record<string, number> = {
  c: 1000, // Tư Lệnh (Commander) — game-ending
  f: 90, // Không quân (Air Force)
  s: 80, // Tên lửa (Missile)
  t: 70, // Xe tăng (Tank)
  n: 60, // Hải quân (Navy)
  a: 50, // Pháo binh (Artillery)
  g: 45, // Phòng không (Anti-Air)
  e: 30, // Công binh (Engineer)
  i: 20, // Bộ binh (Infantry)
  m: 15, // Dân quân (Militia)
  h: 10 // Sở chỉ huy (Headquarter)
};

interface VerboseMove {
  san: string;
  from: string;
  to: string;
  piece: { type: string; color: string };
  captured?: Array<{ type: string; color: string }>;
  flags: string;
}

/**
 * Select an AI move for the given position and difficulty.
 * Returns a SAN string or null if no legal moves exist.
 */
export function selectAiMove(fen: string, difficulty: AiDifficulty): string | null {
  const engine = new CoTuLenh(fen);
  const moves = engine.moves({ verbose: true }) as VerboseMove[];

  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0].san;

  switch (difficulty) {
    case 'easy':
      return selectEasy(moves);
    case 'medium':
      return selectMedium(moves);
    case 'hard':
      return selectHard(engine, moves);
  }
}

/** Easy: pick a random legal move */
function selectEasy(moves: VerboseMove[]): string {
  return moves[Math.floor(Math.random() * moves.length)].san;
}

/** Medium: weight moves by material value of captures, prefer captures */
function selectMedium(moves: VerboseMove[]): string {
  const scored = moves.map((m) => {
    let score = 1; // base weight so non-captures still have a chance
    if (m.captured && m.captured.length > 0) {
      for (const cap of m.captured) {
        score += (PIECE_VALUES[cap.type] ?? 10) * 2;
      }
    }
    return { san: m.san, score };
  });

  // Weighted random selection
  const totalWeight = scored.reduce((sum, s) => sum + s.score, 0);
  let roll = Math.random() * totalWeight;
  for (const s of scored) {
    roll -= s.score;
    if (roll <= 0) return s.san;
  }
  return scored[scored.length - 1].san;
}

/** Hard: 1-ply lookahead — evaluate each move by resulting material balance */
function selectHard(engine: CoTuLenh, moves: VerboseMove[]): string {
  const aiColor = engine.turn();
  let bestScore = -Infinity;
  let bestMoves: string[] = [];

  for (const m of moves) {
    engine.move(m.san);

    let score: number;
    if (engine.isCheckmate() || engine.isCommanderCaptured()) {
      // Checkmate or commander captured — max score
      score = 100000;
    } else if (engine.isGameOver()) {
      // Draw — neutral
      score = 0;
    } else {
      // 1-ply material evaluation from resulting board state.
      score = evaluateMaterialBalance(engine, aiColor) + evaluateCapture(m) * 0.01;
    }

    engine.undo();

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [m.san];
    } else if (score === bestScore) {
      bestMoves.push(m.san);
    }
  }

  // Small randomness among equally scored moves
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function evaluateMaterialBalance(engine: CoTuLenh, aiColor: 'r' | 'b'): number {
  let score = 0;
  const board = engine.board();
  for (const rank of board) {
    for (const square of rank) {
      if (!square) continue;
      const pieceValue = PIECE_VALUES[square.type] ?? 10;
      score += square.color === aiColor ? pieceValue : -pieceValue;
    }
  }
  return score;
}

/** Evaluate a move based on captured material */
function evaluateCapture(m: VerboseMove): number {
  let score = 0;
  if (m.captured && m.captured.length > 0) {
    for (const cap of m.captured) {
      score += PIECE_VALUES[cap.type] ?? 10;
    }
  }
  return score;
}

/** AI thinking delay in ms per difficulty */
export const AI_THINKING_DELAY: Record<AiDifficulty, number> = {
  easy: 200,
  medium: 500,
  hard: 800
};
