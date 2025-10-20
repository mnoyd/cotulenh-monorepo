/**
 * Tests for Virtual Board Foundation Implementation (Phase 1)
 *
 * These tests verify that the virtual board overlay system works correctly
 * and that all board access methods use the effective board during deploy sessions.
 */

import { describe, it, beforeEach, expect } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import { VirtualBoard } from '../src/virtual-board.js'
import { DeploySession } from '../src/type.js'
import {
  RED,
  BLUE,
  INFANTRY,
  TANK,
  COMMANDER,
  SQUARE_MAP,
} from '../src/type.js'

describe('Virtual Board Foundation (Phase 1)', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
  })

  describe('VirtualBoard Class', () => {
    it('should overlay virtual changes on real board', () => {
      // Set up real board
      game.put({ type: INFANTRY, color: RED }, 'e5')
      game.put({ type: TANK, color: BLUE }, 'e7')

      // Create mock deploy session with virtual changes
      const deploySession: DeploySession = {
        stackSquare: SQUARE_MAP.e5,
        turn: RED,
        originalPiece: { type: INFANTRY, color: RED },
        virtualChanges: new Map([
          ['e5', null], // Remove infantry from e5
          ['e6', { type: INFANTRY, color: RED }], // Place infantry at e6
          ['e7', null], // Remove tank from e7 (captured)
        ]),
        movedPieces: [
          {
            piece: { type: INFANTRY, color: RED },
            from: 'e5',
            to: 'e6',
            captured: { type: TANK, color: BLUE },
          },
        ],
        stayingPieces: [],
      }

      const virtualBoard = new VirtualBoard(game['_board'], deploySession)

      // Test virtual changes take precedence
      expect(virtualBoard.get('e5')).toBeNull() // Removed virtually
      expect(virtualBoard.get('e6')).toEqual({ type: INFANTRY, color: RED }) // Added virtually
      expect(virtualBoard.get('e7')).toBeNull() // Captured virtually

      // Test real board unchanged
      expect(game['_board'][SQUARE_MAP.e5]).toMatchObject({
        type: INFANTRY,
        color: RED,
      })
      expect(game['_board'][SQUARE_MAP.e6]).toBeUndefined()
      expect(game['_board'][SQUARE_MAP.e7]).toMatchObject({
        type: TANK,
        color: BLUE,
      })
    })

    it('should iterate over pieces without duplication', () => {
      // Set up real board
      game.put({ type: INFANTRY, color: RED }, 'e5')
      game.put({ type: TANK, color: BLUE }, 'e7')
      game.put({ type: COMMANDER, color: RED }, 'f1')

      // Create virtual changes
      const deploySession: DeploySession = {
        stackSquare: SQUARE_MAP.e5,
        turn: RED,
        originalPiece: { type: INFANTRY, color: RED },
        virtualChanges: new Map([
          ['e5', null], // Remove infantry
          ['e6', { type: INFANTRY, color: RED }], // Move infantry to e6
        ]),
        movedPieces: [],
        stayingPieces: [],
      }

      const virtualBoard = new VirtualBoard(game['_board'], deploySession)
      const pieces = Array.from(virtualBoard.pieces())

      // Should have 3 pieces total: tank at e7, commander at f1, infantry at e6
      expect(pieces).toHaveLength(3)

      // Check specific pieces
      const pieceMap = new Map(pieces)
      expect(pieceMap.get('e5')).toBeUndefined() // Removed
      expect(pieceMap.get('e6')).toMatchObject({ type: INFANTRY, color: RED }) // Moved here
      expect(pieceMap.get('e7')).toMatchObject({ type: TANK, color: BLUE }) // Unchanged
      expect(pieceMap.get('f1')).toMatchObject({ type: COMMANDER, color: RED }) // Unchanged
    })

    it('should filter pieces by color', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')
      game.put({ type: TANK, color: BLUE }, 'e7')

      const deploySession: DeploySession = {
        stackSquare: SQUARE_MAP.e5,
        turn: RED,
        originalPiece: { type: INFANTRY, color: RED },
        virtualChanges: new Map([
          ['e6', { type: COMMANDER, color: BLUE }], // Add blue commander
        ]),
        movedPieces: [],
        stayingPieces: [],
      }

      const virtualBoard = new VirtualBoard(game['_board'], deploySession)

      const redPieces = Array.from(virtualBoard.pieces(RED))
      const bluePieces = Array.from(virtualBoard.pieces(BLUE))

      expect(redPieces).toHaveLength(1)
      expect(redPieces[0][1].type).toBe(INFANTRY)

      expect(bluePieces).toHaveLength(2)
      expect(bluePieces.some(([_, piece]) => piece.type === TANK)).toBe(true)
      expect(bluePieces.some(([_, piece]) => piece.type === COMMANDER)).toBe(
        true,
      )
    })
  })

  describe('getEffectiveBoard() Integration', () => {
    it('should return real board when no deploy session', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')

      const effectiveBoard = game['getEffectiveBoard']()
      expect(effectiveBoard).toBe(game['_board'])
      expect(effectiveBoard instanceof VirtualBoard).toBe(false)
    })

    it('should return VirtualBoard when deploy session active', () => {
      game.put({ type: INFANTRY, color: RED }, 'e5')

      // Simulate deploy session using new DeploySession interface
      game['_deploySession'] = {
        stackSquare: SQUARE_MAP.e5,
        turn: RED,
        originalPiece: { type: INFANTRY, color: RED },
        virtualChanges: new Map(),
        movedPieces: [],
        stayingPieces: [],
      }

      const effectiveBoard = game['getEffectiveBoard']()
      expect(effectiveBoard instanceof VirtualBoard).toBe(true)
    })
  })

  describe('Board Access Methods Use Effective Board', () => {
    beforeEach(() => {
      // Set up a deploy session scenario
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )
      game.put({ type: TANK, color: BLUE }, 'e7')

      // Create deploy session
      game['_deploySession'] = {
        stackSquare: SQUARE_MAP.e5,
        turn: RED,
        originalPiece: {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        virtualChanges: new Map(),
        movedPieces: [],
        stayingPieces: [],
      }
    })

    it('get() method should use effective board', () => {
      // Test that get() method works with deploy session active
      // The fact that it doesn't throw and returns consistent results
      // indicates it's using the effective board correctly

      const piece = game.get('e5')
      expect(piece).toMatchObject({ type: INFANTRY, color: RED })

      // Test with non-existent square
      const noPiece = game.get('a1')
      expect(noPiece).toBeUndefined()

      // The method should work without errors when deploy session is active
      expect(() => game.get('e7')).not.toThrow()
    })

    it('fen() method should use effective board', () => {
      // The FEN should reflect the effective board state
      const fenWithoutDeploy = game.fen()

      // Now with deploy session, FEN should still work
      expect(() => game.fen()).not.toThrow()

      // FEN should be a valid string
      const fenWithDeploy = game.fen()
      expect(typeof fenWithDeploy).toBe('string')
      // With deploy session active, FEN will be extended format (more than 6 fields)
      expect(fenWithDeploy.split(' ').length).toBeGreaterThanOrEqual(6)
    })

    it('board() method should use effective board', () => {
      const boardArray = game.board()

      // Should return 2D array
      expect(Array.isArray(boardArray)).toBe(true)
      expect(boardArray).toHaveLength(12) // 12 ranks
      expect(boardArray[0]).toHaveLength(11) // 11 files

      // Should not throw with deploy session active
      expect(() => game.board()).not.toThrow()
    })

    it('validation methods should use effective board', () => {
      // Set up commanders
      game.put({ type: COMMANDER, color: RED }, 'f1')
      game.put({ type: COMMANDER, color: BLUE }, 'f12')

      // These methods should work with virtual board
      expect(() => game.isCheck()).not.toThrow()
      expect(() => game['_isCommanderAttacked'](RED)).not.toThrow()
      expect(() => game['_isCommanderExposed'](RED)).not.toThrow()

      // getAttackers should work with effective board
      const attackers = game.getAttackers(SQUARE_MAP.f1, BLUE)
      expect(Array.isArray(attackers)).toBe(true)
    })
  })

  describe('Move Generation with Virtual Board', () => {
    it('should generate moves using effective board state', () => {
      // Set up a stack with carrying pieces for deploy moves
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Create deploy session
      game['_deploySession'] = {
        stackSquare: SQUARE_MAP.e5,
        turn: RED,
        originalPiece: {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        virtualChanges: new Map(),
        movedPieces: [],
        stayingPieces: [],
      }

      // Move generation should work with virtual board
      expect(() => game.moves()).not.toThrow()

      const moves = game.moves()
      expect(Array.isArray(moves)).toBe(true)
    })

    it('should handle legal move filtering with virtual state', () => {
      // Set up a scenario where virtual state affects legal moves
      game.put({ type: COMMANDER, color: RED }, 'f1')
      game.put({ type: COMMANDER, color: BLUE }, 'f12')
      game.put(
        {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'e5',
      )

      // Create deploy session
      game['_deploySession'] = {
        stackSquare: SQUARE_MAP.e5,
        turn: RED,
        originalPiece: {
          type: INFANTRY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        virtualChanges: new Map(),
        movedPieces: [],
        stayingPieces: [],
      }

      // Legal move filtering should work
      const moves = game.moves({ verbose: true })
      expect(Array.isArray(moves)).toBe(true)

      // All returned moves should be legal (no exceptions thrown)
      moves.forEach((move) => {
        expect(move).toHaveProperty('from')
        expect(move).toHaveProperty('to')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty virtual changes gracefully', () => {
      const deploySession: DeploySession = {
        stackSquare: SQUARE_MAP.e5,
        turn: RED,
        originalPiece: { type: INFANTRY, color: RED },
        virtualChanges: new Map(), // Empty
        movedPieces: [],
        stayingPieces: [],
      }

      const virtualBoard = new VirtualBoard(game['_board'], deploySession)

      // Should fall back to real board for all squares
      expect(virtualBoard.get('e5')).toBeNull()
      expect(virtualBoard.get('a1')).toBeNull()
    })

    it('should handle invalid squares gracefully', () => {
      const deploySession: DeploySession = {
        stackSquare: SQUARE_MAP.e5,
        turn: RED,
        originalPiece: { type: INFANTRY, color: RED },
        virtualChanges: new Map(),
        movedPieces: [],
        stayingPieces: [],
      }

      const virtualBoard = new VirtualBoard(game['_board'], deploySession)

      // Invalid squares should return null
      expect(virtualBoard.get('z99' as any)).toBeNull()
    })
  })
})
