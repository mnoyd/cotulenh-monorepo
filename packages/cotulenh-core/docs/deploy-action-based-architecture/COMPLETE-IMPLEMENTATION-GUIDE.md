# Action-Based Deploy Architecture - Complete Implementation Guide

**Created**: October 22, 2025  
**Status**: Ready for Implementation  
**Purpose**: Complete specification for action-based deploy system with
recombine moves, extended FEN, and proper history management

---

## 🎯 Core Philosophy

**"Store Actions, Not State"**

- Modify the **real board directly** during deployment
- Track **actions taken** during deploy session
- Use **action rollback** for undo/validation
- Adapt **FEN and queries** to handle active deployment
- **Single source of truth**: Real board state

---

## 🏗️ Architecture Components

### 1. Deploy Session Object

```typescript
class DeploySession {
  stackSquare: Square // Where deployment started
  turn: Color // Who is deploying
  originalPiece: Piece // Original stack (for reference)
  actions: InternalMove[] // Moves made during deploy (NOT custom actions)
  startFEN: string // FEN before deploy started

  // Core state calculation using existing utils
  getRemainingPieces(): Piece | null {
    let remaining = this.originalPiece

    for (const move of this.actions) {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        remaining = removePieceFromStack(remaining, move.piece.role) || null
      }
    }

    return remaining
  }

  canCommit(): boolean {
    return this.actions.length > 0 // At least one move made
  }
}
```

### 2. Move Generation Integration

```typescript
// In move-generation.ts
function generateMoves(game: CoTuLenh): InternalMove[] {
  if (game._deploySession) {
    return generateDeployMoves(game, game._deploySession)
  }

  return generateNormalMoves(game)
}

function generateDeployMoves(
  game: CoTuLenh,
  session: DeploySession,
): InternalMove[] {
  const remaining = session.getRemainingPieces()

  if (!remaining || !remaining.carrying?.length) {
    return [] // Nothing left to deploy
  }

  const moves: InternalMove[] = []

  // 1. Generate normal moves (to empty squares, normal combines)
  const normalMoves = generateNormalDeployMoves(game, session, remaining)
  moves.push(...normalMoves)

  // 2. Generate recombine moves ONLY for pieces not in normal move list
  const recombineMoves = generateRecombineMoves(
    game,
    session,
    remaining,
    normalMoves,
  )
  moves.push(...recombineMoves)

  return moves
}
```

### 3. Validation Using Try/Catch

```typescript
// CORRECT: Use existing action-based validation (NO CLONING!)
// This is already implemented in src/cotulenh.ts:610-625
private _filterLegalMoves(moves: InternalMove[]): InternalMove[] {
  const legalMoves: InternalMove[] = []
  for (const move of moves) {
    this._makeMove(move)      // ✅ Apply actions

    if (!this._isCommanderAttacked(us) && !this._isCommanderExposed(us)) {
      legalMoves.push(move)
    }

    this._undoMove()          // ✅ Reverse actions (STORE ACTIONS, NOT STATE!)
  }
  return legalMoves
}

// In move-apply.ts - add terrain validation
function applyMove(game: CoTuLenh, move: InternalMove): void {
  // ... existing move application logic ...

  // After placing piece, validate terrain compatibility
  if (move.to) {
    const piece = game.board[move.to]
    const terrain = game.getTerrainAt(move.to)

    if (!canPieceStayOnTerrain(piece, terrain)) {
      throw new Error(`${piece.type} cannot stay on ${terrain}`)
    }
  }

  // For deploy moves, validate what remains at origin
  if (move.flags & BITS.DEPLOY && game._deploySession) {
    const remaining = game._deploySession.getRemainingPieces()
    if (remaining && remaining.carrying?.length > 0) {
      const terrain = game.getTerrainAt(game._deploySession.stackSquare)

      for (const piece of remaining.carrying) {
        if (!canPieceStayOnTerrain(piece, terrain)) {
          throw new Error(`Cannot deploy: ${piece.type} cannot remain on ${terrain}`)
        }
      }
    }
  }
}
```

---

## 🔄 Recombine Moves - Critical Behavior

### Purpose

Recombine moves solve UI interaction limitations where users want to move pieces
together but must drag them individually. They allow pieces to rejoin previously
deployed pieces from the same stack.

### When Recombine Moves Are Generated

```typescript
function generateRecombineMoves(
  game: CoTuLenh,
  session: DeploySession,
  remaining: Piece,
  normalMoves: InternalMove[],
): InternalMove[] {
  const moves: InternalMove[] = []
  const deployedSquares = getDeployedSquares(session)

  for (const piece of remaining.carrying) {
    for (const square of deployedSquares) {
      // ONLY add recombine if no normal move exists to that square
      const hasNormalMove = normalMoves.some(
        (move) => move.piece === piece && move.to === square,
      )

      if (!hasNormalMove && canReach(session.stackSquare, square, piece)) {
        moves.push({
          from: session.stackSquare,
          to: square,
          piece: piece,
          flags: BITS.DEPLOY | BITS.RECOMBINE,
        })
      }
    }
  }

  return moves
}
```

### Recombine Execution - Order Preservation

**CRITICAL**: When recombining, replace moves in place to preserve chronological
order.

```typescript
class DeploySession {
  handleRecombine(newMove: InternalMove): void {
    // Find the move to recombine with (last move to same square)
    const targetSquare = newMove.to
    const moveIndex = this.findLastMoveToSquare(targetSquare)

    const originalMove = this.actions[moveIndex]

    // 1. Reverse the original move on board
    this.reverseMove(originalMove)

    // 2. Create combined move
    const combinedMove = this.createCombinedMove(originalMove, newMove)

    // 3. REPLACE in same position (preserve order)
    this.actions[moveIndex] = combinedMove

    // 4. Apply combined move to board
    this.applyMoveToBoard(combinedMove)
  }
}
```

**Example**: F|T|I stack

```typescript
// Step 1: F to d4
actions = [{ from: 'c3', to: 'd4', piece: 'f' }] // Index 0

// Step 2: T to e5
actions = [
  { from: 'c3', to: 'd4', piece: 'f' }, // Index 0
  { from: 'c3', to: 'e5', piece: 't' }, // Index 1
]

// Step 3: I recombines with F at d4
actions = [
  { from: 'c3', to: 'd4', piece: 'f', carrying: ['i'] }, // Index 0 - REPLACED
  { from: 'c3', to: 'e5', piece: 't' }, // Index 1 - PRESERVED
]
```

**Why Order Matters**: Later moves may depend on earlier moves (captures, threat
removal). F capturing a threatening piece makes T's move legal.

---

## 📊 History Management - Transaction Model

### Core Principle

Deploy sessions are **atomic transactions** - individual steps are NOT separate
history entries. The entire session commits as one history entry when complete.

### History Behavior During Deploy

```typescript
class CoTuLenh {
  undo(): boolean {
    if (this._deploySession) {
      // DURING DEPLOY: Undo within session, not history
      return this._deploySession.undoLastMove()
    } else {
      // NORMAL: Undo from history
      return this.undoFromHistory()
    }
  }
}
```

### Deploy Command Structure

```typescript
interface DeployCommand {
  type: 'DEPLOY'
  from: Square // Original stack square
  originalStack: Piece // What was there before deploy (for undo)
  deployments: Deployment[] // All final deployments
  san: string // Human-readable notation
}

interface Deployment {
  piece: PieceType // Main piece (carrier)
  to: Square // Destination
  carrying: PieceType[] // Carried pieces (if any)
  capture?: Piece // Captured piece (if any)
}
```

### Session to Command Transformation

```typescript
class DeploySession {
  toDeployCommand(): DeployCommand {
    return {
      type: 'DEPLOY',
      from: this.stackSquare,
      originalStack: this.originalPiece,
      deployments: this.actions.map((action) => ({
        piece: action.piece,
        to: action.to,
        carrying: action.carrying || [],
        capture: action.capture,
      })),
      san: this.generateSAN(),
    }
  }
}
```

---

## 🎮 Deploy Session Lifecycle

### 1. Session Creation (Lazy Initialization)

```typescript
class CoTuLenh {
  move(move: Move): boolean {
    if (move.deploy) {
      if (!this._deploySession) {
        // CREATE new deploy session
        this._deploySession = new DeploySession({
          stackSquare: move.from,
          turn: this._turn,
          originalPiece: this._board[move.from],
          startFEN: this.fen(), // Capture state before any deploy
          actions: [],
        })
      }

      return this.executeDeployMove(move)
    } else {
      if (this._deploySession) {
        throw new Error('Cannot make normal move during deploy session')
      }
      return this.executeNormalMove(move)
    }
  }
}
```

### 2. Session Completion - Two Modes

#### Auto-Commit Mode

```typescript
function executeDeployMove(move: Move): boolean {
  this._deploySession.addMove(move)
  this.applyMoveToBoard(move)

  // Auto-commit when no pieces left
  if (this.shouldAutoCommit()) {
    this.commitDeploySession()
  }

  return true
}

function shouldAutoCommit(): boolean {
  const remaining = this._deploySession.getRemainingPieces()
  return !remaining || !remaining.carrying || remaining.carrying.length === 0
}
```

#### Manual Commit Mode

```typescript
// Public API for UI button
function commitDeploySession(): boolean {
  if (!this._deploySession?.canCommit()) {
    throw new Error('Cannot commit empty deploy session')
  }

  // Validate staying pieces
  const remaining = this._deploySession.getRemainingPieces()
  if (remaining && remaining.carrying?.length > 0) {
    this.validateStayingPieces(remaining)
  }

  // Add to history as single entry
  const deployCommand = this._deploySession.toDeployCommand()
  this._history.push({
    command: deployCommand,
    beforeFEN: this._deploySession.startFEN,
    afterFEN: this.generateNormalFEN(),
    san: deployCommand.san,
  })

  // Clean up
  this._deploySession = null
  this._turn = this._turn === 'w' ? 'b' : 'w'

  return true
}
```

### 3. Configuration Options

```typescript
interface DeployConfig {
  autoCommit: boolean // Auto-commit when all pieces moved
  allowPartialCommit: boolean // Allow commit with pieces remaining
  validateStaying: boolean // Validate remaining pieces can stay
}
```

---

## 📝 Extended FEN Format

### Purpose

- Preserve complete game state during deploy sessions
- Signal to UI library that deploy mode is active
- Enable save/load mid-deployment

### Format Specification

```typescript
// Standard FEN
'<board> <turn> <castling> <en-passant> <halfmoves> <fullmoves>'

// Extended FEN (During Deploy)
'<board-before-deploy> <turn> <castling> <en-passant> <halfmoves> <fullmoves> DEPLOY <square>:<san-moves>...'
```

### Key Insight: Base FEN = Original State

The base FEN represents the board **BEFORE** deploy started. The DEPLOY section
shows what moves have been made.

### FEN Generation Using Existing SAN Pattern

```typescript
class DeploySession {
  toExtendedFEN(baseFEN: string): string {
    // Reuse existing deployMoveToSanLan logic
    const deployMove: InternalDeployMove = {
      from: this.stackSquare,
      moves: this.actions,
      stay: this.getRemainingPieces(),
    }

    const [san, lan] = deployMoveToSanLan(game, deployMove)
    const unfinishedSan = `${san}...` // "..." indicates unfinished

    return `${baseFEN} DEPLOY ${this.stackSquare}:${unfinishedSan}`
  }
}
```

### Examples

```typescript
// Initial: c3=Navy(AirForce,Tank)
// After Navy deploys to c5:
'...base-fen... DEPLOY c3:Nc5...'

// After AirForce+Tank recombine at d4:
'...base-fen... DEPLOY c3:Nc5,F(T)d4...'

// With staying pieces:
'...base-fen... DEPLOY c3:T<Nc5,Fd4...' // Tank stays, Navy to c5, AirForce to d4
```

### Load/Reconstruct Process

```typescript
function loadFromExtendedFEN(extendedFEN: string): CoTuLenh {
  const parts = extendedFEN.split(' ')

  if (!parts.includes('DEPLOY')) {
    return CoTuLenh.fromFEN(extendedFEN)
  }

  // Parse deploy info
  const deployIndex = parts.indexOf('DEPLOY')
  const deployInfo = parts[deployIndex + 1] // "c3:Nc5,Fd4..."
  const [stackSquare, sanMoves] = deployInfo.split(':')
  const completedSan = sanMoves.replace('...', '')

  // 1. Load base FEN (original state)
  const baseFEN = parts.slice(0, deployIndex).join(' ')
  const game = CoTuLenh.fromFEN(baseFEN)

  // 2. Create deploy session
  game._deploySession = new DeploySession({
    stackSquare,
    turn: game._turn,
    originalPiece: game._board[stackSquare],
    startFEN: baseFEN,
    actions: [],
  })

  // 3. Parse and apply moves from SAN
  const moves = parseSanMovesToActions(completedSan, stackSquare)
  for (const move of moves) {
    game._deploySession.addMove(move)
    game.applyMoveToBoard(move)
  }

  return game
}
```

---

## 🔧 Implementation Checklist

### Core Components

- [ ] `DeploySession` class with action tracking
- [ ] Move generation integration in `move-generation.ts`
- [ ] Try/catch validation in move application
- [ ] Terrain compatibility validation
- [ ] Recombine move generation logic
- [ ] Order-preserving recombine execution

### History Management

- [ ] Session-based undo/redo during deploy
- [ ] Deploy command structure
- [ ] Session to command transformation
- [ ] History commit on session completion
- [ ] Undo/redo of deploy commands

### FEN Handling

- [ ] Extended FEN generation using existing SAN
- [ ] Extended FEN parsing and reconstruction
- [ ] Save/load mid-deployment support
- [ ] UI integration points for deploy mode

### Session Lifecycle

- [ ] Lazy session creation on first deploy move
- [ ] Auto-commit vs manual commit modes
- [ ] Session validation and completion
- [ ] Configuration options

### Edge Cases

- [ ] Commander attack detection during deploy
- [ ] Terrain validation for staying pieces
- [ ] Multiple recombine scenarios
- [ ] Error handling and recovery

---

## 🎯 Success Criteria

- [ ] **Simplicity**: Less code than virtual state approach
- [ ] **Correctness**: All game rules enforced via try/catch
- [ ] **Completeness**: Recombine moves work properly
- [ ] **Performance**: No virtual board overhead
- [ ] **Maintainability**: Clear action audit trail
- [ ] **UI Integration**: Extended FEN enables proper UI feedback
- [ ] **Save/Load**: Mid-deployment state preservation

---

## 🚀 Implementation Strategy

1. **Phase 1**: Core deploy session and basic move generation
2. **Phase 2**: Recombine moves with order preservation
3. **Phase 3**: Extended FEN and save/load support
4. **Phase 4**: History management and UI integration
5. **Phase 5**: Edge case handling and optimization

**Status**: Ready for implementation  
**Next Step**: Begin Phase 1 - Core deploy session implementation
