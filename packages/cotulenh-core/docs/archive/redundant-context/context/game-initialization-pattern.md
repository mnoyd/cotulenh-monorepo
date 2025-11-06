# Game Initialization Pattern

## Overview

The CoTuLenh game engine provides multiple initialization patterns for creating
and setting up game instances. This document details the complete game
initialization process, including constructor usage, FEN loading, validation,
error handling, and configuration options.

## Constructor Pattern

### Basic Constructor

```typescript
import { CoTuLenh } from 'cotulenh'

// Initialize with default starting position
const game = new CoTuLenh()

// Initialize with custom FEN string
const customFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1'
const game = new CoTuLenh(customFen)
```

**Constructor Signature:**

```typescript
constructor(fen: string = DEFAULT_POSITION)
```

**Parameters:**

- `fen` (optional): FEN string representing the initial position. Defaults to
  `DEFAULT_POSITION` if not provided.

**Behavior:**

- Automatically calls `load(fen)` internally
- Throws error if FEN is invalid
- Sets up all internal game state including board, turn, move counters, and air
  defense systems

## FEN Loading Process

### Load Method

The `load()` method is the core initialization mechanism that parses FEN strings
and sets up the game state.

```typescript
game.load(fen, options?)
```

**Method Signature:**

```typescript
load(fen: string, options?: {
  skipValidation?: boolean
  preserveHeaders?: boolean
}): void
```

**Parameters:**

- `fen`: FEN string to load
- `options.skipValidation` (optional): Skip FEN format validation (default:
  false)
- `options.preserveHeaders` (optional): Preserve existing game headers (default:
  false)

### FEN Parsing Process

The FEN loading process follows these steps:

1. **Clear Current State**: Resets board, move history, and game state
2. **Parse FEN Components**: Splits FEN into tokens (position, turn, castling,
   en passant, half-moves, move number)
3. **Validate Format**: Checks FEN structure and component validity (unless
   `skipValidation: true`)
4. **Parse Board Position**: Processes piece placement with stack notation
   support
5. **Set Game State**: Updates turn, move counters, and position tracking
6. **Update Air Defense**: Recalculates air defense zones based on piece
   positions

### Extended FEN Format Support

CoTuLenh supports extended FEN format with stack notation:

```typescript
// Standard piece placement
'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1'

// Stack notation with carrying pieces
'rn(ti)qkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1'

// Heroic pieces with + marker
'rn+tqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1'

// Combined stack and heroic notation
'rn(+ti)qkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1'
```

**Stack Notation Rules:**

- Parentheses `()` indicate piece stacks
- Multiple pieces within parentheses represent carried pieces
- `+` prefix indicates heroic status
- Pieces are processed in order within stacks

## Board Clearing

### Clear Method

The `clear()` method resets the game to an empty state.

```typescript
game.clear(options?)
```

**Method Signature:**

```typescript
clear(options?: {
  preserveHeaders?: boolean
}): void
```

**Reset Operations:**

- Clears move cache
- Empties board array (256 elements)
- Resets commander positions to -1
- Sets turn to RED
- Resets move counters (half-moves: 0, move number: 1)
- Clears move history
- Clears position counts
- Resets air defense systems
- Optionally preserves or clears game headers

## Initialization Validation

### FEN Validation Process

The engine performs comprehensive FEN validation:

1. **Structure Validation**: Checks token count and format
2. **Rank Validation**: Ensures 12 ranks for 11x12 board
3. **Square Count Validation**: Verifies each rank has correct square count
4. **Piece Validation**: Validates piece symbols and colors
5. **Stack Validation**: Checks parentheses matching and stack format
6. **Heroic Validation**: Ensures + markers are properly placed
7. **Game State Validation**: Validates turn, move counters

### Error Conditions

Common initialization errors and their causes:

```typescript
// Invalid rank count
throw new Error(`Invalid FEN: expected 12 ranks, got ${ranks.length}`)

// Too many squares in rank
throw new Error(`Invalid FEN: rank ${12 - r} has too many squares`)

// Unmatched parentheses
throw new Error(`Invalid FEN: ) without matching ( in rank ${12 - r}`)

// Orphaned heroic marker
throw new Error(`Invalid FEN: + without matching ( in rank ${12 - r}`)
```

## Default Position Setup

### Default Starting Position

The engine includes a predefined starting position:

```typescript
import { DEFAULT_POSITION } from 'cotulenh'

const game = new CoTuLenh(DEFAULT_POSITION)
```

**Default Position Features:**

- Standard CoTuLenh piece arrangement
- RED to move first
- No heroic pieces initially
- Move counters at starting values
- Proper terrain zone setup

## Configuration Options

### Game Headers

The engine supports game metadata through headers:

```typescript
// Headers are automatically set during initialization
game._header['SetUp'] = '1' // Indicates custom setup
game._header['FEN'] = currentFen // Current position FEN
```

### Position Counting

Automatic position tracking for repetition detection:

```typescript
// Position counts updated automatically
this._positionCount[fen] = (this._positionCount[fen] || 0) + 1
```

### Air Defense System

Automatic air defense calculation during initialization:

```typescript
// Air defense zones calculated based on piece positions
this._airDefense = updateAirDefensePiecesPosition(this)
```

## Usage Examples

### Basic Game Setup

```typescript
import { CoTuLenh } from 'cotulenh'

// Create new game with default position
const game = new CoTuLenh()
console.log(game.fen()) // Current position
console.log(game.turn()) // Current turn (RED)
```

### Custom Position Setup

```typescript
// Load specific position
const customFen = 'custom/position/here r - - 0 1'
const game = new CoTuLenh(customFen)

// Or load after creation
const game = new CoTuLenh()
game.load(customFen)
```

### Position Validation

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

### Error Handling

```typescript
try {
  const game = new CoTuLenh(invalidFen)
} catch (error) {
  console.error('Failed to initialize game:', error.message)
  // Handle initialization failure
}
```

### Preserving Game State

```typescript
// Clear board but keep headers
game.clear({ preserveHeaders: true })

// Load new position but keep headers
game.load(newFen, { preserveHeaders: true })
```

## Integration Patterns

### Web Application Integration

```typescript
class GameManager {
  private game: CoTuLenh

  constructor(initialFen?: string) {
    this.game = new CoTuLenh(initialFen)
  }

  resetGame(fen?: string) {
    if (fen) {
      this.game.load(fen)
    } else {
      this.game = new CoTuLenh()
    }
  }

  getCurrentState() {
    return {
      fen: this.game.fen(),
      turn: this.game.turn(),
      moveNumber: this.game.moveNumber(),
      isGameOver: this.game.isGameOver(),
    }
  }
}
```

### Server-Side Game Creation

```typescript
// Express.js endpoint example
app.post('/api/game/create', (req, res) => {
  try {
    const { fen } = req.body
    const game = new CoTuLenh(fen)

    res.json({
      success: true,
      gameState: {
        fen: game.fen(),
        turn: game.turn(),
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
```

## Performance Considerations

### Initialization Cost

- FEN parsing is O(n) where n is the FEN string length
- Board setup is O(1) for fixed 11x12 board
- Air defense calculation is O(pieces) for piece count
- Move cache is cleared on initialization

### Memory Usage

- Board array: 256 elements (fixed size)
- Move cache: LRU cache with 1000 entry limit
- Position counts: Grows with unique positions
- History: Grows with move count

### Optimization Tips

```typescript
// Skip validation for trusted FEN sources
game.load(trustedFen, { skipValidation: true })

// Reuse game instances instead of creating new ones
game.clear()
game.load(newFen)

// Validate FEN before creating game instances
if (validateFenString(fen)) {
  const game = new CoTuLenh(fen)
}
```
