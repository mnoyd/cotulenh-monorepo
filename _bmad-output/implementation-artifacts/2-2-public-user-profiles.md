# Story 2.2: Public User Profiles

Status: review

## Story

As a user,
I want to view another user's public profile and game history,
so that I can learn about other players on the platform.

## Acceptance Criteria

### AC1: Public Profile Display (FR9)

```gherkin
Given any user (authenticated or visitor) navigates to /user/profile/[username]
When the page loads
Then they see the target user's display name, member since date, and game statistics
And game statistics (games played, wins, losses) default to 0 until Epic 5
```

### AC2: User Not Found

```gherkin
Given a user navigates to a profile for a username that doesn't exist
When the page loads
Then they see a "user not found" message with a recovery action (e.g., go back or go home)
```

### AC3: Game History Placeholder

```gherkin
Given the public profile page
When rendered
Then it shows a placeholder section for game history (populated when Epic 6 is complete)
And the placeholder follows the EmptyState pattern with descriptive text
```

### AC4: Responsive Layout

```gherkin
Given a user views a public profile
When on mobile (< 768px) → single-column full-width card layout
When on tablet (768-1024px) → two-column layout
When on desktop (> 1024px) → multi-column layout, max 1200px container
```

### AC5: Bilingual Support

```gherkin
Given a user views a public profile
Then all labels and messages are displayed in the active language (EN/VI)
```

### AC6: Accessibility (WCAG 2.1 AA)

```gherkin
Given a user interacts with the public profile page
Then semantic HTML with proper heading hierarchy is used
And focus indicators are visible (2px outline)
And touch targets are minimum 44x44px on mobile
```

## Tasks / Subtasks

- [x] Task 1: Resolve auth guard for public route (AC: 1)
  - [x] 1.1 Modify `/user/+layout.server.ts` to conditionally skip `requireAuth` for `/user/profile/[username]` paths
  - [x] 1.2 Update the layout server test to cover the new conditional logic

- [x] Task 2: Public profile server load (AC: 1, 2)
  - [x] 2.1 Create `/user/profile/[username]/+page.server.ts` with load function
  - [x] 2.2 Look up profile from `profiles` table by `display_name` matching `params.username` (URL-decoded)
  - [x] 2.3 Return profile data (display_name, created_at, avatar_url) plus placeholder stats (0s)
  - [x] 2.4 If no profile found, throw SvelteKit `error(404, ...)` to trigger global `+error.svelte`

- [x] Task 3: Public profile page UI (AC: 1, 3, 4, 6)
  - [x] 3.1 Create `/user/profile/[username]/+page.svelte` — read-only profile display
  - [x] 3.2 Reuse layout structure from Story 2.1: identity card (avatar placeholder, display name, member since) + stats card
  - [x] 3.3 Add game history placeholder section with EmptyState pattern (descriptive text, no action button yet)
  - [x] 3.4 Responsive layout: mobile single-column, tablet/desktop two-column (same breakpoints as Story 2.1)
  - [x] 3.5 No form actions, no editing UI — this is a read-only page

- [x] Task 4: i18n translations (AC: 5)
  - [x] 4.1 Add public profile translation keys to `$lib/i18n/types.ts`
  - [x] 4.2 Add English translations to `$lib/i18n/locales/en.ts`
  - [x] 4.3 Add Vietnamese translations to `$lib/i18n/locales/vi.ts`

- [x] Task 5: Tests (AC: all)
  - [x] 5.1 Load function tests: profile found, profile not found (404), works without auth
  - [x] 5.2 Auth guard tests: verify `/user/profile/[username]` paths bypass requireAuth
  - [x] 5.3 Updated layout server test for conditional guard logic

## Dev Notes

### Critical Architecture Patterns (MUST FOLLOW)

**Tech Stack:**

- SvelteKit + Svelte 5 runes (`$state`, `$derived`, `$effect`) - NEVER use Svelte 4 stores
- Tailwind 4 for styling (or scoped `<style>` blocks following Story 2.1 pattern)
- lucide-svelte for icons
- `@supabase/ssr` for server client

**Supabase Client Access:**

- Server: `event.locals.supabase` (created per-request in hooks.server.ts)
- ALWAYS destructure `{ data, error }` and handle error before using data
- Use `@cotulenh/common` logger for error logging — never raw `console.log`

**This is a READ-ONLY page — no form actions, no DOMPurify, no validation schemas.**

### Auth Guard Resolution (CRITICAL)

The current `/user/+layout.server.ts` calls `requireAuth()` for ALL `/user/*` routes. This blocks unauthenticated visitors from `/user/profile/[username]`.

**Required fix:** Modify `user/+layout.server.ts` to conditionally skip auth:

```typescript
// apps/cotulenh/app/src/routes/user/+layout.server.ts
import { requireAuth } from '$lib/auth/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Public profile routes are accessible without authentication (AC1, architecture.md line 263)
  const isPublicProfile = /^\/user\/profile\/[^/]+$/.test(url.pathname);
  if (isPublicProfile) return;

  await requireAuth(locals, url);
};
```

The architecture doc (line 263) explicitly marks `/user/profile/[username]` as "Public" while `/user/profile` (own profile) remains "Protected".

**Test update needed:** The existing `user/layout.server.test.ts` must be updated to test:

1. Protected routes still redirect to login (existing behavior)
2. Public profile routes (`/user/profile/SomeName`) do NOT redirect (new behavior)

### Profile Lookup Pattern

**Database query:** Look up by `display_name` since the `profiles` table has no `username` column:

```typescript
const { data: profileData, error } = await supabase
  .from('profiles')
  .select('display_name, avatar_url, created_at')
  .eq('display_name', decodeURIComponent(params.username))
  .single();
```

**URL encoding note:** Display names can contain Vietnamese characters and spaces. The URL param will be URL-encoded by the browser. Use `decodeURIComponent(params.username)` before querying.

**User not found:** If `profileData` is null or there's an error, throw `error(404, { message: 'User not found' })` from `@sveltejs/kit`. This triggers the global `+error.svelte` page which already handles 404s with i18n and a "go back" action.

### Page UI Pattern (Reuse Story 2.1)

The public profile page should mirror Story 2.1's visual layout but as read-only:

**Identity Card (left panel at md+):**

- Avatar placeholder (User icon, 80px circle)
- Display name (text only, no edit button)
- Member since date (formatted via `toLocaleDateString`)

**Stats Card (right panel at md+):**

- Same 3-column grid: Games Played, Wins, Losses (all 0s)
- Same responsive collapse at 480px

**Game History Placeholder (below stats):**

- New section card below the stats card
- EmptyState pattern: icon + descriptive text like "Game history will appear here"
- No action button yet (Epic 6 will populate this)

**CSS:** Reuse the same custom properties (`--theme-bg-panel`, `--theme-text-primary`, etc.) and similar class names. Copy the relevant styles from Story 2.1's `+page.svelte` `<style>` block rather than importing — each component owns its styles.

### i18n Keys to Add

```typescript
// Public profile namespace
'profile.public.title': string;           // "{username}'s Profile" / "Hồ sơ của {username}"
'profile.public.gameHistory.title': string; // "Game History" / "Lịch sử trận đấu"
'profile.public.gameHistory.empty': string; // "No games played yet" / "Chưa có trận đấu nào"
'profile.public.notFound': string;          // "User not found" / "Không tìm thấy người dùng"
```

**Reuse existing keys where possible:** `profile.memberSince`, `profile.stats.title`, `profile.stats.gamesPlayed`, `profile.stats.wins`, `profile.stats.losses` — these are generic enough to share between own profile and public profile.

### Existing Code to Reuse (DO NOT REINVENT)

1. **Root layout data:** `+layout.server.ts` already fetches session/user — available via `$page.data`
2. **Auth guard:** `$lib/auth/guards.ts` — `requireAuth()` already exists, just needs conditional bypass
3. **Global error page:** `+error.svelte` handles 404 with i18n — use `error(404, ...)` for user not found
4. **Story 2.1 layout patterns:** Copy the CSS/layout structure from `/user/profile/+page.svelte`
5. **i18n system:** `getI18n()` from `$lib/i18n/index.svelte` — follow existing key patterns
6. **Icons:** `User`, `Trophy`, `Swords`, `XCircle` from `lucide-svelte` (same as Story 2.1)
7. **CSS custom properties:** `--theme-bg-panel`, `--theme-text-primary`, `--theme-border`, etc.
8. **Responsive breakpoints:** `768px` (tablet), `480px` (small mobile) — same as Story 2.1

### Common Mistakes to Prevent

1. **DO NOT** add auth checks in the public profile load function — this route is PUBLIC
2. **DO NOT** forget to modify `user/+layout.server.ts` — without this fix, unauthenticated visitors get redirected to login
3. **DO NOT** create form actions — this is a read-only page
4. **DO NOT** use `user!.id` or assume user is authenticated
5. **DO NOT** create a new Supabase client — use `event.locals.supabase`
6. **DO NOT** use Svelte 4 stores (`writable`, `readable`) — use Svelte 5 runes only
7. **DO NOT** use `console.log` — use `@cotulenh/common` logger
8. **DO NOT** forget `decodeURIComponent` on the URL param before Supabase query
9. **DO NOT** hardcode strings — all user-facing text through i18n
10. **DO NOT** forget Vietnamese translation for all new keys

### Project Structure Notes

**New files to create:**

```
apps/cotulenh/app/src/routes/user/profile/[username]/
  +page.server.ts     ← Public profile load (no auth, lookup by display_name)
  +page.svelte        ← Public profile UI (read-only)
  page.server.test.ts ← Load function tests
```

**Files to modify:**

```
apps/cotulenh/app/src/routes/user/+layout.server.ts    ← Conditional auth bypass
apps/cotulenh/app/src/routes/user/layout.server.test.ts ← Test conditional guard
apps/cotulenh/app/src/lib/i18n/types.ts                ← Add public profile keys
apps/cotulenh/app/src/lib/i18n/locales/en.ts           ← Add English translations
apps/cotulenh/app/src/lib/i18n/locales/vi.ts           ← Add Vietnamese translations
```

**Files to verify (NOT modify unless needed):**

```
apps/cotulenh/app/src/routes/+error.svelte             ← Already handles 404 with i18n
apps/cotulenh/app/src/routes/+layout.server.ts         ← Root layout loads session/profile
```

### Testing Strategy

Follow Story 2.1 patterns (co-located test files, mock Supabase client):

**`[username]/page.server.test.ts` must cover:**

1. Returns profile data when display_name exists (happy path)
2. Throws 404 error when display_name not found
3. Works without authentication (no redirect, no session required)
4. Returns correct data shape: `{ profileDetail, stats }`
5. Handles Supabase errors gracefully
6. Handles URL-encoded display names (decodes before query)

**`user/layout.server.test.ts` updates:**

1. Existing tests still pass (protected routes redirect)
2. New test: `/user/profile/SomeName` does NOT redirect (public)
3. New test: `/user/profile/` (own profile, no username param) DOES redirect (protected)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2 — AC and requirements]
- [Source: \_bmad-output/planning-artifacts/architecture.md#Route Structure — /user/profile/[username] is Public]
- [Source: _bmad-output/planning-artifacts/architecture.md#RLS — profiles public read, owner update]
- [Source: \_bmad-output/planning-artifacts/architecture.md#Project Structure — [username]/ directory]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#EmptyState, Loading, Responsive]
- [Source: apps/cotulenh/app/src/routes/user/profile/+page.server.ts — Story 2.1 load/action pattern]
- [Source: apps/cotulenh/app/src/routes/user/profile/+page.svelte — Story 2.1 UI/layout pattern]
- [Source: apps/cotulenh/app/src/routes/user/+layout.server.ts — requireAuth guard to modify]
- [Source: apps/cotulenh/app/src/lib/auth/guards.ts — requireAuth implementation]
- [Source: apps/cotulenh/app/src/routes/+error.svelte — global 404 error page]
- [Source: _bmad-output/implementation-artifacts/2-1-display-name-own-profile.md — previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Task 1: Modified `user/+layout.server.ts` to conditionally bypass `requireAuth` for `/user/profile/[username]` paths using regex. Returns `{}` instead of void for proper TypeScript typing. Added 3 new tests (public profile allowed, own profile still protected, URL-encoded names).
- Task 2: Created `[username]/+page.server.ts` with load function that queries `profiles` by `display_name` (URL-decoded via `decodeURIComponent`). Throws `error(404)` when profile not found or on DB error. Returns same data shape as Story 2.1 (profileDetail + placeholder stats).
- Task 3: Created `[username]/+page.svelte` — read-only public profile with identity card (avatar placeholder, display name, member since), stats card (3-column grid), and game history placeholder (EmptyState pattern with Clock icon). Reuses Story 2.1 responsive breakpoints (768px tablet, 480px mobile). No form actions or editing UI.
- Task 4: Added 3 public profile i18n keys to types.ts, en.ts, vi.ts (`profile.public.title`, `profile.public.gameHistory.title`, `profile.public.gameHistory.empty`). Reuses existing `profile.memberSince`, `profile.stats.*` keys.
- Task 5: 9 new tests total (6 load function + 3 layout guard). All 141 project tests pass. No type errors introduced (only 4 pre-existing env var errors).

### File List

**Created:**

- `apps/cotulenh/app/src/routes/user/profile/[username]/+page.server.ts`
- `apps/cotulenh/app/src/routes/user/profile/[username]/+page.svelte`
- `apps/cotulenh/app/src/routes/user/profile/[username]/page.server.test.ts`

**Modified:**

- `apps/cotulenh/app/src/routes/user/+layout.server.ts` — conditional auth bypass for public profile routes
- `apps/cotulenh/app/src/routes/user/layout.server.test.ts` — 3 new tests for conditional guard logic
- `apps/cotulenh/app/src/lib/i18n/types.ts` — added 3 public profile translation keys
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` — added English public profile translations
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — added Vietnamese public profile translations
