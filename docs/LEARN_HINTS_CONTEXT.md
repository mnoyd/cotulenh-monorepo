# Progressive Hints Implementation - Focused Context

## What We're Building

**Goal**: Add optional, lesson-controlled progressive hints that auto-escalate over time.

**Principle**: Opt-in system - lessons choose if/how to show hints.

---

## Current Interfaces We Need

### 1. Lesson Type (To Extend)

```typescript
// packages/cotulenh/learn/src/types.ts
export interface Lesson {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3;
  instruction: string;
  hint?: string; // Manual hint (existing)
  targetSquares?: Square[];
  // ... other fields we don't need to touch
}
```

**What we'll add**: Optional `hints` field for progressive hints config.

### 2. LearnSession Structure (Where We'll Integrate)

```typescript
// apps/cotulenh/app/src/lib/learn/learn-session.svelte.ts
export class LearnSession {
  #engine: LearnEngine;
  #version = $state(0);

  // Key methods we'll hook into:
  loadLesson(lessonId: string): boolean {
    // Create HintSystem here if lesson.hints exists
  }

  makeMove(from: Square, to: Square): boolean {
    const success = this.#engine.makeMove(from, to);
    // Tell HintSystem about move (reset timer or track wrong move)
    return success;
  }

  restart(): void {
    // Reset HintSystem timer
  }

  dispose(): void {
    // Clean up HintSystem
  }

  // Existing getters we can use:
  get remainingTargets(): Square[];
  get lesson(): Lesson | null;
  get status(): LearnStatus;
}
```

### 3. LessonPlayer Component (Where Visuals Go)

```svelte
<!-- apps/cotulenh/app/src/lib/learn/components/LessonPlayer.svelte -->
<script>
  let session = $state<LearnSession | null>(null);
</script>

<div class="board-section">
  <BoardContainer config={session.boardConfig} />
  <TargetMarker ... />
  <SquareTooltip ... />
  <!-- We'll add: <HintVisuals {session} /> -->
</div>
```

---

## What We're Adding

### 1. Lesson Type Extension

```typescript
// Add to existing Lesson interface
export interface Lesson {
  // ... existing fields ...

  hints?: {
    enabled: boolean;
    timing?: {
      subtle?: number; // ms, default: 15000
      medium?: number; // ms, default: 30000
      explicit?: number; // ms, default: 45000
    };
    levels?: {
      subtle?: HintLevel;
      medium?: HintLevel;
      explicit?: HintLevel;
    };
    wrongMoveThreshold?: number; // default: 3
    messages?: {
      subtle?: string;
      medium?: string;
      explicit?: string;
    };
  };
}

export type HintLevel = 'none' | 'pulse-target' | 'show-arrow' | 'show-instruction';
```

### 2. HintSystem Class (New)

```typescript
// packages/cotulenh/learn/src/hint-system.ts
export class HintSystem {
  #enabled: boolean;
  #timeSinceLastMove = 0;
  #wrongMoveCount = 0;
  #currentLevel: 'none' | 'subtle' | 'medium' | 'explicit' = 'none';

  constructor(config: Lesson['hints'], callbacks: HintCallbacks) {}

  start(): void; // Start timer
  stop(): void; // Stop and cleanup
  reset(): void; // Reset to initial state
  onMove(): void; // User made valid move
  onWrongMove(): void; // User made wrong move
}
```

### 3. LearnSession Integration (Modify Existing)

```typescript
export class LearnSession {
  #hintSystem: HintSystem | null = null;
  #currentHintLevel = $state<'none' | 'subtle' | 'medium' | 'explicit'>('none');
  #currentHintType = $state<HintLevel | null>(null);

  // Expose for UI
  get currentHintLevel() {
    return this.#currentHintLevel;
  }
  get currentHintType() {
    return this.#currentHintType;
  }
}
```

### 4. HintVisuals Component (New)

```svelte
<!-- apps/cotulenh/app/src/lib/learn/components/HintVisuals.svelte -->
<script lang="ts">
  let { session } = $props();

  const hintType = $derived(session.currentHintType);
  const targets = $derived(session.remainingTargets);
</script>

{#if hintType === 'pulse-target'}
  <!-- Pulse animation on targets -->
{:else if hintType === 'show-arrow'}
  <!-- Arrow to target -->
{:else if hintType === 'show-instruction'}
  <!-- Text overlay -->
{/if}
```

---

## File Changes Needed

### Create (2 files)

```
packages/cotulenh/learn/src/hint-system.ts         (~150 lines)
apps/cotulenh/app/src/lib/learn/components/HintVisuals.svelte  (~100 lines)
```

### Modify (3 files)

```
packages/cotulenh/learn/src/types.ts               (+20 lines)
packages/cotulenh/learn/src/index.ts               (+2 exports)
apps/cotulenh/app/src/lib/learn/learn-session.svelte.ts  (+30 lines)
apps/cotulenh/app/src/lib/learn/components/LessonPlayer.svelte  (+2 lines)
```

---

## Implementation Steps

### Step 1: Types (15 min)

1. Add `hints` config to Lesson interface
2. Add `HintLevel` type
3. Export from package

### Step 2: HintSystem Class (1 hour)

1. Create hint-system.ts
2. Timer logic (setInterval)
3. Level escalation (subtle → medium → explicit)
4. Wrong move tracking
5. Callbacks

### Step 3: LearnSession Integration (30 min)

1. Add HintSystem field
2. Create in loadLesson()
3. Hook makeMove() → onMove()/onWrongMove()
4. Hook restart() → reset()
5. Hook dispose() → stop()
6. Add reactive state ($state)

### Step 4: HintVisuals Component (45 min)

1. Create HintVisuals.svelte
2. Pulse animation CSS
3. Arrow SVG rendering
4. Instruction overlay
5. Conditional rendering based on hintType

### Step 5: Integration & Test (30 min)

1. Add HintVisuals to LessonPlayer
2. Create test lesson with hints config
3. Test timer escalation
4. Test wrong move threshold
5. Test with hints disabled

**Total**: ~3 hours

---

## Example Usage

### Beginner Lesson (with hints)

```typescript
{
  id: 'move-infantry-1',
  hints: {
    enabled: true,
    timing: { subtle: 10000, medium: 20000, explicit: 30000 },
    levels: {
      subtle: 'pulse-target',
      medium: 'show-arrow',
      explicit: 'show-instruction'
    },
    messages: {
      explicit: 'Click Infantry, then click the glowing square'
    }
  }
}
```

### Advanced Lesson (no hints)

```typescript
{
  id: 'tactical-puzzle',
  // No hints field = no auto-hints
}
```

---

## Dependencies

**Packages we use**:

- `@cotulenh/learn` - LearnEngine, Lesson type
- `@cotulenh/core` - Square type
- Svelte 5 - $state, $derived runes

**No new dependencies needed** - pure TypeScript + Svelte.

---

## Ready to Build?

1. Start with types (quick win)
2. Build HintSystem (core logic)
3. Integrate into LearnSession
4. Create visual component
5. Test

Let's go! 🚀
