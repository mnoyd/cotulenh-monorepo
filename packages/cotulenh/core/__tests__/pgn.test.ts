import { beforeEach, describe, expect, it } from 'vitest'
import { CoTuLenh, SEVEN_TAG_ROSTER } from '../src/cotulenh'

describe('PGN Export/Import', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh()
  })

  describe('Header Management', () => {
    it('should set and get headers', () => {
      game.setHeader('Event', 'Test Tournament')
      game.setHeader('Red', 'Player 1')
      game.setHeader('Blue', 'Player 2')

      const headers = game.getHeaders()
      expect(headers['Event']).toBe('Test Tournament')
      expect(headers['Red']).toBe('Player 1')
      expect(headers['Blue']).toBe('Player 2')
    })

    it('should remove headers', () => {
      game.setHeader('Event', 'Test Tournament')
      expect(game.getHeaders()['Event']).toBe('Test Tournament')

      game.removeHeader('Event')
      // Event is part of Seven Tag Roster, so it should be reset to default
      expect(game.getHeaders()['Event']).toBe('?')
    })

    it('should return correct headers object', () => {
      game.setHeader('Event', 'Championship')
      game.setHeader('CustomTag', 'CustomValue')

      const headers = game.getHeaders()
      expect(headers['Event']).toBe('Championship')
      expect(headers['CustomTag']).toBe('CustomValue')
    })
  })

  describe('pgn() Export', () => {
    it('should export empty game with headers', () => {
      game.setHeader('Event', 'Test Game')
      game.setHeader('Red', 'Red Player')
      game.setHeader('Blue', 'Blue Player')

      const pgn = game.pgn()

      expect(pgn).toContain('[Event "Test Game"]')
      expect(pgn).toContain('[Red "Red Player"]')
      expect(pgn).toContain('[Blue "Blue Player"]')
      expect(pgn).toContain('[Result "*"]')
    })

    it("should include today's date by default", () => {
      const pgn = game.pgn()
      const today = new Date()
      const year = today.getFullYear()

      expect(pgn).toContain(`[Date "${year}`)
    })

    it('should include SetUp and FEN headers for custom positions', () => {
      const customFen = '11/11/11/11/11/5C5/11/11/11/11/11/11 r - - 0 1'
      const customGame = new CoTuLenh(customFen)

      const pgn = customGame.pgn()

      expect(pgn).toContain('[SetUp "1"]')
      expect(pgn).toContain('[FEN "')
    })

    it('should export game with moves', () => {
      // Make a few moves
      const moves = game.moves({ verbose: true })
      if (moves.length > 0) {
        // Make first move for Red
        const firstMove = moves[0]
        game.move({
          from: firstMove.from,
          to:
            firstMove.to instanceof Map
              ? Array.from(firstMove.to.keys())[0]
              : firstMove.to,
        })

        const pgn = game.pgn()

        // Should contain move 1
        expect(pgn).toMatch(/1\.\s+\S+/)
      }
    })

    it('should handle newline option', () => {
      game.setHeader('Event', 'Test')

      const pgnWithNewlines = game.pgn({ newline: '\n' })
      const pgnWithCustomNewlines = game.pgn({ newline: '\r\n' })

      expect(pgnWithNewlines).toContain('\n')
      expect(pgnWithCustomNewlines).toContain('\r\n')
    })

    it('should export Seven Tag Roster headers', () => {
      const pgn = game.pgn()

      // All seven tag roster headers should be present
      for (const tag of Object.keys(SEVEN_TAG_ROSTER)) {
        expect(pgn).toContain(`[${tag} "`)
      }
    })
  })

  describe('loadPgn() Import', () => {
    it('should load PGN with headers', () => {
      const pgnString = `[Event "Test Event"]
[Site "Test Site"]
[Date "2026.01.07"]
[Round "1"]
[Red "Red Player"]
[Blue "Blue Player"]
[Result "*"]

*`

      game.loadPgn(pgnString)

      const headers = game.getHeaders()
      expect(headers['Event']).toBe('Test Event')
      expect(headers['Site']).toBe('Test Site')
      expect(headers['Red']).toBe('Red Player')
      expect(headers['Blue']).toBe('Blue Player')
    })

    it('should load PGN with FEN header', () => {
      const customFen = '11/11/11/11/11/5C5/11/11/11/11/11/11 r - - 0 1'
      const pgnString = `[Event "Custom Position"]
[SetUp "1"]
[FEN "${customFen}"]
[Result "*"]

*`

      game.loadPgn(pgnString)

      // The game should be loaded with the custom FEN
      expect(game.fen()).toContain('C')
    })

    it('should handle round-trip (export then import)', () => {
      // Set up a game
      game.setHeader('Event', 'Round Trip Test')
      game.setHeader('Red', 'Player A')
      game.setHeader('Blue', 'Player B')

      // Export to PGN
      const exportedPgn = game.pgn()

      // Create new game and import
      const newGame = new CoTuLenh()
      newGame.loadPgn(exportedPgn)

      // Headers should match
      expect(newGame.getHeaders()['Event']).toBe('Round Trip Test')
      expect(newGame.getHeaders()['Red']).toBe('Player A')
      expect(newGame.getHeaders()['Blue']).toBe('Player B')
    })
  })

  describe('Comments', () => {
    it('should include comments in PGN output', () => {
      game.setComment('Starting position analysis')

      const pgn = game.pgn()

      expect(pgn).toContain('{Starting position analysis}')
    })
  })
})
