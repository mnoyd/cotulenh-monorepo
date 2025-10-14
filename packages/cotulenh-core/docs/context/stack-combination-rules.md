# Stack System and Piece Combination Rules

## Overview

CoTuLenh implements a sophisticated stack system where pieces can combine to
form multi-piece units that move and fight together. This system adds strategic
depth through piece carrying, deployment mechanics, and complex interaction
rules.

## Core Stack Concepts

### Piece Structure

```typescript
type Piece = {
  color: Color
  type: PieceSymbol
  carrying?: Piece[] // Array of carried pieces
  heroic?: boolean // Heroic status affects all pieces in stack
}
```

### Stack Terminology

- **Carrier**: The primary piece that carries other pieces
- **Carried Pieces**: Pieces stored in the `carrying` array
- **Stack**: The complete combined unit (carrier + carried pieces)
- **Flattened Pieces**: All individual pieces when stack is decomposed

## Piece Combination Rules

### Basic Combination Mechanics

```typescript
function createCombinedPiece(pieceFrom: Piece, pieceTo: Piece): Piece | null {
  const combinedPiece = combinePiece.formStack(pieceFrom, pieceTo)
  return combinedPiece
}
```

### Combination Process

1. **External Validation**: Uses `@repo/cotulenh-combine-piece` library
2. **Stack Formation**: `pieceFrom` becomes carrier, `pieceTo` added to carrying
   array
3. **Color Matching**: Only pieces of same color can combine
4. **Type Compatibility**: Certain piece types cannot combine (enforced by
   library)

### Combination Examples

```typescript
// Tank carrying Infantry: (T|I)
const tank = { type: TANK, color: RED }
const infantry = { type: INFANTRY, color: RED }
const combined = createCombinedPiece(tank, infantry)
// Result: { type: TANK, color: RED, carrying: [{ type: INFANTRY, color: RED }] }

// Navy carrying Air Force and Tank: (N|FT)
const navy = { type: NAVY, color: RED }
const airForce = { type: AIR_FORCE, color: RED }
const existingStack = createCombinedPiece(navy, airForce)
const finalStack = createCombinedPiece(existingStack, tank)
// Result: { type: NAVY, color: RED, carrying: [{ type: AIR_FORCE, color: RED }, { type: TANK, color: RED }] }
```

## Carrying Capacity and Restrictions

### Capacity Limits

- **No Hard Limit**: No explicit maximum number of carried pieces
- **Library Validation**: External library determines valid combinations
- **Practical Limits**: Game balance enforced through combination rules

### Combination Validation Logic

```typescript
function createCombineStackFromPieces(pieces: Piece[]): {
  combined: Piece | undefined
  uncombined: Piece[] | undefined
} {
  return combinePiece.createCombineStackFromPieces(pieces)
}
```

### Validation Results

- **Success**: `combined` contains valid stack, `uncombined` is empty
- **Partial Success**: Some pieces combined, others in `uncombined` array
- **Failure**: `combined` is undefined or `uncombined` has pieces

### Error Conditions

```typescript
// Combination failure during placement
if (!combinedPiece || (uncombined?.length ?? 0) > 0) {
  throw new Error(`Failed to combine pieces at ${algebraic(sq)}`)
}

// Deployment validation failure
if (!combined || (uncombined?.length ?? 0) > 0) {
  throw new Error('Deploy move error: stay piece not valid')
}
```

## Stack Formation Rules

### Piece Ordering

- **Carrier Priority**: Primary piece becomes the carrier
- **Carrying Array**: Additional pieces stored in order of combination
- **Type Hierarchy**: External library determines which piece becomes carrier

### Heroic Status Inheritance

```typescript
// Heroic status affects entire stack
const heroicTank = { type: TANK, color: RED, heroic: true }
const infantry = { type: INFANTRY, color: RED }
const combined = createCombinedPiece(heroicTank, infantry)
// Result: Carrier retains heroic status, carried pieces may inherit
```

### Stack Representation

- **FEN Notation**: `(T|I)` represents Tank carrying Infantry
- **Heroic Stacks**: `(+T|I)` represents heroic Tank carrying Infantry
- **Complex Stacks**: `(N|FT)` represents Navy carrying Air Force and Tank

## Stack Splitting and Decomposition

### Flattening Stacks

```typescript
function flattenPiece(piece: Piece): Piece[] {
  if (!piece.carrying?.length) return [piece]
  return [{ ...piece, carrying: undefined }, ...piece.carrying]
}
```

### All Possible Splits

```typescript
function createAllPieceSplits(piece: Piece): Piece[][] {
  // Returns all valid ways to split a stack
  // Example: (N|FT) → [(N|FT)], [(N|F),T], [(N|T),F], [N,(F|T)], [N,F,T]
}
```

### Split Generation Algorithm

1. **Flatten Stack**: Extract all individual pieces
2. **Generate Subsets**: Create all possible piece combinations
3. **Validate Combinations**: Check if subsets can form valid stacks
4. **Create Partitions**: Generate all ways to partition pieces into valid
   groups

### Split Examples

```typescript
// Original stack: Navy carrying Air Force and Tank
const originalStack = { type: NAVY, color: RED, carrying: [airForce, tank] }

// Possible splits:
// 1. [(N|FT)] - Original stack
// 2. [(N|F), T] - Navy+AirForce stack, Tank separate
// 3. [(N|T), F] - Navy+Tank stack, AirForce separate
// 4. [N, (F|T)] - Navy separate, AirForce+Tank stack
// 5. [N, F, T] - All pieces separate
```

## Terrain Compatibility for Stacks

### Carrier Determines Terrain

- **Navy Carrier**: Stack restricted to water/mixed terrain
- **Land Carrier**: Stack restricted to land/mixed terrain
- **Air Force Carrier**: Stack can be placed anywhere

### Terrain Validation

```typescript
// Stack terrain compatibility based on carrier type
if (combinedPiece.type === NAVY) {
  if (!NAVY_MASK[sq]) return false // Must be on water/mixed
} else if (combinedPiece.type !== AIR_FORCE) {
  if (!LAND_MASK[sq]) return false // Must be on land/mixed
}
```

### Carried Piece Terrain Independence

- **No Individual Check**: Carried pieces don't need terrain compatibility
- **Carrier Override**: Carrier's terrain rules apply to entire stack
- **Strategic Implications**: Allows land pieces to travel on water via navy
  carrier

## Stack Movement Mechanics

### Movement Determination

- **Carrier Rules**: Stack moves according to carrier piece's movement rules
- **Range Calculation**: Carrier's movement range applies to entire stack
- **Terrain Restrictions**: Carrier's terrain limitations affect stack movement

### Heroic Enhancement

- **Stack-Wide Effect**: Heroic status enhances entire stack's capabilities
- **Movement Bonus**: Heroic carrier provides enhanced movement to all pieces
- **Combat Bonus**: Heroic effects apply to stack combat abilities

### Movement Examples

```typescript
// Tank carrying Infantry: moves like Tank (2 squares orthogonal)
// Navy carrying Air Force: moves like Navy (4 squares, water only)
// Air Force carrying Tank: moves like Air Force (4 squares, ignores blocking)
```

## Stack Combat and Capture

### Combat Resolution

- **Carrier Fights**: Primary piece determines combat capabilities
- **Stack Destruction**: Entire stack destroyed if carrier is captured
- **Suicide Captures**: Air Force can perform kamikaze with entire stack

### Capture Mechanics

```typescript
// Normal capture: entire stack captured
// Stay capture: stack captures without moving
// Suicide capture: both stacks destroyed
```

### Combat Examples

```typescript
// Tank(+Infantry) attacks enemy piece
// - Uses Tank's combat rules and range
// - Heroic bonus applies if Tank is heroic
// - Entire stack moves to capture square

// Air Force(+Tank) performs suicide capture
// - Both Air Force and Tank destroyed
// - Enemy piece also destroyed
// - Carrier piece remains on original square (if any)
```

## Integration with Game Systems

### FEN Representation

```typescript
// Stack notation in FEN strings
'(T|I)' // Tank carrying Infantry
'(+N|FT)' // Heroic Navy carrying Air Force and Tank
'(F|+T)' // Air Force carrying heroic Tank
```

### SAN Notation

```typescript
// Combination moves
'T&e6(T|I)' // Tank combines with Infantry at e6
'+T&e6(+T|I)' // Heroic Tank combines with Infantry

// Deploy moves
'T>e5,I>d4' // Deploy Tank to e5, Infantry to d4
'(FT)<N>a3' // Navy moves to a3, Air Force+Tank stays
```

### Move Generation Integration

- **Stack Moves**: Generate moves for carrier piece
- **Deploy Moves**: Generate deployment options for all pieces
- **Combination Moves**: Generate combination opportunities with friendly pieces

## Error Handling and Validation

### Common Errors

1. **Invalid Combination**: Pieces cannot be combined by library rules
2. **Terrain Mismatch**: Stack cannot exist on target terrain
3. **Deployment Failure**: Cannot split stack as requested
4. **Move Validation**: Stack move violates game rules

### Error Messages

```typescript
'Failed to combine pieces at e4'
'Deploy move error: stay piece not valid'
'Not enough pieces to move at c3'
'Failed to remove piece from stack at d4'
```

### Validation Points

- **Placement**: During `put()` with `allowCombine=true`
- **Movement**: During move validation and execution
- **Deployment**: During deploy move creation and execution
- **State Changes**: During game state updates

## Performance Considerations

### Stack Operations

- **Flattening**: O(n) where n is number of pieces in stack
- **Combination**: Delegated to external library
- **Splitting**: Exponential in number of pieces (2^n combinations)
- **Validation**: O(1) for most checks, O(n) for complex validations

### Memory Usage

- **Nested Structure**: Stacks create nested piece objects
- **Cloning**: Deep cloning required for undo/redo operations
- **Cache Impact**: Stack changes may invalidate move caches

### Optimization Strategies

- **Lazy Evaluation**: Generate splits only when needed
- **Caching**: Cache valid combinations for repeated use
- **Early Termination**: Stop validation on first failure
