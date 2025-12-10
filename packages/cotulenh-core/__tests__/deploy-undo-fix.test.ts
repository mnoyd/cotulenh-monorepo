import { describe, it, expect } from 'vitest'
import { AIR_FORCE, CoTuLenh, MILITIA, TANK } from '../src/cotulenh.js'
import { MoveSession } from '../src/move-session.js'

describe('Deploy Undo Fix', () => {
  it('should clear deploy state when undoing the only deploy move', () => {
    // Test case for the specific bug reported
    const game = new CoTuLenh(
      '6c4/11/11/11/11/6m4/11/11/5(TM)5/11/11/5C5 r - - 0 1',
    )

    // Initial state should have no deploy session
    expect(game.getSession()).toBeNull()

    // Make a deploy move using the public API (which uses processMove internally)
    // Deploy Militia - Tank remains, so session stays active
    game.move({ from: 'f4', to: 'f5', piece: 'm', deploy: true })

    // Session should be active (Tank remains)
    expect(game.getSession()).not.toBeNull()

    // Undo the move
    game.undo()

    // After undo, deploy session should be cleared
    expect(game.getSession()).toBeNull()

    // The FEN should not contain DEPLOY marker
    const fen = game.fen()
    expect(fen).not.toContain('DEPLOY')
  })

  it('should handle multiple deploy moves and undo correctly', () => {
    // Test with a stack that has multiple pieces
    const game = new CoTuLenh(
      '5c5/11/11/11/11/11/11/11/5(FTM)5/11/11/4C6 r - - 0 1',
    )

    expect(game.getSession()).toBeNull()

    // Make first deploy move using public API
    game.move({ from: 'f4', to: 'f5', piece: TANK, deploy: true })
    expect(game.getSession()).not.toBeNull()

    // Make second deploy move
    game.move({ from: 'f4', to: 'f3', piece: AIR_FORCE, deploy: true })
    expect(game.getSession()).not.toBeNull()

    // Make third deploy move - should auto-commit
    game.move({ from: 'f4', to: 'g4', piece: MILITIA, deploy: true })
    expect(game.getSession()).toBeNull() // Auto-committed

    // Undo the entire deploy sequence
    game.undo()
    expect(game.getSession()).toBeNull() // Should be cleared

    // Original stack should be restored
    const piece = game.get('f4')
    expect(piece?.type).toBe(AIR_FORCE)
    expect(piece?.carrying).toHaveLength(2)
  })

  it('should handle edge case: empty deploy session', () => {
    const game = new CoTuLenh(
      '6c4/11/11/11/11/6m4/11/11/5(TM)5/11/11/5C5 r - - 0 1',
    )

    // Manually create an empty deploy session (edge case)
    const originalPiece = game.get(133)! // f4 square
    game.setSession(
      new MoveSession(game, {
        stackSquare: 133,
        turn: 'r',
        originalPiece: originalPiece,
        isDeploy: true,
      }),
    )

    expect(game.getSession()).not.toBeNull()
    expect(game.getSession()!.moves.length).toBe(0)

    // Calling undo should clear the empty session
    game.undo()
    expect(game.getSession()).toBeNull()
  })

  it('should demonstrate the critical issue: deploy moves are not in history', () => {
    const game = new CoTuLenh(
      '6c4/11/11/11/11/6m4/11/11/5(TM)5/11/11/5C5 r - - 0 1',
    )

    // Record initial history length
    const initialHistoryLength = game['_history'].length

    // Make a deploy move using public API
    // Deploy Militia - Tank remains, so session stays active
    game.move({ from: 'f4', to: 'e5', piece: MILITIA, deploy: true })

    // Session is active, so move is NOT in history yet
    expect(game['_history'].length).toBe(initialHistoryLength)
    expect(game.getSession()).not.toBeNull() // Session still active

    // Deploy Tank - should auto-commit
    game.move({ from: 'f4', to: 'f6', piece: TANK, deploy: true })

    // After auto-commit, the deploy move IS added to history as a single entry
    expect(game['_history'].length).toBe(initialHistoryLength + 1)
    expect(game.getSession()).toBeNull() // Session cleared after auto-commit
  })

  it('should demonstrate the _filterLegalMoves bug is fixed', () => {
    const game = new CoTuLenh(
      '6c4/11/11/11/11/6m4/11/11/5(TM)5/11/11/5C5 r - - 0 1',
    )

    // Initial state: no deploy session
    expect(game.getSession()).toBeNull()

    const initialHistoryLength = game['_history'].length

    // Make deploy moves to complete the sequence
    game.move({ from: 'f4', to: 'e4', piece: MILITIA, deploy: true })
    game.move({ from: 'f4', to: 'f6', piece: TANK, deploy: true })

    // After auto-commit: move added to history
    expect(game.getSession()).toBeNull()
    expect(game['_history'].length).toBe(initialHistoryLength + 1)

    // Now call _undoMove (private method) like _filterLegalMoves does
    const undoResult = game['_undoMove']()

    // FIXED: _undoMove returns null for deploy sequences (can't represent as single InternalMove)
    expect(undoResult).toBeNull()

    // FIXED: Deploy session is cleared after undo
    expect(game.getSession()).toBeNull()

    // Game is in a consistent state
  })

  it('should fix _filterLegalMoves to properly undo deploy moves', () => {
    const game = new CoTuLenh(
      '6c4/11/11/11/11/6m4/11/11/5(TM)5/11/11/5C5 r - - 0 1',
    )

    // Initial state: no deploy session
    expect(game.getSession()).toBeNull()

    // Make deploy moves to complete the sequence
    game.move({ from: 'f4', to: 'e5', piece: MILITIA, deploy: true })
    game.move({ from: 'f4', to: 'f6', piece: TANK, deploy: true })

    // After auto-commit: session cleared
    expect(game.getSession()).toBeNull()

    // Now call the public undo() method
    game.undo()

    // FIXED: Deploy session should be cleared properly
    expect(game.getSession()).toBeNull()

    // Game state should be back to initial state
    const fen = game.fen()
    expect(fen).not.toContain('DEPLOY')
  })
})
