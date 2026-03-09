# Story 7.1: Learn Progress Database Sync

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want my learn progress to save to my account and sync across devices,
so that I don't lose progress when switching browsers or devices.

## Acceptance Criteria (BDD)

1. **Given** an authenticated user completes a lesson
   **When** progress is saved
   **Then** it is written to both `learn_progress` table and localStorage (FR38)

2. **Given** an authenticated user opens the app on a different device
   **When** the learn system loads
   **Then** their progress is fetched from Supabase and applied (FR39)

3. **Given** an unauthenticated user completes a lesson
   **When** progress is saved
   **Then** it is written to localStorage only — existing behavior unchanged (FR41)

4. **Given** a duplicate progress write (same user, same lesson)
   **When** the upsert executes
   **Then** the existing row is updated, not duplicated (NFR16 — idempotent)

5. **Given** star ratings, lesson completion, and subject unlock state
   **When** persisted
   **Then** all are correctly saved and restored (FR42)

6. **Given** an authenticated user has progress in both localStorage and Supabase (e.g., different devices)
   **When** the learn system initializes
   **Then** the higher star rating per lesson is kept (merge, don't overwrite)

7. **Given** a Supabase sync write fails
   **When** the user continues learning
   **Then** localStorage data is preserved and the app continues working without error

## Tasks / Subtasks

### Database: Create learn_progress table

- [x] Task 1: Create `supabase/migrations/009_learn_progress.sql` (AC: 1, 4, 5)
  - [x] 1.1 Create table with composite primary key:
    ```sql
    CREATE TABLE public.learn_progress (
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      lesson_id text NOT NULL,
      stars smallint NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
      move_count integer NOT NULL DEFAULT 0,
      completed_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      PRIMARY KEY (user_id, lesson_id)
    );
    ```
  - [x] 1.2 Enable RLS with owner-only read/write policies:
    ```sql
    ALTER TABLE public.learn_progress ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can read own learn progress"
      ON public.learn_progress FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own learn progress"
      ON public.learn_progress FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own learn progress"
      ON public.learn_progress FOR UPDATE
      USING (auth.uid() = user_id);
    ```
  - [x] 1.3 Create index on user_id for efficient lookups:
    ```sql
    CREATE INDEX idx_learn_progress_user_id ON public.learn_progress (user_id);
    ```
  - [x] 1.4 Add auto-update trigger for `updated_at` (matches project pattern from `001_profiles.sql`):
    ```sql
    CREATE OR REPLACE FUNCTION public.handle_learn_progress_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER on_learn_progress_updated
      BEFORE UPDATE ON public.learn_progress
      FOR EACH ROW EXECUTE FUNCTION public.handle_learn_progress_updated_at();
    ```
  - [x] 1.5 Note: `completed_at` captures first completion time and is intentionally not updated on subsequent upserts. `updated_at` tracks the latest sync/update.
  - [x] 1.6 Note: No `subject_id`/`section_id` columns — the architecture mentioned these but they're unnecessary. The `lesson_id` uniquely identifies the lesson, and subject/section membership is derived from the `@cotulenh/learn` package metadata. Keeping the table flat aligns with the existing `Record<string, LessonProgress>` storage format.

### Sync Layer: Create learn-progress-sync

- [x] Task 2: Create `apps/cotulenh/app/src/lib/learn/learn-progress-sync.svelte.ts` (AC: 1, 2, 3, 6, 7)
  - [x] 2.1 Create a `LearnProgressSync` class that coordinates between localStorage and Supabase:
    ```typescript
    import type { SupabaseClient } from '@supabase/supabase-js';
    import type { LessonProgress } from '@cotulenh/learn';
    import { subjectProgress } from './learn-progress.svelte';
    import { logger } from '@cotulenh/common';
    ```
  - [x] 2.2 Implement `startSync(supabase: SupabaseClient, userId: string)`:
    - Fetch ALL rows from `learn_progress` where `user_id = userId`
    - Convert DB rows to `LessonProgress` objects: **set `completed: true` for every row** (only completed lessons have rows in DB), map `move_count` → `moveCount`, `lesson_id` → `lessonId`
    - Get current localStorage progress via `subjectProgress.getAllProgress()`
    - Merge: for each lesson, keep the higher star rating
    - DB-only lessons: call `subjectProgress.saveLessonProgress()` — the `!existing` branch in ProgressManager handles new inserts
    - localStorage-only lessons: batch upsert to Supabase (use `.upsert()` with an array of rows for a single network call instead of one-by-one)
    - Both stores: compare stars, write the winner to the losing store
    - Store the supabase client reference and userId for ongoing sync
    - Use idempotency guard: track `currentSyncUserId` to prevent duplicate init:
      ```typescript
      let currentSyncUserId: string | null = null;

      export function startLearnProgressSync(supabase: SupabaseClient, userId: string) {
        if (currentSyncUserId === userId) return; // Already syncing for this user
        if (currentSyncUserId) stopLearnProgressSync(); // Different user — stop previous
        currentSyncUserId = userId;
        // ... fetch, merge, wire up ongoing sync
      }
      ```
  - [x] 2.3 Implement ongoing sync via `subjectProgress` onChange:
    - The `SubjectProgressManager` exposes the underlying `ProgressManager.setOnChange` callback
    - **IMPORTANT**: `SubjectProgressManager` currently uses `setOnChange` internally for `#version` tracking. We need a different approach:
      - Option A: Add a second callback mechanism to `SubjectProgressManager` (e.g., `onProgressSaved`)
      - Option B: Use `$effect` to watch `subjectProgress.getAllProgress()` for changes
      - Option C: Wrap `saveLessonProgress` to also trigger Supabase write
    - **Recommended: Option C** — Override/wrap `saveLessonProgress` in the sync layer to also write to Supabase when authenticated. This is the simplest approach that doesn't modify `@cotulenh/learn`.
  - [x] 2.4 Implement `stopSync()`:
    - Restore original `saveLessonProgress` method on the singleton:
      ```typescript
      export function stopLearnProgressSync() {
        if (originalSave) {
          subjectProgress.saveLessonProgress = originalSave;
          originalSave = null;
        }
        currentSyncUserId = null;
      }
      ```
    - This prevents holding a stale Supabase client reference after logout
  - [x] 2.5 Implement Supabase write helper:
    ```typescript
    async function upsertProgress(
      supabase: SupabaseClient,
      userId: string,
      lessonId: string,
      stars: number,
      moveCount: number
    ): Promise<void> {
      const { error } = await supabase
        .from('learn_progress')
        .upsert(
          { user_id: userId, lesson_id: lessonId, stars, move_count: moveCount },
          { onConflict: 'user_id,lesson_id' }
        );
      if (error) {
        logger.error(error, `Failed to sync learn progress for lesson ${lessonId}`);
        // Non-fatal: localStorage has the data, will retry on next save
      }
    }
    ```
  - [x] 2.6 Error handling: All Supabase operations must be wrapped in try/catch. Failures log but never throw. localStorage is always the source of truth for the current session.

### Integration: Wire sync into app lifecycle

- [x] Task 3: Initialize sync from root layout (AC: 1, 2, 3)
  - [x] 3.1 Modify `apps/cotulenh/app/src/routes/+layout.svelte`:
    - Import the sync module
    - In the existing `$effect` that handles auth state, call `startSync` when authenticated and `stopSync` when not:
      ```typescript
      // In the existing auth state effect block:
      if (browser && isAuthenticated) {
        const user = $page.data.user;
        if (user) {
          // Existing lobby/invitation code...
          startLearnProgressSync($page.data.supabase, user.id);
        }
      } else if (browser && !isAuthenticated) {
        // Existing cleanup code...
        stopLearnProgressSync();
      }
      ```
    - **IMPORTANT**: The sync initialization is async (fetches from Supabase). Fire-and-forget — don't await in the `$effect`. The learn system works immediately from localStorage; Supabase merge happens in the background.
  - [x] 3.2 The `currentSyncUserId` guard in the sync module (Task 2.2) handles duplicate effect runs. No additional guard needed in `+layout.svelte`.

### Tests

- [x] Task 4: Write tests (AC: 1-7)
  - [x] 4.1 Create `apps/cotulenh/app/src/lib/learn/learn-progress-sync.test.ts`:
    - Test: merge logic — localStorage wins when stars are higher
    - Test: merge logic — Supabase wins when stars are higher
    - Test: merge logic — equal stars are not re-written
    - Test: upsert uses correct ON CONFLICT clause
    - Test: Supabase fetch failure doesn't crash (logs error, continues with localStorage)
    - Test: Supabase write failure doesn't crash (logs error, localStorage preserved)
    - Test: stopSync prevents future Supabase writes
    - Test: startSync is idempotent (calling twice doesn't double-fetch)
    - Test: unauthenticated path — no Supabase calls made
  - [x] 4.2 Mock pattern: Mock the browser Supabase client with chained `.from().select().eq()` returning promises. Note: the server-side test mocks (e.g., `page.server.test.ts` files) mock `locals.supabase` — the sync layer uses the browser client directly, so mock it as a plain object with the chained query builder pattern.
  - [x] 4.3 Mock the `subjectProgress` singleton — test that `saveLessonProgress` triggers both localStorage and Supabase writes when synced.

## Dev Notes

### Architecture: Sync-on-top pattern (NOT storage adapter replacement)

The existing learn system has a clean layered architecture:
```
SubjectProgressManager (Svelte 5 reactive wrapper)
  └── ProgressManager (framework-agnostic, @cotulenh/learn)
        └── StorageAdapter (pluggable: localStorage via SvelteStorageAdapter)
```

**DO NOT replace the StorageAdapter or modify `@cotulenh/learn` package.** Instead, add a sync layer that sits alongside the existing system:
```
+layout.svelte (lifecycle)
  └── LearnProgressSync (NEW — coordinates Supabase writes)
        ├── subjectProgress singleton (existing — reads/writes localStorage)
        └── Supabase client (browser client from $page.data.supabase)
```

This approach:
- Zero changes to `@cotulenh/learn` package
- Zero changes to existing `learn-progress.svelte.ts`
- localStorage continues as the immediate source of truth
- Supabase sync is additive and failure-tolerant

### Critical: The onChange callback is already taken

`ProgressManager.setOnChange()` is used by `SubjectProgressManager` for Svelte reactivity (`#version++`). Calling it again would overwrite the reactivity mechanism.

**Solution**: Wrap `saveLessonProgress` on the `SubjectProgressManager` singleton. When sync is active, intercept saves to also write to Supabase:

```typescript
// Conceptual approach — wrap the save method
const originalSave = subjectProgress.saveLessonProgress.bind(subjectProgress);

subjectProgress.saveLessonProgress = (lessonId, stars, moveCount) => {
  originalSave(lessonId, stars, moveCount);
  if (syncActive) {
    upsertProgress(supabase, userId, lessonId, stars, moveCount);
  }
};
```

Alternatively, use `$effect` watching a derived value from `getAllProgress()` to detect changes — but this is less precise (fires on any read, not just writes). The wrapping approach is more targeted.

### Merge strategy on sync init

When `startSync` runs:
1. Fetch DB rows → convert to `Record<string, LessonProgress>`
2. Get localStorage → `subjectProgress.getAllProgress()`
3. For each lesson in the union of both:
   - If only in localStorage → upsert to DB
   - If only in DB → save to localStorage via `subjectProgress.saveLessonProgress()`
   - If in both → keep higher stars. Write the winner to the other store.
4. This ensures both stores converge to the same state.

The `saveLessonProgress` method in `ProgressManager` already has "only update if better" logic:
```typescript
if (!existing || stars > existing.stars) { ... }
```
So calling `subjectProgress.saveLessonProgress()` with DB values will naturally only update localStorage when DB has better stars.

### What Already Exists — DO NOT Recreate

| Feature | Location | Status |
|---------|----------|--------|
| `SubjectProgressManager` singleton | `$lib/learn/learn-progress.svelte.ts` | Complete — reactive wrapper with `saveLessonProgress`, `getAllProgress`, etc. |
| `ProgressManager` | `@cotulenh/learn` package | Complete — framework-agnostic, pluggable storage |
| `SvelteStorageAdapter` | `$lib/learn/learn-progress.svelte.ts` | Complete — bridges localStorage with ProgressManager |
| `persisted.svelte.ts` | `$lib/stores/persisted.svelte.ts` | Complete — `getStoredValue`, `setStoredValue` for localStorage |
| Supabase browser client | `$page.data.supabase` from `+layout.ts` | Complete — `createBrowserClient` from `@supabase/ssr` |
| Auth state detection | `$page.data.user` from `+layout.server.ts` | Complete — user object available in all pages |
| Auth state change listener | `+layout.svelte` `onMount` | Complete — `supabase.auth.onAuthStateChange` with `invalidate('supabase:auth')` |
| Migration pattern | `supabase/migrations/001_profiles.sql` through `008_*` | Complete — RLS, indexes, triggers |
| Logger | `@cotulenh/common` | Complete — `logger.error()`, `logger.warn()` |

### Architecture Constraints

- **Svelte 5 runes only** — `$state`, `$derived`, `$effect`. Never Svelte 4 stores.
- **`$lib/` import alias** — never relative `../../../` paths.
- **Co-located tests** as `filename.test.ts`.
- **Use existing `logger`** from `@cotulenh/common` — never raw `console.log`.
- **Check Supabase `{ data, error }` returns** — never assume success.
- **DB → TypeScript boundary**: `snake_case` from DB → `camelCase` in TypeScript.
- **No new packages/dependencies** — everything needed is already installed.

### Supabase Access Pattern in Browser

The browser Supabase client is accessed via `$page.data.supabase` (from `+layout.ts`). It is NOT available as a global singleton — it must be passed explicitly to any module that needs it.

```typescript
// In +layout.svelte:
import { page } from '$app/stores';
// $page.data.supabase is the browser client
// $page.data.user is the auth user (or null)
```

The sync module must receive the Supabase client as a parameter, not import it directly.

### Migration numbering

Existing migrations: `001` through `008`. The new migration should be `009_learn_progress.sql`.

### Table design rationale

The architecture document specified columns: `user_id, subject_id, section_id, lesson_id, stars`. This story simplifies to `user_id, lesson_id, stars, move_count` because:
- `subject_id` and `section_id` are derivable from lesson metadata (`getSubjectById()`)
- The localStorage format is `Record<lessonId, LessonProgress>` — flat, not hierarchical
- Adding unnecessary columns complicates upsert logic without query benefits
- All progress queries are per-user (fetch all, merge client-side)

### localStorage key

The learn system stores all progress under a single localStorage key: `'learn-progress'` (defined in `ProgressManager` as `STORAGE_KEY`). The value is `Record<string, LessonProgress>` serialized as JSON.

### LessonProgress data shape

```typescript
interface LessonProgress {
  lessonId: string;      // e.g., "basics-1"
  completed: boolean;    // always true when saved
  moveCount: number;     // moves used to complete
  stars: 0 | 1 | 2 | 3; // star rating
}
```

### Settings sync pattern reference

The app already has a pattern for syncing localStorage data with Supabase on auth — see `+layout.svelte` lines 74-85 where `settings_json` from the profile is applied to localStorage on login. The learn progress sync follows a similar pattern but bidirectional (merge both directions).

### UX requirements

From the UX specification:
- **Invisible infrastructure** — no "syncing" UI, no progress bars, no loading states for sync
- **If migration fails silently, local progress is preserved and retry happens on next page load**
- **Progress migration is invisible — user sees their stars intact. No "importing progress" state.**

### Story 7.2 overlap note

`startSync` naturally handles the signup migration case (Story 7.2) because a newly registered user will have empty DB and full localStorage. The merge will upsert all localStorage data to Supabase. Story 7.2 may only need to handle the edge case of "higher star merge" when the user already has some DB progress and different localStorage progress — which `startSync` already handles. Story 7.2 scope will be determined when it is created.

### Upsert idempotency note

The wrapped `saveLessonProgress` calls `upsertProgress` on every save, even when ProgressManager's internal guard (`stars > existing.stars`) rejects the localStorage write. This is harmless — the DB upsert is idempotent and the extra calls are negligible. Optimizing to skip the DB call when stars didn't improve is optional.

### What NOT To Do

- Do NOT modify `@cotulenh/learn` package — the sync is entirely in `cotulenh-app`
- Do NOT modify `learn-progress.svelte.ts` — the sync wraps the existing singleton
- Do NOT create a custom admin UI for viewing progress — this is a data sync story
- Do NOT add loading states or sync indicators — invisible infrastructure principle
- Do NOT use Supabase Realtime for learn progress — simple fetch-on-init + write-on-save
- Do NOT add i18n strings — this story has no user-facing UI changes
- Do NOT handle the signup migration case — that's Story 7.2
- Do NOT overwrite higher stars with lower stars during merge — always keep best

### Project Structure Notes

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/009_learn_progress.sql` | CREATE | learn_progress table + RLS + index |
| `apps/cotulenh/app/src/lib/learn/learn-progress-sync.svelte.ts` | CREATE | Supabase sync layer for learn progress |
| `apps/cotulenh/app/src/lib/learn/learn-progress-sync.test.ts` | CREATE | Tests for merge logic and sync behavior |
| `apps/cotulenh/app/src/routes/+layout.svelte` | MODIFY | Initialize/stop sync on auth state change |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 7 overview and Story 7.1 details]
- [Source: _bmad-output/planning-artifacts/architecture.md — learn_progress table definition, RLS policies, reliability patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md — Route access boundaries showing /learn/* as public with localStorage fallback]
- [Source: _bmad-output/planning-artifacts/architecture.md — File structure: learn-progress.svelte.ts, persisted.svelte.ts, supabase/ client]
- [Source: _bmad-output/planning-artifacts/prd.md — FR38-FR42 Learn Progress Persistence requirements]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR16 Idempotent learn progress writes]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 2: Linh learn-to-play pipeline, invisible progress migration]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Experience principle: invisible infrastructure]
- [Source: apps/cotulenh/app/src/lib/learn/learn-progress.svelte.ts — SubjectProgressManager singleton]
- [Source: packages/cotulenh/learn/src/progress/progress-manager.ts — ProgressManager with StorageAdapter]
- [Source: packages/cotulenh/learn/src/progress/storage-adapter.ts — StorageAdapter interface]
- [Source: apps/cotulenh/app/src/lib/stores/persisted.svelte.ts — localStorage persistence utilities]
- [Source: apps/cotulenh/app/src/routes/+layout.ts — Browser Supabase client creation]
- [Source: apps/cotulenh/app/src/routes/+layout.svelte — Auth state effects, settings sync pattern]
- [Source: apps/cotulenh/app/src/routes/+layout.server.ts — Server-side auth session and profile loading]
- [Source: apps/cotulenh/app/src/hooks.server.ts — Supabase server client and safeGetSession]
- [Source: supabase/migrations/001_profiles.sql — Migration pattern reference (RLS, indexes, triggers)]
- [Source: _bmad-output/implementation-artifacts/6-2-game-replay-viewer.md — Recent story patterns and conventions]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- No debug issues encountered during implementation.

### Completion Notes List

- Created `009_learn_progress.sql` migration with composite PK, RLS policies, index, and updated_at trigger matching project conventions.
- Implemented `learn-progress-sync.svelte.ts` using the sync-on-top pattern — wraps `saveLessonProgress` for ongoing Supabase writes, performs bidirectional merge on init (higher stars wins), batch upserts localStorage-only progress.
- Wired sync into `+layout.svelte` auth state effect — `startLearnProgressSync` on login, `stopLearnProgressSync` on logout. Fire-and-forget async, no UI changes.
- Fixed review findings: prevented remote star downgrades on rejected local writes and added session guards to ignore stale sync work after auth/user switches.
- All 12 sync tests pass covering: merge logic (3 tests), upsert ON CONFLICT correctness, error handling (fetch + write failures), stopSync preventing Supabase writes, startSync idempotency, unauthenticated path, ongoing sync behavior, no-downgrade regression, and stale-session isolation.
- No regressions introduced (pre-existing clock.test.ts failures confirmed unrelated).
- Zero changes to `@cotulenh/learn` package or `learn-progress.svelte.ts` as required.

### Senior Developer Review (AI)

- Reviewer: Codex (GPT-5)
- Date: 2026-03-04
- Outcome: Changes Requested → Fixed
- High issues fixed:
  - Remote downgrade risk fixed by only syncing Supabase when a local write is actually accepted by progress rules.
  - Cross-account stale sync race fixed via sync session invalidation and active-session checks.
- Medium issues fixed:
  - Tests now model the core "higher stars only" behavior and include explicit regression coverage for no-downgrade + stale-session cases.
  - Story file list updated to reflect review-updated artifacts.
- Validation:
  - `pnpm --filter @cotulenh/app test -- learn-progress-sync.test.ts` (12/12 passing)

### Change Log

- 2026-03-04: Implemented story 7.1 — learn_progress table, sync layer, lifecycle integration, and tests.
- 2026-03-04: Senior AI code review fixes — sync race/downgrade hardening, additional regression tests, status moved to done.

### File List

- `supabase/migrations/009_learn_progress.sql` (CREATE)
- `apps/cotulenh/app/src/lib/learn/learn-progress-sync.svelte.ts` (CREATE)
- `apps/cotulenh/app/src/lib/learn/learn-progress-sync.test.ts` (CREATE)
- `apps/cotulenh/app/src/routes/+layout.svelte` (MODIFY)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFY)
- `_bmad-output/implementation-artifacts/7-1-learn-progress-database-sync.md` (MODIFY)
