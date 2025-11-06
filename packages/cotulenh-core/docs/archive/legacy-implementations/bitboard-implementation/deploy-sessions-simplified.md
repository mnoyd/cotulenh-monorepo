# Deploy Sessions: The Bitboard Simplification

## The Key Insight

Deploy sessions seem complex, but with bitboards they're actually **surprisingly
simple**:

✅ **Same movement rules** - pieces move exactly the same as normal ✅ **Same
origin point** - all pieces depart from the stack square  
✅ **No turn switching** - turn only switches when deploy completes ✅ **Stack
tracking** - just track which pieces remain at origin

## Deploy Session Fundamentals

### What Deploy Really Is

```typescript
// Deploy is just:
// 1. Multiple normal moves from the same starting square
// 2. Turn doesn't switch until all pieces moved
// 3. Track remaining pieces at origin square

interface DeploySession {
  originSquare: number // Where the stack was
  originalPieces: PieceSymbol[] // What pieces were in the stack
  remainingPieces: PieceSymbol[] // What pieces are still at origin
  deployedPieces: Array<{
    // What pieces have moved
    piece: PieceSymbol
    destination: number
    captured?: PieceSymbol
  }>
}
```

### Deploy State Tracking

```typescript
class DeployState {
  private activeSession: DeploySession | null = null

  // Start deploy session
  startDeploy(stackSquare: number, stackPieces: PieceSymbol[]): void {
    this.activeSession = {
      originSquare: stackSquare,
      originalPieces: [...stackPieces],
      remainingPieces: [...stackPieces],
      deployedPieces: [],
    }
  }

  // Check if deploy is active
  isDeployActive(): boolean {
    return this.activeSession !== null
  }

  // Check if deploy is complete
  isDeployComplete(): boolean {
    return this.activeSession?.remainingPieces.length === 0
  }

  // Get remaining pieces that can move
  getRemainingPieces(): PieceSymbol[] {
    return this.activeSession?.remainingPieces || []
  }
}
```

## Deploy Move Generation

### Generate Moves for Remaining Pieces

```typescript
class DeployMoveGeneration {
  private deployState: DeployState
  private terrain: TerrainBitboards

  constructor(deployState: DeployState, terrain: TerrainBitboards) {
    this.deployState = deployState
    this.terrain = terrain
  }

  // Generate all possible deploy moves
  generateDeployMoves(
    occupancy: Bitboard,
    friendlyPieces: Bitboard,
    enemyPieces: Bitboard,
    heroicPieces: Bitboard,
  ): Move[] {
    if (!this.deployState.isDeployActive()) {
      return []
    }

    const moves: Move[] = []
    const session = this.deployState.activeSession!
    const originSquare = session.originSquare

    // Generate moves for each remaining piece
    for (const pieceType of session.remainingPieces) {
      const isHeroic = (heroicPieces & (1n << BigInt(originSquare))) !== 0n

      // Generate normal moves for this piece type from origin
      const pieceMoves = this.generatePieceDeployMoves(
        pieceType,
        originSquare,
        occupancy,
        friendlyPieces,
        enemyPieces,
        isHeroic,
      )

      moves.push(...pieceMoves)
    }

    return moves
  }

  private generatePieceDeployMoves(
    pieceType: PieceSymbol,
    originSquare: number,
    occupancy: Bitboard,
    friendlyPieces: Bitboard,
    enemyPieces: Bitboard,
    isHeroic: boolean,
  ): Move[] {
    // Use existing move generation - deploy moves are just normal moves!
    const completeMoveGen = new CompleteMoveGeneration(this.terrain)

    // Generate all moves for this piece type from origin square
    const allMoves = completeMoveGen.generateCompleteMoves(
      pieceType,
      originSquare,
      occupancy,
      friendlyPieces,
      enemyPieces,
      isHeroic,
    )

    // Convert to deploy moves
    return allMoves.map((move) => ({
      ...move,
      type: this.convertToDeployMoveType(move.type),
      deployPiece: pieceType, // Track which piece is moving
    }))
  }

  private convertToDeployMoveType(moveType: string): string {
    switch (moveType) {
      case 'normal':
        return 'deploy-step'
      case 'capture':
        return 'deploy-capture'
      case 'combine':
        return 'deploy-combine'
      default:
        return 'deploy-step'
    }
  }
}
```

## Deploy Move Application

### Applying Deploy Moves

```typescript
class DeployMoveApplication {
  private deployState: DeployState
  private pieces: GameBitboards

  constructor(deployState: DeployState, pieces: GameBitboards) {
    this.deployState = deployState
    this.pieces = pieces
  }

  // Apply a deploy move
  applyDeployMove(move: DeployMove): void {
    const session = this.deployState.activeSession!

    // 1. Remove piece from origin stack
    this.removePieceFromOrigin(move.deployPiece)

    // 2. Apply the move (same as normal move)
    this.applyNormalMove(move)

    // 3. Update deploy session
    session.remainingPieces = session.remainingPieces.filter(
      (p) => p !== move.deployPiece,
    )

    session.deployedPieces.push({
      piece: move.deployPiece,
      destination: move.to,
      captured: move.capturedPiece,
    })

    // 4. Check if deploy is complete
    if (this.deployState.isDeployComplete()) {
      this.completeDeploy()
    }
  }

  private removePieceFromOrigin(pieceType: PieceSymbol): void {
    const session = this.deployState.activeSession!
    const originBit = 1n << BigInt(session.originSquare)

    // Remove piece from appropriate bitboard
    const pieceBitboard = this.pieces.getPieceBitboard(pieceType, 'red') // Example
    this.pieces.setPieceBitboard(pieceType, 'red', pieceBitboard & ~originBit)

    // If no more pieces at origin, clear the square
    if (session.remainingPieces.length === 1) {
      // This is the last piece
      // Origin square becomes empty
    }
  }

  private applyNormalMove(move: DeployMove): void {
    // This is exactly the same as applying a normal move!
    const toBit = 1n << BigInt(move.to)

    // Handle capture if any
    if (move.type === 'deploy-capture') {
      // Remove captured piece
      // ... same capture logic as normal moves
    }

    // Place piece at destination
    const pieceBitboard = this.pieces.getPieceBitboard(move.deployPiece, 'red')
    this.pieces.setPieceBitboard(move.deployPiece, 'red', pieceBitboard | toBit)
  }

  private completeDeploy(): void {
    // Deploy complete - clear session and switch turn
    this.deployState.activeSession = null
    // Turn switching happens here
  }
}
```

## Stack Representation with Bitboards

### Multiple Pieces at Same Square

```typescript
class StackRepresentation {
  // Track multiple pieces at same square using separate bitboards
  private pieces: {
    [pieceType: string]: {
      red: Bitboard
      blue: Bitboard
    }
  }

  // Get all pieces at a square
  getPiecesAtSquare(square: number): PieceSymbol[] {
    const squareBit = 1n << BigInt(square)
    const piecesAtSquare: PieceSymbol[] = []

    // Check each piece type
    for (const [pieceType, colorBitboards] of Object.entries(this.pieces)) {
      if (colorBitboards.red & squareBit) {
        piecesAtSquare.push(pieceType as PieceSymbol)
      }
      if (colorBitboards.blue & squareBit) {
        piecesAtSquare.push(pieceType as PieceSymbol)
      }
    }

    return piecesAtSquare
  }

  // Check if square has a stack (multiple pieces)
  isStack(square: number): boolean {
    return this.getPiecesAtSquare(square).length > 1
  }

  // Get stack composition
  getStackComposition(square: number): {
    carrier: PieceSymbol
    carried: PieceSymbol[]
  } {
    const pieces = this.getPiecesAtSquare(square)

    if (pieces.length <= 1) {
      throw new Error('Not a stack')
    }

    // First piece is carrier, rest are carried
    return {
      carrier: pieces[0],
      carried: pieces.slice(1),
    }
  }
}
```

## Deploy Session Examples

### Example 1: Simple Deploy

```typescript
// Initial: Stack at e5 with Navy + [Air Force, Tank]
// Bitboards:
//   navyBitboard: ...010000... (bit for e5 set)
//   airForceBitboard: ...010000... (bit for e5 set)
//   tankBitboard: ...010000... (bit for e5 set)

// Start deploy
deployState.startDeploy(squareToBit(4, 4), [NAVY, AIR_FORCE, TANK])

// Deploy step 1: Navy moves to e7
applyDeployMove({
  type: 'deploy-step',
  from: squareToBit(4, 4), // e5
  to: squareToBit(4, 6), // e7
  deployPiece: NAVY,
})

// Result:
//   navyBitboard: ...010000010000... (e5 cleared, e7 set)
//   airForceBitboard: ...010000... (still at e5)
//   tankBitboard: ...010000... (still at e5)
//   remainingPieces: [AIR_FORCE, TANK]

// Deploy step 2: Air Force moves to d7
applyDeployMove({
  type: 'deploy-step',
  from: squareToBit(4, 4), // e5
  to: squareToBit(3, 6), // d7
  deployPiece: AIR_FORCE,
})

// Result:
//   airForceBitboard: ...001000... (e5 cleared, d7 set)
//   tankBitboard: ...010000... (still at e5)
//   remainingPieces: [TANK]

// Deploy step 3: Tank moves to d5 (deploy complete!)
applyDeployMove({
  type: 'deploy-step',
  from: squareToBit(4, 4), // e5
  to: squareToBit(3, 4), // d5
  deployPiece: TANK,
})

// Result:
//   tankBitboard: ...001000... (e5 cleared, d5 set)
//   remainingPieces: [] (empty - deploy complete!)
//   Turn switches!
```

### Example 2: Deploy with Recombine

```typescript
// Navy at e7, Tank still at e5 in deploy session
// Tank can move to e7 to recombine with Navy

// This is just a normal combine move during deploy!
applyDeployMove({
  type: 'deploy-combine',
  from: squareToBit(4, 4), // e5
  to: squareToBit(4, 6), // e7 (where Navy is)
  deployPiece: TANK,
})

// Result: Both Navy and Tank at e7 (stack reformed)
```

## The Beautiful Simplicity

### Why Deploy is Simple with Bitboards

**1. Same Movement Rules**

```typescript
// Deploy move generation = normal move generation from origin square
const deployMoves = generateNormalMoves(pieceType, originSquare, ...)
```

**2. Same Move Application**

```typescript
// Deploy move application = normal move application
applyNormalMove(deployMove)
```

**3. Simple State Tracking**

```typescript
// Just track which pieces remain at origin
remainingPieces = originalPieces.filter((p) => !hasDeployed(p))
```

**4. Turn Management**

```typescript
// Turn switches only when remainingPieces.length === 0
if (deployState.isDeployComplete()) {
  switchTurn()
}
```

## Performance Benefits

### Deploy Sessions are Fast

- **Move generation:** Same speed as normal moves
- **State tracking:** Simple array operations
- **Bitboard updates:** Same as normal moves
- **No special cases:** Deploy moves are just normal moves with different turn
  logic

### Memory Efficiency

- **No virtual state:** Just track remaining pieces list
- **Same bitboards:** No additional memory overhead
- **Simple session:** Just origin square + piece lists

## Integration with Game State

### Complete Deploy System

```typescript
class BitboardGameWithDeploy {
  private pieces: GameBitboards
  private deployState: DeployState
  private turn: Color

  // Generate all legal moves (normal + deploy)
  generateLegalMoves(): Move[] {
    if (this.deployState.isDeployActive()) {
      // Deploy mode: only generate deploy moves
      return this.generateDeployMoves()
    } else {
      // Normal mode: generate normal moves
      return this.generateNormalMoves()
    }
  }

  // Apply any move (normal or deploy)
  applyMove(move: Move): void {
    if (move.type.startsWith('deploy-')) {
      this.applyDeployMove(move as DeployMove)

      // Check if turn should switch (deploy complete)
      if (this.deployState.isDeployComplete()) {
        this.switchTurn()
      }
    } else {
      this.applyNormalMove(move)
      this.switchTurn() // Normal moves always switch turn
    }
  }

  private switchTurn(): void {
    this.turn = this.turn === 'red' ? 'blue' : 'red'
  }
}
```

## Summary

### Deploy Sessions: Not a Headache Anymore! 🎯

✅ **Deploy moves = Normal moves** from origin square ✅ **Same bitboard
operations** - no special handling needed ✅ **Simple state tracking** - just
remaining pieces list ✅ **Turn logic** - switch only when deploy complete ✅
**Performance** - same speed as normal moves ✅ **Memory** - minimal overhead

**The key insight:** Deploy sessions are just **batched normal moves** with
**delayed turn switching**. With bitboards, they become **trivially simple**! 🚀
