# Move Application Architecture with Immutable State

## The Challenge

CoTuLenh has **7+ move types** with complex state interactions:

1. **Normal move** - Move piece from A to B
2. **Capture move** - Move piece, remove enemy piece
3. **Stay-capture** - Capture without moving (Artillery/Navy)
4. **Suicide capture** - Air Force destroyed by air defense
5. **Combine move** - Multiple pieces move together
6. **Deploy move** - Split stack, move pieces individually
7. **Deploy with captures** - Deploy + any of the above
8. **Heroic promotion** - State change on attack

**Question:** How do you apply all these cleanly with immutable state AND have
rollback?

---

## Solution: Event Sourcing + Immutable State Transitions

### Core Concept

Instead of mutating state, model moves as **immutable events** that produce new
states.

```typescript
// Don't think of moves as mutations:
// ❌ state.applyMove(move)  // Mutates state

// Think of moves as state transitions:
// ✅ newState = move.apply(oldState)  // Pure function
```

---

## Part 1: Type-Safe Move Variants

### Define All Move Types as Discriminated Union

```typescript
// Base move data
interface BaseMoveData {
  from: Square
  to: Square
  piece: Piece
  color: Color
}

// All move types as discriminated union
type Move =
  | { type: 'normal'; data: BaseMoveData }
  | { type: 'capture'; data: BaseMoveData; captured: Piece }
  | { type: 'stay-capture'; data: BaseMoveData; captured: Piece }
  | { type: 'suicide-capture'; data: BaseMoveData; captured: Piece }
  | { type: 'combine'; pieces: Array<{ from: Square; piece: Piece }>; to: Square }
  | { type: 'deploy-step'; from: Square; to: Square; piece: Piece; stackRemaining: Piece[] }
  | { type: 'deploy-complete'; stackSquare: Square }

// Or in Rust:
enum Move {
    Normal { from: Square, to: Square, piece: Piece },
    Capture { from: Square, to: Square, piece: Piece, captured: Piece },
    StayCapture { attacker: Square, target: Square, captured: Piece },
    SuicideCapture { from: Square, to: Square, piece: Piece, captured: Piece },
    Combine { pieces: Vec<(Square, Piece)>, to: Square },
    DeployStep { from: Square, to: Square, piece: Piece, remaining: Vec<Piece> },
    DeployComplete { stack_square: Square },
}
```

**Benefits:**

- Type-safe: Compiler ensures all cases handled
- Clear: Each move type is explicit
- Extensible: Easy to add new move types
- Self-documenting: Move type tells you what happens

---

## Part 2: Immutable State Transitions

### Each Move Type Has Its Own Application Logic

```typescript
class GameState {
  private readonly board: Board
  private readonly turn: Color
  private readonly deployState: DeployState | null
  private readonly commanders: readonly [Square, Square]
  private readonly heroicPieces: ReadonlySet<Square>

  // Main entry point: apply any move type
  applyMove(move: Move): GameState {
    switch (move.type) {
      case 'normal':
        return this.applyNormalMove(move)
      case 'capture':
        return this.applyCaptureMove(move)
      case 'stay-capture':
        return this.applyStayCaptureMove(move)
      case 'suicide-capture':
        return this.applySuicideCaptureMove(move)
      case 'combine':
        return this.applyCombineMove(move)
      case 'deploy-step':
        return this.applyDeployStepMove(move)
      case 'deploy-complete':
        return this.applyDeployCompleteMove(move)
    }
  }

  // Each move type: pure function, returns NEW state
  private applyNormalMove(move: Extract<Move, { type: 'normal' }>): GameState {
    const newBoard = this.board
      .removePiece(move.data.from)
      .placePiece(move.data.to, move.data.piece)

    return new GameState(
      newBoard,
      this.turn.opposite(),
      null, // Clear deploy state
      this.updateCommanders(move),
      this.heroicPieces,
    )
  }

  private applyCaptureMove(
    move: Extract<Move, { type: 'capture' }>,
  ): GameState {
    const newBoard = this.board
      .removePiece(move.data.from) // Remove attacker from origin
      .removePiece(move.data.to) // Remove captured piece
      .placePiece(move.data.to, move.data.piece) // Place attacker at destination

    const newHeroic = this.checkHeroicPromotion(move)

    return new GameState(
      newBoard,
      this.turn.opposite(),
      null,
      this.updateCommanders(move),
      newHeroic,
    )
  }

  private applyStayCaptureMove(
    move: Extract<Move, { type: 'stay-capture' }>,
  ): GameState {
    // Attacker doesn't move!
    const newBoard = this.board.removePiece(move.data.to) // Only remove captured piece

    const newHeroic = this.checkHeroicPromotion(move)

    return new GameState(
      newBoard,
      this.turn.opposite(),
      null,
      this.commanders, // Commanders unchanged
      newHeroic,
    )
  }

  private applySuicideCaptureMove(
    move: Extract<Move, { type: 'suicide-capture' }>,
  ): GameState {
    // Both pieces die (air force + captured piece)
    const newBoard = this.board
      .removePiece(move.data.from) // Air force dies
      .removePiece(move.data.to) // Captured piece dies

    // Air force never reaches destination, so no heroic promotion

    return new GameState(
      newBoard,
      this.turn.opposite(),
      null,
      this.updateCommanders(move),
      this.heroicPieces,
    )
  }

  private applyCombineMove(
    move: Extract<Move, { type: 'combine' }>,
  ): GameState {
    let newBoard = this.board

    // Remove all pieces from their origin squares
    for (const { from } of move.pieces) {
      newBoard = newBoard.removePiece(from)
    }

    // Create combined stack at destination
    const [carrier, ...carried] = move.pieces.map((p) => p.piece)
    const stack = carrier.withCarrying(carried)

    newBoard = newBoard.placePiece(move.to, stack)

    return new GameState(
      newBoard,
      this.turn.opposite(),
      null,
      this.updateCommandersForCombine(move),
      this.heroicPieces,
    )
  }

  private applyDeployStepMove(
    move: Extract<Move, { type: 'deploy-step' }>,
  ): GameState {
    const newBoard = this.board
      .updateStack(move.from, move.stackRemaining) // Update stack
      .placePiece(move.to, move.piece) // Place deployed piece

    // Check if deploy is complete
    const newDeployState =
      move.stackRemaining.length === 0
        ? null // Deploy complete
        : this.deployState!.recordMove(move) // Continue deploy

    const shouldSwitchTurn = newDeployState === null

    return new GameState(
      newBoard,
      shouldSwitchTurn ? this.turn.opposite() : this.turn,
      newDeployState,
      this.updateCommanders(move),
      this.heroicPieces,
    )
  }

  private applyDeployCompleteMove(
    move: Extract<Move, { type: 'deploy-complete' }>,
  ): GameState {
    // Just clear deploy state and switch turn
    return new GameState(
      this.board,
      this.turn.opposite(),
      null, // Deploy complete
      this.commanders,
      this.heroicPieces,
    )
  }
}
```

---

## Part 3: Immutable Board Operations

### Board is Also Immutable with Copy-on-Write

```typescript
class Board {
  private readonly squares: ReadonlyArray<Piece | null>
  private readonly pieceLists: ReadonlyMap<
    Color,
    ReadonlyArray<{ square: Square; type: PieceType }>
  >

  // All operations return NEW board
  removePiece(square: Square): Board {
    const newSquares = [...this.squares]
    const removed = newSquares[square]
    newSquares[square] = null

    const newPieceLists = new Map(this.pieceLists)
    if (removed) {
      const list = this.pieceLists.get(removed.color)!
      newPieceLists.set(
        removed.color,
        list.filter((p) => p.square !== square),
      )
    }

    return new Board(newSquares, newPieceLists)
  }

  placePiece(square: Square, piece: Piece): Board {
    const newSquares = [...this.squares]
    newSquares[square] = piece

    const newPieceLists = new Map(this.pieceLists)
    const list = this.pieceLists.get(piece.color) || []
    newPieceLists.set(piece.color, [...list, { square, type: piece.type }])

    return new Board(newSquares, newPieceLists)
  }

  updateStack(square: Square, remaining: Piece[]): Board {
    const newSquares = [...this.squares]

    if (remaining.length === 0) {
      newSquares[square] = null // Stack depleted
    } else {
      const [carrier, ...carried] = remaining
      newSquares[square] = carrier.withCarrying(carried)
    }

    return new Board(newSquares, this.pieceLists)
  }

  // Chain operations fluently
  applyComplexMove(
    from: Square,
    to: Square,
    piece: Piece,
    captured?: Square,
  ): Board {
    return this.removePiece(from)
      .removePiece(captured || to)
      .placePiece(to, piece)
  }
}
```

**Key insight:** Every operation returns a NEW board. Original is never
modified.

---

## Part 4: Deploy State Management

### Deploy State is Immutable Too

```typescript
interface DeployState {
  readonly stackSquare: Square
  readonly originalStack: ReadonlyArray<Piece>
  readonly remaining: ReadonlyArray<Piece>
  readonly movesMade: ReadonlyArray<DeployMove>
}

class GameState {
  // Start deploy: create deploy state
  startDeploy(square: Square): GameState {
    const stack = this.board.get(square)
    if (!stack || !stack.isStack()) {
      throw new Error('Not a stack')
    }

    const deployState: DeployState = {
      stackSquare: square,
      originalStack: [stack.carrier, ...stack.carrying],
      remaining: [stack.carrier, ...stack.carrying],
      movesMade: [],
    }

    return new GameState(
      this.board,
      this.turn,
      deployState, // Start deploy
      this.commanders,
      this.heroicPieces,
    )
  }

  // Deploy step: update deploy state
  deployStep(move: DeployStepMove): GameState {
    if (!this.deployState) {
      throw new Error('Not in deploy')
    }

    const newRemaining = this.deployState.remaining.filter(
      (p) => p !== move.piece,
    )
    const newMovesMade = [...this.deployState.movesMade, move]

    const newDeployState: DeployState = {
      ...this.deployState,
      remaining: newRemaining,
      movesMade: newMovesMade,
    }

    const newBoard = this.board
      .removePieceFromStack(this.deployState.stackSquare, move.piece)
      .placePiece(move.to, move.piece)

    const isComplete = newRemaining.length === 0

    return new GameState(
      newBoard,
      isComplete ? this.turn.opposite() : this.turn,
      isComplete ? null : newDeployState,
      this.updateCommanders(move),
      this.heroicPieces,
    )
  }
}
```

---

## Part 5: Automatic Rollback via History

### History is Just Array of Immutable States

```typescript
class Game {
  private states: GameState[] = []
  private currentIndex: number = 0

  constructor() {
    this.states.push(GameState.initial())
  }

  // Current state is just array lookup
  get currentState(): GameState {
    return this.states[this.currentIndex]
  }

  // Apply move: create new state, add to history
  applyMove(move: Move): void {
    const newState = this.currentState.applyMove(move)

    // Truncate future if we're in the past
    this.states = this.states.slice(0, this.currentIndex + 1)

    // Add new state
    this.states.push(newState)
    this.currentIndex++
  }

  // Undo: just move pointer back
  undo(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--
    }
  }

  // Redo: just move pointer forward
  redo(): void {
    if (this.currentIndex < this.states.length - 1) {
      this.currentIndex++
    }
  }

  // Get any historical state
  getStateAt(index: number): GameState {
    return this.states[index]
  }
}
```

**Benefits:**

- ✅ Undo/redo is trivial (just index manipulation)
- ✅ Time travel debugging (inspect any past state)
- ✅ Branching histories (what-if analysis)
- ✅ No complex undo logic per move type

---

## Part 6: Deploy State with All Move Types

### Deploy Can Include Any Move Type

```typescript
type DeployStepMove =
  | { type: 'deploy-normal'; from: Square; to: Square; piece: Piece }
  | {
      type: 'deploy-capture'
      from: Square
      to: Square
      piece: Piece
      captured: Piece
    }
  | {
      type: 'deploy-stay-capture'
      attacker: Square
      target: Square
      piece: Piece
      captured: Piece
    }
  | { type: 'deploy-stay'; from: Square; piece: Piece } // Piece stays on stack

class GameState {
  applyDeployMove(move: DeployStepMove): GameState {
    switch (move.type) {
      case 'deploy-normal':
        return this.applyDeployNormal(move)
      case 'deploy-capture':
        return this.applyDeployCapture(move)
      case 'deploy-stay-capture':
        return this.applyDeployStayCapture(move)
      case 'deploy-stay':
        return this.applyDeployStay(move)
    }
  }

  private applyDeployNormal(
    move: Extract<DeployStepMove, { type: 'deploy-normal' }>,
  ): GameState {
    const newBoard = this.board
      .removeFromStack(move.from, move.piece)
      .placePiece(move.to, move.piece)

    const newDeployState = this.deployState!.removeFromRemaining(move.piece)
    const isComplete = newDeployState.remaining.length === 0

    return new GameState(
      newBoard,
      isComplete ? this.turn.opposite() : this.turn,
      isComplete ? null : newDeployState,
      this.commanders,
      this.heroicPieces,
    )
  }

  private applyDeployCapture(
    move: Extract<DeployStepMove, { type: 'deploy-capture' }>,
  ): GameState {
    const newBoard = this.board
      .removeFromStack(move.from, move.piece)
      .removePiece(move.to) // Captured piece
      .placePiece(move.to, move.piece)

    const newDeployState = this.deployState!.removeFromRemaining(move.piece)
    const newHeroic = this.checkHeroicPromotion(move)
    const isComplete = newDeployState.remaining.length === 0

    return new GameState(
      newBoard,
      isComplete ? this.turn.opposite() : this.turn,
      isComplete ? null : newDeployState,
      this.updateCommanders(move),
      newHeroic,
    )
  }

  private applyDeployStayCapture(
    move: Extract<DeployStepMove, { type: 'deploy-stay-capture' }>,
  ): GameState {
    // Piece on stack captures without moving
    const newBoard = this.board.removePiece(move.target) // Only remove captured piece

    const newDeployState = this.deployState!.markPieceStaying(move.piece)
    const newHeroic = this.checkHeroicPromotion(move)
    const isComplete = newDeployState.remaining.length === 0

    return new GameState(
      newBoard,
      isComplete ? this.turn.opposite() : this.turn,
      isComplete ? null : newDeployState,
      this.commanders,
      newHeroic,
    )
  }

  private applyDeployStay(
    move: Extract<DeployStepMove, { type: 'deploy-stay' }>,
  ): GameState {
    // Piece stays on stack (notation: "I<" = infantry stays)
    const newDeployState = this.deployState!.markPieceStaying(move.piece)
    const isComplete = newDeployState.remaining.length === 0

    return new GameState(
      this.board, // Board unchanged
      isComplete ? this.turn.opposite() : this.turn,
      isComplete ? null : newDeployState,
      this.commanders,
      this.heroicPieces,
    )
  }
}
```

---

## Part 7: Heroic Promotion Tracking

### Heroic Status is Immutable Too

```typescript
class GameState {
  private readonly heroicPieces: ReadonlySet<Square>

  private checkHeroicPromotion(move: Move): ReadonlySet<Square> {
    // Check if attacker attacked enemy commander
    const enemyCommander = this.commanders[this.turn === 'r' ? 1 : 0]

    const wasCommanderAttacked =
      (move.type === 'capture' && move.data.to === enemyCommander) ||
      (move.type === 'stay-capture' && move.data.to === enemyCommander)

    if (!wasCommanderAttacked) {
      return this.heroicPieces
    }

    // Promote piece to heroic
    const attackerSquare =
      move.type === 'stay-capture'
        ? move.data.from // Attacker didn't move
        : move.data.to // Attacker moved to target

    return new Set([...this.heroicPieces, attackerSquare])
  }

  // When retrieving piece, include heroic status
  getPiece(square: Square): Piece | null {
    const piece = this.board.get(square)
    if (!piece) return null

    // Add heroic status if square is in heroic set
    return this.heroicPieces.has(square) ? piece.withHeroic(true) : piece
  }
}
```

---

## Part 8: Complete Example - All Move Types

### Real-World Scenario

```typescript
// Scenario: Deploy with multiple move types
const game = new Game()

// 1. Start deploy
game.applyMove({
  type: 'deploy-start',
  square: 'e5', // Stack: Navy (carrier) + [Tank, Infantry]
})

// 2. Navy captures (normal capture during deploy)
game.applyMove({
  type: 'deploy-capture',
  from: 'e5',
  to: 'e7',
  piece: navy,
  captured: enemyArtillery,
})

// 3. Tank does stay-capture (doesn't leave stack)
game.applyMove({
  type: 'deploy-stay-capture',
  attacker: 'e5',
  target: 'd6',
  piece: tank,
  captured: enemyMilitia,
})

// 4. Infantry moves normally
game.applyMove({
  type: 'deploy-normal',
  from: 'e5',
  to: 'e4',
  piece: infantry,
})

// Deploy complete, turn switches
console.log(game.currentState.turn) // 'b' (blue's turn)

// Undo entire sequence
game.undo() // Back before infantry move
game.undo() // Back before tank stay-capture
game.undo() // Back before navy capture
game.undo() // Back before deploy start

// Original state restored perfectly!
```

---

## Part 9: Memory Optimization - Structural Sharing

### Share Unchanged Parts Between States

```typescript
class Board {
  private readonly squares: ReadonlyArray<Piece | null>

  // When cloning, use structural sharing
  removePiece(square: Square): Board {
    // Only clone if piece exists
    if (this.squares[square] === null) {
      return this  // No change, return same board!
    }

    // Clone-on-write
    const newSquares = [...this.squares]
    newSquares[square] = null

    return new Board(newSquares, /* ... */)
  }
}

// In Rust, use persistent data structures
use im::Vector;  // Immutable vector with structural sharing

pub struct Board {
    squares: Vector<Option<Piece>>,  // O(log n) clone instead of O(n)
}
```

**Benefits:**

- States share unchanged data
- Memory usage: ~1.5-2× instead of history_length × state_size
- Clone performance: O(log n) instead of O(n)

---

## Part 10: Complete Architecture Summary

### Type Hierarchy

```typescript
// Root type
type Move = NormalMove | CaptureMove | StayCaptureMove | /* ... */

// Each move type has application logic
interface MoveApplication {
  apply(state: GameState): GameState
}

// State is completely immutable
class GameState {
  readonly board: Board
  readonly turn: Color
  readonly deployState: DeployState | null
  readonly commanders: readonly [Square, Square]
  readonly heroicPieces: ReadonlySet<Square>

  applyMove(move: Move): GameState {
    // Pattern match on move type
    // Call appropriate handler
    // Return NEW state
  }
}

// History is array of states
class Game {
  private states: GameState[]
  private currentIndex: number

  applyMove(move: Move): void {
    const newState = this.currentState.applyMove(move)
    this.states.push(newState)
    this.currentIndex++
  }

  undo(): void { this.currentIndex-- }
  redo(): void { this.currentIndex++ }
}
```

---

## Performance Analysis

### Memory Usage

| Aspect             | Cost          | Mitigation         |
| ------------------ | ------------- | ------------------ |
| **State per move** | ~2KB          | Structural sharing |
| **100 moves**      | ~200KB        | Acceptable         |
| **1000 moves**     | ~2MB          | Still fine         |
| **History limit**  | Keep last 100 | Trim old states    |

### Speed

| Operation       | Time       | Note                |
| --------------- | ---------- | ------------------- |
| **Apply move**  | ~100-200μs | Board clone + logic |
| **Undo**        | ~10μs      | Index change only   |
| **Redo**        | ~10μs      | Index change only   |
| **Get history** | ~1μs       | Array lookup        |

**Verdict:** Excellent performance for UI applications!

---

## Benefits Summary

### ✅ Type Safety

- All move types explicit
- Compiler ensures exhaustive handling
- No runtime type errors

### ✅ Immutability

- No mutation bugs
- Thread-safe
- Reproducible behavior

### ✅ Simple Rollback

- Undo/redo is trivial
- Time travel debugging
- Branching histories

### ✅ Clean Separation

- Each move type isolated
- Easy to test
- Easy to extend

### ✅ Deploy State Natural

- Deploy is just state variant
- All move types work in deploy
- Clean completion handling

### ✅ Heroic Promotion Tracked

- Immutable set of heroic squares
- Automatically updated
- No state corruption

---

## Comparison: Mutable vs Immutable

| Aspect              | Mutable (Current)     | Immutable (Proposed)     |
| ------------------- | --------------------- | ------------------------ |
| **Complexity**      | High (side effects)   | Low (pure functions)     |
| **Undo/Redo**       | Complex (reverse ops) | Trivial (history array)  |
| **Debugging**       | Hard (state changes)  | Easy (inspect any state) |
| **Testing**         | Stateful setup        | Pure function tests      |
| **Parallelization** | Unsafe                | Trivial                  |
| **Performance**     | 🏆 Fastest            | ✅ Fast enough           |
| **Memory**          | ✅ Minimal            | ⚠️ ~2× (acceptable)      |

---

## Recommended Implementation Path

### Phase 1: Immutable State (Week 1)

1. Create immutable `GameState` class
2. Implement state transitions for normal moves
3. Add history management

### Phase 2: Move Types (Week 2)

1. Define discriminated union for all move types
2. Implement application logic for each type
3. Add type-safe pattern matching

### Phase 3: Deploy Integration (Week 3)

1. Add immutable `DeployState`
2. Implement deploy step transitions
3. Handle all deploy move variants

### Phase 4: Optimization (Week 4)

1. Add structural sharing
2. Implement object pooling
3. Profile and optimize hot paths

---

## Conclusion

**With immutable state, move application becomes:**

- ✅ Type-safe discriminated unions
- ✅ Pure state transitions
- ✅ Trivial undo/redo
- ✅ Clean deploy state management
- ✅ Automatic heroic tracking
- ✅ All 7+ move types handled uniformly

**Rollback is FREE:** Just keep array of states, move index back!

**Performance:** ~100-200μs per move application (excellent!)

**The key insight:** Model moves as **events that produce new states**, not
mutations.
