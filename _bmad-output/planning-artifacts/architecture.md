---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
lastStep: 8
status: 'complete'
completedAt: '2026-02-25'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/research/technical-firebase-supabase-baas-for-sveltekit-game-research-2026-02-25.md
  - docs/Architecture.md
  - docs/ai-agent-guide/system-architecture.md
  - docs/ai-agent-guide/package-responsibilities.md
  - docs/ai-agent-guide/data-flow-patterns.md
  - docs/ai-agent-guide/api-contracts.md
workflowType: 'architecture'
project_name: 'cotulenh-monorepo'
user_name: 'Noy'
date: '2026-02-25'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
48 FRs across 9 capability areas. The heaviest area is Online Gameplay (13 FRs including the dispute system), followed by Match Invitations (7 FRs) and Friend System (6 FRs). Auth, profiles, learn progress, feedback, and platform infrastructure are straightforward. The game replay capability (FR36-37) leverages existing PGN support in `@cotulenh/core`.

**Non-Functional Requirements:**
18 NFRs across performance (7), security (6), and reliability (5). Performance requirements center on mobile browser constraints and realtime move latency. Security relies on Supabase's built-in capabilities (RLS, bcrypt, cookie-based sessions). Reliability focuses on game state preservation and reconnection.

**Scale & Complexity:**

- Primary domain: Full-stack web (SvelteKit + Supabase)
- Complexity level: Medium
- Estimated architectural components: ~8-10 (auth, profiles, friends, invitations, game session, game history, learn sync, feedback, realtime management, dispute system)

### Technical Constraints & Dependencies

- **Existing codebase:** `@cotulenh/core` (game engine), `@cotulenh/board` (board UI), `@cotulenh/learn` (learn system) — must remain unchanged
- **SvelteKit app:** Svelte 5 runes, bits-ui, Tailwind 4, i18n (en/vi), currently `adapter-static`
- **Supabase decision locked:** Selected via prior research. PostgreSQL + Auth + Realtime (Broadcast + Presence)
- **`@supabase/ssr`:** Required for server-side auth in SvelteKit
- **PGN format:** Game persistence uses existing `pgn()`/`loadPgn()` — no custom serialization needed
- **SAN over Broadcast:** Move transmission is a string message, not a DB write
- **Solo developer:** Architecture must minimize custom infrastructure and leverage Supabase managed services

### Cross-Cutting Concerns Identified

1. **Authentication state** — Affects routing (protected vs public pages), data access (RLS), realtime channel authorization, and UI state (logged in vs anonymous)
2. **Realtime subscription lifecycle** — Game channels, Presence for online status, invitation notifications — all need proper setup, teardown, and reconnection
3. **i18n** — All new UI must support English and Vietnamese using existing i18n system
4. **Error handling & graceful degradation** — Network failures during gameplay, failed API calls, Supabase service interruptions
5. **Mobile responsiveness** — New pages (friends, history, profile, settings) must follow existing responsive patterns (desktop/mobile split)
6. **Online/offline state** — Detecting connectivity changes, handling reconnection, syncing state after reconnect

## Starter Template & Technology Foundation

### Existing Technology Stack (Brownfield)

This is an existing SvelteKit monorepo. No starter template needed — the foundation is already established.

**Framework & Language:**

- SvelteKit with Svelte 5 (runes: `$state`, `$effect`, `$derived`)
- TypeScript
- Vite (build tooling)

**Styling & UI:**

- Tailwind 4
- bits-ui (headless UI components)
- lucide-svelte (icons)

**Testing & Quality:**

- Vitest
- ESLint + Prettier

**Content:**

- mdsvex (markdown in Svelte)
- Zod (schema validation)

**Existing Packages:**

- `@cotulenh/core` — game engine (SAN, PGN, FEN, move validation)
- `@cotulenh/board` — board UI component
- `@cotulenh/learn` — learning system
- `@cotulenh/common` — shared utilities
- `@cotulenh/combine-piece` — piece stacking logic

### New Dependencies for MVP

| Package                    | Purpose                                               |
| -------------------------- | ----------------------------------------------------- |
| `@supabase/supabase-js`    | Supabase client (auth, database, realtime)            |
| `@supabase/ssr`            | SvelteKit server-side auth (cookie-based sessions)    |
| `@sveltejs/adapter-vercel` | Vercel deployment adapter (replaces `adapter-static`) |

### Deployment Target

**Platform:** Vercel (free hobby tier)
**Adapter:** `@sveltejs/adapter-vercel` (or `adapter-auto` which auto-detects Vercel)
**Rationale:** Best SvelteKit support, zero-config deployment, automatic HTTPS and preview deployments. Serverless model is appropriate because Supabase handles all persistent connections (realtime, database) directly from the client. The SvelteKit server only handles SSR and auth cookie management.

**Supabase:** Free tier project for auth, PostgreSQL, and Realtime services.

## Core Architectural Decisions

### 1. Data Architecture

**Decision: Flat tables, all logic in app layer**

- Simple PostgreSQL tables with no stored procedures or RPC functions for MVP
- All business logic lives in the SvelteKit application (TypeScript), not in the database
- Supabase CLI migrations (`supabase/migrations/`) for schema version control
- Client-side caching via Svelte 5 `$state` — fetch once per page load, no dedicated cache layer

**Tables:**

| Table              | Purpose                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`         | Extends `auth.users` — display_name, avatar_url, locale, settings_json                                                                                                                |
| `friendships`      | Bidirectional — user_a, user_b, status (pending/accepted/blocked), initiated_by                                                                                                       |
| `games`            | All games — red_player, blue_player, status, winner, result_reason, pgn, time_control, started_at, ended_at. Row created on game start (`status = 'started'`), updated on completion. |
| `game_invitations` | Pending invites — from_user, to_user, status, game_config, expires_at, invite_code                                                                                                    |
| `disputes`         | Illegal move reports — game_id, reported_by, move_san, pgn_at_point, classification, resolution                                                                                       |
| `learn_progress`   | Migrated from localStorage — user_id, subject_id, section_id, lesson_id, stars                                                                                                        |
| `feedback`         | In-app submissions — user_id, message, context_json, page_url                                                                                                                         |

**Rationale:** Solo dev iterating on MVP. Keeping all logic in one language (TypeScript) is faster to develop, debug, and change. RPCs can be added later if atomicity becomes a real concern at scale.

### 2. Authentication & Security

**Decision: Hook-based session validation + layout-level auth guards**

- `hooks.server.ts` validates the Supabase session cookie on every request and attaches the user to `event.locals`
- Root `+layout.server.ts` passes the session to all pages
- Individual routes decide their own auth behavior (redirect, show different UI, allow anonymous)
- This follows the `@supabase/ssr` recommended pattern for SvelteKit

**Route access boundaries:**

| Public (no login needed)                           | Protected (login required)                    |
| -------------------------------------------------- | --------------------------------------------- |
| `/` (home/landing)                                 | `/user/profile`                               |
| `/learn/*`                                         | `/user/settings`                              |
| `/play` (local play)                               | `/user/friends`                               |
| `/board-editor`                                    | `/user/history/*`                             |
| `/auth/*` (login, register, forgot/reset password) | `/play/online/*` (except invite link landing) |

`/learn/*` works for anonymous users (localStorage fallback) and syncs to DB when logged in.

**RLS policies — simple "is this your row?" checks:**

- **Profiles:** Anyone can read (public display names). Only owner can update.
- **Friendships:** Users can only read/write rows where they are `user_a` or `user_b`.
- **Games:** Anyone can read completed games (public game history, like Lichess). Only system/participants can insert.
- **Game invitations:** `from_user` or `to_user` can read/update. Only `from_user` can insert.
- **Disputes:** Game participants can insert. Only admin can read all / update resolution.
- **Learn progress:** Only owner can read/write.
- **Feedback:** Owner can insert. Only admin can read all.

### 3. API & Communication

**Decision: Supabase client per environment + dual-purpose game channels + Postgres Changes for invitations**

**Supabase client initialization:**

- **Server client** — created per request in `hooks.server.ts`, manages auth cookies. Used in `+page.server.ts` and `+layout.server.ts`.
- **Browser client** — singleton, used in components for realtime subscriptions, client-side queries, and Broadcast channels.
- Keys (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`) exposed via `$env/static/public`. Anon key is safe — RLS does the security.

**Realtime channel architecture:**

| Channel                        | Type                 | Purpose                                                                                                                   |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `game:{game_id}`               | Broadcast + Presence | Move transmission (SAN + clock), resign, draw offers, dispute, abort. Presence tracks player connection status.           |
| `user:{user_id}` notifications | Postgres Changes     | Listen for `INSERT` on `game_invitations` where `to_user = me`. Persistent — works even if recipient was briefly offline. |
| `lobby`                        | Presence             | Online status indicators for friend lists. Subscribe on login, unsubscribe on logout.                                     |

**Game lifecycle states:**

A `games` row is created with `status = 'started'` when both players join the game channel. On game end, the first client to detect the end condition performs `UPDATE games SET status = '...' WHERE id = ? AND status = 'started'`. The `AND status = 'started'` clause ensures only one write succeeds (optimistic concurrency — prevents both clients from writing conflicting results).

```
status: 'started' | 'aborted' | 'checkmate' | 'resign' | 'timeout' | 'stalemate' | 'draw' | 'dispute'
winner: 'red' | 'blue' | null  (null for draws/aborts/disputes)
```

**Game channel disconnect & abandonment (Lichess model):**

- Both players join with Presence on the game channel
- Player disconnects → Supabase fires `leave` event (~10s) → opponent sees "Opponent disconnected" banner
- Player reconnects → `join` event → banner dismissed, game continues
- Clock keeps ticking regardless of connection status (client manages both clocks locally)
- **Abort:** If a player leaves before both sides have moved → game aborted (`status = 'aborted'`), no penalty
- **NoStart timeout:** After game creation, if the first move isn't received within 30 seconds, the game is aborted. The waiting client handles this locally — no move via Broadcast within 30s → abort.
- **Claim Victory (not auto-forfeit):** When opponent's clock reaches 0, show a "Claim Victory" button. The player must actively click it, which sends `{ event: 'claim-victory' }` and writes `status = 'timeout'` to the DB. This avoids race conditions from auto-forfeit and gives the disconnected player maximum reconnection time.
- **Draw offer + timeout interaction:** If a draw offer is pending and the offering player's opponent flags (clock hits 0), the game result is draw (not timeout win). Prevents unsportsmanlike draw offer timing.
- The clock is the universal anti-stalling mechanism — no server-side timeout needed
- **Reconnect sync:** On Presence `join` after disconnect, the connected player's client sends a `sync` message with current FEN, PGN, both clock values, and current `seq` number. The reconnecting player loads this state to catch up on any missed moves.
- **Rematch:** After game ends, either player can send `{ event: 'rematch' }`. If the other player sends `{ event: 'rematch-accept' }`, a new `game_invitations` row is created with swapped colors and the same time control.

**Move reliability (ack system):**

- Each move includes a `seq` counter (1, 2, 3...) that increases monotonically per game.
- On receiving a move, the receiver sends `{ event: 'ack', seq }` back to the sender.
- If the sender doesn't receive an ack within 3 seconds, they resend the move (same `seq`). The receiver ignores duplicate `seq` values.
- On reconnect, if the receiver's last known `seq` has a gap (e.g., received seq=5, last was seq=3), they request a `sync` instead of processing individual moves.

**Clock synchronization & lag compensation:**

- `clock` value in move messages = sender's remaining time in ms at the moment they press the move button.
- `sentAt` = `Date.now()` timestamp at send time.
- On receiving a move, the receiver computes approximate one-way lag: `lag = Date.now() - sentAt`. This relies on reasonably NTP-synced system clocks (±50ms for modern devices).
- **Lag compensation:** The receiver credits the sender by adjusting their reported clock: `adjustedClock = clock + min(lag, lagQuota)`. This prevents the sender from losing time to network latency.
- **Lag quota:** Each player has a lag compensation quota that regenerates per move, preventing abuse:
  - `quotaGain = 100ms` per move (regeneration)
  - `maxQuota = 500ms` (cap)
  - `compensation = min(estimatedLag, currentQuota)`
  - `currentQuota = min(currentQuota + quotaGain - compensation, maxQuota)`
- Between moves, local countdown is authoritative (no server clock).
- On clock flag (0ms), the opponent is shown a "Claim Victory" button (see above).

**Background tab clock handling:**

- Browsers throttle `setTimeout`/`setInterval` to 1/sec in background tabs, causing clock display to freeze.
- Use `document.visibilitychange` event. On tab becoming visible, recalculate elapsed time using `Date.now()` delta instead of accumulated timer ticks.
- The clock class must track `lastTickTimestamp` and compute drift on visibility change: `elapsed = Date.now() - lastTickTimestamp`, then apply the full elapsed amount in one update.
- This ensures the clock "catches up" immediately when the player returns to the tab.

**Error handling (MVP-minimal):**

- Realtime disconnects: Supabase client auto-reconnects. Show "reconnecting..." banner during game if connection drops.
- Failed DB queries: Toast notification with retry option.
- No custom retry logic or circuit breakers.

### 4. Frontend Architecture

**Decision: Grouped route structure + page-level state with Svelte 5 runes**

**Route structure:**

| Route                        | Purpose                 | Auth      |
| ---------------------------- | ----------------------- | --------- |
| `/auth/login`                | Login                   | Public    |
| `/auth/register`             | Register                | Public    |
| `/auth/forgot-password`      | Password reset request  | Public    |
| `/auth/reset-password`       | Set new password        | Public    |
| `/user/profile`              | Own profile             | Protected |
| `/user/profile/[username]`   | View someone's profile  | Public    |
| `/user/settings`             | User settings           | Protected |
| `/user/friends`              | Friend list + requests  | Protected |
| `/user/history`              | Game history list       | Protected |
| `/user/history/[gameId]`     | Replay a completed game | Protected |
| `/play/online`               | Online lobby/invite     | Protected |
| `/play/online/invite/[code]` | Invite link landing     | Public    |
| `/play/online/[gameId]`      | Active online game      | Protected |

Existing routes (`/play`, `/learn/*`, `/board-editor`) unchanged. Three parent groups:

- **`/auth`** — login, register (future: forgot-password, OAuth)
- **`/user`** — everything tied to a logged-in user (future: notifications, blocked users)
- **`/play/online`** — online gameplay (future: matchmaking, tournaments)

Auth guards are clean: `/user/*` protected at layout level, `/auth/*` redirects to home if already logged in.

**State management:**

- **Auth state** — passed from `+layout.server.ts` via `data.session`, available to all pages through layout hierarchy as `$derived`.
- **Game session state** — see "Online Game Session Architecture" below.
- **Friend list / invitations** — fetched per page, held in page-level `$state`. No global store.
- **Invitation notifications** — realtime subscription in root layout (works on any page).
- No state management library needed — Svelte 5 runes are sufficient.

**Component architecture:**

- Follow existing patterns (bits-ui, Tailwind, lucide-svelte)
- Reuse existing layout patterns (desktop/mobile split)
- New shared components: `PlayerCard`, `GameClock`, `GameResultBadge`, `OnlineIndicator`, `FriendRequestCard`, `InvitationCard`
- Online game page composes existing `Board` component with new online wrappers

**Online Game Session Architecture:**

The existing `GameSession` class (in `game-session.svelte.ts`) already implements the correct pattern: wraps the `CoTuLenh` engine with Svelte 5 reactivity via `#version` bumps, manages history, caches possible moves, and syncs the board via `setupBoardEffect()`. The online session **composes** this, not replaces it.

```
OnlineGameSession ($lib/game/online-session.svelte.ts)
├── session: GameSession              ← existing class, unchanged
├── clock: ChessClockState            ← existing class, with lag-aware updates
├── channel: RealtimeChannel          ← Supabase game:{gameId} channel
├── opponent: { userId, displayName } ← from game record
├── connectionState: 'connected' | 'reconnecting' | 'opponent-disconnected'
├── lagTracker: LagTracker            ← lag estimation + quota (100ms regen, 500ms max)
├── seqCounter: number                ← monotonic move counter for ack system
├── pendingAcks: Map<number, Timer>   ← unacknowledged moves → 3s retry
├── lifecycle: 'waiting' | 'started' | 'ended'
├── pendingDrawOffer: boolean
└── playerColor: 'red' | 'blue'      ← which side the local player controls
```

**Local player move flow:**

```
1. Board callback → session.#handleMove(orig, dest)
2. → makeCoreMove(game, orig, dest) → returns SAN if valid
3. → session.onMove() callback fires → OnlineGameSession intercepts:
   a. Compute clock value = clock.getTime(playerColor)
   b. Broadcast: { event: 'move', san, clock, seq: ++seqCounter, sentAt: Date.now() }
   c. Start ack timer (3s → resend same seq)
   d. clock.switchSide()
   e. GameSession bumps #version → board updates
```

**Remote player move flow:**

```
1. Broadcast received: { event: 'move', san, clock, seq, sentAt }
2. → Send ack: { event: 'ack', seq }
3. → Ignore if duplicate seq (already processed)
4. → Compute lag: lag = Date.now() - sentAt
5. → Lag compensation: adjustedClock = clock + min(lag, lagTracker.debit(lag))
6. → session.game.move(san) — validate locally via @cotulenh/core
7. → If valid:
     a. Push to session history (with clock annotation for PGN)
     b. Update opponent's clock display to adjustedClock
     c. clock.switchSide()
     d. Session bumps #version → board updates
8. → If invalid:
     a. Pause game, send { event: 'dispute', san, pgn }
     b. Both players see dispute UI
```

**Game replay (no new architecture needed):**
For `/user/history/[gameId]`, load PGN from `games` table, create a `GameSession` via `core.loadPgn(pgn)`, and use the existing `historyViewIndex` navigation. The existing `MoveHistory` component, keyboard handlers, and forward/backward navigation already support replay. The board is set to `viewOnly: true`.

**Clock implementation — required pattern (delta-based timing):**

The existing `ChessClockState` uses `setInterval(100ms)` with fixed decrements (`time -= 100`). This is fragile — browsers throttle background tabs to 1 tick/sec, CPU spikes delay intervals, and mobile timers are unreliable. The clock MUST be updated to use delta-based timing:

```typescript
// REQUIRED: Delta-based timing (replaces fixed 100ms decrement)
#lastTick = Date.now();

tick() {
  const now = Date.now();
  const elapsed = now - this.#lastTick;
  this.#lastTick = now;
  this.#activeTime -= elapsed;  // actual elapsed, not assumed 100ms
}
```

This handles background tab throttling, CPU spikes, and mobile timer unreliability in one pattern. The `setInterval(100ms)` remains as the trigger, but each tick measures real elapsed time instead of assuming 100ms.

Additionally, on `visibilitychange` (tab becomes visible), force an immediate tick to update the display without waiting for the next interval.

This applies to both local play AND online play — the existing clock should be upgraded.

**Clock integration for online play:**

- Between moves: local delta-based countdown is authoritative (same as local play)
- On each opponent move received: `OnlineGameSession` overrides the opponent's clock with the lag-compensated value from the move message, and resets `#lastTick = Date.now()` for that clock
- Per-move clock values are passed to `@cotulenh/core`'s PGN system so saved games include `[%clk]` annotations

### 5. Infrastructure & Deployment

**Decision: Minimal MVP infrastructure — Vercel auto-deploy + Supabase dashboard monitoring**

**Environment configuration:**

- `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Both are public-safe (prefixed `PUBLIC_` for SvelteKit). RLS handles security, not key secrecy.
- No server-only secrets needed for MVP.

**CI/CD:**

- Existing pipeline stays unchanged
- Vercel auto-deploys from GitHub (zero config for SvelteKit)
- Preview deployments on PRs (free)
- Supabase migrations run manually via `supabase db push` for MVP — no automated migration pipeline at this scale

**Monitoring (MVP-minimal):**

- Vercel dashboard for deployment logs and serverless function errors
- Supabase dashboard for auth events, DB queries, realtime connections
- No custom logging, APM, or error tracking
- Future option: Sentry free tier if needed

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (PostgreSQL/Supabase):**

- Tables: `snake_case`, plural (`profiles`, `friendships`, `games`)
- Columns: `snake_case` (`user_id`, `display_name`, `created_at`)
- Foreign keys: `{referenced_table_singular}_id` (`user_id`, `game_id`)
- Indexes: `idx_{table}_{column}` (`idx_profiles_user_id`)

**Code (TypeScript/Svelte — follows existing codebase):**

- Components: `PascalCase.svelte` (`PlayerCard.svelte`, `GameClock.svelte`)
- Headless UI wrappers: `kebab-case.svelte` (following bits-ui pattern)
- Lib files: `kebab-case.ts` (`game-session.ts`, `supabase-client.ts`)
- Reactive state classes: `.svelte.ts` extension (`game-session.svelte.ts`)
- Functions/variables: `camelCase`
- Private class members: `#camelCase`
- Types/interfaces: `PascalCase`, exported with `export type { }`
- Constants: `UPPER_SNAKE_CASE` for true constants, `camelCase` for config objects

**Realtime channels:**

- Channel names: colon-separated `{scope}:{id}` (`game:{gameId}`, `user:{userId}`)
- Broadcast event names: `kebab-case` (`move`, `resign`, `draw-offer`, `draw-accept`, `dispute`, `abort`)

**DB ↔ TypeScript boundary:**

- DB returns `snake_case` → transform to `camelCase` at the query boundary
- Use Supabase generated types where possible

### Structure Patterns

**Tests:** Co-located with source, `filename.test.ts` (existing convention)

**New file organization under `$lib/`:**

- `$lib/supabase/` — client initialization, types, helpers
- `$lib/auth/` — auth state, guards, session helpers
- `$lib/game/` — extend existing game code with online session management
- `$lib/friends/` — friendship queries, types
- `$lib/feedback/` — feedback submission helpers

**Component organization:** By feature within routes, shared components in `$lib/components/`

**Import order (existing convention):**

1. Svelte framework imports
2. External package imports
3. `$lib/` imports
4. Type imports (separate `import type { }`)

### Communication Patterns

**Typed broadcast message system (required pattern):**

All game channel communication MUST use a discriminated union type:

```typescript
type GameMessage =
  // Gameplay
  | { event: 'move'; san: string; clock: number; seq: number; sentAt: number }
  | { event: 'ack'; seq: number }
  // Game end
  | { event: 'resign' }
  | { event: 'claim-victory' } // opponent flagged (clock hit 0), click to claim win
  | { event: 'abort' }
  // Draw
  | { event: 'draw-offer' }
  | { event: 'draw-accept' }
  | { event: 'draw-decline' }
  // Dispute
  | { event: 'dispute'; san: string; pgn: string }
  // Reconnection
  | { event: 'sync'; fen: string; pgn: string; clock: { red: number; blue: number }; seq: number }
  // Post-game
  | { event: 'rematch' }
  | { event: 'rematch-accept' }
  | { event: 'rematch-decline' };
```

Fields:

- `clock`: sender's remaining time in ms at the moment the move is sent
- `seq`: monotonically increasing move counter (1, 2, 3...). Enables gap detection — if you receive seq=5 after seq=3, you know seq=4 was missed and can request a `sync`.
- `sentAt`: `Date.now()` timestamp at send time, used for lag estimation by the receiver.

A single `sendGameMessage(channel, msg: GameMessage)` function and a handler that switches on `event`. Type-safe at compile time, one place to add new message types. No raw untyped payloads.

### Format Patterns

**Dates:**

- DB: `timestamptz` (PostgreSQL native)
- TypeScript: ISO string from Supabase
- Display: `Intl.DateTimeFormat` (respects user locale). No date library dependency.

**Supabase query results:**

- Always destructure `{ data, error }` — never assume success
- Handle `error` before using `data`

### Process Patterns

**Error handling (extends existing):**

- Use existing `ErrorBoundary.svelte` for component errors
- Use existing `logger` for error logging — never raw `console.log`
- Supabase query errors: check `{ data, error }`, show toast on error
- Realtime errors: "reconnecting..." banner (game page only)
- All user-facing error messages through i18n (`i18n.t('error.key')`)

**Loading states:**

- Page-level: SvelteKit's built-in loading via `+page.server.ts` / `{#await}`
- Component-level: `$state` boolean (`let loading = $state(false)`)
- No global loading store

**Auth flow:**

- `hooks.server.ts` → validate session → `event.locals.user`
- `+layout.server.ts` → pass session to pages
- Protected route layouts → redirect to `/auth/login` if no session
- After login → redirect back to intended page

### Brownfield Refactoring Guidelines

The existing `apps/cotulenh/app/` code was built during early MVP development. It is **not sacred**. When breaking work into stories, evaluate existing implementations and propose changes where warranted. This includes:

- **UI/UX**: Existing components, layouts, and user flows should be reviewed against the full platform vision (Lichess-inspired). Theming, navigation, responsiveness, and interaction patterns may need rework to support the online multiplayer experience.
- **Component structure**: Existing components were designed for local-only play. Some may need restructuring to support both local and online modes (e.g., `PlayDesktop.svelte` may need to become a shared layout that both `/play` and `/play/online/[gameId]` use).
- **State patterns**: The existing `GameSession` class is well-designed but may need interface changes to support composition with `OnlineGameSession`. Evaluate and propose changes rather than working around limitations.
- **Clock implementation**: The existing `ChessClockState` needs the delta-based timing upgrade. Review the full clock API surface while making this change.
- **Settings/theming**: The existing settings system (`settings.ts`, `persisted.svelte.ts`, themes) was designed for localStorage-only. Evaluate whether the migration to Supabase-backed settings warrants restructuring the settings API.
- **Routing**: Existing routes (`/play`, `/learn`, `/board-editor`) may benefit from layout adjustments to accommodate the new navigation structure (auth-aware header, user menu, notification indicators).

**Principle: Improve what exists when touching it. Don't preserve suboptimal patterns out of brownfield caution.** If a story touches a file that has issues, fix the issues in the same story. Flag proposed changes in story specs so they're reviewed before implementation.

### Enforcement Summary

**All AI agents MUST:**

1. Follow existing naming conventions (PascalCase components, camelCase code, snake_case DB)
2. Use Svelte 5 runes (`$state`, `$derived`, `$effect`) — never Svelte 4 stores
3. Use `.svelte.ts` for reactive state classes
4. Put all user-facing strings through i18n (both `en` and `vi`)
5. Co-locate tests as `filename.test.ts`
6. Use `$lib/` import alias — never relative `../../../` paths
7. Check Supabase `{ data, error }` returns — never assume success
8. Use existing `logger` for error logging — never raw `console.log`
9. Use the typed `GameMessage` discriminated union for all broadcast payloads — no raw objects
10. Use delta-based timing (`Date.now()` elapsed) for all clock/timer logic — never fixed-interval decrements

## Project Structure & Boundaries

### Complete Project Directory Structure

Items marked `← NEW` are additions for the MVP online features. Unmarked items already exist.

```
cotulenh-monorepo/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example                          ← NEW
├── apps/
│   └── cotulenh/
│       └── app/
│           ├── package.json
│           ├── svelte.config.js          (update: adapter-static → adapter-vercel)
│           ├── vite.config.ts
│           ├── tsconfig.json
│           └── src/
│               ├── app.html
│               ├── app.css
│               ├── app.d.ts              (update: add locals.user type)
│               ├── hooks.server.ts       ← NEW (Supabase session validation)
│               ├── lib/
│               │   ├── index.ts
│               │   ├── utils.ts
│               │   ├── debug.ts
│               │   ├── game-session.svelte.ts
│               │   ├── game-session-helpers.ts
│               │   ├── game-session-helpers.test.ts
│               │   ├── clock/
│               │   │   └── clock.svelte.ts
│               │   ├── components/
│               │   │   ├── BoardContainer.svelte
│               │   │   ├── ChessClock.svelte
│               │   │   ├── ClockPanel.svelte
│               │   │   ├── ErrorBoundary.svelte
│               │   │   ├── GameControls.svelte
│               │   │   ├── GameInfo.svelte
│               │   │   ├── MoveConfirmPanel.svelte
│               │   │   ├── MoveHistory.svelte
│               │   │   ├── ResponsiveLayout.svelte
│               │   │   ├── SettingsDialog.svelte
│               │   │   ├── ShareDialog.svelte
│               │   │   ├── ShortcutsDialog.svelte
│               │   │   ├── PlayerCard.svelte          ← NEW
│               │   │   ├── OnlineIndicator.svelte     ← NEW
│               │   │   ├── GameResultBadge.svelte     ← NEW
│               │   │   ├── FriendRequestCard.svelte   ← NEW
│               │   │   ├── InvitationCard.svelte      ← NEW
│               │   │   ├── ReconnectBanner.svelte     ← NEW
│               │   │   ├── game-info/
│               │   │   └── ui/
│               │   │       ├── alert/
│               │   │       ├── badge/
│               │   │       ├── button/
│               │   │       ├── card/
│               │   │       ├── dialog/
│               │   │       ├── dropdown-menu/
│               │   │       ├── separator/
│               │   │       ├── sonner/
│               │   │       ├── calendar/
│               │   │       ├── input/               ← NEW
│               │   │       └── avatar/              ← NEW
│               │   ├── features/
│               │   │   ├── board-editor/
│               │   │   └── game/
│               │   ├── i18n/
│               │   │   ├── index.svelte.ts
│               │   │   ├── types.ts
│               │   │   └── locales/
│               │   ├── learn/
│               │   │   ├── components/
│               │   │   ├── layouts/
│               │   │   ├── learn-i18n.svelte.ts
│               │   │   ├── learn-progress.svelte.ts  (update: add Supabase sync)
│               │   │   └── learn-session.svelte.ts
│               │   ├── stores/
│               │   │   ├── persisted.svelte.ts
│               │   │   ├── settings.ts
│               │   │   └── theme.svelte.ts
│               │   ├── styles/
│               │   ├── themes/
│               │   ├── types/
│               │   │   ├── game.ts
│               │   │   ├── translations.ts
│               │   │   ├── type-guards.ts
│               │   │   ├── type-guards.test.ts
│               │   │   └── database.ts              ← NEW (Supabase generated types)
│               │   ├── supabase/                    ← NEW
│               │   │   ├── client.ts                ← NEW (browser client singleton)
│               │   │   ├── server.ts                ← NEW (server client factory)
│               │   │   └── types.ts                 ← NEW (re-exports, helpers)
│               │   ├── auth/                        ← NEW
│               │   │   └── guards.ts                ← NEW (auth redirect helpers)
│               │   ├── game/                        ← NEW
│               │   │   ├── online-session.svelte.ts ← NEW (OnlineGameSession — composes GameSession)
│               │   │   ├── messages.ts              ← NEW (GameMessage union type + send/receive helpers)
│               │   │   ├── lag-tracker.ts           ← NEW (lag estimation + quota system)
│               │   │   ├── lag-tracker.test.ts      ← NEW
│               │   │   └── online-session.test.ts   ← NEW
│               │   ├── friends/                     ← NEW
│               │   │   ├── queries.ts               ← NEW (friendship CRUD)
│               │   │   └── types.ts                 ← NEW
│               │   └── feedback/                    ← NEW
│               │       └── submit.ts                ← NEW (feedback submission)
│               └── routes/
│                   ├── +layout.svelte
│                   ├── +layout.server.ts            ← NEW (session → all pages)
│                   ├── +page.svelte                 (update: add auth-aware UI)
│                   ├── +error.svelte
│                   ├── auth/                        ← NEW
│                   │   ├── login/                   ← NEW
│                   │   │   └── +page.svelte         ← NEW
│                   │   ├── register/                ← NEW
│                   │   │   └── +page.svelte         ← NEW
│                   │   ├── forgot-password/         ← NEW
│                   │   │   └── +page.svelte         ← NEW
│                   │   ├── reset-password/          ← NEW
│                   │   │   └── +page.svelte         ← NEW
│                   │   └── callback/                ← NEW
│                   │       └── +server.ts           ← NEW (auth callback handler)
│                   ├── user/                        ← NEW
│                   │   ├── +layout.server.ts        ← NEW (auth guard for /user/*)
│                   │   ├── profile/                 ← NEW
│                   │   │   ├── +page.svelte         ← NEW (own profile)
│                   │   │   └── [username]/           ← NEW
│                   │   │       └── +page.svelte     ← NEW (view other profile)
│                   │   ├── settings/                ← NEW
│                   │   │   └── +page.svelte         ← NEW
│                   │   ├── friends/                 ← NEW
│                   │   │   └── +page.svelte         ← NEW
│                   │   └── history/                 ← NEW
│                   │       ├── +page.svelte         ← NEW (game list)
│                   │       └── [gameId]/            ← NEW
│                   │           └── +page.svelte     ← NEW (PGN replay)
│                   ├── play/
│                   │   ├── +page.svelte
│                   │   ├── +page.ts
│                   │   ├── PlayDesktop.svelte
│                   │   ├── PlayMobile.svelte
│                   │   └── online/                  ← NEW
│                   │       ├── +page.svelte         ← NEW (lobby/invite)
│                   │       ├── invite/              ← NEW
│                   │       │   └── [code]/          ← NEW
│                   │       │       └── +page.svelte ← NEW (invite link landing)
│                   │       └── [gameId]/            ← NEW
│                   │           └── +page.svelte     ← NEW (active online game)
│                   ├── learn/
│                   ├── board-editor/
│                   ├── puzzles/
│                   └── report-issue/
├── packages/
│   └── cotulenh/
│       ├── board/
│       ├── combine-piece/
│       ├── common/
│       ├── core/
│       └── learn/
├── supabase/                              ← NEW
│   ├── config.toml                        ← NEW (Supabase local dev config)
│   └── migrations/                        ← NEW
│       ├── 001_profiles.sql               ← NEW
│       ├── 002_friendships.sql            ← NEW
│       ├── 003_games.sql                  ← NEW
│       ├── 004_game_invitations.sql       ← NEW
│       ├── 005_disputes.sql               ← NEW
│       ├── 006_learn_progress.sql         ← NEW
│       └── 007_feedback.sql               ← NEW
└── docs/
```

### Requirements to Structure Mapping

| FR Category                       | Routes                                        | Lib Modules                                       | DB Tables           |
| --------------------------------- | --------------------------------------------- | ------------------------------------------------- | ------------------- |
| Authentication (FR1-6)            | `/auth/*`                                     | `$lib/supabase/`, `$lib/auth/`, `hooks.server.ts` | `profiles`          |
| User Profiles (FR7-11)            | `/user/profile/*`, `/user/settings`           | `$lib/supabase/`                                  | `profiles`          |
| Friend System (FR12-17)           | `/user/friends`                               | `$lib/friends/`                                   | `friendships`       |
| Match Invitations (FR18-24)       | `/play/online`, `/play/online/invite/[code]`  | `$lib/game/messages.ts`                           | `game_invitations`  |
| Online Gameplay (FR25-34)         | `/play/online/[gameId]`                       | `$lib/game/online-session.svelte.ts`              | `games`, `disputes` |
| Game History & Replay (FR35-37)   | `/user/history/*`, `/user/profile/[username]` | existing `@cotulenh/core` PGN                     | `games`             |
| Learn Progress Sync (FR38-42)     | existing `/learn/*`                           | `$lib/learn/learn-progress.svelte.ts` (update)    | `learn_progress`    |
| Feedback System (FR43-45)         | any page (button in layout)                   | `$lib/feedback/`                                  | `feedback`          |
| Platform Infrastructure (FR46-48) | root layout, `hooks.server.ts`                | `$lib/supabase/`, `$lib/i18n/`                    | —                   |

### Architectural Boundaries

**Client ↔ Supabase boundary:**

- All Supabase calls go through `$lib/supabase/client.ts` (browser) or `$lib/supabase/server.ts` (SSR)
- No direct Supabase imports in components or routes — always through lib modules

**Existing packages boundary (unchanged):**

- `@cotulenh/core` — game logic only, no network awareness
- `@cotulenh/board` — UI only, receives config from app layer
- `@cotulenh/learn` — learning content/logic, no persistence awareness
- App layer coordinates between packages and Supabase

**Online game data flow:**

```
Player A board → App (core.move(SAN)) → Broadcast → Player B App (core.move(SAN)) → Board
                                      ↓
                              Game completion → Supabase INSERT (PGN)
```

**Auth data flow:**

```
Request → hooks.server.ts (validate cookie) → event.locals.user
       → +layout.server.ts (pass to pages) → all components via $page.data
```

## Architecture Validation Results

### Coherence Validation

**Decision compatibility:** All technology choices are compatible. Supabase + SvelteKit + Vercel is a well-documented stack. `@supabase/ssr` provides the official integration pattern. Broadcast + Presence coexist on the same channel. No version conflicts.

**Pattern consistency:** Naming conventions (snake_case DB, camelCase TS, PascalCase components) are consistent with existing codebase and Supabase conventions. The typed `GameMessage` union enforces consistent broadcast communication.

**Structure alignment:** Project structure maps 1:1 to architectural decisions. Each FR category has a clear home in routes + lib modules + DB tables.

### Requirements Coverage

**All 48 FRs are architecturally supported.** Key coverage through validation fixes:

- FR5 (password reset): Added `/auth/forgot-password` and `/auth/reset-password` routes
- FR9 (public game history): Games table RLS updated to allow public reads of completed games; public profile page includes game history
- FR11 (settings persistence): Added `settings_json` column to `profiles` table
- FR22 (invite link flow): Added `/play/online/invite/[code]` route
- FR32 (clock sync): Defined `clock` semantics — sender's remaining ms, synced on each move
- NFR15 (reconnect recovery): Added `sync` message type to `GameMessage` union for state recovery on reconnect

**All 18 NFRs are addressed:**

- Performance NFRs (NFR1-2, NFR4, NFR6-7): Rely on SvelteKit defaults (code splitting, tree shaking, lazy route loading). No custom optimization needed for MVP scale. Revisit if performance testing reveals issues.
- Security NFRs (NFR8-13): Supabase handles encryption, password hashing, cookie sessions. RLS defined for all 7 tables. XSS mitigated by Svelte auto-escaping + Zod input validation on user-generated content (display names, feedback).
- Reliability NFRs (NFR14-18): PGN saved on completion, `sync` message for reconnect recovery, learn_progress uses upsert semantics (`ON CONFLICT DO UPDATE`), Supabase client handles auto-reconnect with built-in backoff.

### Gap Resolutions Applied

| Gap                                 | Resolution                                                   |
| ----------------------------------- | ------------------------------------------------------------ |
| Missing password reset routes (FR5) | Added `/auth/forgot-password` and `/auth/reset-password`     |
| No invite link landing (FR22)       | Added `/play/online/invite/[code]` public route              |
| Public game history blocked (FR9)   | Updated `games` RLS to allow public reads of completed games |
| Settings not persisted to DB (FR11) | Added `settings_json jsonb` to `profiles` table              |
| No reconnect state recovery (NFR15) | Added `sync` event to `GameMessage` type                     |
| Clock sync undefined (FR32)         | Defined `clock` = sender's remaining ms, synced per move     |
| Missing RLS for 2 tables            | Added RLS policies for `game_invitations` and `disputes`     |
| FR mapping numbers off-by-one       | Corrected all FR ranges in mapping table                     |

### Items Deferred to Implementation

These are low-priority gaps that are best resolved during story implementation:

- `disputes.classification` enum values (bug/cheat)
- `game_config` JSON schema for time controls
- `context_json` shape for feedback context
- Subject unlock state derivation from `learn_progress`

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context analyzed (48 FRs, 18 NFRs, brownfield constraints)
- [x] Scale and complexity assessed (medium, solo dev, MVP)
- [x] Technical constraints identified (existing packages unchanged, Supabase locked)
- [x] Cross-cutting concerns mapped (auth, realtime, i18n, errors, mobile, connectivity)

**Architectural Decisions**

- [x] Data architecture: flat tables, app-layer logic, Supabase CLI migrations
- [x] Auth & security: hook-based validation, layout guards, RLS on all tables
- [x] API & communication: dual Supabase clients, typed broadcast messages, Postgres Changes for invitations
- [x] Frontend: grouped routes, page-level state with Svelte 5 runes
- [x] Infrastructure: Vercel auto-deploy, Supabase dashboard monitoring

**Implementation Patterns**

- [x] Naming conventions: DB, code, channels all defined
- [x] Structure patterns: file organization, test co-location, import order
- [x] Communication patterns: `GameMessage` discriminated union with `sync`
- [x] Process patterns: error handling, loading states, auth flow

**Project Structure**

- [x] Complete directory tree with all new files marked
- [x] All 48 FRs mapped to specific routes, lib modules, and DB tables
- [x] Architectural boundaries defined (client↔Supabase, package boundaries, data flows)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — well-constrained brownfield project with clear technology choices and existing patterns to follow.

**Key Strengths:**

- Leverages existing `@cotulenh/core` PGN/SAN capabilities with zero changes to existing packages
- Trust-based client model with typed message system minimizes server complexity
- Supabase handles auth, database, and realtime — minimal custom infrastructure
- Existing codebase conventions (Svelte 5 runes, bits-ui, i18n) provide clear patterns for new features

**Lichess-Informed Enhancements (applied in review):**

- Game lifecycle states with explicit `status`/`winner` columns and optimistic concurrency for result writes
- Move reliability via `seq` counter + `ack` messages with 3s retry
- Lag compensation with quota-based system (`sentAt` timestamp, 500ms max quota, 100ms regeneration per move)
- Claim Victory button (not auto-forfeit) for timeout wins
- NoStart timeout (30s for first move, else abort)
- Draw offer + timeout interaction rule (pending draw offer + flag = draw)
- Background tab clock handling via `visibilitychange` + `Date.now()` delta
- Rematch flow via `GameMessage` events

**Areas for Future Enhancement:**

- Server-side game validation (automated dispute resolution) when user base grows
- Matchmaking queue for public games (beyond friend invitations)
- Playban system for serial aborters/rage-quitters (Lichess-style escalating bans)
- Advanced lag compensation refinements (running average, deviation-based estimation)
- Automated Supabase migration pipeline in CI/CD
