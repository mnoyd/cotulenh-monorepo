/**
 * Move type definitions
 */

import type { Color, PieceSymbol } from './Constants.js'
import type { Piece } from './Piece.js'
import {
  MOVE_FLAG_NORMAL,
  MOVE_FLAG_CAPTURE,
  MOVE_FLAG_STAY_CAPTURE,
  MOVE_FLAG_SUICIDE_CAPTURE,
  MOVE_FLAG_DEPLOY,
  MOVE_FLAG_COMBINATION,
} from './Constants.js'

/**
 * Move type enumeration
 */
export type MoveType =
  | 'normal'
  | 'capture'
  | 'stay-capture'
  | 'suicide-capture'
  | 'combine'
  | 'deploy-step'
  | 'deploy-complete'

/**
 * Unified Move interface - replaces both InternalMove and discriminated union types
 *
 * This single interface handles all move types with optional fields based on move type.
 * The `type` field serves the same purpose as the old `flags` field but is more type-safe.
 *
 * For performance-critical internal operations, this can be made mutable.
 * For public API, this should remain readonly.
 */
export interface Move {
  readonly type: MoveType
  readonly from: number
  readonly to: number
  readonly piece: Piece
  readonly color: Color

  // Optional fields based on move type
  readonly captured?: Piece
  readonly combined?: Piece
  readonly remaining?: readonly Piece[]
  readonly attacker?: number // for stay captures
  readonly target?: number // for stay captures
  readonly stackSquare?: number // for deploy complete
  readonly pieces?: readonly { from: number; piece: Piece }[] // for combine moves
}

/**
 * Type guards for move types
 */
export function isNormalMove(move: Move): move is Move & { type: 'normal' } {
  return move.type === 'normal'
}

export function isCaptureMove(
  move: Move,
): move is Move & { type: 'capture'; captured: Piece } {
  return move.type === 'capture'
}

export function isStayCaptureMove(
  move: Move,
): move is Move & {
  type: 'stay-capture'
  attacker: number
  target: number
  captured: Piece
} {
  return move.type === 'stay-capture'
}

export function isSuicideCaptureMove(
  move: Move,
): move is Move & { type: 'suicide-capture'; captured: Piece } {
  return move.type === 'suicide-capture'
}

export function isCombineMove(
  move: Move,
): move is Move & {
  type: 'combine'
  pieces: readonly { from: number; piece: Piece }[]
  combined: Piece
} {
  return move.type === 'combine'
}

export function isDeployStepMove(
  move: Move,
): move is Move & { type: 'deploy-step'; remaining: readonly Piece[] } {
  return move.type === 'deploy-step'
}

export function isDeployCompleteMove(
  move: Move,
): move is Move & { type: 'deploy-complete'; stackSquare: number } {
  return move.type === 'deploy-complete'
}

/**
 * Convert move type to flags (for backward compatibility)
 */
export function moveTypeToFlags(type: MoveType): number {
  switch (type) {
    case 'normal':
      return MOVE_FLAG_NORMAL
    case 'capture':
      return MOVE_FLAG_CAPTURE
    case 'stay-capture':
      return MOVE_FLAG_STAY_CAPTURE
    case 'suicide-capture':
      return MOVE_FLAG_SUICIDE_CAPTURE
    case 'deploy-step':
      return MOVE_FLAG_DEPLOY
    case 'deploy-complete':
      return MOVE_FLAG_DEPLOY
    case 'combine':
      return MOVE_FLAG_COMBINATION
    default:
      return MOVE_FLAG_NORMAL
  }
}

/**
 * Convert flags to move type (for backward compatibility)
 */
export function flagsToMoveType(flags: number): MoveType {
  if (flags & MOVE_FLAG_COMBINATION) return 'combine'
  if (flags & MOVE_FLAG_DEPLOY) return 'deploy-step'
  if (flags & MOVE_FLAG_SUICIDE_CAPTURE) return 'suicide-capture'
  if (flags & MOVE_FLAG_STAY_CAPTURE) return 'stay-capture'
  if (flags & MOVE_FLAG_CAPTURE) return 'capture'
  return 'normal'
}

/**
 * Legacy type aliases for backward compatibility
 * @deprecated Use Move interface instead
 */
export type NormalMove = Move & { type: 'normal' }
export type CaptureMove = Move & { type: 'capture'; captured: Piece }
export type StayCaptureMove = Move & {
  type: 'stay-capture'
  attacker: number
  target: number
  captured: Piece
}
export type SuicideCaptureMove = Move & {
  type: 'suicide-capture'
  captured: Piece
}
export type CombineMove = Move & {
  type: 'combine'
  pieces: readonly { from: number; piece: Piece }[]
  combined: Piece
}
export type DeployStepMove = Move & {
  type: 'deploy-step'
  remaining: readonly Piece[]
}
export type DeployCompleteMove = Move & {
  type: 'deploy-complete'
  stackSquare: number
}

/**
 * @deprecated Use Move interface instead
 */
export type InternalMove = Move

/**
 * Move creation interface - simplified to work with unified Move type
 */
export interface IMoveFactory {
  createMove(config: {
    type: MoveType
    from: number
    to: number
    piece: Piece
    color: Color
    captured?: Piece
    combined?: Piece
    remaining?: Piece[]
    attacker?: number
    target?: number
    stackSquare?: number
    pieces?: { from: number; piece: Piece }[]
  }): Move

  // Convenience methods for specific move types
  createNormalMove(from: number, to: number, piece: Piece, color: Color): Move

  createCaptureMove(
    from: number,
    to: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): Move

  createStayCaptureMove(
    attacker: number,
    target: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): Move

  createSuicideCaptureMove(
    from: number,
    to: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): Move

  createCombineMove(
    pieces: { from: number; piece: Piece }[],
    to: number,
    combined: Piece,
    color: Color,
  ): Move

  createDeployStepMove(
    from: number,
    to: number,
    piece: Piece,
    remaining: Piece[],
    color: Color,
  ): Move

  createDeployCompleteMove(stackSquare: number, color: Color): Move
}
