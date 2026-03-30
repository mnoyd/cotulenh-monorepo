# Story 6.1: Glicko-2 Rating System

Status: done

## Story

As a player,
I want to earn a rating that reflects my skill level and updates after each rated game,
So that I can track my improvement and play against similarly skilled opponents.

## Acceptance Criteria

1. **Given** a new `ratings` migration is applied, **When** the migration runs, **Then** the `ratings` table exists with columns for player ID, time control, rating, rating deviation, volatility, games played count, and timestamps. **And** RLS policies allow players to read any rating but only service role can write.

2. **Given** the Glicko-2 algorithm is implemented, **When** the code is added to `@cotulenh/common`, **Then** it correctly calculates new rating, rating deviation, and volatility given two players' current ratings and a game result. **And** unit tests verify the calculation against known Glicko-2 reference outputs.

3. **Given** a rated game ends (checkmate, resign, timeout, or draw), **When** the `completeGame` function in the validate-move Edge Function processes the result, **Then** both players' ratings are updated atomically in the same PostgreSQL transaction as the game result write (NFR11). **And** if either the game status write or the rating update fails, the entire transaction rolls back. **And** a new `ratings` row is created for a player if they have no existing rating (default: 1500 rating, 350 RD).

4. **Given** a player has completed fewer than 30 rated games, **When** their rating is displayed anywhere on the platform, **Then** a provisional indicator (e.g., "?" suffix) is shown next to their rating (FR19).

5. **Given** a casual game ends, **When** the result is processed, **Then** no rating changes are applied.

## Tasks / Subtasks

- [x] Task 1: Create `ratings` table migration (AC: #1)
  - [x] 1.1 Create `supabase/migrations/025_ratings.sql` with ratings table, indexes, RLS
  - [x] 1.2 Create `complete_game_with_ratings` PostgreSQL RPC function in same migration for atomic game+rating update
  - [x] 1.3 Apply migration locally and verify with `supabase db reset`

- [x] Task 2: Implement Glicko-2 algorithm in `@cotulenh/common` (AC: #2)
  - [x] 2.1 Create `packages/cotulenh/common/src/glicko2.ts` with pure Glicko-2 calculation
  - [x] 2.2 Export from `packages/cotulenh/common/src/index.ts`
  - [x] 2.3 Create `packages/cotulenh/common/src/glicko2.test.ts` with reference test vectors
  - [x] 2.4 Run tests, verify against known Glicko-2 reference outputs (Mark Glickman's paper)

- [x] Task 3: Integrate ratings into game completion flow (AC: #3, #5)
  - [x] 3.1 Modify `supabase/functions/validate-move/game-end.ts` `completeGame()` to call `complete_game_with_ratings` RPC
  - [x] 3.2 Before calling RPC: fetch both players' current ratings from `ratings` table, calculate new ratings via Glicko-2, pass results to RPC
  - [x] 3.3 For casual games (`is_rated = false`): skip rating calculation, call existing simple game update
  - [x] 3.4 Import Glicko-2 from `@cotulenh/common` in Edge Function (verify Deno compatibility)
  - [x] 3.5 Update `game-end.test.ts` to cover rated and casual game completion paths

- [x] Task 4: Add provisional indicator to rating display (AC: #4)
  - [x] 4.1 Update rating display components in both apps to show "?" when `games_played < 30`
  - [x] 4.2 Update `profiles.rating` cache column when ratings change (in RPC function)

- [x] Task 5: Update TypeScript types and verify end-to-end (AC: #1-#5)
  - [x] 5.1 Update `apps/cotulenh/app/src/lib/types/database.ts` with ratings table types
  - [x] 5.2 Run all existing tests — must not break existing 785+ tests
- [x] 5.3 Full local Playwright E2E: verify friend challenge, invite link, lobby, and profile flows pass after rating integration

## Dev Notes

### Architecture Patterns (MUST FOLLOW)

- **Framework:** SvelteKit (app) with Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`). Next.js 15 (web) for profiles/leaderboard.
- **Edge Functions:** Deno runtime. Service role key for DB writes. JWT verification on every request. Existing pattern in `supabase/functions/validate-move/index.ts`.
- **Atomic transactions:** Architecture requires `supabase.rpc()` calling a PostgreSQL function for atomicity (NFR11). The game status write AND both rating writes MUST be in one transaction.
- **DB naming:** snake_case everywhere. Indexes: `idx_{table}_{columns}`. Tables: plural.
- **RLS:** Players can read any rating. Only service role can write ratings. This matches the validate-move pattern.
- **Vietnamese UI only:** All user-facing text in Vietnamese. No English strings in UI.
- **No barrel exports:** Direct imports only.
- **Tests co-located:** `*.test.ts` next to source files.

### Existing Code — DO NOT RECREATE

| Need | Existing Solution | Location |
|------|-------------------|----------|
| Game completion | `completeGame()` | `supabase/functions/validate-move/game-end.ts` (lines 59-95) |
| Game end detection | `determineGameEndResult()` | `supabase/functions/validate-move/game-end.ts` (lines 32-57) |
| Game end types | `GameEndResult`, `GameEndStatus` | `supabase/functions/validate-move/game-end.ts` (lines 1-7) |
| Edge Function auth pattern | JWT extraction + service role client | `supabase/functions/validate-move/index.ts` (lines 50-73) |
| CORS headers | `CORS_HEADERS` | `supabase/functions/validate-move/index.ts` (lines 14-18) |
| Broadcast pattern | `gameChannel().send()` | `supabase/functions/validate-move/game-end.ts` (lines 83-92) |
| `is_rated` column | Boolean on games table | Migration `012_games_add_is_rated.sql` |
| `profiles.rating` column | Integer cache of latest rating | Migration `018_profiles_rating_and_friend_color.sql` |
| Game result banner | Result display component | `apps/cotulenh/app/src/lib/components/game-result.ts` |
| Player info bar | Displays rating | Both web and app player info components |
| Common package | Shared utilities | `packages/cotulenh/common/src/` |
| Supabase client import | `jsr:@supabase/supabase-js@2` | Edge Function Deno import pattern |

### Critical Implementation Details

#### 1. Glicko-2 Algorithm (`@cotulenh/common`)

Create `packages/cotulenh/common/src/glicko2.ts`:

- **Pure TypeScript, no dependencies.** Must work in both Node.js and Deno.
- Implement the full Glicko-2 algorithm per Mark Glickman's paper.
- **Default values:** rating=1500, RD=350, volatility=0.06 (standard Glicko-2 defaults).
- **System constant (tau):** 0.5 (recommended default for chess).
- **Key function signature:**
  ```typescript
  export function calculateGlicko2(
    player: { rating: number; rd: number; volatility: number },
    opponent: { rating: number; rd: number },
    score: number // 1.0 = win, 0.5 = draw, 0.0 = loss
  ): { rating: number; rd: number; volatility: number }
  ```
- **Test vectors:** Use Glickman's example from the paper (player rated 1500, RD 200, plays 3 opponents). The expected output is well-documented.
- Architecture note: "write from scratch or wrap an npm package (e.g., `glicko2` or `glicko2-lite`)" — prefer writing from scratch since it's ~100 lines and avoids dependency issues in Deno.

#### 2. Database Migration (`025_ratings.sql`)

```sql
-- Table: ratings
CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  time_control text NOT NULL DEFAULT 'rapid',
  rating integer NOT NULL DEFAULT 1500,
  rating_deviation integer NOT NULL DEFAULT 350,
  volatility numeric(10,6) NOT NULL DEFAULT 0.060000,
  games_played integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint: one rating per user per time control
CREATE UNIQUE INDEX idx_ratings_user_time_control ON ratings(user_id, time_control);
CREATE INDEX idx_ratings_user_id ON ratings(user_id);

-- RLS: anyone can read, only service role writes
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ratings" ON ratings FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policies for authenticated — service role bypasses RLS

-- Trigger for updated_at
CREATE TRIGGER ratings_updated_at BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Atomic RPC function** (`complete_game_with_ratings`):
```sql
CREATE OR REPLACE FUNCTION complete_game_with_ratings(
  p_game_id uuid,
  p_status text,
  p_winner text,        -- 'red', 'blue', or null
  p_result_reason text,
  p_is_rated boolean,
  p_red_player_id uuid,
  p_blue_player_id uuid,
  p_red_new_rating integer DEFAULT NULL,
  p_red_new_rd integer DEFAULT NULL,
  p_red_new_volatility numeric DEFAULT NULL,
  p_blue_new_rating integer DEFAULT NULL,
  p_blue_new_rd integer DEFAULT NULL,
  p_blue_new_volatility numeric DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Update game status (always)
  UPDATE games SET
    status = p_status,
    winner = p_winner,
    result_reason = p_result_reason,
    ended_at = now()
  WHERE id = p_game_id;

  -- Update ratings only for rated games
  IF p_is_rated AND p_red_new_rating IS NOT NULL THEN
    -- Upsert red player rating
    INSERT INTO ratings (user_id, time_control, rating, rating_deviation, volatility, games_played)
    VALUES (p_red_player_id, 'rapid', p_red_new_rating, p_red_new_rd, p_red_new_volatility, 1)
    ON CONFLICT (user_id, time_control)
    DO UPDATE SET
      rating = p_red_new_rating,
      rating_deviation = p_red_new_rd,
      volatility = p_red_new_volatility,
      games_played = ratings.games_played + 1;

    -- Upsert blue player rating
    INSERT INTO ratings (user_id, time_control, rating, rating_deviation, volatility, games_played)
    VALUES (p_blue_player_id, 'rapid', p_blue_new_rating, p_blue_new_rd, p_blue_new_volatility, 1)
    ON CONFLICT (user_id, time_control)
    DO UPDATE SET
      rating = p_blue_new_rating,
      rating_deviation = p_blue_new_rd,
      volatility = p_blue_new_volatility,
      games_played = ratings.games_played + 1;

    -- Update profile rating cache
    UPDATE profiles SET rating = p_red_new_rating WHERE id = p_red_player_id;
    UPDATE profiles SET rating = p_blue_new_rating WHERE id = p_blue_player_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This function runs as a single PostgreSQL transaction. If any statement fails, everything rolls back (NFR11).

#### 3. Modify `completeGame()` in `game-end.ts`

Current `completeGame()` does a simple `.from('games').update(...)`. Replace with:

1. **For rated games:** Fetch both players' ratings from `ratings` table (default 1500/350/0.06 if not found). Calculate new ratings using Glicko-2. Call `complete_game_with_ratings` RPC with all params.
2. **For casual games:** Call existing simple game update (no rating params needed, or pass `p_is_rated = false`).
3. **Broadcast `game_end` event** as before, but include `rating_changes` in the payload for rated games:
   ```typescript
   payload: {
     status, winner, result_reason,
     rating_changes: is_rated ? {
       red: { old: oldRedRating, new: newRedRating, delta: newRedRating - oldRedRating },
       blue: { old: oldBlueRating, new: newBlueRating, delta: newBlueRating - oldBlueRating }
     } : null
   }
   ```

**Critical:** `completeGame()` needs access to `games.is_rated`, `games.red_player`, `games.blue_player`. Currently it only receives `gameId` and `endResult`. You'll need to either:
- Fetch the game row inside `completeGame()`, OR
- Pass the game data from the caller (validate-move index.ts already fetches game data early in the flow)

The caller in `index.ts` already has game data including `is_rated`, `red_player`, `blue_player` from the initial game fetch. Pass these to `completeGame()`.

#### 4. Provisional Indicator

- A player is provisional when `games_played < 30` in the `ratings` table.
- Display "?" suffix next to rating (e.g., "1523?") in all rating display locations.
- If a player has no `ratings` row at all, they are unrated — show "1500?" or "--" depending on context.
- Check both apps for rating display: the SvelteKit app (game page, friends list) and Next.js web (profiles, leaderboard page in future).

#### 5. Deno Compatibility for @cotulenh/common

The Edge Function imports from `@cotulenh/core` already work (see `validate-move/index.ts` line 1). Check `validate-move/deno.json` for the import map pattern. The Glicko-2 code in `@cotulenh/common` must be importable the same way. Ensure the import map in `deno.json` includes `@cotulenh/common`.

### Previous Story Intelligence (Epic 5)

**Key learnings from story 5-3 to carry forward:**
- Verification-first approach works well — audit before building
- RLS can silently return 0 rows — always test with real Supabase auth
- Server actions pattern: `return fail(statusCode, { errors: { form: 'errorKey' }, action: 'actionName' })`
- Vietnamese-only UI enforced throughout
- Test count at end of Epic 5: 785+ tests. Do NOT break existing tests
- E2E login helper: Use the hardened login helper that tolerates dev-server reloads

### Git Intelligence

Recent commits show:
- `7a00795` Fix dropdown trigger button nesting
- `0ad8c8d` Fix friend challenge navigation and review gaps
- `76dbba6` Mark story 5-2 done
- Pattern: fix commits are tightly scoped, story completion is clean

### Project Structure Notes

- **Common package:** `packages/cotulenh/common/src/` — add `glicko2.ts` and `glicko2.test.ts` here
- **Edge Functions:** `supabase/functions/validate-move/` — modify `game-end.ts` here
- **Migrations:** `supabase/migrations/` — next migration is `025_ratings.sql`
- **App types:** `apps/cotulenh/app/src/lib/types/database.ts` — add ratings table type
- **Web types:** Check `apps/cotulenh/web/src/lib/types/` for equivalent
- **i18n:** `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — add any new Vietnamese strings
- **Edge Function config:** `supabase/functions/validate-move/deno.json` — may need `@cotulenh/common` import map

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Edge Functions, NFR11, Ratings]
- [Source: _bmad-output/planning-artifacts/prd.md#FR18, FR19, FR20]
- [Source: supabase/functions/validate-move/game-end.ts#completeGame]
- [Source: supabase/migrations/012_games_add_is_rated.sql]
- [Source: supabase/migrations/018_profiles_rating_and_friend_color.sql]
- [Source: _bmad-output/implementation-artifacts/5-3-challenge-friends-from-friends-list.md]
- [Glicko-2 paper: Mark Glickman, "Example of the Glicko-2 System"]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed pre-existing duplicate migration 018 (two files shared version 018). Renamed `018_profiles_rating_and_friend_color.sql` to `0185_profiles_rating_and_friend_color.sql`.
- Added `rating_games_played` column to profiles table (not in original story spec) to support provisional indicator without extra DB queries.

### Completion Notes List

- **Task 1:** Created `025_ratings.sql` with ratings table, unique index per user+time_control, RLS (read-all, service-write), updated_at trigger, and `complete_game_with_ratings` atomic RPC function. Also added `rating_games_played` cache column to profiles.
- **Task 2:** Implemented full Glicko-2 algorithm from scratch (~140 lines, pure TypeScript, no deps). Uses tau=0.5, default 1500/350/0.06. Returns integer rating/rd, 6-decimal volatility. 9 tests pass including reference vectors from Glickman's paper.
- **Task 3:** Refactored `completeGame()` to accept `gameData` (player IDs, isRated flag). For rated games: fetches current ratings, calculates Glicko-2, calls atomic RPC. For casual: calls RPC with `is_rated=false`. Broadcasts `rating_changes` in game_end event. Updated all 5 call sites in `index.ts`. Added `is_rated` to game query. 17 Deno tests pass (12 existing + 5 new).
- **Task 4:** Added provisional "?" indicator to rating display in: own profile, public profile, friends list (SvelteKit app), and player info bar (Next.js web). Updated data flow from DB queries through stores to components. 3 new PlayerInfoBar tests added.
- **Task 5:** Added `ratings` table type and `rating_games_played` to profiles type in `database.ts`. Updated `PlayerInfo` type in web app. Fixed 4 test assertions for new `ratingGamesPlayed` field. All 786 app tests + 509 web tests pass (no regressions).
- **Post-review fixes:** Restricted `complete_game_with_ratings` execution to service-role paths, updated Edge Function error handling to stop masking real rating fetch failures, extended provisional `?` rendering to all surfaced rating views, and rebuilt shared Glicko exports for Deno consumers.
- **Full E2E verification:** `./scripts/local-supabase-safe.sh app-playwright --reporter=line` passed with 22/22 tests after fixing the invite CTA redirect markup and hardening flaky login interactions in the Playwright helpers.

### File List

**New files:**
- `supabase/migrations/025_ratings.sql` — ratings table, RPC function, profiles column
- `packages/cotulenh/common/src/glicko2.ts` — Glicko-2 algorithm implementation
- `packages/cotulenh/common/src/glicko2.test.ts` — 9 unit tests

**Modified files:**
- `supabase/migrations/0185_profiles_rating_and_friend_color.sql` — renamed from 018_ to fix duplicate
- `supabase/functions/validate-move/game-end.ts` — refactored completeGame() with rating support
- `supabase/functions/validate-move/game-end.test.ts` — added 5 rating integration tests
- `supabase/functions/validate-move/index.ts` — added is_rated to query, gameData to completeGame calls
- `packages/cotulenh/common/src/index.ts` — added glicko2 export
- `apps/cotulenh/app/src/lib/types/database.ts` — added ratings table type, rating_games_played
- `apps/cotulenh/app/src/lib/friends/types.ts` — added ratingGamesPlayed to FriendListItem
- `apps/cotulenh/app/src/lib/friends/queries.ts` — fetch rating_games_played
- `apps/cotulenh/app/src/routes/user/profile/+page.server.ts` — fetch rating_games_played
- `apps/cotulenh/app/src/routes/user/profile/+page.svelte` — provisional ? indicator
- `apps/cotulenh/app/src/routes/user/profile/[username]/+page.server.ts` — fetch rating_games_played
- `apps/cotulenh/app/src/routes/user/profile/[username]/+page.svelte` — provisional ? indicator
- `apps/cotulenh/app/src/routes/user/friends/+page.svelte` — provisional ? indicator
- `apps/cotulenh/app/src/routes/user/profile/page.server.test.ts` — updated assertion
- `apps/cotulenh/app/src/routes/user/profile/[username]/page.server.test.ts` — updated assertion
- `apps/cotulenh/web/src/lib/types/game.ts` — added rating_games_played to PlayerInfo
- `apps/cotulenh/web/src/lib/actions/game.ts` — fetch rating_games_played
- `apps/cotulenh/web/src/stores/game-store.ts` — pass ratingGamesPlayed through store
- `apps/cotulenh/web/src/stores/__tests__/game-store.test.ts` — updated assertion
- `apps/cotulenh/web/src/components/game/player-info-bar.tsx` — provisional ? display
- `apps/cotulenh/web/src/components/game/__tests__/player-info-bar.test.tsx` — 3 new tests
- `apps/cotulenh/web/src/components/game/game-page-client.tsx` — pass ratingGamesPlayed prop
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status: in-progress

## Change Log

- **2026-03-30:** Implemented Glicko-2 rating system (Story 6.1) — ratings table, algorithm, game completion integration, provisional indicator, full test coverage
- **2026-03-31:** Addressed code-review findings, fixed invite-link auth redirect markup, hardened Playwright login helpers, and verified the full local app E2E suite passes (22/22)
