# Lesson Flexibility Design

## Problem Statement

Different subjects need different lesson behaviors:

- **Completion criteria**: Pass/fail vs star rating vs exact sequence
- **Feedback level**: Educational tooltips vs silent validation vs game-like
- **Validation mode**: Strict (only specific moves) vs relaxed (any legal move)
- **Error handling**: Explain mistakes vs ignore vs block invalid moves

---

## Solution: Lesson Behavior Configuration

### 1. Lesson Mode Types

```typescript
// packages/cotulenh/learn/src/types.ts

/**
 * Lesson mode determines overall behavior and validation style
 */
export type LessonMode =
  | 'freeplay' // Any legal move, goal-based completion
  | 'guided' // Must follow scenario exactly
  | 'exploration' // Free movement with educational feedback
  | 'challenge'; // Timed/optimized with star rating

/**
 * Validation strictness level
 */
export type ValidationLevel =
  | 'none' // No validation, accept any legal move
  | 'soft' // Validate but allow mistakes with feedback
  | 'strict'; // Block invalid moves, require correct sequence

/**
 * Feedback verbosity level
 */
export type FeedbackLevel =
  | 'silent' // No feedback (game-like)
  | 'minimal' // Basic success/fail messages
  | 'educational' // Detailed explanations
  | 'verbose'; // Full tutoring with hints

/**
 * Completion criteria type
 */
export type CompletionType =
  | 'goal' // Reach goal FEN or state
  | 'targets' // Visit all target squares
  | 'scenario' // Complete exact move sequence
  | 'custom'; // Custom validator function

/**
 * Grading system
 */
export type GradingSystem =
  | 'none' // No grading, just completion
  | 'pass-fail' // Binary completion
  | 'stars'; // 1-3 star rating based on efficiency

/**
 * Lesson behavior configuration
 */
export interface LessonBehavior {
  /** Overall lesson mode */
  mode: LessonMode;

  /** How strictly to validate moves */
  validation: ValidationLevel;

  /** How much feedback to provide */
  feedback: FeedbackLevel;

  /** What counts as completion */
  completion: CompletionType;

  /** How to grade performance */
  grading: GradingSystem;

  /** Allow undo/retry */
  allowUndo: boolean;

  /** Allow hints */
  allowHints: boolean;

  /** Show move count */
  showMoveCount: boolean;

  /** Highlight valid moves */
  showValidMoves: boolean;

  /** Auto-proceed to next lesson on completion */
  autoProceed: boolean;
}
```

### 2. Feedback Configuration

```typescript
/**
 * Specific feedback messages for different error types
 */
export interface LessonFeedback {
  /** Feedback on terrain violations */
  terrain?: {
    /** Navy piece trying to enter land */
    navyToLand?: string;
    /** Land piece trying to enter water */
    landToWater?: string;
    /** Heavy piece trying to cross river without bridge */
    heavyRiverCrossing?: string;
    /** Generic terrain violation */
    default?: string;
  };

  /** Feedback on invalid captures */
  capture?: {
    /** Wrong capture type used */
    wrongCaptureType?: string;
    /** Cannot capture friendly piece */
    friendlyFire?: string;
    /** Piece cannot capture */
    cannotCapture?: string;
    /** Generic capture error */
    default?: string;
  };

  /** Feedback on stacking violations */
  stacking?: {
    /** Invalid carrier/carried combination */
    invalidCombination?: string;
    /** Too many pieces in stack */
    stackFull?: string;
    /** Cannot combine different colors */
    wrongColor?: string;
    /** Generic stacking error */
    default?: string;
  };

  /** Feedback on air defense */
  airDefense?: {
    /** Air Force destroyed by defense zone */
    destroyed?: string;
    /** Warning about entering defense zone */
    warning?: string;
    /** Safe path suggestion */
    hint?: string;
  };

  /** Feedback on scenario deviation */
  scenario?: {
    /** Wrong move in scenario sequence */
    wrongMove?: string;
    /** Expected move hint */
    expectedMove?: string;
  };

  /** Feedback on targets */
  targets?: {
    /** Visited target square */
    targetReached?: string;
    /** Wrong square clicked */
    wrongSquare?: string;
    /** All targets complete */
    allComplete?: string;
  };

  /** Generic feedback */
  generic?: {
    /** Move successful */
    success?: string;
    /** Move invalid */
    invalid?: string;
    /** Try again prompt */
    retry?: string;
  };
}

/**
 * Complete lesson configuration
 */
export interface Lesson {
  id: string;
  subjectId: SubjectId;
  sectionId: SectionId;

  title: string;
  description: string;
  difficulty: 1 | 2 | 3;

  /** Lesson behavior configuration */
  behavior: LessonBehavior;

  /** Custom feedback messages */
  feedback?: LessonFeedback;

  // ... existing fields (startFen, goalFen, etc.)

  /** Custom validation function (for completion: 'custom') */
  customValidator?: (engine: LearnEngine) => boolean;

  /** Custom move validator (return error message or null if valid) */
  customMoveValidator?: (move: Move, engine: LearnEngine) => string | null;
}
```

### 3. Preset Behavior Profiles

```typescript
// packages/cotulenh/learn/src/behavior-presets.ts

/**
 * Pre-configured behavior profiles for common lesson types
 */
export const BehaviorPresets: Record<string, LessonBehavior> = {
  /** Basic movement practice - just complete one move */
  SIMPLE_MOVEMENT: {
    mode: 'freeplay',
    validation: 'soft',
    feedback: 'minimal',
    completion: 'goal',
    grading: 'none',
    allowUndo: true,
    allowHints: false,
    showMoveCount: false,
    showValidMoves: true,
    autoProceed: false
  },

  /** Terrain education - explain violations */
  TERRAIN_TUTORIAL: {
    mode: 'exploration',
    validation: 'soft',
    feedback: 'educational',
    completion: 'targets',
    grading: 'pass-fail',
    allowUndo: true,
    allowHints: true,
    showMoveCount: false,
    showValidMoves: true,
    autoProceed: false
  },

  /** Strict scenario - must follow exact moves */
  STRICT_SCENARIO: {
    mode: 'guided',
    validation: 'strict',
    feedback: 'educational',
    completion: 'scenario',
    grading: 'pass-fail',
    allowUndo: true,
    allowHints: true,
    showMoveCount: false,
    showValidMoves: false,
    autoProceed: false
  },

  /** Challenge mode - optimize for stars */
  TIMED_CHALLENGE: {
    mode: 'challenge',
    validation: 'soft',
    feedback: 'minimal',
    completion: 'goal',
    grading: 'stars',
    allowUndo: false,
    allowHints: false,
    showMoveCount: true,
    showValidMoves: false,
    autoProceed: false
  },

  /** Free exploration - game-like, no guidance */
  FREE_PRACTICE: {
    mode: 'freeplay',
    validation: 'none',
    feedback: 'silent',
    completion: 'goal',
    grading: 'none',
    allowUndo: true,
    allowHints: false,
    showMoveCount: false,
    showValidMoves: false,
    autoProceed: false
  },

  /** Capture practice - focus on capture mechanics */
  CAPTURE_TRAINING: {
    mode: 'exploration',
    validation: 'soft',
    feedback: 'educational',
    completion: 'custom',
    grading: 'pass-fail',
    allowUndo: true,
    allowHints: true,
    showMoveCount: false,
    showValidMoves: true,
    autoProceed: false
  },

  /** Multi-target navigation */
  TARGET_PRACTICE: {
    mode: 'freeplay',
    validation: 'soft',
    feedback: 'minimal',
    completion: 'targets',
    grading: 'stars',
    allowUndo: true,
    allowHints: true,
    showMoveCount: true,
    showValidMoves: true,
    autoProceed: false
  }
};

/**
 * Helper to create lesson with preset behavior
 */
export function createLesson(
  base: Omit<Lesson, 'behavior'>,
  preset: keyof typeof BehaviorPresets,
  overrides?: Partial<LessonBehavior>
): Lesson {
  return {
    ...base,
    behavior: {
      ...BehaviorPresets[preset],
      ...overrides
    }
  };
}
```

### 4. LearnEngine Behavior Handling

```typescript
// packages/cotulenh/learn/src/learn-engine.ts

export class LearnEngine {
  #lesson: Lesson | null = null;
  #behavior: LessonBehavior | null = null;

  async loadLesson(lessonId: string): Promise<void> {
    const lesson = getLessonById(lessonId);
    if (!lesson) throw new Error(`Lesson ${lessonId} not found`);

    this.#lesson = lesson;
    this.#behavior = lesson.behavior;

    // Initialize based on behavior mode
    this.#initializeForMode(lesson.behavior.mode);

    this.#updateStatus('ready');
  }

  /**
   * Validate move based on lesson behavior
   */
  validateMove(move: Move): MoveValidationResult {
    if (!this.#lesson || !this.#behavior) {
      return { valid: false, error: 'No lesson loaded' };
    }

    const behavior = this.#behavior;

    // No validation mode - accept everything
    if (behavior.validation === 'none') {
      return { valid: true };
    }

    // Check basic legality
    const legalityCheck = this.#game?.isMoveLegal(move);
    if (!legalityCheck?.legal) {
      return this.#createFeedback('invalid', legalityCheck?.reason);
    }

    // Custom validator
    if (this.#lesson.customMoveValidator) {
      const error = this.#lesson.customMoveValidator(move, this);
      if (error) {
        return this.#createFeedback('custom', error);
      }
    }

    // Scenario validation (strict mode)
    if (behavior.mode === 'guided' && behavior.validation === 'strict') {
      const expectedMove = this.#scenario?.getExpectedMove();
      if (expectedMove && !this.#movesEqual(move, expectedMove)) {
        return this.#createScenarioFeedback(move, expectedMove);
      }
    }

    // Terrain validation with educational feedback
    if (behavior.feedback === 'educational') {
      const terrainError = this.#validateTerrain(move);
      if (terrainError) {
        return this.#createFeedback('terrain', terrainError);
      }
    }

    return { valid: true };
  }

  /**
   * Create feedback based on error type and lesson configuration
   */
  #createFeedback(type: string, error?: string): MoveValidationResult {
    const behavior = this.#behavior!;
    const feedback = this.#lesson?.feedback;

    // Silent mode - no feedback
    if (behavior.feedback === 'silent') {
      return { valid: false };
    }

    // Get appropriate message based on type and feedback level
    let message = error ?? 'Invalid move';

    if (type === 'terrain' && feedback?.terrain) {
      message = this.#getTerrainFeedback(error, feedback.terrain);
    } else if (type === 'capture' && feedback?.capture) {
      message = feedback.capture.default ?? message;
    } else if (type === 'stacking' && feedback?.stacking) {
      message = feedback.stacking.default ?? message;
    }

    return {
      valid: false,
      error: message,
      showFeedback: behavior.feedback !== 'minimal'
    };
  }

  /**
   * Get terrain-specific feedback message
   */
  #getTerrainFeedback(error: string | undefined, config: LessonFeedback['terrain']): string {
    if (!config) return error ?? 'Terrain violation';

    if (error?.includes('navy') && error?.includes('land')) {
      return config.navyToLand ?? config.default ?? error;
    }
    if (error?.includes('land') && error?.includes('water')) {
      return config.landToWater ?? config.default ?? error;
    }
    if (error?.includes('heavy') && error?.includes('river')) {
      return config.heavyRiverCrossing ?? config.default ?? error;
    }

    return config.default ?? error ?? 'Terrain violation';
  }

  /**
   * Check if lesson is complete based on completion type
   */
  #checkCompletion(): boolean {
    if (!this.#lesson || !this.#behavior) return false;

    switch (this.#behavior.completion) {
      case 'goal':
        return this.#checkGoalCompletion();

      case 'targets':
        return this.#checkTargetsCompletion();

      case 'scenario':
        return this.#scenario?.isComplete() ?? false;

      case 'custom':
        return this.#lesson.customValidator?.(this) ?? false;

      default:
        return false;
    }
  }

  /**
   * Calculate grade based on grading system
   */
  #calculateGrade(): LessonResult {
    if (!this.#lesson || !this.#behavior) {
      throw new Error('No lesson loaded');
    }

    switch (this.#behavior.grading) {
      case 'none':
        return {
          lessonId: this.#lesson.id,
          completed: true,
          moveCount: this.#moveCount,
          stars: 0
        };

      case 'pass-fail':
        return {
          lessonId: this.#lesson.id,
          completed: true,
          moveCount: this.#moveCount,
          stars: this.#moveCount > 0 ? 1 : 0
        };

      case 'stars':
        const optimal = this.#lesson.optimalMoves ?? this.#getDefaultOptimalMoves();
        return {
          lessonId: this.#lesson.id,
          completed: true,
          moveCount: this.#moveCount,
          stars: LearnEngine.calculateStars(this.#moveCount, optimal)
        };

      default:
        return {
          lessonId: this.#lesson.id,
          completed: true,
          moveCount: this.#moveCount,
          stars: 0
        };
    }
  }
}

interface MoveValidationResult {
  valid: boolean;
  error?: string;
  showFeedback?: boolean;
  hint?: string;
}
```

---

## Example Lesson Configurations

### Subject 1: Basic Movement (Simple)

```typescript
// packages/cotulenh/learn/src/subjects/01-basic-movement/sections/ground-units.ts

export const infantryMove1: Lesson = createLesson(
  {
    id: 'infantry-move-1',
    subjectId: 'basic-movement',
    sectionId: 'ground-units',
    title: 'Infantry Movement',
    description: 'Move the Infantry piece to any valid square',
    difficulty: 1,
    startFen: '11h/11h/11h/11h/11h/11h/11h/11h/11h/11h/5I5/11h w - - 0 1',
    instruction: 'Click the Infantry, then click any highlighted square to move it.',
    highlightSquares: ['f2', 'e1', 'g1', 'f0'] // Valid move destinations
  },
  'SIMPLE_MOVEMENT', // Use preset
  {
    grading: 'pass-fail' // Override: just pass/fail
  }
);
```

### Subject 2: Terrain (Educational)

```typescript
// packages/cotulenh/learn/src/subjects/02-terrain/sections/navy-zones.ts

export const navyRestriction1: Lesson = createLesson(
  {
    id: 'navy-restriction-1',
    subjectId: 'terrain',
    sectionId: 'navy-zones',
    title: 'Navy Cannot Enter Land',
    description: 'Learn why Navy pieces cannot move to pure land zones',
    difficulty: 1,
    startFen: 'n10h/11h/11h/11h/11h/11h/11h/11h/11h/11h/11h/11h w - - 0 1',
    targetSquares: ['a6', 'b6', 'c6'], // Valid navy squares
    instruction: 'Move the Navy piece. Notice it can only reach water and coastal areas.',
    hint: 'Navy pieces are restricted to files a, b, c, and river squares.',
    feedback: {
      terrain: {
        navyToLand:
          '❌ Navy pieces cannot enter pure land zones (files d-k). They can only operate in water (files a-b) and coastal areas (file c, river squares).',
        default: '❌ That square is not accessible for naval units.'
      },
      targets: {
        targetReached: '✅ Good! This is a valid square for Navy movement.',
        allComplete: '🎉 Excellent! You understand Navy movement restrictions.'
      }
    }
  },
  'TERRAIN_TUTORIAL'
);
```

### Subject 4: Captures (Multiple Types)

```typescript
// packages/cotulenh/learn/src/subjects/04-captures/sections/stay-captures.ts

export const commanderStayCapture: Lesson = createLesson(
  {
    id: 'commander-stay-capture',
    subjectId: 'captures',
    sectionId: 'stay-captures',
    title: 'Commander Stay Capture',
    description: 'Capture without moving using the Commander',
    difficulty: 2,
    startFen: 'C1i9h/11h/11h/11h/11h/11h/11h/11h/11h/11h/11h/11h w - - 0 1',
    instruction:
      'The Commander can capture adjacent enemies without moving. Click the Commander, then the enemy Infantry.',
    feedback: {
      capture: {
        wrongCaptureType:
          '❌ Use stay-capture! The Commander attacks adjacent squares without moving.',
        default: "❌ That's not a valid capture for the Commander."
      },
      generic: {
        success: '✅ Perfect! The Commander performed a stay-capture.',
        retry: 'Try again. Remember: stay-capture means the Commander stays in place.'
      }
    },
    customValidator: (engine) => {
      // Check that enemy Infantry was captured via stay-capture
      const fen = engine.fen;
      return !fen.includes('i') && fen.startsWith('C'); // Infantry gone, Commander still on a12
    }
  },
  'CAPTURE_TRAINING',
  {
    showValidMoves: false // Don't spoil the answer
  }
);
```

### Subject 5: Air Defense (Warning System)

```typescript
// packages/cotulenh/learn/src/subjects/05-air-defense/sections/avoiding-defense.ts

export const navigateAirDefense: Lesson = createLesson(
  {
    id: 'navigate-air-defense-1',
    subjectId: 'air-defense',
    sectionId: 'avoiding-defense',
    title: 'Navigate Around Air Defense',
    description: 'Fly the Air Force safely around enemy air defense zones',
    difficulty: 2,
    startFen: 'F10h/11h/11h/5g5/11h/11h/11h/11h/11h/11h/11h/11h w - - 0 1',
    targetSquares: ['k12'],
    instruction: 'Move the Air Force to k12 without being shot down by the Anti-Air at f8.',
    feedback: {
      airDefense: {
        destroyed:
          '💥 Your Air Force was destroyed by anti-air defense! Anti-Air has a 1-square zone (2 when heroic).',
        warning: '⚠️ That path goes through an air defense zone!',
        hint: '💡 Try going around the defense zone. Air Force can move 4 squares in any direction.'
      }
    },
    customMoveValidator: (move, engine) => {
      // Check if move path crosses air defense zone
      const defenseZone = ['e8', 'f8', 'g8', 'e9', 'f9', 'g9', 'e7', 'f7', 'g7'];
      const movePath = engine.game?.getMovePath(move);

      if (movePath?.some((sq) => defenseZone.includes(sq))) {
        return 'Air Force destroyed by air defense zone!';
      }
      return null;
    }
  },
  'TERRAIN_TUTORIAL',
  {
    allowUndo: true,
    feedback: 'verbose'
  }
);
```

---

## UI Component Adaptations

### LessonPlayer Updates

```svelte
<!-- apps/cotulenh/app/src/lib/learn/components/LessonPlayer.svelte -->

<script lang="ts">
  import { LearnEngine } from '@cotulenh/learn';

  let engine: LearnEngine;
  let behavior = $derived(engine.lesson?.behavior);

  // Conditional rendering based on behavior
  const showHintButton = $derived(behavior?.allowHints ?? false);
  const showUndoButton = $derived(behavior?.allowUndo ?? false);
  const showMoveCounter = $derived(behavior?.showMoveCount ?? false);
  const showStars = $derived(behavior?.grading === 'stars');

  function handleInvalidMove(result: MoveValidationResult) {
    if (!behavior) return;

    // Silent mode - no feedback
    if (behavior.feedback === 'silent') {
      return; // Just reject the move
    }

    // Minimal mode - simple toast
    if (behavior.feedback === 'minimal') {
      toast.error(result.error ?? 'Invalid move');
      return;
    }

    // Educational/verbose - detailed modal or persistent message
    if (behavior.feedback === 'educational' || behavior.feedback === 'verbose') {
      showFeedbackModal(result);
    }
  }
</script>

{#if showHintButton}
  <button onclick={showHint}>Show Hint</button>
{/if}

{#if showUndoButton}
  <button onclick={undo}>Undo</button>
{/if}

{#if showMoveCounter}
  <div class="move-counter">Moves: {engine.moveCount}</div>
{/if}

{#if showStars}
  <div class="stars">{renderStars(engine.stars)}</div>
{/if}
```

---

## Benefits of This Approach

✅ **Highly Flexible**: Each lesson can have completely different behavior  
✅ **Reusable Presets**: Common patterns defined once  
✅ **Progressive Complexity**: Start simple, add complexity gradually  
✅ **Type-Safe**: All configurations validated at compile time  
✅ **Maintainable**: Behavior separated from content  
✅ **Customizable**: Override any preset with lesson-specific needs  
✅ **Testable**: Each behavior mode can be tested independently

---

## Migration Path

1. **Add types** to `types.ts`
2. **Create presets** in `behavior-presets.ts`
3. **Update LearnEngine** to handle behavior configs
4. **Update existing lessons** to use presets
5. **Create new subject lessons** with appropriate behaviors
6. **Update UI components** to respect behavior flags
