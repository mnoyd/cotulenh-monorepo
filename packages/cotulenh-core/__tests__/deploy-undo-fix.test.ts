import { describe, it, expect } from 'vitest'
import { CoTuLenh } from '../src/cotulenh.js'
import { DeploySession } from '../src/deploy-session.js'

describe('Deploy Undo Fix', () => {
  it('should clear deploy state when undoing the only deploy move', () => {
    // Test case for the specific bug reported
    const game = new CoTuLenh(
      '6c4/11/11/11/11/6m4/11/11/5(TM)5/11/11/5C5 r - - 0 1',
    )

    // Initial state should have no deploy state
    expect(game.getDeployState()).toBeNull()
    expect(game.getDeploySession()).toBeNull()

    // Make a deploy move from square 133 (f4) to 117 (f5)
    const move = {
      color: 'r' as const,
      from: 133,
      to: 117,
      piece: {
        type: 'm' as const,
        color: 'r' as const,
      },
      flags: 17, // DEPLOY flag
    }

    // Execute the move
    game['_makeMove'](move)

    // After the move, there should be a deploy state and session
    expect(game.getDeployState()).not.toBeNull()
    expect(game.getDeploySession()).not.toBeNull()

    // Undo the move
    game.undo()

    // After undo, both deploy state and session should be cleared
    // This is the main fix - previously the deploy state would remain
    expect(game.getDeployState()).toBeNull()
    expect(game.getDeploySession()).toBeNull()

    // The FEN should not contain DEPLOY marker
    const fen = game.fen()
    expect(fen).not.toContain('DEPLOY')
  })

  it('should handle multiple deploy moves and undo correctly', () => {
    // Test with a stack that has multiple pieces
    const game = new CoTuLenh(
      '11/11/11/11/11/11/11/11/5(TFM)5/11/11/11 r - - 0 1',
    )

    expect(game.getDeployState()).toBeNull()

    // Make first deploy move
    const move1 = {
      color: 'r' as const,
      from: 133, // f4
      to: 117, // f5
      piece: {
        type: 't' as const,
        color: 'r' as const,
      },
      flags: 17, // DEPLOY flag
    }

    game['_makeMove'](move1)
    expect(game.getDeployState()).not.toBeNull()
    expect(game.getDeploySession()).not.toBeNull()

    // Make second deploy move
    const move2 = {
      color: 'r' as const,
      from: 133, // f4
      to: 149, // f3
      piece: {
        type: 'f' as const,
        color: 'r' as const,
      },
      flags: 17, // DEPLOY flag
    }

    game['_makeMove'](move2)
    expect(game.getDeployState()).not.toBeNull()
    expect(game.getDeploySession()).not.toBeNull()

    // Undo the second move
    game.undo()
    expect(game.getDeployState()).not.toBeNull() // Should still have deploy state
    expect(game.getDeploySession()).not.toBeNull() // Should still have session

    // Undo the first move
    game.undo()
    expect(game.getDeployState()).toBeNull() // Now should be cleared
    expect(game.getDeploySession()).toBeNull() // Now should be cleared
  })

  it('should handle edge case: empty deploy session', () => {
    const game = new CoTuLenh(
      '6c4/11/11/11/11/6m4/11/11/5(TM)5/11/11/5C5 r - - 0 1',
    )

    // Manually create an empty deploy session (edge case)
    const originalPiece = game.get(133)! // f4 square
    game.setDeploySession(
      new DeploySession({
        stackSquare: 133,
        turn: 'r',
        originalPiece: originalPiece,
        startFEN: game.fen(),
        commands: [], // Empty commands array
      }),
    )

    expect(game.getDeploySession()).not.toBeNull()
    expect(game.getDeploySession()!.commands.length).toBe(0)

    // Calling undo should clear the empty session
    game.undo()
    expect(game.getDeploySession()).toBeNull()
    expect(game.getDeployState()).toBeNull()
  })

  it('should handle edge case: legacy deploy state without session', () => {
    const game = new CoTuLenh(
      '6c4/11/11/11/11/6m4/11/11/5(TM)5/11/11/5C5 r - - 0 1',
    )

    // Manually set legacy deploy state without session (edge case)
    const originalPiece = game.get(133)! // f4 square
    game.setDeployState({
      stackSquare: 133,
      turn: 'r',
      originalPiece: originalPiece,
      movedPieces: [], // No pieces moved yet
    })

    expect(game.getDeployState()).not.toBeNull()
    expect(game.getDeploySession()).toBeNull()

    // Calling undo should clear the legacy state
    game.undo()
    expect(game.getDeployState()).toBeNull()
    expect(game.getDeploySession()).toBeNull()
  })

  it('should demonstrate the critical issue: deploy moves are not in history', () => {
    const game = new CoTuLenh(
      '6c4/11/11/11/11/6m4/11/11/5(TM)5/11/11/5C5 r - - 0 1',
    )

    // Record initial history length
    const initialHistoryLength = game['_history'].length

    // Make a deploy move
    const move = {
      color: 'r' as const,
      from: 133,
      to: 117,
      piece: {
        type: 'm' as const,
        color: 'r' as const,
      },
      flags: 17, // DEPLOY flag
    }

    game['_makeMove'](move)

    // CRITICAL: Deploy moves are NOT added to history when there's an active session
    expect(game['_history'].length).toBe(initialHistoryLength) // History unchanged!
    expect(game.getDeploySession()?.commands.length).toBe(1) // But session has the command

    // This demonstrates why calling _undoMove() when there's a deploy state
    // but no session commands would fail - there's nothing in history to undo!
  })

  it('should demonstrate the _filterLegalMoves bug', () => {
    const game = new CoTuLenh(
      '6c4/11/11/11/11/6m4/11/11/5(TM)5/11/11/5C5 r - - 0 1',
    )

    // Initial state: no deploy state
    expect(game.getDeployState()).toBeNull()
    expect(game.getDeploySession()).toBeNull()

    const initialHistoryLength = game['_history'].length

    // Create a deploy move
    const deployMove = {
      color: 'r' as const,
      from: 133,
      to: 117,
      piece: {
        type: 'm' as const,
        color: 'r' as const,
      },
      flags: 17, // DEPLOY flag
    }

    // Simulate what happens in _filterLegalMoves
    game['_makeMove'](deployMove)

    // After _makeMove: deploy session created, move added to session (not history)
    expect(game.getDeploySession()).not.toBeNull()
    expect(game.getDeploySession()!.commands.length).toBe(1)
    expect(game['_history'].length).toBe(initialHistoryLength) // History unchanged!

    // Now call _undoMove (private method) like _filterLegalMoves does
    const undoResult = game['_undoMove']()

    // BUG: _undoMove returns null because there's nothing in history to undo
    expect(undoResult).toBeNull()

    // BUG: Deploy session is still active! The move was NOT undone!
    expect(game.getDeploySession()).not.toBeNull()
    expect(game.getDeploySession()!.commands.length).toBe(1)

    // This leaves the game in an inconsistent state
  })

  it('should fix _filterLegalMoves to properly undo deploy moves', () => {
    const game = new CoTuLenh(
      '6c4/11/11/11/11/6m4/11/11/5(TM)5/11/11/5C5 r - - 0 1',
    )

    // Initial state: no deploy state
    expect(game.getDeployState()).toBeNull()
    expect(game.getDeploySession()).toBeNull()

    // Create a deploy move
    const deployMove = {
      color: 'r' as const,
      from: 133,
      to: 117,
      piece: {
        type: 'm' as const,
        color: 'r' as const,
      },
      flags: 17, // DEPLOY flag
    }

    // Simulate what happens in the FIXED _filterLegalMoves
    game['_makeMove'](deployMove)

    // After _makeMove: deploy session created
    expect(game.getDeploySession()).not.toBeNull()
    expect(game.getDeploySession()!.commands.length).toBe(1)

    // Now call the public undo() method (like the fixed _filterLegalMoves does)
    game.undo()

    // FIXED: Deploy session should be cleared properly
    expect(game.getDeploySession()).toBeNull()
    expect(game.getDeployState()).toBeNull()

    // Game state should be back to initial state
    const fen = game.fen()
    expect(fen).not.toContain('DEPLOY')
  })
})
