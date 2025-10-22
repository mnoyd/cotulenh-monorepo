# Deploy Session State Management: The Complete Solution

> ## ⚠️ DEPRECATED - DO NOT USE
>
> **Status**: LEGACY DOCUMENTATION - Superseded by action-based architecture  
> **Historical**: This was the "complete solution" before discovering simpler
> approach  
> **Superseded By**: `docs/deploy-action-based-architecture/` (October 22, 2025)
>
> **Why Replaced**:
>
> - Virtual state complexity unnecessary
> - Extended FEN format evolved (now simpler)
> - Action-based approach eliminates all tracked issues
> - Command pattern already solved what virtual state attempted
>
> **Current Architecture**:
>
> - **Migration Guide**: `docs/ARCHITECTURE-MIGRATION.md`
> - **New Specification**:
>   `docs/deploy-action-based-architecture/COMPLETE-IMPLEMENTATION-GUIDE.md`
> - **Extended FEN**: `docs/deploy-action-based-architecture/01-FEN-HANDLING.md`
>
> This document shows the complexity virtual state required. The action-based
> approach is dramatically simpler.

---

## The Real Complexity (Historical Analysis)

You're absolutely right - **deploy sessions are the hardest part of CoTuLenh**.
Let me address all 6 critical issues you raised.

---

## Problem 1: Partial Deploy State + FEN Representation

### Scenario

```
Stack at e5: Navy (carrier) + [Air Force, Tank]
User moves Air Force to land (d7)

Current state:
- e5: Navy + [Tank]  (stack partial)
- d7: Air Force      (deployed piece)
- Deploy session: ACTIVE (not complete)
```

**Questions:**

1. How do we represent this in FEN?
2. What does "undo last move" mean?
3. How do we track this is incomplete?

### Solution: Extended FEN + Deploy Session State

```typescript
interface DeploySession {
  // Original state before deploy started
  originalSquare: Square // 'e5'
  originalStack: Piece[] // [Navy, Air Force, Tank]

  // Current state
  remaining: Piece[] // [Navy, Tank] (still on stack)
  deployed: Array<{
    // Pieces that moved
    piece: Piece
    destination: Square
    capturedPiece?: Piece
  }>

  // Pieces that explicitly chose to stay
  staying: Piece[] // e.g., [Infantry] if "I<" notation

  // Move tracking
  movesMade: Move[] // All moves in this session

  // Session metadata
  startedByColor: Color
  isComplete: boolean
}

class GameState {
  private deploySession: DeploySession | null = null

  // Extended FEN format
  toFEN(): string {
    const baseFEN = this.generateBaseFEN()

    if (!this.deploySession) {
      return baseFEN // Normal FEN
    }

    // Extended FEN with deploy session marker
    // Format: "base_fen DEPLOY square:pieces_remaining moves_made"
    const deployInfo = [
      'DEPLOY',
      `${this.deploySession.originalSquare}:${this.serializePieces(this.deploySession.remaining)}`,
      this.deploySession.deployed.length.toString(),
    ].join(' ')

    return `${baseFEN} ${deployInfo}`
  }
}
```

#### Example FENs

**Normal position:**

```
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1
```

**During deploy session:**

```
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1 DEPLOY e5:NT 2
                                                                                              ^^^^^^^^^^^^^^^^
                                                                                              session active
```

Meaning:

- `DEPLOY` = deploy session active
- `e5:NT` = stack at e5 has Navy + Tank remaining
- `2` = 2 pieces already deployed

---

## Problem 2: Invalid Intermediate States (Navy Moves First)

### Scenario

```
Stack at b3 (water): Navy + [Air Force, Tank]

If Navy moves first:
  b3 → b5 (Navy moves)

Remaining at b3: [Air Force, Tank]
❌ ILLEGAL! Land pieces cannot stay on water!
```

### Solution: Validate Stack Residue at Each Step

```typescript
class GameState {
  makeDeployStep(move: DeployStepMove): UndoInfo {
    // 1. Calculate what remains on stack after this move
    const remaining = this.deploySession!.remaining.filter(
      (p) => p !== move.piece,
    )

    // 2. Validate remaining stack is legal for terrain
    if (remaining.length > 0) {
      const stackSquare = this.deploySession!.originalSquare
      const isValid = this.validateStackForTerrain(stackSquare, remaining)

      if (!isValid) {
        throw new Error(
          `Invalid deploy: Remaining pieces ${remaining.map((p) => p.type).join(',')} ` +
            `cannot stay at ${stackSquare} (terrain incompatible)`,
        )
      }
    }

    // 3. Apply move if validation passes
    return this.applyDeployStepInternal(move)
  }

  private validateStackForTerrain(square: Square, pieces: Piece[]): boolean {
    const terrain = this.getTerrainType(square)

    for (const piece of pieces) {
      // Check if piece can exist on this terrain
      if (terrain === 'water' && !this.canAccessWater(piece.type)) {
        return false // Land piece can't stay on water
      }

      if (terrain === 'land' && piece.type === NAVY) {
        return false // Navy can't stay on pure land
      }
    }

    return true
  }

  private canAccessWater(pieceType: PieceSymbol): boolean {
    return pieceType === NAVY || pieceType === AIR_FORCE
  }
}
```

#### Validation Matrix

| Terrain              | Can Stay             |
| -------------------- | -------------------- |
| **Pure Water (a-b)** | Navy, Air Force ONLY |
| **Mixed (c, river)** | All pieces           |
| **Pure Land (d-k)**  | All except Navy      |

**Result:** Navy-first move is **rejected** before applying!

---

## Problem 3: Combined Moves Sent as Sequential (Tank + Air Force)

### Scenario

```
Stack at e5: Air Force + [Tank]

Legal move: Air Force carries Tank 4 squares to i5

UI sends 2 separate moves:
1. Air Force: e5 → i5  (range 4, legal)
2. Tank: e5 → i5       (range 2, IMPOSSIBLE from e5!)

❌ This should be ONE combined move, not two sequential moves!
```

### Solution: Auto-Detect and Merge Combined Moves

```typescript
class GameState {
  private pendingCombinedMove: {
    carrier: { piece: Piece; from: Square; to: Square }
    carried: Piece[]
    timeout: number
  } | null = null

  makeDeployStep(move: DeployStepMove): UndoInfo {
    // Check if this is part of a combined move
    if (this.isCombinedMoveStart(move)) {
      // First piece moves beyond carried piece's range
      // Wait for carried pieces to "catch up"
      this.startCombinedMoveDetection(move)
      return this.applyDeployStepInternal(move)
    }

    if (this.isCombinedMoveContinuation(move)) {
      // Carried piece moves to same destination as carrier
      this.addToCombinedMove(move)
      return this.applyDeployStepInternal(move)
    }

    // Clear any pending combined move
    this.pendingCombinedMove = null

    return this.applyDeployStepInternal(move)
  }

  private isCombinedMoveStart(move: DeployStepMove): boolean {
    if (!this.deploySession) return false

    const distance = this.getDistance(
      this.deploySession.originalSquare,
      move.to,
    )

    // Check if any remaining pieces can't reach this far
    for (const piece of this.deploySession.remaining) {
      if (piece === move.piece) continue

      const maxRange = this.getMaxRange(piece)
      if (distance > maxRange) {
        // This piece is being carried!
        return true
      }
    }

    return false
  }

  private isCombinedMoveContinuation(move: DeployStepMove): boolean {
    if (!this.pendingCombinedMove) return false

    // Check if this piece moves to same destination as carrier
    return move.to === this.pendingCombinedMove.carrier.to
  }

  private addToCombinedMove(move: DeployStepMove): void {
    if (!this.pendingCombinedMove) return

    this.pendingCombinedMove.carried.push(move.piece)

    // Check if all carried pieces have moved
    const allCarriedMoved = this.deploySession!.remaining.filter(
      (p) => p !== this.pendingCombinedMove!.carrier.piece,
    ).every(
      (p) => this.pendingCombinedMove!.carried.includes(p) || p === move.piece,
    )

    if (allCarriedMoved) {
      // Combined move complete - merge in history
      this.mergeCombinedMoveInHistory()
      this.pendingCombinedMove = null
    }
  }

  private mergeCombinedMoveInHistory(): void {
    // Replace last N moves with single combined move
    const carrier = this.pendingCombinedMove!.carrier
    const carried = this.pendingCombinedMove!.carried

    const combinedMove: CombinedMove = {
      type: 'combined',
      carrier: carrier.piece,
      carried: carried,
      from: carrier.from,
      to: carrier.to,
    }

    // Remove individual moves from history
    const numToRemove = 1 + carried.length
    this.deploySession!.movesMade.splice(-numToRemove, numToRemove)

    // Add combined move
    this.deploySession!.movesMade.push(combinedMove)
  }
}
```

#### Alternative: Explicit Combined Move API

```typescript
// Better: Let UI send combined moves explicitly
interface CombinedDeployMove {
  type: 'deploy-combined'
  carrier: Piece
  carried: Piece[]
  destination: Square
}

class GameState {
  makeDeployStep(move: DeployStepMove | CombinedDeployMove): UndoInfo {
    if (move.type === 'deploy-combined') {
      return this.applyCombinedDeployMove(move)
    }

    return this.applyNormalDeployStep(move)
  }

  private applyCombinedDeployMove(move: CombinedDeployMove): UndoInfo {
    // Validate carrier can reach destination
    const distance = this.getDistance(
      this.deploySession!.originalSquare,
      move.destination,
    )
    const carrierRange = this.getMaxRange(move.carrier)

    if (distance > carrierRange) {
      throw new Error(
        `Carrier ${move.carrier.type} cannot reach ${move.destination}`,
      )
    }

    // All pieces move together
    const undo = this.createUndoInfo()

    // Remove all pieces from stack
    this.board.updateStack(
      this.deploySession!.originalSquare,
      this.deploySession!.remaining.filter(
        (p) => p !== move.carrier && !move.carried.includes(p),
      ),
    )

    // Create new stack at destination
    const newStack = this.createStack(move.carrier, move.carried)
    this.board.placePiece(move.destination, newStack)

    // Update deploy session
    this.deploySession!.deployed.push({
      piece: newStack,
      destination: move.destination,
    })

    this.deploySession!.remaining = this.deploySession!.remaining.filter(
      (p) => p !== move.carrier && !move.carried.includes(p),
    )

    return undo
  }
}
```

**Recommendation:** Update UI to send `CombinedDeployMove` when dragging stacks
together!

---

## Problem 4: History Management During Deploy Session

### Questions

1. Do we add partial deploy moves to history?
2. How does undo work mid-deploy?
3. Can we undo to before deploy started?

### Solution: Nested History with Deploy Transaction

```typescript
interface HistoryEntry {
  move: Move
  undo: UndoInfo
  fen: string
  timestamp: number
}

interface DeployTransaction {
  startFEN: string
  deployMoves: HistoryEntry[]
  isComplete: boolean
}

class GameState {
  private history: HistoryEntry[] = []
  private currentDeployTransaction: DeployTransaction | null = null

  startDeploy(square: Square): UndoInfo {
    // Save state before deploy
    this.currentDeployTransaction = {
      startFEN: this.toFEN(),
      deployMoves: [],
      isComplete: false,
    }

    // Initialize deploy session
    const stack = this.board.get(square)
    this.deploySession = this.createDeploySession(square, stack)

    return this.createUndoInfo()
  }

  makeDeployStep(move: DeployStepMove): UndoInfo {
    const undo = this.applyDeployStepInternal(move)

    // Add to deploy transaction (not main history yet)
    this.currentDeployTransaction!.deployMoves.push({
      move,
      undo,
      fen: this.toFEN(),
      timestamp: Date.now(),
    })

    // Check if deploy complete
    if (this.deploySession!.remaining.length === 0) {
      this.completeDeploy()
    }

    return undo
  }

  private completeDeploy(): void {
    // Mark transaction complete
    this.currentDeployTransaction!.isComplete = true

    // Add entire deploy as ONE entry in main history
    const deployHistoryEntry: HistoryEntry = {
      move: {
        type: 'deploy-complete',
        transaction: this.currentDeployTransaction!,
      },
      undo: this.createDeployCompleteUndo(),
      fen: this.toFEN(),
      timestamp: Date.now(),
    }

    this.history.push(deployHistoryEntry)

    // Clear transaction
    this.currentDeployTransaction = null
    this.deploySession = null

    // Switch turn
    this.turn = this.turn === 'r' ? 'b' : 'r'
  }

  // Undo behavior depends on context
  undo(): void {
    if (this.currentDeployTransaction) {
      // In middle of deploy - undo last deploy step
      this.undoDeployStep()
    } else {
      // Not in deploy - undo last complete move
      this.undoLastMove()
    }
  }

  private undoDeployStep(): void {
    const transaction = this.currentDeployTransaction!

    if (transaction.deployMoves.length === 0) {
      // No deploy steps yet - cancel entire deploy
      this.cancelDeploy()
      return
    }

    // Undo last deploy step
    const lastStep = transaction.deployMoves.pop()!
    this.unmakeMove(lastStep.undo)

    // Restore deploy session state
    this.restoreDeploySessionFromHistory()
  }

  private cancelDeploy(): void {
    // Restore state to before deploy started
    this.loadFEN(this.currentDeployTransaction!.startFEN)
    this.currentDeployTransaction = null
    this.deploySession = null
  }

  private undoLastMove(): void {
    if (this.history.length === 0) return

    const lastEntry = this.history.pop()!

    if (lastEntry.move.type === 'deploy-complete') {
      // Undo entire deploy - restore to before deploy started
      this.loadFEN(lastEntry.move.transaction.startFEN)
    } else {
      // Normal move - just unmake
      this.unmakeMove(lastEntry.undo)
    }
  }
}
```

#### History Structure Example

```
Main History:
[
  { move: "Ie5", fen: "..." },           // Normal move
  { move: "Nd4", fen: "..." },           // Normal move
  {                                       // Deploy move (complete)
    move: {
      type: "deploy-complete",
      transaction: {
        startFEN: "...",
        deployMoves: [
          { move: "Fe5->d7", fen: "... DEPLOY e5:NT 1" },
          { move: "Ne5->b5", fen: "... DEPLOY b5:T 2" },
          { move: "Te5->d5", fen: "..." }
        ],
        isComplete: true
      }
    },
    fen: "..."
  }
]

Current Deploy Transaction (during deploy):
{
  startFEN: "...",
  deployMoves: [
    { move: "Fe5->d7", fen: "... DEPLOY e5:NT 1" }
  ],
  isComplete: false
}
```

**Key insights:**

- ✅ Deploy steps stored in temporary transaction
- ✅ Only complete deploys added to main history
- ✅ Undo during deploy only undoes deploy steps
- ✅ Undo complete deploy restores to before deploy

---

## Problem 5: Move Generation During Active Deploy

### Requirement

When deploy session is active, ONLY generate moves for remaining pieces in the
stack.

### Solution: Context-Aware Move Generation

```typescript
class GameState {
  generateLegalMoves(): Move[] {
    if (this.deploySession) {
      // Deploy session active - only generate deploy moves
      return this.generateDeployMoves()
    }

    // Normal move generation
    return this.generateNormalMoves()
  }

  private generateDeployMoves(): Move[] {
    const deployMoves: Move[] = []
    const stackSquare = this.deploySession!.originalSquare

    // Only generate moves for remaining pieces
    for (const piece of this.deploySession!.remaining) {
      const moves = this.generatePieceMoves(stackSquare, piece)

      // Add deploy-specific moves
      for (const move of moves) {
        deployMoves.push({
          type: 'deploy-step',
          piece,
          from: stackSquare,
          to: move.to,
          capturedPiece: move.capturedPiece,
          deploySession: this.deploySession,
        })
      }

      // Add "stay on stack" option
      deployMoves.push({
        type: 'deploy-stay',
        piece,
        square: stackSquare,
      })
    }

    return deployMoves
  }

  // Legal move filtering still applies
  filterLegalMoves(moves: Move[]): Move[] {
    return moves.filter((move) => {
      const undo = this.makeMove(move)
      const legal = !this.isCommanderExposed()
      this.unmakeMove(undo)
      return legal
    })
  }
}
```

#### UI Integration

```typescript
// UI queries for legal moves
const game = new CoTuLenh()

// Normal state
game.moves()
// Returns: all legal moves for current player

// Start deploy
game.startDeploy('e5')

// Now moves() returns ONLY deploy moves
game.moves()
// Returns: [
//   { type: 'deploy-step', piece: Navy, to: 'b5' },
//   { type: 'deploy-step', piece: Navy, to: 'b6' },
//   { type: 'deploy-step', piece: AirForce, to: 'd7' },
//   { type: 'deploy-stay', piece: Navy },
//   { type: 'deploy-stay', piece: AirForce },
//   // ... etc
// ]

// Make deploy step
game.deployStep('Navy', 'b5')

// Now moves() returns ONLY moves for Air Force + Tank
game.moves()
// Returns: [
//   { type: 'deploy-step', piece: AirForce, to: 'd7' },
//   { type: 'deploy-step', piece: Tank, to: 'd6' },
//   { type: 'deploy-stay', piece: AirForce },
//   { type: 'deploy-stay', piece: Tank },
// ]
```

---

## Problem 6: Turn Management (Which Moves Switch Turns?)

### Rules

1. Normal moves → switch turn
2. Deploy steps → DON'T switch turn
3. Deploy completion → switch turn
4. Deploy cancellation → DON'T switch turn

### Solution: Explicit Turn Tracking in UndoInfo

```typescript
interface UndoInfo {
  move: Move
  prevTurn: Color
  turnSwitched: boolean // Did this move switch turns?
  // ... other undo data
}

class GameState {
  private turn: Color = 'r'

  makeMove(move: Move): UndoInfo {
    const undo: UndoInfo = {
      move,
      prevTurn: this.turn,
      turnSwitched: false,
      // ... capture undo data
    }

    // Apply move
    this.applyMoveInternal(move)

    // Determine if turn switches
    const shouldSwitch = this.shouldSwitchTurn(move)

    if (shouldSwitch) {
      this.turn = this.turn === 'r' ? 'b' : 'r'
      undo.turnSwitched = true
    }

    return undo
  }

  private shouldSwitchTurn(move: Move): boolean {
    switch (move.type) {
      case 'normal':
      case 'capture':
      case 'stay-capture':
      case 'suicide-capture':
      case 'combine':
        return true // Normal moves always switch

      case 'deploy-start':
        return false // Starting deploy doesn't switch

      case 'deploy-step':
        // Check if this completes the deploy
        return this.deploySession!.remaining.length === 0

      case 'deploy-stay':
        // Mark piece as staying, check if deploy complete
        return this.isDeployComplete()

      case 'deploy-cancel':
        return false // Canceling doesn't switch

      default:
        return true
    }
  }

  private isDeployComplete(): boolean {
    if (!this.deploySession) return false

    // Deploy complete if all pieces accounted for
    const totalPieces = this.deploySession.originalStack.length
    const deployed = this.deploySession.deployed.length
    const staying = this.deploySession.staying.length

    return deployed + staying === totalPieces
  }

  unmakeMove(undo: UndoInfo): void {
    // Restore all state
    this.revertMoveInternal(undo)

    // Restore turn exactly as it was
    if (undo.turnSwitched) {
      this.turn = undo.prevTurn
    }
  }
}
```

#### Turn Switching Examples

```typescript
// Scenario 1: Normal move
game.move('Ie5')
// Turn: r → b ✓

// Scenario 2: Deploy sequence
game.startDeploy('e5') // Navy + [AirForce, Tank]
// Turn: r → r (no switch)

game.deployStep('AirForce', 'd7')
// Turn: r → r (no switch, deploy continues)

game.deployStep('Navy', 'b5')
// Turn: r → r (no switch, deploy continues)

game.deployStep('Tank', 'd5')
// Turn: r → b ✓ (deploy complete, switch!)

// Scenario 3: Stay notation
game.startDeploy('e5') // Infantry + [Militia, Tank]

game.deployStep('Infantry', 'e6')
// Turn: r → r

game.deployStay('Militia') // "I<" = Infantry stays
// Turn: r → r

game.deployStep('Tank', 'd6')
// Turn: r → b ✓ (all pieces accounted for)
```

---

## Complete Deploy Session State Machine

### States

```typescript
enum DeployState {
  INACTIVE = 'inactive', // No deploy in progress
  ACTIVE = 'active', // Deploy in progress
  WAITING = 'waiting', // Waiting for user input
  VALIDATING = 'validating', // Checking move validity
  COMPLETE = 'complete', // Deploy finished
}

interface DeploySessionFull {
  state: DeployState

  // Original
  originalSquare: Square
  originalStack: Piece[]

  // Current
  remaining: Piece[]
  deployed: Array<{ piece: Piece; destination: Square; captured?: Piece }>
  staying: Piece[]

  // Tracking
  movesMade: Move[]
  startedAt: number

  // Validation
  lastError: string | null

  // Turn management
  turnShouldSwitch: boolean
}
```

### State Transitions

```
INACTIVE
  ↓ startDeploy()
ACTIVE
  ↓ deployStep()
ACTIVE (if more pieces)
  OR
COMPLETE (if all pieces done)
  ↓ completeDeploy()
INACTIVE (turn switches)

OR

ACTIVE
  ↓ cancelDeploy()
INACTIVE (no turn switch)
```

---

## Implementation Checklist

### Phase 1: Core Deploy Session (Week 1)

- [ ] `DeploySession` interface with all fields
- [ ] `startDeploy()` initialization
- [ ] `makeDeployStep()` with validation
- [ ] `completeDeploy()` with turn switch
- [ ] `cancelDeploy()` rollback

### Phase 2: Validation (Week 1)

- [ ] Validate stack residue for terrain
- [ ] Prevent invalid intermediate states
- [ ] Test all terrain × piece combinations

### Phase 3: Combined Moves (Week 2)

- [ ] Auto-detect combined moves
- [ ] Merge in history
- [ ] Alternative: explicit combined move API
- [ ] Update UI to use combined moves

### Phase 4: History Management (Week 2)

- [ ] Deploy transaction structure
- [ ] Nested history for deploy steps
- [ ] Undo during deploy (step-by-step)
- [ ] Undo complete deploy (all-at-once)

### Phase 5: Move Generation (Week 3)

- [ ] Context-aware move generation
- [ ] Only generate moves for remaining pieces
- [ ] Include "stay" option
- [ ] Legal move filtering

### Phase 6: Turn Management (Week 3)

- [ ] Track turn switches in `UndoInfo`
- [ ] Implement `shouldSwitchTurn()`
- [ ] Test all turn switch scenarios
- [ ] Update FEN turn indicator

### Phase 7: Extended FEN (Week 4)

- [ ] Deploy session in FEN format
- [ ] Parse extended FEN
- [ ] Save/load with active deploy
- [ ] Test round-trip serialization

### Phase 8: Testing (Week 4)

- [ ] 50+ tests for deploy validation
- [ ] 30+ tests for history management
- [ ] 20+ tests for combined moves
- [ ] 20+ tests for turn switching
- [ ] **Target: 120+ deploy-specific tests**

---

## Summary: Answers to Your 6 Questions

### 1. **Partial deploy + FEN + Undo**

- **FEN:** Extended format with `DEPLOY e5:NT 2` marker
- **Undo:** Step-by-step during deploy, all-at-once for complete deploy
- **Tracking:** `DeploySession` captures all state

### 2. **Invalid intermediate states (Navy first)**

- **Validation:** `validateStackForTerrain()` before each step
- **Error:** Thrown before applying move
- **Result:** Navy-first move rejected

### 3. **Combined moves (Tank + Air Force)**

- **Detection:** Auto-detect carrier/carried patterns
- **Merging:** Combine in history after all pieces move
- **Alternative:** Explicit `CombinedDeployMove` API (better!)

### 4. **History during deploy**

- **Structure:** Deploy transaction with nested moves
- **Main history:** Only complete deploys added
- **Undo:** Step-by-step during deploy, complete rollback after

### 5. **Move generation during deploy**

- **Context:** Check `deploySession !== null`
- **Generation:** Only for `deploySession.remaining` pieces
- **Include:** "Stay" option for each piece

### 6. **Turn management**

- **Normal moves:** Always switch
- **Deploy steps:** No switch
- **Deploy complete:** Switch
- **Track:** `turnSwitched` in `UndoInfo`

---

## Critical Success Factors

1. ✅ **Validate at every step** - Catch errors before applying
2. ✅ **Track everything** - Deploy session captures all state
3. ✅ **Nested history** - Transactions for complex operations
4. ✅ **Context-aware generation** - Different moves during deploy
5. ✅ **Explicit turn tracking** - Clear rules for turn switches
6. ✅ **Extended FEN** - Serialize partial deploy states
7. ✅ **Comprehensive tests** - 120+ tests for deploy alone

**Deploy sessions are the HARDEST part of CoTuLenh.** But with this
architecture, they're manageable!
