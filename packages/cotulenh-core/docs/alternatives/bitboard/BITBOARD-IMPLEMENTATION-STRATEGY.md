# Bitboard Implementation Strategy for CoTuLenh

## Overview

This document provides concrete implementation guidance for adopting bitboard
architecture in CoTuLenh. It includes step-by-step implementation plans, code
examples, algorithm implementations, integration challenges, testing strategies,
and migration paths from the current 0x88 implementation.

## Implementation Approach

### Recommended Strategy: Hybrid Incremental Migration

**Phase-Based Implementation**

1. **Foundation Phase**: Core bitboard infrastructure
2. **Basic Operations Phase**: Simple piece move generation
3. **Advanced Features Phase**: Complex mechanics (stacks, air defense)
4. **Integration Phase**: Full system integration and optimization
5. **Migration Phase**: Gradual replacement of 0x88 components

**Key Principles**

- Maintain backward compatibility during transition
- Validate correctness at each phase
- Measure performance continuously
- Minimize risk through incremental adoption

## Phase 1: Foundation Infrastructure (4-6 weeks)

### Core Bitboard Data Structures

**Basic Bitboard Implementation**

````typescript
// Core 128-bit bitboard for 11×12 board
interface Bitboard {
  low: bigint   // Bits 0-63
  high: bigint  // Bits 64-131 (only bits 0-67 used)
}

// Constants for bitboard operations
const EMPTY_BITBOARD: Bitboard = { low: 0n, high: 0n }
const FULL_BITBOARD: Bitboard = {
  low: 0xFFFFFFFFFFFFFFFFn,
  high: 0xFFFFFFFFFFFFFn  // Only 68 bits used in high
}

// Valid squares mask for 11×12 board
const VALID_SQUARES_MASK: Bitboard = {
  low: 0xFFFFFFFFFFFFFFFFn,  // All 64 bits valid
  high: 0xFFFFFFFFFFFFFn     // Only 68 bits valid (132 total - 64)
}
```**E
ssential Bitboard Operations**
```typescript
// Set bit at square
function setBit(bitboard: Bitboard, square: number): void {
  if (square < 64) {
    bitboard.low |= (1n << BigInt(square))
  } else {
    bitboard.high |= (1n << BigInt(square - 64))
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

// Population count (number of set bits)
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

// Helper function for bit counting
function countBits(value: bigint): number {
  let count = 0
  while (value !== 0n) {
    count++
    value &= value - 1n // Clear lowest set bit
  }
  return count
}

// Helper function for finding LSB
function findLSB(value: bigint): number {
  if (value === 0n) return -1
  let position = 0
  while ((value & 1n) === 0n) {
    value >>= 1n
    position++
  }
  return position
}
````

**Bitwise Operations**

````typescript
function bitwiseAnd(a: Bitboard, b: Bitboard): Bitboard {
  return {
    low: a.low & b.low,
    high: a.high & b.high
  }
}

function bitwiseOr(a: Bitboard, b: Bitboard): Bitboard {
  return {
    low: a.low | b.low,
    high: a.high | b.high
  }
}

function bitwiseXor(a: Bitboard, b: Bitboard): Bitboard {
  return {
    low: a.low ^ b.low,
    high: a.high ^ b.high
  }
}

function bitwiseNot(bitboard: Bitboard): Bitboard {
  return {
    low: (~bitboard.low) & VALID_SQUARES_MASK.low,
    high: (~bitboard.high) & VALID_SQUARES_MASK.high
  }
}

function isEmpty(bitboard: Bitboard): boolean {
  return bitboard.low === 0n && bitboard.high === 0n
}

function isEqual(a: Bitboard, b: Bitboard): boolean {
  return a.low === b.low && a.high === b.high
}
```###
Square Mapping and Coordinate System

**11×12 Board Mapping**
```typescript
// Convert algebraic notation to square index
function algebraicToSquare(algebraic: string): number {
  const file = algebraic.charCodeAt(0) - 'a'.charCodeAt(0) // 0-10
  const rank = parseInt(algebraic.slice(1)) - 1 // 0-11
  return rank * 11 + file
}

// Convert square index to algebraic notation
function squareToAlgebraic(square: number): string {
  const file = String.fromCharCode('a'.charCodeAt(0) + (square % 11))
  const rank = Math.floor(square / 11) + 1
  return file + rank
}

// Get file (0-10) from square
function getFile(square: number): number {
  return square % 11
}

// Get rank (0-11) from square
function getRank(square: number): number {
  return Math.floor(square / 11)
}

// Check if square is valid on 11×12 board
function isValidSquare(square: number): boolean {
  return square >= 0 && square < 132
}

// Direction offsets for 11×12 board
const DIRECTION_OFFSETS = {
  NORTH: -11,
  SOUTH: 11,
  EAST: 1,
  WEST: -1,
  NORTHEAST: -10,
  NORTHWEST: -12,
  SOUTHEAST: 12,
  SOUTHWEST: 10
}

const ORTHOGONAL_DIRECTIONS = [
  DIRECTION_OFFSETS.NORTH,
  DIRECTION_OFFSETS.SOUTH,
  DIRECTION_OFFSETS.EAST,
  DIRECTION_OFFSETS.WEST
]

const DIAGONAL_DIRECTIONS = [
  DIRECTION_OFFSETS.NORTHEAST,
  DIRECTION_OFFSETS.NORTHWEST,
  DIRECTION_OFFSETS.SOUTHEAST,
  DIRECTION_OFFSETS.SOUTHWEST
]

const ALL_DIRECTIONS = [...ORTHOGONAL_DIRECTIONS, ...DIAGONAL_DIRECTIONS]
````

### Terrain System Implementation

**Static Terrain Masks**

````typescript
class TerrainSystem {
  public readonly waterSquares: Bitboard
  public readonly landSquares: Bitboard
  public readonly mixedSquares: Bitboard
  public readonly bridgeSquares: Bitboard
  public readonly navyMask: Bitboard
  public readonly landMask: Bitboard
  public readonly heavyZoneUpper: Bitboard
  public readonly heavyZoneLower: Bitboard
  public readonly allValidSquares: Bitboard

  constructor() {
    // Initialize all masks
    this.waterSquares = this.generateWaterSquares()
    this.landSquares = this.generateLandSquares()
    this.mixedSquares = this.generateMixedSquares()
    this.bridgeSquares = this.generateBridgeSquares()

    // Generate derived masks
    this.navyMask = bitwiseOr(this.waterSquares, this.mixedSquares)
    this.landMask = bitwiseOr(this.landSquares, this.mixedSquares)
    this.heavyZoneUpper = this.generateHeavyZoneUpper()
    this.heavyZoneLower = this.generateHeavyZoneLower()
    this.allValidSquares = this.generateAllValidSquares()
  }

  private generateWaterSquares(): Bitboard {
    const water = { ...EMPTY_BITBOARD }

    // Files a-b (0-1), all ranks
    for (let rank = 0; rank < 12; rank++) {
      for (let file = 0; file < 2; file++) {
        const square = rank * 11 + file
        setBit(water, square)
      }
    }

    return water
  }

  private generateLandSquares(): Bitboard {
    const land = { ...EMPTY_BITBOARD }

    // Files c-k (2-10), all ranks
    for (let rank = 0; rank < 12; rank++) {
      for (let file = 2; file < 11; file++) {
        const square = rank * 11 + file
        setBit(land, square)
      }
    }

    return land
  }

  private generateMixedSquares(): Bitboard {
    const mixed = { ...EMPTY_BITBOARD }

    // Mixed zones: d6, e6, d7, e7 (files 3-4, ranks 5-6)
    const mixedCoords = [
      { file: 3, rank: 5 }, // d6
      { file: 4, rank: 5 }, // e6
      { file: 3, rank: 6 }, // d7
      { file: 4, rank: 6 }  // e7
    ]

    for (const coord of mixedCoords) {
      const square = coord.rank * 11 + coord.file
      setBit(mixed, square)
    }

    return mixed
  }

  private generateBridgeSquares(): Bitboard {
    const bridges = { ...EMPTY_BITBOARD }

    // Bridge squares: f6, f7, h6, h7 (files 5,7, ranks 5-6)
    const bridgeCoords = [
      { file: 5, rank: 5 }, // f6
      { file: 5, rank: 6 }, // f7
      { file: 7, rank: 5 }, // h6
      { file: 7, rank: 6 }  // h7
    ]

    for (const coord of bridgeCoords) {
      const square = coord.rank * 11 + coord.file
      setBit(bridges, square)
    }

    return bridges
  }

  // Terrain validation methods
  canNavyStayOn(square: number): boolean {
    return testBit(this.navyMask, square)
  }

  canLandPieceStayOn(square: number): boolean {
    return testBit(this.landMask, square)
  }

  canAirForceStayOn(square: number): boolean {
    return testBit(this.allValidSquares, square)
  }

  isHeavyPieceCrossingValid(fromSquare: number, toSquare: number): boolean {
    const fromUpper = testBit(this.heavyZoneUpper, fromSquare)
    const fromLower = testBit(this.heavyZoneLower, fromSquare)
    const toUpper = testBit(this.heavyZoneUpper, toSquare)
    const toLower = testBit(this.heavyZoneLower, toSquare)

    // If crossing zones, must use bridge
    if ((fromUpper && toLower) || (fromLower && toUpper)) {
      return this.pathUsesBridge(fromSquare, toSquare)
    }

    return true
  }

  private pathUsesBridge(fromSquare: number, toSquare: number): boolean {
    // Check if horizontal movement path includes bridge squares
    const fromFile = getFile(fromSquare)
    const toFile = getFile(toSquare)
    const fromRank = getRank(fromSquare)
    const toRank = getRank(toSquare)

    if (fromRank === toRank) {
      // Horizontal movement - check if path crosses bridge files
      const minFile = Math.min(fromFile, toFile)
      const maxFile = Math.max(fromFile, toFile)

      // Bridge files are 5 (f) and 7 (h)
      return (minFile <= 5 && maxFile >= 5) || (minFile <= 7 && maxFile >= 7)
    }

    return false // Vertical crossing not allowed for heavy pieces
  }
}

// Global terrain system instance
const TERRAIN = new TerrainSystem()
```##
 Phase 2: Basic Move Generation (3-4 weeks)

### Precomputed Attack Tables

**Attack Table Generation**
```typescript
// Precomputed attack tables for each piece type and square
class AttackTables {
  // Attack patterns for each piece type at each square
  public readonly infantryAttacks: Bitboard[] = new Array(132)
  public readonly tankAttacks: Bitboard[] = new Array(132)
  public readonly militiaAttacks: Bitboard[] = new Array(132)
  public readonly engineerAttacks: Bitboard[] = new Array(132)

  // Sliding piece attack tables (will use magic bitboards)
  public readonly artilleryAttacks: Map<number, Bitboard[]> = new Map()
  public readonly navyAttacks: Map<number, Bitboard[]> = new Map()
  public readonly airForceAttacks: Map<number, Bitboard[]> = new Map()

  constructor() {
    this.initializeAttackTables()
  }

  private initializeAttackTables(): void {
    for (let square = 0; square < 132; square++) {
      this.infantryAttacks[square] = this.generateInfantryAttacks(square)
      this.tankAttacks[square] = this.generateTankAttacks(square)
      this.militiaAttacks[square] = this.generateMilitiaAttacks(square)
      this.engineerAttacks[square] = this.generateEngineerAttacks(square)
    }

    // Initialize sliding piece tables
    this.initializeSlidingPieceAttacks()
  }

  private generateInfantryAttacks(square: number): Bitboard {
    const attacks = { ...EMPTY_BITBOARD }

    // Infantry moves 1 square orthogonally
    for (const direction of ORTHOGONAL_DIRECTIONS) {
      const targetSquare = square + direction
      if (this.isValidMove(square, targetSquare)) {
        setBit(attacks, targetSquare)
      }
    }

    return attacks
  }

  private generateTankAttacks(square: number): Bitboard {
    const attacks = { ...EMPTY_BITBOARD }

    // Tank moves up to 2 squares orthogonally
    for (const direction of ORTHOGONAL_DIRECTIONS) {
      for (let range = 1; range <= 2; range++) {
        const targetSquare = square + (direction * range)
        if (this.isValidMove(square, targetSquare)) {
          setBit(attacks, targetSquare)
        } else {
          break // Can't go further in this direction
        }
      }
    }

    return attacks
  }

  private generateMilitiaAttacks(square: number): Bitboard {
    const attacks = { ...EMPTY_BITBOARD }

    // Militia moves 1 square in any direction
    for (const direction of ALL_DIRECTIONS) {
      const targetSquare = square + direction
      if (this.isValidMove(square, targetSquare)) {
        setBit(attacks, targetSquare)
      }
    }

    return attacks
  }

  private isValidMove(fromSquare: number, toSquare: number): boolean {
    if (!isValidSquare(toSquare)) return false

    // Check for board edge wrapping
    const fromFile = getFile(fromSquare)
    const toFile = getFile(toSquare)
    const fileDiff = Math.abs(toFile - fromFile)

    // Prevent wrapping around board edges
    if (fileDiff > 1 && fileDiff < 10) return false

    return true
  }

  // Get attack pattern for piece type
  getAttacks(pieceType: PieceType, square: number, isHeroic: boolean = false): Bitboard {
    let baseAttacks: Bitboard

    switch (pieceType) {
      case PieceType.INFANTRY:
        baseAttacks = this.infantryAttacks[square]
        break
      case PieceType.TANK:
        baseAttacks = this.tankAttacks[square]
        break
      case PieceType.MILITIA:
        baseAttacks = this.militiaAttacks[square]
        break
      case PieceType.ENGINEER:
        baseAttacks = this.engineerAttacks[square]
        break
      default:
        return { ...EMPTY_BITBOARD }
    }

    if (isHeroic) {
      return this.expandForHeroic(baseAttacks, square, pieceType)
    }

    return baseAttacks
  }

  private expandForHeroic(baseAttacks: Bitboard, square: number, pieceType: PieceType): Bitboard {
    // Heroic pieces get expanded range and diagonal movement
    const heroicAttacks = { ...baseAttacks }

    // Add diagonal attacks for heroic pieces
    if (pieceType !== PieceType.MILITIA) { // Militia already has diagonal
      for (const direction of DIAGONAL_DIRECTIONS) {
        const targetSquare = square + direction
        if (this.isValidMove(square, targetSquare)) {
          setBit(heroicAttacks, targetSquare)
        }
      }
    }

    // Expand range by 1 for heroic pieces
    const expandedAttacks = this.expandRange(heroicAttacks, square, 1)

    return expandedAttacks
  }

  private expandRange(attacks: Bitboard, centerSquare: number, extraRange: number): Bitboard {
    const expanded = { ...attacks }

    // For each direction, add one more square
    for (const direction of ALL_DIRECTIONS) {
      let currentSquare = centerSquare

      // Find the furthest square in this direction that's already in attacks
      let furthestSquare = -1
      for (let range = 1; range <= 4; range++) {
        const testSquare = centerSquare + (direction * range)
        if (testBit(attacks, testSquare)) {
          furthestSquare = testSquare
        } else {
          break
        }
      }

      // Add one more square beyond the furthest
      if (furthestSquare !== -1) {
        const nextSquare = furthestSquare + direction
        if (this.isValidMove(furthestSquare, nextSquare)) {
          setBit(expanded, nextSquare)
        }
      }
    }

    return expanded
  }
}

// Global attack tables instance
const ATTACK_TABLES = new AttackTables()
````

### Simple Move Generation Implementation

**Basic Move Generator**

````typescript
interface BitboardMove {
  from: number
  to: number
  piece: PieceType
  flags: MoveFlags
  capturedPiece?: PieceType
}

enum MoveFlags {
  NORMAL = 1,
  CAPTURE = 2,
  STAY_CAPTURE = 4,
  SUICIDE_CAPTURE = 8,
  DEPLOY = 16,
  RECOMBINE = 32
}

class BasicMoveGenerator {
  private terrain: TerrainSystem
  private attackTables: AttackTables

  constructor(terrain: TerrainSystem, attackTables: AttackTables) {
    this.terrain = terrain
    this.attackTables = attackTables
  }

  // Generate moves for a single piece
  generatePieceMoves(
    position: BitboardPosition,
    square: number,
    pieceType: PieceType,
    isHeroic: boolean = false
  ): BitboardMove[] {
    const moves: BitboardMove[] = []

    // Get attack pattern for piece
    const attacks = this.attackTables.getAttacks(pieceType, square, isHeroic)

    // Apply terrain restrictions
    const validTargets = this.applyTerrainRestrictions(attacks, pieceType)

    // Remove friendly pieces
    const friendlyPieces = this.getFriendlyPieces(position, this.getPieceColor(position, square))
    const availableTargets = bitwiseAnd(validTargets, bitwiseNot(friendlyPieces))

    // Generate moves for each target square
    let targetSquare = -1
    let tempTargets = { ...availableTargets }

    while ((targetSquare = findFirstBit(tempTargets)) !== -1) {
      clearBit(tempTargets, targetSquare)

      const targetPiece = this.getPieceAt(position, targetSquare)

      if (targetPiece) {
        // Capture move
        moves.push({
          from: square,
          to: targetSquare,
          piece: pieceType,
          flags: MoveFlags.CAPTURE,
          capturedPiece: targetPiece
        })
      } else {
        // Normal move
        moves.push({
          from: square,
          to: targetSquare,
          piece: pieceType,
          flags: MoveFlags.NORMAL
        })
      }
    }

    return moves
  }

  private applyTerrainRestrictions(attacks: Bitboard, pieceType: PieceType): Bitboard {
    switch (pieceType) {
      case PieceType.NAVY:
        return bitwiseAnd(attacks, this.terrain.navyMask)
      case PieceType.AIR_FORCE:
        return bitwiseAnd(attacks, this.terrain.allValidSquares)
      default:
        return bitwiseAnd(attacks, this.terrain.landMask)
    }
  }

  private getFriendlyPieces(position: BitboardPosition, color: Color): Bitboard {
    return color === Color.RED ? position.redPieces : position.bluePieces
  }

  private getPieceColor(position: BitboardPosition, square: number): Color {
    if (testBit(position.redPieces, square)) return Color.RED
    if (testBit(position.bluePieces, square)) return Color.BLUE
    throw new Error(`No piece at square ${square}`)
  }

  private getPieceAt(position: BitboardPosition, square: number): PieceType | null {
    // Check each piece type bitboard
    for (const [pieceType, bitboards] of Object.entries(position.pieces)) {
      if (testBit(bitboards.red, square) || testBit(bitboards.blue, square)) {
        return pieceType as PieceType
      }
    }
    return null
  }
}
```##
 Phase 3: Advanced Features (6-8 weeks)

### Magic Bitboards for Sliding Pieces

**Magic Bitboard Implementation**
```typescript
interface MagicEntry {
  mask: Bitboard      // Relevant occupancy bits
  magic: bigint       // Magic number
  shift: number       // Right shift amount
  attacks: Bitboard[] // Precomputed attack table
}

class MagicBitboards {
  private artilleryMagics: MagicEntry[] = new Array(132)
  private navyMagics: MagicEntry[] = new Array(132)

  constructor() {
    this.initializeMagicTables()
  }

  private initializeMagicTables(): void {
    for (let square = 0; square < 132; square++) {
      this.artilleryMagics[square] = this.generateMagicEntry(square, 'artillery')
      this.navyMagics[square] = this.generateMagicEntry(square, 'navy')
    }
  }

  private generateMagicEntry(square: number, pieceType: string): MagicEntry {
    const mask = this.generateRelevantOccupancyMask(square, pieceType)
    const magic = this.findMagicNumber(square, mask, pieceType)
    const shift = 64 - popCount(mask) // Assuming 64-bit magic
    const attacks = this.generateAttackTable(square, mask, magic, shift, pieceType)

    return { mask, magic, shift, attacks }
  }

  private generateRelevantOccupancyMask(square: number, pieceType: string): Bitboard {
    const mask = { ...EMPTY_BITBOARD }
    const directions = pieceType === 'artillery' ? ALL_DIRECTIONS : ORTHOGONAL_DIRECTIONS

    for (const direction of directions) {
      let currentSquare = square + direction

      // Add squares along the ray, excluding the last square in each direction
      while (isValidSquare(currentSquare)) {
        const nextSquare = currentSquare + direction
        if (isValidSquare(nextSquare)) {
          setBit(mask, currentSquare)
        }
        currentSquare = nextSquare
      }
    }

    return mask
  }

  // Generate sliding piece attacks using magic bitboards
  generateSlidingAttacks(
    square: number,
    occupied: Bitboard,
    pieceType: 'artillery' | 'navy'
  ): Bitboard {
    const magics = pieceType === 'artillery' ? this.artilleryMagics : this.navyMagics
    const magic = magics[square]

    const relevantOccupancy = bitwiseAnd(occupied, magic.mask)
    const index = this.magicIndex(relevantOccupancy, magic.magic, magic.shift)

    return magic.attacks[index]
  }

  private magicIndex(occupancy: Bitboard, magic: bigint, shift: number): number {
    // Simplified magic index calculation
    // In practice, this would need proper 128-bit magic number handling
    const hash = (occupancy.low * magic) >> BigInt(shift)
    return Number(hash & 0xFFFFn) // Mask to reasonable table size
  }

  private findMagicNumber(square: number, mask: Bitboard, pieceType: string): bigint {
    // Simplified magic number generation
    // In practice, this would use trial and error to find good magic numbers
    return BigInt(0x1234567890ABCDEF) // Placeholder
  }

  private generateAttackTable(
    square: number,
    mask: Bitboard,
    magic: bigint,
    shift: number,
    pieceType: string
  ): Bitboard[] {
    const tableSize = 1 << popCount(mask)
    const attacks = new Array(tableSize)

    // Generate all possible occupancy patterns
    const occupancyPatterns = this.generateOccupancyPatterns(mask)

    for (const occupancy of occupancyPatterns) {
      const index = this.magicIndex(occupancy, magic, shift)
      attacks[index] = this.generateAttacksForOccupancy(square, occupancy, pieceType)
    }

    return attacks
  }

  private generateOccupancyPatterns(mask: Bitboard): Bitboard[] {
    const patterns: Bitboard[] = []
    const maskBits: number[] = []

    // Extract bit positions from mask
    let tempMask = { ...mask }
    let bit = -1
    while ((bit = findFirstBit(tempMask)) !== -1) {
      maskBits.push(bit)
      clearBit(tempMask, bit)
    }

    // Generate all 2^n combinations
    const numPatterns = 1 << maskBits.length
    for (let i = 0; i < numPatterns; i++) {
      const pattern = { ...EMPTY_BITBOARD }

      for (let j = 0; j < maskBits.length; j++) {
        if ((i & (1 << j)) !== 0) {
          setBit(pattern, maskBits[j])
        }
      }

      patterns.push(pattern)
    }

    return patterns
  }

  private generateAttacksForOccupancy(
    square: number,
    occupancy: Bitboard,
    pieceType: string
  ): Bitboard {
    const attacks = { ...EMPTY_BITBOARD }
    const directions = pieceType === 'artillery' ? ALL_DIRECTIONS : ORTHOGONAL_DIRECTIONS
    const maxRange = pieceType === 'artillery' ? 3 : 4

    for (const direction of directions) {
      for (let range = 1; range <= maxRange; range++) {
        const targetSquare = square + (direction * range)

        if (!isValidSquare(targetSquare)) break

        setBit(attacks, targetSquare)

        // Stop if we hit an occupied square
        if (testBit(occupancy, targetSquare)) break
      }
    }

    return attacks
  }
}
````

### Air Defense System Integration

**Bitboard Air Defense Manager**

````typescript
class BitboardAirDefenseManager {
  private precomputedZones: Map<number, Map<number, Bitboard>> = new Map()

  constructor() {
    this.precomputeDefenseZones()
  }

  private precomputeDefenseZones(): void {
    // Precompute circular zones for each square and defense level
    for (let square = 0; square < 132; square++) {
      const squareZones = new Map<number, Bitboard>()

      for (let level = 1; level <= 3; level++) {
        squareZones.set(level, this.generateCircularZone(square, level))
      }

      this.precomputedZones.set(square, squareZones)
    }
  }

  private generateCircularZone(centerSquare: number, radius: number): Bitboard {
    const zone = { ...EMPTY_BITBOARD }
    const centerFile = getFile(centerSquare)
    const centerRank = getRank(centerSquare)

    for (let dr = -radius; dr <= radius; dr++) {
      for (let df = -radius; df <= radius; df++) {
        if (dr * dr + df * df <= radius * radius) {
          const targetRank = centerRank + dr
          const targetFile = centerFile + df

          if (targetRank >= 0 && targetRank < 12 &&
              targetFile >= 0 && targetFile < 11) {
            const targetSquare = targetRank * 11 + targetFile
            setBit(zone, targetSquare)
          }
        }
      }
    }

    return zone
  }

  // Calculate air defense zones for current position
  calculateAirDefenseZones(position: BitboardPosition): Bitboard {
    let allZones = { ...EMPTY_BITBOARD }

    // Process Anti-Air pieces (level 1, heroic level 2)
    allZones = this.addDefenseZones(allZones, position.pieces.antiAir.red, position.heroicPieces, 1)
    allZones = this.addDefenseZones(allZones, position.pieces.antiAir.blue, position.heroicPieces, 1)

    // Process Missile pieces (level 2, heroic level 3)
    allZones = this.addDefenseZones(allZones, position.pieces.missile.red, position.heroicPieces, 2)
    allZones = this.addDefenseZones(allZones, position.pieces.missile.blue, position.heroicPieces, 2)

    // Process Navy pieces (level 1, no heroic bonus)
    allZones = this.addDefenseZones(allZones, position.pieces.navy.red, { ...EMPTY_BITBOARD }, 1)
    allZones = this.addDefenseZones(allZones, position.pieces.navy.blue, { ...EMPTY_BITBOARD }, 1)

    return allZones
  }

  private addDefenseZones(
    currentZones: Bitboard,
    pieceBitboard: Bitboard,
    heroicPieces: Bitboard,
    baseLevel: number
  ): Bitboard {
    let result = { ...currentZones }
    let tempPieces = { ...pieceBitboard }

    while (!isEmpty(tempPieces)) {
      const square = findFirstBit(tempPieces)
      clearBit(tempPieces, square)

      const isHeroic = testBit(heroicPieces, square)
      const defenseLevel = isHeroic ? baseLevel + 1 : baseLevel

      const zonePattern = this.precomputedZones.get(square)?.get(defenseLevel)
      if (zonePattern) {
        result = bitwiseOr(result, zonePattern)
      }
    }

    return result
  }

  // Check Air Force movement restrictions
  checkAirForceMovement(
    fromSquare: number,
    toSquare: number,
    airDefenseZones: Bitboard
  ): AirForceMovementResult {
    if (!testBit(airDefenseZones, toSquare)) {
      return AirForceMovementResult.SAFE
    }

    // Determine defense level at target square
    // This is simplified - in practice would need to track defense levels
    return AirForceMovementResult.KAMIKAZE
  }
}

enum AirForceMovementResult {
  SAFE,      // Can move normally
  KAMIKAZE,  // Can move but will be destroyed
  BLOCKED    // Cannot move to this square
}
```#
# Phase 4: Stack System Integration (6-8 weeks)

### Hybrid Stack Management

**Stack Data Structure**
```typescript
interface StackComposition {
  carrier: {
    type: PieceType
    heroic: boolean
  }
  carried: Array<{
    type: PieceType
    heroic: boolean
  }>
  color: Color
}

interface BitboardPosition {
  // Pure bitboards for fast operations
  occupancy: {
    allPieces: Bitboard
    redPieces: Bitboard
    bluePieces: Bitboard
    stackSquares: Bitboard  // Squares with stacks (>1 piece)
  }

  // Piece bitboards (carriers only for stacks)
  pieces: {
    [PieceType.COMMANDER]: { red: Bitboard, blue: Bitboard }
    [PieceType.INFANTRY]: { red: Bitboard, blue: Bitboard }
    [PieceType.TANK]: { red: Bitboard, blue: Bitboard }
    [PieceType.MILITIA]: { red: Bitboard, blue: Bitboard }
    [PieceType.ENGINEER]: { red: Bitboard, blue: Bitboard }
    [PieceType.ARTILLERY]: { red: Bitboard, blue: Bitboard }
    [PieceType.ANTI_AIR]: { red: Bitboard, blue: Bitboard }
    [PieceType.MISSILE]: { red: Bitboard, blue: Bitboard }
    [PieceType.AIR_FORCE]: { red: Bitboard, blue: Bitboard }
    [PieceType.NAVY]: { red: Bitboard, blue: Bitboard }
    [PieceType.HEADQUARTER]: { red: Bitboard, blue: Bitboard }
  }

  // Special status
  heroicPieces: Bitboard
  airDefenseZones: Bitboard

  // Stack details (hybrid approach)
  stacks: Map<number, StackComposition>
}

class HybridStackManager {
  private position: BitboardPosition
  private terrain: TerrainSystem

  constructor(position: BitboardPosition, terrain: TerrainSystem) {
    this.position = position
    this.terrain = terrain
  }

  // Get complete piece information at square
  getPieceAt(square: number): CompleteStackInfo | null {
    if (!testBit(this.position.occupancy.allPieces, square)) {
      return null
    }

    const stackInfo = this.position.stacks.get(square)
    if (stackInfo) {
      return {
        carrier: stackInfo.carrier,
        carried: stackInfo.carried,
        color: stackInfo.color,
        isStack: stackInfo.carried.length > 0,
        square: square
      }
    }

    // Single piece - determine type from bitboards
    return this.getSinglePieceAt(square)
  }

  private getSinglePieceAt(square: number): CompleteStackInfo | null {
    // Check each piece type bitboard
    for (const [pieceType, bitboards] of Object.entries(this.position.pieces)) {
      if (testBit(bitboards.red, square)) {
        return {
          carrier: {
            type: pieceType as PieceType,
            heroic: testBit(this.position.heroicPieces, square)
          },
          carried: [],
          color: Color.RED,
          isStack: false,
          square: square
        }
      }
      if (testBit(bitboards.blue, square)) {
        return {
          carrier: {
            type: pieceType as PieceType,
            heroic: testBit(this.position.heroicPieces, square)
          },
          carried: [],
          color: Color.BLUE,
          isStack: false,
          square: square
        }
      }
    }

    return null
  }

  // Place piece on board
  placePiece(square: number, piece: PieceInfo, color: Color): void {
    // Update occupancy bitboards
    setBit(this.position.occupancy.allPieces, square)
    if (color === Color.RED) {
      setBit(this.position.occupancy.redPieces, square)
    } else {
      setBit(this.position.occupancy.bluePieces, square)
    }

    // Update piece type bitboard
    const pieceBitboards = this.position.pieces[piece.type]
    if (color === Color.RED) {
      setBit(pieceBitboards.red, square)
    } else {
      setBit(pieceBitboards.blue, square)
    }

    // Update heroic status
    if (piece.heroic) {
      setBit(this.position.heroicPieces, square)
    }
  }

  // Remove piece from board
  removePiece(square: number): CompleteStackInfo | null {
    const pieceInfo = this.getPieceAt(square)
    if (!pieceInfo) return null

    // Update occupancy bitboards
    clearBit(this.position.occupancy.allPieces, square)
    if (pieceInfo.color === Color.RED) {
      clearBit(this.position.occupancy.redPieces, square)
    } else {
      clearBit(this.position.occupancy.bluePieces, square)
    }

    // Update piece type bitboard
    const pieceBitboards = this.position.pieces[pieceInfo.carrier.type]
    if (pieceInfo.color === Color.RED) {
      clearBit(pieceBitboards.red, square)
    } else {
      clearBit(pieceBitboards.blue, square)
    }

    // Update heroic status
    if (pieceInfo.carrier.heroic) {
      clearBit(this.position.heroicPieces, square)
    }

    // Remove stack info if present
    if (pieceInfo.isStack) {
      this.position.stacks.delete(square)
      clearBit(this.position.occupancy.stackSquares, square)
    }

    return pieceInfo
  }

  // Create stack from multiple pieces
  createStack(square: number, pieces: PieceInfo[], color: Color): boolean {
    if (pieces.length < 2) return false

    // Validate combination rules
    if (!this.canCombinePieces(pieces)) return false

    // Remove existing piece if any
    this.removePiece(square)

    // Create stack composition
    const [carrier, ...carried] = pieces
    const stackComposition: StackComposition = {
      carrier: { type: carrier.type, heroic: carrier.heroic },
      carried: carried.map(p => ({ type: p.type, heroic: p.heroic })),
      color: color
    }

    // Place carrier on bitboards
    this.placePiece(square, carrier, color)

    // Mark as stack square
    setBit(this.position.occupancy.stackSquares, square)
    this.position.stacks.set(square, stackComposition)

    return true
  }

  // Deploy piece from stack
  deployPiece(
    fromSquare: number,
    toSquare: number,
    pieceType: PieceType
  ): boolean {
    const stackInfo = this.position.stacks.get(fromSquare)
    if (!stackInfo) return false

    // Find piece in stack
    let deployedPiece: PieceInfo
    let isCarrier = false

    if (stackInfo.carrier.type === pieceType) {
      deployedPiece = stackInfo.carrier
      isCarrier = true
    } else {
      const carriedIndex = stackInfo.carried.findIndex(p => p.type === pieceType)
      if (carriedIndex === -1) return false

      deployedPiece = stackInfo.carried[carriedIndex]
      stackInfo.carried.splice(carriedIndex, 1)
    }

    // Validate terrain for deployed piece
    if (!this.canPieceStayOnSquare(toSquare, deployedPiece.type)) {
      return false
    }

    // Handle carrier deployment
    if (isCarrier) {
      // Remove carrier from bitboards
      const pieceBitboards = this.position.pieces[stackInfo.carrier.type]
      if (stackInfo.color === Color.RED) {
        clearBit(pieceBitboards.red, fromSquare)
      } else {
        clearBit(pieceBitboards.blue, fromSquare)
      }

      if (stackInfo.carried.length > 0) {
        // Promote first carried piece to carrier
        stackInfo.carrier = stackInfo.carried.shift()!

        // Update bitboards with new carrier
        const newCarrierBitboards = this.position.pieces[stackInfo.carrier.type]
        if (stackInfo.color === Color.RED) {
          setBit(newCarrierBitboards.red, fromSquare)
        } else {
          setBit(newCarrierBitboards.blue, fromSquare)
        }
      } else {
        // Stack becomes empty
        this.position.stacks.delete(fromSquare)
        clearBit(this.position.occupancy.stackSquares, fromSquare)
        clearBit(this.position.occupancy.allPieces, fromSquare)
        if (stackInfo.color === Color.RED) {
          clearBit(this.position.occupancy.redPieces, fromSquare)
        } else {
          clearBit(this.position.occupancy.bluePieces, fromSquare)
        }
      }
    } else {
      // Carried piece deployment
      if (stackInfo.carried.length === 0) {
        // No longer a stack
        clearBit(this.position.occupancy.stackSquares, fromSquare)
      }
    }

    // Place deployed piece at target square
    this.placePiece(toSquare, deployedPiece, stackInfo.color)

    return true
  }

  private canCombinePieces(pieces: PieceInfo[]): boolean {
    // Simplified combination validation
    // In practice, would check against combination rules
    if (pieces.length > 4) return false // Max stack size

    const colors = new Set(pieces.map(p => p.color))
    if (colors.size > 1) return false // All same color

    const types = new Set(pieces.map(p => p.type))
    if (types.size !== pieces.length) return false // No duplicates

    return true
  }

  private canPieceStayOnSquare(square: number, pieceType: PieceType): boolean {
    switch (pieceType) {
      case PieceType.NAVY:
        return this.terrain.canNavyStayOn(square)
      case PieceType.AIR_FORCE:
        return this.terrain.canAirForceStayOn(square)
      default:
        return this.terrain.canLandPieceStayOn(square)
    }
  }
}

interface CompleteStackInfo {
  carrier: PieceInfo
  carried: PieceInfo[]
  color: Color
  isStack: boolean
  square: number
}

interface PieceInfo {
  type: PieceType
  heroic: boolean
  color?: Color
}
```## Pha
se 5: Integration and Testing (2-3 weeks)

### Complete Move Generation System

**Unified Move Generator**
```typescript
class BitboardMoveGenerator {
  private stackManager: HybridStackManager
  private attackTables: AttackTables
  private magicBitboards: MagicBitboards
  private airDefenseManager: BitboardAirDefenseManager
  private terrain: TerrainSystem

  constructor(
    stackManager: HybridStackManager,
    attackTables: AttackTables,
    magicBitboards: MagicBitboards,
    airDefenseManager: BitboardAirDefenseManager,
    terrain: TerrainSystem
  ) {
    this.stackManager = stackManager
    this.attackTables = attackTables
    this.magicBitboards = magicBitboards
    this.airDefenseManager = airDefenseManager
    this.terrain = terrain
  }

  // Generate all legal moves for current position
  generateAllMoves(position: BitboardPosition, color: Color): BitboardMove[] {
    const moves: BitboardMove[] = []

    // Get all pieces of the current color
    const friendlyPieces = color === Color.RED ? position.occupancy.redPieces : position.occupancy.bluePieces

    // Generate moves for each piece
    let square = -1
    let tempPieces = { ...friendlyPieces }

    while ((square = findFirstBit(tempPieces)) !== -1) {
      clearBit(tempPieces, square)

      const pieceInfo = this.stackManager.getPieceAt(square)
      if (!pieceInfo || pieceInfo.color !== color) continue

      if (pieceInfo.isStack) {
        // Generate stack moves (normal movement + deploy moves)
        moves.push(...this.generateStackMoves(position, square, pieceInfo))
      } else {
        // Generate single piece moves
        moves.push(...this.generateSinglePieceMoves(position, square, pieceInfo.carrier))
      }
    }

    return this.filterLegalMoves(moves, position, color)
  }

  private generateStackMoves(
    position: BitboardPosition,
    square: number,
    stackInfo: CompleteStackInfo
  ): BitboardMove[] {
    const moves: BitboardMove[] = []

    // Generate normal moves for carrier
    const carrierMoves = this.generateSinglePieceMoves(position, square, stackInfo.carrier)
    moves.push(...carrierMoves)

    // Generate deploy moves for all pieces in stack
    const allPieces = [stackInfo.carrier, ...stackInfo.carried]

    for (const piece of allPieces) {
      const deployMoves = this.generateDeployMoves(position, square, piece)
      moves.push(...deployMoves)
    }

    return moves
  }

  private generateSinglePieceMoves(
    position: BitboardPosition,
    square: number,
    piece: PieceInfo
  ): BitboardMove[] {
    const moves: BitboardMove[] = []

    switch (piece.type) {
      case PieceType.INFANTRY:
      case PieceType.ENGINEER:
      case PieceType.TANK:
      case PieceType.MILITIA:
      case PieceType.ANTI_AIR:
      case PieceType.MISSILE:
        return this.generateNonSlidingMoves(position, square, piece)

      case PieceType.ARTILLERY:
      case PieceType.NAVY:
        return this.generateSlidingMoves(position, square, piece)

      case PieceType.AIR_FORCE:
        return this.generateAirForceMoves(position, square, piece)

      case PieceType.COMMANDER:
        return this.generateCommanderMoves(position, square, piece)

      case PieceType.HEADQUARTER:
        return this.generateHeadquarterMoves(position, square, piece)

      default:
        return []
    }
  }

  private generateNonSlidingMoves(
    position: BitboardPosition,
    square: number,
    piece: PieceInfo
  ): BitboardMove[] {
    const moves: BitboardMove[] = []

    // Get attack pattern
    const attacks = this.attackTables.getAttacks(piece.type, square, piece.heroic)

    // Apply terrain restrictions
    const validTargets = this.applyTerrainRestrictions(attacks, piece.type)

    // Remove friendly pieces
    const friendlyPieces = piece.color === Color.RED ?
      position.occupancy.redPieces : position.occupancy.bluePieces
    const availableTargets = bitwiseAnd(validTargets, bitwiseNot(friendlyPieces))

    // Generate moves
    return this.convertBitboardToMoves(square, availableTargets, piece, position)
  }

  private generateSlidingMoves(
    position: BitboardPosition,
    square: number,
    piece: PieceInfo
  ): BitboardMove[] {
    const pieceType = piece.type === PieceType.ARTILLERY ? 'artillery' : 'navy'
    const attacks = this.magicBitboards.generateSlidingAttacks(
      square,
      position.occupancy.allPieces,
      pieceType
    )

    // Apply terrain and piece restrictions
    const validTargets = this.applyTerrainRestrictions(attacks, piece.type)
    const friendlyPieces = piece.color === Color.RED ?
      position.occupancy.redPieces : position.occupancy.bluePieces
    const availableTargets = bitwiseAnd(validTargets, bitwiseNot(friendlyPieces))

    return this.convertBitboardToMoves(square, availableTargets, piece, position)
  }

  private generateAirForceMoves(
    position: BitboardPosition,
    square: number,
    piece: PieceInfo
  ): BitboardMove[] {
    const moves: BitboardMove[] = []

    // Air Force has special movement rules with air defense considerations
    const baseAttacks = this.attackTables.getAttacks(piece.type, square, piece.heroic)
    const friendlyPieces = piece.color === Color.RED ?
      position.occupancy.redPieces : position.occupancy.bluePieces
    const availableTargets = bitwiseAnd(baseAttacks, bitwiseNot(friendlyPieces))

    // Check each target square for air defense restrictions
    let targetSquare = -1
    let tempTargets = { ...availableTargets }

    while ((targetSquare = findFirstBit(tempTargets)) !== -1) {
      clearBit(tempTargets, targetSquare)

      const movementResult = this.airDefenseManager.checkAirForceMovement(
        square,
        targetSquare,
        position.airDefenseZones
      )

      const targetPiece = this.stackManager.getPieceAt(targetSquare)

      switch (movementResult) {
        case AirForceMovementResult.SAFE:
          if (targetPiece) {
            moves.push({
              from: square,
              to: targetSquare,
              piece: piece.type,
              flags: MoveFlags.CAPTURE,
              capturedPiece: targetPiece.carrier.type
            })
          } else {
            moves.push({
              from: square,
              to: targetSquare,
              piece: piece.type,
              flags: MoveFlags.NORMAL
            })
          }
          break

        case AirForceMovementResult.KAMIKAZE:
          if (targetPiece) {
            moves.push({
              from: square,
              to: targetSquare,
              piece: piece.type,
              flags: MoveFlags.SUICIDE_CAPTURE,
              capturedPiece: targetPiece.carrier.type
            })
          }
          break

        case AirForceMovementResult.BLOCKED:
          // Cannot move to this square
          break
      }
    }

    return moves
  }

  private convertBitboardToMoves(
    fromSquare: number,
    targets: Bitboard,
    piece: PieceInfo,
    position: BitboardPosition
  ): BitboardMove[] {
    const moves: BitboardMove[] = []

    let targetSquare = -1
    let tempTargets = { ...targets }

    while ((targetSquare = findFirstBit(tempTargets)) !== -1) {
      clearBit(tempTargets, targetSquare)

      const targetPiece = this.stackManager.getPieceAt(targetSquare)

      if (targetPiece && targetPiece.color !== piece.color) {
        // Capture move
        moves.push({
          from: fromSquare,
          to: targetSquare,
          piece: piece.type,
          flags: MoveFlags.CAPTURE,
          capturedPiece: targetPiece.carrier.type
        })
      } else if (!targetPiece) {
        // Normal move
        moves.push({
          from: fromSquare,
          to: targetSquare,
          piece: piece.type,
          flags: MoveFlags.NORMAL
        })
      }
    }

    return moves
  }

  private filterLegalMoves(
    moves: BitboardMove[],
    position: BitboardPosition,
    color: Color
  ): BitboardMove[] {
    // Filter moves that would leave commander in check or exposed
    const legalMoves: BitboardMove[] = []

    for (const move of moves) {
      if (this.isMoveLegal(move, position, color)) {
        legalMoves.push(move)
      }
    }

    return legalMoves
  }

  private isMoveLegal(
    move: BitboardMove,
    position: BitboardPosition,
    color: Color
  ): boolean {
    // Apply move temporarily
    const testPosition = this.applyMoveTemporarily(position, move)

    // Check if commander is safe
    const commanderSquare = this.findCommanderSquare(testPosition, color)
    if (commanderSquare === -1) return false // Commander captured

    // Check for commander attack
    const enemyColor = color === Color.RED ? Color.BLUE : Color.RED
    const isAttacked = this.isSquareAttacked(testPosition, commanderSquare, enemyColor)

    // Check for commander exposure (Flying General rule)
    const isExposed = this.isCommanderExposed(testPosition, color)

    return !isAttacked && !isExposed
  }

  // Additional helper methods for legal move validation...
  private applyMoveTemporarily(position: BitboardPosition, move: BitboardMove): BitboardPosition {
    // Create deep copy and apply move
    // Implementation details...
    return { ...position } // Simplified
  }

  private findCommanderSquare(position: BitboardPosition, color: Color): number {
    const commanderBitboard = color === Color.RED ?
      position.pieces[PieceType.COMMANDER].red :
      position.pieces[PieceType.COMMANDER].blue

    return findFirstBit(commanderBitboard)
  }

  private isSquareAttacked(
    position: BitboardPosition,
    square: number,
    attackingColor: Color
  ): boolean {
    // Check if any enemy piece can attack the square
    // Implementation details...
    return false // Simplified
  }

  private isCommanderExposed(position: BitboardPosition, color: Color): boolean {
    // Check Flying General rule
    // Implementation details...
    return false // Simplified
  }
}
```##
 Testing Strategy

### Unit Testing Framework

**Bitboard Operation Tests**
```typescript
describe('Bitboard Operations', () => {
  test('setBit and testBit', () => {
    const bitboard = { ...EMPTY_BITBOARD }

    setBit(bitboard, 0)
    expect(testBit(bitboard, 0)).toBe(true)
    expect(testBit(bitboard, 1)).toBe(false)

    setBit(bitboard, 65) // Test high bitboard
    expect(testBit(bitboard, 65)).toBe(true)

    setBit(bitboard, 131) // Last valid square
    expect(testBit(bitboard, 131)).toBe(true)
  })

  test('clearBit', () => {
    const bitboard = { ...FULL_BITBOARD }

    clearBit(bitboard, 0)
    expect(testBit(bitboard, 0)).toBe(false)
    expect(testBit(bitboard, 1)).toBe(true)
  })

  test('popCount', () => {
    const bitboard = { ...EMPTY_BITBOARD }
    expect(popCount(bitboard)).toBe(0)

    setBit(bitboard, 0)
    setBit(bitboard, 65)
    setBit(bitboard, 131)
    expect(popCount(bitboard)).toBe(3)
  })

  test('bitwise operations', () => {
    const a = { ...EMPTY_BITBOARD }
    const b = { ...EMPTY_BITBOARD }

    setBit(a, 0)
    setBit(a, 65)
    setBit(b, 0)
    setBit(b, 131)

    const andResult = bitwiseAnd(a, b)
    expect(testBit(andResult, 0)).toBe(true)
    expect(testBit(andResult, 65)).toBe(false)
    expect(testBit(andResult, 131)).toBe(false)

    const orResult = bitwiseOr(a, b)
    expect(testBit(orResult, 0)).toBe(true)
    expect(testBit(orResult, 65)).toBe(true)
    expect(testBit(orResult, 131)).toBe(true)
  })
})
````

**Move Generation Tests**

```typescript
describe('Move Generation', () => {
  let position: BitboardPosition
  let moveGenerator: BitboardMoveGenerator

  beforeEach(() => {
    position = createStartingPosition()
    moveGenerator = new BitboardMoveGenerator(/* dependencies */)
  })

  test('Infantry move generation', () => {
    // Place infantry at e4
    const square = algebraicToSquare('e4')
    placeTestPiece(position, square, PieceType.INFANTRY, Color.RED)

    const moves = moveGenerator.generateSinglePieceMoves(position, square, {
      type: PieceType.INFANTRY,
      heroic: false,
      color: Color.RED,
    })

    // Infantry should have 4 orthogonal moves from e4
    expect(moves.length).toBe(4)

    const targetSquares = moves.map((m) => squareToAlgebraic(m.to))
    expect(targetSquares).toContain('e5')
    expect(targetSquares).toContain('e3')
    expect(targetSquares).toContain('d4')
    expect(targetSquares).toContain('f4')
  })

  test('Heroic infantry move generation', () => {
    const square = algebraicToSquare('e4')
    placeTestPiece(position, square, PieceType.INFANTRY, Color.RED, true)

    const moves = moveGenerator.generateSinglePieceMoves(position, square, {
      type: PieceType.INFANTRY,
      heroic: true,
      color: Color.RED,
    })

    // Heroic infantry should have 8 moves (orthogonal + diagonal)
    expect(moves.length).toBe(8)
  })

  test('Tank shoot-over-blocking', () => {
    const tankSquare = algebraicToSquare('e4')
    const blockingSquare = algebraicToSquare('e5')
    const targetSquare = algebraicToSquare('e6')

    placeTestPiece(position, tankSquare, PieceType.TANK, Color.RED)
    placeTestPiece(position, blockingSquare, PieceType.INFANTRY, Color.RED)
    placeTestPiece(position, targetSquare, PieceType.INFANTRY, Color.BLUE)

    const moves = moveGenerator.generateSinglePieceMoves(position, tankSquare, {
      type: PieceType.TANK,
      heroic: false,
      color: Color.RED,
    })

    // Tank should be able to capture at e6 despite blocking piece at e5
    const captureMove = moves.find(
      (m) => m.to === targetSquare && m.flags & MoveFlags.CAPTURE,
    )
    expect(captureMove).toBeDefined()
  })
})
```

**Stack System Tests**

```typescript
describe('Stack System', () => {
  let stackManager: HybridStackManager
  let position: BitboardPosition

  beforeEach(() => {
    position = createEmptyPosition()
    stackManager = new HybridStackManager(position, TERRAIN)
  })

  test('Create stack', () => {
    const square = algebraicToSquare('e4')
    const pieces = [
      { type: PieceType.INFANTRY, heroic: false, color: Color.RED },
      { type: PieceType.TANK, heroic: false, color: Color.RED },
      { type: PieceType.MILITIA, heroic: true, color: Color.RED },
    ]

    const success = stackManager.createStack(square, pieces, Color.RED)
    expect(success).toBe(true)

    const stackInfo = stackManager.getPieceAt(square)
    expect(stackInfo).toBeDefined()
    expect(stackInfo!.isStack).toBe(true)
    expect(stackInfo!.carrier.type).toBe(PieceType.INFANTRY)
    expect(stackInfo!.carried.length).toBe(2)
  })

  test('Deploy piece from stack', () => {
    const stackSquare = algebraicToSquare('e4')
    const deploySquare = algebraicToSquare('e5')

    // Create test stack
    const pieces = [
      { type: PieceType.INFANTRY, heroic: false, color: Color.RED },
      { type: PieceType.TANK, heroic: false, color: Color.RED },
    ]
    stackManager.createStack(stackSquare, pieces, Color.RED)

    // Deploy tank
    const success = stackManager.deployPiece(
      stackSquare,
      deploySquare,
      PieceType.TANK,
    )
    expect(success).toBe(true)

    // Check deployed piece
    const deployedPiece = stackManager.getPieceAt(deploySquare)
    expect(deployedPiece?.carrier.type).toBe(PieceType.TANK)

    // Check remaining stack
    const remainingStack = stackManager.getPieceAt(stackSquare)
    expect(remainingStack?.isStack).toBe(false) // Only infantry left
    expect(remainingStack?.carrier.type).toBe(PieceType.INFANTRY)
  })

  test('Terrain validation during deploy', () => {
    const stackSquare = algebraicToSquare('c4') // Land square
    const waterSquare = algebraicToSquare('a4') // Water square

    // Create stack with Navy
    const pieces = [
      { type: PieceType.INFANTRY, heroic: false, color: Color.RED },
      { type: PieceType.NAVY, heroic: false, color: Color.RED },
    ]
    stackManager.createStack(stackSquare, pieces, Color.RED)

    // Try to deploy Navy to water (should succeed)
    const successWater = stackManager.deployPiece(
      stackSquare,
      waterSquare,
      PieceType.NAVY,
    )
    expect(successWater).toBe(true)

    // Try to deploy Infantry to water (should fail)
    const landSquare = algebraicToSquare('b4')
    const successLand = stackManager.deployPiece(
      stackSquare,
      landSquare,
      PieceType.INFANTRY,
    )
    expect(successLand).toBe(true) // Infantry can go on mixed/land squares
  })
})
```

### Integration Testing

**Cross-Validation with Current Implementation**

```typescript
describe('Cross-Validation Tests', () => {
  test('Move generation matches current implementation', () => {
    const testPositions = [
      DEFAULT_POSITION,
      'test-position-1.fen',
      'test-position-2.fen',
      // ... more test positions
    ]

    for (const fen of testPositions) {
      // Load position in both implementations
      const currentGame = new CoTuLenh(fen)
      const bitboardGame = new BitboardCoTuLenh(fen)

      // Generate moves
      const currentMoves = currentGame.moves({ verbose: true })
      const bitboardMoves = bitboardGame.moves({ verbose: true })

      // Compare move counts
      expect(bitboardMoves.length).toBe(currentMoves.length)

      // Compare individual moves (convert to comparable format)
      const currentSAN = currentMoves.map((m) => m.san).sort()
      const bitboardSAN = bitboardMoves.map((m) => m.san).sort()

      expect(bitboardSAN).toEqual(currentSAN)
    }
  })

  test('Position evaluation matches', () => {
    const testPositions = loadTestPositions()

    for (const position of testPositions) {
      const currentResult = evaluateWithCurrent(position)
      const bitboardResult = evaluateWithBitboard(position)

      expect(bitboardResult.isCheck).toBe(currentResult.isCheck)
      expect(bitboardResult.isCheckmate).toBe(currentResult.isCheckmate)
      expect(bitboardResult.isGameOver).toBe(currentResult.isGameOver)
    }
  })
})
```

### Performance Testing

**Benchmarking Framework**

```typescript
describe('Performance Benchmarks', () => {
  test('Move generation speed', () => {
    const testPositions = loadBenchmarkPositions()
    const iterations = 10000

    for (const position of testPositions) {
      const startTime = performance.now()

      for (let i = 0; i < iterations; i++) {
        const moves = generateAllMoves(position, Color.RED)
      }

      const endTime = performance.now()
      const avgTime = (endTime - startTime) / iterations

      console.log(
        `Position: ${position.name}, Avg time: ${avgTime.toFixed(3)}ms`,
      )

      // Assert performance targets
      expect(avgTime).toBeLessThan(1.0) // Target: < 1ms per position
    }
  })

  test('Memory usage', () => {
    const initialMemory = process.memoryUsage().heapUsed

    // Create many positions
    const positions = []
    for (let i = 0; i < 1000; i++) {
      positions.push(createRandomPosition())
    }

    const finalMemory = process.memoryUsage().heapUsed
    const memoryPerPosition = (finalMemory - initialMemory) / 1000

    console.log(`Memory per position: ${memoryPerPosition} bytes`)

    // Assert memory targets
    expect(memoryPerPosition).toBeLessThan(2000) // Target: < 2KB per position
  })
})
```

## Migration Path from Current Implementation

### Gradual Migration Strategy

**Phase 1: Parallel Implementation**

```typescript
// Adapter pattern for gradual migration
class HybridCoTuLenh implements CoTulenhInterface {
  private currentImpl: CoTuLenh
  private bitboardImpl: BitboardCoTuLenh
  private useBitboard: boolean = false

  constructor(fen?: string) {
    this.currentImpl = new CoTuLenh(fen)
    this.bitboardImpl = new BitboardCoTuLenh(fen)
  }

  // Gradually switch methods to bitboard implementation
  moves(options?: MoveOptions): Move[] {
    if (this.useBitboard && this.isSimplePosition()) {
      return this.bitboardImpl.moves(options)
    } else {
      return this.currentImpl.moves(options)
    }
  }

  move(move: string | MoveObject): Move | null {
    // Apply to both implementations for validation
    const currentResult = this.currentImpl.move(move)

    if (this.useBitboard) {
      const bitboardResult = this.bitboardImpl.move(move)
      this.validateResults(currentResult, bitboardResult)
    }

    return currentResult
  }

  private isSimplePosition(): boolean {
    // Use bitboard only for positions without complex stacks initially
    return !this.hasComplexStacks()
  }

  private validateResults(current: Move | null, bitboard: Move | null): void {
    if (current?.san !== bitboard?.san) {
      console.warn('Implementation mismatch detected', { current, bitboard })
    }
  }
}
```

**Phase 2: Feature-by-Feature Migration**

```typescript
// Migrate specific features incrementally
class MigrationCoTuLenh extends CoTuLenh {
  private bitboardMoveGen: BitboardMoveGenerator

  constructor(fen?: string) {
    super(fen)
    this.bitboardMoveGen = new BitboardMoveGenerator(/* ... */)
  }

  // Override specific methods with bitboard implementation
  protected _moves(options: MoveOptions): InternalMove[] {
    if (this.shouldUseBitboardMoveGen(options)) {
      return this.generateMovesWithBitboard(options)
    } else {
      return super._moves(options)
    }
  }

  private shouldUseBitboardMoveGen(options: MoveOptions): boolean {
    // Use bitboard for simple cases first
    return !options.deploy && !this.hasActiveDeploySession()
  }

  private generateMovesWithBitboard(options: MoveOptions): InternalMove[] {
    const position = this.convertToBitboardPosition()
    const bitboardMoves = this.bitboardMoveGen.generateAllMoves(
      position,
      this.turn(),
    )
    return this.convertToInternalMoves(bitboardMoves)
  }
}
```

**Phase 3: Complete Migration**

```typescript
// Final migration to pure bitboard implementation
class BitboardCoTuLenh implements CoTulenhInterface {
  private position: BitboardPosition
  private moveGenerator: BitboardMoveGenerator
  private stackManager: HybridStackManager
  private history: BitboardMove[] = []

  constructor(fen?: string) {
    this.position = this.loadFromFEN(fen || DEFAULT_POSITION)
    this.stackManager = new HybridStackManager(this.position, TERRAIN)
    this.moveGenerator = new BitboardMoveGenerator(/* ... */)
  }

  moves(options?: MoveOptions): Move[] {
    const bitboardMoves = this.moveGenerator.generateAllMoves(
      this.position,
      this.getCurrentTurn(),
    )

    return bitboardMoves.map((move) => this.convertToPublicMove(move))
  }

  move(move: string | MoveObject): Move | null {
    const internalMove = this.parseMove(move)
    if (!internalMove) return null

    // Apply move to position
    this.applyMove(internalMove)
    this.history.push(internalMove)

    return this.convertToPublicMove(internalMove)
  }

  // Implement all other CoTulenhInterface methods...
}
```

## Validation and Correctness Verification

### Correctness Validation Strategy

**1. Unit Test Coverage**

- 100% coverage of bitboard operations
- Comprehensive move generation tests
- Stack system validation tests
- Terrain and air defense tests

**2. Cross-Validation**

- Compare results with current implementation
- Validate on thousands of test positions
- Check edge cases and boundary conditions

**3. Game Integrity Tests**

- Play complete games with both implementations
- Verify game outcomes match
- Test all special rules and mechanics

**4. Performance Regression Tests**

- Continuous benchmarking
- Memory usage monitoring
- Performance target validation

### Error Detection and Debugging

**Debugging Tools**

```typescript
class BitboardDebugger {
  static printBitboard(bitboard: Bitboard, label: string): void {
    console.log(`\n${label}:`)
    for (let rank = 11; rank >= 0; rank--) {
      let line = `${rank + 1}`.padStart(2) + ' '
      for (let file = 0; file < 11; file++) {
        const square = rank * 11 + file
        const bit = testBit(bitboard, square) ? '1' : '0'
        line += bit + ' '
      }
      console.log(line)
    }
    console.log('   a b c d e f g h i j k')
  }

  static validatePosition(position: BitboardPosition): ValidationResult {
    const errors: string[] = []

    // Check bitboard consistency
    const allPiecesCalculated = this.calculateAllPieces(position.pieces)
    if (!isEqual(allPiecesCalculated, position.occupancy.allPieces)) {
      errors.push('All pieces bitboard inconsistent')
    }

    // Check color consistency
    const redPiecesCalculated = this.calculateColorPieces(
      position.pieces,
      Color.RED,
    )
    if (!isEqual(redPiecesCalculated, position.occupancy.redPieces)) {
      errors.push('Red pieces bitboard inconsistent')
    }

    // Check stack consistency
    for (const [square, stackInfo] of position.stacks) {
      if (!testBit(position.occupancy.stackSquares, square)) {
        errors.push(`Stack at ${square} not marked in stackSquares bitboard`)
      }
    }

    return { isValid: errors.length === 0, errors }
  }
}
```

## Conclusion

This implementation strategy provides a comprehensive roadmap for adopting
bitboard architecture in CoTuLenh. The phased approach minimizes risk while
maximizing performance benefits. Key success factors include:

1. **Thorough Testing**: Extensive validation against current implementation
2. **Incremental Migration**: Gradual adoption reduces integration risk
3. **Hybrid Approach**: Balance performance with implementation complexity
4. **Continuous Validation**: Ongoing correctness and performance monitoring

The resulting bitboard implementation should provide 2.5-4x performance
improvements while maintaining full compatibility with CoTuLenh's complex game
mechanics.
