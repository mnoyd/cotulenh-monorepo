# Story 6.1: Game History List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to see a list of my past games,
so that I can track my play history and find games to review.

## Acceptance Criteria (BDD)

1. **Given** an authenticated user navigates to `/user/history`
   **When** the page loads
   **Then** they see a list of their completed games showing opponent display name, result (win/loss/draw), date, and game duration, ordered by most recent first (FR35)

2. **Given** a user has no completed games
   **When** the page loads
   **Then** they see an empty state message encouraging them to play

3. **Given** a user views another user's public profile at `/user/profile/[username]`
   **When** the page loads
   **Then** the game history section shows that user's completed games (FR9 — public game history)

4. **Given** the game list
   **When** a user clicks on a game entry
   **Then** they are navigated to `/user/history/[gameId]` for replay

## Tasks / Subtasks

### Database: Public Game History RLS Policy

- [x] Task 1: Create migration `008_games_public_read.sql` (AC: 3)
  - [x] 1.1 Add a new SELECT policy allowing anyone to read completed games:
    ```sql
    -- Migration: 008_games_public_read
    -- Allows public read access to completed games for game history and profiles (FR9)
    CREATE POLICY "Anyone can view completed games"
      ON public.games FOR SELECT
      USING (status NOT IN ('started'));
    ```
    This is required because the existing `"Players can view own games"` policy restricts SELECT to `auth.uid() = red_player OR auth.uid() = blue_player`, which blocks FR9 (viewing another user's game history on their public profile). The architecture explicitly resolved this gap: "Updated games RLS to allow public reads of completed games" [Source: architecture.md, Gap Resolution table].
  - [x] 1.2 Verify the policy does NOT expose in-progress games (`status = 'started'`). Only completed/terminal games are visible.

### Server: Game History Query Function

- [x] Task 2: Create `$lib/game/history.ts` query helper (AC: 1, 3)
  - [x] 2.1 Create file at `apps/cotulenh/app/src/lib/game/history.ts`
  - [x] 2.2 Implement `getGameHistory()` function:
    ```typescript
    import type { SupabaseClient } from '@supabase/supabase-js';
    import { logger } from '@cotulenh/common';

    export interface GameHistoryItem {
      id: string;
      opponentDisplayName: string;
      playerColor: 'red' | 'blue';
      status: string;
      winner: 'red' | 'blue' | null;
      resultReason: string | null;
      timeControl: { timeMinutes: number; incrementSeconds: number };
      startedAt: string;
      endedAt: string | null;
    }

    export async function getGameHistory(
      supabase: SupabaseClient,
      userId: string
    ): Promise<GameHistoryItem[]> {
      const { data, error } = await supabase
        .from('games')
        .select(`
          id, status, winner, result_reason, time_control, started_at, ended_at,
          red_player, blue_player,
          red_profile:profiles!games_red_player_fkey(display_name),
          blue_profile:profiles!games_blue_player_fkey(display_name)
        `)
        .or(`red_player.eq.${userId},blue_player.eq.${userId}`)
        .neq('status', 'started')
        .order('ended_at', { ascending: false, nullsFirst: false });

      if (error) {
        logger.error(error, 'Failed to load game history');
        return [];
      }

      return (data ?? []).map((game) => {
        const isRedPlayer = game.red_player === userId;
        return {
          id: game.id,
          opponentDisplayName: isRedPlayer
            ? (game.blue_profile as any)?.display_name ?? '???'
            : (game.red_profile as any)?.display_name ?? '???',
          playerColor: isRedPlayer ? 'red' : 'blue',
          status: game.status,
          winner: game.winner,
          resultReason: game.result_reason,
          timeControl: game.time_control as { timeMinutes: number; incrementSeconds: number },
          startedAt: game.started_at,
          endedAt: game.ended_at
        };
      });
    }
    ```
  - [x] 2.3 Implement `getPublicGameHistory()` for profile pages (takes a profile `userId` instead of auth user):
    ```typescript
    export async function getPublicGameHistory(
      supabase: SupabaseClient,
      profileUserId: string
    ): Promise<GameHistoryItem[]> {
      // Same query but for a specific user's completed games
      // Depends on the new RLS policy from Task 1
    }
    ```
    Note: Can reuse/share the same implementation as `getGameHistory` since the query is identical — the RLS policy handles visibility.
  - [x] 2.4 Implement `getGameStats()` for computing real stats:
    ```typescript
    export function computeGameStats(
      games: GameHistoryItem[]
    ): { gamesPlayed: number; wins: number; losses: number } {
      // Count completed (non-aborted) games
      // Count wins where winner === playerColor
      // Count losses where winner !== playerColor && winner !== null
    }
    ```

### Server: Game History Page Load

- [x] Task 3: Create `routes/user/history/+page.server.ts` (AC: 1, 2)
  - [x] 3.1 Create directory `apps/cotulenh/app/src/routes/user/history/`
  - [x] 3.2 Implement server load:
    ```typescript
    import type { PageServerLoad } from './$types';
    import { getGameHistory } from '$lib/game/history';

    export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
      const { user } = await safeGetSession();
      // No auth redirect needed — /user/+layout.server.ts handles it

      const games = await getGameHistory(supabase, user!.id);

      return { games };
    };
    ```
    Note: Auth is already handled by `/user/+layout.server.ts` which calls `requireAuth()` for all `/user/*` routes except public profiles. No need for a redundant auth check in this file.

### UI: Game History Page

- [x] Task 4: Create `routes/user/history/+page.svelte` (AC: 1, 2, 4)
  - [x] 4.1 Create the page component following the friends list pattern for layout structure
  - [x] 4.2 Display game list with each row showing:
    - Opponent display name (use inline text, not `PlayerCard` — simpler for a list row)
    - Player's color indicator (small red/blue dot or badge)
    - Result: Win / Loss / Draw / Aborted — use color coding from `GameResultBanner.svelte`:
      - Win: `#22c55e` (green)
      - Loss: `var(--theme-text-primary)` (neutral)
      - Draw: `#f59e0b` (amber)
      - Aborted: `var(--theme-text-secondary)` (gray)
    - Result reason (e.g., "by checkmate", "by timeout", "by resignation")
    - Date: formatted using `toLocaleDateString()` with locale-aware formatting
    - Duration: computed from `endedAt - startedAt`, display as "Xm Ys"
    - Time control: display as "X+Y" (e.g., "5+0", "10+5")
  - [x] 4.3 Each game row is clickable → navigates to `/user/history/${game.id}`
  - [x] 4.4 Empty state when no games: icon (`History` from lucide-svelte) + encouraging message to play
  - [x] 4.5 Responsive: cards stack vertically on mobile, could use a compact table-like layout on desktop
  - [x] 4.6 Use `<a>` tags with `href` for game links (SvelteKit enhanced navigation) rather than `onclick` with `goto`
  - [x] 4.7 Style consistency: use `var(--theme-*)` CSS variables, `border-radius: 12px` on cards, `8px` on inner items

### UI: Public Profile Game History

- [x] Task 5: Update public profile to show real game history (AC: 3)
  - [x] 5.1 Update `routes/user/profile/[username]/+page.server.ts`:
    - After loading profile, look up the profile user's `id` from the profiles query
    - Query their game history using `getPublicGameHistory()` / `getGameHistory()`
    - Compute real stats using `computeGameStats()`
    - Return `games` and real `stats` (replacing hardcoded `{ gamesPlayed: 0, wins: 0, losses: 0 }`)
    ```typescript
    // Current code returns hardcoded stats — replace with:
    const profileUser = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .eq('display_name', displayName)
      ...

    const games = await getGameHistory(supabase, profileUser.id);
    const stats = computeGameStats(games);
    ```
  - [x] 5.2 Update `routes/user/profile/[username]/+page.svelte`:
    - Replace the static "Game History Placeholder (AC3)" with actual game list
    - Reuse the same game row component/pattern from the `/user/history` page
    - Show a limited number of games (e.g., last 10) with a "View All" link to `/user/history` if it's the current user's profile, or just show the list for other users
    - Keep the empty state when no games (already has icon + text)
  - [x] 5.3 Each game entry on the public profile is also clickable → navigates to `/user/history/[gameId]` (placeholder for Story 6.2)

### i18n

- [x] Task 6: Add i18n strings (AC: 1-4)
  - [x] 6.1 Add to `$lib/i18n/types.ts` (new key types):
    - `'gameHistory.title'` — page title
    - `'gameHistory.empty.title'` — empty state heading
    - `'gameHistory.empty.subtitle'` — empty state encouragement
    - `'gameHistory.result.win'` — "Win"
    - `'gameHistory.result.loss'` — "Loss"
    - `'gameHistory.result.draw'` — "Draw"
    - `'gameHistory.result.aborted'` — "Aborted"
    - `'gameHistory.reason.checkmate'` — "by checkmate"
    - `'gameHistory.reason.resign'` — "by resignation"
    - `'gameHistory.reason.timeout'` — "by timeout"
    - `'gameHistory.reason.stalemate'` — "by stalemate"
    - `'gameHistory.reason.draw_by_agreement'` — "by agreement"
    - `'gameHistory.reason.draw_by_timeout_with_pending_offer'` — "by timeout (draw pending)"
    - `'gameHistory.reason.dispute'` — "by dispute"
    - `'gameHistory.duration'` — "{minutes}m {seconds}s"
    - `'gameHistory.viewAll'` — "View All Games"
    - `'gameHistory.vs'` — "vs"
  - [x] 6.2 Add English translations to `$lib/i18n/locales/en.ts`
  - [x] 6.3 Add Vietnamese translations to `$lib/i18n/locales/vi.ts`:
    - `'gameHistory.title'` → `'Lịch Sử Trận Đấu'`
    - `'gameHistory.empty.title'` → `'Chưa Có Trận Đấu'`
    - `'gameHistory.empty.subtitle'` → `'Hãy bắt đầu chơi để xem lịch sử!'`
    - `'gameHistory.result.win'` → `'Thắng'`
    - `'gameHistory.result.loss'` → `'Thua'`
    - `'gameHistory.result.draw'` → `'Hòa'`
    - `'gameHistory.result.aborted'` → `'Hủy'`
    - etc.

### Tests

- [x] Task 7: Write server load tests (AC: 1, 2, 3)
  - [x] 7.1 Create `apps/cotulenh/app/src/routes/user/history/page.server.test.ts`:
    - Test: returns game list with correctly transformed camelCase data
    - Test: returns empty array for user with no completed games
    - Test: handles Supabase query error (returns empty array, logs error)
    - Test: filters out `status = 'started'` games
    - Test: correctly identifies opponent and player color
  - [x] 7.2 Create `apps/cotulenh/app/src/lib/game/history.test.ts`:
    - Test: `getGameHistory()` returns mapped `GameHistoryItem[]`
    - Test: `computeGameStats()` correctly counts wins/losses/draws
    - Test: `computeGameStats()` excludes aborted games from stats
    - Test: handles edge case of null `ended_at`
  - [x] 7.3 Update/create `apps/cotulenh/app/src/routes/user/profile/[username]/page.server.test.ts`:
    - Test: returns real game stats (not hardcoded zeros)
    - Test: returns game history for the profile user

## Dev Notes

### Critical: RLS Policy Gap

The existing `004_games.sql` migration only has `"Players can view own games"` which uses `USING (auth.uid() = red_player OR auth.uid() = blue_player)`. This blocks FR9 (public game history on other users' profiles). A new migration (`008_games_public_read.sql`) is **required** before the public profile game history can work. The architecture explicitly identified and resolved this gap.

### What Already Exists — DO NOT Recreate

| Feature | Location | Status |
|---------|----------|--------|
| `games` table with full schema | `supabase/migrations/004_games.sql` | Complete |
| Auth guard for `/user/*` routes | `routes/user/+layout.server.ts` | Complete — handles auth for `/user/history` |
| Public profile page with placeholder | `routes/user/profile/[username]/+page.svelte` | Has `<!-- Game History Placeholder (AC3) -->` at line 69 |
| Public profile server load | `routes/user/profile/[username]/+page.server.ts` | Returns hardcoded `stats: { gamesPlayed: 0, wins: 0, losses: 0 }` — must replace |
| `GameResultBanner.svelte` | `$lib/components/GameResultBanner.svelte` | Win/loss/draw color scheme reference |
| `PlayerCard.svelte` | `$lib/components/PlayerCard.svelte` | Available but may not be needed for list rows |
| shadcn-svelte UI components | `$lib/components/ui/` | `Badge`, `Card`, `Button`, `Separator` available |
| `Database` types | `$lib/types/database.ts` | `Database['public']['Tables']['games']['Row']` type |
| Profile-related i18n keys | `$lib/i18n/locales/en.ts` | `profile.public.gameHistory.title`, `profile.public.gameHistory.empty` already exist |
| Friends list page (pattern reference) | `routes/user/friends/+page.svelte` | Canonical list page pattern |
| Supabase FK relationships | `$lib/types/database.ts` | `games_red_player_fkey`, `games_blue_player_fkey` for profile joins |
| `GameSession` + `MoveHistory` | `$lib/game-session.svelte.ts`, `$lib/components/MoveHistory.svelte` | For Story 6.2 replay — NOT needed for this story |

### Architecture Constraints

- **Svelte 5 runes only** — `$state`, `$derived`, `$effect`. Never Svelte 4 stores.
- **`.svelte.ts` extension** for files using runes (not needed for this story — no reactive state files).
- **`$lib/` import alias** — never relative `../../../` paths.
- **Co-located tests** as `filename.test.ts`.
- **i18n required** — all user-facing strings in both `en` and `vi`.
- **Use existing `logger`** from `@cotulenh/common` — never raw `console.log`.
- **Check Supabase `{ data, error }` returns** — never assume success.
- **Date formatting**: use native `toLocaleDateString()` with locale from `i18n.getLocale()`. NO date libraries (architecture mandate).
- **DB → TypeScript boundary**: snake_case from DB → camelCase in TypeScript (transform at query boundary).
- **CSS**: Tailwind 4 utilities + `var(--theme-*)` CSS custom properties. `border-radius: 12px` on cards, `8px` on inner items.
- **Icon library**: `lucide-svelte` (e.g., `History`, `Trophy`, `Swords`, `Clock`, `ChevronRight`).
- **Touch targets**: `min-height: 44px; min-width: 44px` on all interactive elements.

### Supabase Query Pattern for Game History

Use FK-based join to resolve opponent names in a single query (observed pattern from `play/online/[gameId]/+page.server.ts`):

```typescript
const { data, error } = await supabase
  .from('games')
  .select(`
    id, status, winner, result_reason, time_control, started_at, ended_at,
    red_player, blue_player,
    red_profile:profiles!games_red_player_fkey(display_name),
    blue_profile:profiles!games_blue_player_fkey(display_name)
  `)
  .or(`red_player.eq.${userId},blue_player.eq.${userId}`)
  .neq('status', 'started')
  .order('ended_at', { ascending: false, nullsFirst: false });
```

### Auth Pattern

The `/user/+layout.server.ts` already handles auth for all `/user/*` routes:
```typescript
export const load: LayoutServerLoad = async ({ locals, url }) => {
  const isPublicProfile = /^\/user\/profile\/[^/]+$/.test(url.pathname);
  if (isPublicProfile) return {};
  await requireAuth(locals, url);
};
```

This means `/user/history` is automatically protected. The page's `+page.server.ts` can safely access `user` via `safeGetSession()` without redundant redirect logic.

### Duration Calculation

Compute from `started_at` and `ended_at` timestamps:
```typescript
function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return '—';
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}
```

### Result Determination Logic

```typescript
function getGameResult(game: GameHistoryItem): 'win' | 'loss' | 'draw' | 'aborted' {
  if (game.status === 'aborted') return 'aborted';
  if (game.winner === null) return 'draw'; // draw, stalemate
  return game.winner === game.playerColor ? 'win' : 'loss';
}
```

### Time Control Display

Format as `"Xm+Ys"` or `"X+Y"` from the `time_control` jsonb:
```typescript
function formatTimeControl(tc: { timeMinutes: number; incrementSeconds: number }): string {
  return `${tc.timeMinutes}+${tc.incrementSeconds}`;
}
```

### What NOT To Do

- Do NOT implement pagination — load all games server-side for now (SSR). Pagination can be added later if needed.
- Do NOT implement the game replay viewer — that is Story 6.2.
- Do NOT create a `GameHistoryCard.svelte` component in `$lib/components/` — inline the rendering in the page. Extract to a component only if genuinely reused.
- Do NOT modify the `/user/+layout.server.ts` auth guard — `/user/history` is already protected.
- Do NOT use `$effect` or reactive state for this page — it's a pure SSR page with no client-side reactivity needed.
- Do NOT add realtime subscriptions — game history is a static list loaded on page visit.
- Do NOT import or use `GameSession` — that's for Story 6.2 (replay).

### Previous Story Learnings (from 5.7)

- Supabase FK join syntax: `red_profile:profiles!games_red_player_fkey(display_name)` — confirmed working.
- `{ count: 'exact' }` on Supabase update calls — not needed for SELECT queries.
- Test mock pattern: `createMockLoadEvent()` with `mockSupabase.from.mockReturnValue({ select: selectMock })` chain.
- i18n keys must be added to ALL THREE files: `types.ts`, `en.ts`, `vi.ts`.

### Project Structure Notes

- New route follows existing convention: `routes/user/history/+page.server.ts` + `+page.svelte`
- Query helper follows `$lib/friends/queries.ts` pattern → `$lib/game/history.ts`
- Co-located test follows `routes/user/profile/page.server.test.ts` pattern
- No new packages or dependencies needed

### File Locations

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/008_games_public_read.sql` | CREATE | RLS policy for public reads of completed games |
| `apps/cotulenh/app/src/lib/game/history.ts` | CREATE | `getGameHistory()`, `computeGameStats()` query functions |
| `apps/cotulenh/app/src/lib/game/history.test.ts` | CREATE | Unit tests for query functions |
| `apps/cotulenh/app/src/routes/user/history/+page.server.ts` | CREATE | SSR load for game history page |
| `apps/cotulenh/app/src/routes/user/history/+page.svelte` | CREATE | Game history list UI |
| `apps/cotulenh/app/src/routes/user/history/page.server.test.ts` | CREATE | Server load tests |
| `apps/cotulenh/app/src/routes/user/profile/[username]/+page.server.ts` | MODIFY | Add real game history + stats (replace hardcoded zeros) |
| `apps/cotulenh/app/src/routes/user/profile/[username]/+page.svelte` | MODIFY | Replace game history placeholder with actual list |
| `apps/cotulenh/app/src/lib/i18n/types.ts` | MODIFY | Add `gameHistory.*` key types |
| `apps/cotulenh/app/src/lib/i18n/locales/en.ts` | MODIFY | English game history strings |
| `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` | MODIFY | Vietnamese game history strings |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6 overview, Lines 281-292]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 6.1 details, Lines 973-997]
- [Source: _bmad-output/planning-artifacts/architecture.md — Games RLS gap resolution, Gap Resolution table]
- [Source: _bmad-output/planning-artifacts/architecture.md — Public game history requirement, "Anyone can read completed games"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Enforcement rules, Lines 542-553]
- [Source: _bmad-output/planning-artifacts/architecture.md — GameHistory route `/user/history`, page patterns]
- [Source: supabase/migrations/004_games.sql — Full games schema + current RLS policies]
- [Source: apps/cotulenh/app/src/routes/user/+layout.server.ts — Auth guard for /user/* routes]
- [Source: apps/cotulenh/app/src/routes/user/profile/[username]/+page.server.ts — Hardcoded stats (lines 31-35)]
- [Source: apps/cotulenh/app/src/routes/user/profile/[username]/+page.svelte — Game History Placeholder (line 69)]
- [Source: apps/cotulenh/app/src/routes/user/friends/+page.svelte — List page pattern reference]
- [Source: apps/cotulenh/app/src/lib/types/database.ts — Games Row type + FK relationships]
- [Source: apps/cotulenh/app/src/routes/play/online/[gameId]/+page.server.ts — Supabase FK join pattern]
- [Source: apps/cotulenh/app/src/lib/components/GameResultBanner.svelte — Win/loss/draw color scheme]
- [Source: _bmad-output/implementation-artifacts/5-7-draw-offers-rematch.md — Previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed TypeScript type error in `history.ts`: Supabase FK join returns `{ display_name: any }[]` — resolved by casting through `unknown` to `{ display_name: string } | null`.

### Completion Notes List

- Task 1: Created `008_games_public_read.sql` migration with `status NOT IN ('started')` RLS policy. Verified in-progress games excluded.
- Task 2: Implemented `getGameHistory()`, `getPublicGameHistory()`, `computeGameStats()`, `getGameResult()`, `formatDuration()`, `formatTimeControl()` in `$lib/game/history.ts`. Shared internal `queryGameHistory()` to avoid duplication.
- Task 3: Created SSR page server load at `routes/user/history/+page.server.ts`. Auth handled by parent layout.
- Task 4: Created game history list page with all required UI elements: color dot, opponent name, result with color coding, reason, date, duration, time control. Uses `<a>` tags for SvelteKit navigation. Empty state with History icon. Responsive layout. 44px touch targets.
- Task 5: Updated public profile `+page.server.ts` to query `id` from profiles, fetch real game history, and compute real stats (replacing hardcoded zeros). Updated `+page.svelte` to display last 10 games with "View All" link. Game rows clickable to `/user/history/[gameId]`.
- Task 6: Added 22 `gameHistory.*` keys to `types.ts`, `en.ts`, and `vi.ts` (including online-core result reasons like `resignation`, `commander_captured`, `fifty_moves`, `threefold_repetition`).
- Task 7: Created 39 tests across 3 files after review hardening. history.test.ts (24 tests), page.server.test.ts (5 tests), profile page.server.test.ts (10 tests — includes ownership gate coverage).
- Code review follow-up (2026-03-03): fixed public-profile `View All` ownership gate, normalized history reason-key mapping to cover runtime result reasons, localized duration rendering via i18n templates, removed dead `computeGameStats` parameter, and added regression tests.

### File List

| File | Action |
|------|--------|
| `supabase/migrations/008_games_public_read.sql` | CREATE |
| `apps/cotulenh/app/src/lib/game/history.ts` | CREATE |
| `apps/cotulenh/app/src/lib/game/history.test.ts` | CREATE |
| `apps/cotulenh/app/src/routes/user/history/+page.server.ts` | CREATE |
| `apps/cotulenh/app/src/routes/user/history/+page.svelte` | CREATE |
| `apps/cotulenh/app/src/routes/user/history/page.server.test.ts` | CREATE |
| `apps/cotulenh/app/src/routes/user/profile/[username]/+page.server.ts` | MODIFY |
| `apps/cotulenh/app/src/routes/user/profile/[username]/+page.svelte` | MODIFY |
| `apps/cotulenh/app/src/routes/user/profile/[username]/page.server.test.ts` | MODIFY |
| `apps/cotulenh/app/src/lib/i18n/types.ts` | MODIFY |
| `apps/cotulenh/app/src/lib/i18n/locales/en.ts` | MODIFY |
| `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` | MODIFY |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | MODIFY |

### Change Log

- 2026-03-03: Implemented Story 6.1 — Game History List. Added RLS policy for public game reads, created game history query functions, built `/user/history` page with full game list UI, updated public profiles with real game history and stats, added i18n strings in en/vi, wrote 32 tests. All 551 tests pass.
- 2026-03-03: Senior review fixes applied — ownership-gated public-profile "View All", localized duration rendering, normalized result-reason mapping for all runtime reasons, helper cleanup, test expansion, and sprint-status sync.

## Senior Developer Review (AI)

### Reviewer

GPT-5 Codex

### Date

2026-03-03

### Outcome

Changes Requested (resolved in this pass) -> Approved

### Summary of Findings and Resolutions

- CRITICAL: "View All" link displayed for any public profile with >10 games despite story requirement to show it only for the current user's profile. Fixed by deriving `canViewAll` from session/profile ownership in `+page.server.ts` and gating render in `+page.svelte`.
- HIGH: Result reasons generated by online game core (`resignation`, `commander_captured`, `fifty_moves`, `threefold_repetition`) were not translated and were silently hidden. Fixed by centralizing reason-to-i18n-key mapping in `$lib/game/history.ts` and adding missing i18n keys/translations in `types.ts`, `en.ts`, and `vi.ts`.
- MEDIUM: Duration text was hardcoded (`Xm Ys`) instead of localized with i18n templates. Fixed by introducing `getDurationParts()` and rendering duration via `gameHistory.duration` translation placeholders on both history UIs.
- MEDIUM: Story file list missed the modified `sprint-status.yaml`. Fixed by adding the file to File List and syncing story status in sprint tracking.
- LOW: `computeGameStats` had an unused optional parameter. Fixed by removing the dead parameter and simplifying the win/loss path.

### Verification

- `pnpm --filter @cotulenh/app test -- src/lib/game/history.test.ts src/routes/user/history/page.server.test.ts src/routes/user/profile/[username]/page.server.test.ts` (pass, 39 tests)
- `pnpm --filter @cotulenh/app run check-types` (fails due to pre-existing unrelated errors in other modules; no new errors from files touched in this review pass)
