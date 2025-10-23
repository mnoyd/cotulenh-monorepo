# Action-Based Deploy Session Refactoring Specification

**Created**: January 2025  
**Status**: Ready for Implementation  
**Purpose**: Refactor current `DeployState` to action-based `DeploySession`
class

---

## 📊 Current Implementation Analysis

### Current Structure

```typescript
// In type.ts
export type DeployState = {
  stackSquare: number
  turn: Color
  originalPiece: Piece
  movedPieces: Piece[] // ❌ Only stores WHAT moved, not WHERE
  stay?: Piece[]
}

// In move-apply.ts
class SetDeployStateAction {
  execute(): void {
    // Updates movedPieces array
    // Auto-completes when all pieces accounted for
    // Complex logic mixed with action execution
  }
}
```

### Problems with Current Approach

1. **Loss of Information**: `movedPieces: Piece[]` only tracks which pieces
   moved, not their moves

   - Cannot reconstruct move history
   - Cannot generate proper SAN notation
   - Cannot support recombine moves effectively

2. **Complex State Calculation**: Completion logic embedded in
   `SetDeployStateAction`

   - Counting pieces to determine completion
   - Comparing original length with moved + staying
   - Mixed concerns: action execution + state management

3. **Limited Undo/Redo**: Cannot replay individual deploy steps

   - Only can undo entire deploy sequences
   - No granular control during deployment

4. **No Extended FEN Support**: Cannot serialize/deserialize mid-deployment
   state
   - Cannot save/load games during deployment
   - No way to communicate deploy state to UI

---

## 🎯 Action-Based Architecture Goals

### New Structure (from documentation)

```typescript
class DeploySession {
  stackSquare: number
  turn: Color
  originalPiece: Piece
  actions: InternalMove[] // ✅ Full move history
  startFEN: string // ✅ Can reconstruct original state

  // Dynamic calculation
  getRemainingPieces(): Piece | null {
    let remaining = this.originalPiece
    for (const move of this.actions) {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        remaining = removePieceFromStack(remaining, move.piece.role)
      }
    }
    return remaining
  }

  canCommit(): boolean {
    const remaining = this.getRemainingPieces()
    return (
      this.actions.length > 0 && (!remaining || !remaining.carrying?.length)
    )
  }

  toExtendedFEN(baseFEN: string): string {
    // Generate extended FEN with DEPLOY marker
  }
}
```

### Benefits

✅ **Complete Information**: Store full `InternalMove[]` history  
✅ **Simple Actions**: `SetDeployStateAction` just updates session reference  
✅ **Better Undo**: Can step through individual deploy moves  
✅ **Extended FEN**: Serialize/deserialize mid-deployment  
✅ **Recombine Support**: Track deployed squares, generate recombine moves  
✅ **Clear Audit Trail**: See exactly what happened during deployment

---

## 🔧 Implementation Changes

### Phase 1: Core DeploySession Class

**File**: `src/deploy-session.ts` (new file)

```typescript
import { Color, Piece, InternalMove, BITS } from './type.js'
import { removePieceFromStack, flattenPiece } from './utils.js'

export class DeploySession {
  stackSquare: number
  turn: Color
  originalPiece: Piece
  actions: InternalMove[] = []
  startFEN: string
  stayPieces?: Piece[] // Pieces explicitly marked to stay

  constructor(data: {
    stackSquare: number
    turn: Color
    originalPiece: Piece
    startFEN: string
    actions?: InternalMove[]
    stayPieces?: Piece[]
  }) {
    this.stackSquare = data.stackSquare
    this.turn = data.turn
    this.originalPiece = data.originalPiece
    this.startFEN = data.startFEN
    this.actions = data.actions || []
    this.stayPieces = data.stayPieces
  }

  /**
   * Calculate remaining pieces from actions
   */
  getRemainingPieces(): Piece | null {
    let remaining = this.originalPiece

    for (const move of this.actions) {
      // Only count moves FROM the stack square
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        const movedPieces = flattenPiece(move.piece)

        for (const piece of movedPieces) {
          remaining = removePieceFromStack(remaining, piece.type)
          if (!remaining) return null
        }
      }
    }

    return remaining
  }

  /**
   * Get all squares where pieces were deployed
   */
  getDeployedSquares(): number[] {
    const squares = new Set<number>()

    for (const move of this.actions) {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        squares.add(move.to)
      }
    }

    return Array.from(squares)
  }

  /**
   * Add a move to the session
   */
  addMove(move: InternalMove): void {
    this.actions.push(move)
  }

  /**
   * Remove last move from session
   */
  undoLastMove(): InternalMove | null {
    return this.actions.pop() || null
  }

  /**
   * Check if session can be committed
   */
  canCommit(): boolean {
    // Must have made at least one move
    if (this.actions.length === 0) return false

    const remaining = this.getRemainingPieces()

    // All pieces moved or staying pieces specified
    return (
      !remaining || !remaining.carrying?.length || !!this.stayPieces?.length
    )
  }

  /**
   * Check if session is complete (all pieces accounted for)
   */
  isComplete(): boolean {
    const remaining = this.getRemainingPieces()
    const originalFlat = flattenPiece(this.originalPiece)
    const movedCount = this.actions.reduce((sum, move) => {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        return sum + flattenPiece(move.piece).length
      }
      return sum
    }, 0)
    const stayCount = this.stayPieces?.length || 0

    return movedCount + stayCount === originalFlat.length
  }

  /**
   * Cancel session - returns moves to undo in reverse order
   */
  cancel(): InternalMove[] {
    return [...this.actions].reverse()
  }

  /**
   * Convert to legacy DeployState format (for compatibility)
   */
  toLegacyDeployState(): DeployState {
    const movedPieces: Piece[] = []

    for (const move of this.actions) {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        movedPieces.push(...flattenPiece(move.piece))
      }
    }

    return {
      stackSquare: this.stackSquare,
      turn: this.turn,
      originalPiece: this.originalPiece,
      movedPieces,
      stay: this.stayPieces,
    }
  }
}
```

### Phase 2: Update Type Definitions

**File**: `src/type.ts`

```typescript
// Keep DeployState for backward compatibility, but deprecate it
/** @deprecated Use DeploySession class instead */
export type DeployState = {
  stackSquare: number
  turn: Color
  originalPiece: Piece
  movedPieces: Piece[]
  stay?: Piece[]
}
```

### Phase 3: Update SetDeployStateAction

**File**: `src/move-apply.ts`

```typescript
import { DeploySession } from './deploy-session.js'

/**
 * Sets the deploy session (simplified version)
 */
class SetDeploySessionAction implements CTLAtomicMoveAction {
  private oldSession: DeploySession | null = null

  constructor(
    protected game: CoTuLenh,
    private newSession: DeploySession | null,
  ) {}

  execute(): void {
    // Capture current session
    this.oldSession = this.game.getDeploySession()

    // Set new session
    this.game.setDeploySession(this.newSession)

    // Auto-complete if all pieces deployed
    if (this.newSession && this.newSession.isComplete()) {
      this.game.setDeploySession(null)
      this.game['_turn'] = swapColor(this.newSession.turn)
    }
  }

  undo(): void {
    // Restore old session
    this.game.setDeploySession(this.oldSession)

    // Restore turn if needed
    if (this.oldSession) {
      this.game['_turn'] = this.oldSession.turn
    }
  }
}

// Update SingleDeployMoveCommand
export class SingleDeployMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const us = this.move.color
    const them = swapColor(us)
    const carrierPiece = this.game.get(this.move.from)

    if (!carrierPiece) {
      throw new Error(`Carrier missing at ${algebraic(this.move.from)}`)
    }

    // ... existing capture/deploy logic ...

    // Update or create deploy session
    const currentSession = this.game.getDeploySession()

    if (currentSession && currentSession.stackSquare === this.move.from) {
      // Add to existing session
      currentSession.addMove(this.move)
      this.actions.push(new SetDeploySessionAction(this.game, currentSession))
    } else {
      // Create new session
      const newSession = new DeploySession({
        stackSquare: this.move.from,
        turn: us,
        originalPiece: carrierPiece,
        startFEN: this.game.fen(),
        actions: [this.move],
      })
      this.actions.push(new SetDeploySessionAction(this.game, newSession))
    }
  }
}
```

### Phase 4: Update CoTuLenh Class

**File**: `src/cotulenh.ts`

```typescript
import { DeploySession } from './deploy-session.js'

export class CoTuLenh {
  // Replace _deployState with _deploySession
  private _deploySession: DeploySession | null = null

  // Update methods
  public getDeploySession(): DeploySession | null {
    return this._deploySession
  }

  public setDeploySession(session: DeploySession | null): void {
    this._deploySession = session
  }

  // Backward compatibility
  public getDeployState(): DeployState | null {
    return this._deploySession?.toLegacyDeployState() || null
  }

  public setDeployState(state: DeployState | null): void {
    if (state) {
      // Convert legacy state to session (lossy conversion)
      this._deploySession = new DeploySession({
        stackSquare: state.stackSquare,
        turn: state.turn,
        originalPiece: state.originalPiece,
        startFEN: this.fen(),
        actions: [], // Cannot reconstruct actions from legacy state
        stayPieces: state.stay,
      })
    } else {
      this._deploySession = null
    }
  }

  // Update history to use DeploySession
  interface History {
    move: CTLMoveCommandInteface
    commanders: Record<Color, number>
    turn: Color
    halfMoves: number
    moveNumber: number
    deploySession: DeploySession | null // Changed from deployState
  }

  // Update move generation
  private _moves(args?: MovesOptions): InternalMove[] {
    if (this._deploySession && this._deploySession.turn === us) {
      // Generate deploy moves with recombine support
      return this.generateDeploySessionMoves(this._deploySession)
    }
    // ... normal moves
  }
}
```

### Phase 5: Extended FEN Support

**File**: `src/deploy-session.ts` (add method)

```typescript
/**
 * Generate extended FEN format
 * Format: "base-fen DEPLOY c3:Nc5,Fd4..."
 */
toExtendedFEN(baseFEN: string): string {
  if (this.actions.length === 0) {
    return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:`
  }

  // Reuse existing SAN generation from deployMoveToSanLan
  const internalDeployMove: InternalDeployMove = {
    from: this.stackSquare,
    moves: this.actions,
    stay: this.stayPieces ? createCombineStackFromPieces(this.stayPieces).combined : undefined,
  }

  const [san, lan] = deployMoveToSanLan(game, internalDeployMove)
  const unfinishedSan = `${san}...` // "..." indicates unfinished

  return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:${unfinishedSan}`
}

/**
 * Parse extended FEN to reconstruct session
 */
static fromExtendedFEN(extendedFEN: string, game: CoTuLenh): DeploySession | null {
  const parts = extendedFEN.split(' ')
  const deployIndex = parts.indexOf('DEPLOY')

  if (deployIndex === -1) return null

  const deployInfo = parts[deployIndex + 1] // "c3:Nc5,Fd4..."
  const [squareStr, sanMoves] = deployInfo.split(':')

  // Parse moves from SAN (needs SAN parser implementation)
  const actions = parseDeploySAN(sanMoves.replace('...', ''), squareStr)

  return new DeploySession({
    stackSquare: SQUARE_MAP[squareStr as Square],
    turn: game._turn,
    originalPiece: game.get(SQUARE_MAP[squareStr as Square]) as Piece,
    startFEN: parts.slice(0, deployIndex).join(' '),
    actions,
  })
}
```

### Phase 6: Recombine Move Generation

**File**: `src/move-generation.ts` (update)

```typescript
function generateDeploySessionMoves(
  game: CoTuLenh,
  session: DeploySession,
): InternalMove[] {
  const remaining = session.getRemainingPieces()

  if (!remaining || !remaining.carrying?.length) {
    return [] // Nothing left to deploy
  }

  const moves: InternalMove[] = []

  // 1. Generate normal deploy moves
  const normalMoves = generateNormalDeployMoves(game, session, remaining)
  moves.push(...normalMoves)

  // 2. Generate recombine moves (rejoin with deployed pieces)
  const recombineMoves = generateRecombineMoves(
    game,
    session,
    remaining,
    normalMoves,
  )
  moves.push(...recombineMoves)

  return moves
}

function generateRecombineMoves(
  game: CoTuLenh,
  session: DeploySession,
  remaining: Piece,
  normalMoves: InternalMove[],
): InternalMove[] {
  const moves: InternalMove[] = []
  const deployedSquares = session.getDeployedSquares()

  for (const piece of remaining.carrying || []) {
    for (const square of deployedSquares) {
      // Skip if normal move already exists to this square
      const hasNormalMove = normalMoves.some(
        (move) => move.piece.type === piece.type && move.to === square,
      )

      if (!hasNormalMove) {
        const targetPiece = game.get(square)

        // Check if can combine
        const combined = createCombinedPiece(piece, targetPiece!)
        if (combined) {
          moves.push({
            from: session.stackSquare,
            to: square,
            piece: piece,
            color: session.turn,
            flags: BITS.DEPLOY | BITS.COMBINATION,
            combined,
          })
        }
      }
    }
  }

  return moves
}
```

---

## 📋 Implementation Checklist

### Phase 1: Core Session (4-6 hours)

- [ ] Create `src/deploy-session.ts` with `DeploySession` class
- [ ] Implement `getRemainingPieces()`
- [ ] Implement `getDeployedSquares()`
- [ ] Implement `canCommit()` and `isComplete()`
- [ ] Add unit tests for session logic

### Phase 2: Action Integration (2-3 hours)

- [ ] Update `SetDeployStateAction` → `SetDeploySessionAction`
- [ ] Update `SingleDeployMoveCommand` to use session
- [ ] Update `DeployMoveCommand` to use session
- [ ] Test action execution and undo

### Phase 3: CoTuLenh Integration (2-3 hours)

- [ ] Replace `_deployState` with `_deploySession`
- [ ] Update `getDeployState()` / `setDeployState()` for compatibility
- [ ] Update history to store `DeploySession`
- [ ] Update move generation integration
- [ ] Test backward compatibility

### Phase 4: Extended FEN (3-4 hours)

- [ ] Implement `toExtendedFEN()` method
- [ ] Implement `fromExtendedFEN()` parser
- [ ] Update `fen()` method to detect active sessions
- [ ] Add SAN parser for deploy moves (see SAN-PARSER-SPEC.md)
- [ ] Test round-trip FEN conversion

### Phase 5: Recombine Moves (2-3 hours)

- [ ] Implement `generateRecombineMoves()` function
- [ ] Update move generation to include recombines
- [ ] Test recombine move validation
- [ ] Test recombine move execution

### Phase 6: Testing & Documentation (2-3 hours)

- [ ] Comprehensive unit tests for `DeploySession`
- [ ] Integration tests for deploy workflow
- [ ] Update API documentation
- [ ] Migration guide for existing code

**Total Estimated Time**: 15-22 hours (2-3 working days)

---

## 🎯 Success Criteria

- [ ] All existing tests pass
- [ ] `DeploySession` properly tracks move history
- [ ] Extended FEN round-trip works
- [ ] Recombine moves generate and execute correctly
- [ ] Undo/redo works for individual deploy steps
- [ ] Backward compatibility maintained via `getDeployState()`
- [ ] Performance acceptable (no significant slowdown)

---

## ⚠️ Migration Notes

### Backward Compatibility

The `getDeployState()` / `setDeployState()` methods remain for compatibility
but:

- **Lossy conversion**: Converting `DeployState` → `DeploySession` loses action
  history
- **Deprecated**: New code should use `getDeploySession()` /
  `setDeploySession()`

### Breaking Changes (None)

This refactoring is **fully backward compatible** because:

- Old `DeployState` type still exists
- Conversion methods provided
- Existing tests should pass without modification

### Performance Considerations

- `getRemainingPieces()` is O(n) where n = number of deploy actions (typically
  2-4)
- Can add caching if needed: `private _cachedRemaining?: Piece | null`
- Extended FEN generation is only called when needed

---

## 📚 References

- `docs/deploy-action-based-architecture/00-OVERVIEW.md` - Architecture overview
- `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md` -
  Full spec
- `docs/deploy-action-based-architecture/FINAL-STATUS.md` - Implementation
  status
- `docs/deploy-action-based-architecture/SAN-PARSER-SPEC.md` - Parser details

---

**Status**: ✅ Ready for Implementation  
**Next Step**: Begin Phase 1 - Create DeploySession class
