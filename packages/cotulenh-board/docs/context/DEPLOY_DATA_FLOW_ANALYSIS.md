# Deploy State Data Flow Analysis

## Overview

This document analyzes the complete data flow for deploy state visualization, from core game engine to board UI rendering.

---

## 1. Core Game Engine Output

### Extended FEN Format

**Location:** `packages/cotulenh-core/src/cotulenh.ts` (line 320-371)

When `_deploySession` is active, `fen()` method returns:

```typescript
fen(): string {
  // ... generate base FEN ...

  // If there's an active deploy session, return extended FEN
  if (this._deploySession) {
    return this._deploySession.toExtendedFEN(this._deploySession.startFEN)
  }

  return baseFEN
}
```

### DeploySession.toExtendedFEN()

**Location:** `packages/cotulenh-core/src/deploy-session.ts` (line 319-351)

```typescript
toExtendedFEN(baseFEN: string): string {
  if (this.commands.length === 0) {
    // No moves yet, just indicate deploy started
    return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:`
  }

  // Generate SAN notation for the moves
  const moveNotations: string[] = []

  for (const command of this.commands) {
    const move = command.move
    const pieceType = move.piece.type.toUpperCase()
    const dest = algebraic(move.to)
    const capture = move.flags & BITS.CAPTURE ? 'x' : ''

    // Handle carrying pieces (combined moves)
    if (move.piece.carrying && move.piece.carrying.length > 0) {
      const carryingTypes = move.piece.carrying
        .map((p: Piece) => p.type.toUpperCase())
        .join('')
      moveNotations.push(`${pieceType}(${carryingTypes})${capture}${dest}`)
    } else {
      moveNotations.push(`${pieceType}${capture}${dest}`)
    }
  }

  const movesStr = moveNotations.join(',')
  const unfinished = this.isComplete() ? '' : '...'

  return `${baseFEN} DEPLOY ${algebraic(this.stackSquare)}:${movesStr}${unfinished}`
}
```

### Example Extended FEN Outputs

```
# No moves yet (just started)
"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1 DEPLOY c3:"

# One move deployed
"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1 DEPLOY c3:Nc5"

# Multiple moves, incomplete
"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1 DEPLOY c3:Nc5,F(EI)xd4,Te5..."

# Multiple moves, complete
"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1 DEPLOY c3:Nc5,F(EI)xd4,Te5"
```

### DeploySession Data Structure

**Location:** `packages/cotulenh-core/src/deploy-session.ts` (line 27-64)

```typescript
class DeploySession {
  stackSquare: number; // Origin square (0x88 format)
  turn: Color; // 'r' or 'b'
  originalPiece: Piece; // Stack before deployment
  commands: CTLMoveCommandInteface[]; // Executed commands
  startFEN: string; // FEN before deploy started
  stayPieces?: Piece[]; // Pieces staying at origin

  // Key methods for visualization:
  getRemainingPieces(): Piece | null;
  getDeployedSquares(): number[];
  isComplete(): boolean;
  canCommit(): boolean;
}
```

---

## 2. Board Package Parsing

### FEN Parser

**Location:** `packages/cotulenh-board/src/fen.ts` (line 64-94)

```typescript
export function readWithDeployState(fen: string): ParsedFEN {
  if (fen === 'start') fen = initial;

  // Check for DEPLOY marker in extended FEN format
  // Format: "base-fen DEPLOY c3:Nc5,Fd4..."
  const deployMatch = fen.match(/^(.+)\s+DEPLOY\s+([a-k](?:1[0-2]|[1-9])):(.*)$/);

  if (!deployMatch) {
    // Normal FEN without deploy state
    const pieces = parseBaseFEN(fen);
    return { pieces };
  }

  // Extended FEN with deploy state
  const [_, baseFEN, square, moveStr] = deployMatch;
  const pieces = parseBaseFEN(baseFEN);

  // Parse deploy moves
  const isComplete = !moveStr.endsWith('...');
  const cleanMoveStr = moveStr.replace(/\.\.\.$/, '');
  const moves = parseDeployMoves(cleanMoveStr);

  return {
    pieces,
    deployState: {
      originSquare: square as cg.Key,
      moves,
      isComplete,
    },
  };
}
```

### Deploy Move Parser

**Location:** `packages/cotulenh-board/src/fen.ts` (line 96-113)

```typescript
function parseDeployMoves(moveStr: string): Array<{
  piece: string;
  to: cg.Key;
  capture: boolean;
}> {
  if (!moveStr || moveStr.trim() === '') return [];

  // Parse format: "Nc5,F(EI)xd4,Te5"
  return moveStr.split(',').map(moveNotation => {
    const captureMatch = moveNotation.match(/([A-Z])(\([A-Z]+\))?(x)?([a-k](?:1[0-2]|[1-9]))/);
    if (!captureMatch) {
      throw new Error(`Invalid deploy move notation: ${moveNotation}`);
    }

    const [__, piece, carrying, capture, to] = captureMatch;
    return {
      piece: carrying ? `${piece}${carrying}` : piece,
      to: to as cg.Key,
      capture: !!capture,
    };
  });
}
```

### Parsed Deploy State Structure

**Location:** `packages/cotulenh-board/src/fen.ts` (line 46-57)

```typescript
export interface ParsedFEN {
  pieces: cg.Pieces;
  deployState?: {
    originSquare: cg.Key; // e.g., "c3"
    moves: Array<{
      piece: string; // e.g., "N", "F(EI)"
      to: cg.Key; // e.g., "c5"
      capture: boolean; // true if captured
    }>;
    isComplete: boolean; // false if ends with "..."
  };
}
```

---

## 3. Board State Storage

### HeadlessState Interface

**Location:** `packages/cotulenh-board/src/state.ts` (line 86-94)

```typescript
export interface HeadlessState {
  // ... other fields ...

  deploySession?: {
    originSquare: cg.Key; // Where deployment started
    deployedMoves: Array<{
      piece: string; // e.g., "N", "F(EI)"
      to: cg.Key; // Destination square
      capture: boolean; // Whether it captured
    }>;
    isComplete: boolean; // false if deployment ongoing
  };

  // ... other fields ...
}
```

### State Update on FEN Change

**Location:** `packages/cotulenh-board/src/config.ts` (line 94-108)

```typescript
// if a fen was provided, replace the pieces and parse deploy state
if (config.fen) {
  const parsed = readWithDeployState(config.fen);
  state.pieces = parsed.pieces;
  state.drawable.shapes = config.drawable?.shapes || [];

  // Update deploy session from FEN
  if (parsed.deployState) {
    state.deploySession = {
      originSquare: parsed.deployState.originSquare,
      deployedMoves: parsed.deployState.moves,
      isComplete: parsed.deployState.isComplete,
    };
  } else {
    state.deploySession = undefined;
  }
}
```

---

## 4. App Integration

### Reactive FEN Updates

**Location:** `apps/cotulenh-app/src/routes/+page.svelte` (line 314-321)

```typescript
let isUpdatingBoard = false;

$: if (boardApi && $gameStore.fen) {
  isUpdatingBoard = true;
  reSetupBoard(); // Updates board with new FEN
  setTimeout(() => {
    isUpdatingBoard = false;
  }, 0);
}
```

### Board Setup with FEN

**Location:** `apps/cotulenh-app/src/routes/+page.svelte` (line 47-64)

```typescript
function reSetupBoard(): Api | null {
  if (boardApi) {
    boardApi.set({
      fen: $gameStore.fen, // Extended FEN with DEPLOY marker
      turnColor: coreToBoardColor($gameStore.turn),
      lastMove: mapLastMoveToBoardFormat($gameStore.lastMove),
      check: coreToBoardCheck($gameStore.check, $gameStore.turn),
      airDefense: { influenceZone: coreToBoardAirDefense() },
      movable: {
        free: false,
        color: coreToBoardColor($gameStore.turn),
        dests: mapPossibleMovesToDests($gameStore.possibleMoves),
        events: { after: handleMove, afterDeployStep: handleDeployStep },
      },
    });
  }
  return boardApi;
}
```

### Deploy Step Handler

**Location:** `apps/cotulenh-app/src/routes/+page.svelte` (line 159-204)

```typescript
function handleDeployStep(move: SingleDeployMove, metadata: DeployStepMetadata) {
  console.log('Deploy step:', move);

  if (!game) return;

  try {
    // Send move to core
    const result = game.move({
      from: move.from,
      to: move.to,
      piece: roleToType(move.piece.role),
      deploy: true,
    });

    if (!result) {
      console.error('Deploy move rejected by core');
      return;
    }

    console.log('Deploy move accepted');
    console.log('  FEN:', game.fen()); // Extended FEN with updated deploy state
    console.log('  Deploy session active:', !!game.getDeploySession());

    // Update game store with new FEN
    // Reactive statement will parse deploy state and update board
    gameStore.applyMove(game, result);
  } catch (error) {
    console.error('Deploy step failed:', error);
    reSetupBoard();
  }
}
```

---

## 5. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ CORE GAME ENGINE (cotulenh-core)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DeploySession                                                  │
│  ├─ stackSquare: 0x32 (c3)                                    │
│  ├─ commands: [NormalMoveCommand, ...]                        │
│  ├─ originalPiece: {type: 'n', carrying: [...]}              │
│  └─ toExtendedFEN() → "base-fen DEPLOY c3:Nc5,Fd4..."        │
│                                                                 │
│  game.fen() → Extended FEN String                              │
│                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Extended FEN String
                     │ "...DEPLOY c3:Nc5,F(EI)xd4,Te5..."
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ BOARD PACKAGE (cotulenh-board)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  readWithDeployState(fen)                                       │
│  ├─ Parse DEPLOY marker                                        │
│  ├─ Extract origin square: "c3"                                │
│  ├─ Parse moves: [{piece:"N", to:"c5", capture:false}, ...]   │
│  └─ Check completion: !endsWith("...")                         │
│                                                                 │
│  Returns ParsedFEN:                                             │
│  {                                                              │
│    pieces: Map<Key, Piece>,                                    │
│    deployState: {                                               │
│      originSquare: "c3",                                        │
│      moves: [...],                                              │
│      isComplete: false                                          │
│    }                                                            │
│  }                                                              │
│                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ ParsedFEN
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ BOARD STATE (state.ts)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  state.deploySession = {                                        │
│    originSquare: "c3",                                          │
│    deployedMoves: [                                             │
│      {piece: "N", to: "c5", capture: false},                   │
│      {piece: "F(EI)", to: "d4", capture: true},                │
│      {piece: "T", to: "e5", capture: false}                    │
│    ],                                                           │
│    isComplete: false                                            │
│  }                                                              │
│                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ State Update
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ RENDERING (render.ts) - TO BE IMPLEMENTED                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  renderDeployHighlights(state, svg)                             │
│  ├─ Highlight origin square "c3" (yellow glow)                 │
│  ├─ For each deployedMove:                                     │
│  │   ├─ Highlight destination square                           │
│  │   ├─ Draw arrow from origin to destination                  │
│  │   └─ Add sequence number badge                              │
│  └─ Show "..." indicator if !isComplete                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Key Data Transformations

### Core → Board Format Mapping

| Core Format                               | Board Format         | Example                |
| ----------------------------------------- | -------------------- | ---------------------- |
| `stackSquare: 0x32`                       | `originSquare: "c3"` | 0x88 → algebraic       |
| `commands[].move`                         | `deployedMoves[]`    | Command → move data    |
| `piece.type: 'n'`                         | `piece: "N"`         | Lowercase → uppercase  |
| `piece.carrying: [{type:'e'},{type:'i'}]` | `piece: "F(EI)"`     | Array → notation       |
| `flags & BITS.CAPTURE`                    | `capture: true`      | Bitflag → boolean      |
| `!isComplete()`                           | `"..."` suffix       | Method → string marker |

### Algebraic Notation Examples

```typescript
// Core internal format (0x88)
stackSquare: 0x32  // c3 in 0x88 format

// Board format (algebraic)
originSquare: "c3"

// Conversion
algebraic(0x32) → "c3"
```

### Move Notation Examples

```typescript
// Simple move
{type: 'n', from: 0x32, to: 0x52} → "Nc5"

// Carrying pieces
{type: 'f', carrying: [{type:'e'}, {type:'i'}], from: 0x32, to: 0x83} → "F(EI)d4"

// Capture
{type: 't', flags: BITS.CAPTURE, from: 0x32, to: 0x74} → "Txe5"

// Combined
{type: 'f', carrying: [{type:'e'}, {type:'i'}], flags: BITS.CAPTURE} → "F(EI)xd4"
```

---

## 7. Visualization Data Requirements

To render deploy state visualization, we need:

### From `state.deploySession`:

1. **Origin Square** (`originSquare: Key`)

   - Use for: Highlighting origin with yellow glow
   - Example: `"c3"`

2. **Deployed Moves** (`deployedMoves: Array`)

   - Use for: Drawing trail, sequence numbers
   - Each move contains:
     - `piece`: What was deployed ("N", "F(EI)")
     - `to`: Where it went ("c5", "d4")
     - `capture`: Whether it captured (true/false)

3. **Completion Status** (`isComplete: boolean`)
   - Use for: Showing "..." indicator or "Complete" badge
   - `false` → show "In progress..."
   - `true` → show "Complete" or hide indicator

### Additional Data Needed (from core):

4. **Remaining Pieces** (not in current board state)

   - Need to query: `game.getDeploySession()?.getRemainingPieces()`
   - Use for: Badge showing what's left at origin
   - Example: `["T", "I", "I"]` → "T, I, I remaining"

5. **Total Piece Count** (calculated)
   - From: `originalPiece` flattened
   - Use for: Progress bar (3/5 deployed)

---

## 8. Missing Pieces for Full Visualization

### Current Gap

The board state only has:

- Origin square
- Deployed moves list
- Completion flag

But NOT:

- Remaining pieces at origin
- Total piece count
- Original stack composition

### Solution Options

#### Option A: Enhance Board State (Recommended)

Add to `state.deploySession`:

```typescript
deploySession?: {
  originSquare: Key;
  deployedMoves: Array<{...}>;
  isComplete: boolean;
  // NEW FIELDS:
  remainingPieces?: string[];  // ["T", "I", "I"]
  totalPieces?: number;        // 5
  originalStack?: string;      // "N(FTII)"
}
```

Update in `config.ts` when parsing FEN:

```typescript
if (parsed.deployState) {
  // Query core for additional info
  const session = game?.getDeploySession();
  const remaining = session?.getRemainingPieces();

  state.deploySession = {
    ...parsed.deployState,
    remainingPieces: remaining ? flattenPiece(remaining).map(p => p.type) : [],
    totalPieces: session ? flattenPiece(session.originalPiece).length : 0,
    originalStack: session ? makeSanPiece(session.originalPiece) : undefined,
  };
}
```

#### Option B: Query Core Directly (Less Clean)

Keep board state minimal, query core when rendering:

```typescript
function renderDeployProgress(state: State) {
  if (!state.deploySession) return;

  // Query core directly (requires passing game instance)
  const session = game.getDeploySession();
  const remaining = session?.getRemainingPieces();
  // ... render with remaining pieces
}
```

**Recommendation:** Option A is cleaner and maintains separation of concerns.

---

## 9. Implementation Checklist

- [x] Core generates extended FEN with deploy state
- [x] Board parses extended FEN correctly
- [x] Board state stores deploy session info
- [x] App reactive updates trigger on FEN changes
- [ ] Enhance board state with remaining pieces info
- [ ] Implement visual rendering (origin highlight)
- [ ] Implement visual rendering (deployment trail)
- [ ] Implement visual rendering (sequence numbers)
- [ ] Create deploy progress UI component
- [ ] Add configuration options
- [ ] Write tests for visualization

---

## Conclusion

The data flow is well-established:

1. Core tracks deploy state in `DeploySession`
2. Core serializes to extended FEN format
3. Board parses extended FEN
4. Board stores in `state.deploySession`
5. App triggers reactive updates on FEN changes

**Next step:** Implement visual rendering using the parsed deploy state data.
