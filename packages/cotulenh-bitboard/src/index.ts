/**
 * @repo/cotulenh-bitboard
 *
 * High-performance bitboard-based implementation of the CoTuLenh chess engine.
 *
 * This package provides a complete rewrite of CoTuLenh using bitboard architecture
 * for significant performance improvements while maintaining API compatibility with
 * @repo/cotulenh-core.
 *
 * @example
 * ```typescript
 * import { CoTuLenh } from '@repo/cotulenh-bitboard'
 *
 * const game = new CoTuLenh()
 * console.log(game.moves())
 * ```
 *
 * @packageDocumentation
 */

// TODO: Implement CoTuLenh class with bitboard architecture
// See docs/IMPLEMENTATION-GUIDE.md for detailed implementation plan

/**
 * Placeholder for the main CoTuLenh class.
 * This will be implemented following the bitboard architecture design.
 */
export class CoTuLenh {
  constructor() {
    throw new Error('CoTuLenh bitboard implementation is under development');
  }
}

// Export types and interfaces
export type { Piece, Color, Square, PieceSymbol } from './types';

// Export bitboard types and operations
export type {
  Bitboard,
  BitboardBinaryOp,
  BitboardUnaryOp,
  BitboardSquareQuery,
  BitboardSquareModify
} from './bitboard';

export {
  EMPTY,
  FULL,
  and,
  or,
  xor,
  not,
  isSet,
  setBit,
  clearBit,
  popCount,
  lsb,
  msb,
  squareToBit,
  bitToSquare,
  isValidSquare,
  isValidBit
} from './bitboard';

// Export position representation
export { BitboardPosition } from './position';

// Export stack manager
export { StackManager } from './stack-manager';
export type { StackData } from './stack-manager';

// Export deploy session manager
export {
  DeploySessionManager,
  createDeploySession,
  isDeploySessionComplete,
  getRemainingPieceCount,
  isPieceAvailableToDeploy
} from './deploy-session';
export type { DeploySession, DeployMove } from './deploy-session';

// Export terrain masks and validation
export {
  WATER_MASK,
  LAND_MASK,
  isWaterSquare,
  isLandSquare,
  maskWithWater,
  maskWithLand,
  applyTerrainRestrictions
} from './terrain';

// Export air defense zone calculator
export {
  AirDefenseZoneCalculator,
  BASE_AIRDEFENSE_CONFIG,
  getAirDefenseLevel,
  AirDefenseResult
} from './air-defense';
export type { AirDefenseZones, AntiAirPositions, AirDefenseResultType } from './air-defense';

// Export move generator
export {
  generateInfantryMoves,
  generateTankMoves,
  generateCommanderMoves,
  generateMilitiaMoves,
  generateEngineerMoves,
  generateArtilleryMoves,
  generateAntiAirMoves,
  generateMissileMoves,
  generateAirForceMoves,
  generateNavyMoves,
  generateHeadquarterMoves,
  generateAllMoves,
  generateMoves,
  generateLegalMoves,
  generateMovesWithDeploySession,
  generateMovesWithCache,
  invalidateMoveCache,
  getMoveCacheSize,
  MOVE_FLAGS
} from './move-generator';
export type { Move, MoveFilterOptions } from './move-generator';

// Export check and checkmate detection
export {
  findCommanderSquare,
  trackCommanderPositions,
  updateCommanderPosition,
  isSquareAttacked,
  getAttackers,
  isCheck,
  isCommanderExposed,
  isMoveLegal,
  filterIllegalMoves,
  isCheckmate,
  isStalemate
} from './check-detection';

// Export bridge layer for UI integration
export type { GameBridge, UIMove, UIPiece, UIGameState, UILegalMoves, GameEvents } from './bridge';
export { BitboardGameBridge } from './game-bridge';

// Export FEN parsing and generation
export {
  parseFEN,
  generateFEN,
  validateFEN,
  squareToAlgebraic,
  algebraicToSquare,
  DEFAULT_POSITION
} from './fen';
export type { ParsedFEN } from './fen';

// Version
export const VERSION = '0.1.0';
