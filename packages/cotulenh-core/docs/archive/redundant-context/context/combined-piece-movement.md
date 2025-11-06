# Combined Piece Movement

## Overview

In CoTuLenh, stacked pieces move as unified units where the carrier piece
determines movement characteristics for the entire stack. This system creates
strategic depth through piece transportation, terrain access, and coordinated
unit movement.

## Movement Determination Hierarchy

### Carrier-Based Movement Rules

The **carrier piece** (primary piece in the stack) determines all movement
characteristics:

- **Movement Pattern**: Carrier's movement rules apply to entire stack
- **Movement Range**: Carrier's range limitations govern stack movement
- **Terrain Restrictions**: Carrier's terrain compatibility affects stack
  placement
- **Special Abilities**: Carrier's special movement abilities extend to carried
  pieces

### Movement Examples by Carrier Type

```typescript
// Tank carrying Infantry: (T|I)
// - Moves like Tank: 2 squares orthogonal
// - Cannot cross rivers (Tank restriction)
// - Infantry benefits from Tank's extended range

// Navy carrying Air Force: (N|F)
// - Moves like Navy: 4 squares all directions, water only
// - Air Force can access water terrain via Navy carrier
// - Maintains Navy's water movement restrictions

// Air Force carrying Tank: (F|T)
// - Moves like Air Force: 4 squares all directions
// - Ignores blocking pieces (Air Force ability)
// - Tank can fly over water and obstacles
// - Subject to air defense restrictions

// Commander carrying Infantry: (C|I)
// - Moves like Commander: infinite orthogonal movement
// - Cannot expose itself to enemy commanders
// - Infantry gains Commander's extended range
```

## Stack Movement Mechanics

### Normal Move Generation

```typescript
// In generateNormalMoves(), stacks generate two types of moves:

// 1. Carrier moves (entire stack moves together)
if (!filterPiece || pieceData.type === filterPiece) {
  const singleMoves = generateMovesForPiece(
    gameInstance,
    from,
    pieceData,
    false,
  )
  moves.push(...singleMoves)
}

// 2. Deploy moves (individual pieces from stack)
if (pieceData.carrying && pieceData.carrying.length > 0) {
  let deployMoveCandidates = flattenPiece(pieceData)
  for (const deployMoveCandidate of deployMoveCandidates) {
    const deployMoves = generateMovesForPiece(
      gameInstance,
      from,
      deployMoveCandidate,
      true,
    )
    deployMoves.forEach((m) => {
      m.flags |= BITS.DEPLOY
      moves.push(m)
    })
  }
}
```

### Move Execution Process

```typescript
const getMovingPieceFromInternalMove = (
  game: CoTuLenh,
  move: InternalMove,
): Piece => {
  const pieceAtFrom = game.get(move.from)
  const requestMovingPieces = flattenPiece(move.piece)
  const movingPiece: Piece[] = []

  // Extract requested pieces from stack
  for (const piece of flattenPiece(pieceAtFrom)) {
    const idx = requestMovingPieces.findIndex((p) => p.type === piece.type)
    if (idx !== -1) {
      movingPiece.push({ ...piece })
      requestMovingPieces.splice(idx, 1)
    }
  }

  // Reconstruct moving stack
  const { combined, uncombined } = createCombineStackFromPieces(movingPiece)
  if (!combined || (uncombined && uncombined.length > 0)) {
    throw new Error(`Not enough pieces to move at ${algebraic(move.from)}`)
  }

  return combined // This is the complete stack that moves
}
```

### Stack Move vs Deploy Move Distinction

```typescript
const isStackMove = (move: InternalMove): boolean => {
  return !!(move.flags & BITS.DEPLOY)
}

// Normal stack move: entire stack moves together
class NormalMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const pieceThatMoved = getMovingPieceFromInternalMove(this.game, this.move)

    if (!isStackMove(this.move)) {
      this.actions.push(new RemovePieceAction(this.game, this.move.from))
    }
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, pieceThatMoved),
    )
  }
}

// Deploy move: individual piece extracted from stack
class SingleDeployMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    this.actions.push(
      new RemoveFromStackAction(this.game, this.move.from, this.move.piece),
    )
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, this.move.piece),
    )
  }
}
```

## Terrain Restrictions for Combined Pieces

### Carrier Terrain Compatibility

The carrier piece's terrain restrictions apply to the entire stack:

```typescript
// Navy carrier: stack restricted to water/mixed terrain
if (combinedPiece.type === NAVY) {
  if (!NAVY_MASK[sq]) return false // Must be on water/mixed
}

// Land piece carrier: stack restricted to land/mixed terrain
else if (combinedPiece.type !== AIR_FORCE) {
  if (!LAND_MASK[sq]) return false // Must be on land/mixed
}

// Air Force carrier: stack can move anywhere
// No terrain restrictions for Air Force carriers
```

### Terrain Access Benefits

Stacking provides terrain access advantages:

```typescript
// Land pieces gain water access via Navy carrier
const landPiece = { type: TANK, color: RED }
const navyCarrier = { type: NAVY, color: RED, carrying: [landPiece] }
// Tank can now move on water squares via Navy

// Navy pieces gain land access via land carrier (if combination allowed)
const navyPiece = { type: NAVY, color: RED }
const tankCarrier = { type: TANK, color: RED, carrying: [navyPiece] }
// Navy can access land squares via Tank (if valid combination)

// All pieces gain universal access via Air Force carrier
const anyPiece = { type: INFANTRY, color: RED }
const airForceCarrier = { type: AIR_FORCE, color: RED, carrying: [anyPiece] }
// Infantry can fly over any terrain via Air Force
```

### Special Terrain Cases

```typescript
// Navy carriers on land squares
if (pieceData.type === NAVY && !LAND_MASK[from]) {
  // Remove carrier from deploy candidates when on pure water
  deployMoveCandidates = deployMoveCandidates.filter(
    (p) => p.type !== pieceData.type,
  )
}
// Navy cannot move as carrier from pure water squares
// But carried pieces can still be deployed individually
```

## Capture and Combat with Combined Pieces

### Stack Capture Mechanics

When a stack captures an enemy piece:

```typescript
class CaptureMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    const pieceThatMoved = getMovingPieceFromInternalMove(this.game, this.move)
    const capturedPieceData = this.game.get(this.move.to)

    // Entire stack participates in capture
    if (!isStackMove(this.move)) {
      this.actions.push(new RemovePieceAction(this.game, this.move.from))
    }
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, pieceThatMoved),
    )

    // Captured piece is destroyed/removed
    this.move.captured = capturedPieceData
  }
}
```

### Combat Range and Abilities

- **Carrier Determines Range**: Stack attacks using carrier's combat range
- **Special Abilities**: Carrier's combat abilities apply to stack attacks
- **Heroic Effects**: Heroic status of carrier affects entire stack combat

### Combat Examples

```typescript
// Tank(+Infantry) attacks enemy at range 2
// - Uses Tank's 2-square attack range
// - Tank's shoot-over-blocking ability applies
// - Entire stack moves to capture square

// Artillery(+Militia) attacks enemy at range 3
// - Uses Artillery's 3-square attack range
// - Artillery's capture-ignores-blocking applies
// - Can attack diagonally (Artillery ability)

// Air Force(+Tank) performs suicide capture
// - Both Air Force and Tank destroyed
// - Enemy piece also destroyed
// - No pieces remain at destination
```

## Heroic Status and Combined Pieces

### Heroic Status Inheritance

```typescript
// Heroic carrier affects entire stack
const heroicTank = { type: TANK, color: RED, heroic: true }
const infantry = { type: INFANTRY, color: RED }
const heroicStack = {
  type: TANK,
  color: RED,
  heroic: true,
  carrying: [infantry],
}

// Stack benefits:
// - Enhanced movement range (Tank +1 range, diagonal movement)
// - Enhanced combat abilities
// - Heroic status preserved during movement
```

### Heroic Enhancement Examples

```typescript
// Heroic Tank(+Infantry): (T+|I)
// - Tank gains +1 range (3 squares) and diagonal movement
// - Infantry benefits from enhanced Tank mobility
// - Stack can attack at extended range with diagonal options

// Heroic Air Force(+Tank): (F+|T)
// - Air Force gains +1 range (5 squares)
// - Tank benefits from enhanced Air Force mobility
// - Stack has extended flight range and capabilities

// Heroic Commander(+Infantry): (C+|I)
// - Commander retains infinite movement
// - Enhanced combat capabilities
// - Infantry gains maximum mobility benefit
```

## Movement Pattern Integration

### Carrier Movement Patterns

Each carrier type imposes its movement characteristics on the stack:

#### Tank Carrier Movement

```typescript
// Tank(+Infantry) movement: (T|I)
// - 2 squares orthogonal (Tank base range)
// - +1 range if heroic (3 squares)
// - Diagonal movement if heroic
// - Shoot-over-blocking ability
// - Cannot cross rivers (heavy piece restriction)
```

#### Navy Carrier Movement

```typescript
// Navy(+Air Force) movement: (N|F)
// - 4 squares all directions (Navy range)
// - Water/mixed terrain only
// - Capture-ignores-blocking ability
// - Can use torpedo vs naval gun attacks
```

#### Air Force Carrier Movement

```typescript
// Air Force(+Tank) movement: (F|T)
// - 4 squares all directions (Air Force range)
// - Move-ignores-blocking and capture-ignores-blocking
// - Universal terrain access
// - Subject to air defense restrictions
// - Can perform suicide captures
```

#### Commander Carrier Movement

```typescript
// Commander(+Infantry) movement: (C|I)
// - Infinite orthogonal movement (Commander ability)
// - Cannot expose to enemy commanders
// - 1-square capture range (Commander restriction)
// - Flying general rule applies to entire stack
```

## Deployment from Combined Pieces

### Deployment Options

Combined pieces can deploy in multiple ways:

```typescript
// Original stack: Navy(+Air Force+Tank) at c3
const originalStack = {
  type: NAVY,
  color: RED,
  carrying: [
    { type: AIR_FORCE, color: RED },
    { type: TANK, color: RED },
  ],
}

// Deployment options:
// 1. Move entire stack: (N|FT) → a3
// 2. Deploy Air Force: F → c6, (N|T) stays at c3
// 3. Deploy Tank: T → d3, (N|F) stays at c3
// 4. Deploy Navy: N → a3, (F|T) stays at c3
// 5. Deploy Air Force+Tank: (F|T) → c6, N stays at c3
// 6. Deploy all separately: N → a3, F → c6, T → d3
```

### Deployment Validation

```typescript
// Ensure deployed pieces can exist on target terrain
const deployMove: DeployMoveRequest = {
  from: 'c3',
  moves: [
    { piece: { type: NAVY, color: RED }, to: 'a3' }, // Navy to water
    { piece: { type: TANK, color: RED }, to: 'd3' }, // Tank to land
  ],
  stay: { type: AIR_FORCE, color: RED }, // Air Force stays (any terrain)
}

// Validation checks:
// - Navy can exist on water at a3 ✓
// - Tank can exist on land at d3 ✓
// - Air Force can stay at c3 (mixed terrain) ✓
```

## Performance and Optimization

### Movement Generation Efficiency

```typescript
// Stack movement generation is optimized for:
// 1. Carrier move generation (single piece logic)
// 2. Deploy move generation (per-piece basis)
// 3. Legal move filtering (stack-aware validation)

// Avoid redundant calculations:
const singleMoves = generateMovesForPiece(gameInstance, from, pieceData, false)
// Reuse carrier movement logic for entire stack
```

### Memory Management

```typescript
// Stack movement preserves piece structure:
const pieceThatMoved = getMovingPieceFromInternalMove(this.game, this.move)
// Deep copy maintains carrying relationships
// Undo operations restore complete stack structure
```

### Cache Considerations

- **Move Caching**: Stack moves cached by carrier type and position
- **Legal Move Filtering**: Stack-aware legal move validation
- **State Consistency**: Stack movement maintains game state integrity

## Integration with Game Systems

### FEN Representation

```typescript
// Stack movement updates FEN notation:
// Before: "5c5/11/4(NFT)6/11/11/11/11/11/11/11/11/5C5 r - - 0 1"
// After:  "5c5/11/11/11/11/11/4(NFT)6/11/11/11/11/5C5 b - - 0 2"
// Entire stack notation moves as unit
```

### SAN Notation

```typescript
// Stack movement notation:
'Nc2-a3' // Navy stack moves to a3
'(NFT)c3-a3' // Complex stack move with full notation
'Tc3xd4' // Tank stack captures at d4
'(T|I)e5&f5(T|IM)' // Tank+Infantry combines with Militia at f5
```

### Legal Move Validation

```typescript
// Stack moves must pass legal move validation:
// - Commander exposure checks apply to stacks with commanders
// - Air defense restrictions affect stacks with air force
// - Terrain compatibility validated for carrier piece
// - Capture validation considers entire stack capabilities
```

## Strategic Implications

### Tactical Advantages

- **Enhanced Mobility**: Carried pieces gain carrier's movement abilities
- **Terrain Access**: Pieces access otherwise forbidden terrain
- **Coordinated Movement**: Multiple pieces move as single unit
- **Protected Transport**: Valuable pieces protected within stacks

### Strategic Considerations

- **Carrier Vulnerability**: Losing carrier affects entire stack
- **Terrain Dependency**: Stack mobility limited by carrier's terrain
  restrictions
- **Deployment Timing**: When to move as unit vs deploy separately
- **Resource Concentration**: Benefits vs risks of piece concentration
