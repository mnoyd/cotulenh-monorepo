# Virtual State Integration: Complete Flow Architecture

## Overview

This document explains how **virtual state overlays** integrate with **every
part of the game engine** during deploy sessions, ensuring that move generation,
air defense, commander checks, and legal filtering all work seamlessly with both
real and virtual board states.

---

## Core Principle: Single Code Path

**Goal:** ALL game logic should work identically whether:

- In normal mode (using real board)
- In deploy mode (using virtual board overlay)

**Solution:** Use polymorphism via `IBoard` interface

```typescript
interface IBoard {
  get(square: number): Piece | null
  set(square: number, piece: Piece | null): void
  pieces(color?: Color): Generator<[number, Piece]>
}

// Normal mode: Real board
class Board implements IBoard { ... }

// Deploy mode: Virtual overlay
class VirtualBoard implements IBoard { ... }
```

---

## Part 1: Virtual Board Implementation

### VirtualBoard Class

```typescript
// src/core/VirtualBoard.ts
export class VirtualBoard implements IBoard {
  constructor(
    private readonly realBoard: Board,
    private readonly deploySession: DeploySession,
  ) {}

  /**
   * Get piece at square.
   * Returns virtual piece if changed, otherwise real piece.
   */
  get(square: number): Piece | null {
    // Check virtual changes first
    if (this.deploySession.virtualChanges.has(square)) {
      return this.deploySession.virtualChanges.get(square)!
    }

    // Fall back to real board
    return this.realBoard.get(square)
  }

  /**
   * Set is NOT allowed on virtual board!
   * Virtual changes only through deploySession.
   */
  set(square: number, piece: Piece | null): void {
    throw new Error('Cannot directly set on VirtualBoard. Use DeploySession.')
  }

  /**
   * Iterate over all pieces (virtual + real).
   * Virtual pieces override real pieces at same square.
   */
  *pieces(color?: Color): Generator<[number, Piece]> {
    const seen = new Set<number>()

    // 1. Yield virtual pieces first
    for (const [square, piece] of this.deploySession.virtualChanges) {
      if (piece !== null && (!color || piece.color === color)) {
        yield [square, piece]
        seen.add(square)
      }
    }

    // 2. Yield real pieces not overridden by virtual
    for (const [square, piece] of this.realBoard.pieces(color)) {
      if (!seen.has(square)) {
        yield [square, piece]
      }
    }
  }

  /**
   * Check if square is valid (same as real board).
   */
  isValid(square: number): boolean {
    return this.realBoard.isValid(square)
  }
}
```

### DeploySession Class

```typescript
// src/core/DeploySession.ts
export class DeploySession {
  originalSquare: number
  originalStack: Piece[]

  // Virtual state changes (NOT applied to real board)
  virtualChanges: Map<number, Piece | null> = new Map()

  // Track what happened
  movedPieces: Array<{
    piece: Piece
    from: number
    to: number
    captured?: Piece
  }> = []

  stayingPieces: Piece[] = []

  constructor(square: number, stack: Piece[]) {
    this.originalSquare = square
    this.originalStack = stack
  }

  /**
   * Apply a deploy step (update virtual state).
   */
  applyStep(move: Move): void {
    // Update virtual state at origin
    const fromPiece = this.getEffectivePiece(move.from)
    const remaining = this.removeFromStack(fromPiece, move.piece)
    this.virtualChanges.set(move.from, remaining)

    // Update virtual state at destination
    this.virtualChanges.set(move.to, move.piece)

    // Track move
    this.movedPieces.push({
      piece: move.piece,
      from: move.from,
      to: move.to,
      captured: move.capturedPiece,
    })
  }

  /**
   * Mark piece as staying (not moving).
   */
  markStaying(piece: Piece): void {
    this.stayingPieces.push(piece)
  }

  /**
   * Get effective piece at square (virtual overlay).
   */
  getEffectivePiece(square: number): Piece | null {
    if (this.virtualChanges.has(square)) {
      return this.virtualChanges.get(square)!
    }
    // Note: This needs realBoard reference
    // Better: Pass through VirtualBoard
    throw new Error('Use VirtualBoard.get() instead')
  }

  /**
   * Get remaining pieces (not moved, not stayed).
   */
  getRemainingPieces(): Piece[] {
    const moved = new Set(this.movedPieces.map((m) => m.piece))
    const stayed = new Set(this.stayingPieces)

    return this.originalStack.filter((p) => !moved.has(p) && !stayed.has(p))
  }

  /**
   * Check if deploy is complete.
   */
  isComplete(): boolean {
    return this.getRemainingPieces().length === 0
  }

  /**
   * Remove piece from stack (helper).
   */
  private removeFromStack(
    stack: Piece | null,
    pieceToRemove: Piece,
  ): Piece | null {
    if (!stack) return null

    // If single piece, remove it
    if (!stack.carrying || stack.carrying.length === 0) {
      return null
    }

    // Remove from carrying array
    const newCarrying = stack.carrying.filter((p) => p !== pieceToRemove)

    if (newCarrying.length === 0) {
      return null
    }

    return {
      ...stack,
      carrying: newCarrying,
    }
  }
}
```

---

## Part 2: GameState Integration

### GameState with Virtual Board Support

```typescript
// src/core/GameState.ts
export class GameState {
  board: Board
  turn: Color
  commanders: [number, number]
  deploySession: DeploySession | null
  airDefenseZones: AirDefenseZones

  /**
   * Get effective board (real or virtual).
   * This is THE KEY method for virtual state integration!
   */
  getEffectiveBoard(): IBoard {
    if (this.deploySession) {
      // Deploy mode: Return virtual board
      return new VirtualBoard(this.board, this.deploySession)
    }

    // Normal mode: Return real board
    return this.board
  }

  /**
   * Start deploy session.
   */
  startDeploy(square: number): void {
    const piece = this.board.get(square)
    if (!piece || !piece.carrying) {
      throw new Error('No stack at square')
    }

    const stack = this.flattenStack(piece)
    this.deploySession = new DeploySession(square, stack)
  }

  /**
   * Apply deploy step.
   */
  applyDeployStep(move: Move): void {
    if (!this.deploySession) {
      throw new Error('No deploy session active')
    }

    // Apply to virtual state
    this.deploySession.applyStep(move)

    // Invalidate caches that depend on board state
    this.airDefenseZones.invalidate()
  }

  /**
   * Complete deploy (commit virtual changes to real board).
   */
  completeDeploy(): void {
    if (!this.deploySession) {
      throw new Error('No deploy session active')
    }

    // Apply all virtual changes to real board
    for (const [square, piece] of this.deploySession.virtualChanges) {
      this.board.set(square, piece)
    }

    // Clear deploy session
    this.deploySession = null

    // Invalidate caches
    this.airDefenseZones.invalidate()

    // Switch turn
    this.turn = this.turn === 'r' ? 'b' : 'r'
  }

  /**
   * Cancel deploy (discard virtual changes).
   */
  cancelDeploy(): void {
    this.deploySession = null
    this.airDefenseZones.invalidate()
  }

  // Helper
  private flattenStack(piece: Piece): Piece[] {
    const result = [{ ...piece, carrying: undefined }]
    if (piece.carrying) {
      result.push(...piece.carrying)
    }
    return result
  }
}
```

---

## Part 3: Move Generation with Virtual State

### MoveGenerator Using Effective Board

```typescript
// src/move-generation/MoveGenerator.ts
export class MoveGenerator {
  /**
   * Generate all legal moves.
   * Works with both real and virtual boards!
   */
  generateLegalMoves(state: GameState): Move[] {
    // ✅ Get effective board (virtual during deploy)
    const board = state.getEffectiveBoard()

    const pseudoLegal: Move[] = []

    // Generate pseudo-legal moves
    for (const [square, piece] of board.pieces(state.turn)) {
      // ✅ During deploy: only generate for remaining pieces
      if (state.deploySession) {
        const remaining = state.deploySession.getRemainingPieces()
        if (!remaining.includes(piece)) {
          continue // Skip pieces already moved
        }
      }

      // Generate moves for this piece
      pseudoLegal.push(...this.generatePieceMoves(state, square, piece))
    }

    // Filter to legal moves
    return this.validator.filterLegal(state, pseudoLegal)
  }

  /**
   * Generate moves for a single piece.
   */
  private generatePieceMoves(
    state: GameState,
    square: number,
    piece: Piece,
  ): Move[] {
    const generator = PIECE_GENERATORS[piece.type]
    return generator.generate(state, square, piece)
  }
}

// src/move-generation/PieceGenerators.ts
class AirForceGenerator {
  generate(state: GameState, from: number, piece: Piece): Move[] {
    const moves: Move[] = []
    const board = state.getEffectiveBoard() // ✅ Virtual or real

    // Calculate air defense zones using effective board
    state.airDefenseZones.calculate(board) // ✅ Uses virtual state!

    for (const direction of ALL_DIRECTIONS) {
      for (let distance = 1; distance <= 4; distance++) {
        const to = from + direction * distance

        if (!board.isValid(to)) break

        // ✅ Check air defense using virtual state
        if (state.airDefenseZones.isDefended(to, piece.color)) {
          break // Blocked by air defense
        }

        const target = board.get(to) // ✅ Gets virtual piece!

        if (target === null) {
          moves.push(Move.normal(from, to, piece))
        } else if (target.color !== piece.color) {
          moves.push(Move.capture(from, to, piece, target))
          break
        } else {
          break // Friendly piece
        }
      }
    }

    return moves
  }
}
```

---

## Part 4: Air Defense with Virtual State

### AirDefenseZones Using IBoard

```typescript
// src/air-defense/AirDefenseZones.ts
export class AirDefenseZones {
  private redZones: Set<number> = new Set()
  private blueZones: Set<number> = new Set()
  private isDirty: boolean = true

  /**
   * Calculate zones using provided board.
   * ✅ Works with both Board and VirtualBoard!
   */
  calculate(board: IBoard): void {
    if (!this.isDirty) return

    this.redZones.clear()
    this.blueZones.clear()

    // ✅ Iterate over effective board (virtual during deploy)
    for (const [square, piece] of board.pieces()) {
      if (piece.type === ANTI_AIR || piece.type === HEADQUARTER) {
        const zones = this.getDefenseZones(square, piece)
        const targetSet = piece.color === 'r' ? this.redZones : this.blueZones
        zones.forEach((sq) => targetSet.add(sq))
      }
    }

    this.isDirty = false
  }

  isDefended(square: number, againstColor: Color): boolean {
    if (this.isDirty) {
      throw new Error('Air defense zones not calculated')
    }

    const zones = againstColor === 'r' ? this.redZones : this.blueZones
    return zones.has(square)
  }

  private getDefenseZones(square: number, piece: Piece): number[] {
    const range = piece.type === ANTI_AIR ? 2 : 1
    const zones: number[] = []

    for (const direction of ALL_DIRECTIONS) {
      for (let dist = 1; dist <= range; dist++) {
        const target = square + direction * dist
        if (isValidSquare(target)) {
          zones.push(target)
        }
      }
    }

    return zones
  }

  invalidate(): void {
    this.isDirty = true
  }
}
```

---

## Part 5: Move Validation with Virtual State

### MoveValidator Using Effective Board

```typescript
// src/move-validation/MoveValidator.ts
export class MoveValidator {
  /**
   * Filter legal moves (make/unmake approach).
   * ✅ Works with virtual state!
   */
  filterLegal(state: GameState, moves: Move[]): Move[] {
    const legal: Move[] = []

    for (const move of moves) {
      // Try move
      const undo = this.tryMove(state, move)

      // Check if legal (using effective board)
      const isLegal =
        !this.isCommanderExposed(state) && !this.isCommanderAttacked(state)

      // Undo move
      this.undoMove(state, undo)

      if (isLegal) {
        legal.push(move)
      }
    }

    return legal
  }

  /**
   * Try move (apply temporarily).
   * ✅ Works with virtual state!
   */
  private tryMove(state: GameState, move: Move): UndoInfo {
    const board = state.getEffectiveBoard() // ✅ Virtual or real

    const undo: UndoInfo = {
      move,
      capturedPiece: board.get(move.to),
    }

    // Apply move to effective board
    // Note: For VirtualBoard, this updates virtualChanges
    // For real Board, this updates the array
    board.set(move.from, null)
    board.set(move.to, move.piece)

    return undo
  }

  /**
   * Check if commander is exposed.
   * ✅ Uses effective board!
   */
  private isCommanderExposed(state: GameState): boolean {
    const board = state.getEffectiveBoard() // ✅ Virtual or real

    const [redCmd, blueCmd] = state.commanders

    // Check if commanders face each other
    if (getFile(redCmd) !== getFile(blueCmd)) {
      return false // Not on same file
    }

    // Check squares between them
    const start = Math.min(redCmd, blueCmd)
    const end = Math.max(redCmd, blueCmd)

    for (let sq = start + SOUTH; sq < end; sq += SOUTH) {
      if (board.get(sq) !== null) {
        // ✅ Checks virtual state!
        return false // Blocked
      }
    }

    return true // Exposed!
  }

  /**
   * Check if commander is attacked.
   * ✅ Uses effective board!
   */
  private isCommanderAttacked(state: GameState, color: Color): boolean {
    const board = state.getEffectiveBoard() // ✅ Virtual or real
    const cmdSquare = color === 'r' ? state.commanders[0] : state.commanders[1]

    // Check if any enemy piece attacks commander
    const enemyColor = color === 'r' ? 'b' : 'r'

    for (const [square, piece] of board.pieces(enemyColor)) {
      if (this.canAttack(state, square, piece, cmdSquare)) {
        return true
      }
    }

    return false
  }
}
```

---

## Part 6: Complete Flow from move() to Response

### The Complete Pipeline

```typescript
// src/CoTuLenh.ts
export class CoTuLenh {
  private state: GameState
  private generator: MoveGenerator
  private validator: MoveValidator

  /**
   * FLOW 1: Get legal moves
   * Used by UI to show available moves
   */
  moves(): string[] {
    // 1. Generate pseudo-legal moves
    //    ✅ Uses state.getEffectiveBoard() internally
    const pseudoLegal = this.generator.generatePseudoLegal(this.state)

    // 2. Filter to legal moves
    //    ✅ Uses state.getEffectiveBoard() for commander checks
    const legal = this.validator.filterLegal(this.state, pseudoLegal)

    // 3. Convert to SAN notation
    return legal.map((m) => this.moveToSAN(m))
  }

  /**
   * FLOW 2: Apply a move
   * During normal mode: Apply directly to board
   * During deploy mode: Apply to virtual state
   */
  move(notation: string): MoveResult {
    const move = this.parseMove(notation)

    // Validate move is legal
    const legalMoves = this.moves() // Uses effective board
    if (!legalMoves.includes(notation)) {
      throw new Error('Illegal move')
    }

    if (this.state.deploySession) {
      // ✅ DEPLOY MODE: Apply to virtual state
      this.state.applyDeployStep(move)

      // Check if deploy complete
      if (this.state.deploySession.isComplete()) {
        this.state.completeDeploy() // Commit to real board
      }
    } else {
      // ✅ NORMAL MODE: Apply to real board
      this.applyMoveToBoard(move)
      this.state.turn = this.state.turn === 'r' ? 'b' : 'r'
    }

    return {
      san: notation,
      fen: this.fen(),
      legalMoves: this.moves(), // For next turn
    }
  }

  /**
   * FLOW 3: Start deploy
   */
  startDeploy(square: string): DeployResult {
    const sq = algebraicToSquare(square)

    // Start deploy session
    this.state.startDeploy(sq)

    // Generate legal moves for remaining pieces
    //    ✅ Uses VirtualBoard now!
    const legalMoves = this.moves()

    return {
      active: true,
      originalSquare: square,
      remaining: this.state.deploySession!.getRemainingPieces(),
      legalMoves,
    }
  }
}
```

---

## Complete Flow Diagram

### Normal Move Flow

```
User: game.move('Tc3')
    ↓
1. Parse move
    ↓
2. Get legal moves:
    ├→ state.getEffectiveBoard()  ← Returns real Board
    ├→ generator.generatePseudoLegal(state)
    │   ├→ Iterate board.pieces()
    │   ├→ Generate moves per piece
    │   │   ├→ AirForce: Check air defense
    │   │   │   └→ zones.calculate(board)  ← Uses real board
    │   │   └→ Other pieces
    │   └→ Return pseudo-legal moves
    ├→ validator.filterLegal(state, moves)
    │   ├→ For each move:
    │   │   ├→ tryMove() on effective board
    │   │   ├→ isCommanderExposed()  ← Uses real board
    │   │   ├→ isCommanderAttacked()  ← Uses real board
    │   │   └→ undoMove()
    │   └→ Return legal moves
    └→ Return legal moves
    ↓
3. Validate user's move in legal list
    ↓
4. Apply move:
    └→ board.set(from, null)
    └→ board.set(to, piece)
    └→ Switch turn
    ↓
5. Return result
```

### Deploy Move Flow

```
User: game.startDeploy('e5')
    ↓
1. Start deploy session
    └→ deploySession = new DeploySession(e5, [Navy, Tank, Infantry])
    ↓
2. Get legal moves:
    ├→ state.getEffectiveBoard()  ← Returns VirtualBoard!
    ├→ generator.generatePseudoLegal(state)
    │   ├→ Iterate virtualBoard.pieces()  ← Merges virtual + real!
    │   │   ├→ Virtual pieces (if any)
    │   │   └→ Real pieces (not overridden)
    │   ├→ Filter to remaining pieces only
    │   ├→ Generate moves per piece
    │   │   ├→ AirForce: Check air defense
    │   │   │   └→ zones.calculate(virtualBoard)  ← Uses virtual!
    │   │   └→ Other pieces
    │   └→ Return pseudo-legal moves
    └→ Return legal moves for remaining pieces
    ↓
User: game.move('Nd7')  (Navy to d7)
    ↓
3. Apply deploy step:
    ├→ deploySession.applyStep(move)
    │   ├→ virtualChanges.set(e5, [Tank, Infantry])  ← Remove Navy
    │   └→ virtualChanges.set(d7, Navy)  ← Add Navy
    └→ airDefenseZones.invalidate()
    ↓
4. Get legal moves for next piece:
    ├→ state.getEffectiveBoard()  ← Returns VirtualBoard
    ├→ Virtual board shows:
    │   ├→ e5: [Tank, Infantry]  ← Updated!
    │   └→ d7: Navy  ← New!
    ├→ generator.generatePseudoLegal(state)
    │   ├→ Iterate virtualBoard.pieces()
    │   ├→ Filter to remaining: [Tank, Infantry]
    │   ├→ AirForce moves check air defense
    │   │   └→ zones.calculate(virtualBoard)
    │   │       └→ If Navy captured Anti-Air at d7:
    │   │           └→ Zones updated! (Anti-Air gone)
    │   └→ Return moves for Tank and Infantry
    └→ Return legal moves
    ↓
User: game.move('Td5')  (Tank to d5)
    ↓
5. Apply deploy step:
    ├→ virtualChanges.set(e5, [Infantry])  ← Remove Tank
    └→ virtualChanges.set(d5, Tank)  ← Add Tank
    ↓
User: game.move('Ie6')  (Infantry to e6)
    ↓
6. Apply deploy step:
    ├→ virtualChanges.set(e5, null)  ← Remove Infantry
    ├→ virtualChanges.set(e6, Infantry)  ← Add Infantry
    └→ deploySession.isComplete() === true  ← All moved!
    ↓
7. Complete deploy:
    ├→ Commit virtual changes to real board:
    │   ├→ realBoard.set(e5, null)
    │   ├→ realBoard.set(d7, Navy)
    │   ├→ realBoard.set(d5, Tank)
    │   └→ realBoard.set(e6, Infantry)
    ├→ Clear deploy session
    ├→ Switch turn
    └→ Invalidate air defense
    ↓
8. Return result
```

---

## Key Insights

### 1. Single Interface = Single Code Path

```typescript
// ALL functions use IBoard interface:
function generateMoves(state: GameState): Move[] {
  const board = state.getEffectiveBoard() // ✅ Polymorphic!
  // ... rest of logic identical for normal and deploy
}
```

### 2. Virtual State Propagates Automatically

```typescript
// When deploy session active:
state.getEffectiveBoard()  // Returns VirtualBoard
    ↓
generator.generate(state)  // Uses VirtualBoard
    ↓
airDefense.calculate(board)  // Calculates on VirtualBoard
    ↓
validator.filterLegal(state, moves)  // Checks on VirtualBoard
    ↓
All operations see virtual state!
```

### 3. No if/else Branching Needed

```typescript
// ❌ OLD APPROACH (bad):
if (state.deploySession) {
  // Different logic for deploy...
} else {
  // Different logic for normal...
}

// ✅ NEW APPROACH (good):
const board = state.getEffectiveBoard()
// Same logic for both!
```

### 4. Lazy Recalculation Works Perfectly

```typescript
// Deploy step 1: Tank captures Anti-Air
deploySession.applyStep(tankCapturesAntiAir)
airDefenseZones.invalidate()  // O(1)

// Deploy step 2: Air Force moves
generator.generate(state)
    ↓
airDefenseZones.calculate(virtualBoard)  // Recalc with virtual state
    ↓
Anti-Air gone! Air Force can fly through!
```

---

## Implementation Checklist

### Phase 1: Core Abstractions

- [ ] `IBoard` interface
- [ ] `VirtualBoard` class
- [ ] `DeploySession.virtualChanges`
- [ ] `GameState.getEffectiveBoard()`

### Phase 2: Update All Consumers

- [ ] `MoveGenerator` uses `getEffectiveBoard()`
- [ ] `AirDefenseZones.calculate()` accepts `IBoard`
- [ ] `MoveValidator` uses `getEffectiveBoard()`
- [ ] All piece generators use `IBoard`

### Phase 3: Deploy Integration

- [ ] `GameState.startDeploy()`
- [ ] `GameState.applyDeployStep()`
- [ ] `GameState.completeDeploy()`
- [ ] `CoTuLenh.move()` handles deploy mode

### Phase 4: Testing

- [ ] Unit tests for `VirtualBoard`
- [ ] Integration tests for deploy flow
- [ ] Test air defense with virtual state
- [ ] Test commander checks with virtual state

---

## Summary

**The virtual state integration works by:**

1. ✅ **IBoard interface** - Polymorphic board access
2. ✅ **VirtualBoard class** - Overlays virtual changes on real board
3. ✅ **getEffectiveBoard()** - Returns virtual or real board
4. ✅ **All logic uses IBoard** - No special cases needed
5. ✅ **Virtual changes tracked** - In `DeploySession.virtualChanges`
6. ✅ **Atomic commit** - When deploy completes

**Result:** ONE code path for normal and deploy modes! 🎯
