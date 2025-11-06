# Heroic Promotion System

## Overview

The heroic promotion system is a core mechanic in CoTuLenh where pieces that
attack (threaten) the enemy commander automatically become "heroic" and gain
enhanced abilities. This system adds strategic depth by rewarding aggressive
play against the enemy commander while providing enhanced tactical capabilities.

## Heroic Promotion Trigger

### When Pieces Become Heroic

**Primary Trigger**: Any piece that attacks (threatens) the enemy commander
becomes heroic immediately after the move is executed.

**Implementation Details**:

- Heroic promotion is handled by the `CheckAndPromoteAttackersAction` class
- This action is automatically executed after every move via the command pattern
- The system uses `game.getAttackers(commanderSquare, attackingColor)` to
  identify all pieces threatening the enemy commander
- Only pieces that are NOT already heroic get promoted (prevents redundant
  promotions)

**Code Flow**:

```typescript
// After each move execution:
1. Get enemy commander position: game.getCommanderSquare(enemyColor)
2. Find all attacking pieces: game.getAttackers(commanderSquare, movingColor)
3. For each attacker that is not already heroic:
   - Create SetHeroicAction(game, square, pieceType, true)
   - Execute the promotion immediately
4. Store all promotion actions for potential undo
```

### Automatic and Immediate

- **Automatic**: Players do not choose when pieces become heroic - it happens
  automatically
- **Immediate**: Promotion occurs immediately after the move that creates the
  threat
- **Persistent**: Heroic status remains until the piece is captured or the game
  ends
- **Undoable**: Heroic promotions are properly tracked and can be undone with
  move undo

## Heroic Effects by Piece Type

### Universal Heroic Enhancements

All pieces (except COMMANDER and HEADQUARTER special cases) receive these
enhancements when heroic:

1. **Range Increase**: `moveRange` and `captureRange` both increase by +1
   (except infinity ranges)
2. **Diagonal Movement**: `canMoveDiagonal` becomes `true` (enables diagonal
   movement for all pieces)

### Piece-Specific Heroic Effects

#### COMMANDER

- **Movement Range**: Remains infinite orthogonal (unchanged)
- **Capture Range**: Remains 1 square adjacent (unchanged)
- **Diagonal Movement**: Gains diagonal movement capability
- **Special**: No range increases since movement is already infinite

#### INFANTRY, ENGINEER, ANTI_AIR

**Base Configuration**:

- Move Range: 1, Capture Range: 1, Diagonal: false

**Heroic Configuration**:

- Move Range: 2, Capture Range: 2, Diagonal: true
- **Key Enhancement**: Gains diagonal movement (major tactical improvement)

#### TANK

**Base Configuration**:

- Move Range: 2, Capture Range: 2, Diagonal: false
- Special: Shoot-over-blocking ability

**Heroic Configuration**:

- Move Range: 3, Capture Range: 3, Diagonal: true
- **Key Enhancement**: Extended range + diagonal movement + retains shoot-over
  ability

#### MILITIA

**Base Configuration**:

- Move Range: 1, Capture Range: 1, Diagonal: true

**Heroic Configuration**:

- Move Range: 2, Capture Range: 2, Diagonal: true
- **Key Enhancement**: Extended range while retaining diagonal capability

#### ARTILLERY

**Base Configuration**:

- Move Range: 3, Capture Range: 3, Diagonal: true
- Special: Capture-ignores-blocking

**Heroic Configuration**:

- Move Range: 4, Capture Range: 4, Diagonal: true
- **Key Enhancement**: Extended range while retaining ignore-blocking ability

#### MISSILE

**Base Configuration**:

- Move Range: 2, Capture Range: 2, Diagonal: true
- Special: Capture-ignores-blocking, special range rules

**Heroic Configuration**:

- Move Range: 3, Capture Range: 3, Diagonal: true
- **Key Enhancement**: Extended range while retaining all special abilities

#### AIR_FORCE

**Base Configuration**:

- Move Range: 4, Capture Range: 4, Diagonal: true
- Special: Move-ignores-blocking, capture-ignores-blocking

**Heroic Configuration**:

- Move Range: 5, Capture Range: 5, Diagonal: true
- **Key Enhancement**: Maximum range extension while retaining flight abilities

#### NAVY

**Base Configuration**:

- Move Range: 4, Capture Range: 4, Diagonal: true
- Special: Capture-ignores-blocking, naval attack mechanisms

**Heroic Configuration**:

- Move Range: 5, Capture Range: 5, Diagonal: true
- **Key Enhancement**: Maximum range extension while retaining naval abilities

#### HEADQUARTER (Special Case)

**Base Configuration**:

- Move Range: 0, Capture Range: 0, Diagonal: false (immobile)

**Heroic Configuration**:

- Move Range: 1, Capture Range: 1, Diagonal: true
- **Key Enhancement**: Transforms from immobile to mobile (like heroic militia)

## Heroic Status in Stacks

### Stack Inheritance Rules

**Individual Heroic Status**: Each piece in a stack maintains its own heroic
status independently.

**Promotion in Stacks**: When a stack attacks an enemy commander:

- ALL pieces in the stack that can attack the commander become heroic
- Each piece is promoted individually using `SetHeroicAction`
- Carried pieces can become heroic independently of their carrier

**Implementation Details**:

```typescript
// Stack heroic promotion example:
// Navy carrying Air Force attacks commander
// Both Navy and Air Force become heroic if not already heroic
for (const { square, type } of attackers) {
  const isHeroic = this.game.getHeroicStatus(square, type)
  if (!isHeroic) {
    const promoteAction = new SetHeroicAction(this.game, square, type, true)
    // Promotes specific piece type at the square
  }
}
```

### Heroic Status Management in Stacks

**Getting Heroic Status**:

```typescript
// Check main piece heroic status
game.getHeroicStatus(square)

// Check specific piece type in stack
game.getHeroicStatus(square, INFANTRY)
```

**Setting Heroic Status**:

```typescript
// Set main piece heroic status
game.setHeroicStatus(square, undefined, true)

// Set specific piece type in stack
game.setHeroicStatus(square, AIR_FORCE, true)
```

### Deployment and Heroic Status

**Heroic Status Preservation**: When pieces are deployed from stacks, they
retain their heroic status.

**Deployment Scenarios**:

1. **Heroic Carrier + Non-heroic Carried**: Carrier deploys with heroic status,
   carried pieces deploy with their individual status
2. **Non-heroic Carrier + Heroic Carried**: Carried pieces retain heroic status
   when deployed
3. **All Heroic Stack**: All pieces retain heroic status when deployed
   individually

## Data Format Representation

### FEN Notation

**Heroic Marker**: Heroic pieces are marked with `+` prefix in FEN strings.

**Examples**:

- `+I` = Heroic Infantry
- `+T` = Heroic Tank
- `+C` = Heroic Commander
- `N(+I+A)` = Navy carrying heroic Infantry and heroic Anti-Air

### SAN Notation

**Heroic Prefix**: Heroic pieces use `+` prefix in Standard Algebraic Notation.

**Examples**:

- `+Id4` = Heroic Infantry moves to d4
- `+Txe5` = Heroic Tank captures on e5
- `+Ce12+` = Heroic Commander moves to e12 with check

### Internal Representation

**Piece Object Structure**:

```typescript
interface Piece {
  type: PieceSymbol
  color: Color
  heroic?: boolean // Optional boolean flag
  carrying?: Piece[] // Carried pieces can also have heroic status
}
```

## Strategic Implications

### Tactical Advantages

1. **Enhanced Mobility**: Diagonal movement for previously orthogonal-only
   pieces
2. **Extended Range**: Increased attack and movement ranges
3. **Tactical Flexibility**: More options for piece positioning and attacks
4. **Endgame Power**: Heroic pieces become significantly more powerful in
   simplified positions

### Strategic Considerations

1. **Risk vs Reward**: Attacking the enemy commander exposes pieces but grants
   powerful enhancements
2. **Timing**: Choosing when to sacrifice positioning for heroic promotion
3. **Stack Coordination**: Using stacks to create multiple heroic pieces
   simultaneously
4. **Defensive Awareness**: Protecting your commander while exploiting enemy
   commander exposure

### Common Tactical Patterns

1. **Heroic Sacrifice**: Deliberately exposing pieces to attack enemy commander
   for heroic promotion
2. **Stack Heroic Promotion**: Using combined pieces to attack commander and
   promote multiple pieces
3. **Heroic Endgame**: Leveraging enhanced heroic pieces in simplified positions
4. **Commander Hunting**: Using heroic pieces' enhanced abilities to pursue
   enemy commander

## Implementation Notes

### Command Pattern Integration

The heroic promotion system is fully integrated with the command pattern for
proper undo/redo functionality:

```typescript
class CheckAndPromoteAttackersAction implements CTLAtomicMoveAction {
  private heroicActions: SetHeroicAction[] = []

  execute(): void {
    // Find and promote all attacking pieces
  }

  undo(): void {
    // Undo all promotions in reverse order
    for (let i = this.heroicActions.length - 1; i >= 0; i--) {
      this.heroicActions[i].undo()
    }
  }
}
```

### Performance Considerations

- Heroic status checks are performed after every move
- `getAttackers()` method is called to identify threatening pieces
- Promotion actions are batched and executed efficiently
- Undo operations properly restore previous heroic states

### Error Handling

- Promotion only occurs for pieces that exist and are not already heroic
- Stack-based heroic status changes are handled with immutable updates
- Failed promotions do not break the move execution chain

## Testing and Validation

### Key Test Scenarios

1. **Basic Promotion**: Piece becomes heroic after attacking commander
2. **Enhanced Movement**: Heroic pieces gain expected movement enhancements
3. **Stack Promotion**: Multiple pieces in stack become heroic simultaneously
4. **Undo Functionality**: Heroic promotions are properly undone
5. **FEN Representation**: Heroic status is correctly encoded/decoded in FEN
6. **SAN Notation**: Heroic pieces are properly represented in move notation

### Edge Cases

1. **Already Heroic**: Pieces that are already heroic are not re-promoted
2. **Commander Capture**: Heroic status effects when commanders are captured
3. **Stack Deployment**: Heroic status preservation during piece deployment
4. **Multiple Attackers**: Handling multiple pieces attacking commander
   simultaneously
