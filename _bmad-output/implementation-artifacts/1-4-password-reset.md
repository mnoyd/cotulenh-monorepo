# Story 1.4: Password Reset

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered user,
I want to reset my password via an email link,
so that I can recover access to my account if I forget my password.

## Acceptance Criteria

1. **Given** a user is on the password reset request page
   **When** they enter their registered email and submit
   **Then** a password reset email is sent via Supabase Auth
   **And** a confirmation message is displayed in Vietnamese

2. **Given** a user clicks the reset link in their email
   **When** the reset page loads
   **Then** they can enter a new password
   **And** on submission, their password is updated
   **And** they are redirected to the login page with a success message

3. **Given** a user enters an unregistered email on the reset page
   **When** they submit
   **Then** the same confirmation message is shown (no email enumeration)

## Tasks / Subtasks

- [x] Task 1: Add Zod validation schemas for password reset (AC: #1, #2)
  - [x]Add `resetRequestSchema` to `src/lib/validators/auth.ts` — email field only (reuse existing `emailSchema`)
  - [x]Add `updatePasswordSchema` to `src/lib/validators/auth.ts` — new password (min 8 chars), confirm password (must match)
  - [x]Export new types: `ResetRequestInput`, `UpdatePasswordInput`

- [x] Task 2: Create Server Actions for password reset (AC: #1, #2, #3)
  - [x]Add `requestPasswordReset` action to `src/lib/actions/auth.ts`
    - Validate with `resetRequestSchema`
    - Call `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
    - `redirectTo` must point to `/auth/callback?next=/reset-password/update`
    - Always return success (no email enumeration per AC #3)
    - Return Vietnamese confirmation message: "Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu."
  - [x]Add `updatePassword` action to `src/lib/actions/auth.ts`
    - Validate with `updatePasswordSchema`
    - Call `supabase.auth.updateUser({ password })`
    - On success: redirect to `/login?reset=success`
    - On error: return Vietnamese error message

- [x] Task 3: Create auth callback route handler (AC: #2)
  - [x]Create `src/app/auth/callback/route.ts` — GET route handler
  - [x]Exchange the PKCE `code` parameter via `supabase.auth.exchangeCodeForSession(code)`
  - [x]Read `next` query parameter for post-exchange redirect (default: `/dashboard`)
  - [x]On success: redirect to `next` URL
  - [x]On error: redirect to `/login?error=auth_callback_failed`
  - [x]This route is NOT inside `(auth)` group — it's a standalone API-like route at `/auth/callback`

- [x] Task 4: Replace reset-password request page (AC: #1, #3)
  - [x]Replace placeholder at `src/app/(auth)/reset-password/page.tsx` with real form
  - [x]Single field: email input with Vietnamese label
  - [x]Submit button: "Gửi liên kết đặt lại" (Send reset link)
  - [x]On submission: call `requestPasswordReset` Server Action
  - [x]After submission: show confirmation message regardless of email validity (AC #3)
  - [x]Show confirmation in a styled success box (not inline error style)
  - [x]Include "Quay lại đăng nhập" (Back to login) link
  - [x]Reuse existing `Input` component and design tokens

- [x] Task 5: Create update-password page (AC: #2)
  - [x]Create `src/app/(auth)/reset-password/update/page.tsx`
  - [x]Two fields: new password, confirm password — Vietnamese labels
  - [x]Real-time validation on blur: password min 8 chars, passwords must match
  - [x]Submit button: "Cập nhật mật khẩu" (Update password)
  - [x]Call `updatePassword` Server Action on submit
  - [x]This page requires an active Supabase session (set by auth callback)
  - [x]If no session (direct access): redirect to `/reset-password` with message
  - [x]Metadata: `title: "Đặt mật khẩu mới"`

- [x] Task 6: Handle login page success message (AC: #2)
  - [x]Update login page to read `?reset=success` query parameter
  - [x]If present, display success banner: "Mật khẩu đã được cập nhật. Vui lòng đăng nhập." (Password updated. Please sign in.)
  - [x]Banner uses success styling (not error styling) — use `--color-primary` or a success-toned variant
  - [x]Banner dismisses after first navigation or can be closed

- [x] Task 7: Update middleware for new routes (AC: #2)
  - [x]Ensure `/auth/callback` is NOT blocked by middleware (it's not in protected routes, but verify matcher allows it)
  - [x]Ensure `/reset-password/update` is accessible (it's under `(auth)` group, already not protected)
  - [x]Add `/reset-password` to `authRoutes` set so authenticated users get redirected to `/dashboard` (they don't need password reset while logged in)

- [x] Task 8: Write tests (all ACs)
  - [x]Unit tests for new Zod schemas (`resetRequestSchema`, `updatePasswordSchema`)
  - [x]Unit tests for `requestPasswordReset` action (mock Supabase, verify always returns success)
  - [x]Unit tests for `updatePassword` action (mock Supabase, test success/error)
  - [x]Unit test for auth callback route handler (mock code exchange, test redirects)
  - [x]Component tests for reset-password request page (form, submission, confirmation display)
  - [x]Component tests for update-password page (form, validation, submission)
  - [x]Test login page success banner display with `?reset=success`

- [x] Task 9: Quality gates
  - [x]`pnpm --filter @cotulenh/web run build` succeeds
  - [x]`pnpm --filter @cotulenh/web run test` — all tests pass
  - [x]`pnpm --filter @cotulenh/web run lint` — no errors
  - [x]`pnpm --filter @cotulenh/web run check-types` — no errors

## Dev Notes

### Architecture Compliance

**Route structure — MANDATORY:**
- Reset request page: `src/app/(auth)/reset-password/page.tsx` (REPLACE existing placeholder)
- Update password page: `src/app/(auth)/reset-password/update/page.tsx` (CREATE new)
- Auth callback: `src/app/auth/callback/route.ts` (CREATE new — NOT inside `(auth)` group)
- All auth pages share the centered form layout from `(auth)/layout.tsx`

**Component locations — MANDATORY:**
- Validators: add to existing `src/lib/validators/auth.ts`
- Server Actions: add to existing `src/lib/actions/auth.ts`
- Reuse existing `Input` component from `src/components/ui/input.tsx`
- Reuse existing `Button` component from `src/components/ui/button.tsx`
- Reuse existing `buttonVariants` from `src/components/ui/button-variants.ts`

**Naming conventions — MANDATORY:**
- Server Actions: `camelCase` verbs — `requestPasswordReset`, `updatePassword`
- Zod schemas: `camelCase` + `Schema` suffix — `resetRequestSchema`, `updatePasswordSchema`
- Route handler: `route.ts` (Next.js convention for Route Handlers)
- Component files: `kebab-case.tsx`

**Server Actions (NOT API routes) — MANDATORY:**
- Auth operations use Next.js Server Actions, not API routes
- Return type: `{ success: true, data?: T } | { success: false, error: string }`
- Never throw exceptions — always return error shape
- Create Supabase server client inside the action via `createClient()` from `@/lib/supabase/server`
- Exception: the auth callback IS a Route Handler (`route.ts`) because it receives a GET redirect from Supabase email

### Technical Requirements

**Supabase Password Reset Flow (PKCE):**
1. **Request phase:** `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<site-url>/auth/callback?next=/reset-password/update' })`
2. **Email delivery:** Supabase sends a magic link email with a `code` parameter
3. **Callback phase:** GET `/auth/callback?code=<code>&next=/reset-password/update`
   - Create Supabase server client
   - Call `supabase.auth.exchangeCodeForSession(code)` to establish session
   - Redirect to `/reset-password/update`
4. **Update phase:** User enters new password on update page
   - `supabase.auth.updateUser({ password: newPassword })`
   - On success: sign out and redirect to `/login?reset=success`
5. **Login phase:** User sees success banner and logs in with new password

**Critical: `redirectTo` URL construction:**
- Use `process.env.NEXT_PUBLIC_SITE_URL` or construct from request headers for the base URL
- Fallback to `http://localhost:3000` for development
- The `redirectTo` must be an absolute URL (Supabase requires this)
- Add the site URL to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs

**No email enumeration (AC #3) — MANDATORY:**
- `resetPasswordForEmail` does NOT throw errors for non-existent emails
- Always show the same confirmation message regardless of whether the email exists
- Message: "Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu."
- Never reveal whether an email is registered during the reset flow

**Update password page session requirement:**
- The auth callback establishes a Supabase session via code exchange
- The update-password page needs this session to call `updateUser()`
- If a user navigates directly to `/reset-password/update` without a session, redirect to `/reset-password`
- Check session via `supabase.auth.getUser()` in a Server Component or Server Action

**Form patterns (reuse from Story 1.3):**
- Forms are client components (`"use client"`) that call Server Actions
- Use `useActionState` from `react` for Server Action integration
- Use `useFormStatus` from `react-dom` for pending state
- Real-time validation on blur using Zod `.safeParse()`
- Submit button disabled while form is incomplete or submitting
- All labels and error messages in Vietnamese

**Vietnamese text for password reset:**
- Request page title: "Quên mật khẩu" (already in placeholder metadata)
- Request page description: "Nhập email để nhận liên kết đặt lại mật khẩu."
- Email label: "Email"
- Request submit button: "Gửi liên kết đặt lại"
- Confirmation message: "Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu."
- Update page title: "Đặt mật khẩu mới"
- New password label: "Mật khẩu mới"
- Confirm password label: "Xác nhận mật khẩu"
- Update submit button: "Cập nhật mật khẩu"
- Password mismatch error: "Mật khẩu không khớp"
- Password too short: "Mật khẩu phải có ít nhất 8 ký tự"
- Update error: "Không thể cập nhật mật khẩu lúc này"
- Login success banner: "Mật khẩu đã được cập nhật. Vui lòng đăng nhập."
- Rate limit error: "Vui lòng thử lại sau"

### Library & Framework Requirements

**Already available (do NOT install again):**
- `@supabase/ssr` ^0.8.0
- `@supabase/supabase-js` ^2.98.0
- `zod` (added in Story 1.3)
- `react` 19.2.3 (includes `useActionState`)
- `react-dom` 19.2.3 (includes `useFormStatus`)
- `next` (includes `NextRequest`, `NextResponse`, Route Handlers)
- `@testing-library/react` ^16.3.2
- `vitest` ^1.6.1

**No new dependencies required for this story.**

### File Structure Requirements

**Files to CREATE:**
- `src/app/auth/callback/route.ts` — auth callback route handler for PKCE code exchange
- `src/app/(auth)/reset-password/update/page.tsx` — update password form page

**Files to MODIFY:**
- `src/app/(auth)/reset-password/page.tsx` — REPLACE placeholder with real reset request form
- `src/lib/validators/auth.ts` — ADD `resetRequestSchema`, `updatePasswordSchema`
- `src/lib/actions/auth.ts` — ADD `requestPasswordReset`, `updatePassword` actions
- `src/middleware.ts` — ADD `/reset-password` to `authRoutes` set
- `src/app/(auth)/login/page.tsx` — ADD success banner for `?reset=success`

**Files to ADD (tests):**
- `src/app/auth/__tests__/callback.test.ts` — auth callback route tests
- `src/app/(auth)/reset-password/__tests__/reset-password.test.tsx` — request page tests
- `src/app/(auth)/reset-password/update/__tests__/update-password.test.tsx` — update page tests

**DO NOT modify:**
- `src/app/(auth)/layout.tsx` — already provides correct centered layout
- `src/components/ui/input.tsx` — reuse as-is
- `src/components/ui/button.tsx` — reuse as-is
- `src/lib/supabase/server.ts` — server-side Supabase client (use as-is)
- `src/lib/supabase/middleware.ts` — no changes needed

### Testing Requirements

**Testing framework:** Vitest + Testing Library (already configured)
- Test config: `vitest.config.ts` with jsdom environment
- Setup: `vitest.setup.ts`
- Test location: `__tests__/` directories co-located with source

**Mock patterns (established in Story 1.3):**
- `@/lib/supabase/server` mock with `createClient()` → `{ auth: { ... } }`
- `next/navigation` mock with `redirect()`, `useSearchParams()`
- `next/headers` mock with `cookies()`

**Key test scenarios:**
1. Reset request: form renders, validates email, calls action, shows confirmation
2. Reset request: unregistered email shows same confirmation (no enumeration)
3. Auth callback: valid code → session established → redirect to next
4. Auth callback: invalid/missing code → redirect to login with error
5. Update password: form validates, passwords must match, calls updateUser
6. Update password: no session → redirect to reset-password request page
7. Login banner: `?reset=success` shows success message

### Previous Story Intelligence (Story 1.3)

**Key learnings from Story 1.3:**
- `AuthForm` component in `src/components/auth/auth-form.tsx` handles login/signup modes — DO NOT extend this for reset; create separate form components for the reset flow (different UX: single field, confirmation state, no mode toggle)
- Server Actions follow `(previousState, formData) => Promise<ActionState>` pattern with `useActionState`
- `handleChange`, `validateField`, `getFieldError` helper pattern established — can replicate for reset forms
- `SubmitButton` component with `useFormStatus` for loading state — replicate this pattern
- Existing test mocks for Supabase auth methods work well — extend for `resetPasswordForEmail` and `updateUser`
- Quality gate commands: `pnpm --filter @cotulenh/web run build`, `test`, `lint`, `check-types`

**Files established that this story builds on:**
- `src/app/(auth)/layout.tsx` — centered form layout (reuse as-is)
- `src/app/(auth)/reset-password/page.tsx` — placeholder to REPLACE
- `src/lib/actions/auth.ts` — ADD new actions here
- `src/lib/validators/auth.ts` — ADD new schemas here
- `src/components/ui/input.tsx` — reuse for email and password fields
- `src/components/ui/button.tsx` + `button-variants.ts` — reuse for submit and link buttons
- `src/middleware.ts` — minor update to authRoutes
- `src/app/(auth)/login/page.tsx` — add success banner support

**Completion note from Story 1.3:** "Added a non-404 placeholder route for `/reset-password` so the login screen link remains valid until Story 1.4 ships." — This placeholder is now being replaced.

### Git Intelligence

**Recent commit patterns:**
- `7512d7e` Implement Story 1.3 auth flows
- `08aa95a` Fix landing page review issues
- `9a7ed4c` fix(web): address Story 1.1 review gaps

Conventions: imperative mood, optional scope prefix `(web)`, story references in messages.

### Anti-Pattern Prevention

**DO NOT:**
- Create API routes (`app/api/auth/...`) for the reset flow — use Server Actions. Exception: the auth callback IS a Route Handler because it receives a GET redirect from Supabase
- Extend the existing `AuthForm` component for reset — it's designed for login/signup toggle; reset has different UX (single field, confirmation state, no mode switching)
- Reveal whether an email exists during reset request — always show the same message
- Use `router.push()` for post-action redirect — use `redirect()` in Server Actions
- Skip session check on update-password page — users could navigate directly
- Add `border-radius` to inputs/buttons — design system uses 0px
- Use English text anywhere in the UI — Vietnamese only
- Import `cotulenh-core` or `cotulenh-board` — these are game packages
- Create barrel exports (`index.ts`) — import directly
- Create a separate auth context/provider — middleware handles session
- Call `signOut()` before `updateUser()` — the user needs an active session to update their password

### Design System — Already Established

**Reuse existing design tokens from `globals.css`:**
- Primary: `var(--color-primary)` — teal
- Error: `var(--color-error)` — red
- Surface: `var(--color-surface)`, `var(--color-surface-elevated)`
- Text: `var(--color-text)`, `var(--color-text-muted)`
- Border: `var(--color-border)`
- Spacing: `var(--space-*)` (4px base)
- Typography: `var(--text-sm)` for labels, `var(--text-base)` for inputs
- Radius: `0px` everywhere

**Success/confirmation styling:**
- Use `--color-primary` toned box for confirmation message (not error red)
- Similar structure to the error alert box in `AuthForm` but with primary/success color
- Example: `border border-[var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)]`

### Project Structure Notes

- `src/app/auth/callback/` is a new directory outside `(auth)` route group — this is intentional because it's a server-side route handler, not a page with the auth layout
- `src/app/(auth)/reset-password/update/` is a nested route under the existing reset-password directory
- All new files follow established monorepo structure under `apps/cotulenh/web/`
- No new packages or workspace changes needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4] — Acceptance criteria and user story
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security] — Supabase Auth, middleware, rate limiting
- [Source: _bmad-output/planning-artifacts/architecture.md#Source Tree] — Route group structure: (auth) centered form layout, `/reset-password` route
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Actions] — `auth.ts` includes `resetPassword`, return `{ success, data?, error? }` format
- [Source: _bmad-output/planning-artifacts/architecture.md#Middleware] — Auth pages list includes `/reset-password`
- [Source: _bmad-output/planning-artifacts/prd.md#NFR14] — HTTPS/WSS only
- [Source: _bmad-output/planning-artifacts/prd.md#NFR15] — Passwords hashed, never plaintext
- [Source: _bmad-output/planning-artifacts/prd.md#NFR16] — RLS: users access own data only
- [Source: _bmad-output/planning-artifacts/prd.md#NFR18] — Rate limiting: 5 failed/min, progressive lockout
- [Source: _bmad-output/implementation-artifacts/1-3-user-registration-login.md] — Previous story patterns, established auth infrastructure

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- `pnpm --filter @cotulenh/web run test` — 59 tests pass
- `pnpm --filter @cotulenh/web run lint` — no errors
- `pnpm --filter @cotulenh/web run check-types` — no errors
- `pnpm --filter @cotulenh/web run build` — successful

### Completion Notes List

- Added `resetRequestSchema` and `updatePasswordSchema` Zod validators with Vietnamese error messages to existing auth validators file.
- Added `requestPasswordReset` and `updatePassword` Server Actions to existing auth actions file, following established patterns (return shape, error mapping, no exceptions).
- `requestPasswordReset` always returns success regardless of email existence (no email enumeration per AC #3).
- Created `/auth/callback` Route Handler for Supabase PKCE code exchange — exchanges code and redirects to the `next` param.
- Replaced reset-password placeholder with `ResetRequestForm` component — single email field, confirmation state after submission.
- Created `UpdatePasswordForm` component with new password + confirm password fields, Zod validation for match/length.
- Created `ResetSuccessBanner` dismissible component for login page when `?reset=success` is present.
- Updated `LoginPage` to async server component to read `searchParams` for reset success banner.
- Added `/reset-password` to middleware `authRoutes` so authenticated users get redirected to dashboard.
- Updated existing auth-pages tests to handle async LoginPage, added reset success banner test.
- All 59 tests pass including 24 new tests across 4 new test files.

### File List

- `apps/cotulenh/web/src/lib/validators/auth.ts` (modified)
- `apps/cotulenh/web/src/lib/validators/__tests__/auth.test.ts` (modified)
- `apps/cotulenh/web/src/lib/actions/auth.ts` (modified)
- `apps/cotulenh/web/src/lib/actions/__tests__/auth.test.ts` (modified)
- `apps/cotulenh/web/src/app/auth/callback/route.ts` (new)
- `apps/cotulenh/web/src/app/auth/__tests__/callback.test.ts` (new)
- `apps/cotulenh/web/src/app/(auth)/reset-password/page.tsx` (modified — replaced placeholder)
- `apps/cotulenh/web/src/app/(auth)/reset-password/__tests__/reset-password.test.tsx` (new)
- `apps/cotulenh/web/src/app/(auth)/reset-password/update/page.tsx` (new)
- `apps/cotulenh/web/src/app/(auth)/reset-password/update/__tests__/update-password.test.tsx` (new)
- `apps/cotulenh/web/src/app/(auth)/login/page.tsx` (modified — async, searchParams, banner)
- `apps/cotulenh/web/src/app/(auth)/__tests__/auth-pages.test.tsx` (modified — async LoginPage tests)
- `apps/cotulenh/web/src/components/auth/reset-request-form.tsx` (new)
- `apps/cotulenh/web/src/components/auth/update-password-form.tsx` (new)
- `apps/cotulenh/web/src/components/auth/reset-success-banner.tsx` (new)
- `apps/cotulenh/web/src/components/auth/__tests__/reset-success-banner.test.tsx` (new)
- `apps/cotulenh/web/src/middleware.ts` (modified — added /reset-password to authRoutes)

## Change Log

- 2026-03-12: Story 1.4 implemented — full password reset flow with PKCE callback, request form, update form, success banner, and 24 new tests.
- 2026-03-12: Addressed code-review findings — hardened callback redirects, added trusted reset-origin handling, enforced update-page session guard, expanded submit-flow tests, and signed out users after password update.
