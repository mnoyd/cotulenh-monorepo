# ARTILLERY Piece Mechanics

## Overview

The ARTILLERY is a powerful long-range piece that represents heavy artillery
units. It has the longest range among land-based pieces and possesses the unique
ability to ignore blocking pieces for captures while maintaining diagonal
movement capability. As a heavy piece, it is subject to special river crossing
restrictions.

## Basic Properties

- **Symbol**: `a` (lowercase for blue, `A` uppercase for red)
- **Movement Range**: 3 squares in all directions
- **Capture Range**: 3 squares in all directions
- **Diagonal Movement**: Yes (can move and capture diagonally)
- **Special Abilities**: Capture-ignores-blocking
- **Terrain Classification**: Heavy piece (subject to river crossing
  restrictions)

## Movement Rules

### Long-Range Movement

- **Range**: Up to 3 squares in any of the 8 directions
- **Directions**: North, South, East, West, Northeast, Northwest, Southeast,
  Southwest
- **Blocking**: Cannot move through any piece (friendly or enemy)
- **Terrain**: Must stay on land squares (LAND_MASK squares)

### Movement Restrictions

1. **Three-square maximum**: Cannot move more than 3 squares in any direction
2. **Blocked by all pieces**: Cannot move through or past any piece for movement
3. **Land pieces only**: Cannot move to water squares
4. **Heavy piece river crossing**: Subject to special river crossing
   restrictions

## Capture Rules

### Capture-Ignores-Blocking Ability

The ARTILLERY's signature ability allows it to capture targets while ignoring
intervening pieces:

- **Capture range**: Up to 3 squares in all directions (orthogonal and diagonal)
- **Ignores blocking**: Can capture targets even if pieces are between the
  ARTILLERY and target
- **Line of sight**: Must have a clear line to the target (orthogonal or
  diagonal)
- **Movement vs capture**: This ability only applies to captures, not movement

### Capture Mechanics

- **Direct capture**: ARTILLERY moves to the target square, replacing the
  captured piece
- **Stay capture available**: ARTILLERY can also perform stay captures (capture
  without moving)
- **Long-range precision**: Can engage targets at maximum range regardless of
  blocking

### Examples

```
A . E . X    (A = ARTILLERY, E = Enemy piece, X = Target, . = Empty)
```

- ARTILLERY can capture X even though E is blocking the path
- ARTILLERY cannot move to X because E blocks movement
- ARTILLERY can capture E normally (no blocking issue)
- ARTILLERY can also stay-capture X without moving

## Heavy Piece River Crossing Rules

### Zone System

The board is divided into zones for heavy piece movement:

- **Zone 0**: Files a-b (water area, heavy pieces cannot enter)
- **Zone 1**: Files c-k, ranks 7-12 (upper half)
- **Zone 2**: Files c-k, ranks 1-6 (lower half)

### River Crossing Restrictions

Heavy pieces (ARTILLERY, ANTI_AIR, MISSILE) have restricted movement between
zones:

#### Blocked Crossings

- **Zone 1 to Zone 2**: Generally blocked (crossing the river)
- **Zone 2 to Zone 1**: Generally blocked (crossing the river)

#### Allowed Crossings

- **Horizontal movement**: Allowed at files f (file index 5) and h (file
  index 7)
- **Bridge squares**: These act as crossing points for heavy pieces
- **Same zone**: Free movement within the same zone

### Practical Impact

- ARTILLERY at d8 (zone 1) cannot move to d5 (zone 2) directly
- ARTILLERY at f8 (zone 1) can move to f5 (zone 2) via horizontal crossing
- ARTILLERY at h8 (zone 1) can move to h5 (zone 2) via horizontal crossing

## Heroic Status Effects

### Heroic Promotion

- **Trigger**: Any piece that attacks (threatens) the enemy commander becomes
  heroic
- **Automatic**: This promotion happens immediately when the attack is
  established
- **Persistent**: Heroic status remains until the piece is captured or the game
  ends

### Heroic Abilities

When an ARTILLERY becomes heroic:

- **Movement Range**: Increases to 4 squares in all directions
- **Capture Range**: Increases to 4 squares in all directions
- **Diagonal Movement**: Already has diagonal capability (unchanged)
- **Retains capture-ignores-blocking**: Special capture ability works at
  extended range

### Heroic Movement Pattern

Heroic ARTILLERY can move and capture within a 4-square radius in all
directions, making it one of the most powerful pieces on the board.

## Terrain Interactions

### Land Restriction

- **Water squares**: Cannot move to or stay on water squares (NAVY_MASK = 0)
- **Mixed zones**: Can move on mixed terrain squares where both land and water
  pieces can exist
- **Bridge squares**: Can cross bridge squares that connect land areas

### Heavy Piece Classification

- **River crossing restrictions**: Subject to zone-based movement limitations
- **Bridge utilization**: Must use designated crossing points to move between
  zones
- **Strategic positioning**: River crossing rules significantly impact
  positioning

## Stacking and Deployment

### Carrying Capacity

- **Can be carried**: ARTILLERY can be carried by other pieces in stacks
- **Can carry others**: ARTILLERY can carry other compatible pieces
- **Standard stacking rules**: Follow normal piece combination rules

### Deployment from Stacks

- **Individual deployment**: Can be deployed individually from stacks
- **Retain abilities**: Heroic status and capture-ignores-blocking ability are
  maintained during deployment
- **Standard deployment rules**: Follow normal deployment mechanics

## Code Implementation Details

### Movement Configuration

```typescript
[ARTILLERY]: {
  moveRange: 3,
  captureRange: 3,
  canMoveDiagonal: true,
  captureIgnoresPieceBlocking: true,    // Key special ability
  moveIgnoresBlocking: false,           // Only for captures, not movement
}
```

### Heavy Piece Classification

```typescript
export const HEAVY_PIECES = new Set([ARTILLERY, ANTI_AIR, MISSILE])
```

### Heroic Modifications

When heroic, the configuration becomes:

- `moveRange`: 4 (increased from 3)
- `captureRange`: 4 (increased from 3)
- `canMoveDiagonal`: true (already true, unchanged)
- Special abilities remain active

## Strategic Considerations

### Positioning Advantages

- **Long-range control**: Can control large areas of the board
- **Flexible firing**: Can engage targets from multiple angles
- **Stay capture option**: Can eliminate threats without exposing itself

### Tactical Uses

- **Area denial**: Use long range to deny key squares to enemy pieces
- **Support fire**: Provide fire support while staying behind friendly lines
- **Breakthrough attacks**: Use capture-ignores-blocking to attack protected
  targets

### Common Strategies

- **Back-rank positioning**: Place on back ranks for maximum board coverage
- **Bridge control**: Position to control river crossing points
- **Heroic transformation**: Position to attack enemy commanders for enhanced
  capabilities

## Interactions with Other Pieces

### With Light Pieces

- **Shooting over**: Can capture targets behind friendly light pieces
- **Coordination**: Light pieces can screen ARTILLERY while it provides fire
  support
- **Stacking synergy**: Can form powerful combined stacks

### With Other Heavy Pieces

- **Similar restrictions**: All heavy pieces share river crossing limitations
- **Complementary roles**: ARTILLERY provides long-range fire, others provide
  specialized abilities
- **Bridge competition**: May compete for limited river crossing points

### With Commanders

- **Heroic promotion**: Attacking enemy commanders promotes ARTILLERY to heroic
  status
- **Long-range threat**: Can threaten commanders from great distances
- **Stay capture advantage**: Can capture commanders without exposing itself

## Common Mistakes

### Tactical Errors

- **Confusing movement and capture**: Thinking ARTILLERY can move through pieces
  like it can shoot
- **Poor positioning**: Placing ARTILLERY where river crossing rules limit its
  effectiveness
- **Underutilizing stay capture**: Not using the ability to capture without
  moving

### Strategic Oversights

- **Ignoring river crossings**: Not considering heavy piece movement
  restrictions in planning
- **Static deployment**: Not repositioning ARTILLERY to maintain optimal firing
  positions
- **Bridge neglect**: Not controlling or utilizing river crossing points
  effectively

## Advanced Tactics

### Capture-Ignores-Blocking Mastery

- **Layered attacks**: Attack targets behind multiple layers of protection
- **Friendly screens**: Use friendly pieces as mobile cover while maintaining
  offensive capability
- **Multi-target threats**: Threaten multiple targets simultaneously with long
  range

### Heavy Piece Coordination

- **Bridge control**: Coordinate with other heavy pieces to control crossing
  points
- **Zone dominance**: Use multiple heavy pieces to dominate specific board zones
- **Crossing timing**: Time river crossings to maximize tactical advantage

### Heroic ARTILLERY Utilization

- **Extended dominance**: Use 4-square range to dominate even larger board areas
- **Multi-directional pressure**: Create pressure from multiple angles
  simultaneously
- **Endgame power**: Heroic ARTILLERY becomes a dominant endgame piece

## Comparison with Other Long-Range Pieces

### vs NAVY

- **Range**: Same 3-square base range (4 when heroic)
- **Terrain**: ARTILLERY on land, NAVY on water
- **Special abilities**: Both ignore blocking for captures
- **Mobility**: NAVY has fewer terrain restrictions in its domain

### vs AIR_FORCE

- **Range**: ARTILLERY 3 squares, AIR_FORCE 4 squares
- **Blocking**: ARTILLERY ignores for captures only, AIR_FORCE ignores for both
- **Restrictions**: ARTILLERY has river crossing, AIR_FORCE has air defense
  zones
- **Capture types**: ARTILLERY has stay capture, AIR_FORCE has suicide capture

### vs Heroic MISSILE

- **Range**: Both reach 3 squares when MISSILE is heroic
- **Movement**: ARTILLERY has full diagonal, MISSILE has limited diagonal
- **Special abilities**: Both ignore blocking for captures
- **Terrain**: Both are heavy pieces with river crossing restrictions

## Endgame Considerations

### Simplified Positions

- **Increased value**: ARTILLERY becomes more valuable as the board empties
- **Long-range dominance**: Can control large areas with fewer pieces to block
- **Stay capture advantage**: Can eliminate threats without counter-attack risk

### King and ARTILLERY Endgames

- **Powerful combination**: ARTILLERY and commander can create mating nets
- **Distance advantage**: Can attack enemy commander from safe distances
- **Heroic potential**: Attacking enemy commander makes ARTILLERY even more
  powerful
