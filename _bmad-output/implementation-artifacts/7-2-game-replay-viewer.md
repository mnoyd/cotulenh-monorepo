# Story 7.2: Game Replay Viewer

Status: done

## Story

As a player,
I want to replay a completed game move-by-move,
so that I can study the game and understand what happened at each position.

## Acceptance Criteria

1. **Given** a player navigates to `/game/[id]` for a completed game
   **When** the page loads
   **Then** the game page renders in review mode (not live mode)
   **And** the board shows the final position
   **And** a move list is displayed in the right panel (desktop) or tabs below (mobile)

2. **Given** the game is in review mode
   **When** the player uses the move list navigation (forward/back buttons or clicks a move)
   **Then** the board updates to show the position after the selected move (FR29)
   **And** the current move is highlighted in the move list
   **And** first/previous/next/last navigation controls are available

3. **Given** the player navigates through moves
   **When** keyboard arrow keys are pressed
   **Then** left arrow goes to the previous move and right arrow goes to the next move
   **And** Home key goes to the start position and End key goes to the final position

4. **Given** a completed game's review page loads
   **When** the game data is fetched
   **Then** the `move_history` from `game_states` is used to reconstruct all positions via `CoTuLenh` engine replay from `DEFAULT_POSITION`

## Tasks / Subtasks

- [x] Task 1: Add review mode detection and replay engine (AC: #1, #4)
  - [x] 1.1 Create `useReplayEngine` hook: accepts `move_history: string[]`, creates CoTuLenh instance from `DEFAULT_POSITION`, pre-computes FEN at each move index (0=start, N=final), exposes `currentIndex`, `fenAtIndex`, `goTo(index)`, `goFirst`, `goPrev`, `goNext`, `goLast`
  - [x] 1.2 Detect review mode in `game-page-client.tsx`: when `game.status !== 'started'`, skip realtime subscription, use replay engine instead of game store for board FEN
  - [x] 1.3 Render board in view-only mode with replay engine's current FEN
  - [x] 1.4 Unit tests for `useReplayEngine` (empty history, single move, full game, boundary navigation)

- [x] Task 2: Make MoveList interactive with click navigation (AC: #2)
  - [x] 2.1 Add `currentMoveIndex` and `onMoveClick(index)` props to `MoveList`
  - [x] 2.2 Highlight current move (not just last move) using `currentMoveIndex`
  - [x] 2.3 Make each move cell clickable — clicking red move at row N calls `onMoveClick((N-1)*2)`, blue calls `onMoveClick((N-1)*2+1)`
  - [x] 2.4 Add "start position" row (index -1 or 0) so user can navigate to initial position
  - [x] 2.5 Auto-scroll to keep current move visible
  - [x] 2.6 Preserve existing live-mode behavior (no `onMoveClick`, highlight last move)
  - [x] 2.7 Component tests for interactive MoveList

- [x] Task 3: Wire navigation buttons in GameRightPanel (AC: #2)
  - [x] 3.1 Add review-mode props to `GameRightPanel`: `isReviewMode`, `currentMoveIndex`, `totalMoves`, `onNavigate(action)` where action is 'first' | 'prev' | 'next' | 'last'
  - [x] 3.2 Wire existing navigation buttons (currently disabled placeholders) to call `onNavigate`
  - [x] 3.3 Disable buttons at boundaries: first/prev disabled at index 0, next/last disabled at final move
  - [x] 3.4 Hide `GameControls` (resign/draw/takeback) in review mode
  - [x] 3.5 Component tests for navigation button state

- [x] Task 4: Add keyboard navigation (AC: #3)
  - [x] 4.1 Add `useEffect` keydown listener in game-page-client for review mode: ArrowLeft=prev, ArrowRight=next, Home=first, End=last
  - [x] 4.2 Prevent default scroll behavior for arrow keys when game page is focused
  - [x] 4.3 Unit test for keyboard event handling

- [x] Task 5: Integration and E2E verification (AC: #1-4)
  - [x] 5.1 Verify game history list links (`/game/[id]`) open completed games in review mode
  - [x] 5.2 Run full test suite, ensure no regressions
  - [x] 5.3 Verify Vietnamese labels on all new UI elements

## Dev Notes

### Review Mode Architecture

The game page (`/game/[id]`) already handles both live and completed games. The key distinction:
- **Live mode** (status=`started`): Uses `useGameStore` + realtime channel for live play
- **Review mode** (status!=`started`): Uses a separate replay engine, no realtime, board is view-only

The `game-page-client.tsx` already fetches full game data including `game_state.move_history` via `getGame()` server action. The review mode needs to:
1. Skip `useGameChannel` subscription
2. Create a replay engine from `move_history`
3. Drive board FEN from replay engine instead of game store

### Replay Engine Design

Create `src/hooks/use-replay-engine.ts`:
```
Input: move_history: string[] (SAN array from game_states)
On init:
  1. Create CoTuLenh instance with DEFAULT_POSITION
  2. Pre-compute fens[] array by replaying each move
     fens[0] = DEFAULT_POSITION FEN (start)
     fens[i] = FEN after move_history[i-1]
  3. Set currentIndex = move_history.length (final position)
State: currentIndex, fens[]
Methods: goTo(i), goFirst(), goPrev(), goNext(), goLast()
Return: { currentFen, currentIndex, totalMoves, fenAtIndex, goTo, goFirst, goPrev, goNext, goLast }
```

Import `CoTuLenh` and `DEFAULT_POSITION` from `@cotulenh/core`.

### Existing Components to Modify

1. **`src/components/game/move-list.tsx`** — Currently display-only. Add optional `currentMoveIndex` and `onMoveClick` props. When provided, highlight by `currentMoveIndex` instead of last move, and make cells clickable with `cursor-pointer` and hover state. Keep backward compatible: without these props, behavior is unchanged (live mode).

2. **`src/components/game/game-right-panel.tsx`** — Navigation buttons exist but are non-functional placeholders. Add review-mode props to wire them. Hide `GameControls` section when in review mode (no resign/draw/takeback for completed games).

3. **`src/components/game/game-page-client.tsx`** — Main orchestrator. Add branch: if game status !== 'started', enter review mode path. Use `useReplayEngine` for board FEN, pass navigation callbacks to `GameRightPanel` and `MoveList`.

### Key Technical Constraints

- **Engine import**: `CoTuLenh` and `DEFAULT_POSITION` from `@cotulenh/core` — already dynamically imported on game routes
- **Move format**: `move_history` is `string[]` of SAN strings (e.g., `['Nc3i10', 'e2e4']`)
- **engine.move(san)** returns `MoveResult | null` — null means invalid move (shouldn't happen with stored history, but handle gracefully)
- **Board component** (`BoardContainer`): accepts `fen`, `viewOnly`, `orientation` props — set `viewOnly={true}` and update `fen` from replay engine
- **No Zustand store needed** for replay state — `useReplayEngine` hook with `useState` is sufficient
- **No new database queries** — game data already fetched by existing `getGame()` action
- **No new API routes or server actions needed**
- **Vietnamese-only UI**: all labels in Vietnamese (aria-labels already in Vietnamese in existing nav buttons)
- **No barrel exports** — use direct imports

### Mobile Layout

Per UX spec, move list renders in tabs below the board on mobile. The existing `GameRightPanel` with tabs already handles this responsive layout. No mobile-specific changes needed beyond what `GameRightPanel` already provides.

### Last Move Highlighting on Board

When navigating, the board should highlight the last move played at the current position. If `currentIndex > 0`, highlight the from/to squares of `move_history[currentIndex - 1]`. The `BoardContainer` already supports `lastMove` highlighting — pass the appropriate squares from the replay engine.

### Project Structure Notes

New files follow established patterns:
- `src/hooks/use-replay-engine.ts` — new hook (matches `src/hooks/use-board.ts` pattern)
- `src/hooks/__tests__/use-replay-engine.test.ts` — co-located tests
- `src/components/game/__tests__/move-list.test.tsx` — component tests (if not existing, create)

Modified files:
- `src/components/game/move-list.tsx`
- `src/components/game/game-right-panel.tsx`
- `src/components/game/game-page-client.tsx`

### Testing Standards

- **Vitest** for unit and component tests
- Co-located in `__tests__/` folders
- Test the replay engine thoroughly: empty history, 1 move, many moves, boundary conditions (go prev at start, go next at end)
- Test MoveList click interaction and highlight state
- Test navigation button enable/disable logic
- Test keyboard navigation event handling
- Mock `@cotulenh/core` CoTuLenh class in unit tests

### Previous Story (7.1) Learnings

- Follow the leaderboard/game-history pattern: server component page → client component with props
- Dual layout (mobile/desktop) already handled by `GameRightPanel` tabs
- Vietnamese-only UI enforced throughout
- All 560+ web tests were passing after 7.1 — maintain this
- Code review fixes from 7.1: use DB-backed pagination, proper Vietnamese copy
- Result reason labels (Vietnamese) already defined in `game-history.ts` — reuse if needed for result display in review mode header

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 7, Story 7.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Game State, FR28-30]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Review Mode, MoveList, Game shortcuts]
- [Source: _bmad-output/planning-artifacts/prd.md — FR29]
- [Source: apps/cotulenh/web/src/components/game/game-page-client.tsx — existing game page]
- [Source: apps/cotulenh/web/src/components/game/move-list.tsx — existing move list]
- [Source: apps/cotulenh/web/src/components/game/game-right-panel.tsx — existing nav buttons]
- [Source: apps/cotulenh/web/src/hooks/use-board.ts — board hook pattern]
- [Source: apps/cotulenh/web/src/stores/game-store.ts — game state management]
- [Source: packages/cotulenh/core/src/cotulenh.ts — CoTuLenh engine API]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- scrollIntoView not available in jsdom test environment — used optional chaining (`?.`) to handle gracefully
- MoveList highlight index calculation: uses 1-based indexing where index N = position after move N (0 = start position)

### Completion Notes List
- Created `useReplayEngine` hook with pre-computed FEN array, navigation methods, and lastMoveSan for board highlighting
- Modified `game-page-client.tsx` to detect review mode (status !== 'started'), skip realtime subscription, use replay FEN for board, and add keyboard navigation (ArrowLeft/Right, Home/End)
- Modified `move-list.tsx` to accept optional `currentMoveIndex` and `onMoveClick` props for interactive review mode while preserving live-mode behavior
- Modified `game-right-panel.tsx` to accept review mode props, wire navigation buttons, disable at boundaries, and hide GameControls in review mode
- Added `fenAtIndex` API and index-clamping behavior to `useReplayEngine` for full task/API completeness and safer replay-state updates when history changes
- Added explicit start-position row (`Vi tri ban dau`) in interactive MoveList mode with click navigation to index `0`
- Scoped review-mode keyboard listeners to the focused game page container and added dedicated keyboard navigation test coverage (`ArrowLeft`, `Home`, `End`)
- All 596 web tests pass with 0 regressions

### Change Log
- 2026-04-01: Implemented game replay viewer — all 5 tasks completed
- 2026-04-01: Code review fixes applied (replay API completeness, start-position row, focus-scoped keyboard handling, keyboard tests)

### File List
- apps/cotulenh/web/src/hooks/use-replay-engine.ts (new)
- apps/cotulenh/web/src/hooks/__tests__/use-replay-engine.test.ts (new)
- apps/cotulenh/web/src/components/game/__tests__/game-right-panel.test.tsx (new)
- apps/cotulenh/web/src/components/game/game-page-client.tsx (modified)
- apps/cotulenh/web/src/components/game/move-list.tsx (modified)
- apps/cotulenh/web/src/components/game/game-right-panel.tsx (modified)
- apps/cotulenh/web/src/components/game/__tests__/move-list.test.tsx (modified)
- apps/cotulenh/web/src/components/game/__tests__/game-page-client.test.tsx (modified)

## Senior Developer Review (AI)

### Reviewer
Noy

### Date
2026-04-01

### Outcome
Approved

### Findings Summary
- Fixed all critical/medium findings from adversarial review:
  - Added missing `fenAtIndex` API and replay-index clamping in `useReplayEngine`
  - Implemented required interactive start-position row in `MoveList`
  - Added explicit keyboard navigation test coverage
  - Scoped keyboard handling to focused game page container

### Validation
- `pnpm --filter @cotulenh/web test` passed (`72` files, `596` tests)
