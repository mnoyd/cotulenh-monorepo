// __tests__/move-session-process-move.test.ts

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

describe('DeploySession.processMove()', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  describe('Session initialization on first deploy move', () => {
    it('should initialize session when no active session exists', () => {
      // Set up position: Red (TM) stack at c3
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      // Verify no session exists
      expect(game.getDeploySession()).toBeNull()

      // Make first deploy move
      const move = game.move({
        from: 'c3',
        to: 'c4',
        piece: TANK,
        deploy: true,
      })
      expect(move).toBeTruthy()

      // Verify session was created
      const session = game.getDeploySession()
      expect(session).toBeTruthy()
      expect(session?.stackSquare).toBe(0x92) // c3
      expect(session?.turn).toBe(RED)
      expect(session?.commands.length).toBe(1)
    })

    it('should store original piece in session', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      const session = game.getDeploySession()
      expect(session?.originalPiece.type).toBe(TANK)
      expect(session?.originalPiece.carrying).toHaveLength(1)
      expect(session?.originalPiece.carrying?.[0].type).toBe(MILITIA)
    })

    it('should store start FEN in session', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      const startFEN = game.fen()
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      const session = game.getDeploySession()
      expect(session?.startFEN).toContain('r - - 0 1') // Should contain turn and move info
    })
  })

  describe('Command execution without history addition', () => {
    it('should execute move command but not add to history', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      const historyBefore = game.history().length

      // Make deploy move
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      // Verify piece moved on board
      expect(game.get('c4')?.type).toBe(TANK)
      expect(game.get('c3')?.type).toBe(MILITIA)

      // Verify history NOT updated
      expect(game.history().length).toBe(historyBefore)
    })

    it('should add command to session', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      const session = game.getDeploySession()
      expect(session?.commands.length).toBe(1)
      expect(session?.commands[0].move.piece.type).toBe(TANK)
    })

    it('should not switch turn during deploy session', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      // Turn should still be RED
      expect(game.turn()).toBe(RED)
    })

    it('should not increment move count during deploy session', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      const moveNumberBefore = game.moveNumber()

      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      // Move number should not change
      expect(game.moveNumber()).toBe(moveNumberBefore)
    })
  })

  describe('Incomplete session returns', () => {
    it('should return incomplete result when pieces remain', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      // Deploy only Tank (Militia remains)
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      // Session should still be active
      const session = game.getDeploySession()
      expect(session).toBeTruthy()
      expect(session?.remaining).toBeTruthy()
      expect(session?.remaining[0]?.type).toBe(MILITIA)
    })

    it('should allow multiple incremental deploy moves', () => {
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

      // Deploy Tank
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      expect(game.getDeploySession()).toBeTruthy()

      // Deploy Militia
      game.move({ from: 'c3', to: 'd3', piece: MILITIA, deploy: true })
      expect(game.getDeploySession()).toBeTruthy()

      // Verify both moves in session
      const session = game.getDeploySession()
      expect(session?.commands.length).toBe(2)
    })
  })

  describe('Auto-commit detection', () => {
    it('should detect when all pieces are deployed', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      // Deploy Tank
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      expect(game.getDeploySession()).toBeTruthy()

      // Deploy Militia - should auto-commit
      game.move({ from: 'c3', to: 'd3', piece: MILITIA, deploy: true })

      // Session should be cleared (auto-committed)
      expect(game.getDeploySession()).toBeNull()
    })

    it('should switch turn after auto-commit', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      // Deploy all pieces
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      game.move({ from: 'c3', to: 'd3', piece: MILITIA, deploy: true })

      // Turn should have switched to BLUE
      expect(game.turn()).toBe(BLUE)
    })

    it('should add to history after auto-commit', () => {
      game.put(
        { type: TANK, color: RED, carrying: [{ type: MILITIA, color: RED }] },
        'c3',
      )
      game['_turn'] = RED

      const historyBefore = game.history().length

      // Deploy all pieces
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })
      game.move({ from: 'c3', to: 'd3', piece: MILITIA, deploy: true })

      // History should have ONE new entry
      expect(game.history().length).toBe(historyBefore + 1)
    })
  })
})
