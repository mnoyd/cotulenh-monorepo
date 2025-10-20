# Design Document: Virtual Deploy State Architecture

## Overview

This design implements a unified virtual state architecture for CoTuLenh that
completely replaces the existing deploy system. The new architecture uses a
virtual state overlay that stages all changes during deploy sessions without
mutating the real board until completion, while normal moves continue to work
with direct board updates.

## Architecture

### Core Concept: Dual-Mode State Management

The system operates in two distinct modes:

1. **Normal Mode**: Direct board mutation with immediate turn switching
2. **Deploy Mode**: Virtual state overlay with deferred commits and turn
   preservation

```typescript
interface MoveContext {
  isDeployMode: boolean
  deploySession?: DeploySession
}

class GameState {
  makeMove(move: Move): UndoInfo {
    const context: MoveContext = {
      isDeployMode: this.deploySession !== null,
      deploySession: this.deploySession,
    }

    return this.applyMove(move, context)
  }
}
```

### Virtual State Overlay System

```mermaid
graph TB
    A[Game State] --> B[Real Board]
    A --> C[Deploy Session]
    C --> D[Virtual Changes Map]
    C --> E[Move History]
    C --> F[Session Metadata]

    G[getEffectiveBoard()] --> H{Deploy Active?}
    H -->|No| B
    H -->|Yes| I[Virtual Board]
    I --> B
    I --> D
```

## Components and Interfaces

### 1. Enhanced Deploy Session

```typescript
interface DeploySession {
  // Original state
  originalSquare: Square
  originalStack: Piece[]

  // Virtual state overlay
  virtualChanges: Map<Square, Piece | null>

  // Move tracking
  movedPieces: Array<{
    piece: Piece
    from: Square
    to: Square
    captured?: Piece
  }>

  stayingPieces: Piece[]

  // Session metadata
  startedByColor: Color
  isComplete: boolean

  // Helper methods
  getEffectivePiece(board: Board, square: Square): Piece | null
  getRemainingPieces(): Piece[]
  hasMoved(piece: Piece): boolean
}
```

### 2. Virtual Board Implementation

```typescript
class VirtualBoard {
  constructor(
    private realBoard: Board,
    private deploySession: DeploySession,
  ) {}

  get(square: Square): Piece | null {
    // Check virtual changes first
    if (this.deploySession.virtualChanges.has(square)) {
      return this.deploySession.virtualChanges.get(square)!
    }

    // Fall back to real board
    return this.realBoard.get(square)
  }

  set(square: Square, piece: Piece | null): void {
    // Always update virtual state during deploy
    this.deploySession.virtualChanges.set(square, piece)
  }

  *pieces(color?: Color): Generator<[Square, Piece]> {
    const seen = new Set<Square>()

    // Virtual pieces first
    for (const [square, piece] of this.deploySession.virtualChanges) {
      if (piece && (!color || piece.color === color)) {
        yield [square, piece]
        seen.add(square)
      }
    }

    // Real pieces (not overridden)
    for (const [square, piece] of this.realBoard.pieces(color)) {
      if (!seen.has(square)) {
        yield [square, piece]
      }
    }
  }
}
```

### 3. Unified Move Application System

```typescript
class GameState {
  private applyMove(move: Move, context: MoveContext): UndoInfo {
    switch (move.type) {
      case 'normal':
        return this.applyNormalMove(move, context)
      case 'capture':
        return this.applyCaptureMove(move, context)
      case 'deploy-step':
        return this.applyDeployMove(move, context)
      case 'deploy-recombine':
        return this.applyRecombineMove(move, context)
    }
  }

  private applyNormalMove(move: NormalMove, context: MoveContext): UndoInfo {
    const undo = this.createUndoInfo(move)
    const piece = this.getEffectiveBoard().get(move.from)

    if (context.isDeployMode) {
      // DEPLOY MODE: Stage in virtual state
      const session = context.deploySession!
      session.virtualChanges.set(
        move.from,
        this.getStackAfterRemoval(move.from, piece),
      )
      session.virtualChanges.set(move.to, piece)

      session.movedPieces.push({
        piece,
        from: move.from,
        to: move.to,
      })

      // Check if deploy complete
      if (session.getRemainingPieces().length === 0) {
        this.commitDeploySession(session)
        undo.turnSwitched = true
      }
    } else {
      // NORMAL MODE: Direct board mutation
      this.board.set(move.from, null)
      this.board.set(move.to, piece)

      if (piece.type === COMMANDER) {
        this.commanders[piece.color === 'r' ? 0 : 1] = move.to
      }

      this.turn = this.turn === 'r' ? 'b' : 'r'
      undo.turnSwitched = true
    }

    return undo
  }
}
```

### 4. Board Access Abstraction

```typescript
class GameState {
  private getEffectiveBoard(): Board | VirtualBoard {
    if (!this.deploySession) {
      return this.board // Direct access for normal mode
    }

    // Virtual board for deploy mode
    return new VirtualBoard(this.board, this.deploySession)
  }

  // All validation functions use effective board
  private isCommanderAttacked(color: Color): boolean {
    const board = this.getEffectiveBoard()
    const commanderSquare = this.commanders[color === 'r' ? 0 : 1]

    // Use virtual board for all checks
    for (const [square, piece] of board.pieces(enemyColor)) {
      if (this.canAttack(board, square, piece, commanderSquare)) {
        return true
      }
    }

    return false
  }
}
```

## Data Models

### 1. Move Context

```typescript
interface MoveContext {
  isDeployMode: boolean
  deploySession?: DeploySession
}
```

### 2. Virtual Change Entry

```typescript
type VirtualChange = {
  square: Square
  piece: Piece | null // null = removed piece
  timestamp: number
}
```

### 3. Deploy Move Types

```typescript
type DeployMove =
  | DeployStepMove // Move piece to new square
  | DeployRecombineMove // Rejoin deployed pieces
  | DeployStayMove // Mark piece as staying
  | DeployCompleteMove // Complete entire deployment

interface DeployStepMove {
  type: 'deploy-step'
  piece: Piece
  from: Square
  to: Square
  captured?: Piece
}

interface DeployRecombineMove {
  type: 'deploy-recombine'
  piece: Piece
  from: Square
  to: Square // Square with deployed pieces
}
```

### 4. Extended FEN Format

```typescript
interface ExtendedFEN {
  baseFEN: string
  deployMarker?: {
    originalSquare: Square
    remainingPieces: string
    moveCount: number
    virtualChanges?: string
  }
}

// Example: "...base_fen... r - - 0 1 DEPLOY e5:NT 2 e7=N,d7=F"
```

## Error Handling

### 1. Virtual State Validation

```typescript
class VirtualBoard {
  private validateVirtualState(): void {
    // Ensure virtual changes are consistent
    for (const [square, piece] of this.deploySession.virtualChanges) {
      if (piece && !this.isValidPiecePlacement(square, piece)) {
        throw new Error(
          `Invalid virtual piece placement: ${piece.type} at ${square}`,
        )
      }
    }
  }
}
```

### 2. Deploy Session Consistency

```typescript
class DeploySession {
  validateConsistency(): void {
    const totalOriginal = flattenPiece(this.originalStack).length
    const totalMoved = this.movedPieces.length
    const totalStaying = this.stayingPieces.length

    if (totalMoved + totalStaying > totalOriginal) {
      throw new Error(
        'Deploy session inconsistent: more pieces moved than available',
      )
    }
  }
}
```

### 3. State Synchronization

```typescript
class GameState {
  private commitDeploySession(session: DeploySession): void {
    try {
      // Validate before commit
      session.validateConsistency()

      // Atomic commit of all virtual changes
      for (const [square, piece] of session.virtualChanges) {
        this.board.set(square, piece)
      }

      // Update commanders if any moved
      this.updateCommanderPositions(session)

      // Clear session and switch turn
      this.deploySession = null
      this.turn = swapColor(session.startedByColor)
    } catch (error) {
      // Rollback on error
      this.rollbackDeploySession(session)
      throw error
    }
  }
}
```

## Testing Strategy

### 1. Virtual Board Testing

```typescript
describe('VirtualBoard', () => {
  it('should overlay virtual changes on real board', () => {
    const realBoard = new Board()
    const deploySession = new DeploySession()

    // Place piece on real board
    realBoard.set('e5', navy)

    // Add virtual change
    deploySession.virtualChanges.set('e5', null)
    deploySession.virtualChanges.set('e7', navy)

    const virtualBoard = new VirtualBoard(realBoard, deploySession)

    expect(virtualBoard.get('e5')).toBeNull()
    expect(virtualBoard.get('e7')).toBe(navy)
  })
})
```

### 2. Deploy Session Testing

```typescript
describe('DeploySession', () => {
  it('should track virtual moves correctly', () => {
    const session = new DeploySession()
    session.originalStack = [navy, airForce, tank]

    // Move air force
    session.movedPieces.push({
      piece: airForce,
      from: 'e5',
      to: 'd7',
    })

    expect(session.getRemainingPieces()).toEqual([navy, tank])
    expect(session.hasMoved(airForce)).toBe(true)
  })
})
```

### 3. Integration Testing

```typescript
describe('Virtual State Integration', () => {
  it('should handle complete deploy sequence', () => {
    const game = new CoTuLenh()

    // Start with stack
    game.put({ type: NAVY, color: RED, carrying: [airForce, tank] }, 'e5')

    // Deploy air force
    game.move({ from: 'e5', to: 'd7', piece: AIR_FORCE, deploy: true })
    expect(game.turn()).toBe(RED) // Turn doesn't switch
    expect(game.get('e5')).toEqual(navyTankStack) // Real board unchanged

    // Deploy tank
    game.move({ from: 'e5', to: 'd5', piece: TANK, deploy: true })
    expect(game.turn()).toBe(RED) // Still doesn't switch

    // Deploy navy (completes deployment)
    game.move({ from: 'e5', to: 'b5', piece: NAVY, deploy: true })
    expect(game.turn()).toBe(BLUE) // Now turn switches
    expect(game.get('e5')).toBeNull() // Real board updated
    expect(game.get('d7')).toBe(airForce)
    expect(game.get('d5')).toBe(tank)
    expect(game.get('b5')).toBe(navy)
  })
})
```

### 4. Performance Testing

```typescript
describe('Performance', () => {
  it('should maintain performance for normal moves', () => {
    const game = new CoTuLenh()

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      game.move('Ic6')
      game.undo()
    }
    const end = performance.now()

    expect(end - start).toBeLessThan(100) // Should be fast
  })
})
```

## Implementation Phases

### Phase 1: Virtual Board Foundation (Week 1)

- Implement `VirtualBoard` class
- Create enhanced `DeploySession` interface
- Add `getEffectiveBoard()` abstraction
- Basic virtual state overlay functionality

### Phase 2: Move System Integration (Week 2)

- Implement unified move application with `MoveContext`
- Update all validation functions to use effective board
- Replace direct board access patterns
- Implement deploy session lifecycle management

### Phase 3: Command Action Replacement (Week 3)

- Replace old command actions with virtual-state-aware versions
- Implement atomic commit/rollback for deploy sessions
- Add comprehensive error handling and validation
- Remove all legacy deploy code

### Phase 4: Extended Features (Week 4)

- Implement extended FEN format with deploy markers
- Add deploy session serialization/deserialization
- Implement recombination moves and complex deploy scenarios
- Performance optimization and comprehensive testing

## Migration Strategy

### 1. Complete Replacement Approach

- Remove all existing deploy state management code
- Replace `SetDeployStateAction` with virtual state management
- Eliminate legacy deploy move generation logic
- Update all deploy-related tests to use new architecture

### 2. Code Removal Checklist

- [ ] Remove old `DeployState` type definition
- [ ] Remove `SetDeployStateAction` class
- [ ] Remove legacy deploy move generation functions
- [ ] Remove old deploy state tracking in move commands
- [ ] Update all tests to use new virtual state system

### 3. Validation Strategy

- Comprehensive test suite for virtual state scenarios
- Integration tests for complex deploy sequences
- Performance benchmarks for normal vs deploy moves
- Edge case testing for state consistency

This design provides a clean, unified architecture that completely replaces the
old deploy system with a maintainable virtual state approach.
