# Virtual Deploy State Architecture

## The Problem

Current deploy implementation:

```typescript
// Separate handling for deploy moves
if (isDeploy) {
  // Different logic...
} else {
  // Normal logic...
}
```

**Issues:**

- Code duplication
- Hard to maintain
- Complex history tracking
- State changes during deploy make undo complex

---

## The Solution: Virtual State Overlay

### Core Concept

**Deploy session stores VIRTUAL changes without mutating real state:**

```typescript
class DeploySession {
  originalSquare: Square
  originalStack: Piece[]

  // Virtual board changes (not committed)
  virtualChanges: Map<Square, Piece | null>

  // Track what happened
  movedPieces: Array<{
    piece: Piece
    from: Square
    to: Square
    captured?: Piece
  }>

  stayingPieces: Piece[]

  // Get effective piece at square (virtual + real)
  getEffectivePiece(board: Board, square: Square): Piece | null {
    if (this.virtualChanges.has(square)) {
      return this.virtualChanges.get(square)!
    }
    return board.get(square)
  }

  // Check if piece has moved
  hasMoved(piece: Piece): boolean {
    return this.movedPieces.some((m) => m.piece === piece)
  }

  // Get remaining pieces
  getRemainingPieces(): Piece[] {
    return this.originalStack.filter(
      (p) => !this.hasMoved(p) && !this.stayingPieces.includes(p),
    )
  }
}
```

---

## Part 1: Unified Move Application

### All Moves Work in Both Modes

```typescript
interface MoveContext {
  isDeployMode: boolean
  deploySession?: DeploySession
}

class GameState {
  makeMove(move: Move): UndoInfo {
    const context: MoveContext = {
      isDeployMode: this.deploySession !== null,
      deploySession: this.deploySession,
    }

    // Single unified path!
    return this.applyMove(move, context)
  }

  private applyMove(move: Move, context: MoveContext): UndoInfo {
    switch (move.type) {
      case 'normal':
        return this.applyNormalMove(move, context)

      case 'capture':
        return this.applyCaptureMove(move, context)

      case 'combine':
        return this.applyCombineMove(move, context)

      // All use same functions!
    }
  }
}
```

### Normal Move (Works in Both Modes)

```typescript
private applyNormalMove(move: NormalMove, context: MoveContext): UndoInfo {
  const undo = this.createUndoInfo(move)
  const piece = this.board.get(move.from)

  if (context.isDeployMode) {
    // DEPLOY MODE: Track in virtual state
    const session = context.deploySession!

    // Record virtual changes
    session.virtualChanges.set(move.from, this.getStackAfterRemoval(move.from, piece))
    session.virtualChanges.set(move.to, piece)

    // Track move
    session.movedPieces.push({
      piece,
      from: move.from,
      to: move.to
    })

    // Check if deploy complete
    if (session.getRemainingPieces().length === 0) {
      this.commitDeploySession(session)
      undo.turnSwitched = true
    }

  } else {
    // NORMAL MODE: Actually mutate state
    this.board.set(move.from, null)
    this.board.set(move.to, piece)

    if (piece.type === COMMANDER) {
      this.commanders[piece.color === 'r' ? 0 : 1] = move.to
    }

    this.turn = this.turn === 'r' ? 'b' : 'r'
    undo.turnSwitched = true
  }

  return undo
}
```

### Combine Move (Works in Both Modes)

```typescript
private applyCombineMove(move: CombineMove, context: MoveContext): UndoInfo {
  const undo = this.createUndoInfo(move)
  const movingPiece = this.board.get(move.from)
  const targetPiece = this.board.get(move.to)
  const newStack = this.combineStacks(movingPiece, targetPiece)

  if (context.isDeployMode) {
    // DEPLOY MODE: Virtual changes
    const session = context.deploySession!

    session.virtualChanges.set(
      move.from,
      this.getStackAfterRemoval(move.from, movingPiece)
    )
    session.virtualChanges.set(move.to, newStack)

    session.movedPieces.push({
      piece: movingPiece,
      from: move.from,
      to: move.to
    })

    if (session.getRemainingPieces().length === 0) {
      this.commitDeploySession(session)
      undo.turnSwitched = true
    }

  } else {
    // NORMAL MODE: Actual changes
    this.board.set(move.from, null)
    this.board.set(move.to, newStack)

    this.turn = this.turn === 'r' ? 'b' : 'r'
    undo.turnSwitched = true
  }

  return undo
}
```

### Capture Move (Works in Both Modes)

```typescript
private applyCaptureMove(move: CaptureMove, context: MoveContext): UndoInfo {
  const undo = this.createUndoInfo(move)
  const piece = this.board.get(move.from)
  const captured = this.board.get(move.to)

  if (context.isDeployMode) {
    // DEPLOY MODE: Virtual
    const session = context.deploySession!

    session.virtualChanges.set(
      move.from,
      this.getStackAfterRemoval(move.from, piece)
    )
    session.virtualChanges.set(move.to, piece)

    session.movedPieces.push({
      piece,
      from: move.from,
      to: move.to,
      captured
    })

    // Check promotion (using virtual board!)
    if (this.shouldPromote(move.to, piece, session)) {
      piece.heroic = true
    }

    if (session.getRemainingPieces().length === 0) {
      this.commitDeploySession(session)
      undo.turnSwitched = true
    }

  } else {
    // NORMAL MODE: Actual
    undo.capturedPiece = captured

    this.board.set(move.from, null)
    this.board.set(move.to, piece)

    if (this.shouldPromote(move.to, piece)) {
      piece.heroic = true
    }

    this.turn = this.turn === 'r' ? 'b' : 'r'
    undo.turnSwitched = true
  }

  return undo
}
```

---

## Part 2: Virtual Board for Validation

### Create Effective Board View

```typescript
class GameState {
  // Get board with virtual changes applied
  private getEffectiveBoard(): Board {
    if (!this.deploySession) {
      return this.board // No virtual changes
    }

    // Create virtual board view
    return new VirtualBoard(this.board, this.deploySession)
  }
}

class VirtualBoard {
  constructor(
    private realBoard: Board,
    private deploySession: DeploySession,
  ) {}

  get(square: Square): Piece | null {
    // Check virtual changes first
    if (this.deploySession.virtualChanges.has(square)) {
      return this.deploySession.virtualChanges.get(square)!
    }

    // Fall back to real board
    return this.realBoard.get(square)
  }

  // Iterate over effective pieces
  *pieces(color?: Color): Generator<[Square, Piece]> {
    const seen = new Set<Square>()

    // Virtual pieces first
    for (const [square, piece] of this.deploySession.virtualChanges) {
      if (piece && (!color || piece.color === color)) {
        yield [square, piece]
        seen.add(square)
      }
    }

    // Real pieces (not overridden)
    for (const [square, piece] of this.realBoard.pieces(color)) {
      if (!seen.has(square)) {
        yield [square, piece]
      }
    }
  }
}
```

---

## Part 3: Deploy-Aware Validation

### Commander Exposure Check

```typescript
isCommanderExposed(color: Color): boolean {
  const board = this.getEffectiveBoard()  // Virtual + real

  const [redCmd, blueCmd] = this.commanders

  if (file(redCmd) !== file(blueCmd)) {
    return false
  }

  const between = getSquaresBetween(redCmd, blueCmd)

  for (const sq of between) {
    if (board.get(sq) !== null) {  // Uses virtual board!
      return false
    }
  }

  return true
}
```

### Commander Attack Check

```typescript
isCommanderAttacked(color: Color): boolean {
  const board = this.getEffectiveBoard()  // Virtual + real
  const commanderSquare = this.commanders[color === 'r' ? 0 : 1]
  const enemyColor = color === 'r' ? 'b' : 'r'

  // Check all enemy pieces (using virtual board)
  for (const [square, piece] of board.pieces(enemyColor)) {
    if (this.canAttack(board, square, piece, commanderSquare)) {
      return true
    }
  }

  return false
}

private canAttack(
  board: Board | VirtualBoard,
  from: Square,
  piece: Piece,
  target: Square
): boolean {
  // Generate attacks using virtual board
  const generator = PIECE_GENERATORS[piece.type]
  const attacks = generator.generateAttacks(board, from, piece)
  return attacks.some(sq => sq === target)
}
```

### Legal Move Filtering

```typescript
filterLegalMoves(moves: Move[]): Move[] {
  const legal: Move[] = []

  for (const move of moves) {
    // Try move in virtual state
    const undoInfo = this.makeMove(move)

    // Check legality using effective board
    const isLegal =
      !this.isCommanderAttacked(this.turn) &&
      !this.isCommanderExposed(this.turn)

    // Undo
    this.unmakeMove(undoInfo)

    if (isLegal) {
      legal.push(move)
    }
  }

  return legal
}
```

---

## Part 4: Commit Deploy Session

### Atomic Commit When Deploy Completes

```typescript
private commitDeploySession(session: DeploySession): void {
  // Now actually mutate state based on virtual changes
  for (const [square, piece] of session.virtualChanges) {
    this.board.set(square, piece)
  }

  // Update commanders if any moved
  for (const move of session.movedPieces) {
    if (move.piece.type === COMMANDER) {
      const idx = move.piece.color === 'r' ? 0 : 1
      this.commanders[idx] = move.to
    }
  }

  // Clear session
  this.deploySession = null

  // Switch turn
  this.turn = this.turn === 'r' ? 'b' : 'r'
}
```

---

## Part 5: History Management

### Single Entry for Entire Deploy

```typescript
class GameState {
  private history: HistoryEntry[] = []

  makeMove(move: Move): UndoInfo {
    const undo = this.applyMove(move, this.getContext())

    if (this.deploySession) {
      // Deploy active: Don't add to main history yet
      this.deploySession.undoStack.push(undo)
    } else if (undo.deployCompleted) {
      // Deploy just completed: Add entire session as one entry
      const sessionUndo = this.createDeploySessionUndo(undo.completedSession)
      this.history.push(sessionUndo)
    } else {
      // Normal move
      this.history.push(undo)
    }

    return undo
  }

  private createDeploySessionUndo(session: DeploySession): UndoInfo {
    return {
      type: 'deploy-complete',
      originalSquare: session.originalSquare,
      originalStack: session.originalStack,
      allMoves: session.movedPieces,
      virtualChanges: session.virtualChanges,

      // Undo restores original stack
      undo: () => {
        // Reverse all virtual changes
        for (const [square, piece] of session.virtualChanges) {
          if (square === session.originalSquare) {
            this.board.set(square, buildStack(session.originalStack))
          } else {
            this.board.set(square, null) // Or restore previous piece
          }
        }

        this.turn = this.turn === 'r' ? 'b' : 'r'
      },
    }
  }
}
```

---

## Part 6: FEN Generation

### Serialize Deploy Session

```typescript
generateFEN(): string {
  const baseFEN = this.generateBaseFEN()

  if (!this.deploySession) {
    return baseFEN
  }

  // Serialize virtual state
  const deployFEN = this.serializeDeploySession(this.deploySession)

  return `${baseFEN} DEPLOY ${deployFEN}`
}

private serializeDeploySession(session: DeploySession): string {
  const parts = []

  // Original square and remaining pieces
  const remaining = session.getRemainingPieces()
  parts.push(`${session.originalSquare}:${serializePieces(remaining)}`)

  // Number of moves made
  parts.push(session.movedPieces.length.toString())

  // Virtual changes (optional, for full state)
  const changes = Array.from(session.virtualChanges.entries())
    .map(([sq, piece]) => `${sq}=${serializePiece(piece)}`)
    .join(',')

  if (changes) {
    parts.push(changes)
  }

  return parts.join(' ')
}

// Example FEN:
// "...base_fen... r - - 0 1 DEPLOY e5:FT 2 e7=N,d7=F"
//                             ^^^^^^^^^^^^^^^^^^^^^^
//                             original:remaining moves virtual_changes
```

---

## Part 7: Helper Functions

### Get Stack After Removal

```typescript
private getStackAfterRemoval(square: Square, removedPiece: Piece): Piece | null {
  const current = this.deploySession
    ? this.deploySession.getEffectivePiece(this.board, square)
    : this.board.get(square)

  if (!current) return null

  const pieces = flattenPiece(current)
  const remaining = pieces.filter(p => p !== removedPiece)

  if (remaining.length === 0) return null
  if (remaining.length === 1) return remaining[0]

  const [carrier, ...carried] = remaining
  return carrier.withCarrying(carried)
}
```

### Should Promote (Deploy-Aware)

```typescript
private shouldPromote(
  square: Square,
  piece: Piece,
  session?: DeploySession
): boolean {
  const board = session
    ? new VirtualBoard(this.board, session)
    : this.board

  const enemyCommander = this.commanders[piece.color === 'r' ? 1 : 0]

  // Check if attacks commander
  return this.canAttack(board, square, piece, enemyCommander)
}
```

---

## Complete Example

### Deploy Session with Virtual State

```typescript
// Initial: e5: Navy + [Air Force, Tank]

// Step 1: Start deploy
game.startDeploy('e5')

console.log(game.deploySession)
// {
//   originalSquare: 'e5',
//   originalStack: [Navy, AirForce, Tank],
//   virtualChanges: Map {},
//   movedPieces: [],
//   stayingPieces: []
// }

console.log(game.board.get('e5')) // Navy + [AirForce, Tank]  ← Unchanged!

//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Step 2: Navy moves to e7
game.move({ from: 'e5', to: 'e7' })

console.log(game.deploySession.virtualChanges)
// Map {
//   'e5' => AirForce + [Tank],  ← Virtual!
//   'e7' => Navy                ← Virtual!
// }

console.log(game.board.get('e5')) // Navy + [AirForce, Tank]  ← Still unchanged!
console.log(game.board.get('e7')) // null                      ← Still unchanged!

// But validation sees virtual state:
const effectiveBoard = game.getEffectiveBoard()
console.log(effectiveBoard.get('e5')) // AirForce + [Tank]  ← Virtual view!
console.log(effectiveBoard.get('e7')) // Navy               ← Virtual view!

//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Step 3: Tank combines with Navy
game.move({ type: 'combine', from: 'e5', to: 'e7' })

console.log(game.deploySession.virtualChanges)
// Map {
//   'e5' => AirForce,           ← Virtual!
//   'e7' => Navy + [Tank]       ← Virtual!
// }

console.log(game.board.get('e5')) // Navy + [AirForce, Tank]  ← Still unchanged!
console.log(game.board.get('e7')) // null                      ← Still unchanged!

//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Step 4: Air Force moves to d7 (complete!)
game.move({ from: 'e5', to: 'd7' })

// Deploy complete! commitDeploySession() called:

console.log(game.board.get('e5')) // null              ← NOW changed!
console.log(game.board.get('e7')) // Navy + [Tank]     ← NOW changed!
console.log(game.board.get('d7')) // AirForce          ← NOW changed!

console.log(game.deploySession) // null             ← Session cleared!
console.log(game.turn) // 'b'              ← Turn switched!

console.log(game.history.length) // 1  ← Only ONE entry for entire deploy!
```

---

## Benefits

### 1. ✅ Unified Code Path

```typescript
// Same function for normal AND deploy!
applyNormalMove(move, context)
applyCaptureMove(move, context)
applyCombineMove(move, context)
```

### 2. ✅ Clean State Management

- Real state unchanged during deploy
- Virtual overlay for validation
- Atomic commit when complete

### 3. ✅ Simple History

- One entry for entire deploy
- Easy undo: restore original stack

### 4. ✅ Correct Validation

- `isCommanderExposed()` uses virtual board
- `isCommanderAttacked()` uses virtual board
- Legal move filtering works correctly

### 5. ✅ Clean FEN

- Base FEN unchanged during deploy
- Deploy state serialized separately
- Easy to parse and restore

---

## Implementation Checklist

### Week 1: Virtual State

- [ ] `DeploySession` with `virtualChanges` Map
- [ ] `VirtualBoard` class
- [ ] `getEffectiveBoard()` method

### Week 2: Unified Moves

- [ ] Add `MoveContext` parameter
- [ ] Refactor `applyNormalMove()` for both modes
- [ ] Refactor `applyCaptureMove()` for both modes
- [ ] Refactor `applyCombineMove()` for both modes

### Week 3: Validation

- [ ] Update `isCommanderExposed()` to use virtual board
- [ ] Update `isCommanderAttacked()` to use virtual board
- [ ] Update `filterLegalMoves()` to work with virtual state

### Week 4: Commit & History

- [ ] `commitDeploySession()` method
- [ ] Single history entry for deploy
- [ ] FEN serialization with deploy state
- [ ] 100+ tests

---

This architecture is **significantly cleaner** than command pattern for deploy!
🎯
