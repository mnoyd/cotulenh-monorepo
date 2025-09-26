/**
 * Test suite for the new modular architecture
 * Tests individual modules and their integration
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../src/modules/game-state.js'
import { BoardOperations } from '../src/modules/board-operations.js'
import { MoveExecutor } from '../src/modules/move-executor.js'
import { MoveValidator } from '../src/modules/move-validator.js'
import { MoveInterface } from '../src/modules/move-interface.js'
import { CoTuLenhFacade } from '../src/modules/cotulenh-facade.js'
import {
  RED,
  BLUE,
  COMMANDER,
  INFANTRY,
  NAVY,
  type Piece,
} from '../src/type.js'

describe('Modular Architecture', () => {
  describe('GameState Module', () => {
    let gameState: GameState

    beforeEach(() => {
      gameState = new GameState()
    })

    it('should initialize with default values', () => {
      expect(gameState.getTurn()).toBe('r')
      expect(gameState.getMoveNumber()).toBe(1)
      expect(gameState.getHalfMoves()).toBe(0)
      expect(gameState.getCommanderPosition('r')).toBe(-1)
      expect(gameState.getCommanderPosition('b')).toBe(-1)
    })

    it('should validate squares correctly', () => {
      expect(gameState.isSquareOnBoard(0x00)).toBe(true) // a12
      expect(gameState.isSquareOnBoard(0x65)).toBe(true) // f6 (valid)
      expect(gameState.isSquareOnBoard(0x75)).toBe(true) // f5 (valid)
      expect(gameState.isSquareOnBoard(0x0b)).toBe(false) // off board (file 11)
      expect(gameState.isSquareOnBoard(-1)).toBe(false) // off board
    })

    it('should create and restore snapshots', () => {
      gameState.setTurn('b')
      gameState.setMoveNumber(5)
      gameState.setHalfMoves(10)

      const snapshot = gameState.createSnapshot()

      gameState.setTurn('r')
      gameState.setMoveNumber(1)
      gameState.setHalfMoves(0)

      gameState.restoreSnapshot(snapshot)

      expect(gameState.getTurn()).toBe('b')
      expect(gameState.getMoveNumber()).toBe(5)
      expect(gameState.getHalfMoves()).toBe(10)
    })
  })

  describe('BoardOperations Module', () => {
    let gameState: GameState
    let boardOps: BoardOperations

    beforeEach(() => {
      gameState = new GameState()
      boardOps = new BoardOperations(gameState)
    })

    it('should place and retrieve pieces', () => {
      const piece: Piece = { type: COMMANDER, color: RED }

      expect(boardOps.putPiece(piece, 'f6')).toBe(true)

      const retrieved = boardOps.getPiece('f6')
      expect(retrieved).toBeDefined()
      expect(retrieved?.type).toBe(COMMANDER)
      expect(retrieved?.color).toBe(RED)
    })

    it('should remove pieces', () => {
      const piece: Piece = { type: INFANTRY, color: BLUE }
      boardOps.putPiece(piece, 'e5')

      const removed = boardOps.removePiece('e5')
      expect(removed).toBeDefined()
      expect(removed?.type).toBe(INFANTRY)
      expect(removed?.color).toBe(BLUE)

      expect(boardOps.getPiece('e5')).toBeUndefined()
    })

    it('should validate piece placement', () => {
      const landPiece: Piece = { type: COMMANDER, color: RED }
      const navyPiece: Piece = { type: NAVY, color: RED }

      // Should be able to place land piece on land squares
      expect(boardOps.validatePiecePlacement(landPiece, 0x65)).toBe(true) // f6 (land)

      // Should validate square bounds
      expect(boardOps.validatePiecePlacement(landPiece, -1)).toBe(false)
      expect(boardOps.validatePiecePlacement(landPiece, 256)).toBe(false)
    })
  })

  describe('Module Integration', () => {
    let gameState: GameState
    let boardOps: BoardOperations
    let moveValidator: MoveValidator
    let moveExecutor: MoveExecutor

    beforeEach(() => {
      gameState = new GameState()
      boardOps = new BoardOperations(gameState)
      moveValidator = new MoveValidator(gameState, boardOps)
      moveExecutor = new MoveExecutor(gameState, boardOps, moveValidator)

      // Resolve circular dependency for proper move validation
      moveValidator.setMoveExecutor(moveExecutor)
    })

    it('should integrate modules correctly', () => {
      // Place a commander
      const commander: Piece = { type: COMMANDER, color: RED }
      boardOps.putPiece(commander, 'f6')

      // Check that commander position is tracked
      expect(gameState.getCommanderPosition(RED)).toBe(0x65) // f6 square

      // Verify move validator can detect check status
      expect(moveValidator.isCommanderAttacked(RED)).toBe(false)

      // Verify history starts empty
      expect(moveExecutor.getHistoryLength()).toBe(0)
    })

    it('should handle state snapshots across modules', () => {
      // Set up initial state
      boardOps.putPiece({ type: COMMANDER, color: RED }, 'f6')
      gameState.setTurn('b')
      gameState.setMoveNumber(3)

      // Create snapshot
      const snapshot = gameState.createSnapshot()

      // Modify state
      boardOps.removePiece('f6')
      gameState.setTurn('r')
      gameState.setMoveNumber(1)

      // Restore snapshot
      gameState.restoreSnapshot(snapshot)

      // Verify restoration
      expect(gameState.getTurn()).toBe('b')
      expect(gameState.getMoveNumber()).toBe(3)
      expect(boardOps.getPiece('f6')).toBeDefined()
    })
  })

  describe('CoTuLenhFacade', () => {
    let facade: CoTuLenhFacade

    beforeEach(() => {
      facade = new CoTuLenhFacade()
    })

    it('should provide backward compatible API', () => {
      facade.clear()
      expect(facade.turn()).toBe('r')
      expect(facade.moveNumber()).toBe(1)
      expect(facade.isCheck()).toBe(true) // No commanders placed = game over
      expect(facade.isGameOver()).toBe(true)
    })

    it('should handle piece operations', () => {
      const facade = new CoTuLenhFacade()
      facade.clear()
      const piece: Piece = { type: COMMANDER, color: RED }

      expect(facade.put(piece, 'f6')).toBe(true)

      const retrieved = facade.get('f6')
      expect(retrieved).toBeDefined()
      expect(retrieved?.type).toBe(COMMANDER)
      expect(retrieved?.color).toBe(RED)

      const removed = facade.remove('f6')
      expect(removed).toBeDefined()
      expect(facade.get('f6')).toBeUndefined()
    })

    it('should provide module access for advanced usage', () => {
      const gameStateModule = facade.getGameStateModule()
      const boardOpsModule = facade.getBoardOperationsModule()
      const moveExecutorModule = facade.getMoveExecutorModule()

      expect(gameStateModule).toBeDefined()
      expect(boardOpsModule).toBeDefined()
      expect(moveExecutorModule).toBeDefined()

      // Test direct module access
      expect(gameStateModule.getTurn()).toBe('r')
      expect(moveExecutorModule.getHistoryLength()).toBe(0)
    })

    it('should validate state correctly', () => {
      facade.clear()
      const errors = facade.validateState()
      expect(Array.isArray(errors)).toBe(true)
      // Should have no errors in initial state
      expect(errors.length).toBe(0)
    })

    it('should provide debug information', () => {
      const debugInfo = facade.getDebugInfo()

      expect(debugInfo).toBeDefined()
      expect(debugInfo.historyLength).toBe(0)
      expect(debugInfo.cacheSize).toBe(0)
      expect(Array.isArray(debugInfo.validation)).toBe(true)
    })
  })

  describe('Interface Compliance', () => {
    it('should implement all required interface methods', () => {
      const gameState = new GameState()
      const boardOps = new BoardOperations(gameState)
      const moveValidator = new MoveValidator(gameState, boardOps)
      const moveExecutor = new MoveExecutor(gameState, boardOps, moveValidator)

      // Resolve circular dependency
      moveValidator.setMoveExecutor(moveExecutor)

      // Test IGameState interface compliance
      expect(typeof gameState.isSquareOnBoard).toBe('function')
      expect(typeof gameState.isValidSquare).toBe('function')
      expect(typeof gameState.getCommanderPositions).toBe('function')
      expect(typeof gameState.validateState).toBe('function')
      expect(typeof gameState.getCommentForPosition).toBe('function')
      expect(typeof gameState.setCommentForPosition).toBe('function')
      expect(typeof gameState.removeCommentForPosition).toBe('function')

      // Test IBoardOperations interface compliance
      expect(typeof boardOps.validateBoardState).toBe('function')
      expect(typeof boardOps.printBoard).toBe('function')

      // Test IMoveExecutor interface compliance
      expect(typeof moveExecutor.getHistoryLength).toBe('function')

      // Test actual functionality
      expect(gameState.getCommanderPositions()).toEqual({ r: -1, b: -1 })
      expect(gameState.validateState()).toEqual([])
      expect(boardOps.validateBoardState()).toEqual([])
      expect(moveExecutor.getHistoryLength()).toBe(0)
    })
  })
})
