// __tests__/deploy-auto-commit.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import { RED, BLUE, TANK, MILITIA, INFANTRY, AIR_FORCE } from '../src/type.js'
import { setupGameBasic } from './test-helpers.js'

describe('Deploy Auto-Commit Behavior', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  describe('Auto-commit trigger', () => {
    it('should auto-commit when all pieces are deployed', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      // Deploy Tank
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      expect(game.getSession()).toBeTruthy()

      // Deploy Militia - should trigger auto-commit
      game.move({ from: 'c3', to: 'd3', piece: MILITIA, deploy: true })

      // Session should be cleared
      expect(game.getSession()).toBeNull()
    })

    it('should not auto-commit when pieces remain', () => {
      game.put(
        {
          type: TANK,
          color: RED,
          carrying: [{ type: MILITIA, color: RED }],
        },
        'c3',
      )
      game['_turn'] = RED

      // Deploy only two pieces
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      // Session should still be active (Infantry remains)
      expect(game.getSession()).toBeTruthy()
      expect(game.getSession()?.remaining?.[0]?.type).toBe(MILITIA)
    })
  })

  // Note: Deploy move handling details are tested in move-session-process-move.test.ts

  // Note: Session clearing is tested in move-session-process-move.test.ts

  describe('Turn switching', () => {
    it('should switch turn after auto-commit', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      // Deploy all pieces
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      game.move({ from: 'c3', to: 'd3', piece: MILITIA, deploy: true })

      // Turn should be BLUE
      expect(game.turn()).toBe(BLUE)
    })

    it('should not switch turn during incremental deploys', () => {
      game.put(
        {
          type: TANK,
          color: RED,
          carrying: [{ type: MILITIA, color: RED }],
        },
        'c3',
      )
      game['_turn'] = RED

      // Deploy first piece
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      expect(game.turn()).toBe(RED)

      // Deploy second piece
      game.move({ from: 'c3', to: 'd3', piece: MILITIA, deploy: true })
      expect(game.turn()).toBe(BLUE)
    })

    it('should increment move number correctly after auto-commit', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      const moveNumberBefore = game.moveNumber()

      // Deploy all pieces
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      game.move({ from: 'c3', to: 'd3', piece: MILITIA, deploy: true })

      // Move number should not change (RED's turn)
      expect(game.moveNumber()).toBe(moveNumberBefore)
    })

    it('should increment move number when BLUE auto-commits', () => {
      game.put(
        { type: TANK, color: BLUE, carrying: [{ type: MILITIA, color: BLUE }] },
        'c9',
      )
      game['_turn'] = BLUE

      const moveNumberBefore = game.moveNumber()

      // Deploy all pieces
      game.move({ from: 'c9', to: 'c8', piece: TANK, deploy: true })
      game.move({ from: 'c9', to: 'd9', piece: MILITIA, deploy: true })

      // Move number should increment (BLUE's turn)
      expect(game.moveNumber()).toBe(moveNumberBefore + 1)
    })
  })

  describe('History management', () => {
    it('should add single entry to history after auto-commit', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      const historyBefore = game.history().length

      // Deploy all pieces
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      game.move({ from: 'c3', to: 'd3', piece: MILITIA, deploy: true })

      // Should have exactly one new entry
      expect(game.history().length).toBe(historyBefore + 1)
    })

    it('should allow undo of auto-committed deploy', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      const fenBefore = game.fen()

      // Deploy all pieces
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      game.move({ from: 'c3', to: 'd3', piece: MILITIA, deploy: true })

      // Undo the deploy
      game.undo()

      // Should restore original state
      expect(game.fen()).toBe(fenBefore)
      expect(game.turn()).toBe(RED)

      // Original stack should be restored
      const piece = game.get('c3')
      expect(piece?.type).toBe(TANK)
      expect(piece?.carrying).toHaveLength(1)
      expect(piece?.carrying?.[0].type).toBe(MILITIA)

      // Deployed squares should be empty
      expect(game.get('c4')).toBeUndefined()
      expect(game.get('d3')).toBeUndefined()
    })
  })

  // Note: Error handling is tested in move-session-process-move.test.ts
})
