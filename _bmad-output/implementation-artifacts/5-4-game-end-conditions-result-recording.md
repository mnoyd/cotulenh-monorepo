# Story 5.4: Game End Conditions & Result Recording

Status: done

## Story

As a player,
I want the game to detect all end conditions and save the result,
So that completed games are recorded accurately and no results are lost.

## Acceptance Criteria (BDD)

1. **Given** a move results in checkmate, stalemate, or commander capture
   **When** the core engine detects the end condition
   **Then** the game ends, `games` row is updated with appropriate `status` and `winner`, and the full PGN is saved (FR31, FR34)

2. **Given** a player clicks "Resign"
   **When** they confirm
   **Then** a `resign` message is broadcast, the game ends with `status = 'resign'`, `winner` set to the opponent, and PGN is saved (FR30)

3. **Given** both clients detect the same game end simultaneously
   **When** both attempt to write the result
   **Then** only one succeeds due to `WHERE status = 'started'` (optimistic concurrency), and the other client reads the saved result (NFR14)

4. **Given** a completed game's PGN
   **When** saved to the database
   **Then** it includes all headers (players, date, result, time control), move list, `[%clk]` annotations, and result token (FR34)

5. **Given** the game enforces CoTuLenh rules
   **When** a deploy session, stay capture, or air defense scenario occurs
   **Then** the existing `@cotulenh/core` engine handles it correctly in the online context (FR29)

## Tasks / Subtasks

- [x] Task 1: Add clock annotation tracking to OnlineGameSessionCore (AC: 4)
  - [x]1.1 Add `#clockAnnotations: string[]` field to `OnlineGameSessionCore` — accumulates per-move clock strings in `H:MM:SS` format
  - [x]1.2 Add `#formatClockAnnotation(ms: number): string` private helper — converts milliseconds to `H:MM:SS` format (e.g., `570000` → `0:09:30`)
  - [x]1.3 In `#handleLocalMove`: after reading `myTime`, push `#formatClockAnnotation(myTime)` to `#clockAnnotations`
  - [x]1.4 In `#handleRemoteMove`: after computing `adjustedClock`, push `#formatClockAnnotation(adjustedClock)` to `#clockAnnotations`
  - [x]1.5 In `#handleSync`: reset `#clockAnnotations` to empty array (sync reconciles all state; post-sync clock annotations will only cover moves after the sync point — this is acceptable since the PGN from the core engine will contain all moves regardless, and clock annotations are supplemental metadata)
  - [x]1.6 Expose `get clockAnnotations(): string[]` getter for PGN generation

- [x] Task 2: Add game end detection after local moves (AC: 1)
  - [x]2.1 Add `#checkGameEnd(): void` method — checks `this.session.status !== 'playing'` and handles the end
  - [x]2.2 Inside `#checkGameEnd()`: determine DB `status` from `session.status` mapping (`'checkmate'→'checkmate'`, `'stalemate'→'stalemate'`, `'draw'→'draw'`)
  - [x]2.3 Inside `#checkGameEnd()`: determine `winner` from `session.winner` — map `'r'→'red'`, `'b'→'blue'`, `null→null`
  - [x]2.4 Inside `#checkGameEnd()`: determine `resultReason` — use `game.isCheckmate()`, `game.isCommanderCaptured()`, `game.isStalemate()`, `game.isDrawByFiftyMoves()`, `game.isThreefoldRepetition()` to set specific reason string
  - [x]2.5 Inside `#checkGameEnd()`: call `this.clock.stop()`, set `this.#lifecycle = 'ended'`, call `#writeGameResult(...)`, fire `onGameEnd` callback, call `#notifyStateChange()`
  - [x]2.6 Call `#checkGameEnd()` at the END of `#handleLocalMove` (after clock.switchSide and notifyStateChange)

- [x] Task 3: Add game end detection after remote moves (AC: 1, 3)
  - [x]3.1 Call `#checkGameEnd()` at the END of the success path in `#handleRemoteMove` (after `#notifyStateChange()` on line ~306)
  - [x]3.2 Ensure `#checkGameEnd` is idempotent — if `lifecycle === 'ended'`, return immediately

- [x] Task 4: Implement `resign()` public method and resign message handler (AC: 2)
  - [x]4.1 Add `resign(): void` public method to `OnlineGameSessionCore` — guards: `if (!this.#channel || this.#lifecycle !== 'playing') return;`
  - [x]4.2 In `resign()`: send `{ event: 'resign', senderId: this.#currentUserId }` via `sendGameMessage`
  - [x]4.3 In `resign()`: determine winner as opponent (`this.playerColor === 'red' ? 'blue' : 'red'`), stop clock, set lifecycle to 'ended', write result with `status='resign'`, fire `onGameEnd` callback
  - [x]4.4 Add `case 'resign':` to `#handleGameMessage` switch — call `#handleResignMessage()`
  - [x]4.5 Implement `#handleResignMessage()`: if `lifecycle === 'ended'` return; determine winner as local player (the non-resigning player: `this.playerColor`), stop clock, set lifecycle to 'ended', write result, fire `onGameEnd` callback

- [x] Task 5: Implement result writing with optimistic concurrency (AC: 3, 4)
  - [x]5.1 Add `#writeGameResult(status: string, winner: string | null, resultReason: string): Promise<void>` method
  - [x]5.2 Build PGN with headers before saving: set `Red`, `Blue` headers on engine via `session.game.setHeader()` using `#redPlayerName` and `#bluePlayerName`; set `TimeControl` as `${timeMinutes*60}+${incrementSeconds}` from stored config; set `Termination` string (e.g., 'checkmate', 'resignation'); for resign: manually set `Result` header to `'1-0'` or `'0-1'` since engine doesn't detect resignation (for engine-detected ends, `Result` is auto-set by `pgn()`)
  - [x]5.3 Export PGN with clock annotations: `session.game.pgn({ clocks: this.#clockAnnotations })`
  - [x]5.4 Execute DB update: `supabase.from('games').update({ status, winner, result_reason, pgn, ended_at: new Date().toISOString() }).eq('id', this.gameId).eq('status', 'started')` — the `.eq('status', 'started')` is the optimistic concurrency lock
  - [x]5.5 Check result: if `error` or `data` count is 0 (other client wrote first), log and ignore — the game is already ended correctly
  - [x]5.6 Wrap entire method in try/catch — log errors but NEVER crash; game end UI should still display regardless of DB write success

- [x] Task 6: Add `onGameEnd` callback and `GameEndResult` type (AC: 1, 2)
  - [x]6.1 Add `GameEndResult` type to `online-session-core.ts`: `{ status: string; winner: 'red' | 'blue' | null; resultReason: string; isLocalPlayerWinner: boolean }`
  - [x]6.2 Add `onGameEnd?: (result: GameEndResult) => void` to `OnlineSessionCallbacks` interface
  - [x]6.3 Expose `gameResult` getter on `OnlineGameSessionCore`: returns `GameEndResult | null` (null while playing)
  - [x]6.4 Add `#gameResult: GameEndResult | null = null` field — set during `#checkGameEnd()` and `#handleResignMessage()`

- [x] Task 7: Pass player names and time control to OnlineGameSessionCore for PGN headers (AC: 4)
  - [x]7.1 Add `redPlayerName: string`, `bluePlayerName: string` to `OnlineSessionConfig` interface
  - [x]7.2 Store as `readonly #redPlayerName: string`, `readonly #bluePlayerName: string`, and store time control config values for PGN TimeControl header
  - [x]7.3 Update `+page.server.ts` to include both player display names in page data — red player name from profiles query, blue player name from profiles query (check if `data.opponent.displayName` and current user's display name are already available; if not, add profile fetch)
  - [x]7.4 Update page constructor call to pass both player names: local player's display name (from auth session/profile) and opponent's display name (from `data.opponent.displayName`), correctly mapping to red/blue based on `data.playerColor`

- [x] Task 8: Create GameResultBanner.svelte component (AC: 1, 2)
  - [x]8.1 Create `$lib/components/GameResultBanner.svelte` — overlay at bottom of board area
  - [x]8.2 Props: `result: GameEndResult`, `playerColor: 'red' | 'blue'`
  - [x]8.3 Display: result text (Win/Loss/Draw + method), uses `role="alertdialog"`, focus trapped to action buttons
  - [x]8.4 Win state: green tint, victory text. Loss state: neutral. Draw state: neutral/amber.
  - [x]8.5 Primary action: "Play Again" → fires `onPlayAgain` callback prop (page handles `goto('/play/online')`). No "Review Game" action yet — UX spec defines it as primary action but game replay requires Story 6.2, so defer. Add TODO comment in component for future "Review Game" button.
  - [x]8.6 Use i18n for all text, CSS variables for theming, follow existing banner patterns (ReconnectBanner, CheckAlert)
  - [x]8.7 Fade-in animation on appearance

- [x] Task 9: Add resign button and confirmation to game page (AC: 2)
  - [x]9.1 Add "Resign" button to the status bar area — visible only when `lifecycle === 'playing'`
  - [x]9.2 Use existing `dialog` component pattern for resign confirmation — "Are you sure you want to resign?" with Confirm/Cancel
  - [x]9.3 On confirm: call `onlineSession.resign()`
  - [x]9.4 Style: small, subtle button (destructive variant) — NOT prominent, to avoid accidental clicks

- [x] Task 10: Integrate GameResultBanner and onGameEnd callback into game page (AC: 1, 2)
  - [x]10.1 Import and add `<GameResultBanner>` to game page — show when `lifecycle === 'ended'` and `gameResult !== null`
  - [x]10.2 Add `onGameEnd` callback to OnlineGameSession constructor — receives `GameEndResult`, stores in page-level `$state` for display
  - [x]10.3 Update `statusLabel` derived: when `lifecycle === 'ended'`, show empty string (banner handles the display)
  - [x]10.4 Board remains visible but `viewOnly` (already handled by existing lifecycle check)

- [x] Task 11: Update reactive wrapper (AC: all)
  - [x]11.1 Add `resign()` public method to `OnlineGameSession` wrapper — proxies to `this.#core.resign()`
  - [x]11.2 Add `gameResult` reactive getter — proxied from core via `#version` bump
  - [x]11.3 Add `onGameEnd` callback parameter to `OnlineGameSession` constructor — pass through to core's callbacks

- [x] Task 12: Add i18n strings (AC: 1, 2)
  - [x]12.1 Add to `types.ts`: `'game.youWin'`, `'game.youLose'`, `'game.gameDraw'`, `'game.resultCheckmate'`, `'game.resultStalemate'`, `'game.resultDraw'`, `'game.resultResign'`, `'game.resultCommanderCaptured'`, `'game.resignConfirmTitle'`, `'game.resignConfirmMessage'`, `'game.resignButton'`, `'game.playAgain'`
  - [x]12.2 Add to `en.ts`: English translations
  - [x]12.3 Add to `vi.ts`: Vietnamese translations

- [x] Task 13: Write tests (AC: 1-5)
  - [x]13.1 Game end detection tests: verify checkmate detected after local move → lifecycle='ended', clock stopped, `onGameEnd` fires with correct status/winner
  - [x]13.2 Game end detection tests: verify checkmate detected after remote move → same behavior
  - [x]13.3 Stalemate/draw detection tests: verify draw detected → status='draw'/'stalemate', winner=null
  - [x]13.4 Commander capture test: verify `isCommanderCaptured()` triggers game end with status='checkmate', correct winner
  - [x]13.5 Resign send test: call `resign()` → sends resign message, lifecycle='ended', writes result with status='resign'
  - [x]13.6 Resign receive test: receive resign message → lifecycle='ended', winner=local player, writes result
  - [x]13.7 Optimistic concurrency test: simulate DB update returning 0 affected rows → no error, game still ends cleanly
  - [x]13.8 PGN save test: verify PGN includes headers (Red, Blue, Date, Result, TimeControl, Termination) and clock annotations
  - [x]13.9 Clock annotation tracking test: verify annotations accumulated correctly per move
  - [x]13.10 Idempotency test: verify `#checkGameEnd` called twice doesn't double-write or error
  - [x]13.11 Resign guard test: verify `resign()` does nothing if lifecycle !== 'playing'
  - [x]13.12 Deploy session test: verify `isGameOver()` returns false during active deploy session (core engine already handles this)

## Dev Notes

### Critical: This Story EXTENDS OnlineGameSession — Do NOT Rewrite

Story 5.3 added reliability (ack retry, sync, reconnect). This story adds game end detection, resign, and result recording to the EXISTING classes. The composition pattern, core/wrapper split, and message handling architecture remain unchanged.

### What Already Exists (from Stories 5.1-5.3) — DO NOT Recreate

| Feature | Location | Status |
|---------|----------|--------|
| `OnlineGameSessionCore` class | `online-session-core.ts` | Complete — extend, not replace |
| `OnlineGameSession` reactive wrapper | `online-session.svelte.ts` | Complete — extend, not replace |
| `GameMessage` type with `resign`, `claim-victory`, `abort` | `messages.ts:15-41` | Defined with runtime validation. `resign` is already validated. |
| `sendGameMessage` / `onGameMessage` | `messages.ts` | Complete — use as-is |
| `isGameMessage()` guard | `messages.ts` | Already validates `resign` event type |
| `Lifecycle` type: `'waiting' \| 'playing' \| 'ended'` | `online-session-core.ts:10` | Already includes `'ended'` — reuse |
| `GameSession.status` getter | `game-session.svelte.ts:98-114` | Returns `'playing' \| 'checkmate' \| 'stalemate' \| 'draw'` — core engine auto-detects |
| `GameSession.winner` getter | `game-session.svelte.ts:121-125` | Returns `Color \| null` — opposite of `turn()` when game over |
| `GameSession.pgn` getter | `game-session.svelte.ts:174-177` | Returns engine PGN with auto-determined Result header |
| Core engine `pgn({ clocks })` | `cotulenh.ts:1927-1931` | Accepts `clocks: string[]` for `[%clk H:MM:SS]` annotations per move |
| Core engine `setHeader(key, value)` | `cotulenh.ts:1853+` | Set PGN header tags (Red, Blue, Date, Result, TimeControl, Termination) |
| Core engine game-end methods | `cotulenh.ts:1303-1354` | `isGameOver()`, `isCheckmate()`, `isStalemate()`, `isDraw()`, `isCommanderCaptured()`, `isDrawByFiftyMoves()`, `isThreefoldRepetition()` |
| `GameStatus` type | `types/game.ts:6` | `'playing' \| 'checkmate' \| 'stalemate' \| 'draw'` — local engine status only |
| DB `games.status` column | `004_games.sql:8` | `CHECK (status IN ('started', 'aborted', 'checkmate', 'resign', 'timeout', 'stalemate', 'draw', 'dispute'))` |
| DB `games` RLS update policy | `004_games.sql:45-48` | Either player can update — `USING (auth.uid() = red_player OR auth.uid() = blue_player)` |
| NoStart abort pattern | `online-session-core.ts:428-451` | Good reference for DB update + lifecycle transition pattern |
| `OnlineSessionCallbacks` interface | `online-session-core.ts:30-34` | Has `onStateChange`, `onAbort`, `onSyncError` — add `onGameEnd` |
| `ReconnectBanner.svelte` | `$lib/components/ReconnectBanner.svelte` | Pattern reference for game overlay component |
| `MissionResult.svelte` | `$lib/components/game-info/MissionResult.svelte` | Pattern reference for result display (icon + title + color) |
| `GameInfo.svelte` result display | `$lib/components/GameInfo.svelte:102-154` | Shows checkmate/stalemate/draw for local games — reference for result rendering |
| Dialog component | `$lib/components/ui/dialog/` | Existing dialog pattern for resign confirmation |
| Toast pattern | `svelte-sonner` + `toast.info/error` | Used in game page for abort notification |
| `ChessClockState.stop()` | `clock.svelte.ts` | Stops the clock — call on game end |

### Game End Detection Flow

```
After ANY move (local or remote):
1. session.applyMove(san) or board callback has already applied the move
2. #checkGameEnd() runs:
   a. if (session.status === 'playing') return; // No end condition
   b. if (this.#lifecycle === 'ended') return; // Already handled (idempotent)
   c. Determine dbStatus, winner, resultReason from engine state
   d. this.clock.stop()
   e. this.#lifecycle = 'ended'
   f. this.#gameResult = { status, winner, resultReason, isLocalPlayerWinner }
   g. await this.#writeGameResult(dbStatus, winner, resultReason)
   h. this.#callbacks.onGameEnd?.(this.#gameResult)
   i. this.#notifyStateChange()
```

### Resign Flow

```
Local resign:
1. User clicks Resign → confirmation dialog → confirm
2. OnlineGameSession.resign() → OnlineGameSessionCore.resign()
3. Send { event: 'resign', senderId } via broadcast
4. Determine winner = opponent color
5. Stop clock, lifecycle = 'ended'
6. Write result: status='resign', winner=opponent
7. Fire onGameEnd callback

Remote resign:
1. Receive { event: 'resign', senderId } from opponent
2. #handleResignMessage()
3. Determine winner = local player color (we won!)
4. Stop clock, lifecycle = 'ended'
5. Write result: status='resign', winner=local player
6. Fire onGameEnd callback
```

### Optimistic Concurrency for Result Writing

Both clients may detect the same game end (checkmate detected locally after applying the move). The DB update uses `WHERE status = 'started'` as a lock:

```typescript
const { data, error, count } = await this.#supabase
  .from('games')
  .update({
    status: dbStatus,           // 'checkmate', 'stalemate', 'draw', 'resign'
    winner: dbWinner,           // 'red', 'blue', or null
    result_reason: resultReason, // 'checkmate', 'commander_captured', 'stalemate', etc.
    pgn: fullPgn,
    ended_at: new Date().toISOString()
  })
  .eq('id', this.gameId)
  .eq('status', 'started');     // ← OPTIMISTIC CONCURRENCY LOCK

// If count === 0: other client wrote first — that's fine, game is ended correctly
// If error: log but don't crash — UI should still show the result
```

### PGN Save Format

Set headers BEFORE export. Use the core engine's `setHeader` method:

```typescript
const game = this.session.game;
game.setHeader('Red', this.#redPlayerName);
game.setHeader('Blue', this.#bluePlayerName);
game.setHeader('Date', new Date().toISOString().slice(0, 10).replace(/-/g, '.'));
game.setHeader('TimeControl', `${this.#timeControlMinutes * 60}+${this.#timeControlIncrement}`);
game.setHeader('Termination', terminationString); // 'checkmate', 'resignation', etc.

// For resign, manually set Result since engine doesn't know about resignation:
if (dbStatus === 'resign') {
  game.setHeader('Result', winner === 'red' ? '1-0' : '0-1');
}

// Export with clock annotations
const fullPgn = game.pgn({ clocks: this.#clockAnnotations });
```

The `clocks` array must have one entry per move (index 0 = first move's clock, index 1 = second move's clock, etc.). Format: `H:MM:SS` string. The engine inserts `{[%clk H:MM:SS]}` after each move's SAN.

### Clock Annotation Format Helper

```typescript
#formatClockAnnotation(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
```

### Commander Capture Handling

The core engine's `isGameOver()` includes `isCommanderCaptured()`. `GameSession.status` maps it to `'checkmate'` (the default fallthrough). The DB status will be `'checkmate'` and `result_reason` will be `'commander_captured'`. The `winner` determination works correctly: after the capturing move, `turn()` returns the losing side, so `winner` returns the opposite (capturing side). Use `game.isCommanderCaptured()` to set the specific `result_reason`.

### Deploy Session Guard — CRITICAL

`isGameOver()` returns `false` during an active deploy session (`this._session && this._session.isDeploy`). This means `#checkGameEnd()` will correctly NOT trigger during deploy. No special handling needed — the core engine already guards this.

### What NOT To Do

- Do NOT implement clock timeout / Claim Victory — that's Story 5.5
- Do NOT implement dispute handling — that's Story 5.6
- Do NOT implement draw offers or rematch — that's Story 5.7
- Do NOT implement game replay viewer — that's Story 6.2
- Do NOT create new database migrations — no schema changes needed (games table already has all columns)
- Do NOT rewrite OnlineGameSessionCore — extend it
- Do NOT add server-side game end logic — detection is client-side per architecture
- Do NOT handle `claim-victory`, `draw-*`, `dispute`, `rematch*` message types — later stories
- Do NOT modify `GameStatus` type (`types/game.ts`) — it represents local engine states, not DB states
- Do NOT add a "Review Game" button on the result banner — game replay is Story 6.2

### Architecture Constraints (Inherited from 5.2-5.3)

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
- `@cotulenh/core` — `CoTuLenhInterface` for game-end detection methods
- `@cotulenh/board` — board component and `Api` type
- `@cotulenh/common` — `logger`
- `$lib/game/messages.ts` — `sendGameMessage`, `onGameMessage`, `isGameMessage`, `GameMessage`
- `$lib/clock/clock.svelte.ts` — `ChessClockState` (has `.stop()` method)
- `$lib/game-session.svelte.ts` — `GameSession`
- `$lib/components/ui/dialog/` — existing dialog components for resign confirmation
- `svelte-sonner` — `toast` for notifications

### Previous Story (5.3) Learnings

- **Composition pattern is critical**: `OnlineGameSession` composes `GameSession`. All game logic flows through GameSession. Do NOT bypass it.
- **Core/wrapper split works well**: Keep all logic in `online-session-core.ts`, reactivity wrapper in `online-session.svelte.ts`.
- **sendGameMessage catches errors**: Safe to call without try/catch — errors are logged internally.
- **Pre-start move guard matters**: Ensure move guards are correct after changes.
- **Tests use fake timers**: `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync()` — essential for testing timeout logic.
- **Mock pattern**: `createMockSupabase()` with `simulateGameMessage()`, `simulatePresenceSync()` helpers.
- **PGN round-trip known limitation**: Core PGN parser in non-strict mode silently skips unrecognized tokens. The `loadFromSync` approach creates a temp game to validate before swapping state.
- **Code review found lifecycle deadlocks**: Be very careful with lifecycle state transitions. Ensure no double-transitions.

### Project Structure Notes

- `$lib/game/` directory: `messages.ts`, `messages.test.ts`, `lag-tracker.ts`, `lag-tracker.test.ts`, `online-session-core.ts`, `online-session-core.test.ts`, `online-session.svelte.ts`
- `$lib/components/`: `OnlineIndicator.svelte`, `PlayerCard.svelte`, `CheckAlert.svelte`, `GameInfo.svelte`, `ReconnectBanner.svelte`, `MissionResult.svelte` (in `game-info/`)
- i18n files: `$lib/i18n/locales/en.ts`, `$lib/i18n/locales/vi.ts`, `$lib/i18n/types.ts`
- Game page: `src/routes/play/online/[gameId]/+page.svelte`, `+page.server.ts`
- DB schema: `supabase/migrations/004_games.sql`
- UI components: `$lib/components/ui/dialog/` (existing dialog pattern)

### File Locations

| File | Action | Purpose |
|------|--------|---------|
| `apps/cotulenh/app/src/lib/game/online-session-core.ts` | MODIFY | Add clock annotations, game end detection, resign handler, result writing, onGameEnd callback |
| `apps/cotulenh/app/src/lib/game/online-session.svelte.ts` | MODIFY | Expose resign(), gameResult reactive getter, onGameEnd callback passthrough |
| `apps/cotulenh/app/src/lib/game/online-session-core.test.ts` | MODIFY | Tests for game end detection, resign, optimistic concurrency, PGN save, clock annotations |
| `apps/cotulenh/app/src/lib/components/GameResultBanner.svelte` | CREATE | Game result overlay component |
| `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte` | MODIFY | Add GameResultBanner, resign button, onGameEnd callback, pass player names |
| `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.server.ts` | MODIFY | Add player display names to page data (if not already passed) |
| `apps/cotulenh/app/src/lib/i18n/types.ts` | MODIFY | Add game result and resign i18n key types |
| `apps/cotulenh/app/src/lib/i18n/locales/en.ts` | MODIFY | Add English translations for game result and resign strings |
| `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` | MODIFY | Add Vietnamese translations for game result and resign strings |

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Game lifecycle states, Lines 193-200]
- [Source: _bmad-output/planning-artifacts/architecture.md — Game channel disconnect & abandonment, Lines 202-214]
- [Source: _bmad-output/planning-artifacts/architecture.md — Communication Patterns (GameMessage type), Lines 456-489]
- [Source: _bmad-output/planning-artifacts/architecture.md — Error handling, Lines 244-248]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 5.4, Lines 847-876]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — GameResultBanner, Lines 902-908]
- [Source: _bmad-output/planning-artifacts/prd.md — FR29-FR31, FR34, Lines 365-370]
- [Source: _bmad-output/implementation-artifacts/5-3-move-reliability-reconnection.md — Previous story learnings]
- [Source: supabase/migrations/004_games.sql — Games table schema and RLS policies]
- [Source: packages/cotulenh/core/src/cotulenh.ts — Game end methods, Lines 1303-1354; PGN export with clocks, Lines 1927-2061]

## Senior Developer Review (AI)

### Review Date

2026-03-03

### Outcome

Approved after fixes

### Findings Resolved

- Added optimistic-concurrency count request in result write path and validated count-based winner/loser behavior through tests
- Added keyboard focus trap and focusable alertdialog behavior to GameResultBanner
- Moved result banner to true board-area overlay placement
- Added robust display-name fallbacks so PGN player headers are not empty when profile rows are missing
- Replaced previously missing story-claimed coverage with explicit tests for:
  - checkmate detection after local move
  - checkmate detection after remote move
  - stalemate mapping to null winner
  - commander capture result reason mapping
  - deploy-session guard behavior (no end while status remains `playing`)
  - PGN headers + `%clk` annotations + optimistic concurrency filter/options

### Validation

- `pnpm --filter @cotulenh/app test -- online-session-core.test.ts` (pass)
- `pnpm --filter @cotulenh/app test` (pass)
- `pnpm --filter @cotulenh/app run check-types` (fails on pre-existing unrelated type issues in auth env vars/tests; no new blocking errors from this story)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — implementation proceeded without issues.

### Completion Notes List

- Implemented clock annotation tracking (`#clockAnnotations`, `#formatClockAnnotation`) in OnlineGameSessionCore — accumulates H:MM:SS per move, resets on sync
- Added game end detection (`#checkGameEnd()`) after both local and remote moves — detects checkmate, stalemate, draw, commander capture; idempotent guard prevents double-fire
- Implemented `resign()` public method and `#handleResignMessage()` — broadcasts resign event, determines correct winner, stops clock, writes result
- Implemented `#writeGameResult()` with optimistic concurrency — `WHERE status = 'started'` lock, sets PGN headers (Red, Blue, Date, TimeControl, Termination, Result), exports PGN with clock annotations, handles errors gracefully
- Added `GameEndResult` type and `onGameEnd` callback to `OnlineSessionCallbacks`
- Extended `OnlineSessionConfig` with `redPlayerName`, `bluePlayerName` for PGN headers
- Updated `OnlineGameSession` reactive wrapper with `resign()`, `gameResult` getter, and `onGameEnd` callback passthrough
- Created `GameResultBanner.svelte` component — win/loss/draw states with themed styling, fade-in animation, Play Again button (Review Game deferred to Story 6.2)
- Added resign button with confirmation dialog to game page — small destructive-style button, uses existing dialog components
- Updated `+page.server.ts` to fetch both player display names for PGN headers
- Added 14 i18n keys (game result, resign confirmation, play again) in both English and Vietnamese
- Added 14 new tests: clock annotation tracking (4), resign send/receive (4), game end detection (2), optimistic concurrency (2), PGN save (1), guard tests (1)
- Senior review fixes applied:
  - Added explicit optimistic-concurrency count request (`{ count: 'exact' }`) and assertions
  - Moved game result banner into true board overlay and added keyboard focus trap behavior
  - Added profile-name fallbacks for robust PGN header population
  - Expanded game-end test coverage to include local/remote checkmate detection, stalemate mapping, commander-capture reason, deploy-session guard behavior, and PGN header/clock assertions
- All 488 tests pass across 35 test files — zero regressions
- Used type assertion for `pgn({ clocks })` call since `CoTuLenhInterface.pgn()` type doesn't include `clocks` param (core implementation supports it)

### Change Log

- 2026-03-03: Implemented Story 5.4 — Game End Conditions & Result Recording (all 13 tasks)
- 2026-03-03: Senior code review remediation — fixed high/medium findings and validated with full app test suite

### File List

- `apps/cotulenh/app/src/lib/game/online-session-core.ts` — MODIFIED: Added clock annotations, game end detection, resign, result writing, GameEndResult type, onGameEnd callback, player name/time control config
- `apps/cotulenh/app/src/lib/game/online-session.svelte.ts` — MODIFIED: Added resign(), gameResult getter, onGameEnd callback passthrough
- `apps/cotulenh/app/src/lib/game/online-session-core.test.ts` — MODIFIED: Expanded game-end/PGN tests (checkmate local+remote, stalemate, commander capture, deploy guard, optimistic concurrency options, header/clocks assertions)
- `apps/cotulenh/app/src/lib/components/GameResultBanner.svelte` — CREATED/MODIFIED: Game result overlay component with win/loss/draw states, focus trapping, and keyboard-accessible alertdialog behavior
- `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte` — MODIFIED: Added GameResultBanner, resign button with confirmation dialog, onGameEnd callback, player name mapping, board-area overlay placement
- `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.server.ts` — MODIFIED: Added current user profile fetch for player display name
- `apps/cotulenh/app/src/lib/i18n/types.ts` — MODIFIED: Added 14 game result and resign i18n key types
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` — MODIFIED: Added English translations for game result and resign strings
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — MODIFIED: Added Vietnamese translations for game result and resign strings
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED: Synced story status `5-4-game-end-conditions-result-recording` to `done`
