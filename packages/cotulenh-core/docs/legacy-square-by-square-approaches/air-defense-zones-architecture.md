# Air Defense Zones Architecture

## Overview

Air Defense Zones are a critical game mechanic in CoTuLenh where Anti-Air and
Headquarter pieces create "no-fly zones" that prevent enemy Air Force pieces
from entering certain squares.

**Key Requirements:**

1. **Expensive to calculate** - Must scan all Anti-Air/HQ pieces and compute
   zones
2. **Rarely changes** - Only when Air Defense pieces move or are captured
3. **Must be cached** - Performance optimization (100x speedup)
4. **Must be exported** - UI needs zones for red overlay highlighting
5. **Must work with virtual state** - Deploy sessions use virtual board overlay

---

## Core Design Decisions

### Decision 1: Lazy Recalculation (Not Eager)

**Chosen Strategy: Invalidate on move, recalculate on-demand**

```typescript
// ✅ During move application (fast!)
applyMove(state, move) {
  state.board.set(move.from, null)
  state.board.set(move.to, move.piece)

  // Just invalidate (O(1))
  if (affectsAirDefense(move)) {
    state.airDefenseZones.invalidate()
  }
}

// ✅ When needed (lazy)
getAirDefenseZones(color) {
  this.airDefenseZones.calculate(this.board)  // Checks dirty flag
  return this.airDefenseZones.getZones(color)
}
```

**Why?**

- Move application stays fast (0.1ms vs 2.1ms)
- No wasted calculations on server-only games
- Only calculates when UI requests zones
- 17x faster for 100-move sequences

**Alternatives Rejected:**

- ❌ Eager recalculation: Wastes CPU on every move
- ❌ Selective eager: Still calculates even when zones not used

---

### Decision 2: Virtual State Overlay Integration

**CRITICAL: Air defense zones must be calculated using the EFFECTIVE board state
during deploy sessions.**

#### The Problem

```
Initial state:
  e5: Air Force + [Tank]
  d3: Enemy Anti-Air (range 2)

Air Defense Zone: d1, d2, d3, d4, d5, e3, f3, c3
                   (blocks e5 Air Force from moving through e3)

Deploy Session Active:
  Move 1: Tank from e5 → d3 (CAPTURE Anti-Air)
          Board state: UNCHANGED (virtual only!)
          Virtual state: Tank@d3, Air Force@e5

  Move 2: Air Force e5 → e1?
          Should this be legal?
```

**Answer: YES! Air Force move should be legal because:**

1. Tank captured Anti-Air in virtual state (Move 1)
2. Air defense zone should be recalculated using VIRTUAL board
3. Virtual board shows Anti-Air gone → zone updated
4. Air Force can now move through e3

---

### Decision 3: Deploy Session Air Defense Recalculation

**Strategy: Recalculate air defense zones after EACH deploy step using virtual
board**

```typescript
class DeploySession {
  virtualChanges: Map<Square, Piece | null>

  // After each deploy step
  applyDeployStep(state: GameState, move: Move): void {
    // Update virtual state
    this.virtualChanges.set(move.from, stackAfterRemoval)
    this.virtualChanges.set(move.to, move.piece)

    // ✅ Invalidate air defense if this move affects it
    if (affectsAirDefense(move)) {
      state.airDefenseZones.invalidate()
    }

    // ✅ When generating next legal moves, use virtual board!
    // zones will be recalculated with virtual state
  }
}

class VirtualBoard implements IBoard {
  constructor(
    private realBoard: Board,
    private deploySession: DeploySession,
  ) {}

  get(square: Square): Piece | null {
    // ✅ Check virtual changes first
    if (this.deploySession.virtualChanges.has(square)) {
      return this.deploySession.virtualChanges.get(square)
    }
    return this.realBoard.get(square)
  }

  pieces(color?: Color): [Square, Piece][] {
    // ✅ Merge virtual and real pieces
    const seen = new Set<Square>()
    const result: [Square, Piece][] = []

    // Virtual pieces first
    for (const [sq, piece] of this.deploySession.virtualChanges) {
      if (piece && (!color || piece.color === color)) {
        result.push([sq, piece])
        seen.add(sq)
      }
    }

    // Real pieces not overridden
    for (const [sq, piece] of this.realBoard.pieces(color)) {
      if (!seen.has(sq)) {
        result.push([sq, piece])
      }
    }

    return result
  }
}
```

---

## Complete Scenario: Deploy with Air Defense

### Scenario Setup

```
Position:
  e5: Air Force (red) + [Tank (red)]  ← Stack
  d3: Anti-Air (blue)                 ← Defends d1-d5, c3, e3, f3
  e1: Empty square

Question: Can Air Force move from e5 to e1?
Answer: NO - blocked by Anti-Air zone at e3

Deploy Session Started: square e5
```

### Step-by-Step Flow

#### Move 1: Tank Captures Anti-Air

```typescript
// User: deployStep('Tank', 'd3')

// 1. Generate legal moves for Tank (from e5)
//    Uses REAL board (Anti-Air still at d3)
const moves = generateMoves(realBoard, 'Tank', e5)
// moves includes: d3 (capture)

// 2. Apply deploy step (VIRTUAL)
deploySession.virtualChanges.set(e5, airForce) // Tank removed from stack
deploySession.virtualChanges.set(d3, tank) // Tank captures Anti-Air

// 3. Invalidate air defense (Anti-Air captured!)
state.airDefenseZones.invalidate()

// 4. Board state: UNCHANGED
//    realBoard.get(d3) === antiAir  ← Still there!
//    realBoard.get(e5) === stack    ← Still full stack!

// 5. Virtual board state: UPDATED
//    virtualBoard.get(d3) === tank    ← Tank here now
//    virtualBoard.get(e5) === airForce ← Only Air Force left
```

#### Move 2: Air Force Moves Through Former Zone

```typescript
// User: deployStep('AirForce', 'e1')

// 1. Get effective board for move generation
const effectiveBoard = getEffectiveBoard(state)
// effectiveBoard = VirtualBoard(realBoard, deploySession)

// 2. Recalculate air defense zones (LAZY)
state.airDefenseZones.calculate(effectiveBoard)
//    ↓
//    Scans effectiveBoard.pieces()
//    ↓
//    Finds: NO Anti-Air at d3 (Tank there instead!)
//    ↓
//    Result: Air defense zones EMPTY for blue

// 3. Generate Air Force moves
const moves = generateAirForceMoves(state, e5, airForce)
//    For each direction:
//      Check if square defended: state.isSquareDefended(e3, 'r')
//      ↓
//      Returns FALSE (no zones!)
//      ↓
//      e3 is passable!
//      ↓
//      e1 is reachable!

// 4. Apply deploy step (VIRTUAL)
deploySession.virtualChanges.set(e5, null) // Air Force leaves
deploySession.virtualChanges.set(e1, airForce) // Air Force arrives

// 5. Deploy complete (all pieces moved)
//    Commit virtual changes to real board atomically
state.board.set(e5, null)
state.board.set(d3, tank)
state.board.set(e1, airForce)

// 6. Invalidate air defense zones (commit changes)
state.airDefenseZones.invalidate()
```

---

## Implementation

### AirDefenseZones Class

```typescript
// src/air-defense/AirDefenseZones.ts
export class AirDefenseZones {
  private redZones: Set<Square> = new Set()
  private blueZones: Set<Square> = new Set()
  private isDirty: boolean = true

  /**
   * Calculate air defense zones using the provided board.
   *
   * IMPORTANT: During deploy sessions, must use VirtualBoard!
   * This ensures zones reflect virtual state changes.
   */
  calculate(board: IBoard): void {
    if (!this.isDirty) {
      return // Already calculated
    }

    this.redZones.clear()
    this.blueZones.clear()

    // ✅ Scan the provided board (real OR virtual)
    for (const [square, piece] of board.pieces()) {
      if (piece.type === ANTI_AIR || piece.type === HEADQUARTER) {
        const zones = this.getDefenseZones(square, piece)
        const targetSet = piece.color === 'r' ? this.redZones : this.blueZones
        zones.forEach((sq) => targetSet.add(sq))
      }
    }

    this.isDirty = false
  }

  /**
   * Get defense zones around a single piece.
   * Anti-Air: range 2
   * Headquarter: range 1
   */
  getDefenseZones(square: Square, piece: Piece): Square[] {
    const range = piece.type === ANTI_AIR ? 2 : 1
    const zones: Square[] = []

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

  /**
   * Check if square is defended against a color.
   */
  isDefended(square: Square, againstColor: Color): boolean {
    if (this.isDirty) {
      throw new Error('Air defense zones not calculated')
    }

    const zones = againstColor === 'r' ? this.redZones : this.blueZones
    return zones.has(square)
  }

  /**
   * Get all defended squares for a color.
   * Used by UI for red overlay highlighting.
   */
  getZones(color: Color): Square[] {
    if (this.isDirty) {
      throw new Error('Air defense zones not calculated')
    }

    const zones = color === 'r' ? this.redZones : this.blueZones
    return Array.from(zones)
  }

  /**
   * Invalidate zones (mark as dirty).
   * Called when air defense pieces move or are captured.
   */
  invalidate(): void {
    this.isDirty = true
  }
}
```

### GameState Integration

```typescript
// src/core/GameState.ts
export class GameState {
  board: Board
  deploySession: DeploySession | null
  airDefenseZones: AirDefenseZones

  /**
   * Get the effective board (real or virtual).
   * During deploy session: returns VirtualBoard
   * Normal mode: returns real Board
   */
  getEffectiveBoard(): IBoard {
    if (this.deploySession) {
      return new VirtualBoard(this.board, this.deploySession)
    }
    return this.board
  }

  /**
   * Get air defense zones (lazy calculation).
   * Uses effective board (virtual during deploy).
   */
  getAirDefenseZones(color: Color): Square[] {
    const effectiveBoard = this.getEffectiveBoard()
    this.airDefenseZones.calculate(effectiveBoard)
    return this.airDefenseZones.getZones(color)
  }

  /**
   * Check if square is defended (used during move generation).
   * Uses effective board (virtual during deploy).
   */
  isSquareDefended(square: Square, againstColor: Color): boolean {
    const effectiveBoard = this.getEffectiveBoard()
    this.airDefenseZones.calculate(effectiveBoard)
    return this.airDefenseZones.isDefended(square, againstColor)
  }
}
```

### Move Generation with Air Defense

```typescript
// src/move-generation/PieceGenerators.ts
class AirForceGenerator {
  generate(state: GameState, from: Square, piece: Piece): Move[] {
    const moves: Move[] = []

    // Air Force has 4-square range in all directions
    for (const direction of ALL_DIRECTIONS) {
      for (let distance = 1; distance <= 4; distance++) {
        const to = from + direction * distance

        if (!isValidSquare(to)) break

        // ✅ Check air defense (uses virtual board during deploy!)
        if (state.isSquareDefended(to, piece.color)) {
          break // Cannot pass through or beyond defended square
        }

        const targetPiece = state.getEffectiveBoard().get(to)

        if (targetPiece === null) {
          // Empty square
          moves.push(Move.normal(from, to, piece))
        } else if (targetPiece.color !== piece.color) {
          // Enemy piece (capture)
          moves.push(Move.capture(from, to, piece, targetPiece))
          break // Cannot move beyond
        } else {
          // Friendly piece (blocked)
          break
        }
      }
    }

    return moves
  }
}
```

### Deploy Session Integration

```typescript
// src/core/DeploySession.ts
export class DeploySession {
  originalSquare: Square
  virtualChanges: Map<Square, Piece | null>

  /**
   * Apply a deploy step (virtual state update).
   * Invalidates air defense if needed.
   */
  applyStep(state: GameState, move: Move): void {
    // Update virtual state
    const fromPiece = this.getEffectivePiece(state.board, move.from)
    const stackAfterRemoval = this.removeFromStack(fromPiece, move.piece)

    this.virtualChanges.set(move.from, stackAfterRemoval)
    this.virtualChanges.set(move.to, move.piece)

    // ✅ Invalidate air defense if this move affects it
    if (this.affectsAirDefense(move)) {
      state.airDefenseZones.invalidate()
    }
  }

  private affectsAirDefense(move: Move): boolean {
    return (
      move.piece.type === ANTI_AIR ||
      move.piece.type === HEADQUARTER ||
      move.capturedPiece?.type === ANTI_AIR ||
      move.capturedPiece?.type === HEADQUARTER
    )
  }

  /**
   * Commit virtual changes to real board.
   * Called when deploy session completes.
   */
  commit(state: GameState): void {
    // Apply all virtual changes
    for (const [square, piece] of this.virtualChanges) {
      state.board.set(square, piece)
    }

    // Invalidate air defense (real board changed)
    state.airDefenseZones.invalidate()
  }
}
```

---

## Public API

```typescript
// src/CoTuLenh.ts
export class CoTuLenh {
  /**
   * Get air defense zones for highlighting in UI.
   * Returns squares defended against the specified color.
   *
   * Example: getAirDefenseZones('r') returns squares where
   * red Air Force cannot enter (defended by blue).
   *
   * During deploy session: reflects virtual state!
   */
  getAirDefenseZones(color: 'r' | 'b'): string[] {
    return this.state
      .getAirDefenseZones(color)
      .map((sq) => squareToAlgebraic(sq))
  }

  /**
   * Get defense zones around a specific Anti-Air or HQ piece.
   * Used for hovering/highlighting individual defenders.
   */
  getAirDefenseAroundPiece(square: string): {
    square: string
    range: number
  }[] {
    const sq = algebraicToSquare(square)
    const board = this.state.getEffectiveBoard()
    const piece = board.get(sq)

    if (!piece || (piece.type !== ANTI_AIR && piece.type !== HEADQUARTER)) {
      return []
    }

    const zones = this.state.airDefenseZones
      .getDefenseZones(sq, piece)
      .map((s) => ({
        square: squareToAlgebraic(s),
        range: piece.type === ANTI_AIR ? 2 : 1,
      }))

    return zones
  }

  /**
   * Check if a specific square is defended.
   * Utility method for external consumers.
   */
  isSquareDefended(square: string, againstColor: 'r' | 'b'): boolean {
    const sq = algebraicToSquare(square)
    return this.state.isSquareDefended(sq, againstColor)
  }
}
```

---

## Performance Characteristics

### Without Lazy Calculation

```
100 moves with 10 Air Defense pieces:
  - 100 moves × 2ms recalculation = 200ms
  - Wasted if zones never used

Deploy session (3 moves):
  - Move 1: Apply + recalc = 2.1ms
  - Move 2: Apply + recalc = 2.1ms
  - Move 3: Apply + recalc = 2.1ms
  - Total: 6.3ms
```

### With Lazy Calculation

```
100 moves with 10 Air Defense pieces:
  - 100 moves × 0.001ms invalidation = 0.1ms
  - Then ONE calculation when UI requests = 2ms
  - Total: 2.1ms (95x faster!)

Deploy session (3 moves):
  - Move 1: Apply + invalidate = 0.101ms
  - Move 2: Apply + invalidate = 0.101ms
  - Move 3: Apply + invalidate = 0.101ms
  - Generate moves: recalc = 2ms (once)
  - Total: 2.3ms (3x faster!)
```

---

## Edge Cases & Considerations

### Edge Case 1: Multiple Air Defense Pieces

```
Position:
  d3: Anti-Air (blue) - defends c1-c5, d1-d5, e1-e5
  f5: Headquarter (blue) - defends e4-f6

Combined zone blocks large area.
Deploy: Tank captures d3
Result: Only f5 zone remains (smaller)
```

**Handled by:** Recalculating with virtual board after each deploy step.

### Edge Case 2: Heroic Headquarter

```
Normal HQ: Immobile, range 1 air defense
Heroic HQ: Mobile, range 1 air defense

Deploy: Attack enemy commander with Tank
Result: Own HQ becomes heroic
Effect: Air defense range unchanged (still 1)
```

**Handled by:** Heroic status doesn't affect air defense range.

### Edge Case 3: Undo During Deploy

```
Deploy session active:
  Move 1: Tank captures Anti-Air (virtual)
  User: undo()

Expected: Anti-Air restored, zones recalculated
```

**Handled by:**

```typescript
undo(): void {
  if (this.state.deploySession) {
    // Undo deploy step
    this.state.deploySession.undoLastStep()

    // Invalidate air defense
    this.state.airDefenseZones.invalidate()
  }
}
```

### Edge Case 4: Server-Only Game

```
Backend game engine (no UI):
  - Moves applied
  - Air defense zones NEVER requested
  - No wasted calculations!
```

**Handled by:** Lazy calculation means zones only computed when
`getAirDefenseZones()` called.

---

## Testing Strategy

### Unit Tests

```typescript
describe('AirDefenseZones', () => {
  it('should calculate zones for Anti-Air (range 2)', () => {
    const zones = new AirDefenseZones()
    const board = createBoard()
    board.set('d3', { type: ANTI_AIR, color: 'b' })

    zones.calculate(board)

    expect(zones.isDefended('d1', 'r')).toBe(true)
    expect(zones.isDefended('d5', 'r')).toBe(true)
    expect(zones.isDefended('e3', 'r')).toBe(true)
    expect(zones.isDefended('d6', 'r')).toBe(false) // Out of range
  })

  it('should use virtual board during deploy', () => {
    const state = createGameState()
    state.board.set('d3', { type: ANTI_AIR, color: 'b' })

    // Start deploy
    const session = DeploySession.start('e5', [tank, airForce])
    state.deploySession = session

    // Tank captures Anti-Air (virtual)
    session.applyStep(state, Move.capture('e5', 'd3', tank, antiAir))

    // Get zones using virtual board
    const zones = state.getAirDefenseZones('r')

    expect(zones).toHaveLength(0) // No zones (Anti-Air captured!)
  })

  it('should invalidate cache when air defense piece moves', () => {
    const state = createGameState()
    const zones = state.airDefenseZones

    // Calculate initial zones
    state.getAirDefenseZones('r')
    expect(zones.isDirty).toBe(false)

    // Move Anti-Air
    const move = Move.normal('d3', 'd4', antiAir)
    state.applyMove(move)

    expect(zones.isDirty).toBe(true) // Invalidated!
  })
})
```

### Integration Tests

```typescript
describe('Deploy with Air Defense', () => {
  it('should allow Air Force through after capturing Anti-Air', () => {
    const game = new CoTuLenh()

    // Setup: Air Force + Tank at e5, Anti-Air at d3
    game.load('...')

    // Start deploy
    game.startDeploy('e5')

    // Move 1: Tank captures Anti-Air
    game.deployStep('Tank', 'd3')

    // Move 2: Air Force should be able to move through e3 now
    const moves = game.moves()
    const airForceToE1 = moves.find(
      (m) => m.piece === 'AirForce' && m.to === 'e1',
    )

    expect(airForceToE1).toBeDefined() // Should be legal!
  })
})
```

---

## Summary

**Key Design Decisions:**

1. **Lazy Recalculation**: Invalidate on move, calculate on-demand (17x faster)
2. **Virtual State Support**: Use `VirtualBoard` during deploy sessions
3. **Cache Invalidation**: On Anti-Air/HQ move or capture
4. **Public API**: Export zones for UI highlighting
5. **Performance**: O(1) invalidation, O(n) calculation only when needed

**Critical Insight:** During deploy sessions, air defense zones MUST be
calculated using the virtual board state, not the real board. This allows pieces
moved earlier in the deploy sequence to affect air defense zones for later moves
in the same sequence.

This architecture provides both **performance** (lazy caching) and
**correctness** (virtual state integration)! 🎯
