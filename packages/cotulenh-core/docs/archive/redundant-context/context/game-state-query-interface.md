# Game State Query Interface

## Overview

The CoTuLenh game engine provides a comprehensive query interface for examining
game state, checking game status, generating legal moves, and evaluating
positions. This document details all available query methods, their parameters,
return values, and usage patterns for external systems.

## Game Status Queries

### Turn Information

#### Current Turn

```typescript
turn(): Color
```

**Description:** Returns the color of the player whose turn it is to move.

**Returns:** `Color` - Either `"r"` (RED) or `"b"` (BLUE)

**Usage:**

```typescript
const currentPlayer = game.turn()
console.log(`Current turn: ${currentPlayer}`) // "Current turn: r"

// Use in conditional logic
if (game.turn() === 'r') {
  console.log("Red player's turn")
} else {
  console.log("Blue player's turn")
}
```

#### Move Number

```typescript
moveNumber(): number
```

**Description:** Returns the current full move number. Increments after both
players have moved (after Blue's turn).

**Returns:** `number` - Current move number starting from 1

**Usage:**

```typescript
const moveNum = game.moveNumber()
console.log(`Move ${moveNum}`) // "Move 15"

// Track game progress
if (game.moveNumber() > 50) {
  console.log('Long game - consider draw conditions')
}
```

### Check and Attack Detection

#### Check Status

```typescript
isCheck(): boolean
```

**Description:** Determines if the current player's commander is under attack.

**Returns:** `boolean` - True if current player is in check

**Usage:**

```typescript
if (game.isCheck()) {
  console.log('Commander is under attack!')
  // Highlight commander or show warning
}

// Filter moves that resolve check
const moves = game.moves()
const checkResolvingMoves = moves.filter((move) => {
  game.move(move)
  const stillInCheck = game.isCheck()
  game.undo()
  return !stillInCheck
})
```

#### Checkmate Detection

```typescript
isCheckmate(): boolean
```

**Description:** Determines if the current player is in checkmate (commander
attacked with no legal moves).

**Returns:** `boolean` - True if current player is in checkmate

**Usage:**

```typescript
if (game.isCheckmate()) {
  console.log('Checkmate! Game over.')
  const winner = game.turn() === 'r' ? 'Blue' : 'Red'
  console.log(`${winner} wins!`)
}
```

#### Attacker Analysis

```typescript
getAttackers(square: number, attackerColor: Color): { square: number; type: PieceSymbol }[]
```

**Description:** Identifies all pieces of a specific color that can attack a
given square.

**Parameters:**

- `square`: Target square in internal coordinate format
- `attackerColor`: Color of attacking pieces to find

**Returns:** Array of objects with `square` (attacker position) and `type`
(piece type)

**Usage:**

```typescript
import { SQUARE_MAP } from 'cotulenh'

// Find all red pieces attacking e4
const attackers = game.getAttackers(SQUARE_MAP.e4, 'r')
console.log(`${attackers.length} red pieces can attack e4`)

attackers.forEach((attacker) => {
  console.log(`${attacker.type} on ${algebraic(attacker.square)} can attack e4`)
})

// Check if commander is safe
const commanderSq = game.getCommanderSquare('r')
const threats = game.getAttackers(commanderSq, 'b')
if (threats.length > 0) {
  console.log('Commander is under threat!')
}
```

### Draw Conditions

#### Fifty-Move Rule

```typescript
isDrawByFiftyMoves(): boolean
```

**Description:** Checks if the game is a draw due to the fifty-move rule (100
half-moves without capture or commander move).

**Returns:** `boolean` - True if draw by fifty-move rule

**Usage:**

```typescript
if (game.isDrawByFiftyMoves()) {
  console.log('Draw by fifty-move rule')
  // Offer draw or declare draw
}

// Show approaching fifty-move rule
const halfMoves = game._halfMoves // Internal access for demo
if (halfMoves > 80) {
  console.log(`${100 - halfMoves} half-moves until fifty-move draw`)
}
```

#### Threefold Repetition

```typescript
isThreefoldRepetition(): boolean
```

**Description:** Checks if the current position has occurred three times (draw
by repetition).

**Returns:** `boolean` - True if draw by threefold repetition

**Usage:**

```typescript
if (game.isThreefoldRepetition()) {
  console.log('Draw by threefold repetition')
  // Automatically declare draw or offer draw
}
```

#### General Draw Check

```typescript
isDraw(): boolean
```

**Description:** Checks if the game is a draw by any applicable rule.

**Returns:** `boolean` - True if game is drawn

**Usage:**

```typescript
if (game.isDraw()) {
  console.log('Game is drawn')
  const reason = game.isDrawByFiftyMoves()
    ? 'fifty-move rule'
    : 'threefold repetition'
  console.log(`Draw reason: ${reason}`)
}
```

### Game Ending Detection

#### Game Over Status

```typescript
isGameOver(): boolean
```

**Description:** Determines if the game has ended by any condition (checkmate,
draw, or commander capture).

**Returns:** `boolean` - True if game is over

**Usage:**

```typescript
if (game.isGameOver()) {
  console.log('Game has ended')

  if (game.isCheckmate()) {
    const winner = game.turn() === 'r' ? 'Blue' : 'Red'
    console.log(`${winner} wins by checkmate`)
  } else if (game.isDraw()) {
    console.log('Game drawn')
  } else {
    console.log('Game ended by commander capture')
  }
}

// Game loop example
while (!game.isGameOver()) {
  // Continue playing
  const move = getPlayerMove()
  game.move(move)
}
```

## Legal Move Generation

### Basic Move Generation

#### All Legal Moves

```typescript
moves(options?: {
  verbose?: boolean
  square?: Square
  pieceType?: PieceSymbol
}): string[] | Move[]
```

**Description:** Generates all legal moves available in the current position.

**Parameters:**

- `verbose`: If true, returns Move objects; if false, returns SAN strings
- `square`: Filter moves from specific square
- `pieceType`: Filter moves for specific piece type

**Returns:** Array of moves (strings or Move objects based on verbose flag)

**Usage:**

```typescript
// Get all legal moves as SAN strings
const moves = game.moves()
console.log(`${moves.length} legal moves available`)
console.log(moves) // ["Tc3", "Id4", "Axe5", ...]

// Get verbose move objects
const verboseMoves = game.moves({ verbose: true })
verboseMoves.forEach((move) => {
  console.log(`${move.san}: ${move.piece.type} from ${move.from} to ${move.to}`)
})

// Filter by square
const e4Moves = game.moves({ square: 'e4' })
console.log(`Moves from e4: ${e4Moves}`)

// Filter by piece type
const tankMoves = game.moves({ pieceType: 't' })
console.log(`Tank moves: ${tankMoves}`)

// Combined filters
const e4TankMoves = game.moves({ square: 'e4', pieceType: 't' })
```

### Deploy Move Generation

#### Deploy Moves from Stack

```typescript
// Deploy moves are included in regular moves() call when in deploy state
const deployMoves = game.moves({ square: 'c2', deploy: true })
```

**Usage:**

```typescript
// Check if in deploy state
const deployState = game.getDeployState()
if (deployState) {
  console.log(`Deploy phase active from ${algebraic(deployState.stackSquare)}`)

  // Get available deploy moves
  const deployMoves = game.moves({ square: algebraic(deployState.stackSquare) })
  console.log(`${deployMoves.length} deploy options available`)
}
```

### Move Filtering and Analysis

#### Move Categories

```typescript
// Categorize moves by type
const allMoves = game.moves({ verbose: true })

const captures = allMoves.filter((move) => move.isCapture())
const deploys = allMoves.filter((move) => move.isDeploy())
const combinations = allMoves.filter((move) => move.isCombination())
const stayCaptures = allMoves.filter((move) => move.isStayCapture())
const suicideCaptures = allMoves.filter((move) => move.isSuicideCapture())

console.log(`Captures: ${captures.length}`)
console.log(`Deploys: ${deploys.length}`)
console.log(`Combinations: ${combinations.length}`)
```

#### Move Validation

```typescript
// Check if specific move is legal
function isMoveLegal(moveString: string): boolean {
  const legalMoves = game.moves()
  return legalMoves.includes(moveString)
}

// Validate before execution
const candidateMove = 'Tc3'
if (isMoveLegal(candidateMove)) {
  game.move(candidateMove)
} else {
  console.log('Move is not legal')
}
```

## Position Queries

### Board State

#### Board Representation

```typescript
board(): ({
  square: Square
  type: PieceSymbol
  color: Color
  heroic: boolean
} | null)[][]
```

**Description:** Returns a 2D array representation of the current board state.

**Returns:** 12x11 array where each element is either piece data or null for
empty squares

**Usage:**

```typescript
const boardState = game.board()

// Iterate through board
for (let rank = 0; rank < 12; rank++) {
  for (let file = 0; file < 11; file++) {
    const square = boardState[rank][file]
    if (square) {
      console.log(`${square.type} on ${square.square} (${square.color})`)
      if (square.heroic) {
        console.log('  - Heroic piece')
      }
    }
  }
}

// Find specific pieces
const redCommanders = []
for (let rank = 0; rank < 12; rank++) {
  for (let file = 0; file < 11; file++) {
    const square = boardState[rank][file]
    if (square && square.type === 'c' && square.color === 'r') {
      redCommanders.push(square)
    }
  }
}
```

#### Piece Queries

```typescript
get(square: Square | number, pieceType?: PieceSymbol): Piece | undefined
```

**Description:** Retrieves a piece from a specific square, optionally filtering
by piece type within stacks.

**Parameters:**

- `square`: Square to examine (algebraic notation or internal coordinate)
- `pieceType`: Optional piece type to search for in stacks

**Returns:** Piece object or undefined if not found

**Usage:**

```typescript
// Get piece on specific square
const piece = game.get('e4')
if (piece) {
  console.log(`${piece.type} (${piece.color}) on e4`)
  if (piece.heroic) {
    console.log('Piece is heroic')
  }
  if (piece.carrying) {
    console.log(`Carrying ${piece.carrying.length} pieces`)
  }
}

// Search for specific piece type in stack
const tank = game.get('e4', 't')
if (tank) {
  console.log('Tank found in stack on e4')
}

// Check multiple squares
const squares = ['e4', 'd4', 'f4']
squares.forEach((sq) => {
  const piece = game.get(sq)
  console.log(`${sq}: ${piece ? piece.type : 'empty'}`)
})
```

### Heroic Status Queries

#### Get Heroic Status

```typescript
getHeroicStatus(square: Square | number, pieceType?: PieceSymbol): boolean
```

**Description:** Checks if a piece has heroic status.

**Parameters:**

- `square`: Square to examine
- `pieceType`: Optional piece type to check in stacks

**Returns:** `boolean` - True if piece is heroic

**Usage:**

```typescript
// Check heroic status
const isHeroic = game.getHeroicStatus('e4')
console.log(`Piece on e4 is ${isHeroic ? 'heroic' : 'normal'}`)

// Check specific piece in stack
const tankIsHeroic = game.getHeroicStatus('e4', 't')
if (tankIsHeroic) {
  console.log('Tank in stack is heroic')
}

// Find all heroic pieces
const boardState = game.board()
const heroicPieces = []
for (let rank = 0; rank < 12; rank++) {
  for (let file = 0; file < 11; file++) {
    const square = boardState[rank][file]
    if (square && square.heroic) {
      heroicPieces.push(square)
    }
  }
}
console.log(`${heroicPieces.length} heroic pieces on board`)
```

### Special System Queries

#### Air Defense System

```typescript
getAirDefense(): AirDefense
getAirDefenseInfluence(): AirDefenseInfluence
```

**Description:** Retrieves current air defense system state and influence zones.

**Returns:** Air defense data structures showing defense zones and influence

**Usage:**

```typescript
// Get air defense state
const airDefense = game.getAirDefense()
console.log('Air defense positions:', airDefense)

// Get air defense influence
const influence = game.getAirDefenseInfluence()
console.log('Air defense influence zones:', influence)

// Check if square is in air defense zone
function isInAirDefenseZone(square: Square, color: Color): boolean {
  const influence = game.getAirDefenseInfluence()
  const sq = SQUARE_MAP[square]
  return influence[color].has(sq)
}
```

#### Deploy State

```typescript
getDeployState(): DeployState | null
```

**Description:** Gets the current deploy state if a deploy phase is active.

**Returns:** Deploy state object or null if no deploy phase active

**Usage:**

```typescript
const deployState = game.getDeployState()
if (deployState) {
  console.log(`Deploy phase active from ${algebraic(deployState.stackSquare)}`)
  console.log(`Turn: ${deployState.turn}`)
  console.log(`Moved pieces: ${deployState.movedPieces.length}`)
  console.log(`Staying pieces: ${deployState.stay?.length || 0}`)
} else {
  console.log('No deploy phase active')
}

// Check if specific player is in deploy phase
function isPlayerInDeploy(color: Color): boolean {
  const deployState = game.getDeployState()
  return deployState !== null && deployState.turn === color
}
```

#### Commander Positions

```typescript
getCommanderSquare(color: Color): number
```

**Description:** Gets the current position of a commander.

**Parameters:**

- `color`: Color of commander to locate

**Returns:** `number` - Square index in internal coordinates, or -1 if captured

**Usage:**

```typescript
// Get commander positions
const redCommanderSq = game.getCommanderSquare('r')
const blueCommanderSq = game.getCommanderSquare('b')

if (redCommanderSq !== -1) {
  console.log(`Red commander on ${algebraic(redCommanderSq)}`)
} else {
  console.log('Red commander captured')
}

// Check commander safety
function isCommanderSafe(color: Color): boolean {
  const commanderSq = game.getCommanderSquare(color)
  if (commanderSq === -1) return false // Captured

  const enemyColor = color === 'r' ? 'b' : 'r'
  const attackers = game.getAttackers(commanderSq, enemyColor)
  return attackers.length === 0
}
```

## Position Serialization

### FEN Generation

```typescript
fen(): string
```

**Description:** Generates the FEN (Forsyth-Edwards Notation) string for the
current position.

**Returns:** `string` - Complete FEN representation

**Usage:**

```typescript
// Get current position FEN
const currentFen = game.fen()
console.log(`Position: ${currentFen}`)

// Save position for later
const savedPosition = game.fen()

// Restore position later
const newGame = new CoTuLenh(savedPosition)

// Compare positions
function positionsEqual(fen1: string, fen2: string): boolean {
  return fen1 === fen2
}
```

### Move History

```typescript
history(): string[]
history({ verbose }: { verbose: true }): (Move | DeployMove)[]
history({ verbose }: { verbose: false }): string[]
history({ verbose }: { verbose: boolean }): string[] | (Move | DeployMove)[]
```

**Description:** Retrieves the complete move history of the game.

**Parameters:**

- `verbose`: If true, returns Move/DeployMove objects; if false, returns SAN
  strings

**Returns:** Array of moves in chronological order

**Usage:**

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
  .filter((move) => move.isCapture()).length
console.log(`Game: ${totalMoves} moves, ${captures} captures`)
```

## Comments and Annotations

### Position Comments

```typescript
getComment(): string | undefined
setComment(comment: string): void
removeComment(): string | undefined
```

**Description:** Manage comments associated with the current position.

**Usage:**

```typescript
// Add comment to current position
game.setComment('Critical position - Red has advantage')

// Retrieve comment
const comment = game.getComment()
if (comment) {
  console.log(`Position comment: ${comment}`)
}

// Remove comment
const removedComment = game.removeComment()
if (removedComment) {
  console.log(`Removed comment: ${removedComment}`)
}

// Comment-based position analysis
function analyzePosition(): string {
  if (game.isCheck()) {
    game.setComment('Commander under attack')
  } else if (game.moves().length < 5) {
    game.setComment('Limited mobility')
  } else {
    game.setComment('Normal position')
  }
  return game.getComment() || ''
}
```

## Debugging and Visualization

### Board Display

```typescript
printBoard(): void
```

**Description:** Outputs a visual text representation of the board to console.

**Usage:**

```typescript
// Display current board state
game.printBoard()

// Display board after each move
const moves = ['Tc3', 'Id4', 'Axe5']
moves.forEach((move) => {
  console.log(`After ${move}:`)
  game.move(move)
  game.printBoard()
})
```

## Integration Patterns

### Game State Monitoring

```typescript
class GameStateMonitor {
  constructor(private game: CoTuLenh) {}

  getFullState() {
    return {
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

  getGameStatus() {
    if (this.game.isCheckmate()) {
      const winner = this.game.turn() === 'r' ? 'Blue' : 'Red'
      return { status: 'checkmate', winner }
    } else if (this.game.isDraw()) {
      const reason = this.game.isDrawByFiftyMoves()
        ? 'fifty-move'
        : 'repetition'
      return { status: 'draw', reason }
    } else if (this.game.isCheck()) {
      return { status: 'check', player: this.game.turn() }
    } else {
      return { status: 'active', player: this.game.turn() }
    }
  }
}
```

### Position Analysis

```typescript
class PositionAnalyzer {
  constructor(private game: CoTuLenh) {}

  analyzeMobility() {
    const redMoves = this.game.turn() === 'r' ? this.game.moves().length : 0

    // Switch turn to count opponent moves
    const currentTurn = this.game.turn()
    this.game['_turn'] = currentTurn === 'r' ? 'b' : 'r'
    const blueMoves = this.game.moves().length
    this.game['_turn'] = currentTurn

    return { red: redMoves, blue: blueMoves }
  }

  findThreats() {
    const threats = []
    const currentPlayer = this.game.turn()
    const opponent = currentPlayer === 'r' ? 'b' : 'r'

    // Find pieces under attack
    const board = this.game.board()
    for (let rank = 0; rank < 12; rank++) {
      for (let file = 0; file < 11; file++) {
        const square = board[rank][file]
        if (square && square.color === currentPlayer) {
          const sq = SQUARE_MAP[square.square]
          const attackers = this.game.getAttackers(sq, opponent)
          if (attackers.length > 0) {
            threats.push({
              piece: square,
              attackers: attackers.length,
            })
          }
        }
      }
    }

    return threats
  }
}
```

### Real-time Game Interface

```typescript
class GameInterface {
  constructor(private game: CoTuLenh) {}

  // Get current game state for UI
  getUIState() {
    const state = {
      board: this.game.board(),
      turn: this.game.turn(),
      moveNumber: this.game.moveNumber(),
      status: this.getGameStatus(),
      legalMoves: this.game.moves(),
      lastMove: this.getLastMove(),
      check: this.game.isCheck(),
      deployState: this.game.getDeployState(),
    }

    return state
  }

  private getGameStatus() {
    if (this.game.isGameOver()) {
      if (this.game.isCheckmate()) return 'checkmate'
      if (this.game.isDraw()) return 'draw'
      return 'ended'
    }
    return 'active'
  }

  private getLastMove() {
    const history = this.game.history({ verbose: true })
    return history.length > 0 ? history[history.length - 1] : null
  }

  // Validate move before sending to engine
  validateMove(moveString: string): boolean {
    const legalMoves = this.game.moves()
    return legalMoves.includes(moveString)
  }

  // Get move suggestions for UI
  getMoveSuggestions(square?: Square) {
    if (square) {
      return this.game.moves({ square })
    }
    return this.game.moves()
  }
}
```

## Performance Considerations

### Query Optimization

```typescript
// Cache frequently accessed data
class OptimizedGameQuery {
  private moveCache: string[] | null = null
  private lastFen: string = ''

  constructor(private game: CoTuLenh) {}

  getMoves(): string[] {
    const currentFen = this.game.fen()
    if (this.moveCache && this.lastFen === currentFen) {
      return this.moveCache
    }

    this.moveCache = this.game.moves()
    this.lastFen = currentFen
    return this.moveCache
  }

  invalidateCache() {
    this.moveCache = null
    this.lastFen = ''
  }
}
```

### Batch Queries

```typescript
// Batch multiple queries for efficiency
function getBatchGameState(game: CoTuLenh) {
  // Single call to get all needed information
  const fen = game.fen()
  const turn = game.turn()
  const moves = game.moves()
  const isCheck = game.isCheck()
  const isGameOver = game.isGameOver()

  return { fen, turn, moves, isCheck, isGameOver }
}
```

### Memory Management

```typescript
// Limit history size for long games
class MemoryEfficientGame {
  private maxHistorySize = 100

  constructor(private game: CoTuLenh) {}

  getRecentHistory(count: number = 10) {
    const fullHistory = this.game.history()
    return fullHistory.slice(-count)
  }

  // Periodically clean up old positions
  cleanupHistory() {
    if (this.game['_history'].length > this.maxHistorySize) {
      // Implementation would need to carefully manage history cleanup
      console.log('History cleanup needed')
    }
  }
}
```
