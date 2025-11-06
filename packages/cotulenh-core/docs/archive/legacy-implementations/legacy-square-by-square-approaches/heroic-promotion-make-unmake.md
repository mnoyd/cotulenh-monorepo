# Heroic Promotion in Make/Unmake Pattern

## Overview

Heroic promotion is one of the most complex aspects of CoTuLenh move application
because:

1. **Multiple pieces can promote simultaneously** from a single move
2. **Promotion can happen during deploy sessions** with special rules
3. **Different promotion triggers** (commander attack vs last piece)
4. **Perfect undo must restore all heroic states** exactly

This document provides a complete implementation for handling heroic promotion
in the mutable make/unmake pattern.

---

## Core Challenge

### The Problem

```typescript
// Before move: Tank captures Infantry
e6: Infantry (Blue)
e5: Tank (Red, not heroic)
e8: Commander (Blue)

// After move: Tank now attacks commander → becomes heroic
e6: Tank (Red, HEROIC!)
e8: Commander (Blue) ← under attack

// Undo must restore:
// - Tank back to e5 (not heroic)
// - Infantry back to e6
// - Commander no longer under attack
```

### Complex Scenarios

#### Scenario 1: Multiple Simultaneous Promotions

```typescript
// Artillery captures blocking piece
Initial:
  e6: Artillery (Red)
  e7: Infantry (Blue) ← blocking commander
  e8: Commander (Blue)
  d7: Tank (Red)
  f7: Navy (Red)

// After Artillery captures Infantry at e7:
// - Artillery at e7 attacks commander (heroic!)
// - Tank at d7 now attacks commander (heroic!)
// - Navy at f7 now attacks commander (heroic!)
// Result: 3 pieces promoted in one move!
```

#### Scenario 2: Deploy with Promotion

```typescript
// During deploy session
Deploy state: e5 has Navy + [Air Force, Tank]

// Navy deploys to e7, captures Infantry, attacks commander
// - Navy becomes heroic
// - Deploy session continues (turn doesn't switch)
// - Must track both heroic change AND deploy state change
```

#### Scenario 3: Last Piece Promotion

```typescript
// HEADQUARTER becomes heroic when last remaining piece
Initial: Red has only HEADQUARTER at e5, Commander at e1

// When all other Red pieces are captured:
// - HEADQUARTER automatically becomes heroic
// - No commander attack needed
```

---

## Solution Architecture

### Enhanced UndoInfo Structure

```typescript
interface HeroicChange {
  square: Square
  wasHeroic: boolean // State before move
  isHeroic: boolean // State after move
}

interface UndoInfo {
  // Move identification
  move: Move

  // Basic board changes
  capturedPiece: Piece | null
  fromSquare: Piece | null
  toSquare: Piece | null

  // Heroic promotion tracking
  heroicChanges: HeroicChange[]

  // Deploy session state
  prevDeployState: DeployState | null

  // Game state
  prevTurn: Color
  prevCommanders: [Square, Square]
  prevMoveNumber: number
  prevHalfMoves: number

  // Air defense state (if applicable)
  prevAirDefense?: AirDefenseState
}
```

### Core Implementation

```typescript
class GameState {
  private board: Board
  private turn: Color
  private heroicPieces: Set<Square> = new Set()
  private commanders: [Square, Square]
  private deployState: DeployState | null = null

  makeMove(move: Move): UndoInfo {
    const undo: UndoInfo = {
      move,
      capturedPiece: null,
      fromSquare: this.board.get(move.from),
      toSquare: this.board.get(move.to),
      heroicChanges: [],
      prevDeployState: this.deployState ? { ...this.deployState } : null,
      prevTurn: this.turn,
      prevCommanders: [...this.commanders],
      prevMoveNumber: this.moveNumber,
      prevHalfMoves: this.halfMoves,
    }

    // 1. Apply the basic move (board changes)
    this.applyBasicMove(move, undo)

    // 2. Check and apply heroic promotions
    this.checkHeroicPromotions(move, undo)

    // 3. Update game state (turn, deploy, etc.)
    this.updateGameState(move, undo)

    return undo
  }

  unmakeMove(undo: UndoInfo): void {
    // CRITICAL: Restore heroic status BEFORE restoring board
    // (pieces must exist to modify their heroic property)
    this.restoreHeroicStatus(undo)

    // Restore board state
    this.revertBasicMove(undo)

    // Restore game state
    this.restoreGameState(undo)
  }
}
```

---

## Step 1: Basic Move Application

```typescript
private applyBasicMove(move: Move, undo: UndoInfo): void {
  switch (move.type) {
    case 'normal':
      this.board.set(move.from, null)
      this.board.set(move.to, move.piece)
      break

    case 'capture':
      undo.capturedPiece = this.board.get(move.to)
      this.board.set(move.from, null)
      this.board.set(move.to, move.piece)
      break

    case 'stay-capture':
      undo.capturedPiece = this.board.get(move.target)
      this.board.set(move.target, null)
      // Piece stays at original square
      break

    case 'combine':
      const movingPiece = this.board.get(move.from)
      const targetPiece = this.board.get(move.to)
      const combinedStack = this.combineStacks(movingPiece, targetPiece)

      this.board.set(move.from, null)
      this.board.set(move.to, combinedStack)
      break

    case 'deploy-step':
      this.applyDeployStep(move, undo)
      break

    case 'deploy-start':
      this.startDeploySession(move, undo)
      break

    default:
      throw new Error(`Unknown move type: ${move.type}`)
  }

  // Update commander position if commander moved
  if (move.piece?.type === COMMANDER) {
    const commanderIndex = move.piece.color === 'r' ? 0 : 1
    this.commanders[commanderIndex] = move.to
  }
}

private applyDeployStep(move: DeployStepMove, undo: UndoInfo): void {
  const session = this.deployState!

  // Remove piece from original stack
  const originalStack = this.board.get(session.originalSquare)
  const newStack = this.removeFromStack(originalStack, move.piece)
  this.board.set(session.originalSquare, newStack)

  // Handle capture at destination
  if (move.capturedPiece) {
    undo.capturedPiece = this.board.get(move.to)
    this.board.set(move.to, null)
  }

  // Place piece at destination
  this.board.set(move.to, move.piece)

  // Update deploy session
  session.remaining = session.remaining.filter(p => p !== move.piece)
  session.deployed.push({
    piece: move.piece,
    destination: move.to,
    captured: move.capturedPiece
  })
}
```

---

## Step 2: Heroic Promotion Logic

### Main Promotion Checker

```typescript
private checkHeroicPromotions(move: Move, undo: UndoInfo): void {
  // 1. Check commander attack promotions
  this.checkCommanderAttackPromotions(move, undo)

  // 2. Check last piece promotion
  this.checkLastPiecePromotion(move, undo)

  // 3. Handle special cases (deploy completion, etc.)
  this.checkSpecialPromotions(move, undo)
}
```

### Commander Attack Promotions

```typescript
private checkCommanderAttackPromotions(move: Move, undo: UndoInfo): void {
  const color = move.piece.color
  const enemyCommander = this.commanders[color === 'r' ? 1 : 0]

  // Find all pieces that now attack the enemy commander
  const attackers = this.findCommanderAttackers(enemyCommander, color)

  // Promote any non-heroic attackers
  for (const square of attackers) {
    const piece = this.board.get(square)
    if (piece && !piece.heroic) {
      // Record the change for undo
      undo.heroicChanges.push({
        square,
        wasHeroic: false,
        isHeroic: true
      })

      // Apply the promotion
      piece.heroic = true
      this.heroicPieces.add(square)
    }
  }
}

private findCommanderAttackers(commanderSquare: Square, color: Color): Square[] {
  const attackers: Square[] = []

  // Check all pieces of the given color
  for (let sq = 0; sq < 256; sq++) {
    if (!isValidSquare(sq)) continue

    const piece = this.board.get(sq)
    if (piece?.color === color) {
      if (this.canAttackSquare(sq, piece, commanderSquare)) {
        attackers.push(sq)
      }
    }
  }

  return attackers
}

private canAttackSquare(from: Square, piece: Piece, target: Square): boolean {
  // Use piece-specific attack generation
  const generator = PIECE_GENERATORS[piece.type]

  // Generate all possible attacks from this square
  const attacks = generator.generateAttacks(this.board, from, piece)

  // Check if target square is in attack list
  return attacks.some(attack => attack.to === target)
}
```

### Last Piece Promotion

```typescript
private checkLastPiecePromotion(move: Move, undo: UndoInfo): void {
  const color = move.piece.color

  // Count non-commander pieces for this color
  const nonCommanderPieces = this.countNonCommanderPieces(color)

  if (nonCommanderPieces === 1) {
    // Find the last remaining piece
    const lastPieceSquare = this.findLastPiece(color)

    if (lastPieceSquare) {
      const piece = this.board.get(lastPieceSquare)

      if (piece && !piece.heroic) {
        // Record the change
        undo.heroicChanges.push({
          square: lastPieceSquare,
          wasHeroic: false,
          isHeroic: true
        })

        // Apply promotion
        piece.heroic = true
        this.heroicPieces.add(lastPieceSquare)
      }
    }
  }
}

private countNonCommanderPieces(color: Color): number {
  let count = 0

  for (let sq = 0; sq < 256; sq++) {
    if (!isValidSquare(sq)) continue

    const piece = this.board.get(sq)
    if (piece?.color === color && piece.type !== COMMANDER) {
      count++
    }
  }

  return count
}

private findLastPiece(color: Color): Square | null {
  for (let sq = 0; sq < 256; sq++) {
    if (!isValidSquare(sq)) continue

    const piece = this.board.get(sq)
    if (piece?.color === color && piece.type !== COMMANDER) {
      return sq
    }
  }

  return null
}
```

### Special Promotion Cases

```typescript
private checkSpecialPromotions(move: Move, undo: UndoInfo): void {
  // Handle deploy completion promotion
  if (move.type === 'deploy-step' && this.isDeployComplete()) {
    // Deploy just completed - check for last piece promotion
    this.checkLastPiecePromotion(move, undo)
  }

  // Handle piece already heroic (preserve status)
  if (move.piece.heroic) {
    const destinationSquare = this.getDestinationSquare(move)

    // Ensure heroic status is tracked even if piece was already heroic
    const existingChange = undo.heroicChanges.find(c => c.square === destinationSquare)

    if (!existingChange) {
      undo.heroicChanges.push({
        square: destinationSquare,
        wasHeroic: true,
        isHeroic: true
      })
    }
  }
}

private isDeployComplete(): boolean {
  if (!this.deployState) return false

  const totalPieces = this.deployState.originalStack.length
  const deployed = this.deployState.deployed.length
  const staying = this.deployState.staying.length

  return deployed + staying === totalPieces
}

private getDestinationSquare(move: Move): Square {
  switch (move.type) {
    case 'normal':
    case 'capture':
    case 'combine':
    case 'deploy-step':
      return move.to

    case 'stay-capture':
      return move.from  // Piece stays at original square

    default:
      throw new Error(`Cannot determine destination for move type: ${move.type}`)
  }
}
```

---

## Step 3: Game State Updates

```typescript
private updateGameState(move: Move, undo: UndoInfo): void {
  // Update turn (depends on move type and deploy state)
  const shouldSwitchTurn = this.shouldSwitchTurn(move)

  if (shouldSwitchTurn) {
    this.turn = this.turn === 'r' ? 'b' : 'r'
  }

  // Update move counters
  if (shouldSwitchTurn) {
    if (this.turn === 'r') {
      this.moveNumber++
    }
  }

  // Reset half-move clock on capture or pawn move
  if (move.type === 'capture' || move.type === 'stay-capture' || undo.capturedPiece) {
    this.halfMoves = 0
  } else if (shouldSwitchTurn) {
    this.halfMoves++
  }

  // Update deploy state
  this.updateDeployState(move, undo)
}

private shouldSwitchTurn(move: Move): boolean {
  switch (move.type) {
    case 'normal':
    case 'capture':
    case 'stay-capture':
    case 'combine':
      return true  // Normal moves always switch turn

    case 'deploy-start':
      return false  // Starting deploy doesn't switch turn

    case 'deploy-step':
      // Switch turn only if deploy is complete
      return this.isDeployComplete()

    case 'deploy-stay':
      // Check if all pieces are now accounted for
      return this.isDeployComplete()

    default:
      return true
  }
}

private updateDeployState(move: Move, undo: UndoInfo): void {
  if (move.type === 'deploy-start') {
    // Deploy state already created in applyBasicMove
    return
  }

  if (move.type === 'deploy-step' && this.isDeployComplete()) {
    // Deploy completed - clear state
    this.deployState = null
  }

  // Other deploy state updates handled in applyDeployStep
}
```

---

## Step 4: Perfect Undo Implementation

```typescript
private restoreHeroicStatus(undo: UndoInfo): void {
  // Restore heroic status for all affected pieces
  for (const change of undo.heroicChanges) {
    const piece = this.board.get(change.square)

    if (piece) {
      // Restore previous heroic status
      piece.heroic = change.wasHeroic

      // Update heroic pieces set
      if (change.wasHeroic) {
        this.heroicPieces.add(change.square)
      } else {
        this.heroicPieces.delete(change.square)
      }
    }
  }
}

private revertBasicMove(undo: UndoInfo): void {
  const move = undo.move

  switch (move.type) {
    case 'normal':
      this.board.set(move.to, undo.toSquare)
      this.board.set(move.from, undo.fromSquare)
      break

    case 'capture':
      this.board.set(move.to, undo.capturedPiece)
      this.board.set(move.from, undo.fromSquare)
      break

    case 'stay-capture':
      // Restore captured piece
      if (undo.capturedPiece) {
        this.board.set(move.target, undo.capturedPiece)
      }
      // Piece was never moved, so no need to restore position
      break

    case 'combine':
      // Split the combined stack back
      this.revertCombineMove(move, undo)
      break

    case 'deploy-step':
      this.revertDeployStep(move, undo)
      break

    case 'deploy-start':
      // Deploy state restoration handled in restoreGameState
      break

    default:
      throw new Error(`Unknown move type for undo: ${move.type}`)
  }
}

private revertDeployStep(move: DeployStepMove, undo: UndoInfo): void {
  // Remove piece from destination
  this.board.set(move.to, null)

  // Restore captured piece if any
  if (undo.capturedPiece) {
    this.board.set(move.to, undo.capturedPiece)
  }

  // Restore original stack
  const currentStack = this.board.get(this.deployState!.originalSquare)
  const restoredStack = this.addToStack(currentStack, move.piece)
  this.board.set(this.deployState!.originalSquare, restoredStack)
}

private restoreGameState(undo: UndoInfo): void {
  // Restore turn
  this.turn = undo.prevTurn

  // Restore commanders
  this.commanders = undo.prevCommanders

  // Restore deploy state
  this.deployState = undo.prevDeployState

  // Restore counters
  this.moveNumber = undo.prevMoveNumber
  this.halfMoves = undo.prevHalfMoves
}
```

---

## Complete Examples

### Example 1: Single Promotion with Undo

```typescript
// Setup position where Tank can capture and attack commander
const state = GameState.fromFEN('...')

// Initial state
console.log(state.board.get('e5')) // Tank (Red, not heroic)
console.log(state.board.get('e6')) // Infantry (Blue)
console.log(state.heroicPieces.size) // 0

// Execute capture move
const move = { type: 'capture', from: 'e5', to: 'e6', piece: tank }
const undo = state.makeMove(move)

// After move
console.log(state.board.get('e6')) // Tank (Red, HEROIC!)
console.log(state.board.get('e5')) // null
console.log(state.heroicPieces.size) // 1
console.log(undo.heroicChanges)
// [{ square: 'e6', wasHeroic: false, isHeroic: true }]

// Undo move
state.unmakeMove(undo)

// Restored state
console.log(state.board.get('e5')) // Tank (Red, not heroic)
console.log(state.board.get('e6')) // Infantry (Blue)
console.log(state.heroicPieces.size) // 0
```

### Example 2: Multiple Promotions

```typescript
// Artillery captures piece, exposing commander to multiple attackers
const move = { type: 'capture', from: 'e6', to: 'e7', piece: artillery }
const undo = state.makeMove(move)

console.log(undo.heroicChanges)
// [
//   { square: 'e7', wasHeroic: false, isHeroic: true },  // Artillery
//   { square: 'd7', wasHeroic: false, isHeroic: true },  // Tank
//   { square: 'f7', wasHeroic: false, isHeroic: true }   // Navy
// ]

console.log(state.heroicPieces.size) // 3

// Undo restores all
state.unmakeMove(undo)

console.log(state.heroicPieces.size) // 0
console.log(state.board.get('e7').heroic) // false
console.log(state.board.get('d7').heroic) // false
console.log(state.board.get('f7').heroic) // false
```

### Example 3: Deploy with Promotion

```typescript
// Start deploy
state.makeMove({ type: 'deploy-start', square: 'e5' })

// Deploy step with capture and promotion
const deployMove = {
  type: 'deploy-step',
  piece: navy,
  from: 'e5',
  to: 'e7',
  capturedPiece: enemyInfantry,
}

const undo = state.makeMove(deployMove)

console.log(undo.heroicChanges)
// [{ square: 'e7', wasHeroic: false, isHeroic: true }]

console.log(undo.prevDeployState) // Previous deploy state
console.log(state.deployState.remaining) // Updated remaining pieces
console.log(state.turn) // Still 'r' (deploy not complete)

// Undo restores both heroic status and deploy state
state.unmakeMove(undo)

console.log(state.board.get('e7').heroic) // false
console.log(state.deployState.remaining.length) // Restored count
```

---

## Performance Optimizations

### Efficient Commander Attack Detection

```typescript
private findCommanderAttackers(commanderSquare: Square, color: Color): Square[] {
  const attackers: Square[] = []

  // Only check pieces within maximum possible range
  const candidates = this.getPiecesInAttackRange(commanderSquare, color)

  for (const square of candidates) {
    const piece = this.board.get(square)
    if (this.canAttackSquare(square, piece, commanderSquare)) {
      attackers.push(square)
    }
  }

  return attackers
}

private getPiecesInAttackRange(target: Square, color: Color): Square[] {
  const maxRange = 4  // Air Force has longest range
  const candidates: Square[] = []

  const targetFile = file(target)
  const targetRank = rank(target)

  // Check squares within max range
  for (let f = Math.max(0, targetFile - maxRange); f <= Math.min(11, targetFile + maxRange); f++) {
    for (let r = Math.max(0, targetRank - maxRange); r <= Math.min(11, targetRank + maxRange); r++) {
      const sq = square(f, r)

      if (isValidSquare(sq)) {
        const piece = this.board.get(sq)
        if (piece?.color === color) {
          candidates.push(sq)
        }
      }
    }
  }

  return candidates
}
```

### Minimize Heroic Change Objects

```typescript
// Pool heroic change objects to reduce allocations
private heroicChangePool: HeroicChange[] = []

private createHeroicChange(square: Square, wasHeroic: boolean, isHeroic: boolean): HeroicChange {
  let change = this.heroicChangePool.pop()

  if (!change) {
    change = { square: 0, wasHeroic: false, isHeroic: false }
  }

  change.square = square
  change.wasHeroic = wasHeroic
  change.isHeroic = isHeroic

  return change
}

private releaseHeroicChanges(changes: HeroicChange[]): void {
  // Return objects to pool for reuse
  this.heroicChangePool.push(...changes)
}
```

---

## Testing Strategy

### Unit Tests for Heroic Logic

```typescript
describe('Heroic Promotion', () => {
  describe('Commander Attack Promotion', () => {
    it('should promote single attacker', () => {
      const state = setupSingleAttackPosition()
      const move = findCommanderAttackMove(state)
      const undo = state.makeMove(move)

      expect(undo.heroicChanges).toHaveLength(1)
      expect(undo.heroicChanges[0]).toEqual({
        square: move.to,
        wasHeroic: false,
        isHeroic: true,
      })

      expect(state.board.get(move.to).heroic).toBe(true)
    })

    it('should promote multiple attackers', () => {
      const state = setupMultipleAttackPosition()
      const move = findMoveExposingCommander(state)
      const undo = state.makeMove(move)

      expect(undo.heroicChanges.length).toBeGreaterThan(1)

      for (const change of undo.heroicChanges) {
        expect(change.wasHeroic).toBe(false)
        expect(change.isHeroic).toBe(true)
        expect(state.board.get(change.square).heroic).toBe(true)
      }
    })

    it('should preserve existing heroic status', () => {
      const state = setupWithExistingHeroic()
      const heroicPiece = findHeroicPiece(state)
      const move = createMoveForHeroicPiece(heroicPiece)

      const undo = state.makeMove(move)

      const heroicChange = undo.heroicChanges.find((c) => c.square === move.to)
      expect(heroicChange).toEqual({
        square: move.to,
        wasHeroic: true,
        isHeroic: true,
      })
    })
  })

  describe('Last Piece Promotion', () => {
    it('should promote last remaining piece', () => {
      const state = setupLastPiecePosition()
      const move = captureSecondToLastPiece(state)

      const undo = state.makeMove(move)

      const lastPieceChange = undo.heroicChanges.find(
        (c) => c.isHeroic && !c.wasHeroic,
      )
      expect(lastPieceChange).toBeDefined()

      const lastPiece = state.board.get(lastPieceChange.square)
      expect(lastPiece.heroic).toBe(true)
    })

    it('should not promote if multiple pieces remain', () => {
      const state = setupMultiplePiecesPosition()
      const move = captureOnePiece(state)

      const undo = state.makeMove(move)

      // Should only have promotion for commander attack, not last piece
      const lastPiecePromotions = undo.heroicChanges.filter(
        (c) =>
          c.isHeroic && !c.wasHeroic && !isCommanderAttacker(state, c.square),
      )

      expect(lastPiecePromotions).toHaveLength(0)
    })
  })

  describe('Deploy Integration', () => {
    it('should handle promotion during deploy', () => {
      const state = startDeploySession()
      const deployMove = createDeployMoveWithPromotion()

      const undo = state.makeMove(deployMove)

      expect(undo.heroicChanges).toHaveLength(1)
      expect(undo.prevDeployState).toBeDefined()
      expect(state.turn).toBe(undo.prevTurn) // Turn shouldn't switch
    })

    it('should promote on deploy completion', () => {
      const state = setupAlmostCompleteDeployWithLastPiece()
      const finalDeployMove = createFinalDeployMove()

      const undo = state.makeMove(finalDeployMove)

      // Should have both deploy completion and last piece promotion
      expect(undo.heroicChanges.length).toBeGreaterThanOrEqual(1)
      expect(state.deployState).toBeNull() // Deploy completed
      expect(state.turn).not.toBe(undo.prevTurn) // Turn switched
    })
  })
})

describe('Heroic Undo', () => {
  it('should perfectly restore single promotion', () => {
    const state = setupPromotionPosition()
    const stateBefore = state.clone()

    const move = findPromotionMove(state)
    const undo = state.makeMove(move)

    // Verify promotion happened
    expect(undo.heroicChanges.length).toBeGreaterThan(0)

    // Undo
    state.unmakeMove(undo)

    // Verify perfect restoration
    expect(state).toEqual(stateBefore)
  })

  it('should restore multiple promotions', () => {
    const state = setupMultiplePromotionPosition()
    const stateBefore = state.clone()

    const move = findMultiplePromotionMove(state)
    const undo = state.makeMove(move)

    expect(undo.heroicChanges.length).toBeGreaterThan(1)

    state.unmakeMove(undo)

    expect(state).toEqual(stateBefore)
  })

  it('should restore deploy with promotion', () => {
    const state = setupDeployWithPromotionPosition()
    const stateBefore = state.clone()

    const deployMove = findDeployPromotionMove(state)
    const undo = state.makeMove(deployMove)

    expect(undo.heroicChanges.length).toBeGreaterThan(0)
    expect(undo.prevDeployState).toBeDefined()

    state.unmakeMove(undo)

    expect(state).toEqual(stateBefore)
  })
})
```

### Integration Tests

```typescript
describe('Heroic Integration', () => {
  it('should handle complex sequence with multiple promotions', () => {
    const state = setupComplexPosition()
    const moves = [
      findFirstMove(state),
      findSecondMove(state),
      findPromotionMove(state),
    ]

    const undos = []

    // Apply sequence
    for (const move of moves) {
      undos.push(state.makeMove(move))
    }

    // Verify final state
    expect(state.heroicPieces.size).toBeGreaterThan(0)

    // Undo sequence in reverse
    for (let i = undos.length - 1; i >= 0; i--) {
      state.unmakeMove(undos[i])
    }

    // Should be back to initial state
    expect(state.heroicPieces.size).toBe(0)
  })
})
```

---

## Error Handling and Validation

### Runtime Validation (Development Mode)

```typescript
private validateHeroicState(): void {
  if (!this.isDebugMode()) return

  // Verify heroicPieces set matches actual board state
  const actualHeroicSquares = new Set<Square>()

  for (let sq = 0; sq < 256; sq++) {
    if (!isValidSquare(sq)) continue

    const piece = this.board.get(sq)
    if (piece?.heroic) {
      actualHeroicSquares.add(sq)
    }
  }

  // Compare with tracked set
  if (!setsEqual(this.heroicPieces, actualHeroicSquares)) {
    throw new Error(
      `Heroic state mismatch! ` +
      `Tracked: ${Array.from(this.heroicPieces)} ` +
      `Actual: ${Array.from(actualHeroicSquares)}`
    )
  }
}

private isDebugMode(): boolean {
  return process.env.NODE_ENV === 'development'
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false

  for (const item of a) {
    if (!b.has(item)) return false
  }

  return true
}
```

### Undo Validation

```typescript
unmakeMove(undo: UndoInfo): void {
  // Store state before undo for validation
  const stateBeforeUndo = this.isDebugMode() ? this.clone() : null

  // Perform undo
  this.restoreHeroicStatus(undo)
  this.revertBasicMove(undo)
  this.restoreGameState(undo)

  // Validate undo correctness
  if (this.isDebugMode()) {
    this.validateUndoCorrectness(undo, stateBeforeUndo)
  }
}

private validateUndoCorrectness(undo: UndoInfo, stateBeforeUndo: GameState): void {
  // Re-apply the move and verify we get back to the same state
  const redoUndo = this.makeMove(undo.move)

  if (!this.equals(stateBeforeUndo)) {
    throw new Error(
      `Undo/redo mismatch! Move: ${JSON.stringify(undo.move)}`
    )
  }

  // Undo again to restore original state
  this.unmakeMove(redoUndo)
}
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure (Week 1)

- [ ] Define `HeroicChange` interface
- [ ] Enhance `UndoInfo` with `heroicChanges` array
- [ ] Implement `restoreHeroicStatus()` method
- [ ] Add heroic tracking to basic move application
- [ ] **Test:** Simple single promotion scenarios

### Phase 2: Commander Attack Detection (Week 1)

- [ ] Implement `findCommanderAttackers()` method
- [ ] Implement `canAttackSquare()` with piece generators
- [ ] Handle multiple simultaneous promotions
- [ ] Optimize attack range detection
- [ ] **Test:** Multiple promotion scenarios

### Phase 3: Last Piece Promotion (Week 2)

- [ ] Implement `checkLastPiecePromotion()` method
- [ ] Handle piece counting logic
- [ ] Integrate with deploy completion
- [ ] **Test:** Last piece scenarios including HEADQUARTER

### Phase 4: Deploy Integration (Week 2)

- [ ] Handle heroic promotion during deploy steps
- [ ] Track deploy state changes in undo
- [ ] Handle promotion on deploy completion
- [ ] **Test:** Deploy with promotion scenarios

### Phase 5: Performance & Validation (Week 3)

- [ ] Optimize commander attack detection
- [ ] Add object pooling for heroic changes
- [ ] Implement runtime validation (debug mode)
- [ ] Add undo correctness validation
- [ ] **Test:** Performance benchmarks

### Phase 6: Comprehensive Testing (Week 3)

- [ ] Unit tests for all promotion types (30+ tests)
- [ ] Integration tests for complex sequences (20+ tests)
- [ ] Edge case tests (existing heroic, empty board, etc.) (15+ tests)
- [ ] Performance tests (move generation with promotions)
- [ ] **Target:** 65+ tests covering all heroic scenarios

---

## Summary

This implementation provides:

✅ **Complete heroic promotion handling** for all scenarios ✅ **Perfect undo
capability** with detailed change tracking  
✅ **Deploy session integration** with proper state management ✅ **Performance
optimizations** for attack detection ✅ **Comprehensive validation** in
development mode ✅ **Extensive test coverage** for all edge cases

**Key principles:**

1. **Track everything** - Record all heroic changes in undo info
2. **Restore in correct order** - Heroic status before board state
3. **Handle complexity** - Multiple promotions, deploy integration
4. **Validate thoroughly** - Runtime checks and comprehensive tests
5. **Optimize smartly** - Efficient attack detection and object pooling

This approach ensures that heroic promotion works correctly in all scenarios
while maintaining the performance and reliability needed for a production chess
engine.
