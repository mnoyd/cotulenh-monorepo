# Terrain Zones and Movement Masks

## Overview

CoTuLenh features a sophisticated terrain system that divides the 11×12 board
into distinct zones that restrict piece movement and placement. The system uses
two primary bitmasks to efficiently determine terrain accessibility.

## Terrain Mask System

### Core Masks

```typescript
export const NAVY_MASK = new Uint8Array(256) // 1 = navigable by navy
export const LAND_MASK = new Uint8Array(256) // 1 = accessible by land pieces
```

### Mask Initialization Logic

```typescript
function initMovementMasks() {
  for (let sq = 0; sq < 256; sq++) {
    if (!isSquareOnBoard(sq)) continue
    const f = file(sq) // File index (0-10)
    const r = rank(sq) // Rank index (0-11)

    // Navy operational areas (a-c files + specific river squares)
    NAVY_MASK[sq] =
      f <= 2 || ((f === 3 || f === 4) && (r === 5 || r === 6)) ? 1 : 0

    // Land pieces operational areas (c-k files)
    LAND_MASK[sq] = f >= 2 ? 1 : 0
  }
}
```

## Terrain Zone Classifications

### 1. Pure Water Zones (Navy Only)

- **Definition**: `NAVY_MASK[sq] && !LAND_MASK[sq]`
- **Files**: a, b (files 0-1)
- **Accessibility**: Navy pieces only
- **Characteristics**:
  - Complete water coverage
  - No land piece access
  - Navy pieces can move, capture, and station here

### 2. Mixed Zones (Navy + Land)

- **Definition**: `NAVY_MASK[sq] && LAND_MASK[sq]`
- **Files**: c (file 2) + specific river squares
- **River Squares**: d6, e6, d7, e7 (files 3-4, ranks 5-6)
- **Accessibility**: Both navy and land pieces
- **Characteristics**:
  - Transitional terrain
  - Navy can navigate through
  - Land pieces can traverse and station
  - Critical for piece interactions

### 3. Pure Land Zones (Land Only)

- **Definition**: `!NAVY_MASK[sq] && LAND_MASK[sq]`
- **Files**: d, e, f, g, h, i, j, k (files 3-10, excluding river squares)
- **Accessibility**: Land pieces only (+ Air Force)
- **Characteristics**:
  - Standard terrestrial terrain
  - Navy cannot access
  - Air Force can fly over

### 4. Bridge Squares (Special Features)

- **Squares**: f6, f7, h6, h7
- **Purpose**: Strategic crossing points
- **Visual**: Highlighted in board display
- **Accessibility**: Follow standard land zone rules
- **Strategic Importance**: Key tactical positions

## Terrain Zone Boundaries

### File-Based Zones

```
Files a-b (0-1): Pure Water
File c (2):      Mixed Zone
Files d-k (3-10): Land (with river exceptions)
```

### River System Detail

```
Rank 7: [Water][Water][Mixed][River][River][Land][Land][Land][Land][Land][Land]
Rank 6: [Water][Water][Mixed][River][River][Land][Land][Land][Land][Land][Land]
```

Where:

- **River squares**: d6, e6, d7, e7 (mixed zone extensions)
- **Bridge squares**: f6, f7, h6, h7 (special land features)

## Movement Validation Logic

### Navy Piece Placement

```typescript
if (newPiece.type === NAVY) {
  if (!NAVY_MASK[sq]) return false // Must be on water or mixed
}
```

### Land Piece Placement

```typescript
if (newPiece.type !== NAVY) {
  if (!LAND_MASK[sq]) return false // Must be on land or mixed
}
```

### Terrain Blocking Check

```typescript
function checkTerrainBlocking(
  from: number,
  to: number,
  pieceType: PieceSymbol,
): boolean {
  // Navy can only move on water
  if (pieceType === NAVY) {
    return !NAVY_MASK[to]
  }

  // Land pieces can't move on water (except Air Force)
  if (!LAND_MASK[to]) {
    return pieceType !== AIR_FORCE // Air Force can fly over water
  }

  return false
}
```

## Special Terrain Rules

### Air Force Exception

- **Rule**: Air Force can fly over any terrain
- **Implementation**: `pieceType !== AIR_FORCE` check in blocking logic
- **Effect**: Air Force ignores water restrictions

### Navy Deployment Restrictions

```typescript
// Navy on pure water cannot deploy land pieces
if (carrierPiece.type === NAVY && !LAND_MASK[stackSquare]) {
  deployMoveCandidates = deployMoveCandidates.filter(
    (p) => p.type !== carrierPiece.type,
  )
}
```

### Piece Staying Validation

```typescript
function canStayOnSquare(square: number, pieceType: PieceSymbol): boolean {
  return pieceType === NAVY ? !!NAVY_MASK[square] : !!LAND_MASK[square]
}
```

## Visual Representation

### Board Display Color Coding

```typescript
const isNavyZone = NAVY_MASK[sq] && !LAND_MASK[sq] // Pure navy (blue)
const isMixedZone = NAVY_MASK[sq] && LAND_MASK[sq] // Mixed (cyan)
const isBridge = ['f6', 'f7', 'h6', 'h7'].includes(alg) // Bridge (yellow/white)
// Pure land zones have no special background
```

### Terrain Map

```
    a  b  c  d  e  f  g  h  i  j  k
12 [W][W][M][L][L][L][L][L][L][L][L]
11 [W][W][M][L][L][L][L][L][L][L][L]
10 [W][W][M][L][L][L][L][L][L][L][L]
 9 [W][W][M][L][L][L][L][L][L][L][L]
 8 [W][W][M][L][L][L][L][L][L][L][L]
 7 [W][W][M][R][R][B][L][B][L][L][L]  ← River + Bridges
 6 [W][W][M][R][R][B][L][B][L][L][L]  ← River + Bridges
 5 [W][W][M][L][L][L][L][L][L][L][L]
 4 [W][W][M][L][L][L][L][L][L][L][L]
 3 [W][W][M][L][L][L][L][L][L][L][L]
 2 [W][W][M][L][L][L][L][L][L][L][L]
 1 [W][W][M][L][L][L][L][L][L][L][L]

Legend:
W = Pure Water (Navy only)
M = Mixed Zone (Navy + Land)
L = Pure Land (Land only)
R = River (Mixed zone extension)
B = Bridge (Special land feature)
```

## Implementation Details

### Mask Storage

- **Type**: `Uint8Array(256)` - one byte per square
- **Values**: 0 (inaccessible) or 1 (accessible)
- **Memory**: 512 bytes total (256 × 2 masks)

### Performance Characteristics

- **Lookup**: O(1) constant time
- **Validation**: Single array access
- **Memory Efficient**: Bit-packed representation

### Initialization Timing

- **When**: Module load time (static initialization)
- **Frequency**: Once per application startup
- **Dependencies**: Requires `file()` and `rank()` helper functions

## Strategic Implications

### Navy Advantages

- **Exclusive Access**: Pure water zones provide safe havens
- **Mobility**: Can traverse mixed zones for land attacks
- **Positioning**: River access enables inland strikes

### Land Piece Limitations

- **Water Barrier**: Cannot cross pure water zones
- **Chokepoints**: Must use mixed zones for navy interaction
- **River Dependency**: Limited river crossing options

### Mixed Zone Importance

- **Combat Interface**: Primary navy-land interaction area
- **Strategic Value**: Control of c-file and river squares
- **Tactical Complexity**: Both piece types can contest these squares
