import { makeSanSinglePiece, makeSanPiece } from '../src/utils'
import { Piece, INFANTRY, TANK, COMMANDER, RED, BLUE } from '../src/type' // Adjust path if needed

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
      expect(makeSanPiece(carrierPiece)).toBe('(T|I)')
    })

    it('should return the carrier and multiple carried pieces joined together', () => {
      const carried1: Piece = { type: INFANTRY, color: RED }
      const carried2: Piece = { type: COMMANDER, color: RED }
      const carrierPiece: Piece = {
        type: TANK,
        color: RED,
        carrying: [carried1, carried2],
      }
      expect(makeSanPiece(carrierPiece)).toBe('(T|IC)')
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
      expect(makeSanPiece(carrierPiece)).toBe('(+T|+IC)')
    })

    it('should handle mixed heroic status in the stack', () => {
      const carried1: Piece = { type: INFANTRY, color: RED }
      const carried2: Piece = { type: COMMANDER, color: RED, heroic: true }
      const carrierPiece: Piece = {
        type: TANK,
        color: RED,
        carrying: [carried1, carried2],
      }
      expect(makeSanPiece(carrierPiece)).toBe('(T|I+C)')
    })
  })
})
