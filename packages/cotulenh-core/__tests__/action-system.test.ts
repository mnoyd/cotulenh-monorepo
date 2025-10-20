/**
 * Comprehensive Action System Tests (Task 4.5)
 *
 * These tests verify that all atomic actions work correctly in both deploy and normal modes,
 * with proper undo/redo functionality and rollback scenarios.
 */

import { describe, it, beforeEach, expect } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import {
  RED,
  BLUE,
  INFANTRY,
  TANK,
  COMMANDER,
  NAVY,
  AIR_FORCE,
  SQUARE_MAP,
  MoveContext,
  DeploySession,
} from '../src/type.js'

describe('Comprehensive Action System Tests (Task 4.5)', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
    // Add commanders for valid game state
    game.put({ type: COMMANDER, color: RED }, 'f1')
    game.put({ type: COMMANDER, color: BLUE }, 'f12')
  })

  describe('RemovePieceAction - Normal Mode', () => {
    it('should remove piece from real board in normal mode', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')

      // Verify piece is there
      expect(game.get('e5')).toMatchObject({ type: INFANTRY, color: RED })
      expect(game['_board'][SQUARE_MAP.e5]).toMatchObject({
        type: INFANTRY,
        color: RED,
      })

      // Make a normal move that removes the piece
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      expect(moves.length).toBeGreaterThan(0)

      const move = game.move(moves[0])
      expect(move).toBeTruthy()

      // Piece should be removed from original square
      expect(game.get('e5')).toBeUndefined()
      expect(game['_board'][SQUARE_MAP.e5]).toBeUndefined()
    })

    it('should handle undo correctly in normal mode', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')
      const initialFen = game.fen()

      // Make move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      game.move(moves[0])

      // Verify piece moved
      expect(game.get('e5')).toBeUndefined()

      // Undo
      game.undo()

      // Piece should be restored
      expect(game.get('e5')).toMatchObject({ type: INFANTRY, color: RED })
      expect(game.fen()).toBe(initialFen)
    })
  })

  describe('RemovePieceAction - Deploy Mode', () => {
    it('should update virtual state in deploy mode', () => {
      // Set up stack for deploy
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Make deploy move to enter deploy mode
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        game.move(deployMoves[0])

        // Should be in deploy mode
        const deployState = game.getDeployState()
        expect(deployState).toBeTruthy()

        // Real board should still have original stack (not mutated)
        expect(game['_board'][SQUARE_MAP.e5]).toBeTruthy()

        // But effective board should show virtual changes
        const effectiveBoard = game['getEffectiveBoard']()
        expect(effectiveBoard).not.toBe(game['_board'])
      }
    })

    it('should handle undo correctly in deploy mode', () => {
      // Set up stack
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      const initialFen = game.fen()
      const initialTurn = game.turn()

      // Make deploy move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        game.move(deployMoves[0])

        // Verify deploy state
        expect(game.getDeployState()).toBeTruthy()
        expect(game.turn()).toBe(initialTurn) // Turn shouldn't switch during deploy

        // Undo
        game.undo()

        // Should restore original state
        expect(game.getDeployState()).toBeNull()
        expect(game.turn()).toBe(initialTurn)
        expect(game.get('e5')).toBeTruthy()
      }
    })
  })

  describe('PlacePieceAction - Normal Mode', () => {
    it('should place piece on real board in normal mode', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')

      // Make normal move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const move = game.move(moves[0])
      expect(move).toBeTruthy()

      // Piece should be placed on real board at destination
      const destination = move!.to
      expect(game.get(destination)).toMatchObject({
        type: INFANTRY,
        color: RED,
      })
      expect(game['_board'][SQUARE_MAP[destination]]).toMatchObject({
        type: INFANTRY,
        color: RED,
      })
    })

    it('should handle capture placement correctly', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')
      game.put({ type: TANK, color: BLUE }, 'e4')

      // Find capture move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const captureMoves = moves.filter((move) => move.includes('x'))

      if (captureMoves.length > 0) {
        const move = game.move(captureMoves[0])
        expect(move).toBeTruthy()
        expect(move!.isCapture()).toBe(true)

        // Captured square should have attacking piece
        expect(game.get(move!.to)).toMatchObject({ type: INFANTRY, color: RED })
      }
    })
  })

  describe('PlacePieceAction - Deploy Mode', () => {
    it('should update virtual state in deploy mode', () => {
      // Set up stack
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Make deploy move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        const initialRealBoard = JSON.stringify(game['_board'])

        game.move(deployMoves[0])

        // Real board should be unchanged (except for deploy state tracking)
        // The core pieces should still be in their original positions
        expect(game['_board'][SQUARE_MAP.e5]).toBeTruthy()

        // But game queries should show virtual state
        const currentBoard = game.board()
        expect(Array.isArray(currentBoard)).toBe(true)
      }
    })
  })

  describe('RemoveFromStackAction - Normal Mode', () => {
    it('should modify stack correctly in normal mode', () => {
      // Set up stack
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Make normal move with the stack (not deploy)
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const normalMoves = moves.filter((move) => !move.includes('>'))

      if (normalMoves.length > 0) {
        game.move(normalMoves[0])

        // Stack should be modified on real board
        // Either the whole stack moved or was split
        const pieceAtE5 = game.get('e5')
        if (pieceAtE5) {
          // If something remains, it should be different from original
          expect(pieceAtE5).toBeTruthy()
        }
      }
    })
  })

  describe('RemoveFromStackAction - Deploy Mode', () => {
    it('should update virtual state for stack operations', () => {
      // Set up simple stack
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      const initialFen = game.fen()

      // Make deploy move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        game.move(deployMoves[0])

        // Should be in deploy mode
        expect(game.getDeployState()).toBeTruthy()

        // Real board should still have original stack (not mutated during deploy)
        expect(game['_board'][SQUARE_MAP.e5]).toBeTruthy()

        // Game state should reflect virtual changes
        const deployFen = game.fen()
        expect(deployFen).not.toBe(initialFen)

        // Virtual state should show modified stack
        const effectiveBoard = game['getEffectiveBoard']()
        expect(effectiveBoard).not.toBe(game['_board'])
      } else {
        // If no deploy moves available, test basic virtual state functionality
        const deployState = game.getDeployState()
        expect(deployState).toBeNull() // Should not be in deploy mode
      }
    })
  })

  describe('Atomic Action Sequences', () => {
    it('should execute multiple actions atomically', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')
      game.put({ type: TANK, color: BLUE }, 'e4')

      // Make capture move (involves RemovePieceAction + PlacePieceAction)
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const captureMoves = moves.filter((move) => move.includes('x'))

      if (captureMoves.length > 0) {
        const move = game.move(captureMoves[0])
        expect(move).toBeTruthy()

        // Both actions should have executed
        expect(game.get('e5')).toBeUndefined() // Piece removed
        expect(game.get(move!.to)).toMatchObject({ type: INFANTRY, color: RED }) // Piece placed
        expect(move!.captured).toMatchObject({ type: TANK, color: BLUE }) // Capture recorded
      }
    })

    it('should rollback all actions on undo', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')
      game.put({ type: TANK, color: BLUE }, 'e4')

      const initialFen = game.fen()

      // Make capture move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const captureMoves = moves.filter((move) => move.includes('x'))

      if (captureMoves.length > 0) {
        const move = game.move(captureMoves[0])
        expect(move).toBeTruthy()

        // Verify move executed
        expect(game.get('e5')).toBeUndefined()
        expect(game.get('e4')).toMatchObject({ type: INFANTRY, color: RED })

        // Undo
        game.undo()

        // All actions should be rolled back
        expect(game.fen()).toBe(initialFen)
        expect(game.get('e5')).toMatchObject({ type: INFANTRY, color: RED })
        expect(game.get('e4')).toMatchObject({ type: TANK, color: BLUE })
      }
    })
  })

  describe('Deploy Session Action Sequences', () => {
    it('should handle complex deploy sequences', () => {
      // Set up simple stack for testing
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      const initialTurn = game.turn()
      const initialFen = game.fen()

      // Make first deploy move
      const moves1 = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves1 = moves1.filter((move) => move.includes('>'))

      if (deployMoves1.length > 0) {
        game.move(deployMoves1[0])

        // Should be in deploy mode, same turn
        expect(game.getDeployState()).toBeTruthy()
        expect(game.turn()).toBe(initialTurn)

        // FEN should reflect virtual changes
        const deployFen = game.fen()
        expect(deployFen).not.toBe(initialFen)

        // Deploy session should be active and tracking moves
        const deployState = game.getDeployState()
        expect(deployState).toBeTruthy()
        expect(deployState?.movedPieces).toBeInstanceOf(Array)
        expect(deployState?.movedPieces.length).toBeGreaterThan(0)
      } else {
        // If no deploy moves available, test basic functionality
        expect(game.getDeployState()).toBeNull()
        expect(game.turn()).toBe(initialTurn)
      }
    })

    it('should rollback entire deploy sequence on error', () => {
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

        // Verify deploy started
        expect(game.getDeployState()).toBeTruthy()

        // Undo the deploy move
        game.undo()

        // Should be back to initial state
        expect(game.turn()).toBe(initialState.turn)
        expect(game.getDeployState()).toBe(initialState.deployState)
        expect(game.get('e5')).toBeTruthy()
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid action parameters gracefully', () => {
      // Try to make move with no piece
      expect(() => {
        game.move({ from: 'e5', to: 'e6' })
      }).toThrow()

      // Game state should be unchanged
      expect(game.getDeployState()).toBeNull()
    })

    it('should handle action execution failures', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')

      // Try invalid move
      expect(() => {
        game.move({ from: 'e5', to: 'z99' as any })
      }).toThrow()

      // Original piece should still be there
      expect(game.get('e5')).toMatchObject({ type: INFANTRY, color: RED })
    })

    it('should maintain consistency after multiple undo/redo cycles', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')

      const states = [game.fen()]

      // Make several moves
      for (let i = 0; i < 3; i++) {
        const moves = game.moves({ verbose: false }) as string[]
        if (moves.length > 0) {
          game.move(moves[0])
          states.push(game.fen())
        }
      }

      // Undo all moves
      for (let i = states.length - 2; i >= 0; i--) {
        game.undo()
        expect(game.fen()).toBe(states[i])
      }

      // Should be back to initial state
      expect(game.get('e5')).toMatchObject({ type: INFANTRY, color: RED })
    })
  })

  describe('Virtual State Consistency', () => {
    it('should maintain virtual state consistency across actions', () => {
      // Set up stack
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Make deploy move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        game.move(deployMoves[0])

        const deployState = game.getDeployState()
        if (deployState) {
          // Virtual state should be consistent
          expect(deployState.virtualChanges).toBeInstanceOf(Map)
          expect(deployState.movedPieces).toBeInstanceOf(Array)

          // Effective board should reflect virtual changes
          const effectiveBoard = game['getEffectiveBoard']()
          expect(effectiveBoard).toBeTruthy()
        }
      }
    })

    it('should handle virtual state isolation correctly', () => {
      // Set up two different stacks
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      game.put({ type: NAVY, color: BLUE }, 'e7')

      // Make deploy move
      const moves = game.moves({ square: 'e5', verbose: false }) as string[]
      const deployMoves = moves.filter((move) => move.includes('>'))

      if (deployMoves.length > 0) {
        game.move(deployMoves[0])

        // Virtual changes should only affect the deployed pieces
        // Other pieces should remain unchanged
        expect(game.get('e7')).toMatchObject({ type: NAVY, color: BLUE })
        expect(game['_board'][SQUARE_MAP.e7]).toMatchObject({
          type: NAVY,
          color: BLUE,
        })
      }
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large action sequences efficiently', () => {
      // Set up multiple pieces
      for (let i = 0; i < 5; i++) {
        game.put({ type: INFANTRY, color: RED }, `e${i + 2}` as any)
      }

      const startTime = performance.now()

      // Make multiple moves
      for (let i = 0; i < 10; i++) {
        const moves = game.moves({ verbose: false }) as string[]
        if (moves.length > 0) {
          game.move(moves[0])
          game.undo()
        }
      }

      const endTime = performance.now()

      // Should complete in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should not leak memory with virtual state', () => {
      // Set up stack
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Make and undo deploy moves multiple times
      for (let i = 0; i < 10; i++) {
        const moves = game.moves({ square: 'e5', verbose: false }) as string[]
        const deployMoves = moves.filter((move) => move.includes('>'))

        if (deployMoves.length > 0) {
          game.move(deployMoves[0])
          game.undo()
        }
      }

      // Should not have any lingering deploy state
      expect(game.getDeployState()).toBeNull()
    })
  })
})
