/**
 * Move creation and utilities
 */

import type { Color } from '../types/Constants.js'
import type { Piece } from '../types/Piece.js'
import type {
  Move,
  NormalMove,
  CaptureMove,
  StayCaptureMove,
  SuicideCaptureMove,
  CombineMove,
  DeployStepMove,
  DeployCompleteMove,
  IMoveFactory,
} from '../types/Move.js'

/**
 * Move factory implementation
 */
export class MoveFactory implements IMoveFactory {
  createNormalMove(
    from: number,
    to: number,
    piece: Piece,
    color: Color,
  ): NormalMove {
    return {
      type: 'normal',
      from,
      to,
      piece,
      color,
    }
  }

  createCaptureMove(
    from: number,
    to: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): CaptureMove {
    return {
      type: 'capture',
      from,
      to,
      piece,
      captured,
      color,
    }
  }

  createStayCaptureMove(
    attacker: number,
    target: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): StayCaptureMove {
    return {
      type: 'stay-capture',
      attacker,
      target,
      piece,
      captured,
      color,
    }
  }

  createSuicideCaptureMove(
    from: number,
    to: number,
    piece: Piece,
    captured: Piece,
    color: Color,
  ): SuicideCaptureMove {
    return {
      type: 'suicide-capture',
      from,
      to,
      piece,
      captured,
      color,
    }
  }

  createCombineMove(
    pieces: { from: number; piece: Piece }[],
    to: number,
    combined: Piece,
    color: Color,
  ): CombineMove {
    return {
      type: 'combine',
      pieces,
      to,
      combined,
      color,
    }
  }

  createDeployStepMove(
    from: number,
    to: number,
    piece: Piece,
    remaining: Piece[],
    color: Color,
  ): DeployStepMove {
    return {
      type: 'deploy-step',
      from,
      to,
      piece,
      remaining,
      color,
    }
  }

  createDeployCompleteMove(
    stackSquare: number,
    color: Color,
  ): DeployCompleteMove {
    return {
      type: 'deploy-complete',
      stackSquare,
      color,
    }
  }
}

/**
 * Singleton move factory
 */
export const moveFactory = new MoveFactory()

/**
 * Type guard utilities
 */
export function isNormalMove(move: Move): move is NormalMove {
  return move.type === 'normal'
}

export function isCaptureMove(move: Move): move is CaptureMove {
  return move.type === 'capture'
}

export function isStayCaptureMove(move: Move): move is StayCaptureMove {
  return move.type === 'stay-capture'
}

export function isSuicideCaptureMove(move: Move): move is SuicideCaptureMove {
  return move.type === 'suicide-capture'
}

export function isCombineMove(move: Move): move is CombineMove {
  return move.type === 'combine'
}

export function isDeployStepMove(move: Move): move is DeployStepMove {
  return move.type === 'deploy-step'
}

export function isDeployCompleteMove(move: Move): move is DeployCompleteMove {
  return move.type === 'deploy-complete'
}

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
