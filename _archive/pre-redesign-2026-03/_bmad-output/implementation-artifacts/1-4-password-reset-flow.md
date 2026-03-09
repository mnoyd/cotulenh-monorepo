# Story 1.4: Password Reset Flow

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who forgot their password,
I want to request a password reset via email and set a new password,
So that I can regain access to my account.

## Acceptance Criteria

1. **AC-1: Forgot Password Page — Request Reset** — Given a user on the `/auth/forgot-password` page, when they enter their registered email and submit, then `supabase.auth.resetPasswordForEmail(email, { redirectTo })` is called, where `redirectTo` points to `/auth/callback?next=/auth/reset-password`, and a "check your email" confirmation message is displayed.

2. **AC-2: Email Enumeration Prevention** — Given a user enters an unregistered email on the forgot-password page, when they submit, then they see the exact same "check your email" confirmation message as for a registered email. The response must be identical in timing and content — no information leakage about whether the email exists.

3. **AC-3: Auth Callback Handles Recovery Type** — Given a user clicks the password reset link in their email, when they are redirected to `/auth/callback` with `type=recovery` and a `token_hash`, then the existing callback route calls `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`, establishes a session (storing it in cookies), and redirects the user to `/auth/reset-password`. The existing callback code already handles `type=recovery` via its generic `verifyOtp` call — verify this works end-to-end and that the `next` parameter is set correctly.

4. **AC-4: Reset Password Page — Set New Password** — Given a user lands on `/auth/reset-password` with a valid session (established by the magic link callback), when they see the page, then they are presented with a form containing two fields: "New password" and "Confirm password".

5. **AC-5: Password Validation on Reset Page** — Given a user enters a new password on the reset page, when they submit, then the password must meet the same validation rules as registration (minimum 8 characters). Both fields must match. Zod schema validates on blur (client-side) and on submit (server-side). Inline error messages appear below each field with the same styling as the register page.

6. **AC-6: Successful Password Update** — Given a user enters a valid matching new password on the reset page, when they submit, then `supabase.auth.updateUser({ password })` is called (the user is authenticated via the magic link session), the password is updated, the user is redirected to `/auth/login` with a `?message=password-reset-success` query parameter, and a success toast or inline message is shown on the login page.

7. **AC-7: Reset Page Without Session — Guard** — Given a user navigates directly to `/auth/reset-password` without a valid session (e.g., bookmarked URL, expired link), when the page loads on the server, then they are redirected to `/auth/forgot-password` with an appropriate message (e.g., "Your reset link has expired. Please request a new one.").

8. **AC-8: i18n Coverage** — All form labels, buttons, headings, error messages, success messages, confirmation messages, and placeholders for both the forgot-password and reset-password pages display correctly in both EN and VI when the language is toggled. Use existing `getI18n()` / `i18n.t()` pattern.

9. **AC-9: Back to Login Link** — The forgot-password page includes a "Back to login" link pointing to `/auth/login`. The reset-password page includes a "Back to login" link pointing to `/auth/login`.

10. **AC-10: Visual Consistency** — Both new pages follow the same visual design pattern as the register page: dark theme, centered card (max-width 420px), logo at top, 44px touch targets for inputs and buttons, radial gradient background, consistent field styling with icons.

11. **AC-11: Regression Safety** — All existing tests pass. Registration flow, login flow (Story 1.2), auth callback for `type=signup`, and anonymous access to `/learn/*`, `/play`, `/board-editor` remain unaffected.

## Tasks / Subtasks

- [ ] Task 1: Create forgot-password validation schema (AC: 1, 5)
  - [ ] Create `src/routes/auth/forgot-password/validation.ts` with Zod schema for email-only form
  - [ ] Create `src/routes/auth/forgot-password/validation.test.ts` with edge case tests (empty email, invalid email, valid email)

- [ ] Task 2: Create forgot-password form action (AC: 1, 2)
  - [ ] Create `src/routes/auth/forgot-password/+page.server.ts` with form action calling `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
  - [ ] `redirectTo` must be constructed as `${url.origin}/auth/callback?next=/auth/reset-password` — this ensures the reset magic link goes through the existing auth callback, which sets the session and then redirects to the reset page
  - [ ] Always return `{ success: true }` after the Supabase call regardless of whether the email exists (enumeration prevention)
  - [ ] Server-side Zod validation before calling Supabase — return `fail(400, { errors, email })` for invalid email format
  - [ ] Create `src/routes/auth/forgot-password/page.server.test.ts` with tests for: valid email shows success, invalid email format returns validation error, unregistered email still shows success (enumeration prevention), Supabase error still shows success (silent failure)

- [ ] Task 3: Create forgot-password page UI (AC: 1, 2, 8, 9, 10)
  - [ ] Create `src/routes/auth/forgot-password/+page.svelte` matching the register page's visual design
  - [ ] 1 field only: email
  - [ ] Client-side Zod validation on blur (same pattern as register)
  - [ ] `use:enhance` for progressive enhancement
  - [ ] Loading state on submit button
  - [ ] On success (`form?.success`): show "check your email" confirmation message with Mail icon (same pattern as register's verify email state)
  - [ ] "Back to login" link below the form
  - [ ] Preserve email in form data on server error

- [ ] Task 4: Create reset-password validation schema (AC: 5)
  - [ ] Create `src/routes/auth/reset-password/validation.ts` with Zod schema for password + confirmPassword (password min 8 chars, confirmPassword must match via `.refine()`)
  - [ ] Create `src/routes/auth/reset-password/validation.test.ts` with edge case tests (empty password, short password, passwords don't match, valid matching passwords)

- [ ] Task 5: Create reset-password form action with session guard (AC: 4, 5, 6, 7)
  - [ ] Create `src/routes/auth/reset-password/+page.server.ts` with:
    - `load` function: check session via `locals.safeGetSession()`. If no user, redirect to `/auth/forgot-password?expired=true`
    - Form action: validate with Zod, call `supabase.auth.updateUser({ password })`, on success redirect to `/auth/login?message=password-reset-success`
    - On Supabase error: return `fail(400, { errors: { form: 'resetFailed' } })`
  - [ ] Create `src/routes/auth/reset-password/page.server.test.ts` with tests for: session guard redirects when no session, valid password update, password validation errors, passwords don't match, Supabase updateUser error

- [ ] Task 6: Create reset-password page UI (AC: 4, 5, 8, 9, 10)
  - [ ] Create `src/routes/auth/reset-password/+page.svelte` matching the register page's visual design
  - [ ] 2 fields: new password + confirm password
  - [ ] Client-side Zod validation on blur (password length + match check)
  - [ ] `use:enhance` for progressive enhancement
  - [ ] Loading state on submit button
  - [ ] "Back to login" link below the form
  - [ ] Lock icons for both password fields

- [ ] Task 7: Verify auth callback handles recovery type (AC: 3)
  - [ ] Review existing `/auth/callback/+server.ts` — confirm it already handles `type=recovery` via the generic `verifyOtp` call (it does — the type is cast to include `'recovery'`)
  - [ ] Verify the `next` parameter redirect works: after `verifyOtp` succeeds for recovery type, user should be redirected to `/auth/reset-password` (via `safeNext`)
  - [ ] Add a test case in `src/routes/auth/callback/server.test.ts` (or create if not exists) verifying recovery type handling
  - [ ] No code changes expected — just verification and a test

- [ ] Task 8: Add i18n keys (AC: 8)
  - [ ] Add `auth.forgotPassword.*` keys to `en.ts` and `vi.ts`
  - [ ] Add `auth.resetPassword.*` keys to `en.ts` and `vi.ts`
  - [ ] Add `auth.validation.passwordMismatch` key to `en.ts` and `vi.ts`
  - [ ] Add `auth.validation.confirmPasswordRequired` key to `en.ts` and `vi.ts`
  - [ ] Add keys to `types.ts` TranslationKeys interface

- [ ] Task 9: Regression verification (AC: 11)
  - [ ] All existing app tests pass
  - [ ] `turbo build`, `turbo lint`, `turbo check-types`, `turbo test` all pass
  - [ ] Registration flow still works
  - [ ] Auth callback still handles `type=signup` correctly
  - [ ] Anonymous access to `/learn/*`, `/play`, `/board-editor` unaffected

## Dev Notes

### Critical Patterns from Previous Stories (MUST FOLLOW)

**Svelte 5 Runes -- MANDATORY:**

- All client-side state: `$state()`, `$derived()`, `$effect()`
- Component props: `$props()` and `$bindable()`
- NO Svelte 4 stores from `svelte/store`
- Reactive class pattern: `.svelte.ts` extension

**Supabase Client Pattern:**

- Browser client via `$page.data.supabase` (created in `+layout.ts`)
- Server client via `event.locals.supabase` (created per-request in `hooks.server.ts`)
- Never create Supabase clients directly in components
- Always destructure `{ data, error }` from every Supabase call

**safeGetSession() -- already implemented in `hooks.server.ts`:**

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
- `fail(400, { errors, email })` for validation failures
- Return form data on error so fields repopulate without JS

**Error Handling:**

- Use `@cotulenh/common` logger (no raw `console.log`)
- Map Supabase errors to i18n keys
- Same generic message for ALL auth failures (email enumeration prevention)

**Open Redirect Prevention (from Story 1.1 code review fix):**

```typescript
// Validate redirectTo is a relative path -- MUST do this
function isRelativePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}
```

### Supabase Password Reset API

**Step 1: Request Reset (forgot-password page)**

Method: `supabase.auth.resetPasswordForEmail(email, { redirectTo })`

- Sends a password reset email to the specified address
- `redirectTo` must be the full URL of the auth callback: `${url.origin}/auth/callback?next=/auth/reset-password`
- The email contains a magic link that redirects to the callback URL with `token_hash` and `type=recovery`
- Returns `{ data: {}, error: null }` on success — even if email doesn't exist (Supabase handles enumeration prevention at the API level)
- If Supabase is configured to NOT prevent enumeration, the server action must still show the same success message regardless of error

**Important:** The `redirectTo` URL must be added to the "Redirect URLs" allowlist in the Supabase Dashboard under Authentication > URL Configuration. The pattern `http://localhost:*/auth/callback*` should be added for local development.

**Step 2: Magic Link Callback (existing `/auth/callback/+server.ts`)**

The existing callback already handles this:

```typescript
// Already in place from Story 1.1:
const type = url.searchParams.get('type') as
  | 'email'
  | 'recovery'
  | 'invite'
  | 'magiclink'
  | 'signup';
// ...
const { error } = await supabase.auth.verifyOtp({ token_hash, type });
// On success, redirects to safeNext (which will be /auth/reset-password)
```

The `type=recovery` is already in the type union. The `verifyOtp` call is generic and works for all types. The `next=/auth/reset-password` parameter will be passed through to `safeNext`. **No changes to the callback route are needed.**

**Step 3: Update Password (reset-password page)**

Method: `supabase.auth.updateUser({ password })`

- The user must be authenticated (session established by the magic link callback in Step 2)
- Call this from a form action on the server side using `event.locals.supabase`
- Returns `{ data: { user }, error: null }` on success
- Returns `{ data: { user: null }, error: AuthError }` on failure
- After success, redirect to `/auth/login?message=password-reset-success`

**Session Requirement:** The `updateUser` call works because the magic link callback (`verifyOtp`) establishes a session and stores it in cookies. When the user is redirected to `/auth/reset-password`, the `hooks.server.ts` middleware reads the session cookie and attaches the authenticated Supabase client to `event.locals.supabase`. This means the server-side `updateUser` call is automatically authenticated.

### Auth Callback -- No Modification Needed

The existing `/auth/callback/+server.ts` already handles `type=recovery`:

- The `type` parameter is typed to include `'recovery'`
- `verifyOtp({ token_hash, type })` is a generic call that works for all OTP types
- The `next` query parameter will be set to `/auth/reset-password` by the `resetPasswordForEmail` redirectTo URL
- The `safeNext` validation already allows `/auth/reset-password` (it's a valid relative path)

**Verification needed:** Write a test confirming recovery type flows through the callback correctly. No code changes expected.

### Architecture Compliance

| Rule                   | Requirement                                   | How to Follow                                                            |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| Session validation     | Only through `hooks.server.ts`                | Use `locals.safeGetSession()` in reset-password load function            |
| RLS security           | Anon key is public-safe                       | Already configured                                                       |
| No direct clients      | Never in components                           | Use `$page.data.supabase` (browser) and `event.locals.supabase` (server) |
| i18n                   | All strings in `en.ts` + `vi.ts`              | Add `auth.forgotPassword.*` and `auth.resetPassword.*` keys              |
| Cookie sessions        | Via `@supabase/ssr`                           | Session from magic link stored in cookies automatically                  |
| Zod validation         | No additional validation libraries            | Create forgot-password and reset-password schemas                        |
| Build checks           | `turbo build/lint/check-types/test` must pass | Run all at end                                                           |
| Enumeration prevention | Generic responses for all auth operations     | Always show "check your email" regardless of email existence             |

### UX Spec Requirements

- **Forgot-password form:** 1 field only -- email
- **Reset-password form:** 2 fields -- new password + confirm password
- **Validation:** Real-time on blur, summary on submit
- **Error state:** Field border turns red, inline message below
- **Submit button:** Loading state while submitting
- **Visual design:** Match register page -- dark theme, centered card, logo, 44px touch targets, `max-width: 420px`, radial gradient background
- **Success state (forgot-password):** Show "check your email" message with Mail icon (same layout as register verify email state)
- **Navigation links:** "Back to login" on both pages

### Project Structure Notes

**Files to CREATE (all paths relative to `apps/cotulenh/app/`):**

- `src/routes/auth/forgot-password/+page.svelte`
- `src/routes/auth/forgot-password/+page.server.ts`
- `src/routes/auth/forgot-password/validation.ts`
- `src/routes/auth/forgot-password/validation.test.ts`
- `src/routes/auth/forgot-password/page.server.test.ts`
- `src/routes/auth/reset-password/+page.svelte`
- `src/routes/auth/reset-password/+page.server.ts`
- `src/routes/auth/reset-password/validation.ts`
- `src/routes/auth/reset-password/validation.test.ts`
- `src/routes/auth/reset-password/page.server.test.ts`

**Files to UPDATE:**

- `apps/cotulenh/app/src/lib/i18n/types.ts` -- add `auth.forgotPassword.*`, `auth.resetPassword.*`, and new `auth.validation.*` keys
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` -- add English translations for forgot-password and reset-password
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` -- add Vietnamese translations for forgot-password and reset-password

**Files to VERIFY (not modify):**

- `apps/cotulenh/app/src/routes/auth/callback/+server.ts` -- confirm recovery type handling works (add test only)

**Files NOT to touch:**

- `hooks.server.ts` -- already complete
- `+layout.server.ts` -- already passes session
- `+layout.ts` -- already creates browser client
- `+layout.svelte` -- already has `onAuthStateChange`
- Registration routes -- no changes needed
- Login routes -- no changes needed (Story 1.2 will add login; Story 1.3 adds "Forgot password?" link on login page)
- All packages under `packages/cotulenh/`
- Existing play/learn/board-editor routes

### i18n Keys to Add

**English (`en.ts`):**

```typescript
// Forgot Password
'auth.forgotPassword.title': 'Reset Password',
'auth.forgotPassword.subtitle': 'Enter your email to receive a reset link',
'auth.forgotPassword.email': 'Email',
'auth.forgotPassword.emailPlaceholder': 'your@email.com',
'auth.forgotPassword.submit': 'Send Reset Link',
'auth.forgotPassword.submitting': 'Sending...',
'auth.forgotPassword.backToLogin': 'Back to login',
'auth.forgotPassword.checkEmail': 'Check your email',
'auth.forgotPassword.checkEmailDesc': 'If an account exists with that email, we sent a password reset link. Please check your inbox.',

// Reset Password
'auth.resetPassword.title': 'Set New Password',
'auth.resetPassword.subtitle': 'Enter your new password below',
'auth.resetPassword.newPassword': 'New Password',
'auth.resetPassword.newPasswordPlaceholder': 'At least 8 characters',
'auth.resetPassword.confirmPassword': 'Confirm Password',
'auth.resetPassword.confirmPasswordPlaceholder': 'Re-enter your password',
'auth.resetPassword.submit': 'Update Password',
'auth.resetPassword.submitting': 'Updating...',
'auth.resetPassword.backToLogin': 'Back to login',
'auth.resetPassword.success': 'Your password has been updated successfully.',
'auth.resetPassword.expiredLink': 'Your reset link has expired. Please request a new one.',

// Additional validation keys
'auth.validation.confirmPasswordRequired': 'Please confirm your password',
'auth.validation.passwordMismatch': 'Passwords do not match',

// Additional error key
'auth.error.resetFailed': 'Password reset failed. Please try again.',
```

**Vietnamese (`vi.ts`):**

```typescript
// Forgot Password
'auth.forgotPassword.title': 'Khoi Phuc Mat Khau',
'auth.forgotPassword.subtitle': 'Nhap email de nhan lien ket khoi phuc',
'auth.forgotPassword.email': 'Email',
'auth.forgotPassword.emailPlaceholder': 'email@cuaban.com',
'auth.forgotPassword.submit': 'Gui Lien Ket Khoi Phuc',
'auth.forgotPassword.submitting': 'Dang gui...',
'auth.forgotPassword.backToLogin': 'Quay lai dang nhap',
'auth.forgotPassword.checkEmail': 'Kiem tra email',
'auth.forgotPassword.checkEmailDesc': 'Neu tai khoan ton tai voi email nay, chung toi da gui lien ket khoi phuc mat khau. Vui long kiem tra hop thu.',

// Reset Password
'auth.resetPassword.title': 'Dat Mat Khau Moi',
'auth.resetPassword.subtitle': 'Nhap mat khau moi cua ban',
'auth.resetPassword.newPassword': 'Mat Khau Moi',
'auth.resetPassword.newPasswordPlaceholder': 'It nhat 8 ky tu',
'auth.resetPassword.confirmPassword': 'Xac Nhan Mat Khau',
'auth.resetPassword.confirmPasswordPlaceholder': 'Nhap lai mat khau',
'auth.resetPassword.submit': 'Cap Nhat Mat Khau',
'auth.resetPassword.submitting': 'Dang cap nhat...',
'auth.resetPassword.backToLogin': 'Quay lai dang nhap',
'auth.resetPassword.success': 'Mat khau cua ban da duoc cap nhat thanh cong.',
'auth.resetPassword.expiredLink': 'Lien ket khoi phuc da het han. Vui long yeu cau lien ket moi.',

// Additional validation keys
'auth.validation.confirmPasswordRequired': 'Vui long xac nhan mat khau',
'auth.validation.passwordMismatch': 'Mat khau khong khop',

// Additional error key
'auth.error.resetFailed': 'Khoi phuc mat khau that bai. Vui long thu lai.',
```

**Note on Vietnamese text:** The actual Vietnamese translations should use proper diacritics (e.g., "Khoi Phuc Mat Khau" should be "Khoi Phuc Mat Khau" with appropriate marks). Follow the existing pattern in `vi.ts` which uses full Vietnamese diacritics.

### Naming Conventions

- DB columns: `snake_case`
- TypeScript: `camelCase`
- Svelte components: `PascalCase.svelte`
- Routes: `kebab-case`
- Test files: co-located, `*.test.ts` or `page.server.test.ts`

### Dependencies

**All dependencies already installed (from Story 1.1):**

- `@supabase/supabase-js` ^2.98.0
- `@supabase/ssr` ^0.8.0
- `zod` (validation)
- `lucide-svelte` (icons: `Mail`, `Lock`, `AlertCircle`)
- `bits-ui` (UI primitives)
- `svelte-sonner` (toasts)
- `dompurify` -- NOT needed for password reset (no user-generated content stored)

**Do NOT install any new dependencies.**

### Testing Requirements

**Framework:** Vitest, co-located test files

**Tests to create:**

1. `forgot-password/validation.test.ts` -- Zod email schema: empty email, invalid email format, valid email
2. `forgot-password/page.server.test.ts` -- Forgot-password form action: valid email returns success, invalid email format returns fail(400), Supabase error still returns success (enumeration prevention), unregistered email still returns success
3. `reset-password/validation.test.ts` -- Zod reset schema: empty password, short password (< 8 chars), passwords don't match, empty confirm password, valid matching passwords
4. `reset-password/page.server.test.ts` -- Reset-password:
   - Load function: no session redirects to `/auth/forgot-password?expired=true`
   - Load function: valid session allows page to render
   - Form action: valid matching passwords update successfully
   - Form action: password too short returns validation error
   - Form action: passwords don't match returns validation error
   - Form action: Supabase `updateUser` error returns generic failure
5. Auth callback recovery test -- Add test verifying `type=recovery` with valid `token_hash` and `next=/auth/reset-password` works correctly

**Test patterns (from Story 1.1):**

- Mock Supabase with `vi.mock('@supabase/ssr')`
- Test form actions by calling them directly with mock `event`
- Test the actual exported functions, not reimplementations (Story 1.1 code review fix)
- For the `load` function test: mock `locals.safeGetSession()` returning `{ session: null, user: null }` and verify redirect is thrown

**Regression:** All existing 50+ app tests + monorepo tests must continue passing.

### Key Implementation Details

**Forgot-password `+page.server.ts` pattern:**

```typescript
// Form action
export const actions: Actions = {
  default: async ({ request, url, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;

    // Validate with Zod
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return fail(400, { errors: fieldErrors, email });
    }

    // Always show success regardless of whether email exists
    await supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: `${url.origin}/auth/callback?next=/auth/reset-password`
    });

    return { success: true };
  }
};
```

**Reset-password `+page.server.ts` pattern:**

```typescript
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
  const { user } = await safeGetSession();
  if (!user) {
    redirect(303, '/auth/forgot-password?expired=true');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validate with Zod
    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      // Map errors...
      return fail(400, { errors: fieldErrors });
    }

    const { error } = await supabase.auth.updateUser({ password: result.data.password });
    if (error) {
      return fail(400, { errors: { form: 'resetFailed' } });
    }

    redirect(303, '/auth/login?message=password-reset-success');
  }
};
```

**Reset-password Zod schema pattern:**

```typescript
import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    password: z.string().min(1, 'passwordRequired').min(8, 'passwordMinLength'),
    confirmPassword: z.string().min(1, 'confirmPasswordRequired')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword']
  });
```

### Login Page Integration Note

Story 1.3 (auth-aware navigation) specifies adding a "Forgot password?" link on the login page pointing to `/auth/forgot-password`. This story (1.4) creates the target page. If Story 1.2 (login) is implemented first, the "Forgot password?" link can optionally be added during Story 1.2 or deferred to Story 1.3. This story does NOT modify the login page.

If Story 1.2 is already implemented when this story is being developed, the developer should verify that `/auth/login` correctly handles the `?message=password-reset-success` query parameter to show a success toast/message when redirected from a successful password reset.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Route Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns]
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/1-1-user-registration.md#Completion Notes]
- [Source: _bmad-output/implementation-artifacts/1-2-user-login-persistent-sessions.md#Dev Notes]
- [Source: apps/cotulenh/app/src/routes/auth/callback/+server.ts — existing recovery type handling]
- [Source: apps/cotulenh/app/src/routes/auth/register/+page.svelte — visual pattern reference]
- [Source: apps/cotulenh/app/src/routes/auth/register/validation.ts — Zod schema pattern reference]

### Previous Story Intelligence (Stories 1.1 + 1.2)

**Key learnings to carry forward:**

- `adapter-vercel` needs explicit `runtime: 'nodejs22.x'` (Node 23 not supported on Vercel)
- `.env.local` must be at app directory level (`apps/cotulenh/app/`) for Vite
- Open redirect vulnerability was caught in code review -- apply relative path validation from the start
- Code review found tests reimplementing logic instead of testing the real exports -- test actual exports
- Progressive enhancement: form fields should initialize from server-returned data (`$page.form`)
- Code review added "Already have an account? Sign in" link to register -- password reset pages need equivalent navigation links
- All Supabase calls must destructure `{ data, error }` -- never assume success
- The auth callback already types `recovery` in its union type -- no code change needed there

**Installed package versions (confirmed from Story 1.1):**

- `@supabase/supabase-js` 2.98.0
- `@supabase/ssr` 0.8.0
- `@sveltejs/adapter-vercel` 6.3.3

**Env var name:** `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (NOT the older `PUBLIC_SUPABASE_ANON_KEY`)

**Supabase Dashboard Requirement:** The redirect URL pattern must be added to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs. For local development, add: `http://localhost:5173/auth/callback` (or the appropriate port). For production, add the production callback URL.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
