# Bitboard Architecture Design for CoTuLenh

## Overview

This document outlines a comprehensive bitboard architecture design specifically
adapted for CoTuLenh's unique mechanics. Unlike standard chess engines that work
with 8×8 boards and 6 piece types, CoTuLenh requires specialized bitboard
techniques to handle its 11×12 board, 11 piece types, terrain zones, stack
system, and air defense mechanics.

## Core Bitboard Design Principles

### Board Representation Strategy

**Primary Approach: 128-bit Bitboards**

- Use two 64-bit integers per bitboard to represent 11×12 board (132 squares)
- Efficient bit manipulation with standard 64-bit operations
- Natural alignment with modern CPU architectures

```typescript
// Core bitboard structure
type Bitboard = {
  low: bigint // Squares 0-63 (ranks 1-4, partial rank 5)
  high: bigint // Squares 64-131 (partial rank 5-12)
}

// Square mapping for 11×12 board
// Rank 12: squares 0-10    (high bitboard, bits 0-10)
// Rank 11: squares 11-21   (high bitboard, bits 11-21)
// ...
// Rank 5:  squares 88-98   (split between high/low)
// Rank 4:  squares 99-109  (low bitboard, bits 35-45)
// ...
// Rank 1:  squares 121-131 (low bitboard, bits 57-67)
```

**Alternative Approach: Single 256-bit Representation**

- Use BigInt for full 256-bit representation
- Simpler indexing but potentially slower operations
- Better for languages with native big integer support

### Piece Representation

**Piece Bitboards (22 total)**

```typescript
interface PieceBitboards {
  // Red pieces (11 types)
  redCommander: Bitboard
  redInfantry: Bitboard
  redTank: Bitboard
  redMilitia: Bitboard
  redEngineer: Bitboard
  redArtillery: Bitboard
  redAntiAir: Bitboard
  redMissile: Bitboard
  redAirForce: Bitboard
  redNavy: Bitboard
  redHeadquarter: Bitboard

  // Blue pieces (11 types)
  blueCommander: Bitboard
  blueInfantry: Bitboard
  blueTank: Bitboard
  blueMilitia: Bitboard
  blueEngineer: Bitboard
  blueArtillery: Bitboard
  blueAntiAir: Bitboard
  blueMissile: Bitboard
  blueAirForce: Bitboard
  blueNavy: Bitboard
  blueHeadquarter: Bitboard
}
```

**Occupancy Bitboards**

```typescript
interface OccupancyBitboards {
  redPieces: Bitboard // All red pieces
  bluePieces: Bitboard // All blue pieces
  allPieces: Bitboard // All occupied squares
  emptySquares: Bitboard // All empty squares
}
```

### Terrain Representation

**Terrain Bitboards**

```typescript
interface TerrainBitboards {
  waterSquares: Bitboard // Pure water (a-b files)
  landSquares: Bitboard // Pure land (c-k files)
  mixedSquares: Bitboard // Mixed zones (d6,e6,d7,e7 + bridges)
  bridgeSquares: Bitboard // Bridge squares (f6,f7,h6,h7)

  // Derived masks
  navyMask: Bitboard // waterSquares | mixedSquares
  landMask: Bitboard // landSquares | mixedSquares
  heavyZoneUpper: Bitboard // Upper half for heavy pieces
  heavyZoneLower: Bitboard // Lower half for heavy pieces
}
```

**Terrain Mask Generation**

```typescript
function generateTerrainMasks(): TerrainBitboards {
  const terrain: TerrainBitboards = {
    waterSquares: createEmptyBitboard(),
    landSquares: createEmptyBitboard(),
    mixedSquares: createEmptyBitboard(),
    bridgeSquares: createEmptyBitboard(),
    navyMask: createEmptyBitboard(),
    landMask: createEmptyBitboard(),
    heavyZoneUpper: createEmptyBitboard(),
    heavyZoneLower: createEmptyBitboard(),
  }

  // Generate water squares (a-b files)
  for (let rank = 0; rank < 12; rank++) {
    for (let file = 0; file < 2; file++) {
      const square = rank * 11 + file
      setBit(terrain.waterSquares, square)
    }
  }

  // Generate land squares (c-k files)
  for (let rank = 0; rank < 12; rank++) {
    for (let file = 2; file < 11; file++) {
      const square = rank * 11 + file
      setBit(terrain.landSquares, square)
    }
  }

  // Generate mixed zones and bridges
  const mixedSquares = ['d6', 'e6', 'd7', 'e7']
  const bridgeSquares = ['f6', 'f7', 'h6', 'h7']

  for (const square of mixedSquares) {
    setBit(terrain.mixedSquares, algebraicToSquareIndex(square))
  }

  for (const square of bridgeSquares) {
    setBit(terrain.bridgeSquares, algebraicToSquareIndex(square))
    setBit(terrain.mixedSquares, algebraicToSquareIndex(square))
  }

  // Generate derived masks
  terrain.navyMask = bitwiseOr(terrain.waterSquares, terrain.mixedSquares)
  terrain.landMask = bitwiseOr(terrain.landSquares, terrain.mixedSquares)

  return terrain
}
```

## Bitboard Operations for 11×12 Board

### Basic Bitboard Operations

**Core Operations**

```typescript
// Set bit at square
function setBit(bitboard: Bitboard, square: number): void {
  if (square < 64) {
    bitboard.low |= 1n << BigInt(square)
  } else {
    bitboard.high |= 1n << BigInt(square - 64)
  }
}

// Clear bit at square
function clearBit(bitboard: Bitboard, square: number): void {
  if (square < 64) {
    bitboard.low &= ~(1n << BigInt(square))
  } else {
    bitboard.high &= ~(1n << BigInt(square - 64))
  }
}

// Test bit at square
function testBit(bitboard: Bitboard, square: number): boolean {
  if (square < 64) {
    return (bitboard.low & (1n << BigInt(square))) !== 0n
  } else {
    return (bitboard.high & (1n << BigInt(square - 64))) !== 0n
  }
}

// Count set bits (population count)
function popCount(bitboard: Bitboard): number {
  return countBits(bitboard.low) + countBits(bitboard.high)
}

// Find first set bit (least significant bit)
function findFirstBit(bitboard: Bitboard): number {
  if (bitboard.low !== 0n) {
    return findLSB(bitboard.low)
  } else if (bitboard.high !== 0n) {
    return findLSB(bitboard.high) + 64
  }
  return -1 // No bits set
}
```

**Bitwise Operations**

```typescript
function bitwiseAnd(a: Bitboard, b: Bitboard): Bitboard {
  return {
    low: a.low & b.low,
    high: a.high & b.high,
  }
}

function bitwiseOr(a: Bitboard, b: Bitboard): Bitboard {
  return {
    low: a.low | b.low,
    high: a.high | b.high,
  }
}

function bitwiseXor(a: Bitboard, b: Bitboard): Bitboard {
  return {
    low: a.low ^ b.low,
    high: a.high ^ b.high,
  }
}

function bitwiseNot(bitboard: Bitboard): Bitboard {
  return {
    low: ~bitboard.low & VALID_SQUARES_LOW_MASK,
    high: ~bitboard.high & VALID_SQUARES_HIGH_MASK,
  }
}
```

### Movement Pattern Generation

**Directional Shifts for 11×12 Board**

```typescript
// Direction vectors for 11×12 board
const NORTH = -11 // Up one rank
const SOUTH = 11 // Down one rank
const EAST = 1 // Right one file
const WEST = -1 // Left one file
const NORTHEAST = -10 // Up one rank, right one file
const NORTHWEST = -12 // Up one rank, left one file
const SOUTHEAST = 12 // Down one rank, right one file
const SOUTHWEST = 10 // Down one rank, left one file

// Shift bitboard in direction
function shiftBitboard(bitboard: Bitboard, direction: number): Bitboard {
  if (direction > 0) {
    return shiftRight(bitboard, direction)
  } else {
    return shiftLeft(bitboard, -direction)
  }
}

// Generate attack patterns for piece types
function generateOrthogonalAttacks(
  square: number,
  occupied: Bitboard,
): Bitboard {
  let attacks = createEmptyBitboard()

  // North ray
  attacks = bitwiseOr(attacks, generateRayAttacks(square, NORTH, occupied))
  // South ray
  attacks = bitwiseOr(attacks, generateRayAttacks(square, SOUTH, occupied))
  // East ray
  attacks = bitwiseOr(attacks, generateRayAttacks(square, EAST, occupied))
  // West ray
  attacks = bitwiseOr(attacks, generateRayAttacks(square, WEST, occupied))

  return attacks
}

function generateDiagonalAttacks(square: number, occupied: Bitboard): Bitboard {
  let attacks = createEmptyBitboard()

  // Diagonal rays
  attacks = bitwiseOr(attacks, generateRayAttacks(square, NORTHEAST, occupied))
  attacks = bitwiseOr(attacks, generateRayAttacks(square, NORTHWEST, occupied))
  attacks = bitwiseOr(attacks, generateRayAttacks(square, SOUTHEAST, occupied))
  attacks = bitwiseOr(attacks, generateRayAttacks(square, SOUTHWEST, occupied))

  return attacks
}
```

## Move Generation with Bitboards

### Piece-Specific Move Generation

**Infantry/Engineer Move Generation**

```typescript
function generateInfantryMoves(
  square: number,
  friendlyPieces: Bitboard,
  enemyPieces: Bitboard,
  terrain: TerrainBitboards,
): Bitboard {
  // Infantry moves 1 square orthogonally
  let moves = createEmptyBitboard()

  const directions = [NORTH, SOUTH, EAST, WEST]
  for (const direction of directions) {
    const targetSquare = square + direction
    if (isValidSquare(targetSquare)) {
      setBit(moves, targetSquare)
    }
  }

  // Remove friendly pieces and invalid terrain
  moves = bitwiseAnd(moves, bitwiseNot(friendlyPieces))
  moves = bitwiseAnd(moves, terrain.landMask) // Infantry on land only

  return moves
}
```

**Tank Move Generation with Shoot-Over-Blocking**

```typescript
function generateTankMoves(
  square: number,
  friendlyPieces: Bitboard,
  enemyPieces: Bitboard,
  allPieces: Bitboard,
  terrain: TerrainBitboards,
): { moves: Bitboard; captures: Bitboard } {
  let moves = createEmptyBitboard()
  let captures = createEmptyBitboard()

  const directions = [NORTH, SOUTH, EAST, WEST]

  for (const direction of directions) {
    // Normal movement (range 2, blocked by pieces)
    for (let range = 1; range <= 2; range++) {
      const targetSquare = square + direction * range
      if (!isValidSquare(targetSquare)) break

      if (testBit(allPieces, targetSquare)) {
        // Square occupied - can't move here but might capture
        if (testBit(enemyPieces, targetSquare)) {
          setBit(captures, targetSquare)
        }
        break // Movement blocked
      } else {
        // Empty square - can move here
        setBit(moves, targetSquare)
      }
    }

    // Special tank rule: can capture through blocking pieces
    for (let range = 1; range <= 2; range++) {
      const targetSquare = square + direction * range
      if (!isValidSquare(targetSquare)) break

      if (testBit(enemyPieces, targetSquare)) {
        setBit(captures, targetSquare) // Can capture regardless of blocking
      }
    }
  }

  // Apply terrain restrictions
  moves = bitwiseAnd(moves, terrain.landMask)
  captures = bitwiseAnd(captures, terrain.landMask)

  return { moves, captures }
}
```

**Air Force Move Generation with Air Defense**

```typescript
function generateAirForceMoves(
  square: number,
  friendlyPieces: Bitboard,
  enemyPieces: Bitboard,
  airDefenseZones: Bitboard,
  terrain: TerrainBitboards,
): { moves: Bitboard; captures: Bitboard; suicideCaptures: Bitboard } {
  let moves = createEmptyBitboard()
  let captures = createEmptyBitboard()
  let suicideCaptures = createEmptyBitboard()

  // Air Force moves up to 4 squares in any direction, ignores piece blocking
  const directions = [
    NORTH,
    SOUTH,
    EAST,
    WEST,
    NORTHEAST,
    NORTHWEST,
    SOUTHEAST,
    SOUTHWEST,
  ]

  for (const direction of directions) {
    for (let range = 1; range <= 4; range++) {
      const targetSquare = square + direction * range
      if (!isValidSquare(targetSquare)) break

      if (testBit(friendlyPieces, targetSquare)) {
        continue // Can't capture friendly pieces
      }

      if (testBit(enemyPieces, targetSquare)) {
        if (testBit(airDefenseZones, targetSquare)) {
          setBit(suicideCaptures, targetSquare) // Kamikaze attack in air defense zone
        } else {
          setBit(captures, targetSquare) // Normal capture
        }
      } else {
        // Empty square
        if (!testBit(airDefenseZones, targetSquare)) {
          setBit(moves, targetSquare) // Can only move to undefended squares
        }
      }
    }
  }

  // Air Force can move on any terrain
  return { moves, captures, suicideCaptures }
}
```

### Commander Special Rules

**Commander vs Commander Detection**

```typescript
function generateCommanderMoves(
  square: number,
  friendlyPieces: Bitboard,
  enemyPieces: Bitboard,
  enemyCommanderSquare: number,
  terrain: TerrainBitboards,
): { moves: Bitboard; captures: Bitboard } {
  let moves = createEmptyBitboard()
  let captures = createEmptyBitboard()

  // Commander moves unlimited orthogonally but captures only adjacent
  const directions = [NORTH, SOUTH, EAST, WEST]

  for (const direction of directions) {
    let blocked = false

    for (let range = 1; range <= 11; range++) {
      // Max board dimension
      const targetSquare = square + direction * range
      if (!isValidSquare(targetSquare)) break

      if (testBit(friendlyPieces, targetSquare)) {
        blocked = true
        break
      }

      if (testBit(enemyPieces, targetSquare)) {
        // Special rule: Commander vs Commander
        if (targetSquare === enemyCommanderSquare) {
          setBit(captures, targetSquare) // Can capture enemy commander at any range
          break
        } else if (range === 1) {
          setBit(captures, targetSquare) // Normal adjacent capture
        }
        blocked = true
        break
      }

      // Empty square
      if (!blocked) {
        // Can't move past where enemy commander would be captured
        if (enemyCommanderSquare !== -1) {
          const commanderDirection = getDirection(square, enemyCommanderSquare)
          if (
            commanderDirection === direction &&
            isSquareBetween(square, targetSquare, enemyCommanderSquare)
          ) {
            break // Can't slide past enemy commander
          }
        }
        setBit(moves, targetSquare)
      }
    }
  }

  // Apply terrain restrictions
  moves = bitwiseAnd(moves, terrain.landMask)
  captures = bitwiseAnd(captures, terrain.landMask)

  return { moves, captures }
}
```

## Air Defense Zone Calculations

### Bitboard-Based Air Defense

**Air Defense Zone Generation**

```typescript
function generateAirDefenseZones(
  antiAirSquares: Bitboard,
  missileSquares: Bitboard,
  navySquares: Bitboard,
  heroicPieces: Bitboard,
): Bitboard {
  let airDefenseZones = createEmptyBitboard()

  // Process Anti-Air pieces (level 1, heroic level 2)
  let square = -1
  let tempAntiAir = { ...antiAirSquares }
  while ((square = findFirstBit(tempAntiAir)) !== -1) {
    clearBit(tempAntiAir, square)

    const isHeroic = testBit(heroicPieces, square)
    const defenseLevel = isHeroic ? 2 : 1
    const zoneSquares = generateCircularZone(square, defenseLevel)

    airDefenseZones = bitwiseOr(airDefenseZones, zoneSquares)
  }

  // Process Missile pieces (level 2, heroic level 3)
  square = -1
  let tempMissiles = { ...missileSquares }
  while ((square = findFirstBit(tempMissiles)) !== -1) {
    clearBit(tempMissiles, square)

    const isHeroic = testBit(heroicPieces, square)
    const defenseLevel = isHeroic ? 3 : 2
    const zoneSquares = generateCircularZone(square, defenseLevel)

    airDefenseZones = bitwiseOr(airDefenseZones, zoneSquares)
  }

  // Process Navy pieces (level 1)
  square = -1
  let tempNavy = { ...navySquares }
  while ((square = findFirstBit(tempNavy)) !== -1) {
    clearBit(tempNavy, square)

    const defenseLevel = 1 // Navy doesn't get heroic air defense bonus
    const zoneSquares = generateCircularZone(square, defenseLevel)

    airDefenseZones = bitwiseOr(airDefenseZones, zoneSquares)
  }

  return airDefenseZones
}

function generateCircularZone(centerSquare: number, radius: number): Bitboard {
  let zone = createEmptyBitboard()

  const centerFile = centerSquare % 11
  const centerRank = Math.floor(centerSquare / 11)

  for (let dr = -radius; dr <= radius; dr++) {
    for (let df = -radius; df <= radius; df++) {
      if (dr * dr + df * df <= radius * radius) {
        const targetRank = centerRank + dr
        const targetFile = centerFile + df

        if (
          targetRank >= 0 &&
          targetRank < 12 &&
          targetFile >= 0 &&
          targetFile < 11
        ) {
          const targetSquare = targetRank * 11 + targetFile
          setBit(zone, targetSquare)
        }
      }
    }
  }

  return zone
}
```

## Heroic Status Tracking

### Heroic Bitboard Management

**Heroic Status Representation**

```typescript
interface HeroicBitboards {
  heroicPieces: Bitboard // All pieces with heroic status
  heroicByType: {
    // Heroic pieces by type for quick lookup
    commander: Bitboard
    infantry: Bitboard
    tank: Bitboard
    militia: Bitboard
    engineer: Bitboard
    artillery: Bitboard
    antiAir: Bitboard
    missile: Bitboard
    airForce: Bitboard
    navy: Bitboard
    headquarter: Bitboard
  }
}

function updateHeroicStatus(
  position: BitboardPosition,
  attackingSquare: number,
  commanderSquares: { red: number; blue: number },
): void {
  const attackingPiece = getPieceAt(position, attackingSquare)
  if (!attackingPiece) return

  const enemyCommanderSquare =
    attackingPiece.color === 'red'
      ? commanderSquares.blue
      : commanderSquares.red

  if (enemyCommanderSquare !== -1) {
    // Check if attacking piece threatens enemy commander
    const attacks = generateAttacksForPiece(
      attackingSquare,
      attackingPiece,
      position,
    )
    if (testBit(attacks, enemyCommanderSquare)) {
      // Grant heroic status
      setBit(position.heroic.heroicPieces, attackingSquare)
      setBit(position.heroic.heroicByType[attackingPiece.type], attackingSquare)
    }
  }
}
```

## Stack System Challenges

### Hybrid Approach for Stacks

The stack system presents the biggest challenge for pure bitboard
implementation. A hybrid approach is recommended:

**Stack Representation Strategy**

```typescript
interface HybridStackSystem {
  // Bitboards for piece positions (carriers only)
  pieceBitboards: PieceBitboards

  // Separate data structure for stack contents
  stackContents: Map<number, StackInfo>

  // Quick lookup for squares with stacks
  stackSquares: Bitboard
}

interface StackInfo {
  carrier: PieceType
  carried: PieceType[]
  color: Color
  heroicStatus: boolean[] // Heroic status for each piece in stack
}

// Example usage
function getPieceAt(
  position: HybridStackSystem,
  square: number,
): PieceInfo | null {
  // First check if square has any piece
  if (!testBit(position.stackSquares, square)) {
    return null
  }

  // Get stack information
  const stackInfo = position.stackContents.get(square)
  if (!stackInfo) return null

  return {
    carrier: stackInfo.carrier,
    carried: stackInfo.carried,
    color: stackInfo.color,
    heroicStatus: stackInfo.heroicStatus,
  }
}
```

**Stack Move Generation**

```typescript
function generateStackMoves(
  position: HybridStackSystem,
  square: number,
): Move[] {
  const stackInfo = position.stackContents.get(square)
  if (!stackInfo) return []

  const moves: Move[] = []

  // Generate moves for carrier
  const carrierMoves = generateMovesForPieceType(
    square,
    stackInfo.carrier,
    position,
  )
  moves.push(...carrierMoves)

  // Generate deploy moves for carried pieces
  for (const carriedPiece of stackInfo.carried) {
    const deployMoves = generateDeployMoves(square, carriedPiece, position)
    moves.push(...deployMoves)
  }

  return moves
}
```

## Performance Optimization Strategies

### Bitboard-Specific Optimizations

**Precomputed Attack Tables**

```typescript
// Precompute attack patterns for each square and piece type
const PRECOMPUTED_ATTACKS = {
  infantry: new Array(132), // 132 squares on 11×12 board
  tank: new Array(132),
  artillery: new Array(132),
  // ... other piece types
}

function initializeAttackTables(): void {
  for (let square = 0; square < 132; square++) {
    PRECOMPUTED_ATTACKS.infantry[square] = computeInfantryAttacks(square)
    PRECOMPUTED_ATTACKS.tank[square] = computeTankAttacks(square)
    // ... other piece types
  }
}
```

**Magic Bitboards for Sliding Pieces**

```typescript
// Magic bitboards for efficient sliding piece attack generation
interface MagicEntry {
  mask: Bitboard // Relevant occupancy bits
  magic: bigint // Magic number
  shift: number // Right shift amount
  attacks: Bitboard[] // Precomputed attack table
}

const ARTILLERY_MAGICS: MagicEntry[] = new Array(132)
const NAVY_MAGICS: MagicEntry[] = new Array(132)

function generateSlidingAttacks(
  square: number,
  occupied: Bitboard,
  magics: MagicEntry[],
): Bitboard {
  const magic = magics[square]
  const relevantOccupancy = bitwiseAnd(occupied, magic.mask)
  const index = magicIndex(relevantOccupancy, magic.magic, magic.shift)
  return magic.attacks[index]
}
```

**SIMD Optimization Opportunities**

```typescript
// Parallel bitboard operations using SIMD when available
function parallelBitboardOr(bitboards: Bitboard[]): Bitboard {
  // Use SIMD instructions for parallel OR operations
  // Implementation depends on target platform
  let result = createEmptyBitboard()

  for (const bitboard of bitboards) {
    result = bitwiseOr(result, bitboard)
  }

  return result
}
```

## Memory Layout and Cache Optimization

### Efficient Memory Organization

**Structure of Arrays (SoA) Layout**

```typescript
// Organize bitboards for cache efficiency
interface OptimizedBitboardPosition {
  // Group frequently accessed bitboards together
  occupancy: {
    allPieces: Bitboard
    redPieces: Bitboard
    bluePieces: Bitboard
    emptySquares: Bitboard
  }

  // Piece bitboards organized by access patterns
  pieces: {
    // Frequently accessed pieces first
    commanders: { red: Bitboard; blue: Bitboard }
    infantry: { red: Bitboard; blue: Bitboard }
    tanks: { red: Bitboard; blue: Bitboard }
    // ... other pieces
  }

  // Special status bitboards
  status: {
    heroicPieces: Bitboard
    airDefenseZones: Bitboard
  }

  // Terrain masks (read-only, can be shared)
  terrain: TerrainBitboards
}
```

## Integration with Current Architecture

### Migration Strategy

**Phase 1: Hybrid Implementation**

- Keep current 0x88 representation as primary
- Add bitboard layer for performance-critical operations
- Maintain synchronization between representations

**Phase 2: Gradual Transition**

- Move move generation to pure bitboard implementation
- Keep stack system in hybrid mode
- Optimize critical paths with bitboard operations

**Phase 3: Full Bitboard**

- Complete migration to bitboard representation
- Optimize memory layout and cache usage
- Implement advanced optimization techniques

**Compatibility Layer**

```typescript
// Adapter between current API and bitboard implementation
class BitboardCoTuLenh implements CoTulenhInterface {
  private bitboardPosition: OptimizedBitboardPosition
  private stackSystem: HybridStackSystem

  // Implement current API using bitboard backend
  get(square: Square): Piece | undefined {
    return this.stackSystem.getPieceAt(SQUARE_MAP[square])
  }

  moves(options: MoveOptions): Move[] {
    return generateAllMoves(this.bitboardPosition, this.stackSystem, options)
  }

  // ... other API methods
}
```

## Conclusion

The bitboard architecture for CoTuLenh presents both significant opportunities
and challenges. While the performance benefits are substantial, the complexity
of the stack system and unique game mechanics require careful design decisions.
The hybrid approach outlined here provides a practical path forward that
leverages bitboard advantages while accommodating CoTuLenh's unique
requirements.

Key takeaways:

1. **128-bit bitboards** provide efficient representation for 11×12 board
2. **Hybrid stack system** balances performance with complexity
3. **Precomputed tables** and **magic bitboards** enable fast move generation
4. **Gradual migration** allows incremental adoption with reduced risk
5. **Memory optimization** critical for cache performance

The next steps involve detailed performance analysis and proof-of-concept
implementation to validate these design decisions.
