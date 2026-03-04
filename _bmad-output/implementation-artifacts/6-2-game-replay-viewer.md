# Story 6.2: Game Replay Viewer

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to replay a completed game move-by-move with forward/backward navigation,
so that I can review what happened and learn from past games.

## Acceptance Criteria (BDD)

1. **Given** a user navigates to `/user/history/[gameId]`
   **When** the page loads
   **Then** the game's PGN is loaded, the board shows the starting position, and the move list is displayed (FR36)

2. **Given** a user viewing a replayed game
   **When** they click forward (or press right arrow)
   **Then** the board advances one move and the current move is highlighted in the move list (FR37)

3. **Given** a user viewing a replayed game
   **When** they click backward (or press left arrow)
   **Then** the board goes back one move (FR37)

4. **Given** a user viewing a replayed game
   **When** they click on a specific move in the move list
   **Then** the board jumps to that position

5. **Given** the replay viewer
   **When** rendered
   **Then** game metadata is shown (players, result, date, time control) and the board is in view-only mode (no piece interaction)

## Tasks / Subtasks

### Server: Game Replay Page Load

- [x] Task 1: Create `routes/user/history/[gameId]/+page.server.ts` (AC: 1, 5)
  - [x] 1.1 Create directory `apps/cotulenh/app/src/routes/user/history/[gameId]/`
  - [x] 1.2 Implement server load:
    ```typescript
    import { error } from '@sveltejs/kit';
    import type { PageServerLoad } from './$types';

    export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
      const { user } = await safeGetSession();

      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select(`
          id, pgn, status, winner, result_reason, time_control, started_at, ended_at,
          red_player, blue_player,
          red_profile:profiles!games_red_player_fkey(display_name),
          blue_profile:profiles!games_blue_player_fkey(display_name)
        `)
        .eq('id', params.gameId)
        .single();

      if (fetchError || !game) {
        throw error(404, 'Game not found');
      }

      // Only completed games can be replayed
      if (game.status === 'started') {
        throw error(404, 'Game not found');
      }

      const redProfile = game.red_profile as unknown as { display_name: string } | null;
      const blueProfile = game.blue_profile as unknown as { display_name: string } | null;

      return {
        game: {
          id: game.id,
          pgn: game.pgn ?? '',
          status: game.status,
          winner: game.winner as 'red' | 'blue' | null,
          resultReason: game.result_reason,
          timeControl: game.time_control as { timeMinutes: number; incrementSeconds: number },
          startedAt: game.started_at,
          endedAt: game.ended_at,
          redPlayer: {
            id: game.red_player,
            displayName: redProfile?.display_name ?? '???'
          },
          bluePlayer: {
            id: game.blue_player,
            displayName: blueProfile?.display_name ?? '???'
          }
        },
        currentUserId: user?.id ?? null
      };
    };
    ```
  - [x] 1.3 Note: Auth is handled by `/user/+layout.server.ts`. The RLS policy `008_games_public_read.sql` allows reading completed games. The 404 for `status === 'started'` prevents viewing in-progress games.

### UI: Game Replay Page

- [x] Task 2: Create `routes/user/history/[gameId]/+page.svelte` (AC: 1-5)
  - [x] 2.1 Create the page component with the following architecture:
    - Load PGN into `GameSession` via `loadFromSync(pgn)`:
      ```typescript
      import { GameSession } from '$lib/game-session.svelte';

      const session = new GameSession();
      const startingFen = session.fen; // Capture before loading PGN
      session.loadFromSync(data.game.pgn);
      ```
    - Maintain a `viewIndex` state for move navigation:
      - `-1` = starting position (show `startingFen`)
      - `0` to `history.length - 1` = viewing a specific move (show `session.history[viewIndex].after`)
    - The board is always `viewOnly: true` — use a simple Config object, NOT `session.boardConfig` (which includes movable piece logic)
    - Use `extractLastMoveSquares` from `$lib/game-session-helpers` for last move highlighting
  - [x] 2.2 Board area:
    - Use `BoardContainer` with `viewOnly: true`
    - Orientation: determine from `data.currentUserId` — if the current user is a player, orient to their color; otherwise default to red
    - Import `$lib/styles/board.css` for board styling (same as live game page)
  - [x] 2.3 MoveHistory component:
    - Pass the `session` instance — the existing `MoveHistory` component handles click-to-jump via `session.previewMove(index)`
    - **IMPORTANT**: The MoveHistory component's click handler calls `session.previewMove(index)` which sets `session.historyViewIndex`. The page must sync its local `viewIndex` from `session.historyViewIndex` via `$derived`:
      ```typescript
      let viewIndex = $derived(session.historyViewIndex);
      ```
    - When MoveHistory clicks a move, `session.previewMove(index)` is called, which updates `session.historyViewIndex`, which updates `viewIndex`, which updates the board FEN
    - The "Live" button in MoveHistory calls `session.cancelPreview()` which sets `historyViewIndex = -1` — in replay context this means "final position" (NOT starting position)
  - [x] 2.4 Navigation controls bar (below the board):
    - **First** (⏮ / ChevronFirst): jump to starting position — use direct FEN override, set `session.cancelPreview()` then override board to starting FEN. OR: manage a separate `atStart` boolean state
    - **Previous** (◀ / ChevronLeft): step back one move
    - **Next** (▶ / ChevronRight): step forward one move
    - **Last** (⏭ / ChevronLast): jump to final position — call `session.cancelPreview()`
    - Buttons should be disabled at boundaries (First/Prev disabled at start; Next/Last disabled at end)
    - Use `<button>` elements with `min-height: 44px` touch targets
    - Navigation logic:
      ```typescript
      function goFirst() {
        session.previewMove(0); // Show position after first move
        // For true "starting position", override board FEN separately
      }
      function goPrev() {
        if (session.historyViewIndex === -1) {
          // At final position, go to last move
          session.previewMove(session.history.length - 1);
        } else if (session.historyViewIndex > 0) {
          session.previewMove(session.historyViewIndex - 1);
        }
        // else already at start
      }
      function goNext() {
        if (session.historyViewIndex !== -1) {
          if (session.historyViewIndex >= session.history.length - 1) {
            session.cancelPreview(); // Back to final position
          } else {
            session.previewMove(session.historyViewIndex + 1);
          }
        }
      }
      function goLast() {
        session.cancelPreview(); // Show final position
      }
      ```
  - [x] 2.5 Keyboard navigation:
    - `ArrowLeft` → goPrev()
    - `ArrowRight` → goNext()
    - `Home` → goFirst()
    - `End` → goLast()
    - Use `svelte:window on:keydown` handler
    - Skip if target is an INPUT element
    - NOTE: Do NOT use `session.handleKeydown` — it includes undo/reset/escape logic meant for live gameplay
  - [x] 2.6 Game metadata panel:
    - Red player name + Blue player name (with color dot indicators)
    - Result badge: Win/Loss/Draw/Aborted with color coding from Story 6.1 (`#22c55e`, theme-text-primary, `#f59e0b`, theme-text-secondary)
    - Result reason: use `getGameHistoryReasonKey()` from `$lib/game/history.ts`
    - Time control: use `formatTimeControl()` from `$lib/game/history.ts`
    - Date: `toLocaleDateString()` with locale from `i18n.getLocale()`
    - Duration: use `getDurationParts()` from `$lib/game/history.ts` + i18n template
  - [x] 2.7 Copy PGN button:
    - Use `navigator.clipboard.writeText()` with the PGN string
    - Show toast on success (`svelte-sonner`)
    - Clipboard icon from `lucide-svelte`
  - [x] 2.8 "Back to History" link:
    - `<a href="/user/history">` with chevron-left icon
    - Place at top of page or in metadata area

### UI: Responsive Layout

- [x] Task 3: Implement responsive layout for replay page (AC: 1-5)
  - [x] 3.1 Desktop layout (≥768px):
    - Two-column: board on the left (60-65% width), sidebar on the right (35-40%)
    - Sidebar contains: game metadata at top, MoveHistory below, navigation controls at bottom
    - Board area uses `container-type: size` for proper BoardContainer sizing
  - [x] 3.2 Mobile layout (<768px):
    - Single column: board at top, metadata below, MoveHistory + navigation below
    - MoveHistory gets a fixed max-height with scroll
  - [x] 3.3 CSS styling:
    - Use `var(--theme-*)` CSS custom properties
    - `border-radius: 12px` on cards, `8px` on inner items
    - Panel backgrounds: `var(--theme-bg-panel, #222)`
    - Border: `1px solid var(--theme-border, #444)`

### i18n: Replay Viewer Strings

- [x] Task 4: Add i18n strings (AC: 1-5)
  - [x] 4.1 Add to `$lib/i18n/types.ts` (new key types):
    - `'gameReplay.title'` — page title (e.g., "Game Replay")
    - `'gameReplay.copyPgn'` — "Copy PGN"
    - `'gameReplay.pgnCopied'` — "PGN copied!"
    - `'gameReplay.backToHistory'` — "Back to History"
    - `'gameReplay.gameNotFound'` — "Game not found"
    - `'gameReplay.startPosition'` — "Starting Position"
    - `'gameReplay.finalPosition'` — "Final Position"
    - `'gameReplay.moveOf'` — "Move {current} of {total}"
  - [x] 4.2 Add English translations to `$lib/i18n/locales/en.ts`
  - [x] 4.3 Add Vietnamese translations to `$lib/i18n/locales/vi.ts`:
    - `'gameReplay.title'` → `'Xem Lại Trận Đấu'`
    - `'gameReplay.copyPgn'` → `'Sao Chép PGN'`
    - `'gameReplay.pgnCopied'` → `'Đã sao chép PGN!'`
    - `'gameReplay.backToHistory'` → `'Quay Lại Lịch Sử'`
    - `'gameReplay.gameNotFound'` → `'Không tìm thấy trận đấu'`
    - `'gameReplay.startPosition'` → `'Vị Trí Ban Đầu'`
    - `'gameReplay.finalPosition'` → `'Vị Trí Cuối Cùng'`
    - `'gameReplay.moveOf'` → `'Nước {current} / {total}'`

### Tests

- [x] Task 5: Write tests (AC: 1-5)
  - [x] 5.1 Create `apps/cotulenh/app/src/routes/user/history/[gameId]/page.server.test.ts`:
    - Test: returns complete game data with PGN for a completed game
    - Test: returns player display names via FK join
    - Test: returns 404 error for non-existent game ID
    - Test: returns 404 error for in-progress game (status === 'started')
    - Test: handles Supabase query error gracefully
    - Test: returns null currentUserId when no session
    - Test mock pattern: follow existing `routes/play/online/[gameId]/page.server.test.ts` and `routes/user/profile/[username]/page.server.test.ts` patterns

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Initial replay state now renders starting position by default for games with history (`showStartPosition` initializes from history length). [apps/cotulenh/app/src/routes/user/history/[gameId]/+page.svelte:42]
- [x] [AI-Review][HIGH] First/Prev/Next/Last navigation now uses deterministic replay control transitions, and First persists start state correctly. [apps/cotulenh/app/src/routes/user/history/[gameId]/+page.svelte:99]
- [x] [AI-Review][MEDIUM] Result badge semantics now use win/loss from viewer perspective for participants with Story 6.1 color mapping. [apps/cotulenh/app/src/routes/user/history/[gameId]/+page.svelte:177]
- [x] [AI-Review][MEDIUM] Replaced remaining hardcoded replay strings with i18n keys (including nav aria labels). [apps/cotulenh/app/src/routes/user/history/[gameId]/+page.svelte:257]
- [x] [AI-Review][MEDIUM] Added replay interaction coverage for navigation transitions and keyboard mappings. [apps/cotulenh/app/src/routes/user/history/[gameId]/replay-controls.test.ts:1]

## Dev Notes

### Critical: "Starting Position" Navigation

The `GameSession` class has a `historyViewIndex` convention where `-1` means "current game position" (the final position after PGN load). There is NO built-in concept of "before first move" / starting position.

**Recommended approach:**
1. Create `GameSession()` — capture `session.fen` as `startingFen` BEFORE calling `loadFromSync(pgn)`
2. Call `session.loadFromSync(pgn)` — now session has full history, fen = final position
3. In the page, derive the board FEN directly rather than using `session.boardConfig`:
   ```typescript
   // If historyViewIndex === -1, session.fen returns final position
   // To show "starting position", override with startingFen
   let boardFen = $derived(
     showStartPosition ? startingFen :
     session.historyViewIndex !== -1 ? session.history[session.historyViewIndex].after :
     session.fen // final position
   );
   ```
4. Build board Config manually for replay (simpler than session.boardConfig):
   ```typescript
   let replayBoardConfig = $derived({
     fen: boardFen,
     viewOnly: true,
     lastMove: currentLastMove, // from extractLastMoveSquares
     orientation: boardOrientation,
     check: false // Not needed for replay
   });
   ```

### What Already Exists — DO NOT Recreate

| Feature | Location | Status |
|---------|----------|--------|
| `GameSession` class | `$lib/game-session.svelte.ts` | Complete — `loadFromSync()`, `previewMove()`, `cancelPreview()`, `history`, `historyViewIndex` |
| `MoveHistory` component | `$lib/components/MoveHistory.svelte` | Complete — click-to-jump, auto-scroll, move chips with red/blue coloring |
| `BoardContainer` component | `$lib/components/BoardContainer.svelte` | Complete — viewOnly support, 12/13 aspect ratio |
| `extractLastMoveSquares()` | `$lib/game-session-helpers.ts` | Complete — handles deploy moves, standard moves |
| `getGameHistoryReasonKey()` | `$lib/game/history.ts` | Complete — maps result_reason to i18n key |
| `getDurationParts()` | `$lib/game/history.ts` | Complete — returns { minutes, seconds } |
| `formatTimeControl()` | `$lib/game/history.ts` | Complete — returns "X+Y" string |
| Games RLS for completed games | `supabase/migrations/008_games_public_read.sql` | Complete — anyone can read completed games |
| Auth guard for `/user/*` | `routes/user/+layout.server.ts` | Complete — handles auth for all user routes |
| Game history page links to `/user/history/{id}` | `routes/user/history/+page.svelte` (line 52), `routes/user/profile/[username]/+page.svelte` (line 129) | Complete — already link to this route |
| Board CSS styles | `$lib/styles/board.css` | Complete — import in page for board styling |
| `$lib/features/game/utils.js` | Board config helpers | `coreToBoardColor`, `mapLastMoveToBoardFormat` available if needed |

### Architecture Constraints

- **Svelte 5 runes only** — `$state`, `$derived`, `$effect`. Never Svelte 4 stores.
- **`$lib/` import alias** — never relative `../../../` paths.
- **Co-located tests** as `filename.test.ts` (within route directory, named `page.server.test.ts`).
- **i18n required** — all user-facing strings in both `en` and `vi`.
- **Use existing `logger`** from `@cotulenh/common` — never raw `console.log`.
- **Check Supabase `{ data, error }` returns** — never assume success.
- **Date formatting**: use native `toLocaleDateString()` with locale from `i18n.getLocale()`. NO date libraries.
- **DB → TypeScript boundary**: snake_case from DB → camelCase in TypeScript (transform at query boundary in +page.server.ts).
- **CSS**: `var(--theme-*)` CSS custom properties. `border-radius: 12px` on cards, `8px` on inner items.
- **Icon library**: `lucide-svelte` (e.g., `ChevronLeft`, `ChevronRight`, `ChevronsLeft`, `ChevronsRight`, `Copy`, `ArrowLeft`).
- **Touch targets**: `min-height: 44px; min-width: 44px` on all interactive elements (nav buttons, copy button, back link).
- **Board aspect ratio**: 12/13 — NEVER modify. Use `container-type: size` on the board wrapper.
- **No realtime subscriptions** — replay is static, loaded once on page visit.
- **No `$effect` for board sync** — since we're not using `session.boardConfig`, sync the board via `BoardContainer`'s reactive `config` prop. BoardContainer calls `boardApi.set(config)` internally when config changes.

### Supabase Query Pattern

The `pgn` column stores the full game in PGN format. It is nullable (games that never started may have null PGN). Handle null PGN as empty string — the page will show an empty move list.

```sql
-- From 004_games.sql
pgn text,  -- Full game in PGN format, populated on game completion
```

### Online Game Page Pattern Reference

The live game page at `routes/play/online/[gameId]/+page.svelte` shows how to compose BoardContainer with game state. Key differences for the replay viewer:

| Aspect | Live Game | Replay Viewer |
|--------|-----------|---------------|
| Session | `OnlineGameSession` (realtime) | `GameSession` (local, PGN-loaded) |
| Board config | `onlineSession.session.boardConfig` (includes movable) | Custom config with `viewOnly: true` |
| Board sync | `$effect(() => session.setupBoardEffect())` | Reactive `config` prop on BoardContainer |
| Keyboard | `session.handleKeydown` (includes undo/reset) | Custom handler (only arrow nav) |
| Layout | Single column, board + status bars | Two column (desktop), board + sidebar |
| MoveHistory | Not shown (online page doesn't display it) | Shown in sidebar |

### UX Spec Guidance

From the UX design specification:
- Desktop: board left, move list right (side-by-side)
- Mobile: board top, move list in scrollable area below
- Arrow left/right step through moves
- Move list uses SAN notation in monospace font, current move highlighted with primary color
- PGN export: "Copy" button using clipboard API, no file download for MVP
- Entry: from "Review Game" in result banner OR game history list (1 tap from history)
- Review is "1 tap from history" per the tap count budget principle

### Previous Story Learnings (from 6.1)

- Supabase FK join syntax for player names: `red_profile:profiles!games_red_player_fkey(display_name)` — confirmed working. Cast via `as unknown as { display_name: string } | null`.
- Test mock pattern: `createMockLoadEvent()` with chained Supabase mocks.
- i18n keys must be added to ALL THREE files: `types.ts`, `en.ts`, `vi.ts`.
- Color coding: Win=#22c55e, Loss=theme-text-primary, Draw=#f59e0b, Aborted=theme-text-secondary.
- The `canViewAll` ownership gate pattern from 6.1 code review — consider if any similar gating is needed here (likely not — completed games are public via RLS).

### What NOT To Do

- Do NOT create a new game session class or wrapper — use `GameSession` directly with `loadFromSync()`.
- Do NOT modify `GameSession` class — it already has everything needed (loadFromSync, previewMove, cancelPreview, history).
- Do NOT modify `MoveHistory` component — it already handles click-to-navigate and works with any GameSession.
- Do NOT use `session.handleKeydown` — it includes undo/reset logic that doesn't apply to replay.
- Do NOT use `session.boardConfig` — it includes movable piece dests which are irrelevant for viewOnly replay. Build a simpler config.
- Do NOT add realtime subscriptions — replay is a static page.
- Do NOT import `OnlineGameSession` — that's for live games.
- Do NOT implement analysis features, annotations, or engine evaluation — those are out of scope.
- Do NOT implement auto-play/animation — out of MVP scope.
- Do NOT modify the `/user/+layout.server.ts` auth guard.

### Project Structure Notes

- New route follows existing convention: `routes/user/history/[gameId]/+page.server.ts` + `+page.svelte`
- This is the target route that Story 6.1's game history list already links to (`/user/history/${game.id}`)
- Co-located test follows existing patterns
- No new packages or dependencies needed

### File Locations

| File | Action | Purpose |
|------|--------|---------|
| `apps/cotulenh/app/src/routes/user/history/[gameId]/+page.server.ts` | CREATE | SSR load — fetch game + PGN + player names |
| `apps/cotulenh/app/src/routes/user/history/[gameId]/+page.svelte` | CREATE | Replay viewer UI — board + move list + metadata + navigation |
| `apps/cotulenh/app/src/routes/user/history/[gameId]/page.server.test.ts` | CREATE | Server load tests |
| `apps/cotulenh/app/src/lib/i18n/types.ts` | MODIFY | Add `gameReplay.*` key types |
| `apps/cotulenh/app/src/lib/i18n/locales/en.ts` | MODIFY | English replay viewer strings |
| `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` | MODIFY | Vietnamese replay viewer strings |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6 overview, Lines 281-294]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 6.2 details, Lines 1001-1031]
- [Source: _bmad-output/planning-artifacts/architecture.md — Game replay architecture, Lines 346-347]
- [Source: _bmad-output/planning-artifacts/architecture.md — Route mapping /user/history/[gameId], Lines 257-270]
- [Source: _bmad-output/planning-artifacts/architecture.md — File structure history/[gameId], Lines 677-694]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 5: Post-Game Review, Lines 786-812]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — MoveList component spec, Lines 885-892]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Game review visual treatment, Line 588]
- [Source: apps/cotulenh/app/src/lib/game-session.svelte.ts — GameSession class, loadFromSync, previewMove, history nav]
- [Source: apps/cotulenh/app/src/lib/components/MoveHistory.svelte — Move list component with click-to-jump]
- [Source: apps/cotulenh/app/src/lib/components/BoardContainer.svelte — Board wrapper with viewOnly support]
- [Source: apps/cotulenh/app/src/lib/game-session-helpers.ts — extractLastMoveSquares helper]
- [Source: apps/cotulenh/app/src/lib/game/history.ts — getGameHistoryReasonKey, getDurationParts, formatTimeControl]
- [Source: apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte — Live game page pattern reference]
- [Source: apps/cotulenh/app/src/routes/play/online/[gameId]/+page.server.ts — Game server load pattern]
- [Source: supabase/migrations/004_games.sql — Games table schema with pgn column]
- [Source: supabase/migrations/008_games_public_read.sql — RLS for public reads of completed games]
- [Source: _bmad-output/implementation-artifacts/6-1-game-history-list.md — Previous story learnings and patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Task 1: Created `+page.server.ts` with Supabase query using FK joins for player display names. Handles 404 for non-existent and in-progress games. No auth redirect needed (handled by `/user/+layout.server.ts`).
- Task 2: Created `+page.svelte` with GameSession-based replay viewer. Board uses custom viewOnly config (not session.boardConfig). Navigation via First/Prev/Next/Last buttons with disabled states at boundaries. MoveHistory click-to-jump syncs via `$derived(session.historyViewIndex)`. Added `showStartPosition` flag for navigating to position before first move (not natively supported by GameSession).
- Task 3: Responsive layout with mobile (single column, board + controls + sidebar) and desktop (two-column: 60/40 split). `container-type: size` on board wrapper for proper BoardContainer sizing. Nav controls appear below board on mobile, in sidebar on desktop.
- Task 4: Added 8 i18n keys (`gameReplay.*`) to types.ts, en.ts, and vi.ts.
- Task 5: Created 6 server load tests following existing mock patterns (chained Supabase mocks). Tests cover: complete game data, player display names, 404 for non-existent game, 404 for in-progress game, Supabase error handling, null currentUserId for unauthenticated users.

### File List

| File | Action |
|------|--------|
| `apps/cotulenh/app/src/routes/user/history/[gameId]/+page.server.ts` | CREATED |
| `apps/cotulenh/app/src/routes/user/history/[gameId]/+page.svelte` | CREATED |
| `apps/cotulenh/app/src/routes/user/history/[gameId]/page.server.test.ts` | CREATED |
| `apps/cotulenh/app/src/routes/user/history/[gameId]/replay-controls.ts` | CREATED |
| `apps/cotulenh/app/src/routes/user/history/[gameId]/replay-controls.test.ts` | CREATED |
| `apps/cotulenh/app/src/lib/components/MoveHistory.svelte` | MODIFIED |
| `apps/cotulenh/app/src/lib/i18n/types.ts` | MODIFIED |
| `apps/cotulenh/app/src/lib/i18n/locales/en.ts` | MODIFIED |
| `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` | MODIFIED |

### Change Log

- 2026-03-04: Implemented game replay viewer (Story 6.2) — server load with FK joins, replay UI with GameSession/BoardContainer/MoveHistory, keyboard navigation, responsive layout, i18n (EN+VI), and 6 server load tests. All 577 tests pass (0 regressions).
- 2026-03-03: Senior developer code review completed. Story moved back to in-progress with AI review follow-up items for replay navigation correctness, i18n completeness, result semantics, and missing UI coverage.
- 2026-03-03: Addressed AI review follow-ups: fixed start-position initialization/navigation, localized replay control labels, corrected participant result semantics, and added replay control tests.
- 2026-03-03: Addressed focused re-review finding by aligning move-list highlighting with explicit starting-position mode; BMAD review approved.

## Senior Developer Review (AI)

### Reviewer

Noy

### Date

2026-03-03

### Outcome

Approved

### Summary

- Reviewed Story 6.2 implementation against ACs, task checklist, and claimed file list.
- All previously raised HIGH/MEDIUM issues are fixed and checked in review follow-ups.
- Focused re-review finding on start-position/list-highlight sync was fixed; story is ready to close.

### Validation Performed

- `git status --porcelain`
- `git diff --name-only`
- `git diff --cached --name-only`
- `pnpm --filter @cotulenh/app test -- src/routes/user/history/[gameId]/page.server.test.ts`
- `pnpm --filter @cotulenh/app test -- src/routes/user/history/[gameId]/replay-controls.test.ts`
- `pnpm --filter @cotulenh/app test`
- `pnpm --filter @cotulenh/app run check-types` (fails due pre-existing repo-wide type issues unrelated to Story 6.2 changes)
