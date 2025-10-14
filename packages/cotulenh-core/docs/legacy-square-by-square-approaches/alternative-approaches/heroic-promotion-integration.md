# Heroic Promotion Integration: Cross-Approach Implementation

## Overview

Heroic promotion is a complex mechanic that must be handled correctly regardless
of which move application approach you choose. This document shows how to
implement heroic promotion for all four approaches: Mutable Make/Unmake, Command
Pattern, Immutable State, and Virtual State Overlay.

**Key Challenges:**

- **Multiple simultaneous promotions** from a single move
- **Deploy session integration** with special promotion rules
- **Last piece promotion** (HEADQUARTER rule)
- **Perfect undo/restoration** of heroic states

---

## Heroic Promotion Rules

### 1. Commander Attack Promotion

When a piece attacks the enemy commander, it becomes heroic.

```typescript
// Example: Tank captures Infantry, now attacks Blue commander
Before: Tank(e5, not heroic) captures Infantry(e6)
After:  Tank(e6, HEROIC) attacks Commander(e8)
```

### 2. Multiple Simultaneous Promotions

One move can promote multiple pieces if it exposes the commander to multiple
attackers.

```typescript
// Artillery captures blocking piece
Before: Artillery(e6), Tank(d7), Navy(f7) - all not heroic
        Infantry(e7) blocks Blue commander(e8)

After:  Artillery captures Infantry(e7)
        Now ALL THREE pieces attack commander → ALL become heroic
```

### 3. Last Piece Promotion

When only one non-commander piece remains, it automatically becomes heroic.

```typescript
// HEADQUARTER becomes heroic when alone
Before: Red has Commander(e1) + HEADQUARTER(e5) + Tank(d4)
After:  Tank is captured → HEADQUARTER automatically becomes heroic
```

### 4. Deploy Session Promotions

Pieces can become heroic during deploy sessions with special timing rules.

```typescript
// Navy deploys and captures, becoming heroic mid-deploy
Deploy: Navy moves from stack(e5) to e7, captures Infantry
Result: Navy becomes heroic, but deploy session continues
```

---

## Approach 1: Mutable Make/Unmake

### Heroic Change Tracking

```typescript
interface HeroicChange {
  square: Square
  wasHeroic: boolean
  isHeroic: boolean
}

interface UndoInfo {
  // ... other fields
  heroicChanges: HeroicChange[]
}
```

### Implementation

```typescript
class GameState {
  private heroicPieces: Set<Square> = new Set()

  private checkHeroicPromotions(move: Move, undo: UndoInfo): void {
    // 1. Check commander attack promotions
    this.checkCommanderAttackPromotions(move, undo)

    // 2. Check last piece promotion
    this.checkLastPiecePromotion(move, undo)

    // 3. Handle deploy-specific promotions
    if (this.deploySession) {
      this.checkDeployPromotions(move, undo)
    }
  }

  private checkCommanderAttackPromotions(move: Move, undo: UndoInfo): void {
    const color = move.piece.color
    const enemyCommander = this.commanders[color === 'r' ? 1 : 0]

    // Find all pieces that now attack the enemy commander
    const attackers = this.findCommanderAttackers(enemyCommander, color)

    for (const square of attackers) {
      const piece = this.board.get(square)
      if (piece && !piece.heroic) {
        // Record change for undo
        undo.heroicChanges.push({
          square,
          wasHeroic: false,
          isHeroic: true,
        })

        // Apply promotion (mutate piece)
        piece.heroic = true
        this.heroicPieces.add(square)
      }
    }
  }

  private checkLastPiecePromotion(move: Move, undo: UndoInfo): void {
    const color = move.piece.color
    const nonCommanderCount = this.countNonCommanderPieces(color)

    if (nonCommanderCount === 1) {
      const lastPieceSquare = this.findLastPiece(color)
      if (lastPieceSquare) {
        const piece = this.board.get(lastPieceSquare)
        if (piece && !piece.heroic) {
          undo.heroicChanges.push({
            square: lastPieceSquare,
            wasHeroic: false,
            isHeroic: true,
          })

          piece.heroic = true
          this.heroicPieces.add(lastPieceSquare)
        }
      }
    }
  }

  private restoreHeroicStatus(undo: UndoInfo): void {
    // CRITICAL: Restore BEFORE restoring board (pieces must exist)
    for (const change of undo.heroicChanges) {
      const piece = this.board.get(change.square)
      if (piece) {
        piece.heroic = change.wasHeroic

        if (change.wasHeroic) {
          this.heroicPieces.add(change.square)
        } else {
          this.heroicPieces.delete(change.square)
        }
      }
    }
  }
}
```

### Deploy Integration

```typescript
private checkDeployPromotions(move: Move, undo: UndoInfo): void {
  // Check if deploy is completing
  if (this.isDeployComplete()) {
    // Deploy completing - check for last piece promotion
    this.checkLastPiecePromotion(move, undo)
  }

  // Always check commander attack promotions during deploy
  this.checkCommanderAttackPromotions(move, undo)
}

private isDeployComplete(): boolean {
  if (!this.deploySession) return false

  const totalPieces = this.deploySession.originalStack.length
  const deployed = this.deploySession.deployed.length
  const staying = this.deploySession.staying.length

  return deployed + staying === totalPieces
}
```

---

## Approach 2: Command Pattern

### Heroic Promotion Actions

```typescript
class PromotePieceAction implements Action {
  private square: Square
  private wasHeroic: boolean = false

  constructor(square: Square) {
    this.square = square
  }

  execute(state: GameState): void {
    const piece = state.board.get(this.square)
    if (!piece) {
      throw new Error(`No piece at ${squareToString(this.square)}`)
    }

    this.wasHeroic = piece.heroic || false
    piece.heroic = true
    state.heroicPieces.add(this.square)
  }

  undo(state: GameState): void {
    const piece = state.board.get(this.square)
    if (piece) {
      piece.heroic = this.wasHeroic
      if (!this.wasHeroic) {
        state.heroicPieces.delete(this.square)
      }
    }
  }

  describe(): string {
    return `Promote piece at ${squareToString(this.square)} to heroic`
  }
}

class CheckHeroicPromotionsAction implements Action {
  private promotionActions: PromotePieceAction[] = []

  constructor(private move: Move) {}

  execute(state: GameState): void {
    // Find all pieces that should be promoted
    const promotions = this.findPromotions(state, this.move)

    // Create and execute promotion actions
    for (const square of promotions) {
      const action = new PromotePieceAction(square)
      action.execute(state)
      this.promotionActions.push(action)
    }
  }

  undo(state: GameState): void {
    // Undo all promotions in reverse order
    for (let i = this.promotionActions.length - 1; i >= 0; i--) {
      this.promotionActions[i].undo(state)
    }
  }

  private findPromotions(state: GameState, move: Move): Square[] {
    const promotions: Square[] = []

    // Commander attack promotions
    const commanderPromotions = this.findCommanderAttackPromotions(state, move)
    promotions.push(...commanderPromotions)

    // Last piece promotion
    const lastPiecePromotion = this.findLastPiecePromotion(state, move)
    if (lastPiecePromotion) {
      promotions.push(lastPiecePromotion)
    }

    return promotions
  }
}
```

### Command Integration

```typescript
class CaptureMoveCommand extends MoveCommand {
  buildActions(state: GameState, move: CaptureMove): void {
    const piece = state.board.get(move.from)

    // 1. Basic move actions
    this.actions.push(new RemovePieceAction(move.from))
    this.actions.push(new RemovePieceAction(move.to))
    this.actions.push(new PlacePieceAction(move.to, piece))

    // 2. Heroic promotions (automatic detection)
    this.actions.push(new CheckHeroicPromotionsAction(move))

    // 3. Other actions (commander update, turn switch, etc.)
    if (piece.type === COMMANDER) {
      this.actions.push(new UpdateCommanderAction(piece.color, move.to))
    }

    this.actions.push(new SwitchTurnAction())
    this.actions.push(
      new UpdateCountersAction(
        state.turn === 'b' ? 1 : 0,
        true, // Capture resets half-move clock
      ),
    )
  }
}

class MultiplePromotionsCommand extends MoveCommand {
  buildActions(state: GameState, move: Move): void {
    // 1. Apply base move
    const baseCommand = this.createBaseCommand(move)
    baseCommand.buildActions(state, move)
    this.actions.push(...baseCommand.getActions())

    // 2. Simulate move to find all promotions
    const tempState = state.clone()
    for (const action of this.actions) {
      action.execute(tempState)
    }

    // 3. Find additional promotions
    const additionalPromotions = this.findAllPromotions(tempState, move)

    // 4. Add promotion actions
    for (const square of additionalPromotions) {
      const piece = tempState.board.get(square)
      if (piece && !piece.heroic) {
        this.actions.push(new PromotePieceAction(square))
      }
    }
  }
}
```

---

## Approach 3: Immutable State

### Immutable Heroic Promotion

```typescript
interface HeroicPromotionResult {
  heroicPieces: ReadonlySet<Square>
  board: ReadonlyBoard
}

class GameState {
  private checkHeroicPromotions(
    board: ReadonlyBoard,
    move: Move,
    movedPiece: Piece,
  ): HeroicPromotionResult {
    let currentBoard = board
    let heroicPieces = new Set(this.heroicPieces)

    // 1. Commander attack promotions
    const commanderPromotions = this.findCommanderAttackPromotions(
      currentBoard,
      movedPiece.color,
    )

    for (const square of commanderPromotions) {
      const piece = currentBoard.get(square)
      if (piece && !piece.heroic) {
        const heroicPiece = piece.withHeroic(true)
        currentBoard = currentBoard.withPiece(square, heroicPiece)
        heroicPieces.add(square)
      }
    }

    // 2. Last piece promotion
    const lastPiecePromotion = this.findLastPiecePromotion(
      currentBoard,
      movedPiece.color,
    )

    if (lastPiecePromotion) {
      const piece = currentBoard.get(lastPiecePromotion)
      if (piece && !piece.heroic) {
        const heroicPiece = piece.withHeroic(true)
        currentBoard = currentBoard.withPiece(lastPiecePromotion, heroicPiece)
        heroicPieces.add(lastPiecePromotion)
      }
    }

    return {
      heroicPieces: Object.freeze(heroicPieces) as ReadonlySet<Square>,
      board: currentBoard,
    }
  }
}
```

### Immutable Piece with Heroic Status

```typescript
class Piece {
  private readonly data: PieceData

  withHeroic(heroic: boolean): Piece {
    if (this.data.heroic === heroic) {
      return this // No change needed - return same instance
    }

    return new Piece({
      ...this.data,
      heroic,
    })
  }

  // Ensure heroic status is preserved in other operations
  withCarrying(carrying: Piece[]): Piece {
    return new Piece({
      ...this.data,
      carrying: Object.freeze([...carrying]),
    })
  }
}
```

### Move Application with Promotions

```typescript
private applyCaptureMove(move: CaptureMove): GameState {
  const piece = this.board.get(move.from)
  const capturedPiece = this.board.get(move.to)

  // Create new board with capture
  const newBoard = this.board
    .withPiece(move.from, null)
    .withPiece(move.to, piece)

  // Update commanders
  let newCommanders = this.commanders
  if (piece.type === COMMANDER) {
    const commanderIndex = piece.color === 'r' ? 0 : 1
    newCommanders = [...this.commanders] as [Square, Square]
    newCommanders[commanderIndex] = move.to
  }

  // Check heroic promotions
  const { heroicPieces: newHeroicPieces, board: boardWithPromotions } =
    this.checkHeroicPromotions(newBoard, move, piece)

  // Create new state (immutable)
  return new GameState({
    board: boardWithPromotions,
    turn: this.turn === 'r' ? 'b' : 'r',
    commanders: newCommanders,
    heroicPieces: newHeroicPieces,
    deployState: this.deployState,
    moveNumber: this.turn === 'b' ? this.moveNumber + 1 : this.moveNumber,
    halfMoves: 0,  // Capture resets half-move clock
    airDefense: this.airDefense
  })
}
```

### Deploy Integration

```typescript
private applyDeployStep(move: DeployStepMove): GameState {
  const session = this.deployState!

  // Apply board changes
  const boardChanges = new Map<Square, Piece | null>()

  // Remove from original stack
  const originalStack = this.board.get(session.originalSquare)
  const newStack = this.removeFromStack(originalStack!, move.piece)
  boardChanges.set(session.originalSquare, newStack)

  // Handle capture
  if (move.capturedPiece) {
    boardChanges.set(move.to, null)
  }

  // Place piece
  boardChanges.set(move.to, move.piece)

  const newBoard = this.board.withChanges(boardChanges)

  // Update deploy session
  const newRemaining = session.remaining.filter(p => p !== move.piece)
  const isComplete = newRemaining.length === 0

  const newDeployState = isComplete ? null : {
    ...session,
    remaining: newRemaining,
    deployed: [...session.deployed, {
      piece: move.piece,
      destination: move.to,
      captured: move.capturedPiece
    }]
  }

  // Check heroic promotions (including deploy completion)
  const { heroicPieces: newHeroicPieces, board: boardWithPromotions } =
    this.checkHeroicPromotionsWithDeploy(newBoard, move, move.piece, isComplete)

  return new GameState({
    board: boardWithPromotions,
    turn: isComplete ? (this.turn === 'r' ? 'b' : 'r') : this.turn,
    commanders: this.commanders,
    heroicPieces: newHeroicPieces,
    deployState: newDeployState,
    moveNumber: isComplete && this.turn === 'b' ? this.moveNumber + 1 : this.moveNumber,
    halfMoves: isComplete ? (move.capturedPiece ? 0 : this.halfMoves + 1) : this.halfMoves,
    airDefense: this.airDefense
  })
}

private checkHeroicPromotionsWithDeploy(
  board: ReadonlyBoard,
  move: Move,
  movedPiece: Piece,
  deployComplete: boolean
): HeroicPromotionResult {

  let currentBoard = board
  let heroicPieces = new Set(this.heroicPieces)

  // Always check commander attack promotions
  const commanderPromotions = this.findCommanderAttackPromotions(
    currentBoard, movedPiece.color
  )

  for (const square of commanderPromotions) {
    const piece = currentBoard.get(square)
    if (piece && !piece.heroic) {
      const heroicPiece = piece.withHeroic(true)
      currentBoard = currentBoard.withPiece(square, heroicPiece)
      heroicPieces.add(square)
    }
  }

  // Check last piece promotion only if deploy is completing
  if (deployComplete) {
    const lastPiecePromotion = this.findLastPiecePromotion(
      currentBoard, movedPiece.color
    )

    if (lastPiecePromotion) {
      const piece = currentBoard.get(lastPiecePromotion)
      if (piece && !piece.heroic) {
        const heroicPiece = piece.withHeroic(true)
        currentBoard = currentBoard.withPiece(lastPiecePromotion, heroicPiece)
        heroicPieces.add(lastPiecePromotion)
      }
    }
  }

  return {
    heroicPieces: Object.freeze(heroicPieces) as ReadonlySet<Square>,
    board: currentBoard
  }
}
```

---

## Approach 4: Virtual State Overlay

### Virtual Heroic Promotion

```typescript
class GameState {
  private checkHeroicPromotions(
    move: Move,
    effectiveBoard: EffectiveBoard,
    undo: UndoInfo,
    context: MoveContext,
  ): void {
    // 1. Commander attack promotions
    this.checkCommanderAttackPromotions(move, effectiveBoard, undo, context)

    // 2. Last piece promotion (only if not in deploy or deploy completing)
    if (
      !context.isDeployMode ||
      this.isDeployComplete(context.deploySession!)
    ) {
      this.checkLastPiecePromotion(move, effectiveBoard, undo, context)
    }
  }

  private checkCommanderAttackPromotions(
    move: Move,
    effectiveBoard: EffectiveBoard,
    undo: UndoInfo,
    context: MoveContext,
  ): void {
    const color = move.piece.color
    const enemyCommander = this.commanders[color === 'r' ? 1 : 0]

    // Find attackers using effective board
    const attackers = this.findCommanderAttackers(
      effectiveBoard,
      enemyCommander,
      color,
    )

    for (const square of attackers) {
      const piece = effectiveBoard.get(square)
      if (piece && !piece.heroic) {
        // Record change for undo
        undo.heroicChanges.push({
          square,
          wasHeroic: false,
          isHeroic: true,
        })

        // Apply promotion
        const heroicPiece = piece.withHeroic
          ? piece.withHeroic(true)
          : { ...piece, heroic: true }

        if (context.isDeployMode) {
          // Virtual promotion (goes to overlay)
          effectiveBoard.set(square, heroicPiece)
        } else {
          // Real promotion (goes to real board)
          this.board.set(square, heroicPiece)
          this.heroicPieces.add(square)
        }
      }
    }
  }

  private checkLastPiecePromotion(
    move: Move,
    effectiveBoard: EffectiveBoard,
    undo: UndoInfo,
    context: MoveContext,
  ): void {
    const color = move.piece.color
    const nonCommanderCount = this.countNonCommanderPieces(
      effectiveBoard,
      color,
    )

    if (nonCommanderCount === 1) {
      const lastPieceSquare = this.findLastPiece(effectiveBoard, color)
      if (lastPieceSquare) {
        const piece = effectiveBoard.get(lastPieceSquare)
        if (piece && !piece.heroic) {
          undo.heroicChanges.push({
            square: lastPieceSquare,
            wasHeroic: false,
            isHeroic: true,
          })

          const heroicPiece = piece.withHeroic
            ? piece.withHeroic(true)
            : { ...piece, heroic: true }

          if (context.isDeployMode) {
            effectiveBoard.set(lastPieceSquare, heroicPiece)
          } else {
            this.board.set(lastPieceSquare, heroicPiece)
            this.heroicPieces.add(lastPieceSquare)
          }
        }
      }
    }
  }
}
```

### Virtual State Heroic Restoration

```typescript
private restoreHeroicStatus(undo: UndoInfo): void {
  const effectiveBoard = this.getEffectiveBoard()

  for (const change of undo.heroicChanges) {
    const piece = effectiveBoard.get(change.square)

    if (piece) {
      // Restore previous heroic status
      const restoredPiece = piece.withHeroic ?
        piece.withHeroic(change.wasHeroic) :
        { ...piece, heroic: change.wasHeroic }

      effectiveBoard.set(change.square, restoredPiece)

      // Update real heroic pieces set (only if not in deploy mode)
      if (!this.deploySession) {
        if (change.wasHeroic) {
          this.heroicPieces.add(change.square)
        } else {
          this.heroicPieces.delete(change.square)
        }
      }
    }
  }
}
```

### Deploy Commit with Heroic Promotion

```typescript
private commitDeploySession(session: DeploySession): void {
  // Apply all virtual changes to real board atomically
  for (const [square, change] of session.virtualOverlay.getAllChanges()) {
    this.board.set(square, change.virtualPiece)

    // Update heroic pieces set for promoted pieces
    if (change.virtualPiece?.heroic && !change.originalPiece?.heroic) {
      this.heroicPieces.add(square)
    } else if (!change.virtualPiece?.heroic && change.originalPiece?.heroic) {
      this.heroicPieces.delete(square)
    }
  }

  // Update commanders
  for (const move of session.movedPieces) {
    if (move.piece.type === COMMANDER) {
      const commanderIndex = move.piece.color === 'r' ? 0 : 1
      this.commanders[commanderIndex] = move.to
    }
  }

  // Clear deploy session
  this.deploySession = null

  // Switch turn
  this.turn = this.turn === 'r' ? 'b' : 'r'
}
```

---

## Common Helper Functions

### Commander Attack Detection

```typescript
// Works for all approaches with appropriate board interface
private findCommanderAttackers(
  board: Board | ReadonlyBoard | EffectiveBoard,
  commanderSquare: Square,
  color: Color
): Square[] {
  const attackers: Square[] = []

  // Optimize: only check pieces within attack range
  const candidates = this.getPiecesInAttackRange(board, commanderSquare, color)

  for (const square of candidates) {
    const piece = board.get(square)
    if (this.canAttackSquare(board, square, piece, commanderSquare)) {
      attackers.push(square)
    }
  }

  return attackers
}

private canAttackSquare(
  board: Board | ReadonlyBoard | EffectiveBoard,
  from: Square,
  piece: Piece,
  target: Square
): boolean {
  const generator = PIECE_GENERATORS[piece.type]
  const attacks = generator.generateAttacks(board, from, piece)
  return attacks.some(attack => attack.to === target)
}

private getPiecesInAttackRange(
  board: Board | ReadonlyBoard | EffectiveBoard,
  target: Square,
  color: Color
): Square[] {
  const maxRange = 4  // Air Force has longest range
  const candidates: Square[] = []

  const targetFile = file(target)
  const targetRank = rank(target)

  // Check squares within max range
  for (let f = Math.max(0, targetFile - maxRange); f <= Math.min(11, targetFile + maxRange); f++) {
    for (let r = Math.max(0, targetRank - maxRange); r <= Math.min(11, targetRank + maxRange); r++) {
      const sq = square(f, r)

      if (isValidSquare(sq)) {
        const piece = board.get(sq)
        if (piece?.color === color) {
          candidates.push(sq)
        }
      }
    }
  }

  return candidates
}
```

### Last Piece Detection

```typescript
private countNonCommanderPieces(
  board: Board | ReadonlyBoard | EffectiveBoard,
  color: Color
): number {
  let count = 0

  // Use appropriate iteration method based on board type
  if ('pieces' in board) {
    // ReadonlyBoard or EffectiveBoard
    for (const [square, piece] of board.pieces(color)) {
      if (piece.type !== COMMANDER) {
        count++
      }
    }
  } else {
    // Regular Board
    for (let sq = 0; sq < 256; sq++) {
      if (!isValidSquare(sq)) continue

      const piece = board.get(sq)
      if (piece?.color === color && piece.type !== COMMANDER) {
        count++
      }
    }
  }

  return count
}

private findLastPiece(
  board: Board | ReadonlyBoard | EffectiveBoard,
  color: Color
): Square | null {
  // Use appropriate iteration method
  if ('pieces' in board) {
    for (const [square, piece] of board.pieces(color)) {
      if (piece.type !== COMMANDER) {
        return square
      }
    }
  } else {
    for (let sq = 0; sq < 256; sq++) {
      if (!isValidSquare(sq)) continue

      const piece = board.get(sq)
      if (piece?.color === color && piece.type !== COMMANDER) {
        return sq
      }
    }
  }

  return null
}
```

---

## Testing Heroic Promotion

### Universal Test Cases

```typescript
describe('Heroic Promotion (All Approaches)', () => {
  describe('Commander Attack Promotion', () => {
    it('should promote single attacker', () => {
      const game = createGame() // Use factory for current approach
      const state = setupSingleAttackPosition()

      const move = findCommanderAttackMove(state)
      const result = game.applyMove(move) // Method varies by approach

      // Verify promotion happened
      const promotedPiece = result.getBoard().get(move.to)
      expect(promotedPiece.heroic).toBe(true)

      // Verify undo works
      const undoResult = game.undoMove() // Method varies by approach
      const originalPiece = undoResult.getBoard().get(move.from)
      expect(originalPiece.heroic).toBe(false)
    })

    it('should promote multiple attackers simultaneously', () => {
      const game = createGame()
      const state = setupMultipleAttackPosition()

      const move = findMoveExposingCommander(state)
      const result = game.applyMove(move)

      // Count promoted pieces
      let promotedCount = 0
      for (const [square, piece] of result
        .getBoard()
        .pieces(move.piece.color)) {
        if (piece.heroic) {
          promotedCount++
        }
      }

      expect(promotedCount).toBeGreaterThan(1)

      // Verify undo restores all
      const undoResult = game.undoMove()
      let restoredPromotedCount = 0
      for (const [square, piece] of undoResult
        .getBoard()
        .pieces(move.piece.color)) {
        if (piece.heroic) {
          restoredPromotedCount++
        }
      }

      expect(restoredPromotedCount).toBeLessThan(promotedCount)
    })
  })

  describe('Last Piece Promotion', () => {
    it('should promote last remaining piece', () => {
      const game = createGame()
      const state = setupLastPiecePosition()

      const move = captureSecondToLastPiece(state)
      const result = game.applyMove(move)

      // Find the last piece
      const lastPiece = findLastNonCommanderPiece(result, move.piece.color)
      expect(lastPiece.heroic).toBe(true)

      // Verify undo
      const undoResult = game.undoMove()
      const restoredPiece = findCorrespondingPiece(undoResult, lastPiece)
      expect(restoredPiece.heroic).toBe(false)
    })

    it('should not promote if multiple pieces remain', () => {
      const game = createGame()
      const state = setupMultiplePiecesPosition()

      const move = captureOnePiece(state)
      const result = game.applyMove(move)

      // Count non-commander pieces
      const nonCommanderCount = countNonCommanderPieces(
        result,
        move.piece.color,
      )
      expect(nonCommanderCount).toBeGreaterThan(1)

      // Should not have last piece promotion
      const promotedByLastPieceRule = findPiecesPromotedByLastPieceRule(result)
      expect(promotedByLastPieceRule).toHaveLength(0)
    })
  })

  describe('Deploy Integration', () => {
    it('should handle promotion during deploy', () => {
      const game = createGame()
      const state = startDeploySession()

      const deployMove = createDeployMoveWithPromotion()
      const result = game.applyMove(deployMove)

      // Should have promotion but deploy should continue
      const promotedPiece = result.getBoard().get(deployMove.to)
      expect(promotedPiece.heroic).toBe(true)
      expect(result.isDeployActive()).toBe(true)
      expect(result.getTurn()).toBe(state.getTurn()) // No turn switch

      // Verify undo
      const undoResult = game.undoMove()
      expect(undoResult.isDeployActive()).toBe(true)
      const restoredPiece = undoResult.getBoard().get(deployMove.from)
      expect(restoredPiece.heroic).toBe(false)
    })

    it('should promote on deploy completion', () => {
      const game = createGame()
      const state = setupAlmostCompleteDeployWithLastPiece()

      const finalMove = createFinalDeployMove()
      const result = game.applyMove(finalMove)

      // Should have both deploy completion and last piece promotion
      expect(result.isDeployActive()).toBe(false)
      expect(result.getTurn()).not.toBe(state.getTurn()) // Turn switched

      const lastPiece = findLastNonCommanderPiece(result, finalMove.piece.color)
      expect(lastPiece.heroic).toBe(true)
    })
  })
})
```

### Approach-Specific Test Helpers

```typescript
// Factory function to create game instance for current approach
function createGame(): GameInterface {
  switch (CURRENT_APPROACH) {
    case 'mutable':
      return new MutableGameState()
    case 'command':
      return new CommandGameState()
    case 'immutable':
      return new ImmutableGameState()
    case 'virtual':
      return new VirtualGameState()
    default:
      throw new Error('Unknown approach')
  }
}

// Unified interface for testing
interface GameInterface {
  applyMove(move: Move): GameResult
  undoMove(): GameResult
  getBoard(): BoardInterface
  getTurn(): Color
  isDeployActive(): boolean
}

interface GameResult {
  getBoard(): BoardInterface
  getTurn(): Color
  isDeployActive(): boolean
}

interface BoardInterface {
  get(square: Square): Piece | null
  pieces(color?: Color): Iterable<[Square, Piece]>
}
```

---

## Performance Considerations

### Optimization Strategies

```typescript
// 1. Cache commander positions
class HeroicPromotionOptimizer {
  private commanderPositions: [Square, Square] = [0, 0]
  private lastBoardHash: string = ''
  private attackerCache: Map<string, Square[]> = new Map()

  findCommanderAttackers(
    board: BoardInterface,
    commanderSquare: Square,
    color: Color,
  ): Square[] {
    // Create cache key
    const boardHash = this.getBoardHash(board)
    const cacheKey = `${boardHash}-${commanderSquare}-${color}`

    if (this.attackerCache.has(cacheKey)) {
      return this.attackerCache.get(cacheKey)!
    }

    // Compute attackers
    const attackers = this.computeAttackers(board, commanderSquare, color)

    // Cache result
    this.attackerCache.set(cacheKey, attackers)

    // Limit cache size
    if (this.attackerCache.size > 1000) {
      this.attackerCache.clear()
    }

    return attackers
  }

  // 2. Incremental attack detection
  updateAttackersAfterMove(
    move: Move,
    previousAttackers: Square[],
    board: BoardInterface,
  ): Square[] {
    // Only recompute if move affects attack lines to commander
    if (this.moveAffectsCommanderAttacks(move)) {
      return this.findCommanderAttackers(board /* ... */)
    }

    return previousAttackers
  }

  private moveAffectsCommanderAttacks(move: Move): boolean {
    // Quick heuristic: check if move is near commander or on attack lines
    const enemyCommander =
      this.commanderPositions[move.piece.color === 'r' ? 1 : 0]
    const distance = getDistance(move.to, enemyCommander)

    return distance <= 4 // Max attack range
  }
}

// 3. Batch promotion processing
class BatchHeroicPromotion {
  processPromotions(
    board: BoardInterface,
    moves: Move[],
  ): Map<Square, boolean> {
    const promotions = new Map<Square, boolean>()

    // Process all moves to find cumulative promotions
    for (const move of moves) {
      const movePromotions = this.findPromotionsForMove(board, move)
      for (const [square, heroic] of movePromotions) {
        promotions.set(square, heroic)
      }
    }

    return promotions
  }
}
```

---

## Summary

### Heroic Promotion Implementation by Approach

| Aspect                  | Mutable          | Command          | Immutable         | Virtual         |
| ----------------------- | ---------------- | ---------------- | ----------------- | --------------- |
| **Promotion Tracking**  | UndoInfo changes | Action sequence  | New piece objects | Virtual overlay |
| **Multiple Promotions** | Loop + mutate    | Multiple actions | Loop + new pieces | Loop + virtual  |
| **Undo Mechanism**      | Restore flags    | Reverse actions  | Use old state     | Restore virtual |
| **Deploy Integration**  | Check completion | Deploy actions   | New deploy state  | Virtual commit  |
| **Performance**         | 🏆 Fastest       | ✅ Good          | ⚠️ Slower         | ✅ Good         |
| **Complexity**          | ⚠️ High          | ⚠️ High          | ✅ Medium         | ⚠️ High         |

### Key Implementation Points

✅ **All approaches must handle:**

- Multiple simultaneous promotions
- Deploy session integration
- Last piece promotion rule
- Perfect undo/restoration

✅ **Common optimizations:**

- Cache commander attack detection
- Limit promotion checks to relevant pieces
- Batch process multiple promotions

✅ **Testing requirements:**

- 30+ tests for each approach
- Cover all promotion scenarios
- Verify perfect undo behavior
- Test deploy integration

**Choose based on your overall architecture preference - heroic promotion can be
implemented correctly in any approach with proper attention to the complex edge
cases.**
