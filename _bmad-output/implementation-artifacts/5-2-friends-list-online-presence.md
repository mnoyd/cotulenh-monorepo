# Story 5.2: Friends List & Online Presence

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to manage my friends and see who is online,
So that I can find someone to play with.

## Acceptance Criteria

1. **Given** an authenticated player navigates to the friends page
   **When** the page loads
   **Then** their friends list is displayed with each friend's display name, rating, and online/offline status indicator (FR26)
   **And** online friends are sorted to the top

2. **Given** the `(app)` layout mounts
   **When** the user is authenticated
   **Then** presence tracking calls `joinLobby()` on the shared `online` Supabase Presence channel
   **And** on unmount/logout, `leaveLobby()` is called

3. **Given** the friends page is displayed
   **When** a friend comes online or goes offline
   **Then** their status indicator updates in real-time
   **And** the presence system reads the shared presence state from the `online` channel to filter online friends

4. **Given** a player wants to add a friend
   **When** they send a friend request (via profile page or username search on friends page)
   **Then** a friendship request is created via the `sendFriendRequest` Server Action
   **And** the request appears in the recipient's pending requests

5. **Given** a player has pending friend requests
   **When** they view the friends page
   **Then** incoming requests are shown with accept/decline buttons
   **And** accepting creates a bidirectional friendship in the `friendships` table via the `create_or_accept_friendship` DB function
   **And** declining removes the request

6. **Given** a player wants to remove a friend
   **When** they tap "Remove Friend"
   **Then** a confirmation dialog appears
   **And** on confirmation, the friendship row is deleted via Server Action

## Existing Code Analysis

### CRITICAL: Nearly all functionality already exists. This story is primarily verification, polish, and gap-filling.

**The SvelteKit app at `apps/cotulenh/app/` is the target.** The friends system was largely built during Epic 4 (stories 4-2 and 4-3) and enhanced in story 5-1.

#### Already Implemented (DO NOT RECREATE):

| Feature | Location | Lines | Status |
|---------|----------|-------|--------|
| Friends page UI | `src/routes/user/friends/+page.svelte` | 496 | Complete with search, requests, friends list, challenge dialog, optimistic updates |
| Friends server | `src/routes/user/friends/+page.server.ts` | 241 | 7 server actions: search, sendRequest, acceptRequest, declineRequest, cancelRequest, sendFriendChallenge, removeFriend |
| Friend queries | `src/lib/friends/queries.ts` | 351 | Full CRUD: searchUsers, sendFriendRequest, getFriendsList, getPendingIncomingRequests, getPendingSentRequests, acceptFriendRequest, declineFriendRequest, cancelSentRequest, removeFriend |
| Friend types | `src/lib/friends/types.ts` | 39 | FriendshipStatus, RelationshipStatus, FriendListItem, PendingRequestItem, etc. |
| Presence core | `src/lib/friends/presence-core.ts` | 177 | joinLobby, leaveLobby, getOnlineUsers, isUserOnline, onPresenceChange with exponential backoff reconnect |
| Presence Svelte | `src/lib/friends/presence.svelte.ts` | 59 | Svelte 5 $state reactive wrapper for presence core |
| Friend sorting | `src/lib/friends/sort.ts` | 26 | sortFriendsByOnline: online first, then alphabetical, with dedup |
| Presence init | `src/routes/+layout.svelte` (lines 96-109) | - | joinLobby on auth, leaveLobby on logout, cleanup on beforeunload |
| DB schema | `supabase/migrations/002_friendships.sql` | 67 | friendships table with canonical user_a/user_b ordering, RLS policies, indexes |
| DB RPC | `supabase/migrations/006_create_or_accept_friendship.sql` | 56 | Atomic create-or-accept with RLS |
| Challenge dialog | `src/lib/components/FriendChallengeDialog.svelte` | - | Time control presets, rated/casual toggle, color choice |
| Presence tests | `src/lib/friends/presence.test.ts` | 319 | Full coverage: join/leave, sync events, backoff, callbacks |
| Query tests | `src/lib/friends/queries.test.ts` | 591 | Full CRUD test coverage with edge cases |
| Sort tests | `src/lib/friends/sort.test.ts` | 35 | Online-first sorting, dedup |

#### What Needs Verification & Potential Enhancement:

1. **Rating display on friend items** -- Verify each friend card shows the `rating` column from profiles (added in migration 018). Show "Chwa xep hang" if null.
2. **Real-time presence updates on friends page** -- Verify that when a friend comes online/goes offline, the UI reactively updates without page reload. The presence system exists but confirm the friends page is subscribed.
3. **Online indicator styling** -- Verify green dot (`--color-player-online`) is displayed per UX spec. Check both mobile and desktop layouts.
4. **Friends page sections per UX spec** -- UX requires: "Online Friends (with 'Thach dau')", "Offline Friends", "Pending Requests (accept/decline)". Verify the current page groups friends this way (vs a single merged list).
5. **Mobile responsiveness** -- UX spec says "Mobile: single column cards. Sections collapsible." Verify current implementation.
6. **Last active timestamp** -- UX spec mentions "last active" per friend row. Currently only "online now" is tracked. May need `last_seen` storage or display.
7. **Friend count** -- Verify friend count is displayed somewhere accessible.
8. **E2E tests** -- No dedicated E2E tests exist for the friends page. Need Playwright tests for core friend management flows.

## Tasks / Subtasks

- [x] Task 1: Audit existing friends page against ACs (AC: #1, #2, #3)
  - [x] 1.1: Run the app and manually verify friends page renders with display name, rating, and online indicator for each friend
  - [x] 1.2: Verify presence tracking initializes in root layout on auth (`joinLobby` call in `+layout.svelte`)
  - [x] 1.3: Verify real-time presence updates: open two browser tabs with different users, confirm online/offline status updates reactively
  - [x] 1.4: Verify online friends sort to top via `sortFriendsByOnline`
  - [x] 1.5: Document any gaps found

- [x] Task 2: Fix gaps in friends page UI per UX spec (AC: #1, #3)
  - [x] 2.1: If rating not shown on friend items, add rating display from `FriendListItem.rating` (show "Chwa xep hang" if null)
  - [x] 2.2: Ensure friends are visually grouped into sections: Online Friends, Offline Friends, Pending Requests (per UX spec)
  - [x] 2.3: Verify online indicator uses green dot styling (`--color-player-online` or equivalent)
  - [x] 2.4: Verify mobile layout uses single column cards with collapsible sections
  - [x] 2.5: If "last active" display is missing and feasible, add it (or document as out-of-scope for MVP)

- [x] Task 3: Verify friend request lifecycle (AC: #4, #5)
  - [x] 3.1: Verify send friend request works from friends page search AND from `/@username` profile page
  - [x] 3.2: Verify incoming requests show accept/decline buttons
  - [x] 3.3: Verify accepting uses `create_or_accept_friendship` RPC and friend appears in list
  - [x] 3.4: Verify declining removes the request
  - [x] 3.5: Verify optimistic UI updates work correctly (no stale state)

- [x] Task 4: Verify remove friend flow (AC: #6)
  - [x] 4.1: Verify "Remove Friend" button exists and shows confirmation dialog
  - [x] 4.2: Verify confirmation deletes friendship via server action
  - [x] 4.3: Verify friend is removed from list immediately (optimistic)

- [x] Task 5: E2E Testing
  - [x] 5.1: E2E test: navigate to friends page, verify friends list loads with names and online status
  - [x] 5.2: E2E test: search for user, send friend request, verify it appears in sent requests
  - [x] 5.3: E2E test: accept incoming friend request, verify friend appears in list
  - [x] 5.4: E2E test: remove friend, verify confirmation dialog and removal
  - [x] 5.5: E2E test: verify presence updates (two users, one goes online/offline)

- [x] Task 6: Unit test gaps (if any found during audit)
  - [x] 6.1: Add any missing unit tests discovered during Tasks 1-4
  - [x] 6.2: Verify all existing tests pass: `pnpm vitest run` in app directory

## Dev Notes

### Architecture Patterns (MUST FOLLOW)

- **Framework**: SvelteKit with Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
- **Pattern**: Core + reactive wrapper: imperative logic in `*-core.ts`, Svelte reactivity in `*.svelte.ts`
- **Server actions**: Return `{ success, data?, error? }` via SvelteKit form actions — never throw
- **Error format**: `return fail(statusCode, { errors: { form: 'errorKey' }, action: 'actionName' })`
- **Vietnamese UI only**: All user-facing text in Vietnamese. No English strings in UI.
- **No barrel exports**: Direct imports only
- **DB naming**: snake_case everywhere (columns, properties, no camelCase transformation)
- **Tests co-located**: `*.test.ts` next to source files
- **Skeleton screens**: Use skeletons, NEVER spinners for page/route loads
- **No Zustand**: Architecture doc mentions Zustand (written for Next.js) but actual app uses SvelteKit server loaders + Svelte 5 runes. Do NOT introduce Zustand stores.

### CRITICAL: Reuse Existing Code (DO NOT RECREATE)

| Need | Existing Solution | Location |
|------|-------------------|----------|
| Friends list query | `getFriendsList()` | `src/lib/friends/queries.ts` |
| Pending requests | `getPendingIncomingRequests()`, `getPendingSentRequests()` | `src/lib/friends/queries.ts` |
| Send friend request | `sendFriendRequest()` | `src/lib/friends/queries.ts` |
| Accept/decline/cancel | `acceptFriendRequest()`, `declineFriendRequest()`, `cancelSentRequest()` | `src/lib/friends/queries.ts` |
| Remove friend | `removeFriend()` | `src/lib/friends/queries.ts` |
| User search | `searchUsers()` | `src/lib/friends/queries.ts` |
| Online presence | `joinLobby()`, `leaveLobby()`, `isUserOnline()`, `getOnlineUsers()` | `src/lib/friends/presence.svelte.ts` (reactive) / `presence-core.ts` (core) |
| Online sorting | `sortFriendsByOnline()` | `src/lib/friends/sort.ts` |
| Canonical pair | `canonicalPair()` | `src/lib/friends/queries.ts` |
| Display name sanitize | `sanitizeName()` | `src/lib/friends/queries.ts` |
| Challenge dialog | `FriendChallengeDialog` | `src/lib/components/FriendChallengeDialog.svelte` |
| DB friendship RPC | `create_or_accept_friendship` | `supabase/migrations/006_create_or_accept_friendship.sql` |
| Friendship types | `FriendListItem`, `PendingRequestItem`, `RelationshipStatus` | `src/lib/friends/types.ts` |

### Presence System Architecture

The presence system uses a **two-layer design**:
1. **Core** (`presence-core.ts`): Plain JS, handles Supabase Presence channel (`lobby`), manages `Set<string>` of online user IDs, exponential backoff reconnect (1s base, 30s max)
2. **Svelte wrapper** (`presence.svelte.ts`): Svelte 5 `$state` runes for reactive updates, syncs via `_setStateChangeCallback`

**Initialization**: Root layout (`src/routes/+layout.svelte` lines 96-109) calls `joinLobby(supabase, userId)` when authenticated, `leaveLobby()` on logout. Cleanup via `beforeunload` event.

**Channel**: Single shared `online` Supabase Presence channel. All authenticated users track on this channel. The friends page reads from `getOnlineUsers()` and filters to show only friends' online status.

### UX Specification (from ux-design-specification.md)

**Friends Management layout:**
- Sections: Online Friends (with "Thach dau"), Offline Friends, Pending Requests (accept/decline)
- Each row: avatar, name, rating, online status, last active
- Actions: Challenge (online), View Profile, Remove (inline confirmation)
- Invite link generator: "Moi ban be" (shareable URL, clipboard)
- Mobile: single column cards, sections collapsible
- Online indicator: green dot (`--color-player-online`)
- FriendCard component: Avatar, name, rating, online status, "Thach dau" (online) / disabled (offline). Pending variant: accept/decline. Remove: inline confirmation.

### Database Schema Reference

**friendships table** (`002_friendships.sql`):
- `id` UUID PK, `user_a`/`user_b` UUID FK to profiles (canonical: user_a < user_b)
- `status`: 'pending' | 'accepted' | 'blocked'
- `initiated_by`: UUID (who sent request)
- `created_at`, `updated_at`: timestamptz
- RLS: users see own friendships, can only insert if initiating, recipients can accept pending, users can delete own
- Indexes on user_a, user_b, status, initiated_by

**profiles table** (`001_profiles.sql` + `018_profiles_rating_and_friend_color.sql` + `024_profiles_usernames.sql`):
- `display_name`, `username` (stable lowercase), `avatar_url`, `locale`, `settings_json`, `rating` (nullable integer), `created_at`

### Previous Story Learnings (from 5-1 Player Profiles)

- **Stable usernames**: Story 5.1 introduced `profiles.username` (lowercase, unique) via migration 024. Use `username` for URL routing, not `display_name`.
- **`/@username` rewriting**: `src/hooks.ts` reroutes `/@username` to `/user/profile/username`. Internal links should use `/@username` format.
- **Rating display**: Show "Chwa xep hang" when `profiles.rating` is null. Glicko-2 system planned for Epic 6.
- **CommandCenter loading**: Real loading content renders through `CommandCenter.svelte` — use this for skeleton states.
- **Vietnamese-only UI**: All profile text uses Vietnamese translations via i18n system.
- **Optimistic state**: Add Friend button switches to pending immediately (optimistic), confirmed by server response.
- **RLS caution**: RLS can silently return 0 rows. Always test with real Supabase auth.
- **E2E login helper**: Use the hardened login helper that tolerates dev-server reloads.
- **Test count**: 785 tests green at end of 5.1. Do not break existing tests.

### Git Intelligence (recent commits)

- `177ec0d` Complete story 5.1 player profiles — 23 files changed, +1381/-137
- `472be94` Add local Supabase agent wrapper
- `b34b1b7` Fix invite link accept regressions
- Story 5.1 added: `src/hooks.ts` (reroute), `024_profiles_usernames.sql`, profile page enhancements, FriendChallengeDialog improvements
- Pattern: tests co-located, comprehensive E2E, server actions return `fail()` format

### Project Structure Notes

- Friends lib: `src/lib/friends/` (queries.ts, types.ts, presence-core.ts, presence.svelte.ts, sort.ts)
- Friends page: `src/routes/user/friends/` (+page.svelte, +page.server.ts)
- Profile routes: `src/routes/user/profile/` (own) and `src/routes/user/profile/[username]/` (public)
- Root layout: `src/routes/+layout.svelte` (presence init)
- Auth guard: `src/routes/user/+layout.server.ts` (public profiles exempted)
- The `(app)` layout handles navigation shell (sidebar desktop, bottom bar mobile)
- Challenge dialog: `src/lib/components/FriendChallengeDialog.svelte`

### Key Risk: This Story May Be Mostly Done

Most of the friends page functionality was built during Epic 4. The primary work for this story is:
1. **Verification** that all ACs are met with existing code
2. **Polish** — ensure UX spec compliance (sections, mobile layout, rating display)
3. **E2E tests** — no dedicated friends page E2E tests exist yet
4. **Gap filling** — any minor missing features found during audit

Do NOT over-engineer or rebuild what works. Focus on verification-first, fix only what's actually broken or missing.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Realtime Channels, FR22-27, Zustand Stores]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Friends Management, FriendCard]
- [Source: supabase/migrations/002_friendships.sql]
- [Source: supabase/migrations/006_create_or_accept_friendship.sql]
- [Source: apps/cotulenh/app/src/lib/friends/queries.ts]
- [Source: apps/cotulenh/app/src/lib/friends/presence-core.ts]
- [Source: apps/cotulenh/app/src/lib/friends/presence.svelte.ts]
- [Source: apps/cotulenh/app/src/routes/user/friends/+page.svelte]
- [Source: apps/cotulenh/app/src/routes/user/friends/+page.server.ts]
- [Source: _bmad-output/implementation-artifacts/5-1-player-profiles.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- **Task 1 Audit (2026-03-30):** Presence system fully working (joinLobby/leaveLobby in root layout, reactive getOnlineUsers, sortFriendsByOnline). Gaps found: (1) rating not displayed on friend items, (2) hardcoded English "accept"/"decline"/"cancel" buttons instead of i18n keys, (3) no Online/Offline section grouping per UX spec, (4) no "Chwa xep hang" for null rating, (5) "last active" out of scope — no last_seen data.
- **Task 2 Fix (2026-03-30):** Added rating display on friend items (shows numeric rating or "Chưa xếp hạng"), split friends list into Online/Offline sections per UX spec, fixed hardcoded English accept/decline/cancel buttons to use i18n keys. Added `friends.section.online` and `friends.section.offline` i18n keys.
- **Tasks 3-4 Verification (2026-03-30):** Friend request lifecycle verified: send from search and profile page, accept/decline with optimistic UI, remove with confirmation dialog. All working correctly.
- **Task 5 E2E (2026-03-30):** Created comprehensive E2E test suite: friends list rendering, search + send request, accept incoming request, remove friend with confirmation, and presence updates with two browser contexts.
- **Task 6 Unit tests (2026-03-30):** All 785 existing tests pass. No unit test gaps found — existing coverage is comprehensive (55 friends-specific tests).
- **Review Fixes (2026-03-30):** Switched friends-page mutations back to server actions, added username search support on the friends page, corrected offline status-dot styling, and upgraded mobile friend rows into single-column cards. Extended E2E coverage for username search and `/@username` profile-page friend requests.

### Change Log

- 2026-03-30: Added rating display and "Chưa xếp hạng" for unrated friends on friends page
- 2026-03-30: Split friends list into Online/Offline sections per UX spec
- 2026-03-30: Fixed hardcoded English accept/decline/cancel buttons to use i18n translations
- 2026-03-30: Added i18n keys: friends.section.online, friends.section.offline
- 2026-03-30: Added E2E test suite for friends page (5 tests)
- 2026-03-30: Added username search support and restored server-action mutation flow on the friends page
- 2026-03-30: Updated mobile friend rows to render as single-column cards and fixed offline status indicator styling
- 2026-03-30: Expanded friends E2E coverage for username search and `/@username` profile friend requests

### File List

- `src/routes/user/friends/+page.svelte` (modified) — rating display, Online/Offline sections, i18n button fixes
- `src/lib/friends/queries.ts` (modified) — username-aware player search for friends-page lookup
- `src/lib/friends/queries.test.ts` (modified) — coverage for username-aware friend search behavior
- `src/lib/i18n/types.ts` (modified) — added friends.section.online, friends.section.offline keys
- `src/lib/i18n/locales/en.ts` (modified) — added English translations for section headers
- `src/lib/i18n/locales/vi.ts` (modified) — added Vietnamese translations for section headers
- `e2e/friends-page.spec.ts` (modified) — E2E tests for friends page, username search, and `/@username` profile requests
