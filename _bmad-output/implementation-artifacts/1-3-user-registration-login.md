# Story 1.3: User Registration & Login

Status: done

## Story

As a visitor,
I want to create an account with email and password and sign in to access the platform,
So that I can play games and track my progress.

## Acceptance Criteria

1. **Given** a visitor is on the signup page
   **When** they enter a valid email, password, and display name and submit
   **Then** an account is created via Supabase Auth
   **And** a `profiles` row is created with the display name
   **And** they are redirected to the dashboard as an authenticated user

2. **Given** a visitor enters an email that is already registered
   **When** they submit the signup form
   **Then** an inline error message is displayed in Vietnamese

3. **Given** a registered user is on the login page
   **When** they enter valid credentials and submit
   **Then** they are signed in with a persistent session via Supabase Auth cookies
   **And** they are redirected to the dashboard

4. **Given** a user enters incorrect credentials
   **When** they submit the login form
   **Then** an inline error message is displayed in Vietnamese
   **And** after 5 failed attempts per minute, further attempts are rate-limited (NFR18)

5. **Given** Next.js Middleware is configured
   **When** any request hits a protected `(app)` route without a valid session
   **Then** the user is redirected to the login page
   **And** auth tokens are refreshed on every request via middleware

## Tasks / Subtasks

- [x] Task 1: Create `(auth)` route group layout (AC: #5)
  - [x] Create `src/app/(auth)/layout.tsx` — centered form layout, no sidebar, no bottom bar
  - [x] Layout: vertically and horizontally centered content, max-width ~400px for forms
  - [x] Include a minimal header with logo linking back to `/`
  - [x] Support both light/dark themes via existing CSS custom properties

- [x] Task 2: Create Zod validation schemas (AC: #1, #2, #3, #4)
  - [x] Create `src/lib/validators/auth.ts`
  - [x] `signupSchema`: email (valid format), password (min 8 chars), displayName (1-30 chars, trimmed)
  - [x] `loginSchema`: email (valid format), password (non-empty)
  - [x] All error messages in Vietnamese

- [x] Task 3: Create Server Actions for auth (AC: #1, #2, #3, #4)
  - [x] Create `src/lib/actions/auth.ts`
  - [x] `signup` action: validate with Zod, call `supabase.auth.signUp()` with `data: { display_name }` in metadata, handle errors, redirect to `/dashboard`
  - [x] `login` action: validate with Zod, call `supabase.auth.signInWithPassword()`, handle errors, redirect to `/dashboard`
  - [x] Return `{ success, data?, error? }` format — never throw exceptions
  - [x] All error messages returned in Vietnamese

- [x] Task 4: Create `profiles` table and trigger (AC: #1)
  - [x] Verified existing Supabase migration: `profiles` table with `id` (uuid FK to auth.users), `display_name` (text), `created_at` (timestamptz)
  - [x] Verified database trigger: on `auth.users` insert, auto-create `profiles` row using `raw_user_meta_data->>'display_name'`
  - [x] Verified RLS policy: users can read/update only their own profile (NFR16)

- [x] Task 5: Build signup page (AC: #1, #2)
  - [x] Replace placeholder at `src/app/(auth)/signup/page.tsx`
  - [x] Form fields: email, password, display name — all with Vietnamese labels
  - [x] Real-time validation on blur
  - [x] Submit button disabled until all fields valid
  - [x] Inline error display below each field + form-level error for server errors
  - [x] Link to login: "Da co tai khoan? Dang nhap"
  - [x] Call `signup` Server Action on submit

- [x] Task 6: Build login page (AC: #3, #4)
  - [x] Replace placeholder at `src/app/(auth)/login/page.tsx`
  - [x] Form fields: email, password — with Vietnamese labels
  - [x] Real-time validation on blur
  - [x] Submit button disabled until all fields filled
  - [x] Inline error display for invalid credentials
  - [x] Link to signup: "Chua co tai khoan? Dang ky"
  - [x] Link to password reset: "Quen mat khau?"
  - [x] Call `login` Server Action on submit

- [x] Task 7: Enhance middleware for route protection (AC: #5)
  - [x] Update `src/middleware.ts` to check auth state on `(app)` routes
  - [x] If no valid session on protected route, redirect to `/login`
  - [x] If authenticated user visits `/login` or `/signup`, redirect to `/dashboard`
  - [x] Preserve existing token refresh behavior from `updateSession()`

- [x] Task 8: Create form input components
  - [x] Create `src/components/ui/input.tsx` — styled text input with label, error state, Vietnamese accessibility
  - [x] Use existing design tokens: `--color-border`, `--color-error`, `--color-text`, `--radius: 0px`
  - [x] Support `type="email"`, `type="password"`, `type="text"`
  - [x] Keyboard navigable with visible focus indicators (WCAG 2.1 AA)

- [x] Task 9: Write tests (all ACs)
  - [x] Unit tests for Zod schemas (valid/invalid inputs, Vietnamese error messages)
  - [x] Unit tests for Server Actions (mock Supabase, test success/error paths)
  - [x] Component tests for signup page (form rendering, validation, error display, submission)
  - [x] Component tests for login page (form rendering, validation, error display, submission)
  - [x] Component tests for auth layout
  - [x] Test middleware redirect behavior (protected routes, auth page redirect for authenticated users)

- [x] Task 10: Quality gates
  - [x] `pnpm --filter @cotulenh/web run build` succeeds
  - [x] `pnpm --filter @cotulenh/web run test` — all tests pass
  - [x] `pnpm --filter @cotulenh/web run lint` — no errors
  - [x] `pnpm --filter @cotulenh/web run check-types` — no errors

## Dev Notes

### Architecture Compliance

**Route structure — MANDATORY:**
- Auth pages live in `src/app/(auth)/` route group
- `(auth)` gets centered form layout — NO sidebar, NO bottom tab bar
- Login: `src/app/(auth)/login/page.tsx`
- Signup: `src/app/(auth)/signup/page.tsx`
- The `(auth)/layout.tsx` does NOT exist yet — you MUST create it
- Do NOT modify `(public)` or `(app)` layouts

**Component locations — MANDATORY:**
- UI primitives: `src/components/ui/` (e.g., `input.tsx`)
- Validators: `src/lib/validators/auth.ts`
- Server Actions: `src/lib/actions/auth.ts`
- No barrel exports — direct imports only

**Naming conventions — MANDATORY:**
- Component files: `kebab-case.tsx`
- React components: `PascalCase`
- Server Action files: `kebab-case.ts`
- Server Actions: `camelCase` verbs (e.g., `signup`, `login`)
- Zod schemas: `camelCase` + `Schema` suffix (e.g., `signupSchema`)
- DB columns: `snake_case` (e.g., `display_name`, `created_at`)

**JSON/DB field naming — MANDATORY:**
- `snake_case` everywhere for DB-backed types. No `camelCase` property names from DB.
- Match Supabase column names exactly: `display_name`, `created_at`, not `displayName`.

### Technical Requirements

**Server Actions (NOT API routes):**
- Auth operations use Next.js Server Actions, not API routes
- Return type: `{ success: true, data: T } | { success: false, error: string }`
- Never throw exceptions — always return error shape
- Create Supabase server client inside the action via `createClient()` from `@/lib/supabase/server`
- Call `revalidatePath('/', 'layout')` after successful auth to clear cached data
- Use `redirect()` from `next/navigation` for post-auth redirect

**Supabase Auth integration:**
- Signup: `supabase.auth.signUp({ email, password, options: { data: { display_name } } })`
- Login: `supabase.auth.signInWithPassword({ email, password })`
- The `display_name` is stored in `auth.users.raw_user_meta_data` and used by the DB trigger to populate `profiles`
- Supabase handles password hashing (NFR15), rate limiting (NFR18), and HTTPS enforcement (NFR14)
- Cookie-based sessions managed by `@supabase/ssr` — already configured in middleware

**Middleware route protection:**
- Current middleware at `src/middleware.ts` only calls `updateSession()` for token refresh
- Enhance to check auth state: if no user on `(app)` routes → redirect to `/login`
- If user exists on `/login` or `/signup` → redirect to `/dashboard`
- Protected route patterns: `/dashboard`, `/play`, `/game`, `/friends`, `/settings`, `/tournament`, `/leaderboard`, `/profile`
- Public routes (no redirect): `/`, `/learn`, `/invite`

**Database migration (`profiles` table):**
- Check existing migrations in `supabase/migrations/` — the architecture lists `profiles` as migration 001
- The `profiles` table may already exist from Story 1.1 setup. If it does, skip this task.
- If not: create `profiles` with columns: `id` (uuid PK, FK to auth.users), `display_name` (text not null), `avatar_url` (text nullable), `created_at` (timestamptz default now())
- Create trigger function: `handle_new_user()` that inserts into `profiles` on auth.users insert
- RLS: `SELECT` own profile, `UPDATE` own profile (using `auth.uid() = id`)

**Form behavior:**
- Forms are client components (`"use client"`) that call Server Actions
- Use `useFormStatus` from `react-dom` for pending state (disable button, show loading)
- Use `useActionState` from `react` for Server Action integration
- Real-time validation on blur using Zod `.safeParse()`
- Submit button disabled while form is incomplete or submitting
- All labels and error messages in Vietnamese

**Vietnamese text for auth forms:**
- Signup page title: "Dang ky"
- Login page title: "Dang nhap"
- Email label: "Email"
- Password label: "Mat khau"
- Display name label: "Ten hien thi"
- Signup button: "Dang ky"
- Login button: "Dang nhap"
- "Da co tai khoan? Dang nhap" (Already have account? Sign in)
- "Chua co tai khoan? Dang ky" (No account? Sign up)
- "Quen mat khau?" (Forgot password?)
- Error: "Email khong hop le" (Invalid email)
- Error: "Mat khau phai co it nhat 8 ky tu" (Password must be at least 8 characters)
- Error: "Email da duoc su dung" (Email already in use)
- Error: "Email hoac mat khau khong dung" (Incorrect email or password)
- Error: "Vui long thu lai sau" (Please try again later — for rate limiting)

**Performance budget:**
- Auth pages: <50KB application JS (per architecture spec)
- SSR-heavy — forms are client components but layout is server-rendered
- No `cotulenh-core` or `cotulenh-board` imports — these are game-route-only
- System fonts only (already configured)

### Design System — Already Established

**Use existing design tokens from `globals.css`:**
- Primary: `var(--color-primary)` — teal
- Error: `var(--color-error)` — red #dc2626 / dark mode equivalent
- Surface: `var(--color-surface)`, `var(--color-surface-elevated)`
- Text: `var(--color-text)`, `var(--color-text-muted)`
- Border: `var(--color-border)`
- Spacing: `var(--space-*)` (4px base)
- Typography: `var(--text-sm)` for labels, `var(--text-base)` for inputs
- Radius: `0px` everywhere — sharp corners on inputs and buttons

**Use existing Button component** at `src/components/ui/button.tsx`:
- Submit buttons: `variant="default"` (teal background), `size="default"` or `size="lg"`
- Link buttons: `variant="link"` for form footer links

**Input component (create new):**
- Style to match Button: 0px border radius, same height, consistent border color
- Focus state: `ring-2` with primary color, visible outline
- Error state: border color changes to `--color-error`, error text below in `--color-error`
- Disabled state: reduced opacity

**Form layout:**
- Centered vertically and horizontally on the page
- Max width ~400px for form container
- Spacing between fields: `var(--space-4)` (16px)
- Spacing between form and footer links: `var(--space-6)` (24px)

### Responsive Breakpoints

| Breakpoint | Width | Auth Page Behavior |
|------------|-------|--------------------|
| Mobile | <640px | Form full-width with padding, stacked layout |
| Tablet | 640-1024px | Form centered, max-width 400px |
| Desktop | >1024px | Form centered, max-width 400px |

Auth pages have simple centered layout — responsive behavior is minimal.

### UX Specification

**Auth page wireframe:**
```
+----------------------------------------------------------+
|  [Logo] CoTuLenh                                          |
+----------------------------------------------------------+
|                                                            |
|              +------------------------+                    |
|              |    Dang ky / Dang nhap |                    |
|              |                        |                    |
|              |  Email                 |                    |
|              |  [________________]    |                    |
|              |                        |                    |
|              |  Mat khau              |                    |
|              |  [________________]    |                    |
|              |                        |                    |
|              |  Ten hien thi (signup) |                    |
|              |  [________________]    |                    |
|              |                        |                    |
|              |  [    Dang ky    ]     |                    |
|              |                        |                    |
|              |  Da co tai khoan?      |                    |
|              |  Dang nhap             |                    |
|              +------------------------+                    |
|                                                            |
+----------------------------------------------------------+
```

**Form patterns (from UX spec):**
- 3 fields signup (email, password, display name), 2 fields signin
- Real-time validation on blur
- Submit disabled until all required fields filled
- Vietnamese labels throughout
- Inline error messages next to relevant fields (not modals, not toasts)

**Button hierarchy:**
- Primary (solid teal): ONE per screen — the submit button
- Link variant: navigation links (sign in/sign up toggle, forgot password)

**Accessibility (WCAG 2.1 AA):**
- All form inputs must have associated `<label>` elements
- Contrast ratio: 4.5:1 for text, 3:1 for interactive elements
- Keyboard navigable with visible focus indicators
- Form inputs use semantic HTML (`<form>`, `<input>`, `<label>`)
- Error messages linked to inputs via `aria-describedby`
- Submit button shows loading state during submission
- `lang="vi"` already set on root

### Previous Story Intelligence (Story 1.2)

**Key learnings from Story 1.2:**
- `buttonVariants` was extracted to `src/components/ui/button-variants.ts` for server-safe usage — reuse this pattern if needed
- Placeholder pages already exist at `(auth)/login/page.tsx` and `(auth)/signup/page.tsx` — replace these, don't create alongside
- `PlaceholderPage` component exists at `src/components/layout/placeholder-page.tsx` — no longer needed for auth pages after this story
- Auth redirect pattern established: `createClient()` from `@/lib/supabase/server` → `supabase.auth.getUser()` → `redirect()` from `next/navigation`
- Vitest configured at `vitest.config.ts` with jsdom, setup file at `vitest.setup.ts`, tests in `__tests__/` directories
- Existing test mocks: `@/lib/supabase/server` mock with `createClient()` → `{ auth: { getUser } }`, `next/navigation` mock with `redirect()`
- Quality gate commands: `pnpm --filter @cotulenh/web run build`, `pnpm --filter @cotulenh/web run test`, `pnpm --filter @cotulenh/web run lint`, `pnpm --filter @cotulenh/web run check-types`
- `next typegen` runs as part of `check-types` for deterministic type checking

**Files established that this story builds on:**
- `src/app/(auth)/login/page.tsx` — placeholder, REPLACE with real login form
- `src/app/(auth)/signup/page.tsx` — placeholder, REPLACE with real signup form
- `src/app/(auth)/__tests__/placeholder-pages.test.tsx` — REPLACE with real auth tests
- `src/lib/supabase/server.ts` — server-side Supabase client (use as-is)
- `src/lib/supabase/browser.ts` — browser-side Supabase client (use for client components)
- `src/lib/supabase/middleware.ts` — `updateSession()` function (enhance, don't replace)
- `src/middleware.ts` — delegates to supabase middleware (enhance with route protection)
- `src/components/ui/button.tsx` + `button-variants.ts` — reuse for submit buttons
- `src/app/globals.css` — all design tokens
- `src/lib/utils/cn.ts` — class merge utility
- `vitest.config.ts` + `vitest.setup.ts` — test infrastructure

**Files this story will create:**
- `src/app/(auth)/layout.tsx` — centered form layout for auth pages
- `src/lib/validators/auth.ts` — Zod schemas for signup and login
- `src/lib/actions/auth.ts` — Server Actions for signup and login
- `src/components/ui/input.tsx` — styled form input component
- Supabase migration for `profiles` table (if not already present)

**Files this story will modify:**
- `src/app/(auth)/login/page.tsx` — replace placeholder with real form
- `src/app/(auth)/signup/page.tsx` — replace placeholder with real form
- `src/middleware.ts` — add route protection logic
- `src/lib/supabase/middleware.ts` — enhance with auth check for protected routes
- `src/app/(auth)/__tests__/placeholder-pages.test.tsx` — replace with comprehensive auth tests
- `package.json` — add `zod` dependency if not present

### Anti-Pattern Prevention

**DO NOT:**
- Create API routes (`app/api/auth/...`) — use Server Actions
- Create a custom auth system — use Supabase Auth exclusively
- Store passwords or tokens manually — Supabase handles this
- Use `useEffect` for form validation — use `onBlur` handlers with Zod
- Import `cotulenh-core` or `cotulenh-board` — these are game packages
- Create barrel exports (`index.ts`) — import directly
- Use English text anywhere in the UI — Vietnamese only
- Add `border-radius` to inputs/buttons — the design system uses 0px
- Create a separate auth context/provider — middleware handles session, forms call Server Actions
- Skip the `profiles` trigger — manual profile creation is fragile
- Use `router.push()` for post-auth redirect — use `redirect()` in Server Actions (server-side)

### Project Structure Notes

- `src/lib/validators/` directory does not exist yet — create it
- `src/lib/actions/` directory does not exist yet — create it
- `src/stores/` exists but is empty — NOT needed for this story (no client-side auth state)
- `(auth)` route group exists with placeholder pages — replace them
- No `(auth)/layout.tsx` exists yet — create it
- Check `supabase/migrations/` for existing `profiles` migration before creating one

### Dependencies

**Install required:**
- `zod` — runtime validation for form schemas (if not already in package.json)

**Already available (do NOT install again):**
- `@supabase/ssr` ^0.8.0
- `@supabase/supabase-js` ^2.98.0
- `react` 19.2.3 (includes `useActionState`)
- `react-dom` 19.2.3 (includes `useFormStatus`)
- `@testing-library/react` ^16.3.2
- `vitest` ^1.6.1

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — Acceptance criteria and user story
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security] — Supabase Auth, middleware, rate limiting
- [Source: _bmad-output/planning-artifacts/architecture.md#Source Tree] — Route group structure: (auth) centered form layout
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Actions] — Return `{ success, data?, error? }` format
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Naming] — snake_case columns, profiles table
- [Source: _bmad-output/planning-artifacts/architecture.md#Code Splitting] — Auth pages: <50KB app JS
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation] — Zod for runtime validation
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns] — 3 fields signup, 2 fields signin, blur validation
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Navigation] — Auth pages: centered form, no sidebar
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility] — WCAG 2.1 AA, keyboard nav, label association
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy] — One primary per screen
- [Source: _bmad-output/planning-artifacts/prd.md#NFR14] — HTTPS/WSS only
- [Source: _bmad-output/planning-artifacts/prd.md#NFR15] — Passwords hashed, never plaintext
- [Source: _bmad-output/planning-artifacts/prd.md#NFR16] — RLS: users access own data only
- [Source: _bmad-output/planning-artifacts/prd.md#NFR18] — Rate limiting: 5 failed/min, progressive lockout
- [Source: _bmad-output/planning-artifacts/prd.md#NFR19] — WCAG 2.1 AA contrast ratios
- [Source: _bmad-output/planning-artifacts/prd.md#NFR20] — Keyboard navigation with focus indicators

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm install --offline --filter @cotulenh/web`
- `pnpm --filter @cotulenh/web run test`
- `pnpm --filter @cotulenh/web run lint`
- `pnpm --filter @cotulenh/web run check-types`
- `pnpm --filter @cotulenh/web run build`

### Completion Notes List

- Replaced the placeholder auth pages with real Vietnamese login and signup forms backed by Server Actions and Zod validation.
- Added a reusable auth layout and input component matching the existing design tokens and zero-radius UI language.
- Enhanced middleware session refresh to also protect `(app)` routes and redirect authenticated users away from `/login` and `/signup`.
- Added a non-404 placeholder route for `/reset-password` so the login screen link remains valid until Story 1.4 ships.
- Verified that `supabase/migrations/001_profiles.sql` already provides the `profiles` table, signup trigger, and profile RLS requirements for this story.
- Added focused unit and component tests for validators, auth actions, auth pages, auth layout, and middleware redirects.

### File List

- `apps/cotulenh/web/package.json`
- `apps/cotulenh/web/src/__tests__/middleware.test.ts`
- `apps/cotulenh/web/src/app/(auth)/__tests__/auth-pages.test.tsx`
- `apps/cotulenh/web/src/app/(auth)/__tests__/layout.test.tsx`
- `apps/cotulenh/web/src/app/(auth)/layout.tsx`
- `apps/cotulenh/web/src/app/(auth)/login/page.tsx`
- `apps/cotulenh/web/src/app/(auth)/reset-password/page.tsx`
- `apps/cotulenh/web/src/app/(auth)/signup/page.tsx`
- `apps/cotulenh/web/src/components/auth/auth-form.tsx`
- `apps/cotulenh/web/src/components/ui/input.tsx`
- `apps/cotulenh/web/src/lib/actions/__tests__/auth.test.ts`
- `apps/cotulenh/web/src/lib/actions/auth.ts`
- `apps/cotulenh/web/src/lib/supabase/middleware.ts`
- `apps/cotulenh/web/src/lib/validators/__tests__/auth.test.ts`
- `apps/cotulenh/web/src/lib/validators/auth.ts`
- `apps/cotulenh/web/src/middleware.ts`
- `pnpm-lock.yaml`
## Senior Developer Review (AI)

### Review Date

2026-03-10

### Outcome

Approved after fixes

### Summary

- The original review found that Story 1.3 had no implementation to validate.
- The HIGH and MEDIUM findings from that review were fixed automatically in the same session.
- Story 1.3 now satisfies AC #1 through AC #5 and passes the required web quality gates.

### Findings

1. **[HIGH] AC #1 and AC #2 are still missing because the signup route is only a placeholder page.** `src/app/(auth)/signup/page.tsx` still renders `PlaceholderPage` copy instead of a Vietnamese signup form, so there is no Supabase signup, no inline validation, no display-name capture, and no redirect path to `/dashboard`. Evidence: `apps/cotulenh/web/src/app/(auth)/signup/page.tsx:1`.
2. **[HIGH] AC #3 and AC #4 are still missing because the login route is only a placeholder page.** `src/app/(auth)/login/page.tsx` has no credential form, no call to `supabase.auth.signInWithPassword()`, no cookie-backed session assertion, and no Vietnamese inline error handling for invalid credentials or rate limiting. Evidence: `apps/cotulenh/web/src/app/(auth)/login/page.tsx:1`.
3. **[HIGH] AC #5 is not implemented because middleware only refreshes the Supabase session and never enforces route protection.** The current middleware returns `updateSession(request)` directly and `updateSession()` only calls `supabase.auth.getUser()`. There is no redirect for unauthenticated access to protected `(app)` routes and no redirect from `/login` or `/signup` for authenticated users. Evidence: `apps/cotulenh/web/src/middleware.ts:1`, `apps/cotulenh/web/src/lib/supabase/middleware.ts:1`.
4. **[HIGH] Core story files required by Tasks 1, 2, 3, and 8 do not exist.** The repo is missing `src/app/(auth)/layout.tsx`, `src/lib/validators/auth.ts`, `src/lib/actions/auth.ts`, and `src/components/ui/input.tsx`, so the centered auth layout, Zod validation, Server Actions, and reusable form input component were not implemented at all. Evidence: files absent under `apps/cotulenh/web/src/`.
5. **[HIGH] The testing work for this story was not done, and the existing tests reinforce placeholder behavior instead of auth behavior.** The only auth-route test file asserts that the login/signup pages show “sắp sẵn sàng” placeholder content. There are no schema tests, Server Action tests, auth form tests, auth layout tests, or middleware redirect tests mapped to the story ACs. Evidence: `apps/cotulenh/web/src/app/(auth)/__tests__/placeholder-pages.test.tsx:1`.
6. **[MEDIUM] The dependency required by the story for runtime validation is still missing.** `apps/cotulenh/web/package.json` does not include `zod`, so even the planned schema layer in Task 2 cannot compile as specified. Evidence: `apps/cotulenh/web/package.json:13`.
7. **[MEDIUM] The story should not have entered review in its current state.** The story status was `ready-for-dev`, the Dev Agent Record contains no completion notes or file list, and git shows no application source changes to review. This is a process failure that makes the review effectively blocked on implementation. Evidence: `_bmad-output/implementation-artifacts/1-3-user-registration-login.md:3`, `_bmad-output/implementation-artifacts/sprint-status.yaml:47`.

### Recommended Next Actions

- Proceed to Story 1.4 for the full password reset flow.
- Reuse the auth action and validation patterns established here for future auth-adjacent stories.

### Resolution

- All HIGH and MEDIUM findings listed above were resolved on 2026-03-10.
- The story status was moved from `in-progress` to `done` after implementation and verification.

## Change Log

- 2026-03-10: Senior Developer Review recorded. Story returned to `in-progress` because no application implementation was present for review.
- 2026-03-10: Implemented the full Story 1.3 auth flow, added tests, passed quality gates, and resolved the review findings automatically.
