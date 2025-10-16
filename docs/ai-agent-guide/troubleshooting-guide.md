# Troubleshooting Guide

## Common Issues and Solutions

This guide covers the most frequent problems encountered when working with the CoTuLenh system and their solutions.

## Deploy Session Issues

### Issue: Legal Moves Not Updating During Deploy

**Symptoms:**

- Air Force can't fly past captured Anti-Air even after Tank captures it
- Legal moves calculated once at start of deploy, never recalculated
- Deploy session shows stale move options

**Root Cause:**
Board package managing deploy sessions internally instead of delegating to core.

**Solution:**

```typescript
// REMOVE from board.ts
if (state.stackPieceMoves) {
  handleStackPieceMoves(state, piecesPrepared, origMove, destMove);
  // ... complex internal logic
}

// REPLACE with simple delegation
export function userMove(
  state: HeadlessState,
  origMove: cg.OrigMove,
  destMove: cg.DestMove
): boolean {
  if (!canMove(state, origMove, destMove)) {
    unselect(state);
    return false;
  }

  // Just trigger callback - let core handle everything
  callUserFunction(state.movable.events.after, origMove, destMove);
  unselect(state);
  return true;
}
```

**Verification:**

```typescript
// Test that legal moves update correctly
test('legal moves update after deploy step', () => {
  const game = new CoTuLenh();
  // Set up Air Force+Tank vs Anti-Air scenario

  const initialMoves = game.moves();
  expect(canAirForceFlyPast(initialMoves, 'e6')).toBe(false);

  // Tank captures Anti-Air
  game.move({ from: 'd5', to: 'e6', piece: 't', deploy: true });

  const updatedMoves = game.moves();
  expect(canAirForceFlyPast(updatedMoves, 'e6')).toBe(true);
});
```

### Issue: Deploy Session State Inconsistency

**Symptoms:**

- Board shows different pieces than core thinks are there
- FEN doesn't match visual board state
- Deploy session gets "stuck" in partial state

**Root Cause:**
Multiple sources of truth for deploy session state.

**Solution:**

```typescript
// In Svelte app - single source of truth
$: if (boardApi && $gameStore.fen) {
  // Always update board from core's FEN (includes virtual state)
  boardApi.set({
    fen: $gameStore.fen, // This includes deploy session virtual state
    movable: {
      dests: mapPossibleMovesToDests($gameStore.possibleMoves)
    }
  });
}
```

**Debug Commands:**

```typescript
// Check state consistency
console.log('Core FEN:', game.fen());
console.log('Board pieces:', Array.from(boardApi.state.pieces.entries()));
console.log('Deploy state:', game.getDeployState());
```

## Board-Core Integration Issues

### Issue: Moves Not Registering

**Symptoms:**

- User drags piece but nothing happens
- No error messages, move just ignored
- Board doesn't update after attempted move

**Debugging Steps:**

```typescript
// Add logging to trace the flow
function handleMove(orig: OrigMove, dest: DestMove) {
  console.log('1. Board move attempt:', orig, '->', dest);

  try {
    const moveResult = makeCoreMove(game, orig, dest);
    console.log('2. Core move result:', moveResult);

    if (moveResult) {
      console.log('3. Applying move to store');
      gameStore.applyMove(game, moveResult);
    } else {
      console.log('3. Move was illegal');
    }
  } catch (error) {
    console.error('3. Move error:', error);
  }
}
```

**Common Causes:**

1. **Type Conversion Error**: Board and core use different piece type systems
2. **Event Handler Not Registered**: `movable.events.after` not set correctly
3. **Core Validation Failure**: Move is illegal according to core rules

**Solutions:**

```typescript
// 1. Fix type conversion
function makeCoreMove(game: CoTuLenh, orig: OrigMove, dest: DestMove): Move | null {
  const coreType = getCoreTypeFromRole(orig.type); // Ensure conversion works
  if (!coreType) {
    console.error('Invalid piece type conversion:', orig.type);
    return null;
  }

  return game.move({
    from: orig.square,
    to: dest.square,
    piece: coreType,
    stay: dest.stay
  });
}

// 2. Ensure event handler is registered
boardApi = CotulenhBoard(boardContainerElement, {
  movable: {
    events: {
      after: handleMove, // Make sure this is set
      afterStackMove: handleStackMove
    }
  }
});

// 3. Check core validation
const legalMoves = game.moves();
console.log('Legal moves:', legalMoves);
```

### Issue: Board Not Updating After Move

**Symptoms:**

- Move is processed by core successfully
- Game state updates in store
- Board visual doesn't change

**Root Cause:**
Reactive update not triggering or board API not being called.

**Solution:**

```typescript
// Check reactive statement
$: if (boardApi && $gameStore.fen) {
  console.log('Reactive update triggered:', $gameStore.fen);
  reSetupBoard();
}

// Ensure reSetupBoard actually updates the board
function reSetupBoard(): Api | null {
  if (!boardApi) {
    console.error('Board API not available');
    return null;
  }

  try {
    boardApi.set({
      fen: $gameStore.fen,
      turnColor: coreToBoardColor($gameStore.turn),
      movable: {
        dests: mapPossibleMovesToDests($gameStore.possibleMoves)
      }
    });
    console.log('Board updated successfully');
  } catch (error) {
    console.error('Error updating board:', error);
  }

  return boardApi;
}
```

## Performance Issues

### Issue: Slow Move Generation

**Symptoms:**

- Noticeable delay when selecting pieces
- UI freezes during move calculation
- High CPU usage

**Debugging:**

```typescript
// Profile move generation
console.time('Move Generation');
const moves = game.moves();
console.timeEnd('Move Generation');
console.log('Generated', moves.length, 'moves');
```

**Solutions:**

```typescript
// 1. Cache legal moves until state changes
let cachedMoves: Move[] = [];
let cachedFen: string = '';

function getPossibleMoves(game: CoTuLenh): Move[] {
  const currentFen = game.fen();
  if (currentFen === cachedFen) {
    return cachedMoves;
  }

  cachedMoves = game.moves({ verbose: true });
  cachedFen = currentFen;
  return cachedMoves;
}

// 2. Debounce rapid updates
import { debounce } from 'lodash-es';

const debouncedBoardUpdate = debounce(() => {
  reSetupBoard();
}, 16); // ~60fps

$: if (boardApi && $gameStore.fen) {
  debouncedBoardUpdate();
}
```

### Issue: Memory Leaks

**Symptoms:**

- Memory usage grows over time
- Browser becomes sluggish after extended play
- Game history consuming too much memory

**Solutions:**

```typescript
// 1. Limit history size
const MAX_HISTORY_SIZE = 100;

applyMove(game: CoTuLenh, move: Move) {
  update((state) => {
    const newHistory = [...state.history, move];
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift(); // Remove oldest move
    }

    return {
      ...state,
      history: newHistory,
      // ... other updates
    };
  });
}

// 2. Clean up event listeners
onMount(() => {
  const unsubscribe = gameStore.subscribe((state) => {
    // Handle state changes
  });

  return () => {
    unsubscribe(); // Clean up subscription
    boardApi?.destroy(); // Clean up board
  };
});
```

## Type System Issues

### Issue: TypeScript Compilation Errors

**Common Errors:**

```typescript
// Error: Type 'Role' is not assignable to type 'PieceSymbol'
const coreType: PieceSymbol = boardPiece.role; // Wrong!

// Error: Property 'deploy' does not exist on type 'Move'
if (move.deploy) { ... } // Wrong interface!
```

**Solutions:**

```typescript
// 1. Use proper type conversion functions
const coreType = getCoreTypeFromRole(boardPiece.role);
const boardRole = getRoleFromCoreType(corePiece.type);

// 2. Use type guards for move types
if (MoveFactory.isDeployStepMove(move)) {
  // Now TypeScript knows this is a DeployStepMove
  console.log(move.remaining); // This property exists
}

// 3. Define proper interfaces
interface BoardToCore {
  convertPiece(piece: BoardPiece): CorePiece;
  convertMove(orig: OrigMove, dest: DestMove): CoreMoveRequest;
}
```

### Issue: Runtime Type Errors

**Symptoms:**

- "Cannot read property 'type' of undefined"
- "Invalid piece symbol: undefined"
- Pieces not rendering correctly

**Debugging:**

```typescript
// Add runtime type checking
function convertBoardPieceToCorePiece(piece: BoardPiece): CorePiece {
  if (!piece) {
    throw new Error('Piece is undefined');
  }

  if (!piece.role) {
    throw new Error('Piece role is undefined');
  }

  const type = getCoreTypeFromRole(piece.role);
  if (!type) {
    throw new Error(`Invalid piece role: ${piece.role}`);
  }

  return { type, color: piece.color === 'red' ? 'r' : 'b' };
}
```

## FEN/State Serialization Issues

### Issue: Invalid FEN Strings

**Symptoms:**

- "Invalid FEN: not enough parts" error
- Board not loading from saved state
- Deploy session not preserved in FEN

**Debugging:**

```typescript
// Validate FEN structure
function debugFEN(fen: string) {
  const parts = fen.split(' ');
  console.log('FEN parts:', parts);
  console.log('Expected: position turn commanders moveNumber halfMoves deploySession');

  if (parts.length < 5) {
    console.error('FEN missing parts');
  }

  // Validate each part
  console.log('Position:', parts[0]);
  console.log('Turn:', parts[1]);
  console.log('Commanders:', parts[2]);
  console.log('Move number:', parts[3]);
  console.log('Half moves:', parts[4]);
  console.log('Deploy session:', parts[5] || 'none');
}
```

**Solutions:**

```typescript
// 1. Ensure FEN includes all required parts
function generateFEN(gameState: IGameState): string {
  const parts = [
    generatePositionString(gameState),
    gameState.turn,
    generateCommanderString(gameState),
    gameState.moveNumber.toString(),
    gameState.halfMoves.toString(),
    deploySessionToSAN(gameState.deploySession) || '-' // Always include deploy part
  ];

  return parts.join(' ');
}

// 2. Validate FEN before parsing
function parseFEN(fen: string): IGameState {
  const parts = fen.split(' ');

  if (parts.length < 5) {
    throw new Error(`Invalid FEN: expected at least 5 parts, got ${parts.length}`);
  }

  // ... rest of parsing
}
```

## Testing and Debugging Tools

### Debug Console Commands

Add these to browser console for debugging:

```typescript
// Global debug helpers (add to window in development)
window.debugCoTuLenh = {
  game: () => game,
  gameStore: () => gameStore,
  boardApi: () => boardApi,

  // Quick state inspection
  state: () => ({
    fen: game?.fen(),
    turn: game?.turn(),
    moves: game?.moves().length,
    deployState: game?.getDeployState()
  }),

  // Force board update
  refreshBoard: () => reSetupBoard(),

  // Test move
  testMove: (from: string, to: string) => {
    const move = game?.move({ from, to });
    console.log('Test move result:', move);
    return move;
  }
};
```

### Automated Testing Patterns

```typescript
// Integration test template
describe('Board-Core Integration', () => {
  let game: CoTuLenh;
  let gameStore: any;

  beforeEach(() => {
    game = new CoTuLenh();
    gameStore = createGameStore();
    gameStore.initialize(game);
  });

  test('move updates both core and store', () => {
    const initialFen = game.fen();

    // Simulate board move
    const move = game.move({ from: 'a2', to: 'a3' });
    expect(move).toBeTruthy();

    // Update store
    gameStore.applyMove(game, move);

    // Verify state consistency
    expect(game.fen()).not.toBe(initialFen);
    expect(gameStore.get().fen).toBe(game.fen());
  });
});
```

## Emergency Recovery Procedures

### Complete State Reset

```typescript
function emergencyReset() {
  try {
    // 1. Reset core game
    game = new CoTuLenh();

    // 2. Reset store
    gameStore.initialize(game);

    // 3. Recreate board
    boardApi?.destroy();
    boardApi = CotulenhBoard(boardContainerElement, {
      fen: game.fen(),
      movable: {
        events: { after: handleMove, afterStackMove: handleStackMove }
      }
    });

    console.log('Emergency reset completed');
  } catch (error) {
    console.error('Emergency reset failed:', error);
    // Last resort: reload page
    window.location.reload();
  }
}
```

### State Recovery from FEN

```typescript
function recoverFromFEN(fen: string) {
  try {
    // Load game from FEN
    game.load(fen);

    // Update store
    gameStore.initialize(game);

    // Update board
    reSetupBoard();

    console.log('Recovered from FEN:', fen);
  } catch (error) {
    console.error('FEN recovery failed:', error);
    emergencyReset();
  }
}
```

## Prevention Best Practices

1. **Always Use Try-Catch**: Wrap all board-core interactions
2. **Validate Inputs**: Check types and values before processing
3. **Log State Changes**: Track what's happening for debugging
4. **Test Edge Cases**: Deploy sessions, captures, special moves
5. **Monitor Performance**: Profile slow operations
6. **Clean Up Resources**: Remove event listeners, clear caches
7. **Version Control**: Keep working states in git for rollback
