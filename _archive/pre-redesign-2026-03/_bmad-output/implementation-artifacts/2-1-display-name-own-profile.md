# Story 2.1: Display Name & Own Profile

Status: done

## Story

As an authenticated user,
I want to set my display name and view my profile summary,
so that I have an identity on the platform and can see my stats.

## Acceptance Criteria

### AC1: Own Profile Page Displays Summary

```gherkin
Given an authenticated user navigates to /user/profile
When the page loads
Then they see their display name (editable), member since date, and game statistics
And game statistics (games played, wins, losses) default to 0 until Epic 5
```

### AC2: Display Name Update

```gherkin
Given a user edits their display name on the profile page
When they enter a valid name (3-50 characters) and save
Then the profiles table is updated via Supabase
And the new name appears immediately (optimistic update)
And a toast confirms "Display name saved" (auto-dismiss 4s)
```

### AC3: Display Name Validation

```gherkin
Given a user enters a display name
When the input is < 3 or > 50 characters
Then an inline error appears below the field
And the save button is disabled
And validation runs on blur and on submit
```

### AC4: Display Name Sanitization (NFR12)

```gherkin
Given a user enters a display name with HTML/script tags
When they submit
Then the input is sanitized via DOMPurify before storage
And only clean text is saved to the database
```

### AC5: Responsive Layout

```gherkin
Given a user views their profile
When on mobile (< 768px) → single-column full-width card layout
When on tablet (768-1024px) → two-column layout
When on desktop (> 1024px) → multi-column layout, max 1200px container
```

### AC6: Bilingual Support

```gherkin
Given a user views their profile
Then all labels, buttons, and error messages are displayed in the active language (EN/VI)
And Vietnamese characters are accepted in display names
```

### AC7: Accessibility (WCAG 2.1 AA)

```gherkin
Given a user interacts with the profile page
Then all form fields have visible labels with aria associations
And focus indicators are visible (2px outline)
And touch targets are minimum 44x44px on mobile
And screen readers announce toast notifications via aria-live="polite"
```

## Tasks / Subtasks

- [x] Task 1: Database migration verification (AC: all)
  - [x] 1.1 Verify profiles table has all required columns (display_name, avatar_url, locale, settings_json, created_at, updated_at) - these should already exist from Epic 1
  - [x] 1.2 Verify RLS policies: public SELECT, owner-only UPDATE
  - [x] 1.3 If any columns missing, create migration in `supabase/migrations/` — NOT NEEDED, all columns exist

- [x] Task 2: Profile page route and server load (AC: 1, 5)
  - [x] 2.1 Create `/user/profile/+page.server.ts` with load function
  - [x] 2.2 Load profile from `profiles` table using `event.locals.supabase` and session user ID
  - [x] 2.3 Return profile data (display_name, created_at, avatar_url) plus placeholder stats (games_played: 0, wins: 0, losses: 0)

- [x] Task 3: Display name update action (AC: 2, 3, 4)
  - [x] 3.1 Create Zod validation schema for display name (min 3, max 50, same constraints as registration)
  - [x] 3.2 Create form action in `+page.server.ts` for display name update
  - [x] 3.3 Validate server-side with Zod, sanitize with DOMPurify
  - [x] 3.4 Update `profiles.display_name` via Supabase, return success/error

- [x] Task 4: Profile page UI component (AC: 1, 2, 3, 5, 7)
  - [x] 4.1 Create `/user/profile/+page.svelte` with profile summary card
  - [x] 4.2 Display: display name (editable), member since date, game stats (0s)
  - [x] 4.3 Implement inline display name editing with Zod client-side validation on blur
  - [x] 4.4 Implement optimistic update pattern for display name save
  - [x] 4.5 Show toast via svelte-sonner on successful save
  - [x] 4.6 Show skeleton loading state on initial page load — deferred (no async data fetch needed; server-rendered)
  - [x] 4.7 Responsive layout: mobile single-column, tablet two-column, desktop multi-column

- [x] Task 5: i18n translations (AC: 6)
  - [x] 5.1 Add profile translation keys to `$lib/i18n/types.ts`
  - [x] 5.2 Add English translations to `$lib/i18n/locales/en.ts`
  - [x] 5.3 Add Vietnamese translations to `$lib/i18n/locales/vi.ts`

- [x] Task 6: Tests (AC: all)
  - [x] 6.1 Validation schema tests (display name min/max/sanitization)
  - [x] 6.2 Form action tests (success, validation error, Supabase error)
  - [x] 6.3 Load function tests (authenticated user, profile data shape)

- [x] Task 7: Navigation integration (AC: 1)
  - [x] 7.1 Verify "Profile" link in nav dropdown points to `/user/profile` — already correct
  - [x] 7.2 Update if currently pointing elsewhere — NOT NEEDED

## Dev Notes

### Critical Architecture Patterns (MUST FOLLOW)

**Tech Stack:**

- SvelteKit + Svelte 5 runes (`$state`, `$derived`, `$effect`) - NEVER use Svelte 4 stores
- Tailwind 4 for styling
- bits-ui for headless UI components
- Zod for validation (client + server)
- DOMPurify for sanitization
- svelte-sonner for toast notifications
- lucide-svelte for icons
- `@supabase/ssr` for server client, `@supabase/supabase-js` for browser client

**Supabase Client Access:**

- Server: `event.locals.supabase` (created per-request in hooks.server.ts)
- Browser: `$page.data.supabase` (created in +layout.ts)
- ALWAYS destructure `{ data, error }` and handle error before using data

**Auth State Access:**

- Session user: `$page.data.user` (from +layout.server.ts)
- Profile: `$page.data.profile` (from +layout.server.ts - already fetches display_name)
- The root layout already loads profile with display_name - leverage this

**Form Action Pattern (established in Epic 1):**

```typescript
// +page.server.ts
export const actions: Actions = {
  default: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) redirect(303, '/auth/login');

    const formData = await request.formData();
    const displayName = String(formData.get('displayName') ?? '');

    // Validate with Zod
    const result = schema.safeParse({ displayName });
    if (!result.success) return fail(400, { errors, displayName });

    // Sanitize + update
    const clean = DOMPurify.sanitize(result.data.displayName, { ALLOWED_TAGS: [] });
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: clean, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) return fail(500, { errors: { form: 'updateFailed' }, displayName });
    return { success: true };
  }
};
```

**Progressive Enhancement:**

- Forms must work without JavaScript (SvelteKit form actions + `use:enhance`)
- Initialize form fields from server data: `$page.form` for post-submission state
- Preserve user input on validation errors

**Validation Pattern (established in registration):**

- Zod schema with message codes (not translated strings)
- Client-side validation on blur via `handleBlur(field)` pattern
- Server-side validation as security net
- Error messages translated via i18n: `i18n.t('profile.validation.displayNameMinLength')`

### Existing Code to Reuse (DO NOT REINVENT)

1. **Auth guard**: `/user/+layout.server.ts` already has `requireAuth` - profile page inherits this
2. **Root layout data**: `+layout.server.ts` already fetches `profile.displayName` - use for initial state
3. **Supabase clients**: Already configured in `hooks.server.ts` and `+layout.ts`
4. **i18n system**: `getI18n()` from `$lib/i18n/index.svelte` - follow existing key patterns
5. **Registration validation**: `displayName` Zod schema in `/auth/register/validation.ts` - extract or share
6. **DOMPurify**: Already installed and used in `+layout.svelte` for display name sanitization
7. **Toast**: svelte-sonner already available - check existing usage patterns
8. **Form component patterns**: See `/auth/register/+page.svelte` for the canonical form pattern with touched/clientErrors state

### Security Requirements

- RLS enforces `auth.uid() = id` for profile updates - no server-side auth bypass possible
- DOMPurify sanitization on display name (strip ALL HTML tags)
- No user enumeration concerns for profile (own profile only, requires auth)
- Open redirect prevention already handled by auth guards
- Display name is user-generated content - always sanitize before rendering (already done in +layout.svelte with DOMPurify)

### UX Specifications

**Display Name Edit:**

- Show current display name in editable field (not placeholder)
- Real-time validation on blur: red border + inline error if invalid
- Save button: primary teal, disabled when invalid or submitting
- Loading state: spinner replaces button text during submission
- On success: toast "Display name saved" (bottom-right desktop, bottom-center mobile), auto-dismiss 4s
- On server error: revert to previous name, show error message, preserve typed value

**Profile Summary Card:**

- Display name (editable with edit button or inline editing)
- Member since: formatted date from `created_at` (e.g., "Joined March 2026")
- Games Played: 0 (placeholder until Epic 5)
- Wins: 0 (placeholder until Epic 5)
- Losses: 0 (placeholder until Epic 5)

**Loading States:**

- Skeleton shapes matching profile card layout (no spinners for page load)
- Pulse animation for loads > 500ms

**Responsive Wireframes:**

Mobile (< 768px):

```
[Profile Card - full width]
  [Avatar placeholder]
  Display Name [Edit]
  Member since: Mar 2026
  Games: 0 | W: 0 | L: 0
```

Desktop (> 1024px):

```
[Left Panel 30%]     [Center Panel 70%]
  Avatar             Stats & Future Tabs
  Display Name       Games: 0
  [Edit]             Wins: 0
  Member since       Losses: 0
```

### i18n Keys to Add

```typescript
// Profile namespace
'profile.title': string;
'profile.displayName.label': string;
'profile.displayName.placeholder': string;
'profile.displayName.saved': string;
'profile.displayName.edit': string;
'profile.memberSince': string;
'profile.stats.gamesPlayed': string;
'profile.stats.wins': string;
'profile.stats.losses': string;
'profile.validation.displayNameRequired': string;
'profile.validation.displayNameMinLength': string;
'profile.validation.displayNameMaxLength': string;
'profile.error.updateFailed': string;
```

### Testing Strategy

Follow Epic 1 patterns:

- Co-located test files: `validation.test.ts`, `+page.server.test.ts`
- Mock Supabase client with `vi.fn()`
- Test validation schema edge cases (min/max length, HTML tags, Vietnamese chars)
- Test form action: success path, validation failure, Supabase error
- Test load function: returns correct profile shape
- Never mock the function being tested (H2 fix from Story 1.1)

### Common Mistakes to Prevent

1. **DO NOT** create a new Supabase client - use `event.locals.supabase` (server) or `$page.data.supabase` (browser)
2. **DO NOT** use Svelte 4 stores (`writable`, `readable`) - use Svelte 5 runes only
3. **DO NOT** use `console.log` - use `@cotulenh/common` logger
4. **DO NOT** render display names without DOMPurify sanitization
5. **DO NOT** skip server-side validation (client validation is UX only)
6. **DO NOT** use relative imports (`../../../`) - use `$lib/` alias
7. **DO NOT** create profile pages without checking the root layout already provides profile data
8. **DO NOT** hardcode strings - all user-facing text must go through i18n
9. **DO NOT** forget Vietnamese character support in display name validation (allow Unicode)
10. **DO NOT** create separate validation schema if registration's can be shared/imported

### Project Structure Notes

**New files to create:**

```
apps/cotulenh/app/src/routes/user/profile/
  +page.server.ts     ← Load profile + update action
  +page.svelte        ← Profile page UI
  validation.ts       ← Display name Zod schema (or import from shared)
  validation.test.ts  ← Schema tests
  page.server.test.ts ← Action/load tests
```

**Files to modify:**

```
apps/cotulenh/app/src/lib/i18n/types.ts    ← Add profile keys
apps/cotulenh/app/src/lib/i18n/locales/en.ts ← Add English translations
apps/cotulenh/app/src/lib/i18n/locales/vi.ts ← Add Vietnamese translations
```

**Files to verify (NOT modify unless needed):**

```
apps/cotulenh/app/src/routes/+layout.svelte  ← Profile link in nav (verify points to /user/profile)
apps/cotulenh/app/src/routes/+layout.server.ts ← Already loads profile.displayName
apps/cotulenh/app/src/routes/user/+layout.server.ts ← Already has requireAuth guard
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2 - Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schema, #Auth Architecture, #Component Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Profile Page, #Form Validation, #Display Name]
- [Source: _bmad-output/planning-artifacts/prd.md#FR7, #FR8, #NFR12]
- [Source: apps/cotulenh/app/src/routes/auth/register/validation.ts - displayName schema pattern]
- [Source: apps/cotulenh/app/src/routes/auth/register/+page.svelte - form with validation pattern]
- [Source: apps/cotulenh/app/src/routes/+layout.server.ts - profile data loading pattern]
- [Source: apps/cotulenh/app/src/routes/+layout.svelte - DOMPurify display name usage]
- [Source: apps/cotulenh/app/src/lib/auth/guards.ts - requireAuth pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Task 1: DB migration verified — all columns and RLS policies already exist from Epic 1
- Task 2: Created `+page.server.ts` with load function fetching profile (display_name, avatar_url, created_at) + placeholder stats (0s)
- Task 3: Created `validation.ts` with Zod displayName schema (3-50 chars). Form action validates with Zod, sanitizes with DOMPurify `{ ALLOWED_TAGS: [] }`, updates via Supabase
- Task 4: Created `+page.svelte` with identity card (avatar placeholder, editable display name, member since) and stats card. Responsive layout with media queries. Uses `use:enhance` for progressive enhancement, `$state`/`$derived` runes, svelte-sonner toast on success
- Task 5: Added 17 profile i18n keys to types.ts, en.ts, vi.ts (includes Vietnamese translations)
- Task 6: 23 tests total (12 validation + 11 server). All 132 project tests pass
- Task 7: Nav already links to `/user/profile` in both desktop and mobile menus — no change needed
- Task 4.6 (skeleton loading): Deferred — page is server-rendered, no async client fetch requiring skeleton state

### Code Review Fixes (2026-03-01)

- **H1 fixed**: Edit button touch target increased from 32px to 44px minimum (`size="icon"` + `min-width/min-height: 44px`)
- **M1 fixed**: Added client-side validation on submit in `use:enhance` callback (AC3 compliance)
- **M2 fixed**: Replaced `user!.id` non-null assertion with proper `if (!user) redirect(303, '/auth/login')` guard
- **M3 fixed**: Added DOMPurify sanitization verification test — confirms `sanitize()` called with `{ ALLOWED_TAGS: [] }` (AC4)
- **M4 fixed**: Added `@media (max-width: 480px)` breakpoint to stack stats grid on small mobile screens

### File List

**Created:**

- `apps/cotulenh/app/src/routes/user/profile/validation.ts`
- `apps/cotulenh/app/src/routes/user/profile/+page.server.ts`
- `apps/cotulenh/app/src/routes/user/profile/+page.svelte`
- `apps/cotulenh/app/src/routes/user/profile/validation.test.ts`
- `apps/cotulenh/app/src/routes/user/profile/page.server.test.ts`

**Modified:**

- `apps/cotulenh/app/src/lib/i18n/types.ts` — added 17 profile translation keys
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` — added English profile translations
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — added Vietnamese profile translations
