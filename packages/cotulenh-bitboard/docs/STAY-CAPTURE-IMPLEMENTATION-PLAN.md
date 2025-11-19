# Stay Capture Implementation Plan

## Overview

Stay capture is a special capture mechanism where a piece captures an enemy piece without moving to the target square. This occurs when terrain prevents the attacking piece from occupying the target square.

## When Stay Capture Occurs

1. **Navy captures Land piece on land** → Stay capture only (Navy can't move to land)
2. **Land piece captures Navy on water** → Stay capture only (Land piece can't move to water)
3. **Air Force captures any piece** → Player can CHOOSE stay capture OR normal capture
   - Exception: Air Force capturing Navy at sea → Stay capture only

## Implementation Steps

### Step 1: Update Move Flags

**File**: `packages/cotulenh-bitboard/src/move-generator.ts`

```typescript
export const MOVE_FLAGS = {
  NORMAL: 0,
  CAPTURE: 1,
  COMBINATION: 2,
  DEPLOY: 4,
  KAMIKAZE: 8,
  STAY_CAPTURE: 16 // NEW: Stay capture flag
} as const;
```

**Rationale**: Add the STAY_CAPTURE flag to distinguish stay captures from normal captures.

---

### Step 2: Update Move Interface

**File**: `packages/cotulenh-bitboard/src/move-generator.ts`

The existing `Move` interface already supports flags, so no changes needed. The flag will be set in the `flags` field.

---

### Step 3: Add Stay Capture Logic to Move Generation

**File**: `packages/cotulenh-bitboard/src/move-generator.ts`

Update the `generateMovesInDirection` function to handle stay capture:

```typescript
// Inside generateMovesInDirection, in the capture logic section:

if (targetPiece) {
  // ... existing code for commander special rules ...

  // Capture logic
  if (targetPiece.color === them && currentRange <= config.captureRange) {
    // NEW: Handle stay capture logic
    handleCaptureLogic(moves, from, to, piece, targetPiece, currentRange, config, isDeployMove);
  }

  // ... rest of existing code ...
}
```

Add new `handleCaptureLogic` function:

```typescript
/**
 * Handles capture logic including stay capture mechanics
 * @param moves - Array to add moves to
 * @param from - Source square
 * @param to - Target square
 * @param attacker - Attacking piece
 * @param target - Target piece being captured
 * @param currentRange - Current range of the move
 * @param config - Movement configuration
 * @param isDeployMove - Whether this is a deploy move
 */
function handleCaptureLogic(
  moves: Move[],
  from: number,
  to: number,
  attacker: Piece,
  target: Piece,
  currentRange: number,
  config: PieceMovementConfig,
  isDeployMove: boolean
): void {
  let addNormalCapture = true;
  let addStayCapture = false;

  // Check if attacker can stay on target square (terrain compatibility)
  const canLandOnTarget = canPieceStayOnSquare(attacker.type, to);

  if (!canLandOnTarget) {
    // Terrain incompatible → stay capture only
    addStayCapture = true;
    addNormalCapture = false;
  }

  // Air Force special case: can choose both options (except Navy at sea)
  if (attacker.type === 'f') {
    // Air Force
    if (canLandOnTarget) {
      // Can land on target → offer both options (unless in deploy mode)
      if (!isDeployMove) {
        addStayCapture = true; // Add stay capture option
      }
      addNormalCapture = true; // Keep normal capture option
    } else {
      // Can't land (e.g., Navy at sea) → stay capture only
      addStayCapture = true;
      addNormalCapture = false;
    }
  }

  // Commander special rule: only captures adjacent
  if (attacker.type === 'c' && currentRange > 1) {
    return; // No capture allowed
  }

  // Navy special attack mechanisms
  if (attacker.type === 'n') {
    if (target.type === 'n') {
      // Torpedo attack (Navy vs Navy)
      if (currentRange > config.captureRange) {
        return; // Out of range
      }
    } else {
      // Naval Gun attack (Navy vs Land)
      if (currentRange > config.captureRange - 1) {
        return; // Out of range
      }
    }
  }

  // Add the appropriate capture moves
  if (addNormalCapture) {
    moves.push({
      from,
      to,
      piece: attacker,
      captured: target,
      flags: MOVE_FLAGS.CAPTURE
    });
  }

  if (addStayCapture) {
    moves.push({
      from,
      to,
      piece: attacker,
      captured: target,
      flags: MOVE_FLAGS.STAY_CAPTURE
    });
  }
}
```

---

### Step 4: Update Move Execution

**File**: `packages/cotulenh-bitboard/src/cotulenh.ts`

Update the `_makeMove` method to handle stay capture:

```typescript
private _makeMove(move: InternalMove): void {
  // Save current state to history
  const historyEntry: HistoryEntry = {
    position: this._clonePosition(),
    turn: this._turn,
    halfMoves: this._halfMoves,
    moveNumber: this._moveNumber,
    deploySession: this._deploySession
  };
  this._history.push(historyEntry);

  const isStayCapture = (move.flags & MOVE_FLAGS.STAY_CAPTURE) !== 0;

  if (isStayCapture) {
    // Stay capture: piece stays at origin, target is removed

    // Remove captured piece from target square
    if (move.captured) {
      this.position.removePiece(move.to);
      this._halfMoves = 0; // Reset on capture
    }

    // Piece stays at origin (no movement)
    // No need to move the piece

  } else {
    // Normal move or normal capture

    // Remove piece from source square
    const movingPiece = this.position.removePiece(move.from);
    if (!movingPiece) {
      throw new Error(`No piece at square ${move.from}`);
    }

    // Handle capture
    if (move.captured) {
      this.position.removePiece(move.to);
      this._halfMoves = 0; // Reset on capture
    } else {
      this._halfMoves++;
    }

    // Place piece at destination
    this.position.placePiece(movingPiece, move.to);

    // Update commander tracking
    if (movingPiece.type === 'c') {
      this._commanders[movingPiece.color] = move.to;
    }
  }

  // Switch turn
  this._turn = this._turn === 'r' ? 'b' : 'r';

  // Increment move number after blue's move
  if (this._turn === 'r') {
    this._moveNumber++;
  }

  // Update position counts
  this._updatePositionCounts();

  // Clear cache
  invalidateMoveCache();
}
```

---

### Step 5: Update SAN Notation

**File**: `packages/cotulenh-bitboard/src/cotulenh.ts`

Update `_moveToSan` to include stay capture notation:

```typescript
private _moveToSan(move: InternalMove): string {
  const pieceChar = move.piece.type.toUpperCase();
  const from = squareToAlgebraic(move.from);
  const to = squareToAlgebraic(move.to);

  const isStayCapture = (move.flags & MOVE_FLAGS.STAY_CAPTURE) !== 0;
  const isNormalCapture = (move.flags & MOVE_FLAGS.CAPTURE) !== 0;

  if (isStayCapture) {
    // Stay capture notation: "Td2<d3" (piece at d2 stay-captures at d3)
    return `${pieceChar}${from}<${to}`;
  } else if (isNormalCapture) {
    // Normal capture notation: "Txd3"
    return `${pieceChar}x${to}`;
  } else {
    // Normal move notation: "Td3"
    return `${pieceChar}${to}`;
  }
}
```

---

### Step 6: Update SAN Parsing

**File**: `packages/cotulenh-bitboard/src/cotulenh.ts`

Update `_moveFromSan` to parse stay capture notation:

```typescript
private _moveFromSan(san: string): InternalMove | null {
  // Check for stay capture notation: "Td2<d3" or "T<d3"
  const stayCaptureMatcher = /^([CITMEAGSFNH])([a-k][1-9][0-2]?)?<([a-k][1-9][0-2]?)$/;
  const stayMatch = san.match(stayCaptureMatcher);

  if (stayMatch) {
    const pieceType = stayMatch[1].toLowerCase() as PieceSymbol;
    const fromSquare = stayMatch[2]; // May be undefined
    const toSquare = stayMatch[3];

    // Find matching stay capture move
    const legalMoves = generateLegalMoves(this.position, this._turn);

    for (const move of legalMoves) {
      const isStayCapture = (move.flags & MOVE_FLAGS.STAY_CAPTURE) !== 0;

      if (isStayCapture &&
          move.piece.type === pieceType &&
          squareToAlgebraic(move.to) === toSquare) {

        // If from square specified, check it matches
        if (fromSquare && squareToAlgebraic(move.from) !== fromSquare) {
          continue;
        }

        return move;
      }
    }

    return null; // No matching move found
  }

  // ... existing SAN parsing logic for other move types ...
}
```

---

### Step 7: Update Move Class

**File**: `packages/cotulenh-bitboard/src/cotulenh.ts`

Add helper method to Move class:

```typescript
export class Move {
  // ... existing properties ...

  isCapture(): boolean {
    return this.flags.includes('c') || this.flags.includes('s');
  }

  isStayCapture(): boolean {
    return this.flags.includes('s');
  }

  isDeploy(): boolean {
    return this.flags.includes('d');
  }

  isCombination(): boolean {
    return this.flags.includes('&');
  }
}
```

Update `_convertToPublicMove` to include stay capture flag:

```typescript
private _convertToPublicMove(move: InternalMove, beforeFEN?: string, afterFEN?: string): Move {
  const from = squareToAlgebraic(move.from);
  const to = squareToAlgebraic(move.to);

  // Convert flags to string
  let flagsStr = '';
  if (move.flags & MOVE_FLAGS.CAPTURE) flagsStr += 'c';
  if (move.flags & MOVE_FLAGS.STAY_CAPTURE) flagsStr += 's';  // NEW
  if (move.flags & MOVE_FLAGS.COMBINATION) flagsStr += '&';
  if (move.flags & MOVE_FLAGS.DEPLOY) flagsStr += 'd';
  if (move.flags & MOVE_FLAGS.KAMIKAZE) flagsStr += 'k';

  return new Move({
    color: move.piece.color,
    from,
    to,
    piece: move.piece,
    captured: move.captured,
    flags: flagsStr,
    san: this._moveToSan(move),
    lan: this._moveToLan(move),
    before: beforeFEN || this.fen(),
    after: afterFEN || this.fen()
  });
}
```

---

### Step 8: Add Unit Tests

**File**: `packages/cotulenh-bitboard/src/stay-capture.test.ts` (new file)

```typescript
import { describe, it, expect } from 'vitest';
import { CoTuLenh } from './cotulenh';

describe('Stay Capture', () => {
  describe('Navy capturing land piece', () => {
    it('should generate stay capture when Navy captures land piece on land', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place red Navy at a6 (water)
      game.put({ type: 'n', color: 'r' }, 'a6');

      // Place blue Infantry at b6 (land)
      game.put({ type: 'i', color: 'b' }, 'b6');

      const moves = game.moves({ square: 'a6', verbose: true });

      // Should have stay capture move
      const stayCapture = moves.find((m) => m.to === 'b6' && m.isStayCapture());

      expect(stayCapture).toBeDefined();
      expect(stayCapture?.from).toBe('a6');
      expect(stayCapture?.to).toBe('b6');
      expect(stayCapture?.captured?.type).toBe('i');
    });

    it('should execute stay capture correctly', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'a6');
      game.put({ type: 'i', color: 'b' }, 'b6');

      // Execute stay capture
      const move = game.move({ from: 'a6', to: 'b6' });

      expect(move).not.toBeNull();
      expect(move?.isStayCapture()).toBe(true);

      // Navy should still be at a6
      expect(game.get('a6')?.type).toBe('n');

      // Infantry should be captured (b6 empty)
      expect(game.get('b6')).toBeUndefined();
    });
  });

  describe('Land piece capturing Navy', () => {
    it('should generate stay capture when land piece captures Navy on water', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place red Tank at c6 (land)
      game.put({ type: 't', color: 'r' }, 'c6');

      // Place blue Navy at b6 (water)
      game.put({ type: 'n', color: 'b' }, 'b6');

      const moves = game.moves({ square: 'c6', verbose: true });

      // Should have stay capture move
      const stayCapture = moves.find((m) => m.to === 'b6' && m.isStayCapture());

      expect(stayCapture).toBeDefined();
      expect(stayCapture?.from).toBe('c6');
      expect(stayCapture?.to).toBe('b6');
    });
  });

  describe('Air Force capture options', () => {
    it('should generate both normal and stay capture for Air Force on land', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place red Air Force at e6
      game.put({ type: 'f', color: 'r' }, 'e6');

      // Place blue Infantry at f6
      game.put({ type: 'i', color: 'b' }, 'f6');

      const moves = game.moves({ square: 'e6', verbose: true });

      // Should have both normal capture and stay capture
      const normalCapture = moves.find((m) => m.to === 'f6' && m.isCapture() && !m.isStayCapture());
      const stayCapture = moves.find((m) => m.to === 'f6' && m.isStayCapture());

      expect(normalCapture).toBeDefined();
      expect(stayCapture).toBeDefined();
    });

    it('should only generate stay capture when Air Force captures Navy at sea', () => {
      const game = new CoTuLenh();
      game.clear();

      // Place red Air Force at c6
      game.put({ type: 'f', color: 'r' }, 'c6');

      // Place blue Navy at b6 (water)
      game.put({ type: 'n', color: 'b' }, 'b6');

      const moves = game.moves({ square: 'c6', verbose: true });

      // Should only have stay capture (can't land on water)
      const captures = moves.filter((m) => m.to === 'b6');

      expect(captures.length).toBe(1);
      expect(captures[0].isStayCapture()).toBe(true);
    });
  });

  describe('SAN notation', () => {
    it('should use < notation for stay capture', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'a6');
      game.put({ type: 'i', color: 'b' }, 'b6');

      const move = game.move({ from: 'a6', to: 'b6' });

      expect(move?.san).toBe('Na6<b6');
    });

    it('should parse stay capture notation', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'a6');
      game.put({ type: 'i', color: 'b' }, 'b6');

      const move = game.move('Na6<b6');

      expect(move).not.toBeNull();
      expect(move?.isStayCapture()).toBe(true);
      expect(game.get('a6')?.type).toBe('n');
      expect(game.get('b6')).toBeUndefined();
    });
  });

  describe('Undo stay capture', () => {
    it('should correctly undo stay capture', () => {
      const game = new CoTuLenh();
      game.clear();

      game.put({ type: 'n', color: 'r' }, 'a6');
      game.put({ type: 'i', color: 'b' }, 'b6');

      game.move({ from: 'a6', to: 'b6' });
      game.undo();

      // Both pieces should be restored
      expect(game.get('a6')?.type).toBe('n');
      expect(game.get('b6')?.type).toBe('i');
    });
  });
});
```

---

## Testing Checklist

- [ ] Navy capturing land piece generates stay capture only
- [ ] Land piece capturing Navy generates stay capture only
- [ ] Air Force capturing land piece generates both options
- [ ] Air Force capturing Navy at sea generates stay capture only
- [ ] Stay capture execution keeps attacker at origin
- [ ] Stay capture removes target piece
- [ ] Stay capture SAN notation uses `<` symbol
- [ ] Stay capture parsing works correctly
- [ ] Undo stay capture restores both pieces
- [ ] Stay capture resets half-move counter
- [ ] Stay capture works in deploy mode
- [ ] Commander cannot stay capture (only adjacent normal capture)

## Implementation Order

1. ✅ Add STAY_CAPTURE flag constant
2. ✅ Add `handleCaptureLogic` function
3. ✅ Update move generation to call `handleCaptureLogic`
4. ✅ Update `_makeMove` to handle stay capture execution
5. ✅ Update SAN generation for stay capture notation
6. ✅ Update SAN parsing for stay capture notation
7. ✅ Add helper methods to Move class
8. ✅ Write comprehensive unit tests
9. ✅ Test integration with existing features (deploy, undo, etc.)
10. ✅ Update documentation

## Edge Cases to Consider

1. **Commander stay capture**: Commanders should NOT be able to stay capture (only adjacent normal capture)
2. **Deploy mode**: Stay capture should work during deploy sequences
3. **Heroic pieces**: Stay capture range should respect heroic bonuses
4. **Stacks**: Stay capture from a stack should work correctly
5. **Check/Checkmate**: Stay capture should be considered when checking for check escape
6. **Air defense**: Stay capture should not trigger air defense (piece doesn't move)

## Performance Considerations

- Stay capture doubles the number of moves for Air Force (both options)
- Move generation will be slightly slower due to terrain checking
- Consider caching terrain compatibility results if performance becomes an issue

## Compatibility Notes

- Stay capture is a core game mechanic in cotulenh-core
- Must maintain exact compatibility with cotulenh-core behavior
- SAN notation must match cotulenh-core format
- FEN representation doesn't change (stay capture is just a move type)
