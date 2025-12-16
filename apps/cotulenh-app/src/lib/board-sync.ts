import type { CoTuLenh, StandardMove as Move, Color, Square } from '@repo/cotulenh-core';
import { BLUE, RED } from '@repo/cotulenh-core';
import type { Dests, OrigMove, DestMove, OrigMoveKey, Key, Config } from '@repo/cotulenh-board';
import { origMoveToKey } from '@repo/cotulenh-board';
import { typeToRole, coreColorToBoardOrUndefined } from './mappers';
import type { GameState } from './types/game';

// ============================================================================
// BOARD CONFIGURATION
// ============================================================================

/**
 * Create board configuration from game state
 */
export function createBoardConfig(
  gameState: GameState,
  handlers: {
    onMove: (orig: OrigMove, dest: DestMove) => void;
    onCommit: () => void;
    onCancel: () => void;
  }
): Partial<Config> {
  return {
    fen: gameState.fen,
    turnColor: coreColorToBoardOrUndefined(gameState.turn),
    lastMove: mapLastMove(gameState.lastMove),
    check: gameState.check ? coreColorToBoardOrUndefined(gameState.turn) : undefined,
    movable: {
      free: false,
      color: coreColorToBoardOrUndefined(gameState.turn),
      dests: mapMovesToDests(gameState.possibleMoves),
      events: {
        after: handlers.onMove,
        session: {
          cancel: handlers.onCancel,
          complete: handlers.onCommit
        }
      }
    }
  };
}

/**
 * Get air defense influence zones from game
 */
export function getAirDefenseZones(game: CoTuLenh | null): {
  red: Map<Key, Key[]>;
  blue: Map<Key, Key[]>;
} {
  if (!game) {
    return { red: new Map(), blue: new Map() };
  }

  const airDefense = game.getAirDefenseInfluence();
  return {
    red: airDefense[RED],
    blue: airDefense[BLUE]
  };
}

// ============================================================================
// MOVE MAPPING
// ============================================================================

/**
 * Convert core moves to board destination format
 */
export function mapMovesToDests(moves: Move[]): Dests {
  const dests = new Map<OrigMoveKey, DestMove[]>();

  for (const move of moves) {
    const orig: OrigMove = {
      square: move.from,
      type: typeToRole(move.piece.type)
    };
    const dest: DestMove = {
      square: move.to,
      stay: move.isStayCapture()
    };

    const key = origMoveToKey(orig);
    if (!dests.has(key)) {
      dests.set(key, []);
    }
    dests.get(key)!.push(dest);
  }

  return dests;
}

/**
 * Convert last move squares to board format
 */
export function mapLastMove(lastMove: Square[] | undefined): Key[] | undefined {
  return lastMove;
}
