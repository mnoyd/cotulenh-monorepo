# Story 7.2: Learn Progress Migration on Signup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor who has been learning without an account,
I want my existing learn progress to migrate to my account when I sign up,
so that I don't lose the progress I've already made.

## Acceptance Criteria (BDD)

1. **Given** a visitor has learn progress in localStorage and then creates an account
   **When** registration completes and they are authenticated (email verified, session created)
   **Then** all localStorage learn progress is synced to the `learn_progress` table (FR40)

2. **Given** the migration encounters progress that already exists in the database (edge case — e.g., account recreated or DB seeded)
   **When** the upsert runs
   **Then** the higher star rating is kept (merge, don't overwrite)

3. **Given** the migration completes
   **When** the user continues learning
   **Then** new progress writes go to both Supabase and localStorage seamlessly

4. **Given** the initial migration fails (network error, Supabase outage)
   **When** the user navigates to any page later
   **Then** the migration retries automatically (localStorage preserved, retry on next page navigation/auth re-check)

5. **Given** a visitor with no learn progress signs up
   **When** registration completes
   **Then** the sync initializes cleanly with no errors (empty localStorage → no-op migration)

## Tasks / Subtasks

### Task 1: Add dedicated signup migration tests (AC: 1, 2, 5)

- [x] 1.1 Add test in `apps/cotulenh/app/src/lib/learn/learn-progress-sync.test.ts` — new `describe('signup migration')` block:
  - Test: "migrates all localStorage progress to empty DB on signup" — set up multiple lessons in localStorage (3+), mock empty DB response, verify batch upsert is called with ALL localStorage entries
  - Test: "handles empty localStorage on signup (no-op)" — empty localStorage, empty DB, verify no upsert calls
  - Test: "merges with existing DB progress on signup edge case" — localStorage has lessons A(3★), B(1★), DB has B(2★), C(2★) → verify: A upserted to DB, B kept at 2★ in DB (no upsert), C saved to localStorage
- [x] 1.2 Verify existing tests still pass after additions

### Task 2: Add migration retry test (AC: 4)

- [x] 2.1 Add test: "retries migration on next startSync call after failure" — first `startLearnProgressSync` call fails (mock fetch error), call `stopLearnProgressSync()`, then `startLearnProgressSync` again with working mock → verify migration succeeds on retry
- [x] 2.2 This verifies the "retry on next page load/navigation" UX requirement — `+layout.svelte` now re-triggers `startLearnProgressSync` after route navigation and `startLearnProgressSync` retries failed initial migration for the same authenticated user

### Task 3: Add migration logging for observability (AC: 1)

- [x] 3.1 In `learn-progress-sync.svelte.ts`, add an info-level log at the end of `performInitialSync` when migration upserts complete:
  ```typescript
  if (toUpsert.length > 0) {
    logger.info(`Learn progress: migrated ${toUpsert.length} lesson(s) to database`);
  }
  ```
  This provides visibility into signup migrations without any UI changes. Use `logger.info` from `@cotulenh/common`.
- [x] 3.2 Update the test for batch upsert to also verify the log call

### Task 4: Verify end-to-end signup flow manually (AC: 1, 3)

- [ ] 4.1 Manual verification checklist (dev should confirm in completion notes):
  - [ ] Start the app locally, complete 2-3 learn lessons as anonymous user
  - [ ] Sign up with a new account
  - [ ] After email verification, check that learn progress appears in Supabase `learn_progress` table
  - [ ] Complete another lesson — verify it appears in both localStorage AND `learn_progress` table
  - [ ] Open an incognito window, log in with same account — verify progress is present
  - [ ] Note: If email verification is disabled in local Supabase config, the flow should still work via `onAuthStateChange` → `invalidate('supabase:auth')` → effect re-runs

## Dev Notes

### What Already Exists — Story 7.1 Built the Core Mechanism

**CRITICAL: The signup migration mechanism is ALREADY IMPLEMENTED.** Story 7.1 created `startLearnProgressSync` which handles the signup case naturally:

1. New user signs up → email verification → session created → redirect
2. `+layout.svelte` `$effect` detects `isAuthenticated` → calls `startLearnProgressSync($page.data.supabase, user.id)`
3. `performInitialSync` fetches DB (empty for new user) → gets localStorage (has progress) → batch upserts ALL localStorage entries to DB
4. Ongoing sync wraps `saveLessonProgress` to write to both stores

**This story is primarily about VERIFICATION AND TESTING of the signup-specific path**, NOT about building new infrastructure.

### Registration Flow (for context)

```
User fills registration form
  → +page.server.ts: supabase.auth.signUp()
  → User sees "verify email" screen (still on /auth/register)
  → User clicks email verification link
  → /auth/callback: supabase.auth.verifyOtp() → session created → redirect to /
  → +layout.server.ts: safeGetSession() loads user
  → +layout.svelte $effect fires (isAuthenticated becomes true)
  → startLearnProgressSync() called
  → performInitialSync() runs (fire-and-forget)
  → localStorage entries batch upserted to empty DB
  → Migration complete — invisible to user
```

### What Already Exists — DO NOT Recreate

| Feature | Location | Status |
|---------|----------|--------|
| `startLearnProgressSync` | `$lib/learn/learn-progress-sync.svelte.ts` | Complete — bidirectional merge, batch upsert |
| `stopLearnProgressSync` | `$lib/learn/learn-progress-sync.svelte.ts` | Complete — restores original save, clears state |
| `performInitialSync` | `$lib/learn/learn-progress-sync.svelte.ts` | Complete — fetches DB, merges, upserts |
| Auth state `$effect` + `afterNavigate` retry trigger | `+layout.svelte` | Complete — calls start/stop sync on auth change and retries failed initial migration on later navigation |
| `onAuthStateChange` listener | `+layout.svelte` line 161 | Complete — invalidates auth on session change |
| `learn_progress` table + RLS | `supabase/migrations/009_learn_progress.sql` | Complete — composite PK, owner-only policies |
| 12 existing sync tests | `$lib/learn/learn-progress-sync.test.ts` | Complete — merge, error, idempotency, session isolation |
| Registration form + server action | `routes/auth/register/+page.svelte` + `+page.server.ts` | Complete — signUp with email verification |
| Auth callback (email verify) | `routes/auth/callback/+server.ts` | Complete — verifyOtp → redirect |

### Existing Test Coverage vs New Tests Needed

**Already covered by Story 7.1 tests:**
- Merge logic: localStorage wins, Supabase wins, equal stars not rewritten
- Upsert ON CONFLICT correctness
- Fetch/write error handling (non-fatal)
- stopSync prevents future writes
- startSync idempotency
- Unauthenticated path — no Supabase calls
- Ongoing sync triggers both stores
- No-downgrade regression
- Stale-session isolation

**Covered by Story 7.2 additions:**
- Empty DB + multiple localStorage entries → full batch migration (the exact signup scenario)
- Empty localStorage + empty DB → clean no-op
- Mixed merge on signup edge case (some overlap between DB and localStorage)
- Retry after failure (same-user re-start and stop+restart flows)
- Migration logging (including failed-upsert guard)

### Architecture Constraints (carried from Story 7.1)

- **Svelte 5 runes only** — `$state`, `$derived`, `$effect`. Never Svelte 4 stores.
- **`$lib/` import alias** — never relative `../../../` paths.
- **Co-located tests** as `filename.test.ts`.
- **Use existing `logger`** from `@cotulenh/common` — never raw `console.log`.
- **Check Supabase `{ data, error }` returns** — never assume success.
- **DB → TypeScript boundary**: `snake_case` from DB → `camelCase` in TypeScript.
- **No new packages/dependencies** — everything needed is already installed.
- **DO NOT modify `@cotulenh/learn` package** — sync is entirely in `cotulenh-app`.
- **DO NOT modify `learn-progress.svelte.ts`** — sync wraps the existing singleton.
- **Invisible infrastructure** — no "syncing" UI, no progress bars, no loading states.

### What NOT To Do

- Do NOT rewrite or restructure the sync layer — it's working correctly
- Do NOT add UI for migration status — invisible infrastructure principle
- Do NOT add i18n strings — no user-facing text changes
- Do NOT modify the registration flow — the existing `$effect` + `startLearnProgressSync` handles it
- Do NOT add Supabase Realtime subscriptions — fetch-on-init + write-on-save is sufficient
- Do NOT create new files beyond test additions — all changes are in existing files

### Scope Boundary

This story is intentionally lightweight. The heavy lifting was done in Story 7.1. This story:
- Adds 4-5 targeted tests for signup-specific scenarios
- Adds one info-level log line for migration observability
- Includes manual verification of the end-to-end flow
- Marks FR40 as verified and complete

### Project Structure Notes

| File | Action | Purpose |
|------|--------|---------|
| `apps/cotulenh/app/src/lib/learn/learn-progress-sync.test.ts` | MODIFY | Add signup migration test suite |
| `apps/cotulenh/app/src/lib/learn/learn-progress-sync.svelte.ts` | MODIFY | Add migration success log + same-user retry path for failed initial migration |
| `apps/cotulenh/app/src/routes/+layout.svelte` | MODIFY | Re-trigger learn-progress sync on navigation to support automatic retry |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 7 overview, Story 7.2 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/prd.md — FR40: localStorage progress migrated on signup]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 2: Linh learn-to-play, invisible progress migration]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — "Progress migration is invisible — user sees their stars intact"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — "If migration fails silently, local progress is preserved and retry happens on next page load"]
- [Source: _bmad-output/planning-artifacts/architecture.md — learn_progress table, RLS, reliability patterns (NFR14-18)]
- [Source: _bmad-output/implementation-artifacts/7-1-learn-progress-database-sync.md — Previous story with sync-on-top pattern, dev notes, review findings]
- [Source: apps/cotulenh/app/src/lib/learn/learn-progress-sync.svelte.ts — Existing sync implementation]
- [Source: apps/cotulenh/app/src/lib/learn/learn-progress-sync.test.ts — Existing 12 tests]
- [Source: apps/cotulenh/app/src/routes/+layout.svelte — Auth state $effect calling startLearnProgressSync]
- [Source: apps/cotulenh/app/src/routes/auth/register/+page.server.ts — Registration server action with signUp()]
- [Source: apps/cotulenh/app/src/routes/auth/callback/+server.ts — Email verification callback with verifyOtp()]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- **Task 1 (AC 1, 2, 5):** Added 4 signup migration tests in new `describe('signup migration')` block:
  - "migrates all localStorage progress to empty DB on signup" — verifies batch upsert of 3 localStorage entries to empty DB with log verification
  - "does not log migration success when batch upsert fails" — verifies no false-positive migration success logging on DB write error
  - "handles empty localStorage on signup (no-op)" — verifies no upsert calls when nothing to migrate
  - "merges with existing DB progress on signup edge case" — verifies correct merge behavior: localStorage-only entries upserted, DB-wins entries saved locally, higher-stars-kept invariant maintained
- **Task 2 (AC 4):** Added 2 retry tests in `describe('migration retry')` block:
  - verifies same-user re-start retries migration after initial failure (no logout/reload required)
  - verifies stop+restart path also retries migration successfully
- **Task 3 (AC 1):** Added `logger.info` call after successful batch upsert in `performInitialSync` for migration observability. Updated signup migration test to verify log output.
- **Code review fixes applied (2026-03-04):**
  - Fixed AC4 gap: failed initial migration now retries for the same authenticated user on subsequent `startLearnProgressSync` calls; `+layout.svelte` re-triggers sync on route navigation via `afterNavigate`.
  - Fixed observability gap: migration success log now emits only when batch upsert succeeds (no false-positive success logs on DB write failure).
  - Added tests:
    - "retries migration on subsequent startSync call for the same user"
    - "does not log migration success when batch upsert fails"
- **Task 4 (AC 1, 3):** Manual verification — requires user to test end-to-end signup flow locally (see checklist in story)
- **Regression check:** All 595 tests pass across 40 test files — zero regressions

### File List

- `apps/cotulenh/app/src/lib/learn/learn-progress-sync.test.ts` — MODIFIED: Added 6 new tests total (signup migration x4, migration retry x2), including retry-without-logout and failed-upsert logging guard
- `apps/cotulenh/app/src/lib/learn/learn-progress-sync.svelte.ts` — MODIFIED: Added migration log and reliable retry-state handling for failed initial migration
- `apps/cotulenh/app/src/routes/+layout.svelte` — MODIFIED: Added `afterNavigate` hook to re-trigger sync/retry on later navigation

## Senior Developer Review (AI)

Date: 2026-03-04

- High issue fixed: AC4 retry now works for same authenticated session after later navigation, not only after logout/reload.
- Medium issue fixed: migration success logging is now gated on actual successful batch upsert.
- Medium issue fixed: story File List updated to match actual changed source files.
- Low issue acknowledged: some `setTimeout(50)` waits remain in this test file and can be tightened in a follow-up test reliability cleanup.

## Change Log

- 2026-03-04: Applied code-review fixes for Story 7.2 (automatic retry on later navigation, accurate migration success logging, added targeted tests, updated story metadata/file list).
