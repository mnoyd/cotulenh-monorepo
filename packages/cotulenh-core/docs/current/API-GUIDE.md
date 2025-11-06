# CoTuLenh API Guide - Complete TypeScript Reference

## Table of Contents

1. [Quick Start](#quick-start)
2. [Game Initialization](#game-initialization)
3. [Move Processing](#move-processing)
4. [Game State Queries](#game-state-queries)
5. [Deploy Moves](#deploy-moves)
6. [Move Generation](#move-generation)
7. [History and Undo](#history-and-undo)
8. [Error Handling](#error-handling)
9. [Integration Patterns](#integration-patterns)
10. [Performance Considerations](#performance-considerations)

---

## Quick Start

### Installation and Import

```typescript
import { CoTuLenh, validateFenString, DEFAULT_POSITION } from 'cotulenh'
```

### Basic Game Session

```typescript
// Create a new game
const game = new CoTuLenh()

// Check initial state
console.log(`Turn: ${game.turn()}`) // "r" (Red)
console.log(`FEN: ${game.fen()}`) // Starting position
console.log(`Legal moves: ${game.moves().length}`) // Available moves

// Make a move
const move = game.move('Tc3')
console.log(`Move: ${move.san}`) // "Tc3"
console.log(`New FEN: ${game.fen()}`) // Updated position

// Check game status
console.log(`In check: ${game.isCheck()}`) // false
console.log(`Game over: ${game.isGameOver()}`) // false
```

---

## Game Initialization

### Constructor Options

```typescript
// Default starting position
const game = new CoTuLenh()

// Custom position from FEN
const customFen =
  '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1'
const game = new CoTuLenh(customFen)

// Error handling
try {
  const game = new CoTuLenh(invalidFen)
} catch (error) {
  console.error('Initialization failed:', error.message)
}
```

### Load Method

```typescript
// Load new position
game.load(fenString)

// Load with options
game.load(fenString, {
  skipValidation: false, // Skip FEN validation
  preserveHeaders: false, // Keep existing headers
})

// Example with error handling
try {
  game.load('custom/position/here r - - 0 1')
  console.log('Position loaded successfully')
} catch (error) {
  console.error('Load failed:', error.message)
}
```

### Clear and Reset

```typescript
// Clear board completely
game.clear()

// Clear but preserve headers
game.clear({ preserveHeaders: true })

// Reset to starting position
game.load() // Uses DEFAULT_POSITION
```

### FEN Validation

```typescript
import { validateFenString } from 'cotulenh'

const fen = 'some/fen/string r - - 0 1'
if (validateFenString(fen)) {
  const game = new CoTuLenh(fen)
  // Safe to use
} else {
  console.error('Invalid FEN string')
}
```

---

## Move Processing

### Move Input Formats

The engine accepts multiple move formats:

#### 1. Standard Algebraic Notation (SAN)

```typescript
// Basic moves
game.move('Tc3') // Tank to c3
game.move('Ie4') // Infantry to e4
game.move('Axb5') // Artillery captures on b5

// Special moves
game.move('T_d3') // Tank stay capture on d3
game.move('A@e6') // Artillery suicide capture on e6
game.move('T&f4(TI)') // Tank combines with Tank+Infantry on f4

// Deploy moves
game.move('I>d4') // Infantry deploys to d4
game.move('(T|I)c2>c3') // Deploy Tank or Infantry from c2 to c3
```

#### 2. Move Objects

```typescript
// Basic move object
const move = game.move({
  from: 'c2',
  to: 'c3',
  piece: 't', // Optional piece type filter
})

// Stay capture
const stayMove = game.move({
  from: 'd2',
  to: 'd3',
  stay: true,
})

// Deploy move
const deployMove = game.move({
  from: 'c2',
  to: 'c3',
  deploy: true,
  piece: 't',
})
```

### Move Response Structure

```typescript
interface Move {
  color: Color // Player who made the move
  from: Square // Origin square
  to: Square // Destination square
  piece: Piece // Piece that moved
  captured?: Piece // Captured piece (if any)
  flags: string // Move type flags
  san?: string // Standard Algebraic Notation
  lan?: string // Long Algebraic Notation
  before: string // FEN before move
  after: string // FEN after move
}
```

### Move Execution Example

```typescript
try {
  const move = game.move('Tc3')

  console.log('Move executed successfully:')
  console.log(`  SAN: ${move.san}`)
  console.log(`  From: ${move.from} → To: ${move.to}`)
  console.log(`  Piece: ${move.piece.type} (${move.piece.color})`)
  console.log(`  Flags: ${move.flags}`)
  console.log(`  Before: ${move.before}`)
  console.log(`  After: ${move.after}`)

  if (move.captured) {
    console.log(`  Captured: ${move.captured.type}`)
  }
} catch (error) {
  console.error('Move failed:', error.message)
}
```

---

## Game State Queries

### Game Status

```typescript
// Current turn
const currentPlayer = game.turn() // "r" or "b"

// Move number
const moveNum = game.moveNumber() // 1, 2, 3, ...

// Check status
const inCheck = game.isCheck() // boolean
const isCheckmate = game.isCheckmate() // boolean
const isDraw = game.isDraw() // boolean
const isGameOver = game.isGameOver() // boolean

// Draw conditions
const fiftyMoveRule = game.isDrawByFiftyMoves() // boolean
const repetition = game.isThreefoldRepetition() // boolean
```

### Position Information

```typescript
// Current position FEN
const fen = game.fen()

// Move history
const moves = game.history() // ["Tc3", "id6", ...]
const verboseMoves = game.history({ verbose: true }) // Move objects

// Board state
const board = game.board() // 2D array representation

// Piece queries
const piece = game.get('e4') // Piece at e4
const tank = game.get('e4', 't') // Tank at e4 (in stack)
const isHeroic = game.getHeroicStatus('e4') // Heroic status
```

### Special System Queries

```typescript
// Commander positions
const redCommander = game.getCommanderSquare('r') // Square index or -1
const blueCommander = game.getCommanderSquare('b')

// Attack analysis
const attackers = game.getAttackers(square, 'r') // Pieces attacking square
// Returns: [{ square: number, type: PieceSymbol }, ...]

// Air defense system
const airDefense = game.getAirDefense()
const airDefenseInfluence = game.getAirDefenseInfluence()

// Deploy state
const deployState = game.getDeployState()
if (deployState) {
  console.log(`Deploy from: ${deployState.stackSquare}`)
  console.log(`Turn: ${deployState.turn}`)
  console.log(`Moved pieces: ${deployState.movedPieces.length}`)
}
```

---

## Deploy Moves

Deploy moves handle the deployment of pieces from stacks in a multi-step
process.

### Deploy Move Request

```typescript
interface DeployMoveRequest {
  from: Square // Stack location
  moves: Array<{
    // Individual piece moves
    piece: PieceSymbol
    to: Square
    capture?: boolean
  }>
  stay?: {
    // Pieces staying in stack
    type: PieceSymbol
    color: Color
  }
}
```

### Deploy Move Execution

```typescript
// Simple deploy move
const deployMove = game.deployMove({
  from: 'c2',
  moves: [
    { piece: 't', to: 'c3' },
    { piece: 'i', to: 'd3' },
  ],
})

console.log(`Deploy SAN: ${deployMove.san}`)
console.log(`Individual moves: ${deployMove.moves.length}`)

// Deploy with capture
const captureDeployMove = game.deployMove({
  from: 'c2',
  moves: [
    { piece: 't', to: 'c3' },
    { piece: 'i', to: 'd3', capture: true },
  ],
  stay: { type: 'e', color: 'r' }, // Engineer stays
})
```

### Deploy State Management

```typescript
// Check if in deploy phase
const deployState = game.getDeployState()
if (deployState) {
  console.log('Deploy phase active')

  // Get available deploy moves
  const deployMoves = game.moves({
    square: algebraic(deployState.stackSquare),
  })

  // Continue deploy phase
  if (deployMoves.length > 0) {
    const nextMove = game.move(deployMoves[0])
    console.log(`Continued with: ${nextMove.san}`)
  }
}
```

---

## Move Generation

### Basic Move Generation

```typescript
// All legal moves
const allMoves = game.moves() // ["Tc3", "Id4", ...]

// Verbose move objects
const verboseMoves = game.moves({ verbose: true })

// Filtered moves
const e4Moves = game.moves({ square: 'e4' }) // From e4
const tankMoves = game.moves({ pieceType: 't' }) // Tank moves
const e4TankMoves = game.moves({
  square: 'e4',
  pieceType: 't',
})

// Check if move is legal
function isMoveLegal(moveString: string): boolean {
  return game.moves().includes(moveString)
}
```

### Move Generation Options

```typescript
interface MovesOptions {
  verbose?: boolean // Return Move objects instead of strings
  square?: Square // Filter moves from specific square
  pieceType?: PieceSymbol // Filter moves for specific piece type
}
```

### Move Filtering and Analysis

```typescript
// Categorize moves by type
const allMoves = game.moves({ verbose: true })

const captures = allMoves.filter((move) => move.flags.includes('c'))
const deploys = allMoves.filter((move) => move.flags.includes('d'))
const combinations = allMoves.filter((move) => move.flags.includes('&'))
const stayCaptures = allMoves.filter((move) => move.flags.includes('_'))
const suicideCaptures = allMoves.filter((move) => move.flags.includes('@'))

console.log(`Captures: ${captures.length}`)
console.log(`Deploys: ${deploys.length}`)
console.log(`Combinations: ${combinations.length}`)
```

---

## History and Undo

### Move History

```typescript
// Get move history as strings
const moveHistory = game.history()
console.log('Game moves:', moveHistory.join(' '))

// Get verbose history
const verboseHistory = game.history({ verbose: true })
verboseHistory.forEach((move, index) => {
  console.log(`${index + 1}. ${move.san} (${move.before} -> ${move.after})`)
})

// Analyze game
const totalMoves = game.history().length
const captures = game
  .history({ verbose: true })
  .filter((move) => move.flags.includes('c')).length
console.log(`Game: ${totalMoves} moves, ${captures} captures`)
```

### Undo Functionality

```typescript
// Undo last move
const initialFen = game.fen()
game.move({ from: 'd3', to: 'd4' })
game.undo()
expect(game.fen()).toBe(initialFen)
expect(game.history().length).toBe(0)

// Multiple undos
const moves = ['Tc3', 'id6', 'Te3']
moves.forEach((move) => game.move(move))
console.log(`History: ${game.history().length} moves`)

// Undo all moves
while (game.history().length > 0) {
  game.undo()
}
console.log('Back to starting position')
```

---

## Error Handling

### Common Error Types

```typescript
// Invalid FEN
try {
  const game = new CoTuLenh('invalid/fen/string')
} catch (error) {
  console.error('FEN Error:', error.message)
  // "Invalid FEN: expected 12 ranks, got 8"
}

// Invalid move
try {
  const move = game.move('InvalidMove')
} catch (error) {
  console.error('Move Error:', error.message)
  // "Invalid or illegal move: InvalidMove"
}

// Game over
try {
  const move = game.move('Tc3') // When game is over
} catch (error) {
  console.error('Game State Error:', error.message)
  // "Game is over"
}
```

### Error Recovery Patterns

```typescript
// Safe move execution
function safeMove(game: CoTuLenh, moveString: string): boolean {
  try {
    // Check if move is legal first
    const legalMoves = game.moves()
    if (!legalMoves.includes(moveString)) {
      console.log(`Move "${moveString}" not legal`)
      return false
    }

    const move = game.move(moveString)
    console.log(`Move executed: ${move.san}`)
    return true
  } catch (error) {
    console.error(`Move failed: ${error.message}`)
    return false
  }
}

// Safe FEN loading
function safeFenLoad(fenString: string): CoTuLenh | null {
  try {
    const game = new CoTuLenh(fenString)
    console.log('Game loaded successfully')
    return game
  } catch (error) {
    console.error(`FEN loading failed: ${error.message}`)
    return null
  }
}

// Validation before execution
function validateAndExecute(game: CoTuLenh, moveString: string) {
  // Pre-validation
  if (game.isGameOver()) {
    throw new Error('Cannot move: game is over')
  }

  const legalMoves = game.moves()
  if (!legalMoves.includes(moveString)) {
    throw new Error(`Move "${moveString}" is not legal`)
  }

  // Execute move
  return game.move(moveString)
}
```

---

## Integration Patterns

### Web Application Integration

```typescript
class GameManager {
  private game: CoTuLenh
  private gameId: string

  constructor(gameId: string, initialFen?: string) {
    this.gameId = gameId
    this.game = new CoTuLenh(initialFen)
  }

  // Get complete game state for UI
  getGameState() {
    return {
      gameId: this.gameId,
      fen: this.game.fen(),
      turn: this.game.turn(),
      moveNumber: this.game.moveNumber(),
      isCheck: this.game.isCheck(),
      isCheckmate: this.game.isCheckmate(),
      isDraw: this.game.isDraw(),
      isGameOver: this.game.isGameOver(),
      legalMoves: this.game.moves(),
      deployState: this.game.getDeployState(),
      history: this.game.history(),
    }
  }

  // Execute move with validation
  makeMove(move: string | object) {
    if (this.game.isGameOver()) {
      throw new Error('Game is already over')
    }

    const executedMove = this.game.move(move)

    return {
      move: executedMove,
      gameState: this.getGameState(),
    }
  }

  // Undo last move
  undoMove() {
    if (this.game.history().length === 0) {
      throw new Error('No moves to undo')
    }

    this.game.undo()
    return this.getGameState()
  }

  // Reset game
  resetGame(fen?: string) {
    if (fen) {
      this.game.load(fen)
    } else {
      this.game = new CoTuLenh()
    }
    return this.getGameState()
  }
}
```

### REST API Server

```typescript
import express from 'express'
import { CoTuLenh } from 'cotulenh'

const app = express()
app.use(express.json())

// Game storage
const games = new Map<string, CoTuLenh>()

// Create game endpoint
app.post('/api/games', (req, res) => {
  try {
    const { gameId, fen } = req.body

    if (games.has(gameId)) {
      return res.status(409).json({
        success: false,
        error: 'Game already exists',
      })
    }

    const game = new CoTuLenh(fen)
    games.set(gameId, game)

    res.json({
      success: true,
      gameState: {
        gameId,
        fen: game.fen(),
        turn: game.turn(),
        moveNumber: game.moveNumber(),
        isCheck: game.isCheck(),
        isGameOver: game.isGameOver(),
        legalMoves: game.moves(),
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    })
  }
})

// Make move endpoint
app.post('/api/games/:gameId/moves', (req, res) => {
  try {
    const { gameId } = req.params
    const { move } = req.body

    const game = games.get(gameId)
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      })
    }

    if (game.isGameOver()) {
      return res.status(400).json({
        success: false,
        error: 'Game is over',
      })
    }

    const executedMove = game.move(move)

    res.json({
      success: true,
      move: {
        san: executedMove.san,
        from: executedMove.from,
        to: executedMove.to,
        piece: executedMove.piece,
        captured: executedMove.captured,
        flags: executedMove.flags,
      },
      gameState: {
        fen: game.fen(),
        turn: game.turn(),
        moveNumber: game.moveNumber(),
        isCheck: game.isCheck(),
        isGameOver: game.isGameOver(),
        legalMoves: game.moves(),
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    })
  }
})

// Get game state endpoint
app.get('/api/games/:gameId', (req, res) => {
  const { gameId } = req.params
  const game = games.get(gameId)

  if (!game) {
    return res.status(404).json({
      success: false,
      error: 'Game not found',
    })
  }

  res.json({
    success: true,
    gameState: {
      gameId,
      fen: game.fen(),
      turn: game.turn(),
      moveNumber: game.moveNumber(),
      isCheck: game.isCheck(),
      isCheckmate: game.isCheckmate(),
      isDraw: game.isDraw(),
      isGameOver: game.isGameOver(),
      legalMoves: game.moves(),
      deployState: game.getDeployState(),
      history: game.history(),
    },
  })
})
```

### Client-Side Usage

```typescript
// Client-side game interaction
class CoTulenhClient {
  constructor(private baseUrl: string) {}

  async createGame(gameId: string, fen?: string) {
    const response = await fetch(`${this.baseUrl}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, fen }),
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error)
    }

    return result.gameState
  }

  async getGameState(gameId: string) {
    const response = await fetch(`${this.baseUrl}/api/games/${gameId}`)
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error)
    }

    return result.gameState
  }

  async makeMove(gameId: string, move: string | object) {
    const response = await fetch(`${this.baseUrl}/api/games/${gameId}/moves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ move }),
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error)
    }

    return result
  }

  async getLegalMoves(gameId: string, options = {}) {
    const params = new URLSearchParams(options)
    const response = await fetch(
      `${this.baseUrl}/api/games/${gameId}/moves?${params}`,
    )
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error)
    }

    return result.moves
  }
}
```

---

## Performance Considerations

### Move Caching

The engine automatically caches legal moves for performance:

```typescript
// Moves are cached based on position and filters
const moves1 = game.moves() // Cached
const moves2 = game.moves() // Returns cached result
const moves3 = game.moves({ square: 'e4' }) // Different cache key

// Cache is cleared on position changes
game.move('Tc3') // Clears cache
const moves4 = game.moves() // Regenerated
```

### Batch Operations

```typescript
// Efficient batch move validation
function validateMoves(game: CoTuLenh, candidateMoves: string[]): string[] {
  const legalMoves = game.moves() // Single call
  return candidateMoves.filter((move) => legalMoves.includes(move))
}

// Batch state queries
function getBatchGameState(game: CoTuLenh) {
  return {
    fen: game.fen(),
    turn: game.turn(),
    moves: game.moves(),
    isCheck: game.isCheck(),
    isGameOver: game.isGameOver(),
  }
}
```

### Memory Management

```typescript
// Reuse game instances
const game = new CoTuLenh()

// Instead of: new CoTuLenh(newFen)
game.load(newFen)

// Limit history for long games
function limitHistory(game: CoTuLenh, maxMoves: number) {
  const history = game.history()
  if (history.length > maxMoves) {
    // Consider saving to external storage
    console.log(`History has ${history.length} moves`)
  }
}
```

---

## Complete Examples

### Full Game Session

```typescript
import { CoTuLenh } from 'cotulenh'

async function playCompleteGame() {
  console.log('=== Starting CoTuLenh Game ===')

  // 1. Initialize
  const game = new CoTuLenh()
  console.log(`Initial position: ${game.fen()}`)
  console.log(`${game.moves().length} legal moves available`)

  // 2. Game loop
  const moves = ['Tc3', 'id6', 'Te3', 'ie5', 'Txe5', 'af7']

  for (const moveStr of moves) {
    try {
      console.log(`\n--- Move: ${moveStr} ---`)

      // Validate before execution
      if (!game.moves().includes(moveStr)) {
        console.log(`Move ${moveStr} is not legal`)
        continue
      }

      // Execute move
      const move = game.move(moveStr)
      console.log(`Executed: ${move.san}`)
      console.log(`Position: ${game.fen()}`)

      // Check game state
      if (game.isCheck()) {
        console.log('⚠️  Check!')
      }

      if (game.isGameOver()) {
        console.log('🏁 Game Over!')
        if (game.isCheckmate()) {
          const winner = game.turn() === 'r' ? 'Blue' : 'Red'
          console.log(`👑 ${winner} wins by checkmate!`)
        } else if (game.isDraw()) {
          console.log('🤝 Game drawn')
        }
        break
      }

      console.log(`Next: ${game.turn() === 'r' ? 'Red' : 'Blue'} to move`)
      console.log(`Legal moves: ${game.moves().length}`)
    } catch (error) {
      console.error(`Move ${moveStr} failed: ${error.message}`)
    }
  }

  // 3. Final state
  console.log('\n=== Game Summary ===')
  console.log(`Final FEN: ${game.fen()}`)
  console.log(`Total moves: ${game.history().length}`)
  console.log(`Game history: ${game.history().join(' ')}`)
}

// Run the example
playCompleteGame().catch(console.error)
```

### Deploy Move Example

```typescript
import { CoTuLenh } from 'cotulenh'

function demonstrateDeployMoves() {
  console.log('=== Deploy Move Demonstration ===')

  // Set up position with stacked pieces
  const stackFen =
    '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/PP(TI)PPPPP r - - 0 1'
  const game = new CoTuLenh(stackFen)

  console.log('Initial position with stack:')
  console.log(`FEN: ${game.fen()}`)

  // Check available moves from stack
  const stackMoves = game.moves({ square: 'c2' })
  console.log(`\nMoves from c2 stack: ${stackMoves.length}`)
  stackMoves.forEach((move) => console.log(`  ${move}`))

  // Execute deploy move
  try {
    const deployMove = game.deployMove({
      from: 'c2',
      moves: [
        { piece: 't', to: 'c3' },
        { piece: 'i', to: 'd3' },
      ],
    })

    console.log('\nDeploy move executed:')
    console.log(`  SAN: ${deployMove.san}`)
    console.log(`  Individual moves: ${deployMove.moves.length}`)
    console.log(`  New FEN: ${game.fen()}`)
  } catch (error) {
    console.error('Deploy move failed:', error.message)
  }

  // Check final state
  console.log('\nFinal position:')
  console.log(`FEN: ${game.fen()}`)
  console.log(`Turn: ${game.turn()}`)
  console.log(`Legal moves: ${game.moves().length}`)
}

demonstrateDeployMoves()
```

This comprehensive API guide provides everything needed to integrate with the
CoTuLenh game engine, from basic usage to advanced integration patterns. The
examples demonstrate real-world usage scenarios and proper error handling
techniques.
