# Progressive Hints System - Dynamic Design

## Core Principle: Opt-In, Lesson-Controlled

**NOT every lesson needs hints.** Hints are configured per-lesson based on difficulty and learning goals.

---

## Lesson Configuration (Opt-In)

```typescript
interface Lesson {
  // ... existing fields ...

  /**
   * Progressive hint configuration (optional)
   * If not provided, no auto-hints are shown
   */
  hints?: {
    /** Enable progressive hints for this lesson */
    enabled: boolean;

    /** Timing configuration (milliseconds) */
    timing?: {
      subtle?: number; // Default: 15000 (15s)
      medium?: number; // Default: 30000 (30s)
      explicit?: number; // Default: 45000 (45s)
    };

    /** What to show at each level */
    levels?: {
      subtle?: HintLevel; // e.g., 'pulse-target'
      medium?: HintLevel; // e.g., 'show-arrow'
      explicit?: HintLevel; // e.g., 'show-instruction'
    };

    /** Show tutorial after N wrong moves (optional) */
    wrongMoveThreshold?: number; // Default: 3

    /** Custom hint messages */
    messages?: {
      subtle?: string;
      medium?: string;
      explicit?: string;
    };
  };
}

type HintLevel =
  | 'none'
  | 'pulse-target' // Subtle: Pulse target squares
  | 'highlight-piece' // Subtle: Highlight movable pieces
  | 'show-arrow' // Medium: Arrow to target
  | 'show-path' // Medium: Show move path
  | 'show-instruction' // Explicit: Text instruction
  | 'show-tutorial'; // Explicit: Step-by-step guide
```

---

## Example Lesson Configurations

### 1. Beginner Lesson - Full Hints

```typescript
{
  id: 'infantry-first-move',
  title: 'Move Infantry',
  difficulty: 1,

  hints: {
    enabled: true,
    timing: {
      subtle: 10000,   // 10s - quick help for beginners
      medium: 20000,   // 20s
      explicit: 30000  // 30s
    },
    levels: {
      subtle: 'pulse-target',
      medium: 'show-arrow',
      explicit: 'show-instruction'
    },
    wrongMoveThreshold: 2,  // Help after 2 mistakes
    messages: {
      explicit: 'Move the Infantry piece to the highlighted square'
    }
  }
}
```

### 2. Intermediate Lesson - Moderate Hints

```typescript
{
  id: 'terrain-navigation',
  title: 'Navigate Terrain',
  difficulty: 2,

  hints: {
    enabled: true,
    timing: {
      subtle: 20000,   // 20s - give more time to explore
      medium: 40000,   // 40s
      explicit: 60000  // 1min
    },
    levels: {
      subtle: 'pulse-target',
      medium: 'show-arrow'
      // No explicit hint - let them figure it out
    },
    wrongMoveThreshold: 3
  }
}
```

### 3. Advanced Lesson - No Hints

```typescript
{
  id: 'complex-tactic',
  title: 'Advanced Tactic',
  difficulty: 3,

  // No hints property = no auto-hints
  // User can still manually request hint via button
}
```

### 4. Puzzle Lesson - Hints on Demand Only

```typescript
{
  id: 'tactical-puzzle',
  title: 'Find the Best Move',
  difficulty: 3,

  hints: {
    enabled: false  // Disable auto-hints
    // Manual hint button still works
  }
}
```

---

## Architecture

### 1. HintSystem Class (Stateful Timer)

```typescript
export class HintSystem {
  #enabled: boolean;
  #timing: HintTiming;
  #levels: HintLevels;
  #currentLevel: 'none' | 'subtle' | 'medium' | 'explicit' = 'none';
  #timeSinceLastMove = 0;
  #wrongMoveCount = 0;
  #wrongMoveThreshold: number;
  #intervalId: ReturnType<typeof setInterval> | null = null;
  #callbacks: HintSystemCallbacks;

  constructor(config: Lesson['hints'], callbacks: HintSystemCallbacks) {
    this.#enabled = config?.enabled ?? false;
    this.#timing = {
      subtle: config?.timing?.subtle ?? 15000,
      medium: config?.timing?.medium ?? 30000,
      explicit: config?.timing?.explicit ?? 45000
    };
    this.#levels = config?.levels ?? {
      subtle: 'pulse-target',
      medium: 'show-arrow',
      explicit: 'show-instruction'
    };
    this.#wrongMoveThreshold = config?.wrongMoveThreshold ?? 3;
    this.#callbacks = callbacks;
  }

  start() {
    if (!this.#enabled) return;

    this.#intervalId = setInterval(() => {
      this.#tick(1000); // Tick every second
    }, 1000);
  }

  stop() {
    if (this.#intervalId) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
    this.reset();
  }

  reset() {
    this.#timeSinceLastMove = 0;
    this.#currentLevel = 'none';
    this.#wrongMoveCount = 0;
    this.#callbacks.onHintChange?.('none');
  }

  onMove() {
    // Reset timer when user makes a valid move
    this.#timeSinceLastMove = 0;
    this.#currentLevel = 'none';
    this.#callbacks.onHintChange?.('none');
  }

  onWrongMove() {
    this.#wrongMoveCount++;

    // Trigger tutorial mode if threshold reached
    if (this.#wrongMoveCount >= this.#wrongMoveThreshold) {
      this.#currentLevel = 'explicit';
      this.#callbacks.onHintChange?.('explicit', this.#levels.explicit);
      this.#callbacks.onTutorialMode?.();
    }
  }

  #tick(deltaMs: number) {
    this.#timeSinceLastMove += deltaMs;

    // Check thresholds and escalate hints
    if (this.#timeSinceLastMove >= this.#timing.explicit && this.#levels.explicit) {
      this.#updateLevel('explicit');
    } else if (this.#timeSinceLastMove >= this.#timing.medium && this.#levels.medium) {
      this.#updateLevel('medium');
    } else if (this.#timeSinceLastMove >= this.#timing.subtle && this.#levels.subtle) {
      this.#updateLevel('subtle');
    }
  }

  #updateLevel(level: 'subtle' | 'medium' | 'explicit') {
    if (this.#currentLevel !== level) {
      this.#currentLevel = level;
      const hintType = this.#levels[level];
      this.#callbacks.onHintChange?.(level, hintType);
    }
  }
}

interface HintSystemCallbacks {
  onHintChange?: (level: 'none' | 'subtle' | 'medium' | 'explicit', type?: HintLevel) => void;
  onTutorialMode?: () => void;
}
```

### 2. Integration in LearnSession

```typescript
export class LearnSession {
  #hintSystem: HintSystem | null = null;
  #currentHintLevel = $state<'none' | 'subtle' | 'medium' | 'explicit'>('none');
  #currentHintType = $state<HintLevel | null>(null);

  loadLesson(lessonId: string): boolean {
    const lesson = getLessonById(lessonId);

    // Create hint system if lesson has hints config
    if (lesson.hints) {
      this.#hintSystem = new HintSystem(lesson.hints, {
        onHintChange: (level, type) => {
          this.#currentHintLevel = level;
          this.#currentHintType = type;
        },
        onTutorialMode: () => {
          this.#showTutorialMode();
        }
      });
      this.#hintSystem.start();
    } else {
      this.#hintSystem = null;
    }

    // ... rest of lesson loading
  }

  makeMove(from: Square, to: Square): boolean {
    const success = this.#engine.makeMove(from, to);

    if (success) {
      this.#hintSystem?.onMove(); // Reset hint timer
    } else {
      this.#hintSystem?.onWrongMove(); // Track wrong moves
    }

    return success;
  }

  restart() {
    this.#hintSystem?.reset();
    // ... rest of restart logic
  }

  dispose() {
    this.#hintSystem?.stop();
    // ... rest of cleanup
  }

  // Expose hint state for UI
  get currentHintLevel() {
    return this.#currentHintLevel;
  }

  get currentHintType() {
    return this.#currentHintType;
  }
}
```

### 3. Visual Hint Components

```svelte
<!-- HintVisuals.svelte -->
<script lang="ts">
  import type { HintLevel } from '@cotulenh/learn';
  import type { LearnSession } from '../learn-session.svelte';

  let { session, boardApi } = $props();

  const hintLevel = $derived(session.currentHintLevel);
  const hintType = $derived(session.currentHintType);
  const targets = $derived(session.remainingTargets);
</script>

{#if hintType === 'pulse-target'}
  <!-- Subtle: Pulse animation on target squares -->
  {#each targets as target}
    <div class="hint-pulse" data-square={target}></div>
  {/each}

{:else if hintType === 'show-arrow'}
  <!-- Medium: Arrow from piece to target -->
  <svg class="hint-arrow">
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7"
              refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
      </marker>
    </defs>
    <line x1="..." y1="..." x2="..." y2="..."
          stroke="#3b82f6" stroke-width="3"
          marker-end="url(#arrowhead)" />
  </svg>

{:else if hintType === 'show-instruction'}
  <!-- Explicit: Text instruction overlay -->
  <div class="hint-instruction">
    {session.lesson?.hints?.messages?.explicit || session.hint}
  </div>
{/if}

<style>
  .hint-pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 4px;
    background: rgba(59, 130, 246, 0.3);
    animation: pulse 1.5s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.05); }
  }

  .hint-arrow {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 100;
  }

  .hint-instruction {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(59, 130, 246, 0.95);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: slide-up 0.3s ease-out;
  }

  @keyframes slide-up {
    from { transform: translate(-50%, 20px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
</style>
```

---

## Usage Examples

### Beginner Lesson with Quick Hints

```typescript
const beginnerLesson: Lesson = {
  id: 'move-infantry-1',
  title: 'First Infantry Move',
  difficulty: 1,
  startFen: '...',
  targetSquares: ['d4'],
  instruction: 'Move Infantry to d4',

  hints: {
    enabled: true,
    timing: {
      subtle: 8000, // Fast help for beginners
      medium: 15000,
      explicit: 25000
    },
    levels: {
      subtle: 'pulse-target',
      medium: 'show-arrow',
      explicit: 'show-instruction'
    },
    messages: {
      explicit: 'Click the Infantry piece, then click the glowing square'
    }
  }
};
```

### Challenge Lesson (No Auto-Hints)

```typescript
const challengeLesson: Lesson = {
  id: 'find-checkmate',
  title: 'Find Checkmate in 3 Moves',
  difficulty: 3,
  startFen: '...',
  instruction: 'Find the winning sequence'

  // No hints config = exploration mode
  // Manual hint button still available if user gets stuck
};
```

---

## Benefits of This Design

✅ **Opt-In**: Only lessons that need hints have them  
✅ **Configurable**: Each lesson controls timing and visual style  
✅ **Flexible**: Easy to add new hint types  
✅ **Backward Compatible**: Existing lessons work without hints  
✅ **Performance**: No timer overhead for lessons without hints  
✅ **User Choice**: Manual hints always available regardless of config

---

## Implementation Plan

### Step 1: Type Definitions (30 min)

- Add `hints` to Lesson interface
- Define HintLevel type
- Export from @cotulenh/learn

### Step 2: HintSystem Class (1 hour)

- Timer logic
- Level escalation
- Wrong move tracking
- Callback system

### Step 3: LearnSession Integration (30 min)

- Create/destroy HintSystem per lesson
- Hook into makeMove/restart/dispose
- Expose reactive hint state

### Step 4: Visual Components (1 hour)

- HintVisuals.svelte
- CSS animations (pulse, arrows)
- Instruction overlay

### Step 5: Testing (30 min)

- Test with hints enabled
- Test without hints
- Test different timings
- Test wrong move threshold

**Total**: ~3.5 hours

---

## Next Steps

1. **Update types** - Add hints config to Lesson interface
2. **Build HintSystem** - Timer and escalation logic
3. **Integrate** - Connect to LearnSession
4. **Create visuals** - Pulse/arrow/instruction components
5. **Test** - Multiple lesson configurations

Ready to start with the type definitions?
