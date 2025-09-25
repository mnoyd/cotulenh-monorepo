/**
 * Integration demo test - Shows the modular architecture working together
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CoTuLenhFacade } from '../src/modules/cotulenh-facade.js'
import { RED, BLUE, COMMANDER, INFANTRY } from '../src/type.js'

describe('Integration Demo', () => {
  let game: CoTuLenhFacade

  beforeEach(() => {
    game = new CoTuLenhFacade()
  })

  it('should demonstrate modular architecture working together', () => {
    // 1. Test initial state
    game.clear()
    expect(game.turn()).toBe('r')
    expect(game.moveNumber()).toBe(1)
    expect(game.isGameOver()).toBe(true) // No commanders = game over

    // 2. Place some pieces using the facade
    const redCommander = { type: COMMANDER as any, color: RED as any }
    const blueCommander = { type: COMMANDER as any, color: BLUE as any }
    const redInfantry = { type: INFANTRY as any, color: RED as any }

    expect(game.put(redCommander, 'f6')).toBe(true)
    expect(game.put(blueCommander, 'f8')).toBe(true)
    expect(game.put(redInfantry, 'e6')).toBe(true)

    // 3. Verify pieces are placed correctly
    expect(game.get('f6')?.type).toBe(COMMANDER)
    expect(game.get('f6')?.color).toBe(RED)
    expect(game.get('f8')?.type).toBe(COMMANDER)
    expect(game.get('f8')?.color).toBe(BLUE)

    // 4. Test game state queries
    expect(game.isGameOver()).toBe(false) // Now we have commanders
    expect(game.isCheck()).toBe(false) // No immediate check

    // 5. Test module access for advanced operations
    const gameStateModule = game.getGameStateModule()
    const boardOpsModule = game.getBoardOperationsModule()
    const moveExecutorModule = game.getMoveExecutorModule()

    // Verify commander positions are tracked
    expect(gameStateModule.getCommanderPosition(RED)).toBe(0x65) // f6
    expect(gameStateModule.getCommanderPosition(BLUE)).toBe(0x45) // f8

    // Verify board operations work
    expect(boardOpsModule.isSquareOccupied(0x65)).toBe(true) // f6 occupied
    expect(boardOpsModule.isSquareOccupied(0x55)).toBe(false) // f7 empty

    // Verify history is empty (no moves made yet)
    expect(moveExecutorModule.getHistoryLength()).toBe(0)

    // 6. Test state validation
    const errors = game.validateState()
    expect(errors).toEqual([]) // No validation errors

    // 7. Test debug info
    const debugInfo = game.getDebugInfo()
    expect(debugInfo.historyLength).toBe(0)
    expect(debugInfo.cacheSize).toBe(0)
    expect(debugInfo.validation).toEqual([])

    // 8. Test piece removal
    const removed = game.remove('e6')
    expect(removed?.type).toBe(INFANTRY)
    expect(game.get('e6')).toBeUndefined()

    // 9. Test that commander positions are still tracked after other operations
    expect(gameStateModule.getCommanderPosition(RED)).toBe(0x65) // f6 still
    expect(gameStateModule.getCommanderPosition(BLUE)).toBe(0x45) // f8 still
  })

  it('should demonstrate state snapshots working across modules', () => {
    // Set up initial state
    const redCommander = { type: COMMANDER as any, color: RED as any }
    const blueInfantry = { type: INFANTRY as any, color: BLUE as any }

    game.put(redCommander, 'f6')
    game.put(blueInfantry, 'e5')

    // Get modules for direct access
    const gameState = game.getGameStateModule()
    const boardOps = game.getBoardOperationsModule()

    // Modify game state
    gameState.setTurn('b')
    gameState.setMoveNumber(5)

    // Create snapshot
    const snapshot = gameState.createSnapshot()

    // Verify snapshot captured current state
    expect(snapshot.turn).toBe('b')
    expect(snapshot.moveNumber).toBe(5)
    expect(snapshot.board[0x65]).toBeDefined() // f6 has commander
    expect(snapshot.board[0x74]).toBeDefined() // e5 has infantry

    // Make more changes
    game.remove('e5')
    gameState.setTurn('r')
    gameState.setMoveNumber(1)

    // Verify changes took effect
    expect(game.turn()).toBe('r')
    expect(game.moveNumber()).toBe(1)
    expect(game.get('e5')).toBeUndefined()

    // Restore snapshot
    gameState.restoreSnapshot(snapshot)

    // Verify restoration worked
    expect(game.turn()).toBe('b')
    expect(game.moveNumber()).toBe(5)
    expect(game.get('f6')).toBeDefined() // Commander still there
    expect(game.get('e5')).toBeDefined() // Infantry restored
  })

  it('should demonstrate interface compliance', () => {
    // This test verifies that all the interface methods we added actually work
    const gameState = game.getGameStateModule()
    const boardOps = game.getBoardOperationsModule()
    const moveExecutor = game.getMoveExecutorModule()

    // Test IGameState interface compliance
    gameState.clear()
    expect(typeof gameState.isSquareOnBoard).toBe('function')
    expect(typeof gameState.isValidSquare).toBe('function')
    expect(typeof gameState.getCommanderPositions).toBe('function')
    expect(typeof gameState.validateState).toBe('function')
    expect(typeof gameState.getCommentForPosition).toBe('function')
    expect(typeof gameState.setCommentForPosition).toBe('function')
    expect(typeof gameState.removeCommentForPosition).toBe('function')

    expect(typeof boardOps.validateBoardState).toBe('function')
    expect(typeof boardOps.printBoard).toBe('function')

    expect(typeof moveExecutor.getHistoryLength).toBe('function')

    // Test that they actually work
    expect(gameState.isSquareOnBoard(0x65)).toBe(true)
    expect(gameState.isValidSquare(0x65)).toBe(true)
    expect(gameState.getCommanderPositions()).toEqual({ r: -1, b: -1 })
    expect(gameState.validateState()).toEqual([])
    expect(boardOps.validateBoardState()).toEqual([])
    expect(moveExecutor.getHistoryLength()).toBe(0)

    // Test comment functionality
    gameState.setCommentForPosition('test-fen', 'Test comment')
    expect(gameState.getCommentForPosition('test-fen')).toBe('Test comment')
    expect(gameState.removeCommentForPosition('test-fen')).toBe('Test comment')
    expect(gameState.getCommentForPosition('test-fen')).toBeUndefined()
  })
})
