# Story 1.5: App Shell & Navigation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want a persistent navigation structure that adapts to my screen size,
so that I can move between sections of the platform quickly.

## Acceptance Criteria

1. **Given** an authenticated user is on any `(app)` route on desktop (>1024px)
   **When** the page renders
   **Then** a left sidebar (48px) is displayed with icon navigation items for Dashboard, Play, Friends, Leaderboard, and Settings
   **And** the active route is visually highlighted with a 3px left border accent in primary color
   **And** all nav items have keyboard focus indicators meeting WCAG 2.1 AA (NFR20)

2. **Given** an authenticated user is on any `(app)` route on mobile (<1024px)
   **When** the page renders
   **Then** a bottom tab bar (56px) is displayed with the same navigation items
   **And** touch targets are at least 44x44px with 8px gaps between adjacent targets

3. **Given** the `(app)` layout is rendering
   **When** a route change occurs within the app
   **Then** skeleton screens are shown for async content (never spinners for page loads)
   **And** the sidebar/bottom bar remains persistent and does not re-render

4. **Given** the `(auth)` route group
   **When** signup, login, or reset-password pages render
   **Then** a centered form layout is used without the app sidebar/bottom bar

## Tasks / Subtasks

- [x] Task 1: Create `(app)/layout.tsx` — the app shell layout (AC: #1, #2, #3, #4)
  - [x] Create `src/app/(app)/layout.tsx` as a Server Component
  - [x] Import and render `Sidebar` (desktop) and `BottomTabBar` (mobile) components
  - [x] Main content area fills remaining space: `ml-[48px]` on desktop (>=1024px), `mb-[56px]` on mobile (<1024px)
  - [x] Content area has no max-width constraint (board-centric layout needs full width later)
  - [x] Verify middleware already protects all `(app)` routes (it does — confirmed in existing `middleware.ts`)

- [x] Task 2: Create `Sidebar` component for desktop navigation (AC: #1)
  - [x] Create `src/components/layout/sidebar.tsx` as a client component (`"use client"`)
  - [x] Fixed position, left side, full height, 48px wide
  - [x] Background: `var(--sidebar)`, right border: `var(--sidebar-border)`
  - [x] Hidden on mobile (<1024px): use `hidden lg:flex` responsive classes
  - [x] Sidebar items (vertically stacked): Dashboard (Home), Play (Swords), Friends (Users), Leaderboard (Medal), Settings (Settings)
  - [x] Each nav item: 48x48px clickable area, icon centered (20px), Lucide React icons
  - [x] Active route detection via `usePathname()` from `next/navigation`
  - [x] Active indicator: 3px left border in `var(--sidebar-primary)` color
  - [x] Hover state: `var(--sidebar-accent)` background
  - [x] Tooltip on hover with Vietnamese section name, 200ms delay (use `title` attribute or custom tooltip)
  - [x] Keyboard navigable: logical tab order, visible focus ring `outline-2 outline-offset-2 outline-[var(--color-primary)]`
  - [x] Use `<nav aria-label="Thanh điều hướng">` as semantic wrapper
  - [x] Each link uses `<Link>` from `next/link` with `aria-label` for the section name

- [x] Task 3: Create `BottomTabBar` component for mobile navigation (AC: #2)
  - [x] Create `src/components/layout/bottom-tab-bar.tsx` as a client component (`"use client"`)
  - [x] Fixed position, bottom, full width, 56px tall
  - [x] Background: `var(--color-surface)`, top border: `var(--color-border)`
  - [x] Visible only on mobile (<1024px): use `flex lg:hidden` responsive classes
  - [x] 5 tabs: Trang chủ (Home), Chơi (Play), Bạn bè (Users), BXH (Medal), Cài đặt (Settings)
  - [x] Each tab: icon (20px) + Vietnamese label below (text-xs), vertically centered
  - [x] Touch targets: min 44x44px, 8px gap between items — use `min-w-[44px] min-h-[44px]` with `gap-[var(--space-2)]`
  - [x] Active tab: `var(--color-primary)` icon and label color
  - [x] Inactive tab: `var(--color-text-muted)` icon and label color
  - [x] Active route detection via `usePathname()`
  - [x] Use `<nav aria-label="Thanh điều hướng">` as semantic wrapper
  - [x] Each link uses `<Link>` from `next/link` with `aria-current="page"` for active tab
  - [x] Keyboard navigable with visible focus indicators

- [x] Task 4: Create `loading.tsx` skeleton screens for `(app)` routes (AC: #3)
  - [x] Create `src/app/(app)/dashboard/loading.tsx` — skeleton for dashboard
  - [x] Skeleton pattern: pulsing `bg-[var(--color-surface-elevated)]` blocks with `animate-pulse`
  - [x] Dashboard skeleton: 3 card-shaped placeholders (matching future dashboard cards)
  - [x] NO spinner components — skeleton blocks only (architecture mandate)

- [x] Task 5: Write tests (all ACs)
  - [x] Component test for Sidebar: renders nav items, active state for current route, hidden on mobile viewport
  - [x] Component test for BottomTabBar: renders tabs with Vietnamese labels, active state, hidden on desktop
  - [x] Component test for (app) layout: renders sidebar and bottom bar, wraps children
  - [x] Test keyboard navigation: tab order through nav items
  - [x] Test aria attributes: `aria-label`, `aria-current` presence
  - [x] Test loading.tsx: renders skeleton elements

- [x] Task 6: Quality gates
  - [x] `pnpm --filter @cotulenh/web run build` succeeds
  - [x] `pnpm --filter @cotulenh/web run test` — all tests pass
  - [x] `pnpm --filter @cotulenh/web run lint` — no errors
  - [x] `pnpm --filter @cotulenh/web run check-types` — no errors

## Dev Notes

### Architecture Compliance

**Route structure — MANDATORY:**
- App shell layout: `src/app/(app)/layout.tsx` (CREATE — does NOT exist yet)
- Dashboard loading: `src/app/(app)/dashboard/loading.tsx` (CREATE)
- Sidebar: `src/components/layout/sidebar.tsx` (CREATE)
- Bottom tab bar: `src/components/layout/bottom-tab-bar.tsx` (CREATE)
- The `(auth)` layout already exists at `src/app/(auth)/layout.tsx` — DO NOT modify it
- The `(public)` layout already exists at `src/app/(public)/layout.tsx` — DO NOT modify it

**Component locations — MANDATORY:**
- All navigation/shell components go in `src/components/layout/`
- `landing-nav.tsx` already exists there — follow the same code style and patterns
- Do NOT create components inside `src/app/` route directories (only `page.tsx`, `layout.tsx`, `loading.tsx`)

**Naming conventions — MANDATORY:**
- Component files: `kebab-case.tsx` (e.g., `sidebar.tsx`, `bottom-tab-bar.tsx`)
- Component exports: PascalCase named exports (e.g., `export function Sidebar()`)
- CSS: Use design tokens via `var(--token-name)` from globals.css, NOT hardcoded colors
- Tailwind classes with CSS custom properties: `text-[var(--color-text)]` pattern (see `landing-nav.tsx`)

**Layout hierarchy — CRITICAL:**
```
src/app/layout.tsx          → Root layout (<html lang="vi">, providers)
├── src/app/(public)/layout.tsx → Minimal nav (LandingNav)
├── src/app/(auth)/layout.tsx   → Centered form layout
└── src/app/(app)/layout.tsx    → App shell (Sidebar + BottomTabBar) ← CREATE THIS
    └── dashboard/page.tsx      → Already exists (placeholder)
```

### Technical Requirements

**Responsive breakpoint — SINGLE SOURCE OF TRUTH:**
- `<1024px` (below `lg`): Bottom tab bar navigation
- `>=1024px` (`lg` and above): Left sidebar navigation
- Tailwind classes: `hidden lg:flex` for sidebar, `flex lg:hidden` for bottom bar
- This matches the architecture's single breakpoint at 1024px for nav switch

**Navigation items with route mapping:**

| Section | Vietnamese Label | Icon (Lucide) | Route | Desktop | Mobile |
|---------|-----------------|---------------|-------|---------|--------|
| Dashboard | Trang chủ | `Home` | `/dashboard` | Top group | Tab 1 |
| Play | Chơi | `Swords` | `/play` | Top group | Tab 2 |
| Friends | Bạn bè | `Users` | `/friends` | Top group | Tab 3 |
| Leaderboard | BXH | `Medal` | `/leaderboard` | Top group | Tab 4 |
| Settings | Cài đặt | `Settings` | `/settings` | Top group | Tab 5 |

**Active route detection patterns:**
```typescript
const pathname = usePathname();
// Match prefix for nested routes, e.g. /dashboard, /dashboard/settings
const isActive = pathname.startsWith('/dashboard');
```

**App shell layout structure (desktop):**
```
┌──────┬────────────────────────────────┐
│      │                                │
│ Side │       Main Content             │
│ bar  │       (children)               │
│ 48px │                                │
│      │                                │
└──────┴────────────────────────────────┘
```

**App shell layout structure (mobile):**
```
┌────────────────────────────────────────┐
│                                        │
│           Main Content                 │
│           (children)                   │
│                                        │
├────────────────────────────────────────┤
│  Home  │  Play  │  Learn │ Profile│More│
│  56px bottom tab bar                   │
└────────────────────────────────────────┘
```

**Sidebar CSS — CRITICAL dimensions:**
- Width: 48px (`w-[48px]` or `w-12`) — matches `var(--space-12)`
- Fixed position: `fixed left-0 top-0 h-full`
- Z-index: `z-40` (above content, below modals)
- Main content offset: `lg:ml-[48px]`

**Bottom tab bar CSS — CRITICAL dimensions:**
- Height: 56px (`h-[56px]` or `h-14`) — matches `var(--space-14)`
- Fixed position: `fixed bottom-0 left-0 w-full`
- Z-index: `z-40`
- Main content offset: `pb-[56px] lg:pb-0` on content wrapper (NOT on body)
- Safe area inset for notched phones: `pb-[env(safe-area-inset-bottom)]` inside the bar

**Skeleton screen pattern:**
```tsx
// loading.tsx
export default function DashboardLoading() {
  return (
    <div className="p-[var(--space-4)]">
      <div className="animate-pulse space-y-[var(--space-4)]">
        <div className="h-8 w-48 bg-[var(--color-surface-elevated)]" />
        <div className="grid grid-cols-1 gap-[var(--space-4)] md:grid-cols-3">
          <div className="h-32 bg-[var(--color-surface-elevated)]" />
          <div className="h-32 bg-[var(--color-surface-elevated)]" />
          <div className="h-32 bg-[var(--color-surface-elevated)]" />
        </div>
      </div>
    </div>
  );
}
```

### Library & Framework Requirements

**Already available (do NOT install again):**
- `lucide-react` ^0.577.0 — icons for all nav items
- `next` — `Link`, `usePathname` from `next/navigation`
- `react` 19.2.3
- `@testing-library/react` ^16.3.2
- `vitest` ^1.6.1

**No new dependencies required for this story.**

**Lucide icon imports:**
```typescript
import { Home, Swords, BookOpen, User, Settings, Menu } from 'lucide-react';
```

### File Structure Requirements

**Files to CREATE:**
- `src/app/(app)/layout.tsx` — app shell layout with sidebar + bottom bar
- `src/app/(app)/dashboard/loading.tsx` — skeleton screen for dashboard
- `src/components/layout/sidebar.tsx` — desktop sidebar navigation
- `src/components/layout/bottom-tab-bar.tsx` — mobile bottom tab bar

**Files to ADD (tests):**
- `src/components/layout/__tests__/sidebar.test.tsx` — sidebar component tests
- `src/components/layout/__tests__/bottom-tab-bar.test.tsx` — bottom tab bar tests
- `src/app/(app)/__tests__/app-layout.test.tsx` — app layout integration tests

**DO NOT modify:**
- `src/app/layout.tsx` — root layout (already correct)
- `src/app/(auth)/layout.tsx` — auth centered form layout
- `src/app/(public)/layout.tsx` — public layout with LandingNav
- `src/app/(app)/dashboard/page.tsx` — leave the existing placeholder as-is
- `src/middleware.ts` — route protection already covers all `(app)` routes
- `src/components/layout/landing-nav.tsx` — public navigation (use as code style reference only)
- `src/components/layout/placeholder-page.tsx` — reusable placeholder (leave as-is)

### Testing Requirements

**Testing framework:** Vitest + Testing Library (already configured)
- Test config: `vitest.config.ts` with jsdom environment
- Setup: `vitest.setup.ts`
- Test location: `__tests__/` directories co-located with source

**Mock patterns (established in Stories 1.3, 1.4):**
- `next/navigation` mock with `usePathname()` returning test routes
- For viewport-dependent tests: mock CSS media queries or test class-based visibility

**Key test scenarios:**
1. Sidebar renders all 5 nav items with correct icons and aria-labels
2. Sidebar highlights active route based on `usePathname()` return value
3. Sidebar has correct `aria-label` on `<nav>` element
4. Sidebar items have `aria-current="page"` when active
5. BottomTabBar renders all 5 tabs with Vietnamese labels
6. BottomTabBar highlights active tab with primary color
7. BottomTabBar items have correct aria attributes
8. App layout renders both Sidebar and BottomTabBar around children content
9. Dashboard loading.tsx renders skeleton blocks (pulse animation class present)

**Mock example for usePathname:**
```typescript
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}));
```

### Previous Story Intelligence (Story 1.4)

**Key learnings from Story 1.4:**
- Client components use `"use client"` directive at top of file
- `useActionState` from `react` and `useFormStatus` from `react-dom` established for form patterns
- Test mocking patterns for `next/navigation` are well-established
- Quality gate commands: `pnpm --filter @cotulenh/web run build`, `test`, `lint`, `check-types`
- Design token usage: `var(--color-*)`, `var(--space-*)`, `var(--text-*)` patterns throughout

**Files established that this story builds alongside:**
- `src/app/(auth)/layout.tsx` — centered form layout (DO NOT touch — AC #4 already satisfied)
- `src/app/(app)/dashboard/page.tsx` — placeholder dashboard (leave as-is, will be replaced in Story 1.6)
- `src/middleware.ts` — already protects: `/dashboard`, `/play`, `/game`, `/friends`, `/settings`, `/tournament`, `/leaderboard`, `/profile`
- `src/components/layout/landing-nav.tsx` — reference for code style and accessibility patterns

**Previous story completion notes relevant to this story:**
- 59 tests passing as of Story 1.4 completion
- Build, lint, check-types all pass
- The `(auth)` route group layout is fully functional and must remain separate from `(app)` shell

### Git Intelligence

**Recent commit patterns:**
- `fcabff2` feat(web): finalize story 1.4 password reset flow
- `7512d7e` Implement Story 1.3 auth flows
- `08aa95a` Fix landing page review issues
- `9a7ed4c` fix(web): address Story 1.1 review gaps

Conventions: imperative mood, optional scope prefix `(web)`, story references in messages.

### Anti-Pattern Prevention

**DO NOT:**
- Create a hamburger menu for mobile — use the fixed bottom tab bar instead
- Use a collapsible/expandable sidebar — it's always 48px icons-only on desktop, never expands
- Add text labels to the desktop sidebar — icons only with tooltip on hover
- Use `position: sticky` — use `position: fixed` for both sidebar and bottom bar
- Add a loading spinner component — skeleton screens only (architecture mandate)
- Import or use `@cotulenh/core` or `@cotulenh/board` — these are game packages, not needed here
- Create barrel exports (`index.ts`) — import directly from component files
- Modify the root layout or other route group layouts
- Add `border-radius` to any elements — design system uses `--radius: 0px`
- Use English text in any user-facing UI — Vietnamese only
- Create a separate navigation context/provider for active route tracking — `usePathname()` is sufficient
- Use `router.push()` for navigation — use `<Link>` components from `next/link`
- Hard-code colors — always use CSS custom properties from design tokens
- Put sidebar/bottom-bar state in a Zustand store — these are purely UI/layout components, no global state needed

### Design System — Already Established

**Reuse existing design tokens from `globals.css`:**
- Sidebar background: `var(--sidebar)` (maps to `var(--color-surface)`)
- Sidebar border: `var(--sidebar-border)` (maps to `var(--color-border)`)
- Sidebar active: `var(--sidebar-primary)` (maps to `var(--color-primary)`)
- Sidebar hover: `var(--sidebar-accent)` (maps to `var(--color-surface-elevated)`)
- Surface: `var(--color-surface)`, `var(--color-surface-elevated)`
- Text: `var(--color-text)`, `var(--color-text-muted)`
- Primary: `var(--color-primary)` — teal (#0d7377 light / #14b8a6 dark)
- Border: `var(--color-border)`
- Spacing: `var(--space-*)` (4px base) — sidebar width = `var(--space-12)` = 48px, bottom bar = `var(--space-14)` = 56px
- Typography: `var(--text-xs)` for bottom bar labels
- Radius: `0px` everywhere — NO border-radius

**Focus indicator pattern (from `landing-nav.tsx`):**
```
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]
```

### Project Structure Notes

- `src/app/(app)/layout.tsx` is a new file that creates the authenticated app shell
- It uses Next.js route groups: `(app)` pages get the sidebar/bottom bar, `(auth)` pages get centered form, `(public)` pages get minimal nav
- The `(app)/layout.tsx` is a Server Component that imports client components (Sidebar, BottomTabBar)
- Navigation within `(app)` route group now uses the same 5-item contract on desktop and mobile: `/dashboard`, `/play`, `/friends`, `/leaderboard`, `/settings`
- No new packages or workspace changes needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5] — Acceptance criteria and user story
- [Source: _bmad-output/planning-artifacts/architecture.md#Source Tree] — Route group structure: `(app)` gets sidebar/bottom bar layout
- [Source: _bmad-output/planning-artifacts/architecture.md#Component Organization] — `components/layout/` for sidebar, bottom-tab-bar, shell
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concern #5] — Responsive layout contract: board never resizes, sidebar 48px, bottom bar 56px
- [Source: _bmad-output/planning-artifacts/architecture.md#Loading States] — `loading.tsx` with skeleton screens, never spinners
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Order] — Step 4: Navigation shell + layouts
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Navigation] — Desktop collapsed sidebar, mobile bottom tab bar
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Strategy] — Breakpoint table, responsive behavior per component
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility] — WCAG 2.1 AA, keyboard nav, focus rings, aria-labels
- [Source: _bmad-output/planning-artifacts/prd.md#FR34] — Persistent sidebar (desktop) or bottom tab bar (mobile)
- [Source: _bmad-output/implementation-artifacts/1-4-password-reset.md] — Previous story patterns, established test infrastructure

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered — clean implementation.

### Completion Notes List

- Created app shell layout `(app)/layout.tsx` as Server Component importing Sidebar and BottomTabBar
- Sidebar: 48px fixed left nav with 5 icon links (Trang chủ, Chơi, Bạn bè, BXH, Cài đặt), active route detection via `usePathname()`, 3px left border active indicator, `hidden lg:flex` responsive visibility, full WCAG 2.1 AA keyboard/focus support
- BottomTabBar: 56px fixed bottom nav with 5 tabs including Vietnamese labels (Trang chủ, Chơi, Bạn bè, BXH, Cài đặt), 44x44px min touch targets, 8px gaps between adjacent items, `flex lg:hidden` responsive visibility, `aria-current="page"` for active tab
- Dashboard loading skeleton with 3 card placeholders using `animate-pulse` and design tokens — no spinners
- Added placeholder pages for `/play`, `/friends`, `/leaderboard`, `/settings` so app-shell links are functional during phased delivery
- All design tokens from `globals.css` used (sidebar-*, color-*, space-*, text-*)
- 37 new tests added (96 total): sidebar (9), bottom-tab-bar (9), app-layout (4), loading (3) + existing 12 test files unchanged
- All quality gates pass: build, test (96/96), lint, check-types

### Change Log

- 2026-03-12: Implemented Story 1.5 — App Shell & Navigation (all 6 tasks complete)
- 2026-03-13: Senior review fixes applied — aligned nav items to AC, added placeholder routes for app-shell links, added explicit tab-order tests, and closed review gaps

### File List

**Created:**
- `apps/cotulenh/web/src/app/(app)/layout.tsx` — app shell layout (Server Component)
- `apps/cotulenh/web/src/app/(app)/dashboard/loading.tsx` — dashboard skeleton screen
- `apps/cotulenh/web/src/app/(app)/play/page.tsx` — play placeholder route for shell navigation
- `apps/cotulenh/web/src/app/(app)/friends/page.tsx` — friends placeholder route for shell navigation
- `apps/cotulenh/web/src/app/(app)/leaderboard/page.tsx` — leaderboard placeholder route for shell navigation
- `apps/cotulenh/web/src/app/(app)/settings/page.tsx` — settings placeholder route for shell navigation
- `apps/cotulenh/web/src/components/layout/sidebar.tsx` — desktop sidebar navigation
- `apps/cotulenh/web/src/components/layout/bottom-tab-bar.tsx` — mobile bottom tab bar
- `apps/cotulenh/web/src/components/layout/__tests__/sidebar.test.tsx` — sidebar tests (9)
- `apps/cotulenh/web/src/components/layout/__tests__/bottom-tab-bar.test.tsx` — bottom tab bar tests (9)
- `apps/cotulenh/web/src/app/(app)/__tests__/app-layout.test.tsx` — app layout tests (4)
- `apps/cotulenh/web/src/app/(app)/dashboard/__tests__/loading.test.tsx` — loading skeleton tests (3)

### Senior Developer Review (AI)

- Reviewer: Codex (GPT-5) on 2026-03-13
- Outcome: Approved after fixes
- Critical/high issues fixed:
  - Added explicit keyboard tab-order assertions in sidebar and bottom-tab-bar tests
  - Aligned nav items with AC contract (`Dashboard`, `Play`, `Friends`, `Leaderboard`, `Settings`) for desktop and mobile
  - Added placeholder routes for `/play`, `/friends`, `/leaderboard`, `/settings` to avoid broken app-shell navigation
  - Implemented 8px adjacent gap contract in mobile bottom tab bar container
- Validation rerun:
  - `pnpm --filter @cotulenh/web run test` (96/96 pass)
  - `pnpm --filter @cotulenh/web run lint` pass
  - `pnpm --filter @cotulenh/web run check-types` pass
  - `pnpm --filter @cotulenh/web run build` pass
