# Story 4.3: Invite Links & Auto-Friend

Status: done

## Story

As a player,
I want to generate a shareable invite link that brings a friend to the platform and automatically connects us,
So that I can grow the community by inviting people I know.

## Acceptance Criteria (BDD)

1. **Given** an authenticated player wants to invite someone
   **When** they generate an invite link from the play page
   **Then** a `game_invitations` row is created with `to_user = NULL` and a unique `invite_code`
   **And** the link is displayed in a shareable format (`/play/online/invite/[code]`) with a copy button (FR16)

2. **Given** a new visitor clicks an invite link
   **When** they navigate to `/play/online/invite/[code]`
   **Then** an SSR-rendered invite landing page shows the inviter's display name and a "Sign Up" / "Sign In" CTA
   **And** the page displays the time control configuration

3. **Given** a visitor signs up via the invite link
   **When** account creation completes and they return to the invite page
   **Then** they see "Accept & Play" button; clicking it creates a friendship automatically (FR17)
   **And** a new game is created and both players navigate to the game page
   **And** the invitation row is consumed (status updated)

4. **Given** an already-registered user clicks an invite link
   **When** they are authenticated
   **Then** they see "Accept & Play"; clicking it auto-friends with the inviter and starts a game

5. **Given** an invite link with an invalid or expired code is accessed
   **When** the page loads
   **Then** a friendly error message is shown with a link back to home

6. **Given** a player views their own invite link
   **When** the page loads
   **Then** they see the link URL with a copy button (not the accept UI)

## CRITICAL: Most Infrastructure Already Exists

Story 4-3 was largely built during stories 4-1 and 4-2. The dev agent MUST audit existing code before writing anything new.

### Already Implemented (DO NOT RECREATE)

**Database Layer:**
- Migration `005_shareable_invite_links.sql` — RPC `get_invitation_by_code()`, RLS policy for claiming link invitations, partial index on `invite_code`
- Migration `006_create_or_accept_friendship.sql` — RPC `create_or_accept_friendship()` for auto-friend

**Query Layer (`$lib/invitations/queries.ts`):**
- `createShareableInvitation(supabase, userId, gameConfig)` — creates 24-hour expiring link (to_user=NULL)
- `getInvitationByCode(supabase, code)` — fetches invitation via RPC (SECURITY DEFINER, prevents enumeration)
- `acceptInviteLink(supabase, code, userId)` — claim-then-accept pattern: (1) set to_user, (2) accept invitation, (3) create game via `create_game_with_state` RPC, with auto-friendship via `create_or_accept_friendship` RPC
- `createAutoFriendship(supabase, userId1, userId2)` — delegates to RPC

**Server Actions (`routes/play/online/+page.server.ts`):**
- `createShareableInvitation` action — validates auth + game config, creates shareable link, returns `inviteCode`

**Invite Page (`routes/play/online/invite/[code]/`):**
- `+page.server.ts` — SSR load with `getInvitationByCode`, `acceptInviteLink` action
- `+page.svelte` — Full UI with 4 states: expired/invalid, own-invitation (copy link), authenticated (accept & play), unauthenticated (signup/login CTAs)
- Auth bypass in `routes/play/online/+layout.server.ts` for `/play/online/invite/` routes

**Play Page UI (`routes/play/online/+page.svelte`):**
- `handleCreateInviteLink()` — creates shareable invitation with selected game config
- `handleCopyInviteLink(code)` — copies URL to clipboard with feedback
- Invite link section with copy button and visual feedback

**i18n (`$lib/i18n/locales/vi.ts` and `en.ts`):**
- All invite link keys: `inviteLink.pageTitle`, `inviteLink.invitedYou`, `inviteLink.acceptAndPlay`, `inviteLink.signUpToPlay`, `inviteLink.alreadyHaveAccount`, `inviteLink.logIn`, `inviteLink.copyLink`, `inviteLink.linkLabel`, `inviteLink.own.*`, `inviteLink.expired.*`, `inviteLink.toast.*`

**Tests:**
- Unit tests in `queries.test.ts` for `createShareableInvitation`
- Unit tests in `page.server.test.ts` for `createShareableInvitation` action (5 tests)
- Layout auth bypass test for invite routes

### Realtime Channels (Already Configured)
- Lobby channel filters OUT shareable links (`invite_code IS NOT NULL`) from open challenge list — see `lobby-realtime-core.ts`
- Personal invitation channel (`user:{userId}:invitations`) handles friend-specific invitations

## Tasks / Subtasks

- [x] Task 1: Audit & verify existing invite link flow end-to-end (AC: #1-6)
  - [x] 1.1 Verify `createShareableInvitation` from play page creates valid link
  - [x] 1.2 Verify invite landing page renders correctly for all 4 states (expired, own, authenticated, unauthenticated)
  - [x] 1.3 Verify signup redirect flow: `/auth/register?redirectTo=/play/online/invite/[code]` returns user to invite page
  - [x] 1.4 Verify `acceptInviteLink` creates friendship + game atomically
  - [x] 1.5 Verify already-registered user can accept and auto-friend
  - [x] 1.6 Verify expired/invalid code shows error state
  - [x] 1.7 Verify own invitation shows copy-link UI (not accept)

- [x] Task 2: Identify and fix any gaps from audit (AC: #1-6)
  - [x] 2.1 Fix any broken redirect flow after signup
  - [x] 2.2 Fix any missing error handling edge cases
  - [x] 2.3 Ensure Vietnamese-only UI on invite landing page (verify no English strings leak)
  - [x] 2.4 Verify 24-hour expiration works correctly

- [x] Task 3: Add E2E test for complete invite flow (AC: #1-5)
  - [x] 3.1 E2E: Player generates invite link from play page
  - [x] 3.2 E2E: Unauthenticated visitor sees invite landing page with inviter name
  - [x] 3.3 E2E: Authenticated user accepts invite link → auto-friend + game created
  - [x] 3.4 E2E: Expired/invalid code shows error state
  - [x] 3.5 E2E: Own invitation shows copy-link UI

- [x] Task 4: Verify challenger-side realtime notification when invite is accepted (AC: #3, #4)
  - [x] 4.1 When acceptor clicks "Accept & Play", verify challenger receives realtime UPDATE event
  - [x] 4.2 Verify challenger navigates to game via `shouldNavigateOnAcceptedSentInvitation()` pattern from `lobby-state.ts`

## Dev Notes

### Architecture Patterns to Follow

- **Svelte 5 runes:** `$state`, `$derived`, `$effect`, `$props` (NOT Svelte 4 stores)
- **Core + reactive wrapper:** Imperative logic in `*-core.ts`, Svelte reactivity in `*.svelte.ts`
- **Server actions return** `{ success, data?, error? }` — never throw
- **Error format:** `return fail(statusCode, { errors: { form: 'errorKey' }, action: 'actionName' })`
- **Vietnamese UI only** — no English, no i18n infrastructure beyond existing key system
- **Tests co-located** next to source files
- **No barrel exports** — direct imports only

### Key Implementation Files

| Purpose | Path |
|---------|------|
| Invite queries | `apps/cotulenh/app/src/lib/invitations/queries.ts` |
| Invite types | `apps/cotulenh/app/src/lib/invitations/types.ts` |
| Invite page (UI) | `apps/cotulenh/app/src/routes/play/online/invite/[code]/+page.svelte` |
| Invite page (server) | `apps/cotulenh/app/src/routes/play/online/invite/[code]/+page.server.ts` |
| Play page (shareable link creation) | `apps/cotulenh/app/src/routes/play/online/+page.svelte` |
| Play page server actions | `apps/cotulenh/app/src/routes/play/online/+page.server.ts` |
| Auth bypass layout | `apps/cotulenh/app/src/routes/play/online/+layout.server.ts` |
| Lobby realtime (filters shareable links) | `apps/cotulenh/app/src/lib/invitations/lobby-realtime-core.ts` |
| Auto-friend RPC migration | `supabase/migrations/006_create_or_accept_friendship.sql` |
| Shareable link migration | `supabase/migrations/005_shareable_invite_links.sql` |
| Vietnamese translations | `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` |
| English translations | `apps/cotulenh/app/src/lib/i18n/locales/en.ts` |
| Existing query tests | `apps/cotulenh/app/src/lib/invitations/queries.test.ts` |
| Existing server action tests | `apps/cotulenh/app/src/routes/play/online/page.server.test.ts` |
| Lobby realtime core tests | `apps/cotulenh/app/src/lib/invitations/lobby-realtime-core.test.ts` |
| E2E tests directory | `apps/cotulenh/app/e2e/` |

### Security Considerations

- `get_invitation_by_code` is SECURITY DEFINER — prevents invite code enumeration
- RLS policy allows claiming only unclaimed invitations (`to_user IS NULL`)
- Auth bypass in layout is scoped to `/play/online/invite/` only
- `acceptInviteLink` verifies user is authenticated before processing
- Auto-friendship is non-blocking side effect (logs error but doesn't fail game creation)

### Claim-Then-Accept Pattern (Already Implemented)

The `acceptInviteLink` function follows a 3-step atomic pattern:
1. **Claim:** Atomically set `to_user = user.id` where `to_user IS NULL` (prevents race conditions)
2. **Accept:** Update invitation status to 'accepted'
3. **Create game:** Use `create_game_with_state` RPC for atomic game + game_state creation
4. **Auto-friend (side effect):** Call `create_or_accept_friendship` RPC — non-blocking, logs on failure

### Redirect Flow for Unauthenticated Users

Current flow: Click invite → see landing → click "Sign Up" → `/auth/register?redirectTo=/play/online/invite/[code]` → after signup, redirect back to invite page → now authenticated → click "Accept & Play" → auto-friend + game created.

Verify this redirect chain works end-to-end. The `redirectTo` query param must survive the auth flow.

### Previous Story (4-2) Key Learnings

- Story 4-2 established friend challenge UI with `FriendChallengeDialog.svelte`
- Toast behavior: actionable toasts persist 30s, non-actionable auto-dismiss 3s
- Navigation pattern: acceptor navigates directly, challenger navigates via realtime UPDATE event using `shouldNavigateOnAcceptedSentInvitation()` from `lobby-state.ts`
- Senior review fixes applied: atomic game creation via `create_game_with_state` RPC, color choice, proper toast handling
- All 764 unit tests pass with 0 regressions
- Database migration `018_profiles_rating_and_friend_color.sql` added

### Project Structure Notes

- Monorepo: `pnpm + Turborepo`
- App: `apps/cotulenh/app/` (SvelteKit)
- Core game logic: `packages/core/` (`@cotulenh/core`)
- Common utilities: `packages/common/` (`@cotulenh/common`)
- Supabase migrations: `supabase/migrations/`
- E2E tests: `apps/cotulenh/app/e2e/` (Playwright with local Supabase)

### Testing Standards

- **Vitest** for unit tests — co-locate next to source
- **Playwright** for E2E — `apps/cotulenh/app/e2e/*.spec.ts`
- Run unit tests: `pnpm --filter @cotulenh/app test`
- Run E2E: `pnpm --filter @cotulenh/app test:e2e`
- Type check: `pnpm --filter @cotulenh/app check`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — Realtime patterns, Database schemas, Server Actions]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 3 (Tuan), Journey 4 (Invite Link flow)]
- [Source: _bmad-output/planning-artifacts/prd.md — FR16, FR17, Growth strategy]
- [Source: _bmad-output/implementation-artifacts/4-2-friend-challenge.md — Previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — no debugging required.

### Completion Notes List

- **Task 1 (Audit):** Full end-to-end audit of invite link flow. All 7 subtasks verified. Found 3 bugs in the acceptance path:
  1. Game creation used direct `games` table insert instead of `create_game_with_state` RPC (missing `game_states` row — no clocks, FEN, phase)
  2. Auto-friendship failure blocked the game start path instead of being a detached side effect
  3. Real authenticated link-claiming failed against the local Supabase stack because the RLS update path returned zero rows
- **Task 2 (Fix gaps):** Fixed the game creation and non-blocking friendship issues in `acceptInviteLink`. Added `claim_link_invitation` as a SECURITY DEFINER RPC in migration `023_claim_link_invitation.sql`, then switched the query layer to use it. Added explicit invite landing-page form errors for claim/accept failures.
- **Task 3 (E2E tests):** Created `e2e/invite-link.spec.ts` with 6 Playwright E2E tests covering link generation, unauthenticated landing page, signup redirect preservation, authenticated accept flow, expired/invalid code, and own-invitation copy-link UI. Hardened the login helper to tolerate the first-run dev-server reload during route compilation.
- **Task 4 (Realtime):** Verified challenger receives realtime UPDATE event via `from_user=eq.${userId}` subscription. Shareable link invitations are included in `sentInvitations`, so `shouldNavigateOnAcceptedSentInvitation()` correctly triggers navigation. Added unit test for this specific case.

### Change Log

- 2026-03-29: Fixed `acceptInviteLink` to use `create_game_with_state` RPC for atomic game+state creation (was direct insert missing `game_states`)
- 2026-03-29: Made auto-friendship in `acceptInviteLink` non-blocking and resilient to RPC rejection
- 2026-03-29: Added migration `023_claim_link_invitation.sql` with SECURITY DEFINER RPC for reliable authenticated link claiming
- 2026-03-29: Added invite landing-page form errors for unavailable/failed accept cases
- 2026-03-29: Expanded `queries.test.ts` coverage for non-blocking friendship failures and RPC-based claim flow
- 2026-03-29: Added E2E test suite `invite-link.spec.ts` with 6 invite-link tests and a startup-safe login helper
- 2026-03-29: Added unit test for shareable invite link realtime navigation in `lobby-state.test.ts`

### File List

- `apps/cotulenh/app/src/lib/invitations/queries.ts` — Fixed `acceptInviteLink` to use RPC-based claiming, non-blocking friendship, and atomic game creation
- `apps/cotulenh/app/src/lib/invitations/queries.test.ts` — Expanded `acceptInviteLink` tests for RPC claim and friendship-failure handling
- `apps/cotulenh/app/src/routes/play/online/invite/[code]/+page.svelte` — Added visible form error handling for accept failures
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` — Added invite-link error copy
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — Added invite-link error copy
- `apps/cotulenh/app/src/lib/i18n/types.ts` — Added invite-link error keys
- `apps/cotulenh/app/src/routes/play/online/lobby-state.test.ts` — Added shareable invite link navigation test
- `apps/cotulenh/app/e2e/invite-link.spec.ts` — New E2E test file (6 tests)
- `supabase/migrations/023_claim_link_invitation.sql` — Adds SECURITY DEFINER link-claim RPC
