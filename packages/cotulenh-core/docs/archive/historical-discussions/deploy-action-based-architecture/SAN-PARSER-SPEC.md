# Deploy SAN Parser Specification

**Created**: October 22, 2025  
**Status**: Implementation Ready  
**Purpose**: Complete specification for parsing deploy SAN notation back into
deploy moves and sessions

---

## 🎯 Overview

The deploy SAN parser enables:

- **PGN Support**: Parse deploy moves from game notation
- **Extended FEN Loading**: Reconstruct deploy sessions from FEN
- **Game Reconstruction**: Replay games with deploy moves
- **Move Validation**: Parse user input for deploy moves

## 📝 Current Deploy SAN Format

Based on existing `deployMoveToSanLan()` implementation:

### Format Structure

```
[StayPieces]<MoveList
```

### Examples from Tests

```typescript
// Multiple pieces deploy
'(NT)>a3,F>c4' // Navy+Tank to a3, AirForce to c4
'c3:(NT)>a3,F>c4' // LAN format with origin square

// Deploy with staying pieces
'(FT)<N>a3' // AirForce+Tank stay, Navy to a3
'c3:(FT)<N>a3' // LAN format with origin square
```

### Grammar Definition (EBNF)

```ebnf
DeploySAN     = [StayPart] MoveList
StayPart      = "(" PieceList ")" "<"
MoveList      = Move ("," Move)*
Move          = [PieceGroup] ">" Square
PieceGroup    = "(" PieceList ")" | Piece
PieceList     = Piece+
Piece         = "C" | "I" | "T" | "M" | "E" | "A" | "G" | "S" | "F" | "N" | "H"
Square        = File Rank
File          = "a".."k"
Rank          = "1".."12"
```

## 🔧 Parser Implementation

### Core Parser Interface

```typescript
interface DeploySANParser {
  // Parse deploy SAN into structured data
  parseDeploySAN(san: string): ParsedDeployMove

  // Parse extended FEN deploy section
  parseExtendedFEN(fen: string): DeploySessionData | null

  // Parse individual move within deploy sequence
  parseSingleDeployMove(moveStr: string, fromSquare: Square): ParsedMove
}

interface ParsedDeployMove {
  stayingPieces: Piece[] // Pieces that stay at origin
  moves: ParsedMove[] // Individual deploy moves
  fromSquare?: Square // Origin square (from LAN format)
}

interface ParsedMove {
  pieces: Piece[] // Pieces being moved together
  toSquare: Square // Destination square
  isCapture?: boolean // If move captures (future extension)
}

interface DeploySessionData {
  stackSquare: Square // Original stack location
  stayingPieces: Piece[] // Pieces remaining
  moves: ParsedMove[] // Moves made so far
  isComplete: boolean // Whether session is finished
}
```

### Main Parser Class

```typescript
export class DeploySANParser {
  // Parse complete deploy SAN
  parseDeploySAN(san: string): ParsedDeployMove {
    const cleanSan = san.trim()

    // Check for LAN format (has origin square)
    let fromSquare: Square | undefined
    let deployPart = cleanSan

    if (cleanSan.includes(':')) {
      const [origin, moves] = cleanSan.split(':')
      fromSquare = origin as Square
      deployPart = moves
    }

    // Parse staying pieces
    let stayingPieces: Piece[] = []
    let movePart = deployPart

    if (deployPart.includes('<')) {
      const stayMatch = deployPart.match(/^\(([A-Z]+)\)<(.*)$/)
      if (stayMatch) {
        stayingPieces = this.parsePieceList(stayMatch[1])
        movePart = stayMatch[2]
      }
    }

    // Parse moves
    const moves = this.parseMoveList(movePart, fromSquare)

    return {
      stayingPieces,
      moves,
      fromSquare,
    }
  }

  // Parse list of moves: "(NT)>a3,F>c4"
  private parseMoveList(moveStr: string, fromSquare?: Square): ParsedMove[] {
    if (!moveStr.trim()) return []

    const moveStrings = moveStr.split(',')
    return moveStrings.map((str) =>
      this.parseSingleMove(str.trim(), fromSquare),
    )
  }

  // Parse single move: "(NT)>a3" or "F>c4"
  private parseSingleMove(moveStr: string, fromSquare?: Square): ParsedMove {
    // Match patterns: "(NT)>a3" or "F>c4"
    const groupMatch = moveStr.match(
      /^(\([A-Z]+\)|[A-Z])>([a-k](?:1[0-2]|[1-9]))$/,
    )

    if (!groupMatch) {
      throw new Error(`Invalid deploy move format: ${moveStr}`)
    }

    const pieceGroup = groupMatch[1]
    const toSquare = groupMatch[2] as Square

    // Parse pieces
    let pieces: Piece[]
    if (pieceGroup.startsWith('(')) {
      // Group format: "(NT)" -> [Navy, Tank]
      const pieceStr = pieceGroup.slice(1, -1) // Remove parentheses
      pieces = this.parsePieceList(pieceStr)
    } else {
      // Single piece: "F" -> [AirForce]
      pieces = [this.charToPiece(pieceGroup)]
    }

    return {
      pieces,
      toSquare,
    }
  }

  // Parse piece list: "NT" -> [Navy, Tank]
  private parsePieceList(pieceStr: string): Piece[] {
    return pieceStr.split('').map((char) => this.charToPiece(char))
  }

  // Convert character to piece
  private charToPiece(char: string): Piece {
    const typeMap: Record<string, PieceSymbol> = {
      C: COMMANDER,
      I: INFANTRY,
      T: TANK,
      M: MILITIA,
      E: ENGINEER,
      A: ARTILLERY,
      G: ANTI_AIR,
      S: MISSILE,
      F: AIR_FORCE,
      N: NAVY,
      H: HEADQUARTER,
    }

    const type = typeMap[char]
    if (!type) {
      throw new Error(`Unknown piece character: ${char}`)
    }

    return { type, color: RED } // Color will be set by caller
  }
}
```

## 🔄 Integration with Extended FEN

### Extended FEN Format

```
"base-fen DEPLOY c3:T<Nc5,F(T)d4..."
```

### Extended FEN Parser

```typescript
export class ExtendedFENParser {
  parseExtendedFEN(fen: string): {
    baseFEN: string
    deploySession: DeploySessionData | null
  } {
    const parts = fen.split(' ')

    // Find DEPLOY marker
    const deployIndex = parts.indexOf('DEPLOY')
    if (deployIndex === -1) {
      return { baseFEN: fen, deploySession: null }
    }

    // Extract base FEN (everything before DEPLOY)
    const baseFEN = parts.slice(0, deployIndex).join(' ')

    // Parse deploy section
    const deployInfo = parts[deployIndex + 1] // "c3:T<Nc5,F(T)d4..."
    const deploySession = this.parseDeploySection(deployInfo)

    return { baseFEN, deploySession }
  }

  private parseDeploySection(deployInfo: string): DeploySessionData {
    // Remove unfinished marker
    const cleanInfo = deployInfo.replace('...', '')

    // Split origin and moves: "c3:T<Nc5,F(T)d4"
    const [stackSquare, movesPart] = cleanInfo.split(':')

    // Parse using deploy SAN parser
    const parser = new DeploySANParser()
    const parsed = parser.parseDeploySAN(movesPart)

    return {
      stackSquare: stackSquare as Square,
      stayingPieces: parsed.stayingPieces,
      moves: parsed.moves,
      isComplete: !deployInfo.includes('...'),
    }
  }
}
```

## 🎮 Integration with CoTuLenh Core

### Extend \_moveFromSan for Deploy Moves

```typescript
// In CoTuLenh class
private _moveFromSan(move: string, strict = false): InternalMove | InternalDeployMove | null {
  // Check if it's a deploy move (contains '>' or has LAN format with ':')
  if (this.isDeployMoveSAN(move)) {
    return this.parseDeployMoveSAN(move)
  }

  // Existing normal move parsing...
  const cleanMove = strippedSan(move)
  // ... rest of current implementation
}

private isDeployMoveSAN(move: string): boolean {
  // Deploy moves contain '>' or have LAN format with ':'
  return move.includes('>') || (move.includes(':') && move.includes('<'))
}

private parseDeployMoveSAN(san: string): InternalDeployMove | null {
  try {
    const parser = new DeploySANParser()
    const parsed = parser.parseDeploySAN(san)

    // Convert parsed data to InternalDeployMove
    return this.createInternalDeployMoveFromParsed(parsed)
  } catch (error) {
    console.warn(`Failed to parse deploy SAN: ${san}`, error)
    return null
  }
}

private createInternalDeployMoveFromParsed(parsed: ParsedDeployMove): InternalDeployMove {
  const fromSquare = parsed.fromSquare || this.inferFromSquare(parsed)

  // Convert parsed moves to InternalMove[]
  const internalMoves: InternalMove[] = parsed.moves.map(move => ({
    from: SQUARE_MAP[fromSquare],
    to: SQUARE_MAP[move.toSquare],
    piece: this.createCombinedPiece(move.pieces),
    color: this.turn(),
    flags: BITS.DEPLOY
  }))

  // Create stay piece if any
  const stayPiece = parsed.stayingPieces.length > 0
    ? this.createCombinedPiece(parsed.stayingPieces)
    : undefined

  return {
    from: SQUARE_MAP[fromSquare],
    moves: internalMoves,
    stay: stayPiece
  }
}
```

### Load Game from Extended FEN

```typescript
// In CoTuLenh class
loadFromExtendedFEN(fen: string): void {
  const parser = new ExtendedFENParser()
  const { baseFEN, deploySession } = parser.parseExtendedFEN(fen)

  // Load base game state
  this.load(baseFEN)

  // Reconstruct deploy session if present
  if (deploySession) {
    this.reconstructDeploySession(deploySession)
  }
}

private reconstructDeploySession(sessionData: DeploySessionData): void {
  // Create deploy session object
  this._deploySession = new DeploySession({
    stackSquare: sessionData.stackSquare,
    turn: this.turn(),
    originalPiece: this.reconstructOriginalPiece(sessionData),
    startFEN: this.fen(), // Current state is the "before" state
    actions: []
  })

  // Apply each move to reconstruct current state
  for (const move of sessionData.moves) {
    const internalMove = this.convertParsedMoveToInternal(move, sessionData.stackSquare)
    const command = createMoveCommand(this, internalMove)

    command.execute()
    this._deploySession.commands.push(command)
  }
}
```

## 🧪 Test Cases

### Basic Parsing Tests

```typescript
describe('DeploySANParser', () => {
  const parser = new DeploySANParser()

  it('should parse simple deploy move', () => {
    const result = parser.parseDeploySAN('F>c4')
    expect(result.moves).toHaveLength(1)
    expect(result.moves[0].pieces).toEqual([{ type: 'f', color: 'r' }])
    expect(result.moves[0].toSquare).toBe('c4')
    expect(result.stayingPieces).toEqual([])
  })

  it('should parse group deploy move', () => {
    const result = parser.parseDeploySAN('(NT)>a3')
    expect(result.moves[0].pieces).toHaveLength(2)
    expect(result.moves[0].pieces[0].type).toBe('n')
    expect(result.moves[0].pieces[1].type).toBe('t')
  })

  it('should parse multiple moves', () => {
    const result = parser.parseDeploySAN('(NT)>a3,F>c4')
    expect(result.moves).toHaveLength(2)
    expect(result.moves[0].toSquare).toBe('a3')
    expect(result.moves[1].toSquare).toBe('c4')
  })

  it('should parse staying pieces', () => {
    const result = parser.parseDeploySAN('(FT)<N>a3')
    expect(result.stayingPieces).toHaveLength(2)
    expect(result.stayingPieces[0].type).toBe('f')
    expect(result.stayingPieces[1].type).toBe('t')
    expect(result.moves[0].pieces[0].type).toBe('n')
  })

  it('should parse LAN format', () => {
    const result = parser.parseDeploySAN('c3:(NT)>a3,F>c4')
    expect(result.fromSquare).toBe('c3')
    expect(result.moves).toHaveLength(2)
  })
})
```

### Extended FEN Tests

```typescript
describe('ExtendedFENParser', () => {
  const parser = new ExtendedFENParser()

  it('should parse extended FEN with deploy session', () => {
    const fen =
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 DEPLOY c3:T<Nc5...'
    const result = parser.parseExtendedFEN(fen)

    expect(result.baseFEN).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )
    expect(result.deploySession).toBeTruthy()
    expect(result.deploySession!.stackSquare).toBe('c3')
    expect(result.deploySession!.isComplete).toBe(false)
  })

  it('should handle normal FEN without deploy', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const result = parser.parseExtendedFEN(fen)

    expect(result.baseFEN).toBe(fen)
    expect(result.deploySession).toBeNull()
  })
})
```

### Integration Tests

```typescript
describe('CoTuLenh Deploy SAN Integration', () => {
  it('should parse deploy move from SAN', () => {
    const game = new CoTuLenh()
    // Setup game with stack at c3

    const move = game._moveFromSan('(NT)>a3,F>c4')
    expect(move).toBeTruthy()
    expect(isInternalDeployMove(move)).toBe(true)
  })

  it('should round-trip extended FEN', () => {
    const game = new CoTuLenh()
    // Setup and make partial deploy

    const fen1 = game.fen() // Extended FEN with deploy session
    const game2 = new CoTuLenh()
    game2.loadFromExtendedFEN(fen1)
    const fen2 = game2.fen()

    expect(fen1).toBe(fen2)
  })
})
```

## 🚀 Implementation Plan

### Phase 1: Core Parser (2-3 hours)

1. Implement `DeploySANParser` class
2. Add basic parsing methods
3. Create unit tests for parser

### Phase 2: Extended FEN Integration (2-3 hours)

1. Implement `ExtendedFENParser` class
2. Add `loadFromExtendedFEN` method to CoTuLenh
3. Test FEN round-trip functionality

### Phase 3: SAN Integration (1-2 hours)

1. Extend `_moveFromSan` for deploy moves
2. Add deploy move detection logic
3. Test PGN parsing with deploy moves

### Phase 4: Edge Cases & Polish (1-2 hours)

1. Handle parsing errors gracefully
2. Add disambiguation support (if needed)
3. Optimize parser performance
4. Complete test coverage

**Total Estimated Time**: 6-10 hours

## 🎯 Success Criteria

- [ ] Parse all current deploy SAN formats correctly
- [ ] Handle extended FEN with deploy sessions
- [ ] Support PGN files with deploy moves
- [ ] Round-trip FEN conversion works perfectly
- [ ] Graceful error handling for invalid SAN
- [ ] Complete test coverage (>95%)
- [ ] Integration with existing CoTuLenh SAN system

---

**Status**: Ready for implementation  
**Dependencies**: None (uses existing CoTuLenh infrastructure)  
**Risk Level**: Low (well-defined format, existing patterns to follow)

This parser will enable complete PGN support and make the extended FEN system
fully functional for save/load operations.
