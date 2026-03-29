# Story 5.1: Player Profiles

Status: done

## Story

As a player,
I want to view my own and other players' profiles showing their rating, game count, and history,
So that I can see my progress and learn about my opponents.

## Acceptance Criteria

1. **Given** a player navigates to `/@username` (or `/profile/[username]`)
   **When** the page loads
   **Then** the profile displays the player's display name, current Glicko-2 rating (or "Unrated" if no rated games), total game count, and join date
   **And** a list of recent games is shown with opponent, result, and date
   **And** the page is in Vietnamese

2. **Given** a player navigates to `/@username` via the URL
   **When** the SvelteKit hooks process the request
   **Then** `/@username` is rewritten to `/user/profile/username` internally
   **And** direct navigation to `/user/profile/username` redirects to `/@username` for canonical URL consistency

3. **Given** a player views their own profile
   **When** the page loads
   **Then** additional options are shown (e.g., link to settings)
   **And** the profile data matches their authenticated session

4. **Given** a player views another player's profile
   **When** the page loads
   **Then** an "Add Friend" button is shown if they are not already friends
   **And** a "Challenge" button is shown if the player is online

5. **Given** the profile page is loading
   **When** data is being fetched
   **Then** skeleton screens are displayed for all profile sections

## Existing Code Analysis

### CRITICAL: Significant infrastructure already exists. Do NOT reinvent.

**SvelteKit app (`apps/cotulenh/app/`) is the target** — all 4 previous epics were built here. The Next.js `web/` app is separate and NOT the target.

#### Already Implemented (DO NOT RECREATE):
- **Own profile page**: `src/routes/user/profile/+page.svelte` (257 lines) — display name editing
- **Public profile page**: `src/routes/user/profile/[username]/+page.svelte` (230 lines) — public view with game history
- **Server loaders**: `src/routes/user/profile/+page.server.ts` and `[username]/+page.server.ts`
- **Profile validation**: `src/routes/user/profile/validation.ts`
- **Friends query layer**: `src/lib/friends/queries.ts` (351 lines) — searchUsers, sendFriendRequest, getFriendsList, etc.
- **Friends types**: `src/lib/friends/types.ts` — FriendshipStatus, RelationshipStatus, etc.
- **Presence system**: `src/lib/friends/presence.svelte.ts` + `presence-core.ts` — online/offline tracking via Supabase Presence
- **Friends sort**: `src/lib/friends/sort.ts` — online-first sorting
- **Friends page**: `src/routes/user/friends/+page.svelte` (496 lines)
- **Friends server**: `src/routes/user/friends/+page.server.ts` (241 lines, 7 server actions)
- **DB schema**: `001_profiles.sql` (profiles table with display_name, avatar_url, locale, settings_json, created_at)
- **DB schema**: `002_friendships.sql` (friendships table with canonical user_a/user_b ordering, status enum)
- **DB schema**: `018_profiles_rating_and_friend_color.sql` (added rating column to profiles)
- **Layout auth guard**: `src/routes/user/+layout.server.ts` — public profiles exempted from auth

#### What Needs To Be Built/Enhanced:
1. **`/@username` URL rewriting** — Not implemented. Add SvelteKit hooks-based rewrite.
2. **Rating display** — Profile rating column exists but may not be populated/displayed for Glicko-2. Show "Unrated" if null.
3. **Game count** — Needs aggregation from games table. Not currently shown on profile.
4. **Join date** — `profiles.created_at` exists. Verify it's displayed.
5. **"Add Friend" button on public profiles** — Verify presence/absence; add if missing.
6. **"Challenge" button on public profiles** — Needs online presence check + challenge dialog integration.
7. **Skeleton screens** — Add loading states for profile sections.
8. **Recent games list** — Verify completeness (opponent, result, date). May need enhancement.

## Tasks / Subtasks

- [x] Task 1: `/@username` URL rewriting (AC: #2)
  - [x] 1.1: Add reroute hook in `src/hooks.ts` (or `hooks.server.ts`) to rewrite `/@username` → `/user/profile/username`
  - [x] 1.2: Add redirect from `/user/profile/[username]` → `/@username` for canonical URL consistency
  - [x] 1.3: Update all internal links to use `/@username` format
  - [x] 1.4: Unit test the hook rewrite logic

- [x] Task 2: Enhance public profile page (AC: #1, #4)
  - [x] 2.1: Add Glicko-2 rating display (use `profiles.rating` column, show "Chưa xếp hạng" if null)
  - [x] 2.2: Add total game count (aggregate from `games` table where user is red_player or blue_player)
  - [x] 2.3: Verify join date (`created_at`) is displayed; add if missing
  - [x] 2.4: Verify recent games list shows opponent, result, and date; enhance if incomplete
  - [x] 2.5: Add "Thêm bạn" (Add Friend) button — check relationship status via `queries.ts`, show only if not already friends
  - [x] 2.6: Add "Thách đấu" (Challenge) button — show only if player is online (check via presence system)
  - [x] 2.7: Wire Challenge button to `FriendChallengeDialog` (already exists from Epic 4)

- [x] Task 3: Enhance own profile page (AC: #3)
  - [x] 3.1: Verify settings link is present; add if missing (link to `/user/settings`)
  - [x] 3.2: Show same stats as public profile (rating, game count, join date)
  - [x] 3.3: Ensure profile data matches authenticated session

- [x] Task 4: Skeleton screens (AC: #5)
  - [x] 4.1: Add skeleton loading states for profile header (name, rating, stats)
  - [x] 4.2: Add skeleton loading states for recent games list
  - [x] 4.3: Use Svelte 5 `{#await}` blocks or `$state` loading flags

- [x] Task 5: Testing
  - [x] 5.1: Unit tests for `/@username` hook rewrite/redirect logic
  - [x] 5.2: Unit tests for game count aggregation query
  - [x] 5.3: Unit tests for relationship status check on profile (friend/not-friend/pending)
  - [x] 5.4: E2E test: navigate to `/@username`, verify profile data loads
  - [x] 5.5: E2E test: view own profile, verify settings link and stats
  - [x] 5.6: E2E test: view other's profile, verify Add Friend and Challenge buttons

## Dev Notes

### Architecture Patterns (MUST FOLLOW)

- **Framework**: SvelteKit with Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
- **Pattern**: Core + reactive wrapper: imperative logic in `*-core.ts`, Svelte reactivity in `*.svelte.ts`
- **Server actions**: Return `{ success, data?, error? }` — never throw
- **Error format**: `return fail(statusCode, { errors: { form: 'errorKey' }, action: 'actionName' })`
- **Vietnamese UI only**: All user-facing text in Vietnamese. No English strings in UI.
- **No barrel exports**: Direct imports only
- **DB naming**: snake_case everywhere (columns, properties, no camelCase transformation)
- **Tests co-located**: `*.test.ts` next to source files

### Reuse Existing Code (DO NOT RECREATE)

| Need | Existing Solution | Location |
|------|-------------------|----------|
| Friend request | `sendFriendRequest()` | `src/lib/friends/queries.ts` |
| Relationship check | `searchUsers()` returns relationship status | `src/lib/friends/queries.ts` |
| Online presence | `isUserOnline()` | `src/lib/friends/presence-core.ts` |
| Challenge dialog | `FriendChallengeDialog` | Exists from Epic 4 (story 4-2) |
| Profile data | `profiles` table with rating, display_name | `001_profiles.sql`, `018_profiles_rating_and_friend_color.sql` |
| Friendship DB func | `create_or_accept_friendship` RPC | `006_create_or_accept_friendship.sql` |
| Canonical friend pair | `canonicalPair()` | `src/lib/friends/queries.ts` |
| Display name sanitize | `sanitizeName()` | `src/lib/friends/queries.ts` |

### `/@username` Rewriting — Implementation Guide

SvelteKit provides the `reroute` hook in `src/hooks.ts` for URL rewriting:

```typescript
// src/hooks.ts
import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = ({ url }) => {
  const match = url.pathname.match(/^\/@([^/]+)$/);
  if (match) {
    return `/user/profile/${match[1]}`;
  }
};
```

For canonical redirect (prevent `/user/profile/username` direct access):
- In `src/routes/user/profile/[username]/+page.server.ts`, check if the request URL is NOT `/@username` and redirect to `/@username` using `redirect(301, ...)`.
- The `reroute` hook changes internal routing but the original URL is preserved in the browser.

### Game Count Query

Query `games` table for count where user is participant:
```sql
SELECT count(*) FROM games
WHERE (red_player = $1 OR blue_player = $1)
AND status NOT IN ('started', 'aborted')
```
Add this to the profile server loader. Consider caching this count on the profiles table if performance becomes an issue.

### Rating Display

- `profiles.rating` column (integer, nullable) was added in migration 018
- Show as "Chưa xếp hạng" (Unrated) when null
- Show numeric value when present
- Glicko-2 system is planned for Epic 6 — for now, display whatever is in the `rating` column

### Online Presence for Challenge Button

The presence system (`presence-core.ts`) uses a shared Supabase Presence channel named `online`. To check if a specific user is online:
1. Import presence functionality from `src/lib/friends/presence-core.ts`
2. Use `isUserOnline(userId)` to check
3. Only show "Thách đấu" button if the user is online AND they are not the current user

### Previous Story Learnings (from Epic 4)

- **Atomic operations**: Use RPC functions for multi-step DB operations
- **Non-blocking side effects**: Friendship creation during game accept was made non-blocking — follow same pattern
- **Toast behavior**: Actionable toasts persist 30s, non-actionable auto-dismiss 3s
- **SECURITY DEFINER RPCs**: Used for sensitive operations (e.g., `claim_link_invitation`)
- **RLS policies**: Always test with real Supabase auth — RLS can silently return 0 rows
- **Login helper for E2E**: Use the hardened login helper that tolerates dev-server reloads

### Project Structure Notes

- Profile routes: `src/routes/user/profile/` (own) and `src/routes/user/profile/[username]/` (public)
- Friends lib: `src/lib/friends/` (queries, types, presence, sort)
- Friends page: `src/routes/user/friends/`
- Layout auth guard: `src/routes/user/+layout.server.ts` (exempts public profiles)
- The `(app)` layout in the SvelteKit app handles navigation shell (sidebar desktop, bottom bar mobile)
- Auth check uses `requireAuth()` guard pattern

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture, FR22-27]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Profile Screen, Friends Management]
- [Source: supabase/migrations/001_profiles.sql]
- [Source: supabase/migrations/002_friendships.sql]
- [Source: supabase/migrations/018_profiles_rating_and_friend_color.sql]
- [Source: apps/cotulenh/app/src/routes/user/profile/[username]/+page.svelte]
- [Source: apps/cotulenh/app/src/lib/friends/queries.ts]
- [Source: apps/cotulenh/app/src/lib/friends/presence-core.ts]
- [Source: _bmad-output/implementation-artifacts/4-3-invite-links-auto-friend.md]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- No blocking issues encountered during implementation

### Completion Notes List
- **Task 1**: Created `src/hooks.ts` with `reroute` hook for `/@username` → `/user/profile/username` rewriting. Added 301 redirect in `[username]/+page.server.ts` for canonical URL consistency. Updated layout auth guard to allow `/@username` routes for unauthenticated visitors.
- **Task 2**: Enhanced public profile page with Glicko-2 rating display ("Chưa xếp hạng" when null), "Thêm bạn" (Add Friend) button with relationship status check, "Thách đấu" (Challenge) button with online presence check via FriendChallengeDialog. Game count and history were already present. Added server actions for `sendRequest` and `sendChallenge`.
- **Task 3**: Enhanced own profile to show real game stats (was hardcoded to 0), rating display, and settings link to `/user/settings`.
- **Task 4**: Added skeleton loading snippets with pulse animation for both own and public profile pages.
- **Review fixes**: Replaced mutable `display_name` routing with stable lowercase `profiles.username`, canonicalized public profile URLs, made skeleton snippets render through `CommandCenter`, kept both profile pages explicitly Vietnamese, and fixed the optimistic Add Friend state to switch to pending immediately.
- **Task 5**: Added coverage for reroute behavior, relationship branches, and profile loading states. Full app verification now passes with 785 tests green, and `svelte-check` reports 0 errors and 0 warnings.

### Change Log
- 2026-03-30: Implemented Story 5.1 — Player Profiles with `/@username` URL rewriting, rating display, Add Friend/Challenge buttons, skeleton screens, and comprehensive tests.
- 2026-03-30: Addressed code review findings by introducing stable usernames, real loading-state rendering, fixed Vietnamese-only profile copy, and expanded public profile tests.

### File List
- `apps/cotulenh/app/src/hooks.ts` (NEW) — reroute hook for `/@username`
- `apps/cotulenh/app/src/hooks.test.ts` (NEW) — 6 unit tests for reroute hook
- `supabase/migrations/024_profiles_usernames.sql` (NEW) — stable lowercase usernames with backfill and trigger support
- `apps/cotulenh/app/src/lib/types/database.ts` (MODIFIED) — added `profiles.username`
- `apps/cotulenh/app/src/lib/components/CommandCenter.svelte` (MODIFIED) — real loading content rendering
- `apps/cotulenh/app/src/lib/components/FriendChallengeDialog.svelte` (MODIFIED) — injectable translator for forced Vietnamese copy
- `apps/cotulenh/app/src/routes/user/profile/[username]/+page.server.ts` (MODIFIED) — added rating, relationship, redirect, server actions
- `apps/cotulenh/app/src/routes/user/profile/[username]/+page.svelte` (MODIFIED) — rating, Add Friend, Challenge, skeleton
- `apps/cotulenh/app/src/routes/user/profile/[username]/page.server.test.ts` (MODIFIED) — updated for new data shape, added tests
- `apps/cotulenh/app/src/routes/user/profile/[username]/page.svelte.test.ts` (NEW) — component coverage for optimistic Add Friend and skeleton states
- `apps/cotulenh/app/src/routes/user/profile/[username]/page.svelte.test.stub.svelte` (NEW) — narrow dialog stub used by page component test
- `apps/cotulenh/app/src/routes/user/profile/+page.server.ts` (MODIFIED) — added real game stats, rating
- `apps/cotulenh/app/src/routes/user/profile/+page.svelte` (MODIFIED) — rating display, settings link, skeleton
- `apps/cotulenh/app/src/routes/user/profile/page.server.test.ts` (MODIFIED) — updated mocks for games query
- `apps/cotulenh/app/src/routes/user/+layout.server.ts` (MODIFIED) — added `/@username` pattern to public profile check
- `apps/cotulenh/app/src/routes/user/layout.server.test.ts` (MODIFIED) — added test for `/@username` auth bypass
- `apps/cotulenh/app/src/lib/i18n/types.ts` (MODIFIED) — added profile translation keys
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` (MODIFIED) — added Vietnamese translations
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` (MODIFIED) — added English translations
- `apps/cotulenh/app/e2e/player-profiles.spec.ts` (NEW) — 3 E2E tests for profile features
- `apps/cotulenh/app/vite.config.ts` (MODIFIED) — Vitest resolver updated for Svelte package export conditions
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED) — status: done
- `_bmad-output/implementation-artifacts/5-1-player-profiles.md` (MODIFIED) — completion record and review-fix notes
