# Bitboard Architecture Design Document

## Overview

This document provides the detailed design for implementing a bitboard-based architecture for CoTuLenh as an **independent package** (`cotulenh-bitboard`). This approach allows complete rewrite freedom without constraints from the existing 0x88 implementation, while maintaining API compatibility for easy adoption.

### Design Goals

1. **Performance**: Achieve 2.5-4x speedup in move generation
2. **Memory Efficiency**: Reduce memory usage by 50-70%
3. **Clean Architecture**: Build from scratch with modern patterns
4. **API Compatibility**: Match existing CoTuLenh interface for drop-in replacement
5. **Independent Development**: No dependencies on cotulenh-core internals

### Architecture Approach

**Independent Package Strategy**:

- New package: `@repo/cotulenh-bitboard`
- Clean slate implementation using bitboard architecture
- Hybrid approach for complex mechanics (stacks, deploy)
- Implements same public API as `cotulenh-core`
- Can be developed and tested independently
- Easy migration path: change import statement

**Package Structure**:

```
packages/cotulenh-bitboard/
├── src/
│   ├── bitboard/          # Core bitboard operations
│   ├── position/          # Position management
│   ├── moves/             # Move generation
│   ├── stacks/            # Stack system
│   ├── deploy/            # Deploy mechanics
│   ├── air-defense/       # Air defense zones
│   ├── validation/        # Move validation
│   ├── fen/               # FEN parsing/generation
│   ├── hash/              # Zobrist hashing
│   └── index.ts           # Public API (CoTuLenh interface)
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── performance/       # Benchmarks vs cotulenh-core
│   └── compatibility/     # API compatibility tests
└── package.json
```

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   BitboardCoTuLenh (Facade)                     │
│                  Implements CoTuLenh Interface                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Bitboard   │    │   Position   │    │    Stack     │
│  Operations  │    │   Manager    │    │   Manager    │
│              │    │              │    │              │
│ - AND/OR/XOR │    │ - Piece BBs  │    │ - Stack Map  │
│ - Shifts     │    │ - Color BBs  │    │ - Carrier BB │
│ - PopCount   │    │ - Occupancy  │    │ - Validation │
└──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Move      │    │ Air Defense  │    │   Deploy     │
│  Generator   │    │   Manager    │    │   Manager    │
│              │    │              │    │              │
│ - Simple     │    │ - Zone BBs   │    │ - Session    │
│ - Sliding    │    │ - Influence  │    │ - Recombine  │
│ - Magic BBs  │    │ - Validation │    │ - Commit     │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Layer Responsibilities

**Public API Layer (CoTuLenh class)**

- Implements exact same interface as cotulenh-core
- Drop-in replacement compatibility
- Coordinates between subsystems
- Manages game state transitions
- Handles move validation and execution

**Core Layer**

- Bitboard Operations: Low-level bit manipulation
- Position Manager: Piece and occupancy tracking
- Stack Manager: Hybrid stack representation
- FEN Parser/Generator: Position serialization
- Zobrist Hasher: Position hashing

**Feature Layer**

- Move Generator: Bitboard-based move generation
- Air Defense Manager: Zone calculation and validation
- Deploy Manager: Deploy session and recombine logic
- Validator: Move legality and game rules

**Benefits of Independent Package**:

1. **No Legacy Constraints**: Build optimal architecture from scratch
2. **Parallel Development**: Develop without affecting cotulenh-core
3. **Easy Testing**: Compare directly against cotulenh-core
4. **Simple Migration**: Users just change import statement
5. **Performance Focus**: Optimize without backward compatibility concerns

## Components and Interfaces

### 1. Bitboard Core Module

**Purpose**: Fundamental bitboard data structure and operations

```typescript
// Core 128-bit bitboard for 11×12 board (132 squares)
interface Bitboard {
  low: bigint; // Bits 0-63
  high: bigint; // Bits 64-127 (only bits 0-67 used for 132 squares)
}

// Bitboard operations
interface BitboardOps {
  // Creation
  empty(): Bitboard;
  full(): Bitboard;
  fromSquare(square: number): Bitboard;

  // Bitwise operations
  and(a: Bitboard, b: Bitboard): Bitboard;
  or(a: Bitboard, b: Bitboard): Bitboard;
  xor(a: Bitboard, b: Bitboard): Bitboard;
  not(a: Bitboard): Bitboard;

  // Shifts
  shiftNorth(bb: Bitboard, ranks: number): Bitboard;
  shiftSouth(bb: Bitboard, ranks: number): Bitboard;
  shiftEast(bb: Bitboard, files: number): Bitboard;
  shiftWest(bb: Bitboard, files: number): Bitboard;

  // Queries
  isSet(bb: Bitboard, square: number): boolean;
  popCount(bb: Bitboard): number;
  lsb(bb: Bitboard): number; // Least significant bit
  msb(bb: Bitboard): number; // Most significant bit

  // Modifications
  setBit(bb: Bitboard, square: number): Bitboard;
  clearBit(bb: Bitboard, square: number): Bitboard;
  toggleBit(bb: Bitboard, square: number): Bitboard;
}

// Constants
const EMPTY_BB: Bitboard = { low: 0n, high: 0n };
const FULL_BB: Bitboard = { low: 0xffffffffffffffffn, high: 0xfffffffffffffn };

// Valid squares mask for 11×12 board
const VALID_SQUARES_MASK: Bitboard = computeValidSquaresMask();

function computeValidSquaresMask(): Bitboard {
  let bb = EMPTY_BB;
  for (let rank = 0; rank < 12; rank++) {
    for (let file = 0; file < 11; file++) {
      const square = rank * 16 + file;
      bb = setBit(bb, square);
    }
  }
  return bb;
}
```

### 2. Position Manager Module

**Purpose**: Manage piece positions using bitboards

```typescript
interface BitboardPosition {
  // Piece type bitboards (11 piece types)
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

  // Occupancy
  occupied: Bitboard;

  // Derived bitboards
  carriers: Bitboard; // Pieces carrying others
  heroic: Bitboard; // Pieces with heroic status

  // Side to move
  turn: Color;

  // Commander positions (for quick access)
  redCommander: number;
  blueCommander: number;
}

class PositionManager {
  private position: BitboardPosition;

  // Piece queries
  getPieceAt(square: number): Piece | undefined {
    if (!isSet(this.position.occupied, square)) return undefined;

    const color = isSet(this.position.red, square) ? RED : BLUE;
    const type = this.getPieceTypeAt(square);
    const heroic = isSet(this.position.heroic, square);

    return { type, color, heroic };
  }

  getPieceTypeAt(square: number): PieceSymbol {
    if (isSet(this.position.commanders, square)) return COMMANDER;
    if (isSet(this.position.infantry, square)) return INFANTRY;
    if (isSet(this.position.tanks, square)) return TANK;
    // ... check other piece types
    throw new Error(`No piece type found at square ${square}`);
  }

  // Piece placement
  placePiece(piece: Piece, square: number): void {
    // Set piece type bitboard
    this.setPieceTypeBit(piece.type, square);

    // Set color bitboard
    if (piece.color === RED) {
      this.position.red = setBit(this.position.red, square);
    } else {
      this.position.blue = setBit(this.position.blue, square);
    }

    // Set occupancy
    this.position.occupied = setBit(this.position.occupied, square);

    // Set heroic if applicable
    if (piece.heroic) {
      this.position.heroic = setBit(this.position.heroic, square);
    }

    // Update commander position if applicable
    if (piece.type === COMMANDER) {
      if (piece.color === RED) {
        this.position.redCommander = square;
      } else {
        this.position.blueCommander = square;
      }
    }
  }

  // Piece removal
  removePiece(square: number): Piece | undefined {
    const piece = this.getPieceAt(square);
    if (!piece) return undefined;

    // Clear piece type bitboard
    this.clearPieceTypeBit(piece.type, square);

    // Clear color bitboard
    if (piece.color === RED) {
      this.position.red = clearBit(this.position.red, square);
    } else {
      this.position.blue = clearBit(this.position.blue, square);
    }

    // Clear occupancy
    this.position.occupied = clearBit(this.position.occupied, square);

    // Clear heroic
    this.position.heroic = clearBit(this.position.heroic, square);

    return piece;
  }

  // Occupancy queries
  getOccupied(): Bitboard {
    return this.position.occupied;
  }

  getColorOccupancy(color: Color): Bitboard {
    return color === RED ? this.position.red : this.position.blue;
  }

  getEmptySquares(): Bitboard {
    return and(not(this.position.occupied), VALID_SQUARES_MASK);
  }
}
```

### 3. Stack Manager Module

**Purpose**: Hybrid approach for managing stacked pieces

```typescript
interface StackData {
  carrier: Piece;
  carried: Piece[];
  square: number;
}

class StackManager {
  // Map from square index to stack data
  private stacks: Map<number, StackData>;

  // Bitboard of squares with stacks
  private carrierBitboard: Bitboard;

  constructor(private positionManager: PositionManager) {
    this.stacks = new Map();
    this.carrierBitboard = EMPTY_BB;
  }

  // Stack queries
  hasStack(square: number): boolean {
    return isSet(this.carrierBitboard, square);
  }

  getStack(square: number): StackData | undefined {
    return this.stacks.get(square);
  }

  getCarrierBitboard(): Bitboard {
    return this.carrierBitboard;
  }

  // Stack creation
  createStack(carrier: Piece, carried: Piece[], square: number): void {
    // Validate stack composition
    if (!this.validateStackComposition(carrier, carried)) {
      throw new Error('Invalid stack composition');
    }

    // Store stack data
    this.stacks.set(square, { carrier, carried, square });

    // Update carrier bitboard
    this.carrierBitboard = setBit(this.carrierBitboard, square);

    // Update position manager with carrier piece
    this.positionManager.placePiece(carrier, square);
  }

  // Stack modification
  addToStack(piece: Piece, square: number): void {
    const stack = this.stacks.get(square);
    if (!stack) {
      throw new Error(`No stack at square ${square}`);
    }

    // Validate addition
    if (!this.canAddToStack(stack, piece)) {
      throw new Error('Cannot add piece to stack');
    }

    stack.carried.push(piece);
  }

  removeFromStack(pieceType: PieceSymbol, square: number): Piece | undefined {
    const stack = this.stacks.get(square);
    if (!stack) return undefined;

    // Find and remove piece from carried array
    const index = stack.carried.findIndex((p) => p.type === pieceType);
    if (index === -1) return undefined;

    const [removed] = stack.carried.splice(index, 1);

    // If stack is now empty, remove it
    if (stack.carried.length === 0) {
      this.destroyStack(square);
    }

    return removed;
  }

  // Stack destruction
  destroyStack(square: number): void {
    this.stacks.delete(square);
    this.carrierBitboard = clearBit(this.carrierBitboard, square);
  }

  // Stack validation
  validateStackComposition(carrier: Piece, carried: Piece[]): boolean {
    // Navy can carry: Air Force, Tank, Infantry, Militia, Engineer
    if (carrier.type === NAVY) {
      return carried.every((p) => [AIR_FORCE, TANK, INFANTRY, MILITIA, ENGINEER].includes(p.type));
    }

    // Air Force can carry: Infantry, Militia
    if (carrier.type === AIR_FORCE) {
      return carried.every((p) => [INFANTRY, MILITIA].includes(p.type));
    }

    // Tank can carry: Infantry, Militia
    if (carrier.type === TANK) {
      return carried.every((p) => [INFANTRY, MILITIA].includes(p.type));
    }

    // Commander can carry any ground unit
    if (carrier.type === COMMANDER) {
      return carried.every((p) => p.type !== NAVY && p.type !== AIR_FORCE);
    }

    return false;
  }

  canAddToStack(stack: StackData, piece: Piece): boolean {
    // Check if adding this piece would still be valid
    return this.validateStackComposition(stack.carrier, [...stack.carried, piece]);
  }
}
```

### 4. Terrain Module

**Purpose**: Precomputed terrain masks for movement validation

```typescript
class TerrainManager {
  // Terrain bitboards
  private navyMask: Bitboard;
  private landMask: Bitboard;

  constructor() {
    this.navyMask = this.computeNavyMask();
    this.landMask = this.computeLandMask();
  }

  private computeNavyMask(): Bitboard {
    let mask = EMPTY_BB;

    // Navy can operate in files a-c (0-2)
    for (let rank = 0; rank < 12; rank++) {
      for (let file = 0; file < 3; file++) {
        const square = rank * 16 + file;
        mask = setBit(mask, square);
      }
    }

    // Plus specific squares in files d-e at ranks 5-6
    // Rank 5 (index 6), Rank 6 (index 5) - 0-indexed from top
    for (let file = 3; file <= 4; file++) {
      mask = setBit(mask, 5 * 16 + file); // Rank 6
      mask = setBit(mask, 6 * 16 + file); // Rank 5
    }

    return mask;
  }

  private computeLandMask(): Bitboard {
    let mask = EMPTY_BB;

    // Land pieces can operate in files c-k (2-10)
    for (let rank = 0; rank < 12; rank++) {
      for (let file = 2; file < 11; file++) {
        const square = rank * 16 + file;
        mask = setBit(mask, square);
      }
    }

    return mask;
  }

  // Terrain queries
  isNavySquare(square: number): boolean {
    return isSet(this.navyMask, square);
  }

  isLandSquare(square: number): boolean {
    return isSet(this.landMask, square);
  }

  getNavyMask(): Bitboard {
    return this.navyMask;
  }

  getLandMask(): Bitboard {
    return this.landMask;
  }

  // Apply terrain constraints to move targets
  filterByTerrain(targets: Bitboard, pieceType: PieceSymbol): Bitboard {
    if (pieceType === NAVY) {
      return and(targets, this.navyMask);
    } else if (pieceType === AIR_FORCE) {
      // Air Force can move anywhere
      return targets;
    } else {
      // Ground units need land
      return and(targets, this.landMask);
    }
  }
}
```

### 5. Move Generation Module

**Purpose**: Generate moves using bitboard operations

```typescript
// Precomputed attack tables for single-step pieces
interface AttackTables {
  infantry: Bitboard[]; // 132 squares
  commander: Bitboard[]; // 132 squares
  militia: Bitboard[]; // 132 squares
  engineer: Bitboard[]; // 132 squares
}

// Magic bitboard structure for sliding pieces
interface MagicEntry {
  mask: Bitboard; // Relevant occupancy bits
  magic: bigint; // Magic number
  shift: number; // Shift amount
  attacks: Bitboard[]; // Precomputed attack table
}

class MoveGenerator {
  private attackTables: AttackTables;
  private magicTables: Map<number, MagicEntry>;

  constructor(
    private positionManager: PositionManager,
    private stackManager: StackManager,
    private terrainManager: TerrainManager
  ) {
    this.attackTables = this.precomputeAttackTables();
    this.magicTables = this.precomputeMagicTables();
  }

  // Generate all legal moves for current position
  generateMoves(): InternalMove[] {
    const moves: InternalMove[] = [];
    const us = this.positionManager.position.turn;
    const ourPieces = this.positionManager.getColorOccupancy(us);

    // Iterate through our pieces
    let pieces = ourPieces;
    while (popCount(pieces) > 0) {
      const square = lsb(pieces);
      pieces = clearBit(pieces, square);

      const piece = this.positionManager.getPieceAt(square)!;
      const pieceMoves = this.generateMovesForPiece(square, piece);
      moves.push(...pieceMoves);
    }

    return moves;
  }

  // Generate moves for a specific piece
  private generateMovesForPiece(square: number, piece: Piece): InternalMove[] {
    switch (piece.type) {
      case INFANTRY:
        return this.generateInfantryMoves(square, piece);
      case COMMANDER:
        return this.generateCommanderMoves(square, piece);
      case TANK:
        return this.generateTankMoves(square, piece);
      case ARTILLERY:
        return this.generateArtilleryMoves(square, piece);
      // ... other piece types
      default:
        return [];
    }
  }

  // Infantry moves (1 square orthogonal)
  private generateInfantryMoves(square: number, piece: Piece): InternalMove[] {
    const moves: InternalMove[] = [];

    // Get precomputed attack bitboard
    let targets = this.attackTables.infantry[square];

    // Apply terrain constraints
    targets = this.terrainManager.filterByTerrain(targets, INFANTRY);

    // Split into move targets and capture targets
    const empty = this.positionManager.getEmptySquares();
    const enemies = this.positionManager.getColorOccupancy(swapColor(piece.color));
    const friends = this.positionManager.getColorOccupancy(piece.color);

    // Normal moves to empty squares
    let moveTargets = and(targets, empty);
    while (popCount(moveTargets) > 0) {
      const to = lsb(moveTargets);
      moveTargets = clearBit(moveTargets, to);
      moves.push({
        color: piece.color,
        from: square,
        to,
        piece,
        flags: BITS.NORMAL
      });
    }

    // Captures
    let captureTargets = and(targets, enemies);
    while (popCount(captureTargets) > 0) {
      const to = lsb(captureTargets);
      captureTargets = clearBit(captureTargets, to);
      const captured = this.positionManager.getPieceAt(to);
      moves.push({
        color: piece.color,
        from: square,
        to,
        piece,
        captured,
        flags: BITS.CAPTURE
      });
    }

    // Combinations with friendly pieces
    let combineTargets = and(targets, friends);
    while (popCount(combineTargets) > 0) {
      const to = lsb(combineTargets);
      combineTargets = clearBit(combineTargets, to);
      const targetPiece = this.positionManager.getPieceAt(to);

      // Check if combination is valid
      if (this.canCombine(piece, targetPiece!)) {
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

  // Tank moves (2 squares orthogonal, can shoot over blocking)
  private generateTankMoves(square: number, piece: Piece): InternalMove[] {
    const moves: InternalMove[] = [];
    const occupied = this.positionManager.getOccupied();

    // Get sliding attacks using magic bitboards
    let targets = this.getSlidingAttacks(square, occupied, 2);

    // Apply terrain constraints
    targets = this.terrainManager.filterByTerrain(targets, TANK);

    // For Tank, we need special handling for shoot-over-blocking
    // Generate moves considering blocking pieces
    const empty = this.positionManager.getEmptySquares();
    const enemies = this.positionManager.getColorOccupancy(swapColor(piece.color));

    // Movement: can't move through pieces
    let moveTargets = this.getTankMoveTargets(square, occupied, empty);
    while (popCount(moveTargets) > 0) {
      const to = lsb(moveTargets);
      moveTargets = clearBit(moveTargets, to);
      moves.push({
        color: piece.color,
        from: square,
        to,
        piece,
        flags: BITS.NORMAL
      });
    }

    // Captures: can shoot over one blocking piece
    let captureTargets = this.getTankCaptureTargets(square, occupied, enemies);
    while (popCount(captureTargets) > 0) {
      const to = lsb(captureTargets);
      captureTargets = clearBit(captureTargets, to);
      const captured = this.positionManager.getPieceAt(to);
      moves.push({
        color: piece.color,
        from: square,
        to,
        piece,
        captured,
        flags: BITS.CAPTURE
      });
    }

    return moves;
  }

  // Helper: Get sliding attacks using magic bitboards
  private getSlidingAttacks(square: number, occupied: Bitboard, maxDistance: number): Bitboard {
    const magic = this.magicTables.get(square);
    if (!magic) return EMPTY_BB;

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

  private canCombine(piece1: Piece, piece2: Piece): boolean {
    // Check if pieces can combine based on CoTuLenh rules
    // This would use the stack validation logic
    return this.stackManager.validateStackComposition(piece1, [piece2]);
  }
}
```

### 6. Air Defense Manager Module

**Purpose**: Calculate and manage air defense zones using bitboards

```typescript
interface AirDefenseZones {
  red: Bitboard; // Squares protected by red air defense
  blue: Bitboard; // Squares protected by blue air defense
}

class AirDefenseManager {
  private zones: AirDefenseZones;

  constructor(
    private positionManager: PositionManager,
    private stackManager: StackManager
  ) {
    this.zones = { red: EMPTY_BB, blue: EMPTY_BB };
    this.recalculateZones();
  }

  // Recalculate all air defense zones
  recalculateZones(): void {
    this.zones.red = this.calculateZoneForColor(RED);
    this.zones.blue = this.calculateZoneForColor(BLUE);
  }

  // Calculate air defense zone for one color
  private calculateZoneForColor(color: Color): Bitboard {
    let zone = EMPTY_BB;

    // Get all air defense pieces for this color
    const colorPieces = this.positionManager.getColorOccupancy(color);
    const antiAir = and(this.positionManager.position.antiAir, colorPieces);
    const missiles = and(this.positionManager.position.missiles, colorPieces);

    // Add zones from Anti-Air pieces (3-square orthogonal range)
    let aapieces = antiAir;
    while (popCount(aapieces) > 0) {
      const square = lsb(aapieces);
      aapieces = clearBit(aapieces, square);

      const influence = this.getAirDefenseInfluence(square, 3);
      zone = or(zone, influence);
    }

    // Add zones from Missile pieces (4-square orthogonal range)
    let missilePieces = missiles;
    while (popCount(missilePieces) > 0) {
      const square = lsb(missilePieces);
      missilePieces = clearBit(missilePieces, square);

      const influence = this.getAirDefenseInfluence(square, 4);
      zone = or(zone, influence);
    }

    // Check stacks for air defense pieces
    const carriers = this.stackManager.getCarrierBitboard();
    let carrierSquares = and(carriers, colorPieces);
    while (popCount(carrierSquares) > 0) {
      const square = lsb(carrierSquares);
      carrierSquares = clearBit(carrierSquares, square);

      const stack = this.stackManager.getStack(square);
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
    let influence = EMPTY_BB;

    // Orthogonal directions
    const offsets = [-16, 1, 16, -1]; // N, E, S, W

    for (const offset of offsets) {
      let current = square;
      for (let dist = 1; dist <= range; dist++) {
        current += offset;

        // Check if still on board
        if (!isSquareOnBoard(current)) break;

        // Add to influence
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

  // Update after piece movement
  updateAfterMove(move: InternalMove): void {
    // Check if move involved air defense pieces
    const affectsAirDefense =
      move.piece.type === ANTI_AIR ||
      move.piece.type === MISSILE ||
      (move.captured && (move.captured.type === ANTI_AIR || move.captured.type === MISSILE));

    if (affectsAirDefense) {
      this.recalculateZones();
    }
  }
}
```

### 7. Deploy Manager Module

**Purpose**: Handle deploy sessions and recombine moves

```typescript
interface DeploySessionState {
  stackSquare: number;
  originalStack: StackData;
  deployedPieces: Map<PieceSymbol, number>; // piece type -> square deployed to
  remainingPieces: Piece[];
  turn: Color;
  startFEN: string;
}

class DeployManager {
  private activeSession: DeploySessionState | null = null;

  constructor(
    private positionManager: PositionManager,
    private stackManager: StackManager,
    private moveGenerator: MoveGenerator
  ) {}

  // Start deploy session
  startSession(stackSquare: number): void {
    const stack = this.stackManager.getStack(stackSquare);
    if (!stack) {
      throw new Error(`No stack at square ${stackSquare}`);
    }

    this.activeSession = {
      stackSquare,
      originalStack: stack,
      deployedPieces: new Map(),
      remainingPieces: [...stack.carried],
      turn: stack.carrier.color,
      startFEN: this.positionManager.toFEN()
    };
  }

  // Generate deploy moves during active session
  generateDeployMoves(): InternalMove[] {
    if (!this.activeSession) return [];

    const moves: InternalMove[] = [];
    const { stackSquare, remainingPieces } = this.activeSession;

    // Generate moves for each remaining piece
    for (const piece of remainingPieces) {
      const pieceMoves = this.generateDeployMovesForPiece(stackSquare, piece);
      moves.push(...pieceMoves);
    }

    // Generate recombine moves
    const recombineMoves = this.generateRecombineMoves();
    moves.push(...recombineMoves);

    return moves;
  }

  // Generate recombine moves
  private generateRecombineMoves(): InternalMove[] {
    if (!this.activeSession) return [];

    const moves: InternalMove[] = [];
    const { stackSquare, deployedPieces, remainingPieces } = this.activeSession;

    // For each remaining piece, check if it can recombine with deployed pieces
    for (const piece of remainingPieces) {
      for (const [deployedType, deployedSquare] of deployedPieces) {
        // Check if recombine is valid
        if (this.canRecombine(piece, deployedSquare)) {
          moves.push({
            color: piece.color,
            from: stackSquare,
            to: deployedSquare,
            piece,
            flags: BITS.DEPLOY | BITS.COMBINATION
          });
        }
      }
    }

    return moves;
  }

  // Execute deploy move
  executeDeployMove(move: InternalMove): void {
    if (!this.activeSession) {
      throw new Error('No active deploy session');
    }

    // Remove piece from remaining
    const index = this.activeSession.remainingPieces.findIndex((p) => p.type === move.piece.type);
    if (index === -1) {
      throw new Error('Piece not in remaining pieces');
    }

    this.activeSession.remainingPieces.splice(index, 1);

    // Track deployed piece
    this.activeSession.deployedPieces.set(move.piece.type, move.to);

    // Check if session is complete
    if (this.activeSession.remainingPieces.length === 0) {
      this.completeSession();
    }
  }

  // Complete deploy session
  private completeSession(): void {
    // Clean up session state
    this.activeSession = null;
  }
}
```

## Data Models

### Bitboard Position State

```typescript
interface BitboardGameState {
  // Position
  position: BitboardPosition;

  // Stacks
  stacks: Map<number, StackData>;
  carrierBitboard: Bitboard;

  // Air Defense
  airDefenseZones: AirDefenseZones;

  // Deploy Session
  deploySession: DeploySessionState | null;

  // Game State
  turn: Color;
  halfMoves: number;
  moveNumber: number;

  // Position Hash
  zobristHash: bigint;

  // History
  history: BitboardHistoryEntry[];
}

interface BitboardHistoryEntry {
  // Move data
  move: InternalMove;

  // State snapshots
  position: BitboardPosition;
  stacks: Map<number, StackData>;
  airDefenseZones: AirDefenseZones;
  deploySession: DeploySessionState | null;

  // Game state
  turn: Color;
  halfMoves: number;
  moveNumber: number;
  zobristHash: bigint;
}
```

### Move Representation

```typescript
// Internal move remains the same
interface InternalMove {
  color: Color;
  from: number;
  to: number;
  piece: Piece;
  captured?: Piece;
  combined?: Piece;
  flags: number;
}

// Bitboard-specific move generation context
interface MoveGenContext {
  position: BitboardPosition;
  stacks: StackManager;
  terrain: TerrainManager;
  airDefense: AirDefenseManager;
  deploySession: DeploySessionState | null;
}
```

## Error Handling

### Validation Strategy

```typescript
class BitboardValidator {
  // Validate position consistency
  validatePosition(state: BitboardGameState): ValidationResult {
    const errors: string[] = [];

    // Check bitboard consistency
    if (!this.checkBitboardConsistency(state.position)) {
      errors.push('Bitboard inconsistency detected');
    }

    // Check stack consistency
    if (!this.checkStackConsistency(state)) {
      errors.push('Stack inconsistency detected');
    }

    // Check commander positions
    if (!this.checkCommanderPositions(state.position)) {
      errors.push('Commander position invalid');
    }

    return { valid: errors.length === 0, errors };
  }

  private checkBitboardConsistency(position: BitboardPosition): boolean {
    // Verify occupancy matches piece bitboards
    let computedOccupancy = EMPTY_BB;
    computedOccupancy = or(computedOccupancy, position.commanders);
    computedOccupancy = or(computedOccupancy, position.infantry);
    // ... add all piece types

    return equals(computedOccupancy, position.occupied);
  }

  private checkStackConsistency(state: BitboardGameState): boolean {
    // Verify carrier bitboard matches stack map
    for (const [square, stack] of state.stacks) {
      if (!isSet(state.carrierBitboard, square)) {
        return false;
      }
    }
    return true;
  }
}
```

## Testing Strategy

### Unit Testing Approach

```typescript
describe('BitboardPosition', () => {
  it('should maintain consistency when placing pieces', () => {
    const position = new PositionManager();
    const piece: Piece = { type: INFANTRY, color: RED };

    position.placePiece(piece, 0x50); // e7

    expect(isSet(position.position.infantry, 0x50)).toBe(true);
    expect(isSet(position.position.red, 0x50)).toBe(true);
    expect(isSet(position.position.occupied, 0x50)).toBe(true);
  });

  it('should generate same moves as 0x88 implementation', () => {
    const bitboardGame = new BitboardCoTuLenh();
    const classicGame = new CoTuLenh();

    // Load same position
    const fen = DEFAULT_POSITION;
    bitboardGame.load(fen);
    classicGame.load(fen);

    // Generate moves
    const bitboardMoves = bitboardGame.moves().sort();
    const classicMoves = classicGame.moves().sort();

    expect(bitboardMoves).toEqual(classicMoves);
  });
});
```

### Integration Testing

```typescript
describe('Complete Game Flow', () => {
  it('should handle deploy session correctly', () => {
    const game = new BitboardCoTuLenh();

    // Set up stack
    game.put(
      {
        type: NAVY,
        color: RED,
        carrying: [
          { type: AIR_FORCE, color: RED },
          { type: TANK, color: RED }
        ]
      },
      'c3'
    );

    // Execute deploy sequence
    game.move({ from: 'c3', to: 'a3', piece: NAVY, deploy: true });
    game.move({ from: 'c3', to: 'c5', piece: AIR_FORCE, deploy: true });
    game.move({ from: 'c3', to: 'd3', piece: TANK, deploy: true });

    // Verify final state
    expect(game.get('a3')?.type).toBe(NAVY);
    expect(game.get('c5')?.type).toBe(AIR_FORCE);
    expect(game.get('d3')?.type).toBe(TANK);
    expect(game.get('c3')).toBeUndefined();
  });
});
```

### Performance Benchmarking

```typescript
describe('Performance Benchmarks', () => {
  it('should generate moves 2.5x faster than 0x88', () => {
    const bitboardGame = new BitboardCoTuLenh();
    const classicGame = new CoTuLenh();

    const fen = COMPLEX_POSITION_FEN;
    bitboardGame.load(fen);
    classicGame.load(fen);

    // Benchmark bitboard
    const bitboardStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      bitboardGame.moves();
    }
    const bitboardTime = performance.now() - bitboardStart;

    // Benchmark classic
    const classicStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      classicGame.moves();
    }
    const classicTime = performance.now() - classicStart;

    const speedup = classicTime / bitboardTime;
    expect(speedup).toBeGreaterThan(2.5);
  });
});
```

## Development Path for Independent Package

### Phase 1: Package Setup and Foundation (2-3 weeks)

- Create `packages/cotulenh-bitboard` package
- Set up TypeScript configuration
- Set up testing framework (Vitest)
- Implement core bitboard operations
- Implement position manager
- Implement terrain manager
- Unit tests for core components

### Phase 2: FEN and Basic API (2-3 weeks)

- Implement FEN parser
- Implement FEN generator
- Implement basic CoTuLenh API methods (get, put, remove, fen, load)
- Compatibility tests against cotulenh-core
- Validate FEN round-trip

### Phase 3: Basic Move Generation (3-4 weeks)

- Implement attack pattern tables
- Implement move generation for simple pieces (Infantry, Commander, Militia, Engineer)
- Implement commander safety checking
- Implement basic move validation
- Integration tests for move generation
- Compatibility tests for simple piece moves

### Phase 4: Sliding Pieces with Magic Bitboards (3-4 weeks)

- Implement magic bitboard generation algorithm
- Generate and validate magic numbers for all squares
- Implement sliding piece move generation (Tank, Artillery, Anti-Air, Missile)
- Handle Tank's shoot-over-blocking rule
- Performance benchmarking vs cotulenh-core
- Compatibility tests for sliding piece moves

### Phase 5: Air Defense System (2-3 weeks)

- Implement air defense zone calculation
- Integrate with move generation (filter Air Force moves)
- Handle air defense for stacked pieces
- Test all air defense scenarios
- Compatibility tests for air defense

### Phase 6: Stack System (6-8 weeks)

- Implement stack manager with hybrid approach
- Implement stack validation rules
- Implement combination move generation
- Handle stack movement and terrain constraints
- Test all stack combinations
- Compatibility tests for stack operations

### Phase 7: Deploy System (4-5 weeks)

- Implement deploy session manager
- Implement deploy move generation
- Implement recombine move generation
- Handle deploy session lifecycle
- Test all deploy scenarios
- Compatibility tests for deploy mechanics

### Phase 8: Heroic Status and Hashing (2-3 weeks)

- Implement heroic status tracking
- Implement Zobrist hashing
- Implement position comparison
- Implement threefold repetition detection
- Test heroic mechanics
- Compatibility tests

### Phase 9: Complete API Implementation (2-3 weeks)

- Implement remaining API methods (history, undo, moves with options)
- Implement move notation (SAN, LAN)
- Implement game end detection
- Full API compatibility tests
- Integration tests for complete game flow

### Phase 10: Optimization and Production (2-3 weeks)

- Performance profiling and optimization
- Memory optimization
- Cache strategy implementation
- Comprehensive benchmarking
- Documentation
- Production readiness

**Total Estimated Timeline**: 28-39 weeks (7-10 months)

### Migration Strategy for Users

**Step 1: Install Package**

```bash
pnpm add @repo/cotulenh-bitboard
```

**Step 2: Change Import**

```typescript
// Before
import { CoTuLenh } from '@repo/cotulenh-core';

// After
import { CoTuLenh } from '@repo/cotulenh-bitboard';
```

**Step 3: Verify Behavior**

- Run existing tests
- Compare move generation
- Validate game outcomes

**Benefits**:

- Zero code changes required (same API)
- Can run both implementations side-by-side for validation
- Easy rollback if issues found
- Gradual adoption possible

## Conclusion

This design provides a comprehensive blueprint for implementing CoTuLenh as an **independent bitboard-based package**. This approach offers maximum flexibility and performance while maintaining API compatibility with the existing implementation.

### Key Design Decisions

1. **Independent Package**: `@repo/cotulenh-bitboard` developed separately from `cotulenh-core`
2. **128-bit Bitboards**: Efficient representation for 11×12 board (132 squares)
3. **Hybrid Stack System**: Bitboards for carriers + map for stack data
4. **Magic Bitboards**: Fast sliding piece move generation
5. **Precomputed Tables**: Attack patterns and terrain masks
6. **API Compatibility**: Drop-in replacement for cotulenh-core
7. **Clean Architecture**: No legacy constraints, optimal design from scratch

### Advantages of Independent Package Approach

**Development Benefits**:

- Build optimal architecture without legacy constraints
- Develop and test independently
- No risk of breaking existing code
- Parallel development possible

**Testing Benefits**:

- Direct comparison against cotulenh-core
- Compatibility test suite validates API parity
- Performance benchmarks show improvements
- Easy to validate correctness

**Migration Benefits**:

- Users change one import statement
- Can run both implementations side-by-side
- Easy rollback if issues found
- Gradual adoption possible

**Performance Benefits**:

- Optimize without backward compatibility concerns
- Use modern JavaScript/TypeScript features
- Focus on performance from day one
- No technical debt from legacy code

### Next Steps

1. **Review Requirements**: Ensure all requirements are captured
2. **Review Design**: Validate architectural decisions
3. **Create Implementation Plan**: Break down into concrete tasks
4. **Set Up Package**: Initialize cotulenh-bitboard package
5. **Begin Phase 1**: Implement core bitboard operations

See **CRITICAL_GAPS.md** for detailed analysis of missing components that must be addressed during implementation. These gaps represent the research and specification work needed before coding can begin.
