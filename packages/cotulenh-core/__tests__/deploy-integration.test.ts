// __tests__/deploy-integration.test.ts
// Integration tests for full deploy sequences

import { describe, it, expect, beforeEach } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import {
  RED,
  BLUE,
  TANK,
  MILITIA,
  INFANTRY,
  NAVY,
  AIR_FORCE,
} from '../src/type.js'
import { setupGameBasic } from './test-helpers.js'

describe('Deploy Integration Tests', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  // Note: Basic incremental deployment tests are in deploy-session-process-move.test.ts
  // This file focuses on complex integration scenarios

  // Note: Single history entry tests are in deploy-auto-commit.test.ts

  // Note: Turn switching tests are in deploy-auto-commit.test.ts

  describe('Deploy with recombine instructions', () => {
    it('should apply recombine instructions when deployment completes', () => {
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: TANK, color: RED },
            { type: INFANTRY, color: RED },
          ],
        },
        'c5', // Water square
      )
      game['_turn'] = RED

      // Deploy Navy to c6
      game.move({ from: 'c5', to: 'c6', piece: NAVY, deploy: true })

      // Deploy Tank to d5
      game.move({ from: 'c5', to: 'd5', piece: TANK, deploy: true })

      // Add recombine instruction: Infantry joins Tank at d5
      game.recombine('c5', 'd5', 'i')

      // Commit the deployment
      const result = game.commitDeploySession()
      expect(result.success).toBe(true)

      // Verify Tank now carries Infantry at d5
      const pieceAtD5 = game.get('d5')
      expect(pieceAtD5?.type).toBe(TANK)
      expect(pieceAtD5?.carrying).toHaveLength(1)
      expect(pieceAtD5?.carrying?.[0].type).toBe(INFANTRY)

      // Verify Navy is at c6
      expect(game.get('c6')?.type).toBe(NAVY)

      // Verify c5 is empty
      expect(game.get('c5')).toBeUndefined()
    })

    it('should handle multiple recombine instructions', () => {
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: TANK, color: RED },
            { type: AIR_FORCE, color: RED },
          ],
        },
        'c5',
      )
      game['_turn'] = RED

      // Deploy Navy to c6
      game.move({ from: 'c5', to: 'c6', piece: NAVY, deploy: true })

      // Deploy Airforce to d5
      game.move({ from: 'c5', to: 'd5', piece: AIR_FORCE, deploy: true })

      // Recombine Tank with Airforce at d5
      game.recombine('c5', 'd5', TANK)

      // Commit
      const result = game.commitDeploySession()
      expect(result.success).toBe(true)

      // Verify Tank carries Infantry
      const pieceAtD5 = game.get('d5')
      expect(pieceAtD5?.type).toBe(AIR_FORCE)
      expect(pieceAtD5?.carrying).toHaveLength(1)
      expect(pieceAtD5?.carrying?.[0].type).toBe(TANK)

      // Verify other pieces are in place
      expect(game.get('c6')?.type).toBe(NAVY)
    })

    it('should undo deployment with recombine instructions', () => {
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: TANK, color: RED },
            { type: INFANTRY, color: RED },
          ],
        },
        'c5',
      )
      game['_turn'] = RED

      const initialFEN = game.fen()

      // Deploy pieces
      game.move({ from: 'c5', to: 'c6', piece: NAVY, deploy: true })
      game.move({ from: 'c5', to: 'd5', piece: TANK, deploy: true })

      // Recombine Infantry with Tank
      game.recombine('c5', 'd5', 'i')

      // Commit
      game.commitDeploySession()

      // Undo the deployment
      game.undo()

      // Should restore original state
      expect(game.fen()).toBe(initialFEN)
      const originalPiece = game.get('c5')
      expect(originalPiece?.type).toBe(NAVY)
      expect(originalPiece?.carrying).toHaveLength(2)
      expect(originalPiece?.carrying?.[0].type).toBe(TANK)
      expect(originalPiece?.carrying?.[1].type).toBe(INFANTRY)
    })
  })

  describe('Deploy undo during session', () => {
    it('should allow undoing individual moves during deployment session', () => {
      game.put(
        {
          type: TANK,
          color: RED,
          carrying: [
            { type: MILITIA, color: RED },
            { type: INFANTRY, color: RED },
          ],
        },
        'c3',
      )
      game['_turn'] = RED

      // Deploy first piece
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      expect(game.get('c4')?.type).toBe(TANK)

      // Undo the first deploy move
      game.undo()

      // Tank should be back in stack
      const piece = game.get('c3')
      expect(piece?.type).toBe(TANK)
      expect(piece?.carrying).toHaveLength(2)
      expect(game.get('c4')).toBeUndefined()

      // Session should be cleared
      expect(game.getDeploySession()).toBeNull()
    })

    it('should allow undoing multiple moves during deployment session', () => {
      game.put(
        {
          type: AIR_FORCE,
          color: RED,
          carrying: [
            { type: TANK, color: RED },
            { type: MILITIA, color: RED },
          ],
        },
        'c3',
      )
      game['_turn'] = RED

      const initialFEN = game.fen()

      // Deploy two pieces
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      game.move({ from: 'c3', to: 'd3', piece: MILITIA, deploy: true })

      // Undo both moves
      game.undo()
      game.undo()

      // Should restore original state
      expect(game.fen()).toBe(initialFEN)
      const piece = game.get('c3')
      expect(piece?.type).toBe(AIR_FORCE)
      expect(piece?.carrying).toHaveLength(2)
      expect(game.getDeploySession()).toBeNull()
    })

    it('should allow continuing deployment after undo', () => {
      game.put(
        {
          type: AIR_FORCE,
          color: RED,
          carrying: [
            { type: TANK, color: RED },
            { type: MILITIA, color: RED },
          ],
        },
        'c3',
      )
      game['_turn'] = RED

      // Deploy first piece
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      // Undo
      game.undo()

      // Deploy to different square
      game.move({ from: 'c3', to: 'd3', piece: TANK, deploy: true })
      expect(game.get('d3')?.type).toBe(TANK)
      expect(game.getDeploySession()).toBeTruthy()

      // Continue deployment
      game.move({ from: 'c3', to: 'c4', piece: MILITIA, deploy: true })
      game.move({ from: 'c3', to: 'f3', piece: AIR_FORCE, deploy: true })

      // Should complete successfully
      expect(game.getDeploySession()).toBeNull()
      expect(game.turn()).toBe(BLUE)
    })

    it('should clear session when undoing the only deploy move', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      // Deploy first piece
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      expect(game.getDeploySession()).toBeTruthy()

      // Undo
      game.undo()

      // Session should be cleared
      expect(game.getDeploySession()).toBeNull()

      // FEN should not contain DEPLOY marker
      expect(game.fen()).not.toContain('DEPLOY')
    })

    it('should handle undo after partial deployment with recombine', () => {
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: TANK, color: RED },
            { type: INFANTRY, color: RED },
          ],
        },
        'c5',
      )
      game['_turn'] = RED

      // Deploy Navy
      game.move({ from: 'c5', to: 'c6', piece: NAVY, deploy: true })

      // Deploy Tank
      game.move({ from: 'c5', to: 'd5', piece: TANK, deploy: true })

      // Add recombine instruction
      game.recombine('c5', 'd5', 'i')

      // Undo Tank deployment
      game.undo()

      // Tank should be back at c5
      const piece = game.get('c5')
      expect(piece?.type).toBe(TANK)
      expect(piece?.carrying).toHaveLength(1)
      expect(piece?.carrying?.[0].type).toBe(INFANTRY)

      // Navy should still be at c6
      expect(game.get('c6')?.type).toBe(NAVY)

      // Session should still be active
      expect(game.getDeploySession()).toBeTruthy()
    })
  })

  describe('Complex integration scenarios', () => {
    it('should handle full deployment lifecycle with all features', () => {
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: AIR_FORCE, color: RED },
            { type: TANK, color: RED },
          ],
        },
        'c5',
      )
      game['_turn'] = RED

      const initialHistoryLength = game.history().length
      const initialMoveNumber = game.moveNumber()

      // Deploy Navy
      game.move({ from: 'c5', to: 'c6', piece: NAVY, deploy: true })
      expect(game.turn()).toBe(RED)
      expect(game.history().length).toBe(initialHistoryLength)

      // Deploy Tank
      game.move({ from: 'c5', to: 'd5', piece: TANK, deploy: true })
      expect(game.turn()).toBe(RED)
      expect(game.history().length).toBe(initialHistoryLength)

      expect(game.history().length).toBe(initialHistoryLength)

      // Add recombine instruction
      game.recombine('c5', 'd5', AIR_FORCE)

      // Commit
      const result = game.commitDeploySession()
      expect(result.success).toBe(true)

      // Verify final state
      expect(game.turn()).toBe(BLUE)
      expect(game.history().length).toBe(initialHistoryLength + 1)
      expect(game.moveNumber()).toBe(initialMoveNumber)

      // Verify pieces
      expect(game.get('c6')?.type).toBe(NAVY)
      expect(game.get('d5')?.type).toBe(AIR_FORCE)
      expect(game.get('d5')?.carrying).toHaveLength(1)
      expect(game.get('d5')?.carrying?.[0].type).toBe(TANK)

      // Undo entire deployment
      game.undo()

      // Verify restoration
      const originalPiece = game.get('c5')
      expect(originalPiece?.type).toBe(NAVY)
      expect(originalPiece?.carrying).toHaveLength(3)
      expect(game.turn()).toBe(RED)
      expect(game.getDeploySession()).toBeNull()
    })

    it('should handle deployment with captures', () => {
      // Set up enemy piece at target square
      game.put({ type: MILITIA, color: BLUE }, 'c4')
      game.put(
        { type: TANK, color: RED, carrying: [{ type: INFANTRY, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      const initialHistoryLength = game.history().length

      // Deploy Tank with capture
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      expect(game.get('c4')?.type).toBe(TANK)
      expect(game.get('c4')?.color).toBe(RED)

      // Deploy Infantry
      game.move({ from: 'c3', to: 'd3', piece: INFANTRY, deploy: true })

      // Should complete with capture
      expect(game.history().length).toBe(initialHistoryLength + 1)
      expect(game.turn()).toBe(BLUE)
    })

    it('should handle deployment with stay pieces', () => {
      game.put(
        {
          type: TANK,
          color: RED,
          carrying: [
            { type: MILITIA, color: RED },
            { type: INFANTRY, color: RED },
          ],
        },
        'c3',
      )
      game['_turn'] = RED

      // Deploy only Tank
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      // Manually commit (remaining pieces stay)
      const result = game.commitDeploySession()
      expect(result.success).toBe(true)

      // Verify Tank moved
      expect(game.get('c4')?.type).toBe(TANK)

      // Verify remaining pieces stayed at c3
      const stayPiece = game.get('c3')
      expect(stayPiece?.type).toBe(MILITIA)
      expect(stayPiece?.carrying).toHaveLength(1)
      expect(stayPiece?.carrying?.[0].type).toBe(INFANTRY)
    })
  })
})
