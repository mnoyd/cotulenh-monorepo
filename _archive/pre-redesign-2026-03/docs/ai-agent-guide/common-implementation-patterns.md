# Common Implementation Patterns

## Overview

This guide covers the most common development tasks and the correct patterns to implement them in the CoTuLenh system.

## Pattern 1: Adding a New Piece Type

### Step 1: Define Core Types

```typescript
// In packages/cotulenh-core/src/types/Constants.ts
export const PIECE_SYMBOLS = {
  // ... existing pieces
  x: 'new-piece' // Add new piece symbol
} as const;

export type PieceSymbol = keyof typeof PIECE_SYMBOLS | 'new-piece';
```

### Step 2: Create Move Generator

```typescript
// In packages/cotulenh-core/src/move-generation/pieces/NewPieceGenerator.ts
export class NewPieceGenerator extends BasePieceGenerator {
  getPieceType(): PieceSymbol {
    return 'x';
  }

  generateMoves(square: number, context: GeneratorContext): Move[] {
    const moves: Move[] = [];
    const piece = context.board.get(square);

    if (!piece || piece.type !== 'x') return moves;

    // Implement piece-specific movement logic
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]; // Example: rook-like movement

    return this.generateSlides(square, piece, directions, 3, context); // Max 3 squares
  }
}
```

### Step 3: Register Generator

```typescript
// In packages/cotulenh-core/src/move-generation/MoveGeneratorFactory.ts
export function createMoveGenerator(): IMoveGenerator {
  const generator = new MoveGenerator();

  // ... existing generators
  generator.registerGenerator(new NewPieceGenerator());

  return generator;
}
```

### Step 4: Add Board Visualization

```typescript
// In packages/cotulenh-board/src/types.ts
export const roles = ['commander', 'infantry', /* ... */ 'new-piece'] as const;
export type Role = (typeof roles)[number];
```

### Step 5: Add Type Conversion

```typescript
// In apps/cotulenh-app/src/lib/utils.ts
const CORE_TO_BOARD_PIECE: Record<PieceSymbol, Role> = {
  // ... existing mappings
  x: 'new-piece'
};

const BOARD_TO_CORE_PIECE: Record<Role, PieceSymbol> = {
  // ... existing mappings
  'new-piece': 'x'
};
```

## Pattern 2: Adding a New Move Type

### Step 1: Define Move Interface

```typescript
// In packages/cotulenh-core/src/types/Move.ts
interface NewMoveType {
  readonly type: 'new-move-type';
  readonly from: number;
  readonly to: number;
  readonly piece: Piece;
  readonly specialProperty: string; // Move-specific data
  readonly color: Color;
}

export type Move = NormalMove | CaptureMove | /* ... */ | NewMoveType;
```

### Step 2: Add Move Factory Method

```typescript
// In packages/cotulenh-core/src/core/Move.ts
export class MoveFactory {
  // ... existing methods

  static createNewMoveType(
    from: number,
    to: number,
    piece: Piece,
    specialProperty: string,
    color: Color
  ): NewMoveType {
    return {
      type: 'new-move-type',
      from,
      to,
      piece,
      specialProperty,
      color
    };
  }

  static isNewMoveType(move: Move): move is NewMoveType {
    return move.type === 'new-move-type';
  }
}
```

### Step 3: Handle in Move Applicator

```typescript
// In packages/cotulenh-core/src/move-validation/MoveApplicator.ts
export function applyMoveToState(move: Move, gameState: IGameState): IGameState {
  if (MoveFactory.isNewMoveType(move)) {
    return applyNewMoveType(move, gameState);
  }

  // ... handle other move types
}

function applyNewMoveType(move: NewMoveType, gameState: IGameState): IGameState {
  const newBoard = gameState.board.clone();

  // Apply move-specific logic
  newBoard.set(move.from, null);
  newBoard.set(move.to, move.piece);

  // Handle special property effects
  // ...

  return gameState.withBoard(newBoard);
}
```

## Pattern 3: Adding UI Features

### Step 1: Add to Game State

```typescript
// In apps/cotulenh-app/src/lib/types/game.ts
interface GameState {
  // ... existing properties
  newFeature: NewFeatureData | null;
}
```

### Step 2: Update Game Store

```typescript
// In apps/cotulenh-app/src/lib/stores/game.ts
function createGameStore() {
  return {
    // ... existing methods

    updateNewFeature(data: NewFeatureData) {
      update((state) => ({
        ...state,
        newFeature: data
      }));
    }
  };
}
```

### Step 3: Create Svelte Component

```typescript
// In apps/cotulenh-app/src/lib/components/NewFeature.svelte
<script lang="ts">
  import { gameStore } from '$lib/stores/game';

  $: newFeatureData = $gameStore.newFeature;
</script>

{#if newFeatureData}
  <div class="new-feature">
    <!-- Feature UI -->
  </div>
{/if}
```

### Step 4: Integrate with Main Page

```typescript
// In apps/cotulenh-app/src/routes/+page.svelte
<script lang="ts">
  import NewFeature from '$lib/components/NewFeature.svelte';
</script>

<main>
  <!-- ... existing UI -->
  <NewFeature />
</main>
```

## Pattern 4: Handling Board Events

### Step 1: Define Event Handler

```typescript
// In apps/cotulenh-app/src/routes/+page.svelte
function handleNewBoardEvent(eventData: EventData) {
  if (!game) return;

  try {
    // Process event through core
    const result = game.processNewEvent(eventData);

    if (result) {
      // Update game store
      gameStore.updateFromNewEvent(game, result);
    }
  } catch (error) {
    // Reset board on error
    reSetupBoard();
    console.error('Error handling board event:', error);
  }
}
```

### Step 2: Register Event Handler

```typescript
// In board configuration
boardApi = CotulenhBoard(boardContainerElement, {
  // ... existing config
  events: {
    newEvent: handleNewBoardEvent
  }
});
```

### Step 3: Update Board State

```typescript
// Reactive update will automatically refresh board
$: if (boardApi && $gameStore.fen) {
  reSetupBoard();
}
```

## Pattern 5: Adding Game Rules

### Step 1: Implement in Core

```typescript
// In packages/cotulenh-core/src/move-validation/
export function validateNewRule(move: Move, gameState: IGameState): boolean {
  // Implement rule logic
  return true; // or false if rule violated
}
```

### Step 2: Integrate with Move Validation

```typescript
// In packages/cotulenh-core/src/move-validation/MoveValidator.ts
export function isMoveLegal(move: Move, gameState: IGameState, color: Color): boolean {
  // ... existing validations

  if (!validateNewRule(move, gameState)) {
    return false;
  }

  return true;
}
```

### Step 3: Add Tests

```typescript
// In packages/cotulenh-core/__tests__/move-validation/new-rule.test.ts
describe('New Rule Validation', () => {
  test('should allow legal moves under new rule', () => {
    const game = new CoTuLenh();
    // Set up test scenario

    const move = game.move({ from: 'a1', to: 'a2' });
    expect(move).toBeTruthy();
  });

  test('should reject illegal moves under new rule', () => {
    const game = new CoTuLenh();
    // Set up test scenario

    const move = game.move({ from: 'a1', to: 'h8' });
    expect(move).toBeNull();
  });
});
```

## Pattern 6: Debugging Data Flow

### Step 1: Add Logging Points

```typescript
// In apps/cotulenh-app/src/routes/+page.svelte
function handleMove(orig: OrigMove, dest: DestMove) {
  console.log('🎯 Board move attempt:', orig, '->', dest);

  try {
    const moveResult = makeCoreMove(game, orig, dest);
    console.log('⚙️ Core move result:', moveResult);

    if (moveResult) {
      gameStore.applyMove(game, moveResult);
      console.log('📊 Updated game state:', $gameStore);
    }
  } catch (error) {
    console.error('❌ Move error:', error);
  }
}
```

### Step 2: Trace State Changes

```typescript
// In apps/cotulenh-app/src/lib/stores/game.ts
applyMove(game: CoTuLenh, move: Move) {
  const oldState = get(this);

  update((state) => {
    const newState = {
      ...state,
      fen: game.fen(),
      possibleMoves: getPossibleMoves(game),
      // ... other updates
    };

    console.log('🔄 State transition:', {
      oldFen: oldState.fen,
      newFen: newState.fen,
      move: move
    });

    return newState;
  });
}
```

### Step 3: Monitor Board Updates

```typescript
// In apps/cotulenh-app/src/routes/+page.svelte
$: if (boardApi && $gameStore.fen) {
  console.log('🎨 Board update triggered:', {
    fen: $gameStore.fen,
    possibleMoves: $gameStore.possibleMoves.length
  });
  reSetupBoard();
}
```

## Pattern 7: Error Handling

### Step 1: Graceful Degradation

```typescript
function handleMove(orig: OrigMove, dest: DestMove) {
  try {
    const moveResult = makeCoreMove(game, orig, dest);

    if (moveResult) {
      gameStore.applyMove(game, moveResult);
    } else {
      // Move was illegal - no state change needed
      console.warn('Illegal move attempted:', orig, '->', dest);
    }
  } catch (error) {
    // Reset to consistent state
    reSetupBoard();
    console.error('Error making move:', error);

    // Optionally show user feedback
    showErrorMessage('Invalid move. Board reset to last valid state.');
  }
}
```

### Step 2: State Recovery

```typescript
function reSetupBoard(): Api | null {
  if (!boardApi || !game) return null;

  try {
    boardApi.set({
      fen: $gameStore.fen,
      turnColor: coreToBoardColor($gameStore.turn),
      movable: {
        dests: mapPossibleMovesToDests($gameStore.possibleMoves)
      }
    });
  } catch (error) {
    console.error('Error resetting board:', error);
    // Last resort: recreate board
    recreateBoard();
  }

  return boardApi;
}
```

## Pattern 8: Performance Optimization

### Step 1: Memoize Expensive Calculations

```typescript
// In apps/cotulenh-app/src/lib/utils.ts
const moveCache = new Map<string, Dests>();

export function mapPossibleMovesToDests(possibleMoves: Move[]): Dests {
  const cacheKey = possibleMoves.map((m) => `${m.from}-${m.to}`).join(',');

  if (moveCache.has(cacheKey)) {
    return moveCache.get(cacheKey)!;
  }

  const dests = new Map<OrigMoveKey, DestMove[]>();
  // ... expensive calculation

  moveCache.set(cacheKey, dests);
  return dests;
}
```

### Step 2: Debounce Rapid Updates

```typescript
// In apps/cotulenh-app/src/routes/+page.svelte
import { debounce } from 'lodash-es';

const debouncedBoardUpdate = debounce(() => {
  reSetupBoard();
}, 16); // ~60fps

$: if (boardApi && $gameStore.fen) {
  debouncedBoardUpdate();
}
```

### Step 3: Lazy Load Components

```typescript
// In apps/cotulenh-app/src/routes/+page.svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let HeavyComponent: any;

  onMount(async () => {
    const module = await import('$lib/components/HeavyComponent.svelte');
    HeavyComponent = module.default;
  });
</script>

{#if HeavyComponent}
  <svelte:component this={HeavyComponent} />
{/if}
```

## Anti-Patterns to Avoid

### ❌ Board Managing Game State

```typescript
// WRONG: Board trying to manage deploy sessions
if (state.stackPieceMoves) {
  handleStackPieceMoves(state, ...);
}
```

### ❌ App Implementing Game Logic

```typescript
// WRONG: App deciding what moves are legal
function isMoveLegal(from: string, to: string): boolean {
  // Complex game logic in app layer
}
```

### ❌ Core Knowing About UI

```typescript
// WRONG: Core handling visual concerns
class GameState {
  highlightedSquares: string[]; // UI state doesn't belong in core
}
```

### ❌ Tight Coupling Between Packages

```typescript
// WRONG: Board directly importing from core
import { CoTuLenh } from '@repo/cotulenh-core'; // Board shouldn't know about core
```

### ❌ Duplicate Logic

```typescript
// WRONG: Same logic in multiple packages
// Board has move validation AND core has move validation
```

## Best Practices Summary

1. **Single Responsibility**: Each package has one clear purpose
2. **Delegation**: Board delegates to app, app delegates to core
3. **Reactive Updates**: UI reacts to state changes, doesn't drive them
4. **Error Recovery**: Always have a path back to consistent state
5. **Type Safety**: Use TypeScript interfaces to enforce contracts
6. **Testing**: Test each layer independently
7. **Performance**: Optimize at the right level (core for algorithms, UI for rendering)
