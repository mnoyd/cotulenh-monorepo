# Story 2.3: Lesson Progress Tracking

Status: done

## Story

As a learner without an account,
I want my lesson progress saved automatically across browser sessions,
So that I can return later and continue where I left off.

## Acceptance Criteria

1. **Given** a learner completes a lesson **When** the lesson ends **Then** completion status is saved to localStorage keyed by lesson ID **And** the `useLearnStore` Zustand store reflects the updated progress
2. **Given** a learner returns to the learn hub after completing some lessons **When** the page loads **Then** completed lessons show a completion indicator **And** subjects show progress (e.g., "3/5 lessons completed") **And** progress is read from localStorage on mount
3. **Given** a learner clears their browser data **When** they return to the learn hub **Then** all progress indicators reset to zero (expected behavior, no error)
4. **Given** a learner has progress in localStorage **When** they navigate between learn pages **Then** progress state is consistent and does not flicker or reset

## Tasks / Subtasks

- [x] Task 1: Display earned stars on completed lessons in subject detail page (AC: #2)
  - [x] 1.1 Update `LessonListItem` component to accept and render `stars` prop (0-3) — show filled/empty star icons next to the completion checkmark
  - [x] 1.2 Update `SectionGroup` to pass star data from `useLearnStore.getLessonProgress(lessonId)` to each `LessonListItem`
  - [x] 1.3 Add `getLessonProgress(lessonId): LessonProgress | null` method to `useLearnStore` if not already exposed (check `ProgressManager.getLessonProgress`)
  - [x] 1.4 Style stars using warning color (`var(--color-warning)`) for filled, muted for empty — match `StarDisplay` in `lesson-completion.tsx`

- [x] Task 2: Display aggregate star count on subject cards in learn hub (AC: #2)
  - [x] 2.1 Add `getSubjectStarCount(subjectId): { earned: number, total: number }` to `useLearnStore` — compute by iterating all lessons in subject, summing earned stars vs max possible (3 per lesson)
  - [x] 2.2 Update `SubjectCard` to display star count (e.g., "12/15 ★") alongside the existing "X/Y bài học" count
  - [x] 2.3 Update `LearnHubClient` to pass star data to `SubjectCard`

- [x] Task 3: Ensure hydration consistency — no flicker on navigation (AC: #4)
  - [x] 3.1 Verify `useLearnProgress` hook initializes the store synchronously from localStorage before first render — if async, add a `hydrated` flag to prevent rendering stale state
  - [x] 3.2 If hydration causes flicker: show skeleton/placeholder for progress indicators until store is hydrated, then render actual values
  - [x] 3.3 Test navigation sequence: learn hub → subject → lesson → complete → back to subject → verify checkmark + stars appear immediately without flicker

- [x] Task 4: Error resilience for localStorage unavailability (AC: #3)
  - [x] 4.1 Verify `ProgressManager` gracefully handles localStorage being unavailable (private browsing, quota exceeded, permissions denied) — should fall back to MemoryStorageAdapter
  - [x] 4.2 Verify clearing browser data results in clean zero state with no console errors — ProgressManager should return empty progress, not throw
  - [x] 4.3 Add try/catch around localStorage operations in `LocalStorageAdapter` if not already present

- [x] Task 5: Comprehensive progress tracking tests (AC: #1, #2, #3, #4)
  - [x] 5.1 Unit test: `LessonListItem` renders stars correctly for 0, 1, 2, 3 star values
  - [x] 5.2 Unit test: `SubjectCard` renders star aggregate alongside lesson count
  - [x] 5.3 Unit test: `SectionGroup` passes star data from store to list items
  - [x] 5.4 Integration test: complete a lesson → verify store updates → verify UI reflects completion + stars
  - [x] 5.5 Unit test: progress cleared (empty localStorage) → all indicators show zero, no errors
  - [x] 5.6 Unit test: localStorage unavailable → fallback to memory, components render without progress, no crash
  - [x] 5.7 Unit test: navigation between learn hub and subject pages preserves progress state consistently

## Dev Notes

### What Already Exists (from Stories 2.1 and 2.2)

**Core infrastructure is DONE — do NOT recreate:**
- `ProgressManager` in `packages/cotulenh/learn/src/progress/progress-manager.ts` — framework-agnostic, storage-adapter pattern, persists to localStorage via `LocalStorageAdapter`
- `useLearnStore` in `src/stores/learn-store.ts` — Zustand store wrapping ProgressManager with `saveLessonProgress()`, `isLessonCompleted()`, `getNextIncompleteLesson()`, `getCompletedLessonCount()`
- `useLearnProgress` hook in `src/hooks/use-learn-progress.ts` — initializes store on mount, triggers reactivity via `progressVersion` state bumps
- `LearnHubClient` in `src/components/learn/learn-hub-client.tsx` — shows "Continue Learning" banner, enriches subject cards with completion counts
- `SubjectCard` in `src/components/learn/subject-card.tsx` — shows "X/Y bài học" count and progress bar
- `SectionGroup` in `src/components/learn/section-group.tsx` — maps lessons to `LessonListItem`, uses `isLessonCompleted()` for checkmark display
- `LessonListItem` in `src/components/learn/lesson-list-item.tsx` — shows completion checkmark OR lesson number
- `LessonView` in `src/components/learn/lesson-view.tsx` — calls `saveLessonProgress(lessonId, stars, moveCount)` on lesson completion
- `StarDisplay` in `src/components/learn/lesson-completion.tsx` — shows 1-3 filled/empty stars on completion overlay

**Saving flow already works:**
```
LessonView.onComplete → saveLessonProgress(id, stars, moveCount)
  → useLearnStore → ProgressManager.saveLessonProgress()
  → LocalStorageAdapter.set('learn-progress', {...})
  → onChange callback → progressVersion++ → components re-render
```

**Display flow already works (partially):**
```
useLearnProgress() initializes store on mount
  → SubjectCard reads getCompletedLessonCount(subjectId) → "X/Y bài học"
  → SectionGroup reads isLessonCompleted(lessonId) → checkmark or number
```

### What This Story Adds

The base save/display flow works. This story adds:
1. **Star visibility** — Stars are saved but NOT displayed on learn hub or subject pages. Add star display to `LessonListItem` and aggregate stars to `SubjectCard`.
2. **Hydration robustness** — Verify no flicker when navigating between learn pages. The store must hydrate from localStorage before components render progress indicators.
3. **Error resilience** — Verify graceful fallback when localStorage is unavailable or cleared.
4. **Test coverage** — Dedicated tests for progress tracking flows (save, display, clear, error states).

### Architecture Constraints

- **Vietnamese only** — all new text must be in Vietnamese. Star display needs no text. If adding labels: "★ 12/15" not "Stars: 12/15".
- **0px border radius, no shadows, no gradients** — borders for elevation per design system.
- **Skeleton screens only, never spinners** — if hydration is async, use skeleton placeholders.
- **No barrel exports** — direct imports only.
- **File naming**: kebab-case `.tsx`. **Component naming**: PascalCase.
- **Styling**: Tailwind utility classes with CSS variable design tokens (`var(--space-4)`, `var(--color-primary)`).
- **Class merging**: `cn()` from `@/lib/utils/cn`.
- **Tests**: Co-located in `__tests__/` directory next to components. Vitest framework.

### Data Model Reference

```typescript
// From packages/cotulenh/learn/src/types.ts
interface LessonProgress {
  lessonId: string;
  completed: boolean;
  moveCount: number;
  stars: 0 | 1 | 2 | 3;
}
```

`ProgressManager` methods to use:
- `getLessonProgress(lessonId): LessonProgress | null` — get individual lesson progress
- `getCompletedLessonCount(subjectId): number` — already used by SubjectCard
- `isLessonCompleted(lessonId): boolean` — already used by SectionGroup
- `getAllProgress(): Record<string, LessonProgress>` — for bulk star aggregation

### Star Display Convention

Use the same pattern as `StarDisplay` in `lesson-completion.tsx`:
- Filled star: warning color (`var(--color-warning)`)
- Empty star: muted color
- Scale: `stars=3` means 3 filled stars (best), `stars=1` means 1 filled star
- On lesson list items: small inline stars (12-14px) next to checkmark
- On subject cards: aggregate "★ earned/possible" text

### Component Modification Plan

**`LessonListItem`** (src/components/learn/lesson-list-item.tsx):
- Add `stars?: 0 | 1 | 2 | 3` prop
- When completed AND stars > 0: render mini stars after checkmark
- Keep existing layout — stars are supplementary, not replacing checkmark

**`SectionGroup`** (src/components/learn/section-group.tsx):
- Import `useLearnStore` (or use existing hook pattern)
- For each lesson, get `getLessonProgress(lesson.id)?.stars`
- Pass to `LessonListItem`

**`SubjectCard`** (src/components/learn/subject-card.tsx):
- Add `earnedStars: number` and `totalStars: number` props
- Display "★ X/Y" below or next to existing "X/Y bài học"

**`LearnHubClient`** (src/components/learn/learn-hub-client.tsx):
- Compute star aggregates per subject
- Pass to SubjectCard

### What NOT To Do

- Do NOT create a new Zustand store — use existing `useLearnStore`
- Do NOT add database persistence — that's Story 2.4
- Do NOT add progress migration logic — that's Story 2.4
- Do NOT add signup prompts — that's Story 2.4
- Do NOT change ProgressManager internals — it already works correctly
- Do NOT add English text — Vietnamese only
- Do NOT add authentication checks — learn pages are public
- Do NOT over-engineer star display — small inline indicators, not elaborate UI

### Previous Story Intelligence (2.2)

**From Story 2.2 completion notes:**
- Stars are saved via `saveLessonProgress(result.lessonId, result.stars, result.moveCount)` on the `onComplete` callback
- The learn store's `saveLessonProgress` correctly delegates to ProgressManager which only updates if new stars are better
- Board CSS is loaded globally in `globals.css` — no CSS changes needed for this story
- `useBoard` hook is stable — no remounts on config identity change
- Session persistence exists for in-progress lessons (separate from completion progress)
- 197 total tests passing as of 2.2 completion

**Verification commands:**
- `pnpm --filter @cotulenh/web run test` — run all tests
- `pnpm --filter @cotulenh/web run check-types` — TypeScript check
- `pnpm --filter @cotulenh/web run lint` — ESLint

### Files to Modify

```
src/components/learn/lesson-list-item.tsx    # Add stars display
src/components/learn/section-group.tsx       # Pass star data to list items
src/components/learn/subject-card.tsx        # Add star aggregate display
src/components/learn/learn-hub-client.tsx    # Compute and pass star data
src/stores/learn-store.ts                    # Add getLessonProgress() if needed
```

### New Files to Create

```
src/components/learn/__tests__/lesson-list-item.test.tsx   # Star display tests
src/components/learn/__tests__/subject-card.test.tsx        # Star aggregate tests
src/components/learn/__tests__/progress-tracking.test.tsx   # Integration tests
```

### Git Intelligence

Recent commits follow format: `feat(web): description` or `fix(web): description`. Tests expected to pass before marking story done. Code review findings addressed in follow-up commits.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Zustand Stores, Component Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Learn Hub]
- [Source: _bmad-output/implementation-artifacts/2-2-interactive-lesson-board.md — previous story learnings]
- [Source: packages/cotulenh/learn/src/progress/progress-manager.ts — ProgressManager API]
- [Source: apps/cotulenh/web/src/stores/learn-store.ts — Zustand learn store]
- [Source: apps/cotulenh/web/src/components/learn/ — all learn components]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No blocking issues encountered during implementation.

### Completion Notes List

- **Task 1:** Added `stars` prop (0-3) to `LessonListItem` with mini inline star display (warning color for filled, muted for empty). Added `getLessonProgress()` to `useLearnStore`. Updated `SectionGroup` to read star data from store and pass to list items.
- **Task 2:** Added `getSubjectStarCount()` to `useLearnStore` (iterates subject lessons, sums earned vs max 3 per lesson). Added `earnedStars`/`totalStars` props to `SubjectCard` displaying "★ X/Y". Updated `LearnHubClient` and `SubjectGrid` to compute and pass star aggregates.
- **Task 3:** Replaced the attempted eager client-store hydration with explicit loading placeholders for lesson and subject progress. This avoids SSR/client hydration mismatches while preventing stale zero-progress UI from flashing before localStorage-backed state is ready.
- **Task 4:** Hardened `LocalStorageAdapter.remove()` with the same try/catch behavior used by `get()` and `set()`. Clearing or removing progress now fails closed when browser storage APIs are unavailable.
- **Task 5:** Added 22 tests covering star rendering (including valid zero-star completions), subject-card aggregates, pending hydration placeholders, integration flow (complete lesson → store → UI), empty localStorage, unavailable localStorage fallback, and navigation state consistency. Web app total: 225 tests passing (up from 203). Shared `@cotulenh/learn` package tests also pass.

### File List

Modified:
- apps/cotulenh/web/src/components/learn/lesson-list-item.tsx
- apps/cotulenh/web/src/components/learn/section-group.tsx
- apps/cotulenh/web/src/components/learn/subject-card.tsx
- apps/cotulenh/web/src/components/learn/subject-grid.tsx
- apps/cotulenh/web/src/components/learn/learn-hub-client.tsx
- apps/cotulenh/web/src/stores/learn-store.ts
- apps/cotulenh/web/src/components/learn/__tests__/lesson-list-item.test.tsx
- apps/cotulenh/web/src/components/learn/__tests__/subject-card.test.tsx
- apps/cotulenh/web/src/components/learn/__tests__/section-group.test.tsx
- apps/cotulenh/web/src/components/learn/__tests__/learn-hub-client.test.tsx
- packages/cotulenh/learn/src/progress/storage-adapter.ts
- packages/cotulenh/learn/src/progress/progress-manager.test.ts

Created:
- apps/cotulenh/web/src/components/learn/__tests__/progress-tracking.test.tsx

## Change Log

- 2026-03-14: Implemented lesson progress tracking — added star display to lesson list items and subject cards, verified hydration consistency and localStorage error resilience, added 18 new tests (221 total passing)
- 2026-03-14: Addressed code review findings — replaced eager client initialization with hydration placeholders to avoid SSR mismatches, rendered valid zero-star progress states, hardened `LocalStorageAdapter.remove()`, and expanded tests (225 web tests passing, 58 package tests passing)
