/**
 * Move creation and utilities
 */

import type { Color } from '../types/Constants.js'
import type { Piece } from '../types/Piece.js'
import type { Move, MoveType, IMoveFactory } from '../types/Move.js'

/**
 * Move factory implementation
 */
export class MoveFactory implements IMoveFactory {
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
  }): Move {
    return {
      type: config.type,
      from: config.from,
      to: config.to,
      piece: config.piece,
      color: config.color,
      ...(config.captured && { captured: config.captured }),
      ...(config.combined && { combined: config.combined }),
      ...(config.remaining && { remaining: config.remaining }),
      ...(config.attacker !== undefined && { attacker: config.attacker }),
      ...(config.target !== undefined && { target: config.target }),
      ...(config.stackSquare !== undefined && {
        stackSquare: config.stackSquare,
      }),
      ...(config.pieces && { pieces: config.pieces }),
    }
  }

  createNormalMove(from: number, to: number, piece: Piece, color: Color): Move {
    return this.createMove({
      type: 'normal',
      from,
      to,
      piece,
      color,
    })
  }

  createCaptureMove(
    from: number,
    to: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): Move {
    return this.createMove({
      type: 'capture',
      from,
      to,
      piece,
      captured,
      color,
    })
  }

  createStayCaptureMove(
    attacker: number,
    target: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): Move {
    return this.createMove({
      type: 'stay-capture',
      from: attacker, // For compatibility
      to: target, // For compatibility
      attacker,
      target,
      piece,
      captured,
      color,
    })
  }

  createSuicideCaptureMove(
    from: number,
    to: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): Move {
    return this.createMove({
      type: 'suicide-capture',
      from,
      to,
      piece,
      captured,
      color,
    })
  }

  createCombineMove(
    pieces: { from: number; piece: Piece }[],
    to: number,
    combined: Piece,
    color: Color,
  ): Move {
    return this.createMove({
      type: 'combine',
      from: pieces[0]?.from || 0, // For compatibility
      to,
      piece: pieces[0]?.piece || combined, // For compatibility
      pieces,
      combined,
      color,
    })
  }

  createDeployStepMove(
    from: number,
    to: number,
    piece: Piece,
    remaining: Piece[],
    color: Color,
  ): Move {
    return this.createMove({
      type: 'deploy-step',
      from,
      to,
      piece,
      remaining,
      color,
    })
  }

  createDeployCompleteMove(stackSquare: number, color: Color): Move {
    return this.createMove({
      type: 'deploy-complete',
      from: stackSquare, // For compatibility
      to: stackSquare, // For compatibility
      piece: { type: 'c', color }, // Dummy piece for compatibility
      stackSquare,
      color,
    })
  }
}

/**
 * Singleton move factory
 */
export const moveFactory = new MoveFactory()

// Type guard utilities are now exported from types/Move.ts

/**
 * Check if move involves a capture
 */
export function isCaptureType(move: Move): boolean {
  return (
    move.type === 'capture' ||
    move.type === 'stay-capture' ||
    move.type === 'suicide-capture'
  )
}
