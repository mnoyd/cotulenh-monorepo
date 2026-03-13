# Story 2.1: Learn Hub & Lesson Navigation

Status: done

## Story

As a visitor (authenticated or not),
I want to browse a learn hub showing all available subjects and lessons,
So that I can choose what to learn about Co Tu Lenh at my own pace.

## Acceptance Criteria

1. **Given** a visitor navigates to `/learn` **When** the page loads **Then** a grid of lesson subjects is displayed sourced from `@cotulenh/learn` package `subjects` export, each showing title, description, and lesson count (all Vietnamese via `tSubjectTitle`, `tSubjectDescription` from `@cotulenh/learn` i18n)
2. **Given** `/learn` loads **Then** the page is SSR-rendered with `<title>` "Hoc Co Tu Lenh" and `<meta name="description">` for SEO; no login prompt or auth gate is shown
3. **Given** the page renders **Then** subjects display as a responsive grid: single column on mobile (<640px), multi-column on sm+ (>=640px)
4. **Given** a visitor clicks on a subject **When** the subject page at `/learn/[subject]` loads **Then** the individual lessons within that subject are listed in order by section, each showing lesson title and brief description
5. **Given** the learn hub is loading **Then** skeleton screens are shown for the subject grid (never spinners per architecture convention)
6. **Given** the visitor has previously completed lessons (localStorage via `ProgressManager`) **Then** completed lessons show a completion indicator and subjects show aggregated progress (e.g., "3/5 bai hoc")

## Tasks / Subtasks

- [x] Task 1: Create learn hub page (AC: #1, #2, #3, #5)
  - [x] 1.1 Replace placeholder at `src/app/(public)/learn/page.tsx` with SSR subject grid
  - [x] 1.2 Create `src/components/learn/subject-card.tsx` — displays subject title, description, lesson count, progress indicator
  - [x] 1.3 Create `src/components/learn/subject-grid.tsx` — responsive grid layout for subject cards
  - [x] 1.4 Create `src/components/learn/subject-grid-skeleton.tsx` — skeleton loading state matching card layout
  - [x] 1.5 Add SEO metadata export in learn page (title, description in Vietnamese)
- [x] Task 2: Create subject detail page with lesson listing (AC: #4)
  - [x] 2.1 Create `src/app/(public)/learn/[subject]/page.tsx` — lists lessons grouped by section
  - [x] 2.2 Create `src/components/learn/lesson-list-item.tsx` — lesson title, description, completion state
  - [x] 2.3 Create `src/components/learn/section-group.tsx` — section header + ordered lesson list
  - [x] 2.4 Add skeleton loading state for subject detail page
  - [x] 2.5 Handle invalid subject slug with not-found
- [x] Task 3: Progress display integration (AC: #6)
  - [x] 3.1 Create `src/stores/learn-store.ts` — Zustand store wrapping `ProgressManager` with `LocalStorageAdapter`
  - [x] 3.2 Create `src/hooks/use-learn-progress.ts` — hook to read progress from store for SSR-safe hydration
  - [x] 3.3 Wire progress indicators into subject-card and lesson-list-item components
  - [x] 3.4 Show "Tiep tuc hoc" (Continue Learning) banner on learn hub when user has in-progress lessons
- [x] Task 4: Tests (AC: all)
  - [x] 4.1 Unit tests for subject-card, subject-grid, lesson-list-item components
  - [x] 4.2 Unit test for learn-store (progress read/write, localStorage sync)
  - [x] 4.3 Unit test for subject detail page (lesson ordering, section grouping)

## Dev Notes

### Architecture Constraints

- **SSR required** for `/learn` and `/learn/[subject]` — these are public acquisition pages, must be crawlable. Content comes from `@cotulenh/learn` package which is pure TS (no DB calls needed for lesson metadata).
- **No auth gate** — `/learn/*` routes are explicitly public in middleware (`src/middleware.ts` already allows `/learn/*`).
- **Vietnamese only** — all UI text in Vietnamese. Use `@cotulenh/learn` i18n functions: `tSubjectTitle(subject)`, `tSubjectDescription(subject)`, `tSectionTitle(section)`, `tLessonTitle(lesson)`, `tLessonDescription(lesson)`. Call `setLearnLocale('vi')` before rendering.
- **Dynamic import** — `@cotulenh/core` + `@cotulenh/board` must NOT be imported on learn hub/subject pages (only needed on lesson view page in Story 2.2). The `@cotulenh/learn` metadata exports (subjects, i18n) are lightweight and can be imported directly.
- **Loading states** — use skeleton screens, never spinners (architecture mandate). Use `loading.tsx` convention in route directories.
- **0px border radius, no shadows, no gradients** — borders for elevation per design system.

### Data Model from @cotulenh/learn

```typescript
// Key types from @cotulenh/learn
interface Subject {
  id: SubjectId;      // e.g., "basic-movement", "terrain"
  sections: Section[];
}

interface Section {
  id: SectionId;
  lessons: Lesson[];
}

interface Lesson {
  id: string;         // unique across all subjects
  // ... game-specific fields (fen, goalFen, scenario, etc.)
}

// Available subjects (9 total):
// basic-movement, terrain, capture, blocking, air-defense,
// combine-piece, deploy-move, heroic-rule, flying-general

// Key exports for this story:
import { subjects, getSubjectById } from '@cotulenh/learn';
import { tSubjectTitle, tSubjectDescription, tSectionTitle,
         tLessonTitle, tLessonDescription, setLearnLocale } from '@cotulenh/learn';

// Progress management:
import { createProgressManager, LocalStorageAdapter } from '@cotulenh/learn';
```

### Zustand Store Pattern

Follow the established store pattern from architecture:
```typescript
// src/stores/learn-store.ts
// Store name: useLearnStore
// Responsibility: Lesson state, progress, localStorage sync
// Realtime source: None (local)
// Pattern: state at top, actions in middle
// Naming: camelCase verbs for actions (e.g., markLessonComplete, getSubjectProgress)
```

Use `ProgressManager` from `@cotulenh/learn` with `LocalStorageAdapter` — do NOT reimplement localStorage logic. The package already handles serialization/deserialization.

### Component Patterns (from Epic 1)

- **File naming**: kebab-case `.tsx` (e.g., `subject-card.tsx`)
- **Component naming**: PascalCase (e.g., `SubjectCard`)
- **Exports**: Named exports preferred
- **Props**: Type defined inline or as `type ComponentNameProps = {...}`
- **Styling**: Tailwind utility classes with CSS variable design tokens (`var(--space-4)`, `var(--text-lg)`, `var(--color-primary)`)
- **Class merging**: Use `cn()` from `@/lib/utils/cn` (clsx + tailwind-merge)
- **Tests**: Co-located in `__tests__/` directory next to components
- **No barrel exports** — direct imports only

### Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Default | < 640px | Single column, full-width cards |
| `sm` | >= 640px | 2-column grid |
| `lg` | >= 1024px | 3-column grid |

### UX Design Requirements

- **Learn hub**: Grid of 9 progressive subjects. "Tiep tuc hoc" (Continue Learning) banner at top when user has progress: shows current lesson, progress bar, "Tiep tuc" button.
- **Subject cards**: Title, description, lesson count, progress indicator.
- **Light mode default** for learn pages (content-heavy screen).
- **Mobile**: Single column stacked cards.
- **Minimal nav** already handled by `(public)/layout.tsx` with `LandingNav` (logo, learn link, sign-in).

### Route Structure

```
src/app/(public)/learn/
  page.tsx              # Learn hub (REPLACE existing placeholder)
  loading.tsx           # Skeleton for learn hub
  [subject]/
    page.tsx            # Subject detail with lesson listing
    loading.tsx         # Skeleton for subject detail
    [id]/               # Lesson view (Story 2.2 — DO NOT implement)
```

### What NOT To Do

- Do NOT implement the interactive lesson view (`/learn/[subject]/[id]`) — that is Story 2.2
- Do NOT implement the `useBoard` hook or board integration — Story 2.2
- Do NOT import `@cotulenh/core` or `@cotulenh/board` on these pages
- Do NOT create REST API routes — lesson data comes from package imports
- Do NOT add i18n infrastructure beyond what `@cotulenh/learn` provides
- Do NOT create a `learn_progress` database table or server actions — Story 2.4 handles DB migration
- Do NOT add authentication checks to learn pages
- Do NOT use spinners — only skeleton screens
- Do NOT add English text — Vietnamese only

### Project Structure Notes

- Learn pages go in `src/app/(public)/learn/` — already exists with placeholder
- Learn components go in `src/components/learn/` — new directory
- Learn store goes in `src/stores/learn-store.ts` — new file
- Learn hook goes in `src/hooks/use-learn-progress.ts` — new file
- Follows existing pattern: `src/components/auth/`, `src/components/dashboard/`, `src/components/layout/`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Route Structure, Learn System, Zustand Stores, Component Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Learn Hub, Responsive Behavior, Design System]
- [Source: packages/cotulenh/learn/src/index.ts — public API exports]
- [Source: packages/cotulenh/learn/src/lessons/index.ts — subjects array, lookup functions]
- [Source: packages/cotulenh/learn/src/i18n/ — translation functions]
- [Source: packages/cotulenh/learn/src/progress/ — ProgressManager, LocalStorageAdapter]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Fixed missing `@cotulenh/learn` dependency in web app package.json — caused learn-store test to fail with unresolved import
- Added subject detail page test (Task 4.3) — covers lesson ordering across sections, section grouping, notFound handling

### Completion Notes List
- All 4 tasks complete: learn hub page, subject detail page, progress integration, tests
- Fixed `@cotulenh/learn` not declared as dependency in `apps/cotulenh/web/package.json`
- Added subject detail page test covering lesson ordering, section grouping, and invalid subject handling
- 34 test files, 157 tests all passing with zero regressions
- Fixed review findings: subject detail now hydrates completion indicators from local progress, continue-learning jumps to the next lesson anchor, and progress helpers/store expose real completion counts
- Expanded learn coverage for persisted progress and continue-learning navigation; web app test suite now passes with 34 files and 157 tests

### Change Log
- 2026-03-13: Added `@cotulenh/learn` dependency to web app, created subject detail page tests, marked all tasks complete
- 2026-03-13: Addressed code review fixes for progress hydration, continue-learning targeting, and localStorage-backed learn-store coverage

### File List
- apps/cotulenh/web/package.json (modified — added @cotulenh/learn dependency)
- apps/cotulenh/web/src/app/(public)/learn/page.tsx (existing — SSR learn hub)
- apps/cotulenh/web/src/app/(public)/learn/loading.tsx (new — skeleton loading)
- apps/cotulenh/web/src/app/(public)/learn/[subject]/page.tsx (new — subject detail)
- apps/cotulenh/web/src/app/(public)/learn/[subject]/loading.tsx (new — subject skeleton)
- apps/cotulenh/web/src/app/(public)/learn/[subject]/__tests__/subject-page.test.tsx (new — subject page tests)
- apps/cotulenh/web/src/components/learn/learn-hub-client.tsx (new — client hub with progress)
- apps/cotulenh/web/src/components/learn/subject-card.tsx (new — subject card component)
- apps/cotulenh/web/src/components/learn/subject-grid.tsx (new — responsive grid)
- apps/cotulenh/web/src/components/learn/subject-grid-skeleton.tsx (new — skeleton)
- apps/cotulenh/web/src/components/learn/section-group.tsx (new — section grouping)
- apps/cotulenh/web/src/components/learn/lesson-list-item.tsx (new — lesson display)
- apps/cotulenh/web/src/components/learn/__tests__/subject-card.test.tsx (new — tests)
- apps/cotulenh/web/src/components/learn/__tests__/subject-grid.test.tsx (new — tests)
- apps/cotulenh/web/src/components/learn/__tests__/subject-grid-skeleton.test.tsx (new — tests)
- apps/cotulenh/web/src/components/learn/__tests__/lesson-list-item.test.tsx (new — tests)
- apps/cotulenh/web/src/components/learn/__tests__/section-group.test.tsx (new — tests)
- apps/cotulenh/web/src/components/learn/__tests__/learn-hub-client.test.tsx (new — tests for continue-learning banner and aggregated progress)
- apps/cotulenh/web/src/stores/learn-store.ts (new — Zustand progress store)
- apps/cotulenh/web/src/stores/__tests__/learn-store.test.ts (new — store tests)
- apps/cotulenh/web/src/hooks/use-learn-progress.ts (new — progress hook)

### Senior Developer Review (AI)
- 2026-03-13 — Fixed previously identified HIGH and MEDIUM findings:
- Subject detail completion indicators now hydrate from `ProgressManager` via the learn store, satisfying AC6 on `/learn/[subject]`.
- Continue-learning now targets the next incomplete lesson anchor instead of dropping users at the subject top.
- Learn-store now exposes write-backed progress actions and accurate completion counts, with localStorage persistence covered by tests.
- Verification: `pnpm --filter @cotulenh/web run test`, `pnpm --filter @cotulenh/web run check-types`, and `pnpm --filter @cotulenh/web run lint`.
