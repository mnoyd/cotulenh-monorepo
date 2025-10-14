# Command Pattern Architecture for CoTuLenh Moves

## The Design Challenge

CoTuLenh has complex move application scenarios:

1. Normal moves
2. Capture moves with heroic promotion
3. Stay-capture moves
4. Deploy moves (multi-step)
5. Multiple simultaneous promotions
6. Combined operations (deploy + capture + promote)

**Question:** How to implement do/undo for all these cleanly?

**Answer:** **Command Pattern + Atomic Actions**

---

## Core Architecture

```
Move Request
    ↓
MoveFactory → creates Command
    ↓
Command → builds Action sequence
    ↓
Actions → execute() in order
    ↓
GameState mutated

Undo:
Actions → undo() in reverse order
    ↓
GameState restored
```

---

## Part 1: Atomic Actions (Building Blocks)

### Base Interface

```typescript
interface Action {
  execute(state: GameState): void
  undo(state: GameState): void
  describe(): string
}
```

### Concrete Actions

```typescript
// 1. Remove piece
class RemovePieceAction implements Action {
  private square: Square
  private removedPiece: Piece | null = null

  execute(state: GameState): void {
    this.removedPiece = state.board.get(this.square)
    state.board.set(this.square, null)
  }

  undo(state: GameState): void {
    state.board.set(this.square, this.removedPiece)
  }
}

// 2. Place piece
class PlacePieceAction implements Action {
  private square: Square
  private piece: Piece
  private replacedPiece: Piece | null = null

  execute(state: GameState): void {
    this.replacedPiece = state.board.get(this.square)
    state.board.set(this.square, this.piece)
  }

  undo(state: GameState): void {
    state.board.set(this.square, this.replacedPiece)
  }
}

// 3. Promote to heroic
class PromotePieceAction implements Action {
  private square: Square
  private wasHeroic: boolean = false

  execute(state: GameState): void {
    const piece = state.board.get(this.square)
    this.wasHeroic = piece.heroic || false
    piece.heroic = true
    state.heroicPieces.add(this.square)
  }

  undo(state: GameState): void {
    const piece = state.board.get(this.square)
    piece.heroic = this.wasHeroic
    if (!this.wasHeroic) {
      state.heroicPieces.delete(this.square)
    }
  }
}

// 4. Switch turn
class SwitchTurnAction implements Action {
  private prevTurn: Color

  execute(state: GameState): void {
    this.prevTurn = state.turn
    state.turn = state.turn === 'r' ? 'b' : 'r'
  }

  undo(state: GameState): void {
    state.turn = this.prevTurn
  }
}

// 5. Update deploy session
class UpdateDeploySessionAction implements Action {
  private newSession: DeploySession | null
  private oldSession: DeploySession | null

  execute(state: GameState): void {
    this.oldSession = state.deploySession
    state.deploySession = this.newSession
  }

  undo(state: GameState): void {
    state.deploySession = this.oldSession
  }
}

// 6. Update stack
class UpdateStackAction implements Action {
  private square: Square
  private newStack: Piece[]
  private oldStack: Piece[]

  execute(state: GameState): void {
    const current = state.board.get(this.square)
    this.oldStack = flattenPiece(current)

    if (this.newStack.length === 0) {
      state.board.set(this.square, null)
    } else {
      state.board.set(this.square, buildStack(this.newStack))
    }
  }

  undo(state: GameState): void {
    if (this.oldStack.length === 0) {
      state.board.set(this.square, null)
    } else {
      state.board.set(this.square, buildStack(this.oldStack))
    }
  }
}

// 7. Update commander position
class UpdateCommanderAction implements Action {
  private color: Color
  private newPos: Square
  private oldPos: Square

  execute(state: GameState): void {
    const idx = this.color === 'r' ? 0 : 1
    this.oldPos = state.commanders[idx]
    state.commanders[idx] = this.newPos
  }

  undo(state: GameState): void {
    const idx = this.color === 'r' ? 0 : 1
    state.commanders[idx] = this.oldPos
  }
}
```

---

## Part 2: Command Base Class

```typescript
abstract class MoveCommand {
  protected actions: Action[] = []

  abstract buildActions(state: GameState, move: Move): void

  execute(state: GameState, move: Move): void {
    this.buildActions(state, move)
    for (const action of this.actions) {
      action.execute(state)
    }
  }

  undo(state: GameState): void {
    // Reverse order!
    for (let i = this.actions.length - 1; i >= 0; i--) {
      this.actions[i].undo(state)
    }
  }

  describe(): string {
    return this.actions.map((a) => a.describe()).join(' → ')
  }
}
```

---

## Part 3: Concrete Commands

### Normal Move

```typescript
class NormalMoveCommand extends MoveCommand {
  buildActions(state: GameState, move: NormalMove): void {
    const piece = state.board.get(move.from)

    this.actions.push(new RemovePieceAction(move.from))
    this.actions.push(new PlacePieceAction(move.to, piece))

    if (piece.type === COMMANDER) {
      this.actions.push(new UpdateCommanderAction(piece.color, move.to))
    }

    this.actions.push(new SwitchTurnAction())
  }
}
```

### Capture with Promotion

```typescript
class CaptureMoveCommand extends MoveCommand {
  buildActions(state: GameState, move: CaptureMove): void {
    const piece = state.board.get(move.from)

    // Remove pieces
    this.actions.push(new RemovePieceAction(move.from))
    this.actions.push(new RemovePieceAction(move.to))

    // Place attacker
    this.actions.push(new PlacePieceAction(move.to, piece))

    // Check promotion
    const enemyCmd = state.commanders[piece.color === 'r' ? 1 : 0]
    if (this.attacksCommander(state, move.to, enemyCmd)) {
      this.actions.push(new PromotePieceAction(move.to))
    }

    if (piece.type === COMMANDER) {
      this.actions.push(new UpdateCommanderAction(piece.color, move.to))
    }

    this.actions.push(new SwitchTurnAction())
  }
}
```

### Deploy Start

```typescript
class DeployStartCommand extends MoveCommand {
  buildActions(state: GameState, move: DeployStartMove): void {
    const stack = state.board.get(move.square)

    const session: DeploySession = {
      originalSquare: move.square,
      originalStack: flattenPiece(stack),
      remaining: flattenPiece(stack),
      deployed: [],
      staying: [],
    }

    this.actions.push(new UpdateDeploySessionAction(session))
    // NO turn switch!
  }
}
```

### Deploy Step

```typescript
class DeployStepCommand extends MoveCommand {
  buildActions(state: GameState, move: DeployStepMove): void {
    const session = state.deploySession
    const newRemaining = session.remaining.filter((p) => p !== move.piece)

    // Update stack
    this.actions.push(
      new UpdateStackAction(session.originalSquare, newRemaining),
    )

    // Handle capture
    if (move.capturedPiece) {
      this.actions.push(new RemovePieceAction(move.to))
    }

    // Place piece
    this.actions.push(new PlacePieceAction(move.to, move.piece))

    // Check promotion
    const enemyCmd = state.commanders[move.piece.color === 'r' ? 1 : 0]
    if (move.capturedPiece || this.attacksCommander(state, move.to, enemyCmd)) {
      this.actions.push(new PromotePieceAction(move.to))
    }

    // Update session
    const newSession = {
      ...session,
      remaining: newRemaining,
      deployed: [
        ...session.deployed,
        { piece: move.piece, destination: move.to },
      ],
    }

    const isComplete = newRemaining.length === 0

    if (isComplete) {
      this.actions.push(new UpdateDeploySessionAction(null))
      this.actions.push(new SwitchTurnAction()) // ✅ Turn switches!
    } else {
      this.actions.push(new UpdateDeploySessionAction(newSession))
      // NO turn switch
    }
  }
}
```

### Multiple Promotions

```typescript
class MultiplePromotionsCommand extends MoveCommand {
  buildActions(state: GameState, move: Move): void {
    // 1. Apply base move
    const baseCmd = this.createBaseCommand(move)
    baseCmd.buildActions(state, move)
    this.actions.push(...baseCmd.actions)

    // 2. Find all attackers (after move applied)
    const color = move.piece.color
    const enemyCmd = state.commanders[color === 'r' ? 1 : 0]

    // Simulate move to find new attackers
    const tempState = state.clone()
    for (const action of this.actions) {
      action.execute(tempState)
    }

    const attackers = this.findAllAttackers(tempState, enemyCmd, color)

    // 3. Promote all attackers
    for (const sq of attackers) {
      const piece = tempState.board.get(sq)
      if (!piece.heroic) {
        this.actions.push(new PromotePieceAction(sq))
      }
    }
  }

  private findAllAttackers(
    state: GameState,
    commanderSq: Square,
    color: Color,
  ): Square[] {
    const attackers = []

    for (let sq = 0; sq < 256; sq++) {
      if (!isValid(sq)) continue

      const piece = state.board.get(sq)
      if (piece?.color === color && this.canAttack(state, sq, commanderSq)) {
        attackers.push(sq)
      }
    }

    return attackers
  }
}
```

---

## Part 4: Command Factory

```typescript
class MoveCommandFactory {
  static create(state: GameState, move: Move): MoveCommand {
    // Deploy session active?
    if (state.deploySession) {
      switch (move.type) {
        case 'deploy-step':
          return new DeployStepCommand()
        case 'deploy-recombine':
          return new DeployRecombineCommand()
        case 'deploy-stay':
          return new DeployStayCommand()
      }
    }

    // Normal moves
    switch (move.type) {
      case 'deploy-start':
        return new DeployStartCommand()

      case 'normal':
        return new NormalMoveCommand()

      case 'capture':
        // Check if causes multiple promotions
        if (this.willCauseMultiplePromotions(state, move)) {
          return new MultiplePromotionsCommand()
        }
        return new CaptureMoveCommand()

      case 'stay-capture':
        return new StayCaptureMoveCommand()

      case 'combine':
        return new CombineMoveCommand()

      default:
        throw new Error(`Unknown move type`)
    }
  }
}
```

---

## Part 5: GameState Integration

```typescript
class GameState {
  private history: MoveCommand[] = []

  makeMove(move: Move): void {
    const command = MoveCommandFactory.create(this, move)
    command.execute(this, move)
    this.history.push(command)
  }

  undoMove(): void {
    const command = this.history.pop()
    command.undo(this)
  }
}
```

---

## Complete Example

```typescript
// Deploy with promotions
const state = new GameState()

// Start: e5: Navy + [AirForce, Tank]
state.makeMove({ type: 'deploy-start', square: 'e5' })
// Actions: [UpdateDeploySessionAction]

state.makeMove({ type: 'deploy-step', piece: navy, to: 'e7', capturedPiece: enemyInf })
// Actions: [
//   UpdateStackAction('e5', [AF, Tank]),
//   RemovePieceAction('e7'),
//   PlacePieceAction('e7', navy),
//   PromotePieceAction('e7'),  ← Heroic!
//   UpdateDeploySessionAction
// ]

state.undoMove()
// Undoes all actions in reverse
// Navy back to e5 in stack, enemy infantry restored

See full document for more examples.
```
