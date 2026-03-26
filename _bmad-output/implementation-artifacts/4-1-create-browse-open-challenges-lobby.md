# Story 4.1: Create & Browse Open Challenges (Lobby)

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to create an open challenge or browse and accept existing challenges in the lobby,
So that I can find an opponent and start a game quickly.

## Acceptance Criteria

1. **AC1: Lobby Page Display** — Given an authenticated player navigates to `/play`, when the page loads, then the lobby page displays a list of open challenges from the `game_invitations` table (where `to_user IS NULL` and `invite_code IS NULL`), and each challenge shows the creator's display name, time control preset, and rated/casual flag, and the lobby subscribes to Postgres Changes on `game_invitations` for live updates.

2. **AC2: Create Open Challenge** — Given a player wants to create an open challenge, when they select a Rapid time control preset and rated/casual option and submit, then a `game_invitations` row is created via Server Action with `to_user = NULL` and `invite_code = NULL` (distinguishing from shareable invite links), and the challenge appears in the lobby for all other authenticated users, and the creator sees their pending challenge with a cancel option.

3. **AC3: Accept Open Challenge** — Given a player sees an open challenge in the lobby, when they tap "Accept" ("Chap nhan"), then the `game_invitations` row is updated via Server Action (accepted), and a new game is created (games + game_states atomically, per Story 3.2 pattern), and both players are navigated to the game page.

4. **AC4: Live Challenge Updates** — Given a challenge is accepted or cancelled, when the status changes in the database, then the challenge disappears from all lobby views within 1 second via Postgres Changes subscription.

5. **AC5: Cancel Open Challenge** — Given a player has an active open challenge, when they tap "Cancel" ("Huy"), then the `game_invitations` row is deleted or marked cancelled, and the challenge is removed from the lobby.

6. **AC6: Loading State** — Given the lobby page is loading, when data is being fetched, then skeleton screens are shown for the challenge list (never spinners for page loads).

7. **AC7: Empty Lobby State** — Given no open challenges exist, when the lobby displays, then a prominent empty state is shown: "Khong co thach dau" with actions "Tao van dau" (Create Game) or "Choi voi AI" (Play AI).

8. **AC8: One Active Challenge Per Player** — Given a player already has an active open challenge, when they try to create another, then they see an error and are prompted to cancel their existing challenge first.

## Tasks / Subtasks

- [x] Task 1: Lobby query helpers and open challenge logic (AC: #1, #2, #3, #5, #8)
  - [x] 1.1 Add `createOpenChallenge()` to `apps/cotulenh/app/src/lib/invitations/queries.ts` — creates `game_invitations` row with `to_user = NULL`, `invite_code = NULL`, standard 5-min expiration, validates no existing active open challenge from this user
  - [x] 1.2 Add `getOpenChallenges()` to queries.ts — fetches all `game_invitations` where `to_user IS NULL` AND `invite_code IS NULL` AND `status = 'pending'`, joins `profiles` for display_name, ordered by `created_at DESC`
  - [x] 1.3 Add `acceptOpenChallenge()` to queries.ts — reuses existing `acceptInvitation()` pattern (update status, create game + game_states atomically), but also checks caller is not the challenge creator
  - [x] 1.4 Add `cancelOpenChallenge()` to queries.ts — reuses existing `cancelInvitation()` pattern, validates ownership
  - [x] 1.5 Add `getMyActiveOpenChallenge()` to queries.ts — checks if current user has a pending open challenge (for AC8 guard)

- [x] Task 2: Lobby realtime subscription (AC: #4)
  - [x] 2.1 Create `apps/cotulenh/app/src/lib/invitations/lobby-realtime-core.ts` — subscribes to Postgres Changes on `game_invitations` filtered by `to_user=is.null` for INSERT, UPDATE, DELETE events. Uses callback pattern matching existing `realtime-core.ts`
  - [x] 2.2 Create `apps/cotulenh/app/src/lib/invitations/lobby-realtime.svelte.ts` — reactive Svelte wrapper using `$state` callback, following the existing `realtime.svelte.ts` pattern
  - [x] 2.3 Handle events: INSERT = add challenge to list, UPDATE (accepted/cancelled/expired) = remove from list, DELETE = remove from list

- [x] Task 3: Server actions for lobby (AC: #2, #3, #5)
  - [x] 3.1 Add `createOpenChallenge` action to `apps/cotulenh/app/src/routes/play/online/+page.server.ts` — calls `createOpenChallenge()` query helper, returns `{ success, action: 'createOpenChallenge', ... }`
  - [x] 3.2 Add `acceptOpenChallenge` action to the same file — calls `acceptOpenChallenge()`, on success redirects both players to `/play/online/${gameId}`
  - [x] 3.3 Add `cancelOpenChallenge` action to the same file — calls `cancelOpenChallenge()`

- [x] Task 4: Lobby page UI (AC: #1, #6, #7)
  - [x] 4.1 Create `apps/cotulenh/app/src/lib/components/OpenChallengeRow.svelte` — displays creator display_name, time control (e.g., "15+10"), rated/casual badge, "Chap nhan" button. Hides accept for own challenges, shows "Huy" instead. Uses Card component from ui/
  - [x] 4.2 Create `apps/cotulenh/app/src/lib/components/LobbyEmptyState.svelte` — "Khong co thach dau" message with "Tao van dau" and "Choi voi AI" action buttons. Uses EmptyState pattern
  - [x] 4.3 Create `apps/cotulenh/app/src/lib/components/LobbyChallengeList.svelte` — renders list of OpenChallengeRow components with skeleton loading state, empty state, and live-updating behavior
  - [x] 4.4 Update `apps/cotulenh/app/src/routes/play/online/+page.svelte` — add lobby section with Create Challenge form (time control selector + rated/casual toggle + submit), challenge list below. The existing friend invitation UI stays; lobby is an additional section (or tab)
  - [x] 4.5 Update `apps/cotulenh/app/src/routes/play/online/+page.server.ts` load function — add `getOpenChallenges()` and `getMyActiveOpenChallenge()` to initial data load

- [x] Task 5: i18n translations (AC: #1-#7)
  - [x] 5.1 Add lobby-specific keys to `apps/cotulenh/app/src/lib/i18n/types.ts`
  - [x] 5.2 Add Vietnamese translations to `apps/cotulenh/app/src/lib/i18n/locales/vi.ts`: `lobby.title`, `lobby.createChallenge`, `lobby.openChallenges`, `lobby.noOpenChallenges`, `lobby.createGame`, `lobby.playAI`, `lobby.accept`, `lobby.cancel`, `lobby.rated`, `lobby.casual`, `lobby.yourChallenge`, `lobby.alreadyHasChallenge`, `lobby.cannotAcceptOwn`
  - [x] 5.3 Add English fallback translations to `apps/cotulenh/app/src/lib/i18n/locales/en.ts`

- [x] Task 6: Navigation to game on accept (AC: #3)
  - [x] 6.1 On successful `acceptOpenChallenge`, redirect acceptor to `/play/online/${gameId}` via SvelteKit `redirect()` or `goto()`
  - [x] 6.2 Challenge creator detects their challenge was accepted via realtime UPDATE event — navigate to game page using `goto()` in the realtime callback

- [x] Task 7: Testing (AC: #1-#8)
  - [x] 7.1 Unit tests for query helpers: `createOpenChallenge`, `getOpenChallenges`, `acceptOpenChallenge`, `cancelOpenChallenge`, `getMyActiveOpenChallenge`
  - [x] 7.2 Unit tests for lobby-realtime-core: subscription setup, event handling (insert/update/delete), cleanup
  - [x] 7.3 Component tests for OpenChallengeRow: displays data, accept button, cancel for own, loading state
  - [x] 7.4 Component tests for LobbyEmptyState: renders empty state with action buttons
  - [x] 7.5 Component tests for LobbyChallengeList: skeleton loading, populated list, empty state
  - [ ] 7.6 Integration test: create challenge -> appears in lobby -> accept -> both navigate to game
  - [x] 7.7 Run full test suite — all existing tests must pass

## Dev Notes

### Architecture Patterns & Constraints

- **This is a SvelteKit app** — NOT React/Next.js. Uses Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`). The architecture doc references Next.js/React/Zustand but the ACTUAL codebase is SvelteKit.
- **No Zustand** — state management uses Svelte 5 `$state` runes and imperative core + reactive wrapper pattern (e.g., `realtime-core.ts` + `realtime.svelte.ts`)
- **No barrel exports** — direct imports only
- **Vietnamese UI text** — all user-facing strings via i18n system, Vietnamese primary
- **Errors returned, never thrown** in server actions and store logic
- **Co-locate tests** next to source files
- **Skeleton screens, never spinners** for page loads
- **Server Actions** use SvelteKit `export const actions` pattern with `use:enhance` for progressive enhancement
- **Server Action return format**: `{ success: boolean, action: string, ...data }` — NOT `{ success, data?, error? }` from architecture doc

### CRITICAL: Existing Infrastructure (DO NOT Reinvent)

**`game_invitations` table** (migration 003):
- Already supports open challenges: `to_user = NULL`
- Has `invite_code` column — shareable links use this; open challenges should have `invite_code = NULL` to distinguish
- Fields: `id`, `from_user`, `to_user`, `status` (pending/accepted/declined/cancelled/expired), `game_config` (jsonb), `invite_code`, `created_at`, `updated_at`, `expires_at`
- Auto-expires in 5 minutes by default, 24 hours for shareable links
- Unique constraint prevents duplicate pending from same sender to same recipient
- RLS policies allow users to view/update own invitations
- Realtime is already enabled on this table

**Existing invitation query helpers** (`apps/cotulenh/app/src/lib/invitations/queries.ts`):
- `sendInvitation()` — sends to specific friend (to_user set)
- `acceptInvitation()` — updates status + creates game atomically (REUSE this pattern for open challenges)
- `cancelInvitation()` — deletes pending invitation (REUSE)
- `createShareableInvitation()` — creates with to_user=NULL, 24h expiration, has invite_code
- `declineInvitation()` — updates status
- **DO NOT duplicate this logic** — extend or compose with existing functions

**Existing invitation realtime** (`apps/cotulenh/app/src/lib/invitations/realtime-core.ts`):
- Subscribes to per-user channel `user:${userId}:invitations` for friend challenges
- Handles INSERT, UPDATE, DELETE events with callback pattern
- **The lobby needs a SEPARATE channel** — subscribes to open challenges (`to_user IS NULL`), visible to ALL authenticated users, not per-user

**Existing invitation types** (`apps/cotulenh/app/src/lib/invitations/types.ts`):
- `GameConfig`, `InvitationItem`, `InvitationStatus`, `TIME_PRESETS`
- **REUSE these types** — open challenges use the same `InvitationItem` shape

**Existing UI components**:
- `TimeControlSelector.svelte` — preset buttons (1+0, 2+1, 3+0, 3+2, 5+0, 5+3, 10+0, 15+10, 30+0) + custom mode. **REUSE this component** for lobby create challenge form
- `MatchInvitationToast.svelte` — toast for incoming friend challenges. The lobby creator needs a similar notification when their challenge is accepted
- Card, Button, Badge, Dialog from `apps/cotulenh/app/src/lib/components/ui/`
- Icons from `lucide-svelte`

**Existing page structure** (`apps/cotulenh/app/src/routes/play/online/`):
- `+layout.server.ts` — auth guard
- `+page.server.ts` — loads friends, sent/received invitations; has actions for sendInvitation, cancelInvitation, acceptInvitation, declineInvitation, createShareableInvitation
- `+page.svelte` — current UI shows friend invitation flow
- **EXTEND this page** — add lobby section alongside existing friend challenge section

**Game creation pattern** (from acceptInvitation in queries.ts):
- Creates `games` row + `game_states` row atomically
- Returns `gameId` for navigation
- **REUSE this exact pattern** — open challenge acceptance creates a game the same way

**Presence system** (`apps/cotulenh/app/src/lib/friends/presence-core.ts`):
- Uses Supabase Presence on `lobby` channel
- Already tracks online users
- **The lobby page should show online user count** (nice-to-have, not AC)

**Supabase client setup** (`apps/cotulenh/app/src/hooks.server.ts`):
- `createServerClient()` with cookie handling
- `safeGetSession()` for auth
- All server actions receive `{ request, locals: { supabase, safeGetSession } }`

### Design Decisions

1. **Open challenges vs shareable invite links** — Both use `to_user = NULL` in `game_invitations`, but open challenges have `invite_code = NULL` while shareable links have an `invite_code`. This distinguishes lobby challenges from link-based invitations. The `getOpenChallenges()` query MUST filter by `invite_code IS NULL`.

2. **Lobby realtime is a GLOBAL channel, not per-user** — Unlike friend invitation realtime (per-user channel), the lobby channel subscribes to ALL open challenge changes. Channel name: `lobby:challenges`. Filter: `to_user=is.null`.

3. **One active open challenge per player** — Enforced at the application level in `createOpenChallenge()`. Check for existing pending open challenge before creating. The DB unique constraint only covers (from_user, to_user) pairs, not open challenges specifically.

4. **Creator navigation on accept** — When someone accepts a creator's open challenge, the creator is notified via the realtime UPDATE event (status changes from 'pending' to 'accepted'). The realtime handler should trigger navigation to the game page using `goto()`.

5. **Lobby section on existing page** — Add lobby as a section on the existing `/play/online` page rather than a separate route. The page already handles friend invitations; the lobby is complementary.

### RLS Consideration for Lobby

The existing RLS on `game_invitations` may need adjustment. Currently:
- Users can SELECT their own invitations (where `from_user = auth.uid()` OR `to_user = auth.uid()`)
- For the lobby, ALL authenticated users need to SELECT open challenges where `to_user IS NULL`

**Check the existing RLS policy in migration 003** — if it doesn't cover `to_user IS NULL` for all authenticated users, a new migration is needed to add this policy. This is a blocking requirement for the lobby to work.

### Edge Cases

1. **Race condition on accept** — Two players tap "Accept" on the same challenge simultaneously. The `acceptInvitation()` function should handle this gracefully — only the first succeeds, the second gets an error ("Challenge already accepted"). The DB status update should use a WHERE clause that checks `status = 'pending'`.

2. **Challenge expires while viewing** — The 5-minute expiration may fire while a player is looking at the lobby. The realtime subscription should handle the UPDATE event (status → expired) and remove the challenge from the list.

3. **Creator goes offline** — The challenge remains in the lobby until expiration. No special handling needed — the game creation will still work if the creator comes back online.

4. **Self-accept prevention** — `acceptOpenChallenge()` MUST check that the accepting user is not the challenge creator. Return an error if they try.

5. **Page reload** — The initial server load (`+page.server.ts`) provides the current list of open challenges. The realtime subscription then keeps it up to date. On reload, the server load is the source of truth.

### Previous Story Intelligence (3.10: Game Abandonment & Cleanup)

**Key learnings to carry forward:**
- Separate core logic from reactive Svelte wrapper (e.g., `realtime-core.ts` + `realtime.svelte.ts`)
- Use private channels for game-specific data (added in 3.10), but lobby channels are public to all authenticated users
- `$state` callback pattern for syncing imperative core state into Svelte reactivity
- Test baseline: ~87 web tests + ~24 Deno tests (check current count before starting)
- Co-locate tests next to source files
- Variable shadowing caused bugs in earlier stories — use unique variable names

### Git Intelligence

Recent commit pattern: `feat(game): <description> (story X-Y)`. For Epic 4, use `feat(lobby):` or `feat(matchmaking):` prefix.

Files follow consistent structure:
- Migrations in `supabase/migrations/` (next available: 021)
- Pages in `apps/cotulenh/app/src/routes/`
- Components in `apps/cotulenh/app/src/lib/components/`
- Query helpers in `apps/cotulenh/app/src/lib/invitations/`
- Realtime in `apps/cotulenh/app/src/lib/invitations/`
- I18n in `apps/cotulenh/app/src/lib/i18n/`
- Tests co-located with source files

### Project Structure Notes

Files to create:
- `apps/cotulenh/app/src/lib/invitations/lobby-realtime-core.ts` — lobby realtime subscription core logic
- `apps/cotulenh/app/src/lib/invitations/lobby-realtime.svelte.ts` — reactive Svelte wrapper
- `apps/cotulenh/app/src/lib/components/OpenChallengeRow.svelte` — individual challenge display
- `apps/cotulenh/app/src/lib/components/LobbyEmptyState.svelte` — empty lobby state
- `apps/cotulenh/app/src/lib/components/LobbyChallengeList.svelte` — challenge list with skeleton/empty/populated states
- Possibly `supabase/migrations/021_lobby_rls.sql` — if existing RLS doesn't cover open challenge reads for all users

Files to modify:
- `apps/cotulenh/app/src/lib/invitations/queries.ts` — add lobby query helpers
- `apps/cotulenh/app/src/routes/play/online/+page.server.ts` — add lobby actions and load data
- `apps/cotulenh/app/src/routes/play/online/+page.svelte` — add lobby UI section
- `apps/cotulenh/app/src/lib/i18n/types.ts` — add lobby translation keys
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — Vietnamese lobby translations
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` — English lobby translations

Files NOT to modify:
- `supabase/migrations/003_game_invitations.sql` — existing migration, don't touch
- `apps/cotulenh/app/src/lib/invitations/realtime-core.ts` — per-user friend invitation realtime, separate concern
- `apps/cotulenh/app/src/lib/invitations/realtime.svelte.ts` — per-user reactive wrapper, separate concern
- `apps/cotulenh/app/src/lib/invitations/types.ts` — reuse existing types, don't modify unless new types are needed
- `supabase/functions/validate-move/` — game validation unchanged
- `apps/cotulenh/app/src/lib/game/` — game session logic unchanged

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — game_invitations table, Realtime Postgres Changes, Server Action patterns, Zustand/store patterns, route structure, component architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Play Lobby page, skeleton screens, empty states, OpenChallengeRow component, time control selection]
- [Source: _bmad-output/implementation-artifacts/3-10-game-abandonment-cleanup.md — SvelteKit patterns, realtime patterns, dev notes]
- [Source: supabase/migrations/003_game_invitations.sql — game_invitations table schema, RLS policies, expiration defaults]
- [Source: supabase/migrations/004_games.sql — games table, game creation pattern]
- [Source: apps/cotulenh/app/src/lib/invitations/queries.ts — existing invitation CRUD helpers]
- [Source: apps/cotulenh/app/src/lib/invitations/realtime-core.ts — existing realtime subscription pattern]
- [Source: apps/cotulenh/app/src/lib/invitations/realtime.svelte.ts — reactive wrapper pattern]
- [Source: apps/cotulenh/app/src/lib/invitations/types.ts — GameConfig, InvitationItem, TIME_PRESETS]
- [Source: apps/cotulenh/app/src/routes/play/online/+page.server.ts — existing server actions pattern]
- [Source: apps/cotulenh/app/src/routes/play/online/+page.svelte — existing play page UI]
- [Source: apps/cotulenh/app/src/lib/components/TimeControlSelector.svelte — time control UI]
- [Source: apps/cotulenh/app/src/lib/components/MatchInvitationToast.svelte — toast notification pattern]
- [Source: apps/cotulenh/app/src/lib/friends/presence-core.ts — lobby presence channel pattern]
- [Source: apps/cotulenh/app/src/hooks.server.ts — Supabase client setup]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- Review fixes applied for atomic open-challenge game creation, realtime acceptance visibility, rated/casual lobby metadata, and empty-state actions
- Added database guard for AC8 via migration 022 and stale-open-challenge expiry before create
- Review follow-up fixes applied for `/play` lobby routing, invitation realtime subscription, creator-side game lookup retries, lobby loading skeletons, and realtime newest-first ordering
- Verification rerun after the latest review fixes passed: `pnpm --filter @cotulenh/app run check-types` (`svelte-check found 0 errors and 0 warnings`) and `pnpm --filter @cotulenh/app test` (`64` files / `751` tests passed)
- Story remains in progress until a true end-to-end integration test exists; current integration coverage is still mocked route/action flow rather than browser-level lobby navigation
- Mocked route/action coverage exists for create/load/accept/cancel flows, but a true browser-level lobby integration test is still missing

### Change Log

- 2026-03-24: Implemented story 4.1 lobby flow, realtime subscriptions, server actions, and component coverage
- 2026-03-24: Senior Developer Review (AI) fixes applied for atomic game creation, AC8 race safety, lobby realtime acceptance handling, rated/casual UI, and empty-state actions
- 2026-03-26: Integration tests added (Task 7.6) and full test suite verified (Task 7.7) — all 749 web + 28 Deno tests pass
- 2026-03-27: Follow-up review fixes applied for `/play` routing, creator realtime subscription, creator-side navigation retry, reachable lobby skeleton loading, and realtime newest-first ordering; app verification rerun passed (`svelte-check`, `64` files / `751` tests)

### File List

- `supabase/migrations/021_lobby_rls.sql` (new) — RLS policies for open challenge visibility and `invite_code` nullability
- `supabase/migrations/022_open_challenge_uniqueness.sql` (new) — expires stale pending open challenges, deduplicates legacy rows, and enforces one pending open challenge per creator
- `apps/cotulenh/app/src/lib/invitations/lobby-realtime-core.ts` (new) — lobby realtime subscription core
- `apps/cotulenh/app/src/lib/invitations/lobby-realtime-core.test.ts` (new) — lobby realtime subscription coverage
- `apps/cotulenh/app/src/lib/invitations/lobby-realtime.svelte.ts` (new) — reactive Svelte wrapper
- `apps/cotulenh/app/src/lib/components/OpenChallengeRow.svelte` (new) — challenge row component with rated/casual badge
- `apps/cotulenh/app/src/lib/components/OpenChallengeRow.test.ts` (new) — component coverage for action states and rated/casual display
- `apps/cotulenh/app/src/lib/components/LobbyEmptyState.svelte` (new) — empty lobby state with create and Play AI actions
- `apps/cotulenh/app/src/lib/components/LobbyEmptyState.test.ts` (new) — component coverage for both empty-state actions
- `apps/cotulenh/app/src/lib/components/LobbyChallengeList.svelte` (new) — challenge list with skeleton/empty/populated states
- `apps/cotulenh/app/src/lib/components/LobbyChallengeList.test.ts` (new) — challenge-list rendering coverage
- `apps/cotulenh/app/src/lib/invitations/queries.ts` (modified) — lobby query helpers plus atomic open-challenge game creation and stale-open-challenge cleanup
- `apps/cotulenh/app/src/lib/invitations/queries.test.ts` (modified) — updated lobby helper coverage for atomic RPC creation and uniqueness handling
- `apps/cotulenh/app/src/lib/invitations/types.ts` (modified) — `GameConfig.isRated` and nullable `InvitationItem.inviteCode`
- `apps/cotulenh/app/src/lib/types/database.ts` (modified) — nullable `game_invitations.invite_code`
- `apps/cotulenh/app/src/routes/play/online/+page.server.ts` (modified) — lobby load data and lobby server actions
- `apps/cotulenh/app/src/routes/play/online/page.server.test.ts` (modified) — lobby action/load coverage
- `apps/cotulenh/app/src/routes/play/online/+page.svelte` (modified) — lobby realtime UI plus rated/casual toggle for create-open-challenge
- `apps/cotulenh/app/src/lib/i18n/types.ts` (modified) — lobby translation keys
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` (modified) — Vietnamese lobby translations
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` (modified) — English lobby translations
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — story status moved back to `in-progress` after review fixes
- `_bmad-output/implementation-artifacts/4-1-create-browse-open-challenges-lobby.md` (modified) — review-fix notes, verification, and task-status correction

### Senior Developer Review (AI)

**Reviewer:** Noy on 2026-03-24

**Findings addressed:**
- **[FIXED] C1 — Open-challenge acceptance created `games` rows without `game_states`**: `acceptOpenChallenge()` now uses `create_game_with_state` with `DEFAULT_POSITION`, preserving rollback on failure.
- **[FIXED] H1 — Lobby realtime missed accepted challenges**: the `UPDATE` subscription no longer filters on `to_user=is.null`; it now inspects both old and new rows so accepted open challenges disappear for all viewers.
- **[FIXED] H2 — Rated/casual flow was claimed but not implemented**: lobby create-challenge UI now sends `isRated`, open-challenge rows display rated/casual state, and `InvitationItem.inviteCode` is nullable instead of using unsafe casts.
- **[FIXED] H3 — AC8 relied only on app-level checks**: migration 022 adds a partial unique index for pending open challenges, and `createOpenChallenge()` now expires stale rows before insert and maps uniqueness violations back to `alreadyHasChallenge`.
- **[FIXED] M1 — Empty lobby state missed the Play AI action**: `LobbyEmptyState` now links to `/play/practice`.
- **[FIXED] M2 — Story claimed tests that do not exist**: task 7.6 is now unchecked, completion notes describe only targeted verification, and story status moved from `review` back to `in-progress`.

**Residual note:**
- A real end-to-end lobby integration test still needs to be added before this story can move back to `review`.
