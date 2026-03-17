# Story 3.1: Game Page Layout & Board Integration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want a game page with a board-centric layout that adapts to my screen size,
so that the board is always the focus and I can see game information without distraction.

## Acceptance Criteria

1. **Given** a player navigates to `/game/[id]` **When** the page loads **Then** the `cotulenh-board` is mounted via the `useBoard` hook into a container ref **And** the board occupies at least 60% of the viewport on all screen sizes (FR36) **And** no UI elements overlap the board area **And** the board renders within 500ms of page load (NFR5)

2. **Given** the player is on desktop (>1024px) **When** the game page renders **Then** player info bars are shown above and below the board **And** a tabbed right panel (280-320px) displays move list, game controls, and chat placeholder **And** the board never resizes when panel content changes

3. **Given** the player is on mobile (<1024px) **When** the game page renders **Then** the board is full-width **And** player info bars are compact above and below the board **And** game information is accessible via tabs below the board

4. **Given** the game page is loading **When** data is being fetched **Then** skeleton screens are displayed for the board area and panels **And** the page reaches Time to Interactive in under 3 seconds on 4G (NFR2)

5. **Given** the board is rendered **When** keyboard navigation is used **Then** board squares are individually focusable with descriptive aria-labels (NFR21)

## Tasks / Subtasks

- [x] Task 1: Create game route structure (AC: #1, #4)
  - [x] 1.1 Create `src/app/(app)/game/[id]/page.tsx` — Server Component that fetches game data and renders `GamePageClient`
  - [x] 1.2 Create `src/app/(app)/game/[id]/loading.tsx` — Skeleton screen matching game page layout (board placeholder + panel placeholders + player bar placeholders)
  - [x] 1.3 Create `src/app/(app)/game/[id]/error.tsx` — Error boundary with Vietnamese error message and "Quay lại" (Go back) action

- [x] Task 2: Create game-store Zustand store (AC: #1, #2, #3)
  - [x] 2.1 Create `src/stores/game-store.ts` with interface:
    ```typescript
    interface GameStore {
      // State
      engine: CoTuLenh | null
      phase: 'idle' | 'deploying' | 'playing' | 'ended'
      moveHistory: string[]          // SAN strings
      clocks: { red: number; blue: number } | null
      myColor: 'red' | 'blue' | null
      gameId: string | null
      gameStatus: string | null      // DB game status
      redPlayer: { id: string; name: string; rating: number } | null
      bluePlayer: { id: string; name: string; rating: number } | null

      // Actions
      initializeGame: (gameId: string, gameData: GameData) => void
      makeMove: (san: string) => void
      reset: () => void
    }
    ```
  - [x] 2.2 Create `src/stores/game-store.test.ts` — Unit tests for all state transitions: idle → deploying → playing → ended, plus reset

- [x] Task 3: Create board-container component (AC: #1, #5)
  - [x] 3.1 Create `src/components/game/board-container.tsx` — React wrapper that mounts `cotulenh-board` via `useBoard` hook with game-mode config
  - [x] 3.2 Must use `next/dynamic` with `ssr: false` (same pattern as lesson board)
  - [x] 3.3 Board config: `viewOnly: true` initially (interactive mode enabled by later stories), `orientation` based on player color, `animation` respects `prefers-reduced-motion`
  - [x] 3.4 Container: `aspect-square w-full max-w-[600px]` — maintains square ratio, max 600px
  - [x] 3.5 Keyboard accessibility: squares focusable with `aria-label` (e.g., "B4: Bo binh Do")

- [x] Task 4: Create player-info-bar component (AC: #2, #3)
  - [x] 4.1 Create `src/components/game/player-info-bar.tsx` — Displays avatar (initials fallback), name, rating badge, clock placeholder, captured pieces placeholder
  - [x] 4.2 Top bar = opponent, bottom bar = current player (based on `myColor`)
  - [x] 4.3 Active turn = highlighted with team color (4px left border: red `hsl(0, 70%, 50%)` or blue `hsl(210, 70%, 50%)`)
  - [x] 4.4 Desktop: full layout with all fields. Mobile (<1024px): compact — name + clock only
  - [x] 4.5 Clock display: monospace tabular figures (`font-variant-numeric: tabular-nums`), `--font-mono`
  - [x] 4.6 `aria-label` with full status text for screen readers
  - [x] 4.7 Create `src/components/game/player-info-bar.test.tsx`

- [x] Task 5: Create game-right-panel component (AC: #2, #3)
  - [x] 5.1 Create `src/components/game/game-right-panel.tsx` — 280-320px width on desktop, full-width tabs below board on mobile
  - [x] 5.2 Use shadcn `Tabs` component with plain text tab labels. Active tab = bold + underline
  - [x] 5.3 MVP tabs: **"Nuoc di"** (Moves) only. Chat tab placeholder for Phase 2
  - [x] 5.4 Move list area: empty state with Vietnamese text "Chua co nuoc di nao" (No moves yet)
  - [x] 5.5 Game controls area: placeholder buttons for resign/draw/takeback (disabled, wired in Story 3.7)
  - [x] 5.6 Move navigation: ◄◄ ◄ ► ►► buttons below move list (disabled until moves exist)
  - [x] 5.7 `role="tablist"`, arrow key navigation between tabs
  - [x] 5.8 **CRITICAL:** Panel content changes must NEVER cause board to resize

- [x] Task 6: Create responsive game page layout (AC: #1, #2, #3)
  - [x] 6.1 Create `src/components/game/game-page-client.tsx` — Client component assembling the full game page
  - [x] 6.2 Desktop layout (>=1024px): `flex flex-row` — board section (flex-1) + right panel (w-[280px] to w-[320px])
  - [x] 6.3 Mobile layout (<1024px): `flex flex-col` — player bar (compact) → board (full-width) → player bar (compact) → tabs panel
  - [x] 6.4 Board section: player-info-bar (opponent) → board-container → player-info-bar (self)
  - [x] 6.5 Board container constrained: `aspect-square w-full max-w-[600px]` centered within board section
  - [x] 6.6 Main content area accounts for sidebar (48px left on lg+) and bottom tab bar (56px on <1024px)
  - [x] 6.7 **CRITICAL:** Board never resizes when panel content changes — use `flex-shrink-0` on board section

- [x] Task 7: Wire game data fetching (AC: #1, #4)
  - [x] 7.1 Create `src/lib/actions/game.ts` — Server Action `getGame(gameId: string)` that fetches from `games` + `game_states` tables
  - [x] 7.2 Return shape: `{ success: true, data: GameData } | { success: false, error: string }`
  - [x] 7.3 Validate that the current user is a participant (red_player or blue_player) — return 403 error if not
  - [x] 7.4 `page.tsx` calls `getGame()` and passes data to `GamePageClient`
  - [x] 7.5 Handle game not found (404) and unauthorized (403) with appropriate Vietnamese error messages

- [x] Task 8: Create game type definitions (AC: all)
  - [x] 8.1 Create `src/lib/types/game.ts` with types:
    ```typescript
    interface GameData {
      id: string
      status: 'started' | 'aborted' | 'checkmate' | 'resign' | 'timeout' | 'stalemate' | 'draw' | 'dispute'
      red_player: PlayerInfo
      blue_player: PlayerInfo
      is_rated: boolean
      created_at: string
      game_state: GameStateData
    }

    interface GameStateData {
      move_history: string[]
      fen: string
      phase: 'deploying' | 'playing'
      clocks: { red: number; blue: number }
    }

    interface PlayerInfo {
      id: string
      display_name: string
      rating: number
    }
    ```
  - [x] 8.2 Create `src/lib/constants/game-config.ts` — Time control presets, forfeit window (60s), deploy rules

- [x] Task 9: Integration testing (AC: all)
  - [x] 9.1 Create `src/components/game/__tests__/game-page-client.test.tsx` — Tests responsive layout rendering
  - [x] 9.2 Test: board renders within container, player bars show correct players, right panel has tabs
  - [x] 9.3 Test: skeleton loading state renders correctly
  - [x] 9.4 Test: mobile layout collapses to single column
  - [x] 9.5 Test: keyboard accessibility — board container has correct ARIA attributes

## Dev Notes

### Architecture Patterns & Constraints

- **Board integration:** Use `useBoard` hook from `src/hooks/use-board.ts` — same pattern proven in lesson-view.tsx (Epic 2). Board is vanilla TS mounted via React ref, NOT a React component. Use `next/dynamic` with `ssr: false` for the board-container.
- **State management:** `useGameStore` (Zustand) manages game state machine. Store pattern follows `learn-store.ts` — state at top, actions in middle. Stores are independent, subscribe to Realtime channel (wired in later stories).
- **Server Actions:** Return `{ success, error? }` shape. Never throw. Vietnamese error messages from Zod validators.
- **Component boundaries:** `page.tsx` is Server Component (data fetching). `game-page-client.tsx` is Client Component (interactivity). Board loaded via dynamic import.
- **DB property naming:** snake_case everywhere. TypeScript interface properties match DB columns: `player_id`, `created_at`, `game_id` — never camelCase for DB-backed types. Only camelCase for function names, component names, and local variables.
- **No barrel exports:** All imports are direct paths. No `index.ts` re-exports.
- **One component per file** (except tightly coupled pairs).

### Responsive Layout Contract

- **Single breakpoint:** 1024px (`lg`) for nav switch (sidebar vs bottom bar)
- **Desktop (>=1024px):** Sidebar (48px) + Board section + Right panel (280-320px). Board in center, max 600px.
- **Tablet (640-1024px):** Same as desktop layout but bottom tab bar instead of sidebar.
- **Mobile (<640px):** Board full-width. Player bars compact (name + clock). Panel below board as scrollable tabs. Bottom tab bar stays.
- **Board is sacred:** Never resizes when panel content changes. Use `flex-shrink-0`.
- **Main content:** `lg:ml-[48px] pb-[56px] lg:pb-0` (accounts for sidebar/bottom bar)

### Design System Compliance

- **0px border radius everywhere.** No shadows. No gradients. Borders for elevation.
- **Vietnamese text from first commit.** No English placeholders. `lang="vi"` on root.
- **Skeleton screens only, never spinners** for page loads. `animate-pulse` with `bg-[var(--color-surface-elevated)]`.
- **System fonts:** `--font-sans` for body, `--font-mono` for clock display and move notation.
- **Color tokens:** Use CSS custom properties — `--color-primary`, `--color-surface`, `--color-border`, etc.
- **Spacing:** Base unit 4px. All spacing via `--space-*` tokens.
- **Team colors:** Red `hsl(0, 70%, 50%)`, Blue `hsl(210, 70%, 50%)`. Used as 4px left border on player bars, 10% opacity clock tint.
- **Typography:** Weights: 400 body, 500 labels/nav, 600 headings/player names. Monospace for clocks and moves.

### Performance Requirements

- **<500ms board render** (NFR5) — dynamic import + lazy load cotulenh-board only on game routes
- **<3s TTI on 4G** (NFR2) — skeleton loading.tsx, code splitting, system fonts
- **<200KB JS gzipped per route** (NFR4) — cotulenh-core + cotulenh-board must NOT be in shared bundle, dynamic import only on /game/* and /learn/* routes
- **Code splitting:** `cotulenh-core` and `cotulenh-board` are the largest chunks — dynamic import only

### Accessibility Requirements

- **WCAG 2.1 AA target**
- Board squares focusable with `aria-label` (e.g., "B4: Bo binh Do")
- Arrow keys navigate board squares. Enter/Space selects/confirms.
- "X nuoc di hop le" announced on piece selection (`aria-live`)
- `prefers-reduced-motion` respected: disable piece animations, pulse effects
- Visible focus rings on all interactive elements
- Clock: `role="timer"`, `aria-live="polite"` at critical (<30s)
- Game result: `role="alertdialog"`, focus trapped
- Touch targets: 44x44px minimum on mobile, 8px gap between adjacent targets

### UX Specifications

**Game Screen Desktop Wireframe:**
```
┌──┬──────────────────────────────────┬──────────────────────┐
│  │  Opponent bar (name, rating, ⏱)  │ [Nuoc di]            │
│N │                                  │ (move list)           │
│A │         BOARD                    │                      │
│V │    (max height, square ratio)    │                      │
│  │                                  │──────────────────────│
│  │  Your bar (name, rating, ⏱)     │ Game actions + nav    │
└──┴──────────────────────────────────┴──────────────────────┘
```

- Right panel: Plain text tabs. Active = bold + underline.
- Game actions: resign, draw, takeback — flat icon buttons, tooltip on hover. Inline confirmation (button row → "Ban chac chu? [Co] [Khong]"). No modal.
- Move navigation: ◄◄ ◄ ► ►► below move list.
- Toasts: Bottom-left desktop, bottom-center mobile. Auto-dismiss 3s. Never overlap board.

### Game State Model

- **Client phase** (Zustand): `'idle' | 'deploying' | 'playing' | 'ended'` — drives UI rendering
- **DB status** (games table): `'started' | 'aborted' | 'checkmate' | 'resign' | 'timeout' | 'stalemate' | 'draw' | 'dispute'` — permanent record
- These are **distinct concepts**. `'started'` in DB covers both deploy and play phases on client.
- **Server is source of truth.** Client is optimistic with rollback (wired in later stories).

### Database Schema (for reference — tables should already exist or be created in Story 3.2)

**`games` table:**
- `id` (uuid PK), `red_player` (uuid FK), `blue_player` (uuid FK), `status` (text), `winner` (uuid), `is_rated` (boolean), `created_at` (timestamptz)

**`game_states` table:**
- `id` (uuid PK), `game_id` (uuid FK → games), `move_history` (text[]), `fen` (text), `deploy_state` (jsonb), `phase` (text), `clocks` (jsonb `{ red: number, blue: number }`), `updated_at` (timestamptz)

**Note:** This story creates the UI layer. DB tables and migrations are Story 3.2's scope. For this story, mock the data fetching if tables don't exist yet, but write the Server Action interface correctly so it's ready to wire up.

### Existing Patterns to Reuse

- **`useBoard` hook** (`src/hooks/use-board.ts`): Proven in Epic 2 lesson-view. Same hook, different config for game mode.
- **Lesson layout** (`src/components/learn/lesson-layout.tsx`): Two-column responsive pattern — board left (60%), panel right (40%). Adapt for game page.
- **Loading skeleton** (`src/app/(public)/learn/[subject]/[id]/loading.tsx`): Same `animate-pulse` pattern.
- **Server Action pattern** (`src/lib/actions/learn.ts`): Same `{ success, error? }` return shape.
- **Zustand store** (`src/stores/learn-store.ts`): Same flat state + action pattern.
- **`cn()` utility** (`src/lib/utils/cn.ts`): clsx + tailwind-merge for conditional classes.

### Learnings from Epic 1 & 2 Retrospectives

1. **"Done ≠ done" is a systemic risk** — Ensure ALL acceptance criteria are implemented, not just the happy path. Every AC must have a corresponding test.
2. **SSR hydration requires deliberate pattern** — Any component reading client-side state needs explicit loading placeholder. Use `typeof window !== 'undefined'` guards or `useEffect` for client-only state.
3. **Vietnamese text from first commit** — No English placeholders. All UI text must be Vietnamese.
4. **Design tokens must be actively applied** — Don't rely on defaults. Override shadcn/framework opinions (0px border radius, no Geist fonts).
5. **Performance patterns matter early** — Epic 3 is realtime. N+1 DB reads in learn system were forgivable; in games they're fatal. Single fetch for game data.
6. **Board integration pattern is proven** — `next/dynamic` with `ssr: false`, imperative API via ref, config updates in place.
7. **Adversarial code review catches what first-pass misses** — Expect review to find issues. Build with review in mind.

### Epic 3 Critical Preparation (from Retro)

The retro identified these tasks as prerequisites before Story 3.1:
1. **Validate cotulenh-core full game replay in Edge Functions (Deno)** — If this hasn't been done, flag it. Story 3.1 doesn't need Edge Functions yet, but Story 3.4 will.
2. **Supabase Realtime Broadcast spike** — Story 3.1 doesn't wire Realtime, but the store should be structured to accept channel subscriptions later.
3. **Game state DB schema migration** — Story 3.2 handles this. Story 3.1 should mock data if tables don't exist.

### Git Intelligence (Recent Commits)

```
9860f37 fix(web): complete story 2.4 progress migration flow
bcc165f fix(web): resolve lesson progress review findings
ec72c19 fix(web): address lesson board review findings
34eb529 Implement learn hub lesson navigation
182e5a2 feat(web): finalize story 1.6 home dashboard
```

**Patterns observed:**
- Commit prefix: `feat(web):` for new features, `fix(web):` for fixes
- All recent work in `apps/cotulenh/web/src/`
- Board integration established in learn system (useBoard, dynamic import)
- Zustand + Server Action patterns established

### Project Structure Notes

- **Route:** `src/app/(app)/game/[id]/page.tsx` — inside `(app)` layout group (sidebar/bottom bar)
- **Components:** `src/components/game/` — new directory for game-specific components
- **Store:** `src/stores/game-store.ts`
- **Types:** `src/lib/types/game.ts`
- **Actions:** `src/lib/actions/game.ts`
- **Constants:** `src/lib/constants/game-config.ts`
- **Tests:** Co-located `__tests__/` directories and `.test.ts(x)` files next to source

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3, Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Route Structure, Board Integration, Game Store, Realtime]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Game Screen, Responsive Breakpoints, Design Tokens]
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-03-17.md#Key Insights, Epic 3 Preparation]
- [Source: _bmad-output/implementation-artifacts/epic-1-retro-2026-03-17.md#Team Agreements]
- [Source: apps/cotulenh/web/src/hooks/use-board.ts — useBoard hook API]
- [Source: apps/cotulenh/web/src/components/learn/lesson-view.tsx — Board integration reference]
- [Source: apps/cotulenh/web/src/components/learn/lesson-layout.tsx — Responsive layout reference]
- [Source: apps/cotulenh/web/src/stores/learn-store.ts — Zustand store pattern]
- [Source: apps/cotulenh/web/src/app/globals.css — Design tokens]
- [Source: packages/cotulenh/board/src/types.ts — Board types: Color, Key, Dests, Config]
- [Source: packages/cotulenh/board/src/config.ts — Board Config interface]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created
- Story created from Epic 3 backlog, first story in epic (epic status → in-progress)
- No previous story in this epic — relied on Epic 2 retro learnings and codebase exploration
- DB tables (games, game_states) may not exist yet — Story 3.2 scope. Mock data if needed.
- Board integration pattern proven in Epic 2 lesson-view — reuse useBoard hook with game config
- Vietnamese text required from first commit per team agreements
- **Implementation completed 2026-03-17:**
  - All 9 tasks and subtasks implemented following red-green-refactor cycle
  - Game store with full state machine: idle → deploying → playing → ended, plus reset
  - Board container uses `next/dynamic` with `ssr: false`, `viewOnly: true`, keyboard accessibility with aria-labels
  - Player info bars with team-colored active turn indicator, clock with `tabular-nums`, responsive compact mode
  - Right panel with shadcn Tabs: move list, move navigation buttons, game control placeholders
  - Responsive layout: `flex-row` on desktop (board + 280-320px panel), `flex-col` on mobile
  - Board never resizes when panel content changes (flex-shrink-0 on board section)
  - Server action validates participant authorization, handles 404/403 with Vietnamese messages
  - 30 new tests added (8 store + 12 player-info-bar + 8 integration + 2 board-container + 1 loading), all 283 tests pass
  - Type definitions created for Task 8 first as foundational dependency for other tasks
- **Senior code review fixes applied 2026-03-17:**
  - Added `my_color` to game payload and store initialization so board orientation and player bars use the authenticated player's perspective
  - Hardened board accessibility sync to refresh square `aria-label` metadata when board state/DOM updates
  - Added explicit viewport-based board track sizing (`min(60vw, 60svh)`) for board-dominant layout enforcement
  - Added missing tests for loading skeleton and board accessibility behavior
  - Documented unrelated modified learn files observed during review scope for git transparency

### File List

**New files:**
- `apps/cotulenh/web/src/app/(app)/game/[id]/page.tsx` — Server Component game page
- `apps/cotulenh/web/src/app/(app)/game/[id]/loading.tsx` — Skeleton loading screen
- `apps/cotulenh/web/src/app/(app)/game/[id]/error.tsx` — Error boundary
- `apps/cotulenh/web/src/stores/game-store.ts` — Zustand game state store
- `apps/cotulenh/web/src/stores/__tests__/game-store.test.ts` — Game store unit tests (8 tests)
- `apps/cotulenh/web/src/components/game/board-container.tsx` — Board wrapper with dynamic import
- `apps/cotulenh/web/src/components/game/player-info-bar.tsx` — Player info bar component
- `apps/cotulenh/web/src/components/game/game-right-panel.tsx` — Right panel with tabs
- `apps/cotulenh/web/src/components/game/game-page-client.tsx` — Client layout component
- `apps/cotulenh/web/src/components/game/__tests__/player-info-bar.test.tsx` — Player info bar tests (12 tests)
- `apps/cotulenh/web/src/components/game/__tests__/game-page-client.test.tsx` — Integration tests (8 tests)
- `apps/cotulenh/web/src/components/game/__tests__/board-container.test.tsx` — Board accessibility tests (2 tests)
- `apps/cotulenh/web/src/app/(app)/game/[id]/__tests__/loading.test.tsx` — Loading skeleton test (1 test)
- `apps/cotulenh/web/src/lib/actions/game.ts` — Server Action for game data fetching
- `apps/cotulenh/web/src/lib/types/game.ts` — Game type definitions
- `apps/cotulenh/web/src/lib/constants/game-config.ts` — Game configuration constants
- `apps/cotulenh/web/src/components/ui/tabs.tsx` — shadcn Tabs component (installed via CLI)

### Change Log

- **2026-03-17:** Implemented Story 3.1 — Game page layout and board integration. Created responsive game page at `/game/[id]` with board-centric layout, player info bars, right panel with move list and game controls, Zustand game store, server action for data fetching, type definitions, and comprehensive tests (27 new tests, 279 total passing).
- **2026-03-17:** Applied adversarial code review fixes — fixed player-orientation data flow (`my_color`), improved board accessibility resync logic, added viewport board sizing guardrails, and added missing AC coverage tests for skeleton and board ARIA behavior (283 total tests passing).

### Senior Developer Review (AI)

- **Result:** Approved after fixes
- **Resolved findings:**
  - Tasks 9.3 and 9.5 now have concrete test coverage
  - Player perspective now derives from authenticated color, not default fallback
  - Board accessibility labels re-sync on state/DOM updates
  - Board layout includes explicit 60%-viewport sizing guardrails
- **Git scope note:** Unrelated staged/unstaged learn-system changes remain outside Story 3.1 scope and were not modified in this review pass
