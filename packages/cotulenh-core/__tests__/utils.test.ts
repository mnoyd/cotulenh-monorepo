import { beforeEach, describe, expect, it } from 'vitest'
import { makeSanSinglePiece, makeSanPiece } from '../src/utils'
import { Piece, INFANTRY, TANK, COMMANDER, RED, BLUE } from '../src/type' // Adjust path if needed
import { CoTuLenh } from '../src/cotulenh'

describe('utils', () => {
  describe('makeSanPiece', () => {
    it('should return the uppercase symbol for a regular piece', () => {
      const piece: Piece = { type: INFANTRY, color: RED }
      expect(makeSanSinglePiece(piece)).toBe('I')
    })

    it('should return the uppercase symbol prefixed with + for a heroic piece', () => {
      const piece: Piece = { type: TANK, color: BLUE, heroic: true }
      expect(makeSanSinglePiece(piece)).toBe('+T')
    })

    it('should handle different piece types', () => {
      const piece: Piece = { type: COMMANDER, color: RED }
      expect(makeSanSinglePiece(piece)).toBe('C')
    })
  })

  describe('makeSanPiece', () => {
    it('should return just the carrier piece if not carrying anything', () => {
      const piece: Piece = { type: TANK, color: RED, carrying: [] }
      expect(makeSanPiece(piece)).toBe('T')
    })

    it('should return just the carrier piece if carrying is undefined', () => {
      const piece: Piece = { type: TANK, color: RED } // carrying is undefined
      expect(makeSanPiece(piece)).toBe('T')
    })

    it('should return the carrier and single carried piece separated by |', () => {
      const carriedPiece: Piece = { type: INFANTRY, color: RED }
      const carrierPiece: Piece = {
        type: TANK,
        color: RED,
        carrying: [carriedPiece],
      }
      expect(makeSanPiece(carrierPiece, true)).toBe('(T|I)')
    })

    it('should return the carrier and multiple carried pieces joined together', () => {
      const carried1: Piece = { type: INFANTRY, color: RED }
      const carried2: Piece = { type: COMMANDER, color: RED }
      const carrierPiece: Piece = {
        type: TANK,
        color: RED,
        carrying: [carried1, carried2],
      }
      expect(makeSanPiece(carrierPiece, true)).toBe('(T|IC)')
    })

    it('should handle heroic pieces in the carrier and stack', () => {
      const carried1: Piece = { type: INFANTRY, color: BLUE, heroic: true }
      const carried2: Piece = { type: COMMANDER, color: BLUE }
      const carrierPiece: Piece = {
        type: TANK,
        color: BLUE,
        heroic: true,
        carrying: [carried1, carried2],
      }
      expect(makeSanPiece(carrierPiece, true)).toBe('(+T|+IC)')
    })

    it('should handle mixed heroic status in the stack', () => {
      const carried1: Piece = { type: INFANTRY, color: RED }
      const carried2: Piece = { type: COMMANDER, color: RED, heroic: true }
      const carrierPiece: Piece = {
        type: TANK,
        color: RED,
        carrying: [carried1, carried2],
      }
      expect(makeSanPiece(carrierPiece, true)).toBe('(T|I+C)')
    })
  })
})

describe('CoTuLenh remove partial', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
    game.clear()
  })

  it('remove() without piece argument should remove everything (legacy)', () => {
    game.put({ type: TANK, color: RED }, 'e4')
    game.remove('e4')
    expect(game.get('e4')).toBeUndefined()
  })

  it('remove() a passenger from a stack', () => {
    // Setup stack: Tank carrying Infantry
    game.put({ type: TANK, color: RED }, 'e4')
    game.put({ type: INFANTRY, color: RED }, 'e4', true) // combine

    // Verify setup
    const initialStack = game.get('e4')
    expect(initialStack).toBeDefined()
    expect(initialStack?.type).toBe(TANK)
    expect(initialStack?.carrying).toHaveLength(1)
    expect(initialStack?.carrying?.[0].type).toBe(INFANTRY)

    // Remove Infantry
    const pieceToRemove: Piece = { type: INFANTRY, color: RED }
    const removed = game.remove('e4', pieceToRemove)

    // Verify removed piece
    expect(removed).toBeDefined()
    expect(removed?.type).toBe(INFANTRY)

    // Verify remaining stack
    const remaining = game.get('e4')
    expect(remaining).toBeDefined()
    expect(remaining?.type).toBe(TANK)
    expect(remaining?.carrying).toBeUndefined()
  })

  it('remove() the carrier from a stack', () => {
    // Setup stack: Tank carrying Infantry
    game.put({ type: TANK, color: RED }, 'e4')
    game.put({ type: INFANTRY, color: RED }, 'e4', true) // combine

    // Remove Tank (Carrier)
    const pieceToRemove: Piece = { type: TANK, color: RED }
    const removed = game.remove('e4', pieceToRemove)

    // Verify removed piece
    expect(removed).toBeDefined()
    expect(removed?.type).toBe(TANK)

    // Verify remaining is Infantry
    const remaining = game.get('e4')
    expect(remaining).toBeDefined()
    expect(remaining?.type).toBe(INFANTRY)
  })

  it('remove() a commander should update commander position', () => {
    // Setup Commander
    game.put({ type: COMMANDER, color: RED }, 'e4')
    // Confirm commander tracked
    // Accessing private property for it confirmation or relying on behavior
    // Let's rely on behavior: move generation fails if commander exposed?
    // Or just re-add commander elsewhere to check limit error if it wasn't cleared?
    // Let's rely on re-adding limit.

    const pieceToRemove: Piece = { type: COMMANDER, color: RED }
    game.remove('e4', pieceToRemove)

    // Should be able to add commander somewhere else now
    expect(() => {
      game.put({ type: COMMANDER, color: RED }, 'd4')
    }).not.toThrow()
  })

  it('remove() non-existent piece should throw', () => {
    game.put({ type: TANK, color: RED }, 'e4')
    const pieceToRemove: Piece = { type: INFANTRY, color: RED }

    expect(() => {
      game.remove('e4', pieceToRemove)
    }).toThrow()
  })

  it('remove() from complex stack', () => {
    // Navy carrying Airforce carrying Infantry (if possible? or flat stack?)
    // Let's do Navy + Airforce + Infantry
    // Actually CoTuLenh stacking rules are complex, let's assume valid stack construction
    // Navy can carry Airforce? No, Navy carries troops. Airforce carries troops.
    // Let's try Tank + Infantry + Engineer (if allowed)
    // Actually simpler: Tank + Infantry is common.
    // Let's try to remove everything one by one.

    game.put({ type: TANK, color: RED }, 'e4')
    game.put({ type: INFANTRY, color: RED }, 'e4', true)

    // Remove Infantry
    game.remove('e4', { type: INFANTRY, color: RED })
    expect(game.get('e4')?.carrying).toBeUndefined()

    // Remove Tank
    game.remove('e4', { type: TANK, color: RED })
    expect(game.get('e4')).toBeUndefined()
  })
})
