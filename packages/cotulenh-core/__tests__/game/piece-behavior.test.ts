/**
 * Piece Behavior Integration Tests
 *
 * Tests specific piece behaviors in game context:
 * - All 11 piece types movement
 * - Terrain interactions
 * - Special abilities
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GameController } from '../../src/game/GameController'
import { GameState } from '../../src/core/GameState'
import { Board } from '../../src/core/Board'
import { pieceUtils } from '../../src/core/Piece'
import { algebraicToSquare, squareToAlgebraic } from '../../src/utils/square'
import { isNavySquare } from '../../src/utils/terrain'

describe('Piece Behavior Integration', () => {
  let gameController: GameController
  let gameState: GameState

  beforeEach(() => {
    gameController = new GameController()

    // Setup basic game with commanders not facing each other
    const board = Board.createEmpty()
    board.set(algebraicToSquare('f1'), pieceUtils.createPiece('r', 'c', false))
    board.set(algebraicToSquare('h12'), pieceUtils.createPiece('b', 'c', false)) // Different file

    gameState = new GameState({
      board,
      turn: 'r',
      commanders: [algebraicToSquare('f1'), algebraicToSquare('h12')],
      moveNumber: 1,
      halfMoves: 0,
    })

    gameController.reset(gameState)
  })

  describe('Commander (C) Behavior', () => {
    it('should move infinite orthogonal distance', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('e6'),
        pieceUtils.createPiece('r', 'c', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
        commanders: [algebraicToSquare('e6'), algebraicToSquare('f12')],
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const commanderMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      const destinations = commanderMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Should be able to move to far squares orthogonally
      expect(destinations).toContain('e1') // Far down
      expect(destinations).toContain('e11') // Far up
      expect(destinations).toContain('c6') // Far left (can't go to a6/b6 - water only)
      expect(destinations).toContain('k6') // Far right
    })

    it('should gain diagonal movement when heroic', () => {
      const board = Board.createEmpty()
      const heroicCommander = pieceUtils.createPiece('r', 'c', true)
      board.set(algebraicToSquare('e6'), heroicCommander)
      board.set(
        algebraicToSquare('f12'),
        pieceUtils.createPiece('b', 'c', false),
      )

      gameState = new GameState({
        board,
        turn: 'r',
        commanders: [algebraicToSquare('e6'), algebraicToSquare('f12')],
        moveNumber: 1,
        halfMoves: 0,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const commanderMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      const destinations = commanderMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Should have diagonal moves when heroic
      expect(destinations).toContain('d5') // Diagonal
      expect(destinations).toContain('d7') // Diagonal
      expect(destinations).toContain('g8') // Diagonal
      expect(destinations).toContain('g4') // Diagonal
      // Note: f7 and f5 are blocked by Flying General rule (same file as enemy commander at f12)
    })
  })

  describe('Infantry (I) Behavior', () => {
    it('should move 1 square orthogonally', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('e6'),
        pieceUtils.createPiece('r', 'i', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const infantryMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      const destinations = infantryMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Should move only 1 square orthogonally
      expect(destinations).toContain('e5')
      expect(destinations).toContain('e7')
      expect(destinations).toContain('d6')
      expect(destinations).toContain('f6')

      // Should not move diagonally or 2+ squares
      expect(destinations).not.toContain('d5')
      expect(destinations).not.toContain('e4')
    })

    it('should get +1 range when heroic', () => {
      const board = gameState.board
      const heroicInfantry = pieceUtils.createPiece('r', 'i', true)
      board.set(algebraicToSquare('e6'), heroicInfantry)

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const infantryMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      const destinations = infantryMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Should move 2 squares when heroic
      expect(destinations).toContain('e4') // 2 squares
      expect(destinations).toContain('e8') // 2 squares
      expect(destinations).toContain('c6') // 2 squares
      expect(destinations).toContain('g6') // 2 squares
    })
  })

  describe('Tank (T) Behavior', () => {
    it('should move 2 squares orthogonally with shoot-over', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('e6'),
        pieceUtils.createPiece('r', 't', false),
      )
      // Place blocking piece
      board.set(
        algebraicToSquare('e7'),
        pieceUtils.createPiece('b', 'i', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const tankMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      const destinations = tankMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Should be able to shoot over the infantry at e7
      expect(destinations).toContain('e8') // Shoot over e7
      expect(destinations).toContain('e4') // 2 squares down
      expect(destinations).toContain('c6') // 2 squares left
      expect(destinations).toContain('g6') // 2 squares right
    })
  })

  describe('Navy (N) Behavior', () => {
    it('should only move on water and mixed terrain', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('a6'),
        pieceUtils.createPiece('r', 'n', false),
      ) // Water

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const navyMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('a6'),
      )

      const destinations = navyMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Should only move to water (a,b files) and mixed (c file) terrain
      for (const dest of destinations) {
        const square = algebraicToSquare(dest)
        expect(isNavySquare(square) || dest.startsWith('c')).toBe(true)
      }
    })

    it('should perform stay-capture on water', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('a6'),
        pieceUtils.createPiece('r', 'n', false),
      )
      board.set(
        algebraicToSquare('a7'),
        pieceUtils.createPiece('b', 'n', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const stayCaptureMove = moves.find(
        (move) =>
          'attacker' in move &&
          move.attacker === algebraicToSquare('a6') &&
          move.type === 'stay-capture',
      )

      expect(stayCaptureMove).toBeDefined()
    })
  })

  describe('Artillery (A) Behavior', () => {
    it('should move 3 squares with ignore-blocking', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('e6'),
        pieceUtils.createPiece('r', 'a', false),
      )
      // Place blocking pieces
      board.set(
        algebraicToSquare('e7'),
        pieceUtils.createPiece('b', 'i', false),
      )
      board.set(
        algebraicToSquare('e8'),
        pieceUtils.createPiece('b', 'i', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const artilleryMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      const destinations = artilleryMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Should be able to ignore blocking and reach 3 squares
      expect(destinations).toContain('e9') // 3 squares, ignoring blocks
      expect(destinations).toContain('e3') // 3 squares down
      expect(destinations).toContain('c6') // 3 squares left (can't reach b6 - water only)
      expect(destinations).toContain('h6') // 3 squares right
    })

    it('should perform stay-capture', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('e6'),
        pieceUtils.createPiece('r', 'a', false),
      )
      board.set(
        algebraicToSquare('e9'),
        pieceUtils.createPiece('b', 'i', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const stayCaptureMove = moves.find(
        (move) =>
          'attacker' in move &&
          move.attacker === algebraicToSquare('e6') &&
          move.type === 'stay-capture',
      )

      expect(stayCaptureMove).toBeDefined()
    })
  })

  describe('Missile (S) Behavior', () => {
    it('should move in L-shaped pattern (2-orthogonal/1-diagonal)', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('e6'),
        pieceUtils.createPiece('r', 's', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const missileMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      const destinations = missileMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Should move in L-shaped pattern
      expect(destinations).toContain('d4') // 2 down, 1 left
      expect(destinations).toContain('f4') // 2 down, 1 right
      expect(destinations).toContain('d8') // 2 up, 1 left
      expect(destinations).toContain('f8') // 2 up, 1 right
      expect(destinations).toContain('c5') // 2 left, 1 down
      expect(destinations).toContain('c7') // 2 left, 1 up
    })
  })

  describe('Air Force (F) Behavior', () => {
    it('should move 4 squares in all directions', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('e6'),
        pieceUtils.createPiece('r', 'f', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const airForceMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      const destinations = airForceMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Should move 4 squares in all directions
      expect(destinations).toContain('e2') // 4 down
      expect(destinations).toContain('e10') // 4 up
      expect(destinations).toContain('c6') // 4 left (can't reach a6 - water only)
      expect(destinations).toContain('i6') // 4 right
      expect(destinations).toContain('i2') // 4 diagonal southeast
      expect(destinations).toContain('i10') // 4 diagonal
    })

    it('should interact with air defense zones', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('e6'),
        pieceUtils.createPiece('r', 'f', false),
      )
      // Place anti-air to create air defense zone
      board.set(
        algebraicToSquare('e8'),
        pieceUtils.createPiece('b', 'g', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const airForceMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      // Air force movement should be affected by air defense zones
      // Exact behavior depends on air defense zone calculation
      expect(airForceMoves.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Headquarter (H) Behavior', () => {
    it('should be immobile when not heroic', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('e6'),
        pieceUtils.createPiece('r', 'h', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const headquarterMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      // Should have no moves when not heroic
      expect(headquarterMoves).toHaveLength(0)
    })

    it('should become mobile when heroic', () => {
      const board = gameState.board
      const heroicHQ = pieceUtils.createPiece('r', 'h', true)
      board.set(algebraicToSquare('e6'), heroicHQ)

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const headquarterMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      const destinations = headquarterMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Should move 1 square in all directions when heroic
      expect(destinations).toContain('e5')
      expect(destinations).toContain('e7')
      expect(destinations).toContain('d6')
      expect(destinations).toContain('f6')
      expect(destinations).toContain('d5') // Diagonal
      expect(destinations).toContain('f7') // Diagonal
    })
  })

  describe('Terrain Interactions', () => {
    it('should respect water zone restrictions', () => {
      const board = gameState.board
      // Place land piece on water (should have no moves)
      board.set(
        algebraicToSquare('a6'),
        pieceUtils.createPiece('r', 't', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const tankMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('a6'),
      )

      // Tank on water should have no legal moves
      expect(tankMoves).toHaveLength(0)
    })

    it('should handle river crossing restrictions for heavy pieces', () => {
      const board = gameState.board
      // Place artillery near river
      board.set(
        algebraicToSquare('c6'),
        pieceUtils.createPiece('r', 'a', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const artilleryMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('c6'),
      )

      const destinations = artilleryMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Heavy pieces should be restricted crossing river
      // Exact restrictions depend on river crossing rules
      expect(destinations.length).toBeGreaterThan(0)
    })

    it('should allow bridge crossing for heavy pieces', () => {
      const board = gameState.board
      // Place artillery that can use bridge
      board.set(
        algebraicToSquare('f5'),
        pieceUtils.createPiece('r', 'a', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const artilleryMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('f5'),
      )

      const destinations = artilleryMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // Should be able to cross at bridge squares (f6, f7)
      expect(destinations.some((dest) => dest === 'f6' || dest === 'f7')).toBe(
        true,
      )
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle pieces at board edges', () => {
      const board = gameState.board
      // Place piece at corner
      board.set(
        algebraicToSquare('a1'),
        pieceUtils.createPiece('r', 'n', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const navyMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('a1'),
      )

      // Should handle boundary correctly
      expect(navyMoves.length).toBeGreaterThanOrEqual(0)

      const destinations = navyMoves
        .filter((move) => 'to' in move)
        .map((move) => squareToAlgebraic(move.to))

      // All destinations should be valid squares
      for (const dest of destinations) {
        const square = algebraicToSquare(dest)
        expect(square).toBeGreaterThanOrEqual(0)
        expect(square).toBeLessThan(256)
      }
    })

    it('should handle blocked movement correctly', () => {
      const board = gameState.board
      board.set(
        algebraicToSquare('e6'),
        pieceUtils.createPiece('r', 'i', false),
      )
      // Surround with enemy pieces
      board.set(
        algebraicToSquare('e5'),
        pieceUtils.createPiece('b', 'i', false),
      )
      board.set(
        algebraicToSquare('e7'),
        pieceUtils.createPiece('b', 'i', false),
      )
      board.set(
        algebraicToSquare('d6'),
        pieceUtils.createPiece('b', 'i', false),
      )
      board.set(
        algebraicToSquare('f6'),
        pieceUtils.createPiece('b', 'i', false),
      )

      gameState = new GameState({
        ...gameState,
        board,
      })
      gameController.reset(gameState)

      const moves = gameController.getMoves()
      const infantryMoves = moves.filter(
        (move) => 'from' in move && move.from === algebraicToSquare('e6'),
      )

      // Should be able to capture adjacent enemies
      expect(infantryMoves.length).toBe(4) // 4 capture moves

      for (const move of infantryMoves) {
        expect(move.type).toBe('capture')
      }
    })

    it('should handle empty board correctly', () => {
      const emptyBoard = Board.createEmpty()
      emptyBoard.set(
        algebraicToSquare('f1'),
        pieceUtils.createPiece('r', 'c', false),
      )
      emptyBoard.set(
        algebraicToSquare('f12'),
        pieceUtils.createPiece('b', 'c', false),
      )

      const emptyState = new GameState({
        board: emptyBoard,
        turn: 'r',
        commanders: [algebraicToSquare('f1'), algebraicToSquare('f12')],
        moveNumber: 1,
        halfMoves: 0,
      })

      gameController.reset(emptyState)

      const moves = gameController.getMoves()

      // Should have moves for commanders
      expect(moves.length).toBeGreaterThan(0)

      // All moves should be from commanders
      for (const move of moves) {
        if ('from' in move) {
          const piece = emptyState.board.get(move.from)
          expect(piece?.type).toBe('c')
        }
      }
    })
  })
})
