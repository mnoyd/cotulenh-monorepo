# Story 3.10: Game Abandonment & Cleanup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want abandoned games cleaned up and game channels secured,
So that the system stays healthy and players can only interact with their own games.

## Acceptance Criteria

1. **AC1: Abandonment Indicator Distinct from Disconnect Forfeit** — Given a player closes their browser during a game without resigning, when the disconnection is detected and the 60-second forfeit timer expires (via the existing `forfeit_disconnected_games()` cron from story 3.9), then the game record includes `result_reason = 'abandonment'` (distinct from `'disconnect_forfeit'` used for network-loss forfeits). The distinction is determined by whether the disconnected player attempted any reconnection during the 60-second window: no reconnection attempt = abandonment, at least one reconnection attempt = disconnect forfeit (FR33).

2. **AC2: 24-Hour Stale Game Cleanup** — Given a game has `status = 'started'` and `updated_at` is older than 24 hours, when the Supabase cron job runs, then the game status is set to `'aborted'` with `result_reason = 'stale_cleanup'`, `winner = NULL`, and `ended_at = now()`. No rating changes are applied for aborted games.

3. **AC3: Realtime Channel Authorization** — Given Supabase Realtime channel authorization is configured, when a client attempts to send or receive on a `game:{gameId}` Broadcast channel, then only the two game participants (matching `games.red_player` / `games.blue_player`) are allowed. Unauthorized clients are rejected by RLS for Realtime policies.

## Tasks / Subtasks

- [x] Task 1: Database migration — Add abandonment tracking and stale game cleanup (AC: #1, #2)
  - [x] 1.1 Create migration `supabase/migrations/020_abandonment_cleanup.sql`
  - [x] 1.2 Add `reconnect_attempted` boolean column to `game_states` (default false) — tracks whether the disconnected player made any reconnection attempt during the 60s window
  - [x] 1.3 Update `clear_player_disconnect` RPC to set `reconnect_attempted = true` for that color when clearing disconnect (reconnection = they tried to come back)
  - [x] 1.4 Update `forfeit_disconnected_games()` RPC to check `reconnect_attempted`:
    - If `reconnect_attempted = false` for the forfeited player → `result_reason = 'abandonment'`
    - If `reconnect_attempted = true` → `result_reason = 'disconnect_forfeit'` (existing behavior preserved)
  - [x] 1.5 Create RPC `cleanup_stale_games()`:
    - SECURITY DEFINER, SET search_path = public
    - Finds all `games` where `status = 'started'` AND `updated_at < now() - interval '24 hours'`
    - Updates each: `status = 'aborted'`, `winner = NULL`, `result_reason = 'stale_cleanup'`, `ended_at = now()`
    - Returns count of cleaned-up games
  - [x] 1.6 Grant EXECUTE on new/updated RPCs to `service_role`, REVOKE from PUBLIC
  - [x] 1.7 Update `lock_game_state_for_update` to include `reconnect_attempted` in return columns

- [x] Task 2: Cron job for 24-hour stale game cleanup (AC: #2)
  - [x] 2.1 Add to migration `020_abandonment_cleanup.sql` (or create `021_stale_game_cleanup_cron.sql`)
  - [x] 2.2 Schedule cron job: `SELECT cron.schedule('cleanup-stale-games', '0 */6 * * *', $$ SELECT public.cleanup_stale_games(); $$);` — runs every 6 hours (24h stale threshold doesn't need 15s frequency)

- [x] Task 3: Realtime channel authorization for game channels (AC: #3)
  - [x] 3.1 Research Supabase Realtime authorization configuration — check if `config.toml` supports RLS for Realtime Broadcast, or if a DB-level authorization policy is needed
  - [x] 3.2 If Supabase supports Realtime RLS: create migration with authorization policy restricting `game:*` channel send/receive to `games.red_player` and `games.blue_player`
  - [x] 3.3 If Supabase does NOT yet support Realtime channel-level RLS: document this limitation and note that the validate-move Edge Function already enforces participant verification (line 148-153 of `index.ts`), providing server-side protection. Client-side Broadcast receive is lower risk since game state is not secret after deployment phase.
  - [x] 3.4 If applicable, update `config.toml` with Realtime authorization settings

- [x] Task 4: Update Edge Function for reconnect_attempted tracking (AC: #1)
  - [x] 4.1 In `supabase/functions/validate-move/index.ts`, update the `isReportReconnect` handler (line 205-220) — no changes needed if the DB RPC handles `reconnect_attempted` setting
  - [x] 4.2 Update `gameState` type definition (line 168-180) to include `reconnect_attempted: boolean`
  - [x] 4.3 Ensure the `lock_game_state_for_update` RPC call properly maps the new column

- [x] Task 5: Client-side abandonment display (AC: #1)
  - [x] 5.1 In `GameResultBanner.svelte` (or `game-result.ts`), add handling for `result_reason = 'abandonment'` — display "Đối thủ rời trận — bạn thắng" (Opponent left — you win) or "Bạn rời trận — đối thủ thắng" (You left — opponent wins) depending on perspective
  - [x] 5.2 Add i18n keys for abandonment-specific messages:
    - `game.opponentAbandoned`: "Đối thủ rời trận — bạn thắng"
    - `game.youAbandoned`: "Bạn rời trận — đối thủ thắng"
    - `game.gameAborted`: "Trận đấu bị huỷ" (Game aborted — for stale cleanup)
  - [x] 5.3 In game history/result displays, distinguish abandonment from disconnect forfeit visually (different icon or label text)

- [x] Task 6: Testing & regression (AC: #1-#3)
  - [x] 6.1 Database RPC tests: `cleanup_stale_games` sets status='aborted' for 24h+ stale games, skips recent games, skips already-ended games
  - [x] 6.2 Database RPC tests: updated `forfeit_disconnected_games` correctly sets `result_reason = 'abandonment'` when `reconnect_attempted = false`, and `'disconnect_forfeit'` when `true`
  - [x] 6.3 Database RPC tests: `clear_player_disconnect` sets `reconnect_attempted = true`
  - [x] 6.4 Client component tests: GameResultBanner renders abandonment-specific messages
  - [x] 6.5 Realtime authorization tests (if RLS for Realtime is implemented): verify non-participants are rejected
  - [x] 6.6 Run full test suite — all existing tests must pass (baseline from story 3.9)

## Dev Notes

### Architecture Patterns & Constraints

- **Server is AUTHORITATIVE** — abandonment vs disconnect distinction is determined server-side via `reconnect_attempted` flag. Client cannot self-report abandonment.
- **Vietnamese only** for all user-facing text — no English placeholders
- **No barrel exports** — direct imports only
- **This is a SvelteKit app** — NOT React/Next.js. Uses Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
- **No Zustand** — state management is via `OnlineGameSessionCore` (imperative) wrapped by `OnlineGameSession` (reactive Svelte wrapper)
- **Errors returned, never thrown** in Server Actions and store actions
- **Co-locate tests** next to source files

### CRITICAL: Existing Infrastructure (DO NOT Reinvent)

**Disconnect Forfeit Cron** (migration 019):
- Already runs every 15 seconds via `pg_cron`
- Calls `forfeit_disconnected_games()` which checks `disconnect_*_at > 60s`
- Currently sets `result_reason = 'disconnect_forfeit'` for timeout cases and `'simultaneous_disconnect'` for aborted cases
- **MODIFY** this RPC to check `reconnect_attempted` before setting `result_reason`

**`record_player_disconnect` RPC** (migration 018):
- Sets `disconnect_{color}_at = now()`, `clocks_paused = true`
- Called from validate-move's `report_disconnect` action
- **DO NOT MODIFY** — disconnect recording stays the same

**`clear_player_disconnect` RPC** (migration 018):
- Clears `disconnect_{color}_at`, conditionally clears `clocks_paused`
- Called from validate-move's `report_reconnect` action
- **MODIFY** to also set `reconnect_attempted = true` for the reconnecting color

**`validate-move` Edge Function** (`supabase/functions/validate-move/index.ts`):
- `report_disconnect` handler (line 182-203): calls `record_player_disconnect` RPC
- `report_reconnect` handler (line 205-220): calls `clear_player_disconnect` RPC
- Participant verification at lines 148-153: already checks `red_player`/`blue_player` against JWT
- `gameState` type at line 168-180: needs `reconnect_attempted` added

**`completeGame()`** (`supabase/functions/validate-move/game-end.ts`):
- Updates `games` table with `status`, `winner`, `result_reason`, `ended_at`
- Broadcasts `game_end` event to channel
- The forfeit cron does NOT use this function — it directly updates `games` in the RPC
- For stale cleanup cron, same pattern — direct SQL in the RPC

**`GameResultBanner.svelte`** and **`game-result.ts`**:
- Already handles `disconnect_forfeit` result reason
- Located in `apps/cotulenh/app/src/lib/components/`
- Extend with `abandonment` and `stale_cleanup` result reasons

**`games.status` CHECK constraint** (migration 004):
- Valid: `'started', 'aborted', 'checkmate', 'resign', 'timeout', 'stalemate', 'draw', 'dispute'`
- `'aborted'` already exists — used for stale cleanup and simultaneous disconnect

**`games.result_reason`** column:
- Free text, no CHECK constraint
- Current values in use: `null`, `'disconnect_forfeit'`, `'simultaneous_disconnect'`, `'mutual_agreement'`, `'fifty_move_rule'`, `'threefold_repetition'`
- New values: `'abandonment'`, `'stale_cleanup'`

**`games.updated_at`** with auto-trigger (migration 004):
- `update_games_updated_at()` trigger fires on every UPDATE
- The 24h stale check uses this column — it reflects the last time any column on the `games` row was modified

**I18n** (`apps/cotulenh/app/src/lib/i18n/`):
- `types.ts` — translation key types
- `locales/vi.ts` — Vietnamese translations
- `locales/en.ts` — English fallback translations
- Keys added in story 3.9: `game.reconnecting`, `game.opponentReconnectCountdown`, `game.opponentDisconnectForfeit`, `game.clocksPaused`, `game.disconnectForfeit`

### Design Decisions

1. **`reconnect_attempted` boolean on `game_states`** — Simple flag to distinguish abandonment from disconnect forfeit. When a player reconnects (via `clear_player_disconnect`), the flag is set `true`. The forfeit cron checks this flag: if `false` after 60s, the player never tried to come back = abandonment. Reset to `false` each time a new disconnect is recorded.

2. **Stale cleanup cron runs every 6 hours** — The 24-hour threshold is generous; checking every 6 hours is sufficient. No need for 15-second frequency like the disconnect forfeit cron.

3. **Realtime channel authorization** — Supabase Realtime Broadcast authorization is relatively new. The validate-move Edge Function already enforces participant checks for all write operations. For read-only Broadcast receive, the security risk is low (game state after deployment is not secret — both players see the full board). If Supabase Realtime authorization policies are not yet available in the project's Supabase version, document the limitation and rely on the existing Edge Function guard.

4. **No rating changes for aborted games** — The `complete-game` Edge Function handles Glicko-2 rating updates, but the stale cleanup cron bypasses it (direct SQL). Since aborted games have `winner = NULL`, rating logic (future Epic 6) should skip games with `status = 'aborted'`.

### Edge Cases

1. **Player reconnects then disconnects again within 60s** — `reconnect_attempted` is set `true` on first reconnect. Second disconnect starts a new 60s window. If they don't reconnect again, it's still a disconnect forfeit (not abandonment) because they tried once.

2. **Both players close browser (both abandon)** — Same as simultaneous disconnect: `forfeit_disconnected_games()` already handles this with `status = 'aborted'`, `result_reason = 'simultaneous_disconnect'`. No change needed.

3. **Stale game has active players** — Unlikely: if players are active, `updated_at` on `game_states` updates on every move. The `games.updated_at` also updates via trigger. A game can only be 24h stale if truly abandoned with no activity.

4. **Game in deploy phase for 24h** — If both players joined but never committed deployment for 24h, the stale cleanup aborts the game. This is correct — such a game is effectively abandoned.

5. **Race between forfeit cron and cleanup cron** — The forfeit cron (15s) runs much more frequently. A game with an active disconnect would be forfeited at 60s, long before the 24h cleanup. The cleanup only catches games where no disconnect was ever recorded (e.g., server restart cleared presence without recording disconnect).

### Previous Story Intelligence (3.9: Reconnection & Disconnect Handling)

**Key learnings to carry forward:**
- Client-reported disconnect approach is in place (remaining player reports via `validate-move` action `report_disconnect`)
- `reconnect_attempted` tracking must be reset when a NEW disconnect is recorded (otherwise stale flag from previous disconnect cycle misleads)
- `forfeit_disconnected_games()` RPC iterates over all qualifying games — adding the `reconnect_attempted` check is a simple conditional in the existing loop
- Variable shadowing in Edge Function caused bugs in story 3.5 — use unique variable names
- Review found 1s polling (changed to 5s) in 3.9 — follow the 5s pattern for any new polling
- Test baseline from story 3.9: ~87 web tests + ~24 Deno tests

### Git Intelligence

Recent commit pattern: `feat(game): <description> (story X-Y)`. Files follow consistent structure:
- Migrations in `supabase/migrations/` (next: 020)
- Edge Function in `supabase/functions/validate-move/`
- Components in `apps/cotulenh/app/src/lib/components/`
- I18n in `apps/cotulenh/app/src/lib/i18n/`
- Tests co-located with source files

### Project Structure Notes

Files to create:
- `supabase/migrations/020_abandonment_cleanup.sql` — `reconnect_attempted` column, updated RPCs, stale cleanup RPC + cron

Files to modify:
- `supabase/functions/validate-move/index.ts` — update `gameState` type to include `reconnect_attempted`
- `apps/cotulenh/app/src/lib/components/game-result.ts` — add `abandonment` and `stale_cleanup` result reason handling
- `apps/cotulenh/app/src/lib/components/GameResultBanner.svelte` — render abandonment-specific messages
- `apps/cotulenh/app/src/lib/i18n/types.ts` — add new translation keys
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — add Vietnamese translations
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` — add English fallback translations

Files NOT to modify:
- `supabase/migrations/018_game_states_disconnect_tracking.sql` — existing migration, don't touch
- `supabase/migrations/019_disconnect_forfeit_cron.sql` — existing cron schedule unchanged
- `supabase/functions/validate-move/game-end.ts` — core game-end semantics unchanged; review fixes may still touch channel privacy configuration
- `apps/cotulenh/app/src/lib/game/online-session.svelte.ts` — no reactive wrapper changes needed
- `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte` — page wiring unchanged (result banner already handles result_reason dynamically)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.10]
- [Source: _bmad-output/planning-artifacts/architecture.md — Abandoned Game Cleanup, Disconnect & Forfeit, Broadcast Channel Authorization, game_states table, complete-game Edge Function]
- [Source: _bmad-output/planning-artifacts/prd.md — FR33 (distinct abandonment indicator)]
- [Source: _bmad-output/implementation-artifacts/3-9-reconnection-disconnect-handling.md — Dev Notes, existing disconnect infrastructure, Edge Case #5 (tab close vs network loss)]
- [Source: supabase/migrations/018_game_states_disconnect_tracking.sql — disconnect columns, RPCs: record_player_disconnect, clear_player_disconnect, forfeit_disconnected_games]
- [Source: supabase/migrations/019_disconnect_forfeit_cron.sql — pg_cron schedule for forfeit]
- [Source: supabase/migrations/004_games.sql — games.status CHECK constraint, games.updated_at trigger, RLS policies]
- [Source: supabase/functions/validate-move/index.ts — report_disconnect handler (line 182), report_reconnect handler (line 205), participant verification (line 148), gameState type (line 168)]
- [Source: supabase/functions/validate-move/game-end.ts — completeGame() pattern]
- [Source: apps/cotulenh/app/src/lib/components/GameResultBanner.svelte — existing result banner]
- [Source: apps/cotulenh/app/src/lib/components/game-result.ts — result reason mapping]
- [Source: supabase/config.toml — current Supabase configuration (no Realtime auth config)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Caught edge case: `reconnect_attempted` flag needed reset on new disconnect to avoid stale flag from previous reconnect cycle (Player A reconnects → flag true → Player B disconnects → would incorrectly get "disconnect_forfeit" instead of "abandonment"). Added `reconnect_attempted = false` reset in `record_player_disconnect` per Design Decision #1.

### Completion Notes List

- **Task 1**: Created migration `020_abandonment_cleanup.sql` with: `reconnect_attempted` boolean column on `game_states`, updated `record_player_disconnect` (reset flag on new disconnect), updated `clear_player_disconnect` (set flag true on reconnect), updated `forfeit_disconnected_games` (check flag for abandonment vs disconnect_forfeit), new `cleanup_stale_games` RPC, updated `lock_game_state_for_update` (include new column).
- **Task 2**: Stale game cleanup cron job scheduled every 6 hours (`0 */6 * * *`), included in migration 020.
- **Task 3**: Added Realtime authorization enforcement in migration 020 using `realtime.messages` RLS policies for `broadcast` and `presence`, scoped to `game:{gameId}` topics where `auth.uid()` matches `games.red_player` or `games.blue_player`. Updated client and server game channels to subscribe/send with `private: true`.
- **Task 4**: Updated `gameState` type in Edge Function `index.ts` to include `reconnect_attempted: boolean`. No handler changes needed — DB RPCs handle the flag.
- **Task 5**: Added `abandonment` and `stale_cleanup` result reason handling in `game-result.ts`. Added i18n keys (`game.opponentAbandoned`, `game.youAbandoned`, `game.gameStaleCleanup`) with Vietnamese and English translations. Added game history reason keys (`gameHistory.reason.abandonment`, `gameHistory.reason.stale_cleanup`) and wired them into the history mapper.
- **Task 6**: Added regression tests for `game-result.ts`, `history.ts`, `online-session-core.ts` private channel setup, and SQL contract tests for migration 020 covering reconnect tracking, stale cleanup, and Realtime authorization policies.

### Change Log

- 2026-03-24: Implemented story 3.10 — game abandonment tracking, stale game cleanup, and client-side display
- 2026-03-24: Senior Developer Review (AI) fixes applied for Realtime authorization, stale cleanup correctness, history mapping, and missing tests

### File List

- `supabase/migrations/020_abandonment_cleanup.sql` (new) — migration with reconnect_attempted column, updated RPCs, cleanup_stale_games RPC, cron job
- `supabase/functions/validate-move/index.ts` (modified) — added `reconnect_attempted` to gameState type and switched game broadcasts to private channels
- `apps/cotulenh/app/src/lib/components/game-result.ts` (modified) — added abandonment and stale_cleanup result reason handling
- `apps/cotulenh/app/src/lib/components/game-result.test.ts` (modified) — added tests for abandonment and stale_cleanup mapping
- `apps/cotulenh/app/src/lib/game/history.ts` (modified) — added history mapping for abandonment and stale_cleanup
- `apps/cotulenh/app/src/lib/game/history.test.ts` (modified) — added tests for abandonment and stale_cleanup history labels
- `apps/cotulenh/app/src/lib/game/disconnect-migrations.test.ts` (modified) — added migration contract tests for abandonment cleanup and Realtime authorization
- `apps/cotulenh/app/src/lib/i18n/types.ts` (modified) — added 6 new translation keys
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` (modified) — added Vietnamese translations for abandonment/stale_cleanup
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` (modified) — added English translations for abandonment/stale_cleanup
- `apps/cotulenh/app/src/lib/game/online-session-core.ts` (modified) — uses private Realtime game channels
- `apps/cotulenh/app/src/lib/game/online-session-core.test.ts` (modified) — verifies private game channel subscription
- `supabase/functions/validate-move/game-end.ts` (modified) — sends game-end broadcasts over private channels
- `supabase/functions/validate-move/rematch.ts` (modified) — sends rematch broadcasts over private channels
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — story status: ready-for-dev → in-progress → review → done
- `_bmad-output/implementation-artifacts/3-10-game-abandonment-cleanup.md` (modified) — tasks marked complete, Dev Agent Record filled

### Senior Developer Review (AI)

**Reviewer:** Noy on 2026-03-24

**Findings addressed:**
- **[FIXED] H1 — Missing Realtime channel authorization**: Added `realtime.messages` RLS policies in migration 020 and switched game channels to `private: true` in client and server broadcast senders.
- **[FIXED] H2 — Stale cleanup keyed off the wrong timestamp**: `cleanup_stale_games()` now uses the authoritative latest activity between `games.updated_at` and `game_states.updated_at`, preventing active long-running games from being aborted.
- **[FIXED] H3 — History views did not map new result reasons**: Added `abandonment` and `stale_cleanup` to the game-history reason mapper and tests.
- **[FIXED] H4 — Story claimed tests that did not exist**: Added migration-contract and mapper/channel coverage so the review findings are actually exercised by tests.
- **[FIXED] M1 — Story/file-list drift**: Added review-fix file entries and documented the `online-session-core.ts` follow-up edit.

**Residual note:**
- Private-channel enforcement still depends on the Supabase project using Realtime authorization in deployment, but the repository now contains the required policy and client/server channel changes.
