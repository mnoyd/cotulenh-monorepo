# Story 3.1: User Search & Send Friend Request

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to search for other players by display name and send them a friend request,
So that I can connect with people I want to play with.

## Acceptance Criteria

### AC1: User Search by Display Name

```gherkin
Given an authenticated user on the friends page
When they type a display name in the search field (minimum 2 characters)
Then they see matching users (partial match, case-insensitive) with their display name and a "Send Request" button (FR12)
And the search is debounced (300ms delay before server query)
And results appear in a dropdown below the input — no separate results page
```

### AC2: Send Friend Request

```gherkin
Given a user finds someone in search results
When they click "Send Request"
Then a friendships row is created with status = 'pending' and initiated_by set to the sender (FR13)
And a toast confirms "Friend request sent" (auto-dismiss 4s)
And the button changes to "Pending" optimistically
```

### AC3: Prevent Duplicate Requests

```gherkin
Given a user searches for someone they've already sent a request to
When the results load
Then the button shows "Pending" instead of "Send Request"
```

### AC4: Already Friends Indicator

```gherkin
Given a user searches for someone who is already their friend
When the results load
Then the button shows "Friends" instead of "Send Request"
```

### AC5: No Self-Friending

```gherkin
Given a user searches for their own display name
When the results load
Then their own profile is excluded from search results
```

### AC6: Empty State

```gherkin
Given an authenticated user on the friends page with no friends
When the page loads
Then they see "No friends yet" with an inline search input and prompt "Search for players"
```

### AC7: Search Empty State

```gherkin
Given a user searches and no matching users are found
When the results load
Then they see "No players found" with "Check the spelling or try a different name"
```

### AC8: Bilingual Support

```gherkin
Given a user views the friends page
Then all labels, buttons, and error messages are displayed in the active language (EN/VI)
```

### AC9: Accessibility (WCAG 2.1 AA)

```gherkin
Given a user interacts with the friends page
Then all form fields have visible labels with aria associations
And focus indicators are visible (2px outline)
And touch targets are minimum 44x44px on mobile
And screen readers announce search results and toast notifications
```

## Tasks / Subtasks

- [x] Task 1: Database migration — friendships table (AC: all)
  - [x] 1.1 Create `supabase/migrations/002_friendships.sql`
  - [x] 1.2 Define table: `id` (uuid PK), `user_a` (uuid FK → profiles), `user_b` (uuid FK → profiles), `status` (text: pending/accepted/blocked), `initiated_by` (uuid FK → profiles), `created_at` (timestamptz), `updated_at` (timestamptz)
  - [x] 1.3 Constraint: `user_a < user_b` to enforce canonical ordering (prevent duplicate rows for same pair)
  - [x] 1.4 Unique constraint on `(user_a, user_b)`
  - [x] 1.5 Enable RLS: users can only read/write rows where they are `user_a` or `user_b`
  - [x] 1.6 Create indexes on `user_a`, `user_b`, and `status`

- [x] Task 2: Friends lib module (AC: 2, 3, 4, 5)
  - [x] 2.1 Create `$lib/friends/types.ts` — FriendshipRow, FriendshipStatus, FriendSearchResult types
  - [x] 2.2 Create `$lib/friends/queries.ts` — searchUsers(query, currentUserId), sendFriendRequest(fromUserId, toUserId), getFriendshipStatus(userA, userB)
  - [x] 2.3 searchUsers: query `profiles.display_name` with `ilike` filter, exclude self, join with friendships to determine relationship status per result
  - [x] 2.4 sendFriendRequest: insert into friendships with canonical `user_a < user_b` ordering, set `initiated_by`
  - [x] 2.5 Transform `snake_case` DB columns to `camelCase` at query boundary

- [x] Task 3: Friends page route and server load (AC: 1, 6, 7)
  - [x] 3.1 Create `/user/friends/+page.server.ts` with load function
  - [x] 3.2 Load current user's friends list (friendships where status = 'accepted') with display names from profiles join
  - [x] 3.3 Create search action: accept query string, return matching profiles with friendship status
  - [x] 3.4 Create sendRequest action: validate, insert friendship, return success/error

- [x] Task 4: Friends page UI (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9)
  - [x] 4.1 Create `/user/friends/+page.svelte`
  - [x] 4.2 Search input with debounced (300ms) client-side fetch to search action
  - [x] 4.3 Search results dropdown showing display name + relationship button (Send Request / Pending / Friends)
  - [x] 4.4 Friends list section showing accepted friends with display name
  - [x] 4.5 Empty state: "No friends yet" + "Search for players" with inline search
  - [x] 4.6 Optimistic update: button changes immediately on send, reverts on error
  - [x] 4.7 Responsive layout: mobile full-width cards, tablet two-column, desktop three-column

- [x] Task 5: Shared components (AC: 9)
  - [x] 5.1 Create `$lib/components/PlayerCard.svelte` — avatar (initial letter), display name, action button slot
  - [x] 5.2 Create `$lib/components/OnlineIndicator.svelte` — green dot / no dot (prepared for Story 3.3, hidden for now)

- [x] Task 6: i18n translations (AC: 8)
  - [x] 6.1 Add friends translation keys to `$lib/i18n/types.ts`
  - [x] 6.2 Add English translations to `$lib/i18n/locales/en.ts`
  - [x] 6.3 Add Vietnamese translations to `$lib/i18n/locales/vi.ts`

- [x] Task 7: Tests (AC: all)
  - [x] 7.1 Migration test: verify table, constraints, RLS policies (via SQL review — RLS policies in migration file)
  - [x] 7.2 Query tests: searchUsers returns correct results with relationship status, sendFriendRequest creates row with canonical ordering
  - [x] 7.3 Server action tests: search action, sendRequest action (success, duplicate, self-request)
  - [x] 7.4 Validation edge cases: minimum 2 chars for search, self-exclusion

- [x] Task 8: Navigation integration (AC: 1)
  - [x] 8.1 Add "Friends" link to sidebar navigation in `+layout.svelte` pointing to `/user/friends`
  - [x] 8.2 Add i18n keys for nav.friends

## Dev Notes

### Critical Architecture Patterns (MUST FOLLOW)

**Tech Stack:**

- SvelteKit + Svelte 5 runes (`$state`, `$derived`, `$effect`) - NEVER use Svelte 4 stores
- Tailwind 4 for styling
- bits-ui for headless UI components (Alert Dialog for destructive actions)
- Zod for validation (client + server)
- DOMPurify for sanitization of display names in search results
- svelte-sonner for toast notifications
- lucide-svelte for icons
- `@supabase/ssr` for server client, `@supabase/supabase-js` for browser client

**Supabase Client Access:**

- Server: `event.locals.supabase` (created per-request in hooks.server.ts)
- Browser: `$page.data.supabase` (created in +layout.ts)
- ALWAYS destructure `{ data, error }` and handle error before using data

**Auth State Access:**

- Session user: `$page.data.user` (from +layout.server.ts)
- Profile: `$page.data.profile` (from +layout.server.ts)
- Auth guard: `/user/+layout.server.ts` already protects all `/user/*` routes

**Friendships Table — Canonical Ordering:**

The friendships table uses a `user_a < user_b` constraint to ensure each user pair has exactly one row. When inserting or querying:

```typescript
const [userA, userB] = [userId1, userId2].sort();
// Always use sorted order for insert/query
```

**DB Column Naming:**

- Tables: `snake_case`, plural (`friendships`)
- Columns: `snake_case` (`user_a`, `user_b`, `initiated_by`)
- Transform to `camelCase` at query boundary in `$lib/friends/queries.ts`

**Search Pattern:**

```typescript
// Debounced search — 300ms delay, minimum 2 characters
const { data } = await supabase
  .from('profiles')
  .select('id, display_name')
  .ilike('display_name', `%${query}%`)
  .neq('id', currentUserId)
  .limit(10);
```

### Existing Code to Reuse (DO NOT REINVENT)

1. **Auth guard**: `/user/+layout.server.ts` already has `requireAuth` — friends page inherits this
2. **Root layout data**: `+layout.server.ts` already fetches `profile.displayName`
3. **Supabase clients**: Already configured in `hooks.server.ts` and `+layout.ts`
4. **i18n system**: `getI18n()` from `$lib/i18n/index.svelte` — follow existing key patterns
5. **DOMPurify**: Already installed — sanitize display names in search results
6. **Toast**: svelte-sonner already available
7. **Form patterns**: See `/auth/register/+page.svelte` and `/user/profile/+page.svelte`

### Security Requirements

- RLS enforces `auth.uid() = user_a OR auth.uid() = user_b` for all friendship operations
- DOMPurify sanitization on display names rendered in search results
- No user enumeration — search only returns display names, not emails or IDs exposed to UI
- Self-friend prevention at both client and server level
- Rate limit consideration: debounce prevents excessive search queries

### Common Mistakes to Prevent

1. **DO NOT** create a new Supabase client — use `event.locals.supabase` (server) or `$page.data.supabase` (browser)
2. **DO NOT** use Svelte 4 stores (`writable`, `readable`) — use Svelte 5 runes only
3. **DO NOT** use `console.log` — use `@cotulenh/common` logger
4. **DO NOT** render display names without DOMPurify sanitization
5. **DO NOT** skip server-side validation (client validation is UX only)
6. **DO NOT** use relative imports (`../../../`) — use `$lib/` alias
7. **DO NOT** hardcode strings — all user-facing text must go through i18n
8. **DO NOT** store friendships without canonical `user_a < user_b` ordering
9. **DO NOT** use stored procedures or RPC — all business logic in TypeScript
10. **DO NOT** forget to exclude self from search results

### Project Structure Notes

**New files to create:**

```
supabase/migrations/
  002_friendships.sql              ← Friendships table + RLS + indexes

apps/cotulenh/app/src/lib/friends/
  types.ts                         ← Friendship types
  queries.ts                       ← Friendship CRUD queries

apps/cotulenh/app/src/lib/components/
  PlayerCard.svelte                ← Shared player display component
  OnlineIndicator.svelte           ← Online status dot (hidden until Story 3.3)

apps/cotulenh/app/src/routes/user/friends/
  +page.server.ts                  ← Load friends + search/sendRequest actions
  +page.svelte                     ← Friends page UI
  page.server.test.ts              ← Server action tests
```

**Files to modify:**

```
apps/cotulenh/app/src/routes/+layout.svelte    ← Add Friends nav link
apps/cotulenh/app/src/lib/i18n/types.ts        ← Add friends keys
apps/cotulenh/app/src/lib/i18n/locales/en.ts   ← Add English translations
apps/cotulenh/app/src/lib/i18n/locales/vi.ts   ← Add Vietnamese translations
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3 - Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schema, #RLS Policies, #Component Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Friends Page, #Search Pattern, #Empty States]
- [Source: _bmad-output/planning-artifacts/prd.md#FR12, #FR13, #NFR10, #NFR12]

## Dev Agent Record

### Completion Notes

All 8 tasks implemented. 199 tests pass (23 test files), no regressions. Type check shows only pre-existing errors (missing `.env` vars for `PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/002_friendships.sql` | Friendships table, RLS policies, indexes |
| `apps/cotulenh/app/src/lib/friends/types.ts` | Friendship type definitions |
| `apps/cotulenh/app/src/lib/friends/queries.ts` | searchUsers, sendFriendRequest, getFriendsList, canonicalPair |
| `apps/cotulenh/app/src/lib/components/PlayerCard.svelte` | Shared player display component |
| `apps/cotulenh/app/src/lib/components/OnlineIndicator.svelte` | Online status dot (hidden until Story 3.3) |
| `apps/cotulenh/app/src/routes/user/friends/+page.server.ts` | Load friends + search/sendRequest actions |
| `apps/cotulenh/app/src/routes/user/friends/+page.svelte` | Friends page UI |
| `apps/cotulenh/app/src/lib/friends/queries.test.ts` | Unit tests for friends queries |
| `apps/cotulenh/app/src/routes/user/friends/page.server.test.ts` | Server action tests |

### Files Modified

| File | Change |
|------|--------|
| `apps/cotulenh/app/src/routes/+layout.svelte` | Added Friends nav link (sidebar + mobile menu) |
| `apps/cotulenh/app/src/lib/i18n/types.ts` | Added 24 friends translation keys |
| `apps/cotulenh/app/src/lib/i18n/locales/en.ts` | Added English friends translations |
| `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` | Added Vietnamese friends translations |
| `apps/cotulenh/app/src/routes/user/settings/page.server.test.ts` | Fixed test for schema validation compatibility |
