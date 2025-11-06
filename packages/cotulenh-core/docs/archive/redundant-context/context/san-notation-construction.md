# SAN (Standard Algebraic Notation) Construction

## Overview

CoTuLenh extends Standard Algebraic Notation (SAN) to accommodate the unique
features of the game, including:

- Stack notation for combined pieces
- Deploy moves from stacks
- Multiple capture types (normal, stay, suicide)
- Heroic piece indicators
- Combination moves

## Basic SAN Structure

### Standard Move Format

```
<piece><disambiguator><separator><destination><combination><check>
```

### Components Breakdown

- **Piece**: Piece symbol with optional heroic marker and stack notation
- **Disambiguator**: File, rank, or full square when moves are ambiguous
- **Separator**: Movement/capture type indicator
- **Destination**: Target square in algebraic notation
- **Combination**: Stack formation result (for combination moves)
- **Check**: Check/checkmate indicator

## Piece Notation

### Basic Piece Symbols

Uppercase letters represent piece types:

- `C` - COMMANDER
- `I` - INFANTRY
- `T` - TANK
- `M` - MILITIA
- `E` - ENGINEER
- `A` - ARTILLERY
- `B` - ANTI_AIR (Anti-Air)
- `S` - MISSILE
- `F` - AIR_FORCE
- `N` - NAVY
- `H` - HEADQUARTER

### Heroic Piece Notation

Heroic pieces are prefixed with `+`:

```
+C - Heroic Commander
+T - Heroic Tank
+F - Heroic Air Force
```

### Stack Notation

Combined pieces use parentheses:

```
(NI) - Navy carrying Infantry
(TC) - Tank carrying Commander
(+NI) - Heroic Navy carrying Infantry
(N+I) - Navy carrying Heroic Infantry
```

**Stack Rules**:

- First piece is the carrier (determines movement capability)
- Subsequent pieces are carried pieces
- Heroic markers apply to individual pieces within stacks
- No spaces between pieces in stack notation

## Movement Separators

### Basic Movement

- **No separator**: Normal movement (e.g., `Ce4`, `Td5`)

### Capture Types

- **`x`**: Normal capture - move to target square and capture
- **`_`**: Stay capture - capture without moving from current square
- **`@`**: Suicide capture - both pieces destroyed in the attack

### Special Move Types

- **`>`**: Deploy move - piece deployed from a stack
- **`&`**: Combination move - pieces combine into a stack

### Combined Separators

Multiple separators can be combined:

- **`>x`**: Deploy with capture
- **`_x`**: Stay capture (redundant notation)
- **`@x`**: Suicide capture (redundant notation)
- **`&x`**: Combination with capture

## Disambiguation Rules

When multiple pieces of the same type can move to the same square,
disambiguation is required:

### File Disambiguation

When pieces are on different files:

```
Tac4 - Tank from 'a' file to c4
Tec4 - Tank from 'e' file to c4
```

### Rank Disambiguation

When pieces are on different ranks:

```
T2c4 - Tank from rank 2 to c4
T6c4 - Tank from rank 6 to c4
```

### Full Square Disambiguation

When file and rank disambiguation is insufficient:

```
Ta2c4 - Tank from a2 to c4
Te6c4 - Tank from e6 to c4
```

### Disambiguation Algorithm

```typescript
function getDisambiguator(move: InternalMove, moves: InternalMove[]): string {
  const from = move.from
  const to = move.to
  const pieceType = move.piece.type

  let ambiguities = 0
  let sameRank = 0
  let sameFile = 0

  for (const ambigMove of moves) {
    if (
      pieceType === ambigMove.piece.type &&
      from !== ambigMove.from &&
      to === ambigMove.to
    ) {
      ambiguities++

      if (rank(from) === rank(ambigMove.from)) sameRank++
      if (file(from) === file(ambigMove.from)) sameFile++
    }
  }

  if (ambiguities > 0) {
    if (sameRank > 0 && sameFile > 0) {
      return algebraic(from) // Full square
    } else if (sameFile > 0) {
      return algebraic(from).charAt(1) // Rank only
    } else {
      return algebraic(from).charAt(0) // File only
    }
  }

  return ''
}
```

## Deploy Move Notation

Deploy moves use special syntax to indicate stack deployment:

### Basic Deploy Format

```
<stay_pieces><move_pieces>
```

### Stay Notation

Pieces remaining at the original square:

```
T< - Tank stays at current square
(NI)< - Navy-Infantry stack stays
```

### Move Notation

Pieces moving to new squares:

```
I>d4 - Infantry deploys to d4
T>xd4 - Tank deploys and captures on d4
```

### Combined Deploy Examples

```
T<I>d4 - Tank stays, Infantry deploys to d4
(NI)<T>d4 - Navy-Infantry stays, Tank deploys to d4
I>d4,T>e4 - Infantry to d4, Tank to e4 (multiple deployments)
```

### Deploy Move Generation Algorithm

```typescript
function deployMoveToSanLan(
  game: CoTuLenh,
  move: InternalDeployMove,
): [string, string] {
  const legalMoves = game._moves({ legal: true })
  const allMoveSan = move.moves.map((m: InternalMove) => {
    return game._moveToSanLan(m, legalMoves)[0]
  })
  const movesSan = allMoveSan.join(',')
  const stay = move.stay ? `${makeSanPiece(move.stay)}<` : ''
  const san = `${stay}${movesSan}`
  const lan = `${algebraic(move.from)}:${san}`
  return [san, lan]
}
```

## Combination Move Notation

Combination moves show the resulting stack formation:

### Basic Combination Format

```
<piece><separator><destination><result_stack>
```

### Examples

```
T&e6(TI) - Tank combines with Infantry at e6, forming Tank-Infantry stack
I&d4(IT) - Infantry combines with Tank at d4, forming Infantry-Tank stack
```

### Combination with Capture

```
T&xe6(TI) - Tank captures and combines at e6, forming Tank-Infantry stack
```

## Check and Checkmate Indicators

### Check Notation

- **`^`**: Check (commander under attack)
- **`#`**: Checkmate (commander under attack with no legal moves)

### Examples

```
Ce4^ - Commander moves to e4, giving check
Txd4# - Tank captures on d4, delivering checkmate
```

## SAN Generation Algorithm

### Main Generation Method

```typescript
private _moveToSanLan(move: InternalMove, moves: InternalMove[]): [string, string] {
  const pieceEncoded = makeSanPiece(move.piece)
  const disambiguator = getDisambiguator(move, moves)
  const toAlg = algebraic(move.to)
  const fromAlg = algebraic(move.from)
  let combinationSuffix = ''

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
  this._makeMove(move)
  if (this.isCheck()) {
    checkingSuffix = this.isCheckmate() ? '#' : '^'
  }
  this._undoMove()

  const san = `${pieceEncoded}${disambiguator}${separator}${toAlg}${combinationSuffix}${checkingSuffix}`
  const lan = `${pieceEncoded}${fromAlg}${separator}${toAlg}${combinationSuffix}${checkingSuffix}`

  return [san, lan]
}
```

## Long Algebraic Notation (LAN)

LAN includes the origin square for all moves:

### LAN Format

```
<piece><origin><separator><destination><combination><check>
```

### Examples

```
Ce1-e4 - Commander from e1 to e4
Td2xe4 - Tank from d2 captures on e4
Id2>e4 - Infantry deploys from d2 to e4
```

## Move Parsing

### SAN Parsing Algorithm

The system can parse various SAN formats:

#### Supported Formats

- **Simple**: `Ce4`, `Txd4`
- **Disambiguated**: `Cae4`, `T2xd4`, `Ca1e4`
- **Stay Capture**: `T_d4`, `A<d4`
- **Deploy**: `I>d4`, `T>xd4`
- **Combination**: `T&e4(TI)`

#### Parsing Process

1. **Strip modifiers**: Remove check indicators and flags
2. **Identify piece type**: Extract piece symbol and heroic markers
3. **Parse separators**: Identify movement and capture types
4. **Extract coordinates**: Parse origin and destination squares
5. **Validate legality**: Check against legal moves list

## Special Cases and Edge Cases

### Ambiguous Moves

When multiple pieces can make the same move:

```
// Two tanks can move to d4
Tad4 - Tank from 'a' file
Ted4 - Tank from 'e' file

// Same file, different ranks
T2d4 - Tank from rank 2
T6d4 - Tank from rank 6
```

### Stack Deployment Ambiguity

When multiple stacks can deploy the same piece type:

```
// Two stacks with Infantry
(TI)a2<I>d4 - Infantry from Tank-Infantry stack at a2
(MI)e2<I>d4 - Infantry from Militia-Infantry stack at e2
```

### Complex Deploy Sequences

Multiple pieces deploying simultaneously:

```
(TIM)<T>d4,I>e4 - Militia stays, Tank to d4, Infantry to e4
```

## Error Handling

### Invalid SAN Formats

- **Unrecognized piece symbols**: Invalid piece type characters
- **Malformed stack notation**: Unmatched parentheses or invalid combinations
- **Invalid coordinates**: Non-existent squares or off-board positions
- **Illegal moves**: Moves that violate game rules or leave commander in check

### Parsing Recovery

- **Flexible parsing**: Accept various notation styles
- **Error reporting**: Specific error messages for debugging
- **Fallback options**: Attempt alternative interpretations when possible

## Examples by Move Type

### Normal Moves

```
Ce4     - Commander to e4
Td5     - Tank to d5
+Cf6    - Heroic Commander to f6
(NI)d4  - Navy-Infantry stack to d4
```

### Captures

```
Cxe4    - Commander captures on e4
T_d5    - Tank stay-captures on d5
F@e4    - Air Force suicide-captures on e4
```

### Deploy Moves

```
I>d4         - Infantry deploys to d4
T<I>d4       - Tank stays, Infantry deploys to d4
I>d4,T>e4    - Infantry to d4, Tank to e4
(TI)<T>xd4   - Infantry stays, Tank deploys and captures on d4
```

### Combination Moves

```
T&e4(TI)     - Tank combines with Infantry at e4
I&xd4(IT)    - Infantry captures and combines at d4
```

### Complex Examples

```
+T2xe4^      - Heroic Tank from rank 2 captures on e4, giving check
(+NI)a<I>xd4# - Infantry from Heroic Navy-Infantry stack captures on d4, checkmate
T<I>d4,M>e4   - Tank stays, Infantry to d4, Militia to e4
```
