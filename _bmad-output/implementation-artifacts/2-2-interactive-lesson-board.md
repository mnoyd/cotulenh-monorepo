# Story 2.2: Interactive Lesson Board

Status: done

## Story

As a learner,
I want to interact with a board during lessons to practice piece movements and game mechanics,
So that I learn by doing rather than just reading.

## Acceptance Criteria

1. **Given** a learner navigates to `/learn/[subject]/[id]` **When** the page loads **Then** an interactive `cotulenh-board` is mounted via a `useBoard` hook into a container ref in a non-realtime context **And** lesson instructions are displayed in a panel (right on desktop, below board on mobile) **And** the board renders within 500ms of page load (NFR5)
2. **Given** a lesson step asks the learner to move a specific piece **When** the learner taps/clicks a piece on the board **Then** legal move indicators are shown on valid destination squares **And** correct moves trigger positive feedback (green flash) **And** incorrect moves trigger gentle corrective feedback (red flash + contextual hint)
3. **Given** a lesson has multiple steps (scenario) **When** the learner completes a step **Then** the next step loads automatically with updated board position and instructions **And** a progress indicator shows current step out of total steps
4. **Given** a learner is on a lesson page **When** they want to go back **Then** navigation back to `/learn/[subject]` is available without losing their place
5. **Given** the board is rendered **When** keyboard navigation is used **Then** board squares are individually focusable with descriptive aria-labels (NFR21) **And** game state changes are announced via ARIA live regions (NFR23)
6. **Given** a lesson has progressive hints configured **When** time elapses without correct action **Then** hints escalate: 0-10s none, 10-20s subtle pulse on target, 20-40s arrow, 40s+ text hint

## Tasks / Subtasks

- [x] Task 1: Create `useBoard` hook (AC: #1, #5)
  - [x] 1.1 Create `src/hooks/use-board.ts` — mounts `CotulenhBoard` into a container ref, returns imperative API
  - [x] 1.2 Dynamic import `@cotulenh/board` (must NOT be in shared bundle per architecture)
  - [x] 1.3 Import board CSS (`@cotulenh/board/assets/commander-chess.base.css`, `commander-chess.pieces.css`, `commander-chess.clasic.css`)
  - [x] 1.4 Bridge board events (move, select) to callback props
  - [x] 1.5 Expose `setFen`, `setDests`, `setShapes`, `setHighlight`, `destroy` methods
  - [x] 1.6 Handle cleanup on unmount (call `api.destroy()`)
  - [x] 1.7 Unit tests for hook (mount/unmount lifecycle, event bridging)
- [x] Task 2: Create lesson page route and layout (AC: #1, #4)
  - [x] 2.1 Create `src/app/(public)/learn/[subject]/[id]/page.tsx` — SSR shell with dynamic client component
  - [x] 2.2 Create `src/app/(public)/learn/[subject]/[id]/loading.tsx` — skeleton (board placeholder + panel placeholder)
  - [x] 2.3 Validate `subject` and `id` params: use `getSubjectById(subject)` and `getLessonById(id)` — return `notFound()` if invalid or lesson not in subject
  - [x] 2.4 Set SEO metadata: `<title>` with lesson title (Vietnamese), `<meta description>` with lesson description
  - [x] 2.5 Add back-navigation link to `/learn/[subject]`
- [x] Task 3: Create lesson view client component (AC: #1, #2, #3, #6)
  - [x] 3.1 Create `src/components/learn/lesson-view.tsx` — main client component ('use client')
  - [x] 3.2 Initialize `LearnEngine` with lesson via `createLearnEngine()` — subscribe to callbacks: `onMove`, `onComplete`, `onStateChange`, `onOpponentMove`, `onFail`, `onShapes`, `onSelect`
  - [x] 3.3 Mount board via `useBoard` hook — wire `movable.dests` from `engine.getPossibleMoves()`, wire `movable.events.after` to `engine.makeMove()`
  - [x] 3.4 Set board `fen` from `engine.fen`, update on every `onMove` callback
  - [x] 3.5 Render `lesson.instruction` (Vietnamese via `tLessonInstruction`) in instruction panel
  - [x] 3.6 Render `lesson.content` (Vietnamese via `tLessonContent`) as markdown in panel if present
  - [x] 3.7 Display `lesson.highlightSquares` and `lesson.arrows` as board shapes; update from `onShapes` callback
  - [x] 3.8 Display `targetSquares` as custom highlights on board
  - [x] 3.9 Show move count if `lesson.showMoveCount` is true
  - [x] 3.10 Handle completion: on `engine.status === 'completed'` show success overlay with `tLessonSuccessMessage`, stars (if graded), "Bai tiep theo" (Next Lesson) button
  - [x] 3.11 Handle failure: on `onFail` show corrective feedback with `tLessonFailureMessage` and hint
- [x] Task 4: Scenario handling for scripted lessons (AC: #3)
  - [x] 4.1 Detect `engine.hasScenario` — if true, run scenario flow
  - [x] 4.2 On `onOpponentMove` callback, animate opponent move on board with ~500ms delay
  - [x] 4.3 Show step progress indicator: "Buoc X/Y" (Step X of Y) using `scenario.getProgress()`
  - [x] 4.4 On wrong move in strict scenario, show failure message and offer retry
- [x] Task 5: Progressive hint system (AC: #6)
  - [x] 5.1 Initialize `HintSystem` from `@cotulenh/learn` via `createHintSystem()` with lesson config
  - [x] 5.2 Subscribe to hint callbacks — escalate visual feedback on board (pulse, arrow, text)
  - [x] 5.3 Create `src/components/learn/hint-display.tsx` — renders current hint text when escalated to text level
  - [x] 5.4 Wire hint button (if `lesson.allowHints`) to manually request next hint level
- [x] Task 6: Board-left/panel-right layout (AC: #1)
  - [x] 6.1 Create `src/components/learn/lesson-layout.tsx` — board-left, instruction-panel-right on desktop (>1024px); board-top, panel-below on mobile
  - [x] 6.2 Board must occupy 60%+ viewport (same constraint as game page per FR36)
  - [x] 6.3 Panel contains: lesson title, difficulty badge, instruction text, step progress, hint button, restart button, undo button (if `lesson.allowUndo`), back link
  - [x] 6.4 Ensure board never resizes when panel content changes
- [x] Task 7: Progress saving and navigation (AC: #4)
  - [x] 7.1 On lesson completion, call `useLearnStore.saveLessonProgress(lessonId, stars, moveCount)`
  - [x] 7.2 "Bai tiep theo" button uses `getNextLessonInSubject()` to navigate to next lesson; if no next lesson, navigate to `/learn/[subject]` with completion message
  - [x] 7.3 Restart button calls `engine.restart()` and resets board
  - [x] 7.4 Undo button calls `engine.undo()` (if `lesson.allowUndo`)
- [x] Task 8: Accessibility (AC: #5)
  - [x] 8.1 Board squares must be focusable via keyboard with descriptive aria-labels (e.g., "Infantry on e5")
  - [x] 8.2 ARIA live region announces: move results, step completion, lesson completion, hint text
  - [x] 8.3 Respect `prefers-reduced-motion` — disable board animations
  - [x] 8.4 All text in Vietnamese, no English strings
- [x] Task 9: Tests (AC: all)
  - [x] 9.1 Unit test for `useBoard` hook (mount, destroy, event bridging)
  - [x] 9.2 Unit test for `lesson-view` component (engine integration, move handling, completion flow)
  - [x] 9.3 Unit test for scenario flow (opponent moves, step progression, failure handling)
  - [x] 9.4 Unit test for hint system integration (time-based escalation)
  - [x] 9.5 Unit test for lesson page SSR (metadata, notFound for invalid lesson)
  - [x] 9.6 Unit test for progress saving on completion

## Dev Notes

### Architecture Constraints

- **Dynamic import REQUIRED** for `@cotulenh/core` and `@cotulenh/board` — these must NOT be in the shared bundle. Use `next/dynamic` or React `lazy()` for the lesson view client component. The `@cotulenh/learn` metadata exports are lightweight and can be imported directly for SSR.
- **Board is vanilla TS, not React** — `CotulenhBoard(element, config)` returns an imperative `Api`. Mount via React ref in `useBoard` hook. Never wrap board state in React state directly.
- **LearnEngine is framework-agnostic** — instantiate with callbacks, call methods imperatively. Bridge to React state via Zustand or local component state.
- **SSR for the page shell** — `/learn/[subject]/[id]` is a public route, must be crawlable. The page.tsx exports metadata. The interactive board component must be client-only (`'use client'`).
- **No auth gate** — `/learn/*` routes are explicitly public in middleware.
- **Vietnamese only** — use `@cotulenh/learn` i18n functions: `tLessonTitle`, `tLessonDescription`, `tLessonContent`, `tLessonInstruction`, `tLessonHint`, `tLessonSuccessMessage`, `tLessonFailureMessage`. Call `setLearnLocale('vi')` before rendering.
- **Skeleton screens only, never spinners** — use `loading.tsx` convention.
- **0px border radius, no shadows, no gradients** — borders for elevation per design system.

### Board Package Integration

```typescript
// Dynamic import pattern
const CotulenhBoard = (await import('@cotulenh/board')).CotulenhBoard;

// CSS imports (in client component or layout)
import '@cotulenh/board/assets/commander-chess.base.css';
import '@cotulenh/board/assets/commander-chess.pieces.css';
import '@cotulenh/board/assets/commander-chess.clasic.css';

// Mount pattern
const containerRef = useRef<HTMLDivElement>(null);
const boardApi = CotulenhBoard(containerRef.current!, {
  fen: engine.fen,
  orientation: 'red',           // Learner always plays red
  viewOnly: false,
  movable: {
    color: 'red',
    dests: destsFromEngine,     // Map<OrigMoveKey, DestMove[]>
    showDests: true,
    events: {
      after: (orig, dest) => engine.makeMove(orig.square, dest.square, dest.stay),
    },
  },
  drawable: {
    enabled: false,             // No free drawing in lessons
    autoShapes: shapesFromEngine,
  },
  highlight: {
    lastMove: true,
    custom: targetHighlights,   // Map<Key, cssClass> for targetSquares
  },
  animation: { enabled: true, duration: 200 },
});

// Update board on engine state change
boardApi.set({ fen: newFen, movable: { dests: newDests } });
boardApi.setShapes(newShapes);
```

### LearnEngine Integration

```typescript
import { createLearnEngine, getLessonById, getLessonContext } from '@cotulenh/learn';
import type { LearnEngineCallbacks, LessonResult, SquareInfo, BoardShape } from '@cotulenh/learn';

const engine = createLearnEngine({
  onMove: (moveCount, fen) => {
    boardApi.set({ fen, movable: { dests: engine.getPossibleMoves() } });
  },
  onComplete: (result: LessonResult) => {
    saveLessonProgress(result.lessonId, result.stars, result.moveCount);
    showCompletionOverlay(result);
  },
  onStateChange: (status) => setLessonStatus(status),
  onOpponentMove: (move, fen) => {
    // Animate opponent move on board with delay
    boardApi.move(parseOrig(move), parseDest(move));
  },
  onFail: (expected, actual) => {
    showCorrectionFeedback(expected, actual);
  },
  onShapes: (shapes: BoardShape[]) => {
    boardApi.setShapes(shapes.map(toBoardDrawShape));
  },
});

engine.loadLesson(lessonId);
```

### HintSystem Integration

```typescript
import { createHintSystem } from '@cotulenh/learn';
import type { HintSystemCallbacks } from '@cotulenh/learn';

const hintSystem = createHintSystem({
  // Callbacks for escalating hint levels
  onHintChange: (level, data) => {
    switch (level) {
      case 'pulse-target': boardApi.set({ highlight: { custom: pulseMap } }); break;
      case 'show-arrow': boardApi.setShapes([arrowShape]); break;
      case 'show-instruction': setHintText(data.text); break;
    }
  },
});
```

### Data Model (from @cotulenh/learn)

```typescript
// Key lesson fields for board integration:
interface Lesson {
  id: string;
  startFen: string;                    // Initial board position
  goalFen?: string | string[];         // Target position(s)
  instruction: string;                 // Step instruction text
  content?: string;                    // Rich markdown content
  hint?: string;                       // Help text
  successMessage?: string;
  failureMessage?: string;
  highlightSquares?: Square[];         // Squares to highlight
  arrows?: BoardShape[];               // Arrows to draw
  targetSquares?: Square[];            // Squares user must visit
  orderedTargets?: boolean;
  scenario?: ScenarioBlueprint;        // Scripted move sequences
  optimalMoves?: number;               // For star grading
  validateLegality?: boolean;
  feedbackStyle?: 'silent' | 'toast' | 'modal' | 'inline';
  grading?: 'none' | 'pass-fail' | 'stars';
  allowUndo?: boolean;                 // default: true
  allowHints?: boolean;                // default: true
  showMoveCount?: boolean;
  showValidMoves?: boolean;            // default: true
}

// Navigation context:
interface LessonContext {
  lesson: Lesson;
  subject: Subject;
  section: Section;
  positionInSection: number;           // 1-indexed
  totalInSection: number;
  positionInSubject: number;           // 1-indexed
  totalInSubject: number;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
}
```

### UX Design Requirements

- **Board-left/panel-right layout** — same as game screen. Board occupies 60%+ viewport.
- **Panel contents:** lesson text, step counter ("Buoc X/Y"), hint button, progress bar, restart, undo.
- **Progressive hints:** 0-10s none, 10-20s subtle pulse, 20-40s arrow, 40s+ text hint.
- **Correct move:** green flash. **Wrong move:** red flash + contextual hint.
- **Interactive flow:** tap piece -> see legal moves -> move -> feedback. Learn by doing.
- **Mobile (<1024px):** board full-width on top, panel below.
- **Desktop (>1024px):** board left, panel right (280-320px).
- **Light mode default** for learn pages (content-heavy).

### Component Patterns (from Story 2.1)

- **File naming**: kebab-case `.tsx` (e.g., `lesson-view.tsx`)
- **Component naming**: PascalCase (e.g., `LessonView`)
- **Exports**: Named exports preferred
- **Styling**: Tailwind utility classes with CSS variable design tokens (`var(--space-4)`, `var(--color-primary)`)
- **Class merging**: `cn()` from `@/lib/utils/cn`
- **Tests**: Co-located in `__tests__/` directory next to components
- **No barrel exports** — direct imports only

### Zustand Store Usage

The `useLearnStore` already exists from Story 2.1 with:
- `saveLessonProgress(lessonId, stars?, moveCount?)` — saves to localStorage via `ProgressManager`
- `isLessonCompleted(lessonId)` — checks completion status
- `getNextIncompleteLesson(subjectId)` — for navigation after completion
- `getCompletedLessonCount(subjectId)` — for progress display

Do NOT create a new store. Use the existing `useLearnStore` for progress persistence.

### Route Structure

```
src/app/(public)/learn/
  page.tsx              # Learn hub (Story 2.1 - EXISTS)
  loading.tsx           # Skeleton (Story 2.1 - EXISTS)
  [subject]/
    page.tsx            # Subject detail (Story 2.1 - EXISTS)
    loading.tsx         # Skeleton (Story 2.1 - EXISTS)
    [id]/
      page.tsx          # Lesson view (THIS STORY - CREATE)
      loading.tsx       # Lesson skeleton (THIS STORY - CREATE)
```

### New Files to Create

```
src/hooks/use-board.ts                              # Board mounting hook
src/hooks/__tests__/use-board.test.ts               # Hook tests
src/app/(public)/learn/[subject]/[id]/page.tsx      # Lesson page (SSR shell)
src/app/(public)/learn/[subject]/[id]/loading.tsx   # Skeleton
src/components/learn/lesson-view.tsx                 # Main client component
src/components/learn/lesson-layout.tsx               # Board + panel layout
src/components/learn/hint-display.tsx                # Hint text display
src/components/learn/lesson-completion.tsx           # Completion overlay
src/components/learn/__tests__/lesson-view.test.tsx  # Component tests
src/components/learn/__tests__/lesson-layout.test.tsx
```

### What NOT To Do

- Do NOT implement lesson progress tracking to a database — Story 2.3 handles localStorage tracking refinements, Story 2.4 handles DB migration
- Do NOT create REST API routes — lesson data comes from `@cotulenh/learn` package imports
- Do NOT add i18n infrastructure beyond what `@cotulenh/learn` provides
- Do NOT add authentication checks to learn pages
- Do NOT import `@cotulenh/core` or `@cotulenh/board` at the top level of any page/layout — dynamic import only
- Do NOT use spinners — only skeleton screens
- Do NOT add English text — Vietnamese only
- Do NOT create a separate game store for lessons — use `LearnEngine` callbacks + local component state
- Do NOT wrap board in React state — it's imperative, communicate via `boardApi.set()`
- Do NOT implement a "useBoard" hook that re-renders React on every board event — bridge selectively

### Previous Story Intelligence (2.1)

**Learnings from Story 2.1:**
- `@cotulenh/learn` must be declared as dependency in `apps/cotulenh/web/package.json` — already done in 2.1
- `@cotulenh/board` must ALSO be declared as dependency — check/add in package.json
- `@cotulenh/core` may need to be added too (LearnEngine uses it internally, but check if it's a transitive dep of `@cotulenh/learn`)
- The learn-store was fixed for localStorage persistence and accurate completion counts
- Subject detail page hydrates completion indicators from the learn store
- Tests use Vitest — 34 test files, 157 tests all passing as of 2.1 completion
- Verification commands: `pnpm --filter @cotulenh/web run test`, `pnpm --filter @cotulenh/web run check-types`, `pnpm --filter @cotulenh/web run lint`

**Files created in 2.1 that this story builds upon:**
- `src/stores/learn-store.ts` — Zustand store wrapping ProgressManager
- `src/hooks/use-learn-progress.ts` — progress reading hook
- `src/components/learn/` — all learn components (subject-card, subject-grid, lesson-list-item, section-group, learn-hub-client)
- `src/app/(public)/learn/[subject]/page.tsx` — subject detail page (lesson list links to `/learn/[subject]/[lessonId]`)

### Git Intelligence

Recent commits show consistent patterns:
- Commit message format: `feat(web): description` or `fix(web): description`
- Tests are expected to pass before marking story done
- Code review findings are addressed in follow-up commits

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Board Integration, Code Splitting, Component Architecture, Zustand Stores, Testing]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Learn Lesson View, Progressive Hints, Board Layout]
- [Source: packages/cotulenh/board/src/cotulenh.ts — CotulenhBoard API]
- [Source: packages/cotulenh/learn/src/learn-engine.ts — LearnEngine class]
- [Source: packages/cotulenh/learn/src/scenario.ts — Scenario class]
- [Source: packages/cotulenh/learn/src/hint-system.ts — HintSystem]
- [Source: packages/cotulenh/learn/src/index.ts — public exports]
- [Source: packages/cotulenh/learn/src/lessons/index.ts — getLessonById, getLessonContext, getNextLessonInSubject]
- [Source: _bmad-output/implementation-artifacts/2-1-learn-hub-lesson-navigation.md — previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed ESM/CJS compatibility in useBoard hook — switched from `require()` to dynamic `import()` for @cotulenh/board
- Created `movesToDests()` converter to bridge `MoveResult[]` (from LearnEngine) to `Dests` (Map<OrigMoveKey, DestMove[]> for board)
- Inlined `SYMBOL_TO_ROLE` mapping to avoid adding direct dependency on @cotulenh/common in client bundle
- Fixed i18n function return types (`string | undefined`) with null coalescing

### Completion Notes List

- Implemented `useBoard` hook with async dynamic import, imperative API bridge (setFen, setDests, setShapes, setHighlight, move, destroy), and cleanup on unmount
- Created SSR lesson page route at `/learn/[subject]/[id]` with metadata generation, param validation (subject/lesson/ownership), and back-navigation
- Created skeleton loading.tsx with board + panel placeholder layout
- Implemented full LessonView client component integrating LearnEngine, HintSystem, board mounting, scenario handling, progressive hints, completion overlay, failure feedback, and ARIA accessibility
- Created LessonLayout component with responsive board-left/panel-right (desktop) and board-top/panel-below (mobile) layout
- Created HintDisplay component for progressive hint text rendering
- Created LessonCompletion overlay with star display, next lesson navigation, restart, and back link
- Follow-up review fixes landed: initialized lesson progress persistence, restored in-progress lesson state on return, added correct-move/incorrect-move board feedback, stepped manual hints through progressive levels, rendered lesson markdown, and annotated board squares with keyboard focus + descriptive ARIA labels
- Board CSS is now loaded globally for the web app, and `useBoard` updates config in place instead of remounting on every config identity change
- 38 new tests across 4 test files (197 total tests, all passing)
- All Vietnamese text, no English strings in UI
- Respects prefers-reduced-motion for board animations
- Board loaded via next/dynamic with ssr:false for code splitting

### File List

New files:
- src/hooks/use-board.ts
- src/hooks/__tests__/use-board.test.ts
- src/app/(public)/learn/[subject]/[id]/page.tsx
- src/app/(public)/learn/[subject]/[id]/loading.tsx
- src/app/(public)/learn/[subject]/[id]/__tests__/lesson-page.test.tsx
- src/components/learn/lesson-view.tsx
- src/components/learn/lesson-layout.tsx
- src/components/learn/hint-display.tsx
- src/components/learn/lesson-completion.tsx
- src/components/learn/lesson-markdown.tsx
- src/components/learn/__tests__/lesson-view.test.tsx
- src/components/learn/__tests__/lesson-layout.test.tsx

Modified files:
- src/app/globals.css

### Change Log

- 2026-03-13: Implemented Story 2.2 — Interactive Lesson Board with full board integration, learn engine, hint system, scenario support, accessibility, and comprehensive tests
- 2026-03-13: Addressed Senior Developer Review findings — progress initialization/persistence, in-progress lesson restore, keyboard square labels, positive feedback flash, stepped manual hints, markdown content rendering, and stable `useBoard` updates

### Senior Developer Review (AI)
- 2026-03-13 — Fixed previously identified HIGH and MEDIUM findings:
- Lesson completion now writes through an initialized learn store, and in-progress move history is restored when users navigate away and back to the lesson.
- Wrong moves now revert the board to the authoritative engine state; correct moves flash green, wrong moves flash red, and manual hints step through pulse → arrow → text instead of jumping straight to the final hint.
- Board squares are now individually focusable with descriptive Vietnamese ARIA labels, lesson markdown content renders structurally, board CSS is loaded globally, and the hook no longer remounts on every config identity change.
- Verification: `pnpm --filter @cotulenh/web run test`, `pnpm --filter @cotulenh/web run check-types`, and `pnpm --filter @cotulenh/web run lint`.
