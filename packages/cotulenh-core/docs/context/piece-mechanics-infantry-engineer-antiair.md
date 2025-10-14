# INFANTRY, ENGINEER, and ANTI_AIR Piece Mechanics

## Overview

INFANTRY, ENGINEER, and ANTI_AIR pieces share identical base movement and
capture mechanics, making them the basic "foot soldier" units of CoTuLenh. They
differ only in their special abilities: ANTI_AIR pieces create air defense
zones, while INFANTRY and ENGINEER have no special abilities beyond their basic
movement.

## Basic Properties

### INFANTRY

- **Symbol**: `i` (lowercase for blue, `I` uppercase for red)
- **Movement Range**: 1 square orthogonal
- **Capture Range**: 1 square orthogonal
- **Diagonal Movement**: No (orthogonal only)
- **Special Abilities**: None

### ENGINEER

- **Symbol**: `e` (lowercase for blue, `E` uppercase for red)
- **Movement Range**: 1 square orthogonal
- **Capture Range**: 1 square orthogonal
- **Diagonal Movement**: No (orthogonal only)
- **Special Abilities**: None

### ANTI_AIR

- **Symbol**: `g` (lowercase for blue, `G` uppercase for red)
- **Movement Range**: 1 square orthogonal
- **Capture Range**: 1 square orthogonal
- **Diagonal Movement**: No (orthogonal only)
- **Special Abilities**: Creates air defense zones

## Movement Rules

### Normal Movement

- **Range**: Exactly 1 square orthogonally (north, south, east, west)
- **Blocking**: Cannot move through any piece (friendly or enemy)
- **Terrain**: Must stay on land squares (LAND_MASK squares)

### Movement Restrictions

1. **Single step only**: Cannot move more than 1 square in any direction
2. **Orthogonal only**: Cannot move diagonally in base form
3. **Blocked by all pieces**: Cannot move through or past any piece
4. **Land pieces only**: Cannot move to water squares

## Capture Rules

### Adjacent Capture

- **Range**: Exactly 1 square orthogonally adjacent
- **Same as movement**: Capture range equals movement range
- **No diagonal captures**: Cannot capture diagonally in base form
- **Direct capture only**: Must move to the target square to capture (no stay
  captures)

### Standard Capture Mechanics

- **Replace target**: Capturing piece moves to target square, replacing the
  captured piece
- **No special capture types**: These pieces use only normal capture (no stay
  capture or suicide capture)

## Heroic Status Effects

### Heroic Promotion

- **Trigger**: Any piece that attacks (threatens) the enemy commander becomes
  heroic
- **Automatic**: This promotion happens immediately when the attack is
  established
- **Persistent**: Heroic status remains until the piece is captured or the game
  ends

### Heroic Abilities

When any of these pieces becomes heroic:

- **Movement Range**: Increases to 2 squares orthogonal
- **Capture Range**: Increases to 2 squares orthogonal
- **Diagonal Movement**: Gains ability to move and capture diagonally
- **Diagonal Range**: 2 squares diagonally for both movement and capture

### Heroic Movement Pattern

Heroic INFANTRY/ENGINEER/ANTI_AIR can move:

- Up to 2 squares orthogonally (N, S, E, W)
- Up to 2 squares diagonally (NE, NW, SE, SW)
- Can capture at any square within this 2-square range in all 8 directions

## Special Abilities

### INFANTRY and ENGINEER

- **No special abilities**: These pieces have no unique mechanics beyond basic
  movement and capture
- **Identical function**: INFANTRY and ENGINEER are functionally identical in
  all respects
- **Different symbols only**: The distinction is purely cosmetic/thematic

### ANTI_AIR Air Defense System

ANTI_AIR pieces create air defense zones that restrict AIR_FORCE movement:

#### Air Defense Zone Creation

- **Base level**: 1 (affects squares within 1-square radius)
- **Heroic level**: 2 (affects squares within 2-square radius)
- **Circular area**: Uses circular distance calculation (i² + j² ≤ level²)
- **Automatic**: Zones are automatically calculated and updated when pieces move

#### Air Defense Zone Effects

- **AIR_FORCE restriction**: AIR_FORCE pieces have movement restrictions in
  these zones
- **Kamikaze mechanics**: AIR_FORCE can perform suicide attacks in defended
  zones
- **Zone stacking**: Multiple ANTI_AIR pieces can overlap their zones for
  stronger defense

#### Air Defense Level Calculation

```
Base ANTI_AIR: Level 1 defense
Heroic ANTI_AIR: Level 2 defense (base + 1)
```

## Terrain Interactions

### Land Restriction

- **Water squares**: Cannot move to or stay on water squares (NAVY_MASK = 0)
- **Mixed zones**: Can move on mixed terrain squares where both land and water
  pieces can exist
- **Bridge squares**: Can cross bridge squares that connect land areas

### Heavy Piece Rules

These pieces are not classified as heavy pieces, so they are not subject to
river crossing restrictions that apply to ARTILLERY, ANTI_AIR, and MISSILE
pieces.

Note: Despite ANTI_AIR being in the HEAVY_PIECES set for river crossing rules,
this appears to be for terrain restrictions only, not for the air defense
functionality.

## Stacking and Deployment

### Carrying Capacity

- **Can be carried**: These pieces can be carried by other pieces in stacks
- **Can carry others**: These pieces can carry other compatible pieces
- **Standard stacking rules**: Follow normal piece combination rules

### Deployment from Stacks

- **Individual deployment**: Can be deployed individually from stacks
- **Retain abilities**: Heroic status and air defense zones are maintained
  during deployment
- **Standard deployment rules**: Follow normal deployment mechanics

## Code Implementation Details

### Movement Configuration

```typescript
[INFANTRY]: {
  moveRange: 1,
  captureRange: 1,
  canMoveDiagonal: false,
  captureIgnoresPieceBlocking: false,
  moveIgnoresBlocking: false,
},
[ENGINEER]: {
  moveRange: 1,
  captureRange: 1,
  canMoveDiagonal: false,
  captureIgnoresPieceBlocking: false,
  moveIgnoresBlocking: false,
},
[ANTI_AIR]: {
  moveRange: 1,
  captureRange: 1,
  canMoveDiagonal: false,
  captureIgnoresPieceBlocking: false,
  moveIgnoresBlocking: false,
}
```

### Air Defense Configuration

```typescript
BASE_AIRDEFENSE_CONFIG: {
  [ANTI_AIR]: 1,  // Base air defense level
}
```

### Heroic Modifications

When heroic, the configuration becomes:

- `moveRange`: 2 (increased from 1)
- `captureRange`: 2 (increased from 1)
- `canMoveDiagonal`: true (changed from false)

## Strategic Considerations

### Positioning

- **Forward deployment**: Use as front-line pieces to control territory
- **Commander protection**: Position to defend the commander from enemy attacks
- **Zone control**: Use ANTI_AIR pieces to create no-fly zones for enemy
  AIR_FORCE

### Tactical Uses

- **Heroic promotion**: Position to attack enemy commander for heroic
  enhancement
- **Stack formation**: Combine with other pieces for enhanced mobility
- **Air defense network**: Coordinate multiple ANTI_AIR pieces for overlapping
  coverage

### Common Strategies

- **Infantry screens**: Use INFANTRY/ENGINEER as expendable screening forces
- **Anti-air umbrella**: Create overlapping ANTI_AIR zones to protect key areas
- **Heroic transformation**: Sacrifice these pieces to attack commanders for
  heroic promotion

## Interactions with Other Pieces

### With AIR_FORCE

- **ANTI_AIR defense**: ANTI_AIR pieces restrict AIR_FORCE movement and enable
  kamikaze attacks
- **Normal interaction**: INFANTRY/ENGINEER have no special interaction with
  AIR_FORCE

### With Heavy Pieces

- **Can be carried**: These light pieces can be carried by ARTILLERY, MISSILE,
  and other pieces
- **Terrain support**: Can move through areas where heavy pieces are restricted

### With Commanders

- **Heroic promotion**: Attacking enemy commanders promotes these pieces to
  heroic status
- **Protection duty**: Often used to shield commanders from enemy attacks

## Common Mistakes

### Tactical Errors

- **Underestimating heroic potential**: Not positioning these pieces to attack
  enemy commanders
- **Poor air defense placement**: Placing ANTI_AIR pieces where they don't cover
  key areas
- **Ignoring stacking**: Not utilizing these pieces' ability to form and be part
  of stacks

### Strategic Oversights

- **Treating as expendable**: While basic, these pieces become very powerful
  when heroic
- **Neglecting air defense**: Not using ANTI_AIR pieces to counter enemy
  AIR_FORCE
- **Static positioning**: Not utilizing their mobility for dynamic positioning
