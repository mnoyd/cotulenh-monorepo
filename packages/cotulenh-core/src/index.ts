/**
 * Main entry point for cotulenh-core package
 */

// Re-export main API
export { CoTuLenh, createGame } from './CoTuLenh.js'

// Re-export types
export type { Piece, IPieceUtils } from './types/Piece.js'
export type { IBoard } from './types/Board.js'
export type {
  Move,
  NormalMove,
  CaptureMove,
  StayCaptureMove,
  SuicideCaptureMove,
  CombineMove,
  DeployStepMove,
  DeployCompleteMove,
} from './types/Move.js'
export type {
  IGameState,
  IDeploySession,
  GameStateConfig,
} from './types/GameState.js'
export type { Color, PieceSymbol } from './types/Constants.js'

// Re-export constants
export {
  RED,
  BLUE,
  COMMANDER,
  INFANTRY,
  TANK,
  MILITIA,
  ENGINEER,
  ARTILLERY,
  ANTI_AIR,
  MISSILE,
  AIR_FORCE,
  NAVY,
  HEADQUARTER,
  PIECE_TYPES,
  HEAVY_PIECES,
} from './types/Constants.js'

// Re-export core classes
export { Board } from './core/Board.js'
export { pieceUtils } from './core/Piece.js'
export { moveFactory } from './core/Move.js'
export { GameState } from './core/GameState.js'
export { DeploySession } from './core/DeploySession.js'

// Re-export move generation
export * from './move-generation/index.js'

// Re-export move validation
export * from './move-validation/index.js'

// Re-export serialization
export * from './serialization/index.js'

// Re-export game controller
export * from './game/index.js'

// Re-export history
export * from './history/index.js'

// Re-export utilities
export {
  algebraicToSquare,
  squareToAlgebraic,
  getFile,
  getRank,
  isValidSquare,
} from './utils/square.js'
export {
  isNavySquare,
  isLandSquare,
  canPlaceOnSquare,
  canHeavyPieceCrossRiver,
} from './utils/terrain.js'
export { DEFAULT_POSITION, PIECE_NAMES } from './utils/constants.js'

// Re-export bitboard utilities
export * as BitboardUtils from './bitboard/bitboard-utils.js'
export * from './bitboard/circle-masks.js'
export * from './bitboard/air-defense-bitboard.js'
