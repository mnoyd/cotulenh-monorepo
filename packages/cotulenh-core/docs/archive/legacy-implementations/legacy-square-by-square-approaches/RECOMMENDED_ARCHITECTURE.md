# Recommended Architecture for cotulenh-core NPM Package

## What This Package Is

**cotulenh-core** is a **pure game engine library** that can be imported into
any JavaScript/TypeScript project:

```typescript
import { CoTuLenh } from 'cotulenh-core'

const game = new CoTuLenh()
game.move('Tc3')
console.log(game.fen())
```

**Package Purpose:**

- ✅ Game state management
- ✅ Move generation and validation
- ✅ FEN/SAN serialization
- ✅ History/undo management
- ✅ Can run in browser OR Node.js
- ✅ Works with ANY UI library (React, Vue, vanilla JS)
- ✅ Works with ANY backend framework

**NOT included:**

- ❌ NO UI components
- ❌ NO REST API layer
- ❌ NO database integration
- ❌ NO presentation logic

---

## Simple Public API

```typescript
// Create & initialize
const game = new CoTuLenh()
const game2 = new CoTuLenh('custom_fen_string')

// Make moves
game.move('Tc3') // SAN notation
game.move({ from: 'c3', to: 'c4' }) // Object notation

// Deploy moves
game.startDeploy('e5')
game.deployStep('Navy', 'e7')
game.deployStep('Tank', 'd5')

// Query state
game.fen() // Current FEN
game.moves() // Legal moves array
game.turn() // 'r' or 'b'
game.board() // Board representation
game.get('e5') // Piece at square

// Check game status
game.isCheck()
game.isCheckmate()
game.isGameOver()
game.isDraw()

// History
game.undo()
game.history() // Move history

// Load position
game.load('fen_string')
game.reset() // Back to start
```

---

## Recommended Module Structure (Internal)

### Option 1: Modular (Current/Recommended)

```
src/
├── index.ts                    # Exports CoTuLenh class
├── CoTuLenh.ts                 # Main facade class
│
├── core/                       # Core game logic
│   ├── GameState.ts            # Game state management
│   ├── Board.ts                # 16x16 mailbox board (11x12 valid)
│   ├── Piece.ts                # Piece type definition
│   ├── Move.ts                 # Move entity
│   └── DeploySession.ts        # Virtual deploy state
│
├── move-generation/            # Move generation
│   ├── MoveGenerator.ts        # Main generator
│   ├── PieceGenerators.ts      # Per-piece logic
│   └── DeployMoveGenerator.ts  # Deploy moves
│
├── move-validation/            # Move validation
│   ├── MoveValidator.ts        # Legal move filtering
│   ├── CommanderChecker.ts     # Exposure/attack checks
│   └── LegalityChecker.ts      # Make/unmake validation
│
├── air-defense/                # Air defense zones
│   └── AirDefenseZones.ts      # Cached zone calculation
│
├── move-application/           # Move execution
│   ├── MoveApplicator.ts       # Make/unmake moves
│   └── UndoInfo.ts             # Undo data structure
│
├── serialization/              # FEN/SAN
│   ├── FENSerializer.ts        # FEN generation/parsing
│   └── SANParser.ts            # SAN notation
│
├── history/                    # History management
│   └── HistoryManager.ts       # Undo/redo
│
├── types/                      # TypeScript types
│   ├── index.ts
│   ├── Board.ts
│   ├── Move.ts
│   └── GameState.ts
│
└── utils/                      # Utilities
    ├── constants.ts
    ├── square.ts
    └── validation.ts
```

**Benefits:**

- Clean separation of concerns
- Easy to test each module
- Easy to navigate codebase
- Clear dependencies

### Option 2: Flat (Alternative for smaller packages)

```
src/
├── index.ts
├── CoTuLenh.ts
├── GameState.ts
├── Board.ts
├── MoveGenerator.ts
├── MoveValidator.ts
├── MoveApplicator.ts
├── FENSerializer.ts
├── HistoryManager.ts
├── types.ts
└── utils.ts
```

---

## Key Architecture Decisions

| Aspect               | Recommendation        | Why                          |
| -------------------- | --------------------- | ---------------------------- |
| **Board**            | 16x16 mailbox array   | Fast for 11x12 + piece lists |
| **Move Generation**  | Pseudo-legal → filter | Standard approach            |
| **Move Application** | Mutable make/unmake   | Performance (10-15ms)        |
| **Deploy**           | Virtual state overlay | Clean, no if/else branches   |
| **Validation**       | Make/unmake + check   | Accurate                     |
| **History**          | Array of snapshots    | Simple undo                  |
| **Exports**          | Single CoTuLenh class | Simple API                   |
| **Build**            | ESM + CJS             | Works everywhere             |

---

## CoTuLenh Class (Main Interface)

```typescript
// src/CoTuLenh.ts
export class CoTuLenh {
  private gameState: GameState
  private moveGenerator: MoveGenerator
  private moveValidator: MoveValidator
  private moveApplicator: MoveApplicator
  private history: HistoryManager
  private fenSerializer: FENSerializer

  constructor(fen?: string) {
    this.gameState = fen ? GameState.fromFEN(fen) : GameState.initial()

    this.moveGenerator = new MoveGenerator()
    this.moveValidator = new MoveValidator()
    this.moveApplicator = new MoveApplicator()
    this.history = new HistoryManager()
    this.fenSerializer = new FENSerializer()
  }

  // Public API
  move(move: string | MoveInput): MoveResult {
    // Parse move
    const parsedMove = this.parseMove(move)

    // Validate
    const legalMoves = this.moves()
    if (!legalMoves.some((m) => m.equals(parsedMove))) {
      throw new Error('Illegal move')
    }

    // Apply
    const undo = this.moveApplicator.apply(this.gameState, parsedMove)
    this.history.push(undo)

    return {
      san: parsedMove.toSAN(),
      fen: this.fen(),
    }
  }

  moves(): Move[] {
    const pseudo = this.moveGenerator.generate(this.gameState)
    return this.moveValidator.filterLegal(this.gameState, pseudo)
  }

  fen(): string {
    return this.fenSerializer.toFEN(this.gameState)
  }

  undo(): void {
    const undo = this.history.pop()
    this.moveApplicator.unmake(this.gameState, undo)
  }

  // ... other methods
}
```

---

## Core Implementation Details

### GameState (Mutable)

```typescript
// src/core/GameState.ts
export class GameState {
  board: Board // 0x88 board
  turn: Color // 'r' or 'b'
  commanders: [Square, Square] // Commander positions
  moveNumber: number
  halfMoves: number
  deploySession: DeploySession | null

  static initial(): GameState {
    const state = new GameState()
    state.board = Board.initial()
    state.turn = 'r'
    // ... initialize
    return state
  }

  static fromFEN(fen: string): GameState {
    // Parse FEN and create state
  }
}
```

### Piece Structure

```typescript
// src/core/Piece.ts (or type definition)
export type Piece = {
  color: 'r' | 'b' // Red or Blue
  type: PieceSymbol // Piece type symbol
  carrying?: Piece[] // For stacks (nested pieces)
  heroic?: boolean // For promoted pieces
}

export type PieceSymbol =
  | 'c' // Commander
  | 'i' // Infantry
  | 't' // Tank
  | 'm' // Militia
  | 'e' // Engineer
  | 'a' // Artillery
  | 'g' // Anti-Air
  | 's' // Missile
  | 'f' // Air Force
  | 'n' // Navy
  | 'h' // Headquarter

// Examples
const simple: Piece = { color: 'r', type: 'i' }
const heroic: Piece = { color: 'b', type: 't', heroic: true }
const stack: Piece = {
  color: 'r',
  type: 'n',
  carrying: [
    { color: 'r', type: 'i' },
    { color: 'r', type: 't' },
  ],
}
```

### Board (16x16 Mailbox with Piece Lists)

```typescript
// src/core/Board.ts
export class Board {
  // 16x16 array (256 squares) to fit 11x12 board (132 valid)
  private squares: (Piece | null)[] = new Array(256).fill(null)

  // Piece lists for fast iteration (only occupied squares)
  private redPieces: Set<number> = new Set()
  private bluePieces: Set<number> = new Set()

  get(square: number): Piece | null {
    return this.squares[square]
  }

  set(square: number, piece: Piece | null): void {
    // Update piece lists
    this.redPieces.delete(square)
    this.bluePieces.delete(square)

    this.squares[square] = piece

    if (piece) {
      if (piece.color === 'r') {
        this.redPieces.add(square)
      } else {
        this.bluePieces.add(square)
      }
    }
  }

  // Fast iteration (O(pieces) not O(squares))
  *pieces(color?: 'r' | 'b'): Generator<[number, Piece]> {
    const set =
      color === 'r'
        ? this.redPieces
        : color === 'b'
          ? this.bluePieces
          : new Set([...this.redPieces, ...this.bluePieces])

    for (const square of set) {
      const piece = this.squares[square]
      if (piece) yield [square, piece]
    }
  }

  // Square encoding: rank * 16 + file
  // e5 → 7*16 + 4 = 0x74
  // Validation: file < 11 && rank < 12
  isValid(square: number): boolean {
    const file = square & 0x0f
    const rank = square >> 4
    return file < 11 && rank < 12
  }
}
```

### Deploy Session (Virtual State)

```typescript
// src/core/DeploySession.ts
export class DeploySession {
  originalSquare: Square
  virtualChanges: Map<Square, Piece | null>
  movedPieces: Piece[]

  // Get effective piece (virtual overlay)
  getEffectivePiece(board: Board, square: Square): Piece | null {
    if (this.virtualChanges.has(square)) {
      return this.virtualChanges.get(square)
    }
    return board.get(square)
  }

  isComplete(): boolean {
    return this.getRemainingPieces().length === 0
  }
}
```

### Move Validation (Make/Unmake)

```typescript
// src/move-validation/MoveValidator.ts
export class MoveValidator {
  filterLegal(state: GameState, moves: Move[]): Move[] {
    return moves.filter((move) => {
      // Try move
      const undo = this.makeMove(state, move)

      // Check legality
      const legal =
        !this.isCommanderExposed(state) && !this.isCommanderAttacked(state)

      // Undo
      this.unmakeMove(state, undo)

      return legal
    })
  }
}
```

---

## Package Configuration

### package.json

```json
{
  "name": "cotulenh-core",
  "version": "1.0.0",
  "description": "CoTuLenh chess variant game engine",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest",
    "lint": "eslint src"
  },
  "keywords": ["chess", "cotulenh", "game-engine", "board-game"],
  "peerDependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsup": "^7.0.0",
    "vitest": "^0.34.0"
  }
}
```

### tsup.config.ts (Build)

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
})
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/core/__tests__/GameState.test.ts
import { describe, it, expect } from 'vitest'
import { GameState } from '../GameState'

describe('GameState', () => {
  it('should initialize with correct starting position', () => {
    const state = GameState.initial()
    expect(state.turn).toBe('r')
    expect(state.moveNumber).toBe(1)
  })

  it('should reject moves during opponent turn', () => {
    const state = GameState.initial()
    expect(state.canMove(bluePiece)).toBe(false)
  })
})
```

### Integration Tests

```typescript
// src/__tests__/CoTuLenh.integration.test.ts
describe('CoTuLenh Integration', () => {
  it('should play complete game', () => {
    const game = new CoTuLenh()

    game.move('Tc3')
    expect(game.turn()).toBe('b')

    game.move('tc8')
    expect(game.turn()).toBe('r')

    expect(game.history()).toHaveLength(2)
  })

  it('should handle deploy session', () => {
    const game = new CoTuLenh()

    // Setup stack...
    game.startDeploy('e5')
    game.deployStep('Navy', 'e7')
    game.deployStep('Tank', 'd5')

    expect(game.turn()).toBe('b') // Turn switched after complete
  })
})
```

---

## Usage Examples

### Browser (React)

```typescript
import { CoTuLenh } from 'cotulenh-core'
import { useState } from 'react'

function ChessGame() {
  const [game] = useState(() => new CoTuLenh())
  const [fen, setFen] = useState(game.fen())

  const handleMove = (from: string, to: string) => {
    try {
      game.move({ from, to })
      setFen(game.fen())
    } catch (error) {
      console.error('Illegal move')
    }
  }

  return <Board fen={fen} onMove={handleMove} />
}
```

### Node.js (Server)

```typescript
import { CoTuLenh } from 'cotulenh-core'

const games = new Map<string, CoTuLenh>()

app.post('/api/move', (req, res) => {
  const { gameId, move } = req.body
  const game = games.get(gameId)

  try {
    const result = game.move(move)
    res.json({
      success: true,
      fen: game.fen(),
      legalMoves: game.moves(),
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    })
  }
})
```

---

## Performance Targets

- **Move generation:** < 15ms
- **Move validation:** < 5ms per move
- **FEN serialization:** < 1ms
- **Bundle size:** < 50KB (minified + gzipped)
- **Memory:** < 1MB per game instance

---

## Implementation Checklist

### Phase 1: Core (2 weeks)

- [ ] GameState class
- [ ] Board (0x88 implementation)
- [ ] Piece entity
- [ ] Move entity
- [ ] 50+ unit tests

### Phase 2: Moves (3 weeks)

- [ ] Move generation (pseudo-legal)
- [ ] Move validation (make/unmake)
- [ ] Deploy session (virtual state)
- [ ] 100+ move tests

### Phase 3: CoTuLenh Class (1 week)

- [ ] Public API implementation
- [ ] FEN serialization
- [ ] History management
- [ ] Integration tests

### Phase 4: Polish (1 week)

- [ ] TypeScript types export
- [ ] Bundle optimization
- [ ] Documentation
- [ ] Publish to npm

---

## Summary

**This is a simple npm package with:**

- ✅ One main class: `CoTuLenh`
- ✅ Clean internal modules
- ✅ Works in browser AND Node.js
- ✅ No UI, no API layer, just core logic
- ✅ Easy to integrate with ANY framework

**NOT an application, just a reusable library!** 🎯
