# Board Layout and Coordinate System

## Overview

⚠️ **DEPRECATED**: This document contains outdated information about 0x88
representation.

**See the comprehensive and accurate documentation**:
[board-coordinate-system.md](./board-coordinate-system.md)

CoTuLenh uses a 12×11 board with a **16×16 mailbox representation** (NOT 0x88)
for efficient computation.

## Board Dimensions

- **Size**: 11 files × 12 ranks (132 squares total)
- **Files**: a, b, c, d, e, f, g, h, i, j, k (11 files)
- **Ranks**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 (12 ranks)
- **Algebraic Range**: a1 to k12

## Internal 0x88 Representation

The game uses a 0x88 board representation within a 256-element array (16×16
grid) to efficiently store the 11×12 board.

### Square Indexing

```typescript
// Square mapping examples:
a12: 0x00  // Top-left corner (rank 12)
b12: 0x01
...
k12: 0x0A  // Top-right corner

a11: 0x10  // Second rank from top
...
k11: 0x1A

...

a1: 0xB0   // Bottom-left corner (rank 1)
...
k1: 0xBA   // Bottom-right corner
```

### Coordinate Conversion Functions

#### Internal to Algebraic

```typescript
function algebraic(square: number): Square {
  const f = file(square) // Extract file (0-10)
  const r = rank(square) // Extract rank (0-11)
  return (FILES[f] + RANKS[r]) as Square
}
```

#### File and Rank Extraction

```typescript
// Extract zero-based file (0-10) from 0x88 square
function file(square: number): number {
  return square & 0xf
}

// Extract zero-based rank (0-11) from 0x88 square
function rank(square: number): number {
  return square >> 4
}
```

### Boundary Detection

#### On-Board Validation

```typescript
function isSquareOnBoard(sq: number): boolean {
  const r = rank(sq)
  const f = file(sq)
  return r >= 0 && r < 12 && f >= 0 && f < 11
}
```

The 0x88 representation allows for efficient boundary checking - any square with
bits set in positions 0x88 (136 in decimal) is automatically off-board.

## Algebraic Notation System

### Standard Format

- **Files**: Letters a-k (left to right)
- **Ranks**: Numbers 1-12 (bottom to top)
- **Examples**: a1, e6, k12

### Rank Ordering

- **Rank 12**: Top of board (Red's back rank in default position)
- **Rank 7-6**: River zone (terrain transition area)
- **Rank 1**: Bottom of board (Blue's back rank in default position)

## Board Layout Visualization

```
Rank 12: a12 b12 c12 d12 e12 f12 g12 h12 i12 j12 k12
Rank 11: a11 b11 c11 d11 e11 f11 g11 h11 i11 j11 k11
Rank 10: a10 b10 c10 d10 e10 f10 g10 h10 i10 j10 k10
Rank  9: a9  b9  c9  d9  e9  f9  g9  h9  i9  j9  k9
Rank  8: a8  b8  c8  d8  e8  f8  g8  h8  i8  j8  k8
Rank  7: a7  b7  c7  d7  e7  f7  g7  h7  i7  j7  k7
         -------------------------------------------- River
Rank  6: a6  b6  c6  d6  e6  f6  g6  h6  i6  j6  k6
Rank  5: a5  b5  c5  d5  e5  f5  g5  h5  i5  j5  k5
Rank  4: a4  b4  c4  d4  e4  f4  g4  h4  i4  j4  k4
Rank  3: a3  b3  c3  d3  e3  f3  g3  h3  i3  j3  k3
Rank  2: a2  b2  c2  d2  e2  f2  g2  h2  i2  j2  k2
Rank  1: a1  b1  c1  d1  e1  f1  g1  h1  i1  j1  k1
```

## Implementation Details

### Square Map Generation

The complete square mapping is generated programmatically:

```typescript
export const SQUARE_MAP: Record<Square, number> = {
  // Generated for all 132 valid squares
  a12: 0x00, b12: 0x01, c12: 0x02, ..., k12: 0x0A,
  a11: 0x10, b11: 0x11, c11: 0x12, ..., k11: 0x1A,
  // ... continuing for all ranks
  a1: 0xB0, b1: 0xB1, c1: 0xB2, ..., k1: 0xBA
}
```

### Memory Layout

- **Total Array Size**: 256 elements (16×16)
- **Valid Squares**: 132 out of 256 positions
- **Invalid Squares**: Positions where file > 10 or rank > 11
- **Memory Efficiency**: ~51.6% utilization, but enables fast boundary checking

### Validation Rules

1. **File Range**: 0 ≤ file ≤ 10 (a-k)
2. **Rank Range**: 0 ≤ rank ≤ 11 (1-12)
3. **Square Bounds**: Must pass `isSquareOnBoard()` validation
4. **0x88 Property**: Invalid squares have bits set in 0x88 positions

## Performance Characteristics

### Advantages of 0x88 System

- **Fast Boundary Checking**: Single bitwise operation
- **Efficient Direction Vectors**: Simple arithmetic for piece movement
- **Memory Alignment**: Good cache performance for move generation
- **Algebraic Conversion**: Direct mathematical relationship

### Direction Offsets

```typescript
const ORTHOGONAL_OFFSETS = [-16, 1, 16, -1] // N, E, S, W
const DIAGONAL_OFFSETS = [-17, -15, 17, 15] // NE, NW, SE, SW
```

These offsets work directly with the 0x88 representation for efficient move
generation.
