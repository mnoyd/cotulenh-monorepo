# CoTuLenh Board Coordinate System - Complete Reference

## Overview

CoTuLenh uses a **12×11 board** with a **16×16 mailbox representation** for
efficient computation. This document provides the definitive reference for the
coordinate system, correcting previous documentation that incorrectly referenced
"0x88" representation.

## Board Dimensions

- **Size**: 12 ranks × 11 files (132 playable squares)
- **Files**: a, b, c, d, e, f, g, h, i, j, k (11 files, 0-10 internally)
- **Ranks**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 (12 ranks, 0-11 internally)
- **Internal Representation**: 16×16 mailbox (256 total positions)
- **Algebraic Range**: a1 to k12

## Critical Implementation Details

### 16×16 Mailbox (NOT 0x88)

The implementation uses a **16×16 mailbox representation** within a 256-element
array:

```typescript
// Square encoding formula
square = rank * 16 + file

// Examples:
// a12 (top-left) = 0*16 + 0 = 0
// k12 (top-right) = 0*16 + 10 = 10
// a1 (bottom-left) = 11*16 + 0 = 176
// k1 (bottom-right) = 11*16 + 10 = 186
// e6 (center) = 6*16 + 4 = 100
```

### Rank Inversion System

**CRITICAL**: The implementation uses **inverted ranks**:

```typescript
// Display Rank → Internal Rank
12 → 0  // Top of board
11 → 1
10 → 2
9  → 3
8  → 4
7  → 5
6  → 6  // Middle
5  → 7
4  → 8
3  → 9
2  → 10
1  → 11 // Bottom of board

// Conversion formula:
internal_rank = 12 - display_rank
display_rank = 12 - internal_rank
```

### File and Rank Extraction

```typescript
// Extract file (0-10) from square
function getFile(square: number): number {
  return square & 0x0f
}

// Extract internal rank (0-11) from square
function getRank(square: number): number {
  return square >> 4
}

// Get display rank (1-12)
function getRankNumber(square: number): number {
  return 12 - getRank(square)
}
```

## Coordinate Conversion Functions

### Algebraic to Square Number

```typescript
function algebraicToSquare(notation: string): number {
  const fileChar = notation.charCodeAt(0)
  const file = fileChar - 'a'.charCodeAt(0) // a=0, b=1, ..., k=10

  const rankStr = notation.substring(1)
  const displayRank = parseInt(rankStr, 10) // 1-12
  const rank = 12 - displayRank // Convert to internal rank (0-11)

  return rank * 16 + file
}

// Examples:
algebraicToSquare('e6') // Returns 100
algebraicToSquare('a12') // Returns 0
algebraicToSquare('k1') // Returns 186
```

### Square Number to Algebraic

````typescript
function squareToAlgebraic(square: number): string {
  const file = getFile(square)
  const rank = getRank(square)

  const fileChar = String.fromCharCode('a'.charCodeAt(0) + file)
  const rankNum = 12 - rank // Convert to display rank

  return `${fileChar}${rankNum}`
}

// Examples:
squareToAlgebraic(100) // Returns 'e6'
squareToAlgebraic(0)   // Returns 'a12'
squareToAlgebraic(186) // Returns 'k1'
```##
 Board Layout Visualization

````

a b c d e f g h i j k 12 . . . . . . . . . . . ← Rank 12 (internal rank 0) - TOP
11 . . . . . . . . . . . ← Rank 11 (internal rank 1) 10 . . . . . . . . . . . ←
Rank 10 (internal rank 2) 9 . . . . . . . . . . . ← Rank 9 (internal rank 3) 8 .
. . . . . . . . . . ← Rank 8 (internal rank 4) 7 . . . . . . . . . . . ← Rank 7
(internal rank 5) 6 . . . . X . . . . . . ← Rank 6 (internal rank 6) - e6 =
square 100 5 . . . . . . . . . . . ← Rank 5 (internal rank 7) 4 . . . . . . . .
. . . ← Rank 4 (internal rank 8) 3 . . . . . . . . . . . ← Rank 3 (internal
rank 9) 2 . . . . . . . . . . . ← Rank 2 (internal rank 10) 1 . . . . . . . . .
. . ← Rank 1 (internal rank 11) - BOTTOM

````

## Movement Direction Offsets

### In Square Numbers (16×16 mailbox)

```typescript
const DIRECTION_OFFSETS = {
  NORTH:     -16,  // Rank decreases (display rank increases)
  SOUTH:     +16,  // Rank increases (display rank decreases)
  EAST:      +1,   // File increases
  WEST:      -1,   // File decreases
  NORTHEAST: -15,  // North + East (-16 + 1)
  NORTHWEST: -17,  // North + West (-16 - 1)
  SOUTHEAST: +17,  // South + East (+16 + 1)
  SOUTHWEST: +15,  // South + West (+16 - 1)
}
````

### Movement Examples from e6 (square 100)

```typescript
const e6 = 100
const e7 = e6 - 16 // 84  (North - display rank increases)
const e5 = e6 + 16 // 116 (South - display rank decreases)
const f6 = e6 + 1 // 101 (East)
const d6 = e6 - 1 // 99  (West)
const f7 = e6 - 15 // 85  (Northeast)
const d7 = e6 - 17 // 83  (Northwest)
const f5 = e6 + 17 // 117 (Southeast)
const d5 = e6 + 15 // 115 (Southwest)
```

## Terrain Zones

### Water Zone (Navy Only)

- **Files a-b** (files 0-1): Pure water, only Navy can move here
- **Examples**: a6=96, b6=97

### Mixed Zone (Navy + Land Pieces)

- **File c** (file 2): Mixed terrain, both Navy and land pieces
- **River squares**: d6, e6, d7, e7 (files 3-4, internal ranks 6-5)
- **Examples**: c6=98, d6=99, e6=100, d7=83, e7=84

### Land Zone (Land Pieces Only)

- **Files d-k** (files 3-10): Pure land, only land pieces can move here
- **Examples**: f6=101, h6=103, k6=106

## River System and Heavy Piece Restrictions

### River Zones

- **Upper Zone**: Display ranks 7-12 (internal ranks 0-5)
- **Lower Zone**: Display ranks 1-6 (internal ranks 6-11)
- **River Squares**: d6, e6, d7, e7 (mixed terrain)

### Heavy Piece Restriction

Heavy pieces (Artillery, Anti-Air, Missile) cannot cross between zones:

```typescript
// Example: Artillery at f8 cannot move to f5
const f8 = algebraicToSquare('f8') // Upper zone (internal rank 4)
const f5 = algebraicToSquare('f5') // Lower zone (internal rank 7)

const f8Zone = getRank(f8) <= 5 ? 'upper' : 'lower' // 'upper'
const f5Zone = getRank(f5) <= 5 ? 'upper' : 'lower' // 'lower'
// Cannot move between different zones
```

## Boundary Validation

### Valid Square Check

```typescript
function isValidSquare(square: number): boolean {
  const file = getFile(square)
  const rank = getRank(square)
  return file < 11 && rank < 12 // 11 files, 12 ranks
}
```

### Boundary Detection

Unlike 0x88, the 16×16 mailbox requires explicit boundary checking:

````typescript
// Check if move stays on board
function isValidMove(from: number, to: number): boolean {
  if (!isValidSquare(to)) return false

  const fromFile = getFile(from)
  const toFile = getFile(to)
  const fromRank = getRank(from)
  const toRank = getRank(to)

  // Detect wrapping (file or rank jumped too far)
  if (Math.abs(toFile - fromFile) > 3 || Math.abs(toRank - fromRank) > 3) {
    return false
  }

  return true
}
```## Common M
istakes to Avoid

### 1. Rank Inversion Confusion

```typescript
// ❌ WRONG - Thinking rank 1 is at top
expect(algebraicToSquare('e1')).toBe(4)  // Wrong!

// ✅ CORRECT - Rank 12 is at top, rank 1 is at bottom
expect(algebraicToSquare('e12')).toBe(4)   // Top
expect(algebraicToSquare('e1')).toBe(180)  // Bottom
````

### 2. Terrain Restrictions

```typescript
// ❌ WRONG - Placing land pieces on water
const tank = { type: 't', color: 'r' }
board.set(algebraicToSquare('a6'), tank) // a6 is water - invalid!

// ✅ CORRECT - Check terrain before placement
const square = algebraicToSquare('a6')
if (isLandSquare(square)) {
  board.set(square, tank) // Only place if valid terrain
}
```

### 3. Flying General Violations in Tests

```typescript
// ❌ WRONG - Commanders on same file
const redCommander = algebraicToSquare('e6') // File e
const blueCommander = algebraicToSquare('e9') // File e - same file!

// ✅ CORRECT - Commanders on different files
const redCommander = algebraicToSquare('e6') // File e
const blueCommander = algebraicToSquare('h9') // File h - different file
```

### 4. Movement Calculation Errors

```typescript
// ❌ WRONG - Using 12 as stride
const wrongNorth = square - 12 // Wrong stride!

// ✅ CORRECT - Using 16 as stride (mailbox)
const correctNorth = square - 16 // Correct stride
```

### 5. Boundary Checks

```typescript
// ❌ WRONG - Not checking boundaries
const newSquare = square + 1 // Might wrap to next rank!

// ✅ CORRECT - Check file boundaries
const file = getFile(square)
if (file < 10) {
  // Max file is 10 (k)
  const newSquare = square + 1
}
```

## Testing Best Practices

### Valid Test Setups

```typescript
// ✅ Good commander positions (different files)
const redCommander = algebraicToSquare('e6') // File e, rank 6
const blueCommander = algebraicToSquare('h9') // File h, rank 9

// ✅ Proper terrain usage
const tankOnLand = algebraicToSquare('f6') // Land square
const navyOnWater = algebraicToSquare('a6') // Water square
const navyOnRiver = algebraicToSquare('d6') // River (mixed) square

// ✅ Valid movement tests
const from = algebraicToSquare('e6')
const to = algebraicToSquare('e8') // 2 squares north
expect(to - from).toBe(-32) // -16 * 2 = -32
```

### Common Test Patterns

```typescript
// Movement validation
const moves = gameController.getMoves()
const pieceMoves = moves.filter(
  (move) => 'from' in move && move.from === algebraicToSquare('e6'),
)
const destinations = pieceMoves
  .filter((move) => 'to' in move)
  .map((move) => squareToAlgebraic(move.to))

// Terrain-aware expectations
expect(destinations).toContain('f6') // Land square - OK
expect(destinations).not.toContain('a6') // Water square - not for land pieces
```

## Quick Reference Tables

### Corner Squares

| Algebraic | Square # | Calculation | Description  |
| --------- | -------- | ----------- | ------------ |
| a12       | 0        | 0×16 + 0    | Top-left     |
| k12       | 10       | 0×16 + 10   | Top-right    |
| a1        | 176      | 11×16 + 0   | Bottom-left  |
| k1        | 186      | 11×16 + 10  | Bottom-right |

### Common Test Squares

| Algebraic | Square # | File | Internal Rank | Display Rank |
| --------- | -------- | ---- | ------------- | ------------ |
| e6        | 100      | 4    | 6             | 6            |
| f7        | 85       | 5    | 5             | 7            |
| d5        | 115      | 3    | 7             | 5            |
| h9        | 55       | 7    | 3             | 9            |

### Movement Offsets from Any Square

| Direction | Offset | Example from e6 (100) |
| --------- | ------ | --------------------- |
| North     | -16    | e7 = 100-16 = 84      |
| South     | +16    | e5 = 100+16 = 116     |
| East      | +1     | f6 = 100+1 = 101      |
| West      | -1     | d6 = 100-1 = 99       |
| NE        | -15    | f7 = 100-15 = 85      |
| NW        | -17    | d7 = 100-17 = 83      |
| SE        | +17    | f5 = 100+17 = 117     |
| SW        | +15    | d5 = 100+15 = 115     |

## Performance Characteristics

### Advantages of 16×16 Mailbox

- **Simple arithmetic**: Direct calculation with rank \* 16 + file
- **Efficient direction vectors**: Simple addition for piece movement
- **Memory alignment**: Good cache performance for move generation
- **Algebraic conversion**: Direct mathematical relationship

### Memory Layout

- **Total Array Size**: 256 elements (16×16)
- **Valid Squares**: 132 out of 256 positions
- **Invalid Squares**: Positions where file > 10 or rank > 11
- **Memory Efficiency**: ~51.6% utilization

## Verification Tests

Run the coordinate system verification tests to ensure understanding:

```bash
npm test __tests__/utils/coordinate-system-verification.test.ts
```

This coordinate system is used throughout the codebase for move generation,
legal move validation, and board representation. Understanding these details
prevents common bugs in test writing and game logic implementation.

## Migration Notes

### From Previous Documentation

- **Changed**: No longer using 0x88 representation
- **Changed**: Using 16×16 mailbox instead
- **Added**: Rank inversion system documentation
- **Added**: Comprehensive testing guidelines
- **Added**: Common mistake prevention

### Implementation Status

- ✅ **Implemented**: 16×16 mailbox representation
- ✅ **Implemented**: Rank inversion system
- ✅ **Implemented**: Algebraic conversion functions
- ✅ **Implemented**: Terrain zone validation
- ✅ **Tested**: Comprehensive verification test suite
