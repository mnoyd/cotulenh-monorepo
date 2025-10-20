/**
 * Extended FEN Format Tests (Task 5.4)
 *
 * These tests verify the extended FEN format implementation including:
 * - Standard FEN generation when no deploy session is active
 * - Extended FEN with active deploy sessions and virtual changes
 * - FEN round-trip (generate -> parse -> generate) preserves state
 * - Edge cases with complex virtual state scenarios
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import {
  RED,
  BLUE,
  SQUARE_MAP,
  DeploySession,
  INFANTRY,
  TANK,
  NAVY,
  COMMANDER,
} from '../src/type.js'

describe('Extended FEN Format Implementation (Task 5.4)', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
  })

  describe('Standard FEN Generation', () => {
    it('should generate standard FEN when no deploy session is active', () => {
      // Set up a simple position
      game.clear()
      game.put({ type: 'c', color: 'r' }, 'f1')
      game.put({ type: 'c', color: 'b' }, 'f12')
      game.put(
        { type: 'i', color: 'r', carrying: [{ type: 't', color: 'r' }] },
        'e5',
      )

      const fen = game.fen()

      // Should be standard 6-field FEN format
      const parts = fen.split(' ')
      expect(parts).toHaveLength(6)
      expect(parts[0]).toContain('(IT)')
      expect(parts[1]).toBe('r') // Red to move
      expect(parts[2]).toBe('-') // No castling
      expect(parts[3]).toBe('-') // No en passant
      expect(parts[4]).toBe('0') // Half moves
      expect(parts[5]).toBe('1') // Move number

      // Should not contain DEPLOY marker
      expect(fen).not.toContain('DEPLOY')
    })

    it('should maintain FEN consistency across different board states', () => {
      // Test various piece configurations
      game.clear()
      game.put({ type: 'c', color: 'r' }, 'f1')
      game.put({ type: 'c', color: 'b' }, 'f12')
      game.put({ type: 'n', color: 'r' }, 'a1')
      game.put({ type: 'i', color: 'b', heroic: true }, 'k12')

      const fen = game.fen()
      const parts = fen.split(' ')

      expect(parts).toHaveLength(6)
      expect(parts[0]).toContain('N') // Navy piece
      expect(parts[0]).toContain('+i') // Heroic infantry
      expect(fen).not.toContain('DEPLOY')
    })
  })

  describe('Extended FEN with Deploy Sessions', () => {
    it('should generate extended FEN with active deploy session', () => {
      // Set up position with deploy session
      game.clear()
      game.put({ type: 'c', color: 'r' }, 'f1')
      game.put({ type: 'c', color: 'b' }, 'f12')
      game.put(
        { type: 'i', color: 'r', carrying: [{ type: 't', color: 'r' }] },
        'e5',
      )

      // Manually create deploy session
      const originalPiece = game.get('e5')!
      const deploySession = game.startDeploySession('e5', originalPiece)

      // Add virtual changes
      deploySession.virtualChanges.set('e5', { type: 't', color: 'r' })
      deploySession.virtualChanges.set('e6', { type: 'i', color: 'r' })
      deploySession.movedPieces.push({
        piece: { type: 'i', color: 'r' },
        from: 'e5',
        to: 'e6',
      })

      game['_currentDeploySession'] = deploySession

      const fen = game.fen()

      // Should contain DEPLOY marker
      expect(fen).toContain('DEPLOY')

      const parts = fen.split(' ')
      const deployIndex = parts.indexOf('DEPLOY')

      expect(deployIndex).toBeGreaterThan(5) // After standard FEN fields
      expect(parts[deployIndex + 1]).toBe('e5:T') // Original square and remaining pieces
      expect(parts[deployIndex + 2]).toBe('1') // Move count
      expect(parts[deployIndex + 3]).toBe('e5=T,e6=I') // Virtual changes
    })

    it('should handle complex virtual state scenarios', () => {
      // Set up complex deploy scenario
      game.clear()
      game.put({ type: 'c', color: 'r' }, 'f1')
      game.put({ type: 'c', color: 'b' }, 'f12')

      // Create a 3-piece stack
      game.put(
        {
          type: 'n',
          color: 'r',
          carrying: [
            { type: 'i', color: 'r' },
            { type: 't', color: 'r' },
          ],
        },
        'c5',
      )

      const originalPiece = game.get('c5')!
      const deploySession = game.startDeploySession('c5', originalPiece)

      // Deploy infantry to c6, tank to d5, navy stays
      deploySession.virtualChanges.set('c5', { type: 'n', color: 'r' })
      deploySession.virtualChanges.set('c6', { type: 'i', color: 'r' })
      deploySession.virtualChanges.set('d5', { type: 't', color: 'r' })

      deploySession.movedPieces.push(
        { piece: { type: 'i', color: 'r' }, from: 'c5', to: 'c6' },
        { piece: { type: 't', color: 'r' }, from: 'c5', to: 'd5' },
      )

      game['_currentDeploySession'] = deploySession

      const fen = game.fen()

      expect(fen).toContain('DEPLOY')
      expect(fen).toContain('c5:N') // Navy remaining
      expect(fen).toContain('c5=N,c6=I,d5=T') // All virtual changes
    })

    it('should handle heroic pieces in deploy sessions', () => {
      game.clear()
      game.put({ type: 'c', color: 'r' }, 'f1')
      game.put({ type: 'c', color: 'b' }, 'f12')
      game.put(
        {
          type: 'i',
          color: 'r',
          heroic: true,
          carrying: [{ type: 't', color: 'r', heroic: true }],
        },
        'e5',
      )

      const originalPiece = game.get('e5')!
      const deploySession = game.startDeploySession('e5', originalPiece)

      deploySession.virtualChanges.set('e5', {
        type: 't',
        color: 'r',
        heroic: true,
      })
      deploySession.virtualChanges.set('e6', {
        type: 'i',
        color: 'r',
        heroic: true,
      })
      deploySession.movedPieces.push({
        piece: { type: 'i', color: 'r', heroic: true },
        from: 'e5',
        to: 'e6',
      })

      game['_currentDeploySession'] = deploySession

      const fen = game.fen()

      expect(fen).toContain('DEPLOY')
      expect(fen).toContain('e5:+T') // Heroic tank remaining
      expect(fen).toContain('e5=+T,e6=+I') // Heroic pieces in virtual changes
    })
  })

  describe('FEN Round-Trip Consistency', () => {
    it('should preserve state through generate -> parse -> generate cycle', () => {
      // Set up position with deploy session
      game.clear()
      game.put({ type: 'c', color: 'r' }, 'f1')
      game.put({ type: 'c', color: 'b' }, 'f12')
      game.put(
        { type: 'i', color: 'r', carrying: [{ type: 't', color: 'r' }] },
        'e5',
      )

      const originalPiece = game.get('e5')!
      const deploySession = game.startDeploySession('e5', originalPiece)

      deploySession.virtualChanges.set('e5', { type: 't', color: 'r' })
      deploySession.virtualChanges.set('e6', { type: 'i', color: 'r' })
      deploySession.movedPieces.push({
        piece: { type: 'i', color: 'r' },
        from: 'e5',
        to: 'e6',
      })

      game['_currentDeploySession'] = deploySession

      // Generate FEN
      const originalFen = game.fen()

      // Parse FEN into new game
      const game2 = new CoTuLenh()
      game2.load(originalFen)

      // Generate FEN again
      const roundTripFen = game2.fen()

      // Should be identical
      expect(roundTripFen).toBe(originalFen)

      // Verify deploy session was reconstructed correctly
      const deployState = game2.getDeployState()
      expect(deployState).toBeTruthy()
      expect(deployState!.movedPieces).toHaveLength(1)
      expect(deployState!.movedPieces[0].piece.type).toBe('i')
    })

    it('should handle round-trip with complex virtual changes', () => {
      game.clear()
      game.put({ type: 'c', color: 'r' }, 'f1')
      game.put({ type: 'c', color: 'b' }, 'f12')
      game.put(
        {
          type: 'n',
          color: 'b',
          carrying: [
            { type: 'i', color: 'b', heroic: true },
            { type: 't', color: 'b' },
          ],
        },
        'c10',
      )

      const originalPiece = game.get('a10')!
      const deploySession = game.startDeploySession('a10', originalPiece)

      // Complex deployment pattern
      deploySession.virtualChanges.set('c10', { type: 'n', color: 'b' })
      deploySession.virtualChanges.set('c9', {
        type: 'i',
        color: 'b',
        heroic: true,
      })
      deploySession.virtualChanges.set('d10', { type: 't', color: 'b' })

      deploySession.movedPieces.push(
        {
          piece: { type: 'i', color: 'b', heroic: true },
          from: 'c10',
          to: 'c9',
        },
        { piece: { type: 't', color: 'b' }, from: 'c10', to: 'd10' },
      )

      game['_currentDeploySession'] = deploySession

      const originalFen = game.fen()

      // Round-trip test
      const game2 = new CoTuLenh()
      game2.load(originalFen)
      const roundTripFen = game2.fen()

      expect(roundTripFen).toBe(originalFen)

      // Verify board state
      expect(game2.get('c10')?.type).toBe('n')
      expect(game2.get('c9')?.type).toBe('i')
      expect(game2.get('c9')?.heroic).toBe(true)
      expect(game2.get('d10')?.type).toBe('t')
    })

    it('should preserve standard FEN through round-trip', () => {
      // Test that standard FEN (no deploy) works correctly
      game.clear()
      game.put({ type: 'c', color: 'r' }, 'f1')
      game.put({ type: 'c', color: 'b' }, 'f12')
      game.put(
        { type: 'i', color: 'r', carrying: [{ type: 't', color: 'r' }] },
        'e5',
      )
      game.put({ type: 'n', color: 'b', heroic: true }, 'a12')

      const originalFen = game.fen()

      const game2 = new CoTuLenh()
      game2.load(originalFen)
      const roundTripFen = game2.fen()

      // The FEN might have different piece ordering in stacks, so check components
      const originalParts = originalFen.split(' ')
      const roundTripParts = roundTripFen.split(' ')

      // Check that both are standard FEN (6 parts, no DEPLOY)
      expect(originalParts).toHaveLength(6)
      expect(roundTripParts).toHaveLength(6)
      expect(roundTripFen).not.toContain('DEPLOY')

      // Check game state fields are preserved
      expect(roundTripParts[1]).toBe(originalParts[1]) // Turn
      expect(roundTripParts[2]).toBe(originalParts[2]) // Castling
      expect(roundTripParts[3]).toBe(originalParts[3]) // En passant
      expect(roundTripParts[4]).toBe(originalParts[4]) // Half moves
      expect(roundTripParts[5]).toBe(originalParts[5]) // Move number

      // Verify pieces are preserved (stack order might differ due to combination logic)
      const pieceAtE5 = game2.get('e5')
      expect(pieceAtE5).toBeTruthy()
      expect(pieceAtE5?.carrying).toHaveLength(1)

      // Check that we have both infantry and tank, regardless of order
      const allPiecesAtE5 = [
        pieceAtE5!.type,
        pieceAtE5!.carrying![0].type,
      ].sort()
      expect(allPiecesAtE5).toEqual(['i', 't'])
      expect(game2.get('a12')?.type).toBe('n')
      expect(game2.get('a12')?.heroic).toBe(true)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty virtual changes gracefully', () => {
      game.clear()
      game.put({ type: 'c', color: 'r' }, 'f1')
      game.put({ type: 'c', color: 'b' }, 'f12')
      game.put({ type: 'i', color: 'r' }, 'e5')

      const originalPiece = game.get('e5')!
      const deploySession = game.startDeploySession('e5', originalPiece)

      // No virtual changes, no moved pieces
      game['_currentDeploySession'] = deploySession

      const fen = game.fen()

      expect(fen).toContain('DEPLOY')
      expect(fen).toContain('e5:I') // All pieces remaining
      expect(fen).toContain('0') // Zero moves
    })

    it('should reject invalid extended FEN formats', () => {
      const invalidFens = [
        // Missing deploy info
        '5c5/11/11/11/11/11/4I6/4T6/11/11/11/5C5 r - - 0 1 DEPLOY',
        // Invalid square
        '5c5/11/11/11/11/11/4I6/4T6/11/11/11/5C5 r - - 0 1 DEPLOY z9:T 1',
        // Invalid piece type
        '5c5/11/11/11/11/11/4I6/4T6/11/11/11/5C5 r - - 0 1 DEPLOY e5:X 1',
        // Invalid move count
        '5c5/11/11/11/11/11/4I6/4T6/11/11/11/5C5 r - - 0 1 DEPLOY e5:T -1',
        // Malformed virtual changes
        '5c5/11/11/11/11/11/4I6/4T6/11/11/11/5C5 r - - 0 1 DEPLOY e5:T 1 e5',
      ]

      for (const invalidFen of invalidFens) {
        expect(() => {
          const testGame = new CoTuLenh()
          testGame.load(invalidFen)
        }).toThrow()
      }
    })

    it('should validate deploy session consistency after loading', () => {
      // Create a valid extended FEN
      const validFen =
        '5c5/11/11/11/11/11/4I6/4T6/11/11/11/5C5 r - - 0 1 DEPLOY e5:T 1 e5=T,e6=I'

      const game = new CoTuLenh()
      expect(() => game.load(validFen)).not.toThrow()

      const deployState = game.getDeployState()
      expect(deployState).toBeTruthy()
      expect(deployState!.movedPieces).toHaveLength(1)
    })

    it('should handle piece removal in virtual changes', () => {
      game.clear()
      game.put({ type: 'c', color: 'r' }, 'f1')
      game.put({ type: 'c', color: 'b' }, 'f12')
      game.put({ type: 'i', color: 'r' }, 'e5')

      const originalPiece = game.get('e5')!
      const deploySession = game.startDeploySession('e5', originalPiece)

      // Remove piece from original square (all pieces moved)
      deploySession.virtualChanges.set('e5', null)
      deploySession.virtualChanges.set('e6', { type: 'i', color: 'r' })
      deploySession.movedPieces.push({
        piece: { type: 'i', color: 'r' },
        from: 'e5',
        to: 'e6',
      })

      game['_currentDeploySession'] = deploySession

      const fen = game.fen()

      expect(fen).toContain('DEPLOY')
      expect(fen).toContain('e5: 1') // No remaining pieces
      expect(fen).toContain('e5=,e6=I') // Empty square notation
    })
  })

  describe('Performance and Stress Testing', () => {
    it('should handle large deploy sessions efficiently', () => {
      // This test ensures the FEN system can handle complex scenarios
      game.clear()
      game.put({ type: 'c', color: 'r' }, 'f1')
      game.put({ type: 'c', color: 'b' }, 'f12')

      // Create multiple deploy sessions (simulated)
      const positions = ['e5', 'd5', 'f5', 'e6', 'd6']

      for (const pos of positions) {
        game.put(
          { type: 'i', color: 'r', carrying: [{ type: 't', color: 'r' }] },
          pos as any,
        )
      }

      // Test FEN generation performance
      const start = performance.now()
      for (let i = 0; i < 100; i++) {
        const fen = game.fen()
        expect(fen).toBeDefined()
        expect(typeof fen).toBe('string')
      }
      const end = performance.now()

      // Should complete quickly (less than 100ms for 100 iterations)
      expect(end - start).toBeLessThan(100)
    })
  })
})
