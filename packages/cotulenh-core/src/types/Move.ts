/**
 * Move type definitions
 */

import type { Color, PieceSymbol } from './Constants.js'
import type { Piece } from './Piece.js'

/**
 * Move types as discriminated union
 * Each move type is explicitly typed for compiler exhaustiveness checking
 */

export type Move =
  | NormalMove
  | CaptureMove
  | StayCaptureMove
  | SuicideCaptureMove
  | CombineMove
  | DeployStepMove
  | DeployCompleteMove

/**
 * Normal move - piece moves from A to B
 */
export interface NormalMove {
  readonly type: 'normal'
  readonly from: number
  readonly to: number
  readonly piece: Piece
  readonly color: Color
}

/**
 * Capture move - piece moves and captures enemy piece
 */
export interface CaptureMove {
  readonly type: 'capture'
  readonly from: number
  readonly to: number
  readonly piece: Piece
  readonly captured: Piece
  readonly color: Color
}

/**
 * Stay capture - piece captures without moving (Artillery/Navy)
 */
export interface StayCaptureMove {
  readonly type: 'stay-capture'
  readonly attacker: number // Attacker stays here
  readonly target: number // Target square
  readonly piece: Piece // Attacking piece
  readonly captured: Piece
  readonly color: Color
}

/**
 * Suicide capture - Air Force destroyed by air defense while capturing
 */
export interface SuicideCaptureMove {
  readonly type: 'suicide-capture'
  readonly from: number
  readonly to: number
  readonly piece: Piece // Air Force
  readonly captured: Piece
  readonly color: Color
}

/**
 * Combine move - multiple pieces move together to form stack
 */
export interface CombineMove {
  readonly type: 'combine'
  readonly pieces: readonly { from: number; piece: Piece }[]
  readonly to: number
  readonly combined: Piece // Resulting stack
  readonly color: Color
}

/**
 * Deploy step - one piece from stack moves during deploy phase
 */
export interface DeployStepMove {
  readonly type: 'deploy-step'
  readonly from: number // Stack square
  readonly to: number // Destination
  readonly piece: Piece // Piece being deployed
  readonly remaining: readonly Piece[] // Pieces still on stack
  readonly color: Color
}

/**
 * Deploy complete - marks end of deploy phase
 */
export interface DeployCompleteMove {
  readonly type: 'deploy-complete'
  readonly stackSquare: number
  readonly color: Color
}

/**
 * Internal move representation (mutable for performance)
 */
export interface InternalMove {
  color: Color
  from: number
  to: number
  piece: Piece
  captured?: Piece
  combined?: Piece
  flags: number
}

/**
 * Move creation interface
 */
export interface IMoveFactory {
  createNormalMove(
    from: number,
    to: number,
    piece: Piece,
    color: Color,
  ): NormalMove

  createCaptureMove(
    from: number,
    to: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): CaptureMove

  createStayCaptureMove(
    attacker: number,
    target: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): StayCaptureMove

  createSuicideCaptureMove(
    from: number,
    to: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): SuicideCaptureMove

  createCombineMove(
    pieces: { from: number; piece: Piece }[],
    to: number,
    combined: Piece,
    color: Color,
  ): CombineMove

  createDeployStepMove(
    from: number,
    to: number,
    piece: Piece,
    remaining: Piece[],
    color: Color,
  ): DeployStepMove

  createDeployCompleteMove(
    stackSquare: number,
    color: Color,
  ): DeployCompleteMove
}
