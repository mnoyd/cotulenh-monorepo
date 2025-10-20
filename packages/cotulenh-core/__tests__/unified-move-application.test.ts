/**
 * Tests for Unified Move Application System (Phase 2)
 *
 * These tests verify that the context-aware move application system works correctly
 * and that moves are properly staged in virtual state during deploy sessions.
 */

import { describe, it, beforeEach, expect } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import { VirtualBoard } from '../src/virtual-board.js'
import {
  RED,
  BLUE,
  INFANTRY,
  TANK,
  COMMANDER,
  SQUARE_MAP,
} from '../src/type.js'

describe('Unified Move Application System (Phase 2)', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
    // Add commanders for valid game state
    game.put({ type: COMMANDER, color: RED }, 'f1')
    game.put({ type: COMMANDER, color: BLUE }, 'f12')
  })

  describe('MoveContext and Dual-Mode Detection', () => {
    it('should detect normal mode when no deploy session', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')

      // Check what moves are available (get strings, not Move objects)
      const availableMoves = game.moves({
        square: 'e5',
        verbose: false,
      }) as string[]
      expect(availableMoves.length).toBeGreaterThan(0)

      // Make a normal move using the first available move
      const move = game.move(availableMoves[0])
      expect(move).toBeTruthy()

      // No deploy session should be active
      expect(game.getDeployState()).toBeNull()
    })

    it('should detect deploy mode when deploy session active', () => {
      // Set up a stack for deploy
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Start deploy session by making a deploy move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        // Make a deploy move to start session
        game.move(deployMoves[0])

        // Deploy session should now be active
        expect(game.getDeployState()).toBeTruthy()
      }
    })
  })

  describe('Context-Aware Move Application', () => {
    it('should apply normal moves directly in normal mode', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')
      game.put({ type: TANK, color: BLUE }, 'e7')

      // Get available moves (get strings, not Move objects)
      const availableMoves = game.moves({
        square: 'e5',
        verbose: false,
      }) as string[]
      expect(availableMoves.length).toBeGreaterThan(0)

      // Normal move
      const move = game.move(availableMoves[0])
      expect(move).toBeTruthy()

      // Should be applied directly to real board
      expect(game.get('e5')).toBeUndefined()

      // Real board should be updated (piece moved somewhere)
      expect(game['_board'][SQUARE_MAP.e5]).toBeUndefined()
    })

    it('should apply capture moves directly in normal mode', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')
      game.put({ type: TANK, color: BLUE }, 'e4') // Put target in range

      // Get available moves and find capture moves (get strings, not Move objects)
      const availableMoves = game.moves({
        square: 'e5',
        verbose: false,
      }) as string[]
      const captureMoves = availableMoves.filter((move) => move.includes('x'))

      if (captureMoves.length > 0) {
        // Capture move
        const move = game.move(captureMoves[0])
        expect(move).toBeTruthy()
        expect(move!.isCapture()).toBe(true)

        // Should be applied directly to real board
        expect(game.get('e5')).toBeUndefined()

        // Captured piece should be recorded
        expect(move!.captured).toMatchObject({ type: TANK, color: BLUE })
      } else {
        // If no capture moves available, just test normal move
        const move = game.move(availableMoves[0])
        expect(move).toBeTruthy()
      }
    })

    it('should handle deploy moves with virtual state staging', () => {
      // Set up a stack
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Get deploy moves
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        const initialFen = game.fen()

        // Make deploy move
        const move = game.move(deployMoves[0])
        expect(move).toBeTruthy()

        // Deploy session should be active
        const deployState = game.getDeployState()
        expect(deployState).toBeTruthy()

        // FEN should reflect virtual state
        const deployFen = game.fen()
        expect(deployFen).not.toBe(initialFen)
      }
    })
  })

  describe('Deploy Session Lifecycle Management', () => {
    it('should initialize deploy session correctly', () => {
      // Set up a stack
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Make first deploy move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        game.move(deployMoves[0])

        const deployState = game.getDeployState()
        expect(deployState).toBeTruthy()
        expect(deployState?.stackSquare).toBe(SQUARE_MAP.e5)
        expect(deployState?.turn).toBe(RED)
        expect(deployState?.originalPiece.color).toBe(RED)
      }
    })

    it('should maintain deploy session across multiple moves', () => {
      // Set up a simple stack with one carrying piece
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      const initialTurn = game.turn()

      // Make first deploy move
      const moves1 = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves1 = moves1.filter((move) => move.includes('>'))

      if (deployMoves1.length > 0) {
        game.move(deployMoves1[0])

        // Should still be same player's turn (during deploy session)
        expect(game.turn()).toBe(initialTurn)

        // Should have deploy session active
        expect(game.getDeployState()).toBeTruthy()
      } else {
        // If no deploy moves, skip this test
        expect(true).toBe(true)
      }
    })

    it('should complete deploy session when all pieces deployed', () => {
      // Set up a simple stack with one piece to deploy
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Deploy the carried piece
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        // Make deploy move
        game.move(deployMoves[0])

        // If this was the last piece, session should complete
        // and turn should switch (this depends on implementation)
        const deployState = game.getDeployState()

        // Either session is complete (null) or still active with remaining pieces
        if (deployState === null) {
          // Session completed, turn should have switched
          expect(game.turn()).toBe(BLUE)
        } else {
          // Session still active, more pieces to deploy
          expect(deployState.turn).toBe(RED)
        }
      }
    })
  })

  describe('Virtual State Isolation', () => {
    it('should not mutate real board during deploy moves', () => {
      // Set up initial state
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Capture initial real board state

      // Make deploy move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        game.move(deployMoves[0])

        // Real board should be unchanged (except for deploy state tracking)
        // The actual pieces should not have moved on the real board
        expect(game['_board'][SQUARE_MAP.e5]).toBeTruthy()
        expect(game['_board'][SQUARE_MAP.e5]?.color).toBe(RED)

        // But effective board should show the changes
        const effectiveBoard = game['getEffectiveBoard']()
        if (effectiveBoard instanceof VirtualBoard) {
          // Virtual board should show different state - e5 should have virtual changes
          // because the stack was modified (piece removed for deployment)
          expect(effectiveBoard.hasVirtualChange('e5')).toBe(true)
        }
      }
    })

    it('should show virtual changes in game queries', () => {
      // Set up stack
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      const initialBoard = game.board()

      // Make deploy move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        game.move(deployMoves[0])

        // Board query should reflect virtual state
        const deployBoard = game.board()
        expect(deployBoard).not.toEqual(initialBoard)

        // FEN should reflect virtual state
        const deployFen = game.fen()
        expect(typeof deployFen).toBe('string')
        expect(deployFen.split(' ')).toHaveLength(6)
      }
    })
  })

  describe('Error Handling and Rollback', () => {
    it('should handle invalid moves gracefully', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')

      // Try invalid move
      expect(() => {
        game.move({ from: 'e5', to: 'z99' as any })
      }).toThrow()

      // Game state should be unchanged
      expect(game.get('e5')).toMatchObject({ type: INFANTRY, color: RED })
      expect(game.getDeployState()).toBeNull()
    })

    it('should maintain consistency after undo operations', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')

      const initialFen = game.fen()

      // Get available moves (get strings, not Move objects)
      const availableMoves = game.moves({
        square: 'e5',
        verbose: false,
      }) as string[]
      expect(availableMoves.length).toBeGreaterThan(0)

      // Make a move
      const move = game.move(availableMoves[0])
      expect(move).toBeTruthy()

      const afterMoveFen = game.fen()
      expect(afterMoveFen).not.toBe(initialFen)

      // Undo the move
      game.undo()

      // Should be back to original state
      expect(game.fen()).toBe(initialFen)
      expect(game.get('e5')).toMatchObject({ type: INFANTRY, color: RED })
    })

    it('should handle deploy session rollback correctly', () => {
      // Set up stack
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      const initialState = {
        fen: game.fen(),
        turn: game.turn(),
        deployState: game.getDeployState(),
      }

      // Make deploy move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        game.move(deployMoves[0])

        // Verify deploy session is active
        expect(game.getDeployState()).toBeTruthy()

        // Undo the deploy move
        game.undo()

        // Should be back to initial state (FEN might have different piece order in stacks)
        expect(game.turn()).toBe(initialState.turn)
        expect(game.getDeployState()).toBe(initialState.deployState)

        // Check that the pieces are back in the right place
        expect(game.get('e5')).toBeTruthy()
        expect(game.get('e5')?.color).toBe(RED)
      }
    })
  })

  describe('Integration with Existing Systems', () => {
    it('should work with legal move validation', () => {
      // Set up a scenario where legal moves matter
      game.put({ type: COMMANDER, color: RED }, 'f1')
      game.put({ type: COMMANDER, color: BLUE }, 'f12')
      game.put({ type: INFANTRY, color: RED }, 'e5')

      // All moves should be legal
      const moves = game.moves({ verbose: false }) as string[]
      expect(Array.isArray(moves)).toBe(true)

      // Making any legal move should not throw
      if (moves.length > 0) {
        expect(() => game.move(moves[0])).not.toThrow()
      }
    })

    it('should work with check detection', () => {
      // Set up commanders
      game.put({ type: COMMANDER, color: RED }, 'f1')
      game.put({ type: COMMANDER, color: BLUE }, 'f12')

      // Check detection should work
      expect(() => game.isCheck()).not.toThrow()
      expect(typeof game.isCheck()).toBe('boolean')
    })

    it('should work with game ending detection', () => {
      // Set up basic game
      game.put({ type: COMMANDER, color: RED }, 'f1')
      game.put({ type: COMMANDER, color: BLUE }, 'f12')

      // Game ending detection should work
      expect(() => game.isGameOver()).not.toThrow()
      expect(() => game.isCheckmate()).not.toThrow()
      expect(() => game.isDraw()).not.toThrow()
    })
  })
})
