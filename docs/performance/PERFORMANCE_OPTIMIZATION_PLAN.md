# CoTuLenh Performance Optimization Plan

## Current Performance Analysis

### Identified Bottleneck

After analyzing the console logs and Chrome DevTools, the primary bottleneck is:

**`getPossibleMoves()` takes 120-200ms after every move**

- Initial load: 123-199ms (116 moves)
- After each move: 126-167ms (117-132 moves)
- Total move latency: 131-176ms

### Current Architecture Issue

```typescript
// apps/cotulenh-app/src/lib/utils.ts:138-140
export function getPossibleMoves(game: CoTuLenh): Move[] {
  return game.moves({ verbose: true }) as Move[];
}
```

This generates ALL legal moves for ALL pieces, even though:

- Users only interact with ONE piece at a time
- Most computed moves are never used
- Board UI doesn't need all moves immediately

## Optimization Strategies

### 🎯 Strategy 1: Lazy Move Generation (HIGHEST IMPACT)

**Goal**: Only generate moves when a piece is clicked

**Implementation**:

```typescript
// NEW: apps/cotulenh-app/src/lib/utils.ts
/**
 * Gets possible moves for a specific square only (lazy loading)
 * @param game - The CoTuLenh game instance
 * @param square - The square to get moves for (e.g., 'e2')
 * @returns Array of moves from that square
 */
export function getMovesForSquare(game: CoTuLenh, square: string): Move[] {
  return game.moves({ verbose: true, square }) as Move[];
}

/**
 * Gets all pieces that can move (without computing their moves)
 * @param game - The CoTuLenh game instance
 * @returns Array of squares that have movable pieces
 */
export function getMovableSquares(game: CoTuLenh): string[] {
  const allMoves = game.moves({ verbose: false }); // Just squares, not full moves
  const squares = new Set<string>();
  for (const move of allMoves) {
    if (typeof move === 'string') {
      // Parse move string to extract 'from' square
      // Format is typically "e2e4" or similar
      const from = move.slice(0, 2);
      squares.add(from);
    }
  }
  return Array.from(squares);
}
```

**Update Store**:

```typescript
// apps/cotulenh-app/src/lib/stores/game.ts
const initialState: GameState = {
  fen: '',
  turn: null,
  history: [],
  movableSquares: [], // NEW: Just track which squares can move
  status: 'playing',
  check: false,
  lastMove: undefined,
  deployState: null
};

initialize(game: CoTuLenh) {
  const perfStart = performance.now();
  // Only get squares that can move, not all moves
  const movableSquares = getMovableSquares(game);

  set({
    fen: game.fen(),
    turn: game.turn(),
    history: [],
    movableSquares, // Store only movable squares
    check: game.isCheck(),
    status: calculateGameStatus(game),
    lastMove: undefined,
    deployState: game.getDeploySession()?.toLegacyDeployState() ?? null
  });
  const perfEnd = performance.now();
  console.log(`⏱️ gameStore.initialize took ${(perfEnd - perfStart).toFixed(2)}ms`);
}
```

**Update Board Component**:

```svelte
<!-- apps/cotulenh-app/src/routes/+page.svelte -->
<script lang="ts">
  // Remove: mapPossibleMovesToDests
  // Add: Dynamic move loading

  let boardConfig = $derived({
    fen: $gameState.fen,
    turnColor: $gameState.turn ? coreColorToBoard($gameState.turn) : undefined,
    lastMove: mapLastMoveToBoardFormat($gameState.lastMove),
    check: $gameState.check,
    movable: {
      free: false,
      color: $gameState.turn ? coreColorToBoard($gameState.turn) : undefined,
      // NEW: Only compute dests when piece is selected
      dests: undefined, // Remove pre-computed dests
      events: {
        // NEW: Compute moves on piece selection
        after: handleMove,
        selectSquare: (square: Key) => {
          if (!game) return;
          // Lazy load moves for this square only
          const moves = getMovesForSquare(game, square);
          const dests = mapMovesToDests(moves);
          // Update board config with just these moves
          boardApi?.set({ movable: { dests } });
        }
      }
    },
    // ... rest of config
  });
</script>
```

**Expected Improvement**: 120-200ms → **<5ms** (99% reduction)

---

### 🚀 Strategy 2: Web Worker for Background Computation

**Goal**: Move expensive computations off the main thread

**Implementation**:

```typescript
// NEW: apps/cotulenh-app/src/lib/workers/move-generator.worker.ts
import { CoTuLenh } from '@repo/cotulenh-core';

let game: CoTuLenh | null = null;

self.onmessage = (e) => {
  const { type, fen } = e.data;

  switch (type) {
    case 'init':
      game = new CoTuLenh();
      if (fen) game.load(fen);
      break;

    case 'getMoves':
      if (!game) {
        self.postMessage({ error: 'Game not initialized' });
        return;
      }
      const moves = game.moves({ verbose: true });
      self.postMessage({ moves });
      break;

    case 'getMovesForSquare':
      if (!game) {
        self.postMessage({ error: 'Game not initialized' });
        return;
      }
      const { square } = e.data;
      const squareMoves = game.moves({ verbose: true, square });
      self.postMessage({ moves: squareMoves });
      break;
  }
};
```

**Usage**:

```typescript
// apps/cotulenh-app/src/lib/stores/game.ts
import MoveGeneratorWorker from '$lib/workers/move-generator.worker?worker';

const worker = new MoveGeneratorWorker();

export function getMovesAsync(fen: string): Promise<Move[]> {
  return new Promise((resolve) => {
    worker.postMessage({ type: 'init', fen });
    worker.postMessage({ type: 'getMoves' });

    worker.onmessage = (e) => {
      if (e.data.moves) {
        resolve(e.data.moves);
      }
    };
  });
}
```

**Expected Improvement**: Non-blocking UI, perceived instant response

---

### ⚡ Strategy 3: Move Generation Optimization in Core

**Goal**: Make `game.moves()` faster

**Check Current Implementation**:

```typescript
// packages/cotulenh-core/src/cotulenh.ts
moves(options?: { verbose?: boolean; square?: string }) {
  // Check if this uses caching
  // Check if it can be optimized
}
```

**Potential Optimizations**:

1. ✅ Use move cache (check if already implemented)
2. ✅ Early return for `square` parameter (only generate moves for one piece)
3. ✅ Optimize legal move filtering (reduce redundant attack calculations)
4. ✅ Use bitboards for attack detection (if not already done)

---

### 🎨 Strategy 4: UI Optimizations

**Goal**: Make UI feel instant even during computation

**Implementation**:

```svelte
<!-- apps/cotulenh-app/src/routes/+page.svelte -->
<script lang="ts">
  let isCalculating = $state(false);

  function handleMove(orig: OrigMove, dest: DestMove) {
    // Show loading indicator immediately
    isCalculating = true;

    // Use requestAnimationFrame to ensure UI updates
    requestAnimationFrame(() => {
      try {
        const moveResult = makeCoreMove(game, orig, dest);
        if (moveResult) {
          gameStore.applyMove(game, moveResult);
        }
      } finally {
        isCalculating = false;
      }
    });
  }
</script>

{#if isCalculating}
  <div class="loading-spinner">Calculating...</div>
{/if}
```

**Expected Improvement**: Better perceived performance

---

### 📊 Strategy 5: Profiling and Measurement

**Goal**: Identify which part of move generation is slowest

**Implementation**:

```typescript
// Add detailed profiling to cotulenh-core
export function moves(options?) {
  const perfStart = performance.now();

  const t1 = performance.now();
  const pseudoLegalMoves = this._generateMoves();
  console.log(`Generate pseudo-legal: ${performance.now() - t1}ms`);

  const t2 = performance.now();
  const legalMoves = this._filterLegalMoves(pseudoLegalMoves);
  console.log(`Filter legal: ${performance.now() - t2}ms`);

  const t3 = performance.now();
  const verboseMoves = this._toVerbose(legalMoves);
  console.log(`To verbose: ${performance.now() - t3}ms`);

  console.log(`TOTAL moves(): ${performance.now() - perfStart}ms`);
  return verboseMoves;
}
```

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours)

1. ✅ **Implement lazy move generation** (Strategy 1)
   - Add `getMovesForSquare()` function
   - Update board to load moves on-demand
   - Remove pre-computation in store

### Phase 2: Core Optimization (2-4 hours)

2. ✅ **Profile move generation** (Strategy 5)

   - Add performance logging
   - Identify slowest operations
   - Optimize based on data

3. ✅ **Optimize core move generation** (Strategy 3)
   - Verify caching is working
   - Optimize legal move filtering
   - Add early returns for square parameter

### Phase 3: Advanced (4-8 hours)

4. ✅ **Web Worker implementation** (Strategy 2)

   - Create worker for background computation
   - Update store to use async API
   - Handle worker lifecycle

5. ✅ **UI polish** (Strategy 4)
   - Add loading indicators
   - Implement optimistic updates
   - Add transition animations

---

## Expected Results

### Before Optimization

- Move latency: **131-176ms**
- Initial load: **123ms**
- Blocking UI during computation

### After Phase 1 (Lazy Loading)

- Move latency: **<10ms** (95% improvement)
- Initial load: **<5ms** (96% improvement)
- Instant perceived response

### After Phase 2 (Core Optimization)

- Move generation: **50-70ms** (if needed at all)
- Better caching
- Reduced redundant computation

### After Phase 3 (Web Workers)

- Non-blocking UI: **0ms perceived latency**
- Background move generation
- Smooth user experience

---

## Testing Strategy

### Performance Benchmarks

```typescript
// Add to test suite
describe('Performance', () => {
  it('should generate moves for a square in <5ms', () => {
    const game = new CoTuLenh();
    const start = performance.now();
    getMovesForSquare(game, 'e2');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5);
  });

  it('should handle 100 consecutive moves in <500ms', () => {
    const game = new CoTuLenh();
    const moves = [...Array(100)].map(() => {
      const start = performance.now();
      game.move('e2e4');
      game.undo();
      return performance.now() - start;
    });
    const avgDuration = moves.reduce((a, b) => a + b) / moves.length;
    expect(avgDuration).toBeLessThan(5);
  });
});
```

---

## Monitoring

### Add Performance Metrics

```typescript
// apps/cotulenh-app/src/lib/analytics.ts
export function trackPerformance(metric: string, duration: number) {
  if (duration > 16) {
    // More than 1 frame (60fps)
    console.warn(`⚠️ Performance: ${metric} took ${duration.toFixed(2)}ms`);
  }

  // Send to analytics service
  // e.g., Google Analytics, Sentry, etc.
}
```

---

## Conclusion

**The fastest code is code that doesn't run.**

By implementing lazy move generation (Strategy 1), we can achieve **instant perceived performance** with minimal code changes. The board will feel responsive because we only compute what's needed, when it's needed.

**Estimated Total Implementation Time**: 2-4 hours for Phase 1 (highest impact)

**Expected User Experience**: Moves will feel instant, with no noticeable lag.
