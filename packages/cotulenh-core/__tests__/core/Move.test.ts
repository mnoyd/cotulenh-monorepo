/**
 * Unit tests for Move factory and type guards
 */

import { describe, it, expect } from 'vitest'
import { moveFactory, isCaptureType } from '../../src/core/Move'
import {
  isNormalMove,
  isCaptureMove,
  isStayCaptureMove,
  isSuicideCaptureMove,
  isCombineMove,
  isDeployStepMove,
  isDeployCompleteMove,
} from '../../src/types/Move'
import { pieceUtils } from '../../src/core/Piece'
import {
  RED,
  BLUE,
  INFANTRY,
  TANK,
  COMMANDER,
  AIR_FORCE,
} from '../../src/types/Constants'

describe('MoveFactory', () => {
  describe('createNormalMove', () => {
    it('should create normal move', () => {
      const piece = pieceUtils.createPiece(RED, INFANTRY)
      const move = moveFactory.createNormalMove(0x00, 0x10, piece, RED)

      expect(move.type).toBe('normal')
      expect(move.from).toBe(0x00)
      expect(move.to).toBe(0x10)
      expect(move.piece).toBe(piece)
      expect(move.color).toBe(RED)
    })
  })

  describe('createCaptureMove', () => {
    it('should create capture move', () => {
      const piece = pieceUtils.createPiece(RED, TANK)
      const captured = pieceUtils.createPiece(BLUE, INFANTRY)
      const move = moveFactory.createCaptureMove(
        0x00,
        0x10,
        piece,
        captured,
        RED,
      )

      expect(move.type).toBe('capture')
      expect(move.from).toBe(0x00)
      expect(move.to).toBe(0x10)
      expect(move.piece).toBe(piece)
      expect(move.captured).toBe(captured)
      expect(move.color).toBe(RED)
    })
  })

  describe('createStayCaptureMove', () => {
    it('should create stay capture move', () => {
      const piece = pieceUtils.createPiece(RED, TANK)
      const captured = pieceUtils.createPiece(BLUE, INFANTRY)
      const move = moveFactory.createStayCaptureMove(
        0x00,
        0x10,
        piece,
        captured,
        RED,
      )

      expect(move.type).toBe('stay-capture')
      expect(move.attacker).toBe(0x00)
      expect(move.target).toBe(0x10)
      expect(move.piece).toBe(piece)
      expect(move.captured).toBe(captured)
      expect(move.color).toBe(RED)
    })
  })

  describe('createSuicideCaptureMove', () => {
    it('should create suicide capture move', () => {
      const piece = pieceUtils.createPiece(RED, AIR_FORCE)
      const captured = pieceUtils.createPiece(BLUE, COMMANDER)
      const move = moveFactory.createSuicideCaptureMove(
        0x00,
        0x10,
        piece,
        captured,
        RED,
      )

      expect(move.type).toBe('suicide-capture')
      expect(move.from).toBe(0x00)
      expect(move.to).toBe(0x10)
      expect(move.piece).toBe(piece)
      expect(move.captured).toBe(captured)
      expect(move.color).toBe(RED)
    })
  })

  describe('createCombineMove', () => {
    it('should create combine move', () => {
      const piece1 = pieceUtils.createPiece(RED, TANK)
      const piece2 = pieceUtils.createPiece(RED, INFANTRY)
      const combined = pieceUtils.createStack(piece1, piece2)

      const pieces = [
        { from: 0x00, piece: piece1 },
        { from: 0x10, piece: piece2 },
      ]

      const move = moveFactory.createCombineMove(pieces, 0x20, combined, RED)

      expect(move.type).toBe('combine')
      expect(move.pieces).toHaveLength(2)
      expect(move.to).toBe(0x20)
      expect(move.combined).toBe(combined)
      expect(move.color).toBe(RED)
    })
  })

  describe('createDeployStepMove', () => {
    it('should create deploy step move', () => {
      const piece = pieceUtils.createPiece(RED, INFANTRY)
      const remaining = [pieceUtils.createPiece(RED, TANK)]

      const move = moveFactory.createDeployStepMove(
        0x00,
        0x10,
        piece,
        remaining,
        RED,
      )

      expect(move.type).toBe('deploy-step')
      expect(move.from).toBe(0x00)
      expect(move.to).toBe(0x10)
      expect(move.piece).toBe(piece)
      expect(move.remaining).toEqual(remaining)
      expect(move.color).toBe(RED)
    })
  })

  describe('createDeployCompleteMove', () => {
    it('should create deploy complete move', () => {
      const move = moveFactory.createDeployCompleteMove(0x00, RED)

      expect(move.type).toBe('deploy-complete')
      expect(move.stackSquare).toBe(0x00)
      expect(move.color).toBe(RED)
    })
  })
})

describe('Type guards', () => {
  const normalMove = moveFactory.createNormalMove(
    0x00,
    0x10,
    pieceUtils.createPiece(RED, INFANTRY),
    RED,
  )

  const captureMove = moveFactory.createCaptureMove(
    0x00,
    0x10,
    pieceUtils.createPiece(RED, TANK),
    pieceUtils.createPiece(BLUE, INFANTRY),
    RED,
  )

  const stayCaptureMove = moveFactory.createStayCaptureMove(
    0x00,
    0x10,
    pieceUtils.createPiece(RED, TANK),
    pieceUtils.createPiece(BLUE, INFANTRY),
    RED,
  )

  const suicideCaptureMove = moveFactory.createSuicideCaptureMove(
    0x00,
    0x10,
    pieceUtils.createPiece(RED, AIR_FORCE),
    pieceUtils.createPiece(BLUE, COMMANDER),
    RED,
  )

  const combineMove = moveFactory.createCombineMove(
    [
      { from: 0x00, piece: pieceUtils.createPiece(RED, TANK) },
      { from: 0x10, piece: pieceUtils.createPiece(RED, INFANTRY) },
    ],
    0x20,
    pieceUtils.createStack(
      pieceUtils.createPiece(RED, TANK),
      pieceUtils.createPiece(RED, INFANTRY),
    ),
    RED,
  )

  const deployStepMove = moveFactory.createDeployStepMove(
    0x00,
    0x10,
    pieceUtils.createPiece(RED, INFANTRY),
    [],
    RED,
  )

  const deployCompleteMove = moveFactory.createDeployCompleteMove(0x00, RED)

  describe('isNormalMove', () => {
    it('should identify normal moves', () => {
      expect(isNormalMove(normalMove)).toBe(true)
      expect(isNormalMove(captureMove)).toBe(false)
      expect(isNormalMove(combineMove)).toBe(false)
    })
  })

  describe('isCaptureMove', () => {
    it('should identify capture moves', () => {
      expect(isCaptureMove(captureMove)).toBe(true)
      expect(isCaptureMove(normalMove)).toBe(false)
      expect(isCaptureMove(stayCaptureMove)).toBe(false)
    })
  })

  describe('isStayCaptureMove', () => {
    it('should identify stay capture moves', () => {
      expect(isStayCaptureMove(stayCaptureMove)).toBe(true)
      expect(isStayCaptureMove(captureMove)).toBe(false)
      expect(isStayCaptureMove(normalMove)).toBe(false)
    })
  })

  describe('isSuicideCaptureMove', () => {
    it('should identify suicide capture moves', () => {
      expect(isSuicideCaptureMove(suicideCaptureMove)).toBe(true)
      expect(isSuicideCaptureMove(captureMove)).toBe(false)
      expect(isSuicideCaptureMove(normalMove)).toBe(false)
    })
  })

  describe('isCombineMove', () => {
    it('should identify combine moves', () => {
      expect(isCombineMove(combineMove)).toBe(true)
      expect(isCombineMove(normalMove)).toBe(false)
      expect(isCombineMove(captureMove)).toBe(false)
    })
  })

  describe('isDeployStepMove', () => {
    it('should identify deploy step moves', () => {
      expect(isDeployStepMove(deployStepMove)).toBe(true)
      expect(isDeployStepMove(normalMove)).toBe(false)
      expect(isDeployStepMove(deployCompleteMove)).toBe(false)
    })
  })

  describe('isDeployCompleteMove', () => {
    it('should identify deploy complete moves', () => {
      expect(isDeployCompleteMove(deployCompleteMove)).toBe(true)
      expect(isDeployCompleteMove(deployStepMove)).toBe(false)
      expect(isDeployCompleteMove(normalMove)).toBe(false)
    })
  })

  describe('isCaptureType', () => {
    it('should identify all capture variants', () => {
      expect(isCaptureType(captureMove)).toBe(true)
      expect(isCaptureType(stayCaptureMove)).toBe(true)
      expect(isCaptureType(suicideCaptureMove)).toBe(true)
      expect(isCaptureType(normalMove)).toBe(false)
      expect(isCaptureType(combineMove)).toBe(false)
    })
  })
})
