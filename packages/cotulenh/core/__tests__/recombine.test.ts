import { describe, it, expect, beforeEach } from 'vitest'
import {
  RED,
  BLUE,
  NAVY,
  TANK,
  INFANTRY,
  ANTI_AIR,
  AIR_FORCE,
  SQUARE_MAP,
} from '../src/type.js'
import { CoTuLenh } from '../src/cotulenh.js'

import { makePiece, setupGameBasic } from './test-helpers.js'

describe('Recombine Option', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = setupGameBasic()
  })

  describe('getOptions', () => {
    it('should return valid recombine options', () => {
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

      // Get Options
      const options = session.getOptions()
      expect(options).toHaveLength(1)
      expect(options[0].square).toBe('c5')
      expect(options[0].piece).toBe(TANK)
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

      // Deploy Tank to d4 (Land) using game.move()
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

      // Get Options
      // Recombine Navy to Tank at d4?
      // Result: Navy(Tank). Location d4 (Land). Navy can't be on Land.
      const options = session.getOptions()
      expect(options).toHaveLength(0)
    })

    // it('should filter out dangerous commander placements', () => {
    //   // Stack: Tank, Commander at c3.
    //   // Enemy Artillery at g1 can attack c5? No, blocked maybe.
    //   // Let's create specific danger scenario.
    //   // Enemy Tank at c8 aiming at c5.

    //   // First remove the default commander setup by setupGameBasic() at f1
    //   game.remove('f1')

    //   const originalPiece = makePiece(TANK, RED, false, [makePiece(COMMANDER)])
    //   game.put(originalPiece, 'c3')

    //   // Enemy Tank at c7 (BLUE) - at distance 2 from c5
    //   game.put(makePiece(TANK, BLUE), 'c7')

    //   // Deploy Tank to c5 using game.move()
    //   game.move({
    //     from: 'c3',
    //     to: 'c5',
    //     piece: TANK,
    //     deploy: true,
    //   })

    //   const session = game.getSession()
    //   expect(session).toBeDefined()
    //   if (!session) return

    //   // Remaining: Commander
    //   // If Cmdr recombines to c5, piece becomes Tank(Cmdr) or Cmdr(Tank)?
    //   // Cmdr + Tank -> Cmdr is carrier usually? Or heavy piece?
    //   // Need to check combine rules.
    //   // Assuming combined piece HAS COMMANDER.

    //   // Is c5 safe for Tank? Yes.
    //   // Is c5 safe for Commander? No, attacked by c7 Tank.

    //   const options = session.getOptions()
    //   // Should be empty because recombining puts Cmdr in check
    //   expect(options).toHaveLength(0)
    // })

    // it('should filter out recombine that puts commander under attack', () => {
    //   // Clear default commander
    //   game.remove('f1')

    //   // Stack: AirForce carrying Commander at c3
    //   // AirForce + Commander -> AirForce is carrier (role flag: 128 vs 1)
    //   const originalPiece = makePiece(AIR_FORCE, RED, false, [
    //     makePiece(COMMANDER),
    //   ])
    //   game.put(originalPiece, 'c3')

    //   // Enemy Tank at f4 that can attack d4 (diagonal distance sqrt(8) ~2.83, but Tank range is 2 orthogonal only)
    //   // Actually Tank can only attack orthogonally, distance 2
    //   // So enemy Tank at d6 can attack d4 (distance 2, same file)
    //   game.put(makePiece(TANK, BLUE), 'd6')

    //   // Deploy AirForce to d4 (safe for AirForce alone) using game.move()
    //   game.move({
    //     from: 'c3',
    //     to: 'd4',
    //     piece: AIR_FORCE,
    //     deploy: true,
    //   })

    //   const session = game.getSession()
    //   expect(session).toBeDefined()
    //   if (!session) return

    //   // Remaining: Commander
    //   // If Commander recombines to d4 with AirForce:
    //   // - Combined piece will be AirForce(Commander)
    //   // - Square d4 is attacked by enemy Tank at d6 (distance 2, orthogonal)
    //   // - Commander would be in danger

    //   const options = session.getOptions()
    //   // Should filter out d4 option due to commander danger
    //   expect(options).toHaveLength(0)
    // })

    it('should filter out recombine when carrier cannot exist on terrain', () => {
      // Stack: Navy carrying AirForce at c3 (water square)
      // Navy + AirForce -> Navy is carrier (role flag: 512 vs 128)
      const originalPiece = makePiece(NAVY, RED, false, [makePiece(AIR_FORCE)])
      game.put(originalPiece, 'c3')

      // Deploy AirForce to f4 (pure land - AirForce can go anywhere) using game.move()
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
      // If Navy recombines with AirForce at f4:
      // - Combined piece will be Navy(AirForce)
      // - Navy is the carrier
      // - f4 is pure land (files d-k, not c or river)
      // - Navy cannot exist on pure land terrain

      const options = session.getOptions()
      // Should filter out f4 option due to Navy terrain restriction
      expect(options).toHaveLength(0)
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

      const options = session.getOptions()
      // Should filter out d3 option due to Navy terrain restriction
      expect(options).toHaveLength(0)
    })
  })

  describe('recombine execution', () => {
    it('should successfully recombine and commit', () => {
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

      const options = session.getOptions()
      const result = game.recombine(options[0])

      expect(result).toBeTruthy()

      const boardPiece = game.get('c5')
      expect(boardPiece).toBeDefined()
      expect(boardPiece?.type).toBe(NAVY)
      expect(boardPiece?.carrying).toHaveLength(1)
      expect(game.getSession()).toBeNull()
    })

    it('should handle sequential re-execution and commit', () => {
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

      const options = session.getOptions()
      const airForceOption = options.find(
        (o) => o.square === 'c5' && o.piece === AIR_FORCE,
      )
      expect(airForceOption).toBeDefined()

      const result = game.recombine(airForceOption!)
      expect(result.success).toBe(true)

      expect(game.get('c5')?.carrying).toHaveLength(1)
      expect(game.get('c4')?.type).toBe(TANK)
      expect(game.getSession()).toBeNull()
    })

    it('should preserve move execution order and commit', () => {
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

      const options = session.getOptions()
      const infantryOption = options.find(
        (o) => o.square === 'c5' && o.piece === INFANTRY,
      )
      expect(infantryOption).toBeDefined()

      const result = game.recombine(infantryOption!)
      expect(result.success).toBe(true)

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

      const options = session.getOptions()
      // console.log('User Scenario Options Count:', options.length)
      // options.forEach((o) => console.log(`Option: ${o.piece} at ${o.square}`))

      expect(options).toHaveLength(2)
    })
  })
})
