# Complete Piece Behavior Reference

## Overview

This document provides exhaustive documentation for all 11 piece types in
CoTuLenh (Cờ Tư Lệnh), covering their movement patterns, capture mechanics,
special abilities, terrain interactions, and heroic enhancements. Each piece has
unique characteristics that contribute to the strategic depth of the game.

## Piece Classification System

### By Movement Range

- **Short Range (1 square)**: INFANTRY, ENGINEER, ANTI_AIR, MILITIA, Heroic
  HEADQUARTER
- **Medium Range (2 squares)**: TANK, MISSILE (orthogonal)
- **Long Range (3+ squares)**: ARTILLERY (3), AIR_FORCE (4), NAVY (4), COMMANDER
  (infinite orthogonal)

### By Terrain Access

- **Land Only**: COMMANDER, INFANTRY, ENGINEER, ANTI_AIR, TANK, MILITIA,
  ARTILLERY, MISSILE, HEADQUARTER
- **Water Only**: NAVY
- **Universal**: AIR_FORCE

### By Special Abilities

- **Capture-Ignores-Blocking**: TANK, ARTILLERY, MISSILE, AIR_FORCE, NAVY
- **Air Defense**: ANTI_AIR (level 1), MISSILE (level 2), NAVY (level 1)
- **Multiple Capture Types**: AIR_FORCE (normal, stay, suicide)
- **Transformation**: HEADQUARTER (immobile → mobile when heroic)

---

## COMMANDER - The Royal Piece

### Basic Properties

- **Symbol**: `c` (blue) / `C` (red)
- **Movement**: Infinite orthogonal (N, S, E, W)
- **Capture**: 1 square orthogonal only
- **Terrain**: Land pieces only
- **Special**: Flying General rule, Commander vs Commander capture

### Movement Mechanics

```
Movement Pattern (unlimited range):
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

### Heroic Enhancements

When heroic (attacking enemy commander):

- **Movement**: Still infinite orthogonal (unchanged)
- **Capture**: Still 1 square orthogonal + gains 1 square diagonal
- **New Ability**: Can move and capture diagonally (1 square)

### Strategic Considerations

- **Positioning**: Central positions maximize mobility
- **Safety**: Must avoid exposure to enemy commander
- **Endgame**: Becomes highly active in simplified positions
- **Coordination**: Use unlimited movement for rapid repositioning

---

## INFANTRY, ENGINEER, ANTI_AIR - The Basic Foot Soldiers

### Basic Properties

- **Symbols**: `i`/`I` (INFANTRY), `e`/`E` (ENGINEER), `g`/`G` (ANTI_AIR)
- **Movement**: 1 square orthogonal (N, S, E, W)
- **Capture**: 1 square orthogonal
- **Terrain**: Land pieces only
- **Special**: ANTI_AIR creates air defense zones

### Movement Pattern

```
  X
X P X      (P = piece, X = movement/capture squares)
  X
```

### ANTI_AIR Special Ability

- **Air Defense Level**: 1 (2 when heroic)
- **Zone Effect**: Circular area restricting AIR_FORCE movement
- **Kamikaze Enablement**: AIR_FORCE can suicide attack in defended zones

### Heroic Enhancements

When heroic:

- **Movement**: 2 squares in all 8 directions
- **Capture**: 2 squares in all 8 directions
- **New Ability**: Diagonal movement and capture

```
Heroic Pattern:
X X X X X
X X X X X
X X P X X  (P = heroic piece, X = movement/capture squares)
X X X X X
X X X X X
```

### Strategic Considerations

- **INFANTRY/ENGINEER**: Identical function, used as basic screening forces
- **ANTI_AIR**: Position to create air defense networks
- **Heroic Potential**: Sacrifice to attack commanders for enhancement
- **Stacking**: Excellent for forming combined stacks

---

## TANK - The Armored Shooter

### Basic Properties

- **Symbol**: `t` (blue) / `T` (red)
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

### Shoot-Over-Blocking Ability

- **Movement**: Cannot move through pieces (normal blocking rules)
- **Capture**: Can capture targets behind blocking pieces
- **Range**: Up to 2 squares orthogonally
- **Line of Sight**: Must have clear orthogonal line to target

### Heroic Enhancements

When heroic:

- **Movement**: 3 squares in all 8 directions
- **Capture**: 3 squares in all 8 directions
- **Retains**: Shoot-over-blocking ability in all directions

### Strategic Considerations

- **Overwatch**: Position to shoot over friendly pieces
- **Support Fire**: Provide ranged support for advancing forces
- **Flexibility**: Not subject to heavy piece river crossing restrictions
- **Breakthrough**: Use shoot-over ability to attack protected targets

---

## MILITIA - The Versatile Fighter

### Basic Properties

- **Symbol**: `m` (blue) / `M` (red)
- **Movement**: 1 square in all 8 directions
- **Capture**: 1 square in all 8 directions
- **Terrain**: Land pieces only
- **Special**: Only basic piece with diagonal movement

### Movement Pattern

```
X X X
X M X      (M = MILITIA, X = movement/capture squares)
X X X
```

### Unique Characteristics

- **Omnidirectional**: Can move and capture in all 8 directions
- **Flexible**: More movement options than other basic pieces
- **Diagonal Capability**: Only basic piece with inherent diagonal movement

### Heroic Enhancements

When heroic:

- **Movement**: 2 squares in all 8 directions
- **Capture**: 2 squares in all 8 directions
- **Already Diagonal**: Diagonal capability unchanged (already present)

### Strategic Considerations

- **Corner Control**: Excellent for controlling diagonal approaches
- **Flexible Defense**: Can respond to threats from any direction
- **Central Positioning**: Benefits greatly from central board positions
- **Tactical Flexibility**: More escape routes than orthogonal-only pieces

---

## ARTILLERY - The Long-Range Bombarder

### Basic Properties

- **Symbol**: `a` (blue) / `A` (red)
- **Movement**: 3 squares in all 8 directions
- **Capture**: 3 squares in all 8 directions
- **Terrain**: Land pieces only (heavy piece river restrictions)
- **Special**: Capture-ignores-blocking, Stay capture

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

### Heroic Enhancements

When heroic:

- **Movement**: 4 squares in all 8 directions
- **Capture**: 4 squares in all 8 directions
- **Retains**: All special abilities at extended range

### Strategic Considerations

- **Back-Rank Positioning**: Maximize board coverage from rear positions
- **Stay Capture**: Eliminate threats without exposing position
- **Bridge Control**: Position to control river crossing points
- **Area Denial**: Use long range to deny key squares

---

## MISSILE - The Guided Weapon

### Basic Properties

- **Symbol**: `s` (blue) / `S` (red)
- **Movement**: 2 squares orthogonal, 1 square diagonal
- **Capture**: 2 squares orthogonal, 1 square diagonal
- **Terrain**: Land pieces only (heavy piece river restrictions)
- **Special**: Capture-ignores-blocking, Air defense level 2, Asymmetric range

### Unique Movement Pattern

```
  X     X
X   X X   X
  X M X     (M = MISSILE, X = movement/capture squares)
X   X X   X
  X     X
```

### Asymmetric Range System

- **Orthogonal**: Up to 2 squares (N, S, E, W)
- **Diagonal**: Exactly 1 square (NE, NW, SE, SW)
- **Implementation**: Special code logic limits diagonal range

### Air Defense System

- **Level 2 Defense**: Highest base air defense level
- **Zone Coverage**: 2-square radius (3 when heroic)
- **AIR_FORCE Counter**: Primary counter to air units
- **Kamikaze Enablement**: Forces AIR_FORCE into suicide attacks

### Heroic Enhancements

When heroic:

- **Movement**: 3 squares orthogonal, 2 squares diagonal
- **Capture**: 3 squares orthogonal, 2 squares diagonal
- **Air Defense**: Level 3 (strongest in game)

### Strategic Considerations

- **Air Superiority**: Use to control airspace against AIR_FORCE
- **Asymmetric Positioning**: Exploit unique range pattern
- **Heavy Piece Coordination**: Work with other heavy pieces for bridge control
- **Zone Layering**: Create overlapping air defense networks

---

## AIR_FORCE - The Sky Dominator

### Basic Properties

- **Symbol**: `f` (blue) / `F` (red)
- **Movement**: 4 squares in all 8 directions
- **Capture**: 4 squares in all 8 directions
- **Terrain**: Universal (can fly over land and water)
- **Special**: Move-ignores-blocking, Multiple capture types, Air defense
  restrictions

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

### Heroic Enhancements

When heroic:

- **Movement**: 5 squares in all 8 directions
- **Capture**: 5 squares in all 8 directions
- **Retains**: All special abilities at extended range

### Strategic Considerations

- **Air Superiority**: Dominate airspace with maximum mobility
- **Deep Strikes**: Attack targets deep in enemy territory
- **Flexible Support**: Provide support where needed most
- **Kamikaze Tactics**: Sacrifice for high-value targets in defended areas

---

## NAVY - The Naval Commander

### Basic Properties

- **Symbol**: `n` (blue) / `N` (red)
- **Movement**: 4 squares in all 8 directions
- **Capture**: Dual system (4 vs NAVY, 3 vs land pieces)
- **Terrain**: Water only (NAVY_MASK squares)
- **Special**: Dual attack mechanisms, Capture-ignores-blocking, Air defense
  level 1

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

### Heroic Enhancements

When heroic:

- **Movement**: 5 squares in all 8 directions
- **Torpedo Range**: 5 squares vs NAVY targets
- **Naval Gun Range**: 4 squares vs land targets
- **Air Defense**: Level 2 coverage

### Strategic Considerations

- **Water Control**: Complete dominance of water areas
- **Fire Support**: Long-range support for land operations
- **Carrier Operations**: Transport other pieces to new positions
- **Chokepoint Control**: Dominate key water passages

---

## HEADQUARTER - The Transforming Command

### Basic Properties

- **Symbol**: `h` (blue) / `H` (red)
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

### Strategic Considerations

- **Conditional Asset**: Value depends entirely on heroic activation
- **Surprise Element**: Transformation can catch opponents off-guard
- **Position Preparation**: Pre-position for maximum heroic impact
- **Risk-Reward**: Balance immobility risk with activation potential

---

## Heroic System Overview

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

---

## Terrain System Integration

### Land Pieces (LAND_MASK = 1)

- **Pieces**: COMMANDER, INFANTRY, ENGINEER, ANTI_AIR, TANK, MILITIA, ARTILLERY,
  MISSILE, HEADQUARTER
- **Restrictions**: Cannot move to pure water squares
- **Mixed Zones**: Can operate in mixed terrain areas

### Water Pieces (NAVY_MASK = 1)

- **Pieces**: NAVY only
- **Restrictions**: Cannot move to pure land squares
- **Mixed Zones**: Can operate in mixed terrain areas

### Universal Pieces

- **Pieces**: AIR_FORCE only
- **Freedom**: Can move over any terrain type
- **Landing**: Can land on any accessible square

### Heavy Piece River Crossing

- **Affected Pieces**: ARTILLERY, ANTI_AIR, MISSILE
- **Zone System**: Board divided into upper/lower zones by river
- **Crossing Points**: Limited to files f and h
- **Strategic Impact**: Significantly affects positioning and tactics

---

## Special Mechanics Summary

### Capture-Ignores-Blocking

- **Pieces**: TANK, ARTILLERY, MISSILE, AIR_FORCE, NAVY
- **Effect**: Can capture targets behind other pieces
- **Movement**: Only TANK and AIR_FORCE ignore blocking for movement
- **Tactical Use**: Attack protected targets, provide fire support

### Air Defense System

- **Creators**: ANTI_AIR (level 1), MISSILE (level 2), NAVY (level 1)
- **Target**: Restricts AIR_FORCE movement
- **Zone Calculation**: Circular areas based on defense level
- **Kamikaze Effect**: Forces AIR_FORCE into suicide attacks

### Multiple Capture Types

- **Normal Capture**: Move to target square (all pieces)
- **Stay Capture**: Capture without moving (ARTILLERY, AIR_FORCE, NAVY)
- **Suicide Capture**: Both pieces destroyed (AIR_FORCE only)

### Flying General Rule

- **Applies To**: COMMANDER pieces only
- **Effect**: Commanders cannot be on same orthogonal line without blocking
- **Legal Move Filtering**: Moves creating exposure are illegal
- **Strategic Impact**: Creates mutual blocking between commanders

---

## Piece Interaction Matrix

### Stacking Compatibility

- **Universal Carriers**: All pieces can carry compatible pieces
- **Universal Carried**: All pieces can be carried by others
- **Terrain Considerations**: Deployment limited by terrain accessibility
- **Special Cases**: NAVY can transport pieces to water-accessible areas

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

## Advanced Tactical Patterns

### Heroic Promotion Strategies

1. **Sacrifice Attacks**: Use expendable pieces to attack enemy commander
2. **Coordinated Promotion**: Time multiple pieces to become heroic
   simultaneously
3. **Position Preparation**: Pre-position pieces for maximum heroic benefit

### Air Defense Networks

1. **Overlapping Zones**: Create multiple air defense layers
2. **Zone Gaps**: Identify and exploit gaps in enemy air defense
3. **Kamikaze Baiting**: Force enemy AIR_FORCE into unfavorable suicide attacks

### Heavy Piece Coordination

1. **Bridge Control**: Coordinate control of river crossing points
2. **Zone Dominance**: Use multiple heavy pieces to control board areas
3. **Crossing Timing**: Time river crossings for maximum tactical advantage

### Combined Arms Tactics

1. **Fire Support**: Use long-range pieces to support advancing forces
2. **Screening**: Use light pieces to screen heavy pieces
3. **Breakthrough**: Coordinate different piece types for breakthrough attacks

---

## Endgame Piece Values

### Simplified Position Values

- **AIR_FORCE**: Dominant with reduced air defense
- **NAVY**: Controls water areas with minimal opposition
- **ARTILLERY**: Long-range control in open positions
- **Heroic Pieces**: Enhanced capabilities become more valuable
- **COMMANDER**: Increased activity in simplified positions

### Mating Potential

- **COMMANDER + Long-Range**: Powerful mating combinations
- **Multiple Pieces**: Complex mating nets possible
- **Heroic Enhancement**: Heroic pieces create stronger mating threats

### Draw Considerations

- **Insufficient Material**: Some piece combinations cannot force mate
- **Perpetual Patterns**: Some positions allow perpetual attack patterns
- **Stalemate**: Careful play required to avoid stalemate traps

---

This comprehensive reference provides the complete foundation for understanding
all piece behaviors in CoTuLenh, enabling perfect implementation and strategic
mastery of the game.
