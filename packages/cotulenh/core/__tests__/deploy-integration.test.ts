// __tests__/deploy-integration.test.ts
// Integration tests for full deploy sequences

import { describe, it, expect, beforeEach } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import { RED, BLUE, TANK, MILITIA, INFANTRY, AIR_FORCE } from '../src/type.js'
import { setupGameBasic } from './test-helpers.js'

describe('Deploy Integration Tests', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  // Note: Basic incremental deployment tests are in move-session-process-move.test.ts
  // This file focuses on complex integration scenarios

  // Note: Single history entry tests are in deploy-auto-commit.test.ts

  // Note: Turn switching tests are in deploy-auto-commit.test.ts

  describe('Deploy undo during session', () => {
    it('should allow undoing individual moves during deployment session', () => {
      game.put(
        {
          type: TANK,
          color: RED,
          carrying: [{ type: INFANTRY, color: RED }],
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
      expect(piece?.carrying).toHaveLength(1)
      expect(game.get('c4')).toBeUndefined()

      // Session should be cleared
      expect(game.getSession()).toBeNull()
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
      expect(game.getSession()).toBeNull()
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
      expect(game.getSession()).toBeTruthy()

      // Continue deployment
      game.move({ from: 'c3', to: 'c4', piece: MILITIA, deploy: true })
      game.move({ from: 'c3', to: 'f3', piece: AIR_FORCE, deploy: true })

      // Should complete successfully
      expect(game.getSession()).toBeNull()
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
      expect(game.getSession()).toBeTruthy()

      // Undo
      game.undo()

      // Session should be cleared
      expect(game.getSession()).toBeNull()

      // FEN should not contain DEPLOY marker
      expect(game.fen()).not.toContain('DEPLOY')
    })
  })

  describe('Complex integration scenarios', () => {
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
          type: AIR_FORCE,
          color: RED,
          carrying: [
            { type: TANK, color: RED },
            { type: INFANTRY, color: RED },
          ],
        },
        'c3',
      )
      game['_turn'] = RED

      // Deploy only Tank
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      // Manually commit (remaining pieces stay)
      const result = game.commitSession()
      expect(result.success).toBe(true)

      // Verify Tank moved
      expect(game.get('c4')?.type).toBe(TANK)

      // Verify remaining pieces stayed at c3
      const stayPiece = game.get('c3')
      expect(stayPiece?.type).toBe(AIR_FORCE)
      expect(stayPiece?.carrying).toHaveLength(1)
      expect(stayPiece?.carrying?.[0].type).toBe(INFANTRY)
    })
  })
})
