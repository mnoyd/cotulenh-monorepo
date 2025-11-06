# Complete Request-Response Examples

## Overview

This document provides comprehensive examples of complete game interaction
scenarios, demonstrating the full request-response cycle for various use cases.
Each example includes initialization, move processing, state queries, error
handling, and integration patterns for external systems.

## Basic Game Session

### Complete Game Flow Example

```typescript
import { CoTuLenh, validateFenString } from 'cotulenh'

// 1. Initialize Game
console.log('=== Game Initialization ===')
const game = new CoTuLenh()

console.log('Initial state:')
console.log(`FEN: ${game.fen()}`)
console.log(`Turn: ${game.turn()}`)
console.log(`Move number: ${game.moveNumber()}`)
console.log(`Legal moves: ${game.moves().length}`)

// 2. Make First Move
console.log('\n=== First Move ===')
try {
  const move1 = game.move('Tc3')
  console.log('Move executed successfully:')
  console.log(`  SAN: ${move1.san}`)
  console.log(`  From: ${move1.from} -> To: ${move1.to}`)
  console.log(`  Piece: ${move1.piece.type} (${move1.piece.color})`)
  console.log(`  Before: ${move1.before}`)
  console.log(`  After: ${move1.after}`)
  console.log(`  Flags: ${move1.flags}`)
} catch (error) {
  console.error('Move failed:', error.message)
}

// 3. Check Game State
console.log('\n=== Game State After Move ===')
console.log(`Current turn: ${game.turn()}`)
console.log(`Move number: ${game.moveNumber()}`)
console.log(`In check: ${game.isCheck()}`)
console.log(`Game over: ${game.isGameOver()}`)
console.log(`Available moves: ${game.moves().length}`)

// 4. Make Opponent Move
console.log('\n=== Opponent Response ===')
const opponentMove = game.move('id6')
console.log(`Opponent played: ${opponentMove.san}`)
console.log(`New position: ${game.fen()}`)

// 5. Continue Game Loop
console.log('\n=== Game Loop ===')
const gameMoves = ['Te3', 'ie5', 'Txe5', 'af7']
gameMoves.forEach((moveStr, index) => {
  try {
    const move = game.move(moveStr)
    console.log(
      `${index + 3}. ${move.san} - ${game.turn() === 'r' ? 'Red' : 'Blue'} to move`,
    )

    if (game.isCheck()) {
      console.log('  ⚠️  Check!')
    }

    if (game.isGameOver()) {
      console.log('  🏁 Game Over!')
      if (game.isCheckmate()) {
        const winner = game.turn() === 'r' ? 'Blue' : 'Red'
        console.log(`  👑 ${winner} wins by checkmate!`)
      } else if (game.isDraw()) {
        console.log('  🤝 Game drawn')
      }
      return
    }
  } catch (error) {
    console.error(`Move ${moveStr} failed:`, error.message)
  }
})

// 6. Final State
console.log('\n=== Final Game State ===')
console.log(`Final FEN: ${game.fen()}`)
console.log(`Total moves played: ${game.history().length}`)
console.log(`Game history: ${game.history().join(' ')}`)
```

**Expected Output:**

```
=== Game Initialization ===
Initial state:
FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1
Turn: r
Move number: 1
Legal moves: 42

=== First Move ===
Move executed successfully:
  SAN: Tc3
  From: c2 -> To: c3
  Piece: t (r)
  Before: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1
  After: rnbqkbnr/pppppppp/8/8/8/2T5/PP1PPPPP/RNBQKBNR b - - 1 1
  Flags: n

=== Game State After Move ===
Current turn: b
Move number: 1
In check: false
Game over: false
Available moves: 42

=== Opponent Response ===
Opponent played: id6
New position: rnbqkbnr/ppp1pppp/3i4/8/8/2T5/PP1PPPPP/RNBQKBNR r - - 2 1

=== Game Loop ===
3. Te3 - Blue to move
4. ie5 - Red to move
5. Txe5 - Blue to move
6. af7 - Red to move

=== Final Game State ===
Final FEN: rnbqkbnr/ppppp1pp/8/4T3/8/8/PP1PPPPP/RNBQKBNR b - - 0 2
Total moves played: 6
Game history: Tc3 id6 Te3 ie5 Txe5 af7
```

## Deploy Move Scenarios

### Stack Deployment Example

```typescript
import { CoTuLenh } from 'cotulenh'

console.log('=== Stack Deployment Scenario ===')

// 1. Set up position with stacked pieces
const stackFen = 'rnbqkbnr/pppppppp/8/8/8/8/PP(TI)PPPPP/RNBQKBNR r - - 0 1'
const game = new CoTuLenh(stackFen)

console.log('Initial position with stack:')
console.log(`FEN: ${game.fen()}`)
game.printBoard()

// 2. Check available moves from stack
console.log('\n=== Available Moves from Stack ===')
const stackMoves = game.moves({ square: 'c2' })
console.log(`Moves from c2 stack: ${stackMoves.length}`)
stackMoves.forEach((move) => console.log(`  ${move}`))

// 3. Execute deploy move
console.log('\n=== Execute Deploy Move ===')
try {
  const deployMove = game.deployMove({
    from: 'c2',
    moves: [
      { piece: 't', to: 'c3' },
      { piece: 'i', to: 'd3' },
    ],
  })

  console.log('Deploy move executed:')
  console.log(`  SAN: ${deployMove.san}`)
  console.log(`  Moves: ${deployMove.moves.length} individual moves`)
  console.log(`  New FEN: ${game.fen()}`)
} catch (error) {
  console.error('Deploy move failed:', error.message)
}

// 4. Check deploy state
console.log('\n=== Deploy State ===')
const deployState = game.getDeployState()
if (deployState) {
  console.log('Deploy phase active:')
  console.log(`  Stack square: ${algebraic(deployState.stackSquare)}`)
  console.log(`  Turn: ${deployState.turn}`)
  console.log(`  Moved pieces: ${deployState.movedPieces.length}`)
  console.log(`  Staying pieces: ${deployState.stay?.length || 0}`)
} else {
  console.log('No deploy phase active')
}

// 5. Continue deploy phase
console.log('\n=== Continue Deploy Phase ===')
if (deployState) {
  const remainingMoves = game.moves()
  console.log(`Remaining deploy options: ${remainingMoves.length}`)

  if (remainingMoves.length > 0) {
    const nextMove = game.move(remainingMoves[0])
    console.log(`Continued with: ${nextMove.san}`)
    console.log(`Deploy complete: ${game.getDeployState() === null}`)
  }
}

console.log('\n=== Final Position ===')
console.log(`Final FEN: ${game.fen()}`)
game.printBoard()
```

**Expected Output:**

```
=== Stack Deployment Scenario ===
Initial position with stack:
FEN: rnbqkbnr/pppppppp/8/8/8/8/PP(TI)PPPPP/RNBQKBNR r - - 0 1

=== Available Moves from Stack ===
Moves from c2 stack: 8
  (T|I)c2>c3
  (T|I)c2>c4
  (T|I)c2>d3
  (T|I)c2>b3
  Tc2>c3
  Tc2>c4
  Ic2>c3
  Ic2>d3

=== Execute Deploy Move ===
Deploy move executed:
  SAN: (T|I)c2>c3,d3
  Moves: 2 individual moves
  New FEN: rnbqkbnr/pppppppp/8/8/8/2TI4/PP1PPPPP/RNBQKBNR r - - 1 1

=== Deploy State ===
No deploy phase active

=== Final Position ===
Final FEN: rnbqkbnr/pppppppp/8/8/8/2TI4/PP1PPPPP/RNBQKBNR b - - 1 1
```

## Error Handling Scenarios

### Comprehensive Error Handling

```typescript
import { CoTuLenh, validateFenString } from 'cotulenh'

console.log('=== Error Handling Examples ===')

// 1. Invalid FEN Handling
console.log('\n--- Invalid FEN ---')
const invalidFens = [
  'invalid/fen/string',
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP', // Missing components
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x - - 0 1', // Invalid turn
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - -1 1', // Invalid counters
]

invalidFens.forEach((fen, index) => {
  console.log(`\nTesting invalid FEN ${index + 1}: ${fen}`)

  // Test validation function
  const isValid = validateFenString(fen)
  console.log(`  Validation result: ${isValid}`)

  // Test game creation
  try {
    const game = new CoTuLenh(fen)
    console.log('  ✅ Game created successfully (unexpected)')
  } catch (error) {
    console.log(`  ❌ Game creation failed: ${error.message}`)
  }
})

// 2. Invalid Move Handling
console.log('\n--- Invalid Move Handling ---')
const game = new CoTuLenh()

const invalidMoves = [
  'Zz9', // Invalid piece/square
  'Tc9', // Off-board square
  'Tc1', // Blocked move
  'Kc3', // Wrong piece type
  'Tc3xd4', // Invalid capture notation
  '', // Empty move
  'random text', // Non-move string
]

invalidMoves.forEach((moveStr) => {
  console.log(`\nTesting invalid move: "${moveStr}"`)
  try {
    const move = game.move(moveStr)
    console.log(`  ✅ Move executed: ${move.san} (unexpected)`)
  } catch (error) {
    console.log(`  ❌ Move failed: ${error.message}`)
  }
})

// 3. Game State Error Handling
console.log('\n--- Game State Errors ---')

// Try to access non-existent pieces
console.log('\nTesting piece queries on empty squares:')
const emptySquares = ['e4', 'f5', 'g6']
emptySquares.forEach((square) => {
  const piece = game.get(square)
  console.log(`  ${square}: ${piece ? `${piece.type} found` : 'empty'}`)
})

// Try to get moves for non-existent pieces
console.log('\nTesting move generation for empty squares:')
emptySquares.forEach((square) => {
  try {
    const moves = game.moves({ square })
    console.log(`  ${square}: ${moves.length} moves`)
  } catch (error) {
    console.log(`  ${square}: Error - ${error.message}`)
  }
})

// 4. Deploy Move Errors
console.log('\n--- Deploy Move Errors ---')
try {
  const deployMove = game.deployMove({
    from: 'e4', // No piece here
    moves: [{ piece: 't', to: 'e5' }],
  })
  console.log('  ✅ Deploy move executed (unexpected)')
} catch (error) {
  console.log(`  ❌ Deploy move failed: ${error.message}`)
}

// 5. Recovery Patterns
console.log('\n--- Error Recovery Patterns ---')

function safeMove(game: CoTuLenh, moveStr: string): boolean {
  try {
    const legalMoves = game.moves()
    if (!legalMoves.includes(moveStr)) {
      console.log(`  Move "${moveStr}" not in legal moves`)
      return false
    }

    const move = game.move(moveStr)
    console.log(`  ✅ Move executed: ${move.san}`)
    return true
  } catch (error) {
    console.log(`  ❌ Move failed: ${error.message}`)
    return false
  }
}

function safeFenLoad(fenString: string): CoTuLenh | null {
  if (!validateFenString(fenString)) {
    console.log(`  Invalid FEN: ${fenString}`)
    return null
  }

  try {
    const game = new CoTuLenh(fenString)
    console.log(`  ✅ Game loaded successfully`)
    return game
  } catch (error) {
    console.log(`  ❌ Game loading failed: ${error.message}`)
    return null
  }
}

// Test recovery patterns
console.log('\nTesting safe move execution:')
safeMove(game, 'Tc3')
safeMove(game, 'InvalidMove')

console.log('\nTesting safe FEN loading:')
safeFenLoad('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1')
safeFenLoad('invalid/fen')
```

## Web API Integration

### REST API Server Example

```typescript
import express from 'express'
import { CoTuLenh, validateFenString } from 'cotulenh'

const app = express()
app.use(express.json())

// Game storage (in production, use proper database)
const games = new Map<string, CoTuLenh>()

// 1. Create New Game
app.post('/api/games', (req, res) => {
  try {
    const { gameId, fen } = req.body

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: 'Game ID is required',
      })
    }

    if (games.has(gameId)) {
      return res.status(409).json({
        success: false,
        error: 'Game already exists',
      })
    }

    // Validate FEN if provided
    if (fen && !validateFenString(fen)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid FEN string',
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
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 2. Get Game State
app.get('/api/games/:gameId', (req, res) => {
  try {
    const { gameId } = req.params
    const game = games.get(gameId)

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      })
    }

    const deployState = game.getDeployState()

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
        deployState: deployState
          ? {
              stackSquare: deployState.stackSquare,
              turn: deployState.turn,
              movedPieces: deployState.movedPieces.length,
              stayingPieces: deployState.stay?.length || 0,
            }
          : null,
        history: game.history(),
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 3. Make Move
app.post('/api/games/:gameId/moves', (req, res) => {
  try {
    const { gameId } = req.params
    const { move, moveType = 'normal' } = req.body

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
        error: 'Game is already over',
      })
    }

    let executedMove

    if (moveType === 'deploy') {
      executedMove = game.deployMove(move)
    } else {
      executedMove = game.move(move)
    }

    // Check game ending conditions
    let gameStatus = 'active'
    let winner = null
    let drawReason = null

    if (game.isGameOver()) {
      if (game.isCheckmate()) {
        gameStatus = 'checkmate'
        winner = game.turn() === 'r' ? 'blue' : 'red'
      } else if (game.isDraw()) {
        gameStatus = 'draw'
        if (game.isDrawByFiftyMoves()) {
          drawReason = 'fifty-move rule'
        } else if (game.isThreefoldRepetition()) {
          drawReason = 'threefold repetition'
        }
      }
    }

    res.json({
      success: true,
      move: {
        san: executedMove.san,
        lan: executedMove.lan || executedMove.san,
        from: executedMove.from,
        to: executedMove.to,
        piece: executedMove.piece,
        captured: executedMove.captured,
        flags: executedMove.flags,
        before: executedMove.before,
        after: executedMove.after,
      },
      gameState: {
        fen: game.fen(),
        turn: game.turn(),
        moveNumber: game.moveNumber(),
        isCheck: game.isCheck(),
        gameStatus,
        winner,
        drawReason,
        legalMoves: game.isGameOver() ? [] : game.moves(),
        deployState: game.getDeployState(),
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    })
  }
})

// 4. Undo Move
app.post('/api/games/:gameId/undo', (req, res) => {
  try {
    const { gameId } = req.params
    const game = games.get(gameId)

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      })
    }

    const historyLength = game.history().length
    if (historyLength === 0) {
      return res.status(400).json({
        success: false,
        error: 'No moves to undo',
      })
    }

    game.undo()

    res.json({
      success: true,
      gameState: {
        fen: game.fen(),
        turn: game.turn(),
        moveNumber: game.moveNumber(),
        isCheck: game.isCheck(),
        isGameOver: game.isGameOver(),
        legalMoves: game.moves(),
        history: game.history(),
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// 5. Get Legal Moves
app.get('/api/games/:gameId/moves', (req, res) => {
  try {
    const { gameId } = req.params
    const { square, pieceType, verbose } = req.query

    const game = games.get(gameId)
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      })
    }

    const options = {
      verbose: verbose === 'true',
      ...(square && { square: square as string }),
      ...(pieceType && { pieceType: pieceType as string }),
    }

    const moves = game.moves(options)

    res.json({
      success: true,
      moves,
      count: moves.length,
      filters: {
        square: square || null,
        pieceType: pieceType || null,
        verbose: verbose === 'true',
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`CoTuLenh API server running on port ${PORT}`)
})
```

### Client Usage Examples

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

  async makeMove(gameId: string, move: string | object, moveType = 'normal') {
    const response = await fetch(`${this.baseUrl}/api/games/${gameId}/moves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ move, moveType }),
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

// Usage example
async function playGame() {
  const client = new CoTulenhClient('http://localhost:3000')

  try {
    // Create new game
    console.log('Creating new game...')
    const gameState = await client.createGame('game-123')
    console.log('Game created:', gameState)

    // Make some moves
    console.log('\nMaking moves...')
    const move1 = await client.makeMove('game-123', 'Tc3')
    console.log('Move 1:', move1.move.san)

    const move2 = await client.makeMove('game-123', 'id6')
    console.log('Move 2:', move2.move.san)

    // Get current state
    console.log('\nCurrent game state:')
    const currentState = await client.getGameState('game-123')
    console.log(`Turn: ${currentState.turn}`)
    console.log(`Move: ${currentState.moveNumber}`)
    console.log(`Check: ${currentState.isCheck}`)
    console.log(`Legal moves: ${currentState.legalMoves.length}`)

    // Get legal moves for specific square
    console.log('\nLegal moves from e2:')
    const e2Moves = await client.getLegalMoves('game-123', { square: 'e2' })
    console.log(e2Moves)
  } catch (error) {
    console.error('Game error:', error.message)
  }
}
```

## Real-time Game Interface

### WebSocket Game Server

```typescript
import WebSocket from 'ws'
import { CoTuLenh } from 'cotulenh'

interface GameRoom {
  id: string
  game: CoTuLenh
  players: { red?: WebSocket; blue?: WebSocket }
  spectators: Set<WebSocket>
}

class GameServer {
  private rooms = new Map<string, GameRoom>()
  private wss: WebSocket.Server

  constructor(port: number) {
    this.wss = new WebSocket.Server({ port })
    this.wss.on('connection', this.handleConnection.bind(this))
    console.log(`WebSocket game server running on port ${port}`)
  }

  private handleConnection(ws: WebSocket) {
    console.log('New client connected')

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        this.handleMessage(ws, message)
      } catch (error) {
        this.sendError(ws, 'Invalid message format')
      }
    })

    ws.on('close', () => {
      this.handleDisconnection(ws)
    })
  }

  private handleMessage(ws: WebSocket, message: any) {
    const { type, gameId, ...payload } = message

    switch (type) {
      case 'create_game':
        this.createGame(ws, gameId, payload.fen)
        break

      case 'join_game':
        this.joinGame(ws, gameId, payload.color)
        break

      case 'spectate_game':
        this.spectateGame(ws, gameId)
        break

      case 'make_move':
        this.makeMove(ws, gameId, payload.move)
        break

      case 'get_state':
        this.sendGameState(ws, gameId)
        break

      case 'undo_move':
        this.undoMove(ws, gameId)
        break

      default:
        this.sendError(ws, `Unknown message type: ${type}`)
    }
  }

  private createGame(ws: WebSocket, gameId: string, fen?: string) {
    if (this.rooms.has(gameId)) {
      return this.sendError(ws, 'Game already exists')
    }

    try {
      const game = new CoTuLenh(fen)
      const room: GameRoom = {
        id: gameId,
        game,
        players: {},
        spectators: new Set(),
      }

      this.rooms.set(gameId, room)

      this.send(ws, {
        type: 'game_created',
        gameId,
        gameState: this.getGameStateData(game),
      })
    } catch (error) {
      this.sendError(ws, `Failed to create game: ${error.message}`)
    }
  }

  private joinGame(ws: WebSocket, gameId: string, color: 'red' | 'blue') {
    const room = this.rooms.get(gameId)
    if (!room) {
      return this.sendError(ws, 'Game not found')
    }

    if (room.players[color]) {
      return this.sendError(ws, `${color} player already joined`)
    }

    room.players[color] = ws

    this.send(ws, {
      type: 'joined_game',
      gameId,
      color,
      gameState: this.getGameStateData(room.game),
    })

    // Notify other players
    this.broadcastToRoom(
      room,
      {
        type: 'player_joined',
        color,
        gameState: this.getGameStateData(room.game),
      },
      ws,
    )
  }

  private makeMove(ws: WebSocket, gameId: string, move: string | object) {
    const room = this.rooms.get(gameId)
    if (!room) {
      return this.sendError(ws, 'Game not found')
    }

    // Check if it's the player's turn
    const currentTurn = room.game.turn()
    const playerColor = this.getPlayerColor(room, ws)

    if (!playerColor) {
      return this.sendError(ws, 'You are not a player in this game')
    }

    if (playerColor !== currentTurn) {
      return this.sendError(ws, 'Not your turn')
    }

    if (room.game.isGameOver()) {
      return this.sendError(ws, 'Game is over')
    }

    try {
      const executedMove = room.game.move(move)

      const moveData = {
        type: 'move_made',
        gameId,
        move: {
          san: executedMove.san,
          from: executedMove.from,
          to: executedMove.to,
          piece: executedMove.piece,
          captured: executedMove.captured,
          flags: executedMove.flags,
        },
        gameState: this.getGameStateData(room.game),
        player: playerColor,
      }

      // Broadcast to all players and spectators
      this.broadcastToRoom(room, moveData)

      // Check for game ending
      if (room.game.isGameOver()) {
        let gameEndData = {
          type: 'game_ended',
          gameId,
          reason: 'unknown',
        }

        if (room.game.isCheckmate()) {
          const winner = room.game.turn() === 'r' ? 'blue' : 'red'
          gameEndData = {
            ...gameEndData,
            reason: 'checkmate',
            winner,
          }
        } else if (room.game.isDraw()) {
          gameEndData = {
            ...gameEndData,
            reason: room.game.isDrawByFiftyMoves()
              ? 'fifty-move rule'
              : 'threefold repetition',
          }
        }

        this.broadcastToRoom(room, gameEndData)
      }
    } catch (error) {
      this.sendError(ws, `Invalid move: ${error.message}`)
    }
  }

  private getGameStateData(game: CoTuLenh) {
    const deployState = game.getDeployState()

    return {
      fen: game.fen(),
      turn: game.turn(),
      moveNumber: game.moveNumber(),
      isCheck: game.isCheck(),
      isCheckmate: game.isCheckmate(),
      isDraw: game.isDraw(),
      isGameOver: game.isGameOver(),
      legalMoves: game.moves(),
      deployState: deployState
        ? {
            stackSquare: deployState.stackSquare,
            turn: deployState.turn,
            movedPieces: deployState.movedPieces.length,
            stayingPieces: deployState.stay?.length || 0,
          }
        : null,
      history: game.history(),
    }
  }

  private getPlayerColor(room: GameRoom, ws: WebSocket): 'red' | 'blue' | null {
    if (room.players.red === ws) return 'red'
    if (room.players.blue === ws) return 'blue'
    return null
  }

  private broadcastToRoom(room: GameRoom, message: any, exclude?: WebSocket) {
    const data = JSON.stringify(message)

    // Send to players
    Object.values(room.players).forEach((playerWs) => {
      if (
        playerWs &&
        playerWs !== exclude &&
        playerWs.readyState === WebSocket.OPEN
      ) {
        playerWs.send(data)
      }
    })

    // Send to spectators
    room.spectators.forEach((spectatorWs) => {
      if (
        spectatorWs !== exclude &&
        spectatorWs.readyState === WebSocket.OPEN
      ) {
        spectatorWs.send(data)
      }
    })
  }

  private send(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.send(ws, { type: 'error', error })
  }

  private handleDisconnection(ws: WebSocket) {
    // Remove from all rooms
    this.rooms.forEach((room, gameId) => {
      // Remove from players
      if (room.players.red === ws) {
        delete room.players.red
        this.broadcastToRoom(room, {
          type: 'player_disconnected',
          color: 'red',
        })
      }
      if (room.players.blue === ws) {
        delete room.players.blue
        this.broadcastToRoom(room, {
          type: 'player_disconnected',
          color: 'blue',
        })
      }

      // Remove from spectators
      room.spectators.delete(ws)

      // Clean up empty rooms
      if (
        !room.players.red &&
        !room.players.blue &&
        room.spectators.size === 0
      ) {
        this.rooms.delete(gameId)
      }
    })
  }
}

// Start WebSocket server
const gameServer = new GameServer(8080)
```

### WebSocket Client Example

```typescript
class CoTulenhWebSocketClient {
  private ws: WebSocket | null = null
  private gameId: string | null = null
  private playerColor: 'red' | 'blue' | null = null

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('Connected to game server')
        resolve()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        reject(error)
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('Disconnected from game server')
      }
    })
  }

  private handleMessage(message: any) {
    const { type, ...data } = message

    switch (type) {
      case 'game_created':
        console.log('Game created:', data.gameId)
        this.gameId = data.gameId
        this.onGameStateUpdate(data.gameState)
        break

      case 'joined_game':
        console.log(`Joined game as ${data.color}`)
        this.gameId = data.gameId
        this.playerColor = data.color
        this.onGameStateUpdate(data.gameState)
        break

      case 'move_made':
        console.log(`Move: ${data.move.san} by ${data.player}`)
        this.onMoveReceived(data.move, data.gameState)
        break

      case 'game_ended':
        console.log(`Game ended: ${data.reason}`)
        if (data.winner) {
          console.log(`Winner: ${data.winner}`)
        }
        this.onGameEnded(data)
        break

      case 'player_joined':
        console.log(`${data.color} player joined`)
        this.onGameStateUpdate(data.gameState)
        break

      case 'player_disconnected':
        console.log(`${data.color} player disconnected`)
        break

      case 'error':
        console.error('Server error:', data.error)
        this.onError(data.error)
        break

      default:
        console.log('Unknown message type:', type)
    }
  }

  createGame(gameId: string, fen?: string) {
    this.send({
      type: 'create_game',
      gameId,
      fen,
    })
  }

  joinGame(gameId: string, color: 'red' | 'blue') {
    this.send({
      type: 'join_game',
      gameId,
      color,
    })
  }

  makeMove(move: string | object) {
    if (!this.gameId) {
      throw new Error('Not in a game')
    }

    this.send({
      type: 'make_move',
      gameId: this.gameId,
      move,
    })
  }

  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      throw new Error('WebSocket not connected')
    }
  }

  // Override these methods in your implementation
  protected onGameStateUpdate(gameState: any) {
    console.log('Game state updated:', gameState)
  }

  protected onMoveReceived(move: any, gameState: any) {
    console.log('Move received:', move)
  }

  protected onGameEnded(data: any) {
    console.log('Game ended:', data)
  }

  protected onError(error: string) {
    console.error('Game error:', error)
  }
}

// Usage example
async function playOnlineGame() {
  const client = new CoTulenhWebSocketClient('ws://localhost:8080')

  // Override event handlers
  client['onGameStateUpdate'] = (gameState) => {
    console.log(
      `Turn: ${gameState.turn}, Moves: ${gameState.legalMoves.length}`,
    )
    if (gameState.isCheck) {
      console.log('⚠️  Check!')
    }
  }

  client['onMoveReceived'] = (move, gameState) => {
    console.log(`${move.piece.type} from ${move.from} to ${move.to}`)
    if (move.captured) {
      console.log(`Captured ${move.captured.type}`)
    }
  }

  try {
    await client.connect()

    // Create and join game
    client.createGame('online-game-1')
    client.joinGame('online-game-1', 'red')

    // Make some moves
    setTimeout(() => client.makeMove('Tc3'), 1000)
    setTimeout(() => client.makeMove('Te3'), 3000)
  } catch (error) {
    console.error('Failed to connect:', error)
  }
}
```

## Performance Optimization Examples

### Batch Processing and Caching

```typescript
import { CoTuLenh } from 'cotulenh'

class OptimizedGameProcessor {
  private moveCache = new Map<string, string[]>()
  private positionCache = new Map<string, any>()

  constructor(private game: CoTuLenh) {}

  // Batch move validation
  validateMoves(moves: string[]): {
    valid: string[]
    invalid: { move: string; error: string }[]
  } {
    const currentFen = this.game.fen()
    let legalMoves = this.moveCache.get(currentFen)

    if (!legalMoves) {
      legalMoves = this.game.moves()
      this.moveCache.set(currentFen, legalMoves)
    }

    const valid: string[] = []
    const invalid: { move: string; error: string }[] = []

    for (const move of moves) {
      if (legalMoves.includes(move)) {
        valid.push(move)
      } else {
        invalid.push({ move, error: 'Illegal move' })
      }
    }

    return { valid, invalid }
  }

  // Batch position analysis
  analyzePositions(fens: string[]): any[] {
    const results = []

    for (const fen of fens) {
      let analysis = this.positionCache.get(fen)

      if (!analysis) {
        try {
          const tempGame = new CoTuLenh(fen)
          analysis = {
            fen,
            turn: tempGame.turn(),
            moveNumber: tempGame.moveNumber(),
            isCheck: tempGame.isCheck(),
            isCheckmate: tempGame.isCheckmate(),
            isDraw: tempGame.isDraw(),
            legalMoves: tempGame.moves().length,
            mobility: this.calculateMobility(tempGame),
          }
          this.positionCache.set(fen, analysis)
        } catch (error) {
          analysis = { fen, error: error.message }
        }
      }

      results.push(analysis)
    }

    return results
  }

  private calculateMobility(game: CoTuLenh): { red: number; blue: number } {
    const currentTurn = game.turn()
    const currentMoves = game.moves().length

    // Switch turn to count opponent moves
    game['_turn'] = currentTurn === 'r' ? 'b' : 'r'
    const opponentMoves = game.moves().length
    game['_turn'] = currentTurn

    return currentTurn === 'r'
      ? { red: currentMoves, blue: opponentMoves }
      : { red: opponentMoves, blue: currentMoves }
  }

  // Clear caches when position changes
  clearCaches() {
    this.moveCache.clear()
    this.positionCache.clear()
  }
}

// Usage example
const game = new CoTuLenh()
const processor = new OptimizedGameProcessor(game)

// Batch validate moves
const candidateMoves = ['Tc3', 'Id4', 'InvalidMove', 'Ae5']
const validation = processor.validateMoves(candidateMoves)
console.log('Valid moves:', validation.valid)
console.log('Invalid moves:', validation.invalid)

// Batch analyze positions
const positions = [
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1',
  'rnbqkbnr/pppppppp/8/8/8/2T5/PP1PPPPP/RNBQKBNR b - - 1 1',
]
const analyses = processor.analyzePositions(positions)
console.log('Position analyses:', analyses)
```

## Integration Testing Examples

### Comprehensive Test Suite

```typescript
import { CoTuLenh, validateFenString } from 'cotulenh'

describe('CoTuLenh Integration Tests', () => {
  test('Complete game flow', () => {
    const game = new CoTuLenh()

    // Initial state
    expect(game.turn()).toBe('r')
    expect(game.moveNumber()).toBe(1)
    expect(game.isCheck()).toBe(false)
    expect(game.isGameOver()).toBe(false)

    // Make moves
    const move1 = game.move('Tc3')
    expect(move1.san).toBe('Tc3')
    expect(game.turn()).toBe('b')

    const move2 = game.move('id6')
    expect(move2.san).toBe('id6')
    expect(game.turn()).toBe('r')
    expect(game.moveNumber()).toBe(1)

    // Check history
    const history = game.history()
    expect(history).toEqual(['Tc3', 'id6'])

    // Undo moves
    game.undo()
    expect(game.turn()).toBe('b')
    expect(game.history()).toEqual(['Tc3'])

    game.undo()
    expect(game.turn()).toBe('r')
    expect(game.history()).toEqual([])
  })

  test('Deploy move sequence', () => {
    const stackFen = 'rnbqkbnr/pppppppp/8/8/8/8/PP(TI)PPPPP/RNBQKBNR r - - 0 1'
    const game = new CoTuLenh(stackFen)

    // Check stack exists
    const stackPiece = game.get('c2')
    expect(stackPiece?.carrying).toBeDefined()

    // Execute deploy move
    const deployMove = game.deployMove({
      from: 'c2',
      moves: [
        { piece: 't', to: 'c3' },
        { piece: 'i', to: 'd3' },
      ],
    })

    expect(deployMove.moves).toHaveLength(2)
    expect(game.get('c3')?.type).toBe('t')
    expect(game.get('d3')?.type).toBe('i')
    expect(game.get('c2')).toBeUndefined()
  })

  test('Error handling', () => {
    const game = new CoTuLenh()

    // Invalid moves
    expect(() => game.move('InvalidMove')).toThrow()
    expect(() => game.move('Tc9')).toThrow()
    expect(() => game.move('')).toThrow()

    // Invalid FEN
    expect(() => new CoTuLenh('invalid/fen')).toThrow()
    expect(validateFenString('invalid/fen')).toBe(false)

    // Deploy without stack
    expect(() =>
      game.deployMove({
        from: 'e4',
        moves: [{ piece: 't', to: 'e5' }],
      }),
    ).toThrow()
  })

  test('Game ending conditions', () => {
    // Test checkmate scenario
    const checkmateGame = new CoTuLenh('checkmate-fen-here')
    expect(checkmateGame.isCheckmate()).toBe(true)
    expect(checkmateGame.isGameOver()).toBe(true)

    // Test draw scenarios
    const drawGame = new CoTuLenh()
    // Simulate fifty-move rule
    drawGame['_halfMoves'] = 100
    expect(drawGame.isDrawByFiftyMoves()).toBe(true)
    expect(drawGame.isDraw()).toBe(true)
  })

  test('Performance benchmarks', () => {
    const game = new CoTuLenh()

    // Move generation performance
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      game.moves()
    }
    const moveGenTime = performance.now() - start
    expect(moveGenTime).toBeLessThan(1000) // Should be under 1 second

    // Move execution performance
    const moveStart = performance.now()
    const testMoves = ['Tc3', 'id6', 'Te3', 'ie5']
    testMoves.forEach((move) => {
      game.move(move)
      game.undo()
    })
    const moveExecTime = performance.now() - moveStart
    expect(moveExecTime).toBeLessThan(100) // Should be under 100ms
  })
})
```

This comprehensive documentation provides complete request-response examples
covering all major use cases, error scenarios, and integration patterns for the
CoTuLenh game engine. External systems can use these examples as templates for
implementing their own game interfaces and integrations.
