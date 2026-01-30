# Learn UX Design - Current Integration Analysis

## How New UX Ideas Map to Current Setup

Your current architecture is **already built for the UX patterns proposed**. Here's the alignment:

---

## ✅ What's Already Working Well

### 1. **Reactive State Management** (LearnSession + Svelte 5 Runes)

```typescript
// Current: LearnSession.svelte.ts
#version = $state(0);  // Triggers reactivity

get feedbackMessage(): string {
  return this.#feedbackMessage; // Reactive getter
}

get shapes(): BoardShape[] {
  return this.#shapes; // Board arrows/highlights
}

get remainingTargets(): Square[] {
  void this.#version; // Track changes
  return this.#engine.remainingTargets; // Auto-updates
}
```

**This enables:**

- ✅ Real-time visual feedback (hints, arrows, highlights)
- ✅ Dynamic board state changes
- ✅ Automatic UI updates on interaction

---

### 2. **Event-Driven Callbacks** (LearnEngine → LearnSession)

```typescript
// Already implemented in learn-engine.ts
export interface LearnEngineCallbacks {
  onMove?: (moveCount: number, fen: string) => void;
  onComplete?: (result: LessonResult) => void;
  onShapes?: (shapes: BoardShape[]) => void;
  onSelect?: (info: SquareInfo) => void; // ← Perfect for tooltips!
  onOpponentMove?: (move: string, fen: string) => void;
  onFail?: (expectedMove: string, actualMove: string) => void;
}
```

**Maps directly to UX patterns:**

- `onSelect` → **Contextual tooltips** (hover piece → show info)
- `onShapes` → **Visual hints** (arrows, highlights)
- `onFail` → **Wrong move animations** (bounce, shake)
- `onMove` → **Progress updates** (target markers disappear)

---

### 3. **SquareInfo System** (Already Built!)

```typescript
// From types.ts - line 204
export interface SquareInfo {
  square: Square;
  hasPiece: boolean;
  isTarget: boolean;
  isValidDest: boolean;
  feedbackCode: FeedbackCode | null; // i18n support!
  feedbackContext?: Record<string, unknown>;
}
```

**This is EXACTLY what you need for:**

- ✅ Hover tooltips ("This is Infantry", "Move here 🎯")
- ✅ Contextual feedback (piece type, target hints)
- ✅ Smart error messages (wrong zone, invalid move)

**Current usage in learn-session.svelte.ts:**

```typescript
onSelect: (info: SquareInfo) => {
  if (info.feedbackCode) {
    const i18n = getI18n();
    this.#feedbackMessage = i18n.t(`learn.feedback.${info.feedbackCode}`);
    this.#showFeedback = true;
  }
};
```

---

### 4. **Component-Based Lesson Behavior** (Phase 1 Complete)

```typescript
// Validators, Completers, Graders - all using Strategy pattern
#validator = ValidatorFactory.create(lesson, this);
#completionChecker = CompletionFactory.create(lesson, [this.#validator]);
#grader = GraderFactory.create(lesson);
#feedbackProvider = FeedbackFactory.create(lesson);
```

**Enables flexible lesson types:**

- ✅ Target-based lessons (move to squares)
- ✅ Scenario-based lessons (follow script)
- ✅ Custom validation (terrain, stacking rules)
- ✅ Different grading (none, pass/fail, stars)

---

### 5. **Target Marker System** (Visual Feedback)

```svelte
<!-- LessonPlayer.svelte line 140 -->
{#each visibleTargets as targetSquare (targetSquare)}
  <TargetMarker square={targetSquare} boardApi={session.boardApi} />
{/each}
```

**Already implements:**

- ✅ Pulsing target indicators 🎯
- ✅ Auto-hide when visited
- ✅ Reactive updates (via `remainingTargets`)

---

### 6. **Progress Tracking** (Persistent State)

```typescript
// learn-progress.svelte.ts
export class SubjectProgressManager {
  isSubjectUnlocked(subjectId): boolean;
  getSubjectProgress(subjectId): SubjectProgress;
  saveLessonProgress(lessonId, stars, moveCount): void;
}
```

**Supports:**

- ✅ Progressive unlocking (prerequisites)
- ✅ Subject/section completion tracking
- ✅ Star ratings persistence
- ✅ "Continue" button (next incomplete lesson)

---

## 🎯 Gaps & What to Build Next

### A. Interactive Tooltips on Hover

**Current:** Only feedback on click/select  
**Needed:** Tooltip component that triggers on hover

```svelte
<!-- NEW: Tooltip.svelte -->
<script>
  import { createTooltip } from '$lib/interactions/tooltip';

  let { square, engine } = $props();
  let tooltip = createTooltip(() => engine.getSquareInfo(square));
</script>

<div class="tooltip-wrapper" onmouseenter={tooltip.show} onmouseleave={tooltip.hide}>
  <slot />
  {#if tooltip.visible}
    <div class="tooltip-content" style={tooltip.position}>
      {tooltip.message}
    </div>
  {/if}
</div>
```

**Hook into existing:**

```typescript
// LearnEngine already has this method!
getSquareInfo(square: Square): SquareInfo {
  // Returns hasPiece, isTarget, feedbackCode, etc.
}
```

---

### B. Progressive Hint System (Auto-Show on Timer)

**Current:** Manual hint button only  
**Needed:** Auto-escalating hints

```typescript
// NEW: hints.svelte.ts
export class HintSystem {
  #timeSinceMove = 0;
  #wrongMoveCount = 0;
  #hintLevel: 'none' | 'subtle' | 'medium' | 'strong' = 'none';

  tick(deltaTime: number) {
    this.#timeSinceMove += deltaTime;

    if (this.#timeSinceMove > 40000) {
      this.#hintLevel = 'strong'; // Show explicit instruction
    } else if (this.#timeSinceMove > 20000) {
      this.#hintLevel = 'medium'; // Show arrow
    } else if (this.#timeSinceMove > 10000) {
      this.#hintLevel = 'subtle'; // Pulse target
    }
  }

  onWrongMove() {
    this.#wrongMoveCount++;
    if (this.#wrongMoveCount >= 3) {
      this.#hintLevel = 'strong'; // Force tutorial
    }
  }
}
```

**Integrate with LearnSession:**

```typescript
#hintSystem = new HintSystem();

$effect(() => {
  const interval = setInterval(() => {
    this.#hintSystem.tick(1000);
    this.#updateHintVisuals(); // Update arrows/pulses
  }, 1000);

  return () => clearInterval(interval);
});
```

---

### C. Animation System for Feedback

**Current:** Static feedback messages  
**Needed:** CSS animations + sound effects

```svelte
<!-- NEW: FeedbackAnimation.svelte -->
<script>
  let { type, target } = $props(); // 'wrongMove', 'success', 'targetReached'
  let animating = $state(false);

  $effect(() => {
    animating = true;
    setTimeout(() => animating = false, 600);
  });
</script>

<div class="animation-layer" class:wrong-move={type === 'wrongMove' && animating}>
  {#if type === 'wrongMove'}
    <div class="bounce-back" style="left: {target.x}px; top: {target.y}px">
      ❌
    </div>
  {/if}
</div>

<style>
  @keyframes bounce-back {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }

  .bounce-back {
    animation: bounce-back 0.6s ease-out;
  }
</style>
```

**Trigger from LearnSession:**

```typescript
onFail: () => {
  this.#showAnimation('wrongMove', lastMoveSquare);
  this.#playSound('error');
};
```

---

### D. Hover Preview on Subject Cards

**Current:** Static subject cards  
**Needed:** Mini board animation on hover

```svelte
<!-- SubjectCard.svelte - ADD -->
<script>
  import MiniBoard from './MiniBoard.svelte';

  let { subject } = $props();
  let hovering = $state(false);
  let previewFen = subject.previewFen; // Demo position
</script>

<div class="subject-card" onmouseenter={() => hovering = true}>
  {#if hovering}
    <div class="preview-overlay">
      <MiniBoard fen={previewFen} autoPlay={true} />
    </div>
  {/if}
  <!-- ... rest of card ... -->
</div>
```

**Need to add to Subject type:**

```typescript
export interface Subject {
  // ... existing fields ...
  previewFen?: string; // Demo position for hover animation
  previewMoves?: string[]; // Auto-play these moves
}
```

---

### E. Interactive Step-Through Introductions

**Current:** LessonIntroModal shows static markdown  
**Needed:** Step-by-step interactive guide

```svelte
<!-- NEW: InteractiveIntro.svelte -->
<script>
  let { steps, onComplete } = $props();
  let currentStep = $state(0);
  let boardApi = $state(null);

  const step = $derived(steps[currentStep]);

  function handleInteraction(action) {
    if (action === step.requiredAction) {
      currentStep++;
      if (currentStep >= steps.length) {
        onComplete();
      }
    }
  }
</script>

<div class="intro-overlay">
  <div class="intro-board">
    <Board config={step.boardState} onMove={handleInteraction} />
  </div>
  <div class="intro-message">
    {step.message}
    <span class="hint">{step.hint}</span>
  </div>
</div>
```

**Example lesson with interactive intro:**

```typescript
{
  id: 'air-force-movement',
  introduction: {
    steps: [
      {
        message: "This is the Air Force. Click it.",
        boardState: { fen: '8/8/8/4A3/8/8/8/8 b - - 0 1' },
        requiredAction: 'select:e5',
        hint: "Try clicking the piece"
      },
      {
        message: "It can fly anywhere! Move it.",
        requiredAction: 'move:*',
        hint: "Pick any square"
      }
    ]
  }
}
```

---

## 🚀 Implementation Roadmap (Aligned with Current Phase)

### Phase 2A: Enhanced Board Interactions (2-3 hours)

1. ✅ Use existing `onSelect` callback
2. ⚡ Create `Tooltip.svelte` component
3. ⚡ Hook tooltips to `getSquareInfo()`
4. ⚡ Add CSS transitions for hover states

### Phase 2B: Progressive Hints (2-3 hours)

1. ⚡ Create `HintSystem` class
2. ⚡ Integrate timer into LearnSession
3. ⚡ Connect hint levels to visual effects
4. ⚡ Add "Why?" button for rule explanations

### Phase 2C: Feedback Animations (3-4 hours)

1. ⚡ Create `FeedbackAnimation.svelte`
2. ⚡ Hook into `onFail` callback
3. ⚡ Add CSS keyframe animations
4. ⚡ Optional: Add sound effects

### Phase 2D: Subject Card Enhancements (2-3 hours)

1. ⚡ Create `MiniBoard.svelte` (simplified board)
2. ⚡ Add `previewFen` to Subject type
3. ⚡ Implement hover preview in SubjectCard
4. ⚡ Add preview animations

### Phase 2E: Interactive Introductions (4-5 hours)

1. ⚡ Design `InteractiveIntro.svelte`
2. ⚡ Create step system
3. ⚡ Update LessonIntroModal to use steps
4. ⚡ Create intro steps for Subject 1 lessons

---

## 🎨 Data Flow: Current → Enhanced

### Current Flow (Click-Based)

```
User clicks square
  ↓
LearnEngine.handleSelect()
  ↓
SquareInfo calculated
  ↓
onSelect callback
  ↓
LearnSession updates feedbackMessage
  ↓
UI shows static feedback
```

### Enhanced Flow (Hover + Click)

```
User hovers square
  ↓
Tooltip.svelte calls engine.getSquareInfo()
  ↓
Contextual tooltip appears
  ↓
User clicks square
  ↓
LearnEngine validates move
  ↓
Valid: onMove → Update targets, check completion
Invalid: onFail → Animation + Sound + Explanation
  ↓
UI updates reactively via $state
```

---

## 🧩 Component Hierarchy (After Enhancements)

```
LessonPlayer.svelte
├── LessonStepper.svelte (breadcrumb)
├── BoardContainer.svelte
│   ├── Board (from @cotulenh/board)
│   ├── TargetMarker.svelte (pulsing targets) ✅
│   ├── Tooltip.svelte (hover info) ⚡ NEW
│   └── FeedbackAnimation.svelte (wrong move) ⚡ NEW
├── InstructionPanel
│   ├── LessonContent.svelte (markdown) ✅
│   ├── HintButton (manual hint) ✅
│   └── ProgressiveHint.svelte (auto-show) ⚡ NEW
└── CompletionPanel ✅

SubjectCard.svelte
├── ProgressIndicator.svelte ✅
├── MiniBoard.svelte (hover preview) ⚡ NEW
└── ContinueButton ✅

LessonIntroModal.svelte
├── StaticContent (current) ✅
└── InteractiveIntro.svelte (new lessons) ⚡ NEW
```

---

## 🎯 Immediate Next Steps

**Start with highest-impact, lowest-effort:**

1. **Tooltip System** (2 hours)
   - Leverage existing `getSquareInfo()`
   - Big UX win for discoverability
   - No engine changes needed

2. **Progressive Hints** (2 hours)
   - Simple timer logic
   - Use existing shapes system
   - Improves learning curve

3. **Feedback Animations** (3 hours)
   - CSS-only (no complex logic)
   - Makes errors less frustrating
   - Feels polished

**These 3 features will transform the UX with minimal code changes.**

---

## ✅ Summary: Perfect Alignment

Your current setup is **architecturally ready** for advanced UX:

- ✅ Reactive state system (Svelte 5 runes)
- ✅ Event callbacks (onSelect, onShapes, onFail)
- ✅ SquareInfo system (contextual data)
- ✅ Target markers (visual feedback)
- ✅ Progress tracking (persistence)

**What's needed:**

- ⚡ UI components (Tooltip, Animations, HintSystem)
- ⚡ Timing logic (progressive hints)
- ⚡ CSS polish (hover states, transitions)

**No breaking changes required.** All enhancements layer on top of existing architecture.
