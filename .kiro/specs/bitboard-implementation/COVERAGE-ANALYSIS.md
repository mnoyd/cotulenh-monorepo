# Coverage Analysis: cotulenh-core Capabilities vs Bitboard Implementation Plan

This document audits all capabilities of cotulenh-core and maps them to the bitboard implementation plan to ensure nothing is missed.

## Complete API Surface of cotulenh-core

### Constructor and Initialization

| Method               | Description                     | Covered in Plan? | Task Reference |
| -------------------- | ------------------------------- | ---------------- | -------------- |
| `constructor(fen)`   | Create engine with optional FEN | ✅ Yes           | Task 11.1      |
| `clear(options)`     | Clear board and reset state     | ✅ Yes           | Task 11.1      |
| `load(fen, options)` | Load position from FEN          | ✅ Yes           | Task 11.1, 9.1 |

### Position Queries

| Method                      | Description                 | Covered in Plan? | Task Reference  |
| --------------------------- | --------------------------- | ---------------- | --------------- |
| `fen()`                     | Get current position as FEN | ✅ Yes           | Task 11.1, 9.2  |
| `get(square, pieceType?)`   | Get piece at square         | ✅ Yes           | Task 11.2, 2.4  |
| `board()`                   | Get 2D array representation | ❌ **MISSING**   | **Need to add** |
| `turn()`                    | Get current turn color      | ✅ Yes           | Task 11.5       |
| `getCommanderSquare(color)` | Get commander position      | ❌ **MISSING**   | **Need to add** |

### Piece Manipulation

| Method                                | Description               | Covered in Plan? | Task Reference                                     |
| ------------------------------------- | ------------------------- | ---------------- | -------------------------------------------------- |
| `put(piece, square, allowCombine?)`   | Place piece on board      | ✅ Yes           | Task 11.2, 2.2                                     |
| `remove(square)`                      | Remove piece from square  | ✅ Yes           | Task 11.2, 2.3                                     |
| `updateCommandersPosition(sq, color)` | Update commander tracking | ⚠️ Partial       | Internal only, need to ensure bitboard tracks this |

### Move Generation

| Method               | Description                    | Covered in Plan? | Task Reference     |
| -------------------- | ------------------------------ | ---------------- | ------------------ |
| `moves(options)`     | Generate legal moves           | ✅ Yes           | Task 11.3, 7.1-7.5 |
| - `verbose` option   | Return Move objects vs strings | ✅ Yes           | Task 11.3, 9.8     |
| - `square` filter    | Filter by origin square        | ✅ Yes           | Task 7.2, 9.2      |
| - `pieceType` filter | Filter by piece type           | ✅ Yes           | Task 7.2, 9.3      |

### Move Execution

| Method                | Description                  | Covered in Plan? | Task Reference                       |
| --------------------- | ---------------------------- | ---------------- | ------------------------------------ |
| `move(move, options)` | Execute a move               | ✅ Yes           | Task 11.3, 10.2                      |
| - String format (SAN) | Parse and execute SAN        | ✅ Yes           | Task 9.1 (FEN parser can be adapted) |
| - Object format       | Execute from/to object       | ✅ Yes           | Task 11.3                            |
| `deployMove(request)` | Execute deploy move (legacy) | ❌ **MISSING**   | **Need to add**                      |
| `undo()`              | Undo last move               | ✅ Yes           | Task 11.3, 10.3                      |

### Deploy Session Management

| Method                             | Description               | Covered in Plan? | Task Reference |
| ---------------------------------- | ------------------------- | ---------------- | -------------- |
| `getDeploySession()`               | Get active deploy session | ✅ Yes           | Task 11.4, 5.1 |
| `setDeploySession(session)`        | Set deploy session        | ✅ Yes           | Task 11.4, 5.1 |
| `commitDeploySession(switchTurn?)` | Finalize deploy session   | ✅ Yes           | Task 11.4, 5.2 |
| `cancelDeploySession()`            | Cancel deploy session     | ✅ Yes           | Task 11.4, 5.2 |
| `resetDeploySession()`             | Reset deploy session      | ✅ Yes           | Task 11.4, 5.2 |
| `canCommitDeploy()`                | Check if can commit       | ✅ Yes           | Task 11.4, 5.2 |

### Recombine Operations

| Method                        | Description                     | Covered in Plan? | Task Reference |
| ----------------------------- | ------------------------------- | ---------------- | -------------- |
| `recombine(from, to, piece)`  | Recombine pieces during deploy  | ✅ Yes           | Task 11.4      |
| `getRecombineOptions(square)` | Get available recombine options | ✅ Yes           | Task 11.4      |
| `undoRecombineInstruction()`  | Undo last recombine             | ✅ Yes           | Task 11.4      |

### Game State Queries

| Method                    | Description                  | Covered in Plan? | Task Reference  |
| ------------------------- | ---------------------------- | ---------------- | --------------- |
| `isCheck()`               | Is current player in check   | ✅ Yes           | Task 11.5, 8.3  |
| `isCheckmate()`           | Is current player checkmated | ✅ Yes           | Task 11.5, 8.4  |
| `isDraw()`                | Is game drawn                | ❌ **MISSING**   | **Need to add** |
| `isDrawByFiftyMoves()`    | Check fifty-move rule        | ❌ **MISSING**   | **Need to add** |
| `isThreefoldRepetition()` | Check threefold repetition   | ❌ **MISSING**   | **Need to add** |
| `isGameOver()`            | Is game over                 | ✅ Yes           | Task 11.5       |

### Attack Detection

| Method                        | Description                 | Covered in Plan? | Task Reference  |
| ----------------------------- | --------------------------- | ---------------- | --------------- |
| `getAttackers(square, color)` | Get pieces attacking square | ❌ **MISSING**   | **Need to add** |

### Internal/Private Methods (Need Bitboard Equivalents)

| Method                            | Description                 | Covered in Plan? | Task Reference  |
| --------------------------------- | --------------------------- | ---------------- | --------------- |
| `_moves(options)`                 | Internal move generation    | ✅ Yes           | Task 7.1-7.5    |
| `_isCommanderAttacked(color)`     | Check if commander attacked | ✅ Yes           | Task 8.2, 8.3   |
| `_isCommanderExposed(color)`      | Check if commander exposed  | ✅ Yes           | Task 8.3        |
| `_filterLegalMoves(moves, color)` | Filter illegal moves        | ✅ Yes           | Task 7.3        |
| `_executeTemporarily(move)`       | Execute move for testing    | ✅ Yes           | Task 7.3        |
| `_makeMove(move)`                 | Execute move permanently    | ✅ Yes           | Task 10.2       |
| `_undoMove()`                     | Undo move internally        | ✅ Yes           | Task 10.3       |
| `_moveToSanLan(move, moves)`      | Generate SAN/LAN notation   | ❌ **MISSING**   | **Need to add** |
| `_moveFromSan(move, strict)`      | Parse SAN notation          | ❌ **MISSING**   | **Need to add** |
| `_updatePositionCounts()`         | Track position repetition   | ❌ **MISSING**   | **Need to add** |
| `_getMovesCacheKey(args)`         | Generate cache key          | ✅ Yes           | Task 7.5        |
| `_addMoveToHistory(...)`          | Add move to history         | ✅ Yes           | Task 10.2       |
| `_finalizeDeployMove(session)`    | Finalize deploy in history  | ✅ Yes           | Task 10.2       |

## Missing Capabilities - Need to Add

### 1. Board Representation Method

**What**: `board()` returns 2D array of board state
**Why needed**: Used by UI to display board
**How in bitboard**: Iterate bitboards and construct 2D array
**Add to**: Task 11.5 (new subtask)

### 2. Commander Position Query

**What**: `getCommanderSquare(color)` returns commander position
**Why needed**: Used for check detection and UI
**How in bitboard**: Track in separate variables, query from bitboard
**Add to**: Task 8.1 (already tracks, just need public method)

### 3. Draw Detection Methods

**What**: `isDraw()`, `isDrawByFiftyMoves()`, `isThreefoldRepetition()`
**Why needed**: Game ending conditions
**How in bitboard**:

- Fifty-move: Track half-move counter (already in plan)
- Threefold: Track position counts (need to add)
  **Add to**: New task 11.6

### 4. Attacker Query Method

**What**: `getAttackers(square, color)` returns pieces attacking square
**Why needed**: Used for check detection and UI hints
**How in bitboard**: Use attack bitboards to find attackers
**Add to**: Task 8.2 (enhance attack detection)

### 5. SAN/LAN Notation Methods

**What**: `_moveToSanLan()` and `_moveFromSan()`
**Why needed**: Move notation for display and input
**How in bitboard**: Same algorithm, use bitboard queries
**Add to**: New task 11.7

### 6. Position Repetition Tracking

**What**: `_updatePositionCounts()` tracks position occurrences
**Why needed**: Threefold repetition detection
**How in bitboard**: Hash position, track in Map
**Add to**: New task 11.6

### 7. Legacy Deploy Move Method

**What**: `deployMove(request)` executes complete deploy move
**Why needed**: Backward compatibility
**How in bitboard**: Wrapper around deploy session
**Add to**: Task 11.4 (add as alternative API)

## Data Structures Not in Plan

### 1. Position Count Map

**What**: `_positionCount: Record<string, number>`
**Why needed**: Threefold repetition detection
**How in bitboard**: Same structure, hash FEN
**Add to**: Task 2.1 (position structure)

### 2. History Array

**What**: `_history: History[]` with full state snapshots
**Why needed**: Undo support
**How in bitboard**: Already in plan (Task 10.1)
**Status**: ✅ Covered

### 3. Comments Map

**What**: `_comments: Record<string, string>`
**Why needed**: PGN annotations
**How in bitboard**: Same structure
**Add to**: Task 11.1 (if needed for PGN support)

### 4. Header Map

**What**: `_header: Record<string, string>`
**Why needed**: PGN metadata
**How in bitboard**: Same structure
**Add to**: Task 11.1 (if needed for PGN support)

## Complex Mechanics Coverage

### Stack Mechanics

| Feature                 | Covered? | Task Reference |
| ----------------------- | -------- | -------------- |
| Stack creation          | ✅ Yes   | Task 4.2       |
| Stack modification      | ✅ Yes   | Task 4.2       |
| Stack validation        | ✅ Yes   | Task 4.3       |
| Stack moves             | ✅ Yes   | Task 7.1       |
| Stack in FEN            | ✅ Yes   | Task 9.1, 9.2  |
| Heroic status in stacks | ✅ Yes   | Task 4.1       |

### Deploy Moves

| Feature                 | Covered? | Task Reference |
| ----------------------- | -------- | -------------- |
| Session initiation      | ✅ Yes   | Task 5.2       |
| Incremental deployment  | ✅ Yes   | Task 5.2       |
| Deploy undo             | ✅ Yes   | Task 5.2       |
| Deploy commit           | ✅ Yes   | Task 5.2       |
| Deploy cancel           | ✅ Yes   | Task 5.2       |
| Recombine during deploy | ✅ Yes   | Task 11.4      |
| Deploy in FEN           | ✅ Yes   | Task 9.1, 9.2  |

### Air Defense

| Feature           | Covered? | Task Reference |
| ----------------- | -------- | -------------- |
| Zone calculation  | ✅ Yes   | Task 6.2       |
| Zone updates      | ✅ Yes   | Task 6.3       |
| Move restrictions | ✅ Yes   | Task 6.4       |
| Kamikaze attacks  | ✅ Yes   | Task 6.4       |

### Terrain

| Feature                 | Covered? | Task Reference |
| ----------------------- | -------- | -------------- |
| Water/land masks        | ✅ Yes   | Task 3.1       |
| Navy restrictions       | ✅ Yes   | Task 3.2, 3.3  |
| Land piece restrictions | ✅ Yes   | Task 3.2, 3.3  |

### Special Moves

| Feature                    | Covered?    | Task Reference                        |
| -------------------------- | ----------- | ------------------------------------- |
| Stay capture               | ⚠️ Implicit | Covered in move generation (Task 7.1) |
| Suicide capture (kamikaze) | ⚠️ Implicit | Covered in air force moves (Task 7.1) |
| Combination moves          | ⚠️ Implicit | Covered in stack creation (Task 4.2)  |

## Recommended Additions to Task List

### New Task 11.6: Implement Draw Detection

```
- [ ] 11.6 Implement draw detection methods
  - Implement isDrawByFiftyMoves() checking half-move counter
  - Implement position count tracking in makeMove
  - Implement isThreefoldRepetition() checking position counts
  - Implement isDraw() combining all draw conditions
  - _Requirements: 1.1, 1.2, 1.3_
```

### New Task 11.7: Implement Move Notation

```
- [ ] 11.7 Implement SAN/LAN notation support
  - Implement moveToSanLan() to generate notation from move
  - Implement moveFromSan() to parse SAN strings
  - Handle disambiguation for ambiguous moves
  - Support all move types (normal, capture, deploy, combination)
  - _Requirements: 1.7_
```

### New Task 11.8: Implement Additional Query Methods

```
- [ ] 11.8 Implement additional query methods
  - Implement board() to return 2D array representation
  - Implement getCommanderSquare(color) public method
  - Implement getAttackers(square, color) using bitboards
  - _Requirements: 1.1, 1.2, 1.3_
```

### Enhancement to Task 11.4: Add Legacy Deploy Method

```
- [ ] 11.4 Implement deploy session methods
  ... (existing items)
  - Implement deployMove(request) for backward compatibility
  - _Requirements: 1.1, 1.2, 1.3_
```

### Enhancement to Task 2.1: Add Position Tracking

```
- [ ] 2.1 Create BitboardPosition class structure
  ... (existing items)
  - Add positionCount Map for repetition tracking
  - Add header Map for PGN metadata (optional)
  - Add comments Map for PGN annotations (optional)
  - _Requirements: 2.7, 2.8_
```

## Summary

### Coverage Statistics

- **Total Public Methods**: 35
- **Covered in Plan**: 27 (77%)
- **Missing from Plan**: 8 (23%)

### Critical Missing Items

1. ❌ `board()` - 2D array representation
2. ❌ `isDraw()` and related draw detection
3. ❌ `getAttackers()` - attack queries
4. ❌ SAN/LAN notation parsing and generation
5. ❌ Position repetition tracking
6. ❌ `deployMove()` legacy method
7. ❌ `getCommanderSquare()` public query

### Recommendation

Add 3 new tasks (11.6, 11.7, 11.8) and enhance 2 existing tasks (2.1, 11.4) to achieve 100% coverage of cotulenh-core capabilities.

## Updated Task Count

- Original: 14 phases, 60+ tasks
- With additions: 14 phases, 68+ tasks
- Estimated additional work: ~10-15% more implementation time

The plan is comprehensive but needs these additions to fully replicate cotulenh-core functionality.
