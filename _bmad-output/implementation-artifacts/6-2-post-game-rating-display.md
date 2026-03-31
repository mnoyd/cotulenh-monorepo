# Story 6.2: Post-Game Rating Display

Status: done

## Story

As a player,
I want to see how my rating changed immediately after a rated game,
so that I know the impact of the game on my ranking.

## Acceptance Criteria

1. **Rated Game Rating Delta Display**
   - **Given** a rated game has ended
   - **When** the game result banner is displayed
   - **Then** both players see their rating change as a delta (e.g., "1492 → 1504 (+12)" in green for gains, "1492 → 1484 (-8)" in red for losses)
   - **And** the rating data comes from the `game_end` broadcast event's `rating_changes` payload (already sent by backend)

2. **Draw Game Rating Changes**
   - **Given** a rated game ends in a draw
   - **When** the result banner is displayed
   - **Then** both players see their rating change (may be positive, negative, or zero depending on RD and opponent rating)

3. **Casual Game Result Display**
   - **Given** a casual game has ended
   - **When** the result banner is displayed
   - **Then** no rating change is shown
   - **And** ratings are not mentioned in the result banner

## Tasks / Subtasks

- [x] Task 1: Add rating change state to game store (AC: 1, 3)
  - [x] Add `ratingChanges` state: `{ red: { old, new, delta }, blue: { old, new, delta } } | null`
  - [x] Update `handleGameEnd` to accept and store `ratingChanges`
  - [x] Write unit tests for store rating change state
- [x] Task 2: Wire `rating_changes` from broadcast event to store (AC: 1)
  - [x] Update `use-game-channel.ts` `game_end` handler to extract `rating_changes` from payload
  - [x] Pass `rating_changes` to `handleGameEnd`
  - [x] Handle null/undefined `rating_changes` for casual games
- [x] Task 3: Create `RatingChangeDisplay` component (AC: 1, 2)
  - [x] Build component: "old → new (+delta)" format
  - [x] Green for gains (`--color-success`), red for losses (`--color-error`), muted for zero
  - [x] Animated count 500ms, respect `prefers-reduced-motion`
  - [x] `aria-live="polite"` for accessibility
  - [x] Write component tests
- [x] Task 4: Integrate rating display into `GameResultBanner` (AC: 1, 2, 3)
  - [x] Add `ratingChanges` and `myColor` awareness to banner
  - [x] Show `RatingChangeDisplay` for rated games only
  - [x] Hide rating section entirely for casual games
  - [x] Write integration tests
- [x] Task 5: Update `GamePageClient` to pass rating data (AC: 1, 3)
  - [x] Read `ratingChanges` from game store
  - [x] Pass to `GameResultBanner` as prop
  - [x] Determine `isRated` from game data to conditionally render

## Dev Notes

### Critical: Backend Already Sends Rating Data

The `complete-game` Edge Function in `supabase/functions/validate-move/game-end.ts` (lines 161-172, 229-244) **already broadcasts `rating_changes`** in the `game_end` event payload:

```typescript
// Already sent by backend (game-end.ts:161-172)
rating_changes: {
  red: { old: number, new: number, delta: number },
  blue: { old: number, new: number, delta: number }
} | null  // null for casual games
```

**You do NOT need to create any new server actions, API endpoints, or Edge Functions.** The data is already flowing — you just need to consume it on the frontend.

### What Exists vs What Needs Building

**Already exists (DO NOT recreate):**
- `complete_game_with_ratings` RPC in `supabase/migrations/025_ratings.sql` — atomic game+rating update
- `calculateGlicko2()` in `packages/cotulenh/common/src/glicko2.ts` — algorithm
- `rating_changes` broadcast in `game-end.ts` — backend sends it
- `GameResultBanner` at `apps/cotulenh/web/src/components/game/game-result-banner.tsx` — extend, don't replace
- `PlayerInfoBar` at `apps/cotulenh/web/src/components/game/player-info-bar.tsx` — already shows current rating with provisional "?"
- `game-store.ts` at `apps/cotulenh/web/src/stores/game-store.ts` — add state, don't restructure
- `use-game-channel.ts` at `apps/cotulenh/web/src/hooks/use-game-channel.ts` — update handler, don't refactor

**Needs building:**
- `RatingChangeDisplay` component (new file)
- Rating change state in game store (modify existing)
- Wire broadcast payload to store (modify existing)
- Integrate into `GameResultBanner` (modify existing)

### Game Store Changes

**File:** `apps/cotulenh/web/src/stores/game-store.ts`

Add to state interface (near line 19-23 where `gameStatus`, `winner`, `resultReason` are):
```typescript
ratingChanges: {
  red: { old: number; new: number; delta: number };
  blue: { old: number; new: number; delta: number };
} | null;
```

Initialize as `null`. Update `handleGameEnd` (line 345) to accept optional `ratingChanges` parameter.

### Broadcast Event Wiring

**File:** `apps/cotulenh/web/src/hooks/use-game-channel.ts`

The `game_end` handler (lines 122-129) currently extracts `status`, `winner`, `result_reason` but **ignores `rating_changes`**. Add extraction:

```typescript
case 'game_end': {
  const { status, winner, result_reason, rating_changes } = eventPayload as {
    status: string;
    winner: 'red' | 'blue' | null;
    result_reason: string | null;
    rating_changes: { red: { old: number; new: number; delta: number }; blue: { old: number; new: number; delta: number } } | null;
  };
  handleGameEnd(status, winner, result_reason, rating_changes);
  break;
}
```

### RatingChangeDisplay Component

**File:** `apps/cotulenh/web/src/components/profile/rating-change-display.tsx` (new file per architecture)

Architecture and UX spec require:
- Format: "1492 → 1504 (+12)"
- Color: green (`--color-success`) for gains, red (`--color-error`) for losses, muted for zero
- Animation: 500ms count up/down effect
- Accessibility: `aria-live="polite"`
- Motion: respect `prefers-reduced-motion` — skip animation if set
- Typography: monospace for rating numbers (per UX spec)

### GameResultBanner Integration

**File:** `apps/cotulenh/web/src/components/game/game-result-banner.tsx`

Add new props:
```typescript
ratingChanges?: {
  red: { old: number; new: number; delta: number };
  blue: { old: number; new: number; delta: number };
} | null;
myColor: 'red' | 'blue';  // already passed
```

Place `RatingChangeDisplay` between the result text and action buttons, showing the current player's rating change. Only render when `ratingChanges` is not null (rated game).

### GamePageClient Updates

**File:** `apps/cotulenh/web/src/components/game/game-page-client.tsx`

Read `ratingChanges` from game store (lines 360-373 where `GameResultBanner` is rendered) and pass as prop.

### Project Structure Notes

- New component goes in `src/components/profile/rating-change-display.tsx` (per architecture doc component map)
- Test file: `src/components/profile/rating-change-display.test.tsx` (co-located)
- No new pages, routes, or server actions needed
- No database changes needed
- No Edge Function changes needed

### UX Design Requirements

From UX specification:
- **Post-game screen:** Result overlay ON the board (semi-transparent backdrop). Rating change animated (rated human games only)
- **Emotional design:** Green "+12" feels earned, loss feels recoverable. Losses are small red text
- **GameResultBanner:** Result + method + rating delta. Overlays board bottom. Actions: Rematch/New/Review
- **RatingChangeDisplay:** Old → new + delta + color arrow. Animated 500ms. Gain: green. Loss: red. Neutral: muted. Rated human games only. `aria-live="polite"`
- **Typography:** Monospace for rating numbers (tabular figures)
- **Mobile:** Result banner above board (compact). Actions below

### Vietnamese UI Strings

All UI text must be in Vietnamese. No English strings in UI.
- Rating gain example: "1492 → 1504 (+12)"  (numbers are universal, no translation needed)
- The numbers and arrows are language-neutral — no string translation required for the rating display itself

### Testing Requirements

- **Unit tests (Vitest):**
  - `game-store.test.ts`: Test `handleGameEnd` with and without `ratingChanges`
  - `rating-change-display.test.tsx`: Test render for gain/loss/zero/null states, animation class, accessibility
  - `game-result-banner.test.tsx`: Test rated game shows rating, casual game hides it
- **Co-location:** Tests next to source files
- **Existing test baseline:** 509 web tests must continue to pass — no regressions
- **E2E:** 22 Playwright tests must pass. No new E2E test needed for this story (rating display is visual, not a new journey)

### Anti-Patterns to Avoid

1. **DO NOT fetch ratings via a new server action or API call.** The data arrives in the broadcast event — just consume it.
2. **DO NOT modify the Edge Function or database.** Backend is complete from Story 6.1.
3. **DO NOT create barrel exports (index.ts re-exports).** Direct imports only.
4. **DO NOT add English strings to UI.** Vietnamese only.
5. **DO NOT restructure existing components.** Extend `GameResultBanner` props, don't rewrite it.
6. **DO NOT add rating display to `PlayerInfoBar`.** It already shows current rating with provisional "?" (from Story 6.1). This story is about the *post-game delta*, not the static rating.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 6, Story 6.2]
- [Source: _bmad-output/planning-artifacts/architecture.md - Rating Components, Complete-Game Edge Function]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Post-Game Screen, RatingChangeDisplay, Micro-Interactions]
- [Source: supabase/functions/validate-move/game-end.ts:161-172 - rating_changes payload shape]
- [Source: supabase/functions/validate-move/game-end.ts:229-244 - broadcast includes rating_changes]
- [Source: apps/cotulenh/web/src/hooks/use-game-channel.ts:122-129 - game_end handler (needs update)]
- [Source: apps/cotulenh/web/src/stores/game-store.ts:345-355 - handleGameEnd (needs update)]
- [Source: apps/cotulenh/web/src/components/game/game-result-banner.tsx - extend with rating display]
- [Source: _bmad-output/implementation-artifacts/6-1-glicko-2-rating-system.md - previous story intelligence]

### Previous Story Intelligence (6.1)

Key learnings from Story 6.1 implementation:
- Glicko-2 is in `packages/cotulenh/common/src/glicko2.ts` — pure TS, no deps
- `complete_game_with_ratings` RPC handles atomic game+rating writes
- `rating_games_played` cache column exists on `profiles` for provisional indicator efficiency
- `game-end.ts` broadcasts `rating_changes` with `{ red: { old, new, delta }, blue: { old, new, delta } }`
- PlayerInfoBar already displays provisional "?" via `ratingGamesPlayed` prop
- Import maps in `deno.json` support `@cotulenh/common`
- All 786 app tests + 509 web tests + 22 E2E tests passed after 6.1

### Git Intelligence

Recent commits show patterns:
- `a471cd0` Fix rating review gaps and stabilize app e2e
- `7a00795` Fix dropdown trigger button nesting
- `0ad8c8d` Fix friend challenge navigation and review gaps
- Convention: descriptive commit messages, fix-oriented patches after story completion

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Review findings identified missing frontend plumbing for `rating_changes`, missing result-banner UI, and missing test coverage before implementation.
- `pnpm --filter @cotulenh/web test -- --run src/hooks/__tests__/use-game-channel.test.tsx src/stores/__tests__/game-store-endstate.test.ts src/components/game/__tests__/game-result-banner.test.tsx src/components/game/__tests__/game-page-client.test.tsx src/components/profile/__tests__/rating-change-display.test.tsx`
- `pnpm --filter @cotulenh/web lint` completed with two pre-existing warnings in `board-container.tsx` and `chess-clock.tsx`.

### Completion Notes List

- Added `ratingChanges` state to the game store, cleared it on initialize/reset, and extended `handleGameEnd()` so the end-state payload can persist rated and casual results correctly.
- Wired `game_end.rating_changes` from the realtime channel into the store, preserving `null` for casual games and passing full deltas for rated games.
- Added `RatingChangeDisplay` with monospace formatting, 500ms animated count-up/down, reduced-motion fallback, and `aria-live="polite"`.
- Integrated the rating delta into `GameResultBanner` and `GamePageClient`, showing only the current player's delta for rated games and hiding the section entirely for casual games.
- Added focused test coverage for the channel payload, store end-state handling, result banner rendering, page integration, and the new rating display component.

### File List

- `apps/cotulenh/web/src/stores/game-store.ts`
- `apps/cotulenh/web/src/hooks/use-game-channel.ts`
- `apps/cotulenh/web/src/components/game/game-result-banner.tsx`
- `apps/cotulenh/web/src/components/game/game-page-client.tsx`
- `apps/cotulenh/web/src/components/profile/rating-change-display.tsx`
- `apps/cotulenh/web/src/hooks/__tests__/use-game-channel.test.tsx`
- `apps/cotulenh/web/src/stores/__tests__/game-store-endstate.test.ts`
- `apps/cotulenh/web/src/components/game/__tests__/game-result-banner.test.tsx`
- `apps/cotulenh/web/src/components/game/__tests__/game-page-client.test.tsx`
- `apps/cotulenh/web/src/components/profile/__tests__/rating-change-display.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- **2026-03-31:** Implemented story 6.2 post-game rating display, fixed review findings, and added focused frontend test coverage.

## Senior Developer Review (AI)

### Outcome

Approved after fixes.

### Findings Addressed

- Routed backend `game_end.rating_changes` into the web client instead of dropping it in the channel handler.
- Persisted rating deltas in the game store so the post-game overlay can render rated outcomes correctly.
- Added the missing `RatingChangeDisplay` UI and integrated it into the result banner for rated games only.
- Added focused tests covering rated display, casual suppression, and store/channel plumbing.
