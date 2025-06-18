import { CoTuLenh } from '../src/cotulenh.js'
import {
  CaptureMoveCommand,
  NormalMoveCommand,
  SingleDeployMoveCommand,
  StayCaptureMoveCommand,
  createMoveCommand,
} from '../src/move-apply.js'
import {
  BITS,
  RED,
  BLUE,
  InternalMove,
  ARTILLERY,
  AIR_FORCE,
  TANK,
  INFANTRY,
  NAVY,
  COMMANDER,
} from '../src/type.js'
import { makePiece } from './test-helpers.js'

describe('Move Commands', () => {
  let game: CoTuLenh
  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
  })

  describe('NormalMoveCommand', () => {
    it('should execute and undo a simple move', () => {
      game.load('5c5/11/11/11/11/11/11/11/11/11/3T6G/5C5', {
        skipValidation: true,
      })
      const move: InternalMove = {
        color: RED,
        from: 0xa3, // d2
        to: 0xa5, // f2
        piece: makePiece(TANK, RED),
        flags: BITS.NORMAL,
      }

      const command = new NormalMoveCommand(game, move)
      command.execute()
      expect(game.get('d2')).toBeUndefined()
      expect(game.get('f2')?.type).toBe(TANK)

      command.undo()
      expect(game.get('d2')?.type).toBe(TANK)
      expect(game.get('f2')).toBeUndefined()
    })

    it('should handle capture moves', () => {
      game.load('5c5/11/11/11/11/11/11/11/3i7/11/3T7/5C5', {
        skipValidation: true,
      })
      const move: InternalMove = {
        color: RED,
        from: 0xa3,
        to: 0x83,
        piece: makePiece(TANK, RED),
        flags: BITS.CAPTURE,
      }

      const command = new CaptureMoveCommand(game, move)
      command.execute()
      expect(game.get('d2')).toBeUndefined()
      expect(game.get('d4')?.color).toBe(RED)
      expect(game.get('d4')?.type).toBe(TANK)

      command.undo()
      expect(game.get('d2')?.color).toBe(RED)
      expect(game.get('d4')?.color).toBe(BLUE)
      expect(game.get('d4')?.type).toBe(INFANTRY)
      expect(game.get('d2')?.type).toBe(TANK)
    })

    it('should update commander position', () => {
      game.load('5c5/11/11/11/11/11/11/11/3i7/11/3T7/5C5', {
        skipValidation: true,
      })
      const move: InternalMove = {
        color: RED,
        from: 0xb5,
        to: 0xb6,
        piece: makePiece(COMMANDER, RED),
        flags: BITS.NORMAL,
      }

      const command = new NormalMoveCommand(game, move)
      command.execute()
      expect(game['_commanders'].r).toBe(0xb6)

      command.undo()
      expect(game['_commanders'].r).toBe(0xb5)
    })
  })

  describe('SingleDeployMoveCommand', () => {
    it('should deploy piece from stack', () => {
      game.load('5c5/11/11/11/11/11/11/11/4(TI)6/11/11/5C5', {
        skipValidation: true,
      })
      const move: InternalMove = {
        color: RED,
        from: 0x84,
        to: 0x85,
        piece: makePiece(INFANTRY, RED),
        flags: BITS.DEPLOY,
      }

      const command = new SingleDeployMoveCommand(game, move)
      command.execute()
      expect(game.get('f4')?.type).toBe(INFANTRY)
      expect(game.get('f4')?.color).toBe(RED)
      expect(game.get('e4')?.carrying).toBeFalsy()

      command.undo()
      expect(game.get('e5')).toBeUndefined()
      expect(game.get('e4')?.carrying?.length).toBe(1)
    })

    it('should handle deploy with capture', () => {
      game.load('5c5/11/11/11/11/11/11/11/4(TI)f5/11/11/5C5', {
        skipValidation: true,
      })
      const move: InternalMove = {
        color: RED,
        from: 0x84,
        to: 0x85,
        piece: makePiece(INFANTRY, RED),
        flags: BITS.DEPLOY | BITS.CAPTURE,
      }

      const command = new SingleDeployMoveCommand(game, move)
      command.execute()
      expect(game.get('f4')?.color).toBe(RED)
      expect(game.get('f4')?.type).toBe(INFANTRY)
      expect(game.get('e4')?.carrying).toBeFalsy()
      expect(command.move.captured?.type).toBe(AIR_FORCE)

      command.undo()
      expect(game.get('f4')?.color).toBe(BLUE)
      expect(game.get('f4')?.type).toBe(AIR_FORCE)
      expect(game.get('e4')?.carrying?.length).toBe(1)
    })

    //TODO: Add stay capture move for air_force. When piece is air_force, in game._moves() always add stay capture and capture for same square
    //meaning if the square can be captured push both capture AND stay capture for same square to possible moves array.

    it('should allow stay capture for deploy move', () => {
      game.load('5c5/11/11/11/11/11/11/11/1(NF)3t5/11/11/5C5', {
        skipValidation: true,
      })
      const move: InternalMove = {
        color: RED,
        from: 0x81,
        to: 0x85,
        piece: makePiece(AIR_FORCE, RED),
        flags: BITS.DEPLOY | BITS.STAY_CAPTURE,
      }

      const deployAirForceStayCaptureMove = createMoveCommand(game, move)
      expect(deployAirForceStayCaptureMove).toBeInstanceOf(
        SingleDeployMoveCommand,
      )
    })
  })

  describe('StayCaptureMoveCommand', () => {
    it('should execute stay capture', () => {
      game.load('5c5/11/11/11/11/11/11/11/1n2A6/11/11/5C5', {
        skipValidation: true,
      })
      const move: InternalMove = {
        color: RED,
        from: 0x84,
        to: 0x81,
        piece: makePiece(ARTILLERY, RED),
        flags: BITS.STAY_CAPTURE,
      }

      const command = new StayCaptureMoveCommand(game, move)
      command.execute()
      expect(game.get('e4')?.type).toBe(ARTILLERY)
      expect(game.get('b4')).toBeUndefined()
      expect(command.move.captured?.type).toBe(NAVY)

      command.undo()
      expect(game.get('e4')?.type).toBe(ARTILLERY)
      expect(game.get('b4')?.type).toBe(NAVY)
    })
  })

  describe('createMoveCommand', () => {
    it('should create the correct MoveCommand based on flags', () => {
      game.load('5c5/11/11/11/11/11/11/4i6/1(nf)2A6/11/11/5C5', {
        skipValidation: true,
      })

      expect(
        createMoveCommand(game, {
          color: RED,
          from: 0x84,
          to: 0x86,
          piece: makePiece(ARTILLERY, RED),
          flags: BITS.NORMAL,
        }),
      ).toBeInstanceOf(NormalMoveCommand)

      expect(
        createMoveCommand(game, {
          color: BLUE,
          from: 0x81,
          to: 0xa3,
          piece: makePiece(AIR_FORCE, BLUE),
          flags: BITS.DEPLOY,
        }),
      ).toBeInstanceOf(SingleDeployMoveCommand)

      expect(
        createMoveCommand(game, {
          color: RED,
          from: 0x84,
          to: 0x81,
          piece: makePiece(ARTILLERY, RED),
          flags: BITS.STAY_CAPTURE,
        }),
      ).toBeInstanceOf(StayCaptureMoveCommand)
    })
  })

  describe('Error cases', () => {
    it('should throw on invalid source square', () => {
      game.load('11/11/11/11/11/11/11/11/11/11/11/11', { skipValidation: true })
      const move: InternalMove = {
        color: RED,
        from: 0x00,
        to: 0x01,
        piece: makePiece(TANK, RED),
        flags: BITS.NORMAL,
      }

      expect(() => {
        new NormalMoveCommand(game, move).execute()
      }).toThrow()
    })

    it('should throw on invalid capture target', () => {
      game.load('t10/11/11/11/11/11/11/11/11/11/11/11', {
        skipValidation: true,
      })
      const move: InternalMove = {
        color: RED,
        from: 0x00,
        to: 0x01,
        piece: makePiece(TANK, RED),
        flags: BITS.CAPTURE,
      }

      expect(() => {
        new NormalMoveCommand(game, move).execute()
      }).toThrow()
    })

    it('should throw on invalid deploy from empty carrier', () => {
      game.load('t10/11/11/11/11/11/11/11/11/11/11/11', {
        skipValidation: true,
      })
      const move: InternalMove = {
        color: RED,
        from: 0x00,
        to: 0x01,
        piece: makePiece(INFANTRY, RED),
        flags: BITS.DEPLOY,
      }

      expect(() => {
        new SingleDeployMoveCommand(game, move).execute()
      }).toThrow()
    })
  })
})
