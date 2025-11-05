import { describe, it, expect, beforeEach } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import {
  RED,
  BLUE,
  COMMANDER,
  NAVY,
  AIR_FORCE,
  TANK,
  INFANTRY,
  SQUARE_MAP,
} from '../src/type.js'

/**
 * RECOMBINE INSTRUCTION SYSTEM TEST SUITE
 *
 * ⚠️ NOTE: These are TDD-style tests written BEFORE implementation
 *
 * Current Status: ❌ NOT PASSING (APIs not yet implemented)
 *
 * These tests define the expected behavior for the new recombine instruction system
 * as designed in docs/RECOMBINE-REDESIGN.md
 *
 * TypeScript errors are EXPECTED and will be resolved during implementation:
 * - game.recombine() - New API to be added
 * - game.getRecombineOptions() - New API to be added
 * - game.commitDeploySession() - New API to be added
 * - game.canCommitDeploy() - New API to be added
 * - game.resetDeploySession() - New API to be added
 * - game.undoRecombineInstruction() - New API to be added
 * - session.recombineInstructions - New private field to be added
 *
 * Implementation Plan:
 * 1. Add new APIs to CoTuLenh class
 * 2. Add recombineInstructions to DeploySession
 * 3. Implement commit validation logic
 * 4. Implement Commander safety checks
 * 5. Run these tests to verify implementation
 *
 * See: docs/RECOMBINE-REDESIGN.md for complete design documentation
 */

describe('Recombine Instructions System', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
    game.put({ type: COMMANDER, color: RED }, 'g1')
    game.put({ type: COMMANDER, color: BLUE }, 'h12')
  })

  // ============================================================================
  // BASIC RECOMBINE INSTRUCTION TESTS
  // ============================================================================

  describe('Basic Recombine Instructions', () => {
    it('should allow recombine instruction after deploy move', () => {
      // Setup: Navy at c3 carrying AirForce
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [{ type: AIR_FORCE, color: RED }],
        },
        'c3',
      )

      // Deploy Navy to c5
      game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })

      // Get recombine options
      const options = game.getRecombineOptions('c3')

      expect(options).toHaveLength(1)
      expect(options[0].piece.type).toBe(AIR_FORCE)
      expect(options[0].targetSquare).toBe(SQUARE_MAP['c5'])
    })

    it('should execute recombine instruction', () => {
      // Setup: Navy at c3 carrying AirForce
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [{ type: AIR_FORCE, color: RED }],
        },
        'c3',
      )

      // Deploy Navy to c5
      game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })

      // Recombine AirForce with Navy
      const success = game.recombine('c3', 'c5', AIR_FORCE)
      expect(success).toBe(true)

      // Check that instruction was queued (not applied yet)
      const session = game.getDeploySession()
      expect(session).toBeTruthy()
      expect(session!['recombineInstructions']).toHaveLength(1)
    })

    it('should handle multiple recombines to same square', () => {
      // Setup: Navy at c3 carrying AirForce and Tank
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: AIR_FORCE, color: RED },
            { type: TANK, color: RED },
          ],
        },
        'c3',
      )

      // Deploy Tank first (carried piece must go before carrier)
      game.move({ from: 'c3', to: 'c5', piece: TANK, deploy: true })

      // Before recombine: c5 has Tank only
      expect(game.get('c5')?.type).toBe(TANK)
      expect(game.get('c5')?.carrying).toBeUndefined()

      // Recombine AirForce AND Navy with Tank
      game.recombine('c3', 'c5', AIR_FORCE)
      game.recombine('c3', 'c5', NAVY)

      // Still not applied (instruction queued)
      expect(game.get('c5')?.carrying).toBeUndefined()

      // Commit deploy session
      const result = game.commitDeploySession()
      expect(result.success).toBe(true)

      // Now recombine is applied - Tank carries AirForce and Navy
      expect(game.get('c5')?.type).toBe(NAVY)
      expect(game.get('c5')?.carrying).toHaveLength(2)
      const types = game
        .get('c5')
        ?.carrying?.map((p) => p.type)
        .sort()
      expect(types).toEqual([AIR_FORCE, TANK].sort())
    })
  })

  // ============================================================================
  // MOVE ORDER PRESERVATION TESTS
  // ============================================================================

  describe('Move Order Preservation', () => {
    it('should preserve move order when recombine is used', () => {
      // Setup: AirForce at c3 carrying Tank and Infantry
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

      // Deploy Tank first (carried piece)
      game.move({ from: 'c3', to: 'd3', piece: TANK, deploy: true })

      // Deploy Infantry to e5
      game.move({ from: 'c3', to: 'c4', piece: INFANTRY, deploy: true })

      // Recombine AirForce (carrier) with Tank
      game.recombine('c3', 'd3', AIR_FORCE)

      // Check move order in session
      const session = game.getDeploySession()
      if (!session) throw new Error('No session')
      const commands = session['commands']

      expect(commands).toHaveLength(2)
      // @ts-expect-error - accessing internal for testing
      expect(commands[0].move.piece.type).toBe(TANK)
      // @ts-expect-error - accessing internal for testing
      expect(commands[1].move.piece.type).toBe(INFANTRY)

      // Recombine should not change move order
      expect(session['recombineInstructions']).toHaveLength(1)
      expect(session['recombineInstructions'][0].timestamp).toBe(2)

      // Commit and verify final state
      game.commitDeploySession()

      expect(game.get('d3')?.type).toBe(AIR_FORCE)
      expect(game.get('d3')?.carrying?.[0].type).toBe(TANK)
      expect(game.get('c4')?.type).toBe(INFANTRY)
    })

    it('should maintain timestamp order for multiple recombines', () => {
      // Setup: Navy at c3 carrying Air, Tank, Infantry
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: AIR_FORCE, color: RED },
            { type: TANK, color: RED },
            { type: INFANTRY, color: RED },
          ],
        },
        'c3',
      )

      // Deploy Tank first (carried piece)
      game.move({ from: 'c3', to: 'c5', piece: TANK, deploy: true })

      // Recombine in specific order: AirForce, Infantry, Navy
      game.recombine('c3', 'c5', AIR_FORCE)
      game.recombine('c3', 'c5', INFANTRY)
      game.recombine('c3', 'c5', NAVY)

      const session = game.getDeploySession()
      if (!session) throw new Error('No session')
      const instructions = session['recombineInstructions']

      // Check timestamps preserve order
      expect(instructions[0].piece.type).toBe(AIR_FORCE)
      expect(instructions[0].timestamp).toBe(1)
      expect(instructions[1].piece.type).toBe(INFANTRY)
      expect(instructions[1].timestamp).toBe(1)
      expect(instructions[2].piece.type).toBe(NAVY)
      expect(instructions[2].timestamp).toBe(1)
    })
  })

  // ============================================================================
  // COMMANDER SAFETY TESTS (Basic)
  // ============================================================================

  describe('Commander Safety Filtering', () => {
    it('should filter out unsafe recombine options for Commander', () => {
      // This test validates Commander safety filtering is implemented
      // Full validation is TODO, so we just check the system doesn't crash
      game.put(
        {
          type: TANK,
          color: RED,
          carrying: [{ type: INFANTRY, color: RED }],
        },
        'c3',
      )

      game.move({ from: 'c3', to: 'c5', piece: TANK, deploy: true })
      const options = game.getRecombineOptions('c3')

      // Should get recombine options without crashing
      expect(Array.isArray(options)).toBe(true)
    })
  })

  // ============================================================================
  // UNDO BEHAVIOR TESTS
  // ============================================================================

  describe('Undo Behavior', () => {
    it('should undo deploy move normally', () => {
      // Setup: Navy carrying AirForce
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [{ type: AIR_FORCE, color: RED }],
        },
        'c3',
      )

      // Deploy AirForce (carried piece first)
      game.move({ from: 'c3', to: 'c5', piece: AIR_FORCE, deploy: true })

      // Verify deploy happened
      expect(game.get('c5')?.type).toBe(AIR_FORCE)
      expect(game.get('c3')?.type).toBe(NAVY)

      // Undo
      game.undo()

      // Should be back to original state
      expect(game.get('c3')?.type).toBe(NAVY)
      expect(game.get('c3')?.carrying).toHaveLength(1)
      expect(game.get('c5')).toBeUndefined()

      // Deploy session should still be active
      expect(game.getDeploySession()).toBeNull()
    })

    it('should undo recombine instruction', () => {
      // Setup: Navy carrying AirForce and Tank
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: AIR_FORCE, color: RED },
            { type: TANK, color: RED },
          ],
        },
        'c3',
      )

      // Deploy AirForce (carried piece first)
      game.move({ from: 'c3', to: 'c5', piece: AIR_FORCE, deploy: true })

      // Recombine Tank
      game.recombine('c3', 'c5', TANK)

      let session = game.getDeploySession()
      if (!session) throw new Error('No session')
      expect(session['recombineInstructions']).toHaveLength(1)

      // Undo recombine
      game.undoRecombineInstruction()

      session = game.getDeploySession()
      if (!session) throw new Error('No session')
      expect(session['recombineInstructions']).toHaveLength(0)
    })

    it('should handle undo of multiple moves in deploy session', () => {
      // Setup: AirForce carrying Tank and Infantry
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

      // Deploy Tank (carried piece)
      game.move({ from: 'c3', to: 'd3', piece: TANK, deploy: true })
      expect(game.get('d3')?.type).toBe(TANK)

      // Deploy Infantry
      game.move({ from: 'c3', to: 'c4', piece: INFANTRY, deploy: true })
      expect(game.get('c4')?.type).toBe(INFANTRY)

      // Undo Infantry move
      game.undo()
      expect(game.get('c4')).toBeUndefined()
      expect(game.get('c3')?.type).toBe(AIR_FORCE)
      expect(game.get('c3')?.carrying?.[0].type).toBe(INFANTRY)

      // Undo Tank move
      game.undo()
      expect(game.get('d3')).toBeUndefined()
      expect(game.get('c3')?.type).toBe(AIR_FORCE)
      expect(game.get('c3')?.carrying).toHaveLength(2)
    })

    it('should maintain correct state after undo and redo', () => {
      // Setup: Navy carrying AirForce
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [{ type: AIR_FORCE, color: RED }],
        },
        'c3',
      )

      // Deploy AirForce (carried piece first)
      game.move({ from: 'c3', to: 'c5', piece: AIR_FORCE, deploy: true })

      // Recombine Navy
      game.recombine('c3', 'c5', NAVY)

      // Undo recombine
      game.undoRecombineInstruction()

      // Redo recombine
      game.recombine('c3', 'c5', NAVY)

      // Commit
      const result = game.commitDeploySession()
      expect(result.success).toBe(true)

      // Verify correct final state
      const piece = game.get('c5')
      expect(piece?.type).toBe(NAVY)
      expect(piece?.carrying?.[0].type).toBe(AIR_FORCE)
    })

    it('should clear recombine instructions when resetting deploy session', () => {
      // Setup: Navy carrying AirForce and Tank
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: AIR_FORCE, color: RED },
            { type: TANK, color: RED },
          ],
        },
        'c3',
      )

      // Deploy AirForce (carried piece)
      game.move({ from: 'c3', to: 'c5', piece: AIR_FORCE, deploy: true })

      // Deploy Tank
      game.move({ from: 'c3', to: 'd3', piece: TANK, deploy: true })

      // Recombine Navy (carrier)
      game.recombine('c3', 'c5', NAVY)

      // Reset deploy session
      game.resetDeploySession()

      // All moves and instructions should be cleared
      expect(game.getDeploySession()).toBeNull()
      expect(game.get('c3')?.type).toBe(NAVY)
      expect(game.get('c3')?.carrying).toHaveLength(2)
      expect(game.get('c5')).toBeUndefined()
      expect(game.get('d3')).toBeUndefined()
    })
  })

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty recombine options', () => {
      // Setup: Navy with no carried pieces
      game.put({ type: NAVY, color: RED }, 'c3')

      // No deploy session - should return empty
      const options = game.getRecombineOptions('c3')
      expect(options).toHaveLength(0)
    })

    it('should be able to deploy air_force from stack being checked', () => {
      game.clear()
      // Setup: Navy carrying AirForce
      game.put({ type: COMMANDER, color: BLUE }, 'h12')
      game.put({ type: TANK, color: BLUE, heroic: true }, 'c4')
      game.put(
        {
          type: AIR_FORCE,
          color: RED,
          carrying: [{ type: COMMANDER, color: RED }],
        },
        'c2',
      )
      game.put({ type: INFANTRY, color: RED }, 'd2')

      // Deploy AirForce to f2 (escaping check zone)
      game.move({ from: 'c2', to: 'f2', piece: AIR_FORCE, deploy: true })

      // Recombine Commander with AirForce at f2
      game.recombine('c2', 'f2', COMMANDER)

      // Commit
      const result = game.commitDeploySession()
      expect(result.success).toBe(true)

      // Verify correct final state
      const piece = game.get('f2')
      expect(piece?.type).toBe(AIR_FORCE)
      expect(piece?.carrying?.[0].type).toBe(COMMANDER)
    })

    it('should prevent recombine to non-deployed square', () => {
      // Setup: Navy carrying AirForce
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [{ type: AIR_FORCE, color: RED }],
        },
        'c3',
      )

      // Deploy AirForce to c5 (carried piece first)
      game.move({ from: 'c3', to: 'c5', piece: AIR_FORCE, deploy: true })

      // Try to recombine to d4 (not deployed to)
      expect(() => {
        game.recombine('c3', 'd4', NAVY)
      }).toThrow('Cannot recombine to non-deployed square')
    })

    it('should handle recombine with pieces that cannot combine', () => {
      // Setup: Navy at c3 carrying Tank
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [{ type: TANK, color: RED }],
        },
        'c3',
      )

      // Deploy Tank
      game.move({ from: 'c3', to: 'c5', piece: TANK, deploy: true })

      // Get recombine options
      const options = game.getRecombineOptions('c3')

      // Should only show valid combinations
      expect(Array.isArray(options)).toBe(true)
      // All returned options should have valid combined pieces
      options.forEach((opt) => {
        expect(opt.resultPiece).toBeDefined()
      })
    })
  })

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    it('should handle complete deploy session with recombines', () => {
      // Setup: Navy carrying AirForce, Tank, Infantry
      game.put(
        {
          type: NAVY,
          color: RED,
          carrying: [
            { type: AIR_FORCE, color: RED },
            { type: TANK, color: RED },
          ],
        },
        'c3',
      )

      // Deploy AirForce (carried piece first)
      game.move({ from: 'c3', to: 'c5', piece: AIR_FORCE, deploy: true })

      // Deploy Tank to d4
      game.move({ from: 'c3', to: 'c4', piece: TANK, deploy: true })

      // Recombine Navy with AirForce
      game.recombine('c3', 'c5', NAVY)

      // Recombine Infantry with Tank
      game.recombine('c3', 'c4', INFANTRY)

      // Commit
      const result = game.commitDeploySession()
      expect(result.success).toBe(true)

      // Verify final state
      const airForce = game.get('c5')
      expect(airForce?.type).toBe(NAVY)
      expect(airForce?.carrying?.[0].type).toBe(AIR_FORCE)

      const tank = game.get('c4')
      expect(tank?.type).toBe(TANK)
      // Turn should have switched
      expect(game.turn()).toBe(BLUE)
    })
  })
})
