# Story 3.6: Game End Conditions & Result

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want the game to end correctly when checkmate, stalemate, timeout, or draw occurs,
So that the result is recorded accurately and I see the outcome clearly.

## Acceptance Criteria

1. **AC1: Checkmate Detection** — Given a move results in checkmate (via `engine.isCheckmate()` or `engine.isCommanderCaptured()`), when the validate-move Edge Function detects this after applying the move, then the game is completed atomically: `games.status` set to `'checkmate'`, `games.winner` set to the moving player's color, `games.ended_at` set to `now()`, and a `game_end` event is broadcast to both players via the game channel.

2. **AC2: Stalemate Detection** — Given a move results in stalemate (via `engine.isStalemate()`), when the validate-move Edge Function detects this, then the game is completed atomically: `games.status` set to `'stalemate'`, `games.winner` set to `null` (draw), `games.ended_at` set to `now()`, and a `game_end` event is broadcast.

3. **AC3: Draw Detection** — Given the game reaches a draw condition (fifty-move rule via `engine.isDrawByFiftyMoves()`, threefold repetition via `engine.isThreefoldRepetition()`), when the validate-move Edge Function detects this, then the game is completed atomically: `games.status` set to `'draw'`, `games.winner` set to `null`, `games.result_reason` records the specific draw type, `games.ended_at` set, and a `game_end` event is broadcast.

4. **AC4: Timeout Claim** — Given a player's displayed clock reaches zero, when the opponent sends a `timeout_claim` to the server (via a new `claim-timeout` path in validate-move OR a dedicated endpoint), then the server recalculates the clock from `game_states.clocks` + elapsed since `game_states.updated_at`. If the server-side clock is indeed <= 0, the game is completed with `status='timeout'` and `winner` = opponent color. If the server clock is NOT <= 0, a `clock_sync` correction is broadcast instead (no game end).

5. **AC5: Game Result Banner** — Given a game has ended (any terminal status), when the result event is received or game loads in ended state, then a `GameResultBanner` component overlays the board (semi-transparent backdrop, board still visible) showing: the outcome text (win/loss/draw in Vietnamese), the method (checkmate/stalemate/timeout), and action buttons: "Tái đấu" (Rematch, primary — disabled/stub for now, story 3.8), "Ván mới" (New Game — navigates to lobby/home), "Xem lại" (Review — stub for now, story 7.2). On mobile: banner appears above the board (compact). `role="alertdialog"` with focus trapped.

6. **AC6: Game Store End-State Handling** — When a `game_end` broadcast event is received, the game store transitions `phase` to `'ended'`, stores `gameStatus` with the terminal status, stores `winner` color, and stops clock countdown. When loading a game already in terminal status, the store initializes directly into `ended` phase with result data displayed.

7. **AC7: Server-Side Clock Expiry on Move** — When validate-move deducts elapsed time and the moving player's clock drops to <= 0ms BEFORE the move is applied, the move is rejected and the game is completed with `status='timeout'` and the opponent wins. This prevents a player from making a move after their time has expired.

## Tasks / Subtasks

- [x] Task 1: Add game-end detection to validate-move Edge Function (AC: #1, #2, #3, #7)
  - [x] 1.1 After successfully applying a move in the playing phase, check `engine.isGameOver()` on the reconstructed engine
  - [x] 1.2 If `engine.isCheckmate()` or `engine.isCommanderCaptured()`: call `completeGame()` helper with `status='checkmate'`, `winner=movingPlayerColor`
  - [x] 1.3 If `engine.isStalemate()`: call `completeGame()` with `status='stalemate'`, `winner=null`
  - [x] 1.4 If `engine.isDraw()` (fifty-move or threefold): call `completeGame()` with `status='draw'`, `winner=null`, `result_reason` = specific draw type
  - [x] 1.5 Before applying the move: check if moving player's clock <= 0 after deducting elapsed. If so, reject the move and call `completeGame()` with `status='timeout'`, `winner=opponentColor`
  - [x] 1.6 Create `completeGame()` helper function in validate-move that atomically updates `games` table (`status`, `winner`, `result_reason`, `ended_at`) — use a single UPDATE query with service role
  - [x] 1.7 After `completeGame()`, broadcast `game_end` event on the game channel: `{ type: 'game_end', payload: { status, winner, result_reason }, seq }`
  - [x] 1.8 Ensure the normal `move` + `clock_sync` events are STILL broadcast before the `game_end` event (opponent needs to see the final move)
  - [x] 1.9 Write/update Edge Function tests for all end conditions

- [x] Task 2: Add timeout claim handling (AC: #4)
  - [x] 2.1 Add a `timeout_claim` action type to the validate-move Edge Function (or create a small helper in the same function file) — accepts `{ game_id, claiming_color }`
  - [x] 2.2 Validate the claimant is a game participant (JWT check against `games.red_player`/`games.blue_player`)
  - [x] 2.3 Verify game is still `status='started'`
  - [x] 2.4 Load `game_states` and recalculate opponent's clock: `opponent_clock - (Date.now() - updated_at)` for the active player
  - [x] 2.5 If recalculated clock <= 0: call `completeGame()` with `status='timeout'`, `winner=claiming_color`
  - [x] 2.6 If recalculated clock > 0: broadcast `clock_sync` correction and return success (no game end)
  - [x] 2.7 Write tests for timeout claim (valid claim, premature claim, wrong participant)

- [x] Task 3: Create GameResultBanner component (AC: #5)
  - [x] 3.1 Create `apps/cotulenh/web/src/components/game/game-result-banner.tsx`
  - [x] 3.2 Props: `status: GameStatus`, `winner: 'red' | 'blue' | null`, `myColor: 'red' | 'blue'`, `resultReason?: string`, `onNewGame: () => void`
  - [x] 3.3 Display outcome text in Vietnamese: "Bạn thắng!" / "Bạn thua!" / "Hòa!" based on `winner` vs `myColor`
  - [x] 3.4 Display method text: "Chiếu hết" (checkmate), "Hết giờ" (timeout), "Bế tắc" (stalemate), "Hòa" (draw)
  - [x] 3.5 Action buttons: "Tái đấu" (disabled stub), "Ván mới" (calls `onNewGame`), "Xem lại" (disabled stub)
  - [x] 3.6 Overlay styling: semi-transparent backdrop over the board, board still visible behind. Desktop: centered on board. Mobile: above board (compact)
  - [x] 3.7 `role="alertdialog"`, `aria-modal="true"`, focus trapped within banner
  - [x] 3.8 Click outside overlay → dismiss banner (board navigable for review)
  - [x] 3.9 Write tests in `apps/cotulenh/web/src/components/game/__tests__/game-result-banner.test.tsx`

- [x] Task 4: Extend game store for end-state (AC: #6)
  - [x] 4.1 Add `winner: 'red' | 'blue' | null` state field to the game store
  - [x] 4.2 Add `resultReason: string | null` state field
  - [x] 4.3 Create `handleGameEnd(status, winner, resultReason)` action that: sets `gameStatus`, sets `winner`, sets `resultReason`, transitions `phase` to `'ended'`, stops clock countdown (set `clockRunning` false)
  - [x] 4.4 Update `initializeEngine` / `syncFromServerState` to populate `winner` from game data when loading an already-ended game
  - [x] 4.5 Update `reset()` to clear `winner` and `resultReason`
  - [x] 4.6 Write tests in game-store test files for end-state transitions

- [x] Task 5: Handle game_end broadcast event (AC: #6)
  - [x] 5.1 In `use-game-channel.ts`, add handler for `game_end` event type
  - [x] 5.2 On receiving `game_end`: call `handleGameEnd(payload.status, payload.winner, payload.result_reason)` on the game store
  - [x] 5.3 Ensure sequence number tracking works with `game_end` events (gap detection still functions)
  - [x] 5.4 Write tests for `use-game-channel` handling the `game_end` event

- [x] Task 6: Add timeout claim trigger on client (AC: #4)
  - [x] 6.1 In the game store or a helper, detect when opponent's display clock reaches 0 (via `getDisplayClocks()` returning 0)
  - [x] 6.2 When opponent's clock hits 0: call `supabase.functions.invoke('validate-move', { body: { game_id, action: 'timeout_claim', claiming_color: myColor } })` (or equivalent endpoint)
  - [x] 6.3 Debounce/guard: only send one timeout claim per game (use a `timeoutClaimSent` flag)
  - [x] 6.4 Handle response: if game ended, `game_end` broadcast will trigger store update. If clock correction, `clock_sync` broadcast will update clocks.
  - [x] 6.5 Write tests for timeout claim trigger logic

- [x] Task 7: Integrate GameResultBanner into game page (AC: #5, #6)
  - [x] 7.1 In `game-page-client.tsx`, render `<GameResultBanner>` when `phase === 'ended'`
  - [x] 7.2 Pass `status`, `winner`, `myColor`, `resultReason` from game store
  - [x] 7.3 `onNewGame` handler: navigate to home/lobby (use `router.push`)
  - [x] 7.4 Ensure board remains visible and interactive (for reviewing final position) when banner is shown
  - [x] 7.5 Update existing game-page-client tests for the ended phase rendering

- [x] Task 8: Extend GameData types (AC: #6)
  - [x] 8.1 Add `winner: 'red' | 'blue' | null` and `result_reason: string | null` to the `GameData` type in `apps/cotulenh/web/src/lib/types/game.ts`
  - [x] 8.2 Update the game data fetching in game page `page.tsx` to SELECT `winner`, `result_reason`, `ended_at` from `games` table
  - [x] 8.3 Ensure the Supabase generated types are up-to-date or manually extend

- [x] Task 9: Testing & regression (AC: #1-7)
  - [x] 9.1 Edge Function tests: checkmate ends game, stalemate ends game, draw ends game, timeout on move rejects and ends, timeout claim valid/invalid
  - [x] 9.2 Game store tests: `handleGameEnd` transitions, loading ended game, reset clears end state
  - [x] 9.3 Component tests: GameResultBanner renders correctly for win/loss/draw, buttons work, accessibility attributes present
  - [x] 9.4 Integration tests: game-page renders banner on ended phase, use-game-channel processes game_end event
  - [x] 9.5 Run full test suite — all existing tests must pass (401+ tests baseline from story 3.5)

## Dev Notes

### Architecture Patterns & Constraints

- **Server is AUTHORITATIVE** — game end detection happens server-side in validate-move Edge Function, never client-side
- **Atomic game completion** — `games` table update (status, winner, result_reason, ended_at) must be a single atomic UPDATE
- **Vietnamese only** for all user-facing text — no English placeholders
- **No barrel exports** — direct imports only
- **No modals for result** — use overlay on board per UX spec (semi-transparent backdrop, board visible)
- **Inline confirmations** — no modal dialogs (resign/draw/takeback are story 3.7, but design result banner to accommodate future methods)
- **`prefers-reduced-motion`** respected for any animations

### CRITICAL: Existing Infrastructure (DO NOT Reinvent)

Significant game plumbing already exists from stories 3.1-3.5. You MUST extend, not replace:

**Validate-move Edge Function** (`supabase/functions/validate-move/index.ts`):
- Move validation pipeline already works: reconstructs engine from `move_history`, validates proposed move, updates `game_states`, broadcasts `move` + `clock_sync`
- Clock deduction + Fischer increment already implemented in `clock.ts` helper
- Game status pre-check already exists (rejects moves if `status !== 'started'`)
- Concurrency guard via `SELECT ... FOR UPDATE` on `game_states` already exists
- **EXTEND** the post-move success path with game-end detection. Do NOT restructure the existing flow.

**Game store** (`apps/cotulenh/web/src/stores/game-store.ts`):
- `TERMINAL_STATUSES` array already defined: `['aborted', 'checkmate', 'resign', 'timeout', 'stalemate', 'draw', 'dispute']`
- `resolveClientPhase()` already maps terminal statuses to `'ended'` phase
- `syncFromServerState()` already handles phase resolution on reconnect/load
- `clocks`, `syncClocks()`, `getDisplayClocks()`, `activeColor`, `clockRunning` — all exist from story 3.5
- **ADD** `winner`, `resultReason`, `handleGameEnd()` action. Don't touch existing phase resolution logic.

**Game channel hook** (`apps/cotulenh/web/src/hooks/use-game-channel.ts`):
- Handles `deploy_submitted`, `deploy_commit`, `move`, `clock_sync` events
- Sequence tracking and gap detection implemented
- **ADD** `game_end` event handler following the same pattern as existing handlers

**Game page client** (`apps/cotulenh/web/src/components/game/game-page-client.tsx`):
- Layout: PlayerInfoBar (top) → Board → PlayerInfoBar (bottom), right panel for moves
- Phase-based rendering: deploying vs playing layouts
- **ADD** `ended` phase rendering: show `<GameResultBanner>` overlaid on board

**Database**: All needed columns already exist in `games` table (migration 004):
- `status` with CHECK constraint including all terminal values
- `winner` column (nullable, values: 'red', 'blue')
- `result_reason` column (nullable text)
- `ended_at` column (nullable timestamptz)
- **NO new migrations needed**

**Types** (`apps/cotulenh/web/src/lib/types/game.ts`):
- `GameStatus` type already includes all terminal values
- `GameData` type needs `winner` and `result_reason` fields added

### Engine API for Game-End Detection

The `@cotulenh/core` engine provides these methods (all on the `CoTuLenh` class):

```typescript
engine.isGameOver(): boolean    // true if checkmate OR draw OR commander captured
engine.isCheckmate(): boolean   // commander in check + no legal moves
engine.isStalemate(): boolean   // NOT in check + no legal moves
engine.isDraw(): boolean        // fifty-move OR threefold repetition OR stalemate
engine.isDrawByFiftyMoves(): boolean  // halfMoves >= 100
engine.isThreefoldRepetition(): boolean  // position count >= 3
engine.isCommanderCaptured(): boolean  // either commander at index -1
engine.turn(): Color            // current player to move ('r' or 'b')
```

**Important**: After calling `engine.move(san)`, the turn switches. So if red makes a move that causes checkmate, `engine.turn()` will return `'b'` (blue's turn) but `engine.isCheckmate()` returns true — meaning blue is in checkmate and red (the moving player) wins.

### Game-End Detection Logic in validate-move

```typescript
// After engine.move(san) succeeds:
if (engine.isGameOver()) {
  let status: string;
  let winner: 'red' | 'blue' | null = null;
  let resultReason: string | null = null;

  if (engine.isCheckmate() || engine.isCommanderCaptured()) {
    status = 'checkmate';
    winner = playerColor; // the player who just moved wins
  } else if (engine.isStalemate()) {
    status = 'stalemate';
    winner = null;
  } else if (engine.isDrawByFiftyMoves()) {
    status = 'draw';
    resultReason = 'fifty_move_rule';
  } else if (engine.isThreefoldRepetition()) {
    status = 'draw';
    resultReason = 'threefold_repetition';
  }

  // Atomically update games table
  await supabase.from('games').update({
    status, winner, result_reason: resultReason, ended_at: new Date().toISOString()
  }).eq('id', gameId);

  // Broadcast game_end AFTER the move event
  channel.send({ type: 'broadcast', event: 'game_end', payload: { status, winner, result_reason: resultReason } });
}
```

### Clock Timeout on Move Detection

```typescript
// BEFORE applying the move, after clock deduction:
const updatedClocks = applyElapsedAndIncrement({ clocks, playerColor, elapsedMs, incrementSeconds: 0 });
// Check WITHOUT increment first — if clock expired, move is invalid
if ((playerColor === 'red' && updatedClocks.red <= 0) || (playerColor === 'blue' && updatedClocks.blue <= 0)) {
  // Player ran out of time — game over
  await completeGame(supabase, gameId, 'timeout', opponentColor, null);
  // Broadcast game_end (no move event — move was rejected)
  return new Response(JSON.stringify({ error: 'time_expired', code: 'TIME_EXPIRED' }), { status: 409 });
}
// Only THEN apply increment and continue with move validation
```

### Timeout Claim Flow

```
Client detects opponent clock at 0 → sends timeout_claim to server
Server recalculates: opponent_clock = game_states.clocks[opponent] - (now - updated_at)
If clock <= 0 → completeGame(timeout, claimant wins) → broadcast game_end
If clock > 0 → broadcast clock_sync correction → return success (no end)
```

### Broadcast Event Payloads

Existing events (DO NOT modify):
- `move`: `{ type: 'move', payload: { san, fen }, seq }`
- `clock_sync`: `{ type: 'clock_sync', payload: { red, blue }, seq }`

New event to add:
- `game_end`: `{ type: 'game_end', payload: { status, winner, result_reason }, seq }`

### UX Specifications for Game Result Banner

- **Overlay on board**: Semi-transparent backdrop, board visible behind
- **Result text**: "Bạn thắng!" (You win!), "Bạn thua!" (You lose!), "Hòa!" (Draw!)
- **Method text**: "Chiếu hết" (checkmate), "Hết giờ" (timeout), "Bế tắc" (stalemate), "Hòa theo luật 50 nước" (fifty-move), "Hòa do lặp lại 3 lần" (threefold)
- **Actions**: "Tái đấu" (Rematch, primary — stub), "Ván mới" (New Game), "Xem lại" (Review — stub)
- **Desktop**: Centered overlay on board area
- **Mobile**: Banner above board (compact), actions below
- **Click outside**: Dismisses banner, board navigable for position review
- **Accessibility**: `role="alertdialog"`, `aria-modal="true"`, focus trapped
- **No rating display yet** — that's Epic 6 (Glicko-2)

### Previous Story Intelligence (3.5: Chess Clocks & Time Control)

**Key learnings to carry forward:**
- Fixed mock engine missing `turn()` method in tests — include `isGameOver()`, `isCheckmate()`, `isStalemate()`, `isDraw()`, `isCommanderCaptured()` in test mocks
- Realtime event dedupe processes `move` and `clock_sync` sharing same `seq` — `game_end` will need its own seq or share the move's seq (recommend seq = moveSeq + 1 or same seq with distinct event key tracking)
- `lock_game_state_for_update` RPC returns `clocks` and `updated_at` — use these for timeout calculations
- 401 tests passing across 57 files — maintain this baseline
- Variable shadowing in Edge Function caused bugs — use unique names for game-end logic variables
- `getDisplayClocks()` selector computes display values — use this to detect when opponent's clock hits 0 for timeout claim trigger

### Complete-Game Edge Function Decision

Per architecture, `complete-game` is listed as a separate Edge Function. However, for story 3.6, game-end detection happens INSIDE `validate-move` (after each move). Creating a separate `complete-game` function for just the DB update is over-engineering at this stage. Instead:

- **Extract a `completeGame()` helper function** within the validate-move module (or a shared file like `game-end.ts`)
- This helper handles the atomic `games` table update + broadcast
- Story 3.7 (resign/draw) will need this helper too — having it extracted makes it reusable
- If a separate Edge Function is needed later (for cron jobs, disconnect forfeit), the helper can be moved then

### Project Structure Notes

Files to create:
- `apps/cotulenh/web/src/components/game/game-result-banner.tsx`
- `apps/cotulenh/web/src/components/game/__tests__/game-result-banner.test.tsx`
- `supabase/functions/validate-move/game-end.ts` (helper for game completion logic)
- `supabase/functions/validate-move/game-end.test.ts`

Files to modify:
- `supabase/functions/validate-move/index.ts` — add game-end detection after move, add timeout_claim action
- `apps/cotulenh/web/src/stores/game-store.ts` — add `winner`, `resultReason`, `handleGameEnd()` action
- `apps/cotulenh/web/src/hooks/use-game-channel.ts` — add `game_end` event handler
- `apps/cotulenh/web/src/components/game/game-page-client.tsx` — render GameResultBanner on ended phase
- `apps/cotulenh/web/src/lib/types/game.ts` — add `winner`, `result_reason` to GameData
- `apps/cotulenh/web/src/app/(app)/game/[id]/page.tsx` — add `winner`, `result_reason` to SELECT

Files NOT to modify:
- `supabase/functions/validate-move/clock.ts` — clock logic is already complete
- `supabase/migrations/*` — all needed columns already exist
- `apps/cotulenh/web/src/lib/constants/game-config.ts` — no new constants needed
- `apps/cotulenh/web/src/components/game/chess-clock.tsx` — clock component unchanged

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.6]
- [Source: _bmad-output/planning-artifacts/architecture.md — Edge Functions, Game State Machine, Clock Sync Protocol, Disconnect & Forfeit, Complete-Game Edge Function, Database Schemas]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Post-Game Screen, GameResultBanner Component, Inline Confirmations, Modal Philosophy, Responsive Layout]
- [Source: _bmad-output/implementation-artifacts/3-5-chess-clocks-time-control.md — Dev Notes, Previous Story Learnings, Code Review Fixes]
- [Source: packages/cotulenh/core/src/cotulenh.ts — isGameOver, isCheckmate, isStalemate, isDraw, isCommanderCaptured engine API]
- [Source: supabase/functions/validate-move/index.ts — Existing move validation pipeline]
- [Source: supabase/migrations/004_games.sql — games table schema with status/winner/result_reason]
- [Source: apps/cotulenh/web/src/stores/game-store.ts — TERMINAL_STATUSES, resolveClientPhase, existing store shape]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None required.

### Completion Notes List

- Task 1: Created `completeGame()` helper in `game-end.ts` for atomic game completion (DB update + broadcast). Integrated game-end detection into validate-move: checks `isGameOver()` after move application, handles checkmate/commander-captured, stalemate, fifty-move rule, threefold repetition. Added AC7 clock timeout check BEFORE move application.
- Task 2: Added `timeout_claim` action to validate-move Edge Function. Validates claimant is participant, recalculates opponent clock from server state, completes game if expired or broadcasts clock correction.
- Task 3: Created `GameResultBanner` component with Vietnamese text, semi-transparent overlay, action buttons (Rematch disabled stub, New Game active, Review disabled stub), `role="alertdialog"` with focus trapping, click-outside dismissal.
- Task 4: Extended game store with `winner`, `resultReason`, `timeoutClaimSent` fields and `handleGameEnd()` action. Updated `initializeGame` to populate winner/resultReason from game data. Updated `reset()` to clear new fields.
- Task 5: Added `game_end` event handler to `use-game-channel.ts` following existing event handler patterns. Added channel subscription for `game_end` broadcast event.
- Task 6: Added `claimTimeout()` action to game store that sends `timeout_claim` to server with debounce guard (`timeoutClaimSent` flag).
- Task 7: Integrated `GameResultBanner` into `game-page-client.tsx` with overlay on board when `phase === 'ended'`. Added dismiss functionality and `onNewGame` navigation to dashboard.
- Task 8: Added `winner` and `result_reason` fields to `GameData` type. Updated `getGame` server action to SELECT these columns. Updated all test mocks.
- Task 9: 425 web tests passing (24 new), 10 Deno tests passing (6 new). Added: GameResultBanner component tests (14 tests), game store end-state tests (8 tests), game-end helper tests (6 Deno tests).
- Code review fixes applied: wired automatic timeout claim trigger from playing UI loop; made ended-phase board non-viewOnly for review interaction; added completeGame() failure handling in all timeout/end paths; reset `timeoutClaimSent` on function-level error responses; compacted banner behavior on mobile and fixed token usage (`--color-text-muted`).
- Test coverage expanded after review: added `game_end` event handling test in `use-game-channel`, added timeout-claim trigger assertion in `game-page-client`, and added engine outcome classification tests for `determineGameEndResult`.

### Senior Developer Review (AI)

- Review date: 2026-03-18
- Outcome: Changes Requested addressed
- High-severity issues fixed:
  - AC4 timeout-claim trigger is now invoked automatically when opponent display clock reaches 0 in playing phase.
  - Ended-phase board is no longer forced to `viewOnly`, allowing post-game board interaction for review.
  - `completeGame()` failure is now checked and surfaced as `INTERNAL_ERROR` instead of being silently ignored.
  - `timeoutClaimSent` guard now resets on Supabase function error responses (not only thrown network failures).
  - Mobile result banner is now compact and aligned near top on small screens.
- Medium-severity issues fixed:
  - Added explicit `game_end` channel handling test.
  - Added explicit game-end outcome mapping tests for server-side detection logic.
- Validation run:
  - `pnpm --filter @cotulenh/web test` → pass (427 tests)
  - `deno test supabase/functions/validate-move/game-end.test.ts supabase/functions/validate-move/clock.test.ts` → pass (15 tests)

### Change Log

- 2026-03-18: Implemented story 3.6 — game end conditions and result display
- 2026-03-18: Applied adversarial code review fixes and expanded coverage for timeout claim, game_end channel handling, and game-end detection logic

### File List

New files:
- supabase/functions/validate-move/game-end.ts
- supabase/functions/validate-move/game-end.test.ts
- apps/cotulenh/web/src/components/game/game-result-banner.tsx
- apps/cotulenh/web/src/components/game/__tests__/game-result-banner.test.tsx
- apps/cotulenh/web/src/stores/__tests__/game-store-endstate.test.ts

Modified files:
- supabase/functions/validate-move/index.ts
- supabase/functions/validate-move/clock.ts
- supabase/functions/validate-move/clock.test.ts
- apps/cotulenh/web/src/lib/types/game.ts
- apps/cotulenh/web/src/lib/actions/game.ts
- apps/cotulenh/web/src/stores/game-store.ts
- apps/cotulenh/web/src/hooks/use-game-channel.ts
- apps/cotulenh/web/src/hooks/__tests__/use-game-channel.test.tsx
- apps/cotulenh/web/src/components/game/game-page-client.tsx
- apps/cotulenh/web/src/stores/__tests__/game-store.test.ts
- apps/cotulenh/web/src/stores/__tests__/game-store-deploy.test.ts
- apps/cotulenh/web/src/stores/__tests__/game-store-clocks.test.ts
- apps/cotulenh/web/src/stores/__tests__/game-store-playing.test.ts
- apps/cotulenh/web/src/components/game/__tests__/game-page-client.test.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/3-6-game-end-conditions-result.md
