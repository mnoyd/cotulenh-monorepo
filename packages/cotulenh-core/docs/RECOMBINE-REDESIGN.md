# Recombine System Redesign: From Move to Instruction

**Status:** 🚧 Design Phase - Implementation Pending  
**Date:** November 5, 2025  
**Context:** Architectural redesign of recombine functionality in CoTuLenh chess
engine

---

## 📋 Table of Contents

1. [Current Implementation Problems](#current-implementation-problems)
2. [Core Insight: Recombine is NOT a Move](#core-insight-recombine-is-not-a-move)
3. [Proposed Architecture](#proposed-architecture)
4. [Critical Constraints](#critical-constraints)
5. [Implementation Design](#implementation-design)
6. [Edge Cases & Safety](#edge-cases--safety)
7. [Migration Plan](#migration-plan)
8. [Open Questions](#open-questions)

---

## Current Implementation Problems

### What Recombine Does Now

Currently, recombine is treated as a **full chess move** with:

- ❌ Move flags (`BITS.DEPLOY | BITS.COMBINATION`)
- ❌ SAN/LAN notation
- ❌ History entry (separate move in history)
- ❌ Turn management implications
- ❌ Full command pattern execution

### Example of Current Flow

```typescript
// Step 1: Deploy Navy to c5
game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })
// → Creates move, adds to history, updates board

// Step 2: "Recombine" AirForce (treated as full move)
game.move({ from: 'c3', to: 'c5', piece: AIR_FORCE, deploy: true })
// → Creates ANOTHER move, adds to history
// → But conceptually it's just modifying the first move!

// History now has TWO moves for what should be ONE deploy operation
history: [
  { from: 'c3', to: 'c5', piece: 'n', flags: 'd' }, // Deploy Navy
  { from: 'c3', to: 'c5', piece: 'f', flags: 'd|b' }, // "Move" AirForce (recombine)
]
```

### Problems with Current Approach

1. **Conceptual Confusion**: Recombine is not really a "move" - it's a
   modification of the deploy session
2. **History Pollution**: Multiple history entries for a single logical
   operation
3. **SAN/LAN Complexity**: Need notation for something that isn't really a move
4. **Turn Management**: Unclear when turn should switch
5. **Undo Complexity**: Undoing recombines vs undoing moves

---

## Core Insight: Recombine is NOT a Move

### What Recombine Actually Is

> **Recombine is an INSTRUCTION to modify the deploy session state**

Instead of:

```
"Move this piece from c3 to c5"
```

It's really:

```
"Instead of deploying this piece separately, put it back with the piece at c5"
```

### Conceptual Model

```
Deploy Session = {
  moves: [Navy → c5, Tank → d4],      // Actual moves (in order)
  recombines: [AirForce → c5],        // Instructions (applied at commit)
}

// At commit time:
// 1. All moves already executed (in order) ✅
// 2. Apply recombines (combine pieces) ✅
// 3. Switch turn ✅
```

---

## Proposed Architecture

### New API Design

```typescript
class CoTuLenh {
  /**
   * Recombine a piece with a deployed piece during active deploy session
   * This is NOT a move - it's a session instruction
   *
   * @param from - Source square (stack square)
   * @param to - Target square (deployed piece square)
   * @param piece - Piece type to recombine
   * @returns true if recombine succeeded
   */
  recombine(from: Square, to: Square, piece: PieceSymbol): boolean

  /**
   * Get available recombine options (separate from moves)
   *
   * @param square - Stack square
   * @returns Array of recombine options with safety validation
   */
  getRecombineOptions(square: Square): RecombineOption[]

  /**
   * Commit the deploy session (applies recombines and switches turn)
   */
  commitDeploySession(): void
}

interface RecombineOption {
  piece: Piece // Piece to recombine
  targetSquare: number // Where it will recombine
  targetPiece: Piece // Piece it will combine with
  resultPiece: Piece // Combined result
  isSafe: boolean // Commander safety check
}
```

### DeploySession Enhancement

```typescript
class DeploySession {
  private commands: CTLMoveCommandInteface[] = [] // Actual moves (in order)
  private recombineInstructions: RecombineInstruction[] = [] // Pending recombines

  /**
   * Record a recombine instruction (doesn't modify moves)
   */
  recombine(
    game: CoTuLenh,
    stackSquare: number,
    targetSquare: number,
    pieceToRecombine: Piece,
  ): boolean {
    // Validate
    // Record instruction with timestamp
    // DON'T execute yet
  }

  /**
   * Apply all recombine instructions when session commits
   * This preserves move order while combining pieces
   */
  private applyRecombines(game: CoTuLenh): void {
    // Sort by timestamp to maintain request order
    // Apply each recombine to board state
    // Update pieces at target squares
  }

  /**
   * Commit session - applies recombines AFTER all moves
   */
  commit(game: CoTuLenh): void {
    // 1. All moves already executed in order ✅
    // 2. Apply recombines (doesn't change move order) ✅
    // 3. Clear session ✅
    // 4. Switch turn ✅
  }
}

interface RecombineInstruction {
  piece: Piece
  fromSquare: number
  toSquare: number
  timestamp: number // When instruction was added (preserves order)
}
```

---

## Critical Constraints

### Constraint 1: Move Order Preservation

**Problem:** Recombine must NOT change the order of moves in the deploy session

**Why Critical:** Later moves might depend on earlier moves

**Example:**

```typescript
// Stack: F(TI) at c3
// F moves to d4 (clears path)
// T moves to e5 (uses path F cleared)
// I recombines with F at d4

// Move order MUST stay: [F→d4, T→e5]
// Recombine applies AFTER: I joins F at d4
// Final state: d4 = F(I), e5 = T
```

**Solution:**

- Moves execute immediately and stay in order ✅
- Recombines are **queued** and applied at commit ✅
- Move order is **never modified** ✅

### Constraint 2: Commander Safety

**Problem:** Cannot recombine Commander with pieces on attacked squares

**Why Critical:** Would expose Commander to capture (illegal in chess)

**Example:**

```typescript
// Board state:
// c5: Tank (deployed from stack)
// d6: Enemy AirForce (can attack c5)
// c3: Commander (remaining in stack)

// Commander CANNOT recombine with Tank at c5
// Because c5 is under attack!
```

**Solution:**

- `getRecombineOptions()` filters out unsafe squares ✅
- `recombine()` validates before queueing ✅
- Uses existing `getAttackers()` logic ✅
- Checks both: Commander recombining AND recombining WITH Commander ✅

### Constraint 3: Commander Trapped Detection

**Problem:** Deploy moves might trap Commander in check with no escape

**Critical Scenarios:**

#### Scenario 1: Commander Blocked, Can't Recombine

```typescript
// Stack: C(FT) at c3 (Commander in CHECK)
// Deploy F to d4 (endangered square - enemy can attack)
// Deploy T to e5 (endangered square - enemy can attack)

// Now Commander at c3:
// - Still in CHECK ❌
// - Cannot move (blocked) ❌
// - Cannot recombine with F or T (both endangered) ❌
// - TRAPPED! This is CHECKMATE
```

#### Scenario 2: Commander at Sea

```typescript
// Stack: C(FT) at sea square b2 (Commander in CHECK from enemy Navy)
// Deploy F to land square c3 (safe)
// Deploy T to land square d4 (safe)

// Now Commander at b2:
// - Still in CHECK ❌
// - Cannot move to land (Commander can't move to land) ❌
// - Cannot recombine (pieces on land, Commander at sea) ❌
// - TRAPPED! This is CHECKMATE
```

**Solution:**

- Validate Commander can escape after each deploy move ✅
- Filter out deploy moves that would trap Commander ✅
- Ensure at least one escape option exists ✅
- Detect checkmate during deploy session ✅

---

## Implementation Design

### 1. DeploySession Class

```typescript
class DeploySession {
  private commands: CTLMoveCommandInteface[] = []
  private recombineInstructions: RecombineInstruction[] = []

  // === Recombine Management ===

  recombine(
    game: CoTuLenh,
    stackSquare: number,
    targetSquare: number,
    pieceToRecombine: Piece,
  ): boolean {
    // 1. Validate target is deployed in this session
    const deployedSquares = this.getDeployedSquares()
    if (!deployedSquares.includes(targetSquare)) {
      throw new Error('Cannot recombine to non-deployed square')
    }

    // 2. Validate piece is still in stack
    const remaining = this.getRemainingPieces()
    if (!remaining) return false

    const remainingFlat = flattenPiece(remaining)
    const hasPiece = remainingFlat.some((p) => p.type === pieceToRecombine.type)
    if (!hasPiece) return false

    // 3. COMMANDER SAFETY CHECK
    const us = game.turn()
    const isCommander = pieceToRecombine.type === COMMANDER
    const targetPiece = game.get(targetSquare)
    const targetHasCommander =
      targetPiece?.type === COMMANDER ||
      targetPiece?.carrying?.some((p) => p.type === COMMANDER)

    if (isCommander || targetHasCommander) {
      if (!this.isSquareSafeForCommander(game, targetSquare, us)) {
        throw new Error('Cannot recombine Commander to attacked square')
      }
    }

    // 4. Record instruction (don't execute yet)
    this.recombineInstructions.push({
      piece: pieceToRecombine,
      fromSquare: stackSquare,
      toSquare: targetSquare,
      timestamp: this.commands.length, // Preserves order
    })

    return true
  }

  getRecombineOptions(game: CoTuLenh, stackSquare: number): RecombineOption[] {
    const options: RecombineOption[] = []
    const remaining = this.getRemainingPieces()
    const us = game.turn()

    if (!remaining) return options

    const remainingFlat = flattenPiece(remaining)
    const deployedSquares = this.getDeployedSquares()

    for (const piece of remainingFlat) {
      const isCommander = piece.type === COMMANDER

      for (const targetSquare of deployedSquares) {
        const targetPiece = game.get(targetSquare)
        if (!targetPiece) continue

        // Check if pieces can combine
        const combined = combinePieces([piece, targetPiece])
        if (!combined) continue

        // COMMANDER SAFETY FILTERING
        if (isCommander) {
          if (!this.isSquareSafeForCommander(game, targetSquare, us)) {
            continue // Skip unsafe square
          }
        }

        // Check if target has Commander
        if (
          targetPiece.type === COMMANDER ||
          targetPiece.carrying?.some((p) => p.type === COMMANDER)
        ) {
          if (!this.isSquareSafeForCommander(game, targetSquare, us)) {
            continue // Skip - would expose Commander
          }
        }

        options.push({
          piece,
          targetSquare,
          targetPiece,
          resultPiece: combined,
          isSafe: true, // Only safe options included
        })
      }
    }

    return options
  }

  // === Commander Safety ===

  private isSquareSafeForCommander(
    game: CoTuLenh,
    square: number,
    color: Color,
  ): boolean {
    const them = swapColor(color)
    const attackers = game.getAttackers(square, them)
    return attackers.length === 0
  }

  private canCommanderEscape(
    game: CoTuLenh,
    commanderSquare: number,
    color: Color,
  ): boolean {
    const commander = game.get(commanderSquare)
    if (!commander || commander.type !== COMMANDER) {
      return true
    }

    // Check if Commander is in check
    if (!game['_isCommanderAttacked'](color)) {
      return true
    }

    // Option 1: Can Commander move to safety?
    const commanderMoves = generateMovesForPiece(
      game,
      commanderSquare,
      commander,
      true,
    )

    const safeMoves = commanderMoves.filter((move) => {
      game['_makeMove'](move)
      const stillInCheck = game['_isCommanderAttacked'](color)
      game['_undoMove']()
      return !stillInCheck
    })

    if (safeMoves.length > 0) return true

    // Option 2: Can Commander recombine to safety?
    const recombineOptions = this.getRecombineOptions(game, commanderSquare)
    const safeRecombines = recombineOptions.filter((opt) => {
      // Simulate recombine
      const targetPiece = game.get(opt.targetSquare)
      const combined = combinePieces([commander, targetPiece])
      if (!combined) return false

      // Temporarily apply
      const originalCommander = game.get(commanderSquare)
      const originalTarget = game.get(opt.targetSquare)

      game.put(combined, algebraic(opt.targetSquare))
      game.remove(algebraic(commanderSquare))
      game['_commanders'][color] = opt.targetSquare

      const stillInCheck = game['_isCommanderAttacked'](color)

      // Restore
      if (originalCommander)
        game.put(originalCommander, algebraic(commanderSquare))
      if (originalTarget) game.put(originalTarget, algebraic(opt.targetSquare))
      game['_commanders'][color] = commanderSquare

      return !stillInCheck
    })

    if (safeRecombines.length > 0) return true

    return false // Commander is trapped
  }

  validateCommanderSafety(game: CoTuLenh): {
    isValid: boolean
    reason?: string
  } {
    const us = game.turn()
    const commanderSquare = game['_commanders'][us]

    if (commanderSquare === -1) {
      return { isValid: true }
    }

    // Check if Commander is in the stack being deployed
    const stackSquare = this.stackSquare
    const stackPiece = game.get(stackSquare)

    if (!stackPiece) {
      return { isValid: true }
    }

    const hasCommander =
      stackPiece.type === COMMANDER ||
      stackPiece.carrying?.some((p) => p.type === COMMANDER)

    if (!hasCommander && commanderSquare !== stackSquare) {
      return { isValid: true }
    }

    // Commander IS involved - check if it can escape
    if (!this.canCommanderEscape(game, stackSquare, us)) {
      return {
        isValid: false,
        reason: 'This deploy would trap the Commander in check (checkmate)',
      }
    }

    return { isValid: true }
  }

  // === Apply Recombines ===

  private applyRecombines(game: CoTuLenh): void {
    // Sort by timestamp to maintain request order
    const sorted = [...this.recombineInstructions].sort(
      (a, b) => a.timestamp - b.timestamp,
    )

    for (const instruction of sorted) {
      const targetPiece = game.get(instruction.toSquare)
      const stackPiece = game.get(instruction.fromSquare)

      if (!targetPiece || !stackPiece) continue

      // Combine
      const combined = combinePieces([targetPiece, instruction.piece])
      if (!combined) continue

      // Update target square
      game.put(combined, algebraic(instruction.toSquare))

      // Update stack square
      const remaining = removePieceFromStack(stackPiece, instruction.piece)
      if (remaining) {
        game.put(remaining, algebraic(instruction.fromSquare))
      } else {
        game.remove(algebraic(instruction.fromSquare))
      }
    }
  }

  // === Commit Session ===

  commit(game: CoTuLenh): void {
    // 1. All moves already executed in order ✅
    // 2. Apply recombines (doesn't change move order) ✅
    this.applyRecombines(game)

    // 3. Clear session ✅
    game.setDeploySession(null)
    game.setDeployState(null)

    // 4. Switch turn ✅
    game['_turn'] = swapColor(game.turn())
  }

  // === Undo Support ===

  undoLastRecombine(game: CoTuLenh): void {
    if (this.recombineInstructions.length === 0) return
    this.recombineInstructions.pop()
  }
}
```

### 2. Public API (CoTuLenh)

```typescript
class CoTuLenh {
  recombine(from: Square, to: Square, piece: PieceSymbol): boolean {
    const session = this.getDeploySession()
    if (!session) {
      throw new Error('No active deploy session')
    }

    const fromSq = SQUARE_MAP[from]
    const toSq = SQUARE_MAP[to]
    const pieceObj = { type: piece, color: this.turn() }

    const success = session.recombine(this, fromSq, toSq, pieceObj)

    if (success) {
      // Validate Commander safety after recombine
      const validation = session.validateCommanderSafety(this)

      if (!validation.isValid) {
        // Undo recombine
        session.undoLastRecombine(this)
        throw new Error(
          validation.reason || 'Invalid recombine: Commander trapped',
        )
      }
    }

    return success
  }

  getRecombineOptions(square: Square): RecombineOption[] {
    const session = this.getDeploySession()
    if (!session) return []

    return session.getRecombineOptions(this, SQUARE_MAP[square])
  }

  commitDeploySession(): void {
    const session = this.getDeploySession()
    if (!session) {
      throw new Error('No active deploy session to commit')
    }

    // Final validation
    const validation = session.validateCommanderSafety(this)
    if (!validation.isValid) {
      throw new Error(validation.reason || 'Cannot commit: Commander trapped')
    }

    session.commit(this)
  }

  // Enhanced move() with validation
  move(move: string | MoveInput): Move | null {
    // ... existing move logic ...

    // After executing deploy move, validate Commander safety
    if (this._deploySession && (move as any).deploy) {
      const validation = this._deploySession.validateCommanderSafety(this)

      if (!validation.isValid) {
        // Undo the move
        this._undoMove()
        throw new Error(
          validation.reason || 'Invalid deploy: Commander trapped',
        )
      }
    }

    return result
  }
}
```

### 3. Move Generation Enhancement

```typescript
export function generateDeployMoves(
  gameInstance: CoTuLenh,
  stackSquare: number,
  filterPiece?: PieceSymbol,
): InternalMove[] {
  const moves: InternalMove[] = []
  const us = gameInstance.turn()
  const session = gameInstance.getDeploySession()

  // ... existing move generation ...

  // FILTER OUT MOVES THAT WOULD TRAP COMMANDER
  const filteredMoves = moves.filter((move) => {
    // Simulate the move
    gameInstance['_makeMove'](move)

    // Check if Commander would be trapped
    let wouldTrap = false

    if (session) {
      const validation = session.validateCommanderSafety(gameInstance)
      wouldTrap = !validation.isValid
    }

    // Undo the move
    gameInstance['_undoMove']()

    return !wouldTrap
  })

  // NOTE: Recombine moves are NO LONGER generated here
  // They are accessed via getRecombineOptions() instead

  return filteredMoves
}
```

---

## Edge Cases & Safety

### Edge Case 1: Commander at Sea

```typescript
// Commander at sea b2, in check from enemy Navy
// Can only recombine with pieces also at sea
// Land pieces filtered out from recombine options

const options = game.getRecombineOptions('b2')
// Only returns options where target square is also at sea
```

### Edge Case 2: Commander Blocked

```typescript
// Commander at c3, surrounded by own pieces
// Can only recombine with pieces on safe squares
// Blocked moves filtered out

const options = game.getRecombineOptions('c3')
// Only returns safe recombine options
```

### Edge Case 3: No Escape Possible (Checkmate)

```typescript
// Commander truly trapped
// All deploy moves filtered out
// Session cannot continue

const moves = game.moves({ square: 'c3', deploy: true })
// Returns empty array

const recombines = game.getRecombineOptions('c3')
// Returns empty array

// Game should detect checkmate
game.isCheckmate() // true
```

### Safety Guarantees

**Prevention Layers:**

1. **Move Generation** ✅

   - Filters out moves that would trap Commander
   - User never sees dangerous options

2. **Move Execution** ✅

   - Validates after each deploy move
   - Undoes if Commander would be trapped

3. **Recombine Filtering** ✅

   - Only shows recombines that help Commander escape
   - Validates before applying

4. **Session Commit** ✅
   - Final check before switching turn
   - Prevents committing a checkmate position

---

## Migration Plan

### Phase 1: Add New API (Non-Breaking)

1. Add `recombine()` method to `DeploySession`
2. Add `getRecombineOptions()` to `DeploySession`
3. Add `recombine()` and `getRecombineOptions()` to `CoTuLenh`
4. Add `commitDeploySession()` to `CoTuLenh`
5. Keep old recombine-as-move code working

**Status:** Both APIs work simultaneously

### Phase 2: Update Tests

1. Create new tests for instruction-based recombine
2. Mark old recombine-as-move tests as deprecated
3. Ensure 100% test coverage for new API

**Status:** New API fully tested

### Phase 3: Update UI

1. Update board component to use `getRecombineOptions()`
2. Update click handlers to call `game.recombine()`
3. Add visual distinction between moves and recombines
4. Test thoroughly

**Status:** UI uses new API

### Phase 4: Remove Old Code

1. Remove recombine from move generation
2. Remove `BITS.COMBINATION` flag usage
3. Remove old tests
4. Update documentation

**Status:** Clean codebase with only new API

---

## Undo Behavior (DECIDED)

### How Undo Works

**Undo works normally for deploy moves:**

- Each deploy move is a command in the session's command list
- `game.undo()` calls `command.undo()` like normal
- The deploy session state is updated correctly
- Move order is preserved

**Key Principle:** No bugs, maintain state and order correctly

### Implementation Strategy

```typescript
class DeploySession {
  private commands: CTLMoveCommandInteface[] = []
  private recombineInstructions: RecombineInstruction[] = []

  /**
   * Undo last deploy move
   * This is called by game.undo() during deploy session
   */
  undoLastMove(): void {
    if (this.commands.length === 0) return

    const lastCommand = this.commands.pop()
    lastCommand.undo()

    // Update session state (remaining pieces, deployed squares, etc.)
    this.updateSessionState()
  }

  /**
   * Undo last recombine instruction (separate from move undo)
   */
  undoLastRecombine(): void {
    if (this.recombineInstructions.length === 0) return
    this.recombineInstructions.pop()
  }
}
```

### Two Options for Implementation

**Option A: Simple Undo (Recommended)**

- Each command knows how to undo itself
- Just call `command.undo()` in reverse order
- Update session state after each undo
- **Pros:** Simple, no recreation needed
- **Cons:** Must track session state carefully

**Option B: Recreate from Scratch**

- Undo all commands back to session start
- Replay commands up to desired point
- Recreate session state from replay
- **Pros:** Guaranteed correct state
- **Cons:** More expensive, but very safe

**Decision:** Use Option A (simple undo), but if bugs occur, fall back to Option
B

### Undo Scenarios

```typescript
// Scenario 1: Undo a deploy move
game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })
game.move({ from: 'c3', to: 'd4', piece: AIR_FORCE, deploy: true })
game.undo() // Undoes AirForce move
game.undo() // Undoes Navy move

// Scenario 2: Undo a recombine instruction
game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })
game.recombine('c3', 'c5', AIR_FORCE)
game.undoRecombineInstruction() // Removes recombine instruction

// Scenario 3: Reset entire session
game.move({ from: 'c3', to: 'c5', piece: NAVY, deploy: true })
game.move({ from: 'c3', to: 'd4', piece: AIR_FORCE, deploy: true })
game.recombine('c3', 'c5', TANK)
game.resetDeploySession() // Undoes ALL moves and clears session
```

## Open Questions

### 1. Commit Timing (DECIDED)

**Question:** When should recombines be applied?

**Decision:** Option B (explicit commit) for maximum control

**Rationale:**

- Lazy validation approach requires explicit commit
- Players need to see commit status before committing
- Clear separation between editing and finalizing

### 2. UI Feedback (DECIDED)

**Question:** How to indicate recombine options vs regular moves?

**Decision:** Keep it simple for now - just show recombine options without
special highlighting

**Rationale:**

- Focus on functionality first
- UI enhancements can come later
- Core system must work correctly first

### 3. UI Feedback

**Question:** How to indicate recombine options vs regular moves?

**Suggestions:**

- Safe recombine squares: Gold highlight with combine icon
- Unsafe squares (Commander): Red with warning tooltip
- Pending recombines: Badge/icon on target square
- Move vs recombine: Different highlight colors

### 4. Performance

**Question:** Simulating every move to check Commander safety is expensive

**Options:**

- **A:** Only validate when Commander is in check
- **B:** Cache validation results per board state
- **C:** Optimize simulation (reuse board state)

**Recommendation:** Option A + C (validate only when needed, optimize
simulation)

### 5. History Representation

**Question:** How should deploy sessions appear in game history?

**Options:**

- **A:** Single entry with all moves + recombines
- **B:** Separate entries but grouped visually
- **C:** Expandable entry showing details

**Recommendation:** Option A (single logical operation)

---

## Benefits Summary

### Conceptual Clarity ✅

- Recombine is clearly **not a move**
- It's a **session modification instruction**
- No confusion about history, SAN, or turn management

### Cleaner History ✅

```typescript
// OLD: Multiple "moves" for one deploy
history: [
  { from: 'c3', to: 'c5', piece: 'n', flags: 'd' },
  { from: 'c3', to: 'c5', piece: 'f', flags: 'd|b' },
  { from: 'c3', to: 'c5', piece: 't', flags: 'd|b' },
]

// NEW: One move, session tracks recombines
history: [
  { from: 'c3', to: 'c5', piece: 'n', flags: 'd' }
]
session.recombines: [
  { piece: 'f', target: 'c5' },
  { piece: 't', target: 'c5' },
]
```

### No SAN/LAN Confusion ✅

- Regular deploy: `Nc3-c5`
- Recombine: No notation needed (it's an instruction)

### Simpler Undo ✅

- Undo just reverts session state
- No tracking individual recombine "moves"

### Better UI Separation ✅

```typescript
<MoveList moves={regularMoves} />
<RecombinePanel options={recombineOptions} />
```

### Move Order Preservation ✅

- Moves execute immediately in order
- Recombines queue and apply at commit
- Dependencies preserved

### Commander Safety ✅

- Filters unsafe recombine options
- Validates before execution
- Prevents checkmate during deploy

---

## Next Steps

1. **Review this design** with team
2. **Decide on open questions** (commit timing, undo behavior, etc.)
3. **Create implementation tasks** in project tracker
4. **Start Phase 1** (add new API without breaking old code)
5. **Write comprehensive tests** for new functionality
6. **Update UI** to use new API
7. **Migrate gradually** and remove old code

---

## References

- Original recombine implementation:
  `packages/cotulenh-core/src/move-generation.ts:672-714`
- Current tests: `packages/cotulenh-core/__tests__/recombine-moves.test.ts`
- Deploy session: `packages/cotulenh-core/src/deploy-session.ts`
- Complete guide: `packages/cotulenh-core/docs/RECOMBINE-COMPLETE-GUIDE.md`

---

## Test Coverage

### Comprehensive Test Suite Created

**File:** `__tests__/recombine-instruction.test.ts`

**Test Categories:**

1. **Basic Recombine Instructions (4 tests)**

   - Allow recombine instruction after deploy move
   - Execute recombine instruction (queuing)
   - Apply recombines at commit time
   - Handle multiple recombines to same square

2. **Move Order Preservation (2 tests)**

   - Preserve move order when recombine is used
   - Maintain timestamp order for multiple recombines

3. **Commander Safety Filtering (3 tests)**

   - Filter out unsafe recombine options for Commander
   - Allow recombine to safe squares only
   - Prevent Commander recombine to attacked square

4. **Commit Validation (4 tests)**

   - Allow commit when Commander is safe
   - Reject commit when Commander in check with no escape
   - Suggest recombine option when Commander in check
   - Allow commit after Commander recombines to safety

5. **Undo Behavior (6 tests)**

   - Undo deploy move normally
   - Undo recombine instruction
   - Handle undo of multiple moves in deploy session
   - Maintain correct state after undo and redo
   - Clear recombine instructions when resetting deploy session

6. **Edge Cases (5 tests)**

   - Handle Commander at sea edge case
   - Handle empty recombine options
   - Prevent recombine to non-deployed square
   - Handle recombine with pieces that cannot combine

7. **Integration Tests (2 tests)**
   - Complete deploy session with recombines
   - Complex tactical sequence (Commander escape)

**Total Tests:** 26 comprehensive test cases

### Test Status

**Current Status:** Tests written but not yet passing (APIs not implemented)

**Note:** These are **TDD-style tests** - written before implementation to
define the expected behavior. The TypeScript errors are expected and will be
resolved during implementation.

### Test Coverage Areas

✅ **Basic Functionality**

- Instruction queuing
- Commit-time application
- Multiple recombines

✅ **Safety**

- Commander safety filtering
- Commit validation
- Attack detection

✅ **State Management**

- Move order preservation
- Undo/redo behavior
- Session reset

✅ **Edge Cases**

- Sea/land boundaries
- Invalid combinations
- Non-deployed squares

✅ **Integration**

- Complete workflows
- Complex scenarios
- Commander escape tactics

---

**Document Version:** 1.0  
**Last Updated:** November 5, 2025  
**Status:** Ready for Implementation Planning

**Test Suite:** Created and documented (26 tests)  
**Implementation:** Pending (Phase 1 of migration plan)
