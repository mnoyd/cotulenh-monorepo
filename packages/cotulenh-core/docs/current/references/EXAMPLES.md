# CoTuLenh Code Examples and Scenarios

## Comprehensive Code Examples and Common Scenarios

### Basic Game Initialization

#### Creating a New Game

```typescript
import { CoTuLenh } from './cotulenh'

// Initialize with default starting position
const game = new CoTuLenh()

// Initialize with custom FEN
const customGame = new CoTuLenh(
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1',
)

// Get current position as FEN
const currentFEN = game.fen()
console.log('Current position:', currentFEN)
```

#### Loading Game State

```typescript
// Load from FEN with stacks and heroic pieces
const fenWithStacks =
  'r(nf)bqkb(nt)r/pppppppp/8/8/8/8/PPPPPPPP/R(NF)BQKB(NT)R w - - 0 1'
const stackGame = new CoTuLenh(fenWithStacks)

// Load with heroic pieces (+ marker)
const fenWithHeroic = 'r+n+bqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1'
const heroicGame = new CoTuLenh(fenWithHeroic)
```

### Move Generation and Validation

#### Basic Move Generation

```typescript
// Get all legal moves for current position
const moves = game.moves()
console.log('Legal moves:', moves)

// Get moves in verbose format with detailed information
const verboseMoves = game.moves({ verbose: true })
verboseMoves.forEach((move) => {
  console.log(`${move.san}: ${move.from} -> ${move.to}`)
  if (move.captured) console.log(`  Captures: ${move.captured}`)
  if (move.promotion) console.log(`  Promotes to: ${move.promotion}`)
})

// Get moves for specific square
const e4Moves = game.moves({ square: 'e4' })
console.log('Moves from e4:', e4Moves)
```

#### Move Validation

```typescript
// Validate move in SAN notation
const isValidSAN = game.move('Nf3')
if (isValidSAN) {
  console.log('Move applied successfully')
} else {
  console.log('Invalid move')
}

// Validate move with detailed object
const moveObject = {
  from: 'e2',
  to: 'e4',
  piece: 'p',
}

const isValidObject = game.move(moveObject)
if (isValidObject) {
  console.log('Pawn move applied')
}

// Check if specific move is legal
const isLegal = game.isLegal('Qh5')
console.log('Qh5 is legal:', isLegal)
```

### Stack System Examples

#### Creating and Managing Stacks

```typescript
// Example of stack notation in FEN
const stackPosition =
  'r(nft)bqkb(nf)r/pppppppp/8/8/8/8/PPPPPPPP/R(NFT)BQKB(NF)R w - - 0 1'
const stackGame = new CoTuLenh(stackPosition)

// Get piece information for a square with stack
const squareInfo = stackGame.get('a8')
console.log('Square a8 contains:', squareInfo)
// Output: { type: 'stack', pieces: ['r', 'n', 'f', 't'], color: 'b' }

// Check carrying capacity
const canCombine = stackGame.canCombine('a8', ['n', 'f'])
console.log('Can combine Navy and Air Force:', canCombine)
```

#### Deploy Moves (Stack Splitting)

```typescript
// Deploy move: split stack between squares
const deployMove = {
  from: 'a8',
  to: 'a7',
  type: 'deploy',
  pieces: ['n', 'f'], // Pieces to move to target square
  remaining: ['r', 't'], // Pieces to keep at source
}

const deployResult = stackGame.move(deployMove)
if (deployResult) {
  console.log('Deploy move successful')
  console.log('New FEN:', stackGame.fen())
}

// Deploy move in SAN notation
const deploySAN = stackGame.move('Ra8-a7(NF)')
console.log('Deploy move applied:', deploySAN)
```

### Heroic Promotion System

#### Triggering Heroic Promotion

```typescript
// Position where piece can attack enemy commander
const preHeroicFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1'
const heroicGame = new CoTuLenh(preHeroicFEN)

// Move that attacks enemy commander (triggers heroic promotion)
const heroicMove = heroicGame.move('Qd1-d8+') // Attack enemy commander
if (heroicMove) {
  console.log('Heroic promotion triggered!')

  // Check if piece is now heroic
  const queen = heroicGame.get('d8')
  console.log('Queen is heroic:', queen.heroic)

  // Get enhanced movement options
  const heroicMoves = heroicGame.moves({ square: 'd8' })
  console.log('Heroic queen moves:', heroicMoves)
}
```

#### Heroic Effects by Piece Type

```typescript
// Infantry becomes heroic - gains diagonal movement
const heroicInfantry = game.move('Ia2xc4+') // Infantry attacks commander

// Tank becomes heroic - enhanced shooting range
const heroicTank = game.move('Ta1xc8+') // Tank attacks commander

// Air Force becomes heroic - reduced air defense effects
const heroicAirForce = game.move('Fa3xc8+') // Air Force attacks commander

// Check heroic status
const piece = game.get('c8')
if (piece.heroic) {
  console.log(`${piece.type} is now heroic with enhanced abilities`)
}
```

### Air Defense System

#### Air Defense Zone Calculations

```typescript
// Position with anti-air pieces creating defense zones
const airDefenseFEN = 'rnbqkbnr/pppppppp/8/3aa3/8/8/PPPPPPPP/RNBQKBNR w - - 0 1'
const airDefenseGame = new CoTuLenh(airDefenseFEN)

// Check if square is in air defense zone
const isInZone = airDefenseGame.isInAirDefenseZone('d4')
console.log('d4 is in air defense zone:', isInZone)

// Get air defense level for square
const defenseLevel = airDefenseGame.getAirDefenseLevel('d4')
console.log('Air defense level at d4:', defenseLevel)

// Air Force movement restricted by zones
const airForceMoves = airDefenseGame.moves({ square: 'f3', piece: 'f' })
console.log('Air Force moves (restricted by defense):', airForceMoves)
```

#### Kamikaze (Suicide) Captures

```typescript
// Air Force performing suicide capture
const kamikazeMove = {
  from: 'f3',
  to: 'd4',
  type: 'suicide',
  piece: 'f',
}

const suicideResult = airDefenseGame.move(kamikazeMove)
if (suicideResult) {
  console.log('Kamikaze attack successful - both pieces destroyed')

  // Check that both squares are now empty
  console.log('Source square:', airDefenseGame.get('f3')) // null
  console.log('Target square:', airDefenseGame.get('d4')) // null
}

// Suicide capture in SAN notation
const suicideSAN = airDefenseGame.move('Ff3xd4!') // ! indicates suicide
```

### Terrain System Examples

#### Water and Land Movement

```typescript
// Navy movement (water zones only)
const navyMoves = game.moves({ square: 'a1', piece: 'n' })
console.log('Navy moves (water only):', navyMoves)

// Check if square is water zone
const isWater = game.isWaterZone('a1')
console.log('a1 is water zone:', isWater)

// Heavy piece river crossing
const tankMoves = game.moves({ square: 'e5', piece: 't' })
console.log('Tank moves (requires bridges for rivers):', tankMoves)

// Check terrain type
const terrainType = game.getTerrainType('e5')
console.log('e5 terrain type:', terrainType) // 'water', 'land', or 'mixed'
```

#### Bridge Squares and Heavy Pieces

```typescript
// Heavy pieces (Tank, Artillery, Missile) crossing rivers
const HEAVY_PIECES = ['t', 'a', 'm']

// Check if heavy piece can cross at specific square
const canCross = game.canHeavyPieceCross('e5', 'e6')
console.log('Heavy piece can cross e5-e6:', canCross)

// Get valid bridge squares for heavy piece movement
const bridgeSquares = game.getBridgeSquares()
console.log('Available bridge squares:', bridgeSquares)
```

### Capture Types and Special Mechanics

#### Different Capture Types

```typescript
// Normal capture (move to square)
const normalCapture = game.move('Nf3xe5')
console.log('Normal capture:', normalCapture)

// Stay capture (attack without moving)
const stayCapture = game.move('Nf3*e5') // * indicates stay capture
console.log('Stay capture:', stayCapture)

// Check capture type for move
const moveInfo = game.moves({ verbose: true }).find((m) => m.to === 'e5')
console.log('Capture type:', moveInfo.captureType) // 'normal', 'stay', or 'suicide'
```

#### Commander Exposure (Flying General)

```typescript
// Check if commanders are exposed (facing each other)
const isExposed = game.isCommanderExposed()
console.log('Commander exposed:', isExposed)

// Get moves that would create commander exposure
const exposingMoves = game.getExposingMoves()
console.log('Moves that expose commander:', exposingMoves)

// Filter legal moves to avoid exposure
const safeMoves = game
  .moves()
  .filter((move) => !game.wouldExposeCommander(move))
console.log('Safe moves (no commander exposure):', safeMoves)
```

### Game State Queries

#### Position Analysis

```typescript
// Check game status
const status = game.getStatus()
console.log('Game status:', status) // 'playing', 'checkmate', 'stalemate', 'draw'

// Check if position is checkmate
const isCheckmate = game.isCheckmate()
console.log('Is checkmate:', isCheckmate)

// Check if position is stalemate
const isStalemate = game.isStalemate()
console.log('Is stalemate:', isStalemate)

// Get material count
const material = game.getMaterial()
console.log('Material count:', material)
// Output: { white: { c: 1, i: 8, t: 2, ... }, black: { c: 1, i: 8, t: 2, ... } }
```

#### Move History and Undo

```typescript
// Get move history
const history = game.history()
console.log('Move history:', history)

// Get history with detailed move objects
const verboseHistory = game.history({ verbose: true })
verboseHistory.forEach((move, index) => {
  console.log(`${index + 1}. ${move.san} (${move.from}-${move.to})`)
})

// Undo last move
const undoMove = game.undo()
if (undoMove) {
  console.log('Undid move:', undoMove.san)
  console.log('Current position:', game.fen())
}

// Reset to starting position
game.reset()
console.log('Reset to start:', game.fen())
```

### Error Handling and Validation

#### Move Validation Errors

```typescript
try {
  const move = game.move('InvalidMove')
  if (!move) {
    console.log('Move validation failed')
  }
} catch (error) {
  console.error('Move error:', error.message)
}

// Validate move format
const isValidFormat = game.isValidMoveFormat('Nf3')
console.log('Valid move format:', isValidFormat)

// Get detailed validation errors
const validationResult = game.validateMove('Nf3')
if (!validationResult.valid) {
  console.log('Validation errors:', validationResult.errors)
}
```

#### Position Validation

```typescript
// Validate FEN string
const isValidFEN = game.isValidFEN(
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1',
)
console.log('Valid FEN:', isValidFEN)

// Validate current position
const positionValid = game.isValidPosition()
console.log('Position is valid:', positionValid)

// Get position validation errors
const positionErrors = game.getPositionErrors()
if (positionErrors.length > 0) {
  console.log('Position errors:', positionErrors)
}
```

### Performance and Optimization

#### Efficient Move Generation

```typescript
// Generate moves for specific piece type only
const knightMoves = game.moves({ piece: 'n' })
console.log('Knight moves only:', knightMoves)

// Generate captures only
const captures = game.moves({ capturesOnly: true })
console.log('Capture moves:', captures)

// Generate non-captures only
const quietMoves = game.moves({ quietOnly: true })
console.log('Quiet moves:', quietMoves)

// Use caching for repeated position analysis
game.enableCaching(true)
const cachedMoves = game.moves() // Will use cache if position unchanged
```

#### Memory Management

```typescript
// Clear move history to free memory
game.clearHistory()

// Disable verbose mode for better performance
game.setVerbose(false)

// Get memory usage statistics
const memoryStats = game.getMemoryStats()
console.log('Memory usage:', memoryStats)
```

### Advanced Scenarios

#### Complex Stack Operations

```typescript
// Multi-piece stack with heroic pieces
const complexFEN =
  'r+(nft)bqkb+(nf)r/pppppppp/8/8/8/8/PPPPPPPP/R+(NFT)BQKB+(NF)R w - - 0 1'
const complexGame = new CoTuLenh(complexFEN)

// Deploy with heroic pieces
const heroicDeploy = complexGame.move('Ra8-a7(N+F)')
console.log('Heroic deploy move:', heroicDeploy)

// Recombine moves (merge stacks)
const recombineMove = complexGame.move('Ra7+a8') // + indicates recombine
console.log('Recombine move:', recombineMove)
```

#### Tournament and Analysis Features

```typescript
// Set up position for analysis
const analysisPosition =
  'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 4'
const analysisGame = new CoTuLenh(analysisPosition)

// Generate all legal moves with evaluation
const evaluatedMoves = analysisGame.moves({ verbose: true, evaluate: true })
evaluatedMoves.forEach((move) => {
  console.log(`${move.san}: evaluation ${move.evaluation}`)
})

// Export game in PGN format
const pgn = analysisGame.pgn()
console.log('Game PGN:', pgn)

// Load game from PGN
const pgnGame = new CoTuLenh()
pgnGame.loadPgn(pgn)
```

### Testing and Debugging

#### Debug Information

```typescript
// Enable debug mode
game.setDebug(true)

// Get detailed position information
const positionInfo = game.getPositionInfo()
console.log('Position details:', positionInfo)

// Trace move generation
const moveTrace = game.traceMoveGeneration('e2')
console.log('Move generation trace:', moveTrace)

// Validate internal consistency
const consistencyCheck = game.validateInternalState()
console.log('Internal state valid:', consistencyCheck)
```

#### Performance Benchmarking

```typescript
// Benchmark move generation
const startTime = performance.now()
for (let i = 0; i < 1000; i++) {
  game.moves()
}
const endTime = performance.now()
console.log(`Move generation: ${endTime - startTime}ms for 1000 iterations`)

// Profile memory usage
const beforeMemory = process.memoryUsage()
game.moves({ verbose: true })
const afterMemory = process.memoryUsage()
console.log('Memory delta:', afterMemory.heapUsed - beforeMemory.heapUsed)
```

### Integration Examples

#### Web Application Integration

```typescript
// React component example
import React, { useState } from 'react';
import { CoTuLenh } from 'cotulenh';

function ChessBoard() {
    const [game] = useState(new CoTuLenh());
    const [position, setPosition] = useState(game.fen());

    const makeMove = (move) => {
        const result = game.move(move);
        if (result) {
            setPosition(game.fen());
        }
        return result;
    };

    return (
        <div>
            <div>Position: {position}</div>
            <div>Legal moves: {game.moves().join(', ')}</div>
        </div>
    );
}
```

#### Node.js Server Integration

```typescript
// Express.js API endpoint
import express from 'express'
import { CoTuLenh } from 'cotulenh'

const app = express()
app.use(express.json())

const games = new Map() // Store active games

app.post('/api/game/new', (req, res) => {
  const gameId = generateGameId()
  const game = new CoTuLenh()
  games.set(gameId, game)

  res.json({
    gameId,
    fen: game.fen(),
    moves: game.moves(),
  })
})

app.post('/api/game/:id/move', (req, res) => {
  const game = games.get(req.params.id)
  if (!game) {
    return res.status(404).json({ error: 'Game not found' })
  }

  const move = game.move(req.body.move)
  if (!move) {
    return res.status(400).json({ error: 'Invalid move' })
  }

  res.json({
    move: move.san,
    fen: game.fen(),
    moves: game.moves(),
    status: game.getStatus(),
  })
})
```

### References

- **API Documentation**: See API-GUIDE.md for complete interface reference
- **Game Rules**: See GAME-RULES.md for detailed mechanics
- **Implementation**: See IMPLEMENTATION-GUIDE.md for technical details
- **Testing**: See TESTING-GUIDE.md for validation strategies
