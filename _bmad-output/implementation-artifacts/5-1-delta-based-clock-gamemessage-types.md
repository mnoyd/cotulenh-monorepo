# Story 5.1: Delta-Based Clock & GameMessage Types

Status: done

## Story

As a player,
I want accurate chess clocks that don't drift in background tabs or under CPU load,
So that time controls are fair regardless of device or browser behavior.

## Acceptance Criteria (BDD)

1. **Given** the existing `ChessClockState` class
   **When** upgraded to use `Date.now()` instead of `performance.now()`
   **Then** each tick computes `elapsed = Date.now() - lastTick` and `lastTick` is reset each tick, enabling cross-client lag compensation via `sentAt` timestamps

2. **Given** a game running in a background tab (browser throttles setInterval to 1/sec)
   **When** the user returns to the tab (`visibilitychange` fires)
   **Then** the clock immediately catches up by computing the full elapsed delta since the last tick

3. **Given** the `LagTracker` class initialized with defaults (500ms max quota, 100ms regen per move)
   **When** `debit(estimatedLag)` is called
   **Then** it returns `min(estimatedLag, currentQuota)` and reduces the quota accordingly

4. **Given** the `LagTracker` after a debit
   **When** `regenerate()` is called (once per move)
   **Then** the quota increases by 100ms up to the 500ms cap

5. **Given** the `GameMessage` type definition
   **When** a developer creates a message
   **Then** TypeScript enforces the correct fields for each event type (move requires san+clock+seq+sentAt, ack requires seq, etc.)

6. **Given** the existing local play flow
   **When** a user plays a local game after the clock upgrade
   **Then** the game functions identically — delta-based timing change from `performance.now()` to `Date.now()` is transparent to the UI

## Tasks / Subtasks

- [x] Task 1: Upgrade `ChessClockState` to `Date.now()` + `visibilitychange` (AC: 1, 2, 6)
  - [x] 1.1 Change `performance.now()` → `Date.now()` in `start()`, `resume()`, `switchSide()`, `#updateTime()`
  - [x] 1.2 Add `getTime(side: ClockColor): number` method for reading current time (used by online session for move messages)
  - [x] 1.3 Add `setTime(side: ClockColor, ms: number): void` method for lag-compensated clock updates from opponent
  - [x] 1.4 Add `visibilitychange` listener in `#startInterval()`, remove in `#stopInterval()` — on visible, force immediate `#tick()`
  - [x] 1.5 Verify existing local play still works (no behavior change for local games)

- [x] Task 2: Create `GameMessage` discriminated union type (AC: 5)
  - [x] 2.1 Create `$lib/game/messages.ts` with the full `GameMessage` type
  - [x] 2.2 Implement `sendGameMessage(channel: RealtimeChannel, msg: GameMessage)` helper
  - [x] 2.3 Implement `onGameMessage(channel: RealtimeChannel, handler: (msg: GameMessage) => void)` listener helper
  - [x] 2.4 Export all types and helpers

- [x] Task 3: Create `LagTracker` class (AC: 3, 4)
  - [x] 3.1 Create `$lib/game/lag-tracker.ts` with `LagTracker` class
  - [x] 3.2 Implement `debit(estimatedLag: number): number` — returns compensation applied
  - [x] 3.3 Implement `regenerate(): void` — called once per move, adds 100ms up to 500ms cap
  - [x] 3.4 Implement `reset(): void` for new game initialization

- [x] Task 4: Write unit tests (AC: 1-6)
  - [x] 4.1 Create `$lib/game/lag-tracker.test.ts` — test debit, regenerate, cap, edge cases
  - [x] 4.2 Create `$lib/game/messages.test.ts` — test type safety, sendGameMessage serialization
  - [x] 4.3 Update existing clock tests if any, or create `$lib/clock/clock.test.ts` for `visibilitychange` behavior

## Dev Notes

### Critical: Existing Clock Already Uses Delta-Based Timing

The current `ChessClockState` in `$lib/clock/clock.svelte.ts` **already** uses delta-based timing (`elapsed = now - lastTick`). It uses `performance.now()` though, which is page-relative and cannot be compared across clients. The upgrade is:

1. **`performance.now()` → `Date.now()`** — Required because the online lag compensation system compares `sentAt: Date.now()` timestamps between clients. Both the clock and the message system must use the same time source.
2. **Add `visibilitychange` handler** — When tab goes background, browsers throttle `setInterval` to 1/sec. On return, force immediate tick to catch up.
3. **Add `getTime()`/`setTime()` methods** — Needed by `OnlineGameSession` (Story 5.2) for reading clock values to include in move messages and for applying lag-compensated opponent clock updates.

### Architecture Constraints

- **Svelte 5 runes only** — `$state`, `$derived`, `$effect`. Never Svelte 4 stores.
- **`.svelte.ts` extension** for files using runes (clock file already uses this).
- **`$lib/` import alias** — never relative `../../../` paths.
- **Co-located tests** as `filename.test.ts`.
- **i18n** — not applicable for this story (no user-facing strings added).
- **Use existing `logger`** from `@cotulenh/common` for error logging — never raw `console.log`.

### GameMessage Type — Complete Definition

```typescript
type GameMessage =
  // Gameplay
  | { event: 'move'; san: string; clock: number; seq: number; sentAt: number }
  | { event: 'ack'; seq: number }
  // Game end
  | { event: 'resign' }
  | { event: 'claim-victory' }
  | { event: 'abort' }
  // Draw
  | { event: 'draw-offer' }
  | { event: 'draw-accept' }
  | { event: 'draw-decline' }
  // Dispute
  | { event: 'dispute'; san: string; pgn: string }
  // Reconnection
  | { event: 'sync'; fen: string; pgn: string; clock: { red: number; blue: number }; seq: number }
  // Post-game
  | { event: 'rematch' }
  | { event: 'rematch-accept' }
  | { event: 'rematch-decline' };
```

**Field semantics:**
- `clock`: sender's remaining time in ms at the moment the move is sent
- `seq`: monotonically increasing move counter (1, 2, 3...) — enables gap detection for sync requests
- `sentAt`: `Date.now()` at send time — used by receiver for lag estimation

### LagTracker Specification

```typescript
class LagTracker {
  #quota: number;          // current lag compensation budget in ms
  #maxQuota: number;       // cap (default 500ms)
  #regenPerMove: number;   // regeneration per move (default 100ms)

  debit(estimatedLag: number): number;  // returns min(estimatedLag, quota), reduces quota
  regenerate(): void;                    // quota += regenPerMove, capped at maxQuota
  reset(): void;                         // quota = maxQuota
}
```

### Broadcast Channel Convention

- Channel name format: `game:{gameId}` (colon-separated `{scope}:{id}`)
- Broadcast event name: `game-message` (single event, discriminated by `event` field in payload)
- All messages go through `sendGameMessage()` helper — no raw untyped payloads

### Existing Realtime Patterns to Follow

The codebase has established patterns for realtime:
- **Core/wrapper split**: `-core.ts` for plain logic, `.svelte.ts` for reactive wrapper
- **Example**: `$lib/friends/presence-core.ts` + `$lib/friends/presence.svelte.ts`
- **Example**: `$lib/invitations/realtime-core.ts` + `$lib/invitations/realtime.svelte.ts`
- For `messages.ts`: This is a type + helper file (no state), so a single file is sufficient. No `.svelte.ts` wrapper needed.

### File Locations

| File | Action | Purpose |
|------|--------|---------|
| `$lib/clock/clock.svelte.ts` | MODIFY | Upgrade to `Date.now()`, add `visibilitychange`, add `getTime()`/`setTime()` |
| `$lib/game/messages.ts` | CREATE | `GameMessage` union type + `sendGameMessage`/`onGameMessage` helpers |
| `$lib/game/lag-tracker.ts` | CREATE | `LagTracker` class |
| `$lib/game/lag-tracker.test.ts` | CREATE | Unit tests for LagTracker |
| `$lib/game/messages.test.ts` | CREATE | Type safety tests for GameMessage helpers |

### What NOT To Do

- Do NOT create `OnlineGameSession` — that's Story 5.2
- Do NOT create database migrations — that's Story 5.2
- Do NOT create any route pages — that's Story 5.2
- Do NOT touch `GameSession` (`$lib/game-session.svelte.ts`) — composition happens in Story 5.2
- Do NOT add Supabase Realtime channel subscription logic — the helpers just accept a `RealtimeChannel` parameter; subscription is Story 5.2's responsibility
- Do NOT add i18n strings — this story has no new user-facing text

### Dependencies & Imports

- `@supabase/supabase-js` — import `RealtimeChannel` type for helper function signatures
- `@cotulenh/common` — import `logger` if error handling needed
- No new package installations required

### Project Structure Notes

- `$lib/game/` directory may not exist yet — create it
- Existing game-related code lives at `$lib/game-session.svelte.ts` (top-level in lib), `$lib/clock/clock.svelte.ts`, and `$lib/types/game.ts`
- New game infrastructure goes in `$lib/game/` subdirectory per architecture

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Clock Synchronization Strategy, Lines 222-241]
- [Source: _bmad-output/planning-artifacts/architecture.md — GameMessage Type, Lines 457-488]
- [Source: _bmad-output/planning-artifacts/architecture.md — Lag Compensation, Lines 223-232]
- [Source: _bmad-output/planning-artifacts/architecture.md — File Structure, Lines 651-656]
- [Source: _bmad-output/planning-artifacts/architecture.md — Enforcement Rules, Lines 542-553]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 5.1, Lines 739-773]

## File List

- `apps/cotulenh/app/src/lib/clock/clock.svelte.ts` — MODIFIED: Date.now(), getTime/setTime, visibilitychange
- `apps/cotulenh/app/src/lib/clock/clock.test.ts` — CREATED: 22 tests for clock upgrade
- `apps/cotulenh/app/src/lib/game/messages.ts` — CREATED: GameMessage type + send/on helpers
- `apps/cotulenh/app/src/lib/game/messages.test.ts` — CREATED: 16 tests for message helpers (includes runtime guard and type-safety assertions)
- `apps/cotulenh/app/src/lib/game/lag-tracker.ts` — CREATED: LagTracker class
- `apps/cotulenh/app/src/lib/game/lag-tracker.test.ts` — CREATED: 15 tests for LagTracker (includes invalid-input edge cases)

### Review Audit Notes (2026-03-02)

The working tree contained unrelated, pre-existing changes outside Story 5.1 at review time. They are not part of this story's implementation:

- `.gitattributes`
- `apps/cotulenh/app/src/lib/components/InvitationCard.svelte`
- `apps/cotulenh/app/src/lib/components/OnlineIndicator.svelte`
- `apps/cotulenh/app/src/lib/components/PlayerCard.svelte`
- `apps/cotulenh/app/src/lib/friends/presence-core.ts`
- `apps/cotulenh/app/src/lib/friends/presence.svelte.ts`
- `apps/cotulenh/app/src/lib/friends/presence.test.ts`
- `apps/cotulenh/app/src/lib/friends/sort.test.ts`
- `apps/cotulenh/app/src/lib/friends/sort.ts`
- `apps/cotulenh/app/src/lib/invitations/queries.test.ts`
- `apps/cotulenh/app/src/lib/invitations/queries.ts`
- `apps/cotulenh/app/src/routes/play/online/+page.svelte`
- `apps/cotulenh/app/src/routes/play/online/invite/[code]/+page.server.ts`
- `apps/cotulenh/app/src/routes/play/online/invite/[code]/+page.svelte`
- `apps/cotulenh/app/src/routes/play/online/invite/[code]/page.server.test.ts`
- `apps/cotulenh/app/src/routes/user/friends/+page.svelte`
- `supabase/migrations/005_shareable_invite_links.sql`
- `supabase/migrations/006_create_or_accept_friendship.sql`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Upgraded ChessClockState from performance.now() to Date.now() across start(), resume(), switchSide(), #updateTime() — enables cross-client timestamp comparison for lag compensation
- Added visibilitychange handler as arrow function property for correct `this` binding; registered in #startInterval(), removed in #stopInterval() — catches up elapsed time on tab return
- Added getTime(side)/setTime(side, ms) methods for Story 5.2's OnlineGameSession to read/write clock values
- Created GameMessage discriminated union with 13 event types matching architecture spec exactly
- sendGameMessage uses Supabase broadcast with GAME_MESSAGE_EVENT constant; logs errors via @cotulenh/common logger
- onGameMessage registers broadcast listener and returns channel for chaining; designed to be called before subscribe()
- LagTracker uses private fields with debit/regenerate/reset; defaults to 500ms max, 100ms regen per the architecture spec
- Story-focused test set passes (53 tests); full app suite passes (411 tests) with 0 regressions
- Post-review hardening (2026-03-02): LagTracker now clamps invalid/negative lag input; message helpers now validate inbound payload shape and catch thrown send errors
- Added additional verification tests: invalid payload rejection, thrown send handling, stronger visibility catch-up assertion, and LagTracker invalid-input edge cases

### Senior Developer Review (AI)

- 2026-03-02 review identified 2 High + 4 Medium issues
- All High/Medium issues were fixed in this pass
- Story status moved from `review` to `done`
- Verification: targeted tests pass (53), full app test suite passes (411)
- Type-check command attempted; blocked by existing unrelated TypeScript errors in the workspace

### Change Log

- 2026-03-02: Implemented Story 5.1 — delta-based clock upgrade, GameMessage types, LagTracker class, 46 unit tests
- 2026-03-02: Post-review fixes — hardened LagTracker and GameMessage runtime guards; added/strengthened unit tests; story status set to done
