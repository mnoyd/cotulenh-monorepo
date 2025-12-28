# Cotulenh Game Mechanics

## Table of Contents

1. [Game Overview](#game-overview)
2. [Board System and Setup](#board-system-and-setup)
   - [Board Layout](#board-layout)
   - [Terrain Zones](#terrain-zones)
   - [Initial Game Setup](#initial-game-setup)
3. [Piece System and Movement](#piece-system-and-movement)
   - [Piece Types and Abilities](#piece-types-and-abilities)
   - [Heroic Status System](#heroic-status-system)
   - [Piece Combination Mechanics](#piece-combination-mechanics)
4. [Special Game Mechanics](#special-game-mechanics)
   - [Air Defense System](#air-defense-system)
   - [Commander Exposure Rules](#commander-exposure-rules)
   - [Deployment System](#deployment-system)
5. [Move Types and Notation](#move-types-and-notation)
   - [Move Types](#move-types)
   - [Notation Systems](#notation-systems)
6. [Game Flow and Rules](#game-flow-and-rules)
   - [Turn Sequence and Validation](#turn-sequence-and-validation)
   - [Win and Draw Conditions](#win-and-draw-conditions)
   - [Check and Checkmate Detection](#check-and-checkmate-detection)
7. [Technical Reference](#technical-reference)
   - [Data Structures and Implementation](#data-structures-and-implementation)
   - [Algorithms and Validation](#algorithms-and-validation)
8. [Examples and Cross-References](#examples-and-cross-references)

---

## Game Overview

Cotulenh is a sophisticated chess variant that combines traditional strategic
gameplay with modern military-themed mechanics. Played on an 11×12 board, the
game features unique terrain restrictions, piece combination systems, air
defense mechanics, and deployment sequences that create rich tactical
possibilities.

### Key Features

**Enhanced Board System**: The 11×12 board is divided into distinct
[terrain zones](#terrain-zones) - [Navy areas](#navy-zones) (files a-c plus
river squares), [Land zones](#land-zones) (files c-k), and special
[Bridge squares](#bridge-squares) that allow heavy piece movement across water
barriers.

**Military-Themed Pieces**: Eleven distinct
[piece types](#piece-types-and-abilities) represent different military units,
each with unique movement patterns, capture abilities, and special
characteristics. Pieces can achieve ["heroic" status](#heroic-status-system),
enhancing their capabilities.

**Piece Combination Mechanics**: Multiple pieces can occupy the same square in
["stacks,"](#piece-combination-mechanics) with one
[carrier piece](#carrier-hierarchy) transporting others. This system enables
complex tactical maneuvers and strategic positioning.

**Air Defense System**: Certain pieces provide
[air defense coverage](#air-defense-system), creating
[zones](#air-defense-zone-calculation) that restrict or destroy enemy
[air units](#air-force-ff) attempting to pass through them.

**Deployment Sequences**: Players can execute
[multi-move deployment sequences](#deployment-system), spreading pieces from
[stacks](#piece-combination-mechanics) across multiple squares in coordinated
tactical operations.

**Advanced Notation**: The game supports both
[Standard Algebraic Notation (SAN)](#standard-algebraic-notation-san) and
[Long Algebraic Notation (LAN)](#long-algebraic-notation-lan), with special
symbols for [deployment sequences](#deploy-sequences),
[stay captures](#stay-captures), and other unique [move types](#move-types).

### Strategic Depth

Cotulenh's complexity emerges from the interaction of its various systems:

- **Terrain Strategy**: Players must consider
  [movement restrictions](#terrain-zones) when positioning pieces, with some
  units limited to specific zones while others can traverse all areas.

- **Stack Management**: The ability to [combine](#piece-combination-mechanics)
  and [deploy](#deployment-system) pieces creates opportunities for surprise
  attacks and defensive formations.

- **Air Superiority**: Control of [air defense zones](#air-defense-system)
  becomes crucial for protecting key positions and limiting enemy
  [air mobility](#air-force-ff).

- **Commander Protection**: The [flying general rule](#flying-general-rule) and
  [commander exposure mechanics](#commander-exposure-rules) add layers of
  tactical consideration to piece positioning.

### Game Objectives

Victory in Cotulenh is achieved through traditional [checkmate](#checkmate) or
by [capturing the enemy commander](#commander-capture). The game also includes
standard [draw conditions](#draw-conditions) such as the
[fifty-move rule](#fifty-move-rule) and
[threefold repetition](#threefold-repetition), adapted for the unique mechanics
of [piece deployment](#deployment-system) and
[combination](#piece-combination-mechanics).

---

## Board System and Setup

### Board Layout

Cotulenh is played on an **11×12 board** using a coordinate system based on
algebraic notation. The board consists of 11 files (columns) labeled **a**
through **k** from left to right, and 12 ranks (rows) numbered **1** through
**12** from bottom to top.

#### Coordinate System

Each square on the board is identified by its file letter followed by its rank
number:

- **Bottom-left corner**: a1
- **Bottom-right corner**: k1
- **Top-left corner**: a12
- **Top-right corner**: k12

The coordinate system follows standard algebraic notation conventions:

- Files run horizontally from **a** (leftmost) to **k** (rightmost)
- Ranks run vertically from **1** (bottom) to **12** (top)
- Each square has a unique identifier (e.g., e6, h9, c12)

#### Visual Board Representation

```text
12  a12 b12 c12 d12 e12 f12 g12 h12 i12 j12 k12
11  a11 b11 c11 d11 e11 f11 g11 h11 i11 j11 k11
10  a10 b10 c10 d10 e10 f10 g10 h10 i10 j10 k10
 9  a9  b9  c9  d9  e9  f9  g9  h9  i9  j9  k9
 8  a8  b8  c8  d8  e8  f8  g8  h8  i8  j8  k8
 7  a7  b7  c7  d7  e7  f7  g7  h7  i7  j7  k7
    ─────────────────────────────────────────────
 6  a6  b6  c6  d6  e6  f6  g6  h6  i6  j6  k6
 5  a5  b5  c5  d5  e5  f5  g5  h5  i5  j5  k5
 4  a4  b4  c4  d4  e4  f4  g4  h4  i4  j4  k4
 3  a3  b3  c3  d3  e3  f3  g3  h3  i3  j3  k3
 2  a2  b2  c2  d2  e2  f2  g2  h2  i2  j2  k2
 1  a1  b1  c1  d1  e1  f1  g1  h1  i1  j1  k1
    a   b   c   d   e   f   g   h   i   j   k
```

The horizontal line between ranks 6 and 7 represents the **river** that divides
the board into two main tactical zones.

#### Internal Representation

Internally, the game uses a **0x88 board representation** within a 16×16 grid to
efficiently handle the 11×12 playing area:

- **Square Mapping**: Each square maps to a unique index in the internal array
- **Boundary Detection**: The 0x88 system allows fast validation of legal square
  coordinates
- **Memory Layout**: The 11×12 board fits within the larger 16×16 structure for
  optimal performance

**Example Internal Coordinates**:

- a12 → 0x00 (index 0)
- k12 → 0x0A (index 10)
- a1 → 0xB0 (index 176)
- k1 → 0xBA (index 186)

This internal system enables efficient move generation and validation while
maintaining the intuitive algebraic notation for players.

**Practical Coordinate Examples**:

```text
Player Move: "Tank to e4"
Internal Processing:
1. Parse "e4" → file e (4), rank 4 (8) → 0x84 (index 132)
2. Validate: rank(0x84) = 8, file(0x84) = 4
3. Check bounds: 8 < 12 ✓, 4 < 11 ✓
4. Square is valid for piece placement

Invalid Move: "Tank to m5"
Internal Processing:
1. Parse "m5" → file m (12), rank 5 (7) → 0x7C (index 124)
2. Validate: rank(0x7C) = 7, file(0x7C) = 12
3. Check bounds: 7 < 12 ✓, 12 < 11 ✗
4. Square is off-board, move rejected
```

### Terrain Zones

The Cotulenh board is divided into distinct terrain zones that restrict piece
movement based on military unit types. These zones simulate different
operational environments where various military units can effectively operate.

#### Navy Zones

**Navy zones** represent water areas where naval units can operate. These zones
include:

- **Files a, b, and c**: The western portion of the board (pure water areas)
- **River squares**: Specific squares along the central river
  - d6, e6 (rank 6 river bank)
  - d7, e7 (rank 7 river bank)

**Navy Zone Characteristics**:

- Only **Navy pieces** can move within pure Navy zones (files a-b)
- **Mixed zones** (file c and river squares) allow both Navy and Land pieces
- Navy pieces cannot move into pure Land zones (files d-k, excluding river
  squares)

#### Land Zones

**Land zones** represent terrestrial areas where ground-based military units
operate:

- **Files c through k**: The central and eastern portions of the board
- **All squares** from file c eastward, including mixed terrain areas

**Land Zone Characteristics**:

- **All non-Navy pieces** can move within Land zones
- Land pieces cannot enter pure Navy zones (files a-b)
- Land pieces can access mixed zones (file c and river squares d6, e6, d7, e7)

#### Bridge Squares

**Bridge squares** are special terrain features that allow heavy pieces to cross
the river:

- **f6, f7**: Western bridge crossing
- **h6, h7**: Eastern bridge crossing

**Bridge Square Characteristics**:

- Allow **heavy pieces** (Artillery, Anti-Air, Missile) to cross the river
- Function as normal Land zone squares for movement purposes
- Provide strategic crossing points for heavy unit deployment
- Essential for heavy piece mobility between northern and southern board
  sections

#### Mixed Zones

**Mixed zones** are areas accessible to both Navy and Land pieces:

- **File c**: The entire c-file serves as a coastal interface
- **River bank squares**: d6, e6, d7, e7 along the central river

**Mixed Zone Characteristics**:

- Allow both Navy and Land piece movement
- Serve as transition areas between pure Navy and Land zones
- Critical for piece coordination between different unit types
- Enable combined arms tactical operations

#### Air Space

**Air Force pieces** have unique terrain privileges:

- Can move over **any terrain type** without restriction
- Not limited by Navy/Land zone boundaries
- Subject to **air defense zones** rather than terrain restrictions
- Provide strategic mobility across the entire battlefield

#### Movement Restrictions Summary

| Piece Type  | Navy Zones (a-b) | Mixed Zones (c, river) | Land Zones (d-k) | Bridge Squares |
| ----------- | ---------------- | ---------------------- | ---------------- | -------------- |
| Navy        | ✓ Allowed        | ✓ Allowed              | ✗ Forbidden      | ✗ Forbidden    |
| Land Units  | ✗ Forbidden      | ✓ Allowed              | ✓ Allowed        | ✓ Allowed      |
| Heavy Units | ✗ Forbidden      | ✓ Allowed              | ✓ Allowed        | ✓ Required\*   |
| Air Force   | ✓ Allowed        | ✓ Allowed              | ✓ Allowed        | ✓ Allowed      |

\*Heavy units require bridge squares to cross the river between ranks 6 and 7.

These terrain restrictions create strategic depth by forcing players to consider
unit positioning and coordination between different military branches.

**Terrain Restriction Examples**:

**Example 1: Navy Piece Movement**

```text
Position: Red Navy at a3 (pure Navy zone)
Legal Moves: a1, a2, a4, a5, b1, b2, b3, b4, b5, c1, c2, c3, c4, c5
Illegal Moves: d3, e3, f3 (pure Land zones)
Special: Can access river squares d6, e6, d7, e7 via c-file approach
```

**Example 2: Heavy Piece River Crossing**

```text
Position: Red Artillery at e3 (south of river)
Goal: Move to e8 (north of river)
Direct Route: e3-e8 → ILLEGAL (cannot cross river directly)
Legal Route: e3-f6-e8 (must use bridge square f6)
Alternative: e3-h6-e8 (using eastern bridge h6)
```

**Example 3: Mixed Zone Coordination**

```text
Position: Red Navy at c4, Red Tank at d4
Combination: Navy moves to d4 → (Nd4) with Tank carried
Result: Navy-Tank stack in mixed zone
Capabilities:
- Navy movement (4 squares, ignore blocking)
- Access to both Navy and Land zones
- Tank can deploy to pure Land zones when needed
```

### Initial Game Setup

#### Default Starting Position

Cotulenh games begin with a standardized piece arrangement that provides
balanced strategic opportunities for both players. The initial setup places
pieces in defensive formations while allowing for various opening strategies.

**Red Player (Bottom - Ranks 1-2)**:

```text
 2  ·N  ·  ·I ·E  ·  ·  ·M  ·  ·E ·I  ·  ·N
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  ·  ·
    a   b   c   d   e   f   g   h   i   j   k
```

**Blue Player (Top - Ranks 11-12)**:

```text
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  ·  ·
11  ·n  ·  ·i ·e  ·  ·  ·m  ·  ·e ·i  ·  ·n
    a   b   c   d   e   f   g   h   i   j   k
```

**Complete Initial Board**:

```text
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  ·  ·
11  ·n  ·  ·f ·h  ·h ·f  ·  ·n  ·  ·  ·  ·
10  ·  ·  ·a  ·  ·s  ·  ·a  ·  ·  ·  ·  ·
 9  ·  ·n  ·g ·t  ·t ·g  ·n  ·  ·  ·  ·  ·
 8  ·  ·i ·e  ·  ·m  ·  ·e ·i  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
    ─────────────────────────────────────────────
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·I ·E  ·  ·M  ·  ·E ·I  ·  ·  ·  ·
 3  ·  ·N  ·G ·T  ·T ·G  ·N  ·  ·  ·  ·  ·
 2  ·  ·  ·A  ·  ·S  ·  ·A  ·  ·  ·  ·  ·
 1  ·N  ·  ·F ·H  ·H ·F  ·  ·N  ·  ·  ·  ·
    a   b   c   d   e   f   g   h   i   j   k
```

#### Piece Placement Details

**Red Army (Uppercase symbols)**:

- **Commander (C)**: g1 (heroic status)
- **Headquarters (H)**: e1, g1
- **Air Force (F)**: d1, h1
- **Navy (N)**: a1, j1
- **Artillery (A)**: d2, h2
- **Missile (S)**: f2
- **Anti-Air (G)**: e3, g3
- **Tank (T)**: f3, h3
- **Infantry (I)**: c4, i4
- **Engineer (E)**: d4, h4
- **Militia (M)**: f4

**Blue Army (Lowercase symbols)**:

- **Commander (c)**: g12 (heroic status)
- **Headquarters (h)**: e12, g12
- **Air Force (f)**: d12, h12
- **Navy (n)**: a12, j12
- **Artillery (a)**: d11, h11
- **Missile (s)**: f11
- **Anti-Air (g)**: e10, g10
- **Tank (t)**: f10, h10
- **Infantry (i)**: c9, i9
- **Engineer (e)**: d9, h9
- **Militia (m)**: f9

#### FEN Notation for Cotulenh

**Forsyth-Edwards Notation (FEN)** in Cotulenh follows chess conventions but
adapts to the 11×12 board and unique piece set.

**Standard Starting Position FEN**:

```fen
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1
```

**FEN Components**:

1. **Piece Placement**:
   `6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4`
   - Each rank separated by `/` (from rank 12 to rank 1)
   - Numbers indicate consecutive empty squares
   - Uppercase = Red pieces, Lowercase = Blue pieces
   - `+` prefix indicates heroic status (e.g., `+C` for heroic Commander)

2. **Active Color**: `r` (Red to move first)

3. **Castling Rights**: `-` (No castling in Cotulenh)

4. **En Passant**: `-` (No en passant in Cotulenh)

5. **Halfmove Clock**: `0` (Moves since last capture or pawn move)

6. **Fullmove Number**: `1` (Current move number)

#### Setup Examples

**Custom Position Example**:

```fen
11/11/11/11/11/11/11/11/11/11/3C7/11 r - - 0 1
```

This represents a minimal position with only the Red Commander on d2.

**Mid-Game Position Example**:

```fen
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/5I5/2I1E2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 2 3
```

This shows a position after Red has moved Infantry from c4 to f6 and from i4 to
c7.

**Heroic Piece Notation**:

- `+C` = Heroic Red Commander
- `+t` = Heroic Blue Tank
- `+F` = Heroic Red Air Force

**Stack Notation** (for piece combinations):

- `(TI)` = Tank carrying Infantry
- `(+TI)` = Heroic Tank carrying Infantry
- `(T+I)` = Tank carrying Heroic Infantry

The FEN system enables precise position recording, game analysis, and position
sharing between players and analysis tools.

## Piece System and Movement

### Piece Types and Abilities

Cotulenh features **eleven distinct piece types**, each representing different
military units with unique movement patterns, capture abilities, and special
characteristics. All pieces can achieve "heroic" status, which enhances their
capabilities.

#### Commander (C/c)

**Symbol**: `C` (Red), `c` (Blue)  
**Role**: Supreme military leader and primary win condition

**Base Movement**:

- **Range**: Unlimited orthogonal movement (like a rook)
- **Capture**: Adjacent squares only (1 square range)
- **Directions**: Orthogonal only (north, south, east, west)

**Special Abilities**:

- **[Flying General Rule](#flying-general-rule)**: Can capture enemy commander
  directly across orthogonal lines with no pieces between
- **[Commander Exposure](#commander-exposure-rules)**: Cannot face enemy
  commander orthogonally without intervening pieces
- **Win Condition**: Game ends when captured (see
  [Win Conditions](#win-conditions))

**Heroic Enhancements**:

- Gains diagonal movement capability
- Capture range increases to 2 squares
- Movement range remains unlimited

#### Infantry (I/i)

**Symbol**: `I` (Red), `i` (Blue)  
**Role**: Basic ground unit with standard movement

**Base Movement**:

- **Range**: 1 square movement and capture
- **Directions**: Orthogonal only
- **Terrain**: Land zones only

**Special Abilities**:

- Can combine with other compatible pieces
- Forms the backbone of most military formations

**Heroic Enhancements**:

- Movement range increases to 2 squares
- Capture range increases to 2 squares
- Gains diagonal movement capability

#### Tank (T/t)

**Symbol**: `T` (Red), `t` (Blue)  
**Role**: Heavy ground unit with extended range

**Base Movement**:

- **Range**: 2 squares movement and capture
- **Directions**: Orthogonal only
- **Terrain**: Land zones only

**Special Abilities**:

- **Shoot Over Blocking**: Can capture through intervening pieces
- Can carry lighter units in [combined stacks](#piece-combination-mechanics)

**Heroic Enhancements**:

- Movement range increases to 3 squares
- Capture range increases to 3 squares
- Gains diagonal movement capability

#### Militia (M/m)

**Symbol**: `M` (Red), `m` (Blue)  
**Role**: Versatile light unit with diagonal capability

**Base Movement**:

- **Range**: 1 square movement and capture
- **Directions**: All directions (orthogonal and diagonal)
- **Terrain**: Land zones only

**Special Abilities**:

- Only base piece type with natural diagonal movement
- Highly mobile for tactical positioning

**Heroic Enhancements**:

- Movement range increases to 2 squares
- Capture range increases to 2 squares
- Retains full directional movement

#### Engineer (E/e)

**Symbol**: `E` (Red), `e` (Blue)  
**Role**: Support unit with standard capabilities

**Base Movement**:

- **Range**: 1 square movement and capture
- **Directions**: Orthogonal only
- **Terrain**: Land zones only

**Special Abilities**:

- Can combine with other pieces for tactical flexibility
- Essential for combined arms operations

**Heroic Enhancements**:

- Movement range increases to 2 squares
- Capture range increases to 2 squares
- Gains diagonal movement capability

#### Artillery (A/a)

**Symbol**: `A` (Red), `a` (Blue)  
**Role**: Long-range heavy unit with area control

**Base Movement**:

- **Range**: 3 squares movement and capture
- **Directions**: All directions (orthogonal and diagonal)
- **Terrain**: Land zones only (heavy piece river restrictions apply)

**Special Abilities**:

- **Ignore Piece Blocking**: Can capture through intervening pieces
- **Heavy Piece**: Requires bridge squares to cross river
- Long-range tactical control

**Heroic Enhancements**:

- Movement range increases to 4 squares
- Capture range increases to 4 squares
- Retains ignore blocking ability

#### Anti-Air (G/g)

**Symbol**: `G` (Red), `g` (Blue)  
**Role**: Air defense specialist with zone control

**Base Movement**:

- **Range**: 1 square movement and capture
- **Directions**: Orthogonal only
- **Terrain**: Land zones only (heavy piece river restrictions apply)

**Special Abilities**:

- **[Air Defense Zone](#air-defense-system)**: Creates 1-square radius air
  defense coverage
- **Heavy Piece**: Requires [bridge squares](#bridge-squares) to cross river
- Threatens enemy [air units](#air-force-ff) in range

**Heroic Enhancements**:

- Movement range increases to 2 squares
- Capture range increases to 2 squares
- Air defense range increases to 2 squares
- Gains diagonal movement capability

#### Missile (S/s)

**Symbol**: `S` (Red), `s` (Blue)  
**Role**: Advanced heavy unit with special range mechanics

**Base Movement**:

- **Range**: 2 squares movement and capture
- **Directions**: All directions (orthogonal and diagonal)
- **Terrain**: Land zones only (heavy piece river restrictions apply)

**Special Abilities**:

- **Ignore Piece Blocking**: Can capture through intervening pieces
- **Special Range**: Diagonal movement limited to 1 square
- **Heavy Piece**: Requires bridge squares to cross river
- **Air Defense Zone**: Creates 2-square radius air defense coverage

**Heroic Enhancements**:

- Movement range increases to 3 squares
- Capture range increases to 3 squares
- Air defense range increases to 3 squares
- Diagonal movement range increases to 2 squares

#### Air Force (F/f)

**Symbol**: `F` (Red), `f` (Blue)  
**Role**: Elite air unit with superior mobility

**Base Movement**:

- **Range**: 4 squares movement and capture
- **Directions**: All directions (orthogonal and diagonal)
- **Terrain**: Can fly over any terrain (ignores terrain restrictions)

**Special Abilities**:

- **Ignore Piece Blocking**: Can move and capture through intervening pieces
- **Air Mobility**: Unaffected by [terrain restrictions](#terrain-zones)
- **[Kamikaze Option](#suicide-captures)**: Can perform suicide attacks (mutual
  destruction)
- **[Stay Capture](#stay-captures)**: Can destroy targets without moving to
  their square
- Subject to enemy [air defense zones](#air-defense-system)

**Heroic Enhancements**:

- Movement range increases to 5 squares
- Capture range increases to 5 squares
- Enhanced survivability in air defense zones

#### Navy (N/n)

**Symbol**: `N` (Red), `n` (Blue)  
**Role**: Naval unit with water-based operations

**Base Movement**:

- **Range**: 4 squares movement and capture
- **Directions**: All directions (orthogonal and diagonal)
- **Terrain**: Navy zones only (files a-c plus river squares)

**Special Abilities**:

- **Ignore Piece Blocking**: Can move and capture through intervening pieces
- **Naval Attack Mechanisms**:
  - **Torpedo Attack**: Full range vs other Navy pieces
  - **Naval Gun**: Reduced range (-1) vs Land pieces
- **Air Defense Zone**: Creates 1-square radius air defense coverage
- Can combine with friendly pieces in mixed zones

**Heroic Enhancements**:

- Movement range increases to 5 squares
- Capture range increases to 5 squares
- Air defense range increases to 2 squares

#### Headquarters (H/h)

**Symbol**: `H` (Red), `h` (Blue)  
**Role**: Command structure and strategic asset

**Base Movement**:

- **Range**: Cannot move (0 squares)
- **Capture**: Cannot capture (0 range)
- **Terrain**: Land zones only

**Special Abilities**:

- **Immobile**: Cannot move or capture in base form
- **Strategic Value**: Important for territorial control
- Can be carried by other pieces when combined

**Heroic Enhancements**:

- Movement range increases to 1 square
- Capture range increases to 1 square
- Gains full directional movement (like Militia)

#### Movement Summary Table

| Piece Type   | Base Move | Base Capture | Directions | Heroic Move | Heroic Capture | Special Abilities                  |
| ------------ | --------- | ------------ | ---------- | ----------- | -------------- | ---------------------------------- |
| Commander    | ∞         | 1            | Orthogonal | ∞           | 2              | Flying General, Commander Exposure |
| Infantry     | 1         | 1            | Orthogonal | 2           | 2              | Basic ground unit                  |
| Tank         | 2         | 2            | Orthogonal | 3           | 3              | Shoot over blocking                |
| Militia      | 1         | 1            | All        | 2           | 2              | Natural diagonal movement          |
| Engineer     | 1         | 1            | Orthogonal | 2           | 2              | Support unit                       |
| Artillery    | 3         | 3            | All        | 4           | 4              | Ignore blocking, Heavy piece       |
| Anti-Air     | 1         | 1            | Orthogonal | 2           | 2              | Air defense (1→2), Heavy piece     |
| Missile      | 2         | 2            | All\*      | 3           | 3              | Air defense (2→3), Heavy piece     |
| Air Force    | 4         | 4            | All        | 5           | 5              | Ignore terrain/blocking, Kamikaze  |
| Navy         | 4         | 4            | All        | 5           | 5              | Naval attacks, Air defense (1→2)   |
| Headquarters | 0         | 0            | None       | 1           | 1              | Immobile → Mobile                  |

\*Missile diagonal movement limited to 1 square (2 when heroic)

### Heroic Status System

The **heroic status system** is a unique mechanic in Cotulenh that allows pieces
to achieve enhanced capabilities through battlefield achievements. When a piece
becomes heroic, it gains significant improvements to its movement, capture
abilities, and special powers.

#### How Pieces Become Heroic

Pieces achieve heroic status through **battlefield valor** - specifically by
making moves that result in **check** against the enemy commander. This
represents the piece distinguishing itself through decisive tactical action.

**Heroic Promotion Conditions**:

1. **Direct Check**: A piece becomes heroic when its move directly attacks the
   enemy commander
2. **Capture Leading to Check**: A piece becomes heroic when it captures an
   enemy piece and the resulting position places the enemy commander in check
3. **Discovered Check**: A piece becomes heroic when its movement reveals an
   attack on the enemy commander from another friendly piece
4. **Multiple Piece Promotion**: When a move results in check, ALL pieces that
   can attack the enemy commander in the resulting position become heroic

**Important Notes**:

- Only moves that **result in check** trigger heroic promotion
- Pieces do NOT become heroic for moves that do not threaten the enemy commander
- Both the moving piece and other pieces that gain attacking lines can become
  heroic simultaneously
- Heroic status is **permanent** once achieved

#### Enhanced Abilities for Heroic Pieces

When a piece becomes heroic, it receives the following universal enhancements:

**Movement Enhancements**:

- **+1 Range**: Movement range increases by 1 square (except Commander with
  infinite range)
- **+1 Capture Range**: Capture range increases by 1 square
- **Diagonal Movement**: All pieces gain diagonal movement capability (if not
  already possessed)

**Special Case - Headquarters**:

- **Mobility**: Immobile Headquarters pieces gain the ability to move and
  capture (1 square, all directions)
- **Transformation**: Effectively becomes a heroic Militia when promoted

**Air Defense Enhancements**:

- **Anti-Air**: Air defense range increases from 1 to 2 squares
- **Missile**: Air defense range increases from 2 to 3 squares
- **Navy**: Air defense range increases from 1 to 2 squares

#### Heroic Promotion Examples

**Example 1: Direct Check Promotion**

```
Initial Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  T  ·  +C  ·  ·  ·  ·

Move: Te1-e12 (Tank moves to attack Blue commander)

Result Position:
12  ·  ·  ·  ·  +T  ·  +c  ·  ·  ·  ·  (Tank becomes heroic)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
...
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·
```

The Tank becomes heroic because its move directly checks the Blue commander.

**Example 2: Multiple Piece Promotion**

```
Initial Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  T  A  +C  ·  ·  ·  ·

Move: Tf1-f12 (Tank moves, revealing Artillery attack on commander)

Result Position:
12  ·  ·  ·  ·  ·  +T  +c  ·  ·  ·  ·  (Tank becomes heroic)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
...
 1  ·  ·  ·  ·  ·  +A  +C  ·  ·  ·  ·  (Artillery becomes heroic)
```

Both Tank and Artillery become heroic: Tank for moving, Artillery for gaining a
discovered attack line.

**Example 3: Capture Promotion**

```
Initial Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·
11  ·  ·  ·  ·  ·  ·  t  ·  ·  ·  ·  (Blue tank)
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  +C  I  ·  ·  ·  (Red Infantry)

Move: Ih1xg11 (Infantry captures Blue tank, checking commander)

Result Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·
11  ·  ·  ·  ·  ·  ·  +I  ·  ·  ·  ·  (Infantry becomes heroic)
...
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·
```

The Infantry becomes heroic because its capture move results in check.

#### Heroic Status in Stacks

When pieces are combined in stacks, heroic status affects individual pieces
within the stack:

**Stack Heroic Rules**:

- Each piece in a stack maintains its own heroic status independently
- When a stack moves and results in check, ALL pieces in the stack that can
  attack the commander become heroic
- Heroic status is preserved when pieces combine or separate from stacks
- The carrier piece's heroic status does not automatically apply to carried
  pieces

**Stack Notation**:

- `(+TI)` = Heroic Tank carrying regular Infantry
- `(T+I)` = Regular Tank carrying Heroic Infantry
- `(+T+I)` = Heroic Tank carrying Heroic Infantry

#### Strategic Implications

**Tactical Considerations**:

- **Risk vs Reward**: Aggressive moves that create check opportunities can
  backfire if the piece is captured
- **Timing**: Heroic promotion timing can be crucial for breakthrough attacks
- **Multiple Threats**: Moves that promote multiple pieces simultaneously create
  powerful tactical advantages
- **Defensive Value**: Heroic pieces provide enhanced defensive capabilities
  with increased ranges

**Endgame Impact**:

- Heroic pieces become significantly more powerful in endgame scenarios
- Enhanced movement ranges allow for more complex tactical combinations
- Diagonal movement capability opens new strategic possibilities for previously
  limited pieces

The heroic system adds a dynamic element to Cotulenh, rewarding bold tactical
play while creating opportunities for dramatic reversals of fortune.

### Piece Combination Mechanics

One of Cotulenh's most distinctive features is the **piece combination system**,
which allows multiple pieces to occupy the same square in organized "stacks."
This system enables complex tactical maneuvers, surprise attacks, and
sophisticated defensive formations.

#### Stack Formation Rules

**Basic Combination Principles**:

- Only pieces of the **same color** can combine into stacks
- All piece types can participate in combinations (with terrain restrictions)
- Stacks are organized with one **carrier piece** and multiple **carried
  pieces**
- The carrier piece determines the stack's movement capabilities and terrain
  restrictions

**Carrier Hierarchy**: The piece combination system uses a **role-based
hierarchy** to determine which piece becomes the carrier when multiple pieces
combine:

1. **Navy** (Role Flag: 512) - Highest priority carrier
2. **Headquarters** (Role Flag: 1024)
3. **Engineer** (Role Flag: 256)
4. **Air Force** (Role Flag: 128)
5. **Tank** (Role Flag: 64)
6. **Missile** (Role Flag: 32)
7. **Anti-Air** (Role Flag: 16)
8. **Artillery** (Role Flag: 8)
9. **Militia** (Role Flag: 4)
10. **Infantry** (Role Flag: 2)
11. **Commander** (Role Flag: 1) - Lowest priority carrier

**Combination Process**:

- When pieces combine, the piece with the **highest role flag value** becomes
  the carrier
- All other pieces become **carried pieces** in the stack
- The resulting stack takes on the carrier's movement and terrain
  characteristics
- Individual piece abilities (like heroic status) are preserved within the stack

#### Stack Movement and Deployment

**Carrier Movement**:

- The **carrier piece** can move normally, transporting all carried pieces
  together
- Movement range, capture ability, and terrain restrictions follow the carrier's
  characteristics
- The entire stack moves as a single unit during carrier movement

**Deployment Sequences**:

- Players can **deploy** individual pieces from stacks to different squares
- Deployment creates a **move session** allowing multiple pieces to be
  positioned in sequence
- Each deployed piece moves according to its own movement characteristics
- Deployment must be **committed** as a complete sequence or **canceled**

**Deployment Rules**:

- Any piece in a stack (including the carrier) can be deployed individually
- Deployed pieces move from the stack square according to their own movement
  patterns
- Terrain restrictions apply to each piece individually during deployment
- The session continues until all desired pieces are deployed or the player
  commits

#### Combination Examples

**Example 1: Basic Tank-Infantry Combination**

```
Initial: Tank at d4, Infantry at d5

Combination Move: Infantry d5 & d4 (combination symbol &)

Result: Tank(Infantry) at d4
- Tank becomes carrier (higher role flag: 64 vs 2)
- Infantry becomes carried piece
- Stack moves with Tank characteristics
```

**Example 2: Navy-Air Force-Tank Stack**

```
Initial Pieces: Navy, Air Force, Tank (all Red)

Combination Result: Navy(Air Force, Tank)
- Navy becomes carrier (highest role flag: 512)
- Air Force and Tank become carried pieces
- Stack restricted to Navy zones (water areas)
- Can move 4 squares with ignore blocking ability
```

**Example 3: Deployment Sequence**

```
Initial: Navy(Air Force, Tank) at c3

Deployment Session:
1. Deploy Air Force: c3 > e5 (Air Force moves to e5)
2. Deploy Tank: c3 > d4 (Tank moves to d4)
3. Commit Session

Final Result:
- Air Force at e5 (independent piece)
- Tank at d4 (independent piece)
- Navy at c3 (no longer carrying pieces)
```

#### Terrain and Combination Restrictions

**Terrain Validation**:

- The **carrier piece** must be able to legally occupy the combination square
- Navy carriers can only exist in Navy zones (files a-c, river squares)
- Land piece carriers cannot exist in pure Navy zones (files a-b)
- Heavy piece carriers follow bridge crossing rules for river transit

**Invalid Combinations**:

- Pieces of different colors cannot combine
- Combinations that would place the carrier on invalid terrain are rejected
- Stacks cannot be formed if the resulting carrier violates terrain restrictions

**Recombination Rules**:

- During deployment sessions, pieces can **recombine** with other pieces at
  their destination
- Recombination follows the same carrier hierarchy rules
- Terrain restrictions are validated for the final combined piece
- Invalid recombinations are automatically filtered from available options

#### Stack Notation and Representation

**FEN Notation**:

- Stacks are represented with parentheses: `(CarrierPiece1Piece2...)`
- Heroic pieces use `+` prefix: `(+NavyTank)` or `(Navy+Tank)`
- Example: `(+NFT)` = Heroic Navy carrying Air Force and Tank

**Algebraic Notation**:

- Combination moves use `&` symbol: `Td4&e4` (Tank combines with piece at e4)
- Deploy moves use `>` symbol: `(NT)c3>d4` (Tank deploys from Navy stack)
- Multiple deployments shown in sequence notation

**Visual Board Representation**:

- Stacks display as the carrier piece with combination indicators
- Heroic status shown with `+` prefix for relevant pieces
- Stack composition can be queried for detailed piece information

#### Strategic Implications

**Tactical Advantages**:

- **Surprise Attacks**: Deploy pieces for unexpected tactical strikes
- **Defensive Formations**: Concentrate multiple pieces for area defense
- **Mobility**: Transport slower pieces using faster carriers
- **Deception**: Hide piece composition until deployment

**Strategic Considerations**:

- **Carrier Vulnerability**: Losing the carrier can expose carried pieces
- **Terrain Limitations**: Carrier terrain restrictions affect entire stack
- **Deployment Timing**: Choosing when to deploy vs when to keep combined
- **Resource Concentration**: Balancing concentrated power vs distributed
  coverage

**Combined Arms Tactics**:

- **Navy-Air Force**: Naval aviation for extended reach and flexibility
- **Tank-Infantry**: Mechanized infantry for breakthrough operations
- **Artillery-Engineer**: Engineering support for heavy weapons positioning
- **Commander Protection**: Carrying commanders for safety and mobility

The piece combination system transforms Cotulenh from a traditional chess
variant into a dynamic military simulation, where tactical flexibility and
strategic positioning create endless possibilities for creative gameplay.

**Advanced Combination Examples**:

**Example 1: Multi-Stage Combination Building**

```
Turn 1: Infantry at d4, Tank at e4
Move: Id4&e4 → Result: (TI) at e4 (Tank carries Infantry)

Turn 3: Engineer at f4 approaches the Tank-Infantry stack
Move: Ef4&e4 → Result: (ETI) at e4 (Engineer becomes carrier, role flag 256 > 64)

Turn 5: Navy at c4 approaches the Engineer-Tank-Infantry stack
Move: Nc4&e4 → Result: (NETI) at e4 (Navy becomes carrier, role flag 512 > 256)

Final Stack Analysis:
- Carrier: Navy (highest role flag: 512)
- Carried: Engineer, Tank, Infantry
- Movement: 4 squares, ignore blocking (Navy characteristics)
- Terrain: Restricted to Navy zones (files a-c, river squares)
- Special: Can deploy all pieces when reaching mixed zones
```

**Example 2: Tactical Recombination During Deployment**

```
Initial Position:
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·(AFT) ·  E  ·  T  ·  ·  ·  ·  (Air Force-Tank stack, Engineer, Tank)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Deployment Sequence:
1. Deploy Air Force: c3 > e3 (combines with Engineer)
   Temporary: (FE) at e3, (T) at c3
2. Deploy Tank from c3: c3 > f3 (combines with Tank at f3)
   Temporary: (FE) at e3, (TT) at f3
3. Commit deployment

Final Position:
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  (FE) ·  (TT) ·  ·  ·  ·  (Two new stacks formed)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Result Analysis:
- Air Force-Engineer stack: Air Force carrier (role flag 128 > 256)
- Tank-Tank stack: Equal role flags (64), first Tank becomes carrier
- Strategic benefit: Two mobile stacks instead of one large stack
```

**Example 3: Heroic Status in Combinations**

```
Initial Setup:
Position: +Tank (heroic) at d4, Infantry at e4
Move: +Td4&e4 → Result: (+TI) at e4

Stack Capabilities:
- Carrier: Heroic Tank (enhanced abilities)
- Movement: 3 squares (heroic Tank range)
- Capture: 3 squares (heroic Tank range)
- Directions: All directions (heroic diagonal capability)
- Carried: Regular Infantry (maintains individual status)

Deployment Options:
- Deploy Infantry: Moves 1 square orthogonally (regular Infantry)
- Deploy Heroic Tank: Moves 3 squares all directions (heroic abilities)
- Both pieces maintain their individual heroic status independently
```

## Special Game Mechanics

### Air Defense System

The **air defense system** is a sophisticated mechanic that creates zones of
influence around certain pieces, restricting and potentially destroying enemy
air units that attempt to pass through these protected areas. This system
simulates real-world air defense networks and adds strategic depth to air unit
deployment.

#### Air Defense Pieces and Ranges

Three piece types provide air defense capabilities, each with different base
ranges that can be enhanced through heroic status:

**Anti-Air (G/g)**:

- **Base Range**: 1 square radius (circular coverage)
- **Heroic Range**: 2 square radius
- **Coverage Pattern**: Circular area around the piece
- **Terrain**: Land zones only (heavy piece restrictions apply)

**Missile (S/s)**:

- **Base Range**: 2 square radius (circular coverage)
- **Heroic Range**: 3 square radius
- **Coverage Pattern**: Circular area around the piece
- **Terrain**: Land zones only (heavy piece restrictions apply)

**Navy (N/n)**:

- **Base Range**: 1 square radius (circular coverage)
- **Heroic Range**: 2 square radius
- **Coverage Pattern**: Circular area around the piece
- **Terrain**: Navy zones only (files a-c plus river squares)

#### Air Defense Zone Calculation

Air defense zones are calculated using a **circular coverage pattern** based on
the Euclidean distance formula:

**Coverage Formula**: For a piece at position (x, y) with defense level L, all
squares (i, j) where `(x-i)² + (y-j)² ≤ L²` are within the defense zone.

**Coverage Examples**:

**Level 1 Coverage (Anti-Air, Navy base)**:

```
  · · · · ·
  · · X · ·  (X = defended square)
  · X P X ·  (P = air defense piece)
  · · X · ·
  · · · · ·
```

Covers 5 squares: the piece's square plus 4 orthogonally adjacent squares.

**Level 2 Coverage (Missile base, heroic Anti-Air/Navy)**:

```
  · · · · · · ·
  · · X X X · ·
  · X X X X X ·
  · X X P X X ·  (P = air defense piece)
  · X X X X X ·
  · · X X X · ·
  · · · · · · ·
```

Covers 13 squares in a circular pattern.

**Level 3 Coverage (Heroic Missile)**:

```
  · · · · · · · · ·
  · · · X X X · · ·
  · · X X X X X · ·
  · X X X X X X X ·
  · X X X P X X X ·  (P = air defense piece)
  · X X X X X X X ·
  · · X X X X X · ·
  · · · X X X · · ·
  · · · · · · · · ·
```

Covers 29 squares in an extended circular pattern.

#### Air Force Movement Through Defense Zones

When [Air Force pieces](#air-force-ff) move through enemy
[air defense zones](#air-defense-zone-calculation), the system evaluates their
path and determines one of three possible outcomes:

**SAFE_PASS (0)**:

- Air Force can move through the square without consequence
- Occurs when the square is not covered by any enemy air defense
- Normal movement and capture rules apply

**KAMIKAZE (1)**:

- Air Force can pass through but will be destroyed in the process
- Occurs when moving through exactly one air defense zone without exiting and
  re-entering
- The Air Force piece can complete its move (including captures) but is
  destroyed afterward
- Represents a suicide attack where the air unit accomplishes its mission but
  doesn't survive

**DESTROYED (2)**:

- Air Force cannot pass through the square and movement is blocked
- Occurs when encountering multiple overlapping air defense zones
- Occurs when exiting one air defense zone and entering another
- The Air Force piece cannot complete the move and remains at its starting
  position

#### Air Defense Zone Interaction Rules

**Single Zone Traversal**:

- Air Force entering and remaining within one air defense zone: **KAMIKAZE**
- Air Force can complete its intended move but is destroyed upon completion
- Allows for tactical suicide attacks on high-value targets

**Multiple Zone Encounters**:

- Air Force encountering overlapping defense zones: **DESTROYED**
- Air Force exiting one zone and entering another: **DESTROYED**
- Movement is completely blocked and the piece cannot advance

**Zone Exit and Re-entry**:

- Air Force leaving a defense zone and then entering any defense zone (same or
  different): **DESTROYED**
- This prevents "zone hopping" tactics and requires careful route planning

#### Strategic Implications

**Defensive Strategy**:

- **Zone Overlap**: Position multiple air defense pieces to create overlapping
  coverage
- **Chokepoint Control**: Use air defense to control key squares and movement
  corridors
- **Layered Defense**: Combine different air defense pieces for comprehensive
  coverage
- **Heroic Enhancement**: Promote air defense pieces to extend their protective
  ranges

**Offensive Air Operations**:

- **Route Planning**: Carefully plan Air Force movements to avoid or minimize
  air defense exposure
- **Kamikaze Tactics**: Accept Air Force losses for critical strikes on enemy
  positions
- **Defense Suppression**: Target enemy air defense pieces before conducting air
  operations
- **Timing Coordination**: Coordinate air attacks with ground operations to
  maximize effectiveness

#### Air Defense Examples

**Example 1: Safe Passage**

```
Initial Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  g  ·  ·  ·  ·  ·  ·  ·  (Blue Anti-Air)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  F  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  (Red Air Force)

Move: Fa1-a8 (Air Force moves vertically, avoiding air defense zone)
Result: SAFE_PASS - Air Force reaches a8 safely
```

**Example 2: Kamikaze Attack**

```
Initial Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  g  ·  ·  ·  ·  ·  ·  ·  (Blue Anti-Air)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  F  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  (Red Air Force)

Move: Fa1-d3 (Air Force attacks Anti-Air directly)
Result: KAMIKAZE - Air Force captures Anti-Air but is destroyed in the process
Final: Both pieces removed from board
```

**Example 3: Destroyed by Multiple Zones**

```
Initial Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  g  ·  g  ·  ·  ·  ·  ·  ·  (Blue Anti-Air pieces)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  F  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  (Red Air Force)

Move: Fa1-d3 (Air Force attempts to move through overlapping zones)
Result: DESTROYED - Movement blocked by multiple air defense zones
Final: Air Force remains at a1, no pieces captured
```

**Example 4: Heroic Air Defense Enhancement**

```
Initial Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  +g ·  ·  ·  ·  ·  ·  ·  (Heroic Blue Anti-Air, range 2)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  F  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  (Red Air Force)

Air Defense Coverage (Heroic Anti-Air at d3):
- Covers: b1, b2, b3, b4, b5, c1, c2, c3, c4, c5, d1, d2, d3, d4, d5, e1, e2, e3, e4, e5, f1, f2, f3, f4, f5

Move: Fa1-f1 (Air Force attempts to move horizontally)
Result: DESTROYED - f1 is within the heroic Anti-Air's extended range
```

The air defense system creates a complex tactical environment where air
superiority must be carefully managed through strategic positioning, timing, and
coordination with ground forces.

### Commander Exposure Rules

The **commander exposure rules**, also known as the **flying general rule**,
create a unique tactical dynamic where commanders can capture each other
directly across clear orthogonal lines, regardless of their normal movement and
capture ranges. This rule prevents commanders from facing each other directly
and adds strategic depth to commander positioning.

#### Flying General Rule

The flying general rule allows commanders to capture enemy commanders under
specific conditions, overriding normal movement and capture limitations:

**Direct Capture Conditions**:

- Both commanders must be on the **same orthogonal line** (same file or same
  rank)
- The path between commanders must be **completely clear** (no intervening
  pieces)
- The capturing commander can reach the enemy commander **regardless of
  distance**
- This capture ignores the commander's normal 1-square capture range limitation

**Orthogonal Line Requirements**:

- **Same File**: Both commanders on the same vertical column (e.g., both on file
  e)
- **Same Rank**: Both commanders on the same horizontal row (e.g., both on
  rank 6)
- **Diagonal lines do NOT qualify** for flying general captures

#### Commander Exposure Detection

The exposure detection system prevents commanders from moving into positions
where they would face each other orthogonally with no intervening pieces:

**Exposure Validation**:

- Before any move, the system checks if the resulting position would expose the
  moving player's commander
- Moves that would create commander exposure are **automatically illegal**
- This applies to all piece movements, not just commander moves
- The validation occurs even if the move doesn't directly involve a commander

**Path Clearing Restrictions**:

- Players cannot move pieces that would clear the path between commanders
- Removing a blocking piece from between commanders makes the move illegal
- This prevents indirect commander exposure through piece movement

#### Commander Confrontation Examples

**Example 1: Direct Flying General Capture (File)**

```
Initial Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander on g12)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander on g7)
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Legal Move: Cg7xg12 (Red Commander captures Blue Commander)
- Both commanders on file g
- Path g8, g9, g10, g11 is completely clear
- Flying general rule allows capture regardless of 5-square distance
- Game ends with Red victory
```

**Example 2: Direct Flying General Capture (Rank)**

```
Initial Position:
12  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  +c  ·  ·  ·  ·  ·  +C  ·  (Commanders on rank 7)
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Legal Move: Cj7xd7 (Red Commander captures Blue Commander)
- Both commanders on rank 7
- Path e7, f7, g7, h7, i7 is completely clear
- Flying general rule allows capture regardless of 6-square distance
- Game ends with Red victory
```

**Example 3: Blocked Path - No Flying General**

```
Initial Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander on g12)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  I  ·  ·  ·  ·  (Red Infantry blocks path)
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander on g7)
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

No Flying General Capture Available:
- Both commanders on file g
- Infantry at g9 blocks the path
- Red Commander cannot capture Blue Commander
- Normal movement rules apply (1-square range for Red Commander)
```

**Example 4: Illegal Move - Creates Exposure**

```
Initial Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander on g12)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  I  ·  ·  ·  ·  (Red Infantry blocks path)
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander on g7)
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Illegal Move: Ig9-f9 (Infantry moves away from blocking position)
- This move would clear the path between commanders
- Red Commander would be exposed to Blue Commander
- Move is automatically rejected as illegal
- Infantry must remain on g9 or move to another square on file g
```

**Example 5: Legal Blocking Move**

```
Initial Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander on g12)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander on g7)
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  I  ·  ·  ·  ·  (Red Infantry available)
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Legal Move: Ig2-g9 (Infantry moves to block the path)
- Infantry moves from g2 to g9, blocking the commander line
- This prevents Blue Commander from capturing Red Commander
- Move is legal because it doesn't create exposure
- Creates a defensive formation protecting the Red Commander
```

#### Strategic Implications

**Defensive Positioning**:

- **Maintain Blocking Pieces**: Keep pieces between commanders to prevent flying
  general captures
- **Avoid Orthogonal Alignment**: Position commanders on different files and
  ranks when possible
- **Protective Formations**: Use multiple pieces to create redundant blocking
  positions
- **Commander Mobility**: Keep escape squares available for commander retreat

**Offensive Opportunities**:

- **Path Clearing**: Force opponent pieces away from blocking positions
- **Commander Hunting**: Maneuver to create orthogonal alignment opportunities
- **Tactical Sacrifices**: Trade pieces to clear paths for flying general
  captures
- **Tempo Advantage**: Use commander exposure threats to limit opponent options

**Endgame Considerations**:

- **Reduced Piece Count**: Fewer pieces available for blocking makes exposure
  more likely
- **Commander Activity**: Commanders become more active when fewer pieces can
  block them
- **Zugzwang Positions**: Opponent forced to move pieces that create exposure
- **Perpetual Threats**: Commander exposure can create drawing chances in losing
  positions

#### Commander Exposure vs Normal Check

**Key Differences**:

- **Range Override**: Flying general ignores normal capture range limitations
- **Immediate Capture**: No opportunity to block or escape once exposed
- **Orthogonal Only**: Only applies to file and rank alignments, not diagonals
- **Mutual Threat**: Both commanders threaten each other equally when exposed
- **Game Ending**: Flying general capture immediately ends the game

**Interaction with Other Rules**:

- **Heroic Status**: Heroic commanders still follow flying general rules
- **Piece Combinations**: Commanders in stacks are not exposed (carrier protects
  them)
- **Deployment Moves**: Deploy sequences cannot create commander exposure
- **Check Escape**: Moving to escape check cannot create commander exposure

The commander exposure rules add a unique tactical layer to Cotulenh, requiring
constant awareness of commander positioning and creating dramatic opportunities
for sudden game-ending captures.

### Deployment System

The **deployment system** allows players to execute complex multi-piece
maneuvers by deploying individual pieces from
[combined stacks](#piece-combination-mechanics) across multiple squares in
coordinated sequences. This system enables sophisticated tactical operations,
surprise attacks, and flexible positioning strategies that distinguish Cotulenh
from traditional chess variants.

#### Deploy Sequences and Sessions

**Deploy Session Mechanics**:

- A **deploy session** begins when a player initiates a deployment move from a
  piece stack
- The session allows multiple pieces to be deployed from the same stack in
  sequence
- Each piece in the session moves according to its own movement characteristics
  and terrain restrictions
- The session continues until all desired pieces are deployed or the player
  commits the sequence
- Sessions can be **canceled** at any time, returning all pieces to their
  original stack

**Session Lifecycle**:

1. **Initiation**: Player selects a piece from a stack and chooses a deployment
   destination
2. **Execution**: The selected piece moves to its destination, creating a deploy
   session
3. **Continuation**: Additional pieces can be deployed from the remaining stack
4. **Commitment**: Player commits the sequence, finalizing all moves and ending
   their turn
5. **Cancellation**: Player can cancel at any time, undoing all moves in the
   session

#### Multi-Piece Deployment Mechanics

**Deployment Rules**:

- Only pieces from the **same original stack** can be deployed in a single
  session
- Each piece moves **independently** according to its own movement patterns and
  ranges
- **Terrain restrictions** apply to each piece individually during deployment
- Pieces can **capture enemy pieces** during deployment moves
- Deployed pieces can **recombine** with other pieces at their destination
  squares

**Stack Composition During Deployment**:

- The **original stack** is preserved at the start of the session
- As pieces deploy, they are removed from the remaining stack
- The **carrier hierarchy** may change as pieces are removed
- Remaining pieces maintain their original relationships until deployment

**Deployment Validation**:

- Each deployment move is validated for **legal movement** and **terrain
  compatibility**
- The entire sequence is validated for **commander safety** before commitment
- Invalid moves are rejected, and the session can be adjusted or canceled
- **Check escape** validation occurs at commitment time, allowing complex escape
  sequences

#### Deployment Examples and Notation

**Example 1: Basic Tank-Infantry Deployment**

```
Initial Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  (TI) ·  ·  ·  ·  ·  ·  ·  ·  (Tank carrying Infantry)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Deploy Session:
1. Deploy Tank: c3 > c5 (Tank moves to c5)
2. Deploy Infantry: c3 > d3 (Infantry moves to d3)
3. Commit Session

Final Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  T  ·  ·  ·  ·  ·  ·  ·  ·  (Tank deployed)
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  I  ·  ·  ·  ·  ·  ·  ·  (Infantry deployed)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Notation: c3:Tc5,Id3
```

**Example 2: Navy-Air Force-Tank Complex Deployment**

```
Initial Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  (NFT) ·  ·  ·  ·  ·  ·  ·  ·  (Navy carrying Air Force and Tank)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Deploy Session:
1. Deploy Air Force: c3 > e5 (Air Force flies to e5)
2. Deploy Tank: c3 > d4 (Tank moves to d4)
3. Commit Session (Navy remains at c3)

Final Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  F  ·  ·  ·  ·  ·  ·  (Air Force deployed)
 4  ·  ·  ·  T  ·  ·  ·  ·  ·  ·  ·  (Tank deployed)
 3  ·  ·  N  ·  ·  ·  ·  ·  ·  ·  ·  (Navy remains)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Notation: c3:N<,Fe5,Td4
(N< indicates Navy stays at original position)
```

**Example 3: Deployment with Captures**

```
Initial Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  i  ·  ·  ·  ·  ·  ·  (Blue Infantry)
 4  ·  ·  ·  t  ·  ·  ·  ·  ·  ·  ·  (Blue Tank)
 3  ·  ·  (TI) ·  ·  ·  ·  ·  ·  ·  ·  (Red Tank carrying Infantry)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Deploy Session:
1. Deploy Tank: c3 x d4 (Tank captures Blue Tank)
2. Deploy Infantry: c3 x e5 (Infantry captures Blue Infantry)
3. Commit Session

Final Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  I  ·  ·  ·  ·  ·  ·  (Red Infantry captured Blue Infantry)
 4  ·  ·  ·  T  ·  ·  ·  ·  ·  ·  ·  (Red Tank captured Blue Tank)
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Notation: c3:Txd4,Ixe5
```

**Example 4: Deployment with Recombination**

```
Initial Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  (AFT) ·  E  ·  ·  ·  ·  ·  ·  (Air Force carrying Tank, Engineer at e3)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Deploy Session:
1. Deploy Air Force: c3 > e3 (Air Force moves to e3, combines with Engineer)
2. Deploy Tank: c3 > d4 (Tank moves to d4)
3. Commit Session

Final Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  T  ·  ·  ·  ·  ·  ·  ·  (Tank deployed)
 3  ·  ·  ·  ·  (FE) ·  ·  ·  ·  ·  ·  (Air Force combined with Engineer)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Notation: c3:F&e3,Td4
(& indicates recombination)
```

#### Deployment Notation System

**Long Algebraic Notation (LAN) for Deployments**:

- **Format**: `origin_square:move1,move2,move3...`
- **Origin Square**: The square where the original stack was located
- **Move Sequence**: Comma-separated list of individual piece moves
- **Stay Notation**: `Piece<` indicates a piece remains at the origin square
- **Capture Notation**: `Piecexsquare` indicates a capture during deployment
- **Recombination**: `Piece&square` indicates combination with existing piece

**Standard Algebraic Notation (SAN) for Deployments**:

- **Simplified Format**: `move1,move2,move3...` (origin square implied)
- **Stay Prefix**: `Piece<,` at the beginning indicates pieces remaining
- **Example**: `N<,Fe5,Td4` = Navy stays, Air Force to e5, Tank to d4

#### Strategic Implications

**Tactical Advantages**:

- **Surprise Attacks**: Deploy pieces for unexpected multi-front assaults
- **Flexible Positioning**: Spread pieces across optimal tactical positions
- **Escape Sequences**: Use deployment to escape check through complex maneuvers
- **Combined Arms**: Coordinate different piece types for maximum effectiveness

**Deployment Strategy**:

- **Timing**: Choose optimal moments for deployment based on board position
- **Sequence Planning**: Plan deployment order to maximize tactical advantage
- **Terrain Utilization**: Deploy pieces to squares that maximize their
  effectiveness
- **Enemy Response**: Consider opponent's potential responses to deployment
  patterns

**Session Management**:

- **Commitment Timing**: Decide when to commit vs continue deploying
- **Cancellation Options**: Use cancellation to avoid unfavorable positions
- **Undo Capability**: Adjust deployment sequences during the session
- **Validation Awareness**: Understand that final validation occurs at
  commitment

**Defensive Considerations**:

- **Anti-Deployment**: Position pieces to limit opponent deployment options
- **Counter-Attack**: Prepare responses to enemy deployment sequences
- **Stack Targeting**: Attack enemy stacks before they can deploy effectively
- **Terrain Control**: Control key squares to limit deployment destinations

#### Advanced Deployment Mechanics

**Recombination During Deployment**:

- Deployed pieces can **combine with existing pieces** at their destination
- Recombination follows normal **carrier hierarchy rules**
- **Terrain validation** applies to the resulting combined piece
- **Commander safety** is checked for combinations involving commanders

**Session State Management**:

- **FEN Notation**: Incomplete sessions are marked with `...` in FEN strings
- **History Tracking**: Sessions don't enter history until committed
- **Turn Management**: Turn doesn't change until session commitment
- **Cache Invalidation**: Move caches are cleared during session operations

**Error Handling and Validation**:

- **Move Legality**: Each deployment move is validated individually
- **Terrain Compliance**: Pieces must be able to legally occupy destination
  squares
- **Commander Safety**: Final position must not leave commander in danger
- **Session Integrity**: Sessions maintain consistency throughout the sequence

The deployment system transforms Cotulenh into a dynamic tactical environment
where players can execute sophisticated multi-piece operations, creating
opportunities for complex strategic combinations and flexible battlefield
adaptation.

## Move Types and Notation

### Move Types

Cotulenh features several distinct move types that reflect the game's military
theme and complex tactical mechanics. Each move type serves specific strategic
purposes and follows unique rules for execution and notation.

#### Normal Moves

**Normal moves** represent standard piece movement and capture actions, similar
to traditional chess but adapted for Cotulenh's unique piece characteristics and
terrain restrictions.

**Movement Characteristics**:

- **Single Piece**: One piece moves from its current square to a destination
  square
- **Range Validation**: Movement must be within the piece's movement range
- **Direction Compliance**: Movement must follow the piece's allowed directions
  (orthogonal, diagonal, or both)
- **Terrain Restrictions**: Destination square must be compatible with the
  piece's terrain requirements
- **Path Validation**: Some pieces can ignore blocking pieces, others cannot

**Capture Mechanics**:

- **Enemy Piece Capture**: Moving piece captures and replaces enemy piece at
  destination
- **Friendly Piece Interaction**: Moving to a square with a friendly piece
  results in combination (if legal)
- **Empty Square Movement**: Moving to an empty square is a simple relocation

**Normal Move Examples**:

```
Tank Movement: Td4-d6 (Tank moves from d4 to d6)
Infantry Capture: Ie4xf4 (Infantry captures enemy piece at f4)
Commander Move: Cg1-g3 (Commander moves from g1 to g3)
Air Force Flight: Fa1-e5 (Air Force flies from a1 to e5)
```

**Validation Rules**:

- **Legal Movement**: Destination must be reachable within piece's movement
  pattern
- **Terrain Compliance**: Piece must be able to legally occupy the destination
  square
- **Commander Safety**: Move cannot expose own commander to capture
- **Air Defense**: Air Force moves are validated against enemy air defense zones

#### Deploy Sequences

**Deploy sequences** allow players to execute sophisticated multi-piece
maneuvers by deploying individual pieces from combined stacks across multiple
squares in coordinated tactical operations.

**Deploy Session Mechanics**:

- **Session Initiation**: Player selects a piece from a stack and chooses
  deployment destination
- **Sequential Deployment**: Additional pieces can be deployed from the
  remaining stack
- **Independent Movement**: Each piece moves according to its own
  characteristics
- **Session Commitment**: All moves are finalized together when the session is
  committed
- **Cancellation Option**: Entire sequence can be canceled, returning pieces to
  original positions

**Deployment Rules**:

- **Same Stack Origin**: Only pieces from the same original stack can be
  deployed in one session
- **Individual Validation**: Each deployment move is validated for legality and
  terrain compatibility
- **Capture Capability**: Deployed pieces can capture enemy pieces during their
  moves
- **Recombination**: Deployed pieces can combine with other pieces at their
  destinations
- **Commander Safety**: Final position must not leave commander in check

**Deploy Sequence Examples**:

```
Basic Deployment:
Initial: (TI) at c3 (Tank carrying Infantry)
Deploy: c3:Tc5,Id3 (Tank to c5, Infantry to d3)

Complex Naval Deployment:
Initial: (NFT) at c3 (Navy carrying Air Force and Tank)
Deploy: c3:N<,Fe5,Td4 (Navy stays, Air Force to e5, Tank to d4)

Deployment with Captures:
Initial: (AI) at d2 (Artillery carrying Infantry)
Deploy: d2:Axe5,Ixf3 (Artillery captures at e5, Infantry captures at f3)

Deployment with Recombination:
Initial: (FT) at c3, Engineer at e3
Deploy: c3:F&e3,Td4 (Air Force combines with Engineer, Tank to d4)
```

**Strategic Applications**:

- **Surprise Attacks**: Deploy pieces for unexpected multi-front assaults
- **Flexible Positioning**: Spread pieces across optimal tactical squares
- **Escape Maneuvers**: Use deployment to escape check through complex sequences
- **Combined Arms Operations**: Coordinate different piece types for maximum
  effectiveness

#### Stay Captures

**Stay captures** represent ranged attack mechanisms where pieces destroy enemy
targets without moving to occupy their squares. This reflects modern military
capabilities where units can engage enemies at distance.

**Stay Capture Mechanics**:

- **Ranged Destruction**: Attacking piece remains at its current position
- **Target Elimination**: Enemy piece is destroyed and removed from the board
- **No Occupation**: Attacking piece does not move to the target square
- **Range Validation**: Target must be within the piece's capture range
- **Line of Sight**: Some pieces require clear lines of sight, others can ignore
  blocking

**Pieces with Stay Capture Capability**:

- **Air Force**: Can perform stay captures within their movement range
- **Artillery**: Can perform stay captures, ignoring intervening pieces
- **Navy**: Can perform stay captures against appropriate targets
- **Missile**: Can perform stay captures within range

**Stay Capture Examples**:

```
Air Force Stay Capture: Fa1*e5 (Air Force at a1 destroys enemy at e5, stays at a1)
Artillery Bombardment: Ad2*h6 (Artillery at d2 destroys enemy at h6, stays at d2)
Naval Gun Attack: Nc3*f3 (Navy at c3 destroys land target at f3, stays at c3)
Missile Strike: Sf2*g7 (Missile at f2 destroys enemy at g7, stays at f2)
```

**Tactical Considerations**:

- **Position Preservation**: Attacking piece maintains its strategic position
- **Multiple Targets**: Can potentially attack multiple targets in sequence
- **Defensive Value**: Provides area denial without exposing the attacking piece
- **Range Advantage**: Allows engagement beyond normal movement range

#### Suicide Captures

**Suicide captures** represent kamikaze-style attacks where the attacking piece
destroys both itself and the target in a mutual destruction scenario. This
reflects desperate tactical situations and specialized attack methods.

**Suicide Capture Mechanics**:

- **Mutual Destruction**: Both attacking piece and target are destroyed
- **Voluntary Sacrifice**: Attacking player chooses to sacrifice their piece
- **Tactical Exchange**: Often used to eliminate high-value enemy pieces
- **No Occupation**: Neither piece remains on the target square after the attack

**Suicide Capture Conditions**:

- **Air Force Kamikaze**: Air Force pieces can perform suicide attacks when
  passing through air defense zones
- **Desperate Situations**: Any piece can potentially perform suicide captures
  under specific circumstances
- **Commander Threats**: Suicide captures can be used to eliminate threats to
  commanders
- **Tactical Trades**: Exchange lower-value pieces for higher-value targets

**Suicide Capture Examples**:

```
Air Force Kamikaze: Fa1**g3 (Air Force destroys enemy at g3, both pieces removed)
Desperate Infantry: Ie4**f4 (Infantry destroys enemy Tank, both pieces removed)
Tank Ramming: Td4**e4 (Tank destroys enemy Artillery, both pieces removed)
```

**Strategic Applications**:

- **High-Value Elimination**: Remove critical enemy pieces at the cost of own
  piece
- **Defensive Sacrifice**: Prevent enemy breakthroughs through tactical
  sacrifice
- **Endgame Tactics**: Simplify positions by reducing material on both sides
- **Commander Protection**: Eliminate immediate threats to own commander

#### Combination Moves

**Combination moves** allow pieces to merge into stacks, creating tactical units
that can move together and be deployed separately. This system enables
sophisticated military formations and flexible tactical operations.

**Combination Mechanics**:

- **Stack Formation**: Multiple friendly pieces occupy the same square
- **Carrier Hierarchy**: Piece with highest role flag becomes the carrier
- **Preserved Abilities**: Individual piece characteristics are maintained
  within the stack
- **Terrain Adaptation**: Stack follows carrier's terrain restrictions and
  movement patterns

**Combination Process**:

- **Approach Movement**: Piece moves to a square occupied by a friendly piece
- **Automatic Combination**: Pieces automatically combine based on hierarchy
  rules
- **Carrier Determination**: Highest role flag piece becomes the carrier
- **Stack Notation**: Combined pieces are represented with parentheses notation

**Combination Examples**:

```
Tank-Infantry Combination: Td4&e4 (Tank moves to e4, combines with Infantry)
Result: (TI) at e4 (Tank carrying Infantry)

Navy-Air Force Combination: Nc3&d3 (Navy moves to d3, combines with Air Force)
Result: (NF) at d3 (Navy carrying Air Force)

Multiple Piece Combination: Artillery moves to square with Tank and Infantry
Result: (ATI) (Artillery carrying Tank and Infantry)
```

**Carrier Hierarchy (Highest to Lowest Priority)**:

1. **Navy** (Role Flag: 512)
2. **Headquarters** (Role Flag: 1024)
3. **Engineer** (Role Flag: 256)
4. **Air Force** (Role Flag: 128)
5. **Tank** (Role Flag: 64)
6. **Missile** (Role Flag: 32)
7. **Anti-Air** (Role Flag: 16)
8. **Artillery** (Role Flag: 8)
9. **Militia** (Role Flag: 4)
10. **Infantry** (Role Flag: 2)
11. **Commander** (Role Flag: 1)

**Strategic Benefits**:

- **Protected Transport**: Carry vulnerable pieces using more mobile carriers
- **Concentrated Force**: Mass multiple pieces for breakthrough attacks
- **Flexible Deployment**: Deploy pieces when and where needed most
- **Terrain Adaptation**: Use appropriate carriers for different terrain types

#### Special Move Interactions

**Commander Exposure Moves**:

- **Flying General**: Commanders can capture enemy commanders across clear
  orthogonal lines
- **Exposure Prevention**: Moves that would expose own commander are
  automatically illegal
- **Path Clearing**: Cannot move pieces that would clear the path between
  commanders

**Air Defense Interactions**:

- **Zone Validation**: Air Force moves are validated against enemy air defense
  coverage
- **Kamikaze Results**: Air Force may be destroyed when passing through defense
  zones
- **Safe Passage**: Air Force can move freely through areas without air defense
  coverage

**Heroic Promotion Moves**:

- **Check Requirement**: Pieces become heroic when their moves result in check
- **Multiple Promotion**: All pieces that can attack the enemy commander become
  heroic
- **Enhanced Abilities**: Heroic pieces gain improved movement and capture
  ranges

**Terrain-Restricted Moves**:

- **Navy Zone Limits**: Navy pieces restricted to water areas and mixed zones
- **Land Zone Limits**: Land pieces cannot enter pure Navy zones
- **Bridge Crossings**: Heavy pieces require bridge squares to cross the river
- **Air Mobility**: Air Force pieces ignore terrain restrictions but face air
  defense

**Complex Move Type Interactions**:

**Example 1: Combined Arms Assault**

```
Initial Position:
 8  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·(AFT) ·  ·  ·  ·  ·  ·  ·  ·  (Red Air Force-Tank stack)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Multi-Move Sequence:
1. Deploy Air Force for reconnaissance: c3:F>g6 (Air Force scouts)
2. Stay capture to eliminate defender: F*g7 (Air Force destroys piece at g7)
3. Deploy Tank for assault: c3:T>g5 (Tank positions for attack)
4. Normal capture for checkmate: Tg5xg8# (Tank delivers checkmate)

Result: Coordinated air-ground assault using multiple move types
```

**Example 2: Defensive Sacrifice Chain**

```
Scenario: Red Commander under multiple threats
Position:
 8  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander in danger)
 7  ·  ·  ·  t  ·  ·  ·  ·  a  ·  ·  (Blue Tank and Artillery threatening)
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·I  ·  ·  ·  ·  ·  (Red Infantry available)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Defensive Sequence:
1. Suicide capture to eliminate Tank: I**d7 (Infantry destroys Tank, both removed)
2. Commander moves to escape Artillery: +Cg8-f8 (Commander retreats)
3. Result: Commander survives by sacrificing Infantry

Analysis: Tactical sacrifice using suicide capture to save high-value piece
```

**Example 3: Heroic Promotion Through Deployment**

```
Setup: Red needs to create check for heroic promotion
Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·(TAI) ·  ·  ·  ·  ·  ·  ·  ·  (Red Tank-Artillery-Infantry stack)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Deployment for Heroic Promotion:
Move: c3:Ag12+ (Artillery deploys to give check)

Result Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander in check)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·(TI) ·  ·  ·  ·  ·  ·  ·  ·  (Tank-Infantry stack remains)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
12  ·  ·  ·  ·  ·  ·  +A  ·  ·  ·  ·  (Artillery becomes heroic)

Heroic Promotion Result:
- Artillery becomes heroic (moved and gave check)
- Enhanced capabilities: 4-square range, diagonal movement
- Strategic advantage: Heroic Artillery controls large area
```

Each move type in Cotulenh serves specific tactical and strategic purposes,
creating a rich environment for military-themed gameplay that rewards careful
planning, tactical flexibility, and strategic thinking.

### Notation Systems

Cotulenh employs two primary notation systems to record and communicate moves:
**Standard Algebraic Notation (SAN)** and **Long Algebraic Notation (LAN)**.
Both systems are adapted from chess conventions but extended to handle
Cotulenh's unique mechanics including
[piece combinations](#piece-combination-mechanics),
[deployment sequences](#deployment-system), and special
[move types](#move-types).

#### Standard Algebraic Notation (SAN)

**Standard Algebraic Notation** provides a concise format for recording moves,
emphasizing readability and brevity while maintaining precision for all move
types.

**Basic SAN Format**:

- **Piece Symbol**: Single letter representing the moving piece (C, I, T, M, E,
  A, G, S, F, N, H)
- **Destination Square**: Target square in algebraic notation (e.g., e4, g7,
  k12)
- **Capture Indicator**: 'x' symbol indicates a capture
- **Special Symbols**: Additional symbols for special move types and conditions

**SAN Piece Symbols**:

- **C** = Commander
- **I** = Infantry
- **T** = Tank
- **M** = Militia
- **E** = Engineer
- **A** = Artillery
- **G** = Anti-Air
- **S** = Missile
- **F** = Air Force
- **N** = Navy
- **H** = Headquarters

**Basic SAN Examples**:

```
Te4      = Tank moves to e4
Ixf5     = Infantry captures piece at f5
Cg1-g3   = Commander moves from g1 to g3 (disambiguation)
Fa1      = Air Force moves to a1
Nxd6     = Navy captures piece at d6
```

**SAN Disambiguation Rules**: When multiple pieces of the same type can reach
the same destination, disambiguation is required:

- **File Disambiguation**: `Tde4` (Tank from d-file moves to e4)
- **Rank Disambiguation**: `T3e4` (Tank from rank 3 moves to e4)
- **Full Square**: `Td3e4` (Tank from d3 moves to e4) - used when file/rank
  disambiguation insufficient

**SAN Special Move Notation**:

**Combination Moves**:

- **&** = Combination symbol
- `T&e4` = Tank combines with piece at e4
- `I&f3` = Infantry combines with piece at f3

**Stay Captures**:

- **\*** = Stay capture symbol
- `F*e5` = Air Force performs stay capture at e5
- `A*h6` = Artillery performs stay capture at h6

**Suicide Captures**:

- **\*\*** = Suicide capture symbol
- `F**g3` = Air Force performs suicide capture at g3
- `I**f4` = Infantry performs suicide capture at f4

**Deploy Sequences**:

- **:** = Deploy session indicator
- `,` = Move separator within session
- `<` = Piece remains at origin
- `c3:Tc5,Id3` = Deploy Tank to c5, Infantry to d3 from c3
- `N<,Fe5,Td4` = Navy stays, Air Force to e5, Tank to d4

**Heroic Status Indicators**:

- **+** = Heroic status prefix
- `+Te4` = Heroic Tank moves to e4
- `+Ixf5` = Heroic Infantry captures at f5
- `T+` = Tank becomes heroic (promotion notation)

#### Long Algebraic Notation (LAN)

**Long Algebraic Notation** provides complete move information including both
origin and destination squares, offering maximum clarity and precision for
complex positions and analysis.

**Basic LAN Format**:

- **Piece Symbol**: Letter representing the moving piece
- **Origin Square**: Starting square in algebraic notation
- **Move Indicator**: Symbol indicating move type (-, x, \*, etc.)
- **Destination Square**: Target square in algebraic notation

**LAN Move Indicators**:

- **-** = Normal move (non-capture)
- **x** = Capture move
- **&** = Combination move
- **\*** = Stay capture
- **\*\*** = Suicide capture
- **>** = Deploy move (within session)

**Basic LAN Examples**:

```
Td4-e4   = Tank moves from d4 to e4
Ie4xf4   = Infantry captures from e4 to f4
Cg1-g3   = Commander moves from g1 to g3
Fa1-e5   = Air Force moves from a1 to e5
Nc3xd6   = Navy captures from c3 to d6
```

**LAN Combination Notation**:

```
Td4&e4   = Tank from d4 combines with piece at e4
Nc3&d3   = Navy from c3 combines with piece at d3
If3&g3   = Infantry from f3 combines with piece at g3
```

**LAN Stay Capture Notation**:

```
Fa1*e5   = Air Force at a1 performs stay capture at e5
Ad2*h6   = Artillery at d2 performs stay capture at h6
Nc3*f3   = Navy at c3 performs stay capture at f3
```

**LAN Deploy Sequence Notation**:

```
c3:Tc3>c5,Ic3>d3           = Tank deploys to c5, Infantry to d3
c3:Nc3<,Fc3>e5,Tc3>d4     = Navy stays, Air Force to e5, Tank to d4
d2:Ad2>e5,Id2>f3          = Artillery to e5, Infantry to f3
c3:Fc3&e3,Tc3>d4          = Air Force combines at e3, Tank to d4
```

#### Move Flag Symbols and Meanings

Cotulenh uses an extensive system of move flags to precisely categorize and
record different types of moves and their characteristics.

**Primary Move Type Flags**:

- **NORMAL** (0x1): Standard piece movement
- **CAPTURE** (0x2): Move captures an enemy piece
- **DEPLOY** (0x4): Piece deployment from a stack
- **COMBINE** (0x8): Piece combination move
- **STAY_CAPTURE** (0x10): Ranged attack without movement
- **SUICIDE** (0x20): Mutual destruction attack

**Special Condition Flags**:

- **CHECK** (0x40): Move results in check
- **CHECKMATE** (0x80): Move results in checkmate
- **HEROIC_PROMOTION** (0x100): Move causes heroic promotion
- **COMMANDER_EXPOSURE** (0x200): Move involves commander exposure rules
- **AIR_DEFENSE** (0x400): Move interacts with air defense systems

**Piece State Flags**:

- **HEROIC_PIECE** (0x800): Move involves a heroic piece
- **STACK_CARRIER** (0x1000): Move involves a piece stack carrier
- **TERRAIN_RESTRICTED** (0x2000): Move affected by terrain restrictions
- **BRIDGE_CROSSING** (0x4000): Heavy piece crossing river via bridge

**Session and Validation Flags**:

- **DEPLOY_SESSION** (0x8000): Move is part of a deployment session
- **SESSION_START** (0x10000): First move in a deployment session
- **SESSION_END** (0x20000): Final move in a deployment session
- **VALIDATION_REQUIRED** (0x40000): Move requires special validation

**Flag Combination Examples**:

```
NORMAL | CAPTURE = 0x3           = Normal capture move
DEPLOY | CAPTURE | CHECK = 0x46  = Deploy move with capture resulting in check
HEROIC_PROMOTION | CHECK = 0x140 = Move causes check and heroic promotion
SUICIDE | CAPTURE = 0x22         = Suicide capture (mutual destruction)
```

#### Notation for All Move Types

**Normal Move Notation**:

```
SAN: Te4, Ixf5, Cg3, Fa1
LAN: Td4-e4, Ie4xf5, Cg1-g3, Fa1-a1
Flags: NORMAL (0x1), NORMAL|CAPTURE (0x3)
```

**Deploy Sequence Notation**:

```
SAN: c3:Tc5,Id3 or N<,Fe5,Td4
LAN: c3:Tc3>c5,Ic3>d3 or c3:Nc3<,Fc3>e5,Tc3>d4
Flags: DEPLOY (0x4), DEPLOY_SESSION (0x8000)
```

**Stay Capture Notation**:

```
SAN: F*e5, A*h6, N*f3
LAN: Fa1*e5, Ad2*h6, Nc3*f3
Flags: STAY_CAPTURE (0x10), STAY_CAPTURE|CAPTURE (0x12)
```

**Suicide Capture Notation**:

```
SAN: F**g3, I**f4, T**e4
LAN: Fa1**g3, Ie4**f4, Td4**e4
Flags: SUICIDE (0x20), SUICIDE|CAPTURE (0x22)
```

**Combination Move Notation**:

```
SAN: T&e4, N&d3, I&f3
LAN: Td4&e4, Nc3&d3, If3&g3
Flags: COMBINE (0x8)
```

**Heroic Promotion Notation**:

```
SAN: Te4+ (move results in heroic promotion)
LAN: Td4-e4+ (move results in heroic promotion)
Flags: NORMAL|HEROIC_PROMOTION (0x101)
```

**Check and Checkmate Notation**:

```
SAN: Te4+, Ixf5#, c3:Tc5+,Id3
LAN: Td4-e4+, Ie4xf5#, c3:Tc3>c5+,Ic3>d3
Flags: CHECK (0x40), CHECKMATE (0x80)
```

#### Advanced Notation Features

**Stack Notation in Positions**:

- **Simple Stack**: `(TI)` = Tank carrying Infantry
- **Heroic Stack**: `(+TI)` = Heroic Tank carrying Infantry
- **Mixed Heroic**: `(T+I)` = Tank carrying Heroic Infantry
- **Complex Stack**: `(+NFT)` = Heroic Navy carrying Air Force and Tank

**FEN Integration**: Cotulenh FEN notation incorporates stack information and
heroic status:

```
Standard Position: 6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1

With Stacks: 6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1

Heroic Pieces: 6+c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6+C4 r - - 0 1
```

**Game Notation Examples**:

```
1. Te4 Tf9
2. c3:Tc5,Id3 d10:td8,id9
3. F*e9 n&c10
4. Cg1-g2+ +cg12-g11
5. Ixd9# (1-0)
```

**Annotation Symbols**:

- **!** = Good move
- **?** = Poor move
- **!!** = Brilliant move
- **??** = Blunder
- **!?** = Interesting move
- **?!** = Dubious move
- **(+)** = White/Red advantage
- **(-)** = Black/Blue advantage
- **(=)** = Equal position

#### Notation Validation and Standards

**Validation Rules**:

- All moves must specify valid piece symbols and square coordinates
- Disambiguation must be used when multiple pieces can reach the same
  destination
- Special symbols must be used correctly for their respective move types
- Deploy sequences must maintain proper session formatting
- Flag combinations must be logically consistent

**Standard Compliance**:

- SAN format prioritizes readability and conciseness
- LAN format provides complete move information for analysis
- Both formats support all Cotulenh move types and special mechanics
- Notation is compatible with standard chess notation tools where applicable
- Extensions are clearly marked and documented for Cotulenh-specific features

**Error Handling**:

- Invalid piece symbols are rejected during notation parsing
- Impossible moves are flagged during validation
- Ambiguous notation requires disambiguation
- Session formatting errors prevent move execution
- Flag inconsistencies trigger validation warnings

The notation systems in Cotulenh provide comprehensive coverage of all move
types while maintaining compatibility with traditional chess notation
conventions, enabling clear communication and analysis of this complex
military-themed variant.

## Game Flow and Rules

### Turn Sequence and Validation

Cotulenh follows a structured turn-based system where players alternate making
moves, with comprehensive validation ensuring legal gameplay and proper rule
enforcement. The turn management system handles both simple moves and complex
[deployment sequences](#deployment-system) while maintaining game state
integrity.

#### Turn Management

**Basic Turn Structure**:

- **Red player** always moves first in a new game
- Players **alternate turns** throughout the game
- Each turn consists of exactly **one move** or **one deployment sequence**
- Turn changes only occur after a move is **committed** and validated
- **Deploy sessions** do not change turns until the entire sequence is committed

**Turn State Tracking**:

- **Active Player**: The player whose turn it is to move
- **Move Counter**: Tracks the total number of moves in the game
- **Halfmove Clock**: Counts moves since the last capture or irreversible action
- **Turn History**: Maintains a complete record of all moves for analysis and
  undo operations

**Turn Transition Rules**:

- Turn changes **immediately** after a legal move is committed
- **Invalid moves** do not change the turn (player must try again)
- **Canceled deployment sessions** do not change the turn
- **Game-ending moves** (checkmate, commander capture) immediately end the game

#### Move Validation Process

The move validation system ensures that all moves comply with Cotulenh's complex
rules through a multi-stage validation process:

**Stage 1: Basic Move Legality**

- **Square Validation**: Verify source and destination squares are valid board
  coordinates
- **Piece Presence**: Confirm a piece of the correct color exists at the source
  square
- **Movement Pattern**: Validate the move follows the piece's movement rules
- **Range Checking**: Ensure the move distance is within the piece's movement
  range
- **Path Validation**: Check for blocking pieces (except for pieces that ignore
  blocking)

**Stage 2: Terrain and Special Rules**

- **[Terrain Restrictions](#terrain-zones)**: Validate piece can legally occupy
  the destination square
- **Heavy Piece Rules**: Check [bridge requirements](#bridge-squares) for heavy
  pieces crossing the river
- **[Air Defense Zones](#air-defense-system)**: Evaluate
  [Air Force](#air-force-ff) movement through enemy air defense coverage
- **[Piece Combination](#piece-combination-mechanics)**: Validate combination
  moves follow [carrier hierarchy](#carrier-hierarchy) rules
- **[Stack Deployment](#deployment-system)**: Verify deployment moves comply
  with session rules

**Stage 3: Game State Validation**

- **Commander Safety**: Ensure the move doesn't leave the player's commander in
  [check](#check-and-checkmate-detection)
- **[Commander Exposure](#commander-exposure-rules)**: Verify the move doesn't
  create illegal commander confrontation
- **[Flying General](#flying-general-rule)**: Check for direct commander capture
  opportunities
- **Check Escape**: If in check, validate the move escapes the check condition
- **Stalemate Prevention**: Ensure the move doesn't create an illegal
  [stalemate](#stalemate) position

**Stage 4: Session and Sequence Validation**

- **Deploy Session Integrity**: Validate deployment sequences maintain
  consistency
- **Recombination Rules**: Check piece recombination follows legal combination
  rules
- **Session Commitment**: Verify complete deployment sequences before turn
  change
- **Undo Capability**: Maintain ability to cancel incomplete sessions

#### Legal Move Generation

The legal move generation system produces all valid moves for the current
position, considering all game rules and restrictions:

**Move Generation Algorithm**:

1. **Piece Enumeration**: Identify all pieces belonging to the active player
2. **Pattern Generation**: Generate all possible moves based on each piece's
   movement pattern
3. **Terrain Filtering**: Remove moves that violate terrain restrictions
4. **Blocking Evaluation**: Filter moves blocked by intervening pieces (where
   applicable)
5. **Special Rule Application**: Apply air defense, commander exposure, and
   other special rules
6. **Safety Validation**: Remove moves that would leave the commander in check
7. **Combination Options**: Add valid piece combination and deployment moves
8. **Final Validation**: Perform complete validation on remaining candidate
   moves

**Move Categories Generated**:

**Normal Moves**:

- Standard piece movement to empty squares
- Capture moves against enemy pieces
- Heroic piece enhanced movement options

**Combination Moves**:

- Piece combination with friendly pieces at destination squares
- Stack formation following carrier hierarchy rules
- Terrain-validated combinations

**Deployment Moves**:

- Individual piece deployment from existing stacks
- Multi-piece deployment sequences
- Deployment with capture and recombination options

**Special Moves**:

- Flying general commander captures
- Air Force kamikaze attacks
- Stay capture moves (Air Force only)

#### Move Validation Examples

**Example 1: Basic Move Validation**

```
Position: Red Tank at d4, Blue Infantry at e5
Attempted Move: Td4-e5 (Tank captures Infantry)

Validation Process:
✓ Stage 1: Tank can move 2 squares orthogonally (d4 to e5 = 1 square)
✓ Stage 2: Both squares are in Land zones (Tank terrain compatible)
✓ Stage 3: Move doesn't expose Red commander
✓ Stage 4: Not a deployment session
Result: LEGAL MOVE - Tank captures Infantry
```

**Example 2: Terrain Restriction Violation**

```
Position: Red Navy at c3, attempting to move to d4
Attempted Move: Nc3-d4 (Navy to Land zone)

Validation Process:
✓ Stage 1: Navy can move 4 squares in any direction (c3 to d4 = 1 square)
✗ Stage 2: d4 is pure Land zone, Navy restricted to Navy zones
Result: ILLEGAL MOVE - Terrain restriction violation
```

**Example 3: Commander Exposure Prevention**

```
Position: Red Commander at g7, Blue Commander at g12, Red Infantry at g9
Attempted Move: Ig9-f9 (Infantry moves away from blocking position)

Validation Process:
✓ Stage 1: Infantry can move 1 square orthogonally (g9 to f9 = 1 square)
✓ Stage 2: Both squares are in Land zones (Infantry terrain compatible)
✗ Stage 3: Move creates commander exposure (flying general rule)
Result: ILLEGAL MOVE - Commander exposure violation
```

**Example 4: Air Defense Zone Validation**

```
Position: Red Air Force at a1, Blue Anti-Air at d3
Attempted Move: Fa1-d3 (Air Force attacks Anti-Air)

Validation Process:
✓ Stage 1: Air Force can move 4 squares in any direction (a1 to d3 = 3 squares)
✓ Stage 2: Air Force ignores terrain restrictions
✓ Stage 3: Move doesn't expose Red commander
✓ Air Defense: d3 is within Blue Anti-Air's defense zone (KAMIKAZE result)
Result: LEGAL MOVE - Air Force captures Anti-Air but is destroyed
```

**Example 5: Deployment Session Validation**

```
Position: Red Tank(Infantry) at c3
Attempted Deployment: c3:Tc5,Id3

Validation Process:
✓ Stage 1: Tank can move to c5 (2 squares), Infantry can move to d3 (1 square)
✓ Stage 2: All squares are in Land zones (compatible terrain)
✓ Stage 3: No commander exposure created
✓ Stage 4: Valid deployment session from same stack
Result: LEGAL DEPLOYMENT - Both pieces deploy successfully
```

#### Turn Sequence Error Handling

**Invalid Move Responses**:

- **Clear Error Messages**: Specific explanation of why the move is invalid
- **Suggested Alternatives**: When possible, suggest legal alternatives
- **Turn Preservation**: Invalid moves don't change the active player
- **State Restoration**: Game state remains unchanged after invalid moves

**Session Management Errors**:

- **Incomplete Sessions**: Warn when attempting to end turn with active session
- **Invalid Deployments**: Reject individual deployment moves that violate rules
- **Session Cancellation**: Allow players to cancel and restart deployment
  sessions
- **Commitment Validation**: Final validation before session commitment

**Game State Consistency**:

- **History Integrity**: Maintain accurate move history for analysis and undo
- **Cache Management**: Clear cached data when game state changes
- **Validation Consistency**: Ensure validation rules are applied uniformly
- **Error Recovery**: Graceful handling of unexpected validation failures

#### Performance Considerations

**Move Generation Optimization**:

- **Incremental Generation**: Generate moves on-demand rather than pre-computing
  all possibilities
- **Early Termination**: Stop generation when sufficient moves are found for
  analysis
- **Caching Strategy**: Cache frequently-accessed move generation results
- **Parallel Validation**: Validate multiple candidate moves simultaneously when
  possible

**Validation Efficiency**:

- **Rule Ordering**: Apply fastest validation rules first to eliminate invalid
  moves quickly
- **Lazy Evaluation**: Defer expensive validation checks until necessary
- **Batch Processing**: Group similar validation operations for efficiency
- **Memory Management**: Minimize memory allocation during validation processes

The turn sequence and validation system ensures that Cotulenh maintains its
complex tactical depth while providing a smooth, error-free gameplay experience
that properly enforces all rules and maintains game state integrity.

### Win and Draw Conditions

Cotulenh games conclude through various victory and draw conditions that reflect
both traditional chess endings and unique mechanics specific to this
military-themed variant. The game's win conditions emphasize commander capture
and tactical superiority, while draw conditions ensure fair resolution of
balanced positions.

#### Win Conditions

**Checkmate**:

- The **primary win condition** where a player's commander is under attack and
  has no legal moves to escape
- The commander must be **in check** (under attack by enemy pieces)
- **No legal moves** exist that would remove the commander from check
- All potential escape squares are either **occupied by friendly pieces** or
  **controlled by enemy pieces**
- **Blocking moves** are either impossible or insufficient to stop the attack
- **Capturing the attacking piece** is either impossible or would leave the
  commander still in check

**Commander Capture**:

- **Direct capture** of the enemy commander through normal piece movement
- **Flying general capture** where commanders face each other orthogonally with
  no intervening pieces
- **Deployment capture** where a deployed piece captures the enemy commander
- **Air Force kamikaze** attack that destroys the enemy commander (mutual
  destruction)
- Commander capture **immediately ends the game** regardless of other pieces on
  the board

**Resignation**:

- A player may **voluntarily resign** at any time during their turn
- Resignation **immediately ends the game** with the resigning player losing
- Common in positions where checkmate is inevitable or material disadvantage is
  overwhelming
- **No take-back** allowed once resignation is declared

#### Draw Conditions

**Fifty-Move Rule**:

- The game is declared a draw if **50 consecutive moves** pass without a capture
  or irreversible action
- **Irreversible actions** include piece captures, heroic promotions, and piece
  combinations
- The **halfmove clock** tracks moves since the last irreversible action
- Either player may **claim a draw** when the fifty-move threshold is reached
- **Automatic draw** occurs at 75 moves without irreversible action (if not
  claimed earlier)

**Threefold Repetition**:

- The game is drawn if the **same position occurs three times** with the same
  player to move
- Position comparison includes **piece placement**, **active player**, and
  **available moves**
- **Heroic status** and **stack composition** must be identical for positions to
  match
- **Deploy session state** must be the same (no active sessions in any
  occurrence)
- Either player may **claim the draw** when the third repetition occurs

**Stalemate**:

- The game is drawn when a player has **no legal moves** but their commander is
  **not in check**
- All pieces must be either **blocked from moving** or **unable to move without
  creating illegal positions**
- **Commander exposure** restrictions can contribute to stalemate conditions
- **Deploy sessions** must be considered - if deployment moves are available,
  it's not stalemate

**Insufficient Material**:

- The game is drawn when neither player has sufficient pieces to achieve
  checkmate
- **Automatic draw** when only commanders remain on the board
- **Theoretical draws** with minimal pieces where checkmate is impossible
- Considers **heroic status** which can make previously insufficient material
  sufficient for mate

**Mutual Agreement**:

- Players may **agree to a draw** at any time during the game
- Both players must **explicitly consent** to the draw
- Common in balanced endgame positions or when both players are satisfied with
  the result
- **No take-back** allowed once both players agree

#### Checkmate Scenarios

**Example 1: Basic Checkmate**

```
Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  T  ·  ·  ·  ·  ·  (Red Tank)
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)

Analysis:
- Blue Commander is in check from Red Tank (orthogonal attack)
- Blue Commander cannot move: f11, f12, g11, h11, h12 all controlled by Red Tank
- No Blue pieces can block the attack or capture the Red Tank
- Result: CHECKMATE - Red wins
```

**Example 2: Flying General Checkmate**

```
Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)

Analysis:
- Both commanders on file g with clear path between them
- Blue Commander is in check via flying general rule
- Blue Commander cannot move without remaining on file g (still exposed)
- No Blue pieces can block the g-file or capture Red Commander
- Result: CHECKMATE - Red wins via flying general
```

#### Commander Capture Scenarios

**Example 1: Direct Commander Capture**

```
Initial Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  F  +C  ·  ·  ·  ·  (Red Air Force and Commander)

Move: Ff1xg12 (Air Force captures Blue Commander)
Result: IMMEDIATE WIN - Red wins by commander capture
```

**Example 2: Kamikaze Commander Capture**

```
Initial Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  ·  g  ·  ·  ·  ·  (Blue Anti-Air)
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  F  +C  ·  ·  ·  ·  (Red Air Force and Commander)

Move: Ff1xg12 (Air Force kamikaze attack through air defense)
Result: IMMEDIATE WIN - Red wins by commander capture (Air Force destroyed)
```

#### Draw Condition Examples

**Example 1: Stalemate**

```
Position:
12  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)
 1  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander - Blue to move)

Analysis:
- Blue Commander is not in check
- Blue Commander cannot move: all adjacent squares controlled by Red Commander
- No other Blue pieces on the board
- Result: STALEMATE - Draw
```

**Example 2: Insufficient Material**

```
Position:
12  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)
 1  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)

Analysis:
- Only commanders remain on the board
- Neither side has sufficient material to achieve checkmate
- Result: AUTOMATIC DRAW - Insufficient material
```

#### Endgame Scenarios

**Commander vs Commander + Single Piece**:

- Generally **winning for the side with the extra piece**
- **Heroic commanders** can sometimes hold draws due to enhanced mobility
- **Terrain restrictions** can affect the outcome (Navy pieces in wrong zones)
- **Air defense pieces** can create drawing chances against Air Force

**Multiple Piece Endgames**:

- **Piece combinations** become crucial for creating winning chances
- **Deployment tactics** allow for complex mating patterns
- **Heroic promotions** can dramatically change evaluation
- **Commander exposure** creates tactical opportunities

**Theoretical Endgames**:

- **Commander + Air Force vs Commander**: Usually winning
- **Commander + Tank vs Commander**: Usually winning
- **Commander + Navy vs Commander**: Depends on terrain control
- **Commander + Headquarters vs Commander**: Usually drawn (unless Headquarters
  becomes heroic)

#### Game Termination Procedures

**Immediate Termination**:

- **Commander capture** ends the game instantly
- **Resignation** takes effect immediately
- **Mutual agreement** to draw is binding

**Claim-Based Termination**:

- **Fifty-move rule** requires a claim by either player
- **Threefold repetition** requires recognition and claim
- **Stalemate** is automatically detected and declared

**Verification Process**:

- **Position verification** for repetition claims
- **Move counting** for fifty-move rule claims
- **Legal move verification** for stalemate detection
- **Material assessment** for insufficient material draws

**Game Conclusion Examples**:

**Example 1: Flying General Checkmate**

```
Final Position (Blue to move):
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  T  ·  A  ·  ·  ·  (Red Tank and Artillery)
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)

Analysis:
- Blue Commander in check from Tank (orthogonal attack)
- Blue Commander in check from Artillery (diagonal attack)
- Blue Commander under flying general threat from Red Commander
- All escape squares (f11, f12, g11, h11, h12) under attack
- Cannot block multiple attackers simultaneously
- Cannot capture multiple attackers in one move
Result: CHECKMATE - Blue loses
```

**Example 2: Fifty-Move Rule Draw**

```
Position after 49 moves without capture:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·

Game State: Halfmove clock = 49
Next Move Options:
- Any non-capture move → Halfmove clock = 50 → Draw can be claimed
- Any capture move → Halfmove clock resets to 0 → Game continues
- Heroic promotion → Halfmove clock resets to 0 → Game continues

Result: Either player can claim draw after 50th move without capture
```

**Example 3: Threefold Repetition Draw**

```
Repetitive Position Sequence:
Move 15: Red Commander g1-g2, Blue Commander g12-g11
Move 16: Red Commander g2-g1, Blue Commander g11-g12
Move 17: Red Commander g1-g2, Blue Commander g12-g11
Move 18: Red Commander g2-g1, Blue Commander g11-g12
Move 19: Red Commander g1-g2, Blue Commander g12-g11

Position Analysis:
- Same board position occurred after moves 15, 17, 19
- Same player (Red) to move in all three instances
- No pieces captured or promoted between repetitions
- Threefold repetition achieved

Result: Either player can claim draw by threefold repetition
```

**Example 4: Stalemate Draw**

```
Stalemate Position (Blue to move):
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  T  ·  T  ·  ·  ·  (Red Tanks controlling escape)
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)

Stalemate Analysis:
- Blue Commander not in check (no direct attack)
- All legal moves for Blue Commander lead to check:
  - f12: Attacked by Tank at f11
  - f11: Occupied by Red Tank
  - g11: Attacked by Tank at h11
  - h12: Attacked by Tank at h11
  - h11: Occupied by Red Tank
- Blue has no other pieces to move
- Blue cannot make any legal move without entering check

Result: STALEMATE - Game is drawn
```

The comprehensive win and draw conditions in Cotulenh ensure that games reach
satisfying conclusions while maintaining the strategic depth and tactical
complexity that define this sophisticated military chess variant.

### Check and Checkmate Detection

The check and checkmate detection system in Cotulenh is a sophisticated
mechanism that identifies when commanders are under attack and determines
whether escape is possible. This system must account for the game's unique
mechanics including flying general rules, piece combinations, deployment
sequences, and complex terrain restrictions.

#### Commander Attack Detection

**Basic Check Detection**:

- A commander is **in check** when it is under attack by one or more enemy
  pieces
- Attack detection considers **all enemy pieces** and their current attack
  ranges
- **Heroic status** affects attack ranges and must be considered in detection
- **Piece combinations** in stacks can attack through the carrier piece's
  abilities

**Flying General Detection**:

- **Orthogonal alignment** check between commanders on the same file or rank
- **Path clearance** verification to ensure no pieces block the line between
  commanders
- **Distance calculation** to confirm commanders can "see" each other
- **Immediate capture** threat when flying general conditions are met

**Attack Range Calculation**:

- Each piece type has **specific attack patterns** that must be evaluated
- **Terrain restrictions** limit which pieces can attack from which squares
- **Air defense zones** affect Air Force attack capabilities
- **Piece blocking** rules determine which attacks can pass through other pieces

#### Check Escape Requirements

When a commander is in check, the player must make a move that removes the check
condition. The system validates three categories of escape moves:

**Commander Movement**:

- **Direct escape** by moving the commander to a safe square
- **Escape square validation** ensures the destination is not under enemy attack
- **Terrain compatibility** check for commander movement restrictions
- **Commander exposure** prevention to avoid flying general situations

**Blocking Moves**:

- **Interposition** of friendly pieces between the attacker and commander
- **Path blocking** validation to ensure the block actually stops the attack
- **Multiple attacker** scenarios where blocking may be insufficient
- **Flying general blocks** which require pieces on the orthogonal line between
  commanders

**Attacker Capture**:

- **Direct capture** of the piece giving check
- **Capture validation** to ensure the capturing piece can legally reach the
  attacker
- **Multiple check** scenarios where capturing one attacker may not resolve all
  threats
- **Counter-attack** prevention to ensure capture doesn't create new check
  conditions

#### Check and Checkmate Examples

**Example 1: Simple Check and Escape**

```
Initial Position (Red to move):
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  T  ·  ·  ·  ·  ·  (Red Tank)
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)

Move: Tf2-g12+ (Tank moves to give check)

Resulting Position (Blue to move):
12  ·  ·  ·  ·  ·  ·  +c  T  ·  ·  ·  (Blue Commander in check)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
...
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·

Check Detection:
- Blue Commander at g12 is under attack by Red Tank at h12
- Tank has orthogonal attack range covering g12
- Check condition confirmed

Escape Options for Blue:
1. Commander Movement: cg12-f12, cg12-f11, cg12-g11 (if squares are safe)
2. Blocking: Not possible (Tank adjacent to Commander)
3. Capture: Blue must have a piece that can capture the Tank at h12
```

**Example 2: Flying General Check**

```
Position (Blue to move):
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)

Flying General Check Detection:
- Both commanders on file g (g12 and g1)
- Path g2, g3, g4, g5, g6, g7, g8, g9, g10, g11 is completely clear
- Blue Commander is in check via flying general rule

Escape Requirements for Blue:
- Blue Commander must move OFF file g to escape
- Moving to f12, f11, h12, h11 (if safe) would escape the flying general
- Cannot move to g11 (still on file g, still exposed)
- Must verify escape squares are not under attack by other Red pieces
```

**Example 3: Multiple Check (Checkmate)**

```
Position (Blue to move):
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  T  ·  A  ·  ·  ·  (Red Tank and Artillery)
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)

Multiple Check Analysis:
- Blue Commander under attack from Red Tank (orthogonal)
- Blue Commander under attack from Red Artillery (diagonal)
- Blue Commander under flying general attack from Red Commander

Checkmate Verification:
1. Commander Movement: All adjacent squares (f11, f12, g11, h11, h12) under attack
2. Blocking: Cannot block multiple attackers simultaneously
3. Capture: Cannot capture multiple attackers in one move
Result: CHECKMATE - Blue has no legal moves to escape check
```

**Example 4: Check Escape via Deployment**

```
Position (Blue to move, in check):
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander in check)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  T  ·  ·  ·  ·  ·  (Red Tank giving check)
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)
11  ·  ·  ·  (TI) ·  ·  ·  ·  ·  ·  ·  (Blue Tank carrying Infantry)

Check Escape via Deployment:
- Blue Commander in check from Red Tank
- Blue can deploy Infantry from stack to block: d11:Id9 (Infantry blocks on g-file)
- Deployment session allows complex escape sequences
- Final validation ensures check is resolved after deployment commitment
```

#### Advanced Check Detection Scenarios

**Check Through Piece Combinations**:

- **Stack attacks** where carried pieces can attack through the carrier
- **Deployment attacks** where pieces deploy into checking positions
- **Recombination attacks** where pieces combine and create new attack lines
- **Carrier hierarchy** effects on attack capabilities

**Air Defense and Check**:

- **Air Force checks** through enemy air defense zones (kamikaze attacks)
- **Air defense interference** with check escape routes
- **Stay capture checks** where Air Force attacks without moving
- **Suicide attack checks** that result in mutual piece destruction

**Terrain-Based Check Complications**:

- **Navy zone restrictions** limiting escape options for land-based commanders
- **Bridge square requirements** for heavy piece movements during check escape
- **Mixed zone advantages** for pieces that can access multiple terrain types
- **Terrain isolation** where commanders are trapped by terrain restrictions

#### Checkmate Detection Algorithm

**Comprehensive Escape Analysis**:

1. **Generate All Legal Moves**: Create complete list of all possible moves for
   the player in check
2. **Simulate Each Move**: Apply each candidate move to a temporary board state
3. **Re-evaluate Check Status**: Determine if the commander is still in check
   after each move
4. **Validate Move Legality**: Ensure each move complies with all game rules
5. **Count Valid Escapes**: If no moves result in a safe commander position,
   declare checkmate

**Special Considerations**:

- **Deployment sequences** must be evaluated as complete units
- **Flying general** positions require careful orthogonal line analysis
- **Multiple attackers** scenarios need comprehensive blocking analysis
- **Piece combination** effects on both attack and defense capabilities

**Performance Optimization**:

- **Early termination** when any valid escape move is found
- **Move prioritization** to check most likely escape moves first
- **Incremental evaluation** to avoid redundant position analysis
- **Caching mechanisms** for frequently encountered check patterns

#### Check Notification and Game Flow

**Check Announcement**:

- **Automatic detection** when a move results in check
- **Clear notification** to the player whose commander is under attack
- **Attack source identification** showing which piece(s) are giving check
- **Escape option hints** when available to assist player decision-making

**Move Restriction During Check**:

- **Mandatory escape** - player must make a move that resolves the check
- **Invalid move rejection** for moves that don't address the check condition
- **Turn preservation** - invalid escape attempts don't change the active player
- **Session handling** - deployment sessions must resolve check before
  commitment

**Game State Management**:

- **History tracking** of check conditions for analysis and review
- **Undo restrictions** during check situations to maintain game integrity
- **Cache invalidation** when check status changes
- **Position evaluation** updates to reflect check conditions

The check and checkmate detection system ensures that Cotulenh maintains its
strategic depth while providing clear, unambiguous determination of when
commanders are threatened and whether escape is possible, accounting for all the
unique mechanics that make this military chess variant both challenging and
engaging.

## Technical Reference

### Data Structures and Implementation

#### Board Representation

Cotulenh uses a **0x88 board representation** to efficiently handle the 11×12
playing area within a 16×16 grid structure. This approach provides fast boundary
checking and move validation while maintaining memory efficiency.

**0x88 System Overview**:

- **Grid Size**: 16×16 array (256 elements) containing the 11×12 playing area
- **Square Mapping**: Each square maps to a unique index using hexadecimal
  notation
- **Boundary Detection**: Fast validation using bitwise operations
  (`square & 0x88`)
- **Memory Layout**: Optimized for cache performance and move generation

**Square Index Mapping**:

```typescript
// Examples of 0x88 coordinate mapping
a12 → 0x00 (index 0)    // Top-left corner
k12 → 0x0A (index 10)   // Top-right corner
a1  → 0xB0 (index 176)  // Bottom-left corner
k1  → 0xBA (index 186)  // Bottom-right corner

// Conversion functions
function rank(square: number): number {
  return square >> 4
}

function file(square: number): number {
  return square & 0xf
}

function isSquareOnBoard(sq: number): boolean {
  const r = rank(sq), f = file(sq)
  return r >= 0 && r < 12 && f >= 0 && f < 11
}
```

**Terrain Masks**:

```typescript
// Terrain validation using bitmasks
const NAVY_MASK = new Uint8Array(256) // 1 = navigable by navy
const LAND_MASK = new Uint8Array(256) // 1 = accessible by land pieces

// Terrain checking functions
function canNavyMove(square: number): boolean {
  return !!NAVY_MASK[square]
}

function canLandMove(square: number): boolean {
  return !!LAND_MASK[square]
}
```

#### Piece Data Structure

**Core Piece Interface**:

```typescript
interface Piece {
  color: Color // 'r' (RED) or 'b' (BLUE)
  type: PieceSymbol // 'c', 'i', 't', 'm', 'e', 'a', 'g', 's', 'f', 'n', 'h'
  carrying?: Piece[] // Array of carried pieces (for stacks)
  heroic?: boolean // Enhanced status flag
}

// Color and piece type definitions
type Color = 'r' | 'b'
type PieceSymbol =
  | 'c'
  | 'i'
  | 't'
  | 'm'
  | 'e'
  | 'a'
  | 'g'
  | 's'
  | 'f'
  | 'n'
  | 'h'
```

**Piece Combination System**:

```typescript
// Role-based hierarchy for determining stack carriers
const ROLE_FLAGS = {
  NAVY: 512, // Highest priority carrier
  HEADQUARTER: 1024,
  ENGINEER: 256,
  AIR_FORCE: 128,
  TANK: 64,
  MISSILE: 32,
  ANTI_AIR: 16,
  ARTILLERY: 8,
  MILITIA: 4,
  INFANTRY: 2,
  COMMANDER: 1, // Lowest priority carrier
}
```

#### Move Data Structure

**Internal Move Representation**:

```typescript
interface InternalMove {
  color: Color
  from: number // Source square (0x88 format)
  to: number // Target square (0x88 format)
  piece: Piece // Moving piece
  captured?: Piece // Captured piece (if any)
  combined?: Piece // Combined piece (for combination moves)
  flags: number // Move type bitmask
  san?: string // Standard Algebraic Notation
  lan?: string // Long Algebraic Notation
}
```

**Move Flags and Bit Operations**:

```typescript
// Move type flags
const FLAGS = {
  NORMAL: 'n',
  CAPTURE: 'c',
  STAY_CAPTURE: 's', // Capture without moving to target square
  SUICIDE_CAPTURE: 'k', // Kamikaze attack (mutual destruction)
  DEPLOY: 'd', // Deploy move from stack
  COMBINATION: 'b', // Piece combination move
}

// Corresponding bit values
const BITS = {
  NORMAL: 1,
  CAPTURE: 2,
  STAY_CAPTURE: 4,
  SUICIDE_CAPTURE: 8,
  DEPLOY: 16,
  COMBINATION: 32,
}

// Capture detection mask
const CAPTURE_MASK = BITS.CAPTURE | BITS.STAY_CAPTURE | BITS.SUICIDE_CAPTURE
```

#### Game State Management

**Core Game State**:

```typescript
class CoTuLenh {
  private _board = new Array<Piece | undefined>(256)
  private _turn: Color = 'r'
  private _commanders: Record<Color, number> = { r: -1, b: -1 }
  private _halfMoves = 0
  private _moveNumber = 1
  private _history: History[] = []
  private _session: MoveSession | null = null
  private _airDefense: AirDefense = { r: new Map(), b: new Map() }
}
```

**Air Defense System**:

```typescript
// Air defense configuration
const BASE_AIRDEFENSE_CONFIG = {
  MISSILE: 2, // Range 2 air defense
  NAVY: 1, // Range 1 air defense
  ANTI_AIR: 1, // Range 1 air defense
}

// Air defense influence tracking
type AirDefense = {
  [RED]: Map<number, number[]> // square → defending pieces
  [BLUE]: Map<number, number[]>
}
```

#### FEN Parsing Specifications

**FEN Format for Cotulenh**:

```
<piece-placement> <active-color> <castling> <en-passant> <halfmove> <fullmove> [<deploy-session>]
```

**Piece Placement Encoding**:

- **Ranks**: 12 ranks separated by `/` (from rank 12 to rank 1)
- **Empty squares**: Numbers indicate consecutive empty squares
- **Pieces**: Uppercase = Red, Lowercase = Blue
- **Heroic status**: `+` prefix (e.g., `+C` for heroic Red Commander)
- **Stacks**: Parentheses notation `(TI)` for Tank carrying Infantry

**Stack Notation Examples**:

```
(TI)     → Tank carrying Infantry
(+TI)    → Heroic Tank carrying Infantry
(T+I)    → Tank carrying Heroic Infantry
(+T+I)   → Heroic Tank carrying Heroic Infantry
```

**Extended FEN for Deploy Sessions**:

```
<base-fen> <deploy-notation>[...]
```

- **Deploy notation**: `square:moves` format (e.g., `c4:T>d4,I>e4`)
- **Incomplete sessions**: `...` suffix indicates session in progress

### Algorithms and Validation

#### Move Generation Algorithms

**Unified Move Generation**:

```typescript
function generateMoves(
  gameInstance: CoTuLenh,
  filterSquare?: Square | number,
  filterPiece?: PieceSymbol,
): InternalMove[] {
  const session = gameInstance.getSession()

  if (session) {
    // Deploy mode - generate from session stack
    return generateDeployMoves(
      gameInstance,
      session.stackSquare,
      filterPiece,
      session,
    )
  } else {
    // Normal mode - scan entire board
    return generateNormalMoves(gameInstance, filterPiece, filterSquare)
  }
}
```

**Directional Move Generation**:

```typescript
// Movement direction offsets for 0x88 board
const ORTHOGONAL_OFFSETS = [-16, 1, 16, -1] // N, E, S, W
const DIAGONAL_OFFSETS = [-17, -15, 17, 15] // NE, NW, SE, SW
const ALL_OFFSETS = [...ORTHOGONAL_OFFSETS, ...DIAGONAL_OFFSETS]

function generateMovesInDirection(
  gameInstance: CoTuLenh,
  moves: InternalMove[],
  from: number,
  pieceData: Piece,
  config: PieceMovementConfig,
  offset: number,
  isDeployMove: boolean,
  them: Color,
): void {
  // Iterative ray-casting algorithm
  // Handles piece blocking, terrain restrictions, and special rules
}
```

**Piece Movement Configuration**:

```typescript
interface PieceMovementConfig {
  moveRange: number
  captureRange: number
  canMoveDiagonal: boolean
  captureIgnoresPieceBlocking: boolean
  moveIgnoresBlocking: boolean
  specialRules?: {
    commanderAdjacentCaptureOnly?: boolean
    navyAttackMechanisms?: boolean
    missileSpecialRange?: boolean
    tankShootOverBlocking?: boolean
  }
}
```

#### Air Defense Calculation Methods

**Air Defense Zone Calculation**:

```typescript
function calculateAirDefenseForSquare(curSq: number, level: number): number[] {
  const allInfluenceSq: number[] = []
  if (level === 0) return allInfluenceSq

  // Circular area calculation
  for (let i = -level; i <= level; i++) {
    for (let j = -level; j <= level; j++) {
      const targetSq = curSq + i + j * 16
      if (!isSquareOnBoard(targetSq)) continue

      // Circular distance check
      if (i * i + j * j <= level * level) {
        allInfluenceSq.push(targetSq)
      }
    }
  }
  return allInfluenceSq
}
```

**Air Force Movement Validation**:

```typescript
// Air defense results for Air Force movement
const AirDefenseResult = {
  SAFE_PASS: 0, // Can safely pass through
  KAMIKAZE: 1, // Can pass but will be destroyed (suicide move)
  DESTROYED: 2, // Cannot pass, movement stops
} as const

function getCheckAirDefenseZone(
  gameInstance: CoTuLenh,
  fromSquare: number,
  defenseColor: Color,
  offset: number,
): () => number {
  // Returns closure that tracks air defense encounters
  // Implements complex zone transition logic
}
```

#### Session Management

**Move Session Architecture**:

```typescript
class MoveSession {
  public readonly stackSquare: number
  public readonly turn: Color
  public readonly originalPiece: Piece
  public readonly isDeploy: boolean

  private readonly _commands: CTLMoveCommandInteface[] = []

  // Session lifecycle methods
  addMove(move: InternalMove): void
  cancel(): void
  commit(): { command: Command; result: MoveResult; hasCapture: boolean }
  canCommit(): boolean
}
```

**Command Pattern Implementation**:

```typescript
interface CTLMoveCommandInteface {
  move: InternalMove
  execute(): void
  undo(): void
  addPostAction(action: StateUpdateAction): void
}

// Atomic move execution with rollback capability
class MoveCommand implements CTLMoveCommandInteface {
  // Implements reversible board operations
}
```

#### State Validation Procedures

**Legal Move Filtering**:

```typescript
private _filterLegalMoves(moves: InternalMove[], us: Color): InternalMove[] {
  const legalMoves: InternalMove[] = []

  for (const move of moves) {
    // Temporary execution for validation
    const command = this._executeTemporarily(move)

    // Check commander safety after move
    if (!this.isCommanderInDanger(us)) {
      legalMoves.push(move)
    }

    // Rollback test move
    command.undo()
  }

  return legalMoves
}
```

**Commander Exposure Detection**:

```typescript
private _isCommanderExposed(color: Color): boolean {
  const usCommanderSq = this._commanders[color]
  const themCommanderSq = this._commanders[swapColor(color)]

  if (usCommanderSq === -1 || themCommanderSq === -1) return false

  // Check orthogonal lines between commanders
  for (const offset of ORTHOGONAL_OFFSETS) {
    let sq = usCommanderSq + offset
    while (isSquareOnBoard(sq)) {
      const piece = this._board[sq]
      if (piece) {
        return sq === themCommanderSq  // Direct line of sight
      }
      sq += offset
    }
  }

  return false
}
```

**Attack Detection Algorithm**:

```typescript
getAttackers(
  square: number,
  attackerColor: Color,
  assumeTargetType?: PieceSymbol
): { square: number; type: PieceSymbol }[] {
  const attackers: { square: number; type: PieceSymbol }[] = []

  // Ray-casting from target square in all directions
  for (const offset of ALL_OFFSETS) {
    let currentSquare = square
    let distance = 0

    while (distance < 5) {  // Maximum piece range
      currentSquare += offset
      distance++

      if (!isSquareOnBoard(currentSquare)) break

      const piece = this._board[currentSquare]
      if (piece && piece.color === attackerColor) {
        // Validate attack capability based on piece configuration
        const config = getPieceMovementConfig(piece.type, piece.heroic ?? false)
        if (this._canAttack(piece, distance, offset, config)) {
          attackers.push({ square: currentSquare, type: piece.type })
        }
      }
    }
  }

  return attackers
}
```

**Performance Optimizations**:

- **Move Cache**: LRU cache for generated moves
  (`QuickLRU<string, InternalMove[]>`)
- **Incremental Updates**: Air defense recalculation only when pieces move
- **Lazy Evaluation**: Commander exposure checks only when necessary
- **Bitwise Operations**: Fast flag checking and terrain validation

#### Command Pattern Architecture

**Atomic Move Operations**:

```typescript
interface CTLAtomicMoveAction {
  execute(): void
  undo(): void
}

// Core atomic actions
class RemovePieceAction implements CTLAtomicMoveAction
class PlacePieceAction implements CTLAtomicMoveAction
class RemoveFromStackAction implements CTLAtomicMoveAction
class StateUpdateAction implements CTLAtomicMoveAction
```

**Command Hierarchy**:

```typescript
abstract class CTLMoveCommand implements CTLMoveCommandInteface {
  protected actions: CTLAtomicMoveAction[] = []

  execute(): void {
    for (const action of this.actions) {
      action.execute()
    }
  }

  undo(): void {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      this.actions[i].undo()
    }
  }
}

// Concrete implementations
class NormalMoveCommand extends CTLMoveCommand
class CaptureMoveCommand extends CTLMoveCommand
class StayCaptureMoveCommand extends CTLMoveCommand
class SuicideCaptureMoveCommand extends CTLMoveCommand
class CombinationMoveCommand extends CTLMoveCommand
```

**Command Factory**:

```typescript
function createMoveCommand(game: CoTuLenh, move: InternalMove): CTLMoveCommand {
  if (move.flags & BITS.SUICIDE_CAPTURE) {
    return new SuicideCaptureMoveCommand(game, move)
  } else if (move.flags & BITS.STAY_CAPTURE) {
    return new StayCaptureMoveCommand(game, move)
  } else if (move.flags & BITS.COMBINATION) {
    return new CombinationMoveCommand(game, move)
  } else if (move.flags & BITS.CAPTURE) {
    return new CaptureMoveCommand(game, move)
  } else {
    return new NormalMoveCommand(game, move)
  }
}
```

#### Heroic Promotion System

**Automatic Promotion Logic**:

```typescript
function checkAndPromoteAttackers(
  game: CoTuLenh,
  move: InternalMove,
): CTLAtomicMoveAction[] {
  const actions: CTLAtomicMoveAction[] = []
  const us = move.color
  const them = swapColor(us)
  const themCommanderSq = game.getCommanderSquare(them)

  if (themCommanderSq === -1) return actions

  // Find all pieces attacking the enemy commander
  const attackers = game.getAttackers(themCommanderSq, us)
  if (attackers.length === 0) return actions

  // Promote non-heroic attackers
  for (const { square, type } of attackers) {
    const isHeroic = game.getHeroicStatus(square, type)
    if (!isHeroic) {
      actions.push(new SetHeroicAction(game, square, type, true))
    }
  }

  return actions
}
```

#### Validation Pipeline

**Move Legality Validation**:

```typescript
// Three-tier validation system
1. **Syntax Validation**: Parse move notation and validate format
2. **Rule Validation**: Check piece movement rules and terrain restrictions
3. **Safety Validation**: Ensure move doesn't leave commander in danger

private _filterLegalMoves(moves: InternalMove[], us: Color): InternalMove[] {
  const legalMoves: InternalMove[] = []

  for (const move of moves) {
    try {
      // Temporary execution for safety check
      const command = this._executeTemporarily(move)

      // Validate commander safety after move
      if (!this.isCommanderInDanger(us)) {
        legalMoves.push(move)
      }

      // Rollback test move
      command.undo()
      this._movesCache.clear()
    } catch (error) {
      // Invalid move - skip
      continue
    }
  }

  return legalMoves
}
```

**Deploy Session Validation**:

```typescript
class MoveSession {
  canCommit(): boolean {
    const game = this._game
    const us = this.turn

    // DELAYED VALIDATION: Check commander safety after all moves
    // This allows deploy sequences to escape check
    return !game.isCommanderInDanger(us)
  }

  commit(): { command: Command; result: MoveResult; hasCapture: boolean } {
    if (!this.canCommit()) {
      throw new Error(
        'Move sequence does not escape check. Commander still in danger.',
      )
    }

    // Generate atomic command for entire sequence
    const { command, result } = this._generateCommitData(true)

    // Attach state update action
    const stateAction = new StateUpdateAction(game, firstMove, result.after)
    stateAction.execute()
    command.addPostAction(stateAction)

    return { command, result, hasCapture: this.hasCapture() }
  }
}
```

#### FEN Processing Algorithms

**FEN Parsing State Machine**:

```typescript
load(fen: string, options = {}): void {
  const tokens = fen.split(/\s+/)
  const position = tokens[0]

  // Parse board position rank by rank
  const ranks = position.split('/')
  if (ranks.length !== 12) {
    throw new Error(`Invalid FEN: expected 12 ranks, got ${ranks.length}`)
  }

  let parsingStack = false
  let nextHeroic = false

  for (let r = 0; r < 12; r++) {
    let col = 0
    for (let i = 0; i < ranks[r].length; i++) {
      const char = ranks[r].charAt(i)

      if (isDigit(char)) {
        col += parseInt(char)
      } else if (char === '+') {
        nextHeroic = true
      } else if (char === '(') {
        parsingStack = true
      } else if (char === ')') {
        parsingStack = false
        col++
      } else {
        // Process piece character
        const piece = this._parsePieceFromChar(char, nextHeroic)
        this.put(piece, algebraic(r * 16 + col), parsingStack)
        if (!parsingStack) col++
        nextHeroic = false
      }
    }
  }

  // Parse game state tokens
  this._turn = tokens[1] as Color || 'r'
  this._halfMoves = parseInt(tokens[4], 10) || 0
  this._moveNumber = parseInt(tokens[5], 10) || 1
}
```

**FEN Generation Algorithm**:

```typescript
fen(): string {
  let empty = 0
  let fen = ''

  // Traverse board in rank order (12 down to 1)
  for (let i = SQUARE_MAP.a12; i <= SQUARE_MAP.k1 + 1; i++) {
    if (isSquareOnBoard(i)) {
      const piece = this._board[i]

      if (piece) {
        if (empty > 0) {
          fen += empty
          empty = 0
        }
        fen += this._pieceToFenChar(piece)
      } else {
        empty++
      }
    } else if (file(i) === 11) {
      // End of rank
      if (empty > 0) {
        fen += empty
        empty = 0
      }
      if (i !== SQUARE_MAP.k1 + 1) {
        fen += '/'
      }
    }
  }

  // Append game state
  return [fen, this._turn, '-', '-', this._halfMoves, this._moveNumber].join(' ')
}
```

#### Cache Management

**Move Generation Cache**:

```typescript
private _getMovesCacheKey(args: {
  legal?: boolean
  pieceType?: PieceSymbol
  square?: Square
  deploy?: boolean
}): string {
  const fen = this.fen()

  let deployState = 'none'
  if (args.deploy) {
    deployState = `${args.square}:${this.turn()}`
  } else if (this._session) {
    deployState = `session:${this._session.moves.length}`
  }

  const { legal = true, pieceType, square } = args
  return `${fen}|deploy:${deployState}|legal:${legal}|pieceType:${pieceType ?? ''}|square:${square ?? ''}`
}

private _moves(options = {}): InternalMove[] {
  const cacheKey = this._getMovesCacheKey(options)
  if (this._movesCache.has(cacheKey)) {
    return this._movesCache.get(cacheKey)!
  }

  const moves = generateMoves(this, options.filterSquare, options.filterPiece)
  const result = options.legal ? this._filterLegalMoves(moves, this.turn()) : moves

  this._movesCache.set(cacheKey, result)
  return result
}
```

**Cache Invalidation Strategy**:

- **Board Changes**: Clear cache on any piece placement/removal
- **State Changes**: Clear cache on turn/status updates
- **Session Changes**: Clear cache on deploy session modifications
- **LRU Eviction**: Automatic cleanup of old entries (maxSize: 1000)

## Examples and Cross-References

This section provides comprehensive examples demonstrating Cotulenh mechanics in
action, along with cross-references linking related concepts throughout the
documentation.

### Complete Game Example: Opening to Midgame

**Starting Position Analysis**

```
Initial Setup (Standard Opening):
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·
11  ·n  ·  ·f ·h  ·h ·f  ·  ·n  ·  ·
10  ·  ·  ·a  ·  ·s  ·  ·a  ·  ·  ·
 9  ·  ·n  ·g ·t  ·t ·g  ·n  ·  ·  ·
 8  ·  ·i ·e  ·  ·m  ·  ·e ·i  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
    ─────────────────────────────────────────────
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·I ·E  ·  ·M  ·  ·E ·I  ·  ·
 3  ·  ·N  ·G ·T  ·T ·G  ·N  ·  ·  ·
 2  ·  ·  ·A  ·  ·S  ·  ·A  ·  ·  ·
 1  ·N  ·  ·F ·H  ·H ·F  ·  ·N  ·  ·
    a   b   c   d   e   f   g   h   i   j   k

FEN: 6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1
```

**Move 1: Red Opens with Infantry Advance**

```
1. Ic4-c5

Position after 1. Ic4-c5:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·
11  ·n  ·  ·f ·h  ·h ·f  ·  ·n  ·  ·
10  ·  ·  ·a  ·  ·s  ·  ·a  ·  ·  ·
 9  ·  ·n  ·g ·t  ·t ·g  ·n  ·  ·  ·
 8  ·  ·i ·e  ·  ·m  ·  ·e ·i  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·I  ·  ·  ·  ·  ·  ·  ·  ·  ·  ← Red Infantry advances
 4  ·  ·  ·E  ·  ·M  ·  ·E ·I  ·  ·
 3  ·  ·N  ·G ·T  ·T ·G  ·N  ·  ·  ·
 2  ·  ·  ·A  ·  ·S  ·  ·A  ·  ·  ·
 1  ·N  ·  ·F ·H  ·H ·F  ·  ·N  ·  ·

Analysis: Red advances Infantry to control central territory and prepare for piece combinations.
```

**Move 2: Blue Responds with Tank Combination**

```
1... Tt9&g9 (Tank combines with Anti-Air)

Position after 1... Tt9&g9:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·
11  ·n  ·  ·f ·h  ·h ·f  ·  ·n  ·  ·
10  ·  ·  ·a  ·  ·s  ·  ·a  ·  ·  ·
 9  ·  ·n  ·  ·  ·  (tg) ·n  ·  ·  ·  ← Tank-Anti-Air stack
 8  ·  ·i ·e  ·  ·m  ·  ·e ·i  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·I  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·E  ·  ·M  ·  ·E ·I  ·  ·
 3  ·  ·N  ·G ·T  ·T ·G  ·N  ·  ·  ·
 2  ·  ·  ·A  ·  ·S  ·  ·A  ·  ·  ·
 1  ·N  ·  ·F ·H  ·H ·F  ·  ·N  ·  ·

Analysis: Blue creates a Tank-Anti-Air combination. Tank becomes carrier (higher role flag: 64 vs 16).
The stack gains Tank movement (2 squares) and Anti-Air's air defense capability (1-square radius).
```

**Move 3: Red Deploys Air Force for Reconnaissance**

```
2. Fd1-e5

Position after 2. Fd1-e5:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·
11  ·n  ·  ·f ·h  ·h ·f  ·  ·n  ·  ·
10  ·  ·  ·a  ·  ·s  ·  ·a  ·  ·  ·
 9  ·  ·n  ·  ·  ·  (tg) ·n  ·  ·  ·
 8  ·  ·i ·e  ·  ·m  ·  ·e ·i  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·I  ·F  ·  ·  ·  ·  ·  ·  ·  ← Red Air Force positioned
 4  ·  ·  ·E  ·  ·M  ·  ·E ·I  ·  ·
 3  ·  ·N  ·G ·T  ·T ·G  ·N  ·  ·  ·
 2  ·  ·  ·A  ·  ·S  ·  ·A  ·  ·  ·
 1  ·N  ·  ·  ·H  ·H ·F  ·  ·N  ·  ·

Analysis: Red Air Force moves to e5, providing aerial reconnaissance and threatening Blue's eastern flank.
The Air Force can ignore terrain restrictions and has 4-square movement range.
```

**Move 4: Blue Attempts Air Defense Response**

```
2... (tg)g9-f7 (Tank-Anti-Air stack moves to threaten Red Air Force)

Air Defense Analysis:
- Blue Tank-Anti-Air stack at f7 creates 1-square radius air defense zone
- Red Air Force at e5 is outside the defense zone (2 squares away)
- Blue needs to position closer or use multiple air defense pieces for coverage

Position after 2... (tg)g9-f7:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·
11  ·n  ·  ·f ·h  ·h ·f  ·  ·n  ·  ·
10  ·  ·  ·a  ·  ·s  ·  ·a  ·  ·  ·
 9  ·  ·n  ·  ·  ·  ·  ·n  ·  ·  ·
 8  ·  ·i ·e  ·  ·m  ·  ·e ·i  ·  ·
 7  ·  ·  ·  ·  ·(tg) ·  ·  ·  ·  ·  ← Tank-Anti-Air repositioned
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·I  ·F  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·E  ·  ·M  ·  ·E ·I  ·  ·
 3  ·  ·N  ·G ·T  ·T ·G  ·N  ·  ·  ·
 2  ·  ·  ·A  ·  ·S  ·  ·A  ·  ·  ·
 1  ·N  ·  ·  ·H  ·H ·F  ·  ·N  ·  ·
```

### Edge Case Examples

#### Example 1: Commander Exposure Prevention

```
Critical Position (Red to move):
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·I  ·  ·  ·  ·  ·  (Red Infantry blocking)
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·+C  ·  ·  ·  ·  (Red Commander)
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Illegal Move Attempt: Ig9-f9 (Infantry moves away from g-file)
Validation Result: ILLEGAL - Creates commander exposure
Reason: Moving Infantry off g-file would allow Blue Commander to capture Red Commander via flying general rule

Legal Alternatives:
- Ig9-g8 (Infantry moves along g-file, maintains blocking)
- Ig9-g10 (Infantry advances along g-file)
- +Cg2-f2 (Commander moves to break orthogonal alignment)
```

#### Example 2: Complex Air Defense Scenario

```
Air Defense Network Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·g  ·  ·  ·s  ·  ·  ·  ·  (Blue Anti-Air and Missile)
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  F  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  (Red Air Force)

Air Defense Coverage Analysis:
- Blue Anti-Air at d6: 1-square radius (c5, c6, c7, d5, d6, d7, e5, e6, e7)
- Blue Missile at g6: 2-square radius (e4-i8 area, 13 squares total)
- Overlapping coverage at e6, f6, g6

Red Air Force Movement Options:
1. Fa1-c5: KAMIKAZE (enters Anti-Air zone only)
2. Fa1-e6: DESTROYED (enters overlapping zones)
3. Fa1-f8: SAFE_PASS (avoids all air defense)
4. Fa1-d6: KAMIKAZE (direct attack on Anti-Air)
```

#### Example 3: Heroic Promotion Chain Reaction

```
Pre-Promotion Position:
12  ·  ·  ·  ·  ·  ·  +c  ·  ·  ·  ·  (Blue Commander)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  T  A  ·  ·  ·  ·  (Red Tank and Artillery)
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)

Move: Tf2-f12+ (Tank moves to give check)

Post-Promotion Position:
12  ·  ·  ·  ·  ·  +T  +c  ·  ·  ·  ·  (Tank becomes heroic, Blue Commander in check)
11  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
10  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 9  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 2  ·  ·  ·  ·  ·  ·  +A ·  ·  ·  ·  (Artillery becomes heroic)
 1  ·  ·  ·  ·  ·  ·  +C  ·  ·  ·  ·  (Red Commander)

Heroic Promotion Analysis:
1. Tank moves to f12, directly checking Blue Commander
2. Tank becomes heroic (moved and gave check)
3. Artillery at g2 now has clear diagonal line to Blue Commander
4. Artillery becomes heroic (can attack commander after Tank's move)
5. Red Commander maintains flying general threat on g-file

Result: Two Red pieces become heroic simultaneously, creating overwhelming attack pressure.
```

### Step-by-Step Deployment Example

#### Complex Naval Deployment Sequence

```
Initial Position:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·(NFT) ·  E  ·  ·  ·  ·  ·  ·  (Navy carrying Air Force and Tank, Engineer at e3)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Step 1: Initiate Deployment Session
Player selects Air Force from Navy stack at c3
Available destinations: All squares within 4-square range (Air Force movement)
Player chooses: Air Force to e3 (to combine with Engineer)

Temporary Position after Step 1:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 3  ·  ·(NT) ·  (FE) ·  ·  ·  ·  ·  ·  (Navy-Tank stack, Air Force-Engineer stack)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Session Status: Active - can deploy more pieces or commit

Step 2: Continue Deployment
Player selects Tank from remaining Navy stack at c3
Available destinations: All squares within 2-square range (Tank movement)
Player chooses: Tank to d4

Temporary Position after Step 2:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  T  ·  ·  ·  ·  ·  ·  ·  (Tank deployed)
 3  ·  ·  N  ·  (FE) ·  ·  ·  ·  ·  ·  (Navy alone, Air Force-Engineer stack)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Session Status: Active - Navy remains, can move or stay

Step 3: Final Navy Movement
Player chooses to move Navy to b3 (within Navy zone)

Final Position after Commitment:
 8  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 7  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 6  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 5  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 4  ·  ·  ·  T  ·  ·  ·  ·  ·  ·  ·  (Tank at d4)
 3  ·  N  ·  ·  (FE) ·  ·  ·  ·  ·  ·  (Navy at b3, Air Force-Engineer at e3)
 2  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
 1  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·

Deployment Notation: c3:F&e3,Td4,Nb3
Analysis:
- Air Force combined with Engineer (Air Force becomes carrier: role flag 128 > 256)
- Tank deployed to central position for tactical control
- Navy repositioned to maintain naval zone presence
- Turn ends after session commitment
```

### Cross-Reference Index

#### Core Concepts

- **[Board System](#board-system-and-setup)** → See also:
  [Terrain Zones](#terrain-zones), [0x88 Representation](#board-representation)
- **[Piece Types](#piece-types-and-abilities)** → See also:
  [Heroic Status](#heroic-status-system),
  [Movement Patterns](#piece-system-and-movement)
- **[Terrain Restrictions](#terrain-zones)** → See also:
  [Navy Zones](#navy-zones), [Land Zones](#land-zones),
  [Bridge Squares](#bridge-squares)
- **[Air Defense](#air-defense-system)** → See also:
  [Air Force Movement](#air-force-ff),
  [Zone Calculation](#air-defense-zone-calculation)

#### Movement Mechanics

- **[Normal Moves](#normal-moves)** → See also:
  [Move Validation](#move-validation-process),
  [Legal Move Generation](#legal-move-generation)
- **[Deployment System](#deployment-system)** → See also:
  [Move Sessions](#deploy-sequences-and-sessions),
  [Multi-piece Deployment](#multi-piece-deployment-mechanics)
- **[Piece Combinations](#piece-combination-mechanics)** → See also:
  [Stack Formation](#stack-formation-rules),
  [Carrier Hierarchy](#carrier-hierarchy)
- **[Stay Captures](#stay-captures)** → See also:
  [Air Force Abilities](#air-force-ff),
  [Ranged Attacks](#stay-capture-mechanics)

#### Special Rules

- **[Commander Exposure](#commander-exposure-rules)** → See also:
  [Flying General](#flying-general-rule),
  [Check Detection](#check-and-checkmate-detection)
- **[Heroic Promotion](#heroic-status-system)** → See also:
  [Check Mechanics](#check-and-checkmate-detection),
  [Enhanced Abilities](#enhanced-abilities-for-heroic-pieces)
- **[Air Defense Zones](#air-defense-system)** → See also:
  [Zone Calculation](#air-defense-zone-calculation),
  [Movement Validation](#air-force-movement-through-defense-zones)

#### Game Flow

- **[Turn Management](#turn-sequence-and-validation)** → See also:
  [Move Validation](#move-validation-process),
  [Session Handling](#session-management)
- **[Win Conditions](#win-conditions)** → See also: [Checkmate](#checkmate),
  [Commander Capture](#commander-capture)
- **[Draw Conditions](#draw-conditions)** → See also:
  [Fifty-Move Rule](#fifty-move-rule), [Repetition](#threefold-repetition)

#### Technical Implementation

- **[Data Structures](#data-structures-and-implementation)** → See also:
  [Board Representation](#board-representation),
  [Move Structure](#move-data-structure)
- **[Algorithms](#algorithms-and-validation)** → See also:
  [Move Generation](#move-generation-algorithms),
  [Validation Pipeline](#validation-pipeline)
- **[FEN Notation](#fen-parsing-specifications)** → See also:
  [Position Encoding](#fen-format-for-cotulenh),
  [Stack Notation](#stack-notation-examples)

#### Notation Systems

- **[Standard Algebraic Notation](#standard-algebraic-notation-san)** → See
  also: [Move Symbols](#san-special-move-notation),
  [Disambiguation](#san-disambiguation-rules)
- **[Long Algebraic Notation](#long-algebraic-notation-lan)** → See also:
  [Complete Notation](#basic-lan-format),
  [Deploy Sequences](#lan-deploy-sequence-notation)
- **[Move Flags](#move-flag-symbols-and-meanings)** → See also:
  [Flag Combinations](#flag-combination-examples),
  [Bit Operations](#move-flags-and-bit-operations)

### Quick Reference Tables

#### Piece Movement Summary

| Piece        | Base Move | Base Capture | Heroic Move | Heroic Capture | Special Abilities                                                       |
| ------------ | --------- | ------------ | ----------- | -------------- | ----------------------------------------------------------------------- |
| Commander    | ∞         | 1            | ∞           | 2              | [Flying General](#flying-general-rule)                                  |
| Infantry     | 1         | 1            | 2           | 2              | Basic ground unit                                                       |
| Tank         | 2         | 2            | 3           | 3              | [Shoot over blocking](#tank-tt)                                         |
| Militia      | 1         | 1            | 2           | 2              | Natural diagonal movement                                               |
| Engineer     | 1         | 1            | 2           | 2              | Support unit                                                            |
| Artillery    | 3         | 3            | 4           | 4              | [Ignore blocking](#artillery-aa), Heavy piece                           |
| Anti-Air     | 1         | 1            | 2           | 2              | [Air defense](#air-defense-system) (1→2), Heavy piece                   |
| Missile      | 2         | 2            | 3           | 3              | [Air defense](#air-defense-system) (2→3), Heavy piece                   |
| Air Force    | 4         | 4            | 5           | 5              | [Ignore terrain/blocking](#air-force-ff), [Kamikaze](#suicide-captures) |
| Navy         | 4         | 4            | 5           | 5              | [Naval attacks](#navy-nn), [Air defense](#air-defense-system) (1→2)     |
| Headquarters | 0         | 0            | 1           | 1              | Immobile → Mobile                                                       |

#### Terrain Compatibility Matrix

| Piece Type  | Navy Zones (a-b) | Mixed Zones (c, river) | Land Zones (d-k) | Bridge Required    |
| ----------- | ---------------- | ---------------------- | ---------------- | ------------------ |
| Navy        | ✓                | ✓                      | ✗                | ✗                  |
| Land Units  | ✗                | ✓                      | ✓                | ✗                  |
| Heavy Units | ✗                | ✓                      | ✓                | ✓ (river crossing) |
| Air Force   | ✓                | ✓                      | ✓                | ✗                  |

#### Air Defense Coverage

| Piece Type | Base Range | Heroic Range | Coverage Pattern                          |
| ---------- | ---------- | ------------ | ----------------------------------------- |
| Anti-Air   | 1 square   | 2 squares    | [Circular](#air-defense-zone-calculation) |
| Missile    | 2 squares  | 3 squares    | [Circular](#air-defense-zone-calculation) |
| Navy       | 1 square   | 2 squares    | [Circular](#air-defense-zone-calculation) |

#### Move Type Notation

| Move Type       | SAN Symbol | LAN Symbol | Example            |
| --------------- | ---------- | ---------- | ------------------ |
| Normal Move     | -          | -          | `Te4`, `Td4-e4`    |
| Capture         | x          | x          | `Txe4`, `Td4xe4`   |
| Combination     | &          | &          | `T&e4`, `Td4&e4`   |
| Stay Capture    | \*         | \*         | `F*e4`, `Fa1*e4`   |
| Suicide Capture | \*\*       | \*\*       | `F**e4`, `Fa1**e4` |
| Deploy Session  | :          | :          | `c3:Tc5,Id3`       |
| Check           | +          | +          | `Te4+`             |
| Checkmate       | #          | #          | `Te4#`             |

This comprehensive examples and cross-references section provides concrete
demonstrations of Cotulenh mechanics in action, complete game scenarios, edge
cases, and a thorough cross-reference system linking related concepts throughout
the documentation.

---

_This documentation serves as the comprehensive reference for Cotulenh game
mechanics, covering both player-facing rules and technical implementation
details._
