/**
 * Basic Integration Tests
 *
 * Tests the current state of integration between components
 * without assuming full game functionality is implemented
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GameController } from '../../src/game/GameController'
import { GameState } from '../../src/core/GameState'
import { Board } from '../../src/core/Board'
import { pieceUtils } from '../../src/core/Piece'
import { moveFactory } from '../../src/core/Move'
import { algebraicToSquare, squareToAlgebraic } from '../../src/utils/square'
import { generateFEN, parseFEN } from '../../src/serialization/FENSerializer'
import { createMoveGenerator } from '../../src/move-generation'

describe('Basic Integration Tests', () => {
  describe('Core Components Integration', () => {
    it('should create and manipulate game state', () => {
      const board = Board.createEmpty()

      // Place pieces
      const redCommander = pieceUtils.createPiece('r', 'c', false)
      const blueCommander = pieceUtils.createPiece('b', 'c', false)

      board.set(algebraicToSquare('e1'), redCommander)
      board.set(algebraicToSquare('e12'), blueCommander)

      const gameState = new GameState({
        board,
        turn: 'r',
        commanders: [algebraicToSquare('e1'), algebraicToSquare('e12')],
        moveNumber: 1,
        halfMoves: 0,
      })

      expect(gameState.turn).toBe('r')
      expect(gameState.board.countPieces()).toBe(2)
      expect(gameState.board.get(algebraicToSquare('e1'))?.type).toBe('c')
      expect(gameState.board.get(algebraicToSquare('e12'))?.type).toBe('c')
    })

    it('should create different types of moves', () => {
      const piece = pieceUtils.createPiece('r', 't', false)

      // Normal move
      const normalMove = moveFactory.createNormalMove(
        algebraicToSquare('e4'),
        algebraicToSquare('e6'),
        piece,
        'r',
      )

      expect(normalMove.type).toBe('normal')
      expect(normalMove.piece.type).toBe('t')
      expect(normalMove.from).toBe(algebraicToSquare('e4'))
      expect(normalMove.to).toBe(algebraicToSquare('e6'))

      // Capture move
      const capturedPiece = pieceUtils.createPiece('b', 'i', false)
      const captureMove = moveFactory.createCaptureMove(
        algebraicToSquare('e4'),
        algebraicToSquare('e6'),
        piece,
        capturedPiece,
        'r',
      )

      expect(captureMove.type).toBe('capture')
      expect(captureMove.captured?.type).toBe('i')
    })

    it('should handle piece stacks', () => {
      const navyStack = pieceUtils.createPiece('r', 'n', false)
      navyStack.carrying = [
        pieceUtils.createPiece('r', 't', false),
        pieceUtils.createPiece('r', 'i', false),
      ]

      expect(pieceUtils.isStack(navyStack)).toBe(true)
      expect(pieceUtils.getStackSize(navyStack)).toBe(3) // Navy + Tank + Infantry

      const flattened = pieceUtils.flattenStack(navyStack)
      expect(flattened).toHaveLength(3)
      expect(flattened[0].type).toBe('n') // Carrier first
      expect(flattened[1].type).toBe('t')
      expect(flattened[2].type).toBe('i')
    })

    it('should handle heroic pieces', () => {
      const normalTank = pieceUtils.createPiece('r', 't', false)
      const heroicTank = pieceUtils.createPiece('r', 't', true)

      expect(normalTank.heroic).toBeFalsy()
      expect(heroicTank.heroic).toBe(true)

      // Clone and modify
      const clonedTank = pieceUtils.clonePiece(normalTank)
      clonedTank.heroic = true

      expect(clonedTank.heroic).toBe(true)
      expect(normalTank.heroic).toBeFalsy() // Original unchanged
    })
  })

  describe('Board Operations', () => {
    let board: Board

    beforeEach(() => {
      board = Board.createEmpty()
    })

    it('should handle piece placement and removal', () => {
      const piece = pieceUtils.createPiece('r', 't', false)
      const square = algebraicToSquare('e4')

      expect(board.get(square)).toBeNull()

      board.set(square, piece)
      expect(board.get(square)).toEqual(piece)
      expect(board.countPieces()).toBe(1)
      expect(board.countPieces('r')).toBe(1)
      expect(board.countPieces('b')).toBe(0)

      board.set(square, null)
      expect(board.get(square)).toBeNull()
      expect(board.countPieces()).toBe(0)
    })

    it('should iterate over pieces efficiently', () => {
      // Place several pieces
      board.set(
        algebraicToSquare('e4'),
        pieceUtils.createPiece('r', 't', false),
      )
      board.set(
        algebraicToSquare('d5'),
        pieceUtils.createPiece('r', 'i', false),
      )
      board.set(
        algebraicToSquare('f6'),
        pieceUtils.createPiece('b', 'n', false),
      )

      const allPieces = Array.from(board.pieces())
      expect(allPieces).toHaveLength(3)

      const redPieces = Array.from(board.pieces('r'))
      expect(redPieces).toHaveLength(2)

      const bluePieces = Array.from(board.pieces('b'))
      expect(bluePieces).toHaveLength(1)
    })

    it('should validate square boundaries', () => {
      // Valid squares
      expect(board.isValid(algebraicToSquare('a1'))).toBe(true)
      expect(board.isValid(algebraicToSquare('k12'))).toBe(true)
      expect(board.isValid(algebraicToSquare('e6'))).toBe(true)

      // Invalid squares (outside 11x12 board)
      expect(board.isValid(256)).toBe(false) // Too high
      expect(board.isValid(-1)).toBe(false) // Negative
    })
  })

  describe('Square Utilities', () => {
    it('should convert between algebraic and numeric notation', () => {
      const testCases = [
        { algebraic: 'a1', numeric: 176 },
        { algebraic: 'k12', numeric: 10 },
        { algebraic: 'e6', numeric: 100 },
        { algebraic: 'f7', numeric: 85 },
      ]

      for (const { algebraic, numeric } of testCases) {
        expect(algebraicToSquare(algebraic)).toBe(numeric)
        expect(squareToAlgebraic(numeric)).toBe(algebraic)
      }
    })

    it('should handle invalid algebraic notation', () => {
      expect(() => algebraicToSquare('z99')).toThrow()
      expect(() => algebraicToSquare('')).toThrow()
      expect(() => squareToAlgebraic(-1)).toThrow()
    })
  })

  describe('FEN Serialization', () => {
    it('should generate FEN for simple positions', () => {
      const board = Board.createEmpty()
      board.set(
        algebraicToSquare('e1'),
        pieceUtils.createPiece('r', 'c', false),
      )
      board.set(
        algebraicToSquare('e12'),
        pieceUtils.createPiece('b', 'c', false),
      )

      const gameState = new GameState({
        board,
        turn: 'r',
        commanders: [algebraicToSquare('e1'), algebraicToSquare('e12')],
        moveNumber: 1,
        halfMoves: 0,
      })

      const fen = generateFEN(gameState)

      expect(fen).toContain('r') // Red's turn
      expect(fen).toContain('1 0') // Move 1, 0 half-moves
      expect(fen).toContain('-') // No deploy session

      // Should have commanders in FEN
      expect(fen).toMatch(/c.*C|C.*c/) // One of each commander
    })

    it('should parse FEN back to game state', () => {
      const originalBoard = Board.createEmpty()
      originalBoard.set(
        algebraicToSquare('e1'),
        pieceUtils.createPiece('r', 'c', false),
      )
      originalBoard.set(
        algebraicToSquare('e12'),
        pieceUtils.createPiece('b', 'c', false),
      )

      const originalState = new GameState({
        board: originalBoard,
        turn: 'r',
        commanders: [algebraicToSquare('e1'), algebraicToSquare('e12')],
        moveNumber: 1,
        halfMoves: 0,
      })

      const fen = generateFEN(originalState)
      const parsedState = parseFEN(fen)

      expect(parsedState.turn).toBe('r')
      expect(parsedState.moveNumber).toBe(1)
      expect(parsedState.halfMoves).toBe(0)

      // Check pieces are in correct positions
      expect(parsedState.board.get(algebraicToSquare('e1'))?.type).toBe('c')
      expect(parsedState.board.get(algebraicToSquare('e12'))?.type).toBe('c')
    })

    it('should handle heroic pieces in FEN', () => {
      const board = Board.createEmpty()
      board.set(
        algebraicToSquare('e1'),
        pieceUtils.createPiece('r', 'c', false),
      )
      board.set(
        algebraicToSquare('e12'),
        pieceUtils.createPiece('b', 'c', false),
      )
      board.set(algebraicToSquare('d5'), pieceUtils.createPiece('r', 't', true)) // Heroic tank

      const gameState = new GameState({
        board,
        turn: 'r',
        commanders: [algebraicToSquare('e1'), algebraicToSquare('e12')],
        moveNumber: 1,
        halfMoves: 0,
      })

      const fen = generateFEN(gameState)
      expect(fen).toContain('T*') // Heroic tank marker

      const parsedState = parseFEN(fen)
      const heroicTank = parsedState.board.get(algebraicToSquare('d5'))
      expect(heroicTank?.heroic).toBe(true)
    })
  })

  describe('Move Generation Framework', () => {
    it('should create move generator', () => {
      const generator = createMoveGenerator()
      expect(generator).toBeDefined()

      // Check if it has the expected interface
      expect(typeof generator.generateMoves).toBe('function')
    })

    it('should handle empty game state', () => {
      const board = Board.createEmpty()
      const gameState = new GameState({
        board,
        turn: 'r',
        commanders: [0, 0], // No commanders placed yet
        moveNumber: 1,
        halfMoves: 0,
      })

      const generator = createMoveGenerator()
      const moves = generator.generateMoves(gameState)

      // Should return empty array for empty board
      expect(Array.isArray(moves)).toBe(true)
      expect(moves).toHaveLength(0)
    })
  })

  describe('Game Controller Basic Operations', () => {
    let gameController: GameController

    beforeEach(() => {
      gameController = new GameController()
    })

    it('should initialize with default state', () => {
      const state = gameController.getState()

      expect(state.turn).toBe('r')
      expect(state.moveNumber).toBe(1)
      expect(state.halfMoves).toBe(0)
      expect(state.deploySession).toBeNull()
    })

    it('should support state reset', () => {
      const customBoard = Board.createEmpty()
      customBoard.set(
        algebraicToSquare('e4'),
        pieceUtils.createPiece('r', 't', false),
      )

      const customState = new GameState({
        board: customBoard,
        turn: 'b',
        commanders: [0, 0],
        moveNumber: 5,
        halfMoves: 10,
      })

      gameController.reset(customState)

      const newState = gameController.getState()
      expect(newState.turn).toBe('b')
      expect(newState.moveNumber).toBe(5)
      expect(newState.halfMoves).toBe(10)
      expect(newState.board.countPieces()).toBe(1)
    })

    it('should track history', () => {
      const initialHistory = gameController.getHistory()
      expect(initialHistory).toHaveLength(0)

      // History operations should not crash
      expect(gameController.undo()).toBeNull()
      expect(gameController.redo()).toBeNull()
    })

    it('should provide game status queries', () => {
      // These should not crash even with default/empty state
      expect(typeof gameController.isCheck()).toBe('boolean')
      expect(typeof gameController.isCheckmate()).toBe('boolean')
      expect(typeof gameController.isStalemate()).toBe('boolean')
      expect(typeof gameController.isGameOver()).toBe('boolean')

      const result = gameController.getResult()
      expect(['red-wins', 'blue-wins', 'draw', 'ongoing']).toContain(result)
    })
  })

  describe('Component Integration', () => {
    it('should integrate board, pieces, and moves', () => {
      const board = Board.createEmpty()
      const piece = pieceUtils.createPiece('r', 't', false)
      const fromSquare = algebraicToSquare('e4')
      const toSquare = algebraicToSquare('e6')

      // Place piece
      board.set(fromSquare, piece)
      expect(board.get(fromSquare)).toEqual(piece)

      // Create move
      const move = moveFactory.createNormalMove(
        fromSquare,
        toSquare,
        piece,
        'r',
      )
      expect(move.from).toBe(fromSquare)
      expect(move.to).toBe(toSquare)

      // Simulate move application (manual)
      board.set(fromSquare, null)
      board.set(toSquare, piece)

      expect(board.get(fromSquare)).toBeNull()
      expect(board.get(toSquare)).toEqual(piece)
    })

    it('should integrate with FEN serialization', () => {
      const board = Board.createEmpty()

      // Create a more complex position
      board.set(
        algebraicToSquare('e1'),
        pieceUtils.createPiece('r', 'c', false),
      )
      board.set(
        algebraicToSquare('e12'),
        pieceUtils.createPiece('b', 'c', false),
      )
      board.set(
        algebraicToSquare('d4'),
        pieceUtils.createPiece('r', 't', false),
      )
      board.set(
        algebraicToSquare('f8'),
        pieceUtils.createPiece('b', 'n', false),
      )

      const gameState = new GameState({
        board,
        turn: 'b',
        commanders: [algebraicToSquare('e1'), algebraicToSquare('e12')],
        moveNumber: 3,
        halfMoves: 5,
      })

      const fen = generateFEN(gameState)
      const parsedState = parseFEN(fen)

      // Verify round-trip consistency
      expect(parsedState.turn).toBe(gameState.turn)
      expect(parsedState.moveNumber).toBe(gameState.moveNumber)
      expect(parsedState.halfMoves).toBe(gameState.halfMoves)
      expect(parsedState.board.countPieces()).toBe(
        gameState.board.countPieces(),
      )
    })
  })
})
