# Story 3.5: Chess Clocks & Time Control

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want synchronized countdown clocks showing remaining time for both players,
So that I can manage my time and know how much time my opponent has.

## Acceptance Criteria

1. **AC1: Clock Display & Local Countdown** — Both players' clocks shown with remaining time. Active player's clock counts down locally at minimum once per second (NFR6). Local clock is display-only; server clock remains authoritative. Monospace tabular figures for no layout shift.

2. **AC2: Server Clock Sync** — When a `move` event is broadcast, the piggybacked `clock_sync` payload `{ red: number, blue: number }` (milliseconds) updates local clocks to server-authoritative values. Clock drift between players must not exceed 500ms (NFR6). On sync, active player's local countdown resets from the authoritative value.

3. **AC3: Clock Switching on Move** — When a move is confirmed by the server, the active clock stops counting down and the opponent's clock starts. Fischer increment (from `game_config.incrementSeconds`) is applied server-side before broadcasting `clock_sync`. The client applies the synced values, which already include the increment.

4. **AC4: Critical Time Warnings** — When a player's clock drops below 30 seconds: text turns danger color (`--color-clock-critical`), announced via `aria-live="polite"` region (NFR23). When below 10 seconds: danger background pulsing animation. Respects `prefers-reduced-motion` (disable pulse).

5. **AC5: Clock Pause States** — Clocks do NOT count down during `deploying` phase or when game is in `ended` state. Clocks display the static value from server state. Countdown only active during `playing` phase.

6. **AC6: Dedicated ChessClock Component** — Create `chess-clock.tsx` per architecture spec. Component states: running (active player), paused (deploy/disconnect/ended), critical (<30s), expired (0:00). `role="timer"` with `aria-live="polite"` when critical. Not rendered for AI games (future-proof: check if opponent is AI).

7. **AC7: Clock Initialization** — Clocks initialized from `gameData.game_state.clocks` on game load. Display format: `M:SS` (e.g., `10:00`, `0:30`). When under 10 seconds, show tenths: `0:09.3`.

## Tasks / Subtasks

- [ ] Task 1: Create ChessClock component (AC: #1, #4, #6, #7)
  - [ ] 1.1 Create `apps/cotulenh/web/src/components/game/chess-clock.tsx` with props: `timeMs: number`, `isRunning: boolean`, `isPlayerClock: boolean`
  - [ ] 1.2 Implement local countdown via `useEffect` + `setInterval(100ms)` when `isRunning=true` — decrement display time locally, clear on unmount
  - [ ] 1.3 Format display: `M:SS` normally, `M:SS.T` (tenths) when under 10 seconds
  - [ ] 1.4 Apply critical styles: `<30s` danger text color, `<10s` danger background pulse via CSS animation
  - [ ] 1.5 Add `prefers-reduced-motion` media query to disable pulse animation
  - [ ] 1.6 Set `role="timer"` always; add `aria-live="polite"` when critical threshold crossed (announce once on transition, not every tick)
  - [ ] 1.7 Monospace font with `font-variant-numeric: tabular-nums` to prevent layout shift
  - [ ] 1.8 Write tests in `apps/cotulenh/web/src/components/game/__tests__/chess-clock.test.tsx`

- [ ] Task 2: Add clock countdown logic to game store (AC: #1, #2, #3, #5)
  - [ ] 2.1 Add `activeColor: 'red' | 'blue' | null` derived state — `null` during deploy/ended, set to `engine.turn()` during playing
  - [ ] 2.2 Add `clockRunning: boolean` derived state — `true` only when `phase === 'playing'` and game not ended
  - [ ] 2.3 Modify `syncClocks` to reset local countdown reference point (store `lastSyncTime: number` and `syncedClocks: { red, blue }`)
  - [ ] 2.4 Add `getDisplayClocks()` selector: returns current display values by calculating elapsed since last sync for active player only
  - [ ] 2.5 Ensure `applyOpponentMove` and `makeMove` success paths trigger clock switch (active color flips via engine.turn())
  - [ ] 2.6 Write tests in `apps/cotulenh/web/src/stores/__tests__/game-store-clocks.test.ts`

- [ ] Task 3: Integrate ChessClock into game page (AC: #1, #6, #7)
  - [ ] 3.1 Replace raw `formatClock()` in `player-info-bar.tsx` with `<ChessClock>` component
  - [ ] 3.2 Pass `isRunning` prop: `true` when `clockRunning && thisPlayerColor === activeColor`
  - [ ] 3.3 Pass `timeMs` from `getDisplayClocks()` selector (not raw `clocks` state)
  - [ ] 3.4 Update `game-page-client.tsx` to provide clock display values and running state to PlayerInfoBar
  - [ ] 3.5 Verify AI game detection path (no clock rendered when opponent is AI — stub for future)
  - [ ] 3.6 Update existing PlayerInfoBar and game-page-client tests for new clock props

- [ ] Task 4: Implement Fischer increment on server (AC: #3)
  - [ ] 4.1 In `validate-move/index.ts` playing-phase path: after deducting elapsed time, add increment from `games.time_control.incrementSeconds * 1000` to the moving player's clock
  - [ ] 4.2 Read `time_control` from `games` row (already fetched in game status check) — extract `incrementSeconds`
  - [ ] 4.3 Updated clocks (with increment) are already broadcast via `clock_sync` — no additional broadcast needed
  - [ ] 4.4 Write/update Edge Function tests for increment application

- [ ] Task 5: Integration testing & regression (AC: #1-7)
  - [ ] 5.1 Test clock countdown: verify display decrements when running, stops when paused
  - [ ] 5.2 Test clock sync: verify server sync overrides local countdown
  - [ ] 5.3 Test critical warnings: verify visual changes at 30s and 10s thresholds
  - [ ] 5.4 Test clock switching: verify correct clock runs after move confirmation
  - [ ] 5.5 Test pause states: verify no countdown during deploy or ended phases
  - [ ] 5.6 Test tenths display: verify `M:SS.T` format when under 10 seconds
  - [ ] 5.7 Run full test suite — all existing tests must pass (357+ tests baseline from story 3.4)

## Dev Notes

### Architecture Patterns & Constraints

- **Server clock is AUTHORITATIVE** — local countdown is display-only, synced on every move via `clock_sync` broadcast
- **100ms tick interval** for smooth display (matches SvelteKit app pattern in `apps/cotulenh/app/src/lib/clock/clock.svelte.ts`)
- **Fischer increment applied SERVER-SIDE** in validate-move Edge Function, not client-side
- **Clocks stored as milliseconds** (`{ red: number, blue: number }`) in both DB and client state
- **Vietnamese only** for all user-facing text — no English placeholders
- **No barrel exports** — direct imports only
- **No spinners** — skeleton screens for loading states

### CRITICAL: Existing Clock Infrastructure (DO NOT Reinvent)

Significant clock plumbing already exists from stories 3.1-3.4. You MUST extend, not replace:

**Game store** (`apps/cotulenh/web/src/stores/game-store.ts`):
- `clocks: { red: number; blue: number } | null` state field already exists (line ~13)
- `syncClocks(red, blue)` action already exists (line ~234) — updates clocks from server
- Clocks loaded from `gameData.game_state.clocks` on init (line ~96)
- **Extend** with countdown logic, NOT replace existing syncClocks

**Game channel** (`apps/cotulenh/web/src/hooks/use-game-channel.ts`):
- `clock_sync` event handler already exists (lines ~80-84) — calls `syncClocks(red, blue)`
- **No changes needed here** — clock sync reception already works

**Player info bar** (`apps/cotulenh/web/src/components/game/player-info-bar.tsx`):
- Already renders clock with `formatClock(milliseconds)` helper
- Already has `role="timer"` and `aria-live="polite"` when `< 30s`
- **Replace** the inline clock rendering with the new `<ChessClock>` component

**Game page client** (`apps/cotulenh/web/src/components/game/game-page-client.tsx`):
- Already reads `clocks` from store (line ~26)
- Already passes `clock={topClock}` / `clock={bottomClock}` to PlayerInfoBar
- **Update** to pass display clocks and running state instead of raw clock values

**Validate-move Edge Function** (`supabase/functions/validate-move/index.ts`):
- Clock deduction already implemented (lines ~152-159): elapsed = `Date.now() - updated_at`, deducts from active player
- Clock sync already broadcast with move event (lines ~202-210)
- **Add** increment logic after deduction — read `incrementSeconds` from `games.time_control`

**Database**: `game_states.clocks` (jsonb), `games.time_control` (jsonb with `timeMinutes`, `incrementSeconds`) — all exist, no migrations needed.

**Constants** (`apps/cotulenh/web/src/lib/constants/game-config.ts`):
- `TIME_CONTROL_PRESETS` with bullet/blitz/rapid/classical — already defined
- `FORFEIT_WINDOW_SECONDS: 60` — already defined

### Reference: SvelteKit Clock Implementation

The SvelteKit app at `apps/cotulenh/app/src/lib/clock/clock.svelte.ts` has a full `ChessClockState` class. Key patterns to mirror in React:
- 100ms tick interval
- `switchSide()` applies increment to the player who just moved
- Status states: `'idle' | 'running' | 'paused' | 'timeout'`
- `formatClockTime(ms)` — shows tenths when under 10s
- Timeout detection via callback

### UX Specifications

- **Layout**: Clock rendered inside PlayerInfoBar (opponent bar top, your bar bottom)
- **Font**: Monospace with tabular figures — no layout shift during countdown
- **Colors**: Active player's clock highlighted. Team color tint (10% opacity) on clock background. 4px left border in team color on player bars
- **Critical <30s**: Danger color text (`--color-clock-critical`)
- **Critical <10s**: Danger background pulsing animation
- **`prefers-reduced-motion`**: Disable pulse, keep color change
- **Mobile**: Bars compressed (name + clock). Clock still visible
- **AI games**: No clock rendered (future story, but component should accept an optional `hidden` prop or not be rendered)

### Edge Function Increment Logic

```typescript
// After clock deduction, BEFORE writing to DB:
const incrementMs = (gameRow.time_control?.incrementSeconds ?? 0) * 1000;
const updatedClocks = {
  red: playerColor === 'red' ? Math.max(0, clocks.red - elapsed) + incrementMs : clocks.red,
  blue: playerColor === 'blue' ? Math.max(0, clocks.blue - elapsed) + incrementMs : clocks.blue,
};
```

### Store Countdown Pattern

```typescript
// Conceptual pattern for local countdown display:
// Store holds: syncedClocks, lastSyncTime, activeColor
// Selector computes display clocks:
getDisplayClocks: () => {
  const { clocks, lastSyncTime, activeColor, phase } = get();
  if (!clocks || phase !== 'playing' || !activeColor) return clocks;
  const elapsed = Date.now() - (lastSyncTime ?? Date.now());
  return {
    red: activeColor === 'red' ? Math.max(0, clocks.red - elapsed) : clocks.red,
    blue: activeColor === 'blue' ? Math.max(0, clocks.blue - elapsed) : clocks.blue,
  };
}
```

The ChessClock component calls `getDisplayClocks()` on a 100ms interval via `useEffect`.

### Project Structure Notes

Files to create:
- `apps/cotulenh/web/src/components/game/chess-clock.tsx`
- `apps/cotulenh/web/src/components/game/__tests__/chess-clock.test.tsx`
- `apps/cotulenh/web/src/stores/__tests__/game-store-clocks.test.ts`

Files to modify:
- `apps/cotulenh/web/src/stores/game-store.ts` — add countdown logic, lastSyncTime, activeColor, getDisplayClocks
- `apps/cotulenh/web/src/components/game/player-info-bar.tsx` — replace inline clock with ChessClock component
- `apps/cotulenh/web/src/components/game/game-page-client.tsx` — pass display clocks and running state
- `supabase/functions/validate-move/index.ts` — add Fischer increment after clock deduction

Files NOT to modify:
- `apps/cotulenh/web/src/hooks/use-game-channel.ts` — clock_sync handler already works
- `apps/cotulenh/web/src/lib/types/game.ts` — no new types needed
- `apps/cotulenh/web/src/lib/constants/game-config.ts` — presets already defined
- `supabase/migrations/*` — no schema changes needed

### Previous Story Intelligence (3.4: Move Execution)

**Key learnings to carry forward:**
- Type error with board events — `OrigMove`/`DestMove` objects, NOT `Key` strings
- Test mocks for `@cotulenh/core` and `supabase/browser` need careful setup
- `lock_game_state_for_update` RPC returns `clocks` and `updated_at` (migration 015)
- Broadcast events use channel `game:{gameId}` — established in `use-game-channel.ts`
- 357 tests passing across 53 files — maintain this baseline
- Code review fixed stale write protection via compare-and-swap on `updated_at` — preserve this pattern
- Variable shadowing in Edge Function caused bugs — use unique names in new code paths

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.5]
- [Source: _bmad-output/planning-artifacts/architecture.md — Clock Sync Protocol, Game Store, Zustand Store Pattern, Disconnect & Forfeit]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Clock Interaction, Game Page Layout, ChessClock Component, Micro-Interactions]
- [Source: _bmad-output/implementation-artifacts/3-4-move-execution-server-side-validation.md — Dev Notes, Previous Story Learnings, Code Review Fixes]
- [Source: apps/cotulenh/app/src/lib/clock/clock.svelte.ts — SvelteKit ChessClockState reference implementation]
- [Source: supabase/functions/validate-move/index.ts — Existing clock deduction logic]
- [Source: apps/cotulenh/web/src/stores/game-store.ts — Existing clock state and syncClocks action]
- [Source: apps/cotulenh/web/src/components/game/player-info-bar.tsx — Existing clock display]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
