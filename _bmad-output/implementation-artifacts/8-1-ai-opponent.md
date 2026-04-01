# Story 8.1: AI Opponent

Status: done

## Story

As a player,
I want to play against an AI opponent when no human opponents are available,
So that I can practice and experiment with strategies anytime.

## Acceptance Criteria

### AC1: AI Engine Ready and Enabled

```gherkin
Given the AI engine is ready and the feature is enabled
When a player navigates to `/game/ai`
Then a difficulty selector is displayed with selectable levels (Dễ, Trung bình, Khó)
And on selection, a local game starts using `@cotulenh/core` engine running client-side only (no server, no Edge Functions, no Realtime)
And the game uses the same board layout, deploy session, clocks, and result UX as multiplayer (reuses game page components)
And the AI responds to moves locally using the engine
And the game is always unrated (no Glicko-2 impact)
```

### AC2: AI Engine Not Yet Ready (Coming Soon)

```gherkin
Given the AI engine is not yet ready
When a player navigates to `/game/ai` or taps "Play vs AI" anywhere on the platform
Then a "Coming Soon" page is displayed with a friendly Vietnamese message (e.g., "Chúng tôi đang phát triển tính năng này — sắp ra mắt!")
And a board visual is shown in the background to maintain the platform's look and feel
And a CTA directs the player to the lobby to find a human opponent instead
```

### AC3: Feature Flag Transition

```gherkin
Given the AI feature transitions from "coming soon" to available
When the feature flag or route is enabled
Then the "Coming Soon" content is replaced with the difficulty selector and AI game flow
And no user-facing announcement is needed — the feature simply becomes available
```

### AC4: AI Game Result

```gherkin
Given an AI game ends
When the result is displayed
Then a game result banner shows the outcome
And "Chơi lại với AI" (Play AI again) and "Đổi độ khó" (Change Difficulty) buttons are shown
And no rating change is displayed
```

## Tasks / Subtasks

- [x] Task 1: AI engine module (AC: #1)
  - [x] 1.1 Create `src/lib/ai-engine.ts` — AI move selection logic using `@cotulenh/core`
  - [x] 1.2 Implement difficulty strategies: Easy (random legal move), Medium (material-weighted random), Hard (1-ply lookahead with material eval)
  - [x] 1.3 Add async wrapper with `setTimeout` delay to simulate "thinking" (200ms Easy, 500ms Medium, 800ms Hard)
  - [x] 1.4 Unit tests for AI engine in `src/lib/__tests__/ai-engine.test.ts`
- [x] Task 2: AI game store (AC: #1)
  - [x] 2.1 Create `src/stores/ai-game-store.ts` — Zustand store for AI game state
  - [x] 2.2 Reuse `CoTuLenh` engine instance, manage phase (deploying → playing → ended)
  - [x] 2.3 Implement `makeMove` that triggers AI response after player move
  - [x] 2.4 Implement AI deploy phase (auto-deploy for AI side)
  - [x] 2.5 Handle game end detection (checkmate, stalemate, resign)
  - [x] 2.6 Unit tests for AI game store
- [x] Task 3: AI difficulty selector component (AC: #1)
  - [x] 3.1 Create `src/components/game/ai-difficulty-selector.tsx`
  - [x] 3.2 Three buttons: Dễ / Trung bình / Khó with brief Vietnamese descriptions
  - [x] 3.3 Selection starts game immediately (2 taps from dashboard)
  - [x] 3.4 Tests for selector component
- [x] Task 4: AI game page (AC: #1, #2, #3)
  - [x] 4.1 Create route `src/app/(app)/game/ai/page.tsx`
  - [x] 4.2 Feature flag check — show Coming Soon or AI game based on flag
  - [x] 4.3 Coming Soon page with board background visual, Vietnamese message, CTA to lobby
  - [x] 4.4 AI game page reusing `BoardContainer`, `PlayerInfoBar`, `GameRightPanel`, `MoveList`
  - [x] 4.5 AI opponent bar shows "AI — Dễ/Trung bình/Khó", no clock, always unrated
  - [x] 4.6 No draw/takeback controls for AI games
  - [x] 4.7 Tests for AI game page
- [x] Task 5: AI game result handling (AC: #4)
  - [x] 5.1 Reuse `GameResultBanner` with AI-specific actions
  - [x] 5.2 Post-game actions: "Chơi lại với AI" / "Đổi độ khó" / "Tìm đối thủ" / "Xem lại"
  - [x] 5.3 No rating change display
  - [x] 5.4 Tests for AI result flow
- [x] Task 6: Dashboard and navigation integration (AC: #1, #2)
  - [x] 6.1 Update `quick-actions.tsx` "Chơi với AI" href from `/play` to `/game/ai`
  - [x] 6.2 Lobby empty state: add "Không có đối thủ? Chơi với AI" card linking to `/game/ai` (lobby is placeholder — updated play page CTA to link to AI game)
  - [x] 6.3 Tests for updated navigation

## Dev Notes

### Architecture: Client-Side Only

This story is **entirely client-side**. No server actions, no Edge Functions, no Realtime channels, no database writes. The AI game is a local-only experience using the `@cotulenh/core` engine.

### AI Move Generation Strategy

`@cotulenh/core` provides `moves()` for legal move generation but has **NO built-in AI evaluation**. You must build AI logic:

- **Easy (`Dễ`):** Pick a random legal move from `engine.moves()`
- **Medium (`Trung bình`):** Score moves by material value of captures, prefer captures and checks, add randomness
- **Hard (`Khó`):** 1-ply lookahead — evaluate all legal moves by resulting board material balance, pick the best with slight randomness

Material values for evaluation (Cờ Tư Lệnh pieces — adapt from piece importance):
- Commander (Tư Lệnh): 1000 (game-ending)
- Infantry, Tank, Artillery, Anti-Air, Militia, Engineer, etc.: assign relative values based on game mechanics

Use `engine.moves({ verbose: true })` to get `MoveResult` objects with capture info. Use `engine.isCheckmate()`, `engine.isStalemate()`, `engine.isDraw()` for terminal detection.

### AI Deploy Phase

The game has a deploy phase before playing. AI must auto-deploy its pieces:
- Use `engine.moves({ deploy: true })` to get legal deploy moves
- Apply a reasonable deployment pattern (can be random for Easy, slightly strategic for Hard)
- Use `engine.move({ from, to, deploy: true })` then `engine.commitSession()` when done
- Track deploy progress with `engine.getDeployProgress()` equivalent

### Reusable Components — DO NOT Recreate

Reuse these existing components from `src/components/game/`:
- `board-container.tsx` — Board rendering via `@cotulenh/board`
- `player-info-bar.tsx` — Player name/rating bars (customize for AI)
- `game-right-panel.tsx` — Move list + controls panel
- `move-list.tsx` — SAN notation display
- `game-result-banner.tsx` — Result overlay (customize actions for AI)
- `chess-clock.tsx` — Clock display (hide or show fixed time for AI games based on UX)
- `deploy-piece-tray.tsx`, `deploy-progress-counter.tsx`, `deploy-controls.tsx` — Deploy UI

Reuse these hooks:
- `use-board.ts` — Mounts `@cotulenh/board` vanilla TS into React ref

### AI Game Store vs Multiplayer Game Store

Create a **separate** `ai-game-store.ts` rather than polluting `game-store.ts` (which is 800+ lines and tightly coupled to Realtime/server). The AI store should:
- Import `CoTuLenh` from `@cotulenh/core`
- Manage its own engine instance, phase, moveHistory
- Have `makePlayerMove(san)` → triggers AI response
- Have `startGame(difficulty)` → initialize engine, set phase
- Have `resign()` → end game immediately
- NOT have any Supabase, Realtime, or server action code
- Follow same Zustand patterns: flat state, camelCase actions, independent store

### Feature Flag Implementation

Use a simple constant or environment variable:
```typescript
// src/constants/feature-flags.ts
export const FEATURES = {
  AI_OPPONENT: true, // Set to false for "Coming Soon"
} as const;
```
No complex feature flag infrastructure needed. The route `/game/ai` checks this flag to decide which view to render.

### UX Requirements

- **2 taps to play:** Dashboard "Chơi với AI" → select difficulty → game starts
- **AI opponent bar:** Shows "AI — Dễ/Trung bình/Khó" instead of player name. No clock. No rating.
- **No draw/takeback:** AI games don't offer these actions
- **Post-game:** "Chơi lại với AI" (replay) / "Đổi độ khó" (change difficulty) / "Tìm đối thủ" (find opponent) / "Xem lại" (review)
- **Vietnamese-first:** All UI text in Vietnamese
- **Empty lobby resilience:** "Không có đối thủ? Chơi với AI" card in lobby when no challenges exist

### Board Integration Pattern

Follow the existing `use-board.ts` hook pattern:
```typescript
// The board is an imperative vanilla TS instance, NOT a React component
// Mount via React ref, bridge state via Zustand store
const boardRef = useRef<HTMLDivElement>(null);
// useBoard hook handles: mount board, listen for user moves, update board on state change
```

For AI games, the `useBoard` hook click handler should:
1. Player clicks → get move → call `aiGameStore.makePlayerMove(san)`
2. Store applies move to engine
3. Store triggers AI move selection (with delay)
4. AI move applied → board updates via store subscription

### Project Structure Notes

New files to create:
```
src/app/(app)/game/ai/page.tsx           → AI game route
src/components/game/ai-difficulty-selector.tsx → Difficulty picker
src/components/game/ai-game-client.tsx    → AI game page client component
src/stores/ai-game-store.ts              → AI game Zustand store
src/lib/ai-engine.ts                     → AI move selection logic
src/constants/feature-flags.ts           → Simple feature flags
```

Existing files to modify:
```
src/components/dashboard/quick-actions.tsx → Update "Chơi với AI" href to /game/ai
```

### Code Splitting

AI game route must use dynamic imports for `@cotulenh/core` and `@cotulenh/board` — same as multiplayer game route. These are the largest chunks and MUST NOT be in the shared bundle. Use Next.js `dynamic()` or React `lazy()`.

### Testing Standards

- Co-locate tests: `__tests__/` folders next to source
- Use Vitest for all unit tests
- Test AI engine: verify each difficulty produces valid moves, handles edge cases (checkmate position, single legal move)
- Test AI game store: all state transitions (idle → deploying → playing → ended)
- Test components: render, user interactions, difficulty selection
- No need for E2E tests in this story — unit + component tests sufficient

### Anti-Patterns to AVOID

- Do NOT add Supabase/Realtime/server code to AI game flow
- Do NOT modify `game-store.ts` — create separate AI store
- Do NOT use barrel exports (index.ts re-exports)
- Do NOT add English strings — Vietnamese only
- Do NOT create REST API routes
- Do NOT add spinners — use skeleton screens for loading states
- Do NOT throw exceptions in store actions — return error objects
- Do NOT nest Zustand state objects — keep flat
- Do NOT save AI games to database
- Do NOT apply Glicko-2 rating changes for AI games

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Technical Stack, Code Structure, AI Opponent FR37]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — AI Opponent UX, Game Page Layout, Post-Game Screen]
- [Source: apps/cotulenh/web/src/stores/game-store.ts — Multiplayer game store patterns]
- [Source: apps/cotulenh/web/src/components/game/ — Reusable game components]
- [Source: packages/cotulenh/core/src/cotulenh.ts — Engine API: moves(), move(), isCheckmate(), isDraw()]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Implemented AI engine with 3 difficulty levels: Easy (random), Medium (capture-weighted random), Hard (1-ply lookahead with material evaluation)
- Created separate Zustand store (ai-game-store.ts) for AI game state — fully client-side, no server/Realtime code
- Built difficulty selector component with Vietnamese labels and descriptions
- Created AI game page route at /game/ai with dynamic import for code splitting
- Added feature flag support (FEATURES.AI_OPPONENT) with Coming Soon fallback page
- Reused existing game components: BoardContainer, PlayerInfoBar, GameRightPanel, DeployPieceTray, DeployControls, GameResultBanner
- Added isAiGame prop to GameRightPanel — shows resign-only control (no draw/takeback)
- AI opponent bar shows "AI — Dễ/Trung bình/Khó" with no clock and no rating
- Post-game actions: "Chơi lại với AI", "Đổi độ khó", "Tìm đối thủ", "Xem lại"
- Updated dashboard quick-actions to link to /game/ai
- Updated play page CTA to link to /game/ai (lobby not yet implemented)
- Fixed AI route CTAs from `/lobby` to `/play` (current lobby route)
- Added board-style visual background to the AI "Sắp ra mắt" page
- Fixed AI store type mismatch (`deployMove` now accepts optional `pieceType`) and restored `check-types` pass
- Hardened AI turn scheduling by cancelling pending AI timeout on `resign`/`reset` to avoid stale async moves
- Upgraded hard AI evaluation to use resulting-board material balance (1-ply) with a small capture tie-breaker
- Quality gates run: targeted Vitest suites pass, `check-types` passes, lint shows 3 pre-existing warnings

### Change Log

- 2026-04-01: Implemented Story 8.1 AI Opponent — all 6 tasks complete
- 2026-04-02: Senior review fixes applied (typing/runtime hardening, AC2 visual/CTA polish, hard-AI evaluation parity)

### Senior Developer Review (AI)

- Reviewer: Noy (AI)
- Date: 2026-04-02
- Outcome: Approved after fixes
- Critical findings fixed:
  - Type mismatch in AI deploy flow causing `check-types` failure
  - Stale delayed AI moves after resign/reset
- High findings fixed:
  - Hard AI now evaluates resulting board material (1-ply)
  - `/lobby` dead links replaced with `/play`
  - Coming Soon state now includes board-style background visual
- Medium findings fixed:
  - Story completion claims updated to match actual quality-gate results
  - Story file list expanded with additional changed source files

### File List

New files:
- apps/cotulenh/web/src/lib/ai-engine.ts
- apps/cotulenh/web/src/lib/__tests__/ai-engine.test.ts
- apps/cotulenh/web/src/stores/ai-game-store.ts
- apps/cotulenh/web/src/stores/__tests__/ai-game-store.test.ts
- apps/cotulenh/web/src/components/game/ai-difficulty-selector.tsx
- apps/cotulenh/web/src/components/game/__tests__/ai-difficulty-selector.test.tsx
- apps/cotulenh/web/src/components/game/ai-game-client.tsx
- apps/cotulenh/web/src/components/game/__tests__/ai-game-client.test.tsx
- apps/cotulenh/web/src/app/(app)/game/ai/page.tsx
- apps/cotulenh/web/src/lib/constants/feature-flags.ts

Modified files:
- apps/cotulenh/web/src/components/game/game-right-panel.tsx (added isAiGame prop, resign-only AI controls)
- apps/cotulenh/web/src/components/game/__tests__/game-right-panel.test.tsx (added PGN review controls assertions)
- apps/cotulenh/web/src/components/game/game-page-client.tsx (wired PGN success/error toasts from right panel)
- apps/cotulenh/web/src/components/game/__tests__/game-page-client.test.tsx (asserted PGN controls in review mode)
- apps/cotulenh/web/src/components/game/pgn-export-controls.tsx (PGN copy/download controls)
- apps/cotulenh/web/src/components/game/__tests__/pgn-export-controls.test.tsx (PGN controls tests)
- apps/cotulenh/web/src/lib/pgn-export.ts (PGN generation/filename helpers)
- apps/cotulenh/web/src/lib/__tests__/pgn-export.test.ts (PGN helper tests)
- apps/cotulenh/web/src/components/dashboard/quick-actions.tsx (updated AI href to /game/ai)
- apps/cotulenh/web/src/components/dashboard/__tests__/quick-actions.test.tsx (updated test expectation)
- apps/cotulenh/web/src/components/dashboard/leaderboard-section.tsx (dashboard leaderboard preview section)
- apps/cotulenh/web/src/components/dashboard/__tests__/leaderboard-section.test.tsx (leaderboard section tests)
- apps/cotulenh/web/src/app/(app)/play/page.tsx (updated CTA to link to AI game)
- apps/cotulenh/web/src/app/(app)/game/ai/page.tsx (coming-soon board visual and CTA route fix)
- apps/cotulenh/web/src/components/game/ai-game-client.tsx (post-game find-opponent route fix)
- apps/cotulenh/web/src/stores/ai-game-store.ts (deploy typing + AI timeout cleanup)
- apps/cotulenh/web/src/stores/__tests__/ai-game-store.test.ts (AI timeout cleanup regression tests)
- apps/cotulenh/web/src/lib/ai-engine.ts (hard AI material-balance evaluation)
- apps/cotulenh/web/src/lib/__tests__/ai-engine.test.ts (hard AI evaluation test alignment)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status: in-progress → done)
