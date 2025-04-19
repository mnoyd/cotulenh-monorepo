import { CoTuLenh } from '../src/cotulenh.js'
import {
  NormalMoveCommand,
  DeployMoveCommand,
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

describe('Move Commands', () => {
  describe('NormalMoveCommand', () => {
    it('should execute and undo a simple move', () => {
      const game = new CoTuLenh('5c5/11/11/11/11/11/11/11/11/11/3T6R/5C5')
      const move: InternalMove = {
        color: RED,
        from: 0xa3, // d2
        to: 0xa5, // f2
        piece: TANK,
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
      const game = new CoTuLenh('5c5/11/11/11/11/11/11/11/3i6R/11/3T6R/5C5')
      const move: InternalMove = {
        color: RED,
        from: 0xa3,
        to: 0x83,
        piece: TANK,
        flags: BITS.CAPTURE,
      }

      const command = new NormalMoveCommand(game, move)
      command.execute()
      expect(game.get('d2')).toBeUndefined()
      expect(game.get('d4')?.color).toBe(RED)
      expect(command.move.captured).toBe(INFANTRY)

      command.undo()
      expect(game.get('d2')?.color).toBe(RED)
      expect(game.get('d4')?.color).toBe(BLUE)
      expect(game.get('d4')?.type).toBe(INFANTRY)
      expect(game.get('d2')?.type).toBe(TANK)
    })

    it('should update commander position', () => {
      const game = new CoTuLenh('5c5/11/11/11/11/11/11/11/3i6R/11/3T6R/5C5')
      const move: InternalMove = {
        color: RED,
        from: 0xb5,
        to: 0xb6,
        piece: COMMANDER,
        flags: BITS.NORMAL,
      }

      const command = new NormalMoveCommand(game, move)
      command.execute()
      expect(game['_commanders'].r).toBe(0xb6)

      command.undo()
      expect(game['_commanders'].r).toBe(0xb5)
    })
  })

  describe('DeployMoveCommand', () => {
    it('should deploy piece from stack', () => {
      const game = new CoTuLenh('5c5/11/11/11/11/11/11/11/4(TI)6/11/11/5C5')
      const move: InternalMove = {
        color: RED,
        from: 0x84,
        to: 0x85,
        piece: INFANTRY,
        flags: BITS.DEPLOY,
      }

      const command = new DeployMoveCommand(game, move)
      command.execute()
      expect(game.get('f4')?.type).toBe(INFANTRY)
      expect(game.get('f4')?.color).toBe(RED)
      expect(game.get('e4')?.carried).toBeFalsy()

      command.undo()
      expect(game.get('e5')).toBeUndefined()
      expect(game.get('e4')?.carried?.length).toBe(1)
    })

    it('should handle deploy with capture', () => {
      const game = new CoTuLenh('5c5/11/11/11/11/11/11/11/4(TI)f5/11/11/5C5')
      const move: InternalMove = {
        color: RED,
        from: 0x84,
        to: 0x85,
        piece: INFANTRY,
        flags: BITS.DEPLOY | BITS.CAPTURE,
      }

      const command = new DeployMoveCommand(game, move)
      command.execute()
      expect(game.get('f4')?.color).toBe(RED)
      expect(game.get('f4')?.type).toBe(INFANTRY)
      expect(game.get('e4')?.carried).toBeFalsy()
      expect(command.move.captured).toBe(AIR_FORCE)

      command.undo()
      expect(game.get('f4')?.color).toBe(BLUE)
      expect(game.get('f4')?.type).toBe(AIR_FORCE)
      expect(game.get('e4')?.carried?.length).toBe(1)
    })

    //TODO: Add stay capture move for air_force. When piece is air_force, in game._moves() always add stay capture and capture for same square
    //meaning if the square can be captured push both capture AND stay capture for same square to possible moves array.

    it('should handle deploy stay capture', () => {
      const game = new CoTuLenh('5c5/11/11/11/11/11/11/11/1(NF)3t5/11/11/5C5')
      const move: InternalMove = {
        color: RED,
        from: 0x81,
        to: 0x85,
        piece: AIR_FORCE,
        flags: BITS.DEPLOY | BITS.STAY_CAPTURE,
      }

      const msan = game['_moveToSan'](move, game['_moves']())
      game.moves({ verbose: true })
      const command = createMoveCommand(game, move)
      command.execute()
      expect(game.get('f4')?.color).toBe(undefined)
      expect(game.get('b4')?.carried?.length).toBe(1)
      expect(command.move.captured).toBe(TANK)

      command.undo()
      expect(game.get('f4')?.color).toBe(BLUE)
      expect(game.get('f4')?.type).toBe(TANK)
      expect(game.get('b4')?.carried?.length).toBe(1)
    })
  })

  describe('StayCaptureMoveCommand', () => {
    it('should execute stay capture', () => {
      const game = new CoTuLenh('5c5/11/11/11/11/11/11/11/1n2A6/11/11/5C5')
      const move: InternalMove = {
        color: RED,
        from: 0x84,
        to: 0x81,
        piece: ARTILLERY,
        flags: BITS.STAY_CAPTURE,
      }

      const command = new StayCaptureMoveCommand(game, move)
      command.execute()
      expect(game.get('e4')?.type).toBe(ARTILLERY)
      expect(game.get('b4')).toBeUndefined()
      expect(command.move.captured).toBe(NAVY)

      command.undo()
      expect(game.get('e4')?.type).toBe(ARTILLERY)
      expect(game.get('b4')?.type).toBe(NAVY)
    })
  })

  describe('createMoveCommand', () => {
    it('should create the correct MoveCommand based on flags', () => {
      const game = new CoTuLenh('5c5/11/11/11/11/11/11/4i6/1(nf)2A6/11/11/5C5')

      expect(
        createMoveCommand(game, {
          color: RED,
          from: 0x84,
          to: 0xa4,
          piece: ARTILLERY,
          flags: BITS.NORMAL,
        }),
      ).toBeInstanceOf(NormalMoveCommand)

      expect(
        createMoveCommand(game, {
          color: BLUE,
          from: 0x81,
          to: 0xa3,
          piece: AIR_FORCE,
          flags: BITS.DEPLOY,
        }),
      ).toBeInstanceOf(DeployMoveCommand)

      expect(
        createMoveCommand(game, {
          color: RED,
          from: 0x84,
          to: 0x81,
          piece: ARTILLERY,
          flags: BITS.STAY_CAPTURE,
        }),
      ).toBeInstanceOf(StayCaptureMoveCommand)
    })
  })

  describe('Error cases', () => {
    it('should throw on invalid source square', () => {
      const game = new CoTuLenh('11/11/11/11/11/11/11/11/11/11/11/11')
      const move: InternalMove = {
        color: RED,
        from: 0x00,
        to: 0x01,
        piece: TANK,
        flags: BITS.NORMAL,
      }

      expect(() => {
        new NormalMoveCommand(game, move).execute()
      }).toThrow()
    })

    it('should throw on invalid capture target', () => {
      const game = new CoTuLenh('t10/11/11/11/11/11/11/11/11/11/11/11')
      const move: InternalMove = {
        color: RED,
        from: 0x00,
        to: 0x01,
        piece: TANK,
        flags: BITS.CAPTURE,
      }

      expect(() => {
        new NormalMoveCommand(game, move).execute()
      }).toThrow()
    })

    it('should throw on invalid deploy from empty carrier', () => {
      const game = new CoTuLenh('t10/11/11/11/11/11/11/11/11/11/11/11')
      const move: InternalMove = {
        color: RED,
        from: 0x00,
        to: 0x01,
        piece: INFANTRY,
        flags: BITS.DEPLOY,
      }

      expect(() => {
        new DeployMoveCommand(game, move).execute()
      }).toThrow()
    })
  })
})
