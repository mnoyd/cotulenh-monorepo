# FEN Format Construction

## Overview

CoTuLenh uses an extended FEN (Forsyth-Edwards Notation) format that builds upon
standard chess FEN to accommodate the unique features of the game, including:

- 11x12 board dimensions
- Stack notation for combined pieces
- Heroic piece markers
- Extended piece types (11 total)

## FEN Structure

The CoTuLenh FEN format follows the standard 6-field structure:

```
<piece-placement> <active-color> <castling> <en-passant> <halfmove-clock> <fullmove-number>
```

### Field 1: Piece Placement

#### Board Representation

- **Dimensions**: 11x12 board (11 files a-k, 12 ranks 1-12)
- **Rank Separation**: Forward slashes (/) separate ranks from rank 12 (top) to
  rank 1 (bottom)
- **Empty Squares**: Numbers 1-11 represent consecutive empty squares

#### Piece Symbols

Standard piece symbols with case indicating color:

- **Uppercase**: Red pieces (R, B, C, T, M, E, A, I, F, N, H)
- **Lowercase**: Blue pieces (r, b, c, t, m, e, a, i, f, n, h)

Piece type mapping:

- `C/c` - COMMANDER
- `I/i` - INFANTRY
- `T/t` - TANK
- `M/m` - MILITIA
- `E/e` - ENGINEER
- `A/a` - ARTILLERY
- `B/b` - ANTI_AIR
- `S/s` - MISSILE
- `F/f` - AIR_FORCE
- `N/n` - NAVY
- `H/h` - HEADQUARTER

#### Stack Notation (NFT Format)

Combined pieces use parentheses notation:

```
(NFT) - Navy carrying Infantry, Tank, and Militia
(TC) - Tank carrying Commander
```

**Stack Rules**:

- First piece in parentheses is the carrier (determines movement)
- Subsequent pieces are carried pieces
- No spaces between pieces in stack notation
- Stack can contain multiple pieces if combination rules allow

#### Heroic Piece Markers

Heroic pieces are marked with `+` prefix:

```
+C - Heroic Commander
+T - Heroic Tank
(+NI) - Heroic Navy carrying Infantry
```

**Heroic Rules**:

- `+` appears immediately before the piece symbol
- Applies to individual pieces within stacks
- Heroic status affects movement and capture ranges

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

## FEN Generation Algorithm

### Board Scanning Process

```typescript
fen(): string {
  let empty = 0
  let fen = ''

  // Scan from a12 to k1 (top-left to bottom-right)
  for (let i = SQUARE_MAP.a12; i <= SQUARE_MAP.k1 + 1; i++) {
    if (isSquareOnBoard(i)) {
      if (this._board[i]) {
        // Add empty square count if any
        if (empty > 0) {
          fen += empty
          empty = 0
        }

        // Generate piece notation
        const piece = this._board[i]!
        const san = makeSanPiece(piece, false)
        const toCorrectCase = piece.color === RED ? san : san.toLowerCase()
        fen += toCorrectCase
      } else {
        empty++
      }
    } else {
      // End of rank - add empty count and rank separator
      if (file(i) === 11) {
        if (empty > 0) {
          fen += empty
        }
        empty = 0
        if (i !== SQUARE_MAP.k1 + 1) {
          fen += '/'
        }
      }
    }
  }

  // Combine with other FEN fields
  return [
    fen,
    this._turn,
    '-', // castling
    '-', // en passant
    this._halfMoves,
    this._moveNumber,
  ].join(' ')
}
```

### Piece Notation Generation

```typescript
function makeSanPiece(combinedPiece: Piece, delimiter = false): string {
  const carrier = makeSanSinglePiece(combinedPiece)
  if (!combinedPiece.carrying?.length) return carrier

  const stack = combinedPiece.carrying?.map(makeSanSinglePiece).join('') || ''
  return `(${carrier}${delimiter ? '|' : ''}${stack})`
}

function makeSanSinglePiece(piece: Piece): string {
  const symbol = piece.type.toUpperCase()
  const heroic = piece.heroic ? '+' : ''
  return heroic + symbol
}
```

## FEN Parsing Algorithm

### Parsing Process

```typescript
load(fen: string) {
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

        this.put(piece, algebraic(r * 16 + col), true)
        if (!parsingStack) {
          col++
        }
        nextHeroic = false
      }
    }
  }

  // Parse game state
  this._turn = (tokens[1] as Color) || RED
  this._halfMoves = parseInt(tokens[4], 10) || 0
  this._moveNumber = parseInt(tokens[5], 10) || 1
}
```

## Example FEN Strings

### Starting Position

```
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1
```

### Position with Stacks

```
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/5(TC)4 r - - 0 1
```

### Position with Heroic Pieces

```
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/5+C4 r - - 0 1
```

### Complex Position

```
6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/(+NI)5+C4 b - - 15 8
```

## State Encoding Details

### Turn Management

- `_turn` field tracks current player (RED or BLUE)
- Switches after each non-deploy move
- Remains same during deploy sequences

### Move Counting

- `_halfMoves`: Increments each half-move, resets on capture
- `_moveNumber`: Increments after Blue's move
- Used for draw conditions (50-move rule, repetition)

### Position Tracking

```typescript
private _updatePositionCounts(): void {
  const fen = this.fen()

  // Update position count for threefold repetition detection
  if (!(fen in this._positionCount)) {
    this._positionCount[fen] = 0
  }
  this._positionCount[fen]++

  // Update setup flags
  this._header['SetUp'] = '1'
  this._header['FEN'] = fen
}
```

## Validation Rules

### Format Validation

- Exactly 6 space-separated fields
- 12 ranks separated by forward slashes
- Valid piece symbols and stack notation
- Proper heroic marker placement
- Correct empty square counts

### Semantic Validation

- Maximum one commander per color
- Pieces on appropriate terrain (navy on water, others on land)
- Valid piece combinations in stacks
- Consistent turn and move number relationship

## Error Handling

### Common Parsing Errors

- Invalid rank count: `Invalid FEN: expected 12 ranks, got X`
- Unmatched parentheses: `Invalid FEN: ) without matching ( in rank X`
- Orphaned heroic markers: `Invalid FEN: + without matching piece in rank X`
- Invalid square counts: `Invalid FEN: rank X has too many squares`

### Recovery Strategies

- Strict validation can be disabled with `skipValidation: true`
- Partial FEN loading with default values for missing fields
- Error reporting with specific rank and position information
