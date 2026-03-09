---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report-2026-03-08.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-05-1309.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-06-1200.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-09'
project_name: 'cotulenh-monorepo'
user_name: 'Noy'
date: '2026-03-08'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

38 FRs across 7 domains. The architectural weight concentrates in three areas:

1. **Realtime gameplay (FR6–12, FR31–32)** — The core product. Deploy phase with simultaneous placement, alternating turns with sub-second sync, clock management, resign/draw/takeback, rematch. Disconnection recovery with server-side clock pausing and 60-second forfeit window. This is a distributed state machine problem.

2. **Learn system as acquisition funnel (FR1–5)** — Architecturally separate from gameplay. No auth, SSR-rendered for SEO, localStorage progress, invisible migration to authenticated account. Interactive board in a non-realtime context (lessons use cotulenh-board but not Supabase Realtime).

3. **Social + matchmaking layer (FR13–17, FR22–27)** — Invite links with auto-friend, open lobby with live challenge updates, friend challenges, online presence. All depend on Supabase Realtime Postgres Changes and auth state.

**AI and competition (FR37–38)** add two distinct subsystems: client-side AI (engine reuse, no server) and arena tournaments (server-side pairing, live standings, time-bounded events).

**Non-Functional Requirements:**

25 NFRs. The architecture-critical ones cluster into:

- **Performance envelope:** <500ms move sync (NFR1), <3s TTI on 4G (NFR2), <200KB JS gzipped (NFR4), <500ms board render (NFR5). Demands code splitting, lazy loading, system fonts, skeleton screens.
- **Reliability contract:** 99.9% game state recovery (NFR8), atomic rating updates (NFR11), <1% platform-caused failures (NFR12). Demands server-side persistence, Edge Function transactions, reconnection re-fetch.
- **Security boundary:** Server-side move validation (NFR17), RLS for data access (NFR16), rate-limited auth (NFR18). The game engine must run in Edge Functions — the single highest integration risk.
- **Scale guardrails:** 500 concurrent users without rewrite (NFR24). DB ops per game: 2 per move (1 read + 1 write for server-side validation via `game_states`) + lifecycle events (create, deploy commit, game end). For a 40-move game: ~85 DB ops. NFR25's original "<10 DB ops" target is superseded by the security requirement of NFR17 (server-side validation). The ops are lightweight single-row reads/writes on a primary-key-indexed table.

**Scale & Complexity:**

- Primary domain: Full-stack web — realtime multiplayer gaming platform
- Complexity level: Medium-High
- Estimated architectural components: ~12 major (auth, game engine, realtime layer, learn system, rating system, AI, tournaments, lobby, profiles, friends, leaderboard, navigation shell)

### Technical Constraints & Dependencies

- **Carried packages:** `cotulenh-core` (pure TS game engine) and `cotulenh-board` (vanilla TS board UI) used as-is from existing monorepo. Board mounts via React ref. Engine runs client-side and must also run in Supabase Edge Functions (Deno runtime).
- **Supabase free tier:** Constrains DB size, Edge Function invocations, Realtime connections. Architecture must minimize server-side operations — Broadcast for moves (ephemeral, no DB), DB writes only for game lifecycle.
- **Solo developer:** No custom admin UI. Moderation via Supabase dashboard + Discord. Architecture must favor managed services and convention over configuration.
- **Monorepo:** Next.js 15 app alongside existing packages. Shared TypeScript. Vercel deployment from main branch.
- **Vietnamese-only MVP:** All strings hardcoded in Vietnamese. No i18n infrastructure. Architecture must not preclude future next-intl integration.

### Cross-Cutting Concerns Identified

1. **Authentication state propagation** — Anonymous (learn system) → authenticated (gameplay). Supabase Auth with SSR helpers. Session state drives navigation, RLS policies, and feature access. Learn progress migration on signup.

2. **Realtime subscription lifecycle** — Single WebSocket, multiple channels (game, lobby, presence). Must handle subscribe/unsubscribe on route changes, reconnection with state re-fetch, and cleanup on unmount. Central subscription management needed.

3. **Game state machine** — Client lifecycle phases: `idle` → `deploying` → `playing` → `ended`. DB outcome statuses: `started` (active), then one of `checkmate`, `resign`, `draw`, `timeout`, `stalemate`, `aborted`, `dispute` (terminal). Phase transitions driven by both client actions and server events. Server is source of truth. Client is optimistic with rollback.

4. **Board integration pattern** — `cotulenh-board` is vanilla TS mounted via React ref. Must bridge React state (Zustand) ↔ board events. Same pattern for learn lessons (non-realtime) and live games (realtime). Board component is a controlled imperative instance, not a React component.

**Important distinction — lifecycle phase vs outcome status:**
- **Client-side `phase`** (Zustand store): `'idle' | 'deploying' | 'playing' | 'ended'` — tracks the current game lifecycle for UI rendering.
- **DB `games.status`** (existing migration 004): `'started' | 'aborted' | 'checkmate' | 'resign' | 'timeout' | 'stalemate' | 'draw' | 'dispute'` — records the final outcome. Written once when the game ends. `'started'` maps to the active game (covers both deploy and play phases on the client).
- These are two distinct concepts. The store `phase` drives UI state; the DB `status` is the permanent record.

5. **Responsive layout contract** — Board-centric layout must never resize the board when panel content changes. Desktop: sidebar (48px) + board + right panel (280–320px). Mobile: bottom bar (56px) + full-width board + tabs below. Single breakpoint at 1024px for nav switch.

6. **Accessibility throughout** — WCAG 2.1 AA. Board squares focusable with aria-labels. ARIA live regions for game state changes. Keyboard navigation. `prefers-reduced-motion`. Must be built into components from the start, not retrofitted.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (Next.js 15) within an existing TypeScript monorepo (pnpm + Turborepo). The new app replaces the current SvelteKit app at `apps/cotulenh/app`.

### Existing Monorepo Context

The monorepo already provides:
- **Build orchestration:** Turborepo with pnpm workspaces (`apps/cotulenh/*`, `packages/cotulenh/*`)
- **Carried packages:** `core` (game engine), `board` (board UI), `learn` (lesson data), `common` (shared utils), `combine-piece`
- **Tooling:** Prettier, Husky, ESLint (existing configs)
- **Current app:** SvelteKit at `apps/cotulenh/app` — to be replaced

### Starter Options Considered

| Option | Fit | Verdict |
|--------|-----|---------|
| `create-next-app` (vanilla) | Excellent — monorepo-native, zero bloat | **Selected** |
| Supabase `with-supabase` template | Moderate — standalone-oriented, auth-only value | Rejected |
| Community starters (Nextbase, Makerkit) | Poor — SaaS-oriented, over-scoped | Rejected |

### Selected Starter: `create-next-app` (vanilla)

**Rationale for Selection:**
- Cleanest integration into existing pnpm + Turborepo monorepo
- No SaaS bloat or assumptions incompatible with a game platform
- Supabase Realtime Broadcast, Edge Functions, and game-specific patterns aren't in any starter — must be built from scratch regardless
- Supabase auth cookie setup via `@supabase/ssr` is minimal code (~30 lines)
- shadcn/ui initialization is a single command post-creation
- Maximum control over project structure for game-specific needs

**Initialization Command:**

```bash
npx create-next-app@latest apps/cotulenh/web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

**Post-initialization setup:**

```bash
cd apps/cotulenh/web
npx shadcn@latest init
pnpm add @supabase/ssr @supabase/supabase-js zustand
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript 5, React 19, Next.js 15 App Router, Node.js 20+

**Styling Solution:**
Tailwind CSS 4 with PostCSS, `globals.css` with Tailwind directives. shadcn/ui added post-init for component primitives.

**Build Tooling:**
Turbopack (dev), Webpack (production), integrated with Turborepo at monorepo level.

**Testing Framework:**
Not included by starter — to be decided in architecture (likely Vitest for unit, Playwright for E2E, consistent with existing SvelteKit app patterns).

**Code Organization:**
`src/` directory with App Router conventions (`app/`, `components/`, `lib/`). Monorepo imports via workspace protocol (`@cotulenh/core`, `@cotulenh/board`, etc.).

**Development Experience:**
Hot reloading via Turbopack, TypeScript strict mode, ESLint with Next.js rules, Prettier from monorepo root.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Realtime communication pattern (Broadcast vs Postgres Changes split)
- Edge Function role (move validation, ratings, tournament pairing)
- Auth integration pattern (middleware + RLS)
- Board integration pattern (React ref + useBoard hook)
- Zustand store architecture (per-domain stores)

**Important Decisions (Shape Architecture):**
- Server Actions for mutations (no REST/GraphQL layer)
- Route group structure (public/auth/app)
- Code splitting strategy (dynamic import for engine/board)
- Testing stack (Vitest + Playwright)
- Error handling pattern (return objects, not thrown exceptions)

**Deferred Decisions (Post-MVP):**
- External monitoring (Sentry, Datadog)
- Redis/external caching
- i18n architecture (next-intl)
- Quick Play matchmaking queue design
- In-game chat infrastructure

### Data Architecture

**Database:** Supabase PostgreSQL (managed, free tier)

**Schema Domains:**

Existing tables (from migrations 001–010) are marked ✅. New tables to be created are marked 🆕.

| Table | Status | Purpose | Realtime |
|-------|--------|---------|----------|
| `profiles` | ✅ 001 | Display name, avatar, join date | No |
| `friendships` | ✅ 002 | Bidirectional relationships | Postgres Changes (presence) |
| `game_invitations` | ✅ 003 | Friend challenges + open lobby (with `invite_code`) | Postgres Changes (live lobby) |
| `games` | ✅ 004 | Game lifecycle, result, metadata. Status enum: `started`, `aborted`, `checkmate`, `resign`, `timeout`, `stalemate`, `draw`, `dispute` | Postgres Changes (status) |
| `shareable_invite_links` | ✅ 005 | Invite link → auto-friend flow | No |
| `disputes` | ✅ 007 | Move dispute reports (classification: `bug`/`cheat`). Admin resolves via Supabase dashboard. Maps to FR33 (moderation visibility). | No |
| `learn_progress` | ✅ 009 | Migrated from localStorage on signup | No |
| `feedback` | ✅ 010 | In-app user feedback (auth + anon). Admin reads via dashboard. Maps to FR36. | No |
| `game_states` | 🆕 | Server-side game state snapshots for reconnection + move validation | No (read on reconnect/validate) |
| `ratings` | 🆕 | Glicko-2 rating per player per time control | No |
| `tournaments` | 🆕 | Tournament metadata, standings, pairings | Postgres Changes (standings) |

**`game_states` table definition (new):**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `game_id` | uuid FK → games | One-to-one with active game |
| `move_history` | text[] | Ordered SAN strings — authoritative move record |
| `fen` | text | Current board FEN (derived from move replay, cached for fast reads) |
| `deploy_state` | jsonb | Deploy session state per player (null after deploy phase) |
| `phase` | text | `'deploying' \| 'playing'` — current lifecycle phase |
| `clocks` | jsonb | `{ red: number, blue: number }` — remaining ms per player |
| `updated_at` | timestamptz | Last write timestamp |

Written on every validated move (via validate-move Edge Function) and at lifecycle boundaries (game creation, deploy commit, game end, disconnect recovery snapshot).

**Atomicity rule:** The `games` row and its corresponding `game_states` row MUST be created in the same database transaction (via `supabase.rpc()` or a Server Action wrapping both INSERTs). A game without a `game_states` row will cause validate-move to fail on the first move.

**Note on naming:** The PRD uses "challenges" generically. The existing DB table is `game_invitations` — architecture uses `game_invitations` throughout. The `challenges` concept in the lobby is implemented as `game_invitations` with `to_user = null` (open) or with a specific `to_user` (friend challenge).

**Validation:** Zod for runtime validation on client (form inputs, Realtime payloads, API responses). TypeScript types generated from Supabase schema for compile-time safety.

**Migrations:** Supabase CLI (`supabase/migrations/`). Applied via `supabase db push` or CI.

**Caching:** No external cache for MVP. Next.js route cache for static pages. Supabase client connection pooling. Game moves are ephemeral (Broadcast) — nothing to cache in the hot path.

### Authentication & Security

**Auth Provider:** Supabase Auth — email/password for MVP. Cookie-based sessions via `@supabase/ssr`.

**Middleware:** Next.js Middleware refreshes auth tokens on every request. Routes:
- Public (no auth): `/`, `/learn/*`, `/invite/*`
- Auth pages: `/login`, `/signup`, `/reset-password`
- Protected (redirect to login): `/play`, `/game/*`, `/friends`, `/settings`, `/tournament/*`, `/@*`, `/leaderboard`

**Authorization (dual model):**
- **Client-initiated queries:** RLS is the authorization layer. Every Supabase query from browser or Server Components runs through RLS policies. No application-level permission checks.
- **Edge Functions (service role):** Bypass RLS for atomic server-mediated operations (move validation + state write, rating updates, tournament pairing). These are the ONLY code paths that use service role. Each Edge Function enforces its own authorization by verifying the JWT from the request header and checking that the caller is a participant in the relevant game/tournament.

**Edge Functions (trusted operations):** Run with service role key for atomic server-mediated operations. RLS protects all client-initiated queries; service role is used only in these controlled, auditable Edge Functions:
- **Move validation** — receives `game_id` + proposed move (SAN string). Reads `game_states.move_history` from DB, replays all moves from `DEFAULT_POSITION` using `CoTuLenh` engine to reconstruct authoritative state, validates the proposed move. On success: appends to `move_history`, updates `fen`, broadcasts confirmed move. This is 1 DB read + 1 DB write per move — acceptable because the replay is in-memory and the DB ops are lightweight single-row updates.
- **Game completion (complete-game)** — Atomic transaction: writes `games.status` + `games.winner` + both players' `ratings` updates in a single PostgreSQL transaction (via `supabase.rpc()` calling a DB function). If any step fails, entire transaction rolls back. Handles resign, checkmate, draw, timeout, forfeit.
- **Tournament pairing** — server decides matchups, handles odd player counts with bye assignment

**Security invariant:** The server NEVER trusts client-supplied game state. The authoritative move history lives in `game_states.move_history`. Every move is validated by server-side replay from the deterministic starting position. A malicious client cannot submit an illegal move because the Edge Function reconstructs the board independently.

**Concurrency invariant:** The validate-move Edge Function MUST use `SELECT ... FOR UPDATE` on the `game_states` row to acquire a row-level lock before reading `move_history`. This serializes concurrent move validations for the same game. The lock is released at transaction commit. Without this, two simultaneous moves could both validate against the same state and both be appended, producing an illegal sequence.

**Pre-validation guards (all Edge Functions):**
- **Game status check:** verify `games.status = 'started'` before processing. Return `{ error: 'game_ended', code: 'GAME_ENDED' }` with HTTP 409 if not.
- **Turn enforcement (validate-move):** after replaying `move_history`, verify the current turn matches the caller's color (JWT `sub` against `games.red_player`/`blue_player`). Return `{ error: 'not_your_turn', code: 'WRONG_TURN' }` with HTTP 403 if mismatched.
- **Phase enforcement (validate-move):** check `game_states.phase`. During `'deploying'`, only deploy submissions accepted. During `'playing'`, only regular moves. Return `{ error: 'wrong_phase', code: 'PHASE_MISMATCH' }` with HTTP 400 if mismatched.

**Rate Limiting:** Supabase Auth handles auth endpoint throttling natively (NFR18). Game actions rate-limited by game state logic (can't move out of turn) rather than IP-based throttling.

**Broadcast Channel Authorization:** Supabase Realtime requires an authenticated client (anon key + valid JWT). For game channels (`game:{gameId}`), the validate-move Edge Function enforces that the caller is a participant (checks JWT `sub` against `games.red_player` / `games.blue_player`). Clients cannot submit moves for games they are not in. Supabase Realtime channel authorization policies (RLS for Realtime) should be configured to restrict Broadcast send/receive on `game:*` channels to the two game participants. For the `online` Presence channel, all authenticated users can join.

### API & Communication Patterns

**No custom REST API routes. No GraphQL.** Four communication patterns cover all needs (Edge Functions serve as a lightweight server API for trusted operations):

**1. Server Actions (mutations):**
Create challenge, accept challenge, send friend request, update profile, update settings. Next.js Server Actions with authenticated Supabase server client. Return `{ success, data?, error? }` — no thrown exceptions.

**2. Supabase Realtime — Broadcast (ephemeral):**
Server-confirmed game moves, deploy reveals, clock sync. Broadcast is ephemeral (no Supabase DB write from Broadcast itself) — the DB write happens in the Edge Function before broadcasting. Sub-500ms latency. The hot path. Channel per game: `game:{gameId}`.

**3. Supabase Realtime — Postgres Changes (live data):**
Lobby game_invitations list, tournament standings updates. DB-backed subscriptions. Slightly higher latency, acceptable for non-gameplay data. Friend online presence uses Supabase Presence (see channel naming above), not Postgres Changes.

**4. Edge Functions (authoritative server API):**
Move validation, rating calculation, tournament pairing, game result recording. Called via `supabase.functions.invoke('function-name', { body: { ... } })`. Auth token is automatically passed in the `Authorization` header by the Supabase client. Each function verifies the JWT and checks caller authorization. Structured error responses with HTTP status codes.

**Error Handling:**
- Server Actions: return `{ success: false, error: string }` — UI displays inline
- Realtime: optimistic UI with rollback on server rejection
- Edge Functions: structured error responses → client shows Vietnamese inline messages
- Toasts: non-blocking confirmations (3s auto-dismiss). Actionable toasts persist.

### Frontend Architecture

**Component Architecture:**
- shadcn/ui for standard UI primitives (Dialog, Tabs, Tooltip, Table, Card, etc.)
- Custom game components built with Tailwind (ChessClock, MoveList, PlayerInfoBar, DeployCounter, GameResultBanner, DisconnectBanner, etc.)
- Board via `useBoard` hook — mounts `cotulenh-board` into container ref, bridges events ↔ Zustand

**Zustand Store Architecture:**

| Store | Responsibility | Realtime Source |
|-------|---------------|-----------------|
| `useAuthStore` | Session, profile, online status | None (SSR + middleware) |
| `useGameStore` | Game state machine, position, clocks, moves | Broadcast channel |
| `useLobbyStore` | Open game_invitations, active games | Postgres Changes (game_invitations) |
| `useLearnStore` | Lesson state, progress, localStorage sync | None (local) |
| `useFriendsStore` | Friend list, presence, pending requests | Postgres Changes (friendships) + Presence channel (online status) |
| `useTournamentStore` | Tournament state, standings, round | Postgres Changes |

Stores are independent. Each subscribes to its relevant Realtime channel and cleans up on unmount.

**Code Splitting (NFR4: <200KB gzipped per route):**

The 200KB target is per-route initial JS load, not total application size. Framework overhead (React ~40KB, Next.js runtime ~80-100KB, Supabase client ~40-60KB) is shared across routes and largely unavoidable. The target must be validated during project initialization with `next build` + bundle analyzer. If framework overhead alone exceeds 200KB, the NFR should be revised to a per-route application JS budget (excluding shared framework chunks).

- `cotulenh-core` + `cotulenh-board`: dynamic import on `/game/*` and `/learn/*` routes only — these are the largest application-level chunks and MUST NOT be in the shared bundle
- Landing + auth: minimal JS, SSR-heavy — target <50KB application JS
- Dashboard, lobby, profile: standard Next.js route-based splitting
- AI engine: same dynamic import path, client-side only
- shadcn/ui: tree-shaken — only imported components are bundled per route

**Route Structure:**

```
src/app/
  (public)/                → no auth required
    page.tsx               → landing (unauth) / redirect to dashboard (auth)
    learn/                 → learn hub + lessons
    invite/[code]/         → invite landing
  (auth)/                  → centered form layout
    login/
    signup/
    reset-password/
  (app)/                   → sidebar/bottom bar layout, auth required
    dashboard/             → home command center
    play/                  → lobby
    game/[id]/             → live game / review
    game/ai/               → AI game
    tournament/            → tournament lobby + details
    profile/[username]/    → public profile (middleware rewrites /@username)
    friends/               → friends management
    leaderboard/           → activity leaderboard
    settings/              → user settings
```

Route groups share layouts: `(app)` gets sidebar/bottom bar, `(public)` gets minimal nav, `(auth)` gets centered form.

### Infrastructure & Deployment

**Deployment:**
- Vercel — auto-deploy from `main`. Preview deploys on PRs. Next.js-native.
- Supabase — hosted free tier. Migrations via `supabase db push`. Edge Functions via `supabase functions deploy`.

**CI/CD:**
- GitHub Actions — lint, type-check, test on PR. Turborepo caching.
- Vercel — CD on merge to main.
- Supabase CLI — migrations and Edge Function deployment post-merge.

**Deployment ordering (mandatory):** 1) Apply DB migrations (`supabase db push`), 2) Deploy Edge Functions (`supabase functions deploy`), 3) Deploy Next.js app (Vercel auto-deploy). Edge Functions may reference new columns/tables from migrations; the app may reference new Edge Functions. Reversing this order causes runtime failures. CI/CD pipeline MUST enforce this sequence.

**Environment:**
- `.env.local` for development (Supabase URL, anon key, service role key)
- Vercel environment variables for production
- Anon key is public (RLS protects data). Service role key only in Edge Functions and Server Actions.

**Testing:**
- Vitest — unit tests for engine logic, store logic, utilities
- Playwright — E2E for critical journeys (signup, game, learn)
- No separate integration layer for MVP

**Monitoring (MVP):**
- Vercel Analytics — Core Web Vitals, route performance (free)
- Supabase Dashboard — Edge Function logs, DB metrics, Realtime connections
- No external monitoring for MVP

### Decision Impact Analysis

**Implementation Sequence:**
1. Project initialization (create-next-app + shadcn + Supabase setup)
2. Auth integration (Supabase Auth, middleware, RLS foundations)
3. Database schema + migrations (core tables, RLS policies)
4. Navigation shell + layouts (route groups, sidebar, bottom bar)
5. Learn system (SSR, board integration, localStorage progress)
6. Game engine integration (useBoard hook, Zustand game store)
7. Realtime layer (Broadcast for moves, Edge Function for validation)
8. Lobby + challenges (Postgres Changes, Server Actions)
9. Social features (friends, invites, presence)
10. Rating system (Glicko-2 Edge Function)
11. AI opponent (client-side engine)
12. Arena tournaments (pairing Edge Function, live standings)

**Cross-Component Dependencies:**
- Auth → everything behind `(app)` routes
- Board integration → game, learn, review (shared `useBoard` hook)
- Realtime layer → game, lobby, friends, tournaments (channel management)
- Edge Functions → move validation, ratings, tournaments (trusted server logic)
- Zustand stores → each domain independent, but game store depends on Realtime + board bridge

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 6 areas where AI agents could make different choices — naming, structure, formats, communication, state management, and process patterns.

### Naming Patterns

**Database Naming Conventions:**

| Element | Convention | Example |
|---------|-----------|---------|
| Tables | snake_case, plural | `games`, `game_states`, `learn_progress` |
| Columns | snake_case | `created_at`, `player_id`, `is_rated` |
| Enums | snake_case values | `'waiting' \| 'deploying' \| 'playing' \| 'ended'` |
| Foreign keys | `{referenced_table_singular}_id` | `player_id`, `game_id` |
| Indexes | `idx_{table}_{columns}` | `idx_games_status`, `idx_ratings_player_id` |

**Code Naming Conventions:**

| Element | Convention | Example |
|---------|-----------|---------|
| TS types/interfaces | PascalCase | `Game`, `GameState`, `PlayerProfile` |
| Zustand stores | `use` + PascalCase + `Store` | `useGameStore`, `useLobbyStore` |
| Store actions | camelCase verbs | `makeMove`, `submitDeploy`, `acceptChallenge` |
| React components | PascalCase | `ChessClock`, `MoveList`, `PlayerInfoBar` |
| Component files | kebab-case `.tsx` | `chess-clock.tsx`, `move-list.tsx` |
| Hooks | `use` + camelCase | `useBoard`, `useRealtimeChannel` |
| Server Actions | camelCase verbs | `createChallenge`, `acceptFriendRequest` |
| Server Action files | kebab-case `.ts` | `create-challenge.ts`, `accept-friend.ts` |
| Route params | kebab-case | `/game/[id]`, `/invite/[code]` |
| CSS tokens | `--` prefix, kebab-case | `--color-primary`, `--space-4` |
| Env vars | SCREAMING_SNAKE | `NEXT_PUBLIC_SUPABASE_URL` |

### Structure Patterns

**Project Organization:**

```
src/
  app/                    → Next.js routes only (page.tsx, layout.tsx, loading.tsx)
  components/
    ui/                   → shadcn/ui primitives (button.tsx, dialog.tsx)
    game/                 → game-specific (chess-clock.tsx, move-list.tsx)
    learn/                → learn-specific (lesson-board.tsx, hint-panel.tsx)
    layout/               → nav, sidebar, bottom-bar, shell
  hooks/                  → custom hooks (use-board.ts, use-realtime-channel.ts)
  stores/                 → Zustand stores (game-store.ts, lobby-store.ts)
  lib/
    supabase/             → client creation (browser.ts, server.ts, middleware.ts)
    actions/              → Server Actions grouped by domain (game.ts, social.ts)
    validators/           → Zod schemas (game.ts, auth.ts, challenge.ts)
    utils/                → pure utility functions
    types/                → shared TypeScript types + Supabase generated types
  constants/              → app-wide constants (game-config.ts, routes.ts)
```

**File Rules:**
- Tests co-located: `chess-clock.test.tsx` next to `chess-clock.tsx`
- No barrel exports (index.ts re-exports) — direct imports only
- One component per file (except tightly coupled pairs)

### Format Patterns

**Server Action Return Format:**

```ts
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
```

Every Server Action returns this shape. No thrown exceptions in the UI layer.

**Edge Function Response Format:**

```ts
// Success
{ data: T }
// Error
{ error: string, code: string }
```

With appropriate HTTP status codes (200, 400, 401, 403, 500).

**Date/Time Formats:**
- DB: `timestamptz` (PostgreSQL)
- JSON: ISO 8601 strings (`2026-03-09T12:00:00Z`)
- Display: formatted in Vietnamese locale on client only
- Clocks: milliseconds as numbers (not Date objects)

**JSON Field Naming:** snake_case everywhere. DB columns are snake_case (PostgreSQL convention). Supabase client returns snake_case. TypeScript interface properties match: `player_id`, `created_at`, `game_id` — not `playerId`, `createdAt`, `gameId`. No transformation layer. This is a firm decision to prevent interface mismatches between agents. The only camelCase in the codebase is function/method names, component names, and local variables — never object property names from DB-backed types.

### Communication Patterns

**Realtime Broadcast Events (game channel):**

```ts
type GameEvent =
  // Play phase — server-confirmed moves broadcast to both clients
  | { type: 'move'; payload: { san: string; fen: string } }
  // Deploy phase — server-confirmed deploy session broadcast after commitSession
  | { type: 'deploy_commit'; payload: { sans: string[]; fen: string } }
  // Deploy phase — signal that a player has submitted (don't reveal what)
  | { type: 'deploy_submitted'; payload: { color: 'r' | 'b' } }
  // Game actions
  | { type: 'resign' }
  | { type: 'draw_offer' }
  | { type: 'draw_accept' }
  | { type: 'takeback_request' }
  | { type: 'takeback_accept' }
  | { type: 'clock_sync'; payload: { red: number; blue: number } }
```

All Realtime events use `{ type, payload? }` discriminated union. `type` is snake_case. Move payloads use SAN strings (from `CoTuLenh.history()`) — compact, serializable, engine-canonical. Clients apply moves locally via `game.move(san)`.

**Event Ordering:** Every Broadcast event MUST include a monotonically increasing `seq` number. Clients track `last_seen_seq` and discard events with `seq <= last_seen_seq`. On gap detection (`seq > last_seen_seq + 1`), client triggers a full state re-fetch from `game_states` and replays the authoritative `move_history`.

**Offer Expiry:**
- `draw_offer` expires after 60 seconds or when the offering player makes their next move (whichever first). Server clears the pending offer state. Client clears the draw UI on expiry.
- `takeback_request` expires after 30 seconds or when either player makes a move (whichever first). Server tracks the `move_history.length` at request time; on accept, rejects if length has changed.
- Both use `draw_offer_expired` / `takeback_expired` events to notify the opponent client.

**Clock Sync Protocol:**
- The validate-move Edge Function broadcasts `clock_sync` with every confirmed `move` event (piggybacked — server calculates authoritative clock after deducting elapsed time).
- Clients run local countdown between syncs. Local clock is display-only; server clock is authoritative.
- On timeout claim: client sends `timeout_claim` to complete-game Edge Function. Server recalculates from `last_move_timestamp` + accumulated deltas. Confirms timeout only if server-side clock is also <= 0. Otherwise broadcasts a `clock_sync` correction.

**Deploy Phase Protocol:**

Deploy uses `@cotulenh/core`'s session-based deploy mechanism. The protocol:

1. Player calls `game.move({ from, to, deploy: true })` locally to build their deploy session. Multiple deploy moves accumulate in a `MoveSession`. Client shows live preview.
2. When satisfied, player calls `game.commitSession()` locally, then sends the committed SAN array to the validate-move Edge Function.
3. Edge Function validates the deploy sequence against the authoritative game state, stores it, and broadcasts `deploy_submitted` to the opponent (without revealing placement).
4. When both players have submitted valid deploys, Edge Function broadcasts `deploy_commit` to both with each other's deploy SANs. Game phase transitions to `playing`.
5. If a player cancels (`game.cancelSession()`), no server call — purely local undo.

**Realtime Channel Naming:**
- Game: `game:{gameId}` — Broadcast (moves, game actions)
- Lobby: `lobby` — Postgres Changes (game_invitations inserts/updates)
- Presence: `online` — single shared Supabase Presence channel. `useAuthStore` calls `track()` on app shell mount and `untrack()` on unmount. `useFriendsStore` reads the presence state and filters to show only friends. No per-user channels.
- Tournament: `tournament:{tournamentId}` — Postgres Changes (standings, pairings)

**Zustand Store Pattern:**

```ts
interface GameStore {
  // State (flat, no nested objects where possible)
  engine: CoTuLenh | null
  phase: 'idle' | 'deploying' | 'playing' | 'ended'
  moveHistory: string[]            // SAN strings — mirrors game_states.move_history
  clocks: { red: number; blue: number } | null

  // Actions (camelCase verbs — these call engine.move() internally)
  makeMove: (san: string) => void
  submitDeploy: (sans: string[]) => void
  resign: () => void
  offerDraw: () => void
  reset: () => void

  // Subscriptions (channel lifecycle)
  subscribe: (gameId: string) => void
  unsubscribe: () => void
}
```

State at top, actions in middle, subscription management at bottom. Store actions wrap `CoTuLenh` engine methods — `makeMove` calls `engine.move(san)`, `submitDeploy` calls `engine.commitSession()`. The `MoveResult` class from `@cotulenh/core` is the public move representation; SAN strings are used for serialization (Broadcast payloads, DB storage).

### Process Patterns

**Error Handling:**
- Server Actions: return `{ success: false, error }` — never throw
- Components: React Error Boundaries at route level (`error.tsx` per route group)
- Realtime: `onError` callback → toast in Vietnamese
- Edge Functions: return `{ error, code }` with HTTP status
- User-facing errors: always Vietnamese, inline next to relevant element

**Loading States:**
- Route-level: `loading.tsx` with skeleton screens (never spinners for page loads)
- Component-level: `isLoading` boolean in store → skeleton or disabled state
- Button-level: `isPending` from `useTransition` → spinner replaces button text
- Never global loading overlay

**Validation Timing:**
- Forms: validate on blur, re-validate on change after first error
- Realtime payloads: Zod parse on receive, discard invalid
- Server Actions: Zod parse at entry, return error if invalid
- Edge Functions: Zod parse request body, return 400 if invalid

**Disconnect & Forfeit:**
- The 60-second forfeit window MUST be tracked server-side. Client-side countdown is display-only.
- When a player's Realtime presence leaves the game channel, the server records `disconnect_at` in `game_states`.
- A Supabase cron job (or pg_cron) runs every 15 seconds checking `game_states` where `disconnect_at IS NOT NULL` and `now() - disconnect_at > 60 seconds`. For these games, it calls `complete-game` with status `'timeout'`.
- On reconnection, the player re-fetches `game_states`, clears `disconnect_at`, re-subscribes to Broadcast, and resumes. The `useGameStore` reconciliation flow: fetch `game_states` → set local `phase` → replay `move_history` from `DEFAULT_POSITION` → restore `clocks` → re-subscribe to channel.
- If both players disconnect, the cron job aborts the game after 60 seconds for whichever player disconnected first.

**Abandoned Game Cleanup:**
- A Supabase cron job checks `games` with `status = 'started'` and `updated_at` older than 24 hours. These are set to `status = 'aborted'` to prevent orphaned active games.

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow naming conventions exactly — no exceptions, no "improvements"
- Use the Server Action return format for all mutations
- Use discriminated union `{ type, payload? }` for all Realtime events
- Co-locate tests next to source files
- Use skeleton screens, never spinners for page/route loads
- Return errors, never throw in Server Actions or store actions
- Use `MoveResult` class and `InternalMove` type from `@cotulenh/core` — never redefine move structures. Use SAN strings for serialization (Broadcast, DB storage).

**Anti-Patterns to Avoid:**
- Creating REST API routes when a Server Action suffices
- Nested Zustand state objects (keep flat)
- Barrel exports / index.ts re-exports
- Global loading overlays or full-page spinners
- Thrown exceptions as control flow in Server Actions
- Redefining types that exist in `cotulenh-core`
- Adding i18n infrastructure or English strings (Vietnamese only for MVP)

## Project Structure & Boundaries

### Complete Project Directory Structure

```
cotulenh-monorepo/
├── package.json                          # Monorepo root (pnpm + Turborepo)
├── pnpm-workspace.yaml                   # Workspace: apps/cotulenh/*, packages/cotulenh/*
├── pnpm-lock.yaml
├── turbo.json                            # Turborepo pipeline config
├── .prettierrc                           # Shared Prettier config
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                        # Lint, type-check, test on PR
│
├── packages/cotulenh/
│   ├── core/                             # @cotulenh/core — game engine (carried as-is)
│   ├── board/                            # @cotulenh/board — board UI (carried as-is)
│   ├── learn/                            # @cotulenh/learn — lesson data & content
│   ├── common/                           # @cotulenh/common — shared utilities
│   └── combine-piece/                    # @cotulenh/combine-piece — piece combination
│
├── supabase/
│   ├── config.toml                       # Supabase project config
│   ├── migrations/                       # PostgreSQL schema migrations
│   │   ├── 001_profiles.sql
│   │   ├── 002_friendships.sql
│   │   ├── 003_game_invitations.sql
│   │   ├── 004_games.sql
│   │   ├── 005_shareable_invite_links.sql
│   │   ├── 006_create_or_accept_friendship.sql
│   │   ├── 007_disputes.sql
│   │   ├── 008_games_public_read.sql
│   │   ├── 009_learn_progress.sql
│   │   ├── 010_feedback.sql
│   │   └── ...                           # New migrations for ratings, tournaments, etc.
│   └── functions/                        # Edge Functions (Deno runtime)
│       ├── validate-move/
│       │   └── index.ts                  # Server-side move validation via @cotulenh/core
│       ├── complete-game/
│       │   └── index.ts                  # Game result + atomic Glicko-2 rating update
│       └── tournament-pair/
│           └── index.ts                  # Arena tournament auto-pairing logic
│
└── apps/cotulenh/
    └── web/                              # @cotulenh/app — Next.js 15 web application
        ├── package.json
        ├── next.config.ts
        ├── tailwind.config.ts
        ├── tsconfig.json
        ├── postcss.config.js
        ├── components.json               # shadcn/ui config
        ├── .env.local                    # NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, etc.
        ├── .env.example
        ├── public/
        │   └── og-image.png              # Open Graph image
        │
        ├── e2e/                          # Playwright E2E tests
        │   ├── playwright.config.ts
        │   ├── auth.spec.ts              # Signup, login, password reset flows
        │   ├── learn.spec.ts             # Learn system journey
        │   └── game.spec.ts              # Game creation, play, result flow
        │
        └── src/
            ├── middleware.ts              # Auth token refresh, route protection
            │
            ├── app/
            │   ├── globals.css           # Tailwind directives, CSS custom properties
            │   ├── layout.tsx            # Root layout (<html lang="vi">, providers)
            │   │
            │   ├── (public)/             # No auth required
            │   │   ├── layout.tsx        # Minimal nav (logo, learn, sign-in)
            │   │   ├── page.tsx          # Landing page (SSR) / redirect if auth'd
            │   │   ├── learn/
            │   │   │   ├── page.tsx      # Learn hub — subject grid, progress
            │   │   │   └── [subject]/
            │   │   │       └── [id]/
            │   │   │           └── page.tsx  # Lesson view (interactive board)
            │   │   └── invite/
            │   │       └── [code]/
            │   │           └── page.tsx  # Invite landing (SSR)
            │   │
            │   ├── (auth)/               # Centered form layout
            │   │   ├── layout.tsx
            │   │   ├── login/
            │   │   │   └── page.tsx
            │   │   ├── signup/
            │   │   │   └── page.tsx
            │   │   └── reset-password/
            │   │       └── page.tsx
            │   │
            │   └── (app)/                # Auth required — sidebar/bottom bar
            │       ├── layout.tsx        # App shell (sidebar desktop, bottom bar mobile)
            │       ├── dashboard/
            │       │   ├── page.tsx      # Home command center
            │       │   └── loading.tsx   # Skeleton
            │       ├── play/
            │       │   ├── page.tsx      # Lobby — create/browse challenges
            │       │   └── loading.tsx
            │       ├── game/
            │       │   ├── [id]/
            │       │   │   ├── page.tsx  # Live game / review
            │       │   │   ├── loading.tsx
            │       │   │   └── error.tsx
            │       │   └── ai/
            │       │       └── page.tsx  # AI game (client-side engine)
            │       ├── tournament/
            │       │   ├── page.tsx      # Tournament lobby
            │       │   └── [id]/
            │       │       └── page.tsx  # Tournament details / live standings
            │       ├── profile/
            │       │   └── [username]/
            │       │       └── page.tsx  # Public profile (middleware rewrites /@username)
            │       ├── friends/
            │       │   └── page.tsx      # Friends management
            │       ├── leaderboard/
            │       │   └── page.tsx      # Activity leaderboard
            │       └── settings/
            │           └── page.tsx      # User settings
            │
            ├── components/
            │   ├── ui/                   # shadcn/ui primitives (auto-generated)
            │   │   ├── button.tsx
            │   │   ├── dialog.tsx
            │   │   ├── tabs.tsx
            │   │   ├── tooltip.tsx
            │   │   ├── card.tsx
            │   │   ├── table.tsx
            │   │   ├── avatar.tsx
            │   │   ├── switch.tsx
            │   │   ├── separator.tsx
            │   │   ├── label.tsx
            │   │   ├── popover.tsx
            │   │   └── alert-dialog.tsx
            │   │
            │   ├── game/                 # Game-specific custom components
            │   │   ├── chess-clock.tsx
            │   │   ├── chess-clock.test.tsx
            │   │   ├── move-list.tsx
            │   │   ├── move-list.test.tsx
            │   │   ├── player-info-bar.tsx
            │   │   ├── deploy-progress-counter.tsx
            │   │   ├── game-result-banner.tsx
            │   │   ├── game-right-panel.tsx
            │   │   ├── disconnect-banner.tsx
            │   │   └── board-container.tsx    # React wrapper mounting cotulenh-board
            │   │
            │   ├── learn/                # Learn-specific components
            │   │   ├── lesson-board.tsx
            │   │   ├── hint-panel.tsx
            │   │   ├── progress-bar.tsx
            │   │   └── signup-prompt.tsx
            │   │
            │   ├── tournament/           # Tournament components
            │   │   ├── tournament-card.tsx
            │   │   └── tournament-standings.tsx
            │   │
            │   ├── social/               # Social & matchmaking components
            │   │   ├── friend-card.tsx
            │   │   ├── open-challenge-row.tsx
            │   │   ├── invite-landing-hero.tsx
            │   │   └── ai-difficulty-selector.tsx
            │   │
            │   ├── profile/              # Profile & rating components
            │   │   ├── rating-badge.tsx
            │   │   ├── rating-change-display.tsx
            │   │   ├── game-history-card.tsx
            │   │   └── activity-leaderboard-table.tsx
            │   │
            │   ├── layout/               # App shell components
            │   │   ├── sidebar.tsx
            │   │   ├── bottom-tab-bar.tsx
            │   │   ├── landing-nav.tsx
            │   │   └── empty-state.tsx
            │   │
            │   └── shared/               # Shared across domains
            │       └── toast-provider.tsx
            │
            ├── hooks/
            │   ├── use-board.ts           # Mount cotulenh-board, bridge events ↔ Zustand
            │   ├── use-board.test.ts
            │   ├── use-realtime-channel.ts # Generic Supabase Realtime subscription
            │   ├── use-media-query.ts      # Responsive breakpoint detection
            │   └── use-local-storage.ts    # Typed localStorage wrapper
            │
            ├── stores/
            │   ├── auth-store.ts          # Session, profile, online status
            │   ├── auth-store.test.ts
            │   ├── game-store.ts          # Game state machine, position, clocks
            │   ├── game-store.test.ts
            │   ├── lobby-store.ts         # Open challenges, active games
            │   ├── learn-store.ts         # Lesson state, progress, localStorage
            │   ├── friends-store.ts       # Friend list, presence, requests
            │   └── tournament-store.ts    # Tournament state, standings, round
            │
            ├── lib/
            │   ├── supabase/
            │   │   ├── browser.ts         # createBrowserClient (client components)
            │   │   ├── server.ts          # createServerClient (Server Components, Actions)
            │   │   └── middleware.ts       # createServerClient for middleware
            │   │
            │   ├── actions/               # Server Actions by domain
            │   │   ├── auth.ts            # signup, login, resetPassword
            │   │   ├── game.ts            # createInvitation, acceptInvitation, resign, offerDraw
            │   │   ├── social.ts          # sendFriendRequest, acceptFriend, removeFriend
            │   │   ├── profile.ts         # updateProfile, updateSettings
            │   │   ├── learn.ts           # migrateProgress
            │   │   └── tournament.ts      # joinTournament, leaveTournament
            │   │
            │   ├── validators/            # Zod schemas
            │   │   ├── auth.ts            # signupSchema, loginSchema
            │   │   ├── game.ts            # createInvitationSchema, movePayloadSchema
            │   │   ├── social.ts          # friendRequestSchema, inviteCodeSchema
            │   │   └── profile.ts         # updateProfileSchema, settingsSchema
            │   │
            │   ├── utils/
            │   │   ├── cn.ts              # Tailwind class merge utility
            │   │   └── format-date.ts     # Vietnamese locale date formatting
            │   │
            │   └── types/
            │       ├── database.ts        # Supabase generated types (supabase gen types)
            │       ├── game.ts            # GameStore types, GameEvent discriminated union
            │       ├── realtime.ts        # Broadcast/Postgres Changes payload types
            │       └── actions.ts         # ActionResult<T> type
            │       # Note: Move types (MoveResult, InternalMove) come from @cotulenh/core — never redefined here
            │
            └── constants/
                ├── game-config.ts         # Time controls, forfeit window, deploy rules
                └── routes.ts              # Route path constants
```

### Architectural Boundaries

**Boundary 1: Client ↔ Server**
- Client: React components, Zustand stores, `cotulenh-board`, `cotulenh-core` (UI + AI)
- Server: Server Actions (`lib/actions/`), Middleware (`middleware.ts`)
- Authoritative server: Edge Functions (`supabase/functions/`)
- Boundary protocol: Server Actions return `ActionResult<T>`. Edge Functions return `{ data }` or `{ error, code }`.

**Boundary 2: App ↔ Carried Packages**
- `@cotulenh/core` — imported by `useBoard` hook, game store, AI game page, and Edge Functions. Never modified by the web app.
- `@cotulenh/board` — mounted via `board-container.tsx` through `useBoard` hook. Communicates via imperative API and DOM events. Never wrapped in React state directly.
- `@cotulenh/learn` — imported by learn pages for lesson content/data. Read-only.
- `@cotulenh/common` — imported for shared utilities. Read-only.

**Boundary 3: Realtime Channels**
- Broadcast channels (`game:{id}`) — owned by `useGameStore`. Subscribe on game page mount, unsubscribe on unmount.
- Postgres Changes channels (`lobby`, `challenges`, `friendships`, `tournaments`) — owned by respective stores. Subscribe when relevant page/component mounts.
- Presence channel (`online`) — owned by `useAuthStore`. Calls `track()` on `(app)` layout mount, `untrack()` on unmount. `useFriendsStore` reads the shared presence state to filter online friends — this is the one exception to "no cross-store channel sharing." The channel is managed by `useAuthStore`; `useFriendsStore` only reads its state.

**Boundary 4: Data Access**
- Client components → Supabase browser client (RLS-protected)
- Server Components → Supabase server client (RLS-protected)
- Server Actions → Supabase server client (RLS-protected)
- Edge Functions → Supabase service role client (bypasses RLS for atomic operations)
- No direct DB access outside these four patterns.

### Requirements to Structure Mapping

**FR1–5 (Learning & Education):**
- Pages: `src/app/(public)/learn/`
- Components: `src/components/learn/`
- Store: `src/stores/learn-store.ts`
- Actions: `src/lib/actions/learn.ts` (progress migration)
- Data: `@cotulenh/learn` package

**FR6–12 (Gameplay):**
- Pages: `src/app/(app)/game/`
- Components: `src/components/game/`
- Store: `src/stores/game-store.ts`
- Hook: `src/hooks/use-board.ts`
- Actions: `src/lib/actions/game.ts`
- Edge Functions: `supabase/functions/validate-move/`, `supabase/functions/complete-game/`

**FR13–17 (Matchmaking & Challenges):**
- Pages: `src/app/(app)/play/`
- Components: `src/components/social/open-challenge-row.tsx`, `invite-landing-hero.tsx`
- Store: `src/stores/lobby-store.ts`
- Actions: `src/lib/actions/game.ts` (createInvitation, acceptInvitation)
- DB table: `game_invitations` (open challenges = `to_user IS NULL`, friend challenges = `to_user` set)

**FR18–21 (Rating & Progression):**
- Components: `src/components/profile/rating-badge.tsx`, `rating-change-display.tsx`, `activity-leaderboard-table.tsx`
- Pages: `src/app/(app)/leaderboard/`
- Edge Function: `supabase/functions/complete-game/` (Glicko-2)
- Utility: `@cotulenh/common` (Glicko-2 — to be implemented, shared between app and Edge Functions)

**FR22–27 (User Management):**
- Pages: `src/app/(auth)/`, `src/app/(app)/@[username]/`, `src/app/(app)/friends/`, `src/app/(app)/settings/`
- Components: `src/components/social/friend-card.tsx`
- Store: `src/stores/auth-store.ts`, `src/stores/friends-store.ts`
- Actions: `src/lib/actions/auth.ts`, `src/lib/actions/social.ts`, `src/lib/actions/profile.ts`

**FR28–30 (Game History & Review):**
- Components: `src/components/profile/game-history-card.tsx`
- Pages: `src/app/(app)/game/[id]/` (review mode reuses game page)

**FR37 (AI Opponent):**
- Page: `src/app/(app)/game/ai/`
- Components: `src/components/social/ai-difficulty-selector.tsx`
- Engine: `@cotulenh/core` (client-side only, no server)

**FR38 (Arena Tournaments):**
- Pages: `src/app/(app)/tournament/`
- Components: `src/components/tournament/`
- Store: `src/stores/tournament-store.ts`
- Actions: `src/lib/actions/tournament.ts`
- Edge Function: `supabase/functions/tournament-pair/`

**Cross-Cutting:**
- Auth: `src/middleware.ts` + `src/lib/supabase/` + `src/stores/auth-store.ts`
- Realtime: `src/hooks/use-realtime-channel.ts` + per-store subscriptions
- Board: `src/hooks/use-board.ts` + `src/components/game/board-container.tsx`
- Navigation: `src/components/layout/` + route group layouts
- Validation: `src/lib/validators/`

### Data Flow

```
User Action → Component → Zustand Store → Supabase Client
                                              ↓
                              ┌───────────────┼───────────────┐
                              ↓               ↓               ↓
                        Server Action    Broadcast       Edge Function
                        (mutation)       (ephemeral)     (authoritative)
                              ↓               ↓               ↓
                           Supabase DB    Other Client    Supabase DB
                              ↓                              ↓
                        Postgres Changes              Rating/Game Result
                              ↓
                        Subscribed Stores
                              ↓
                        UI Re-renders
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices fully compatible — Next.js 15 + React 19 + TypeScript 5, Tailwind CSS 4 + shadcn/ui, Zustand, `@supabase/ssr` with Next.js Middleware, Vercel deployment, pnpm + Turborepo. No version conflicts.

**Pattern Consistency:** Naming conventions follow each ecosystem's standards without contradiction. Server Action return format, Realtime event format, and Zustand store pattern consistent across all domains.

**Structure Alignment:** Route groups match auth requirements. Component directories map 1:1 to feature domains. Edge Functions co-located with Supabase config. Test co-location aligns with patterns.

**Coherence Issue Resolved (Security Review):** The original validate-move design received game state from the client payload — a security flaw where a malicious client could fabricate state to make any move legal. Resolution: Edge Function reads `game_states.move_history` from DB, replays all moves from `DEFAULT_POSITION` using `CoTuLenh` to reconstruct authoritative state server-side, then validates the proposed move. This is 2 DB ops per move (1 read + 1 write) — more than the original NFR25 "<10 DB ops" target, but NFR17 (server-side validation) takes priority over the ops budget. The ops are lightweight (single-row PK lookups on `game_states`).

### Requirements Coverage Validation ✅

**All 38 Functional Requirements covered:**

| FR Range | Domain | Status |
|----------|--------|--------|
| FR1–5 | Learning & Education | ✅ |
| FR6–12 | Gameplay | ✅ |
| FR13–17 | Matchmaking & Challenges | ✅ |
| FR18–21 | Rating & Progression | ✅ |
| FR22–27 | User Management | ✅ |
| FR28–30 | Game History & Review | ✅ |
| FR31–33 | Platform & Connectivity | ✅ |
| FR34–36 | Platform UI | ✅ |
| FR37 | AI Opponent | ✅ |
| FR38 | Arena Tournaments | ✅ |

**All 25 Non-Functional Requirements covered:**

| NFR Range | Domain | Status |
|-----------|--------|--------|
| NFR1–7 | Performance | ✅ |
| NFR8–13 | Reliability | ✅ |
| NFR14–18 | Security | ✅ |
| NFR19–23 | Accessibility | ✅ |
| NFR24–25 | Scalability | ✅ |

### Gap Analysis Results

**5 gaps identified, all resolved:**

1. **`@[username]` route conflict (RESOLVED):** Next.js reserves `@` for parallel routes. Route directory: `profile/[username]/`. Middleware rewrites `/@username` → `/profile/username`.

2. **Glicko-2 shared code (RESOLVED):** To be implemented in `@cotulenh/common` (new code — does not exist yet). Both Next.js app and Edge Functions will import from there. Implementation options: write from scratch or wrap an npm package (e.g., `glicko2` or `glicko2-lite`).

3. **Game state snapshot timing (RESOLVED):** `game_states` table stores authoritative `move_history` (SAN array) and cached `fen`. Updated on every validated move (via validate-move Edge Function) and at lifecycle boundaries (game creation, deploy commit, game end, disconnect recovery).

4. **PGN export (RESOLVED):** Wired from `@cotulenh/core` in game review page. No separate utility needed.

5. **validate-move security model (RESOLVED — Security Review):** Edge Function reads `game_states.move_history` from DB, replays from `DEFAULT_POSITION` using `CoTuLenh` engine, validates the proposed move server-side. Never trusts client-supplied game state. This costs 2 DB ops per move (read + write) — NFR17 security takes priority over NFR25 ops budget. The ops are lightweight single-row PK lookups.

### Known Scaling Concerns

**Edge Function Cold Starts:** Supabase Edge Functions may cold-start after idle periods. At MVP traffic (5–30 concurrent users), functions stay warm with regular traffic. Mitigations at scale: Supabase "always warm" option or moving validation client-side with server-side audit logging.

**Deno Runtime Compatibility (Highest Integration Risk):** `@cotulenh/core` is built with Vite for Node/browser environments. Supabase Edge Functions run on Deno. Mitigation strategy:
1. **Early validation spike:** The first implementation story must include a proof-of-concept Edge Function that imports `@cotulenh/core` and runs a basic `game.move()` call.
2. **Import strategy:** Edge Functions use `import_map.json` to map `@cotulenh/core` to the package's ESM build output. The package already builds to ESM (`"type": "module"` or Vite ESM output).
3. **Fallback plan:** If Deno import fails, create a standalone ESM bundle of `@cotulenh/core` specifically for Edge Functions via `vite build --lib` with Deno-compatible output. Place in `supabase/functions/_shared/`.
4. **`supabase/functions/` directory does not exist yet** — to be created during project initialization. Each function gets its own directory with an `index.ts` entry point.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (38 FRs, 25 NFRs)
- [x] Scale and complexity assessed (Medium-High)
- [x] Technical constraints identified (Supabase free tier, solo dev, carried packages)
- [x] Cross-cutting concerns mapped (6 concerns)

**✅ Starter Template**
- [x] Monorepo context analyzed (existing pnpm + Turborepo)
- [x] Starter options evaluated (3 options)
- [x] Selected: vanilla create-next-app with post-init shadcn/Supabase/Zustand

**✅ Architectural Decisions**
- [x] Data architecture — Supabase PostgreSQL, 8 schema domains, Zod validation
- [x] Authentication & security — Supabase Auth, middleware, RLS, Edge Functions
- [x] API & communication — Server Actions + Broadcast + Postgres Changes + Edge Functions
- [x] Frontend architecture — Zustand stores, component architecture, code splitting, routes
- [x] Infrastructure — Vercel, GitHub Actions CI, Vitest + Playwright

**✅ Implementation Patterns**
- [x] Naming conventions (DB, code, files, routes, env vars)
- [x] Structure patterns (project organization, file rules)
- [x] Format patterns (Server Action returns, Edge Function responses, date/time)
- [x] Communication patterns (Realtime events, channel naming, store pattern)
- [x] Process patterns (error handling, loading states, validation timing)

**✅ Project Structure**
- [x] Complete directory tree (monorepo + web app + Supabase)
- [x] Architectural boundaries (4 boundaries)
- [x] Requirements to structure mapping (all FR categories)
- [x] Data flow diagram

**✅ Validation**
- [x] Coherence validated — all decisions compatible
- [x] Requirements coverage — 38/38 FRs, 25/25 NFRs
- [x] Gaps identified and resolved (5/5)
- [x] Party Mode review — Edge Function pattern refined, testing strategy expanded
- [x] Adversarial review — 15 findings addressed: validate-move security fix, schema reconciliation, deploy protocol, presence architecture, Deno mitigation, Broadcast authorization, bundle budget realism, snake_case decision
- [x] Edge case review — 12 architecture-level gaps closed: concurrent move locking, event ordering, clock sync protocol, forfeit window tracking, reconnection flow, draw/takeback expiry, complete-game atomicity, deployment ordering, phase enforcement, turn enforcement, game-ended guards, game+game_states atomicity

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clear separation between ephemeral (Broadcast) and persistent (DB) game data
- Well-defined boundaries between carried packages and new app code
- Edge Function validation replays move history server-side — secure against client tampering (NFR17)
- Schema reconciled with existing migrations — no phantom tables or orphaned tables
- Every FR and NFR has a concrete home in the project structure
- Patterns specific enough to prevent AI agent conflicts (snake_case decision, deploy protocol, presence approach all firm)

**Areas for Future Enhancement (Post-MVP):**
- i18n architecture (next-intl) when English is added
- Quick Play matchmaking queue design
- In-game chat infrastructure
- External monitoring (Sentry) when user base justifies cost
- Abstract realtime layer if scaling beyond Supabase Realtime
- Edge Function "always warm" if cold starts become a latency issue
- Revisit NFR25 DB ops budget — current architecture does 2 DB ops/move for security (NFR17 takes priority). At scale, consider in-memory game state cache (Redis) to reduce per-move DB reads

### Testing Strategy (Refined)

- **Vitest** — unit tests for engine logic, store logic, utilities. `game-store.test.ts` is the highest-priority unit test file — must cover every state transition (waiting → deploy → playing → ended, plus disconnect/forfeit/draw/takeback/resign branches).
- **Vitest + fetch** — Edge Function tests via `supabase functions serve` locally. Test validate-move, complete-game, tournament-pair with mock payloads.
- **Playwright** — E2E for critical user journeys (signup, game, learn).

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Use `MoveResult` / `InternalMove` from `@cotulenh/core` — never redefine move structures. SAN strings for serialization.
- All user-facing strings in Vietnamese — no English, no i18n
- validate-move Edge Function reads `game_states.move_history` from DB and replays server-side — never trusts client-supplied game state

**Structural Corrections:**
- Profile route: `src/app/(app)/profile/[username]/page.tsx` (not `@[username]`)
- Middleware rewrite: `/@username` → `/profile/username`. Implementation: in `middleware.ts`, check `pathname.startsWith('/@')` BEFORE the auth token refresh. If matched, `NextResponse.rewrite()` to `/profile/${username}`. The rewritten URL passes through the `(app)` route group, so auth protection applies normally. Direct navigation to `/profile/username` should `NextResponse.redirect()` to `/@username` for canonical URL consistency.
- Glicko-2: to be implemented in `@cotulenh/common` (new code), not `src/lib/utils/`

**First Implementation Priority:**
1. Run `create-next-app` initialization command
2. Post-init setup (shadcn, Supabase, Zustand)
3. Configure Turborepo pipeline for the new `web` app
4. Set up Supabase client helpers and middleware
