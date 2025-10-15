/**
 * Deploy Move Parser Tests
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

describe('Deploy Move Parser', () => {
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

  describe('parseDeployMove', () => {
    it('should parse simple deploy move', () => {
      const deployStr = 'd5:N@e8,TI'
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeTruthy()
      expect(result.type).toBe('deploy-move')
      expect(result.originalSquare).toBe(algebraicToSquare('d5'))
      expect(result.movedPieces).toHaveLength(1)
      expect(result.movedPieces[0].piece).toBe('N')
      expect(result.movedPieces[0].destination).toBe('e8')
      expect(result.remainingPieces).toEqual(['T', 'I'])
      expect(result.isComplete).toBe(false)
    })

    it('should parse multiple moved pieces', () => {
      const deployStr = 'f6:A@f8T@e6,IM'
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeTruthy()
      expect(result.movedPieces).toHaveLength(2)
      expect(result.movedPieces[0].piece).toBe('A')
      expect(result.movedPieces[0].destination).toBe('f8')
      expect(result.movedPieces[1].piece).toBe('T')
      expect(result.movedPieces[1].destination).toBe('e6')
      expect(result.remainingPieces).toEqual(['I', 'M'])
    })

    it('should parse heroic pieces', () => {
      const deployStr = 'c4:N*@b4T*@d5,IM'
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeTruthy()
      expect(result.movedPieces).toHaveLength(2)
      expect(result.movedPieces[0].piece).toBe('N*')
      expect(result.movedPieces[0].destination).toBe('b4')
      expect(result.movedPieces[1].piece).toBe('T*')
      expect(result.movedPieces[1].destination).toBe('d5')
      expect(result.remainingPieces).toEqual(['I', 'M'])
    })

    it('should parse complete deploy (no remaining pieces)', () => {
      const deployStr = 'e5:N@e7T@d5I@f5,'
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeTruthy()
      expect(result.movedPieces).toHaveLength(3)
      expect(result.remainingPieces).toEqual([])
      expect(result.isComplete).toBe(true)
    })

    it('should parse complete deploy (no comma)', () => {
      const deployStr = 'e5:N@e7T@d5I@f5'
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeTruthy()
      expect(result.movedPieces).toHaveLength(3)
      expect(result.remainingPieces).toEqual([])
      expect(result.isComplete).toBe(true)
    })

    it('should parse empty deploy (just started)', () => {
      const deployStr = 'd5:,NTI'
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeTruthy()
      expect(result.movedPieces).toEqual([])
      expect(result.remainingPieces).toEqual(['N', 'T', 'I'])
      expect(result.isComplete).toBe(false)
    })

    it('should handle invalid format', () => {
      const deployStr = 'invalid-format'
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeNull()
    })

    it('should handle missing colon', () => {
      const deployStr = 'd5N@e8,TI'
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeNull()
    })

    it('should handle invalid square format', () => {
      const deployStr = 'd5:N@xyz,TI'
      const result = parseDeployMove(deployStr, gameState)

      // Parser validates format and rejects invalid squares
      expect(result).toBeNull()
    })

    it('should parse complex heroic stack', () => {
      const deployStr = 'a1:N*@a3T*@b2I*@c1,M*G'
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeTruthy()
      expect(result.movedPieces).toHaveLength(3)
      expect(result.movedPieces[0].piece).toBe('N*')
      expect(result.movedPieces[1].piece).toBe('T*')
      expect(result.movedPieces[2].piece).toBe('I*')
      expect(result.remainingPieces).toEqual(['M*', 'G'])
    })
  })

  describe('deploySessionToSAN', () => {
    it('should return "-" for null deploy session', () => {
      const result = deploySessionToSAN(null)
      expect(result).toBe('-')
    })

    it('should return "-" for undefined deploy session', () => {
      const result = deploySessionToSAN(undefined)
      expect(result).toBe('-')
    })

    it('should encode active deploy session', () => {
      // Create a stack
      const navyStack = pieceUtils.createPiece('r', 'n', false)
      navyStack.carrying = [
        pieceUtils.createPiece('r', 't', false),
        pieceUtils.createPiece('r', 'i', false),
      ]

      // Create deploy session
      const deploySession = new DeploySession(
        algebraicToSquare('d5'),
        'r',
        navyStack,
        [],
      )

      // Add virtual changes
      deploySession.addVirtualChange(algebraicToSquare('d5'), null)
      deploySession.addVirtualChange(
        algebraicToSquare('e8'),
        pieceUtils.createPiece('r', 'n', false),
      )

      const result = deploySessionToSAN(deploySession)
      expect(result).toMatch(/^d5:N@e8,/)
      expect(result).toContain('N@e8')
    })
  })

  describe('Integration with normal SAN parsing', () => {
    it('should distinguish between normal moves and deploy moves', () => {
      const normalMove = 'Te5'
      const deployMove = 'd5:N@e8,TI'

      // Normal move should not contain ':'
      expect(normalMove).not.toContain(':')

      // Deploy move should contain ':'
      expect(deployMove).toContain(':')

      // Can use this to route to appropriate parser
      const isDeployMove = deployMove.includes(':')
      expect(isDeployMove).toBe(true)

      const isNormalMove = !normalMove.includes(':')
      expect(isNormalMove).toBe(true)
    })

    it('should handle edge cases in format detection', () => {
      const edgeCases = [
        'Te5:check', // Normal move with colon in annotation
        'd5:', // Incomplete deploy
        ':N@e8,TI', // Missing original square
        'd5:,', // Empty deploy
      ]

      for (const testCase of edgeCases) {
        const hasColon = testCase.includes(':')
        const colonIndex = testCase.indexOf(':')
        const beforeColon = testCase.substring(0, colonIndex)

        // Deploy moves should have square before colon
        const isLikelyDeploy = hasColon && beforeColon.length >= 2
        console.log(`${testCase} -> likely deploy: ${isLikelyDeploy}`)
      }
    })
  })

  describe('Error handling', () => {
    it('should handle malformed piece notation', () => {
      const deployStr = 'd5:X@e8,TI' // Invalid piece type
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeTruthy() // Parser doesn't validate piece types
      expect(result.movedPieces[0].piece).toBe('X')
    })

    it('should handle missing destination', () => {
      const deployStr = 'd5:N@,TI'
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeNull() // Should fail on invalid destination
    })

    it('should handle truncated input', () => {
      const deployStr = 'd5:N'
      const result = parseDeployMove(deployStr, gameState)

      expect(result).toBeNull() // Should fail on incomplete format
    })
  })
})
