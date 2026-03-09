# Story 1.3: Auth-Aware Navigation & Logout

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to see my identity in the navigation and sign out from any page,
So that I can manage my session and visitors can still access public features.

## Acceptance Criteria

1. **AC-1: Authenticated User Identity in Navigation** — Given an authenticated user on any page, when the page renders, then the navigation shows their display name (from `profiles.display_name`) or email fallback and a sign-out option. The display name is obtained from the `profiles` table via a server-side query in the root layout; if the profile fetch fails or the user has no profile row, fall back to `user.email`. User-generated display names MUST be sanitized with DOMPurify before rendering.

2. **AC-2: User Menu Dropdown** — Given an authenticated user on any page, when they click their avatar/name area in the navigation, then a dropdown menu appears with links to Profile (`/user/profile`), Settings (`/user/settings`), and a Sign Out action. The dropdown uses bits-ui DropdownMenu, consistent with the existing mobile hamburger menu pattern.

3. **AC-3: Sign Out** — Given an authenticated user clicks the sign-out action, when the action completes, then the Supabase session is destroyed server-side via a form action (POST to `/auth/logout`), the auth cookies are cleared, and the user is redirected to the home page (`/`). Sign-out MUST use a server-side form action (not a client-side-only `supabase.auth.signOut()`) to ensure cookies are properly cleared even without JavaScript.

4. **AC-4: Visitor Navigation (Unauthenticated)** — Given a visitor (not logged in) on any page, when the navigation renders, then they see a "Sign In" link/button pointing to `/auth/login` instead of the user menu. No display name, no user dropdown, no sign-out option.

5. **AC-5: Public Route Access** — Given a visitor navigates to `/learn/*`, `/play`, `/board-editor`, or `/` (home), when the page loads, then they can access these features without being redirected to login (FR6). No auth guards on these routes.

6. **AC-6: Protected Route Guards — `/user/*`** — Given a visitor (not logged in) navigates to any route under `/user/*` (profile, settings, friends, history), when the page loads on the server, then they are redirected to `/auth/login?redirectTo=/user/...` with the original path preserved as a query parameter. The `redirectTo` parameter MUST be validated as a relative path to prevent open redirect attacks.

7. **AC-7: Protected Route Guards — `/play/online/*`** — Given a visitor navigates to any route under `/play/online/*` (except `/play/online/invite/[code]` which is public), when the page loads on the server, then they are redirected to `/auth/login?redirectTo=/play/online/...` with the same open redirect prevention.

8. **AC-8: Responsive Auth UI** — Given the navigation layout rendered on mobile (< 768px) and desktop (>= 768px), when the auth-aware elements are displayed, then:
   - **Desktop:** The user menu (avatar/name + dropdown) appears in the sidebar footer area, replacing or augmenting the existing Settings/Shortcuts buttons.
   - **Mobile:** The user identity and sign-out option appear within the hamburger dropdown menu, with a separator between navigation links and auth actions.
   - Both layouts follow existing visual patterns (44px touch targets, theme variables, sidebar/hamburger design).

9. **AC-9: i18n Coverage** — All new navigation text (Sign In, Sign Out, Profile, Settings menu items, user greeting) displays correctly in both EN and VI. New keys added to `en.ts`, `vi.ts`, and `types.ts`.

10. **AC-10: Auth Guard Helper Utility** — An `$lib/auth/guards.ts` utility module provides reusable functions: `requireAuth(event)` that checks `event.locals` for a session and returns a redirect to `/auth/login?redirectTo=...` if unauthenticated, and `isRelativePath(path)` for open redirect prevention. These are used by protected route layouts rather than duplicating redirect logic.

## Tasks / Subtasks

- [ ] Task 1: Create auth guard utility (AC: 6, 7, 10)
  - [ ] 1.1 Create `src/lib/auth/guards.ts` with:
    - `isRelativePath(path: string): boolean` — validates path starts with `/`, does not start with `//`, and does not contain `://`
    - `requireAuth(locals, url): redirect | null` — checks `locals.safeGetSession()` for a valid user; if unauthenticated, returns `redirect(303, '/auth/login?redirectTo=...')` with the current pathname (validated via `isRelativePath`); if authenticated, returns `null`
  - [ ] 1.2 Create `src/lib/auth/guards.test.ts` with tests for:
    - `isRelativePath`: valid relative paths, absolute URLs rejected, protocol-relative URLs rejected, paths with `://` rejected
    - `requireAuth`: unauthenticated user redirects to login with redirectTo, authenticated user returns null, redirectTo uses current URL pathname

- [ ] Task 2: Create logout server action (AC: 3)
  - [ ] 2.1 Create `src/routes/auth/logout/+page.server.ts` with a form action that:
    - Calls `event.locals.supabase.auth.signOut()` to destroy the server-side session
    - Redirects to `/` on completion
    - Logs errors via `@cotulenh/common` logger but still redirects (fail-safe: user always gets logged out from their perspective)
  - [ ] 2.2 Create `src/routes/auth/logout/page.server.test.ts` with tests for:
    - Successful sign-out redirects to home
    - Sign-out error still redirects to home (graceful degradation)

- [ ] Task 3: Create `/user/*` protected layout (AC: 6)
  - [ ] 3.1 Create `src/routes/user/+layout.server.ts` that:
    - Calls the `requireAuth` guard helper
    - If user is unauthenticated, redirects to `/auth/login?redirectTo=...`
    - If authenticated, passes through (returns empty or session data)
  - [ ] 3.2 Create placeholder `src/routes/user/+page.svelte` (simple "User Dashboard" placeholder — actual pages are future stories)
  - [ ] 3.3 Create `src/routes/user/layout.server.test.ts` with tests for:
    - Unauthenticated visitor is redirected to login with correct redirectTo
    - Authenticated user passes through without redirect

- [ ] Task 4: Create `/play/online/*` protected layout (AC: 7)
  - [ ] 4.1 Create `src/routes/play/online/+layout.server.ts` that:
    - Calls the `requireAuth` guard helper
    - Same redirect logic as `/user/*`
  - [ ] 4.2 Create placeholder `src/routes/play/online/+page.svelte` (simple "Online Play" placeholder — actual pages are future stories)
  - [ ] 4.3 Create `src/routes/play/online/layout.server.test.ts` with tests for:
    - Unauthenticated visitor is redirected to login with correct redirectTo
    - Authenticated user passes through without redirect

- [ ] Task 5: Fetch display name in root layout (AC: 1)
  - [ ] 5.1 Update `src/routes/+layout.server.ts` to:
    - After getting `session` and `user` from `safeGetSession()`, if user is authenticated, query `profiles` table for `display_name` where `id = user.id`
    - Return `profile: { displayName }` alongside existing `session`, `user`, `cookies`
    - If profile query fails, return `profile: null` (email fallback handled in UI)
  - [ ] 5.2 Update `src/app.d.ts` `PageData` interface to include `profile: { displayName: string } | null`

- [ ] Task 6: Update layout navigation to be auth-aware (AC: 1, 2, 3, 4, 8, 9)
  - [ ] 6.1 Update `src/routes/+layout.svelte` desktop sidebar to:
    - Add a user section in the sidebar footer (above or replacing existing items)
    - If authenticated: show display name (sanitized with DOMPurify, email fallback), user avatar placeholder (first letter of display name), and a bits-ui DropdownMenu with Profile, Settings, Sign Out
    - If unauthenticated: show a "Sign In" link pointing to `/auth/login`
    - Sign Out uses a `<form method="POST" action="/auth/logout">` with `use:enhance` for the button
    - Preserve existing Shortcuts and Settings buttons (Settings dialog remains for theme/gameplay settings; the new Settings nav link goes to `/user/settings` for account settings)
  - [ ] 6.2 Update `src/routes/+layout.svelte` mobile hamburger menu to:
    - Add auth-aware section with separator
    - If authenticated: show display name, Profile link, Settings link, Sign Out form button
    - If unauthenticated: show "Sign In" link
  - [ ] 6.3 Import and use new i18n keys for all auth navigation text
  - [ ] 6.4 Ensure 44px minimum touch targets for all new interactive elements
  - [ ] 6.5 Use existing CSS custom properties (`--theme-*`) for all new styles

- [ ] Task 7: Add i18n keys (AC: 9)
  - [ ] 7.1 Add new keys to `src/lib/i18n/types.ts`:
    - `nav.signIn`, `nav.signOut`, `nav.profile`, `nav.accountSettings`, `nav.userMenu`
    - `auth.logout.signingOut` (loading state)
  - [ ] 7.2 Add English translations to `src/lib/i18n/locales/en.ts`
  - [ ] 7.3 Add Vietnamese translations to `src/lib/i18n/locales/vi.ts`

- [ ] Task 8: Public route access verification (AC: 5)
  - [ ] 8.1 Verify `/learn/*`, `/play`, `/board-editor`, `/` load without auth redirect when not logged in
  - [ ] 8.2 Verify these routes still work when logged in (no regressions)
  - [ ] 8.3 Verify `/auth/register` and `/auth/login` remain accessible to visitors

- [ ] Task 9: Regression verification (AC: all)
  - [ ] 9.1 All existing app tests pass (50+ tests)
  - [ ] 9.2 `turbo build`, `turbo lint`, `turbo check-types`, `turbo test` all pass
  - [ ] 9.3 Registration flow still works
  - [ ] 9.4 Login flow still works (Story 1.2 — if completed)
  - [ ] 9.5 Anonymous access to all public routes unaffected

## Dev Notes

### Critical Patterns from Stories 1.1 & 1.2 (MUST FOLLOW)

**Svelte 5 Runes — MANDATORY:**

- All client-side state: `$state()`, `$derived()`, `$effect()`
- Component props: `$props()` and `$bindable()`
- NO Svelte 4 stores from `svelte/store`
- Reactive class pattern: `.svelte.ts` extension

**Supabase Client Pattern:**

- Browser client via `$page.data.supabase` (created in `+layout.ts`)
- Server client via `event.locals.supabase` (created per-request in `hooks.server.ts`)
- Never create Supabase clients directly in components
- Always destructure `{ data, error }` from every Supabase call

**safeGetSession() — already implemented in `hooks.server.ts`:**

```typescript
// getUser() hits Supabase server-side; getSession() alone only reads local JWT
// NEVER trust getSession() alone on the server
const {
  data: { user },
  error
} = await event.locals.supabase.auth.getUser();
```

**Form Actions Pattern:**

- SvelteKit form actions with `use:enhance` for progressive enhancement
- The sign-out action MUST be a server-side form action (not client-only `signOut()`) to ensure cookies are cleared properly
- Use `fail()` for error cases, `redirect()` for success

**Open Redirect Prevention (from Story 1.1 code review fix):**

```typescript
// Validate redirectTo is a relative path — MUST do this
function isRelativePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}
```

**DOMPurify for User-Generated Content:**

- Display names come from the database and are user-generated — sanitize with DOMPurify before rendering
- Story 1.1 already uses DOMPurify for display name at registration; apply the same pattern when displaying

**Error Handling:**

- Use `@cotulenh/common` logger (no raw `console.log`)
- Profile fetch failure is non-fatal — fall back to email display
- Sign-out error is non-fatal — always redirect to home (user perceives logout)

### Architecture Compliance

| Rule               | Requirement                                   | How to Follow                                                           |
| ------------------ | --------------------------------------------- | ----------------------------------------------------------------------- |
| Session validation | Only through `hooks.server.ts`                | Already implemented — no changes to hooks                               |
| Auth guards        | Layout-level in protected route groups        | Create `+layout.server.ts` in `/user/` and `/play/online/`              |
| RLS security       | Profiles readable by anyone                   | Use `supabase.from('profiles').select('display_name')` in server layout |
| No direct clients  | Never in components                           | Use `event.locals.supabase` (server) or `$page.data.supabase` (browser) |
| i18n               | All strings in `en.ts` + `vi.ts`              | Add `nav.*` and `auth.logout.*` keys                                    |
| Cookie sessions    | Via `@supabase/ssr`                           | Sign-out via server action ensures cookies cleared                      |
| Form actions       | Progressive enhancement                       | Logout form with `use:enhance`, works without JS                        |
| Zod validation     | No additional validation libraries            | Not needed for this story (no forms with user input beyond sign-out)    |
| Build checks       | `turbo build/lint/check-types/test` must pass | Run all at end                                                          |

### UX Spec Navigation Requirements

**From UX Design Specification — Navigation Patterns:**

**Desktop (current: 80px left sidebar):**

- The UX spec calls for "fixed top bar: Logo + 4 nav items + user dropdown"
- However, the current implementation uses a left sidebar, NOT a top bar
- **Decision for this story:** Modify the EXISTING sidebar layout to be auth-aware rather than redesigning to a top bar. A full navigation redesign is a separate concern. This story adds auth awareness to the current layout.
- User section added in sidebar footer: avatar circle (first letter of name), display name, dropdown trigger
- Dropdown menu contains: Profile, Account Settings, Sign Out

**Mobile (current: hamburger dropdown):**

- Auth items added within the existing DropdownMenu
- Separator between nav links and auth section
- Sign In link (unauthenticated) or user info + Sign Out (authenticated)

**Key UX rules:**

- Maximum 4 top-level navigation items (currently: Intro, Play, Puzzles, Editor — no change)
- 44px minimum touch targets for all interactive elements
- Active route highlighted

**User menu dropdown items (from UX spec):**

- Profile, Settings, Sign Out (from bits-ui DropdownMenu component spec: "User menu (profile, settings, sign out)")

### Sign-Out Implementation Pattern

**Why server-side form action, not client-only:**

- `supabase.auth.signOut()` on the browser client only clears the browser-side session
- The `@supabase/ssr` auth cookies are httpOnly and can only be reliably cleared server-side
- A form action (POST `/auth/logout`) ensures cookies are cleared even without JavaScript
- `use:enhance` on the form provides a smooth JS-enhanced experience

**Implementation:**

```typescript
// src/routes/auth/logout/+page.server.ts
export const actions: Actions = {
  default: async ({ locals: { supabase } }) => {
    await supabase.auth.signOut();
    redirect(303, '/');
  }
};
```

**In the layout (sign-out button):**

```svelte
<form method="POST" action="/auth/logout" use:enhance>
  <button type="submit">{i18n.t('nav.signOut')}</button>
</form>
```

### Auth Guard Pattern

**Reusable guard in `$lib/auth/guards.ts`:**

```typescript
import { redirect } from '@sveltejs/kit';
import type { ServerLoadEvent } from '@sveltejs/kit';

export function isRelativePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export async function requireAuth(locals: App.Locals, url: URL): Promise<void> {
  const { user } = await locals.safeGetSession();
  if (!user) {
    const redirectTo = url.pathname;
    const safeRedirect = isRelativePath(redirectTo) ? redirectTo : '/';
    redirect(303, `/auth/login?redirectTo=${encodeURIComponent(safeRedirect)}`);
  }
}
```

**Used in protected layouts:**

```typescript
// src/routes/user/+layout.server.ts
import { requireAuth } from '$lib/auth/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  await requireAuth(locals, url);
};
```

### Profile Display Name Fetch Pattern

**In root `+layout.server.ts`:**

```typescript
// After getting session and user
let profile = null;
if (user) {
  const { data } = await locals.supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();
  if (data) {
    profile = { displayName: data.display_name };
  }
}
return { session, user, profile, cookies: cookies.getAll() };
```

**In layout component — display with fallback:**

```svelte
<script>
  import DOMPurify from 'dompurify';
  // ...
  let displayName = $derived(
    $page.data.profile?.displayName
      ? DOMPurify.sanitize($page.data.profile.displayName)
      : $page.data.user?.email ?? ''
  );
</script>
```

### Project Structure Notes

**Files to CREATE:**

- `apps/cotulenh/app/src/lib/auth/guards.ts` — auth guard helpers (requireAuth, isRelativePath)
- `apps/cotulenh/app/src/lib/auth/guards.test.ts` — guard tests
- `apps/cotulenh/app/src/routes/auth/logout/+page.server.ts` — sign-out form action
- `apps/cotulenh/app/src/routes/auth/logout/page.server.test.ts` — sign-out tests
- `apps/cotulenh/app/src/routes/user/+layout.server.ts` — auth guard for `/user/*`
- `apps/cotulenh/app/src/routes/user/+page.svelte` — placeholder page
- `apps/cotulenh/app/src/routes/user/layout.server.test.ts` — guard test
- `apps/cotulenh/app/src/routes/play/online/+layout.server.ts` — auth guard for `/play/online/*`
- `apps/cotulenh/app/src/routes/play/online/+page.svelte` — placeholder page
- `apps/cotulenh/app/src/routes/play/online/layout.server.test.ts` — guard test

**Files to UPDATE:**

- `apps/cotulenh/app/src/routes/+layout.server.ts` — add profile display name fetch
- `apps/cotulenh/app/src/routes/+layout.svelte` — add auth-aware navigation (user menu, sign in link, sign out form)
- `apps/cotulenh/app/src/app.d.ts` — add `profile` to `PageData`
- `apps/cotulenh/app/src/lib/i18n/types.ts` — add `nav.signIn`, `nav.signOut`, `nav.profile`, `nav.accountSettings`, `nav.userMenu`, `auth.logout.signingOut` keys
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` — add English translations
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — add Vietnamese translations

**Files NOT to touch:**

- `apps/cotulenh/app/src/hooks.server.ts` — already complete, no changes needed
- `apps/cotulenh/app/src/routes/+layout.ts` — already creates browser client, no changes
- Registration routes (`/auth/register/*`) — no changes
- Login routes (`/auth/login/*`) — no changes (Story 1.2 handles these)
- Auth callback (`/auth/callback/*`) — no changes
- All packages under `packages/cotulenh/`
- Existing play/learn/board-editor/puzzles routes
- `$lib/stores/settings.ts` — existing settings store
- `$lib/stores/persisted.svelte.ts` — existing persistence

### Naming Conventions

- DB columns: `snake_case` (`display_name`)
- TypeScript: `camelCase` (`displayName`)
- Svelte components: `PascalCase.svelte`
- Lib files: `kebab-case.ts`
- Routes: `kebab-case`
- Test files: co-located, `*.test.ts` or `page.server.test.ts` / `layout.server.test.ts`

### Dependencies

**All dependencies already installed (from Story 1.1):**

- `@supabase/supabase-js` ^2.98.0 — session management, signOut, database queries
- `@supabase/ssr` ^0.8.0 — cookie-based sessions
- `bits-ui` — DropdownMenu for user menu
- `lucide-svelte` — icons (User, LogOut, Settings, LogIn, UserCircle)
- `tailwind-variants` — component variant styling via `tv()` + `cn()`
- `dompurify` — sanitize display names before rendering
- `vitest` — testing framework

**Do NOT install any new dependencies.**

### Testing Requirements

**Framework:** Vitest, co-located test files

**Tests to create:**

1. **`src/lib/auth/guards.test.ts`** — Auth guard utilities:
   - `isRelativePath`: `/profile` returns true, `//evil.com` returns false, `https://evil.com` returns false, `/` returns true, empty string returns false
   - `requireAuth`: mock `safeGetSession` returning null user triggers redirect with correct URL, mock returning a user does not redirect

2. **`src/routes/auth/logout/page.server.test.ts`** — Logout form action:
   - Successful signOut calls `supabase.auth.signOut()` and redirects to `/`
   - SignOut error still redirects to `/` (graceful degradation)

3. **`src/routes/user/layout.server.test.ts`** — User route guard:
   - Unauthenticated visitor redirected to `/auth/login?redirectTo=/user/...`
   - Authenticated user passes through

4. **`src/routes/play/online/layout.server.test.ts`** — Online play route guard:
   - Unauthenticated visitor redirected to `/auth/login?redirectTo=/play/online/...`
   - Authenticated user passes through

**Test patterns (from Stories 1.1 and 1.2):**

- Mock Supabase with `vi.mock('@supabase/ssr')`
- Test the actual exported functions, not reimplementations (Story 1.1 code review fix)
- Test form actions by calling them directly with mock `event`
- Mock `event.locals.safeGetSession` for auth guard tests

**Regression:** All existing 50+ app tests + monorepo tests must continue passing.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Route Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — $lib/auth/guards.ts]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Navigation Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Strategy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design System Components — Dropdown Menu]
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md#Completion Notes — Code Review Fixes]
- [Source: _bmad-output/implementation-artifacts/1-2-user-login-persistent-sessions.md#Dev Notes]

### Previous Story Intelligence

**Story 1.1 (done) key learnings:**

- Open redirect vulnerability was caught in code review — `isRelativePath()` validation MUST be applied from the start for `redirectTo` parameters
- Code review found tests reimplementing logic instead of testing real exports — test actual exported functions
- DOMPurify used for display name sanitization at registration — apply same pattern when displaying
- Progressive enhancement: form actions with `use:enhance` work without JS
- `@cotulenh/common` logger for all server-side logging, no raw `console.log`
- `adapter-vercel` needs explicit `runtime: 'nodejs22.x'` (Node 23 not supported on Vercel)

**Story 1.2 (ready-for-dev) key patterns:**

- Login page creates `/auth/login` with `redirectTo` query parameter support
- Open redirect prevention on `redirectTo` already validated as relative path
- Already-authenticated users on `/auth/login` are redirected to home
- Story 1.3 depends on 1.2 for the `/auth/login` route that guards redirect to — if 1.2 is not yet implemented, the redirect will go to a non-existent page (guard logic still works, just no login form to land on)

**Existing `+layout.server.ts` returns:**

```typescript
return { session, user, cookies: cookies.getAll() };
```

This story adds `profile` to the return value.

**Existing `+layout.svelte` structure:**

- Desktop: 80px fixed left sidebar with logo, nav links (Intro, Play, Puzzles, Editor), footer (Shortcuts, Settings)
- Mobile: Hamburger dropdown with same items
- Uses bits-ui DropdownMenu, lucide-svelte icons
- Has `onAuthStateChange` listener calling `invalidate('supabase:auth')`
- `$page.data.session`, `$page.data.user`, and `$page.data.supabase` already available

**Existing `app.d.ts` PageData:**

```typescript
interface PageData {
  session: Session | null;
  user: User | null;
}
```

This story adds `profile: { displayName: string } | null`.

**Installed package versions (confirmed from Story 1.1):**

- `@supabase/supabase-js` 2.98.0
- `@supabase/ssr` 0.8.0
- `@sveltejs/adapter-vercel` 6.3.3

**Env var name:** `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (NOT the older `PUBLIC_SUPABASE_ANON_KEY`)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
