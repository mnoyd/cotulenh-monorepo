/**
 * Move generation using bitboards for CoTuLenh chess engine.
 *
 * This module implements pseudo-legal move generation for all piece types
 * using bitboard operations for efficient move calculation.
 */

import { EMPTY, setBit, isSet, and, not, popCount, lsb } from './bitboard';
import type { Color, PieceSymbol, Piece } from './types';
import { BitboardPosition } from './position';
import { WATER_MASK, LAND_MASK } from './terrain';
import { filterIllegalMoves } from './check-detection';

/**
 * Represents a move in the game.
 */
export interface Move {
  from: number;
  to: number;
  piece: Piece;
  captured?: Piece;
  flags: number;
}

/**
 * Move flags (bitwise)
 */
export const MOVE_FLAGS = {
  NORMAL: 0,
  CAPTURE: 1,
  COMBINATION: 2,
  DEPLOY: 4,
  KAMIKAZE: 8,
  STAY_CAPTURE: 16
} as const;

/**
 * Movement direction offsets for the 11x12 board (linear indexing)
 */
const ORTHOGONAL_OFFSETS = [-11, 1, 11, -1]; // N, E, S, W
const DIAGONAL_OFFSETS = [-12, -10, 12, 10]; // NW, NE, SW, SE
const ALL_OFFSETS = [...ORTHOGONAL_OFFSETS, ...DIAGONAL_OFFSETS];

/**
 * Piece movement configuration
 */
interface PieceMovementConfig {
  moveRange: number;
  captureRange: number;
  canMoveDiagonal: boolean;
  captureIgnoresPieceBlocking: boolean;
  moveIgnoresBlocking: boolean;
}

/**
 * Base movement configurations for each piece type
 */
const BASE_MOVEMENT_CONFIG: Record<PieceSymbol, PieceMovementConfig> = {
  c: {
    // Commander
    moveRange: Infinity,
    captureRange: 1,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false
  },
  i: {
    // Infantry
    moveRange: 1,
    captureRange: 1,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false
  },
  t: {
    // Tank
    moveRange: 2,
    captureRange: 2,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false
  },
  m: {
    // Militia
    moveRange: 1,
    captureRange: 1,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false
  },
  e: {
    // Engineer
    moveRange: 1,
    captureRange: 1,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false
  },
  a: {
    // Artillery
    moveRange: 3,
    captureRange: 3,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: true,
    moveIgnoresBlocking: false
  },
  g: {
    // Anti-Air
    moveRange: 1,
    captureRange: 1,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false
  },
  s: {
    // Missile
    moveRange: 2,
    captureRange: 2,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: true,
    moveIgnoresBlocking: false
  },
  f: {
    // Air Force
    moveRange: 4,
    captureRange: 4,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: true,
    moveIgnoresBlocking: true
  },
  n: {
    // Navy
    moveRange: 4,
    captureRange: 4,
    canMoveDiagonal: true,
    captureIgnoresPieceBlocking: true,
    moveIgnoresBlocking: false
  },
  h: {
    // Headquarter
    moveRange: 0,
    captureRange: 0,
    canMoveDiagonal: false,
    captureIgnoresPieceBlocking: false,
    moveIgnoresBlocking: false
  }
};

/**
 * Gets movement configuration for a piece, applying heroic status modifications
 */
function getPieceMovementConfig(pieceType: PieceSymbol, isHeroic: boolean): PieceMovementConfig {
  const baseConfig = { ...BASE_MOVEMENT_CONFIG[pieceType] };

  if (isHeroic) {
    // Increase ranges (except for infinity)
    baseConfig.moveRange = baseConfig.moveRange === Infinity ? Infinity : baseConfig.moveRange + 1;
    baseConfig.captureRange++;
    baseConfig.canMoveDiagonal = true;

    // Special case for Headquarter
    if (pieceType === 'h') {
      baseConfig.moveRange = 1;
      baseConfig.captureRange = 1;
    }
  }

  return baseConfig;
}

/**
 * Checks if a square is on the board
 */
function isValidSquare(square: number): boolean {
  return square >= 0 && square < 132;
}

/**
 * Checks if moving from one square to another crosses a board edge
 */
function crossesBoardEdge(from: number, to: number, offset: number): boolean {
  const fromFile = from % 11;
  const toFile = to % 11;

  // Check for horizontal wrapping
  if (Math.abs(offset) === 1) {
    // Moving horizontally
    if (offset === 1 && fromFile === 10) return true; // Right edge
    if (offset === -1 && fromFile === 0) return true; // Left edge
  }

  // Check for diagonal wrapping
  if (Math.abs(offset) === 10 || Math.abs(offset) === 12) {
    if (Math.abs(fromFile - toFile) > 1) return true;
  }

  return false;
}

/**
 * Generates moves in a specific direction from a square
 */
function generateMovesInDirection(
  position: BitboardPosition,
  from: number,
  piece: Piece,
  config: PieceMovementConfig,
  offset: number,
  moves: Move[]
): void {
  const us = piece.color;
  const them: Color = us === 'r' ? 'b' : 'r';
  let currentRange = 0;
  let to = from;
  let pieceBlockedMovement = false;

  while (true) {
    to += offset;
    currentRange++;

    // Check if square is on board and doesn't cross edge
    if (!isValidSquare(to) || crossesBoardEdge(from, to, offset)) break;

    // Check if we've exceeded maximum ranges
    if (currentRange > config.moveRange && currentRange > config.captureRange) break;

    // Special case for Missile diagonal movement
    if (
      piece.type === 's' &&
      DIAGONAL_OFFSETS.includes(offset) &&
      currentRange > config.moveRange - 1
    ) {
      break;
    }

    const targetPiece = position.getPieceAt(to);

    if (targetPiece) {
      // Capture logic
      if (targetPiece.color === them && currentRange <= config.captureRange) {
        // Use handleCaptureLogic to handle normal and stay captures
        handleCaptureLogic(
          moves,
          from,
          to,
          piece,
          targetPiece,
          currentRange,
          config,
          false // isDeployMove - will be updated for deploy moves
        );
      } else if (targetPiece.color === us) {
        // Combination logic (friendly piece)
        if (currentRange <= config.moveRange && !pieceBlockedMovement) {
          // Check if combination is valid
          if (canCombinePieces(piece, targetPiece) && canPieceStayOnSquare(piece.type, to)) {
            moves.push({
              from,
              to,
              piece,
              captured: targetPiece,
              flags: MOVE_FLAGS.COMBINATION
            });
          }
        }
      }

      // Piece blocking check
      if (!config.moveIgnoresBlocking) {
        // Navy can move through friendly pieces
        if (!(piece.type === 'n' && targetPiece.color === us)) {
          pieceBlockedMovement = true;
        }
      }

      // Stop if blocked and can't capture through pieces
      if (pieceBlockedMovement && !config.captureIgnoresPieceBlocking) {
        break;
      }
    } else if (currentRange <= config.moveRange && !pieceBlockedMovement) {
      // Move to empty square
      // Check terrain restrictions
      if (canPieceStayOnSquare(piece.type, to)) {
        moves.push({
          from,
          to,
          piece,
          flags: MOVE_FLAGS.NORMAL
        });
      }
    }
  }
}

/**
 * Checks if a piece can stay on a square (terrain validation)
 */
function canPieceStayOnSquare(pieceType: PieceSymbol, square: number): boolean {
  if (pieceType === 'n') {
    return isSet(WATER_MASK, square);
  } else {
    return isSet(LAND_MASK, square);
  }
}

/**
 * Handles capture logic including stay capture mechanics
 * @param moves - Array to add moves to
 * @param from - Source square
 * @param to - Target square
 * @param attacker - Attacking piece
 * @param target - Target piece being captured
 * @param currentRange - Current range of the move
 * @param config - Movement configuration
 * @param isDeployMove - Whether this is a deploy move
 */
function handleCaptureLogic(
  moves: Move[],
  from: number,
  to: number,
  attacker: Piece,
  target: Piece,
  currentRange: number,
  config: PieceMovementConfig,
  isDeployMove: boolean
): void {
  let addNormalCapture = true;
  let addStayCapture = false;

  // Check if attacker can stay on target square (terrain compatibility)
  const canLandOnTarget = canPieceStayOnSquare(attacker.type, to);

  if (!canLandOnTarget) {
    // Terrain incompatible → stay capture only
    addStayCapture = true;
    addNormalCapture = false;
  }

  // Air Force special case: can choose both options (except Navy at sea)
  if (attacker.type === 'f') {
    // Air Force
    if (canLandOnTarget) {
      // Can land on target → offer both options (unless in deploy mode)
      if (!isDeployMove) {
        addStayCapture = true; // Add stay capture option
      }
      addNormalCapture = true; // Keep normal capture option
    } else {
      // Can't land (e.g., Navy at sea) → stay capture only
      addStayCapture = true;
      addNormalCapture = false;
    }
  }

  // Commander special rule: only captures adjacent
  if (attacker.type === 'c' && currentRange > 1) {
    return; // No capture allowed
  }

  // Navy special attack mechanisms
  if (attacker.type === 'n') {
    if (target.type === 'n') {
      // Torpedo attack (Navy vs Navy)
      if (currentRange > config.captureRange) {
        return; // Out of range
      }
    } else {
      // Naval Gun attack (Navy vs Land)
      if (currentRange > config.captureRange - 1) {
        return; // Out of range
      }
    }
  }

  // Add the appropriate capture moves
  if (addNormalCapture) {
    moves.push({
      from,
      to,
      piece: attacker,
      captured: target,
      flags: MOVE_FLAGS.CAPTURE
    });
  }

  if (addStayCapture) {
    moves.push({
      from,
      to,
      piece: attacker,
      captured: target,
      flags: MOVE_FLAGS.STAY_CAPTURE
    });
  }
}

/**
 * Checks if two pieces can be combined into a stack
 */
function canCombinePieces(piece1: Piece, piece2: Piece): boolean {
  // Same color required
  if (piece1.color !== piece2.color) return false;

  // Can't combine if either is already carrying pieces
  if (piece1.carrying || piece2.carrying) return false;

  // Can't combine two commanders
  if (piece1.type === 'c' && piece2.type === 'c') return false;

  // Can't combine two headquarters
  if (piece1.type === 'h' && piece2.type === 'h') return false;

  return true;
}

/**
 * Generates pseudo-legal moves for Infantry pieces
 */
export function generateInfantryMoves(position: BitboardPosition, color: Color): Move[] {
  const moves: Move[] = [];
  const infantryBitboard = position.getPiecesOfType('i', color);

  // Iterate through all infantry pieces
  let bb = { ...infantryBitboard };
  while (popCount(bb) > 0) {
    const square = lsb(bb);
    if (square === -1) break;

    const piece = position.getPieceAt(square);
    if (!piece) break;

    const config = getPieceMovementConfig('i', piece.heroic || false);
    const offsets = config.canMoveDiagonal ? ALL_OFFSETS : ORTHOGONAL_OFFSETS;

    for (const offset of offsets) {
      generateMovesInDirection(position, square, piece, config, offset, moves);
    }

    // Clear this bit
    bb = and(bb, not(setBit(EMPTY, square)));
  }

  return moves;
}

/**
 * Generates pseudo-legal moves for Tank pieces
 */
export function generateTankMoves(position: BitboardPosition, color: Color): Move[] {
  const moves: Move[] = [];
  const tankBitboard = position.getPiecesOfType('t', color);

  let bb = { ...tankBitboard };
  while (popCount(bb) > 0) {
    const square = lsb(bb);
    if (square === -1) break;

    const piece = position.getPieceAt(square);
    if (!piece) break;

    const config = getPieceMovementConfig('t', piece.heroic || false);
    const offsets = config.canMoveDiagonal ? ALL_OFFSETS : ORTHOGONAL_OFFSETS;

    for (const offset of offsets) {
      generateMovesInDirection(position, square, piece, config, offset, moves);
    }

    bb = and(bb, not(setBit(EMPTY, square)));
  }

  return moves;
}

/**
 * Generates pseudo-legal moves for Commander pieces
 */
export function generateCommanderMoves(position: BitboardPosition, color: Color): Move[] {
  const moves: Move[] = [];
  const commanderBitboard = position.getPiecesOfType('c', color);

  let bb = { ...commanderBitboard };
  while (popCount(bb) > 0) {
    const square = lsb(bb);
    if (square === -1) break;

    const piece = position.getPieceAt(square);
    if (!piece) break;

    const config = getPieceMovementConfig('c', piece.heroic || false);

    // Commander moves orthogonally only (unless heroic)
    const offsets = config.canMoveDiagonal ? ALL_OFFSETS : ORTHOGONAL_OFFSETS;

    for (const offset of offsets) {
      generateMovesInDirection(position, square, piece, config, offset, moves);
    }

    bb = and(bb, not(setBit(EMPTY, square)));
  }

  return moves;
}

/**
 * Generates pseudo-legal moves for Militia pieces
 */
export function generateMilitiaMoves(position: BitboardPosition, color: Color): Move[] {
  const moves: Move[] = [];
  const militiaBitboard = position.getPiecesOfType('m', color);

  let bb = { ...militiaBitboard };
  while (popCount(bb) > 0) {
    const square = lsb(bb);
    if (square === -1) break;

    const piece = position.getPieceAt(square);
    if (!piece) break;

    const config = getPieceMovementConfig('m', piece.heroic || false);

    // Militia can move diagonally
    for (const offset of ALL_OFFSETS) {
      generateMovesInDirection(position, square, piece, config, offset, moves);
    }

    bb = and(bb, not(setBit(EMPTY, square)));
  }

  return moves;
}

/**
 * Generates pseudo-legal moves for Engineer pieces
 */
export function generateEngineerMoves(position: BitboardPosition, color: Color): Move[] {
  const moves: Move[] = [];
  const engineerBitboard = position.getPiecesOfType('e', color);

  let bb = { ...engineerBitboard };
  while (popCount(bb) > 0) {
    const square = lsb(bb);
    if (square === -1) break;

    const piece = position.getPieceAt(square);
    if (!piece) break;

    const config = getPieceMovementConfig('e', piece.heroic || false);
    const offsets = config.canMoveDiagonal ? ALL_OFFSETS : ORTHOGONAL_OFFSETS;

    for (const offset of offsets) {
      generateMovesInDirection(position, square, piece, config, offset, moves);
    }

    bb = and(bb, not(setBit(EMPTY, square)));
  }

  return moves;
}

/**
 * Generates pseudo-legal moves for Artillery pieces
 */
export function generateArtilleryMoves(position: BitboardPosition, color: Color): Move[] {
  const moves: Move[] = [];
  const artilleryBitboard = position.getPiecesOfType('a', color);

  let bb = { ...artilleryBitboard };
  while (popCount(bb) > 0) {
    const square = lsb(bb);
    if (square === -1) break;

    const piece = position.getPieceAt(square);
    if (!piece) break;

    const config = getPieceMovementConfig('a', piece.heroic || false);

    // Artillery can move diagonally
    for (const offset of ALL_OFFSETS) {
      generateMovesInDirection(position, square, piece, config, offset, moves);
    }

    bb = and(bb, not(setBit(EMPTY, square)));
  }

  return moves;
}

/**
 * Generates pseudo-legal moves for Anti-Air pieces
 */
export function generateAntiAirMoves(position: BitboardPosition, color: Color): Move[] {
  const moves: Move[] = [];
  const antiAirBitboard = position.getPiecesOfType('g', color);

  let bb = { ...antiAirBitboard };
  while (popCount(bb) > 0) {
    const square = lsb(bb);
    if (square === -1) break;

    const piece = position.getPieceAt(square);
    if (!piece) break;

    const config = getPieceMovementConfig('g', piece.heroic || false);
    const offsets = config.canMoveDiagonal ? ALL_OFFSETS : ORTHOGONAL_OFFSETS;

    for (const offset of offsets) {
      generateMovesInDirection(position, square, piece, config, offset, moves);
    }

    bb = and(bb, not(setBit(EMPTY, square)));
  }

  return moves;
}

/**
 * Generates pseudo-legal moves for Missile pieces
 */
export function generateMissileMoves(position: BitboardPosition, color: Color): Move[] {
  const moves: Move[] = [];
  const missileBitboard = position.getPiecesOfType('s', color);

  let bb = { ...missileBitboard };
  while (popCount(bb) > 0) {
    const square = lsb(bb);
    if (square === -1) break;

    const piece = position.getPieceAt(square);
    if (!piece) break;

    const config = getPieceMovementConfig('s', piece.heroic || false);

    // Missile can move diagonally
    for (const offset of ALL_OFFSETS) {
      generateMovesInDirection(position, square, piece, config, offset, moves);
    }

    bb = and(bb, not(setBit(EMPTY, square)));
  }

  return moves;
}

/**
 * Generates pseudo-legal moves for Air Force pieces
 */
export function generateAirForceMoves(position: BitboardPosition, color: Color): Move[] {
  const moves: Move[] = [];
  const airForceBitboard = position.getPiecesOfType('f', color);

  let bb = { ...airForceBitboard };
  while (popCount(bb) > 0) {
    const square = lsb(bb);
    if (square === -1) break;

    const piece = position.getPieceAt(square);
    if (!piece) break;

    const config = getPieceMovementConfig('f', piece.heroic || false);

    // Air Force can move diagonally
    for (const offset of ALL_OFFSETS) {
      generateMovesInDirection(position, square, piece, config, offset, moves);
    }

    bb = and(bb, not(setBit(EMPTY, square)));
  }

  return moves;
}

/**
 * Generates pseudo-legal moves for Navy pieces
 */
export function generateNavyMoves(position: BitboardPosition, color: Color): Move[] {
  const moves: Move[] = [];
  const navyBitboard = position.getPiecesOfType('n', color);

  let bb = { ...navyBitboard };
  while (popCount(bb) > 0) {
    const square = lsb(bb);
    if (square === -1) break;

    const piece = position.getPieceAt(square);
    if (!piece) break;

    const config = getPieceMovementConfig('n', piece.heroic || false);

    // Navy can move diagonally
    for (const offset of ALL_OFFSETS) {
      generateMovesInDirection(position, square, piece, config, offset, moves);
    }

    bb = and(bb, not(setBit(EMPTY, square)));
  }

  return moves;
}

/**
 * Generates pseudo-legal moves for Headquarter pieces
 */
export function generateHeadquarterMoves(position: BitboardPosition, color: Color): Move[] {
  const moves: Move[] = [];
  const headquarterBitboard = position.getPiecesOfType('h', color);

  let bb = { ...headquarterBitboard };
  while (popCount(bb) > 0) {
    const square = lsb(bb);
    if (square === -1) break;

    const piece = position.getPieceAt(square);
    if (!piece) break;

    const config = getPieceMovementConfig('h', piece.heroic || false);

    // Headquarter normally can't move (unless heroic)
    if (config.moveRange > 0) {
      const offsets = config.canMoveDiagonal ? ALL_OFFSETS : ORTHOGONAL_OFFSETS;

      for (const offset of offsets) {
        generateMovesInDirection(position, square, piece, config, offset, moves);
      }
    }

    bb = and(bb, not(setBit(EMPTY, square)));
  }

  return moves;
}

/**
 * Generates all pseudo-legal moves for a color
 */
export function generateAllMoves(position: BitboardPosition, color: Color): Move[] {
  return [
    ...generateInfantryMoves(position, color),
    ...generateTankMoves(position, color),
    ...generateCommanderMoves(position, color),
    ...generateMilitiaMoves(position, color),
    ...generateEngineerMoves(position, color),
    ...generateArtilleryMoves(position, color),
    ...generateAntiAirMoves(position, color),
    ...generateMissileMoves(position, color),
    ...generateAirForceMoves(position, color),
    ...generateNavyMoves(position, color),
    ...generateHeadquarterMoves(position, color)
  ];
}

/**
 * Options for filtering moves
 */
export interface MoveFilterOptions {
  square?: number; // Filter moves from this square only
  pieceType?: PieceSymbol; // Filter moves for this piece type only
}

/**
 * Filters moves by square (only moves from the specified square)
 */
function filterBySquare(moves: Move[], square: number): Move[] {
  return moves.filter((move) => move.from === square);
}

/**
 * Filters moves by piece type (only moves for the specified piece type)
 */
function filterByPieceType(moves: Move[], pieceType: PieceSymbol): Move[] {
  return moves.filter((move) => move.piece.type === pieceType);
}

/**
 * Applies air defense restrictions to air force moves
 */
function applyAirDefenseRestrictions(
  moves: Move[],
  position: BitboardPosition,
  color: Color
): Move[] {
  const enemyColor: Color = color === 'r' ? 'b' : 'r';
  const filteredMoves: Move[] = [];

  for (const move of moves) {
    // Only apply to air force pieces
    if (move.piece.type !== 'f') {
      filteredMoves.push(move);
      continue;
    }

    // Check if destination is in enemy air defense zone
    const airDefenseCheck = position.checkAirForceMove(move.to, enemyColor);

    if (airDefenseCheck.allowed) {
      // Mark as kamikaze if entering defended zone
      if (airDefenseCheck.isKamikaze) {
        filteredMoves.push({
          ...move,
          flags: move.flags | MOVE_FLAGS.KAMIKAZE
        });
      } else {
        filteredMoves.push(move);
      }
    }
    // If not allowed, don't add the move
  }

  return filteredMoves;
}

/**
 * Generates moves with filtering options
 */
export function generateMoves(
  position: BitboardPosition,
  color: Color,
  options?: MoveFilterOptions
): Move[] {
  let moves: Move[] = [];

  // Generate moves based on filters
  if (options?.square !== undefined) {
    // Generate moves only for the piece at the specified square
    const piece = position.getPieceAt(options.square);
    if (piece?.color === color) {
      // Generate moves for this specific piece type
      switch (piece.type) {
        case 'i':
          moves = generateInfantryMoves(position, color);
          break;
        case 't':
          moves = generateTankMoves(position, color);
          break;
        case 'c':
          moves = generateCommanderMoves(position, color);
          break;
        case 'm':
          moves = generateMilitiaMoves(position, color);
          break;
        case 'e':
          moves = generateEngineerMoves(position, color);
          break;
        case 'a':
          moves = generateArtilleryMoves(position, color);
          break;
        case 'g':
          moves = generateAntiAirMoves(position, color);
          break;
        case 's':
          moves = generateMissileMoves(position, color);
          break;
        case 'f':
          moves = generateAirForceMoves(position, color);
          break;
        case 'n':
          moves = generateNavyMoves(position, color);
          break;
        case 'h':
          moves = generateHeadquarterMoves(position, color);
          break;
      }
      // Filter to only moves from this square
      moves = filterBySquare(moves, options.square);
    }
  } else if (options?.pieceType !== undefined) {
    // Generate moves only for the specified piece type
    switch (options.pieceType) {
      case 'i':
        moves = generateInfantryMoves(position, color);
        break;
      case 't':
        moves = generateTankMoves(position, color);
        break;
      case 'c':
        moves = generateCommanderMoves(position, color);
        break;
      case 'm':
        moves = generateMilitiaMoves(position, color);
        break;
      case 'e':
        moves = generateEngineerMoves(position, color);
        break;
      case 'a':
        moves = generateArtilleryMoves(position, color);
        break;
      case 'g':
        moves = generateAntiAirMoves(position, color);
        break;
      case 's':
        moves = generateMissileMoves(position, color);
        break;
      case 'f':
        moves = generateAirForceMoves(position, color);
        break;
      case 'n':
        moves = generateNavyMoves(position, color);
        break;
      case 'h':
        moves = generateHeadquarterMoves(position, color);
        break;
    }
  } else {
    // Generate all moves
    moves = generateAllMoves(position, color);
  }

  // Apply air defense restrictions
  moves = applyAirDefenseRestrictions(moves, position, color);

  return moves;
}

/**
 * Generates legal moves (pseudo-legal moves filtered for legality)
 */
export function generateLegalMoves(
  position: BitboardPosition,
  color: Color,
  options?: MoveFilterOptions
): Move[] {
  // Generate pseudo-legal moves
  let moves = generateMoves(position, color, options);

  // Filter out illegal moves
  moves = filterIllegalMoves(position, moves);

  return moves;
}

/**
 * Generates deploy moves for the active deploy session
 */
function generateDeployMoves(position: BitboardPosition): Move[] {
  const session = position.getDeploySession();
  if (!session) return [];

  const moves: Move[] = [];

  // Get remaining pieces to deploy
  for (const piece of session.remainingPieces) {
    // Generate moves for this piece from the stack square
    const config = getPieceMovementConfig(piece.type, piece.heroic || false);
    const offsets = config.canMoveDiagonal ? ALL_OFFSETS : ORTHOGONAL_OFFSETS;

    for (const offset of offsets) {
      generateMovesInDirection(position, session.stackSquare, piece, config, offset, moves);
    }
  }

  // Mark all moves as deploy moves
  return moves.map((move) => ({
    ...move,
    flags: move.flags | MOVE_FLAGS.DEPLOY
  }));
}

/**
 * Generates moves considering deploy session state
 */
export function generateMovesWithDeploySession(
  position: BitboardPosition,
  color: Color,
  options?: MoveFilterOptions
): Move[] {
  // Check if there's an active deploy session
  if (position.hasActiveDeploySession()) {
    // Only generate deploy moves when session is active
    const deployMoves = generateDeployMoves(position);

    // Apply filtering if specified
    if (options?.square !== undefined) {
      return filterBySquare(deployMoves, options.square);
    }
    if (options?.pieceType !== undefined) {
      return filterByPieceType(deployMoves, options.pieceType);
    }

    return deployMoves;
  }

  // No active session - generate normal moves
  return generateLegalMoves(position, color, options);
}

/**
 * Move cache for storing generated moves
 */
class MoveCache {
  private readonly cache: Map<string, Move[]> = new Map();

  /**
   * Creates a cache key from position and options
   */
  private createKey(position: BitboardPosition, color: Color, options?: MoveFilterOptions): string {
    // Create a simple hash of the position state
    const parts: string[] = [
      color,
      position.occupied.low.toString(),
      position.occupied.high.toString(),
      position.redPieces.low.toString(),
      position.redPieces.high.toString(),
      position.bluePieces.low.toString(),
      position.bluePieces.high.toString()
    ];

    // Add deploy session state if active
    const session = position.getDeploySession();
    if (session) {
      parts.push(
        'deploy',
        session.stackSquare.toString(),
        session.remainingPieces.length.toString()
      );
    }

    // Add filter options
    if (options?.square !== undefined) {
      parts.push('sq', options.square.toString());
    }
    if (options?.pieceType !== undefined) {
      parts.push('pt', options.pieceType);
    }

    return parts.join(':');
  }

  /**
   * Gets cached moves if available
   */
  get(position: BitboardPosition, color: Color, options?: MoveFilterOptions): Move[] | undefined {
    const key = this.createKey(position, color, options);
    return this.cache.get(key);
  }

  /**
   * Stores moves in cache
   */
  set(
    position: BitboardPosition,
    color: Color,
    options: MoveFilterOptions | undefined,
    moves: Move[]
  ): void {
    const key = this.createKey(position, color, options);
    this.cache.set(key, moves);
  }

  /**
   * Clears the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache size
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Global move cache instance
 */
const moveCache = new MoveCache();

/**
 * Generates moves with caching
 */
export function generateMovesWithCache(
  position: BitboardPosition,
  color: Color,
  options?: MoveFilterOptions
): Move[] {
  // Check cache first
  const cached = moveCache.get(position, color, options);
  if (cached) {
    return cached;
  }

  // Generate moves
  const moves = generateMovesWithDeploySession(position, color, options);

  // Store in cache
  moveCache.set(position, color, options, moves);

  return moves;
}

/**
 * Invalidates the move cache (call when position changes)
 */
export function invalidateMoveCache(): void {
  moveCache.clear();
}

/**
 * Gets the size of the move cache
 */
export function getMoveCacheSize(): number {
  return moveCache.size();
}
