# Story 2.3: Account Settings

Status: review

## Story

As an authenticated user,
I want to update my email, password, and app preferences,
so that I can manage my account and have my settings persist across devices.

## Acceptance Criteria

### AC1: Email Update (FR10)

```gherkin
Given an authenticated user on the settings page
When they change their email and submit
Then Supabase Auth updates their email (with verification if required)
And they see a confirmation message about the verification email sent
```

### AC2: Password Change (FR10)

```gherkin
Given an authenticated user on the settings page
When they enter their current password, a new password, and confirm the new password
Then their password is updated via Supabase Auth
And they see a success toast confirmation
```

### AC3: App Settings — Authenticated Users (FR11)

```gherkin
Given an authenticated user changes app settings (sounds, move hints, theme, language)
When they toggle a setting
Then the setting is saved to profiles.settings_json in the database AND localStorage
And a toast confirms the save
```

### AC4: Settings Persistence Across Devices (FR11)

```gherkin
Given an authenticated user logs in on a new device
When the app loads
Then their app settings are loaded from profiles.settings_json and applied
```

### AC5: Visitor Settings — Local Only

```gherkin
Given a visitor (not logged in) changes app settings
When they toggle a setting
Then the setting is saved to localStorage only (existing behavior preserved)
```

### AC6: Responsive Layout

```gherkin
Given a user views the settings page
When on mobile (< 768px) → single-column full-width layout
When on tablet/desktop (≥ 768px) → max-width 1200px container, sectioned cards
```

### AC7: Bilingual Support

```gherkin
Given a user views the settings page
Then all labels and messages are displayed in the active language (EN/VI)
```

### AC8: Accessibility (WCAG 2.1 AA)

```gherkin
Given a user interacts with the settings page
Then semantic HTML with proper heading hierarchy is used
And form inputs are associated with labels
And focus indicators are visible (2px outline)
And touch targets are minimum 44x44px on mobile
And error messages are associated with fields via aria-describedby
```

## Tasks / Subtasks

- [x] Task 1: Settings page scaffold and load function (AC: 1, 2, 6, 7, 8)
  - [x] 1.1 Create `/user/settings/+page.server.ts` — load function returns user email and current settings
  - [x] 1.2 Create `/user/settings/+page.svelte` — two-section layout: Account Management + App Preferences
  - [x] 1.3 Page requires auth (existing `/user/+layout.server.ts` guard handles this — no changes needed)

- [x] Task 2: Email update section (AC: 1)
  - [x] 2.1 Create Zod validation schema for email update in `/user/settings/validation.ts`
  - [x] 2.2 Add `updateEmail` named form action in `+page.server.ts`
  - [x] 2.3 Call `supabase.auth.updateUser({ email: newEmail })` — handle verification flow
  - [x] 2.4 Return success with message about verification email sent, or fail with error
  - [x] 2.5 Build email form section in `+page.svelte` with current email display + edit form

- [x] Task 3: Password change section (AC: 2)
  - [x] 3.1 Create Zod validation schema for password change (newPassword min 8, confirmPassword match)
  - [x] 3.2 Add `updatePassword` named form action in `+page.server.ts`
  - [x] 3.3 Call `supabase.auth.updateUser({ password: newPassword })` — the server client has the user's session
  - [x] 3.4 Return success toast or fail with error
  - [x] 3.5 Build password form section in `+page.svelte` with new + confirm fields

- [x] Task 4: App preferences section with DB sync (AC: 3, 4, 5)
  - [x] 4.1 Create `+page.server.ts` action `updateSettings` — receives settings JSON and updates `profiles.settings_json`
  - [x] 4.2 In load function, fetch `profiles.settings_json` and return it alongside user email
  - [x] 4.3 Build app preferences section in `+page.svelte` — toggles/selects for theme, language, sounds, hints, etc.
  - [x] 4.4 On toggle change, immediately save via fetch to the `updateSettings` action (or client-side Supabase call) + update localStorage
  - [x] 4.5 For visitors (no auth), settings save to localStorage only (existing behavior, no DB call)

- [x] Task 5: Settings initialization on login (AC: 4)
  - [x] 5.1 In root `+layout.server.ts` or `+layout.svelte`, when authenticated session detected and `profiles.settings_json` is available, merge DB settings into client-side settings store
  - [x] 5.2 DB settings take precedence over localStorage on login (DB is source of truth for authenticated users)
  - [x] 5.3 Ensure existing `SettingsDialog.svelte` also respects the new persistence layer when user is authenticated

- [x] Task 6: i18n translations (AC: 7)
  - [x] 6.1 Add account settings translation keys to `$lib/i18n/types.ts`
  - [x] 6.2 Add English translations to `$lib/i18n/locales/en.ts`
  - [x] 6.3 Add Vietnamese translations to `$lib/i18n/locales/vi.ts`

- [x] Task 7: Tests (AC: all)
  - [x] 7.1 Load function tests: returns user email, returns settings, requires auth
  - [x] 7.2 Email update action tests: valid email, invalid format, Supabase error handling
  - [x] 7.3 Password change action tests: valid change, mismatch, too short, Supabase error
  - [x] 7.4 Settings update action tests: valid JSON, DB error handling
  - [x] 7.5 Validation schema tests for email and password schemas

## Dev Notes

### Critical Architecture Patterns (MUST FOLLOW)

**Tech Stack:**

- SvelteKit + Svelte 5 runes (`$state`, `$derived`, `$effect`) — NEVER use Svelte 4 stores
- Tailwind 4 for styling (or scoped `<style>` blocks following Story 2.1/2.2 pattern)
- bits-ui components: Switch (toggles), Label (form labels)
- lucide-svelte for icons
- `@supabase/ssr` for server client
- Zod for validation schemas
- `svelte-sonner` for toast notifications

**Supabase Client Access:**

- Server: `event.locals.supabase` (created per-request in hooks.server.ts)
- ALWAYS destructure `{ data, error }` and handle error before using data
- Use `@cotulenh/common` logger for error logging — never raw `console.log`

**Auth Guard:**

The existing `/user/+layout.server.ts` guard protects ALL `/user/*` routes (except public profile). `/user/settings` is automatically protected — no additional auth logic needed in the settings page itself.

### Supabase Auth API for Account Updates

**Email update:**

```typescript
const { data, error } = await supabase.auth.updateUser({ email: newEmail });
// If email changed, Supabase sends verification to NEW email
// User must click link to confirm the change
// Return success message: "Check your new email for verification"
```

**Password update:**

```typescript
const { data, error } = await supabase.auth.updateUser({ password: newPassword });
// Server-side supabase client has the authenticated session
// No need to verify old password via API — the session cookie IS the proof of auth
// Return success toast
```

**Getting current user email:**

```typescript
const {
  data: { user }
} = await supabase.auth.getUser();
// user.email contains current email
```

### Settings DB Sync Pattern (CRITICAL)

**Database column:** `profiles.settings_json` (JSONB, default `{}`) — already exists in schema.

**Settings shape (matches existing `SettingsSchema` in `$lib/stores/settings.ts`):**

```typescript
{
  soundsEnabled: boolean; // default: true
  soundVolume: number; // 0-1, default: 0.5
  showMoveHints: boolean; // default: true
  confirmReset: boolean; // default: true
  showDeployButtons: boolean; // default: true
  autoCompleteDeploy: boolean; // default: true
  theme: 'modern-warfare' | 'classic' | 'forest'; // default: 'modern-warfare'
}
```

**Sync strategy:**

1. **On page load (authenticated):** Load `profiles.settings_json` from DB → merge into page state
2. **On toggle change (authenticated):** Save to DB via form action or client fetch + update localStorage
3. **On toggle change (visitor):** Save to localStorage only (existing `saveSettings()` behavior)
4. **On login (AC4):** Root layout already fetches profile data — extend to include `settings_json` and apply to settings store

**DO NOT refactor `$lib/stores/settings.ts` extensively.** The settings page can manage its own state via the load function and form actions. The existing settings store + SettingsDialog can continue to work with localStorage. The DB sync can be an additive layer.

### UX Pattern for Settings Page

**From UX spec — CRITICAL patterns:**

- **Immediate save on change** for app preferences (toggle/select) — NO save button for individual settings
- **Toast confirmation:** "Setting saved" (4s auto-dismiss) via `svelte-sonner`
- **Group related settings with section headers**
- **Account changes (email, password) DO use submit buttons** (destructive/important actions)

**Page layout:**

```
┌─────────────────────────────────────┐
│ h1: Account Settings                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Account                         │ │
│ │ ┌─── Email ───────────────────┐ │ │
│ │ │ Current: user@example.com   │ │ │
│ │ │ [New Email        ] [Save]  │ │ │
│ │ └─────────────────────────────┘ │ │
│ │ ┌─── Password ────────────────┐ │ │
│ │ │ [New Password     ]         │ │ │
│ │ │ [Confirm Password ]         │ │ │
│ │ │         [Update Password]   │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ App Preferences                 │ │
│ │ Theme:    [Modern] [Classic]    │ │
│ │ Language: [EN] [VI]             │ │
│ │ Sound:    [toggle] Vol [slider] │ │
│ │ Hints:    [toggle]              │ │
│ │ Reset confirm: [toggle]         │ │
│ │ Deploy buttons: [toggle]        │ │
│ │ Auto-deploy: [toggle]           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Existing Code to Reuse (DO NOT REINVENT)

1. **Root layout data:** `+layout.server.ts` already fetches session/user — available via `$page.data`
2. **Auth guard:** `/user/+layout.server.ts` — already protects `/user/settings`
3. **Settings store:** `$lib/stores/settings.ts` — `SettingsSchema`, `loadSettings()`, `saveSettings()`
4. **Persisted state:** `$lib/stores/persisted.svelte.ts` — `persisted()` helper for localStorage
5. **Theme store:** `$lib/stores/theme.svelte.ts` — `themeStore.setTheme()`
6. **i18n system:** `getI18n()` from `$lib/i18n/index.svelte`
7. **Toast:** `toast` from `svelte-sonner` (used in Story 2.1)
8. **Button component:** `$lib/components/ui/button/button.svelte`
9. **Validation pattern:** `$lib/validation/display-name.ts` — Zod schema with `safeParse`
10. **Form action pattern:** Story 2.1 `user/profile/+page.server.ts` — `use:enhance`, validation, error handling
11. **CSS custom properties:** `--theme-bg-panel`, `--theme-text-primary`, `--theme-border`, etc.
12. **SettingsDialog.svelte:** Reference for toggle layout, theme grid, language grid patterns
13. **DB migration:** `supabase/migrations/001_profiles.sql` — `settings_json jsonb DEFAULT '{}'`
14. **Nav link:** Root layout already has `<a href="/user/settings">` in user dropdown

### i18n Keys to Add

```typescript
// Account Settings page
'accountSettings.title': string;              // "Account Settings" / "Cài Đặt Tài Khoản"
'accountSettings.account.title': string;      // "Account" / "Tài Khoản"
'accountSettings.email.label': string;        // "Email Address" / "Địa Chỉ Email"
'accountSettings.email.current': string;      // "Current Email" / "Email Hiện Tại"
'accountSettings.email.new': string;          // "New Email" / "Email Mới"
'accountSettings.email.placeholder': string;  // "Enter new email" / "Nhập email mới"
'accountSettings.email.submit': string;       // "Update Email" / "Cập Nhật Email"
'accountSettings.email.submitting': string;   // "Updating..." / "Đang cập nhật..."
'accountSettings.email.success': string;      // "Verification email sent..." / "..."
'accountSettings.password.title': string;     // "Change Password" / "Đổi Mật Khẩu"
'accountSettings.password.new': string;       // "New Password" / "Mật Khẩu Mới"
'accountSettings.password.newPlaceholder': string;
'accountSettings.password.confirm': string;   // "Confirm Password" / "Xác Nhận Mật Khẩu"
'accountSettings.password.confirmPlaceholder': string;
'accountSettings.password.submit': string;    // "Update Password" / "Cập Nhật Mật Khẩu"
'accountSettings.password.submitting': string;
'accountSettings.password.success': string;   // "Password updated" / "Đã cập nhật mật khẩu"
'accountSettings.preferences.title': string;  // "App Preferences" / "Tùy Chọn Ứng Dụng"
'accountSettings.preferences.saved': string;  // "Preference saved" / "Đã lưu tùy chọn"
'accountSettings.error.emailUpdateFailed': string;
'accountSettings.error.passwordUpdateFailed': string;
'accountSettings.error.settingsUpdateFailed': string;
'accountSettings.validation.emailRequired': string;
'accountSettings.validation.emailInvalid': string;
'accountSettings.validation.passwordRequired': string;
'accountSettings.validation.passwordMinLength': string;
'accountSettings.validation.passwordMismatch': string;
```

**Reuse existing keys where possible:** `settings.theme`, `settings.language`, `settings.soundEffects`, `settings.volume`, `settings.showMoveHints`, `settings.confirmBeforeReset`, `settings.showDeployButtons`, `settings.autoCompleteDeploy`, `settings.theme.*.name`, `settings.theme.*.description`, `settings.saved`.

### Common Mistakes to Prevent

1. **DO NOT** create a new Supabase client — use `event.locals.supabase`
2. **DO NOT** use Svelte 4 stores (`writable`, `readable`) — use Svelte 5 runes only
3. **DO NOT** use `console.log` — use `@cotulenh/common` logger
4. **DO NOT** hardcode strings — all user-facing text through i18n
5. **DO NOT** forget Vietnamese translations for ALL new keys
6. **DO NOT** add auth checks in the settings load function — the layout guard handles it
7. **DO NOT** forget `<svelte:head><title>` for the browser tab (learned from Story 2.2 code review)
8. **DO NOT** forget null fallbacks for DB fields (learned from Story 2.2 code review)
9. **DO NOT** forget to log errors with `logger.error()` before throwing (learned from Story 2.2 code review)
10. **DO NOT** over-engineer the settings sync — keep it simple, additive layer on existing store
11. **DO NOT** remove or break the existing `SettingsDialog.svelte` — it can coexist with the settings page
12. **DO NOT** use form actions for app preference toggles — use immediate save pattern (no submit button)
13. **DO NOT** forget to validate on both client AND server for email/password changes

### Project Structure Notes

**New files to create:**

```
apps/cotulenh/app/src/routes/user/settings/
  +page.server.ts       ← Load user data + form actions (updateEmail, updatePassword, updateSettings)
  +page.svelte          ← Settings page UI (account + app preferences)
  validation.ts         ← Zod schemas for email update and password change
  validation.test.ts    ← Validation schema tests
  page.server.test.ts   ← Load + action tests
```

**Files to modify:**

```
apps/cotulenh/app/src/lib/i18n/types.ts       ← Add account settings keys
apps/cotulenh/app/src/lib/i18n/locales/en.ts  ← Add English translations
apps/cotulenh/app/src/lib/i18n/locales/vi.ts  ← Add Vietnamese translations
```

**Files to verify (NOT modify unless needed):**

```
apps/cotulenh/app/src/routes/user/+layout.server.ts    ← Already protects /user/settings
apps/cotulenh/app/src/routes/+layout.svelte            ← Already has nav link to /user/settings
apps/cotulenh/app/src/lib/stores/settings.ts           ← Existing settings store (read for reference)
apps/cotulenh/app/src/lib/components/SettingsDialog.svelte ← Existing settings dialog (read for UI patterns)
supabase/migrations/001_profiles.sql                   ← profiles.settings_json already exists
```

### Testing Strategy

Follow Story 2.1/2.2 patterns (co-located test files, mock Supabase client):

**`settings/validation.test.ts` must cover:**

1. Email validation: required, valid format, edge cases
2. Password validation: required, min length (8), confirm match, confirm mismatch

**`settings/page.server.test.ts` must cover:**

1. Load function: returns user email and settings data
2. `updateEmail` action: valid email sends update, invalid email returns 400, Supabase error handled
3. `updatePassword` action: valid password updates, mismatch returns 400, too short returns 400, Supabase error handled
4. `updateSettings` action: valid settings JSON updates DB, DB error handled gracefully
5. All actions require authenticated session (401 on no user)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3 — AC and requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Route Structure — /user/settings is Protected]
- [Source: _bmad-output/planning-artifacts/architecture.md#RLS — profiles public read, owner update]
- [Source: _bmad-output/planning-artifacts/architecture.md#Settings Migration — evaluate existing settings system]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Settings — immediate save, toast, grouped sections]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Switch — settings toggles]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive — breakpoints and mobile-first]
- [Source: apps/cotulenh/app/src/lib/stores/settings.ts — existing SettingsSchema and load/save functions]
- [Source: apps/cotulenh/app/src/lib/stores/persisted.svelte.ts — localStorage persistence helper]
- [Source: apps/cotulenh/app/src/lib/components/SettingsDialog.svelte — existing settings UI patterns]
- [Source: apps/cotulenh/app/src/routes/user/profile/+page.server.ts — Story 2.1 form action pattern]
- [Source: apps/cotulenh/app/src/routes/user/profile/+page.svelte — Story 2.1 UI/layout pattern]
- [Source: supabase/migrations/001_profiles.sql — profiles table with settings_json column]
- [Source: _bmad-output/implementation-artifacts/2-1-display-name-own-profile.md — Story 2.1 patterns]
- [Source: _bmad-output/implementation-artifacts/2-2-public-user-profiles.md — Story 2.2 patterns and code review learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed `Settings` name collision with lucide-svelte icon import in root layout (renamed type import to `AppSettings`)
- Type inference for `settingsJson` on profile required explicit cast in root layout due to Supabase JSONB column typing

### Completion Notes List

- Created full account settings page with two-section layout: Account Management (email + password) and App Preferences
- Email update uses `supabase.auth.updateUser({ email })` with verification flow and confirmation message
- Password change uses `supabase.auth.updateUser({ password })` with Zod validation (min 8 chars, confirm match)
- App preferences use immediate save pattern (no submit button) — each toggle/change triggers DB + localStorage save
- DB sync via `updateSettings` form action saves settings JSON to `profiles.settings_json`
- Root layout extended to fetch `settings_json` and merge into localStorage on login (AC4 cross-device persistence)
- Existing `SettingsDialog.svelte` preserved unchanged — settings page is additive layer
- All user-facing strings use i18n with EN + VI translations (27 new keys)
- Scoped `<style>` blocks with CSS custom properties for theme compatibility
- Responsive: single-column on mobile (<768px), max-width 1200px container on desktop
- WCAG 2.1 AA: semantic HTML, heading hierarchy, label associations, aria-describedby for errors, visible focus indicators, 44x44px touch targets
- `<svelte:head><title>` for browser tab (learned from Story 2.2 code review)
- Null fallbacks for all DB fields (learned from Story 2.2 code review)
- `logger.error()` before all error returns (learned from Story 2.2 code review)
- 31 tests: 11 validation schema + 20 server-side (load + 3 actions + auth checks)
- Full regression suite: 180 tests pass, 0 failures

### File List

**New files:**

- `apps/cotulenh/app/src/routes/user/settings/+page.server.ts` — Load function + 3 form actions (updateEmail, updatePassword, updateSettings)
- `apps/cotulenh/app/src/routes/user/settings/+page.svelte` — Settings page UI (account + app preferences)
- `apps/cotulenh/app/src/routes/user/settings/validation.ts` — Zod schemas for email update and password change
- `apps/cotulenh/app/src/routes/user/settings/validation.test.ts` — 11 validation schema tests
- `apps/cotulenh/app/src/routes/user/settings/page.server.test.ts` — 20 load + action tests

**Modified files:**

- `apps/cotulenh/app/src/lib/i18n/types.ts` — Added 27 account settings translation keys
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` — Added English translations for account settings
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — Added Vietnamese translations for account settings
- `apps/cotulenh/app/src/routes/+layout.server.ts` — Extended profile query to include `settings_json`
- `apps/cotulenh/app/src/routes/+layout.svelte` — Added DB settings sync to localStorage on login

## Change Log

- 2026-03-02: Implemented Story 2.3 Account Settings — email update, password change, app preferences with DB sync, i18n, and comprehensive tests
