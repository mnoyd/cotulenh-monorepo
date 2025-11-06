# Edge Cases and Special Mechanics Documentation

## Overview

This document captures all edge cases, special mechanics, and exceptional
behaviors extracted from the 126 documentation files, focusing on the unique
rules and implementations that deviate from standard piece behavior.

## Air Force Terrain Exceptions

### Universal Terrain Access

**Core Exception**: Air Force can be placed anywhere (flies over water)

- **Terrain Freedom**: Can be placed on any terrain type
- **Movement Freedom**: Can stay on any terrain type during deployment
- **Stack Carrier**: When Air Force is carrier, entire stack can move anywhere
- **No Terrain Restrictions**: Ignores all terrain-based movement limitations

**Implementation Details**:

```typescript
// Air Force Exception in placement
- **Air Force Exception**: Can be placed on any terrain (flies over water)

// Stack terrain validation
// Air Force carrier: stack can move anywhere
// No terrain restrictions for Air Force carriers

// Stay validation during deployment
- **Air Force Exception**: Air Force can stay on any terrain type
```

**Strategic Implications**:

- Universal access to all board squares
- Can transport other pieces to otherwise inaccessible terrain
- Provides tactical flexibility in deployment scenarios
- Enables unique strategic combinations with terrain-restricted pieces

### Air Defense Interactions

**Kamikaze Mechanics**:

- Can perform suicide attacks in air defense zones
- Both Air Force and target piece are destroyed
- Primarily used for high-value trades
- Enables breakthrough attacks in heavily defended positions

**Movement Restrictions in Defense Zones**:

- Subject to air defense zone limitations
- May be forced into suicide attacks
- Can choose between normal and stay capture when terrain allows
- Air defense zones calculated using circular distance formula

## Tank Shoot-Over-Blocking Special Rules

### Core Mechanic

**Shoot-Over-Blocking Ability**:

- Can capture targets while ignoring intervening pieces
- **Range**: 2 squares orthogonal for captures
- **Movement**: Cannot move through pieces (normal blocking applies)
- **Special Rule Override**: `tankShootOverBlocking: true` overrides
  `captureIgnoresPieceBlocking: false`

**Implementation Logic**:

```typescript
// Tank configuration
{
  captureRange: 2,
  canMoveDiagonal: false,
  captureIgnoresPieceBlocking: false,  // Note: Special rule overrides this
  moveIgnoresBlocking: false,
  specialRules: { tankShootOverBlocking: true },
}

// Special rule implementation
// The tankShootOverBlocking special rule is handled in the capture logic:
// - Normal movement respects blocking (moveIgnoresBlocking: false)
// - Captures ignore blocking pieces (special rule override)
```

### Heroic Enhancement

**Heroic Tank Abilities**:

- **Diagonal Movement**: Gains ability to move and capture diagonally
- **Diagonal Range**: 3 squares diagonally for both movement and capture
- **Retains Shoot-Over**: Special capture ability works in all 8 directions
- **Enhanced Range**: Up to 3 squares orthogonally and diagonally

**Tactical Applications**:

- Breakthrough attacks against protected targets
- Support fire while friendly pieces advance
- Flexible positioning with 2-square movement
- Friendly screens using mobile cover while maintaining firing lines

### Critical Missing Test Coverage

**Identified Gap**: No specific test validates Tank's signature
shoot-over-blocking ability

- **Priority**: Immediate - this is Tank's defining characteristic
- **Test Needed**: Validate Tank can capture over blocking pieces but cannot
  move through them
- **Scenarios**: Various blocking configurations and capture ranges

## Missile Diagonal Range Limitations

### Special Movement Logic

**Asymmetric Movement Pattern**:

- **Orthogonal**: 2 squares (normal range)
- **Diagonal**: 1 square only (special limitation)
- **L-Shaped Pattern**: 2-orthogonal/1-diagonal movement
- **Override Logic**: Special rule overrides normal diagonal range

**Implementation Details**:

```typescript
// Special case for Missile diagonal movement
if (
  pieceData.type === MISSILE &&
  // Additional logic for diagonal limitation
) {
  // Limit diagonal movement to 1 square
}

// Configuration
{
  captureRange: 2,
  canMoveDiagonal: true,
  captureIgnoresPieceBlocking: true,
  moveIgnoresBlocking: false,
  specialRules: { missileSpecialRange: true },
}
```

### Blocking Behavior

**Capture vs Movement**:

- **Cannot move through pieces**: Normal blocking applies to movement
- **Can capture over pieces**: `captureIgnoresPieceBlocking: true`
- **Range Maintenance**: Maintains range limitations despite ignore-blocking
  ability
- **Asymmetric Advantage**: Unique movement pattern creates tactical
  opportunities

### Air Defense Integration

**Defense Level Progression**:

- **Base Level**: 2 (highest among air defense pieces)
- **Heroic Level**: 3 (highest possible air defense level)
- **Coverage Area**: Circular area with radius equal to defense level
- **Zone Stacking**: Can coordinate with other air defense pieces

## Commander vs Commander Special Capture Mechanics

### Flying General Rule

**Core Principle**: Prevents commanders from being directly exposed orthogonally
with no pieces between them

**Implementation**:

```typescript
// Flying general implementation
// The _isCommanderExposed() method checks all orthogonal directions from the
// commander position for enemy commander visibility

// Special commander capture logic
// The code implements a special case for commander vs commander captures:
// - Checks if moving piece is COMMANDER
// - Allows unlimited range capture vs enemy commander
// - Ignores normal blocking for commander vs commander
```

**Special Rules**:

- **Unlimited Range**: Flying general rule allows unlimited range vs enemy
  commander
- **Ignores Blocking**: Can capture enemy commander through intervening pieces
- **Orthogonal Only**: Must be orthogonal line of sight (not diagonal)
- **Immediate Capture**: When commander sees enemy commander orthogonally, can
  immediately capture

### Movement Restrictions

**Cannot Slide Past Enemy Commander**:

- If enemy commander is visible orthogonally in line of movement
- Commander cannot move to any square beyond where it would capture that
  commander
- Forces immediate capture or prevents movement in that direction

**Heroic Commander Effects**:

- **Movement Range**: Still infinite orthogonal (unchanged)
- **Special Abilities**: Remain the same when heroic
- **Capture Rules**: Commander vs commander rules still apply

### Game Ending Implications

**Victory Conditions**:

- **Commander Capture**: If commander is captured, game ends immediately
- **Checkmate**: Commander is attacked and has no legal moves to escape
- **Stalemate**: Commander not in check but has no legal moves (draw condition)

## Navy Terrain Restrictions and Critical Placement Bugs

### Undocumented Behavior

**Critical Discovery**: Navy can ONLY be placed on water squares (not documented
in main rules)

**Valid Navy Squares (NAVY_MASK)**:

- **Pure Water**: a1-a11, b1-b11 (a-b files)
- **Mixed Zones**: c1-c11 (c file), d6, e6, d7, e7 (river squares)
- **Bridge Squares**: f6, f7, h6, h7 (strategic crossing points)

**Invalid Navy Squares**:

```typescript
// ❌ WRONG - These return false!
game.put({ type: NAVY, ... }, 'e5') // Land square
game.put({ type: NAVY, ... }, 'd4') // Land square
game.put({ type: NAVY, ... }, 'h1') // Land square
```

### Critical Placement Bug

**Game-Breaking Issue**: Navy can be placed on land during deploy phase

- **Problem**: Intermediate state validation missing
- **Impact**: Navy can move first, leaving land pieces on water (invalid state)
- **Severity**: Critical - breaks game rules and creates impossible positions
- **Status**: Identified but not yet fixed

**Validation Logic**:

```typescript
// Current terrain validation
if (newPiece.type === NAVY) {
  if (!NAVY_MASK[sq]) return false // Must be on water or mixed terrain
}

// Stay validation during deployment
function canStayOnSquare(square: number, pieceType: PieceSymbol): boolean {
  return pieceType === NAVY ? !!NAVY_MASK[square] : !!LAND_MASK[square]
}
```

### Capture Type Implications

**Forced Stay Capture Scenarios**:

- **Navy attacking land pieces**: On pure land squares, Navy must use stay
  capture
- **Land pieces attacking Navy**: On pure water squares, must use stay capture
- **Terrain Incompatibility**: Any piece attacking targets on incompatible
  terrain

**Capture Type Matrix**: | Attacker | Target Terrain | Capture Type |
|----------|----------------|--------------| | NAVY | Water | Normal | | NAVY |
Land | Stay Only | | NAVY | Mixed | Normal | | Land Piece | Land | Normal | |
Land Piece | Water | Stay Only |

## Heavy Piece River Crossing Zone Rules and Bridge Mechanics

### Heavy Piece Classification

**HEAVY_PIECES Set**:

- ARTILLERY
- ANTI_AIR (for terrain restrictions only, not air defense functionality)
- MISSILE
- TANK (implied from context)

**Note**: Despite ANTI_AIR being in HEAVY_PIECES set, this is for terrain
restrictions only, not for air defense functionality.

### River Crossing Restrictions

**Zone-Based Movement Limitations**:

- Subject to zone-based movement limitations
- Must use designated crossing points between zones
- Cannot freely cross between terrain zones
- Bridge utilization required for zone transitions

**Bridge Squares**:

- **Strategic Squares**: f6, f7, h6, h7 act as crossing points
- **Files f and h**: Have strategic importance for bridge control
- **Mixed Terrain**: d6, e6, d7, e7 allow both navy and land pieces
- **Bridge Access**: Important for heavy piece river crossing

### Implementation Details

**Zone Validation**:

- Zone validation occurs during move generation
- Bridge utilization checked for heavy piece movement
- Terrain compatibility affects legal move calculation
- Heavy pieces must consider zone placement in positioning

**Strategic Implications**:

- **Positioning Strategy**: Heavy pieces must consider zone placement
- **Bridge Control**: Files f and h become strategically important
- **Timing**: Zone transitions require careful planning
- **Coordination**: Multiple heavy pieces may compete for limited crossing
  points

## Stay Capture vs Normal Capture Decision Logic and Edge Cases

### Decision Matrix

**Terrain-Based Capture Type Selection**:

**Normal Capture Conditions**:

- Attacker can legally move to target square
- Target square terrain compatible with attacker
- No blocking pieces (unless piece ignores blocking)

**Stay Capture Conditions**:

- Attacker cannot legally move to target square
- Target square terrain incompatible with attacker
- Forced when terrain prevents normal capture

**Air Force Special Case**:

- Can choose between normal and stay capture when terrain allows
- Provides tactical flexibility for positioning
- Subject to air defense restrictions (may force suicide capture)

### Complex Scenarios

**Edge Cases**:

1. **Stack Captures**: Capturing pieces in stacks
2. **Heroic Interactions**: Heroic piece capture modifications
3. **Multiple Options**: Choosing between capture types
4. **Terrain Boundaries**: Captures near terrain transitions

**Validation Requirements**:

1. **Target Validation**: Ensure target piece exists and is enemy
2. **Range Validation**: Verify capture is within piece range
3. **Terrain Validation**: Check terrain compatibility for capture type
4. **Blocking Validation**: Apply piece-specific blocking rules

### Implementation Logic

**Capture Type Determination**:

```typescript
// Air Force gets both capture options when terrain allows
if (canLand && pieceData.type === AIR_FORCE) {
  if (!isDeployMove) {
    // Generate both normal and stay capture options
  }
}

// Forced stay capture logic
// When terrain prevents normal capture (e.g., NAVY attacking land)
// - Mechanics: Attacker captures without moving from current square
// - Usage: When terrain prevents normal capture
// - Notation: _ symbol (e.g., T_e5)
```

## Special Mechanics Integration

### Stack System Interactions

**Carrier Determines Rules**:

- Stack moves by carrier's movement rules
- Carrier's special abilities apply to entire stack
- Terrain restrictions based on carrier piece type
- Special mechanics (shoot-over, ignore-blocking) inherited by stack

**Deployment Considerations**:

- Heroic status and special abilities maintained during deployment
- Air defense zones preserved for relevant pieces
- Terrain validation applies to each deployed piece individually
- Stack splitting must account for special mechanics

### Heroic Promotion Effects

**Piece-Specific Enhancements**:

- **Tank**: Gains diagonal movement, retains shoot-over-blocking
- **Missile**: Air defense level increases from 2 to 3
- **Commander**: Movement range unchanged, special rules remain
- **Headquarter**: Transforms from non-combatant to combatant

**Persistence Rules**:

- Heroic status remains until piece is captured or game ends
- Maintained through stack operations and deployment
- Affects move generation and validation
- Integrated with special mechanics (air defense, capture rules)

### Air Defense Zone Calculations

**Zone Creation and Updates**:

- Automatic calculation when pieces move
- Circular area using distance formula (i² + j² ≤ level²)
- Multiple pieces can overlap zones for stronger defense
- Recalculation only for relevant piece types (performance optimization)

**Integration with Special Mechanics**:

- Air Force movement restrictions in defended zones
- Kamikaze mechanics enabled in zones
- Zone stacking allows overlapping coverage
- Performance impact on move generation

## Critical Implementation Gaps

### Missing Test Coverage

**Immediate Priority**:

1. **Tank Shoot-Over-Blocking**: No test validates signature ability
2. **Navy Water-Only Movement**: Comprehensive movement tests needed
3. **Heavy Piece River Crossing**: Zone-based movement validation missing
4. **Stay Capture Mechanics**: Comprehensive testing required

**Edge Case Testing**:

- Complex interaction scenarios between special mechanics
- Boundary conditions and terrain transitions
- Stack operations with special abilities
- Heroic promotion interactions with special rules

### Known Bugs and Issues

**Critical Bugs**:

1. **Navy Land Placement**: Can be placed on land during deploy (game-breaking)
2. **Recombine Missing**: Pieces cannot rejoin stacks during deployment
3. **Intermediate Validation**: No validation after partial deploy
4. **State Mutation**: Board mutated during deploy instead of virtual overlay

**Implementation Inconsistencies**:

- Special rules not consistently applied across all contexts
- Edge cases not handled uniformly
- Performance implications of special mechanics not optimized
- Documentation gaps for undocumented behaviors
