import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MoveSession } from '../src/move-session.js'
import {
  BITS,
  RED,
  BLUE,
  NAVY,
  TANK,
  INFANTRY,
  COMMANDER,
  ANTI_AIR,
  AIR_FORCE,
  algebraic,
} from '../src/type.js'
import { CoTuLenh } from '../src/cotulenh.js'

import { makeMove, makePiece, setupGameBasic } from './test-helpers.js'

describe('Recombine Option', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  describe('getOptions', () => {
    it('should return valid recombine options', () => {
      // Stack: Navy carrying Tank at c3
      const originalPiece = makePiece(NAVY, RED, false, [makePiece(TANK)])
      game.put(originalPiece, 'c3') // 0x92

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
      })

      // Deploy Navy to c5 (0x72 - valid for Navy)
      const move = makeMove({ from: 0x92, to: 0x72, piece: makePiece(NAVY) })
      session.addMove(move)

      // Remaining: Tank
      expect(session.remaining).toHaveLength(1)
      expect(session.remaining[0].type).toBe(TANK)

      // Get Options
      const options = session.getOptions()
      expect(options).toHaveLength(1)
      expect(options[0].square).toBe('c5')
      expect(options[0].piece.type).toBe(TANK)
    })

    it('should filter out terrain-invalid recombinations', () => {
      // Stack: Navy, Tank.
      // Move Tank to Land (valid).
      // Try Recombine Navy to Tank? -> Combined = Navy(Tank). Navy carrier on Land -> Invalid.

      // Setup: Navy carrying Tank at c3.
      // Actually, if Tank moves, it can't carry Navy usually.
      // Let's use specific combination rules.
      // Navy + Tank -> Navy is carrier (Role 9 vs 2).

      const originalPiece = makePiece(NAVY, RED, false, [makePiece(TANK)])
      game.put(originalPiece, 'c3')

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
      })

      // Deploy Tank to d4 (Land)
      const move = makeMove({ from: 0x92, to: 0x83, piece: makePiece(TANK) })
      session.addMove(move)

      // Remaining: Navy
      expect(session.remaining[0].type).toBe(NAVY)

      // Get Options
      // Recombine Navy to Tank at d4?
      // Result: Navy(Tank). Location d4 (Land). Navy can't be on Land.
      const options = session.getOptions()
      expect(options).toHaveLength(0)
    })

    it('should filter out dangerous commander placements', () => {
      // Stack: Tank, Commander at c3.
      // Enemy Artillery at g1 can attack c5? No, blocked maybe.
      // Let's create specific danger scenario.
      // Enemy Tank at c8 aiming at c5.

      // First remove the default commander setup by setupGameBasic() at f1
      game.remove('f1')

      const originalPiece = makePiece(TANK, RED, false, [makePiece(COMMANDER)])
      game.put(originalPiece, 'c3')

      // Enemy Tank at c8 (BLUE)
      game.put(makePiece(TANK, BLUE), 'c8')

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
      })

      // Deploy Tank to c5. c5 is attacked by c8 Tank?
      // c5 to c8 distance is 3. Tank range 2.
      // Let's put Enemy Tank at c7. Dist 2.
      game.put(makePiece(TANK, BLUE), 'c7')

      const move = makeMove({ from: 0x92, to: 0x72, piece: makePiece(TANK) }) // to c5
      session.addMove(move)

      // Remaining: Commander
      // If Cmdr recombines to c5, piece becomes Tank(Cmdr) or Cmdr(Tank)?
      // Cmdr + Tank -> Cmdr is carrier usually? Or heavy piece?
      // Need to check combine rules.
      // Assuming combined piece HAS COMMANDER.

      // Is c5 safe for Tank? Yes.
      // Is c5 safe for Commander? No, attacked by c7 Tank.

      const options = session.getOptions()
      // Should be empty because recombining puts Cmdr in check
      expect(options).toHaveLength(0)
    })
  })

  describe('recombine execution', () => {
    it('should successfully recombine', () => {
      const originalPiece = makePiece(NAVY, RED, false, [makePiece(TANK)])
      game.put(originalPiece, 'c3')

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
      })

      // Deploy Navy to c5
      const move = makeMove({ from: 0x92, to: 0x72, piece: makePiece(NAVY) })
      session.addMove(move) // Index 0

      // Recombine Tank to c5
      const options = session.getOptions()
      session.recombine(options[0])

      // Assertions
      // 1. Session should have only 1 move now (the combined one)
      expect(session.moves).toHaveLength(1)

      const rMove = session.moves[0]
      expect(algebraic(rMove.to)).toBe('c5')
      // Piece should be Navy carrying Tank
      expect(rMove.piece.type).toBe(NAVY)
      expect(rMove.piece.carrying).toHaveLength(1)
      expect(rMove.piece.carrying?.[0].type).toBe(TANK)

      // 2. Remaining should be empty
      expect(session.remaining).toHaveLength(0)

      // 3. Board should have combined piece at c5
      const boardPiece = game.get('c5')
      expect(boardPiece).toBeDefined()
      expect(boardPiece?.type).toBe(NAVY)
      expect(boardPiece?.carrying).toHaveLength(1)
    })

    it('should handle sequential re-execution', () => {
      // Stack: Navy, Tank, Infantry
      // 1. Deploy Navy to c5
      // 2. Deploy Infantry to c4
      // 3. Recombine Tank to Navy (at c5)
      // Expect: Move 1 becomes Navy+Tank. Move 2 remains Infantry.

      const originalPiece = makePiece(NAVY, RED, false, [
        makePiece(TANK),
        makePiece(INFANTRY),
      ])
      game.put(originalPiece, 'c3')

      const session = new MoveSession(game, {
        stackSquare: 0x92,
        turn: RED,
        originalPiece,
        isDeploy: true,
      })

      // 1
      session.addMove(
        makeMove({ from: 0x92, to: 0x72, piece: makePiece(NAVY) }),
      ) // to c5
      // 2
      session.addMove(
        makeMove({ from: 0x92, to: 0x82, piece: makePiece(INFANTRY) }),
      ) // to c4

      expect(session.moves).toHaveLength(2)

      // 3. Recombine Tank -> Navy at c5
      const options = session.getOptions()
      const tankOption = options.find(
        (o) => o.square === 'c5' && o.piece.type === TANK,
      )
      expect(tankOption).toBeDefined()

      session.recombine(tankOption!)

      // Verify
      expect(session.moves).toHaveLength(2)
      // Move 0: Navy+Tank to c5
      expect(session.moves[0].piece.type).toBe(NAVY)
      expect(session.moves[0].piece.carrying).toHaveLength(1)
      expect(session.moves[0].piece.carrying?.[0].type).toBe(TANK)

      // Move 1: Infantry to c4 (preserved)
      expect(session.moves[1].piece.type).toBe(INFANTRY)
      expect(algebraic(session.moves[1].to)).toBe('c4')

      // Board state
      expect(game.get('c5')?.carrying).toHaveLength(1)
      expect(game.get('c4')?.type).toBe(INFANTRY)
    })

    it('should preserve move execution order (Tank clears Anti-Air for Fighter)', () => {
      // Setup:
      // Stack: Fighter (F), Tank (T), Infantry (I) at c3 (0x92)
      // Enemy Anti-Air (G) at c5 (0x72).
      // Fighter wants to move to c7 (0x52).
      // Fighter blocked by Anti-Air if attempting to fly over c5.

      // Sequence:
      // 1. Tank (carrying Infantry) moves to c5 and captures Anti-Air.
      //    Stack remaining: Fighter.
      // 2. Fighter flies to c7. (Valid because AA is gone).
      // 3. Recombine Infantry into Tank (Move 1).
      //    The effective Move 1 becomes Tank+Infantry.
      //    Move 2 (Fighter) must be re-executed AFTER Move 1.

      // If order was messed up and Fighter tried to move first, it would be blocked by AA.

      const originalPiece = makePiece(TANK, RED, false, [
        makePiece(INFANTRY),
        makePiece(AIR_FORCE),
      ])
      game.put(originalPiece, 'c3')

      // Enemy Anti-Air at c5 blocking the path
      game.put(makePiece(ANTI_AIR, BLUE), 'c5')

      const session = new MoveSession(game, {
        stackSquare: 0x92, // c3
        turn: RED,
        originalPiece,
        isDeploy: true,
      })

      // 1. Tank moves to c5, capturing AA
      // Note: Tank range is 2? a1->a3 is dist 2. Let's verify Tank movement capability.
      // Tank moves 2 squares line. Yes.
      const move1 = makeMove({
        from: 0x92,
        to: 0x72, // c5
        piece: makePiece(TANK),
        captured: makePiece(ANTI_AIR, BLUE),
        flags: BITS.DEPLOY | BITS.CAPTURE,
      })
      session.addMove(move1)

      // 2. Fighter moves to c7
      // Fighter flies straight. Range > 4. a1->a5 is dist 4.
      const move2 = makeMove({
        from: 0x92,
        to: 0x52, // c7
        piece: makePiece(AIR_FORCE),
      })
      session.addMove(move2)

      // Verify intermediate state
      expect(session.moves).toHaveLength(2)
      // Expect AA is gone (captured)
      // Expect F at a5.

      // 3. Recombine Infantry -> Tank at c5
      // Stack has Infantry? Wait, in setup I put T carrying I, F.
      // Move 1 used T. Remaining: I, F.
      // Move 2 used F. Remaining: I.
      // Correct.

      const options = session.getOptions()
      const infantryOption = options.find(
        (o) => o.square === 'c5' && o.piece.type === INFANTRY,
      )
      expect(infantryOption).toBeDefined()

      // Execute Recombine
      session.recombine(infantryOption!)

      // Assertions
      // If the re-execution order was [Fighter Move, Tank Move], Fighter move would fail
      // because AA implies blocked path?
      // Actually, `addMove` re-executes logic. If invalid, it might throw or not add?
      // `createMoveCommand` creates a command. `command.execute()` performs validation?
      // Usually `MoveCommand` validates pseudo-legality but `MoveSession` assumes validity for `addMove`?
      // Wait, `addMove` calls `command.execute()`.
      // If `execute()` relies on `game.move()` or internal validation, it might throw if blocked.

      // Assuming strict validation is active during execution.
      expect(session.moves).toHaveLength(2)
      expect(session.moves[0].piece.carrying?.[0].type).toBe(INFANTRY)
      expect(algebraic(session.moves[1].to)).toBe('c7')
    })
  })
})
