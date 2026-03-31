# Story 6.3: Activity Leaderboard

Status: done

## Story

As a player,
I want to see a leaderboard of the most active players this month,
So that I feel part of a community and have motivation to play more.

## Acceptance Criteria

1. **Given** an authenticated player navigates to `/leaderboard`
   - **When** the page loads
   - **Then** a leaderboard is displayed ranking players by number of games played in the current calendar month
   - **And** each row shows rank, display name, games played this month, and current rating
   - **And** the current user's row is highlighted if they appear on the leaderboard

2. **Given** the leaderboard data is queried
   - **When** the results are returned
   - **Then** only completed games (not aborted) are counted
   - **And** the leaderboard is sorted by games played descending

3. **Given** the leaderboard page is loading
   - **When** data is being fetched
   - **Then** skeleton screens are shown for the table

4. **Given** a player is on mobile
   - **When** the leaderboard renders
   - **Then** the layout is responsive — compact list or card view on small screens, table on desktop

## Tasks / Subtasks

- [x] Task 1: Add server-side leaderboard query and aggregation
  - [x] Query only completed monthly games from Supabase
  - [x] Aggregate games played for both participants
  - [x] Join profile display name and rating data
  - [x] Rank entries by games played descending
- [x] Task 2: Build reusable leaderboard presentation component
  - [x] Render desktop table with rank, player, games played, rating, and last active
  - [x] Render compact mobile cards
  - [x] Highlight the current user entry
  - [x] Pin the current user when off the visible page
- [x] Task 3: Replace placeholder `/leaderboard` page
  - [x] Render real leaderboard data
  - [x] Handle empty monthly state
  - [x] Add pagination for the top 50 entries
  - [x] Add a route loading skeleton
- [x] Task 4: Add focused tests
  - [x] Aggregation and ranking tests
  - [x] Table rendering tests
  - [x] Page rendering test
  - [x] Loading skeleton test

## Dev Notes

### Implementation Notes

- Implemented the monthly leaderboard in the web app only, using the existing server Supabase client and no schema changes.
- The query counts both `red_player` and `blue_player` for every completed monthly game and excludes aborted/in-progress rows by filtering to completed terminal statuses only.
- The page displays up to the top 50 entries, paginated 20 per page, with the current user pinned below the visible page when they rank outside the current slice.
- Ratings reuse the existing provisional `?` display convention via `rating_games_played`.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm --filter @cotulenh/web test -- --run src/lib/__tests__/leaderboard.test.ts src/components/profile/__tests__/activity-leaderboard-table.test.tsx src/app/(app)/leaderboard/__tests__/page.test.tsx src/app/(app)/leaderboard/__tests__/loading.test.tsx`
- `pnpm --filter @cotulenh/web lint` completed with two pre-existing warnings in `board-container.tsx` and `chess-clock.tsx`.

### Completion Notes List

- Added a shared server-side leaderboard query and pure aggregation/ranking helpers in `src/lib/leaderboard.ts`.
- Replaced the placeholder leaderboard page with a real leaderboard view backed by monthly completed-game data.
- Added `ActivityLeaderboardTable` with mobile cards, desktop table layout, pagination, current-user highlighting, and pinned current-user fallback.
- Added a dedicated route loading skeleton and focused tests covering aggregation, component rendering, page rendering, and loading behavior.

### File List

- `apps/cotulenh/web/src/lib/leaderboard.ts`
- `apps/cotulenh/web/src/lib/__tests__/leaderboard.test.ts`
- `apps/cotulenh/web/src/components/profile/activity-leaderboard-table.tsx`
- `apps/cotulenh/web/src/components/profile/__tests__/activity-leaderboard-table.test.tsx`
- `apps/cotulenh/web/src/app/(app)/leaderboard/page.tsx`
- `apps/cotulenh/web/src/app/(app)/leaderboard/loading.tsx`
- `apps/cotulenh/web/src/app/(app)/leaderboard/__tests__/page.test.tsx`
- `apps/cotulenh/web/src/app/(app)/leaderboard/__tests__/loading.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- **2026-03-31:** Implemented story 6.3 activity leaderboard in the web app with monthly aggregation, responsive rendering, pagination, and focused tests.

## Senior Developer Review (AI)

### Outcome

Approved.

### Notes

- The placeholder route was replaced with a real monthly leaderboard implementation.
- Aggregation logic is covered by unit tests and the route renders the expected responsive UI states.
