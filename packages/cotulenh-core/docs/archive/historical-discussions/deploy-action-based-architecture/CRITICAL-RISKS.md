# Critical & High-Risk Concerns - Action-Based Deploy

**Created**: October 22, 2025  
**Status**: ⚠️ **OUTDATED - ALL ISSUES RESOLVED**  
**Superseded By**: `FINAL-STATUS.md` and `RESOLVED-GAPS.md`

---

## 🚨 THIS DOCUMENT IS OUTDATED

**All concerns documented here have been resolved. This is kept for historical
reference only.**

**Read Instead**:

- **`FINAL-STATUS.md`** - Current status showing all issues resolved
- **`RESOLVED-GAPS.md`** - How each issue was resolved
- **`SAN-PARSER-SPEC.md`** - Parser specification (ready to implement)

**Key Discoveries**:

1. Move reversal already implemented via `_undoMove()` command pattern
2. No cloning used anywhere - system already action-based
3. All validation exists in `_filterLegalMoves` + `PieceStacker`
4. SAN parser fully specified in `SAN-PARSER-SPEC.md`
5. Cancellation trivial with existing command pattern

**Result**: Architecture is ready for implementation with 0 blockers.

---

## ~~CRITICAL PRIORITY~~ [RESOLVED]

~~**Severity**: CRITICAL (2 issues), HIGH (3 issues)~~  
~~**Purpose**: Detailed analysis of dangerous unresolved gaps that could cause
data corruption, crashes, or broken user experience~~

---

## 🚨 CRITICAL PRIORITY

### Critical Issue #1: Move Reversal Logic for Recombine Operations

**Gap Reference**: Gap 13 from `GAP-ANALYSIS.md`  
**Status**: ❌ COMPLETELY UNSPECIFIED  
**Severity**: 🔴 CRITICAL - Can corrupt game state permanently

#### The Problem

The `COMPLETE-IMPLEMENTATION-GUIDE.md` describes recombine operations requiring
move reversal:

```typescript
class DeploySession {
  handleRecombine(newMove: InternalMove): void {
    // 1. Reverse the original move on board
    this.reverseMove(originalMove) // ← NO IMPLEMENTATION EXISTS

    // 2. Create combined move
    const combinedMove = this.createCombinedMove(originalMove, newMove)

    // 3. REPLACE in same position
    this.actions[moveIndex] = combinedMove

    // 4. Apply combined move to board
    this.applyMoveToBoard(combinedMove)
  }
}
```

**The `reverseMove()` method has ZERO specification.**

#### Why This Is Critical

**State Corruption Scenarios**:

1. **Captured Pieces Lost**

   ```typescript
   // Original move: Navy captures enemy Infantry at d4
   actions[0] = { from: 'c3', to: 'd4', piece: Navy, captured: Infantry }

   // Now Tank recombines with Navy
   // Need to: Reverse Navy move → restore Infantry at d4
   //          Then: Apply combined Navy+Tank move

   // ❌ If captured piece not restored: Enemy loses a piece permanently
   ```

2. **Carrying Stacks Corrupted**

   ```typescript
   // Original move: Navy carrying Tank moves to d4
   actions[0] = {
     from: 'c3',
     to: 'd4',
     piece: { type: 'n', carrying: [{ type: 't' }] },
   }

   // Now Infantry recombines at d4
   // Need to: Reverse Navy(Tank) → restore c3 state
   //          Then: Apply Navy(Tank+Infantry) to d4

   // ❌ If carrying state wrong: Tank vanishes or duplicates
   ```

3. **Board State Desynchronization**

   ```typescript
   // Original: c3 has Navy(AirForce, Tank)
   // Step 1: Navy → d4, c3 now has AirForce(Tank)
   // Step 2: Tank recombines with Navy at d4

   // Reverse requires:
   // - Remove Navy from d4
   // - Add Navy back to c3 with AirForce, Tank
   // - Then apply Navy(Tank) to d4, leaving AirForce at c3

   // ❌ If reversal incorrect: Pieces disappear or duplicate
   ```

#### What Must Be Specified

**Required State Restoration**:

```typescript
interface MoveReversal {
  // Restore piece at destination
  restoreDestination(): void {
    // If move was capture, restore captured piece
    // If square was empty, clear it
    // If square had a piece, restore exact state
  }

  // Restore piece at origin
  restoreOrigin(): void {
    // Put back the exact piece that moved (with carrying stack)
    // Restore any pieces that were left behind
  }

  // Handle special cases
  handleSpecialReversals(): void {
    // Castling reversal
    // En passant reversal
    // Promotion reversal (if applicable)
  }
}
```

**Implementation Requirements**:

1. **Capture Storage**: Every move must store `captured: Piece | null` for
   reversal
2. **Origin State**: Store complete origin square state before move
3. **Carrying Preservation**: Exact carrying array must be preserved
4. **Square History**: May need to store full square state, not just piece

#### Failure Impact

- **Data Loss**: Pieces permanently disappear from game
- **Duplication**: Pieces clone themselves
- **Desync**: Board state no longer matches FEN/history
- **Cascade Failures**: Later moves based on wrong state fail
- **Undo Broken**: Cannot reverse recombine operations
- **Save/Load Broken**: FEN reconstruction fails

#### Proposed Solution

**Option A: Store Full Square State**

```typescript
interface InternalMove {
  from: Square
  to: Square
  piece: Piece
  captured?: Piece | null
  fromBeforeState?: Piece | null // Complete state of origin before move
  toBeforeState?: Piece | null // Complete state of destination before move
  flags: number
}

function reverseMove(move: InternalMove): void {
  // Restore destination to pre-move state
  this._board[move.to] = move.toBeforeState || null

  // Restore origin to pre-move state
  this._board[move.from] = move.fromBeforeState || null
}
```

**Option B: Compute Reversal from Move**

```typescript
function reverseMove(move: InternalMove): void {
  // Remove piece from destination
  this._board[move.to] = move.captured || null

  // Restore piece to origin (reconstructing carrying state)
  const originPiece = this.reconstructOriginPiece(move)
  this._board[move.from] = originPiece
}

function reconstructOriginPiece(move: InternalMove): Piece {
  // Complex logic to rebuild the exact piece that was at origin
  // Including carrying stack reconstruction
}
```

**Recommendation**: **Option A** - Store complete state. More memory but safer
and simpler.

#### Required Documentation

Create `MOVE-REVERSAL-SPEC.md` with:

- Complete `reverseMove()` algorithm
- All edge cases (captures, carries, special moves)
- Test scenarios for every reversal type
- Memory/performance implications

---

### Critical Issue #2: SAN Parsing for Extended FEN Loading

**Gap Reference**: Gap 12 from `GAP-ANALYSIS.md`  
**Status**: ❌ PARSER NOT SPECIFIED  
**Severity**: 🔴 CRITICAL - Extended FEN system completely broken without it

#### The Problem

Extended FEN format defined as:

```
"...base-fen... DEPLOY c3:T<Nc5,F(T)d4..."
                         ^^^^^^^^^^^^^^^^
                         This must be parsed back to moves
```

**No parser exists to convert `"T<Nc5,F(T)d4"` back into `InternalMove[]`
array.**

#### Why This Is Critical

**Save/Load Completely Broken**:

1. **Cannot Load Saved Games**

   ```typescript
   // User saves game mid-deploy:
   const fen = game.fen()
   // "...base-fen... DEPLOY c3:T<Nc5,F(T)d4..."

   // Try to load:
   const game2 = new CoTuLenh(fen)
   // ❌ ERROR: Cannot parse "Nc5,F(T)d4" into moves
   // ❌ Deploy session not reconstructed
   // ❌ Game state lost
   ```

2. **FEN Round-Trip Fails**

   ```typescript
   const fen1 = game.fen()
   const game2 = new CoTuLenh(fen1)
   const fen2 = game2.fen()

   // ❌ fen1 !== fen2 because deploy session not reconstructed
   ```

3. **UI State Desynchronization**

   ```typescript
   // UI library (chessground) receives extended FEN
   chessground.set({ fen: '...DEPLOY c3:Nc5...' })

   // ❌ Cannot parse deploy section
   // ❌ Cannot highlight deployed pieces
   // ❌ Cannot show remaining pieces
   ```

#### Parsing Complexity

**SAN Notation Ambiguities**:

```typescript
// Simple move
'Nc5' // Navy to c5

// Carrying move
'N(T)c5' // Navy carrying Tank to c5
'N(T,I)c5' // Navy carrying Tank and Infantry

// Multiple moves
'Nc5,Fd4' // Navy to c5, AirForce to d4

// Staying pieces
'T<Nc5,Fd4' // Tank stays, Navy to c5, AirForce to d4

// Captures
'Nxd4' // Navy captures at d4
'N(T)xd4' // Navy carrying Tank captures at d4

// Disambiguation (if needed)
'N3c5' // Navy from rank 3 to c5
'Ncc5' // Navy from c-file to c5
```

**Parser Must Handle**:

1. **Tokenization**: Split `"Nc5,F(T)d4"` into `["Nc5", "F(T)d4"]`
2. **Piece Identification**: `"N"` → Navy, `"F"` → AirForce
3. **Carrying Parsing**: `"N(T,I)c5"` → Navy carries [Tank, Infantry]
4. **Capture Detection**: `"Nxd4"` → capture flag
5. **Disambiguation**: `"N3c5"` → which Navy if multiple exist
6. **Stay Marker**: `"T<"` → Tank remains at origin
7. **Destination Parsing**: `"c5"` → square coordinate

#### What Must Be Specified

**Required Parser Interface**:

```typescript
interface DeploySANParser {
  parse(san: string, stackSquare: Square): ParsedDeployMoves
}

interface ParsedDeployMoves {
  stayingPieces: PieceType[] // From "T<" or "T,I<"
  moves: InternalMove[] // Parsed move sequence
}

// Example usage:
const parser = new DeploySANParser()
const result = parser.parse('T<Nc5,F(T)d4', SQUARES.c3)
// result.stayingPieces = ['t']
// result.moves = [
//   { from: c3, to: c5, piece: Navy, ... },
//   { from: c3, to: d4, piece: AirForce, carrying: [Tank], ... }
// ]
```

**Grammar Specification Needed**:

```ebnf
DeploySAN     = [StayPart] MoveList "..."?
StayPart      = PieceList "<"
MoveList      = Move ("," Move)*
Move          = Piece Carry? Capture? Square
Piece         = "N" | "F" | "T" | "I" | ...
Carry         = "(" PieceList ")"
PieceList     = Piece ("," Piece)*
Capture       = "x"
Square        = File Rank
File          = "a".."h"
Rank          = "1".."8"
```

#### Failure Impact

- **Extended FEN Useless**: Cannot load games with deploy markers
- **Save/Load Broken**: Players lose game progress
- **UI Integration Fails**: Cannot display deploy state properly
- **Testing Impossible**: Cannot create test cases from FEN
- **Documentation Examples Wrong**: All FEN examples unverifiable

#### Proposed Solution

```typescript
class DeploySANParser {
  parse(
    san: string,
    stackSquare: Square,
    originalStack: Piece,
  ): ParsedDeployMoves {
    // Remove unfinished marker
    const cleanSan = san.replace('...', '')

    // Check for staying pieces
    let stayingPieces: PieceType[] = []
    let movePart = cleanSan

    if (cleanSan.includes('<')) {
      const [stayStr, moveStr] = cleanSan.split('<')
      stayingPieces = this.parsePieceList(stayStr)
      movePart = moveStr
    }

    // Split moves by comma
    const moveStrings = movePart.split(',')

    // Parse each move
    const moves: InternalMove[] = []
    for (const moveStr of moveStrings) {
      const move = this.parseSingleMove(
        moveStr.trim(),
        stackSquare,
        originalStack,
      )
      moves.push(move)
    }

    return { stayingPieces, moves }
  }

  private parseSingleMove(
    moveStr: string,
    from: Square,
    originalStack: Piece,
  ): InternalMove {
    // Parse: "N(T,I)xd4" or "Nc5" or "F(T)d4"

    const pieceChar = moveStr[0]
    const pieceType = this.charToPieceType(pieceChar)

    // Check for carrying
    let carrying: Piece[] = []
    let rest = moveStr.slice(1)

    if (rest.startsWith('(')) {
      const carryEnd = rest.indexOf(')')
      const carryStr = rest.slice(1, carryEnd)
      carrying = this.parsePieceList(carryStr).map((t) => ({ type: t }))
      rest = rest.slice(carryEnd + 1)
    }

    // Check for capture
    const isCapture = rest.startsWith('x')
    if (isCapture) rest = rest.slice(1)

    // Remaining is square
    const to = this.squareFromAlgebraic(rest)

    return {
      from,
      to,
      piece: { type: pieceType, carrying },
      flags: BITS.DEPLOY | (isCapture ? BITS.CAPTURE : 0),
      color: originalStack.color,
    }
  }
}
```

#### Required Documentation

Create `SAN-PARSER-SPEC.md` with:

- Complete grammar (EBNF or similar)
- Parser algorithm with pseudocode
- All test cases covering edge cases
- Error handling for invalid SAN
- Integration with FEN loader

---

## 🔶 HIGH PRIORITY

### High Risk #1: Deploy Session Cancellation

**Gap Reference**: Gap 10 from `GAP-ANALYSIS.md`  
**Status**: ❌ NO SPECIFICATION  
**Severity**: 🟠 HIGH - User experience failure, potential state corruption

#### The Problem

Users can start a deploy session but have no way to cancel it mid-deployment.

**No cancellation mechanism exists.**

#### Why This Is High Risk

**User Gets Stuck**:

```typescript
// User starts deploy
game.move({ from: 'c3', to: 'c5', piece: 'n', deploy: true })
// Deploy session active

// User realizes mistake or wants to try different deployment
// ❌ Cannot cancel
// ❌ Cannot make other moves
// ❌ Only option: Keep deploying or refresh page (lose game)
```

**Invalid State Scenarios**:

1. **Deploy Into Losing Position**

   ```typescript
   // User deploys Navy to d4
   // Realizes this exposes commander to checkmate
   // ❌ Cannot cancel, must complete deploy or lose
   ```

2. **Misclick Recovery**

   ```typescript
   // User accidentally clicks wrong square
   // Piece deployed to wrong location
   // ❌ Cannot cancel, move is applied
   // Undo within session doesn't help if it was the first move
   ```

3. **Rule Learning**
   ```typescript
   // New player doesn't understand deploy mechanics
   // Makes illegal sequence of moves
   // ❌ Gets stuck with invalid deploy state
   // ❌ No clear way to recover
   ```

#### What Must Be Specified

**Cancellation Requirements**:

```typescript
interface DeploySession {
  cancel(): void {
    // 1. Rollback all actions to original state
    // 2. Clear deploy session
    // 3. Restore board to pre-deploy state
    // 4. Do NOT switch turn
    // 5. Do NOT add to history
  }
}

// User API
class CoTuLenh {
  cancelDeploySession(): boolean {
    if (!this._deploySession) {
      return false // No active session
    }

    this.rollbackToFEN(this._deploySession.startFEN)
    this._deploySession = null
    return true
  }
}
```

**State Restoration Requirements**:

- Restore board to `deploySession.startFEN`
- Clear all `deploySession.actions`
- Keep turn unchanged
- Do NOT increment move counters
- Do NOT add history entry

#### Failure Impact

- **UX Failure**: Users forced to refresh/abandon games
- **Training Barrier**: New players cannot experiment safely
- **Production Issues**: Support requests for "stuck" games
- **Workaround Corruption**: Users try manual undo, break state

#### Proposed Solution

```typescript
class CoTuLenh {
  cancelDeploySession(): boolean {
    if (!this._deploySession) {
      throw new Error('No active deploy session to cancel')
    }

    // Load the state from before deploy started
    const beforeState = this.loadFromFEN(this._deploySession.startFEN)

    // Restore board state
    this._board = beforeState._board
    this._turn = beforeState._turn
    // ... restore all game state

    // Clear session
    this._deploySession = null

    return true
  }
}
```

#### Required Documentation

Add to `COMPLETE-IMPLEMENTATION-GUIDE.md`:

- Cancellation API specification
- Rollback mechanism
- UI integration (cancel button)
- Test scenarios for cancellation
- Edge cases (cancel after recombine, etc.)

---

### High Risk #2: Recombine Move Validation

**Gap Reference**: Gap 8 from `GAP-ANALYSIS.md`  
**Status**: ⚠️ GENERATION DEFINED, VALIDATION MISSING  
**Severity**: 🟠 HIGH - Can generate illegal moves

#### The Problem

`02-MOVE-GENERATION.md` specifies how to generate recombine moves:

```typescript
function generateRecombineMoves(game, session): InternalMove[] {
  const moves: InternalMove[] = []
  const deployedSquares = getDeployedSquares(session)

  for (const piece of remaining) {
    for (const targetSquare of deployedSquares) {
      if (canReach(stackSquare, targetSquare, piece)) {
        moves.push({
          to: targetSquare,
          piece: piece,
          flags: BITS.DEPLOY | BITS.RECOMBINE,
        })
      }
    }
  }
  return moves
}
```

**But validation is incomplete:**

- ✅ Range check (`canReach`)
- ❌ Terrain compatibility at destination
- ❌ Stack size limits (3+ pieces?)
- ❌ Commander attack after recombine
- ❌ Piece type compatibility

#### Why This Is High Risk

**Invalid Moves Generated**:

1. **Water Piece on Land**

   ```typescript
   // Navy at d4 (land terrain)
   // Submarine at c3 (original water terrain)
   // Submarine can reach d4 (range OK)

   // ❌ Generate recombine: Submarine → d4
   // ❌ This is illegal (submarine cannot be on land)
   // ❌ Move appears in list, user can select it
   ```

2. **Stack Size Exceeded**

   ```typescript
   // c3: Navy(AirForce, Tank)
   // Step 1: Navy → d4
   // Step 2: AirForce → d4 (recombine)
   // Now: d4 has Navy(AirForce)
   // Step 3: Tank → d4 (recombine)

   // ❌ Would create: Navy(AirForce, Tank) at d4
   // ❌ But original stack already had 3 pieces
   // ❌ Should this be allowed? No limit defined.
   ```

3. **Commander Attack via Recombine**

   ```typescript
   // Navy at d4, not attacking enemy commander
   // Tank can recombine to d4
   // Navy(Tank) at d4 DOES attack commander

   // ❌ If recombine not validated for commander safety
   // ❌ Illegal move generated and playable
   ```

#### What Must Be Specified

**Recombine Validation Rules**:

```typescript
function validateRecombineMove(
  game: CoTuLenh,
  move: InternalMove,
  session: DeploySession,
): boolean {
  // 1. Range check (already done)
  if (!canPieceReach(session.stackSquare, move.to, move.piece)) {
    return false
  }

  // 2. Terrain compatibility
  const terrain = game.getTerrainAt(move.to)
  if (!canPieceStayOnTerrain(move.piece.type, terrain)) {
    return false
  }

  // 3. Check resulting stack size
  const existingPiece = game._board[move.to]
  const resultingStack = combineStacks(existingPiece, move.piece)
  if (!isValidStackSize(resultingStack)) {
    return false
  }

  // 4. Commander safety (use existing validation)
  // This is handled by _filterLegalMoves

  return true
}
```

**Questions to Answer**:

- What is maximum stack size? (2, 3, 4, unlimited?)
- Can water pieces recombine on land squares?
- Can land-only pieces recombine on water?
- Can recombine create invalid combinations?

#### Failure Impact

- **Illegal Moves**: Users can make moves violating game rules
- **UI Confusion**: Invalid moves shown as legal
- **Game State Corruption**: Invalid stacks created
- **Competitive Unfairness**: Exploitable game mechanics

#### Proposed Solution

```typescript
// In move generation
function generateRecombineMoves(
  game: CoTuLenh,
  session: DeploySession,
): InternalMove[] {
  const candidateMoves: InternalMove[] = []
  const deployedSquares = getDeployedSquares(session)
  const remaining = session.getRemainingPieces()

  for (const piece of remaining.carrying) {
    for (const square of deployedSquares) {
      // Basic range check
      if (!canPieceReach(session.stackSquare, square, piece)) {
        continue
      }

      // Terrain validation
      const terrain = game.getTerrainAt(square)
      if (!canPieceStayOnTerrain(piece.type, terrain)) {
        continue
      }

      // Stack size validation
      const existingPiece = game._board[square]
      const wouldExceedLimit = getStackSize(existingPiece) >= MAX_STACK_SIZE
      if (wouldExceedLimit) {
        continue
      }

      candidateMoves.push({
        from: session.stackSquare,
        to: square,
        piece: piece,
        flags: BITS.DEPLOY | BITS.RECOMBINE,
      })
    }
  }

  // Still run through _filterLegalMoves for commander checks
  return game._filterLegalMoves(candidateMoves, session.turn)
}
```

#### Required Documentation

Add to `COMPLETE-IMPLEMENTATION-GUIDE.md` or create `RECOMBINE-VALIDATION.md`:

- Complete recombine validation algorithm
- Stack size limits definition
- Terrain compatibility rules
- Test cases for all validation scenarios
- Edge cases (recombine with captures, special terrains)

---

### High Risk #3: Game Clone Failure During Validation

**Gap Reference**: Gap 9 from `GAP-ANALYSIS.md`  
**Status**: ⚠️ TRY/CATCH APPROACH, NO FALLBACK  
**Severity**: 🟠 HIGH - Can crash move generation

#### The Problem

The try/catch validation approach relies on `game.clone()`:

```typescript
function isValidMove(game: CoTuLenh, move: InternalMove): boolean {
  try {
    const tempGame = game.clone() // ← WHAT IF THIS FAILS?
    tempGame.applyMove(move)
    return true
  } catch (error) {
    return false
  }
}
```

**No specification for what happens if `clone()` fails.**

#### Why This Is High Risk

**Clone Can Fail Due To**:

1. **Deep State Corruption**

   ```typescript
   // Circular reference in board state
   this._board['c3'].carrying[0] = this._board['c3'] // Cycle

   // Clone attempts deep copy
   const cloned = JSON.parse(JSON.stringify(this)) // ❌ ERROR
   ```

2. **Memory Exhaustion**

   ```typescript
   // Complex game state with deep history
   // Clone requires duplicating entire state

   const tempGame = game.clone() // ❌ Out of memory
   ```

3. **Missing Clone Implementation**

   ```typescript
   // Some state objects don't have clone methods
   this._customState = new SpecialObject()

   const cloned = this.clone() // ❌ SpecialObject.clone() undefined
   ```

**Impact of Clone Failure**:

```typescript
function _filterLegalMoves(moves: InternalMove[]): InternalMove[] {
  const legalMoves: InternalMove[] = []

  for (const move of moves) {
    try {
      const tempGame = this.clone() // ❌ THROWS ERROR
      // ... rest never executes
    } catch (error) {
      // Error caught, move marked invalid
      // But ALL remaining moves also fail!
    }
  }

  return legalMoves // ❌ Returns empty array (no legal moves!)
}
```

#### What Must Be Specified

**Clone Error Handling**:

```typescript
function _filterLegalMoves(moves: InternalMove[]): InternalMove[] {
  const legalMoves: InternalMove[] = []

  for (const move of moves) {
    try {
      const tempGame = this.clone()
      if (!tempGame) {
        throw new Error('Clone returned null')
      }

      tempGame.applyMove(move)

      if (!tempGame._isCommanderAttacked(us)) {
        legalMoves.push(move)
      }
    } catch (error) {
      // Distinguish between:
      // 1. Clone failure (system error)
      // 2. Move application failure (invalid move)

      if (error.message.includes('clone')) {
        // FALLBACK: Use in-place validation
        if (this.validateMoveWithoutClone(move)) {
          legalMoves.push(move)
        }
      }
      // else: Move is invalid, skip it
    }
  }

  return legalMoves
}
```

**Fallback Validation Needed**:

```typescript
function validateMoveWithoutClone(move: InternalMove): boolean {
  // Apply move directly
  this._makeMove(move)

  // Check validity
  const isValid =
    !this._isCommanderAttacked(this._turn) &&
    !this._isCommanderExposed(this._turn)

  // CRITICAL: Undo move
  this._undoMove()

  return isValid
}
```

#### Failure Impact

- **Move Generation Crashes**: All moves marked invalid
- **User Stuck**: Cannot make any moves (including deploy)
- **Silent Failure**: No clear error message
- **Cascade Failure**: One clone error affects all subsequent moves

#### Proposed Solution

```typescript
class CoTuLenh {
  private _cloneFailureCount: number = 0
  private _useCloneValidation: boolean = true

  private _filterLegalMoves(moves: InternalMove[]): InternalMove[] {
    const legalMoves: InternalMove[] = []

    for (const move of moves) {
      const isValid = this._useCloneValidation
        ? this.validateWithClone(move)
        : this.validateInPlace(move)

      if (isValid) {
        legalMoves.push(move)
      }
    }

    return legalMoves
  }

  private validateWithClone(move: InternalMove): boolean {
    try {
      const tempGame = this.clone()
      tempGame._makeMove(move)
      return !tempGame._isCommanderAttacked(this._turn)
    } catch (error) {
      // Clone failed, switch to in-place validation
      this._cloneFailureCount++

      if (this._cloneFailureCount > 3) {
        console.warn('Clone validation failing, switching to in-place')
        this._useCloneValidation = false
      }

      // Fallback for this move
      return this.validateInPlace(move)
    }
  }

  private validateInPlace(move: InternalMove): boolean {
    this._makeMove(move)
    const isValid = !this._isCommanderAttacked(this._turn)
    this._undoMove()
    return isValid
  }
}
```

#### Required Documentation

Add to `COMPLETE-IMPLEMENTATION-GUIDE.md`:

- Clone failure scenarios
- Fallback validation strategy
- Error handling and recovery
- Performance implications
- When to use clone vs in-place validation

---

## 📋 Resolution Checklist

### Must Complete Before Implementation

- [ ] **Document Move Reversal** - Create `MOVE-REVERSAL-SPEC.md` or add to
      implementation guide
- [ ] **Specify SAN Parser** - Create `SAN-PARSER-SPEC.md` with complete grammar
      and algorithm
- [ ] **Add Cancellation Workflow** - Document cancellation API and rollback
      mechanism
- [ ] **Define Recombine Validation** - Complete validation rules for recombine
      moves
- [ ] **Handle Clone Failures** - Add fallback validation strategy

### Estimated Impact

| Issue                | Time to Resolve | Risk if Unresolved          | Workaround Possible?   |
| -------------------- | --------------- | --------------------------- | ---------------------- |
| Move Reversal        | 2-4 hours       | CRITICAL - Data loss        | ❌ No                  |
| SAN Parser           | 4-6 hours       | CRITICAL - Save/load broken | ❌ No                  |
| Cancellation         | 2-3 hours       | HIGH - Poor UX              | ⚠️ Manual refresh      |
| Recombine Validation | 1-2 hours       | HIGH - Illegal moves        | ⚠️ Manual checking     |
| Clone Failure        | 1-2 hours       | MEDIUM - Rare crashes       | ⚠️ In-place validation |

**Total Estimated Time**: 10-17 hours of documentation and specification work

---

## 🎯 Next Actions

1. **Immediate**: Assign owners to each critical issue
2. **Priority 1**: Document move reversal and SAN parser (blocking save/load and
   recombine)
3. **Priority 2**: Add cancellation and recombine validation (user experience)
4. **Priority 3**: Clone failure handling (robustness)
5. **Review**: Cross-check all solutions against existing implementation

**Status**: ✅ ALL ISSUES RESOLVED - See RESOLVED-GAPS.md  
**Recommendation**: Ready to begin implementation - no blocking issues remain

## 🎉 Resolution Summary

### Critical Issue #1: Move Reversal Logic - RESOLVED

**Solution**: Existing command pattern in `move-apply.ts` handles all reversal
needs perfectly.

### Critical Issue #2: SAN Parser - SPECIFIED

**Solution**: Complete specification created in `SAN-PARSER-SPEC.md`, ready for
implementation.

### High Risk Issues - RESOLVED

- **Cancellation**: Trivial with command pattern (`session.cancel()`)
- **Recombine Validation**: Use existing `PieceStacker.combine()` +
  `_filterLegalMoves()`
- **Game Clone Failure**: NON-ISSUE - No cloning used! Existing code uses
  action-based validation

## ⚠️ Documentation Error Corrected

**IMPORTANT**: Earlier documentation incorrectly suggested `game.clone()` for
validation.

**CORRECT APPROACH**: Existing `_filterLegalMoves()` uses **STORE ACTIONS, NOT
STATE**:

```typescript
// CORRECT (existing implementation)
this._makeMove(move) // Apply actions
// ... validate
this._undoMove() // Reverse actions
```

**NO CLONING ANYWHERE** - the action-based architecture is already implemented
correctly.

**All issues resolved - implementation can proceed immediately.**
