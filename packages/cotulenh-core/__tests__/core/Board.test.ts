/**
 * Unit tests for Board
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Board } from '../../src/core/Board'
import { pieceUtils } from '../../src/core/Piece'
import { RED, BLUE, INFANTRY, TANK, COMMANDER } from '../../src/types/Constants'

describe('Board', () => {
  let board: Board

  beforeEach(() => {
    board = Board.createEmpty()
  })

  describe('createEmpty', () => {
    it('should create empty board', () => {
      expect(board.countPieces()).toBe(0)
      expect(board.countPieces(RED)).toBe(0)
      expect(board.countPieces(BLUE)).toBe(0)
    })
  })

  describe('get and set', () => {
    it('should return null for empty square', () => {
      expect(board.get(0x00)).toBeNull()
    })

    it('should set and get piece', () => {
      const piece = pieceUtils.createPiece(RED, INFANTRY)
      board.set(0x00, piece)

      expect(board.get(0x00)).toBe(piece)
    })

    it('should overwrite existing piece', () => {
      const piece1 = pieceUtils.createPiece(RED, INFANTRY)
      const piece2 = pieceUtils.createPiece(BLUE, TANK)

      board.set(0x00, piece1)
      board.set(0x00, piece2)

      expect(board.get(0x00)).toBe(piece2)
    })

    it('should clear square with null', () => {
      const piece = pieceUtils.createPiece(RED, INFANTRY)
      board.set(0x00, piece)
      board.set(0x00, null)

      expect(board.get(0x00)).toBeNull()
    })
  })

  describe('pieces iterator', () => {
    beforeEach(() => {
      board.set(0x00, pieceUtils.createPiece(RED, INFANTRY))
      board.set(0x10, pieceUtils.createPiece(RED, TANK))
      board.set(0x20, pieceUtils.createPiece(BLUE, INFANTRY))
      board.set(0x30, pieceUtils.createPiece(BLUE, COMMANDER))
    })

    it('should iterate all pieces', () => {
      const pieces = Array.from(board.pieces())

      expect(pieces).toHaveLength(4)
      expect(pieces.map(([sq]) => sq).sort()).toEqual([0x00, 0x10, 0x20, 0x30])
    })

    it('should iterate red pieces only', () => {
      const pieces = Array.from(board.pieces(RED))

      expect(pieces).toHaveLength(2)
      expect(pieces.map(([sq]) => sq).sort()).toEqual([0x00, 0x10])
    })

    it('should iterate blue pieces only', () => {
      const pieces = Array.from(board.pieces(BLUE))

      expect(pieces).toHaveLength(2)
      expect(pieces.map(([sq]) => sq).sort()).toEqual([0x20, 0x30])
    })

    it('should return empty iterator for empty board', () => {
      const emptyBoard = Board.createEmpty()
      const pieces = Array.from(emptyBoard.pieces())

      expect(pieces).toHaveLength(0)
    })
  })

  describe('getOccupiedSquares', () => {
    beforeEach(() => {
      board.set(0x00, pieceUtils.createPiece(RED, INFANTRY))
      board.set(0x10, pieceUtils.createPiece(RED, TANK))
      board.set(0x20, pieceUtils.createPiece(BLUE, INFANTRY))
    })

    it('should return red occupied squares', () => {
      const squares = board.getOccupiedSquares(RED)

      expect(squares.size).toBe(2)
      expect(squares.has(0x00)).toBe(true)
      expect(squares.has(0x10)).toBe(true)
    })

    it('should return blue occupied squares', () => {
      const squares = board.getOccupiedSquares(BLUE)

      expect(squares.size).toBe(1)
      expect(squares.has(0x20)).toBe(true)
    })

    it('should update when pieces are added', () => {
      board.set(0x30, pieceUtils.createPiece(RED, COMMANDER))

      const squares = board.getOccupiedSquares(RED)
      expect(squares.size).toBe(3)
      expect(squares.has(0x30)).toBe(true)
    })

    it('should update when pieces are removed', () => {
      board.set(0x00, null)

      const squares = board.getOccupiedSquares(RED)
      expect(squares.size).toBe(1)
      expect(squares.has(0x00)).toBe(false)
    })
  })

  describe('isValid', () => {
    it('should validate corner squares', () => {
      expect(board.isValid(0x00)).toBe(true) // a12
      expect(board.isValid(0x0a)).toBe(true) // k12
      expect(board.isValid(0xb0)).toBe(true) // a1
      expect(board.isValid(0xba)).toBe(true) // k1
    })

    it('should validate center squares', () => {
      expect(board.isValid(0x74)).toBe(true) // e5
      expect(board.isValid(0x55)).toBe(true) // f7
    })

    it('should reject invalid files', () => {
      expect(board.isValid(0x0b)).toBe(false) // file 11 (invalid)
      expect(board.isValid(0x0f)).toBe(false) // file 15 (invalid)
    })

    it('should reject invalid ranks', () => {
      expect(board.isValid(0xc0)).toBe(false) // rank 12 (invalid)
      expect(board.isValid(0xf0)).toBe(false) // rank 15 (invalid)
    })
  })

  describe('clone', () => {
    beforeEach(() => {
      board.set(0x00, pieceUtils.createPiece(RED, INFANTRY))
      board.set(0x10, pieceUtils.createPiece(BLUE, TANK, true))

      const carrier = pieceUtils.createPiece(RED, TANK)
      const carried = pieceUtils.createPiece(RED, INFANTRY)
      board.set(0x20, pieceUtils.createStack(carrier, carried))
    })

    it('should create independent copy', () => {
      const cloned = board.clone()

      expect(cloned).not.toBe(board)
      expect(cloned.get(0x00)).not.toBe(board.get(0x00))
    })

    it('should copy all pieces', () => {
      const cloned = board.clone()

      expect(cloned.get(0x00)?.type).toBe(INFANTRY)
      expect(cloned.get(0x10)?.type).toBe(TANK)
      expect(cloned.get(0x20)?.type).toBe(TANK)
    })

    it('should deep clone pieces', () => {
      const cloned = board.clone()

      // Modify cloned board
      cloned.set(0x00, pieceUtils.createPiece(BLUE, COMMANDER))

      // Original should be unchanged
      expect(board.get(0x00)?.color).toBe(RED)
      expect(board.get(0x00)?.type).toBe(INFANTRY)
    })

    it('should deep clone stacks', () => {
      const cloned = board.clone()
      const originalStack = board.get(0x20)!
      const clonedStack = cloned.get(0x20)!

      expect(clonedStack.carrying).not.toBe(originalStack.carrying)
      expect(clonedStack.carrying![0]).not.toBe(originalStack.carrying![0])
    })

    it('should copy piece lists', () => {
      const cloned = board.clone()

      expect(cloned.countPieces(RED)).toBe(2)
      expect(cloned.countPieces(BLUE)).toBe(1)
    })
  })

  describe('clear', () => {
    it('should remove all pieces', () => {
      board.set(0x00, pieceUtils.createPiece(RED, INFANTRY))
      board.set(0x10, pieceUtils.createPiece(BLUE, TANK))

      board.clear()

      expect(board.countPieces()).toBe(0)
      expect(board.get(0x00)).toBeNull()
      expect(board.get(0x10)).toBeNull()
    })

    it('should clear piece lists', () => {
      board.set(0x00, pieceUtils.createPiece(RED, INFANTRY))
      board.set(0x10, pieceUtils.createPiece(BLUE, TANK))

      board.clear()

      expect(board.getOccupiedSquares(RED).size).toBe(0)
      expect(board.getOccupiedSquares(BLUE).size).toBe(0)
    })
  })

  describe('countPieces', () => {
    beforeEach(() => {
      board.set(0x00, pieceUtils.createPiece(RED, INFANTRY))
      board.set(0x10, pieceUtils.createPiece(RED, TANK))
      board.set(0x20, pieceUtils.createPiece(RED, COMMANDER))
      board.set(0x30, pieceUtils.createPiece(BLUE, INFANTRY))
      board.set(0x40, pieceUtils.createPiece(BLUE, TANK))
    })

    it('should count all pieces', () => {
      expect(board.countPieces()).toBe(5)
    })

    it('should count red pieces', () => {
      expect(board.countPieces(RED)).toBe(3)
    })

    it('should count blue pieces', () => {
      expect(board.countPieces(BLUE)).toBe(2)
    })

    it('should return 0 for empty board', () => {
      const empty = Board.createEmpty()
      expect(empty.countPieces()).toBe(0)
    })
  })

  describe('fromArray', () => {
    it('should create board from array', () => {
      const squares = new Array(256).fill(null)
      squares[0x00] = pieceUtils.createPiece(RED, INFANTRY)
      squares[0x10] = pieceUtils.createPiece(BLUE, TANK)

      const newBoard = Board.fromArray(squares)

      expect(newBoard.get(0x00)?.type).toBe(INFANTRY)
      expect(newBoard.get(0x10)?.type).toBe(TANK)
      expect(newBoard.countPieces()).toBe(2)
    })

    it('should throw error for invalid array length', () => {
      expect(() => Board.fromArray(new Array(100).fill(null))).toThrow()
    })

    it('should update piece lists', () => {
      const squares = new Array(256).fill(null)
      squares[0x00] = pieceUtils.createPiece(RED, INFANTRY)
      squares[0x10] = pieceUtils.createPiece(BLUE, TANK)

      const newBoard = Board.fromArray(squares)

      expect(newBoard.countPieces(RED)).toBe(1)
      expect(newBoard.countPieces(BLUE)).toBe(1)
    })
  })
})
