# Complete Game Mechanics Reference

## Overview

This document provides comprehensive coverage of all game mechanics in CoTuLenh
(Cờ Tư Lệnh), including terrain systems, stack mechanics, special rules, game
flow, state transitions, ending conditions, and data format specifications. This
reference serves as the definitive guide to understanding every aspect of the
game's complex mechanical systems.

---

## Board and Terrain System

### Board Layout and Coordinate System

#### Board Dimensions

- **Size**: 11 files × 12 ranks (132 squares total)
- **Files**: a, b, c, d, e, f, g, h, i, j, k (11 files)
- **Ranks**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 (12 ranks)
- **Algebraic Range**: a1 to k12

#### Internal 0x88 Representation

- **Array Size**: 256 elements (16×16 grid)
- **Active Area**: 11×12 board mapped within 16×16 grid
- **Square Indexing**: `rank * 16 + file` for efficient computation
- **Boundary Detection**: `(square & 0x88) === 0` for fast validation

#### Coordinate Conversion

```typescript
// Internal to algebraic: square 0x00 = a12, square 0xBA = k1
function algebraic(square: number): Square {
  const f = file(square) // square & 15
  const r = rank(square) // square >> 4
  return `${String.fromCharCode(97 + f)}${12 - r}` as Square
}
```

### Terrain Zone System

#### Terrain Masks

- **NAVY_MASK**: Defines water-navigable squares (1 = navigable)
- **LAND_MASK**: Defines land-accessible squares (1 = accessible)
- **Initialization**: Computed at startup based on file/rank positions

#### Zone Classifications

##### Pure Water Zones (Navy Only)

- **Files**: a, b (files 0-1)
- **Access**: NAVY pieces only
- **Characteristics**: Complete water coverage, no land piece access

##### Mixed Zones (Navy + Land)

- **File c**: Mixed zone where both piece types can operate
- **River Squares**: d6, e6, d7, e7 (special mixed extensions)
- **Bridge Squares**: f6, f7, h6, h7 (strategic crossing points)
- **Access**: Both navy and land pieces can move and station

##### Pure Land Zones (Land Only)

- **Files**: d, e, f, g, h, i, j, k (files 3-10, excluding river squares)
- **Access**: Land pieces only (+ AIR_FORCE)
- **Characteristics**: Standard terrestrial terrain

#### Terrain Validation

```typescript
// Navy piece placement
if (newPiece.type === NAVY) {
  if (!NAVY_MASK[sq]) return false // Must be on water or mixed
}

// Land piece placement
if (newPiece.type !== NAVY) {
  if (!LAND_MASK[sq]) return false // Must be on land or mixed
}
```

### Heavy Piece River Crossing System

#### Heavy Piece Definition

```typescript
export const HEAVY_PIECES = new Set([ARTILLERY, ANTI_AIR, MISSILE])
```

#### Zone System for Heavy Pieces

- **Zone 0**: Files a-b (water area, no restrictions)
- **Zone 1**: Files c-k, ranks 7-12 (upper half)
- **Zone 2**: Files c-k, ranks 1-6 (lower half)

#### River Crossing Rules

- **Blocked**: Movement between Zone 1 ↔ Zone 2
- **Exception**: Horizontal movement at files f (5) and h (7)
- **Capture Override**: Can capture across zones (movement restriction only)

#### Implementation

```typescript
function checkTerrainBlocking(
  from: number,
  to: number,
  pieceType: PieceSymbol,
  isHorizontal: boolean,
): boolean {
  if (HEAVY_PIECES.has(pieceType)) {
    const zoneFrom = isHeavyZone(from)
    const zoneTo = isHeavyZone(to)

    if (zoneFrom !== 0 && zoneTo !== 0 && zoneFrom !== zoneTo) {
      // Bridge crossing exception
      if (isHorizontal && (file(from) === 5 || file(to) === 7)) {
        return false // Allow crossing
      }
      return true // Block crossing
    }
  }
  return false
}
```

---

## Stack System and Piece Combinations

### Stack Structure and Formation

#### Piece Structure

```typescript
type Piece = {
  color: Color
  type: PieceSymbol
  carrying?: Piece[] // Array of carried pieces
  heroic?: boolean // Heroic status affects all pieces in stack
}
```

#### Stack Terminology

- **Carrier**: Primary piece that determines movement characteristics
- **Carried Pieces**: Pieces stored in the `carrying` array
- **Stack**: Complete combined unit (carrier + carried pieces)
- **Flattened Pieces**: All individual pieces when stack is decomposed

### Combination Rules and Validation

#### Combination Process

1. **External Validation**: Uses `@repo/cotulenh-combine-piece` library
2. **Stack Formation**: First piece becomes carrier, second added to carrying
   array
3. **Color Matching**: Only pieces of same color can combine
4. **Type Compatibility**: Certain piece types cannot combine (library enforced)

#### Combination Examples

```typescript
// Tank carrying Infantry: (T|I)
const combined = createCombinedPiece(tank, infantry)
// Result: { type: TANK, color: RED, carrying: [{ type: INFANTRY, color: RED }] }

// Navy carrying Air Force and Tank: (N|FT)
const complexStack = createCombinedPiece(navy, airForce)
const finalStack = createCombinedPiece(complexStack, tank)
```

### Stack Splitting and Deployment

#### All Possible Splits Algorithm

```typescript
function createAllPieceSplits(piece: Piece): Piece[][] {
  // Returns all valid ways to split a stack
  // Example: (N|FT) → [(N|FT)], [(N|F),T], [(N|T),F], [N,(F|T)], [N,F,T]
}
```

#### Split Generation Process

1. **Flatten Stack**: Extract all individual pieces
2. **Generate Subsets**: Create all possible piece combinations using bit
   manipulation
3. **Validate Combinations**: Check if subsets can form valid stacks
4. **Create Partitions**: Generate all ways to partition pieces into valid
   groups

#### Deployment Mechanics

- **Stay vs Move**: Pieces can stay at original square or move to new squares
- **Terrain Validation**: Deployed pieces must satisfy terrain requirements
- **Sequence Validation**: All pieces must be accounted for (moved or staying)

### Combined Piece Movement

#### Movement Determination

- **Carrier Rules**: Stack moves according to carrier piece's movement rules
- **Range Application**: Carrier's movement range applies to entire stack
- **Terrain Restrictions**: Carrier's terrain limitations affect stack movement
- **Special Abilities**: Carrier's special abilities extend to carried pieces

#### Terrain Access Benefits

```typescript
// Land pieces gain water access via Navy carrier
const landPiece = { type: TANK, color: RED }
const navyCarrier = { type: NAVY, color: RED, carrying: [landPiece] }
// Tank can now move on water squares via Navy

// All pieces gain universal access via Air Force carrier
const anyPiece = { type: INFANTRY, color: RED }
const airForceCarrier = { type: AIR_FORCE, color: RED, carrying: [anyPiece] }
// Infantry can fly over any terrain via Air Force
```

---

## Special Mechanics and Rules

### Heroic Promotion System

#### Promotion Trigger

- **Universal Rule**: Any piece that attacks (threatens) the enemy commander
  becomes heroic
- **Automatic**: Promotion happens immediately after move execution
- **Persistent**: Status remains until piece is captured or game ends
- **Stack-Wide**: All pieces in attacking stack can become heroic

#### Heroic Enhancement Patterns

- **Range Increase**: `moveRange` and `captureRange` both increase by +1
- **Diagonal Movement**: `canMoveDiagonal` becomes `true` for all pieces
- **Special Cases**: COMMANDER gains diagonal only, HEADQUARTER transforms 0→1

#### Implementation

```typescript
// After each move execution:
const attackers = game.getAttackers(enemyCommanderSquare, movingColor)
for (const attacker of attackers) {
  if (!game.getHeroicStatus(attacker.square, attacker.type)) {
    game.setHeroicStatus(attacker.square, attacker.type, true)
  }
}
```

### Air Defense System

#### Air Defense Pieces and Levels

- **MISSILE**: Level 2 base (Level 3 heroic) - Strongest defense
- **NAVY**: Level 1 base (Level 2 heroic) - Mobile naval defense
- **ANTI_AIR**: Level 1 base (Level 2 heroic) - Dedicated air defense

#### Zone Coverage Calculation

```typescript
function calculateAirDefenseForSquare(square: number, level: number): number[] {
  const coverage: number[] = []
  for (let i = -level; i <= level; i++) {
    for (let j = -level; j <= level; j++) {
      if (i * i + j * j <= level * level) {
        coverage.push(square + i + j * 16)
      }
    }
  }
  return coverage
}
```

#### AIR_FORCE Movement Restrictions

- **SAFE_PASS**: No air defense zones encountered
- **KAMIKAZE**: In single air defense zone (suicide capture only)
- **DESTROYED**: Multiple zones or zone transitions (movement blocked)

### Commander Exposure Rules (Flying General)

#### Core Principle

Two commanders cannot face each other directly across clear orthogonal lines
with no pieces between them.

#### Exposure Detection

```typescript
private _isCommanderExposed(color: Color): boolean {
  const usCommanderSq = this._commanders[color]
  const themCommanderSq = this._commanders[swapColor(color)]

  // Check orthogonal directions for clear line of sight
  for (const offset of ORTHOGONAL_OFFSETS) {
    let sq = usCommanderSq + offset
    while (isSquareOnBoard(sq)) {
      const piece = this._board[sq]
      if (piece) {
        if (sq === themCommanderSq) return true  // Exposed!
        break  // Blocked by piece
      }
      sq += offset
    }
  }
  return false
}
```

#### Legal Move Filtering

All moves must pass dual validation:

1. **Check Prevention**: Move doesn't leave commander in check
2. **Exposure Prevention**: Move doesn't expose commander to flying general

### Capture Types and Mechanics

#### Three Capture Types

##### Normal Capture (BITS.CAPTURE)

- **Mechanics**: Attacker moves to target square, replaces captured piece
- **Usage**: Standard capture mechanism for most situations
- **Notation**: `x` symbol (e.g., `Txe5`)

##### Stay Capture (BITS.STAY_CAPTURE)

- **Mechanics**: Attacker captures without moving from current square
- **Usage**: When terrain prevents normal capture (e.g., NAVY attacking land)
- **Notation**: `_` symbol (e.g., `T_e5`)

##### Suicide Capture (BITS.SUICIDE_CAPTURE)

- **Mechanics**: Both attacker and target are destroyed
- **Usage**: AIR_FORCE in air defense zones
- **Notation**: `@` symbol (e.g., `F@b2`)

#### Terrain-Based Capture Selection

```typescript
function canStayOnSquare(square: number, pieceType: PieceSymbol): boolean {
  return pieceType === NAVY ? !!NAVY_MASK[square] : !!LAND_MASK[square]
}

// If piece cannot land on target terrain, force stay capture
if (!canStayOnSquare(targetSquare, attackerType)) {
  addStayCapture = true
  addNormalCapture = false
}
```

---

## Game Flow and State Management

### Turn Management and Deploy Phases

#### Normal Turn Flow

1. **Move Generation**: Generate all legal moves for current player
2. **Move Execution**: Execute selected move via command pattern
3. **State Updates**: Update board, turn, move counters, position counts
4. **Turn Switch**: Switch to opponent (unless deploy phase initiated)

#### Deploy Phase Flow

1. **Initiation**: First piece deployed from stack creates deploy state
2. **Active Phase**: Multiple deploy moves from same stack
3. **Turn Preservation**: Turn remains with deploying player
4. **Termination**: Deploy state cleared when all pieces accounted for
5. **Turn Switch**: Turn changes only when deployment ends

#### Deploy State Structure

```typescript
type DeployState = {
  stackSquare: number // Original stack location
  turn: Color // Player whose turn during deployment
  originalPiece: Piece // Complete original stack
  movedPieces: Piece[] // Pieces deployed so far
  stay?: Piece[] // Pieces remaining at original square
}
```

### Move History and Undo System

#### History Structure

```typescript
interface History {
  move: CTLMoveCommandInteface // Command object for undo
  commanders: Record<Color, number> // Commander positions before move
  turn: Color // Turn before move
  halfMoves: number // Half-move clock before move
  moveNumber: number // Move number before move
  deployState: DeployState | null // Deploy state before move
}
```

#### Command Pattern Implementation

- **Atomic Operations**: Each move encapsulated in command object
- **Precise Undo**: Commands store exact state changes for reversal
- **State Consistency**: Undo operations restore complete game state
- **Complex Moves**: Deploy moves handled with specialized commands

### Game State Representation

#### Internal Board State

- **0x88 Array**: 256-element array with 11×12 active area
- **Piece Objects**: Complete piece information including stacks and heroic
  status
- **Commander Tracking**: Direct position mapping for each color
- **Air Defense State**: Dynamic calculation of air defense zones

#### Position Counting and Repetition

```typescript
private _positionCount: Record<string, number> = {}

private _updatePositionCounts(): void {
  const fen = this.fen()
  if (!(fen in this._positionCount)) {
    this._positionCount[fen] = 0
  }
  this._positionCount[fen]++
}
```

---

## Game Ending Conditions

### Victory Conditions

#### Checkmate

- **Definition**: Commander under attack with no legal moves to escape
- **Detection**: `isCheck() && legalMoves.length === 0`
- **Result**: Attacking player wins immediately

#### Commander Capture

- **Definition**: Enemy commander captured directly
- **Detection**: Commander position set to `-1`
- **Result**: Capturing player wins immediately

### Draw Conditions

#### Fifty-Move Rule

- **Definition**: 50 moves without capture or commander move
- **Implementation**: `halfMoves >= 100` (50 moves per side)
- **Reset Triggers**: Any capture or commander movement

#### Threefold Repetition

- **Definition**: Same position occurs three times with same player to move
- **Implementation**: `positionCount[fen] >= 3`
- **Position Key**: Complete FEN string including turn

#### Stalemate

- **Definition**: No legal moves available but not in check
- **Detection**: `!isCheck() && legalMoves.length === 0`
- **Result**: Game ends in draw (rare in CoTuLenh)

### Game Over Detection

```typescript
isGameOver(): boolean {
  return (
    this.isCheckmate() ||           // Checkmate
    this.isDraw() ||                // Draw conditions
    this._commanders[RED] === -1 || // Red commander captured
    this._commanders[BLUE] === -1   // Blue commander captured
  )
}
```

---

## Data Formats and Notation

### FEN (Forsyth-Edwards Notation) Format

#### Extended FEN Structure

```
<piece-placement> <active-color> <castling> <en-passant> <halfmove-clock> <fullmove-number>
```

#### Piece Placement Features

- **11×12 Board**: Ranks separated by `/`, files a-k
- **Stack Notation**: `(NFT)` for Navy carrying Air Force and Tank
- **Heroic Markers**: `+C` for heroic Commander
- **Empty Squares**: Numbers 1-11 for consecutive empty squares

#### Example FEN Strings

```
// Starting position
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1

// Position with heroic pieces and stacks
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/(+NI)5+C4 b - - 15 8
```

### SAN (Standard Algebraic Notation)

#### Extended SAN Features

- **Piece Symbols**: C, I, T, M, E, A, B, S, F, N, H
- **Heroic Prefix**: `+T` for heroic Tank
- **Stack Notation**: `(NI)` for Navy-Infantry stack
- **Capture Types**: `x` (normal), `_` (stay), `@` (suicide)
- **Special Moves**: `>` (deploy), `&` (combination)

#### Movement Separators

- **Normal Move**: No separator (e.g., `Ce4`)
- **Normal Capture**: `x` (e.g., `Txe5`)
- **Stay Capture**: `_` (e.g., `T_e5`)
- **Suicide Capture**: `@` (e.g., `F@b2`)
- **Deploy Move**: `>` (e.g., `I>d4`)
- **Combination**: `&` (e.g., `T&e4(TI)`)

#### Complex Examples

```
+T2xe4^      - Heroic Tank from rank 2 captures on e4, giving check
(+NI)a<I>xd4# - Infantry from Heroic Navy-Infantry stack captures on d4, checkmate
T<I>d4,M>e4   - Tank stays, Infantry to d4, Militia to e4
T&xe4(TI)     - Tank captures and combines at e4, forming Tank-Infantry stack
```

### Internal State Representation

#### Move Representation

```typescript
interface InternalMove {
  from: number // Origin square (0x88 format)
  to: number // Destination square (0x88 format)
  piece: Piece // Moving piece (including stacks)
  color: Color // Moving player color
  flags: number // Move type flags (BITS enum)
  captured?: Piece // Captured piece (if any)
}

interface InternalDeployMove {
  from: number // Stack's original square
  moves: InternalMove[] // Individual piece movements
  stay?: Piece // Pieces remaining at origin
  captured?: Piece[] // Pieces captured during deployment
}
```

#### State Flags and Bits

```typescript
export const BITS = {
  NORMAL: 1,
  CAPTURE: 2,
  STAY_CAPTURE: 4,
  SUICIDE_CAPTURE: 8,
  DEPLOY: 16,
  COMBINATION: 32,
}
```

---

## Advanced Mechanics and Edge Cases

### Piece Interaction Matrix

#### Movement Capabilities by Piece Type

| Piece       | Base Range   | Heroic Range   | Diagonal      | Special Abilities                                         |
| ----------- | ------------ | -------------- | ------------- | --------------------------------------------------------- |
| COMMANDER   | ∞ orthogonal | ∞ + 1 diagonal | No → Yes      | Flying general, commander capture                         |
| INFANTRY    | 1            | 2              | No → Yes      | None                                                      |
| TANK        | 2            | 3              | No → Yes      | Shoot-over-blocking                                       |
| MILITIA     | 1            | 2              | Yes           | Omnidirectional from start                                |
| ENGINEER    | 1            | 2              | No → Yes      | None                                                      |
| ARTILLERY   | 3            | 4              | Yes           | Capture-ignores-blocking, stay capture                    |
| ANTI_AIR    | 1            | 2              | No → Yes      | Air defense level 1→2                                     |
| MISSILE     | 2/1          | 3/2            | Yes (limited) | Capture-ignores-blocking, air defense level 2→3           |
| AIR_FORCE   | 4            | 5              | Yes           | Move/capture-ignores-blocking, multiple capture types     |
| NAVY        | 4            | 5              | Yes           | Dual attack mechanisms, water-only, air defense level 1→2 |
| HEADQUARTER | 0            | 1              | No → Yes      | Immobile → mobile transformation                          |

#### Terrain Compatibility Matrix

| Piece Type | Pure Water | Mixed Zone | Pure Land | Notes            |
| ---------- | ---------- | ---------- | --------- | ---------------- |
| NAVY       | ✓          | ✓          | ✗         | Water/mixed only |
| All Others | ✗          | ✓          | ✓         | Land/mixed only  |
| AIR_FORCE  | ✓          | ✓          | ✓         | Universal access |

### Complex Interaction Scenarios

#### Stack Combat Resolution

- **Carrier Determines Combat**: Stack uses carrier's combat rules and range
- **Heroic Effects**: Heroic status of carrier affects entire stack
- **Terrain Override**: Carrier's terrain rules apply to entire stack
- **Capture Mechanics**: Entire stack participates in capture

#### Air Defense vs AIR_FORCE Interactions

- **Zone Calculation**: Circular areas based on defense level
- **Movement Tracking**: System tracks AIR_FORCE path through zones
- **Result Determination**: SAFE_PASS → KAMIKAZE → DESTROYED progression
- **Suicide Mechanics**: Both pieces destroyed in kamikaze attacks

#### Deploy Phase Complexities

- **Multi-Piece Coordination**: Complex deployment sequences with multiple
  pieces
- **Terrain Validation**: Each deployed piece must satisfy terrain requirements
- **Turn Management**: Turn preserved during deployment, switches only at end
- **State Consistency**: All pieces must be accounted for (moved or staying)

### Performance and Optimization

#### Efficient Algorithms

- **0x88 Board System**: Fast boundary checking and move generation
- **LRU Move Caching**: Expensive move generation results cached
- **Incremental Updates**: State changes applied incrementally
- **Lazy Evaluation**: Complex calculations performed only when needed

#### Memory Management

- **Sparse Representation**: Only occupied squares store piece objects
- **Command Pattern**: Minimal history storage with precise undo capability
- **Cache Limits**: Bounded caches prevent memory leaks
- **Object Reuse**: Efficient object lifecycle management

---

## Integration and System Architecture

### Component Interactions

#### Core Game Engine

- **Board Management**: 0x88 representation with efficient operations
- **Move Generation**: Comprehensive legal move calculation
- **State Management**: Complete game state tracking and history
- **Rule Enforcement**: All game rules implemented and validated

#### External Interfaces

- **FEN Import/Export**: Complete position serialization
- **SAN Move Notation**: Human-readable move representation
- **API Methods**: Clean interface for game interaction
- **Event System**: Move execution and state change notifications

#### Validation and Error Handling

- **Move Validation**: Multi-layer validation ensuring legal moves only
- **State Consistency**: Invariant maintenance across all operations
- **Error Recovery**: Graceful handling of invalid operations
- **Debugging Support**: Comprehensive error messages and state inspection

### Testing and Quality Assurance

#### Test Coverage Areas

- **Individual Piece Mechanics**: Each piece type thoroughly tested
- **Complex Interactions**: Stack mechanics, air defense, heroic promotion
- **Edge Cases**: Board boundaries, unusual positions, error conditions
- **Performance**: Move generation speed, memory usage, scalability

#### Validation Methods

- **Unit Tests**: Individual component functionality
- **Integration Tests**: Complete game scenarios and interactions
- **Regression Tests**: Prevention of bug reintroduction
- **Performance Benchmarks**: Efficiency validation and optimization

---

This comprehensive reference provides complete coverage of all CoTuLenh game
mechanics, serving as the definitive guide for understanding, implementing, and
extending the game system. Every aspect from basic piece movement to complex
stack interactions is documented with sufficient detail for perfect
implementation and strategic mastery.
