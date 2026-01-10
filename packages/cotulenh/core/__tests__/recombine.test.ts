import { describe, it, expect, beforeEach } from 'vitest'
import {
  RED,
  BLUE,
  NAVY,
  TANK,
  INFANTRY,
  ANTI_AIR,
  AIR_FORCE,
  COMMANDER,
  SQUARE_MAP,
} from '../src/type.js'
import { CoTuLenh } from '../src/cotulenh.js'

import { makePiece, setupGameBasic } from './test-helpers.js'

describe('Recombine Option', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  describe('recombine moves via game.moves()', () => {
    it('should include recombine moves in game.moves() output', () => {
      // Stack: Navy carrying Tank at c3
      const originalPiece = makePiece(NAVY, RED, false, [makePiece(TANK)])
      game.put(originalPiece, 'c3')

      // Deploy Navy to c5 using game.move()
      game.move({
        from: 'c3',
        to: 'c5',
        piece: NAVY,
        deploy: true,
      })

      const session = game.getSession()
      expect(session).toBeDefined()
      if (!session) return

      // Remaining: Tank
      expect(session.remaining).toHaveLength(1)
      expect(session.remaining[0].type).toBe(TANK)

      // Get moves for remaining piece - should include recombine move to c5
      const moves = game.moves({ square: 'c3', verbose: true })
      const recombineMove = moves.find(
        (m) => m.to === 'c5' && m.piece.type === TANK,
      )
      expect(recombineMove).toBeDefined()

      // Test auto-recombine: move Tank to same square as Navy
      game.move({
        from: 'c3',
        to: 'c5',
        piece: TANK,
        deploy: true,
      })

      // Session should be complete (auto-committed) and pieces recombined
      expect(game.getSession()).toBeNull()
      const boardPiece = game.get('c5')
      expect(boardPiece?.type).toBe(NAVY)
      expect(boardPiece?.carrying).toHaveLength(1)
      expect(boardPiece?.carrying?.[0].type).toBe(TANK)
    })

    it('should generate correct SAN/LAN notation for recombine moves', () => {
      // Stack: Navy carrying Tank at c3
      const originalPiece = makePiece(NAVY, RED, false, [makePiece(TANK)])
      game.put(originalPiece, 'c3')

      // Deploy Navy to c5
      game.move({
        from: 'c3',
        to: 'c5',
        piece: NAVY,
        deploy: true,
      })

      // Get moves - recombine move should have >& notation
      const moves = game.moves({ square: 'c3', verbose: true })
      const recombineMove = moves.find(
        (m) => m.to === 'c5' && m.piece.type === TANK,
      )
      expect(recombineMove).toBeDefined()

      // Check SAN contains >& for deploy-and-combine
      expect(recombineMove?.san).toContain('>&')
      expect(recombineMove?.san).toBe('T>&c5')

      // Check LAN also contains >&
      expect(recombineMove?.lan).toContain('>&')
      expect(recombineMove?.lan).toBe('Tc3>&c5')
    })

    it('should allow move() with recombine SAN notation', () => {
      // Stack: Navy carrying Tank at c3
      const originalPiece = makePiece(NAVY, RED, false, [makePiece(TANK)])
      game.put(originalPiece, 'c3')

      // Deploy Navy to c5
      game.move({
        from: 'c3',
        to: 'c5',
        piece: NAVY,
        deploy: true,
      })

      // Use SAN to recombine
      game.move('T>&c5')

      // Should have recombined
      expect(game.getSession()).toBeNull()
      const boardPiece = game.get('c5')
      expect(boardPiece?.type).toBe(NAVY)
      expect(boardPiece?.carrying).toHaveLength(1)
      expect(boardPiece?.carrying?.[0].type).toBe(TANK)
    })

    it('should filter out terrain-invalid recombinations from moves()', () => {
      // Stack: Navy, Tank.
      // Move Tank to Land (valid).
      // Try Recombine Navy to Tank? -> Combined = Navy(Tank). Navy carrier on Land -> Invalid.

      const originalPiece = makePiece(NAVY, RED, false, [makePiece(TANK)])
      game.put(originalPiece, 'c3')

      // Deploy Tank to d3 (Land) using game.move()
      game.move({
        from: 'c3',
        to: 'd3',
        piece: TANK,
        deploy: true,
      })

      const session = game.getSession()
      expect(session).toBeDefined()
      if (!session) return

      // Remaining: Navy
      expect(session.remaining[0].type).toBe(NAVY)

      // Get moves for remaining Navy - should NOT include d3 (land square)
      // Navy can't recombine onto land
      const moves = game.moves({ square: 'c3', verbose: true })
      const recombineMove = moves.find(
        (m) => m.to === 'd3' && m.piece.type === NAVY,
      )
      // Recombine to d3 should NOT be available (Navy can't be on land)
      expect(recombineMove).toBeUndefined()
    })

    it('should filter out recombine when carrier cannot exist on terrain', () => {
      // Stack: Navy carrying AirForce at c3 (water square)
      // Navy + AirForce -> Navy is carrier (role flag: 512 vs 128)
      const originalPiece = makePiece(NAVY, RED, false, [makePiece(AIR_FORCE)])
      game.put(originalPiece, 'c3')

      // Deploy AirForce to f3 (pure land - AirForce can go anywhere) using game.move()
      game.move({
        from: 'c3',
        to: 'f3',
        piece: AIR_FORCE,
        deploy: true,
      })

      const session = game.getSession()
      expect(session).toBeDefined()
      if (!session) return

      // Remaining: Navy
      // If Navy recombines with AirForce at f3:
      // - Combined piece will be Navy(AirForce)
      // - Navy is the carrier
      // - f3 is pure land
      // - Navy cannot exist on pure land terrain

      const moves = game.moves({ square: 'c3', verbose: true })
      const recombineMove = moves.find(
        (m) => m.to === 'f3' && m.piece.type === NAVY,
      )
      // Should filter out f3 option due to Navy terrain restriction
      expect(recombineMove).toBeUndefined()
    })

    it('should filter out recombine when new carrier has different terrain restrictions', () => {
      // Stack: Navy carrying Tank at c3 (file c is mixed zone)
      // Navy + Tank -> Navy is carrier (role 512 vs 64)
      const originalPiece = makePiece(NAVY, RED, false, [makePiece(TANK)])
      game.put(originalPiece, 'c3')

      // Deploy Tank to d3 (pure land, Tank can go there) using game.move()
      game.move({
        from: 'c3',
        to: 'd3',
        piece: TANK,
        deploy: true,
      })

      const session = game.getSession()
      expect(session).toBeDefined()
      if (!session) return

      // Remaining: Navy
      // If Navy recombines with Tank at d3:
      // - Combined piece will be Navy(Tank)
      // - Navy is carrier (role 512 vs 64)
      // - d3 is pure land (file d)
      // - Navy cannot exist on pure land terrain

      const moves = game.moves({ square: 'c3', verbose: true })
      const recombineMove = moves.find(
        (m) => m.to === 'd3' && m.piece.type === NAVY,
      )
      // Should filter out d3 option due to Navy terrain restriction
      expect(recombineMove).toBeUndefined()
    })
  })

  describe('recombine execution', () => {
    it('should successfully recombine via move() and commit', () => {
      const originalPiece = makePiece(NAVY, RED, false, [makePiece(TANK)])
      game.put(originalPiece, 'c3')

      // Deploy Navy to c5 using game.move()
      game.move({
        from: 'c3',
        to: 'c5',
        piece: NAVY,
        deploy: true,
      })

      const session = game.getSession()
      expect(session).toBeDefined()
      if (!session) return

      // Use move() to trigger auto-recombine (Tank targets same square as Navy)
      game.move({
        from: 'c3',
        to: 'c5',
        piece: TANK,
        deploy: true,
      })

      const boardPiece = game.get('c5')
      expect(boardPiece).toBeDefined()
      expect(boardPiece?.type).toBe(NAVY)
      expect(boardPiece?.carrying).toHaveLength(1)
      expect(game.getSession()).toBeNull()
    })

    it('should handle sequential re-execution via move() and commit', () => {
      // Use valid stack: Navy carrying [AirForce, Tank]
      const originalPiece = makePiece(NAVY, RED, false, [
        makePiece(AIR_FORCE),
        makePiece(TANK),
      ])
      game.put(originalPiece, 'c3')

      // Deploy Navy and Tank using game.move()
      game.move({
        from: 'c3',
        to: 'c5',
        piece: NAVY,
        deploy: true,
      })
      game.move({
        from: 'c3',
        to: 'c4',
        piece: TANK,
        deploy: true,
      })

      const session = game.getSession()
      expect(session).toBeDefined()
      if (!session) return

      // Use move() to trigger auto-recombine (AirForce targets same square as Navy)
      game.move({
        from: 'c3',
        to: 'c5',
        piece: AIR_FORCE,
        deploy: true,
      })

      expect(game.get('c5')?.carrying).toHaveLength(1)
      expect(game.get('c4')?.type).toBe(TANK)
      expect(game.getSession()).toBeNull()
    })

    it('should preserve move execution order via move() and commit', () => {
      const originalPiece = makePiece(AIR_FORCE, RED, false, [
        makePiece(TANK),
        makePiece(INFANTRY),
      ])
      game.put(originalPiece, 'c3')
      game.put(makePiece(ANTI_AIR, BLUE), 'c5')

      // Deploy Tank (capturing AntiAir) and AirForce using game.move()
      game.move({
        from: 'c3',
        to: 'c5',
        piece: TANK,
        deploy: true,
      })
      game.move({
        from: 'c3',
        to: 'c7',
        piece: AIR_FORCE,
        deploy: true,
      })

      const session = game.getSession()
      expect(session).toBeDefined()
      if (!session) return

      // Use move() to trigger auto-recombine (Infantry targets same square as Tank)
      game.move({
        from: 'c3',
        to: 'c5',
        piece: INFANTRY,
        deploy: true,
      })

      expect(game.get('c5')?.carrying?.[0].type).toBe(INFANTRY)
      expect(game.get('c7')?.type).toBe(AIR_FORCE)
      expect(game.getSession()).toBeNull()
    })

    it('should handle user specific scenario from FEN', () => {
      // FEN: 2c8/3i3h3/11/11/11/8(FTC)2/11/11/11/11/7H3/11 r - - 0 1
      const fen = '2c8/3i3h3/11/11/11/8(FTC)2/11/11/11/11/7H3/11 r - - 0 1'
      const game = new CoTuLenh(fen)

      // Find the stack square
      // User confirmed stack is at i7
      const stackSquare = SQUARE_MAP.i7

      expect(stackSquare).toBeDefined()
      if (!stackSquare) return

      const originalPiece = game.get('i7')!
      // Expect F (AirForce) on top?
      expect(originalPiece.type).toBe(AIR_FORCE)

      // Deploy F (AirForce) to e3 using game.move()
      game.move({
        from: 'i7',
        to: 'e3',
        piece: AIR_FORCE,
        deploy: true,
      })

      // Deploy T (Tank) to i5 using game.move()
      game.move({
        from: 'i7',
        to: 'i5',
        piece: TANK,
        deploy: true,
      })

      const session = game.getSession()
      expect(session).toBeDefined()
      if (!session) return

      // Check moves include recombine options for Commander
      const moves = game.moves({ square: 'i7', verbose: true })
      // Commander can recombine with either AirForce at e3 or Tank at i5
      const recombineMoves = moves.filter((m) => m.to === 'e3' || m.to === 'i5')
      expect(recombineMoves.length).toBe(2)
    })
  })

  describe('recombine with remaining pieces bug', () => {
    it('should NOT end session when Tank still remains after recombine', () => {
      // FEN: 2c8/3i7/11/11/4e6/8(FTC)2/11/11/11/11/5H1A3/11 r - - 0 1
      // Stack (FTC) = AirForce + Tank + Commander at i7 (row 7 from bottom)
      const fen = '2c8/3i7/11/11/4e6/8(FTC)2/11/11/11/11/5H1A3/11 r - - 0 1'
      const game = new CoTuLenh(fen)

      // Verify stack exists at i7
      const stackPiece = game.get('i7')
      expect(stackPiece).toBeDefined()
      expect(stackPiece?.type).toBe(AIR_FORCE)
      expect(stackPiece?.carrying).toHaveLength(2)

      const turnBefore = game.turn()
      expect(turnBefore).toBe(RED)

      // 1. Deploy F (AirForce) to i11
      game.move({
        from: 'i7',
        to: 'i11',
        piece: AIR_FORCE,
        deploy: true,
      })

      let session = game.getSession()
      expect(session).toBeDefined()
      expect(session?.remaining).toHaveLength(2) // Tank + Commander remain

      // 2. Recombine C (Commander) to i11 (where AirForce is)
      game.move({
        from: 'i7',
        to: 'i11',
        piece: COMMANDER,
        deploy: true,
      })

      // After recombine: AirForce + Commander are combined at i11
      // Tank should still be remaining at i7
      session = game.getSession()

      // BUG: Session should still exist because Tank is not moved
      expect(session).not.toBeNull()
      if (session) {
        expect(session.remaining).toHaveLength(1)
        expect(session.remaining[0].type).toBe(TANK)
      }

      // Turn should NOT have switched yet
      expect(game.turn()).toBe(RED)

      // Stack square should still have Tank (or be tracked in session)
      const i7Piece = game.get('i7')
      // If Tank still at i7, check it
      if (i7Piece) {
        expect(i7Piece.type).toBe(TANK)
      }

      // The combined piece at i11 should be AirForce carrying Commander
      const i11Piece = game.get('i11')
      expect(i11Piece).toBeDefined()
      expect(i11Piece?.type).toBe(AIR_FORCE)
      expect(i11Piece?.carrying).toHaveLength(1)
      expect(i11Piece?.carrying?.[0].type).toBe(COMMANDER)
    })

    it('should allow Tank to move after recombine and then commit', () => {
      const fen = '2c8/3i7/11/11/4e6/8(FTC)2/11/11/11/11/5H1A3/11 r - - 0 1'
      const game = new CoTuLenh(fen)

      const turnBefore = game.turn()
      expect(turnBefore).toBe(RED)

      // 1. Deploy F (AirForce) to i11
      game.move({
        from: 'i7',
        to: 'i11',
        piece: AIR_FORCE,
        deploy: true,
      })

      // 2. Recombine C (Commander) to i11
      game.move({
        from: 'i7',
        to: 'i11',
        piece: COMMANDER,
        deploy: true,
      })

      // 3. Now move Tank somewhere else (e.g., i5)
      game.move({
        from: 'i7',
        to: 'i5',
        piece: TANK,
        deploy: true,
      })

      // Session should now be complete (all pieces deployed)
      expect(game.getSession()).toBeNull()

      // Turn should have switched to BLUE
      expect(game.turn()).toBe(BLUE)

      // Verify final positions
      expect(game.get('i11')?.type).toBe(AIR_FORCE)
      expect(game.get('i5')?.type).toBe(TANK)
      expect(game.get('i7')).toBeUndefined() // Stack square should be empty
    })
  })
})
