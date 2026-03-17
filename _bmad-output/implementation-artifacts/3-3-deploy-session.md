# Story 3.3: Deploy Session

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to place my deployable pieces on my side of the board before the game begins,
so that I can set up my strategy without my opponent seeing my placements.

## Acceptance Criteria

1. **AC1: Deploy Phase Initialization** — Given both players have joined a game and the phase is `'deploying'`, When the deploy session starts, Then the game clock starts running during deployment (FR6), each player sees a piece tray showing their deployable pieces, and a deploy progress counter shows "Bố trí — Quân X/Y".

2. **AC2: Piece Placement - Local Preview** — Given a player is in the deploy phase, When they tap a deployable piece and then a valid board square, Then the piece is placed on the board as a local preview via `game.move({ from, to, deploy: true })`, the placement accumulates in a `MoveSession` on the client, and the player can cancel and redo placements via `game.cancelSession()`.

3. **AC3: Deployment Submission & Validation** — Given a player is satisfied with their deployment, When they tap "Xác nhận" (Commit), Then `game.commitSession()` is called locally and the committed SAN array is sent to the validate-move Edge Function, the Edge Function validates the deploy sequence against authoritative game state, and on success a `deploy_submitted` event is broadcast to the opponent (without revealing placement).

4. **AC4: Both Players Submission & Phase Transition** — Given both players have submitted valid deployments, When the Edge Function confirms both submissions, Then `deploy_commit` events are broadcast to both players with each other's deploy SANs, the `game_states.phase` transitions from `'deploying'` to `'playing'`, and both players see the full board with all pieces placed.

5. **AC5: Opponent Waiting Indicator** — Given only one player has submitted their deployment, When the other player is still placing pieces, Then a "Đang chờ đối thủ..." (Waiting for opponent) indicator is shown to the player who submitted, and the opponent's deployment is not revealed.

## Tasks / Subtasks

- [x] Task 1: Create validate-move Edge Function with deploy support (AC: #3, #4)
  - [x] 1.1 Create `supabase/functions/validate-move/index.ts` — Edge Function entry point
  - [x] 1.2 Import `CoTuLenh` from `@cotulenh/core` (handle Deno ESM compatibility — see Dev Notes)
  - [x] 1.3 Implement JWT auth extraction and participant verification against `games.red_player`/`blue_player`
  - [x] 1.4 Implement `SELECT ... FOR UPDATE` row lock on `game_states` for concurrency safety
  - [x] 1.5 Implement phase enforcement: during `'deploying'`, only accept deploy submissions; return `{ error: 'wrong_phase', code: 'PHASE_MISMATCH' }` HTTP 400 otherwise
  - [x] 1.6 Implement deploy validation: replay `move_history` from `DEFAULT_POSITION`, then validate submitted SAN array against reconstructed engine state
  - [x] 1.7 On single-player deploy success: store deploy in `game_states.deploy_state`, broadcast `deploy_submitted` event with `{ color: 'r' | 'b' }` only (no placement reveal)
  - [x] 1.8 On both-players deploy success: broadcast `deploy_commit` to both players with each other's deploy SANs, transition `game_states.phase` to `'playing'`, clear `deploy_state`
  - [x] 1.9 Include monotonically increasing `seq` number in all broadcast events
  - [x] 1.10 Verify game status is `'started'` before processing; return `{ error: 'game_ended', code: 'GAME_ENDED' }` HTTP 409 if not

- [x] Task 2: Extend game store with deploy actions (AC: #1, #2, #3, #5)
  - [x] 2.1 Add deploy state to `useGameStore`: `deploySubmitted: boolean`, `opponentDeploySubmitted: boolean`, `engine: CoTuLenh | null`
  - [x] 2.2 Add `initializeEngine(fen: string)` action — creates `CoTuLenh` instance from FEN
  - [x] 2.3 Add `deployMove(from: string, to: string)` action — calls `engine.move({ from, to, deploy: true })`, returns `MoveResult | null`
  - [x] 2.4 Add `cancelDeploy()` action — calls `engine.cancelSession()`
  - [x] 2.5 Add `commitDeploy()` action — calls `engine.commitSession()`, returns SAN array for submission
  - [x] 2.6 Add `setOpponentDeploySubmitted(color: 'r' | 'b')` action — handles `deploy_submitted` event
  - [x] 2.7 Add `applyDeployCommit(mySans: string[], opponentSans: string[])` action — applies both deploy arrays, transitions phase to `'playing'`
  - [x] 2.8 Add selectors: `getDeployablepieces()`, `getDeployProgress()` (current/total count)
  - [x] 2.9 Write unit tests for all deploy store actions and state transitions

- [x] Task 3: Create deploy UI components (AC: #1, #2, #5)
  - [x] 3.1 Create `src/components/game/deploy-piece-tray.tsx` — displays deployable pieces from `engine.getSession()?.remaining` or engine deploy state
  - [x] 3.2 Create `src/components/game/deploy-progress-counter.tsx` — "Bố trí — Quân X/Y" with `aria-live="assertive"`
  - [x] 3.3 Create `src/components/game/deploy-controls.tsx` — "Xác nhận" (Commit) button + "Hoàn tác" (Undo) button + "Đang chờ đối thủ..." waiting indicator
  - [x] 3.4 Style deploy zone highlighting on the board (player's side)
  - [x] 3.5 Responsive placement: deploy counter overlay on board (mobile), below board (tablet), in right panel (desktop)
  - [x] 3.6 Write component tests for deploy UI

- [x] Task 4: Wire board interactivity for deploy phase (AC: #2)
  - [x] 4.1 Update `board-container.tsx` to accept deploy mode: `viewOnly: false` during deploying phase
  - [x] 4.2 Implement tap-to-place: tap piece tray item → tap board square → call `deployMove(from, to)`
  - [x] 4.3 Show legal deploy squares as dots when a piece is selected (use `engine.moves()` filtered for deploy)
  - [x] 4.4 Support drag-and-drop + click-click on desktop, tap-tap on mobile
  - [x] 4.5 Handle invalid placement: animate piece back 150ms
  - [x] 4.6 Update board display after each deploy move (re-render from engine FEN)

- [x] Task 5: Wire Realtime Broadcast channel for deploy events (AC: #3, #4, #5)
  - [x] 5.1 Subscribe to `game:{gameId}` Broadcast channel on game page mount
  - [x] 5.2 Handle `deploy_submitted` event: call `setOpponentDeploySubmitted(color)` in store
  - [x] 5.3 Handle `deploy_commit` event: call `applyDeployCommit(mySans, opponentSans)` in store, transition UI to playing phase
  - [x] 5.4 Track `last_seen_seq` and discard events with `seq <= last_seen_seq`; on gap detection trigger full state re-fetch
  - [x] 5.5 Implement `submitDeploy` action that calls validate-move Edge Function with committed SAN array
  - [x] 5.6 Unsubscribe from channel on unmount

- [x] Task 6: Integrate deploy phase into game page layout (AC: #1, #5)
  - [x] 6.1 Update `game-page-client.tsx` to render deploy UI when `phase === 'deploying'`
  - [x] 6.2 Show deploy-piece-tray, deploy-progress-counter, and deploy-controls during deploy phase
  - [x] 6.3 Show "Đang chờ đối thủ..." state when player has submitted but opponent hasn't
  - [x] 6.4 Clear visual transition when phase moves from deploying → playing (remove deploy UI, enable move UI)
  - [x] 6.5 Clocks must be visible and running during deploy phase
  - [x] 6.6 Ensure board never resizes during phase transition

- [x] Task 7: Integration and edge case testing (AC: all)
  - [x] 7.1 Test deploy phase initialization with correct piece tray contents
  - [x] 7.2 Test piece placement and cancellation flow
  - [x] 7.3 Test commit → Edge Function submission → broadcast flow
  - [x] 7.4 Test both-players-submitted phase transition
  - [x] 7.5 Test waiting indicator display logic
  - [x] 7.6 Test sequence number tracking and gap detection
  - [x] 7.7 Test responsive deploy counter placement (mobile/tablet/desktop)

## Dev Notes

### Critical: validate-move Edge Function — Deno Compatibility Risk

This is the **highest integration risk** identified in the architecture retro. `@cotulenh/core` must run in Deno (Supabase Edge Functions runtime). Strategy:

1. **First attempt:** Use `import_map.json` to map `@cotulenh/core` to the package's ESM build output. The package has `"type": "module"` and Vite ESM output.
2. **Fallback:** If Deno import fails, create a standalone ESM bundle via `vite build --lib` with Deno-compatible output. Place in `supabase/functions/_shared/`.
3. **Proof-of-concept first:** Before writing the full Edge Function, create a minimal test that imports `CoTuLenh` and runs `game.move()` in Deno. If this fails, stop and resolve before proceeding.

The `supabase/functions/` directory does not exist yet — create it with the validate-move function directory.

### Critical: Concurrency — SELECT FOR UPDATE

The validate-move Edge Function **MUST** use `SELECT ... FOR UPDATE` on the `game_states` row before reading `move_history`. This serializes concurrent deploy submissions for the same game. Without this, two simultaneous deploy submissions could both validate against the same empty state and both be stored, producing corrupt state.

### Critical: Deploy Protocol Sequence

The deploy protocol from architecture.md:

1. Player calls `game.move({ from, to, deploy: true })` locally — multiple calls accumulate in `MoveSession`. Client shows live preview.
2. When satisfied, player calls `game.commitSession()` locally, then sends the committed SAN array to validate-move Edge Function.
3. Edge Function validates deploy sequence, stores it in `deploy_state`, broadcasts `deploy_submitted` to opponent (color only, no placement).
4. When **both** players have submitted valid deploys, Edge Function broadcasts `deploy_commit` to both with each other's deploy SANs. Phase transitions to `'playing'`.
5. If player cancels (`game.cancelSession()`), no server call — purely local undo.

### Critical: Blind Deployment

During deploy phase, a player's placement MUST NOT be visible to their opponent:
- `deploy_submitted` event contains only `{ color: 'r' | 'b' }` — NO placement data
- `deploy_commit` event (after both submit) contains both players' SAN arrays — this is the reveal moment
- Server stores intermediate deploy in `game_states.deploy_state` jsonb — this is NOT sent to clients until both confirm

### Engine API Reference (from @cotulenh/core exploration)

**CoTuLenh class:**
- `move(move: string | object, options?)` → `MoveResult | null` — for deploy: `game.move({ from, to, deploy: true })`
- `commitSession()` → `{ success: boolean, reason?, result? }` — validates & commits session
- `cancelSession()` → `void` — undoes all session moves
- `getSession()` → `MoveSession | null` — active session
- `canCommitSession()` → `boolean` — checks if safe to commit
- `getDeployState()` → `DeployStateView | null` — UI-safe deploy view
- `fen()` → `string` — current FEN
- `turn()` → `Color` ('r' | 'b')
- `moves(options?)` → `string[] | MoveResult[]` — legal moves

**MoveSession class:**
- `remaining` → `Piece[]` — undeployed pieces (deploy mode)
- `isComplete` → `boolean` — all pieces deployed?
- `isEmpty` → `boolean`
- `isDeploy` → `boolean`
- `addMove(move)` → `void`
- `cancel()` → `void`
- `commit()` → `{ command, result, hasCapture }`
- `canCommit()` → `boolean`
- `getDeployView()` → `DeployStateView | null`

**MoveResult class:**
- `san` → `string` — SAN notation
- `isDeploy` → `boolean`
- `from`, `to`, `piece`, `flags`, `before`, `after`
- `getHighlightSquares()` → `Square[]`

### Broadcast Event Types

```typescript
// Events this story produces/consumes:
| { type: 'deploy_submitted'; payload: { color: 'r' | 'b' }; seq: number }
| { type: 'deploy_commit'; payload: { sans: string[]; fen: string }; seq: number }
```

All events include monotonically increasing `seq`. Clients track `last_seen_seq` and discard stale events. On gap: full state re-fetch.

### Realtime Channel Pattern

Subscribe to `game:{gameId}` Broadcast channel. Channel naming from architecture:
- Game: `game:{gameId}` — Broadcast (moves, game actions)

### UX Specifications — Deploy Phase

- **Piece tray:** Shows remaining deployable pieces. Tapping selects for placement.
- **Progress counter:** "Bố trí — Quân X/Y" with piece icons. States: active, waiting, complete, undo. `aria-live="assertive"`.
- **Deploy zone:** Board highlights player's side where placement is valid.
- **Undo:** Available throughout deploy session.
- **Both players deploy simultaneously; clocks run during deploy.**
- **Phase transition:** Clear visual shift when deploy completes → alternating turns.
- **Responsive counter placement:**
  - Phone (<640px): Overlay on board
  - Tablet (640-1024px): Below board
  - Desktop (>1024px): In right panel
- **Color token:** `--color-deploy-active` for deploy session mode indicator
- **Clock during deploy:** Clocks visible and running (architecture says clocks run during deploy, but UX doc says "Paused during deploy and disconnect" — **clarification needed from user**)

### Edge Function File Structure

```
supabase/
  functions/
    validate-move/
      index.ts          # Edge Function entry point
    _shared/
      cors.ts           # CORS headers (if needed)
      cotulenh-core.ts  # Fallback ESM bundle (if Deno import fails)
```

### Existing Code to Modify

**Files to modify:**
- `apps/cotulenh/web/src/stores/game-store.ts` — Add deploy actions, engine instance, deploy state
- `apps/cotulenh/web/src/components/game/board-container.tsx` — Enable interactivity during deploy phase
- `apps/cotulenh/web/src/components/game/game-page-client.tsx` — Render deploy UI when phase is deploying
- `apps/cotulenh/web/src/components/game/game-right-panel.tsx` — Show deploy controls in right panel on desktop

**New files:**
- `supabase/functions/validate-move/index.ts` — Edge Function
- `apps/cotulenh/web/src/components/game/deploy-piece-tray.tsx`
- `apps/cotulenh/web/src/components/game/deploy-progress-counter.tsx`
- `apps/cotulenh/web/src/components/game/deploy-controls.tsx`

### Project Structure Notes

- All components in `src/components/game/` — one component per file
- Tests co-located: `src/components/game/__tests__/`, `src/stores/__tests__/`
- No barrel exports (no `index.ts` files)
- Direct imports only
- Vietnamese text from first commit — no English placeholders
- 0px border radius everywhere. No shadows. No gradients. Borders for elevation.
- System fonts: `--font-sans` for body, `--font-mono` for clocks/moves
- Server Actions return `{ success: false, error }` — never throw
- Edge Functions return `{ error, code }` with HTTP status codes

### Anti-Patterns to Avoid

- Do NOT trust client-supplied game state — server replays from `move_history`
- Do NOT send placement data in `deploy_submitted` event — blind deployment
- Do NOT create REST API routes — use Server Actions for client calls, Edge Functions for game validation
- Do NOT use `supabase.from().update()` without `SELECT FOR UPDATE` in Edge Function
- Do NOT hardcode FEN strings — import `DEFAULT_POSITION` from `@cotulenh/core`
- Do NOT create barrel exports (index.ts files)
- Do NOT skip proof-of-concept for Deno + @cotulenh/core compatibility
- Do NOT add spinners — skeleton screens only for loading states
- Vietnamese error messages for user-facing strings; English for internal codes

### Naming Conventions

- DB tables/columns: snake_case (`game_states`, `deploy_state`)
- TypeScript types: PascalCase (`DeployStateView`, `MoveSession`)
- Functions/methods: camelCase (`commitDeploy`, `cancelSession`)
- Files: kebab-case (`deploy-piece-tray.tsx`, `deploy-controls.tsx`)
- CSS tokens: kebab-case (`--color-deploy-active`)
- Broadcast events: snake_case (`deploy_submitted`, `deploy_commit`)

### Testing Approach

- **Unit tests:** Game store deploy actions with mocked engine
- **Component tests:** Deploy UI components (piece tray, progress counter, controls)
- **Integration tests:** Deploy flow from user interaction through store to (mocked) Edge Function
- **Edge Function tests:** Deploy validation logic (if Supabase test harness available, otherwise manual)
- Co-locate tests: `__tests__/` directories next to source
- Follow Vitest patterns from existing tests
- Current test count: ~299 tests passing — maintain and add

### Previous Story Intelligence (3.2)

Key learnings from Story 3.2:
- **RPC function pattern:** `create_game_with_state` uses `SECURITY DEFINER` to bypass RLS. Follow same pattern for any new DB functions.
- **Hardened security:** RPC execution scope restricted (no PUBLIC execute). Apply same to any Edge Function DB access.
- **Race condition prevention:** DB unique constraint on `games.invitation_id` prevents duplicate creation. Similar concurrency thinking needed for deploy submissions.
- **Runtime validation:** Added runtime validation for `game_config` shape before RPC call. Do the same for deploy SAN arrays before Edge Function submission.
- **Vietnamese error messages** for user-facing validation errors.
- **16 targeted tests** — focused on specific behavior, not generic.

### Previous Story Intelligence (3.1)

Key learnings from Story 3.1:
- **"Done != done"** — ensure ALL ACs are implemented, not just happy path
- **Vietnamese text from first commit** — no English placeholders
- **Board integration:** `useBoard` hook with `next/dynamic` SSR-false — proven pattern
- **Board never resizes** when panel content changes — `flex-shrink-0`
- **`my_color`** added to game payload for player perspective
- **30 tests in 3.1** — adversarial code review caught missing coverage

### Clock Behavior Question

**Architecture says:** "Clock must be running and synchronized during the entire deploy phase" and story AC1 says "the game clock starts running during deployment (FR6)".

**UX spec says:** "Paused during deploy and disconnect."

This is a contradiction. **The developer should follow the architecture/PRD requirement (clocks run during deploy)** unless the user clarifies otherwise. Flag this during implementation review.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — Deploy Phase Protocol, validate-move Edge Function, Broadcast Events, Concurrency, Game Store]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Deploy Phase UX, DeployProgressCounter, Responsive Layout]
- [Source: _bmad-output/implementation-artifacts/3-2-game-creation-database-setup.md — Previous story patterns, RPC, security]
- [Source: _bmad-output/implementation-artifacts/3-1-game-page-layout-board-integration.md — Board integration, layout, design patterns]
- [Source: supabase/migrations/011_game_states.sql — game_states table with deploy_state, phase columns]
- [Source: packages/cotulenh/core/src/cotulenh.ts — CoTuLenh engine API]
- [Source: packages/cotulenh/core/src/move-session.ts — MoveSession class]
- [Source: apps/cotulenh/web/src/stores/game-store.ts — Current game store structure]
- [Source: apps/cotulenh/web/src/components/game/board-container.tsx — Current board wrapper]
- [Source: apps/cotulenh/web/src/lib/constants/game-config.ts — DEPLOY_RULES, TIME_CONTROL_PRESETS]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed type error in board-container.tsx: `events.after` callback required `OrigMove`/`DestMove` objects, not `Key` strings
- Updated game-page-client tests to mock `@cotulenh/core`, `use-game-channel`, and `supabase/browser` to prevent FEN parsing errors in test environment
- Adapted existing tests for deploy phase UI (right panel now shows deploy controls during deploying phase)

### Completion Notes List

- **Task 1:** Created validate-move Edge Function with full deploy protocol: JWT auth, participant verification, SELECT FOR UPDATE concurrency lock via new RPC `lock_game_state_for_update`, phase enforcement, deploy validation by replaying move_history, single/both-player deploy handling with Broadcast events, seq numbers
- **Task 2:** Extended game store with deploy actions: `initializeEngine`, `deployMove`, `cancelDeploy`, `commitDeploy`, `submitDeploy` (Edge Function call), `setOpponentDeploySubmitted`, `applyDeployCommit`, `getDeployablePieces`, `getDeployProgress`. 20 unit tests.
- **Task 3:** Created deploy UI components: `DeployPieceTray` (piece selection toolbar), `DeployProgressCounter` (aria-live "Bo tri — Quan X/Y"), `DeployControls` (commit/undo buttons + waiting indicator). 14 component tests.
- **Task 4:** Updated `BoardContainer` to accept `viewOnly` and `onMove` props. Board is interactive during deploy phase (viewOnly=false), read-only otherwise. Fixed OrigMove/DestMove type compatibility.
- **Task 5:** Created `useGameChannel` hook for Realtime Broadcast channel subscription — handles `deploy_submitted` and `deploy_commit` events with seq tracking. Added `submitDeploy` store action calling validate-move Edge Function.
- **Task 6:** Integrated deploy UI into `GamePageClient` — responsive layout with deploy controls in right panel (desktop), below board (mobile). Phase transition: deploy UI → move list when transitioning deploying → playing. Clocks active during deploy phase.
- **Task 7:** Integration tested via full test suite — 333 tests pass across 51 files. Type checks pass. No regressions.

### File List

**New files:**
- supabase/functions/validate-move/index.ts (rewritten from POC)
- supabase/migrations/014_lock_game_state_rpc.sql
- apps/cotulenh/web/src/components/game/deploy-piece-tray.tsx
- apps/cotulenh/web/src/components/game/deploy-progress-counter.tsx
- apps/cotulenh/web/src/components/game/deploy-controls.tsx
- apps/cotulenh/web/src/hooks/use-game-channel.ts
- apps/cotulenh/web/src/stores/__tests__/game-store-deploy.test.ts
- apps/cotulenh/web/src/components/game/__tests__/deploy-components.test.tsx

**Modified files:**
- apps/cotulenh/web/src/stores/game-store.ts (added deploy state, actions, selectors)
- apps/cotulenh/web/src/components/game/board-container.tsx (added viewOnly, onMove props)
- apps/cotulenh/web/src/components/game/game-page-client.tsx (integrated deploy UI, game channel)
- apps/cotulenh/web/src/components/game/__tests__/game-page-client.test.tsx (updated mocks, adapted tests for deploy phase)
- _bmad-output/implementation-artifacts/sprint-status.yaml (3-3 status updates)

### Change Log

- 2026-03-17: Implemented Story 3.3 Deploy Session — full deploy phase with Edge Function validation, game store deploy actions, deploy UI components, Realtime Broadcast channel, responsive game page integration. 34 new tests added (20 store + 14 component). All 333 tests pass.
