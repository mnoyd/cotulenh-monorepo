import { describe, it, expect } from 'vitest'
import { MoveSession } from '../src/move-session.js'
import { CoTuLenh } from '../src/cotulenh.js'
import {
  RED,
  BLUE,
  COMMANDER,
  HEADQUARTER,
  INFANTRY,
  SQUARE_MAP,
} from '../src/type.js'
import { makeMove, makePiece } from './test-helpers.js'

describe('Repro Stuck', () => {
  it('should complete session when remaining piece (HQ) has no moves', () => {
    const game = new CoTuLenh()
    game.clear()

    // Setup:
    // Red HQ (h) carrying Red Commander (c) at f2 (0x81 if using hex, algebraic 'f2' is 0x81?? No, wait.
    // Let's use algebraic to be safe or verify hex.
    // f2 -> col=5, row=1 (0-indexed logic in some places?)
    // In cotulenh.ts: 12 ranks (0-11?).
    // Let's just use game.put with algebraic string.

    // Helper arguments: makePiece(type, color, heroic, carrying)
    // Red HQ, carrying Commander (wrapped in array)
    const commander = makePiece(COMMANDER, RED, false, [])
    const hq = makePiece(HEADQUARTER, RED, false, [commander])

    game.put(hq, 'f2')
    game.put(makePiece(INFANTRY, RED, false, []), 'e2') // Red Infantry
    game.put(makePiece(COMMANDER, BLUE, false, []), 'f11') // Blue Commander
    game.put(makePiece(INFANTRY, BLUE, false, []), 'e11') // Blue Infantry

    game['_turn'] = RED // Ensure Red turn

    // Check moves from f2
    // Cast result to StandardMove[] to access properties
    const movesFromF2 = game.moves({ square: 'f2', verbose: true }) as any[]
    // Should find Commander deploy move.
    const deployMove = movesFromF2.find((m) => m.piece.type === 'c')
    expect(deployMove).toBeDefined()

    // Use the algebraic string 'f2' -> converting to internal index if needed
    // Deployed move from is the stack square
    // const f2Index = deployMove.from_index || deployMove.from // StandardMove has 'from' as string, need index?
    // Wait, StandardMove.from is string 'f2'. MoveSession needs NUMBER.
    // We can get number from internal moves or parse it.
    // Let's use internal API for setup or parsing.

    // Let's just hardcode f2 index for now or assume internal 'moves' logic.
    // f2 index:
    // In cotulenh.ts: 9 << 4 | 5 = 144 + 5 = 149? No.
    // Let's use: game.get('f2') works.
    // We can use a helper to get square index if not exported.
    // Or simply iterate board to find it? No.
    // Let's rely on the deployMove.from if it was an internal move... but it is StandardMove.

    // Use game.moves({ verbose: true, square: 'f2' }) to get the move,
    // and SQUARE_MAP to get the numeric index for MoveSession.
    const f2Num = SQUARE_MAP['f2']
    const deployMoveVerbose = movesFromF2.find((m) => m.piece.type === 'c')
    expect(deployMoveVerbose).toBeDefined()
    const internalDeployMove = {
      to: SQUARE_MAP[deployMoveVerbose!.to],
    }

    const session = new MoveSession(game, {
      stackSquare: f2Num,
      turn: RED,
      originalPiece: hq,
      isDeploy: true,
    })
    game['setSession'](session)

    expect(session.isComplete).toBe(false)

    // 2. Deploy Commander
    const moveCmd = makeMove({
      from: f2Num,
      to: internalDeployMove!.to,
      piece: makePiece(COMMANDER, RED, false, []),
      flags: 16, // DEPLOY
    })

    session.addMove(moveCmd)

    const remaining = session.remaining
    expect(remaining).toHaveLength(1)
    expect(remaining[0].type).toBe('h') // Headquarter

    expect(session.isComplete).toBe(true)
  })
})
