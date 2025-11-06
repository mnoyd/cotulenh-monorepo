# CoTuLenh Data Formats - Complete Reference

## Table of Contents

1. [Overview](#overview)
2. [FEN (Forsyth-Edwards Notation)](#fen-forsyth-edwards-notation)
3. [SAN (Standard Algebraic Notation)](#san-standard-algebraic-notation)
4. [Internal Data Representation](#internal-data-representation)
5. [Extended Formats](#extended-formats)
6. [Parsing and Generation](#parsing-and-generation)
7. [Error Handling](#error-handling)
8. [Examples and Use Cases](#examples-and-use-cases)

---

## Overview

CoTuLenh uses extended versions of standard chess notation formats to
accommodate its unique features:

- **11×12 board** instead of 8×8
- **11 piece types** instead of 6
- **Stack notation** for combined pieces
- **Heroic markers** for enhanced pieces
- **Deploy moves** for stack deployment
- **Multiple capture types** (normal, stay, suicide)

### Format Compatibility

- **Standard Compliance**: Based on established chess notation standards
- **Extensions**: Additional syntax for CoTuLenh-specific features
- **Backward Compatibility**: Standard chess tools can parse basic structure
- **Forward Compatibility**: Designed to accommodate future enhancements

---

## FEN (Forsyth-Edwards Notation)

### Standard FEN Structure

CoTuLenh FEN follows the standard 6-field format:

```
<piece-placement> <active-color> <castling> <en-passant> <halfmove-clock> <fullmove-number>
```

### Field 1: Piece Placement

#### Board Dimensions

- **Size**: 11 files (a-k) × 12 ranks (1-12)
- **Rank Order**: Rank 12 (top) to Rank 1 (bottom)
- **File Order**: Files a through k (left to right)
- **Separators**: Forward slashes (/) separate ranks

#### Piece Symbols

**Standard Pieces**:

- `C/c` - COMMANDER (King equivalent)
- `I/i` - INFANTRY (Pawn equivalent)
- `T/t` - TANK
- `M/m` - MILITIA
- `E/e` - ENGINEER
- `A/a` - ARTILLERY
- `B/b` - ANTI_AIR (Anti-Aircraft)
- `S/s` - MISSILE
- `F/f` - AIR_FORCE
- `N/n` - NAVY
- `H/h` - HEADQUARTER

**Case Convention**:

- **Uppercase**: Red pieces (R, B, C, T, M, E, A, I, F, N, H)
- **Lowercase**: Blue pieces (r, b, c, t, m, e, a, i, f, n, h)

#### Stack Notation

Combined pieces use parentheses notation:

```
(NFT) - Navy carrying Air Force and Tank
(TC)  - Tank carrying Commander
(+NI) - Heroic Navy carrying Infantry
```

**Stack Rules**:

- First piece in parentheses is the **carrier** (determines movement)
- Subsequent pieces are **carried pieces**
- No spaces between pieces within parentheses
- Heroic markers apply to individual pieces within stacks

#### Heroic Piece Markers

Heroic pieces are marked with `+` prefix:

```
+C    - Heroic Commander
+T    - Heroic Tank
(+NI) - Heroic Navy carrying Infantry
(N+I) - Navy carrying Heroic Infantry
```

#### Empty Squares

Numbers 1-11 represent consecutive empty squares:

```
3     - Three empty squares
11    - Eleven empty squares (entire rank)
2T3   - Two empty, Tank, three empty
```

### Field 2: Active Color

- `r` - Red to move
- `b` - Blue to move

### Field 3: Castling Availability

- Always `-` (no castling in CoTuLenh)

### Field 4: En Passant Target Square

- Always `-` (no en passant in CoTuLenh)

### Field 5: Halfmove Clock

- Number of half-moves since last capture or commander move
- Resets to 0 on capture or commander movement
- Used for 50-move rule (100 half-moves)

### Field 6: Fullmove Number

- Increments after Blue's move
- Starts at 1 for game beginning

### FEN Examples

#### Starting Position

```
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1
```

#### Position with Stacks

```
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/5(TC)4 r - - 0 1
```

#### Position with Heroic Pieces

```
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/5+C4 r - - 0 1
```

#### Complex Position

```
(+NI)5+C4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6c4 b - - 15 8
```

### Extended FEN (Deploy Sessions)

During active deployment, FEN includes deploy session information:

```
base-fen r - - 0 1 DEPLOY c3:(FT)<Nc5...
```

**Format**: `DEPLOY <square>:<stay-pieces><moves>...`

- `c3:` - Original stack square
- `(FT)<` - Air Force and Tank stay at origin
- `Nc5` - Navy deployed to c5
- `...` - Session incomplete marker

---

## SAN (Standard Algebraic Notation)

### Basic SAN Structure

```
<piece><disambiguator><separator><destination><combination><check>
```

### Components

#### Piece Notation

- **Basic Pieces**: C, I, T, M, E, A, B, S, F, N, H
- **Heroic Pieces**: +C, +T, +F, etc.
- **Stacks**: (NI), (TC), (+NI), etc.

#### Disambiguators

When multiple pieces can move to the same square:

```
Tac4  - Tank from 'a' file to c4
T2c4  - Tank from rank 2 to c4
Ta2c4 - Tank from a2 to c4 (full square)
```

#### Movement Separators

**Basic Movement**:

- No separator for normal moves: `Ce4`, `Td5`

**Capture Types**:

- `x` - Normal capture (move to target square)
- `_` - Stay capture (capture without moving)
- `@` - Suicide capture (both pieces destroyed)

**Special Moves**:

- `>` - Deploy move (piece deployed from stack)
- `&` - Combination move (pieces combine into stack)

**Combined Separators**:

- `>x` - Deploy with capture
- `&x` - Combination with capture

#### Check and Checkmate Indicators

- `^` - Check (commander under attack)
- `#` - Checkmate (commander under attack with no legal moves)

### SAN Examples

#### Basic Moves

```
Ce4         - Commander to e4
Td5         - Tank to d5
+Cf6        - Heroic Commander to f6
(NI)d4      - Navy-Infantry stack to d4
```

#### Captures

```
Cxe4        - Commander captures on e4
T_d5        - Tank stay-captures on d5
F@e4        - Air Force suicide-captures on e4
```

#### Deploy Moves

```
I>d4         - Infantry deploys to d4
T<I>d4       - Tank stays, Infantry deploys to d4
I>d4,T>e4    - Infantry to d4, Tank to e4
(TI)<T>xd4   - Infantry stays, Tank deploys and captures on d4
```

#### Combination Moves

```
T&e4(TI)     - Tank combines with Infantry at e4
I&xd4(IT)    - Infantry captures and combines at d4
```

#### Complex Examples

```
+T2xe4^      - Heroic Tank from rank 2 captures on e4, giving check
(+NI)a<I>xd4# - Infantry from Heroic Navy-Infantry stack captures on d4, checkmate
T<I>d4,M>e4   - Tank stays, Infantry to d4, Militia to e4
```

### Long Algebraic Notation (LAN)

LAN includes the origin square for all moves:

```
Ce1-e4      - Commander from e1 to e4
Td2xe4      - Tank from d2 captures on e4
Id2>e4      - Infantry deploys from d2 to e4
```

---

## Internal Data Representation

### Internal Move Structure

```typescript
interface InternalMove {
  color: Color // RED or BLUE
  from: number // Origin square (0x88 format)
  to: number // Destination square (0x88 format)
  piece: Piece // Moving piece (including stacks)
  captured?: Piece // Captured piece (if any)
  flags: number // Move type flags (BITS enum)
}
```

### Move Flags (BITS)

```typescript
export const BITS = {
  NORMAL: 1, // 0b00000001
  CAPTURE: 2, // 0b00000010
  STAY_CAPTURE: 4, // 0b00000100
  SUICIDE_CAPTURE: 8, // 0b00001000
  DEPLOY: 16, // 0b00010000
  COMBINATION: 32, // 0b00100000
}
```

### Piece Structure

```typescript
interface Piece {
  type: PieceSymbol // Piece type ('c', 'i', 't', etc.)
  color: Color // RED ('r') or BLUE ('b')
  heroic?: boolean // Heroic status
  carrying?: Piece[] // Carried pieces (for stacks)
}
```

### Deploy Move Structure

```typescript
interface InternalDeployMove {
  from: number // Stack's original square
  moves: InternalMove[] // Individual piece movements
  stay?: Piece // Pieces remaining at origin
  captured?: Piece[] // Pieces captured during deployment
}
```

---

## Extended Formats

### Deploy Move Notation

#### Basic Deploy Format

```
<stay_pieces><move_pieces>
```

#### Stay Notation

Pieces remaining at the original square:

```
T<          - Tank stays at current square
(NI)<       - Navy-Infantry stack stays
```

#### Move Notation

Pieces moving to new squares:

```
I>d4        - Infantry deploys to d4
T>xd4       - Tank deploys and captures on d4
```

#### Combined Deploy Examples

```
T<I>d4              - Tank stays, Infantry deploys to d4
(NI)<T>d4           - Navy-Infantry stays, Tank deploys to d4
I>d4,T>e4           - Infantry to d4, Tank to e4
(TI)<T>xd4          - Infantry stays, Tank deploys and captures on d4
```

### Combination Move Notation

#### Basic Combination Format

```
<piece><separator><destination><result_stack>
```

#### Examples

```
T&e6(TI)    - Tank combines with Infantry at e6, forming Tank-Infantry stack
I&d4(IT)    - Infantry combines with Tank at d4, forming Infantry-Tank stack
T&xe6(TI)   - Tank captures and combines at e6, forming Tank-Infantry stack
```

---

## Parsing and Generation

### FEN Parsing Algorithm

```typescript
function parseFEN(fen: string): GameState {
  const tokens = fen.split(/\s+/)
  const position = tokens[0]

  // Parse board position
  const ranks = position.split('/')
  if (ranks.length !== 12) {
    throw new Error(`Invalid FEN: expected 12 ranks, got ${ranks.length}`)
  }

  let parsingStack = false
  let nextHeroic = false

  for (let r = 0; r < 12; r++) {
    let col = 0
    for (let i = 0; i < ranks[r].length; i++) {
      const char = ranks[r].charAt(i)

      if (isDigit(char)) {
        col += parseInt(char)
      } else if (char === '+') {
        nextHeroic = true
      } else if (char === '(') {
        parsingStack = true
      } else if (char === ')') {
        parsingStack = false
        col++
      } else {
        // Parse piece
        const color = char < 'a' ? RED : BLUE
        const piece = {
          type: char.toLowerCase() as PieceSymbol,
          color,
          heroic: nextHeroic,
        } as Piece

        placePiece(piece, r * 16 + col)
        if (!parsingStack) col++
        nextHeroic = false
      }
    }
  }

  // Parse game state
  return {
    turn: tokens[1] as Color,
    halfMoves: parseInt(tokens[4], 10) || 0,
    moveNumber: parseInt(tokens[5], 10) || 1,
  }
}
```

### FEN Generation Algorithm

```typescript
function generateFEN(gameState: GameState): string {
  let empty = 0
  let fen = ''

  // Process each square
  for (let i = SQUARE_MAP.a12; i <= SQUARE_MAP.k1 + 1; i++) {
    if (isSquareOnBoard(i)) {
      if (board[i]) {
        if (empty > 0) {
          fen += empty
          empty = 0
        }

        const piece = board[i]!
        const san = makeSanPiece(piece, false)
        const toCorrectCase = piece.color === RED ? san : san.toLowerCase()
        fen += toCorrectCase
      } else {
        empty++
      }
    } else if (file(i) === 11) {
      if (empty > 0) {
        fen += empty
      }
      empty = 0
      if (i !== SQUARE_MAP.k1 + 1) {
        fen += '/'
      }
    }
  }

  return [
    fen,
    gameState.turn,
    '-', // No castling
    '-', // No en passant
    gameState.halfMoves,
    gameState.moveNumber,
  ].join(' ')
}
```

### SAN Parsing Algorithm

```typescript
function parseSAN(
  san: string,
  legalMoves: InternalMove[],
): InternalMove | null {
  const cleanMove = strippedSan(san)

  // Try exact SAN/LAN matching first
  for (const move of legalMoves) {
    const [moveSan, moveLan] = moveToSanLan(move, legalMoves)
    if (
      cleanMove === strippedSan(moveSan) ||
      cleanMove === strippedSan(moveLan)
    ) {
      return move
    }
  }

  // Regex pattern for flexible parsing
  const regex =
    /^(\(.*\))?(\+)?([CITMEAGSFNH])?([a-k]?(?:1[0-2]|[1-9])?)([x<>\+&-]|>x)?([a-k](?:1[0-2]|[1-9]))([#\^]?)?$/

  const matches = cleanMove.match(regex)
  if (!matches) return null

  const [, stack, heroic, pieceType, from, flag, to, check] = matches

  // Find matching legal move by components
  return findMatchingMove(legalMoves, {
    stack,
    heroic,
    pieceType,
    from,
    flag,
    to,
    check,
  })
}
```

### SAN Generation Algorithm

```typescript
function generateSAN(
  move: InternalMove,
  legalMoves: InternalMove[],
): [string, string] {
  const pieceEncoded = makeSanPiece(move.piece)
  const disambiguator = getDisambiguator(move, legalMoves)
  const toAlg = algebraic(move.to)
  const fromAlg = algebraic(move.from)

  // Build separator string
  let separator = ''
  if (move.flags & BITS.DEPLOY) separator += '>'
  if (move.flags & BITS.STAY_CAPTURE) separator += '_'
  if (move.flags & BITS.CAPTURE) separator += 'x'
  if (move.flags & BITS.SUICIDE_CAPTURE) separator += '@'
  if (move.flags & BITS.COMBINATION) {
    separator += '&'
    const combined = createCombinedPiece(move.piece, move.combined)
    combinationSuffix = makeSanPiece(combined, true)
  }

  // Check for check/checkmate
  let checkingSuffix = ''
  // ... check detection logic

  const san = `${pieceEncoded}${disambiguator}${separator}${toAlg}${combinationSuffix}${checkingSuffix}`
  const lan = `${pieceEncoded}${fromAlg}${separator}${toAlg}${combinationSuffix}${checkingSuffix}`

  return [san, lan]
}
```

---

## Error Handling

### FEN Validation Errors

```typescript
// Common FEN parsing errors
class FENError extends Error {
  constructor(
    message: string,
    public fen: string,
    public position?: number,
  ) {
    super(message)
  }
}

// Specific error types
throw new FENError(`Invalid FEN: expected 12 ranks, got ${ranks.length}`, fen)
throw new FENError(`Invalid FEN: rank ${12 - r} has too many squares`, fen, r)
throw new FENError(
  `Invalid FEN: ) without matching ( in rank ${12 - r}`,
  fen,
  r,
)
throw new FENError(
  `Invalid FEN: + without matching piece in rank ${12 - r}`,
  fen,
  r,
)
```

### SAN Validation Errors

```typescript
// Common SAN parsing errors
class SANError extends Error {
  constructor(
    message: string,
    public san: string,
    public context?: any,
  ) {
    super(message)
  }
}

// Specific error types
throw new SANError(`Invalid or illegal move: ${san}`, san)
throw new SANError(`Ambiguous move: multiple matches for ${san}`, san, matches)
throw new SANError(`No matching legal move found: ${san}`, san)
throw new SANError(`Invalid square in move: ${san}`, san, { square })
```

### Recovery Strategies

```typescript
// Graceful error handling
function safeParseFEN(fen: string): GameState | null {
  try {
    return parseFEN(fen)
  } catch (error) {
    console.error('FEN parsing failed:', error.message)
    return null
  }
}

function safeParseSAN(
  san: string,
  legalMoves: InternalMove[],
): InternalMove | null {
  try {
    return parseSAN(san, legalMoves)
  } catch (error) {
    console.error('SAN parsing failed:', error.message)
    return null
  }
}

// Validation before parsing
function validateFEN(fen: string): boolean {
  const tokens = fen.split(/\s+/)
  if (tokens.length !== 6) return false

  const ranks = tokens[0].split('/')
  if (ranks.length !== 12) return false

  // Additional validation...
  return true
}
```

---

## Examples and Use Cases

### Game Initialization

```typescript
// Load starting position
const game = new CoTuLenh()
console.log(game.fen())
// Output: 6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1

// Load custom position
const customFEN =
  '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/5(TC)4 r - - 0 1'
const game = new CoTuLenh(customFEN)
```

### Move Execution and Notation

```typescript
// Execute moves with different notations
const move1 = game.move('Tc3') // Basic SAN
const move2 = game.move('T2xd4') // Disambiguated capture
const move3 = game.move('I>e4') // Deploy move
const move4 = game.move('T&f4(TI)') // Combination move

// Get move information
console.log(move1.san) // "Tc3"
console.log(move1.lan) // "Tc2c3"
console.log(move1.before) // FEN before move
console.log(move1.after) // FEN after move
```

### Game Analysis

```typescript
// Analyze position
const moves = game.moves()
console.log(`${moves.length} legal moves available`)

// Get verbose move information
const verboseMoves = game.moves({ verbose: true })
verboseMoves.forEach((move) => {
  console.log(`${move.san}: ${move.piece.type} from ${move.from} to ${move.to}`)
  if (move.captured) {
    console.log(`  Captures: ${move.captured.type}`)
  }
})

// Game history
const history = game.history()
console.log('Game moves:', history.join(' '))

const verboseHistory = game.history({ verbose: true })
verboseHistory.forEach((move, index) => {
  console.log(`${index + 1}. ${move.san} (${move.before} -> ${move.after})`)
})
```

### Position Serialization

```typescript
// Save and restore positions
const savedPosition = game.fen()
console.log('Saved position:', savedPosition)

// Later...
const restoredGame = new CoTuLenh(savedPosition)
console.log('Position restored:', restoredGame.fen() === savedPosition)

// Export game in PGN-like format
function exportGame(game: CoTuLenh): string {
  const history = game.history()
  const moves = []

  for (let i = 0; i < history.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1
    const redMove = history[i]
    const blueMove = history[i + 1] || ''
    moves.push(`${moveNumber}. ${redMove} ${blueMove}`)
  }

  return moves.join(' ')
}
```

### Data Validation

```typescript
// Validate data formats
function validateGameData(data: any): boolean {
  // Validate FEN
  if (data.fen && !validateFEN(data.fen)) {
    console.error('Invalid FEN:', data.fen)
    return false
  }

  // Validate moves
  if (data.moves) {
    const game = new CoTuLenh(data.fen)
    for (const moveStr of data.moves) {
      try {
        game.move(moveStr)
      } catch (error) {
        console.error('Invalid move:', moveStr, error.message)
        return false
      }
    }
  }

  return true
}

// Convert between formats
function convertToStandardNotation(cotulenhFEN: string): string {
  // Convert CoTuLenh FEN to a more standard format for external tools
  // This might involve mapping piece types or board dimensions
  return standardFEN
}
```

This comprehensive data formats reference provides everything needed to work
with CoTuLenh's extended FEN and SAN notation systems, including parsing,
generation, validation, and practical usage examples.
