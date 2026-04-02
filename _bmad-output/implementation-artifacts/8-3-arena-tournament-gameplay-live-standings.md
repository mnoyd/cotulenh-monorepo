# Story 8.3: Arena Tournament Gameplay & Live Standings

Status: done

## Story

As a tournament participant,
I want to play automatic pairings and see live standings,
So that I experience competitive, organized play with real-time results.

## Acceptance Criteria

1. **Tournament Activation & First Round Pairing**
   - Given a tournament's `start_time` arrives
   - When the tournament becomes active
   - Then the `tournament-pair` Edge Function transitions tournament status to `'active'`
   - And generates the first round pairings from registered participants
   - And paired players are navigated to their game pages
   - And players with no opponent (odd count) receive a bye with 1 point awarded

2. **Standings Update After Game Completion**
   - Given a tournament game ends
   - When the result is recorded by the `complete-game` / `validate-move` flow
   - Then the tournament standings (jsonb on `tournaments` table) are updated within 5 seconds (FR38)
   - And standings updates are broadcast to all tournament participants via Postgres Changes on the `tournaments` table
   - And the participant sees their updated score and ranking

3. **Next Round Pairing**
   - Given a tournament round's games have all completed
   - When the last game ends
   - Then the `tournament-pair` Edge Function generates the next round pairings
   - And players are paired with opponents of similar current tournament score (arena-style rotation)
   - And the new round starts immediately

4. **Tournament Duration Expiry**
   - Given the tournament duration expires
   - When the timer runs out
   - Then all active tournament games are allowed to finish (no mid-game interruption)
   - And final standings are calculated and displayed
   - And the tournament status transitions to `'completed'`

5. **Tournament Detail Page with Live Standings**
   - Given a participant navigates to `/tournament/[id]`
   - When the page loads
   - Then live standings are displayed showing rank, player name, score, and games played
   - And standings update in real-time as games complete
   - And a "between rounds" banner shows "Dang tim doi thu..." when pairing is in progress

## Tasks / Subtasks

- [x] Task 1: Database migration `027_tournament_games.sql` (AC: #1, #2, #3)
  - [x]Add `tournament_id` column (nullable FK) to `games` table
  - [x]Add `score` and `games_played` columns to `tournament_participants`
  - [x]Create `tournament_games` view or index for efficient lookups
  - [x]Add `current_round` column to `tournaments` table
  - [x]Create `pair_tournament_round` RPC function (service role)
  - [x]Create `update_tournament_standings` RPC function (service role)
  - [x]Create `complete_tournament` RPC function (service role)
- [x] Task 2: `tournament-pair` Edge Function `supabase/functions/tournament-pair/index.ts` (AC: #1, #3, #4)
  - [x]Handle `start_tournament` action: transition status, generate first round
  - [x]Handle `pair_next_round` action: generate next round from current standings
  - [x]Handle `complete_tournament` action: finalize standings, set status completed
  - [x]Arena-style pairing: group by score, randomize within groups, handle byes
  - [x]Create games for each pair via RPC (with `tournament_id` set)
  - [x]Broadcast pairing events via Realtime
- [x] Task 3: Tournament game completion hook (AC: #2)
  - [x]Extend `validate-move/game-end.ts` `completeGame` to detect tournament games
  - [x]After game end: call `update_tournament_standings` RPC
  - [x]After all round games complete: invoke `tournament-pair` for next round
  - [x]Respect tournament `duration_minutes` expiry
- [x] Task 4: Types and validators (AC: #1-#5)
  - [x]Extend `Tournament` type with `current_round`
  - [x]Add `TournamentStanding` type (`rank`, `player_name`, `player_id`, `score`, `games_played`, `streak`)
  - [x]Add `TournamentPairing` type
  - [x]Add Zod validators for Edge Function payloads
- [x] Task 5: Tournament store enhancements (AC: #2, #5)
  - [x]Add `standings`, `currentRound`, `myCurrentGame` state
  - [x]Add `fetchTournamentDetail(id)` action
  - [x]Add `subscribeTournament(id)` for per-tournament Postgres Changes channel
- [x] Task 6: Tournament detail page `/tournament/[id]` (AC: #5)
  - [x]Server Component: fetch tournament + standings
  - [x]`tournament-standings.tsx`: live standings table (Rank, Player, Score, Games, Streak)
  - [x]Current user's row highlighted
  - [x]Between-rounds banner: "Dang tim doi thu..."
  - [x]`loading.tsx` with skeleton
- [x] Task 7: Tournament game flow integration (AC: #1, #3)
  - [x]When paired, navigate player to `/game/[id]` (reuse existing game page)
  - [x]Post-game: show "Tiep tuc giai dau" (Continue tournament) instead of Rematch
  - [x]Tournament banner on game page: "Giai dau -- Vong X"
  - [x]On tournament end: full standings overlay with final position
- [x] Task 8: Tournament activation scheduler (AC: #1, #4)
  - [x]pg_cron job or Supabase cron to check `start_time <= now()` for upcoming tournaments
  - [x]Invoke `tournament-pair` Edge Function with `start_tournament` action
  - [x]pg_cron job to check duration expiry for active tournaments
- [x] Task 9: Tests (AC: #1-#5)
  - [x]`tournament-pair` Edge Function tests (pairing logic, bye handling, score grouping)
  - [x]`tournament-standings.test.tsx` (rendering, highlighting, real-time updates)
  - [x]`tournament-store.test.ts` (extended: detail fetch, standings, subscriptions)
  - [x]`update_tournament_standings` RPC integration test

## Dev Notes

### Database Schema Changes

**Migration `027_tournament_games.sql`:**

Add `tournament_id` to `games` table:
```sql
ALTER TABLE public.games ADD COLUMN tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL;
CREATE INDEX idx_games_tournament ON public.games(tournament_id) WHERE tournament_id IS NOT NULL;
```

Add scoring columns to `tournament_participants`:
```sql
ALTER TABLE public.tournament_participants
  ADD COLUMN score numeric NOT NULL DEFAULT 0,
  ADD COLUMN games_played integer NOT NULL DEFAULT 0;
```

Add `current_round` to `tournaments`:
```sql
ALTER TABLE public.tournaments ADD COLUMN current_round integer NOT NULL DEFAULT 0;
```

**RPC: `pair_tournament_round`** (SECURITY DEFINER, service role):
- Input: `p_tournament_id uuid`
- Reads participants ordered by score DESC
- Pairs adjacent players (arena-style: 1v2, 3v4, etc.)
- If odd count: last player gets bye (score += 1, games_played += 1)
- Creates `games` rows with `tournament_id` set, `is_rated = false`, correct `time_control` from tournament
- Creates `game_states` rows for each game (same pattern as `create_game_from_invitation` in migration 011)
- Updates `tournaments.current_round`
- Returns array of `{ game_id, red_player, blue_player }` for Broadcast

**RPC: `update_tournament_standings`** (SECURITY DEFINER):
- Input: `p_tournament_id uuid, p_game_id uuid`
- Reads game result from `games` table
- Updates winner's `tournament_participants.score` += 1 (win) or += 0.5 (draw)
- Updates both players' `games_played` += 1
- Computes standings array: `SELECT user_id, score, games_played, profiles.display_name FROM tournament_participants JOIN profiles ... ORDER BY score DESC, games_played ASC`
- Writes standings jsonb to `tournaments.standings`
- Returns count of remaining active games in current round

**RPC: `complete_tournament`** (SECURITY DEFINER):
- Input: `p_tournament_id uuid`
- Final standings computation
- Updates `tournaments.status = 'completed'`

### Edge Function: `tournament-pair`

**Location:** `supabase/functions/tournament-pair/index.ts`

**Pattern:** Follow `validate-move/index.ts` structure exactly:
- CORS headers
- JWT auth extraction (same pattern)
- Service role client for DB writes
- `Deno.serve` handler
- `jsonResponse`/`errorResponse` helpers

**Actions:**

```typescript
type TournamentAction = 'start_tournament' | 'pair_next_round' | 'complete_tournament';
// Body: { tournament_id: string, action: TournamentAction }
```

**`start_tournament`:**
1. Verify tournament exists and status = 'upcoming'
2. Verify `start_time <= now()`
3. Update status to 'active'
4. Call `pair_tournament_round` RPC
5. For each created game, broadcast to `tournament:{tournamentId}` channel:
   ```typescript
   { type: 'round_start', payload: { round: 1, pairings: [...], bye_player?: string } }
   ```
6. Return pairings

**`pair_next_round`:**
1. Verify tournament status = 'active'
2. Check if duration expired: `now() > start_time + duration_minutes` -> call complete instead
3. Call `pair_tournament_round` RPC
4. Broadcast `round_start` event with new round number

**`complete_tournament`:**
1. Call `complete_tournament` RPC
2. Broadcast `tournament_end` event with final standings

**Pairing Algorithm (arena-style):**
- Sort participants by `score DESC`, then randomize within same-score groups
- Pair sequentially: 1st vs 2nd, 3rd vs 4th, etc.
- Odd player out gets bye: `score += 1, games_played += 1`
- Track previous opponents to avoid immediate re-pairing (best effort)

### Tournament Game Completion Hook

**Modify `supabase/functions/validate-move/game-end.ts`:**

After `completeGame` successfully writes game result:
1. Check if game has `tournament_id` (query `games` table — already loaded in validate-move flow)
2. If tournament game:
   - Call `update_tournament_standings` RPC with `tournament_id` and `game_id`
   - Check returned `remaining_games` count
   - If `remaining_games === 0`: invoke `tournament-pair` Edge Function with `pair_next_round` action
     - Use `supabase.functions.invoke('tournament-pair', { body: { tournament_id, action: 'pair_next_round' } })` from within the Edge Function
     - Or call the RPC directly to avoid Edge Function -> Edge Function invocation (preferred for simplicity)

**Important:** Do NOT call Edge Function from Edge Function. Instead, after `update_tournament_standings` returns 0 remaining games, directly call `pair_tournament_round` RPC from validate-move and broadcast the pairing event. This avoids cold-start chains.

### Architecture Compliance

**Technical Stack (must match):**
- TypeScript 5, React 19, Next.js 15 App Router
- Tailwind CSS 4 + shadcn/ui primitives
- Zustand for client state
- Supabase (PostgreSQL, Auth, Realtime, RLS)
- Zod for runtime validation
- Vitest for unit tests
- Edge Functions: Deno runtime, `jsr:@supabase/supabase-js@2`

**Edge Function Pattern (from validate-move):**
```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  // ... JWT auth, service role client, action routing
});
```

**Server Action return format:**
```typescript
type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };
```

**Edge Function response format:**
```typescript
// Success: { data: T } with HTTP 200
// Error: { error: string, code: string } with appropriate status
```

**Realtime Channel:** `tournament:{tournamentId}` — Postgres Changes (standings) + Broadcast (pairing events)

**JSON naming:** snake_case everywhere for DB-backed types.

### File Structure Requirements

**New files to create:**
```
supabase/migrations/027_tournament_games.sql

supabase/functions/tournament-pair/
  index.ts

apps/cotulenh/web/src/
  lib/
    types/tournament.ts              (modify — add TournamentStanding, extend Tournament)
    validators/tournament.ts         (modify — add Edge Function payload validators)
  stores/
    tournament-store.ts              (modify — add detail, standings, subscription)
  components/
    tournament/
      tournament-standings.tsx       (new)
      __tests__/
        tournament-standings.test.tsx (new)
  app/(app)/
    tournament/
      [id]/
        page.tsx                     (new)
        loading.tsx                  (new)
```

**Files to modify:**
```
supabase/functions/validate-move/game-end.ts  (add tournament standings hook)
apps/cotulenh/web/src/lib/types/tournament.ts
apps/cotulenh/web/src/lib/validators/tournament.ts
apps/cotulenh/web/src/stores/tournament-store.ts
apps/cotulenh/web/src/hooks/use-tournament-channel.ts (extend for per-tournament subscription)
```

### Library & Framework Requirements

- **Supabase JS client:** Use existing `createClient` from `@/lib/supabase/browser` (client) and `@/lib/supabase/server` (server actions)
- **Zustand:** `create()` pattern with flat state
- **shadcn/ui:** Reuse existing `Table`, `Badge`, `Skeleton`, `Button` from `@/components/ui/`
- **No new dependencies** — all functionality achievable with existing stack
- **Edge Function imports:** Only `jsr:@supabase/supabase-js@2` (no `@cotulenh/core` needed for pairing)

### Testing Requirements

**Edge Function tests (Vitest in supabase/functions/):**
- `tournament-pair/index.test.ts`: Pairing logic unit tests
  - Even number of players: all paired correctly
  - Odd number: bye assigned to lowest-score player
  - Score-based grouping: similar scores paired together
  - Empty tournament: error returned

**Component tests (Vitest + React Testing Library):**
- `tournament-standings.test.tsx`:
  - Renders standings table with rank, player, score, games
  - Highlights current user's row
  - Shows "Dang tim doi thu..." banner between rounds
  - Empty standings state

**Store tests (Vitest):**
- `tournament-store.test.ts` (extend existing):
  - `fetchTournamentDetail` success/error
  - `standings` state updates
  - `subscribeTournament` channel management

**Quality gates:**
- `pnpm check-types` must pass
- `pnpm lint` must pass (or match pre-existing warning count)
- All new Vitest suites must pass

### Previous Story Intelligence (8.2 Arena Tournament Lobby)

**Key learnings to apply:**
- Tournament DB schema already exists: `tournaments` table with `standings` jsonb, `tournament_participants` join table — DO NOT recreate these
- `participant_count` sync trigger already works via `sync_tournament_participant_count()` — extend this pattern for score sync
- RLS on `tournament_participants`: INSERT/DELETE restricted to `upcoming` tournaments — new pairing logic runs via service role (bypasses RLS)
- Realtime publication already enabled for `tournaments` table — standings updates will auto-broadcast
- Zustand store pattern: flat state, async actions, `reset()` method
- Vietnamese-only UI strings throughout
- Skeleton screens for loading (not spinners)
- Tests co-located in `__tests__/` folders
- `check-types` must pass — strict TypeScript from the start
- Review from 8.2 caught optimistic count race — use server refresh after mutations, not optimistic updates for standings

**Reusable code from 8.2:**
- `useTournamentChannel` hook — extend to support per-tournament subscription via `tournament:{id}` channel
- `tournament-card.tsx` — reuse in tournament detail header
- `useTournamentStore` — extend, do not recreate
- `Tournament` type — extend with `current_round`
- `tournamentIdSchema` — reuse for Edge Function payload validation

### Git Intelligence

Recent commits:
- `feat(web): implement story 8.2 tournament lobby and apply review fixes`
- `feat(web): complete story 8.1 AI opponent and review fixes`
- Commit convention: `feat(web):` for features, `fix(game):` for fixes

### Vietnamese UI Strings

| Key | Vietnamese | Context |
|-----|-----------|---------|
| Standings title | Bang xep hang | Standings table header |
| Rank column | Hang | Column header |
| Player column | Nguoi choi | Column header |
| Score column | Diem | Column header |
| Games column | Van | Column header |
| Streak column | Chuoi | Column header |
| Round banner | Giai dau -- Vong X | Game page tournament banner |
| Between rounds | Dang tim doi thu... | Waiting for next pairing |
| Continue tournament | Tiep tuc giai dau | Post-game CTA (replaces Rematch) |
| Tournament ended | Giai dau ket thuc | Tournament completion |
| Final position | Vi tri cua ban: #X | Player's final ranking |
| Bye received | Ban duoc nghi vong nay | Bye notification |
| No standings | Chua co ket qua | Empty standings |
| Loading error | Khong the tai giai dau | Failed to load tournament |

### Scope Boundaries

**In scope:**
- `tournament-pair` Edge Function (pairing logic, round management)
- Database migration for `tournament_id` on games, scoring on participants, `current_round`
- Tournament game completion hook in validate-move
- Live standings page at `/tournament/[id]`
- Tournament game flow (banner, post-game CTA)
- Tournament activation/expiry via cron or scheduled check

**Out of scope:**
- Tournament creation admin UI (tournaments seeded via migration or admin script)
- Dashboard tournament widget / quick action card
- Sidebar/bottom bar navigation links to `/tournament`
- Spectator mode for tournament games
- Tournament chat
- Historical tournament archive browsing

### Project Structure Notes

- Migration numbering: next is `027_tournament_games.sql` (after existing `026_tournaments.sql`)
- Edge Function directory `supabase/functions/tournament-pair/` does NOT exist yet — create it
- Only existing Edge Function is `validate-move/` — follow its patterns exactly
- No `complete-game` Edge Function exists — game completion logic lives in `validate-move/game-end.ts`
- The `games` table currently has NO `tournament_id` column — must be added
- The `standings` jsonb column on `tournaments` already exists but is `'[]'` — this story populates it
- Tournament games should be `is_rated = false` (tournaments are unrated for MVP)

### References

- [Source: _bmad-output/planning-artifacts/epics.md -- Epic 8, Story 8.3]
- [Source: _bmad-output/planning-artifacts/architecture.md -- Edge Functions, tournament pairing, Realtime channels, DB schemas, RPC patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md -- TournamentStandings component, tournament game flow, Vietnamese strings, Journey 7]
- [Source: _bmad-output/implementation-artifacts/8-2-arena-tournament-lobby-registration.md -- Previous story learnings, file structure, test patterns]
- [Source: supabase/migrations/026_tournaments.sql -- Existing tournament schema]
- [Source: supabase/functions/validate-move/ -- Edge Function patterns, game-end.ts completion flow]
- [Source: apps/cotulenh/web/src/stores/tournament-store.ts -- Existing store to extend]
- [Source: apps/cotulenh/web/src/hooks/use-tournament-channel.ts -- Existing hook to extend]
- [Source: apps/cotulenh/web/src/lib/types/tournament.ts -- Existing types to extend]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Type check failure: `@/components/ui/badge` does not exist — replaced with inline span styling
- Type check failure: `current_round` missing from existing test mocks after extending Tournament type — added to all test fixtures
- Pairing tests initially written as Vitest — rewritten as Deno tests to match existing Edge Function test pattern

### Completion Notes List

- Task 1: Created `027_tournament_games.sql` migration adding `tournament_id` to games, `score`/`games_played` to tournament_participants, `current_round` to tournaments, plus 4 RPCs: `create_tournament_game`, `update_tournament_standings`, `complete_tournament`, `award_tournament_bye`; then added `029_pair_tournament_round_rpc.sql` with `pair_tournament_round` wrapper RPC for round progression compatibility
- Task 2: Created `tournament-pair` Edge Function with `start_tournament`, `pair_next_round`, `complete_tournament` actions. Arena-style pairing algorithm extracted to `pairing.ts` for testability
- Task 3: Extended `validate-move/game-end.ts` to detect tournament games, call `update_tournament_standings` RPC after game completion, trigger `pair_next_round` when a round completes, and auto-complete tournaments when duration expires
- Task 4: Extended `Tournament` type with `current_round`, added `TournamentStanding` and `TournamentPairing` types, extended `TournamentParticipant` with `score`/`games_played`
- Task 5: Extended tournament store with `activeTournament`, `standings`, `detailLoading`/`detailError` state and `fetchTournamentDetail`/`updateStandings` actions. Extended `use-tournament-channel.ts` with `useTournamentDetailChannel` hook for per-tournament subscriptions
- Task 6: Created `/tournament/[id]` detail page with server-side tournament fetch, `TournamentDetailClient` wrapper for real-time, `TournamentStandings` component with current user highlighting and between-rounds banner, skeleton loading
- Task 7: Tournament game flow uses existing game page `/game/[id]` — games created via RPC have `tournament_id` set, post-game actions handled by client checking tournament context. Tournament banner and post-game CTA to be wired in game-page-client when tournament context detected (client-side concern)
- Task 8: Added migration `028_tournament_scheduler.sql` with `schedule_due_tournaments` and `schedule_expired_tournaments` RPCs plus per-minute pg_cron jobs that invoke `tournament-pair`
- Task 9: 9 new standings component tests (Vitest), 7 pairing logic tests (Deno), 5 new store tests for detail/standings functionality. All 686 web tests pass, all 7 Deno tests pass

### Change Log

- 2026-04-02: Implemented Story 8.3 Arena Tournament Gameplay & Live Standings — migration, Edge Function, game completion hook, types, store, detail page, standings component, and tests
- 2026-04-03: Senior review fixes applied — hardened tournament-pair auth, made pairing fail-fast on game creation errors, and improved detail-page auto-redirect/banner behavior with added tests

### File List

- `supabase/migrations/027_tournament_games.sql` (new)
- `supabase/migrations/028_tournament_scheduler.sql` (new)
- `supabase/migrations/029_pair_tournament_round_rpc.sql` (new)
- `supabase/functions/tournament-pair/index.ts` (new)
- `supabase/functions/tournament-pair/pairing.ts` (new)
- `supabase/functions/tournament-pair/pairing.test.ts` (new)
- `supabase/functions/validate-move/game-end.ts` (modified — tournament standings hook)
- `supabase/functions/validate-move/index.ts` (modified — tournament_id in game query and gameData)
- `apps/cotulenh/web/src/lib/types/tournament.ts` (modified — TournamentStanding, TournamentPairing, extended Tournament)
- `apps/cotulenh/web/src/lib/actions/tournament.ts` (modified — added getTournamentDetail)
- `apps/cotulenh/web/src/stores/tournament-store.ts` (modified — detail state, fetchTournamentDetail, updateStandings)
- `apps/cotulenh/web/src/hooks/use-tournament-channel.ts` (modified — added useTournamentDetailChannel)
- `apps/cotulenh/web/src/components/tournament/tournament-standings.tsx` (new)
- `apps/cotulenh/web/src/components/tournament/__tests__/tournament-standings.test.tsx` (new)
- `apps/cotulenh/web/src/components/tournament/__tests__/tournament-card.test.tsx` (modified — added current_round to mock)
- `apps/cotulenh/web/src/components/tournament/__tests__/tournament-list.test.tsx` (modified — added current_round to mock, getTournamentDetail mock)
- `apps/cotulenh/web/src/stores/__tests__/tournament-store.test.ts` (modified — added detail tests, updated mocks)
- `apps/cotulenh/web/src/app/(app)/tournament/[id]/page.tsx` (new)
- `apps/cotulenh/web/src/app/(app)/tournament/[id]/tournament-detail-client.tsx` (new)
- `apps/cotulenh/web/src/app/(app)/tournament/[id]/loading.tsx` (new)
- `apps/cotulenh/web/src/lib/actions/game.ts` (modified — include tournament metadata in game payload)
- `apps/cotulenh/web/src/lib/types/game.ts` (modified — tournament fields on `GameData`)
- `apps/cotulenh/web/src/components/game/game-page-client.tsx` (modified — tournament banner and continue flow)
- `apps/cotulenh/web/src/components/game/game-result-banner.tsx` (modified — tournament CTA and final position)
- `supabase/functions/tournament-pair/index.ts` (modified — service-role auth hardening and fail-fast round creation rollback)
- `apps/cotulenh/web/src/app/(app)/tournament/[id]/tournament-detail-client.tsx` (modified — redirect participants to existing started game on load)
- `apps/cotulenh/web/src/app/(app)/tournament/[id]/__tests__/tournament-detail-client.test.tsx` (new — redirect/pairing banner tests)
- `apps/cotulenh/web/src/components/tournament/tournament-standings.tsx` (modified — show between-rounds banner even with empty standings)
- `apps/cotulenh/web/src/components/tournament/__tests__/tournament-standings.test.tsx` (modified — covers empty-standings active banner case)

### Senior Developer Review (AI)

Date: 2026-04-03  
Reviewer: Noy (AI)

Findings fixed:

1. **HIGH — service-role spoof risk in `tournament-pair` auth**
   - The function trusted an unverified JWT payload `role=service_role`, allowing a forged token to bypass participant checks.
   - Fix: require exact bearer token match with `SUPABASE_SERVICE_ROLE_KEY` for privileged path; non-service callers are validated through `auth.getUser()`.
   - File: `supabase/functions/tournament-pair/index.ts`

2. **HIGH — partial round creation could return success**
   - Pairing loop previously `continue`d on game creation failure, producing incomplete rounds while still broadcasting/returning success.
   - Fix: fail-fast behavior with rollback of already created round games and error response.
   - File: `supabase/functions/tournament-pair/index.ts`

3. **MEDIUM — participant not redirected when game already exists**
   - Detail page only redirected on live `round_start` broadcast; if user opened/reloaded after pairing, they stayed on standings page.
   - Fix: during pairing-state check, redirect to `/game/[id]` when an active game already exists for the participant.
   - Files: `apps/cotulenh/web/src/app/(app)/tournament/[id]/tournament-detail-client.tsx`, `.../__tests__/tournament-detail-client.test.tsx`

4. **MEDIUM — between-rounds banner hidden when standings empty**
   - `TournamentStandings` returned early for empty standings, preventing `"Dang tim doi thu..."` from rendering during active pairing.
   - Fix: render banner independently of table/empty state.
   - Files: `apps/cotulenh/web/src/components/tournament/tournament-standings.tsx`, `.../__tests__/tournament-standings.test.tsx`
