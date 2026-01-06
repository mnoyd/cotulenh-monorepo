import { origMoveToKey } from '@cotulenh/board';
import type { Key, Dests, OrigMoveKey, DestMove, OrigMove, Role } from '@cotulenh/board';
import type { Color, Square, MoveResult } from '@cotulenh/core';
import { BLUE, RED, CoTuLenh } from '@cotulenh/core';
import { typeToRole } from '$lib/types/translations';

export function coreToBoardColor(coreColor: Color | null): 'red' | 'blue' | undefined {
  const coreColorToBoard = (color: Color): 'red' | 'blue' => (color === 'r' ? 'red' : 'blue');
  return coreColor ? coreColorToBoard(coreColor) : undefined;
}

export function coreToBoardCheck(
  check: boolean,
  coreColor: Color | null
): 'red' | 'blue' | undefined {
  return check ? coreToBoardColor(coreColor) : undefined;
}

export function coreToBoardAirDefense(game: CoTuLenh | null): {
  red: Map<Key, Key[]>;
  blue: Map<Key, Key[]>;
} {
  if (!game) {
    return {
      red: new Map(),
      blue: new Map()
    };
  }

  const airDefense = game.getAirDefenseInfluence();
  return {
    red: airDefense[RED],
    blue: airDefense[BLUE]
  };
}

export function mapPossibleMovesToDests(possibleMoves: MoveResult[]): Dests {
  const dests = new Map<OrigMoveKey, DestMove[]>();

  for (const move of possibleMoves) {
    const fromSq = move.from as Square;
    const toSq = (move.to instanceof Map ? undefined : move.to) as Square | undefined;

    if (!toSq) continue;

    const moveOrig: OrigMove = {
      square: fromSq,
      type: typeToRole(move.piece.type) as Role
    };
    const moveDest: DestMove = {
      square: toSq,
      stay: move.isStayCapture
    };
    const key = origMoveToKey(moveOrig);
    if (!dests.has(key)) {
      dests.set(key, []);
    }
    const destList = dests.get(key);
    if (destList) {
      destList.push(moveDest);
    }
  }
  return dests;
}

export function mapLastMoveToBoardFormat(lastMove: Square[] | undefined): Key[] | undefined {
  if (!lastMove) return undefined;
  return lastMove.map((square) => square);
}
