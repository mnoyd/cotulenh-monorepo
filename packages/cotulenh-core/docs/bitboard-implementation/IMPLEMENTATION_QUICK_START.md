# Bitboard Implementation Quick Start Guide

**Based on:** Chessops analysis + CoTuLenh requirements  
**Expected Outcome:** 4-5x performance improvement  
**Start Date:** Ready to implement

---

## 🎯 Phase 1: Core Foundation (Week 1)

### Step 1: Implement CoTuLenhSquareSet (256-bit Bitboard)

```typescript
// src/bitboard/SquareSet.ts

/**
 * Immutable 256-bit bitboard for CoTuLenh's 12×12 board
 * Mapped to 16×16 space (256 bits) for alignment
 */
export class CoTuLenhSquareSet {
  private readonly data: Uint32Array // 8 × 32-bit = 256 bits

  constructor(data?: Uint32Array) {
    this.data = data ? new Uint32Array(data) : new Uint32Array(8)
  }

  // Create from single square
  static fromSquare(square: number): CoTuLenhSquareSet {
    const wordIndex = Math.floor(square / 32)
    const bitIndex = square % 32
    const data = new Uint32Array(8)
    data[wordIndex] = 1 << bitIndex
    return new CoTuLenhSquareSet(data)
  }

  // Check if square is set
  has(square: number): boolean {
    const wordIndex = Math.floor(square / 32)
    const bitIndex = square % 32
    return (this.data[wordIndex] & (1 << bitIndex)) !== 0
  }

  // Set a square (returns new instance - immutable!)
  with(square: number): CoTuLenhSquareSet {
    const wordIndex = Math.floor(square / 32)
    const bitIndex = square % 32
    const newData = new Uint32Array(this.data)
    newData[wordIndex] |= 1 << bitIndex
    return new CoTuLenhSquareSet(newData)
  }

  // Clear a square
  without(square: number): CoTuLenhSquareSet {
    const wordIndex = Math.floor(square / 32)
    const bitIndex = square % 32
    const newData = new Uint32Array(this.data)
    newData[wordIndex] &= ~(1 << bitIndex)
    return new CoTuLenhSquareSet(newData)
  }

  // Union (OR)
  union(other: CoTuLenhSquareSet): CoTuLenhSquareSet {
    const newData = new Uint32Array(8)
    for (let i = 0; i < 8; i++) {
      newData[i] = this.data[i] | other.data[i]
    }
    return new CoTuLenhSquareSet(newData)
  }

  // Intersection (AND)
  intersect(other: CoTuLenhSquareSet): CoTuLenhSquareSet {
    const newData = new Uint32Array(8)
    for (let i = 0; i < 8; i++) {
      newData[i] = this.data[i] & other.data[i]
    }
    return new CoTuLenhSquareSet(newData)
  }

  // Difference (AND NOT)
  diff(other: CoTuLenhSquareSet): CoTuLenhSquareSet {
    const newData = new Uint32Array(8)
    for (let i = 0; i < 8; i++) {
      newData[i] = this.data[i] & ~other.data[i]
    }
    return new CoTuLenhSquareSet(newData)
  }

  // Count set bits
  size(): number {
    let count = 0
    for (let i = 0; i < 8; i++) {
      count += this.popCount(this.data[i])
    }
    return count
  }

  // Population count (Brian Kernighan's algorithm)
  private popCount(n: number): number {
    let count = 0
    while (n !== 0) {
      n &= n - 1
      count++
    }
    return count
  }

  // Check if empty
  isEmpty(): boolean {
    return this.data.every((word) => word === 0)
  }

  // Check if not empty
  nonEmpty(): boolean {
    return !this.isEmpty()
  }

  // Iterate through set bits
  *[Symbol.iterator](): Iterator<number> {
    for (let wordIndex = 0; wordIndex < 8; wordIndex++) {
      let word = this.data[wordIndex]
      while (word !== 0) {
        const bitIndex = 31 - Math.clz32(word & -word)
        word &= word - 1
        yield wordIndex * 32 + bitIndex
      }
    }
  }
}
```

**Test:**

```typescript
const set = CoTuLenhSquareSet.fromSquare(69) // e5
expect(set.has(69)).toBe(true)
expect(set.has(70)).toBe(false)
expect(set.size()).toBe(1)
```

---

### Step 2: Implement Board with Bitboards

```typescript
// src/bitboard/Board.ts

export interface StackComposition {
  carrier: PieceSymbol
  carried: PieceSymbol[]
}

export class BitboardBoard {
  // Color bitboards
  red: CoTuLenhSquareSet
  blue: CoTuLenhSquareSet

  // Piece type bitboards
  commander: CoTuLenhSquareSet
  infantry: CoTuLenhSquareSet
  tank: CoTuLenhSquareSet
  artillery: CoTuLenhSquareSet
  navy: CoTuLenhSquareSet
  airForce: CoTuLenhSquareSet
  militia: CoTuLenhSquareSet
  engineer: CoTuLenhSquareSet
  antiAir: CoTuLenhSquareSet
  missile: CoTuLenhSquareSet
  headquarter: CoTuLenhSquareSet

  // Aggregate bitboards
  occupied: CoTuLenhSquareSet
  heroic: CoTuLenhSquareSet

  // Stack composition (REQUIRED!)
  stackInfo: Map<number, StackComposition>

  constructor() {
    // Initialize empty bitboards
    this.red = new CoTuLenhSquareSet()
    this.blue = new CoTuLenhSquareSet()
    // ... initialize all piece types
    this.occupied = new CoTuLenhSquareSet()
    this.heroic = new CoTuLenhSquareSet()
    this.stackInfo = new Map()
  }

  // Get piece at square
  get(square: number): Piece | undefined {
    if (!this.occupied.has(square)) return undefined

    const color = this.getColor(square)
    const type = this.getPieceType(square)
    const isHeroic = this.heroic.has(square)

    // Check if stack
    const stack = this.stackInfo.get(square)
    if (stack) {
      return {
        type: stack.carrier,
        color: color!,
        heroic: isHeroic,
        carrying: stack.carried.map((t) => ({ type: t, color: color! })),
      }
    }

    return {
      type: type!,
      color: color!,
      heroic: isHeroic,
    }
  }

  private getColor(square: number): Color | undefined {
    if (this.red.has(square)) return 'red'
    if (this.blue.has(square)) return 'blue'
    return undefined
  }

  private getPieceType(square: number): PieceSymbol | undefined {
    if (this.commander.has(square)) return 'commander'
    if (this.infantry.has(square)) return 'infantry'
    if (this.tank.has(square)) return 'tank'
    // ... check all piece types
    return undefined
  }

  // Set piece at square
  set(square: number, piece: Piece): void {
    // Remove existing piece
    this.take(square)

    // Set color bitboard
    if (piece.color === 'red') {
      this.red = this.red.with(square)
    } else {
      this.blue = this.blue.with(square)
    }

    // Set piece type bitboard
    this[piece.type] = this[piece.type].with(square)

    // Update occupied
    this.occupied = this.occupied.with(square)

    // Update heroic
    if (piece.heroic) {
      this.heroic = this.heroic.with(square)
    }

    // Update stack info if carrying
    if (piece.carrying && piece.carrying.length > 0) {
      this.stackInfo.set(square, {
        carrier: piece.type,
        carried: piece.carrying.map((p) => p.type),
      })
    }
  }

  // Remove piece from square
  take(square: number): Piece | undefined {
    const piece = this.get(square)
    if (!piece) return undefined

    // Clear all bitboards
    this.red = this.red.without(square)
    this.blue = this.blue.without(square)
    this.commander = this.commander.without(square)
    // ... clear all piece types
    this.occupied = this.occupied.without(square)
    this.heroic = this.heroic.without(square)
    this.stackInfo.delete(square)

    return piece
  }

  // Clone board
  clone(): BitboardBoard {
    const board = new BitboardBoard()
    // Copy all bitboards
    board.red = this.red // Immutable, can share
    board.blue = this.blue
    // ... copy all
    board.stackInfo = new Map(this.stackInfo) // Deep copy map
    return board
  }
}
```

---

### Step 3: Pre-compute Attack Tables

```typescript
// src/bitboard/AttackTables.ts

export class AttackTables {
  // Pre-computed tables (computed once at module load)
  static readonly INFANTRY_ATTACKS: CoTuLenhSquareSet[]
  static readonly COMMANDER_ATTACKS: CoTuLenhSquareSet[]
  static readonly TANK_RAYS: { h: CoTuLenhSquareSet[]; v: CoTuLenhSquareSet[] }
  // ... more tables

  static {
    // Initialize tables
    this.INFANTRY_ATTACKS = this.computeInfantryAttacks()
    this.COMMANDER_ATTACKS = this.computeCommanderAttacks()
    this.TANK_RAYS = this.computeTankRays()
  }

  private static computeInfantryAttacks(): CoTuLenhSquareSet[] {
    const tables: CoTuLenhSquareSet[] = []

    for (let square = 0; square < 256; square++) {
      if (!isValidSquare(square)) {
        tables[square] = new CoTuLenhSquareSet()
        continue
      }

      const [file, rank] = squareToFileRank(square)
      let attacks = new CoTuLenhSquareSet()

      // All 8 directions, range 1
      const deltas = [-17, -16, -15, -1, 1, 15, 16, 17]
      for (const delta of deltas) {
        const dest = square + delta
        if (isValidSquare(dest) && isAdjacent(square, dest)) {
          attacks = attacks.with(dest)
        }
      }

      tables[square] = attacks
    }

    return tables
  }

  // Usage:
  static getInfantryAttacks(square: number): CoTuLenhSquareSet {
    return this.INFANTRY_ATTACKS[square]
  }
}
```

---

## 🎯 Phase 2: Context-Based Validation (Week 2)

### Step 4: Implement Context Computation

```typescript
// src/bitboard/Context.ts

export interface CoTuLenhContext {
  commander: number
  standardBlockers: CoTuLenhSquareSet // Pinned by standard pieces
  airForceThreats: CoTuLenhSquareSet // Threatened by Air Force
  checkers: CoTuLenhSquareSet
  airDefenseZones: CoTuLenhSquareSet
}

export class ContextComputer {
  constructor(private board: BitboardBoard) {}

  compute(color: Color): CoTuLenhContext {
    const commander = this.findCommander(color)
    const enemyColor = opposite(color)

    // 1. Find standard pins
    const standardBlockers = this.computeStandardPins(commander, enemyColor)

    // 2. Find Air Force threats (ignore blocking!)
    const airForceThreats = this.computeAirForceThreats(commander, enemyColor)

    // 3. Find checkers
    const checkers = this.computeCheckers(commander, enemyColor)

    // 4. Compute air defense zones
    const airDefenseZones = this.computeAirDefense(enemyColor)

    return {
      commander,
      standardBlockers,
      airForceThreats,
      checkers,
      airDefenseZones,
    }
  }

  private computeStandardPins(
    commander: number,
    enemyColor: Color,
  ): CoTuLenhSquareSet {
    let blockers = new CoTuLenhSquareSet()

    // Get enemy sliding pieces (not Air Force!)
    const snipers = this.getEnemySlidingPieces(enemyColor).diff(
      this.board.airForce,
    ) // Exclude Air Force

    for (const sniper of snipers) {
      const ray = this.getRayBetween(sniper, commander)
      const piecesOnRay = ray.intersect(this.board.occupied)

      if (piecesOnRay.size() === 1) {
        // Exactly one piece - it's pinned!
        blockers = blockers.union(piecesOnRay)
      }
    }

    return blockers
  }

  private computeAirForceThreats(
    commander: number,
    enemyColor: Color,
  ): CoTuLenhSquareSet {
    let threats = new CoTuLenhSquareSet()

    const enemyAirForces = this.board.airForce.intersect(this.board[enemyColor])

    for (const airForce of enemyAirForces) {
      // Air Force ignores all blocking!
      const ray = this.getRayBetween(airForce, commander)

      if (ray.has(commander)) {
        threats = threats.union(ray)
      }
    }

    return threats
  }
}
```

---

### Step 5: Implement Move Generation with Context

```typescript
// src/bitboard/MoveGenerator.ts

export class BitboardMoveGenerator {
  constructor(
    private board: BitboardBoard,
    private attackTables: AttackTables,
  ) {}

  generateLegalMoves(color: Color): Move[] {
    // Compute context once
    const ctx = new ContextComputer(this.board).compute(color)

    const moves: Move[] = []
    const ourPieces = this.board[color]

    for (const square of ourPieces) {
      const pieceMoves = this.generatePieceMovesWithContext(square, ctx)
      moves.push(...pieceMoves)
    }

    return moves
  }

  private generatePieceMovesWithContext(
    square: number,
    ctx: CoTuLenhContext,
  ): Move[] {
    const piece = this.board.get(square)!

    // Commander always needs special handling
    if (piece.type === 'commander') {
      return this.generateCommanderMoves(square, ctx)
    }

    // Get pseudo-legal moves
    let destinations = this.getPseudoLegalDests(square, piece)

    // Fast path: Filter using context
    if (this.canUseFastPath(square, piece, ctx)) {
      destinations = this.filterUsingContext(square, destinations, ctx)
      return this.convertToMoves(square, destinations)
    }

    // Slow path: Need simulation
    return this.filterUsingSimulation(square, destinations, ctx)
  }

  private canUseFastPath(
    square: number,
    piece: Piece,
    ctx: CoTuLenhContext,
  ): boolean {
    return (
      piece.type !== 'commander' &&
      !ctx.airForceThreats.has(square) &&
      ctx.checkers.size() <= 1
    )
  }

  private filterUsingContext(
    square: number,
    destinations: CoTuLenhSquareSet,
    ctx: CoTuLenhContext,
  ): CoTuLenhSquareSet {
    // Apply pin filter
    if (ctx.standardBlockers.has(square)) {
      const pinRay = this.getRay(square, ctx.commander)
      destinations = destinations.intersect(pinRay)
    }

    // Apply check filter
    if (ctx.checkers.nonEmpty()) {
      const blockSquares = this.getBlockSquares(ctx)
      destinations = destinations.intersect(blockSquares)
    }

    return destinations
  }
}
```

---

## 🎯 Phase 3: Integration (Week 3)

### Step 6: Create Position Class

```typescript
// src/bitboard/Position.ts

export class BitboardPosition {
  board: BitboardBoard
  turn: Color
  halfmoves: number
  fullmoves: number
  deployState: DeployState | null

  constructor() {
    this.board = new BitboardBoard()
    this.turn = 'red'
    this.halfmoves = 0
    this.fullmoves = 1
    this.deployState = null
  }

  // Snapshot-based undo
  clone(): BitboardPosition {
    const pos = new BitboardPosition()
    pos.board = this.board.clone()
    pos.turn = this.turn
    pos.halfmoves = this.halfmoves
    pos.fullmoves = this.fullmoves
    pos.deployState = this.deployState // Copy if needed
    return pos
  }

  // Apply move (mutates this position)
  play(move: Move): void {
    // Update board
    const piece = this.board.take(move.from)!
    const captured = this.board.take(move.to)
    this.board.set(move.to, piece)

    // Update counters
    if (captured) {
      this.halfmoves = 0
    } else {
      this.halfmoves++
    }

    // Switch turn
    this.turn = opposite(this.turn)
    if (this.turn === 'red') {
      this.fullmoves++
    }
  }

  // Generate legal moves
  legalMoves(): Move[] {
    const generator = new BitboardMoveGenerator(this.board, AttackTables)
    return generator.generateLegalMoves(this.turn)
  }
}
```

---

## 🎯 Testing Strategy

### Unit Tests:

```typescript
describe('CoTuLenhSquareSet', () => {
  test('basic operations', () => {
    const set = CoTuLenhSquareSet.fromSquare(69)
    expect(set.has(69)).toBe(true)
    expect(set.size()).toBe(1)

    const set2 = set.with(70)
    expect(set2.has(69)).toBe(true)
    expect(set2.has(70)).toBe(true)
    expect(set2.size()).toBe(2)

    // Original unchanged (immutable!)
    expect(set.size()).toBe(1)
  })
})

describe('Context computation', () => {
  test('detects standard pins', () => {
    const board = setupPosition(
      'e5: Red Commander, e6: Red Tank, e8: Blue Artillery',
    )
    const ctx = new ContextComputer(board).compute('red')

    expect(ctx.standardBlockers.has(squareFromName('e6'))).toBe(true)
  })

  test('Air Force does not create pins', () => {
    const board = setupPosition(
      'e5: Red Commander, e6: Red Tank, e8: Blue Air Force',
    )
    const ctx = new ContextComputer(board).compute('red')

    expect(ctx.standardBlockers.has(squareFromName('e6'))).toBe(false)
    expect(ctx.airForceThreats.has(squareFromName('e5'))).toBe(true)
  })
})
```

### Performance Tests:

```typescript
test('performance comparison', () => {
  const position = setupComplexPosition()

  // Traditional
  const start1 = performance.now()
  const moves1 = position.legalMovesTraditional()
  const time1 = performance.now() - start1

  // Bitboard
  const start2 = performance.now()
  const moves2 = position.legalMovesBitboard()
  const time2 = performance.now() - start2

  console.log(`Traditional: ${time1}ms`)
  console.log(`Bitboard: ${time2}ms`)
  console.log(`Speedup: ${time1 / time2}x`)

  expect(time2).toBeLessThan(time1 / 3) // At least 3x faster
})
```

---

## 📊 Success Metrics

### Phase 1 Complete When:

- ✅ SquareSet operations work correctly
- ✅ Board can store/retrieve pieces
- ✅ Attack tables pre-computed
- ✅ All unit tests pass

### Phase 2 Complete When:

- ✅ Context computation works
- ✅ Pin detection correct (standard + Air Force)
- ✅ Fast path validation works for 80% of moves
- ✅ Performance tests show improvement

### Phase 3 Complete When:

- ✅ Full integration with game engine
- ✅ All existing tests still pass
- ✅ 4-5x overall speedup achieved
- ✅ Memory usage acceptable (<50KB per 100 moves)

---

## 🚀 Quick Commands

```bash
# Run tests
pnpm test src/bitboard

# Run performance benchmarks
pnpm test:perf

# Profile specific operation
pnpm profile:context-computation
pnpm profile:move-generation
```

---

## 📚 Next Steps

1. ✅ Start with Step 1 (SquareSet)
2. ✅ Write comprehensive tests
3. ✅ Build incrementally
4. ✅ Profile at each phase
5. ✅ Compare to baseline
6. ✅ Iterate and optimize

---

**Ready to build the fastest CoTuLenh engine!** 🚀
