# CoTuLenh Game Rules - Complete Reference

## Table of Contents

1. [Overview](#overview)
2. [Board and Terrain System](#board-and-terrain-system)
3. [Piece Types and Movement](#piece-types-and-movement)
4. [Stack System](#stack-system)
5. [Special Mechanics](#special-mechanics)
6. [Capture Types](#capture-types)
7. [Game Flow and Turn Management](#game-flow-and-turn-management)
8. [Game Ending Conditions](#game-ending-conditions)
9. [Data Formats](#data-formats)

---

## Overview

CoTuLenh (Cờ Tư Lệnh) is a strategic board game featuring 11 unique piece types,
complex terrain interactions, and sophisticated stack mechanics. The game
combines traditional chess-like movement with innovative features including
heroic promotion, air defense systems, and multi-phase deployment.

### Key Features

- **11×12 Board**: 132 squares with mixed terrain zones
- **11 Piece Types**: Each with unique movement patterns and abilities
- **Stack System**: Pieces can combine and deploy strategically
- **Heroic Promotion**: Pieces gain enhanced abilities when attacking commanders
- **Air Defense**: Specialized pieces create restricted zones
- **Multiple Capture Types**: Normal, stay, and suicide captures
- **Complex Terrain**: Water, land, and mixed zones with specific rules

---

## Board and Terrain System

### Board Layout

- **Dimensions**: 11 files (a-k) × 12 ranks (1-12) = 132 squares
- **Coordinate System**: Algebraic notation (a1 to k12)
- **Internal Representation**: 0x88 system for efficient computation

```
Rank 12: a12 b12 c12 d12 e12 f12 g12 h12 i12 j12 k12  ← Red back rank
Rank 11: a11 b11 c11 d11 e11 f11 g11 h11 i11 j11 k11
Rank 10: a10 b10 c10 d10 e10 f10 g10 h10 i10 j10 k10
Rank  9: a9  b9  c9  d9  e9  f9  g9  h9  i9  j9  k9
Rank  8: a8  b8  c8  d8  e8  f8  g8  h8  i8  j8  k8
Rank  7: a7  b7  c7  d7  e7  f7  g7  h7  i7  j7  k7
         ────────────────────────────────────────────── River Zone
Rank  6: a6  b6  c6  d6  e6  f6  g6  h6  i6  j6  k6
Rank  5: a5  b5  c5  d5  e5  f5  g5  h5  i5  j5  k5
Rank  4: a4  b4  c4  d4  e4  f4  g4  h4  i4  j4  k4
Rank  3: a3  b3  c3  d3  e3  f3  g3  h3  i3  j3  k3
Rank  2: a2  b2  c2  d2  e2  f2  g2  h2  i2  j2  k2
Rank  1: a1  b1  c1  d1  e1  f1  g1  h1  i1  j1  k1  ← Blue back rank
```

### Terrain Zone System

#### Pure Water Zones (Navy Only)

- **Files a-b**: Complete water coverage
- **Access**: NAVY pieces only
- **Characteristics**: No land piece access

#### Mixed Zones (Navy + Land)

- **File c**: Mixed zone for both piece types
- **River Squares**: d6, e6, d7, e7 (special extensions)
- **Bridge Squares**: f6, f7, h6, h7 (crossing points)
- **Access**: Both navy and land pieces

#### Pure Land Zones (Land Only)

- **Files d-k**: Standard terrestrial terrain (excluding river squares)
- **Access**: Land pieces only (+ AIR_FORCE universal access)

#### Terrain Validation Rules

```typescript
// Navy piece placement
if (piece.type === NAVY) {
  if (!NAVY_MASK[square]) return false // Must be on water or mixed
}

// Land piece placement
if (piece.type !== NAVY) {
  if (!LAND_MASK[square]) return false // Must be on land or mixed
}

// Air Force exception
if (piece.type === AIR_FORCE) {
  return true // Can land anywhere
}
```

### Heavy Piece River Crossing

#### Heavy Pieces Definition

- **ARTILLERY**, **ANTI_AIR**, **MISSILE**
- Subject to special river crossing restrictions

#### Zone System

- **Zone 0**: Files a-b (water area, no restrictions)
- **Zone 1**: Files c-k, ranks 7-12 (upper half)
- **Zone 2**: Files c-k, ranks 1-6 (lower half)

#### Crossing Rules

- **Blocked**: Movement between Zone 1 ↔ Zone 2
- **Exception**: Horizontal movement at files f (5) and h (7)
- **Capture Override**: Can capture across zones (movement restriction only)

---

## Piece Types and Movement

### COMMANDER (C/c) - The Royal Piece

**Movement**: Infinite orthogonal (N, S, E, W)  
**Capture**: 1 square orthogonal only  
**Terrain**: Land pieces only

#### Special Rules

- **Flying General**: Cannot face enemy commander on same orthogonal line
- **Commander vs Commander**: Can capture enemy commander at any orthogonal
  distance
- **Check Immunity**: Cannot move into check or exposure

#### Heroic Enhancement

- **Movement**: Unchanged (infinite orthogonal)
- **Capture**: Gains 1 square diagonal capability
- **New Ability**: Diagonal movement and capture

### INFANTRY (I/i), ENGINEER (E/e), ANTI_AIR (G/g) - Basic Foot Soldiers

**Movement**: 1 square orthogonal  
**Capture**: 1 square orthogonal  
**Terrain**: Land pieces only

#### ANTI_AIR Special Ability

- **Air Defense Level**: 1 (2 when heroic)
- **Zone Effect**: Creates circular air defense zones
- **Coverage**: 5 squares (level 1), 13 squares (level 2)

#### Heroic Enhancement

- **Movement**: 2 squares in all 8 directions
- **Capture**: 2 squares in all 8 directions
- **New Ability**: Diagonal movement and capture

### TANK (T/t) - The Armored Shooter

**Movement**: 2 squares orthogonal  
**Capture**: 2 squares orthogonal  
**Terrain**: Land pieces only

#### Special Ability

- **Shoot-Over-Blocking**: Can capture through pieces (movement still blocked)
- **Range**: Up to 2 squares orthogonally

#### Heroic Enhancement

- **Movement**: 3 squares in all 8 directions
- **Capture**: 3 squares in all 8 directions
- **Retains**: Shoot-over-blocking ability

### MILITIA (M/m) - The Versatile Fighter

**Movement**: 1 square in all 8 directions  
**Capture**: 1 square in all 8 directions  
**Terrain**: Land pieces only

#### Unique Characteristics

- **Omnidirectional**: Only basic piece with diagonal movement
- **Flexible**: More movement options than other basic pieces

#### Heroic Enhancement

- **Movement**: 2 squares in all 8 directions
- **Capture**: 2 squares in all 8 directions

### ARTILLERY (A/a) - The Long-Range Bombarder

**Movement**: 3 squares in all 8 directions  
**Capture**: 3 squares in all 8 directions  
**Terrain**: Land pieces only (heavy piece restrictions)

#### Special Abilities

- **Capture-Ignores-Blocking**: Can capture through pieces
- **Stay Capture**: Can capture without moving

#### Heroic Enhancement

- **Movement**: 4 squares in all 8 directions
- **Capture**: 4 squares in all 8 directions

### MISSILE (S/s) - The Guided Weapon

**Movement**: 2 squares orthogonal, 1 square diagonal  
**Capture**: 2 squares orthogonal, 1 square diagonal  
**Terrain**: Land pieces only (heavy piece restrictions)

#### Special Abilities

- **Asymmetric Range**: Different ranges for orthogonal vs diagonal
- **Capture-Ignores-Blocking**: Can capture through pieces
- **Air Defense Level**: 2 (3 when heroic) - Highest base level

#### Heroic Enhancement

- **Movement**: 3 squares orthogonal, 2 squares diagonal
- **Capture**: 3 squares orthogonal, 2 squares diagonal
- **Air Defense**: Level 3 (strongest in game)

### AIR_FORCE (F/f) - The Sky Dominator

**Movement**: 4 squares in all 8 directions  
**Capture**: 4 squares in all 8 directions  
**Terrain**: Universal (can fly over land and water)

#### Special Abilities

- **Move-Ignores-Blocking**: Can move through any pieces
- **Multiple Capture Types**: Normal, stay, and suicide captures
- **Terrain Freedom**: Can move over any terrain type

#### Air Defense Interactions

- **Safe Area**: Normal movement and all capture types
- **Single Defense Zone**: Can enter but triggers kamikaze mechanics
- **Multiple Defense Zones**: Cannot enter, movement blocked

#### Heroic Enhancement

- **Movement**: 5 squares in all 8 directions
- **Capture**: 5 squares in all 8 directions

### NAVY (N/n) - The Naval Commander

**Movement**: 4 squares in all 8 directions  
**Capture**: Dual system (4 vs NAVY, 3 vs land pieces)  
**Terrain**: Water only (NAVY_MASK squares)

#### Dual Attack System

- **Torpedo Attack**: vs NAVY pieces (full 4 square range)
- **Naval Gun Attack**: vs land pieces (3 square range)

#### Special Abilities

- **Capture-Ignores-Blocking**: Can capture through pieces
- **Air Defense Level**: 1 (2 when heroic)

#### Heroic Enhancement

- **Movement**: 5 squares in all 8 directions
- **Torpedo Range**: 5 squares vs NAVY targets
- **Naval Gun Range**: 4 squares vs land targets
- **Air Defense**: Level 2

### HEADQUARTER (H/h) - The Transforming Command

**Base Movement**: 0 (completely immobile)  
**Base Capture**: 0 (cannot capture)  
**Terrain**: Land pieces only

#### Heroic Transformation

When heroic (any friendly piece attacks enemy commander):

- **Movement**: 1 square in all 8 directions
- **Capture**: 1 square in all 8 directions
- **Identical to MILITIA**: Same capabilities as MILITIA piece

---

## Stack System

### Stack Formation

#### Structure

```typescript
type Piece = {
  color: Color
  type: PieceSymbol
  carrying?: Piece[] // Array of carried pieces
  heroic?: boolean // Heroic status affects all pieces in stack
}
```

#### Terminology

- **Carrier**: Primary piece that determines movement characteristics
- **Carried Pieces**: Pieces stored in the `carrying` array
- **Stack**: Complete combined unit (carrier + carried pieces)

### Combination Rules

#### Valid Combinations (Examples)

- **Navy**: Can carry Air Force + (Commander/Infantry/Militia/Tank)
- **Tank**: Can carry (Commander/Infantry/Militia)
- **Engineer**: Can carry (Artillery/Anti-Air/Missile)
- **Air Force**: Can carry Tank + (Commander/Infantry/Militia)
- **Headquarter**: Can carry Commander

#### Combination Process

1. **External Validation**: Uses `@repo/cotulenh-combine-piece` library
2. **Stack Formation**: First piece becomes carrier, second added to carrying
   array
3. **Color Matching**: Only pieces of same color can combine
4. **Type Compatibility**: Certain piece types cannot combine (library enforced)

### Stack Movement

- **Carrier Rules**: Stack moves according to carrier piece's movement rules
- **Range Application**: Carrier's movement range applies to entire stack
- **Terrain Access**: Carried pieces gain carrier's terrain access
- **Special Abilities**: Carrier's abilities extend to carried pieces

### Stack Deployment

#### All Possible Splits

The system generates all valid ways to split a stack:

- Example: (N|FT) → [(N|FT)], [(N|F),T], [(N|T),F], [N,(F|T)], [N,F,T]

#### Deployment Mechanics

- **Stay vs Move**: Pieces can stay at original square or move to new squares
- **Terrain Validation**: Deployed pieces must satisfy terrain requirements
- **Sequence Validation**: All pieces must be accounted for (moved or staying)

---

## Special Mechanics

### Heroic Promotion System

#### Promotion Trigger

- **Universal Rule**: Any piece that attacks (threatens) the enemy commander
  becomes heroic
- **Automatic**: Promotion happens immediately after move execution
- **Persistent**: Status remains until piece is captured or game ends
- **Stack-Wide**: All pieces in attacking stack can become heroic

#### Enhancement Patterns

- **Range Increase**: `moveRange` and `captureRange` both increase by +1
- **Diagonal Movement**: `canMoveDiagonal` becomes `true` for all pieces
- **Special Cases**: COMMANDER gains diagonal only, HEADQUARTER transforms 0→1

### Air Defense System

#### Air Defense Pieces and Levels

- **MISSILE**: Level 2 base (Level 3 heroic) - Strongest defense
- **NAVY**: Level 1 base (Level 2 heroic) - Mobile naval defense
- **ANTI_AIR**: Level 1 base (Level 2 heroic) - Dedicated air defense

#### Zone Coverage

- **Level 1**: 5 squares (center + 4 orthogonal)
- **Level 2**: 13 squares (circular pattern)
- **Level 3**: 29 squares (large circular pattern)

#### AIR_FORCE Restrictions

- **SAFE_PASS**: No air defense zones encountered
- **KAMIKAZE**: In single air defense zone (suicide capture only)
- **DESTROYED**: Multiple zones or zone transitions (movement blocked)

### Commander Exposure Rules (Flying General)

#### Core Principle

Two commanders cannot face each other directly across clear orthogonal lines
with no pieces between them.

#### Implementation

- **Orthogonal Only**: Checks ranks and files, not diagonals
- **Clear Line Required**: Any piece between commanders blocks exposure
- **Legal Move Filtering**: Moves creating exposure are illegal
- **Mutual Blocking**: Creates strategic blocking between commanders

---

## Capture Types

### 1. Normal Capture (x)

- **Mechanics**: Attacker moves to target square, replaces captured piece
- **Usage**: Standard capture mechanism for most situations
- **Notation**: `x` symbol (e.g., `Txe5`)

### 2. Stay Capture (\_)

- **Mechanics**: Attacker captures without moving from current square
- **Usage**: When terrain prevents normal capture (e.g., NAVY attacking land)
- **Notation**: `_` symbol (e.g., `T_e5`)

### 3. Suicide Capture (@)

- **Mechanics**: Both attacker and target are destroyed
- **Usage**: AIR_FORCE in air defense zones
- **Notation**: `@` symbol (e.g., `F@b2`)

### Terrain-Based Capture Selection

```typescript
// If piece cannot land on target terrain, force stay capture
if (!canStayOnSquare(targetSquare, attackerType)) {
  addStayCapture = true
  addNormalCapture = false
}
```

---

## Game Flow and Turn Management

### Normal Turn Flow

1. **Move Generation**: Generate all legal moves for current player
2. **Move Execution**: Execute selected move via command pattern
3. **State Updates**: Update board, turn, move counters, position counts
4. **Turn Switch**: Switch to opponent (unless deploy phase initiated)

### Deploy Phase Flow

1. **Initiation**: First piece deployed from stack creates deploy state
2. **Active Phase**: Multiple deploy moves from same stack
3. **Turn Preservation**: Turn remains with deploying player
4. **Termination**: Deploy state cleared when all pieces accounted for
5. **Turn Switch**: Turn changes only when deployment ends

### Move History and Undo

- **Command Pattern**: Each move encapsulated in command object
- **Atomic Operations**: Precise undo operations restore complete state
- **State Consistency**: Undo operations restore complete game state

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

---

## Data Formats

### FEN (Forsyth-Edwards Notation)

#### Extended FEN Structure

```
<piece-placement> <active-color> <castling> <en-passant> <halfmove-clock> <fullmove-number>
```

#### Piece Placement Features

- **11×12 Board**: Ranks separated by `/`, files a-k
- **Stack Notation**: `(NFT)` for Navy carrying Air Force and Tank
- **Heroic Markers**: `+C` for heroic Commander
- **Empty Squares**: Numbers 1-11 for consecutive empty squares

#### Example FEN

```
// Starting position
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1

// Position with heroic pieces and stacks
(+NI)5+C4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6c4 b - - 15 8
```

### SAN (Standard Algebraic Notation)

#### Extended SAN Features

- **Piece Symbols**: C, I, T, M, E, A, G, S, F, N, H
- **Heroic Prefix**: `+T` for heroic Tank
- **Stack Notation**: `(NI)` for Navy-Infantry stack
- **Capture Types**: `x` (normal), `_` (stay), `@` (suicide)
- **Special Moves**: `>` (deploy), `&` (combination)

#### Movement Examples

```
Ce4         - Commander moves to e4
Txe5        - Tank captures on e5
T_e5        - Tank stay captures on e5
F@b2        - Air Force suicide captures on b2
I>d4        - Infantry deploys to d4
T&e4(TI)    - Tank combines at e4, forming Tank-Infantry stack
+T2xe4^     - Heroic Tank from rank 2 captures on e4, giving check
```

---

## Strategic Considerations

### Terrain Strategy

- **Mixed Zone Control**: Secure squares allowing normal captures
- **Terrain Barriers**: Use terrain to force stay captures
- **Naval Positioning**: Position NAVY to exploit water access
- **Air Superiority**: Use AIR_FORCE flexibility for advantage

### Stack Tactics

- **Tactical Mobility**: Move multiple pieces as one unit
- **Protection**: Carried pieces protected by carrier
- **Deployment Options**: Separate pieces during strategic moments
- **Space Efficiency**: Multiple pieces occupy single square

### Heroic Promotion

- **Sacrifice Attacks**: Use expendable pieces to attack enemy commander
- **Coordinated Promotion**: Time multiple pieces to become heroic
  simultaneously
- **Position Preparation**: Pre-position pieces for maximum heroic benefit

### Air Defense Networks

- **Overlapping Coverage**: Create multiple air defense layers
- **Zone Gaps**: Identify and exploit gaps in enemy air defense
- **Kamikaze Baiting**: Force enemy AIR_FORCE into unfavorable suicide attacks

---

This comprehensive game rules reference provides complete coverage of all
CoTuLenh mechanics, serving as the definitive guide for understanding,
implementing, and mastering the game system.
