# CoTuLenh Implementation Guide - Current 0x88 Architecture

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [0x88 Board Representation](#0x88-board-representation)
4. [Singleton Pattern Usage](#singleton-pattern-usage)
5. [Command Pattern Implementation](#command-pattern-implementation)
6. [Move Generation System](#move-generation-system)
7. [Deploy Architecture](#deploy-architecture)
8. [Performance Characteristics](#performance-characteristics)
9. [Memory Management](#memory-management)
10. [Testing and Debugging](#testing-and-debugging)

---

## Architecture Overview

### Design Philosophy

CoTuLenh uses a **centralized singleton pattern** with the `CoTuLenh` class
serving as the main game engine that orchestrates all game logic. This creates a
hub-and-spoke architecture where most components depend on or interact with the
central game instance.

### Core Architectural Patterns

1. **Singleton Pattern**: Central game state management
2. **Command Pattern**: Atomic move execution with undo capability
3. **Strategy Pattern**: Configurable piece movement behaviors
4. **Observer Pattern**: State change notifications and cache invalidation
5. **Factory Pattern**: Move command creation based on move types

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CoTuLenh Class                           │
│                 (Central Game Engine)                       │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │ Board State │ Game State  │ Move Cache  │ History     │  │
│  │ (_board)    │ (_turn,     │ (LRU)       │ (_history)  │  │
│  │             │  _counters) │             │             │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Move        │ │ Move        │ │ Deploy      │ │ Air Defense │
    │ Generation  │ │ Application │ │ System      │ │ System      │
    │             │ │ (Commands)  │ │             │ │             │
    └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Utils       │ │ Type System │ │ External    │ │ Performance │
    │ Functions   │ │ (type.ts)   │ │ Libraries   │ │ Caching     │
    └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

---

## Core Components

### 1. CoTuLenh Class (`src/cotulenh.ts`)

**Primary Class**: Central game state manager and orchestrator

```typescript
export class CoTuLenh {
  // Core game state
  private _board = new Array<Piece | undefined>(256)
  private _turn: Color = RED
  private _commanders: Record<Color, number> = { r: -1, b: -1 }
  private _halfMoves = 0
  private _moveNumber = 1

  // History and undo system
  private _history: History[] = []
  private _positionCount: Record<string, number> = {}

  // Deploy system (action-based architecture)
  private _deployState: DeployState | null = null
  private _deploySession: DeploySession | null = null

  // Air defense system
  private _airDefense: AirDefense = {
    [RED]: new Map<number, number[]>(),
    [BLUE]: new Map<number, number[]>(),
  }

  // Performance optimization
  private _movesCache = new QuickLRU<string, InternalMove[]>({ maxSize: 1000 })
  private _comments: Record<string, string> = {}
  private _header: Record<string, string> = {}
}
```

**Key Responsibilities**:

- Board state management (0x88 array)
- Move validation and execution
- Game rule enforcement
- History tracking and undo operations
- Deploy session management
- Air defense calculations
- Performance caching

### 2. Type System (`src/type.ts`)

**Role**: Central type definitions and constants

```typescript
// Core piece types
export type PieceSymbol = 'c' | 'i' | 't' | 'm' | 'e' | 'a' | 'b' | 's' | 'f' | 'n' | 'h'
export type Color = 'r' | 'b'
export type Square = 'a1' | 'a2' | ... | 'k12' // All 132 squares

// Piece structure
export interface Piece {
  type: PieceSymbol
  color: Color
  heroic?: boolean
  carrying?: Piece[]
}

// Internal move representation
export interface InternalMove {
  color: Color
  from: number
  to: number
  piece: Piece
  captured?: Piece
  flags: number
}

// Board constants
export const SQUARE_MAP: Record<Square, number> = {
  a12: 0x00, b12: 0x01, ..., k1: 0xBA
}

export const NAVY_MASK: boolean[] = [/* water squares */]
export const LAND_MASK: boolean[] = [/* land squares */]
```

**Key Exports**:

- All piece types and symbols
- Board representation constants
- Move flags and internal structures
- Game state types
- Terrain masks

### 3. Utility Functions (`src/utils.ts`)

**Role**: Pure functions for piece manipulation and game logic

```typescript
// Piece manipulation
export function flattenPiece(piece: Piece): Piece[]
export function createCombinedPiece(piece1: Piece, piece2: Piece): Piece | null
export function clonePiece(piece: Piece): Piece

// Board utilities
export function printBoard(board: (Piece | undefined)[]): void
export function getDisambiguator(
  move: InternalMove,
  moves: InternalMove[],
): string

// Move utilities
export function addMove(
  moves: InternalMove[],
  color: Color,
  from: number,
  to: number,
  piece: Piece,
  captured?: Piece,
  flags?: number,
): void

// Validation
export function validateFen(fen: string): boolean
export function haveCommander(piece: Piece): boolean
```

**Key Functions**:

- Piece manipulation and validation
- Board display and debugging
- Move construction utilities
- FEN validation and parsing
- Stack combination logic

---

## 0x88 Board Representation

### Board Structure

The game uses a 0x88 board representation within a 256-element array (16×16
grid) to efficiently store the 11×12 board.

```typescript
// 256-element array representing 16x16 grid
private _board = new Array<Piece | undefined>(256)

// Square mapping: algebraic → internal index
const SQUARE_MAP = {
  a12: 0x00, b12: 0x01, ..., k12: 0x0A,  // Rank 12 (top)
  a11: 0x10, b11: 0x11, ..., k11: 0x1A,  // Rank 11
  ...
  a1: 0xB0,  b1: 0xB1,  ..., k1: 0xBA   // Rank 1 (bottom)
}
```

### Coordinate System

```typescript
// Square indexing: rank * 16 + file
// Example: a12 = 0 * 16 + 0 = 0x00
//          k1 = 11 * 16 + 10 = 0xBA

// Coordinate extraction
export function rank(square: number): number {
  return square >> 4 // Upper 4 bits
}

export function file(square: number): number {
  return square & 0xf // Lower 4 bits
}

// Algebraic conversion
export function algebraic(square: number): Square {
  const f = file(square)
  const r = rank(square)
  return `${String.fromCharCode(97 + f)}${12 - r}` as Square
}
```

### Boundary Checking

```typescript
// Efficient boundary validation
export function isSquareOnBoard(square: number): boolean {
  const r = rank(square)
  const f = file(square)
  return r >= 0 && r < 12 && f >= 0 && f < 11
}

// 0x88 property: invalid squares have bits set in 0x88 positions
// This enables fast boundary checking with bitwise operations
```

### Direction Offsets

```typescript
// Movement direction vectors
export const ORTHOGONAL_OFFSETS = [-16, 1, 16, -1] // N, E, S, W
export const DIAGONAL_OFFSETS = [-17, -15, 17, 15] // NE, NW, SE, SW
export const ALL_OFFSETS = [...ORTHOGONAL_OFFSETS, ...DIAGONAL_OFFSETS]

// Usage in move generation
for (const offset of ORTHOGONAL_OFFSETS) {
  let targetSquare = fromSquare + offset
  while (isSquareOnBoard(targetSquare)) {
    // Generate moves in this direction
    targetSquare += offset
  }
}
```

### Advantages of 0x88 System

1. **Fast Boundary Checking**: Single bitwise operation
2. **Efficient Direction Vectors**: Simple arithmetic for piece movement
3. **Memory Alignment**: Good cache performance for move generation
4. **Algebraic Conversion**: Direct mathematical relationship
5. **Compact Representation**: 256 elements for 132 valid squares

---

## Singleton Pattern Usage

### Centralized State Management

The `CoTuLenh` class acts as a singleton-like entity managing all game state:

```typescript
class CoTuLenh {
  // All game state centralized here
  private _board: (Piece | undefined)[]
  private _turn: Color
  private _commanders: Record<Color, number>
  private _history: History[]
  private _deploySession: DeploySession | null
  private _airDefense: AirDefense
  private _movesCache: QuickLRU<string, InternalMove[]>
}
```

### Circular Dependencies

The singleton pattern creates circular dependencies where:

```typescript
// CoTuLenh imports and uses other modules
import { generateNormalMoves } from './move-generation.js'
import { createMoveCommand } from './move-apply.js'

// Other modules require CoTuLenh instance to function
function generateNormalMoves(gameInstance: CoTuLenh, ...): InternalMove[] {
  // Needs access to board state, turn, etc.
}

function createMoveCommand(game: CoTuLenh, move: InternalMove): CTLMoveCommand {
  // Needs access to game state for command execution
}
```

### State Synchronization

The singleton ensures state consistency through centralized updates:

```typescript
// Move execution triggers cascade of state updates
private _makeMove(move: InternalMove) {
  // 1. Execute atomic board changes
  moveCommand.execute()

  // 2. Update game state
  this._history.push(historyEntry)
  this._halfMoves++
  this._turn = swapColor(this._turn)

  // 3. Update derived state
  this._updatePositionCounts()
  this._airDefense = updateAirDefensePiecesPosition(this)

  // 4. Invalidate caches
  this._movesCache.clear()
}
```

### Benefits and Drawbacks

**Benefits**:

- Single source of truth for game state
- Consistent state across all components
- Centralized control and validation
- Performance optimization through caching

**Drawbacks**:

- Tight coupling between components
- Difficult to test components in isolation
- Complex circular dependencies
- Large central class with many responsibilities

---

## Command Pattern Implementation

### Command Interface

```typescript
interface CTLMoveCommandInteface {
  move: InternalMove | InternalDeployMove
  execute(): void
  undo(): void
}
```

### Atomic Actions

All move operations are built from atomic actions:

```typescript
interface CTLAtomicMoveAction {
  execute(): void
  undo(): void
}

// Example atomic actions
class RemovePieceAction implements CTLAtomicMoveAction {
  private removedPiece?: Piece

  execute(): void {
    const piece = this.game.get(this.square)
    if (piece) {
      this.removedPiece = { ...piece }
      this.game.remove(algebraic(this.square))
    }
  }

  undo(): void {
    if (this.removedPiece) {
      this.game.put(this.removedPiece, algebraic(this.square))
    }
  }
}

class PlacePieceAction implements CTLAtomicMoveAction {
  private existingPiece?: Piece

  execute(): void {
    const piece = this.game.get(this.square)
    if (piece) {
      this.existingPiece = { ...piece }
    }
    this.game.put(this.piece, algebraic(this.square))
  }

  undo(): void {
    if (this.existingPiece) {
      this.game.put(this.existingPiece, algebraic(this.square))
    } else {
      this.game.remove(algebraic(this.square))
    }
  }
}
```

### Command Types

```typescript
// Base command class
abstract class CTLMoveCommand implements CTLMoveCommandInteface {
  protected actions: CTLAtomicMoveAction[] = []

  execute(): void {
    this.buildActions()
    for (const action of this.actions) {
      action.execute()
    }
  }

  undo(): void {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      this.actions[i].undo()
    }
  }

  protected abstract buildActions(): void
}

// Concrete command implementations
class NormalMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    this.actions.push(new RemovePieceAction(this.game, this.move.from))
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, this.move.piece),
    )
  }
}

class CaptureMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    this.actions.push(new RemovePieceAction(this.game, this.move.from))
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, this.move.piece),
    )
    // Capture is handled automatically by PlacePieceAction
  }
}

class DeployMoveCommand extends CTLMoveCommand {
  protected buildActions(): void {
    this.actions.push(
      new RemoveFromStackAction(this.game, this.move.from, this.move.piece),
    )
    this.actions.push(
      new PlacePieceAction(this.game, this.move.to, this.move.piece),
    )
    this.actions.push(new SetDeployStateAction(this.game, newDeployState))
  }
}
```

### Command Factory

```typescript
export function createMoveCommand(
  game: CoTuLenh,
  move: InternalMove,
): CTLMoveCommand {
  if (move.flags & BITS.DEPLOY) {
    return new SingleDeployMoveCommand(game, move)
  } else if (move.flags & BITS.SUICIDE_CAPTURE) {
    return new SuicideCaptureMoveCommand(game, move)
  } else if (move.flags & BITS.STAY_CAPTURE) {
    return new StayCaptureMoveCommand(game, move)
  } else if (move.flags & BITS.COMBINATION) {
    return new CombinationMoveCommand(game, move)
  } else if (move.flags & BITS.CAPTURE) {
    return new CaptureMoveCommand(game, move)
  } else {
    return new NormalMoveCommand(game, move)
  }
}
```

### History Management

```typescript
interface History {
  move: CTLMoveCommandInteface  // Command object for undo
  commanders: Record<Color, number>  // Commander positions before move
  turn: Color  // Turn before move
  halfMoves: number  // Half-move clock before move
  moveNumber: number  // Move number before move
  deployState: DeployState | null  // Deploy state before move
}

// Undo operation
undo(): void {
  const old = this._history.pop()
  if (!old) return

  // Restore pre-move state
  this._commanders = old.commanders
  this._turn = old.turn
  this._halfMoves = old.halfMoves
  this._moveNumber = old.moveNumber
  this._deployState = old.deployState

  // Undo board changes
  old.move.undo()
}
```

---

## Move Generation System

### Configuration-Driven Approach

Move generation uses a configuration system for each piece type:

```typescript
interface PieceMovementConfig {
  moveRange: number
  captureRange: number
  canMoveDiagonal: boolean
  captureIgnoresPieceBlocking?: boolean
  tankShootOverBlocking?: boolean
  specialRules?: {
    navyAttackMechanisms?: boolean
    airForceIgnoreBlocking?: boolean
    // ... other special rules
  }
}

const BASE_MOVEMENT_CONFIG: Record<PieceSymbol, PieceMovementConfig> = {
  [COMMANDER]: {
    moveRange: Infinity,
    captureRange: 1,
    canMoveDiagonal: false,
  },
  [INFANTRY]: {
    moveRange: 1,
    captureRange: 1,
    canMoveDiagonal: false,
  },
  [TANK]: {
    moveRange: 2,
    captureRange: 2,
    canMoveDiagonal: false,
    tankShootOverBlocking: true,
  },
  // ... other pieces
}
```

### Move Generation Algorithm

```typescript
function generateMovesForPiece(
  gameInstance: CoTuLenh,
  from: number,
  us: Color,
  piece: Piece,
  config: PieceMovementConfig,
): InternalMove[] {
  const moves: InternalMove[] = []
  const offsets = config.canMoveDiagonal ? ALL_OFFSETS : ORTHOGONAL_OFFSETS

  for (const offset of offsets) {
    let to = from + offset
    let distance = 1
    let pieceBlocking = false

    while (distance <= config.moveRange && isSquareOnBoard(to)) {
      const targetPiece = gameInstance.get(to)

      // Handle movement
      if (!targetPiece) {
        if (!pieceBlocking || config.specialRules?.airForceIgnoreBlocking) {
          addMove(moves, us, from, to, piece, undefined, BITS.NORMAL)
        }
      }

      // Handle captures
      if (targetPiece && targetPiece.color !== us) {
        if (distance <= config.captureRange) {
          const canCapture =
            !pieceBlocking ||
            config.captureIgnoresPieceBlocking ||
            config.tankShootOverBlocking

          if (canCapture) {
            addMove(moves, us, from, to, piece, targetPiece, BITS.CAPTURE)
          }
        }
        break // Cannot move past enemy piece
      }

      // Handle friendly pieces
      if (targetPiece && targetPiece.color === us) {
        // Check for combination moves
        const combinedPiece = createCombinedPiece(piece, targetPiece)
        if (combinedPiece) {
          addMove(moves, us, from, to, piece, targetPiece, BITS.COMBINATION)
        }
        break // Cannot move past friendly piece
      }

      pieceBlocking = true
      to += offset
      distance++
    }
  }

  return moves
}
```

### Legal Move Filtering

```typescript
private _filterLegalMoves(
  moves: InternalMove[],
  us: Color,
): InternalMove[] {
  const legalMoves: InternalMove[] = []

  for (const move of moves) {
    // Test move by making and unmaking it
    this._makeMove(move)

    // Check if move leaves commander attacked or exposed
    if (!this._isCommanderAttacked(us) && !this._isCommanderExposed(us)) {
      legalMoves.push(move)
    }

    this._undoMove()
  }

  return legalMoves
}
```

### Caching System

```typescript
private _movesCache = new QuickLRU<string, InternalMove[]>({ maxSize: 1000 })

private _getMovesCacheKey(args: {
  legal?: boolean
  pieceType?: PieceSymbol
  square?: Square
  deploy?: boolean
}): string {
  const fen = this.fen()
  const deployState = this._deployState ?
    `${this._deployState.stackSquare}:${this._deployState.turn}` : 'none'

  const { legal = true, pieceType, square } = args
  return `${fen}|deploy:${deployState}|legal:${legal}|pieceType:${pieceType ?? ''}|square:${square ?? ''}`
}

private _moves(options = {}): InternalMove[] {
  const cacheKey = this._getMovesCacheKey(options)

  if (this._movesCache.has(cacheKey)) {
    return this._movesCache.get(cacheKey)!
  }

  // Generate moves
  let allMoves: InternalMove[]
  if (this._deployState && this._deployState.turn === us) {
    allMoves = generateDeployMoves(this, this._deployState.stackSquare, filterPiece)
  } else {
    allMoves = generateNormalMoves(this, us, filterPiece, filterSquare)
  }

  // Filter illegal moves if requested
  const result = options.legal ? this._filterLegalMoves(allMoves, us) : allMoves

  // Cache and return
  this._movesCache.set(cacheKey, result)
  return result
}
```

---

## Deploy Architecture

### Current Architecture: Action-Based System

CoTuLenh uses an **action-based deploy architecture** that replaced the previous
virtual state overlay approach. This system stores actions taken during
deployment rather than maintaining dual state.

```typescript
interface DeploySession {
  stackSquare: Square     // Where deployment started
  turn: Color            // Who is deploying
  originalPiece: Piece   // Original stack (for reference)
  actions: InternalMove[] // Actions taken during deployment
  startFEN: string       // FEN before deploy started

  // Calculate remaining pieces on-demand
  getRemainingPieces(): Piece | null {
    let remaining = this.originalPiece
    for (const move of this.actions) {
      if (move.from === this.stackSquare && move.flags & BITS.DEPLOY) {
        remaining = removePieceFromStack(remaining, move.piece) || null
      }
    }
    return remaining
  }
}
```

### Key Principles

1. **Single Source of Truth**: Board IS the state, no virtual overlay
2. **Action Tracking**: Record what happened, not state changes
3. **Command Pattern Integration**: Leverage existing undo/redo system
4. **Real-time Validation**: Use existing `_filterLegalMoves` for validation

### Deploy Move Execution

```typescript
// Deploy moves modify the real board directly
game.move({ from: 'c3', to: 'c5', piece: 'n', deploy: true })

// Results in:
// 1. Board at c3 updated (Navy removed from stack)
// 2. Board at c5 updated (Navy placed)
// 3. Action recorded in deploy session
// 4. Deploy session continues until all pieces deployed
```

### Extended FEN Format

During active deployment, FEN includes deploy session information:

```typescript
// Normal FEN
'base-fen r - - 0 1'

// During deploy session
'base-fen r - - 0 1 DEPLOY c3:(FT)<Nc5...'
//                    ^^^^^^^^^^^^^^^^^^^^^^^
//                    Deploy session marker

// Format: DEPLOY <square>:<stay-pieces><moves>...
```

### Benefits Over Virtual State

- ✅ No ghost pieces - board state always correct
- ✅ No stale references - always query current state
- ✅ Undo works - command pattern handles reversal
- ✅ No testing flags - same validation path
- ✅ Simple reasoning - one board, one truth

---

## Performance Characteristics

### Move Generation Performance

```typescript
// Typical performance metrics (1M operations)
generateNormalMoves():     ~2-5ms per 1000 calls
_filterLegalMoves():       ~10-20ms per 1000 calls (includes validation)
_moveToSanLan():          ~1-3ms per 1000 calls
```

### Caching Strategy

```typescript
// LRU cache with 1000 entry limit
private _movesCache = new QuickLRU<string, InternalMove[]>({ maxSize: 1000 })

// Cache keys include:
// - Complete FEN string
// - Deploy state information
// - Move generation filters
// - Legal vs pseudo-legal flag

// Cache invalidation on:
// - Any board state change
// - Move execution
// - Piece placement/removal
// - Deploy state changes
```

### Memory Usage Patterns

```typescript
// Core memory usage:
// - Board array: 256 elements (fixed size)
// - Move cache: ~3KB for 1000 entries
// - History: grows with game length
// - Position counts: grows with unique positions

// Optimization strategies:
// - Sparse board representation (only occupied squares store objects)
// - Command pattern minimizes history storage
// - LRU cache prevents memory leaks
// - Object reuse where possible
```

### Performance Bottlenecks

**Verbose Mode Performance Issue**:

```typescript
// Non-verbose mode (fast): 4.66ms for 116 moves
const moves = game.moves() // Returns SAN strings

// Verbose mode (slow): 222ms for 116 moves (48x slower!)
const moves = game.moves({ verbose: true }) // Returns Move objects

// Bottleneck: Move constructor calls game.fen() twice per move
// Plus regenerates all legal moves for SAN notation
```

**Root Cause**: Each Move object construction:

1. Generates "before" FEN (~0.5-1ms)
2. Executes move temporarily and generates "after" FEN (~1-2ms)
3. Regenerates ALL legal moves for SAN notation (~1-5ms)

**Optimization Opportunities**:

- Cache FEN generation results
- Batch SAN notation generation
- Lazy evaluation of Move object properties
- Separate lightweight move representation

---

## Memory Management

### Object Lifecycle

```typescript
// Piece objects
interface Piece {
  type: PieceSymbol
  color: Color
  heroic?: boolean
  carrying?: Piece[] // Nested structure for stacks
}

// Lifecycle management:
// 1. Created during FEN parsing or piece placement
// 2. Cloned during move execution for undo
// 3. Modified during heroic promotion
// 4. Garbage collected when removed from board
```

### History Management

```typescript
// History grows with game length
private _history: History[] = []

// Each entry contains:
interface History {
  move: CTLMoveCommandInteface  // Command with undo capability
  commanders: Record<Color, number>  // Pre-move commander positions
  turn: Color  // Pre-move turn
  halfMoves: number  // Pre-move half-move clock
  moveNumber: number  // Pre-move move number
  deployState: DeployState | null  // Pre-move deploy state
}

// Memory considerations:
// - Commands store minimal undo information
// - State snapshots are lightweight
// - No deep cloning of board state
// - History can be truncated for long games
```

### Cache Management

```typescript
// Move cache with LRU eviction
private _movesCache = new QuickLRU<string, InternalMove[]>({ maxSize: 1000 })

// Cache characteristics:
// - Automatic eviction of least recently used entries
// - Maximum 1000 entries to prevent memory leaks
// - Keys are FEN-based strings (~100-200 bytes each)
// - Values are move arrays (~1-5KB each)
// - Total cache size: ~1-5MB maximum
```

### Memory Optimization Strategies

1. **Sparse Representation**: Only occupied squares store piece objects
2. **Object Reuse**: Reuse piece objects where possible
3. **Lazy Evaluation**: Calculate derived state on demand
4. **Bounded Caches**: Prevent unbounded memory growth
5. **Command Pattern**: Minimal history storage with precise undo

---

## Testing and Debugging

### Unit Testing Strategy

```typescript
// Component isolation challenges due to singleton pattern
describe('Move Generation', () => {
  let game: CoTuLenh

  beforeEach(() => {
    game = new CoTuLenh() // Fresh instance for each test
  })

  it('should generate correct moves for tank', () => {
    game.put({ type: 't', color: 'r' }, 'e4')
    const moves = game.moves({ square: 'e4' })
    expect(moves).toContain('Te5')
    expect(moves).toContain('Txd5') // If enemy piece present
  })
})
```

### Integration Testing

```typescript
// Full game scenario testing
describe('Complete Game Flow', () => {
  it('should handle complete deploy sequence', () => {
    const game = new CoTuLenh()

    // Set up stack
    game.put(
      {
        type: 'n',
        color: 'r',
        carrying: [
          { type: 'f', color: 'r' },
          { type: 't', color: 'r' },
        ],
      },
      'c3',
    )

    // Execute deploy sequence
    const deploy1 = game.move({
      from: 'c3',
      to: 'a3',
      piece: 'n',
      deploy: true,
    })
    expect(deploy1.flags).toContain('d')

    const deploy2 = game.move({
      from: 'c3',
      to: 'c5',
      piece: 'f',
      deploy: true,
    })
    expect(game.get('c5')?.type).toBe('f')

    const deploy3 = game.move({
      from: 'c3',
      to: 'd3',
      piece: 't',
      deploy: true,
    })
    expect(game.get('c3')).toBeUndefined() // Stack fully deployed
  })
})
```

### Debugging Utilities

```typescript
// Board visualization
game.printBoard() // ASCII representation of current position

// State inspection
console.log('Turn:', game.turn())
console.log('FEN:', game.fen())
console.log('Legal moves:', game.moves().length)
console.log('Deploy state:', game.getDeployState())

// Move analysis
const moves = game.moves({ verbose: true })
moves.forEach((move) => {
  console.log(`${move.san}: ${move.piece.type} ${move.from} → ${move.to}`)
})

// History inspection
const history = game.history({ verbose: true })
console.log('Game history:', history.map((m) => m.san).join(' '))
```

### Performance Profiling

```typescript
// Move generation benchmarking
function benchmarkMoveGeneration(game: CoTuLenh, iterations: number) {
  const start = performance.now()

  for (let i = 0; i < iterations; i++) {
    game.moves() // Cached after first call
  }

  const end = performance.now()
  console.log(`${iterations} move generations: ${end - start}ms`)
}

// Memory usage monitoring
function checkMemoryUsage(game: CoTuLenh) {
  console.log('History entries:', game.history().length)
  console.log('Cache size:', game._movesCache.size)
  console.log('Position counts:', Object.keys(game._positionCount).length)
}
```

### Common Debugging Scenarios

1. **Invalid Move Errors**: Check move format and legal move generation
2. **State Corruption**: Verify command pattern undo operations
3. **Performance Issues**: Profile move generation and caching
4. **Deploy Bugs**: Inspect deploy session state and action tracking
5. **Memory Leaks**: Monitor cache sizes and history growth

---

## Best Practices and Recommendations

### Code Organization

1. **Separation of Concerns**: Keep pure functions in utils, stateful logic in
   CoTuLenh
2. **Type Safety**: Use TypeScript strictly, avoid `any` types
3. **Error Handling**: Validate inputs and provide clear error messages
4. **Documentation**: Document complex algorithms and state transitions

### Performance Optimization

1. **Cache Strategically**: Cache expensive operations like move generation
2. **Lazy Evaluation**: Calculate derived state only when needed
3. **Batch Operations**: Group related state changes together
4. **Profile Regularly**: Monitor performance bottlenecks

### Testing Strategy

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test complete game scenarios
3. **Performance Tests**: Benchmark critical operations
4. **Regression Tests**: Prevent reintroduction of bugs

### Maintenance Considerations

1. **Refactoring**: Gradually reduce circular dependencies
2. **Modularity**: Extract reusable components
3. **Documentation**: Keep implementation docs up to date
4. **Monitoring**: Track performance and memory usage in production

This implementation guide provides a comprehensive understanding of CoTuLenh's
current 0x88 architecture, enabling developers to work effectively with the
existing codebase while planning future improvements.
