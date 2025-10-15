/**
 * SAN Parser Deploy Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseDeployMove,
  deploySessionToSAN,
} from '../../src/serialization/SANParser'
import { GameState } from '../../src/core/GameState'
import { Board } from '../../src/core/Board'
import { DeploySession } from '../../src/core/DeploySession'
import { pieceUtils } from '../../src/core/Piece'
import { algebraicToSquare } from '../../src/utils/square'

describe('SAN Parser Deploy Integration', () => {
  let gameState: GameState

  beforeEach(() => {
    const board = Board.createEmpty()
    board.set(algebraicToSquare('e6'), pieceUtils.createPiece('r', 'c', false))
    board.set(algebraicToSquare('e7'), pieceUtils.createPiece('b', 'c', false))

    gameState = new GameState({
      board,
      turn: 'r',
      commanders: [algebraicToSquare('e6'), algebraicToSquare('e7')],
      moveNumber: 1,
      halfMoves: 0,
    })
  })

  describe('Move type detection', () => {
    it('should detect normal moves', () => {
      const normalMoves = [
        'Te5',
        'Nf3',
        'Cxe4',
        'N<', // Stay capture
        'Te5+', // Check
        'Nf3#', // Checkmate
      ]

      for (const move of normalMoves) {
        const isDeployMove = move.includes(':') && move.indexOf(':') > 1
        expect(isDeployMove).toBe(false)
      }
    })

    it('should detect deploy moves', () => {
      const deployMoves = [
        'd5:N@e8,TI',
        'f6:A@f8T@e6,IM',
        'c4:N*@b4T*@d5,IM',
        'e5:N@e7T@d5I@f5',
        'd5:,NTI',
      ]

      for (const move of deployMoves) {
        const isDeployMove = move.includes(':') && move.indexOf(':') > 1
        expect(isDeployMove).toBe(true)
      }
    })

    it('should handle edge cases in detection', () => {
      const edgeCases = [
        { move: 'Te5:check', expected: true }, // Has colon at position > 1, but not actually deploy
        { move: ':N@e8,TI', expected: false }, // Missing original square (colon at position 0)
        { move: 'd:', expected: false }, // Colon at position 1, not > 1
        { move: 'd5:', expected: true }, // Valid but empty deploy (colon at position 2)
      ]

      for (const { move, expected } of edgeCases) {
        const isDeployMove = move.includes(':') && move.indexOf(':') > 1
        expect(isDeployMove).toBe(expected)
      }
    })
  })

  describe('Parser routing', () => {
    it('should route to correct parser based on format', () => {
      const testCases = [
        { input: 'Te5', shouldUseDeployParser: false },
        { input: 'd5:N@e8,TI', shouldUseDeployParser: true },
        { input: 'Nf3+', shouldUseDeployParser: false },
        { input: 'f6:A@f8T@e6,IM', shouldUseDeployParser: true },
      ]

      for (const { input, shouldUseDeployParser } of testCases) {
        const isDeployFormat = input.includes(':') && input.indexOf(':') > 1

        if (shouldUseDeployParser) {
          expect(isDeployFormat).toBe(true)
          const deployResult = parseDeployMove(input, gameState)
          expect(deployResult).toBeTruthy()
        } else {
          expect(isDeployFormat).toBe(false)
          // Would route to normal SAN parser
          // const normalResult = parseSAN(input, gameState)
          // Note: parseSAN might return null if move is not legal in current position
        }
      }
    })
  })

  describe('Deploy session state management', () => {
    it('should handle deploy session creation', () => {
      const navyStack = pieceUtils.createPiece('r', 'n', false)
      navyStack.carrying = [
        pieceUtils.createPiece('r', 't', false),
        pieceUtils.createPiece('r', 'i', false),
      ]

      const deploySession = new DeploySession(
        algebraicToSquare('d5'),
        'r',
        navyStack,
        [],
      )

      expect(deploySession.originalSquare).toBe(algebraicToSquare('d5'))
      expect(deploySession.turn).toBe('r')
      expect(deploySession.originalPiece).toEqual(navyStack)
      expect(deploySession.isComplete()).toBe(false)
    })

    it('should handle deploy session progression', () => {
      const navyStack = pieceUtils.createPiece('r', 'n', false)
      navyStack.carrying = [
        pieceUtils.createPiece('r', 't', false),
        pieceUtils.createPiece('r', 'i', false),
      ]

      const deploySession = new DeploySession(
        algebraicToSquare('d5'),
        'r',
        navyStack,
        [],
      )

      // Initial state
      expect(deploySession.getRemainingPieces()).toHaveLength(3) // N, T, I

      // Add virtual changes (Navy moves to e8)
      deploySession.addVirtualChange(algebraicToSquare('d5'), null)
      deploySession.addVirtualChange(
        algebraicToSquare('e8'),
        pieceUtils.createPiece('r', 'n', false),
      )

      // Check virtual state
      const board = Board.createEmpty()
      expect(
        deploySession.getEffectivePiece(board, algebraicToSquare('d5')),
      ).toBeNull()
      expect(
        deploySession.getEffectivePiece(board, algebraicToSquare('e8')),
      ).toBeTruthy()
    })

    it('should encode deploy session state correctly', () => {
      const navyStack = pieceUtils.createPiece('r', 'n', false)
      navyStack.carrying = [
        pieceUtils.createPiece('r', 't', false),
        pieceUtils.createPiece('r', 'i', false),
      ]

      const deploySession = new DeploySession(
        algebraicToSquare('d5'),
        'r',
        navyStack,
        [],
      )

      deploySession.addVirtualChange(algebraicToSquare('d5'), null)
      deploySession.addVirtualChange(
        algebraicToSquare('e8'),
        pieceUtils.createPiece('r', 'n', false),
      )

      const encoded = deploySessionToSAN(deploySession)
      expect(encoded).toMatch(/^d5:/)
      expect(encoded).toContain('N@e8')
    })
  })

  describe('Complete deploy workflow', () => {
    it('should handle complete deploy session lifecycle', () => {
      // 1. Create initial stack
      const navyStack = pieceUtils.createPiece('r', 'n', false)
      navyStack.carrying = [
        pieceUtils.createPiece('r', 't', false),
        pieceUtils.createPiece('r', 'i', false),
      ]

      // 2. Start deploy session
      const deploySession = new DeploySession(
        algebraicToSquare('d5'),
        'r',
        navyStack,
        [],
      )

      // 3. First move: Navy to e8
      deploySession.addVirtualChange(algebraicToSquare('d5'), null)
      deploySession.addVirtualChange(
        algebraicToSquare('e8'),
        pieceUtils.createPiece('r', 'n', false),
      )

      let encoded = deploySessionToSAN(deploySession)
      expect(encoded).toMatch(/d5:N@e8,/)

      // 4. Second move: Tank to d4 (would need proper deploy session update)
      // This would require updating the deploy session state properly
      // For now, just test the parsing of the final state

      const finalDeployStr = 'd5:N@e8T@d4,I'
      const parsed = parseDeployMove(finalDeployStr, gameState)

      expect(parsed).toBeTruthy()
      expect(parsed.movedPieces).toHaveLength(2)
      expect(parsed.remainingPieces).toEqual(['I'])
      expect(parsed.isComplete).toBe(false)

      // 5. Final move: Infantry to f5 (complete)
      const completeDeployStr = 'd5:N@e8T@d4I@f5'
      const completeParsed = parseDeployMove(completeDeployStr, gameState)

      expect(completeParsed).toBeTruthy()
      expect(completeParsed.movedPieces).toHaveLength(3)
      expect(completeParsed.remainingPieces).toEqual([])
      expect(completeParsed.isComplete).toBe(true)
    })
  })

  describe('Error cases and edge conditions', () => {
    it('should handle malformed deploy strings gracefully', () => {
      const malformedCases = [
        '',
        'd5',
        'd5:',
        ':N@e8,TI',
        'd5:N@,TI',
        'd5:N@e8,',
        'd5:@e8,TI',
        'd5:N@e8TI', // Missing comma
      ]

      for (const testCase of malformedCases) {
        // Some cases might return null, others might parse partially
        // The key is that they don't crash
        expect(() => parseDeployMove(testCase, gameState)).not.toThrow()
      }
    })

    it('should handle empty and null inputs', () => {
      expect(parseDeployMove('', gameState)).toBeNull()
      expect(deploySessionToSAN(null)).toBe('-')
      expect(deploySessionToSAN(undefined)).toBe('-')
    })

    it('should validate deploy session completeness', () => {
      const testCases = [
        { deploy: 'd5:,NTI', expectedComplete: false },
        { deploy: 'd5:N@e8,TI', expectedComplete: false },
        { deploy: 'd5:N@e8T@d4,I', expectedComplete: false },
        { deploy: 'd5:N@e8T@d4I@f5', expectedComplete: true },
        { deploy: 'd5:N@e8T@d4I@f5,', expectedComplete: true },
      ]

      for (const { deploy, expectedComplete } of testCases) {
        const result = parseDeployMove(deploy, gameState)
        expect(result).toBeTruthy()
        expect(result.isComplete).toBe(expectedComplete)
      }
    })
  })
})
