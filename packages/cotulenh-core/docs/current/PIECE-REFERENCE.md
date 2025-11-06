# CoTuLenh Piece Reference - Complete Guide to All 11 Pieces

## Table of Contents

1. [Overview](#overview)
2. [Piece Classification](#piece-classification)
3. [COMMANDER (C/c)](#commander-cc---the-royal-piece)
4. [INFANTRY (I/i)](#infantry-ii---basic-foot-soldier)
5. [TANK (T/t)](#tank-tt---armored-shooter)
6. [MILITIA (M/m)](#militia-mm---versatile-fighter)
7. [ENGINEER (E/e)](#engineer-ee---support-specialist)
8. [ARTILLERY (A/a)](#artillery-aa---long-range-bombarder)
9. [ANTI_AIR (B/b)](#anti_air-bb---air-defense-specialist)
10. [MISSILE (S/s)](#missile-ss---guided-weapon)
11. [AIR_FORCE (F/f)](#air_force-ff---sky-dominator)
12. [NAVY (N/n)](#navy-nn---naval-commander)
13. [HEADQUARTER (H/h)](#headquarter-hh---transforming-command)
14. [Heroic System](#heroic-system)
15. [Piece Interactions](#piece-interactions)
16. [Strategic Considerations](#strategic-considerations)

---

## Overview

CoTuLenh features 11 unique piece types, each with distinct movement patterns,
special abilities, and strategic roles. This comprehensive reference covers
every aspect of piece behavior, from basic movement to complex interactions.

### Notation Convention

- **Uppercase letters** (C, I, T, M, E, A, B, S, F, N, H) represent **Red
  pieces**
- **Lowercase letters** (c, i, t, m, e, a, b, s, f, n, h) represent **Blue
  pieces**
- **Heroic pieces** are prefixed with `+` (e.g., +C, +t)
- **Stacks** use parentheses notation (e.g., (NI), (TC))

### Movement Notation

```
Movement Pattern Diagrams:
X = Can move/capture to this square
. = Cannot move to this square
P = Piece position
```

---

## Piece Classification

### By Movement Range

#### Short Range (1 square)

- **INFANTRY** (I/i)
- **ENGINEER** (E/e)
- **ANTI_AIR** (B/b)
- **MILITIA** (M/m)
- **HEADQUARTER** (H/h) - when heroic only

#### Medium Range (2 squares)

- **TANK** (T/t)
- **MISSILE** (S/s) - orthogonal only

#### Long Range (3+ squares)

- **ARTILLERY** (A/a) - 3 squares
- **AIR_FORCE** (F/f) - 4 squares
- **NAVY** (N/n) - 4 squares
- **COMMANDER** (C/c) - infinite orthogonal

### By Terrain Access

#### Land Only

- COMMANDER, INFANTRY, TANK, MILITIA, ENGINEER, ARTILLERY, ANTI_AIR, MISSILE,
  HEADQUARTER

#### Water Only

- NAVY

#### Universal Access

- AIR_FORCE (can fly over any terrain)

### By Special Abilities

#### Capture-Ignores-Blocking

- TANK (shoot-over-blocking)
- ARTILLERY, MISSILE, AIR_FORCE, NAVY (capture-ignores-blocking)

#### Air Defense

- ANTI_AIR (level 1 → 2 when heroic)
- MISSILE (level 2 → 3 when heroic)
- NAVY (level 1 → 2 when heroic)

#### Multiple Capture Types

- AIR_FORCE (normal, stay, suicide)
- ARTILLERY, NAVY (normal, stay)

---

## COMMANDER (C/c) - The Royal Piece

### Basic Properties

- **Symbol**: C (red) / c (blue)
- **Movement**: Infinite orthogonal (N, S, E, W)
- **Capture**: 1 square orthogonal only
- **Terrain**: Land pieces only
- **Special**: Flying General rule, Commander vs Commander capture

### Movement Pattern

```
Base Movement (unlimited range):
    |
    |
----C----  (C = COMMANDER, lines show unlimited orthogonal movement)
    |
    |

Capture Pattern (1 square only):
  X
X C X      (C = COMMANDER, X = capture squares)
  X
```

### Special Rules

#### Flying General Rule

- Commanders cannot be on the same orthogonal line with no pieces between them
- Any move that would create this exposure is illegal
- Applies to both friendly and enemy commanders

#### Commander vs Commander Capture

- When a commander sees an enemy commander orthogonally (any distance)
- Can immediately capture regardless of normal 1-square capture limitation
- Ignores blocking pieces between commanders
- Only works orthogonally, not diagonally

### Heroic Enhancement

- **Movement**: Still infinite orthogonal (unchanged)
- **Capture**: Still 1 square orthogonal + gains 1 square diagonal
- **New Ability**: Can move and capture diagonally (1 square)

```
Heroic Capture Pattern:
X X X
X C X      (C = Heroic Commander, X = capture squares)
X X X
```

### Strategic Role

- **Primary Objective**: Must be protected at all costs
- **Endgame Power**: Becomes highly active in simplified positions
- **Positioning**: Central positions maximize mobility
- **Safety**: Must avoid exposure to enemy commander

---

## INFANTRY (I/i) - Basic Foot Soldier

### Basic Properties

- **Symbol**: I (red) / i (blue)
- **Movement**: 1 square orthogonal (N, S, E, W)
- **Capture**: 1 square orthogonal
- **Terrain**: Land pieces only
- **Special**: None (basic unit)

### Movement Pattern

```
Base Pattern:
  X
X I X      (I = INFANTRY, X = movement/capture squares)
  X
```

### Heroic Enhancement

- **Movement**: 2 squares in all 8 directions
- **Capture**: 2 squares in all 8 directions
- **New Ability**: Diagonal movement and capture

```
Heroic Pattern:
X X X X X
X X X X X
X X I X X  (I = Heroic Infantry, X = movement/capture squares)
X X X X X
X X X X X
```

### Strategic Role

- **Basic Unit**: Foundation of army composition
- **Screening**: Protect more valuable pieces
- **Stacking**: Excellent for forming combined stacks
- **Heroic Potential**: Significant improvement when heroic

---

## TANK (T/t) - Armored Shooter

### Basic Properties

- **Symbol**: T (red) / t (blue)
- **Movement**: 2 squares orthogonal
- **Capture**: 2 squares orthogonal
- **Terrain**: Land pieces only
- **Special**: Shoot-over-blocking for captures

### Movement vs Capture Distinction

```
Movement (blocked by pieces):
T . E . X  → TANK cannot move to X (E blocks path)

Capture (ignores blocking):
T . E . X  → TANK can capture X (shoots over E)
```

### Movement Pattern

```
Base Pattern:
    X
    X
X X T X X  (T = TANK, X = movement/capture squares up to 2 squares)
    X
    X
```

### Shoot-Over-Blocking Ability

- **Movement**: Cannot move through pieces (normal blocking rules)
- **Capture**: Can capture targets behind blocking pieces
- **Range**: Up to 2 squares orthogonally
- **Line of Sight**: Must have clear orthogonal line to target

### Heroic Enhancement

- **Movement**: 3 squares in all 8 directions
- **Capture**: 3 squares in all 8 directions
- **Retains**: Shoot-over-blocking ability in all directions

### Strategic Role

- **Fire Support**: Provide ranged support for advancing forces
- **Overwatch**: Position to shoot over friendly pieces
- **Breakthrough**: Use shoot-over ability to attack protected targets
- **Flexibility**: Not subject to heavy piece river crossing restrictions

---

## MILITIA (M/m) - Versatile Fighter

### Basic Properties

- **Symbol**: M (red) / m (blue)
- **Movement**: 1 square in all 8 directions
- **Capture**: 1 square in all 8 directions
- **Terrain**: Land pieces only
- **Special**: Only basic piece with diagonal movement

### Movement Pattern

```
Base Pattern:
X X X
X M X      (M = MILITIA, X = movement/capture squares)
X X X
```

### Unique Characteristics

- **Omnidirectional**: Can move and capture in all 8 directions
- **Flexible**: More movement options than other basic pieces
- **Diagonal Capability**: Only basic piece with inherent diagonal movement

### Heroic Enhancement

- **Movement**: 2 squares in all 8 directions
- **Capture**: 2 squares in all 8 directions
- **Already Diagonal**: Diagonal capability unchanged (already present)

### Strategic Role

- **Corner Control**: Excellent for controlling diagonal approaches
- **Flexible Defense**: Can respond to threats from any direction
- **Central Positioning**: Benefits greatly from central board positions
- **Tactical Flexibility**: More escape routes than orthogonal-only pieces

---

## ENGINEER (E/e) - Support Specialist

### Basic Properties

- **Symbol**: E (red) / e (blue)
- **Movement**: 1 square orthogonal (N, S, E, W)
- **Capture**: 1 square orthogonal
- **Terrain**: Land pieces only
- **Special**: Can carry heavy weapons (Artillery, Anti-Air, Missile)

### Movement Pattern

```
Base Pattern:
  X
X E X      (E = ENGINEER, X = movement/capture squares)
  X
```

### Stack Combination Specialty

- **Unique Role**: Only piece that can carry heavy weapons
- **Valid Combinations**: (E|A), (E|B), (E|S)
- **Strategic Value**: Enables heavy weapon mobility

### Heroic Enhancement

- **Movement**: 2 squares in all 8 directions
- **Capture**: 2 squares in all 8 directions
- **New Ability**: Diagonal movement and capture

### Strategic Role

- **Support Unit**: Enables heavy weapon combinations
- **Mobility**: Provides movement for otherwise static heavy pieces
- **Tactical Combinations**: Key piece for combined arms tactics
- **Heroic Transformation**: Becomes much more capable when heroic

---

## ARTILLERY (A/a) - Long-Range Bombarder

### Basic Properties

- **Symbol**: A (red) / a (blue)
- **Movement**: 3 squares in all 8 directions
- **Capture**: 3 squares in all 8 directions
- **Terrain**: Land pieces only (heavy piece river restrictions)
- **Special**: Capture-ignores-blocking, Stay capture

### Movement Pattern

```
Base Pattern:
X X X X X X X
X X X X X X X
X X X X X X X
X X X A X X X  (A = ARTILLERY, X = movement/capture squares up to 3)
X X X X X X X
X X X X X X X
X X X X X X X
```

### Capture-Ignores-Blocking

```
Movement (blocked):
A . E . X  → ARTILLERY cannot move to X (E blocks)

Capture (ignores blocking):
A . E . X  → ARTILLERY can capture X (shoots over E)
           → Can also stay-capture X without moving
```

### Heavy Piece River Crossing

- **Zone System**: Board divided into zones by river
- **Restricted Crossings**: Cannot cross river except at designated points
- **Bridge Points**: Files f and h allow zone transitions
- **Strategic Impact**: Limits positioning and tactical options

### Stay Capture Ability

- **Mechanism**: Can capture without moving from current position
- **Range**: Same as normal capture range (3 squares)
- **Tactical Use**: Eliminate threats without exposing position

### Heroic Enhancement

- **Movement**: 4 squares in all 8 directions
- **Capture**: 4 squares in all 8 directions
- **Retains**: All special abilities at extended range

### Strategic Role

- **Area Control**: Long-range control of key squares
- **Fire Support**: Support advancing forces from rear positions
- **Stay Capture**: Eliminate threats without repositioning
- **Bridge Control**: Position to control river crossing points

---

## ANTI_AIR (B/b) - Air Defense Specialist

### Basic Properties

- **Symbol**: B (red) / b (blue) - represents Anti-Aircraft
- **Movement**: 1 square orthogonal (N, S, E, W)
- **Capture**: 1 square orthogonal
- **Terrain**: Land pieces only
- **Special**: Air defense level 1 (2 when heroic)

### Movement Pattern

```
Base Pattern:
  X
X B X      (B = ANTI_AIR, X = movement/capture squares)
  X
```

### Air Defense System

- **Level 1 Defense**: Creates 5-square air defense zone
- **Zone Coverage**: Center + 4 orthogonal squares
- **AIR_FORCE Counter**: Restricts enemy air force movement
- **Kamikaze Enablement**: Forces AIR_FORCE into suicide attacks

```
Air Defense Zone (Level 1):
  X
X B X      (B = ANTI_AIR, X = defended squares)
  X
```

### Heroic Enhancement

- **Movement**: 2 squares in all 8 directions
- **Capture**: 2 squares in all 8 directions
- **Air Defense**: Level 2 (13-square circular coverage)
- **New Ability**: Diagonal movement and capture

```
Heroic Air Defense Zone (Level 2):
X X X X X
X X X X X
X X B X X  (B = Heroic Anti-Air, X = defended squares)
X X X X X
X X X X X
```

### Strategic Role

- **Air Superiority**: Counter enemy air force operations
- **Zone Control**: Create protected areas for friendly forces
- **Network Defense**: Work with other air defense pieces
- **Heroic Enhancement**: Significantly expanded coverage when heroic

---

## MISSILE (S/s) - Guided Weapon

### Basic Properties

- **Symbol**: S (red) / s (blue)
- **Movement**: 2 squares orthogonal, 1 square diagonal
- **Capture**: 2 squares orthogonal, 1 square diagonal
- **Terrain**: Land pieces only (heavy piece river restrictions)
- **Special**: Capture-ignores-blocking, Air defense level 2, Asymmetric range

### Unique Movement Pattern

```
Asymmetric Pattern:
  X     X
X   X X   X
  X S X     (S = MISSILE, X = movement/capture squares)
X   X X   X
  X     X
```

### Asymmetric Range System

- **Orthogonal**: Up to 2 squares (N, S, E, W)
- **Diagonal**: Exactly 1 square (NE, NW, SE, SW)
- **Implementation**: Special code logic limits diagonal range

### Air Defense System

- **Level 2 Defense**: Highest base air defense level
- **Zone Coverage**: 13-square circular pattern
- **AIR_FORCE Counter**: Primary counter to air units
- **Kamikaze Enablement**: Forces AIR_FORCE into suicide attacks

```
Air Defense Zone (Level 2):
X X X X X
X X X X X
X X S X X  (S = MISSILE, X = defended squares)
X X X X X
X X X X X
```

### Heroic Enhancement

- **Movement**: 3 squares orthogonal, 2 squares diagonal
- **Capture**: 3 squares orthogonal, 2 squares diagonal
- **Air Defense**: Level 3 (29-square coverage - strongest in game)

### Strategic Role

- **Air Superiority**: Primary counter to AIR_FORCE pieces
- **Asymmetric Positioning**: Exploit unique range pattern
- **Heavy Piece Coordination**: Work with other heavy pieces
- **Zone Layering**: Create overlapping air defense networks

---

## AIR_FORCE (F/f) - Sky Dominator

### Basic Properties

- **Symbol**: F (red) / f (blue)
- **Movement**: 4 squares in all 8 directions
- **Capture**: 4 squares in all 8 directions
- **Terrain**: Universal (can fly over land and water)
- **Special**: Move-ignores-blocking, Multiple capture types, Air defense
  restrictions

### Movement Pattern

```
Base Pattern (4 squares in all directions):
X X X X X X X X X
X X X X X X X X X
X X X X X X X X X
X X X X X X X X X
X X X X F X X X X  (F = AIR_FORCE, X = movement/capture squares)
X X X X X X X X X
X X X X X X X X X
X X X X X X X X X
X X X X X X X X X
```

### Movement Capabilities

- **Ignores Blocking**: Can move through any pieces
- **Terrain Freedom**: Can move over water, land, and mixed terrain
- **Maximum Range**: 4 squares in all directions
- **Air Defense Restrictions**: Limited by enemy air defense zones

### Multiple Capture Types

#### Normal Capture

- **Standard**: Move to target square, replace captured piece
- **Range**: 4 squares in all directions
- **Ignores Blocking**: Can capture through other pieces

#### Stay Capture

- **Unique**: Capture without moving from current position
- **Range**: 4 squares in all directions
- **Tactical Advantage**: Maintain position while eliminating threats

#### Suicide Capture (Kamikaze)

- **Air Defense Triggered**: Occurs when entering enemy air defense zones
- **Both Destroyed**: Both AIR_FORCE and target are eliminated
- **Strategic Sacrifice**: Can eliminate key enemy pieces

### Air Defense Zone Interactions

```
Safe Area: Normal movement and all capture types available
Single Air Defense Zone: Can enter but triggers kamikaze mechanics
Multiple Air Defense Zones: Cannot enter, movement blocked
```

### Heroic Enhancement

- **Movement**: 5 squares in all 8 directions
- **Capture**: 5 squares in all 8 directions
- **Retains**: All special abilities at extended range

### Strategic Role

- **Air Superiority**: Dominate airspace with maximum mobility
- **Deep Strikes**: Attack targets deep in enemy territory
- **Flexible Support**: Provide support where needed most
- **Kamikaze Tactics**: Sacrifice for high-value targets in defended areas

---

## NAVY (N/n) - Naval Commander

### Basic Properties

- **Symbol**: N (red) / n (blue)
- **Movement**: 4 squares in all 8 directions
- **Capture**: Dual system (4 vs NAVY, 3 vs land pieces)
- **Terrain**: Water only (NAVY_MASK squares)
- **Special**: Dual attack mechanisms, Capture-ignores-blocking, Air defense
  level 1

### Movement Pattern

```
Base Pattern (4 squares in all directions):
X X X X X X X X X
X X X X X X X X X
X X X X X X X X X
X X X X X X X X X
X X X X N X X X X  (N = NAVY, X = movement/capture squares)
X X X X X X X X X
X X X X X X X X X
X X X X X X X X X
X X X X X X X X X
```

### Dual Attack System

#### Torpedo Attack (vs NAVY)

- **Target**: Enemy NAVY pieces
- **Range**: Full 4 squares in all directions
- **Mechanism**: Underwater torpedo attack

#### Naval Gun Attack (vs Land Pieces)

- **Target**: All non-NAVY pieces
- **Range**: 3 squares in all directions (reduced range)
- **Mechanism**: Surface gun bombardment

### Water Zone System

- **Pure Water**: Files a-b (NAVY exclusive)
- **Mixed Zones**: File c and river areas (both NAVY and land pieces)
- **Bridge Squares**: f6, f7, h6, h7 (tactical crossing points)

### Air Defense Capability

- **Level 1 Defense**: Creates air defense zones
- **Level 2 Heroic**: Enhanced air defense when heroic
- **Naval Air Cover**: Provides air defense for naval operations

### Heroic Enhancement

- **Movement**: 5 squares in all 8 directions
- **Torpedo Range**: 5 squares vs NAVY targets
- **Naval Gun Range**: 4 squares vs land targets
- **Air Defense**: Level 2 coverage

### Strategic Role

- **Water Control**: Complete dominance of water areas
- **Fire Support**: Long-range support for land operations
- **Carrier Operations**: Transport other pieces to new positions
- **Chokepoint Control**: Dominate key water passages

---

## HEADQUARTER (H/h) - Transforming Command

### Basic Properties

- **Symbol**: H (red) / h (blue)
- **Base Movement**: 0 (completely immobile)
- **Base Capture**: 0 (cannot capture)
- **Terrain**: Land pieces only
- **Special**: Heroic transformation to mobile unit

### Base Form Characteristics

- **Immobile**: Cannot move or capture at all
- **Defensive Only**: Can only be captured, no offensive capability
- **Positional Value**: Provides tactical positioning
- **Stack Component**: Can be carried and carry other pieces

### Heroic Transformation

When heroic (any friendly piece attacks enemy commander):

- **Movement**: 1 square in all 8 directions
- **Capture**: 1 square in all 8 directions
- **Identical to MILITIA**: Same capabilities as MILITIA piece

```
Base Form:     Heroic Form:
    .              X X X
    .              X H X
  . H .     →      X X X
    .
    .
```

### Strategic Role

- **Conditional Asset**: Value depends entirely on heroic activation
- **Surprise Element**: Transformation can catch opponents off-guard
- **Position Preparation**: Pre-position for maximum heroic impact
- **Risk-Reward**: Balance immobility risk with activation potential

---

## Heroic System

### Heroic Promotion Trigger

- **Universal Rule**: Any piece that attacks (threatens) the enemy commander
  becomes heroic
- **Automatic**: Promotion happens immediately when attack is established
- **Persistent**: Status remains until piece is captured or game ends

### Heroic Enhancement Patterns

#### Range Increases

- **Basic Pieces** (1 → 2): INFANTRY, ENGINEER, ANTI_AIR, MILITIA
- **Medium Pieces** (2 → 3): TANK
- **Long Pieces** (3 → 4): ARTILLERY
- **Maximum Pieces** (4 → 5): AIR_FORCE, NAVY
- **Special Cases**: COMMANDER (gains diagonal), HEADQUARTER (0 → 1), MISSILE
  (asymmetric increase)

#### Diagonal Capability

- **Gain Diagonal**: COMMANDER, INFANTRY, ENGINEER, ANTI_AIR, TANK
- **Already Diagonal**: MILITIA, ARTILLERY, MISSILE, AIR_FORCE, NAVY, Heroic
  HEADQUARTER

#### Air Defense Increases

- **ANTI_AIR**: Level 1 → 2
- **MISSILE**: Level 2 → 3
- **NAVY**: Level 1 → 2

### Heroic Status in Stacks

- **Individual Status**: Each piece in a stack maintains its own heroic status
- **Promotion in Stacks**: When a stack attacks an enemy commander, all pieces
  in the stack can become heroic
- **Deployment Preservation**: Heroic status is preserved when pieces are
  deployed from stacks

---

## Piece Interactions

### Stack Compatibility

#### Universal Carriers

All pieces can potentially carry compatible pieces based on combination rules:

- **NAVY**: Can carry AIR_FORCE + (COMMANDER/INFANTRY/MILITIA/TANK)
- **TANK**: Can carry (COMMANDER/INFANTRY/MILITIA)
- **ENGINEER**: Can carry (ARTILLERY/ANTI_AIR/MISSILE)
- **AIR_FORCE**: Can carry TANK + (COMMANDER/INFANTRY/MILITIA)
- **HEADQUARTER**: Can carry COMMANDER

#### Terrain Considerations

- **NAVY Stacks**: Can transport land pieces to water-accessible areas
- **AIR_FORCE Stacks**: Can transport any pieces over any terrain
- **Land Stacks**: Limited to land and mixed terrain areas

### Combat Effectiveness

#### vs COMMANDER

- **All Pieces**: Can attack commander for heroic promotion
- **COMMANDER**: Special capture rules vs enemy commander
- **Long-Range**: ARTILLERY, AIR_FORCE, NAVY can threaten from distance

#### vs AIR_FORCE

- **Air Defense**: ANTI_AIR, MISSILE, NAVY create restrictive zones
- **Kamikaze Forcing**: Air defense forces suicide attacks
- **Terrain Advantage**: Land pieces safe in pure land areas

#### vs NAVY

- **Torpedo Range**: NAVY has full range vs other NAVY pieces
- **Naval Gun Range**: NAVY has reduced range vs land pieces
- **Water Control**: NAVY dominates water areas completely

#### vs Heavy Pieces

- **River Restrictions**: ARTILLERY, ANTI_AIR, MISSILE limited by river crossing
- **Bridge Control**: Competition for limited crossing points
- **Zone Tactics**: Use river system for tactical advantage

---

## Strategic Considerations

### Piece Value Hierarchy

#### High Value (Protect at all costs)

- **COMMANDER**: Game ends if captured
- **NAVY**: Dominates water areas, unique capabilities
- **AIR_FORCE**: Maximum mobility and flexibility

#### Medium-High Value (Important assets)

- **ARTILLERY**: Long-range fire support
- **MISSILE**: Air defense and asymmetric range
- **Heroic Pieces**: Enhanced capabilities

#### Medium Value (Tactical pieces)

- **TANK**: Shoot-over capability
- **ANTI_AIR**: Air defense networks
- **MILITIA**: Diagonal movement

#### Lower Value (Basic units)

- **INFANTRY**: Basic screening force
- **ENGINEER**: Support for heavy weapons
- **HEADQUARTER**: Conditional value

### Tactical Patterns

#### Heroic Promotion Strategies

1. **Sacrifice Attacks**: Use expendable pieces to attack enemy commander
2. **Coordinated Promotion**: Time multiple pieces to become heroic
   simultaneously
3. **Position Preparation**: Pre-position pieces for maximum heroic benefit

#### Air Defense Networks

1. **Overlapping Zones**: Create multiple air defense layers
2. **Zone Gaps**: Identify and exploit gaps in enemy air defense
3. **Kamikaze Baiting**: Force enemy AIR_FORCE into unfavorable suicide attacks

#### Heavy Piece Coordination

1. **Bridge Control**: Coordinate control of river crossing points
2. **Zone Dominance**: Use multiple heavy pieces to control board areas
3. **Crossing Timing**: Time river crossings for maximum tactical advantage

#### Combined Arms Tactics

1. **Fire Support**: Use long-range pieces to support advancing forces
2. **Screening**: Use light pieces to screen heavy pieces
3. **Breakthrough**: Coordinate different piece types for breakthrough attacks

### Endgame Considerations

#### Simplified Position Values

- **AIR_FORCE**: Dominant with reduced air defense
- **NAVY**: Controls water areas with minimal opposition
- **ARTILLERY**: Long-range control in open positions
- **Heroic Pieces**: Enhanced capabilities become more valuable
- **COMMANDER**: Increased activity in simplified positions

#### Mating Patterns

- **COMMANDER + Long-Range**: Powerful mating combinations
- **Multiple Pieces**: Complex mating nets possible
- **Heroic Enhancement**: Heroic pieces create stronger mating threats

This comprehensive piece reference provides complete understanding of all 11
CoTuLenh pieces, their capabilities, interactions, and strategic applications.
Each piece contributes unique value to the game's rich tactical and strategic
landscape.
