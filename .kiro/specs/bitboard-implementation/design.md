# Design Document

## Overview

This design document describes the architecture for cotulenh-bitboard, a high-performance bitboard-based chess engine that replicates all functionality of cotulenh-core while using bitboard data structures for improved performance.

### Design Goals

1. **API Compatibility**: Identical public API to cotulenh-core for seamless swapping
2. **Performance**: Faster move generation and position evaluation using bitboards
3. **Correctness**: Produce identical results to cotulenh-core for all positions
4. **Maintainability**: Clear separation between bitboard operations and game logic
5. **Testability**: Each component independently testable

### Core Principle

**Same interface, different internals. Bitboards for speed, hybrid structures for complexity.**

## Architecture Overview

### Layered Architecture (Inspired by Chess Programming)

```
┌─────────────────────────────────────────────────────┐
│         Application Layer (GUI/CLI)                 │
│  - React/Vue/Svelte components                      │
│  - User input handling                              │
│  - Board rendering                                  │
└──────────────┬──────────────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────────────────────┐
│  Simple API  │  │   Advanced API               │
│  (Most Users)│  │   (Power Users)              │
└──────────────┘  └──────────────────────────────┘
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────────────────────┐
│  CoTuLenh    │  │   Bridge Layer               │
│  Class       │  │   (Optional)                 │
│              │  │                              │
│  - Mutable   │  │  - Stateless interface       │
│  - History   │  │  - Simple objects            │
│  - Undo/Redo │  │  - No serialization          │
│              │  │  - Event-driven              │
└──────────────┘  └──────────────────────────────┘
       │                │
       └────────┬───────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│           Game State Manager                        │
│  - Turn, move counters                              │
│  - History (full snapshots for user undo)           │
│  - Deploy session management                        │
│  - Commander tracking                               │
└──────────────┬──────────────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────────────────────┐
│   Bitboard   │  │   Hybrid Structures          │
│   Core       │  │                              │
│              │  │  - Stack Manager             │
│  - Position  │  │  - Deploy Session            │
│  - Pieces    │  │  - Air Defense Zones         │
│  - Attacks   │  │  - Terrain Masks             │
└──────────────┘  └──────────────────────────────┘
       │                │
       └────────┬───────┘
                │
                ▼
        ┌──────────────┐
        │ Move         │
        │ Generation   │
        │              │
        │ Uses minimal │
        │ undo info    │
        └──────────────┘
```

### Key Architectural Decisions (From Chess Programming Study)

**1. Bridge Layer for UI Communication**

- Learned from: chessground + chessops
- Benefit: ~5x faster UI interactions (no FEN/SAN in hot path)
- Implementation: Simple objects (UIMove, UIPiece) instead of serialization

**2. History Management in Engine**

- Learned from: chess.js (not chessops)
- Benefit: API compatibility with cotulenh-core, user convenience
- Implementation: Full state snapshots for user undo/redo

**3. Minimal Undo for Validation**

- Learned from: Stockfish pattern
- Benefit: 10x less memory for legality checking
- Implementation: Store only what changed (captured piece, stack changes)

**4. Mutable State**

- Learned from: chess.js, cotulenh-core
- Benefit: API compatibility, familiar pattern
- Implementation: Mutate in place, track history separately

## Component Design

### 1. Bitboard Core

**Purpose**: Fast piece queries and attack detection using bitwise operations

**Data Structures**:

```
Bitboard (128-bit for 11x12 board):
  low: 64-bit integer (squares 0-63)
  high: 64-bit integer (squares 64-131)

Position Bitboards:
  - redPieces: all red pieces
  - bluePieces: all blue pieces
  - occupied: all pieces (red | blue)

  - commanders: commander pieces
  - infantry: infantry pieces
  - tanks: tank pieces
  - militia: militia pieces
  - engineers: engineer pieces
  - artillery: artillery pieces
  - antiAir: anti-air pieces
  - missiles: missile pieces
  - airForce: air force pieces
  - navy: navy pieces
  - headquarters: headquarter pieces

  - carriers: pieces with stacks (hybrid with Stack Manager)
  - heroic: heroic pieces
```

**Operations**:

```
Basic Bitboard Operations:
  - and(a, b): bitwise AND
  - or(a, b): bitwise OR
  - xor(a, b): bitwise XOR
  - not(a): bitwise NOT
  - isSet(bb, square): check if bit is set
  - setBit(bb, square): set bit
  - clearBit(bb, square): clear bit
  - popCount(bb): count set bits
  - lsb(bb): find least significant bit
  - msb(bb): find most significant bit

Piece Queries:
  - getPieceAt(square): which piece type at square
  - getColorAt(square): which color at square
  - isOccupied(square): is square occupied
  - getPiecesOfType(type, color): bitboard of specific pieces

Attack Detection:
  - getAttacksFrom(square, piece): squares attacked by piece
  - isSquareAttacked(square, byColor): is square under attack
  - getAttackers(square, byColor): which pieces attack square
```

**Key Design Decision**: Use 128-bit bitboards (two 64-bit integers) to represent the 11x12 board (132 squares). This allows efficient bitwise operations while fitting the non-standard board size.

### 2. Stack Manager

**Purpose**: Handle complex stack mechanics that don't fit pure bitboard model

**Data Structures**:

```
StackData:
  square: number
  carrier: Piece (type, color, heroic)
  carried: Piece[] (array of carried pieces)

StackManager:
  stacks: Map<square, StackData>
  carrierBitboard: Bitboard (which squares have stacks)
```

**Operations**:

```
Stack Operations:
  - hasStack(square): check if square has stack
  - getStack(square): get stack data
  - createStack(carrier, carried, square): create new stack
  - addToStack(piece, square): add piece to existing stack
  - removeFromStack(pieceType, square): remove specific piece
  - destroyStack(square): remove entire stack
  - validateStack(carrier, carried): check if combination is legal
```

**Integration with Bitboards**:

- Carrier bitboard marks which squares have stacks
- Stack Manager stores detailed composition
- When querying piece at square, check carrier bitboard first
- If carrier bit set, consult Stack Manager for details

### 3. Deploy Session Manager

**Purpose**: Track multi-step deploy move sequences

**Data Structures**:

```
DeploySession:
  stackSquare: number (origin)
  originalStack: StackData (before deploy)
  deployedMoves: DeployMove[] (moves made so far)
  remainingPieces: Piece[] (not yet deployed)
  turn: Color (whose turn)

DeployMove:
  piece: Piece (what was deployed)
  from: number (stack square)
  to: number (destination)
  captured: Piece | undefined
```

**Operations**:

```
Session Operations:
  - initiate(stackSquare): start deploy from stack
  - deployPiece(piece, to): deploy one piece
  - undoLastDeploy(): undo last deploy step
  - canCommit(): check if all pieces deployed
  - commit(): finalize deploy and switch turn
  - cancel(): abort deploy and restore original stack
```

**State Machine**:

```
No Session → Initiate → Deploying → Complete → Commit → No Session
                ↓           ↓
              Cancel ← ─ ─ ─ ┘
```

### 4. Air Defense Zone Calculator

**Purpose**: Efficiently calculate and maintain air defense influence zones

**Data Structures**:

```
AirDefenseZones:
  red: Map<square, influencedSquares[]>
  blue: Map<square, influencedSquares[]>

AntiAirPositions:
  red: Bitboard (red anti-air pieces)
  blue: Bitboard (blue anti-air pieces)
```

**Operations**:

```
Zone Operations:
  - calculateZones(): compute all zones from scratch
  - updateZone(square): recalculate zone for one anti-air piece
  - removeZone(square): remove zone when piece captured
  - isInZone(square, color): check if square is in enemy zone
  - getZoneInfluence(square): get all zones affecting square
```

**Optimization Strategy**:

- Use bitboards to quickly find anti-air pieces
- Use precomputed zone patterns for each anti-air type
- Cache zone calculations
- Incremental updates when pieces move

### 5. Move Generator

**Purpose**: Generate legal moves using bitboard operations

**Strategy**:

```
Move Generation Pipeline:
  1. Generate pseudo-legal moves (fast, bitboard-based)
  2. Filter for terrain restrictions (bitboard mask)
  3. Filter for air defense zones (if air force)
  4. Filter for legality (doesn't leave commander in check)
  5. Return legal moves
```

**Piece-Specific Generation**:

```
For each piece type:
  - Get piece bitboard
  - For each set bit (piece position):
      - Calculate attack bitboard
      - Mask with terrain (if applicable)
      - Mask with enemy pieces (captures)
      - Mask with empty squares (quiet moves)
      - Generate moves from attack bitboard
```

**Example - Infantry Moves**:

```
infantryBitboard = position.infantry & position.redPieces
for each square in infantryBitboard:
  attacks = getInfantryAttacks(square)
  captures = attacks & position.bluePieces & landMask
  quietMoves = attacks & ~position.occupied & landMask

  for each captureSquare in captures:
    addMove(square, captureSquare, CAPTURE)

  for each quietSquare in quietMoves:
    addMove(square, quietSquare, NORMAL)
```

### 6. Position Manager

**Purpose**: Maintain complete game state and coordinate all components

**Data Structures**:

```
Position:
  // Bitboards
  bitboards: BitboardSet

  // Hybrid structures
  stacks: StackManager
  deploySession: DeploySession | null
  airDefense: AirDefenseZones

  // Game state
  turn: Color
  commanders: { red: square, blue: square }
  halfMoves: number
  moveNumber: number
  history: HistoryEntry[]
```

**Operations**:

```
State Management:
  - load(fen): parse FEN and populate all structures
  - fen(): generate FEN from current state
  - makeMove(move): execute move and update all structures
  - undoMove(): reverse last move and restore state

Queries:
  - getPieceAt(square): query bitboards + stacks
  - isLegal(move): validate move legality
  - isCheck(): check if commander under attack
  - isCheckmate(): check if no legal moves escape check
```

## Data Flow

### Scenario 1: Loading a Position

```
1. Application calls: engine.load(FEN)

2. FEN Parser extracts:
   - Piece placement
   - Turn
   - Move counters
   - Stack notation (if present)
   - Deploy session (if present)

3. Position Manager:
   - Clears all bitboards
   - Clears Stack Manager
   - Clears Deploy Session

4. For each piece in FEN:
   - Set bit in appropriate piece bitboard
   - Set bit in color bitboard
   - Set bit in occupied bitboard
   - If stack notation: create StackData in Stack Manager
   - If heroic: set bit in heroic bitboard

5. Air Defense Calculator:
   - Scan for anti-air pieces
   - Calculate zones for each
   - Store in AirDefenseZones

6. Position ready for move generation
```

### Scenario 2: Generating Moves

```
1. Application calls: engine.moves()

2. Move Generator checks:
   - Is there active deploy session?
   - If yes: generate deploy moves only
   - If no: generate normal moves

3. For normal moves:
   - For each piece type:
       - Get piece bitboard for current color
       - For each set bit:
           - Calculate attack bitboard
           - Apply terrain mask
           - Apply air defense restrictions
           - Generate move objects

4. Filter for legality:
   - For each pseudo-legal move:
       - Execute move temporarily
       - Check if commander in check
       - Check if commander exposed
       - If safe: add to legal moves
       - Undo temporary move

5. Return legal moves (SAN or verbose)
```

### Scenario 3: Making a Move

```
1. Application calls: engine.move(from, to)

2. Position Manager:
   - Find move in legal moves
   - If not found: return null

3. Execute move:
   - Update piece bitboards (clear from, set to)
   - Update color bitboards
   - Update occupied bitboard
   - If capture: clear captured piece bitboards
   - If stack involved: update Stack Manager
   - If deploy: update Deploy Session
   - If anti-air moved: update Air Defense Zones

4. Update game state:
   - Switch turn
   - Increment move counters
   - Add to history

5. Return move result
```

### Scenario 4: Deploy Move Sequence

```
1. User selects stack at e2

2. Application calls: engine.moves({ square: 'e2' })

3. Move Generator:
   - Checks if e2 has stack
   - Initiates deploy session
   - Generates deploy moves for first piece

4. User deploys first piece to e4

5. Application calls: engine.move('e2', 'e4')

6. Deploy Session:
   - Records deploy move
   - Removes piece from remaining
   - Updates bitboards
   - Generates moves for next piece

7. Repeat until all pieces deployed

8. Application calls: engine.commitDeploySession()

9. Deploy Session:
   - Validates all pieces deployed
   - Finalizes move
   - Switches turn
   - Clears session

10. Position ready for next move
```

## Two-Level Undo Pattern

### Insight from Chess Programming

After studying mature chess projects, we discovered two different undo needs:

**Level 1: Temporary Validation (Internal)**

- Purpose: Check if move is legal
- Frequency: 30+ times per move
- Storage: Minimal undo info (~50 bytes)
- Lifetime: Milliseconds

**Level 2: User Undo/Redo (Public API)**

- Purpose: Let user undo moves
- Frequency: Once per user move
- Storage: Full state snapshot (~500 bytes)
- Lifetime: Entire game

### Implementation Strategy

```typescript
// Level 1: Minimal undo for validation
interface UndoInfo {
  captured?: Piece; // ~20 bytes
  stackChanges?: StackDelta; // ~30 bytes
  // Only what changed!
}

function isMoveLegal(move: Move): boolean {
  const undo = makeMove(move); // Save minimal info
  const legal = !isCheck();
  undoMove(move, undo); // Restore using undo info
  return legal;
}

// Level 2: Full history for user undo
interface HistoryEntry {
  move: Move;
  bitboards: BitboardSet; // ~400 bytes
  stacks: StackManager; // ~50 bytes
  turn: Color;
  moveNumber: number;
  // Everything!
}

class CoTuLenh {
  private history: HistoryEntry[] = [];

  move(from, to) {
    // Validate using Level 1 (minimal undo)
    if (!isMoveLegal({ from, to })) return null;

    // Save using Level 2 (full history)
    this.history.push(captureFullState());

    // Apply move
    this.position.makeMove({ from, to });
  }

  undo() {
    // Restore from Level 2 (full history)
    const state = this.history.pop();
    this.restoreFullState(state);
  }
}
```

### Why This Matters

**Memory Efficiency:**

- Validating 30 moves: 50 bytes (reused) vs 15 KB (full snapshots)
- User history: 500 bytes × moves (acceptable)

**Performance:**

- Minimal undo is 10x faster to create
- Full history is simpler to restore

**Correctness:**

- Don't confuse the two patterns!
- Use right tool for each job

## Hybrid Approach Rationale

### Why Not Pure Bitboards?

**Stacks are complex**:

- Need to track multiple pieces per square
- Need to track piece order (carrier vs carried)
- Need to track individual piece properties (heroic status)
- Bitboards excel at "which squares" not "what details"

**Deploy sessions are stateful**:

- Multi-step process with intermediate states
- Need to track partial progress
- Need to support undo within session
- Better suited to object-oriented approach

**Air defense zones are sparse**:

- Only a few anti-air pieces
- Zones don't change frequently
- Map structure more efficient than bitboard for sparse data

### Hybrid Strategy

**Use bitboards for**:

- Fast piece location queries
- Fast attack detection
- Fast move generation
- Fast occupancy checks

**Use traditional structures for**:

- Stack composition details
- Deploy session state
- Air defense zone mappings
- Move history

**Integration points**:

- Carrier bitboard marks stack squares
- Stack Manager provides details
- Bitboards updated when stacks change
- Both stay synchronized

## Performance Considerations

### Bitboard Advantages

**Move Generation**:

- 0x88: Iterate all squares, check each piece
- Bitboard: Iterate only occupied squares (popCount)
- Speedup: 2-3x for typical positions

**Attack Detection**:

- 0x88: Check each piece, calculate attacks
- Bitboard: OR all attack bitboards
- Speedup: 5-10x for complex positions

**Occupancy Queries**:

- 0x88: Array lookup
- Bitboard: Bit test
- Speedup: Similar, but enables batch operations

### Memory Usage

**0x88 Engine**:

- Board array: 256 \* 8 bytes = 2KB
- Additional structures: ~4KB
- Total: ~6KB per position

**Bitboard Engine**:

- Bitboards: 13 piece types \* 16 bytes = 208 bytes
- Color bitboards: 2 \* 16 bytes = 32 bytes
- Stack Manager: ~2KB (sparse)
- Deploy Session: ~1KB (when active)
- Total: ~3KB per position

**Memory savings**: ~50% reduction

### Cache Efficiency

**Bitboards are cache-friendly**:

- Compact representation
- Sequential bit operations
- Fewer memory accesses
- Better CPU cache utilization

## Testing Strategy

### Unit Tests

**Bitboard Operations**:

```
Test basic operations:
  - setBit, clearBit, isSet
  - and, or, xor, not
  - popCount, lsb, msb
  - Shift operations

Test edge cases:
  - Empty bitboard
  - Full bitboard
  - Single bit
  - Boundary squares
```

**Stack Manager**:

```
Test stack operations:
  - Create stack
  - Add to stack
  - Remove from stack
  - Validate composition
  - Destroy stack

Test integration:
  - Sync with bitboards
  - Handle moves
  - Handle captures
```

**Move Generation**:

```
Test each piece type:
  - Generate all moves
  - Filter by square
  - Filter by piece type
  - Check legality

Test special cases:
  - Stacks
  - Deploy moves
  - Air defense restrictions
  - Terrain restrictions
```

### Integration Tests

**Compatibility with cotulenh-core**:

```
For each test position:
  coreEngine.load(FEN)
  bitboardEngine.load(FEN)

  coreMoves = coreEngine.moves()
  bitboardMoves = bitboardEngine.moves()

  assert coreMoves == bitboardMoves

  for each move:
    coreEngine.move(move)
    bitboardEngine.move(move)

    assert coreEngine.fen() == bitboardEngine.fen()
```

### Performance Tests

**Benchmarks**:

```
Measure:
  - Move generation time
  - Attack detection time
  - Position evaluation time
  - Memory usage
  - FEN parsing time

Compare:
  - cotulenh-core vs cotulenh-bitboard
  - Simple positions vs complex positions
  - With stacks vs without stacks
```

## Migration from cotulenh-core

### Phase 1: Core Bitboard Operations

- Implement 128-bit bitboard structure
- Implement basic bitboard operations
- Test bitboard operations

### Phase 2: Position Representation

- Implement piece bitboards
- Implement color bitboards
- Implement FEN parsing to bitboards
- Test position loading

### Phase 3: Move Generation

- Implement pseudo-legal move generation
- Implement legality filtering
- Test against cotulenh-core

### Phase 4: Hybrid Structures

- Implement Stack Manager
- Implement Deploy Session
- Implement Air Defense Calculator
- Test complex mechanics

### Phase 5: Public API

- Implement CoTuLenh class
- Match cotulenh-core API exactly
- Test API compatibility

### Phase 6: Optimization

- Profile performance
- Optimize hot paths
- Add caching
- Benchmark improvements

## Success Criteria

**Correctness**:

- [ ] Produces identical moves to cotulenh-core for all test positions
- [ ] Produces identical FEN output for all positions
- [ ] Handles all edge cases correctly

**Performance**:

- [ ] Move generation 2x faster than cotulenh-core
- [ ] Attack detection 5x faster than cotulenh-core
- [ ] Memory usage 50% less than cotulenh-core

**Compatibility**:

- [ ] Same public API as cotulenh-core
- [ ] Can swap engines without code changes
- [ ] All tests pass with both engines

This design provides a clear roadmap for implementing a high-performance bitboard engine while maintaining full compatibility with the existing 0x88 implementation.
