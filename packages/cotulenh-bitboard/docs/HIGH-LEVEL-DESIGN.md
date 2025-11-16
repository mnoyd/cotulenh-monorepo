# High-Level Design: CoTuLenh Bitboard Implementation

## Executive Summary

This document presents the high-level design for `@repo/cotulenh-bitboard`, informed by analysis of chess.js (0x88), chessops (bitboards), and cotulenh-core (current implementation).

**Key Design Decisions**:

1. **Hybrid Architecture**: Bitboards for performance + Maps for complexity
2. **Modular Structure**: Inspired by chessops
3. **API Compatibility**: Inspired by chess.js
4. **128-bit Bitboards**: For 11×12 board (132 squares)
5. **Magic Bitboards**: For sliding piece move generation

---

## Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: Public API                      │
│                  (chess.js-inspired)                        │
│                                                             │
│  CoTuLenh class - Familiar API for users                   │
│  - load(fen), fen(), get(), put(), remove()                │
│  - moves(), move(), undo(), history()                      │
│  - deployMove(), commitDeploySession()                     │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Layer 2: Core Engine                       │
│                 (chessops-inspired)                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Bitboard    │  │   Position   │  │    Stack     │     │
│  │  Operations  │  │   Manager    │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     Move     │  │ Air Defense  │  │    Deploy    │     │
│  │  Generator   │  │   Manager    │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                Layer 3: Utilities                           │
│                                                             │
│  FEN Parser/Generator │ SAN Parser/Generator │ Zobrist Hash│
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Bitboard Operations (chessops-inspired)

**Purpose**: Low-level bit manipulation for 128-bit bitboards

```typescript
// src/bitboard/operations.ts

export interface Bitboard {
  low: bigint; // Bits 0-63
  high: bigint; // Bits 64-127 (only 0-67 used for 132 squares)
}

// Constants
export const EMPTY: Bitboard = { low: 0n, high: 0n };
export const FULL: Bitboard = { low: ~0n, high: ~0n };
export const VALID_SQUARES: Bitboard = computeValidSquaresMask();

// Basic operations
export function and(a: Bitboard, b: Bitboard): Bitboard;
export function or(a: Bitboard, b: Bitboard): Bitboard;
export function xor(a: Bitboard, b: Bitboard): Bitboard;
export function not(a: Bitboard): Bitboard;

// Bit manipulation
export function isSet(bb: Bitboard, square: number): boolean;
export function setBit(bb: Bitboard, square: number): Bitboard;
export function clearBit(bb: Bitboard, square: number): Bitboard;
export function toggleBit(bb: Bitboard, square: number): Bitboard;

// Queries
export function popCount(bb: Bitboard): number;
export function lsb(bb: Bitboard): number; // Least significant bit
export function msb(bb: Bitboard): number; // Most significant bit

// Shifts (for move generation)
export function shiftNorth(bb: Bitboard, ranks: number): Bitboard;
export function shiftSouth(bb: Bitboard, ranks: number): Bitboard;
export function shiftEast(bb: Bitboard, files: number): Bitboard;
export function shiftWest(bb: Bitboard, files: number): Bitboard;
```

**Key Insight from chessops**: Keep operations pure and simple. Build complex logic on top of these primitives.

---

### 2. Position Manager (chessops-inspired structure, CoTuLenh pieces)

**Purpose**: Manage piece positions using bitboards

```typescript
// src/position/position.ts

export class BitboardPosition {
  // Piece type bitboards (11 types for CoTuLenh)
  commanders: Bitboard;
  infantry: Bitboard;
  tanks: Bitboard;
  militia: Bitboard;
  engineers: Bitboard;
  artillery: Bitboard;
  antiAir: Bitboard;
  missiles: Bitboard;
  airForce: Bitboard;
  navy: Bitboard;
  headquarters: Bitboard;

  // Color bitboards
  red: Bitboard;
  blue: Bitboard;

  // Derived bitboards (computed on demand or cached)
  occupied: Bitboard; // red | blue
  carriers: Bitboard; // Pieces with stacks (hybrid with StackManager)
  heroic: Bitboard; // Heroic pieces

  // Side to move
  turn: Color;

  // Commander positions (cached for quick access)
  redCommander: number;
  blueCommander: number;

  // Methods
  getPieceAt(square: number): Piece | undefined;
  getPieceTypeAt(square: number): PieceSymbol;
  placePiece(piece: Piece, square: number): void;
  removePiece(square: number): Piece | undefined;

  // Occupancy queries
  getOccupied(): Bitboard;
  getColorOccupancy(color: Color): Bitboard;
  getEmptySquares(): Bitboard;

  // Piece type queries
  getPieceBitboard(type: PieceSymbol): Bitboard;

  // Validation
  isConsistent(): boolean; // Verify bitboards are in sync
}
```

**Key Insight from chessops**: Separate piece types and colors into different bitboards. Compute derived bitboards on demand.

---

### 3. Stack Manager (Hybrid: Bitboard + Map)

**Purpose**: Manage CoTuLenh's unique stack system

```typescript
// src/stacks/manager.ts

interface StackData {
  carrier: Piece;
  carried: Piece[];
  square: number;
}

export class StackManager {
  // Hybrid approach
  private stacks: Map<number, StackData>; // Detailed stack data
  private carrierBitboard: Bitboard; // Fast "has stack?" queries

  constructor(private position: BitboardPosition) {}

  // Fast queries using bitboard
  hasStack(square: number): boolean {
    return isSet(this.carrierBitboard, square);
  }

  getCarrierBitboard(): Bitboard {
    return this.carrierBitboard;
  }

  // Detailed queries using map
  getStack(square: number): StackData | undefined {
    return this.stacks.get(square);
  }

  // Stack operations
  createStack(carrier: Piece, carried: Piece[], square: number): void;
  destroyStack(square: number): void;
  addToStack(piece: Piece, square: number): void;
  removeFromStack(pieceType: PieceSymbol, square: number): Piece | undefined;

  // Validation
  validateStackComposition(carrier: Piece, carried: Piece[]): boolean;
  canAddToStack(stack: StackData, piece: Piece): boolean;

  // Synchronization
  syncWithPosition(): void; // Ensure carrier bitboard matches position
}
```

**Key Insight from cotulenh-core**: Stacks are too complex for pure bitboards. Use hybrid approach: bitboard for "where are stacks?" (fast), map for "what's in the stack?" (detailed).

---

### 4. Move Generator (chessops magic bitboards + CoTuLenh rules)

**Purpose**: Generate moves using bitboard operations

```typescript
// src/moves/generator.ts

export class MoveGenerator {
  constructor(
    private position: BitboardPosition,
    private stacks: StackManager,
    private terrain: TerrainManager,
    private airDefense: AirDefenseManager
  ) {}

  // Main entry point
  generateMoves(options?: MoveOptions): InternalMove[] {
    const us = this.position.turn;
    const ourPieces = this.position.getColorOccupancy(us);

    const moves: InternalMove[] = [];

    // Iterate through our pieces using bitboard
    let pieces = ourPieces;
    while (popCount(pieces) > 0) {
      const square = lsb(pieces);
      pieces = clearBit(pieces, square);

      const piece = this.position.getPieceAt(square)!;
      const pieceMoves = this.generateMovesForPiece(square, piece);
      moves.push(...pieceMoves);
    }

    return moves;
  }

  // Piece-specific generation
  private generateMovesForPiece(square: number, piece: Piece): InternalMove[] {
    switch (piece.type) {
      case INFANTRY:
        return this.generateInfantryMoves(square, piece);
      case TANK:
        return this.generateTankMoves(square, piece);
      // ... other pieces
    }
  }

  // Simple piece (precomputed attack tables)
  private generateInfantryMoves(square: number, piece: Piece): InternalMove[] {
    const moves: InternalMove[] = [];

    // Get precomputed attack bitboard
    let targets = this.attackTables.infantry[square];

    // Apply terrain constraints
    targets = this.terrain.filterByTerrain(targets, INFANTRY);

    // Split into move/capture/combine targets
    const empty = this.position.getEmptySquares();
    const enemies = this.position.getColorOccupancy(swapColor(piece.color));
    const friends = this.position.getColorOccupancy(piece.color);

    // Generate moves to empty squares
    let moveTargets = and(targets, empty);
    while (popCount(moveTargets) > 0) {
      const to = lsb(moveTargets);
      moveTargets = clearBit(moveTargets, to);
      moves.push({ color: piece.color, from: square, to, piece, flags: BITS.NORMAL });
    }

    // Generate captures
    let captureTargets = and(targets, enemies);
    while (popCount(captureTargets) > 0) {
      const to = lsb(captureTargets);
      captureTargets = clearBit(captureTargets, to);
      const captured = this.position.getPieceAt(to);
      moves.push({ color: piece.color, from: square, to, piece, captured, flags: BITS.CAPTURE });
    }

    // Generate combinations
    let combineTargets = and(targets, friends);
    while (popCount(combineTargets) > 0) {
      const to = lsb(combineTargets);
      combineTargets = clearBit(combineTargets, to);
      const targetPiece = this.position.getPieceAt(to);
      if (this.stacks.validateStackComposition(piece, [targetPiece!])) {
        moves.push({
          color: piece.color,
          from: square,
          to,
          piece,
          combined: targetPiece,
          flags: BITS.COMBINATION
        });
      }
    }

    return moves;
  }

  // Sliding piece (magic bitboards)
  private generateTankMoves(square: number, piece: Piece): InternalMove[] {
    const moves: InternalMove[] = [];
    const occupied = this.position.getOccupied();

    // Use magic bitboards for sliding attacks
    let targets = this.magic.getSlidingAttacks(square, occupied, 2); // Tank: 2 squares

    // Apply terrain
    targets = this.terrain.filterByTerrain(targets, TANK);

    // Handle Tank's special shoot-over-blocking rule
    // ... (similar to infantry but with modified occupancy for captures)

    return moves;
  }
}
```

**Key Insight from chessops**: Use magic bitboards for sliding pieces. Precompute attack tables for simple pieces.

---

### 5. Magic Bitboards (chessops technique, adapted for 11×12)

**Purpose**: Fast sliding piece move generation

```typescript
// src/moves/magic.ts

interface MagicEntry {
  mask: Bitboard; // Relevant occupancy bits
  magic: bigint; // Magic number
  shift: number; // Shift amount
  attacks: Bitboard[]; // Precomputed attack table
}

export class MagicBitboards {
  private rookMagics: MagicEntry[]; // 132 entries (one per square)
  private bishopMagics: MagicEntry[]; // 132 entries

  constructor() {
    this.rookMagics = this.generateRookMagics();
    this.bishopMagics = this.generateBishopMagics();
  }

  // Fast attack lookup
  getSlidingAttacks(square: number, occupied: Bitboard, maxDistance: number): Bitboard {
    const magic = this.rookMagics[square];

    // Apply mask to get relevant occupancy
    const relevantOccupancy = and(occupied, magic.mask);

    // Compute magic index
    const index = this.computeMagicIndex(relevantOccupancy, magic.magic, magic.shift);

    // Lookup attacks
    let attacks = magic.attacks[index];

    // Limit by max distance if needed
    if (maxDistance < Infinity) {
      attacks = this.limitAttackDistance(attacks, square, maxDistance);
    }

    return attacks;
  }

  // Generate magic numbers for all squares
  private generateRookMagics(): MagicEntry[] {
    const magics: MagicEntry[] = [];

    for (let square = 0; square < 256; square++) {
      if (!isSquareOnBoard(square)) continue;

      const mask = this.computeRookMask(square);
      const magic = this.findMagicNumber(square, mask, true);
      const attacks = this.precomputeAttacks(square, mask, magic);

      magics[square] = { mask, magic, shift: 64 - popCount(mask), attacks };
    }

    return magics;
  }

  // Find magic number using trial and error
  private findMagicNumber(square: number, mask: Bitboard, isRook: boolean): bigint {
    // Port from chessops or chess programming wiki
    // Uses random number generation + validation
    // ... (complex algorithm, see CRITICAL-GAPS.md)
  }
}
```

**Key Insight from chessops**: Magic bitboards are essential for performance. Need to port algorithm and adapt for 11×12 board.

---

### 6. Air Defense Manager (CoTuLenh-specific, bitboard-optimized)

**Purpose**: Calculate air defense zones using bitboards

```typescript
// src/air-defense/manager.ts

export class AirDefenseManager {
  private zones: {
    red: Bitboard;
    blue: Bitboard;
  };

  constructor(
    private position: BitboardPosition,
    private stacks: StackManager
  ) {
    this.zones = { red: EMPTY, blue: EMPTY };
    this.recalculateZones();
  }

  // Recalculate all zones
  recalculateZones(): void {
    this.zones.red = this.calculateZoneForColor(RED);
    this.zones.blue = this.calculateZoneForColor(BLUE);
  }

  // Calculate zone for one color
  private calculateZoneForColor(color: Color): Bitboard {
    let zone = EMPTY;

    // Get all air defense pieces for this color
    const colorPieces = this.position.getColorOccupancy(color);
    const antiAir = and(this.position.antiAir, colorPieces);
    const missiles = and(this.position.missiles, colorPieces);

    // Add zones from Anti-Air pieces (3-square range)
    let aapieces = antiAir;
    while (popCount(aapieces) > 0) {
      const square = lsb(aapieces);
      aapieces = clearBit(aapieces, square);

      const influence = this.getAirDefenseInfluence(square, 3);
      zone = or(zone, influence);
    }

    // Add zones from Missile pieces (4-square range)
    let missilePieces = missiles;
    while (popCount(missilePieces) > 0) {
      const square = lsb(missilePieces);
      missilePieces = clearBit(missilePieces, square);

      const influence = this.getAirDefenseInfluence(square, 4);
      zone = or(zone, influence);
    }

    // Check stacks for air defense pieces
    const carriers = this.stacks.getCarrierBitboard();
    let carrierSquares = and(carriers, colorPieces);
    while (popCount(carrierSquares) > 0) {
      const square = lsb(carrierSquares);
      carrierSquares = clearBit(carrierSquares, square);

      const stack = this.stacks.getStack(square);
      if (!stack) continue;

      // Check if stack contains air defense pieces
      for (const carried of stack.carried) {
        if (carried.type === ANTI_AIR) {
          const influence = this.getAirDefenseInfluence(square, 3);
          zone = or(zone, influence);
        } else if (carried.type === MISSILE) {
          const influence = this.getAirDefenseInfluence(square, 4);
          zone = or(zone, influence);
        }
      }
    }

    return zone;
  }

  // Get air defense influence from a square
  private getAirDefenseInfluence(square: number, range: number): Bitboard {
    let influence = EMPTY;

    // Orthogonal directions
    const offsets = [-16, 1, 16, -1]; // N, E, S, W

    for (const offset of offsets) {
      let current = square;
      for (let dist = 1; dist <= range; dist++) {
        current += offset;
        if (!isSquareOnBoard(current)) break;
        influence = setBit(influence, current);
      }
    }

    return influence;
  }

  // Query methods
  isInAirDefenseZone(square: number, defendingColor: Color): boolean {
    const zone = defendingColor === RED ? this.zones.red : this.zones.blue;
    return isSet(zone, square);
  }

  getZone(color: Color): Bitboard {
    return color === RED ? this.zones.red : this.zones.blue;
  }
}
```

**Key Insight from cotulenh-core**: Air defense is performance-critical. Bitboards make zone calculation 5x faster.

---

### 7. Public API (chess.js-inspired)

**Purpose**: Provide familiar, user-friendly API

```typescript
// src/index.ts

export class CoTuLenh {
  // Internal state (bitboard-based)
  private position: BitboardPosition
  private stacks: StackManager
  private moveGen: MoveGenerator
  private airDefense: AirDefenseManager
  private deployManager: DeployManager
  private history: HistoryEntry[]
  private cache: LRUCache<string, InternalMove[]>

  constructor(fen?: string) {
    this.position = new BitboardPosition()
    this.stacks = new StackManager(this.position)
    this.moveGen = new MoveGenerator(this.position, this.stacks, ...)
    this.airDefense = new AirDefenseManager(this.position, this.stacks)
    this.deployManager = new DeployManager(...)
    this.history = []
    this.cache = new LRUCache({ maxSize: 1000 })

    if (fen) this.load(fen)
    else this.load(DEFAULT_POSITION)
  }

  // FEN operations
  load(fen: string): void {
    const parsed = parseFen(fen)
    this.position = parsed.position
    // ... load other state
  }

  fen(): string {
    return generateFen(this.position, this.stacks, ...)
  }

  // Piece operations (translate between bitboards and objects)
  get(square: Square): Piece | undefined {
    const squareIndex = SQUARE_MAP[square]
    return this.position.getPieceAt(squareIndex)
  }

  put(piece: Piece, square: Square): boolean {
    const squareIndex = SQUARE_MAP[square]
    this.position.placePiece(piece, squareIndex)
    this.cache.clear()
    return true
  }

  remove(square: Square): Piece | undefined {
    const squareIndex = SQUARE_MAP[square]
    const piece = this.position.removePiece(squareIndex)
    this.cache.clear()
    return piece
  }

  // Move operations
  moves(options?: MoveOptions): Move[] | string[] {
    const cacheKey = this.getCacheKey(options)
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // Generate moves using bitboards
    const internalMoves = this.moveGen.generateMoves(options)

    // Filter for legality (make-unmake pattern)
    const legalMoves = this.filterLegalMoves(internalMoves)

    // Convert to external format
    const result = options?.verbose
      ? legalMoves.map(m => new Move(this, m))
      : legalMoves.map(m => this.moveToSan(m))

    this.cache.set(cacheKey, result)
    return result
  }

  move(move: string | MoveObject): Move | null {
    // Parse move
    const internalMove = typeof move === 'string'
      ? this.parseSan(move)
      : this.parseMove Object(move)

    if (!internalMove) return null

    // Validate legality
    if (!this.isLegal(internalMove)) return null

    // Execute move
    this.executeMove(internalMove)

    // Return Move object
    return new Move(this, internalMove)
  }

  undo(): Move | null {
    const entry = this.history.pop()
    if (!entry) return null

    // Restore state
    this.position = entry.position.clone()
    this.stacks = entry.stacks.clone()
    // ... restore other state

    this.cache.clear()
    return new Move(this, entry.move)
  }

  // Game state queries
  turn(): Color {
    return this.position.turn
  }

  isCheck(): boolean {
    const us = this.position.turn
    const commanderSquare = this.position.getCommanderSquare(us)
    return this.isSquareAttacked(commanderSquare, swapColor(us))
  }

  isCheckmate(): boolean {
    return this.isCheck() && this.moves().length === 0
  }

  isStalemate(): boolean {
    return !this.isCheck() && this.moves().length === 0
  }

  isDraw(): boolean {
    // Threefold repetition, fifty-move rule, etc.
  }

  isGameOver(): boolean {
    return this.isCheckmate() || this.isStalemate() || this.isDraw()
  }

  // CoTuLenh-specific
  deployMove(request: DeployMoveRequest): DeployMove | null {
    return this.deployManager.executeDeployMove(request)
  }

  commitDeploySession(): boolean {
    return this.deployManager.commitSession()
  }

  getRecombineOptions(square: Square): RecombineOption[] {
    return this.deployManager.getRecombineOptions(square)
  }
}
```

**Key Insight from chess.js**: Keep API simple and familiar. Hide bitboard complexity behind clean interface.

---

## Performance Targets

| Operation        | Current (0x88) | Target (Bitboard) | Improvement   |
| ---------------- | -------------- | ----------------- | ------------- |
| Move Generation  | ~5ms           | ~2ms              | 2.5x faster   |
| Attack Detection | ~3ms           | ~0.5ms            | 6x faster     |
| Air Defense Calc | ~15ms          | ~3ms              | 5x faster     |
| Position Eval    | ~10ms          | ~4ms              | 2.5x faster   |
| Memory/Position  | 6KB            | 2KB               | 70% reduction |

---

## Implementation Phases

### Phase 1: Foundation (4-6 weeks)

- Core bitboard operations
- Position manager
- Terrain manager
- FEN parser/generator

### Phase 2: Move Generation (6-8 weeks)

- Attack pattern tables
- Magic bitboard generation
- Simple piece move generation
- Sliding piece move generation

### Phase 3: Game Rules (4-6 weeks)

- Commander safety checking
- Legal move filtering
- Air defense zones
- Game state queries

### Phase 4: Complex Mechanics (8-10 weeks)

- Hybrid stack system
- Deploy session manager
- Recombine move generation
- Stack validation

### Phase 5: API & Polish (4-6 weeks)

- Public API implementation
- History management
- Caching system
- Performance optimization

**Total**: 26-36 weeks (6-9 months)

---

## Success Criteria

1. ✅ **API Compatibility**: 100% compatible with cotulenh-core API
2. ✅ **Performance**: 2.5x faster move generation minimum
3. ✅ **Memory**: 50% memory reduction minimum
4. ✅ **Correctness**: All cotulenh-core tests pass
5. ✅ **Quality**: >90% test coverage

---

## Next Steps

1. **Review this design** with team
2. **Create `@repo/cotulenh-types`** shared package
3. **Start Phase 1** implementation
4. **Set up compatibility tests** against cotulenh-core
5. **Begin knowledge extraction** from source code

---

## References

- [Knowledge Extraction](./KNOWLEDGE-EXTRACTION.md) - Detailed analysis of chess.js, chessops, cotulenh-core
- [Architecture](./ARCHITECTURE.md) - Detailed component design
- [Critical Gaps](./CRITICAL-GAPS.md) - Missing components and blockers
- [Implementation Guide](./IMPLEMENTATION-GUIDE.md) - Phase-by-phase tasks
