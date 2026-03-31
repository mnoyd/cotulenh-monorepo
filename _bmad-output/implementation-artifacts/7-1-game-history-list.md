# Story 7.1: Game History List

Status: done

## Story

As a player,
I want to see a list of my completed games with key details,
So that I can track my results and find games I want to review.

## Acceptance Criteria

1. **Given** a player views their profile or game history section, **When** the history loads, **Then** a paginated list of completed games is displayed (FR28). **And** each entry shows opponent display name, opponent rating (with provisional marker when applicable), result (win/loss/draw), method (checkmate/resign/timeout/draw/stalemate), and date. **And** the list is sorted by most recent first.

2. **Given** a player has no completed games, **When** they view their game history, **Then** an empty state is shown with an encouraging CTA to play a game.

3. **Given** the game history list has more entries than fit on one page, **When** the player navigates with pagination controls, **Then** additional games are loaded from a paginated query.

4. **Given** a player taps on a game in the history list, **When** the game entry is selected, **Then** they are navigated to the game review page at `/game/[id]`.

## Tasks / Subtasks

- [x] Task 1: Create server-side game history query and formatting (AC: #1)
  - [x] 1.1 Create `apps/cotulenh/web/src/lib/game-history.ts` with `getGameHistory()` server function
  - [x] 1.2 Query `games` table with profile FK joins for opponent display names
  - [x] 1.3 Use joined profile rating fields to display opponent rating with provisional marker
  - [x] 1.4 Implement result determination (`getGameResult`), time control formatting, relative date formatting
  - [x] 1.5 Create `apps/cotulenh/web/src/lib/__tests__/game-history.test.ts` with unit tests for formatting/result logic

- [x] Task 2: Build `GameHistoryTable` responsive component (AC: #1, #2, #4)
  - [x] 2.1 Create `apps/cotulenh/web/src/components/profile/game-history-table.tsx`
  - [x] 2.2 Desktop: table with columns — Opponent, Result, Method, Time Control, Date
  - [x] 2.3 Mobile: compact cards (`md:hidden` / `hidden md:block` pattern)
  - [x] 2.4 Each row/card is a clickable link to `/game/{id}`
  - [x] 2.5 Color-coded result: green (win), red (loss), muted (draw/aborted)
  - [x] 2.6 Opponent rating badge with provisional "?" marker (`rating_games_played < 30`)
  - [x] 2.7 Pagination navigation at bottom (URL query `?page=N`, 20 per page)
  - [x] 2.8 Empty state with `EmptyState` component — "Chua co van dau" + CTA to `/play`
  - [x] 2.9 Create `apps/cotulenh/web/src/components/profile/__tests__/game-history-table.test.tsx`

- [x] Task 3: Create `/game-history` page and loading skeleton (AC: #1, #2, #3)
  - [x] 3.1 Create `apps/cotulenh/web/src/app/(app)/game-history/page.tsx` — server component
  - [x] 3.2 Create `apps/cotulenh/web/src/app/(app)/game-history/loading.tsx` — skeleton
  - [x] 3.3 Create `apps/cotulenh/web/src/app/(app)/game-history/__tests__/page.test.tsx`

- [x] Task 4: Verify end-to-end (AC: #1-#4)
  - [x] 4.1 Run all existing web tests — must not break existing 509+ tests
  - [x] 4.2 Verify no lint errors: `pnpm --filter @cotulenh/web lint`

## Dev Notes

### Architecture Patterns (MUST FOLLOW)

- **Framework:** Next.js 15 (App Router). Server Components by default. Server Actions for data fetching.
- **Styling:** Tailwind CSS 4 with CSS custom properties (`var(--color-*)`, `var(--space-*)`, `var(--text-*)`).
- **UI library:** shadcn/ui components where appropriate. `EmptyState` from `@/components/layout/empty-state`.
- **DB naming:** snake_case everywhere. Tables plural. Indexes: `idx_{table}_{columns}`.
- **RLS:** Completed games are publicly readable (migration 008: `status NOT IN ('started')`). Active games restricted to participants.
- **Vietnamese UI only:** All user-facing text in Vietnamese. No English strings in UI.
- **No barrel exports:** Direct imports only.
- **Tests co-located:** `*.test.ts` / `*.test.tsx` next to source files or in `__tests__/` folder.
- **Border radius:** 0px globally (sharp, utilitarian aesthetic). No shadows. No gradients.

### Existing Code — DO NOT RECREATE

| Need | Existing Solution | Location |
|------|-------------------|----------|
| Game history query + helpers | `queryGameHistory()`, `getGameResult()`, `formatDuration()`, `formatTimeControl()`, `getGameHistoryReasonKey()`, `computeGameStats()` | `apps/cotulenh/app/src/lib/game/history.ts` |
| Leaderboard page pattern | Server component + pagination + empty state | `apps/cotulenh/web/src/app/(app)/leaderboard/page.tsx` |
| Leaderboard table/card component | Dual layout (mobile cards / desktop table) + pagination nav | `apps/cotulenh/web/src/components/profile/activity-leaderboard-table.tsx` |
| Leaderboard loading skeleton | Animate-pulse skeleton | `apps/cotulenh/web/src/app/(app)/leaderboard/loading.tsx` |
| Leaderboard server query | `getActivityLeaderboard()` pattern | `apps/cotulenh/web/src/lib/leaderboard.ts` |
| Empty state component | Reusable icon + message + CTA | `apps/cotulenh/web/src/components/layout/empty-state.tsx` |
| Game types | `GameStatus`, `GamePhase`, `PlayerInfo`, `GameData` | `apps/cotulenh/web/src/lib/types/game.ts` |
| Game server action | `getGame()` with Supabase server client | `apps/cotulenh/web/src/lib/actions/game.ts` |
| Supabase server client | `createClient()` | `apps/cotulenh/web/src/lib/supabase/server.ts` |
| Games table schema | All columns, indexes, RLS | `supabase/migrations/004_games.sql` |
| Public read policy | Completed games readable by anyone | `supabase/migrations/008_games_public_read.sql` |
| Ratings table | Rating data per user per time control | `supabase/migrations/025_ratings.sql` |
| Profiles table | display_name, rating, rating_games_played | `supabase/migrations/001_profiles.sql` + `025_ratings.sql` |
| Game history tests (SvelteKit) | Test patterns for result logic | `apps/cotulenh/app/src/lib/game/history.test.ts` |

### Critical Implementation Details

#### 1. Server-Side Query (`game-history.ts`)

**Follow the leaderboard.ts pattern** but adapted for game history. Use Supabase server client.

**Supabase query pattern (from SvelteKit `history.ts` — adapt to Next.js):**
```typescript
const { data, error } = await supabase
  .from('games')
  .select(`
    id, status, winner, result_reason, time_control, started_at, ended_at,
    is_rated, red_player, blue_player,
    red_profile:profiles!games_red_player_fkey(display_name, rating, rating_games_played),
    blue_profile:profiles!games_blue_player_fkey(display_name, rating, rating_games_played)
  `)
  .or(`red_player.eq.${userId},blue_player.eq.${userId}`)
  .neq('status', 'started')
  .order('ended_at', { ascending: false, nullsFirst: false });
```

**Key differences from leaderboard:**
- Filter by `red_player OR blue_player = current user` (not all games)
- Join profiles for BOTH players (to get opponent name)
- Include `is_rated`, `result_reason`, `time_control`
- Include profile `rating` and `rating_games_played` for opponent rating display with provisional "?"
- Sort by `ended_at` descending (most recent first)

**Rating change data:** The `games` table does NOT store rating deltas. For MVP, show current opponent rating only. Rating change per game would require a new `rating_history` table or storing deltas in the game — this is out of scope. Display: opponent rating badge (with provisional "?" if `rating_games_played < 30`).

**Result determination (port from SvelteKit):**
```typescript
function getGameResult(playerColor: 'red' | 'blue', winner: 'red' | 'blue' | null, status: string): 'win' | 'loss' | 'draw' | 'aborted' {
  if (status === 'aborted') return 'aborted';
  if (winner === null) return 'draw';
  return winner === playerColor ? 'win' : 'loss';
}
```

**Result reason mapping (Vietnamese):**
```typescript
const RESULT_REASON_LABELS: Record<string, string> = {
  checkmate: 'Chiếu hết',
  commander_captured: 'Bắt tướng',
  resign: 'Đầu hàng',
  resignation: 'Đầu hàng',
  timeout: 'Hết giờ',
  stalemate: 'Hòa bí',
  draw: 'Hòa',
  draw_by_agreement: 'Hòa thuận',
  draw_by_timeout_with_pending_offer: 'Hòa do hết giờ',
  dispute: 'Tranh chấp',
  fifty_moves: 'Luật 50 nước',
  threefold_repetition: 'Lặp 3 lần',
  abandonment: 'Bỏ trận',
  stale_cleanup: 'Dọn dẹp'
};
```

**Time control formatting:** `"15+10"` (minutes + increment). Use `formatTimeControl()` from SvelteKit as reference.

**Relative date formatting:** Use a simple helper — "5 phút trước", "2 giờ trước", "3 ngày trước". No external dependency needed.

#### 2. GameHistoryTable Component

**Follow `activity-leaderboard-table.tsx` pattern exactly:**
- Dual layout: `md:hidden` (mobile cards) / `hidden md:block` (desktop table)
- CSS custom properties for all styling
- Pagination at bottom with `?page=N` URL params
- `data-testid` attributes for testing

**Desktop table columns:**
| Column | Content | Style |
|--------|---------|-------|
| Opponent | display_name + rating badge (provisional "?") | `text-[var(--text-sm)]` |
| Result | "Thắng" / "Thua" / "Hòa" / "Hủy" badge | Green/Red/Muted/Muted |
| Method | Vietnamese result reason label | `text-[var(--text-xs)] text-[var(--color-text-muted)]` |
| Time Control | "15+10" | `text-[var(--text-xs)]` |
| Date | Relative timestamp | `text-[var(--text-xs)] text-[var(--color-text-muted)]` |

**Mobile card layout:**
```
┌──────────────────────────────┐
│ đấu với [Opponent] (1523?)   │
│ [Thắng] · Chiếu hết         │
│ 15+10 · 3 phút trước        │
└──────────────────────────────┘
```

**Row click:** Wrap each row/card in `<Link href={`/game/${game.id}`}>`. This navigates to the game review page (Story 7.2 will implement that page — for now, the link target can be a placeholder or 404).

**Result color coding:**
- Win: `text-[var(--color-success)]` + background tint
- Loss: `text-[var(--color-error)]`
- Draw: `text-[var(--color-text-muted)]`
- Aborted: `text-[var(--color-text-muted)]` + strikethrough or dimmed

**Empty state:**
```typescript
import { Swords } from 'lucide-react';
<EmptyState icon={Swords} message="Chưa có ván đấu nào" actionLabel="Chơi ngay" actionHref="/play" />
```

#### 3. Page Implementation

**File:** `apps/cotulenh/web/src/app/(app)/game-history/page.tsx`

Follow leaderboard page pattern:
```typescript
type GameHistoryPageProps = {
  searchParams?: Promise<{ page?: string }>;
};

export default async function GameHistoryPage({ searchParams }: GameHistoryPageProps) {
  const params = searchParams ? await searchParams : {};
  const currentPage = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const { games, currentUserId } = await getGameHistory();

  if (games.length === 0) {
    return (/* empty state */);
  }

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageGames = games.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <GameHistoryTable games={pageGames} currentUserId={currentUserId} page={page} totalPages={totalPages} />
  );
}
```

#### 4. Loading Skeleton

Follow `leaderboard/loading.tsx` pattern: animate-pulse rows with placeholder blocks.

### Previous Story Intelligence (Epic 6)

**Key learnings from Stories 6.1–6.3:**
- Leaderboard (6.3) established the exact pattern for list pages in the web app: server query → page component → table/card component → tests
- Code review caught missing wiring in 6.2 — verify all data flows are connected
- `rating_games_played` on profiles enables provisional "?" display without extra queries
- `COMPLETED_STATUSES` for filtering: `['checkmate', 'resign', 'timeout', 'stalemate', 'draw', 'dispute']` — exclude `'started'` and `'aborted'` for most views (but include `'aborted'` in history for completeness)
- Test count: 786 app + 509 web + 22 E2E. Do NOT break existing tests
- Vietnamese-only UI enforced throughout
- SvelteKit app has a complete game history implementation (`apps/cotulenh/app/src/lib/game/history.ts`) — port the query pattern and helpers, DO NOT import from it

### Anti-Patterns to Avoid

1. **DO NOT create a Zustand store** for game history. This is a server-fetched list — use Server Components.
2. **DO NOT create database migrations.** No schema changes needed. The `games`, `profiles`, and `ratings` tables have everything.
3. **DO NOT create Edge Functions or RPCs.** Simple Supabase `.from('games').select()` query is sufficient.
4. **DO NOT import from the SvelteKit app.** Port the logic to the web app independently.
5. **DO NOT add English strings to UI.** Vietnamese only.
6. **DO NOT create barrel exports (index.ts re-exports).** Direct imports only.
7. **DO NOT implement infinite scroll.** Use URL-based pagination (`?page=N`) like the leaderboard. Simpler, SSR-friendly.
8. **DO NOT try to display per-game rating changes.** The games table doesn't store rating deltas. Show opponent's current rating only.

### Project Structure Notes

**New files to create:**
- `apps/cotulenh/web/src/lib/game-history.ts` — server query + formatting helpers
- `apps/cotulenh/web/src/lib/__tests__/game-history.test.ts` — unit tests
- `apps/cotulenh/web/src/components/profile/game-history-table.tsx` — responsive component
- `apps/cotulenh/web/src/components/profile/__tests__/game-history-table.test.tsx` — component tests
- `apps/cotulenh/web/src/app/(app)/game-history/page.tsx` — page
- `apps/cotulenh/web/src/app/(app)/game-history/loading.tsx` — skeleton
- `apps/cotulenh/web/src/app/(app)/game-history/__tests__/page.test.tsx` — page test

**No modifications to existing files** — this is a purely additive story.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7, Story 7.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Game History, FR28]
- [Source: _bmad-output/planning-artifacts/prd.md#FR28]
- [Source: apps/cotulenh/app/src/lib/game/history.ts — SvelteKit game history query and helpers]
- [Source: apps/cotulenh/web/src/lib/leaderboard.ts — leaderboard query pattern]
- [Source: apps/cotulenh/web/src/components/profile/activity-leaderboard-table.tsx — table/card pattern]
- [Source: apps/cotulenh/web/src/app/(app)/leaderboard/page.tsx — page pattern]
- [Source: apps/cotulenh/web/src/components/layout/empty-state.tsx — empty state component]
- [Source: supabase/migrations/004_games.sql — games table schema]
- [Source: supabase/migrations/008_games_public_read.sql — public read RLS]
- [Source: supabase/migrations/025_ratings.sql — ratings table]
- [Source: _bmad-output/implementation-artifacts/6-3-activity-leaderboard.md — previous story]

### Git Intelligence

Recent commits:
- `cee9461` Implement activity leaderboard
- `9fa2a0e` Implement post-game rating display
- `a471cd0` Fix rating review gaps and stabilize app e2e
- Pattern: clean story implementations, fix commits after code review

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Ported game history query from SvelteKit app, adapted for Next.js Server Components with Supabase server client
- Created `getGameHistory()` server function with profile FK joins for opponent display names and ratings
- Implemented `getGameResult()`, `getResultReasonLabel()`, `formatTimeControl()`, `formatRelativeDate()` helper functions
- Built responsive `GameHistoryTable` component following the leaderboard dual-layout pattern (mobile cards / desktop table)
- Result color coding: green (win), red (loss), muted (draw/aborted) with background tint on rows
- Opponent rating displayed with provisional "?" marker for `rating_games_played < 30`
- Per-game rating changes are not displayed (out of scope — games table doesn't store deltas, as noted in Dev Notes)
- Vietnamese-only UI throughout: result labels, reason labels, relative date formatting, page text
- URL-based pagination with `?page=N`, 20 items per page
- Empty state using `EmptyState` component with Swords icon and CTA to `/play`
- Each game entry links to `/game/{id}` for future game review page (Story 7.2)
- Loading skeleton follows leaderboard pattern
- 16 unit tests for formatting/result logic, 13 component tests, 2 page tests = 31 new tests
- All 560 web tests pass (up from 509), 0 lint errors
- Code review fixes applied: server-side pagination now uses Supabase `range` + `count`, page query params are wired and clamped, desktop cells are fully clickable links, and mobile copy now uses Vietnamese-only "đấu với"
- Added focused server query tests for paginated fetching and expanded page/component tests for pagination contract
- Story scope aligned to opponent rating display (no per-game delta source in current schema)

### File List

- `apps/cotulenh/web/src/lib/game-history.ts` (new)
- `apps/cotulenh/web/src/lib/__tests__/game-history.test.ts` (new)
- `apps/cotulenh/web/src/components/profile/game-history-table.tsx` (new)
- `apps/cotulenh/web/src/components/profile/__tests__/game-history-table.test.tsx` (new)
- `apps/cotulenh/web/src/app/(app)/game-history/page.tsx` (new)
- `apps/cotulenh/web/src/app/(app)/game-history/loading.tsx` (new)
- `apps/cotulenh/web/src/app/(app)/game-history/__tests__/page.test.tsx` (new)
- `apps/cotulenh/web/src/lib/__tests__/game-history-server.test.ts` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-03-31: Story 7.1 implemented — game history list page with server query, responsive table/card component, pagination, empty state, and 31 new tests
- 2026-03-31: Code review fixes applied — DB pagination via `range`, page clamping/re-fetch behavior, desktop full-cell row links, Vietnamese copy fix, and additional pagination-focused tests

## Senior Developer Review (AI)

### Outcome

Approved after scope alignment.

### Findings Addressed

- Replaced in-memory pagination with DB-backed pagination in `getGameHistory` using `count: 'exact'` and `range(...)`.
- Wired `/game-history?page=N` to server query parameters and added out-of-range page clamping with re-fetch.
- Improved desktop table clickability by making each cell a full-area link target.
- Replaced English mobile label `vs` with Vietnamese `đấu với`.
- Added tests for paginated query contract and page-level pagination behavior.

### Scope Alignment

- Updated AC/tasks to match implemented and documented MVP behavior: opponent rating display with provisional marker, not per-game rating delta.
