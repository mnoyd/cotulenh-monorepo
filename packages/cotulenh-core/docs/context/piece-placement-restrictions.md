# Piece Placement Restrictions

## Overview

CoTuLenh enforces strict placement restrictions based on terrain compatibility,
commander limits, and piece combination rules. These restrictions ensure game
balance and maintain the strategic integrity of the terrain system.

## Core Placement Validation

### Main Placement Function

```typescript
put({
  type,
  color,
  heroic = false,
  carrying = undefined
}: {
  type: PieceSymbol
  color: Color
  heroic?: boolean
  carrying?: Piece[]
}, square: Square, allowCombine = false): boolean
```

### Validation Sequence

1. **Square Validity**: Check if square exists on board
2. **Piece Combination**: Handle stack formation if `allowCombine` is true
3. **Terrain Compatibility**: Validate piece can exist on terrain type
4. **Commander Limits**: Enforce one commander per color rule
5. **Piece Replacement**: Handle existing piece displacement
6. **Board Update**: Place piece and update game state

## Terrain-Based Placement Rules

### Navy Piece Restrictions

```typescript
if (newPiece.type === NAVY) {
  if (!NAVY_MASK[sq]) return false // Must be on water or mixed terrain
}
```

**Navy Placement Rules:**

- **Allowed Terrain**: Water zones (a-b files) + Mixed zones (c file + river
  squares)
- **Forbidden Terrain**: Pure land zones (d-k files, excluding river)
- **Specific Squares**: Can place on d6, e6, d7, e7 (river extensions)

### Land Piece Restrictions

```typescript
if (newPiece.type !== NAVY) {
  if (!LAND_MASK[sq]) return false // Must be on land or mixed terrain
}
```

**Land Piece Placement Rules:**

- **Allowed Terrain**: Land zones (c-k files) + Mixed zones
- **Forbidden Terrain**: Pure water zones (a-b files)
- **Air Force Exception**: Can be placed on any terrain (flies over water)

### Terrain Compatibility Matrix

```
Piece Type    | Pure Water | Mixed Zone | Pure Land | Notes
--------------|------------|------------|-----------|------------------
NAVY          | ✓          | ✓          | ✗         | Water/mixed only
COMMANDER     | ✗          | ✓          | ✓         | Land/mixed only
INFANTRY      | ✗          | ✓          | ✓         | Land/mixed only
TANK          | ✗          | ✓          | ✓         | Land/mixed only
MILITIA       | ✗          | ✓          | ✓         | Land/mixed only
ENGINEER      | ✗          | ✓          | ✓         | Land/mixed only
ARTILLERY     | ✗          | ✓          | ✓         | Land/mixed only
ANTI_AIR      | ✗          | ✓          | ✓         | Land/mixed only
MISSILE       | ✗          | ✓          | ✓         | Land/mixed only
AIR_FORCE     | ✓          | ✓          | ✓         | Can fly anywhere
HEADQUARTER   | ✗          | ✓          | ✓         | Land/mixed only
```

## Commander Placement Restrictions

### One Commander Per Color Rule

```typescript
// Handle commander limit
if (
  haveCommander(newPiece) &&
  this._commanders[color] !== -1 &&
  this._commanders[color] !== sq
) {
  return false
}
```

### Commander Limit Logic

- **Single Commander**: Each color can have only one commander on board
- **Replacement Allowed**: Can place commander on same square (replaces
  existing)
- **Different Square Blocked**: Cannot place second commander on different
  square
- **Stack Detection**: Uses `haveCommander()` to detect commanders in stacks

### Commander Tracking

```typescript
private _commanders: Record<Color, number> = { r: -1, b: -1 }

// Update commander position after placement
if (haveCommander(newPiece)) this._commanders[color] = sq
```

### Commander Displacement

```typescript
// Remove enemy commander if placing piece on their square
if (
  currentPiece &&
  haveCommander(currentPiece) &&
  currentPiece.color !== color &&
  this._commanders[currentPiece.color] === sq
) {
  this._commanders[currentPiece.color] = -1
}
```

## Piece Combination Restrictions

### Combination Validation

```typescript
if (allowCombine) {
  const existingPiece = this._board[sq] as Piece
  if (existingPiece) {
    const allPieces = [
      ...flattenPiece(existingPiece),
      ...flattenPiece(newPiece),
    ]
    const { combined: combinedPiece, uncombined } =
      createCombineStackFromPieces(allPieces)
    if (!combinedPiece || (uncombined?.length ?? 0) > 0) {
      throw new Error(`Failed to combine pieces at ${algebraic(sq)}`)
    }
    newPiece = combinedPiece
  }
}
```

### Combination Rules

- **Compatibility Check**: Uses external library to validate piece combinations
- **Stack Formation**: Creates combined piece with carrying array
- **Failure Handling**: Throws error if combination is invalid
- **Terrain Validation**: Combined piece must still satisfy terrain rules

### Terrain Compatibility for Stacks

The combined piece's **primary type** (carrier) determines terrain
compatibility:

- **Navy Carrier**: Stack can only be placed on water/mixed terrain
- **Land Carrier**: Stack can only be placed on land/mixed terrain
- **Air Force Carrier**: Stack can be placed anywhere

## Square Validation

### Valid Square Check

```typescript
if (!(square in SQUARE_MAP)) return false
const sq = SQUARE_MAP[square]
```

### Square Requirements

- **Algebraic Format**: Must be valid algebraic notation (a1-k12)
- **Board Bounds**: Must be within 11×12 board boundaries
- **Square Map**: Must exist in predefined SQUARE_MAP

### Invalid Square Handling

- **Return False**: Invalid squares cause placement to fail silently
- **No Error**: Does not throw exception for invalid squares
- **Early Exit**: Validation occurs before any other checks

## Movement vs Placement Distinction

### Placement Rules (put method)

- **Terrain Compatibility**: Must match piece type requirements
- **Commander Limits**: Enforced during placement
- **Combination Logic**: Handled if `allowCombine` is true

### Movement Rules (during gameplay)

- **Stay Validation**: Uses `canStayOnSquare()` for destination squares
- **Capture Logic**: Different rules for capture vs normal movement
- **Deploy Restrictions**: Special rules for piece deployment from stacks

### Stay Validation Function

```typescript
export function canStayOnSquare(
  square: number,
  pieceType: PieceSymbol,
): boolean {
  return pieceType === NAVY ? !!NAVY_MASK[square] : !!LAND_MASK[square]
}
```

## Error Conditions and Validation

### Placement Failure Conditions

1. **Invalid Square**: Square not in SQUARE_MAP
2. **Terrain Mismatch**: Piece type incompatible with terrain
3. **Commander Limit**: Attempting to place second commander
4. **Combination Failure**: Invalid piece combination when `allowCombine` is
   true

### Return Values

- **Success**: Returns `true` when placement succeeds
- **Failure**: Returns `false` for any validation failure
- **Exception**: Only throws for combination failures

### Side Effects of Successful Placement

1. **Board Update**: Piece placed in `_board` array
2. **Commander Tracking**: `_commanders` updated if commander placed
3. **Air Defense Update**: `_airDefense` recalculated if air defense piece
4. **Piece Displacement**: Existing pieces may be removed/captured

## Special Cases and Edge Conditions

### Air Force Placement

- **Universal Access**: Can be placed on any terrain type
- **Water Override**: Ignores normal land piece restrictions
- **Strategic Flexibility**: Provides unique positioning options

### River Square Placement

- **Mixed Terrain**: d6, e6, d7, e7 allow both navy and land pieces
- **Strategic Importance**: Key squares for navy-land interaction
- **Bridge Access**: Important for heavy piece river crossing

### Stack Placement Validation

- **Carrier Determines Terrain**: Primary piece type sets terrain requirements
- **Carrying Pieces**: Carried pieces don't affect terrain compatibility
- **Deployment Implications**: Affects which pieces can be deployed where

### Commander Replacement Scenarios

- **Same Square**: Placing commander on existing commander square succeeds
- **Enemy Commander**: Placing piece on enemy commander captures it
- **Friendly Commander**: Placing piece on friendly commander replaces it
- **Position Tracking**: `_commanders` array updated appropriately

## Implementation Performance

### Validation Efficiency

- **Early Exits**: Invalid squares fail immediately
- **Mask Lookups**: O(1) terrain validation using bitmasks
- **Commander Check**: O(1) position lookup in `_commanders` array

### Memory Impact

- **Board Update**: Single array element assignment
- **State Tracking**: Minimal overhead for position tracking
- **Air Defense**: Recalculation only for relevant piece types

### Cache Invalidation

- **Move Cache**: Placement may invalidate cached moves
- **State Consistency**: Ensures game state remains valid after placement
