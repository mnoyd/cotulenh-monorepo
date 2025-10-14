# NAVY Piece Mechanics

## Overview

The NAVY is a powerful naval unit that dominates water-based combat with
long-range capabilities and specialized attack mechanisms. It has the same range
as AIR_FORCE but is restricted to water areas, making it the master of maritime
warfare. NAVY pieces have unique attack mechanisms with different ranges for
different target types and provide air defense capabilities.

## Basic Properties

- **Symbol**: `n` (lowercase for blue, `N` uppercase for red)
- **Movement Range**: 4 squares in all directions
- **Capture Range**: 4 squares (varies by target type)
- **Diagonal Movement**: Yes (full diagonal capability)
- **Special Abilities**: Dual attack mechanisms, Capture-ignores-blocking, Air
  defense level 1
- **Terrain Classification**: Naval unit (water-only movement)

## Movement Rules

### Water-Only Movement

- **Range**: Up to 4 squares in any of the 8 directions
- **Directions**: North, South, East, West, Northeast, Northwest, Southeast,
  Southwest
- **Terrain restriction**: Can only move on water squares (NAVY_MASK = 1)
- **Blocking**: Cannot move through pieces (except friendly NAVY pieces in some
  cases)

### Water Zone System

The board has specific areas where NAVY pieces can operate:

#### Pure Water Zones

- **Files a-b**: Pure naval zones where only NAVY pieces can operate
- **Deep water**: Areas where land pieces cannot enter

#### Mixed Zones

- **File c**: Mixed zone where both NAVY and land pieces can operate
- **River areas**: Specific squares like d6, e6, d7, e7
- **Bridge squares**: f6, f7, h6, h7 act as crossing points

#### Movement Restrictions

- **Cannot enter land**: NAVY pieces cannot move to pure land squares
- **Mixed zone access**: Can move through mixed zones where both terrain types
  exist
- **Bridge utilization**: Can use bridge squares for tactical positioning

## Attack Mechanisms

### Dual Attack System

NAVY pieces have two different attack mechanisms depending on the target:

#### Torpedo Attack (vs NAVY)

- **Target**: Enemy NAVY pieces
- **Range**: Full 4 squares in all directions
- **Mechanism**: Underwater torpedo attack
- **Effectiveness**: Maximum range against naval targets

#### Naval Gun Attack (vs Land Pieces)

- **Target**: Land-based pieces (all non-NAVY pieces)
- **Range**: 3 squares in all directions (captureRange - 1)
- **Mechanism**: Surface gun attack
- **Reduced effectiveness**: Shorter range against land targets

### Attack Implementation

```typescript
// Navy attack mechanisms
if (pieceData.type === NAVY) {
  if (targetPiece.type === NAVY) {
    // Torpedo attack - full range
    if (currentRange > config.captureRange) {
      captureAllowed = false
    }
  } else {
    // Naval Gun attack - reduced range
    if (currentRange > config.captureRange - 1) {
      captureAllowed = false
    }
  }
}
```

## Capture Rules

### Capture-Ignores-Blocking

- **Range**: 4 squares for NAVY targets, 3 squares for land targets
- **Ignores blocking**: Can capture targets behind other pieces
- **Line of sight**: Must have clear line to target (orthogonal or diagonal)
- **Dual mechanism**: Uses appropriate attack type based on target

### Capture Mechanics

- **Direct capture**: NAVY moves to target square, replacing captured piece
- **Stay capture available**: Can perform stay captures without moving
- **Terrain consideration**: Can only capture targets on squares where NAVY can
  land

## Air Defense System

### Air Defense Capability

- **Base level**: 1 (creates air defense zones)
- **Heroic level**: 2 (base + 1 when heroic)
- **Coverage area**: Circular area with radius equal to defense level
- **Effect**: Restricts AIR_FORCE movement and enables kamikaze attacks

### Air Defense Zone Creation

- **Level 1 base**: Affects all squares within 1-square radius
- **Level 2 heroic**: Affects all squares within 2-square radius
- **Circular pattern**: Uses distance formula (i² + j² ≤ level²)
- **Naval air defense**: Provides air cover for naval operations

## Heroic Status Effects

### Heroic Promotion

- **Trigger**: Any piece that attacks (threatens) the enemy commander becomes
  heroic
- **Automatic**: This promotion happens immediately when the attack is
  established
- **Persistent**: Heroic status remains until the piece is captured or the game
  ends

### Heroic Abilities

When a NAVY becomes heroic:

- **Movement Range**: Increases to 5 squares in all directions
- **Torpedo Range**: Increases to 5 squares vs NAVY targets
- **Naval Gun Range**: Increases to 4 squares vs land targets
- **Air Defense Level**: Increases to 2 (from base level 1)
- **Retains all abilities**: All special attack mechanisms remain active

### Heroic Attack Ranges

- **Torpedo Attack**: 5 squares vs enemy NAVY pieces
- **Naval Gun Attack**: 4 squares vs land pieces
- **Enhanced air defense**: Level 2 air defense coverage

## Terrain Interactions

### Water Zone Mastery

- **Pure water control**: Dominates files a-b completely
- **Mixed zone operations**: Can operate in file c and river areas
- **Bridge control**: Can use bridge squares for tactical positioning

### Terrain Restrictions

- **Cannot enter land**: Restricted to water and mixed zones only
- **Strategic positioning**: Must plan movement around water availability
- **Chokepoint control**: Can control key water passages and bridges

## Stacking and Deployment

### Carrying Capacity

- **Can be carried**: NAVY can be carried by other pieces (though rarely
  practical)
- **Can carry others**: NAVY can carry other compatible pieces
- **Terrain deployment**: Can only deploy carried pieces to water-accessible
  squares

### Special Stacking Considerations

- **AIR_FORCE synergy**: Often carries AIR_FORCE pieces for combined operations
- **Amphibious operations**: Can transport land pieces to water-accessible
  positions
- **Terrain limitations**: Deployment limited by water accessibility

### Deployment from Stacks

- **Individual deployment**: Can be deployed individually from stacks
- **Retain abilities**: All special abilities maintained during deployment
- **Water requirement**: Can only deploy to water-accessible squares
- **Carrier operations**: Often acts as carrier for other pieces

## Code Implementation Details

### Movement Configuration

```typescript
[NAVY]: {
  moveRange: 4,
  captureRange: 4,
  canMoveDiagonal: true,
  captureIgnoresPieceBlocking: true,
  moveIgnoresBlocking: false,
  specialRules: { navyAttackMechanisms: true },
}
```

### Air Defense Configuration

```typescript
BASE_AIRDEFENSE_CONFIG: {
  [NAVY]: 1,  // Base air defense level
}
```

### Terrain Checking

```typescript
// Navy can only move on water
if (pieceDataType === NAVY) {
  return !NAVY_MASK[to]
}
```

### Heroic Modifications

When heroic, the configuration becomes:

- `moveRange`: 5 (increased from 4)
- `captureRange`: 5 (increased from 4) - but naval gun still reduced by 1
- Air defense level increases to 2

## Strategic Considerations

### Positioning Advantages

- **Water control**: Complete dominance of water areas
- **Long-range attacks**: Can engage targets at significant distance
- **Air defense coverage**: Provides air cover for naval operations

### Tactical Uses

- **Area denial**: Control key water passages and approaches
- **Fire support**: Provide long-range fire support for land operations
- **Carrier operations**: Transport and deploy other pieces

### Common Strategies

- **Naval blockade**: Control water access to limit enemy movement
- **Combined operations**: Coordinate with AIR_FORCE for air-sea operations
- **Chokepoint control**: Dominate key water passages and bridges

## Interactions with Other Pieces

### With AIR_FORCE

- **Carrier operations**: Often carries AIR_FORCE for combined operations
- **Mutual support**: Both can operate over water areas
- **Air defense synergy**: NAVY provides air defense for AIR_FORCE operations

### With Land Pieces

- **Fire support**: Can provide naval gunfire support to land operations
- **Transport capability**: Can carry land pieces to new positions
- **Amphibious coordination**: Can support amphibious operations

### With Enemy NAVY

- **Naval warfare**: Torpedo attacks at full range against enemy naval units
- **Water control**: Competition for control of water areas
- **Range advantage**: Full torpedo range vs reduced naval gun range

## Common Mistakes

### Tactical Errors

- **Terrain neglect**: Not considering water accessibility when planning moves
- **Range confusion**: Confusing torpedo range vs naval gun range
- **Poor positioning**: Placing NAVY where it cannot utilize full capabilities

### Strategic Oversights

- **Water control neglect**: Not utilizing NAVY's complete water dominance
- **Air defense waste**: Not using NAVY's air defense capability effectively
- **Carrier potential**: Not utilizing NAVY's ability to transport other pieces

## Advanced Tactics

### Naval Warfare Mastery

- **Torpedo tactics**: Use full range against enemy NAVY pieces
- **Naval gun support**: Provide fire support to land operations at reduced
  range
- **Water control**: Dominate key water areas and passages

### Combined Operations

- **Air-sea coordination**: Coordinate with AIR_FORCE for maximum effectiveness
- **Amphibious support**: Support land operations from water positions
- **Carrier operations**: Use NAVY as mobile platform for other pieces

### Heroic NAVY Utilization

- **Extended range**: Use 5-square range for maximum water control
- **Enhanced air defense**: Provide level 2 air defense coverage
- **Multi-role capability**: Combine long-range attacks with air defense

## Comparison with Other Long-Range Pieces

### vs AIR_FORCE

- **Range**: Both have 4-square base range (5 when heroic)
- **Terrain**: NAVY water-only, AIR_FORCE universal
- **Blocking**: Both ignore blocking for captures, AIR_FORCE also for movement
- **Attack types**: NAVY has dual mechanisms, AIR_FORCE has multiple capture
  types

### vs ARTILLERY

- **Range**: NAVY 4 squares, ARTILLERY 3 squares
- **Terrain**: NAVY water-only, ARTILLERY land with river restrictions
- **Attack mechanisms**: NAVY has dual range, ARTILLERY has consistent range
- **Special abilities**: Both ignore blocking for captures

### vs MISSILE

- **Range**: NAVY 4 squares, MISSILE 2/1 squares
- **Pattern**: NAVY symmetric, MISSILE asymmetric
- **Air defense**: NAVY level 1, MISSILE level 2
- **Terrain**: NAVY water-only, MISSILE land with river restrictions

## Endgame Considerations

### Water Control Endgames

- **Dominant in water**: Becomes increasingly powerful as water control becomes
  critical
- **Reduced opposition**: Fewer pieces mean less competition for water areas
- **Long-range precision**: Can control large water areas with minimal pieces

### NAVY and Commander Endgames

- **Fire support**: Can provide long-range support for commander operations
- **Water sanctuary**: Can provide safe areas for friendly commander
- **Heroic potential**: Attacking enemy commander enhances all capabilities

### Combined Arms Endgames

- **Carrier operations**: Can transport key pieces to critical positions
- **Air defense**: Provides air cover in simplified positions
- **Multi-role capability**: Can fulfill multiple tactical roles simultaneously

## Unique Characteristics

### Among All Pieces

- **Water specialist**: Only piece restricted to water areas
- **Dual attack system**: Only piece with different ranges for different targets
- **Naval warfare**: Specialized for maritime combat operations
- **Carrier capability**: Excellent platform for transporting other pieces

### Tactical Niche

- **Water dominance**: Complete control of water-based operations
- **Fire support**: Long-range support for land operations
- **Combined operations**: Platform for multi-piece tactical operations
