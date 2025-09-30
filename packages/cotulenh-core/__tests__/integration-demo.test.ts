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

  it('should demonstrate move execution and undo working across modules', () => {
    const game = new CoTuLenhFacade()
    const moveExecutor = game.getMoveExecutorModule()

    // Use default starting position
    expect(game.turn()).toBe('r')
    expect(game.moveNumber()).toBe(1)
    expect(moveExecutor.getHistoryLength()).toBe(0)

    // Make a move using the modular architecture
    const move = game.move('Ik6') // Move infantry forward

    // Verify move was executed
    expect(game.turn()).toBe('b') // Turn switched to blue
    expect(moveExecutor.getHistoryLength()).toBe(1) // Move recorded in history

    // Undo the move
    game.undo()

    // Verify undo worked - should be back to original state
    expect(game.turn()).toBe('r') // Turn restored to red
    expect(moveExecutor.getHistoryLength()).toBe(0) // History cleared

    // Verify we can make the move again (state fully restored)
    const move2 = game.move('Ik6')
    expect(game.turn()).toBe('b')
    expect(moveExecutor.getHistoryLength()).toBe(1)
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
