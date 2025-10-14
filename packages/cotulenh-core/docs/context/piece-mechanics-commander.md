# COMMANDER Piece Mechanics

## Overview

The COMMANDER is the most critical piece in CoTuLenh, equivalent to the king in
traditional chess. The game is won by capturing the opponent's commander or
achieving checkmate. The commander has unique movement and capture rules that
distinguish it from all other pieces.

## Basic Properties

- **Symbol**: `c` (lowercase for blue, `C` uppercase for red)
- **Movement Range**: Infinite orthogonal (horizontal and vertical)
- **Capture Range**: 1 square (adjacent only)
- **Diagonal Movement**: No (orthogonal only)
- **Terrain Restrictions**: Land pieces only (cannot move on water squares)

## Movement Rules

### Normal Movement

- **Range**: Unlimited distance orthogonally (north, south, east, west)
- **Blocking**: Cannot move through or past any piece (friendly or enemy)
- **Terrain**: Must stay on land squares (LAND_MASK squares)

### Special Movement Restrictions

1. **Cannot slide past enemy commander**: If an enemy commander is visible
   orthogonally in the line of movement, the commander cannot move to any square
   beyond where it would capture that commander
2. **Blocked by all pieces**: Unlike some pieces that can ignore blocking,
   commanders are always blocked by any piece in their path

## Capture Rules

### Adjacent Capture Only

- **Range**: Exactly 1 square orthogonally adjacent
- **Cannot capture at distance**: Even though commanders can move unlimited
  distance, they can only capture pieces exactly 1 square away
- **No diagonal captures**: Commanders cannot capture diagonally under any
  circumstances

### Special Commander vs Commander Rule

- **Immediate capture**: When a commander sees an enemy commander orthogonally
  (regardless of distance or blocking pieces), it can immediately capture the
  enemy commander
- **Ignores normal capture range**: This special rule overrides the normal
  1-square capture limitation
- **Ignores blocking**: This capture can happen even if there are pieces between
  the two commanders
- **Orthogonal only**: This special rule only applies to orthogonal lines of
  sight (not diagonal)

## Flying General Rule (Commander Exposure)

### Definition

The "flying general" rule prevents commanders from being directly exposed to
each other orthogonally with no pieces between them.

### Implementation

- **Orthogonal exposure check**: Commanders cannot be on the same rank or file
  with no pieces between them
- **Legal move filtering**: Any move that would result in commander exposure is
  considered illegal
- **Both directions**: The rule applies regardless of which commander would be
  "attacking"

### Practical Effect

- Commanders act as mutual blockers for each other's movement
- Creates tactical considerations for piece placement between commanders
- Prevents certain endgame scenarios where commanders could "stare down" each
  other

## Heroic Status Effects

### Heroic Promotion

- **Trigger**: Any piece that attacks (threatens) the enemy commander becomes
  heroic
- **Automatic**: This promotion happens immediately when the attack is
  established
- **Persistent**: Heroic status remains until the piece is captured or the game
  ends

### Heroic Commander Abilities

When a commander becomes heroic (by attacking the enemy commander):

- **Movement Range**: Still infinite orthogonal (unchanged)
- **Capture Range**: Still 1 square adjacent (unchanged)
- **Diagonal Movement**: Gains ability to move and capture diagonally
- **Diagonal Range**: 1 square diagonally for both movement and capture

## Terrain Interactions

### Land Restriction

- **Water squares**: Commanders cannot move to or stay on water squares
  (NAVY_MASK = 0)
- **Mixed zones**: Can move on mixed terrain squares where both land and water
  pieces can exist
- **Bridge squares**: Can cross bridge squares that connect land areas

### Heavy Piece Rules

Commanders are not classified as heavy pieces, so they are not subject to river
crossing restrictions that apply to ARTILLERY, ANTI_AIR, and MISSILE pieces.

## Game State Impact

### Commander Position Tracking

- **Internal tracking**: The game maintains the exact square position of each
  commander
- **Check detection**: Used for determining if a commander is under attack
- **Legal move validation**: Used for filtering moves that would leave commander
  in check or exposed

### Game Ending Conditions

- **Checkmate**: Commander is attacked and has no legal moves to escape
- **Commander capture**: If a commander is captured, the game ends immediately
- **Stalemate**: Commander is not in check but has no legal moves (draw
  condition)

## Special Interactions

### With Other Pieces

- **Blocking effect**: Commanders block the movement of all other pieces
- **Cannot be carried**: Commanders cannot be carried by other pieces in stacks
- **Cannot carry others**: Commanders cannot carry other pieces (no stacking
  ability)

### Air Defense Zones

- **Not affected**: Commanders are not affected by air defense zones (they're
  not air pieces)
- **Cannot create zones**: Commanders do not create air defense zones

## Code Implementation Details

### Movement Configuration

```typescript
[COMMANDER]: {
  moveRange: Infinity,
  captureRange: 1,
  canMoveDiagonal: false,
  captureIgnoresPieceBlocking: false,
  moveIgnoresBlocking: false,
  specialRules: { commanderAdjacentCaptureOnly: true },
}
```

### Special Commander Capture Logic

The code implements a special case for commander vs commander captures:

- Checks if moving piece is COMMANDER
- Checks if target piece is enemy COMMANDER
- Checks if movement is orthogonal
- If all conditions met, allows immediate capture regardless of range or
  blocking

### Flying General Implementation

The `_isCommanderExposed()` method checks all orthogonal directions from the
commander's position to ensure no direct line of sight exists to the enemy
commander.

## Strategic Considerations

### Positioning

- **Central control**: Commanders in central positions have maximum mobility
- **Edge limitations**: Commanders near board edges have reduced movement
  options
- **Defensive positioning**: Keep friendly pieces between commanders to prevent
  exposure

### Tactical Uses

- **Long-range movement**: Use unlimited orthogonal movement for rapid
  repositioning
- **Piece coordination**: Position to support other pieces while maintaining
  safety
- **Endgame activity**: In endgames, active commander participation becomes
  crucial

### Common Mistakes

- **Forgetting capture range**: Players often assume commanders can capture at
  distance like they can move
- **Ignoring exposure rule**: Moving pieces that expose commanders to each other
- **Underestimating mobility**: Not utilizing the commander's unlimited movement
  range effectively
