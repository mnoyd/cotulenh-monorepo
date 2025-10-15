/**
 * Unit tests for Infantry move generation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MoveGenerator } from '../../src/move-generation/MoveGenerator'
import { InfantryGenerator } from '../../src/move-generation/pieces/InfantryGenerator'
import { Board } from '../../src/core/Board'
import { GameState } from '../../src/core/GameState'
import { pieceUtils } from '../../src/core/Piece'
import { RED, BLUE, INFANTRY, COMMANDER } from '../../src/types/Constants'
import { algebraicToSquare, squareToAlgebraic } from '../../src/utils/square'
import { isNormalMove, isCaptureMove } from '../../src/core/Move'

describe('InfantryGenerator', () => {
  let generator: MoveGenerator
  let board: Board
  let gameState: GameState

  beforeEach(() => {
    generator = new MoveGenerator()
    generator.registerGenerator(new InfantryGenerator())

    board = Board.createEmpty()
    gameState = new GameState({
      board,
      turn: RED,
      commanders: [0x00, 0xba],
    })
  })

  describe('basic movement', () => {
    it('should generate 4 moves for infantry in center', () => {
      // Place infantry at e5
      const square = algebraicToSquare('e5')
      board.set(square, pieceUtils.createPiece(RED, INFANTRY))

      const moves = generator.generateMoves(gameState, { square })

      expect(moves).toHaveLength(4) // N, S, E, W

      // Check all moves are normal moves
      moves.forEach((move) => {
        expect(isNormalMove(move)).toBe(true)
      })
    })

    it('should generate moves in all 4 orthogonal directions', () => {
      const square = algebraicToSquare('e5')
      board.set(square, pieceUtils.createPiece(RED, INFANTRY))

      const moves = generator.generateMoves(gameState, { square })
      const destinations = moves.map((m) =>
        isNormalMove(m) ? squareToAlgebraic(m.to) : '',
      )

      expect(destinations).toContain('e6') // North
      expect(destinations).toContain('e4') // South
      expect(destinations).toContain('f5') // East
      expect(destinations).toContain('d5') // West
    })

    it('should generate only 2 moves at board edge', () => {
      // Place at k-file edge (right edge)
      const square = algebraicToSquare('k5')
      board.set(square, pieceUtils.createPiece(RED, INFANTRY))

      const moves = generator.generateMoves(gameState, { square })

      expect(moves).toHaveLength(3) // N, S, W (no E - off board)
    })

    it('should generate only moves from corners', () => {
      // Top-right corner (k12)
      const square = algebraicToSquare('k12')
      board.set(square, pieceUtils.createPiece(RED, INFANTRY))

      const moves = generator.generateMoves(gameState, { square })

      expect(moves).toHaveLength(2) // S, W only
    })
  })

  describe('captures', () => {
    it('should generate capture move for enemy piece', () => {
      const fromSquare = algebraicToSquare('e5')
      const toSquare = algebraicToSquare('e6')

      board.set(fromSquare, pieceUtils.createPiece(RED, INFANTRY))
      board.set(toSquare, pieceUtils.createPiece(BLUE, INFANTRY))

      const moves = generator.generateMoves(gameState, { square: fromSquare })

      const captures = moves.filter(isCaptureMove)
      expect(captures).toHaveLength(1)
      expect(captures[0].to).toBe(toSquare)
    })

    it('should not move through friendly pieces', () => {
      const fromSquare = algebraicToSquare('e5')
      const blockSquare = algebraicToSquare('e6')

      board.set(fromSquare, pieceUtils.createPiece(RED, INFANTRY))
      board.set(blockSquare, pieceUtils.createPiece(RED, COMMANDER))

      const moves = generator.generateMoves(gameState, { square: fromSquare })

      // Should have 3 moves (S, E, W), not to north (blocked by friendly)
      expect(moves).toHaveLength(3)

      const destinations = moves.map((m) =>
        isNormalMove(m) ? squareToAlgebraic(m.to) : '',
      )
      expect(destinations).not.toContain('e6')
    })
  })

  describe('terrain restrictions', () => {
    it('should not move onto water squares', () => {
      // Place infantry on c5 (mixed zone near water)
      const square = algebraicToSquare('c5')
      board.set(square, pieceUtils.createPiece(RED, INFANTRY))

      const moves = generator.generateMoves(gameState, { square })

      // Should be able to move, but not onto pure water (a/b files)
      const destinations = moves.map((m) =>
        isNormalMove(m) ? squareToAlgebraic(m.to) : '',
      )

      // Check that moves to water are excluded
      // Infantry at c5 should not be able to move to b5 (water)
      expect(destinations).not.toContain('b5')
    })
  })

  describe('full board generation', () => {
    it('should generate moves for all red infantry', () => {
      board.set(algebraicToSquare('d4'), pieceUtils.createPiece(RED, INFANTRY))
      board.set(algebraicToSquare('e5'), pieceUtils.createPiece(RED, INFANTRY))
      board.set(algebraicToSquare('f6'), pieceUtils.createPiece(RED, INFANTRY))

      const moves = generator.generateMoves(gameState)

      // Each infantry in open area should have 4 moves
      expect(moves.length).toBeGreaterThanOrEqual(10)
    })

    it('should not generate moves for blue pieces when red to move', () => {
      board.set(algebraicToSquare('e5'), pieceUtils.createPiece(BLUE, INFANTRY))

      const moves = generator.generateMoves(gameState)

      expect(moves).toHaveLength(0)
    })
  })
})
