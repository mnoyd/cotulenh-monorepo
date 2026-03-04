# Story 5.5: Clock Timeout & Claim Victory

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to claim victory when my opponent's clock runs out,
so that time controls are enforced and stalling is prevented.

## Acceptance Criteria (BDD)

1. **Given** the opponent's clock reaches 0
   **When** the local player sees the flag
   **Then** a "Claim Victory" button appears (not auto-forfeit) (FR32)

2. **Given** a player clicks "Claim Victory"
   **When** the action completes
   **Then** a `claim-victory` message is broadcast, `games` row is updated with `status = 'timeout'` and the claiming player as `winner` (FR32, FR34)

3. **Given** a draw offer is pending from the opponent AND the opponent's clock reaches 0
   **When** the flag condition is checked
   **Then** the result is a draw (not timeout win) — pending draw + flag = draw

4. **Given** a player's own clock reaches 0
   **When** the opponent hasn't claimed victory yet
   **Then** the game continues until the opponent actively claims (giving maximum reconnection time)

## Tasks / Subtasks

- [x] Task 1: Wire clock `onTimeout` callback in OnlineGameSessionCore (AC: 1, 4)
  - [x] 1.1 In the constructor (after `this.clock = new ChessClockState(clockConfig)` on line ~104), set `this.clock.onTimeout = (loser) => this.#handleClockTimeout(loser)`
  - [x] 1.2 Add `#opponentFlagged = false` private field — tracks when opponent's clock has hit 0
  - [x] 1.3 Implement `#handleClockTimeout(loser: ClockColor): void`:
    - If `this.#lifecycle !== 'playing'` → return (guard)
    - Map `loser` to player color: `loserColor = loser === 'r' ? 'red' : 'blue'`
    - If `loserColor === this.playerColor`: own clock ran out — do nothing, game continues until opponent claims. Set no flag, don't end game. (AC: 4)
    - If `loserColor !== this.playerColor`: opponent's clock ran out — set `this.#opponentFlagged = true`, call `this.#notifyStateChange()` so UI can show Claim Victory button (AC: 1)

- [x] Task 2: Implement `claimVictory()` public method (AC: 2)
  - [x] 2.1 Add `claimVictory(): void` method to `OnlineGameSessionCore`
  - [x] 2.2 Guards: `if (!this.#channel || this.#lifecycle !== 'playing' || !this.#opponentFlagged) return`
  - [x] 2.3 Send `{ event: 'claim-victory', senderId: this.#currentUserId }` via `sendGameMessage`
  - [x] 2.4 Determine winner: `this.playerColor` (the claiming player wins)
  - [x] 2.5 Stop clock: `this.clock.stop()`
  - [x] 2.6 Set `this.#lifecycle = 'ended'`
  - [x] 2.7 Set `this.#gameResult = { status: 'timeout', winner: this.playerColor, resultReason: 'timeout', isLocalPlayerWinner: true }`
  - [x] 2.8 Call `this.#writeGameResult('timeout', this.playerColor, 'timeout')`
  - [x] 2.9 Fire `this.#callbacks.onGameEnd?.(this.#gameResult)`
  - [x] 2.10 Call `this.#notifyStateChange()`

- [x] Task 3: Handle incoming `claim-victory` message (AC: 2)
  - [x] 3.1 Add `case 'claim-victory':` to `#handleGameMessage` switch (after `case 'resign':` on line ~297) → call `this.#handleClaimVictoryMessage()`
  - [x] 3.2 Implement `#handleClaimVictoryMessage(): void`:
    - If `this.#lifecycle === 'ended'` → return (idempotent guard, same as `#handleResignMessage`)
    - Winner is opponent: `const winner = this.playerColor === 'red' ? 'blue' : 'red'`
    - `this.clock.stop()`
    - `this.#lifecycle = 'ended'`
    - `this.#gameResult = { status: 'timeout', winner, resultReason: 'timeout', isLocalPlayerWinner: false }`
    - `this.#writeGameResult('timeout', winner, 'timeout')`
    - `this.#callbacks.onGameEnd?.(this.#gameResult)`
    - `this.#notifyStateChange()`

- [x] Task 4: Add `timeout` case to `#writeGameResult` termination string mapping (AC: 2)
  - [x] 4.1 In `#writeGameResult`, add case to the termination string switch (after `case 'threefold_repetition':` on line ~669):
    `case 'timeout': terminationString = 'time forfeit'; break;`
  - [x] 4.2 For timeout, manually set Result header (engine doesn't know about timeout):
    After the existing `if (status === 'resign')` block (~line 675), add:
    `if (status === 'timeout') { game.setHeader('Result', winner === 'red' ? '1-0' : '0-1'); }`

- [x] Task 5: Expose `opponentFlagged` getter and `claimVictory()` on core (AC: 1)
  - [x] 5.1 Add `get opponentFlagged(): boolean { return this.#opponentFlagged; }` getter to `OnlineGameSessionCore`

- [x] Task 6: Update reactive wrapper `OnlineGameSession` (AC: 1, 2)
  - [x] 6.1 Add `claimVictory(): void` to `OnlineGameSession` — proxies to `this.#core.claimVictory()`
  - [x] 6.2 Add `get opponentFlagged(): boolean` reactive getter — `void this.#version; return this.#core.opponentFlagged;`

- [x] Task 7: Add "Claim Victory" button to game page (AC: 1)
  - [x] 7.1 In `+page.svelte`, add a derived `opponentFlagged` variable: `let opponentFlagged = $derived(onlineSession?.opponentFlagged ?? false)`
  - [x] 7.2 In the status bar section (where resign button is, line ~205), add a Claim Victory button that shows when `opponentFlagged && onlineSession?.lifecycle === 'playing'`:
    ```svelte
    {#if opponentFlagged}
      <button class="claim-victory-btn" onclick={() => onlineSession?.claimVictory()}>
        {i18n.t('game.claimVictory')}
      </button>
    {/if}
    ```
  - [x] 7.3 Style `.claim-victory-btn`: prominent green/success style — should be noticeable (opposite of the subtle resign button). Pulsing or highlighted to draw attention.
  - [x] 7.4 Hide the resign button when `opponentFlagged` is true (no need to resign when you can claim victory)

- [x] Task 8: Add `timeout` result reason to GameResultBanner (AC: 2)
  - [x] 8.1 In `GameResultBanner.svelte`, add to the `reasonText` derived switch (after `case 'resignation':` on line ~28):
    `case 'timeout': return i18n.t('game.resultTimeout');`

- [x] Task 9: Add i18n strings (AC: 1, 2)
  - [x] 9.1 Add to `types.ts`: `'game.claimVictory'`, `'game.resultTimeout'`
  - [x] 9.2 Add to `en.ts`:
    - `'game.claimVictory': 'Claim Victory'`
    - `'game.resultTimeout': 'on Time'`
  - [x] 9.3 Add to `vi.ts`:
    - `'game.claimVictory': 'Đòi Thắng'`
    - `'game.resultTimeout': 'do Hết giờ'`

- [x] Task 10: Handle `#opponentFlagged` reset on sync (AC: 4)
  - [x] 10.1 In `#handleSync` method, reset `this.#opponentFlagged = false` — after sync, clock values are updated and flag state is recalculated by the clock's next tick

- [x] Task 11: Draw offer + timeout interaction stub (AC: 3)
  - [x] 11.1 Add `#pendingDrawOffer = false` field (NOT implementing draw offers — that's Story 5.7 — but need the field for the timeout interaction rule)
  - [x] 11.2 In `#handleClockTimeout`, before setting `#opponentFlagged = true`, check: `if (this.#pendingDrawOffer)` → end the game as a draw instead of showing Claim Victory:
    - `this.clock.stop()`
    - `this.#lifecycle = 'ended'`
    - `this.#gameResult = { status: 'draw', winner: null, resultReason: 'draw_by_timeout_with_pending_offer', isLocalPlayerWinner: false }`
    - `this.#writeGameResult('draw', null, 'draw_by_timeout_with_pending_offer')`
    - `this.#callbacks.onGameEnd?.(this.#gameResult)`
    - `this.#notifyStateChange()`
    - return (don't set opponentFlagged)
  - [x] 11.3 Add `setPendingDrawOffer(pending: boolean): void` method — Story 5.7 will call this when draw offers arrive/expire. For now, it's always `false`.

- [x] Task 12: Write tests (AC: 1-4)
  - [x] 12.1 **Opponent clock timeout test**: Simulate opponent clock reaching 0 → verify `onTimeout` fires with opponent's ClockColor, `opponentFlagged` becomes `true`, `onStateChange` fires, lifecycle stays `'playing'`
  - [x] 12.2 **Own clock timeout test**: Simulate own clock reaching 0 → verify `opponentFlagged` stays `false`, lifecycle stays `'playing'`, no game end
  - [x] 12.3 **Claim victory send test**: Set `opponentFlagged = true`, call `claimVictory()` → verify sends `claim-victory` message, lifecycle becomes `'ended'`, writes result with `status='timeout'`, `winner=playerColor`, `onGameEnd` fires with `isLocalPlayerWinner: true`
  - [x] 12.4 **Claim victory guard test**: Call `claimVictory()` when `opponentFlagged === false` → verify nothing happens (no message sent, no state change)
  - [x] 12.5 **Claim victory receive test**: Receive `claim-victory` message from opponent → verify lifecycle becomes `'ended'`, writes result with `status='timeout'`, `winner=opponentColor`, `onGameEnd` fires with `isLocalPlayerWinner: false`
  - [x] 12.6 **Claim victory idempotency test**: Receive `claim-victory` message when `lifecycle === 'ended'` → verify no double-write, no error
  - [x] 12.7 **PGN timeout test**: Verify PGN includes `Termination: time forfeit` header and `Result` header set correctly on timeout
  - [x] 12.8 **Draw offer + timeout interaction test**: Set `#pendingDrawOffer = true`, simulate opponent clock reaching 0 → verify game ends as draw (`status='draw'`), NOT timeout win
  - [x] 12.9 **Sync resets opponentFlagged test**: Set `opponentFlagged = true`, then process a sync message → verify `opponentFlagged` resets to `false`
  - [x] 12.10 **Lifecycle guard test**: Trigger clock timeout when `lifecycle !== 'playing'` → verify no action taken

## Dev Notes

### Critical: This Story EXTENDS OnlineGameSession — Do NOT Rewrite

Stories 5.1-5.4 built the complete online session system. This story adds clock timeout detection and claim victory to the EXISTING classes. The composition pattern, core/wrapper split, and message handling architecture remain unchanged.

### What Already Exists (from Stories 5.1-5.4) — DO NOT Recreate

| Feature | Location | Status |
|---------|----------|--------|
| `OnlineGameSessionCore` class | `online-session-core.ts` | Complete — extend, not replace |
| `OnlineGameSession` reactive wrapper | `online-session.svelte.ts` | Complete — extend, not replace |
| `ChessClockState` with `onTimeout` callback | `clock.svelte.ts:36,89-91,207-211` | Already fires timeout callback with loser ClockColor |
| `GameMessage` type with `claim-victory` | `messages.ts:22` | Already defined: `{ event: 'claim-victory', senderId: string }` |
| `isGameMessage()` guard | `messages.ts:92` | Already validates `claim-victory` event type |
| `#handleGameMessage` switch | `online-session-core.ts:272-306` | Add `case 'claim-victory'` |
| `#writeGameResult()` | `online-session-core.ts:653-705` | Reuse — add `timeout` termination string |
| `#checkGameEnd()` pattern | `online-session-core.ts:588-634` | Reference for lifecycle transition pattern |
| `#handleResignMessage()` pattern | `online-session-core.ts:636-651` | Reference for receiving game-end messages |
| `resign()` pattern | `online-session-core.ts:184-205` | Reference for sending game-end messages |
| `GameEndResult` type | `online-session-core.ts:25-30` | Reuse — status, winner, resultReason, isLocalPlayerWinner |
| `GameResultBanner.svelte` | `$lib/components/GameResultBanner.svelte` | Add `timeout` case to reasonText switch |
| DB `games.status` column | `004_games.sql:8` | Already includes `'timeout'` in CHECK constraint |
| `Lifecycle` type with `'ended'` | `online-session-core.ts:10` | Reuse |
| `sendGameMessage` | `messages.ts:112-129` | Reuse |
| Resign button + dialog pattern | `+page.svelte:213-248` | Reference for Claim Victory button placement |

### Clock Timeout Detection — How It Works

The `ChessClockState` already has complete timeout detection:

```
1. Clock ticks every 100ms (setInterval)
2. #updateTime() calculates elapsed via Date.now() delta
3. When time reaches 0: #handleTimeout(loser) fires
4. Sets status = 'timeout', stops interval
5. Calls onTimeout callback with loser's ClockColor ('r' or 'b')
```

The clock handles background tabs via `visibilitychange` — on tab return, it recalculates elapsed time from the delta and applies it in one update. This means timeout can fire even in background tabs.

### Claim Victory Flow (NOT Auto-Forfeit)

Per architecture: "When opponent's clock reaches 0, show a Claim Victory button. The player must actively click it, which sends `{ event: 'claim-victory' }` and writes `status = 'timeout'` to the DB. This avoids race conditions from auto-forfeit and gives the disconnected player maximum reconnection time."

```
Opponent's clock hits 0:
1. ChessClockState.onTimeout fires with opponent's ClockColor
2. OnlineGameSessionCore.#handleClockTimeout():
   a. loser !== my color → it's the opponent → set #opponentFlagged = true
   b. #notifyStateChange() → UI re-renders
3. Page shows "Claim Victory" button (reactive via opponentFlagged getter)
4. Player clicks "Claim Victory":
   a. claimVictory() → sends claim-victory message
   b. lifecycle = 'ended', writes result, fires onGameEnd
5. Opponent receives claim-victory message:
   a. #handleClaimVictoryMessage() → lifecycle = 'ended', writes result
```

```
Own clock hits 0:
1. ChessClockState.onTimeout fires with my ClockColor
2. OnlineGameSessionCore.#handleClockTimeout():
   a. loser === my color → do NOTHING
   b. Game continues until opponent claims
3. Opponent's client will show Claim Victory button on their side
```

### Draw Offer + Timeout Interaction Rule (AC: 3)

Per architecture: "If a draw offer is pending and the offering player's opponent flags (clock hits 0), the game result is draw (not timeout win)."

Story 5.7 implements draw offers fully. This story adds a `#pendingDrawOffer` field (defaults to `false`) and a `setPendingDrawOffer()` method. When opponent's clock times out AND `#pendingDrawOffer === true`, the game ends as a draw instead of showing Claim Victory. Story 5.7 will wire `setPendingDrawOffer(true)` when a draw offer arrives and `setPendingDrawOffer(false)` when it's declined/expired.

### Optimistic Concurrency for Timeout Result

Same pattern as Story 5.4. Both clients may attempt to write the timeout result. The `WHERE status = 'started'` clause ensures only one write succeeds:

```typescript
await this.#supabase
  .from('games')
  .update({ status: 'timeout', winner, result_reason: 'timeout', pgn, ended_at }, { count: 'exact' })
  .eq('id', this.gameId)
  .eq('status', 'started');
```

### What NOT To Do

- Do NOT implement auto-forfeit on timeout — Claim Victory is manual (architecture decision)
- Do NOT implement draw offers — that's Story 5.7 (only add the `#pendingDrawOffer` stub field)
- Do NOT implement dispute handling — that's Story 5.6
- Do NOT implement rematch — that's Story 5.7
- Do NOT create database migrations — `'timeout'` is already in the `games.status` CHECK constraint
- Do NOT rewrite `OnlineGameSessionCore` — extend it
- Do NOT modify `ChessClockState` — timeout detection already works perfectly
- Do NOT modify `messages.ts` — `claim-victory` type and validation already exist
- Do NOT add clock critical state CSS (red under 30s) — that's a UX enhancement not in this story's scope
- Do NOT handle `draw-offer`, `draw-accept`, `draw-decline`, `dispute`, `rematch*` message types — later stories

### Architecture Constraints (Inherited from 5.2-5.4)

- **Svelte 5 runes only** — `$state`, `$derived`, `$effect`. Never Svelte 4 stores.
- **`.svelte.ts` extension** for files using runes.
- **`$lib/` import alias** — never relative `../../../` paths.
- **Co-located tests** as `filename.test.ts`.
- **i18n required** — all user-facing strings in both `en` and `vi`.
- **Use existing `logger`** from `@cotulenh/common` — never raw `console.log`.
- **Use `isGameMessage()` guard** from `$lib/game/messages.ts`.
- **Check Supabase `{ data, error }` returns** — never assume success.
- **Use typed `GameMessage`** for all broadcast payloads — no raw objects.
- **Core/wrapper split** — plain logic in `.ts`, runes in `.svelte.ts`.

### Dependencies & Imports (No New Packages)

All dependencies are already installed:
- `@supabase/supabase-js` — `SupabaseClient`, `RealtimeChannel`
- `@cotulenh/common` — `logger`
- `$lib/game/messages.ts` — `sendGameMessage`, `onGameMessage`, `isGameMessage`, `GameMessage`
- `$lib/clock/clock.svelte.ts` — `ChessClockState`, `ClockColor`
- `$lib/game/online-session-core.ts` — `OnlineGameSessionCore`
- `$lib/game/online-session.svelte.ts` — `OnlineGameSession`
- `$lib/components/ui/dialog/` — existing dialog components (NOT needed for Claim Victory — no confirmation needed)
- `svelte-sonner` — `toast` for notifications (if needed)

### Previous Story (5.4) Learnings

- **Composition pattern is critical**: `OnlineGameSession` composes `GameSession`. All game logic flows through GameSession. Do NOT bypass it.
- **Core/wrapper split works well**: Keep all logic in `online-session-core.ts`, reactivity wrapper in `online-session.svelte.ts`.
- **sendGameMessage catches errors**: Safe to call without try/catch.
- **Lifecycle idempotency matters**: Always check `if (this.#lifecycle === 'ended') return` at the start of game-end handlers.
- **Tests use fake timers**: `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync()` — essential for testing clock timeout.
- **Mock pattern**: `createMockSupabase()` with `simulateGameMessage()` helpers.
- **Code review found lifecycle deadlocks**: Be very careful with lifecycle state transitions. Ensure no double-transitions.
- **PGN type assertion needed**: Core engine accepts `clocks` but interface type doesn't expose it. Use: `(game as unknown as { pgn(opts: { clocks?: string[] }): string }).pgn({ clocks: this.#clockAnnotations })`
- **Optimistic concurrency count**: Use `{ count: 'exact' }` option on Supabase update to detect if other client wrote first.

### Project Structure Notes

- `$lib/game/` directory: `messages.ts`, `lag-tracker.ts`, `online-session-core.ts`, `online-session-core.test.ts`, `online-session.svelte.ts`
- `$lib/clock/` directory: `clock.svelte.ts`, `clock.test.ts`
- `$lib/components/`: `GameResultBanner.svelte`, `ReconnectBanner.svelte`
- i18n files: `$lib/i18n/locales/en.ts`, `$lib/i18n/locales/vi.ts`, `$lib/i18n/types.ts`
- Game page: `src/routes/play/online/[gameId]/+page.svelte`

### File Locations

| File | Action | Purpose |
|------|--------|---------|
| `apps/cotulenh/app/src/lib/game/online-session-core.ts` | MODIFY | Add clock timeout handler, claimVictory(), claim-victory message handler, opponentFlagged getter, pendingDrawOffer stub |
| `apps/cotulenh/app/src/lib/game/online-session.svelte.ts` | MODIFY | Expose claimVictory(), opponentFlagged reactive getter |
| `apps/cotulenh/app/src/lib/game/online-session-core.test.ts` | MODIFY | Tests for clock timeout, claim victory send/receive, guards, draw+timeout interaction |
| `apps/cotulenh/app/src/lib/components/GameResultBanner.svelte` | MODIFY | Add `timeout` case to reasonText switch |
| `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte` | MODIFY | Add Claim Victory button (when opponentFlagged), hide resign when flagged |
| `apps/cotulenh/app/src/lib/i18n/types.ts` | MODIFY | Add `game.claimVictory`, `game.resultTimeout` key types |
| `apps/cotulenh/app/src/lib/i18n/locales/en.ts` | MODIFY | Add English translations |
| `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` | MODIFY | Add Vietnamese translations |

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Claim Victory architecture decision, Lines 210]
- [Source: _bmad-output/planning-artifacts/architecture.md — Draw offer + timeout interaction, Lines 211]
- [Source: _bmad-output/planning-artifacts/architecture.md — Clock synchronization & lag compensation, Lines 223-236]
- [Source: _bmad-output/planning-artifacts/architecture.md — GameMessage type (claim-victory), Lines 467]
- [Source: _bmad-output/planning-artifacts/architecture.md — Game lifecycle states, Lines 195-200]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 5.5, Lines 879-903]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — ChessClock component states, Lines 876-883]
- [Source: _bmad-output/planning-artifacts/prd.md — FR32 (clock enforcement), Line 368]
- [Source: _bmad-output/implementation-artifacts/5-4-game-end-conditions-result-recording.md — Previous story learnings]
- [Source: apps/cotulenh/app/src/lib/clock/clock.svelte.ts — Clock timeout detection, Lines 207-211]
- [Source: apps/cotulenh/app/src/lib/game/messages.ts — claim-victory message type, Line 22]
- [Source: supabase/migrations/004_games.sql — games.status CHECK includes 'timeout']

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed sync test: `isGameMessage()` validator requires `seq > 0` (positive integer), used `seq: 1` instead of `seq: 0`

### Completion Notes List

- Task 1: Wired `clock.onTimeout` callback in constructor, added `#opponentFlagged` field, implemented `#handleClockTimeout()` with lifecycle guard, own-clock-do-nothing logic, and opponent-flagged state change notification
- Task 2: Implemented `claimVictory()` public method with channel/lifecycle/flag guards, sends `claim-victory` message, ends game with `status: 'timeout'`, writes DB result
- Task 3: Added `case 'claim-victory'` to `#handleGameMessage` switch, implemented `#handleClaimVictoryMessage()` with idempotency guard
- Task 4: Added `case 'timeout': terminationString = 'time forfeit'` to PGN termination mapping, added timeout Result header setting
- Task 5: Exposed `get opponentFlagged(): boolean` getter on core
- Task 6: Added `claimVictory()` proxy and reactive `opponentFlagged` getter to `OnlineGameSession` wrapper
- Task 7: Added `opponentFlagged` derived variable, "Claim Victory" button with green pulsing style, conditionally hides resign button when flagged
- Task 8: Added `case 'timeout'` to `GameResultBanner` reasonText switch
- Task 9: Added `game.claimVictory` and `game.resultTimeout` i18n keys to types.ts, en.ts, vi.ts
- Task 10: Reset `#opponentFlagged = false` in `#handleSync` method
- Task 11: Added `#pendingDrawOffer` field (defaults false), draw-timeout interaction in `#handleClockTimeout`, `setPendingDrawOffer()` public method for Story 5.7
- Task 12: Wrote 10 tests covering all ACs: opponent timeout, own timeout, claim victory send/receive/guard/idempotency, PGN headers, draw+timeout interaction, sync reset, lifecycle guard
- Post-review hardening: Added receiver-side guard to ignore `claim-victory` unless local clock is actually flagged, blocked post-timeout local move broadcasts, and made board read-only when clock is no longer running
- Added regression tests for: forged early `claim-victory` rejection and no move broadcast after own timeout

### Senior Developer Review (AI)

- Outcome: **Changes Requested** (resolved in this pass)
- High issue fixed: `claim-victory` was previously accepted without validating local timeout state. Added guard in `#handleClaimVictoryMessage()` to reject premature claims.
- High issue fixed: local player could still attempt moves after own timeout, causing inconsistent local state vs networked clock semantics. Added timeout guard in move broadcast path and UI-level read-only gating when `clockStatus !== 'running'`.
- Medium issue fixed: test coverage gap for adversarial timeout flows. Added targeted tests for premature claim rejection and post-timeout move broadcast suppression.

### Change Log

- 2026-03-03: Implemented clock timeout detection and claim victory feature (Story 5.5) — all 12 tasks complete, 10 new tests added (71 total), 499 tests pass across full suite
- 2026-03-03: Senior review fixes applied — hardened claim-victory validation, timeout move gating, and added 2 regression tests (online-session-core: 73 tests passing)

### File List

- `apps/cotulenh/app/src/lib/game/online-session-core.ts` — MODIFIED: Added #opponentFlagged, #pendingDrawOffer fields; clock.onTimeout wiring; #handleClockTimeout(), claimVictory(), #handleClaimVictoryMessage(), setPendingDrawOffer() methods; opponentFlagged getter; timeout termination string + Result header in #writeGameResult; claim-victory case in #handleGameMessage switch; #opponentFlagged reset in #handleSync
- `apps/cotulenh/app/src/lib/game/online-session.svelte.ts` — MODIFIED: Added opponentFlagged reactive getter, claimVictory() proxy method
- `apps/cotulenh/app/src/lib/game/online-session-core.test.ts` — MODIFIED: Added 10 new tests in "clock timeout and claim victory" describe block
- `apps/cotulenh/app/src/lib/components/GameResultBanner.svelte` — MODIFIED: Added timeout case to reasonText switch
- `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte` — MODIFIED: Added opponentFlagged derived, Claim Victory button with pulsing green style, conditional resign/claim-victory toggle
- `apps/cotulenh/app/src/lib/i18n/types.ts` — MODIFIED: Added game.claimVictory, game.resultTimeout keys
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` — MODIFIED: Added English translations for claimVictory and resultTimeout
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — MODIFIED: Added Vietnamese translations for claimVictory and resultTimeout
