# Story 1.6: Home Dashboard

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want a board-centric home dashboard with quick access to play, my active games, and recent games,
so that I can jump into the action with a single tap.

## Acceptance Criteria

1. **Given** an authenticated user navigates to the dashboard
   **When** the page loads
   **Then** a board-centric layout is displayed with navigation cards for "Play", "Active Games", and "Recent Games"
   **And** each card is tappable/clickable and navigates to the appropriate section
   **And** the layout is responsive — single column on mobile, multi-column on desktop

2. **Given** a new user with no game history
   **When** they view the dashboard
   **Then** appropriate empty states are shown for active games and recent games with encouraging CTAs (e.g., "Start your first game" in Vietnamese)

3. **Given** the dashboard page is loading
   **When** data is being fetched
   **Then** skeleton screens are displayed for all async content sections

## Tasks / Subtasks

- [x] Task 1: Create dashboard page layout replacing placeholder (AC: #1)
  - [x] Replace `src/app/(app)/dashboard/page.tsx` — remove `PlaceholderPage`, create responsive dashboard layout
  - [x] Desktop (>=1024px): two-column grid layout (60% left / 40% right) using `grid grid-cols-1 lg:grid-cols-[1fr_320px]`
  - [x] Mobile (<1024px): single column stacked layout
  - [x] Page is a Server Component — no `"use client"` (future stories will pass initial data to client children)
  - [x] Keep `metadata` with Vietnamese title "Bảng điều khiển"
  - [x] Import and compose: `QuickActions`, `RecentGamesSection`, `ActiveGamesSection` (left column), `OnlineFriendsSection`, `LeaderboardSection` (right column)

- [x] Task 2: Create `QuickActions` component — primary dashboard CTA grid (AC: #1)
  - [x] Create `src/components/dashboard/quick-actions.tsx` as a Server Component (no client interactivity needed — just links)
  - [x] 2x2 grid of action cards: use `grid grid-cols-2 gap-[var(--space-4)]`
  - [x] Card 1: "Chơi với AI" (Play AI) — Swords icon, primary accent, links to `/play`
  - [x] Card 2: "Tạo ván đấu" (Create Game) — Plus icon, links to `/play`
  - [x] Card 3: "Giải đấu" (Tournaments) — Trophy icon, links to `/play` (tournaments not yet built)
  - [x] Card 4: "Học" (Learn) — BookOpen icon, links to `/learn`
  - [x] Each card: border, hover state with `bg-[var(--color-surface-elevated)]`, icon (24px) + label below, `min-h-[100px]`
  - [x] Cards are `<Link>` elements from `next/link` with `aria-label` for accessibility
  - [x] Focus indicators: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]`

- [x] Task 3: Create reusable `EmptyState` component (AC: #2)
  - [x] Create `src/components/layout/empty-state.tsx` as a Server Component
  - [x] Props: `icon` (LucideIcon), `message` (string), `actionLabel` (string), `actionHref` (string)
  - [x] Layout: centered vertically within parent, icon (32px muted), message text (text-sm muted), action link (primary color, text-sm)
  - [x] Action link uses `<Link>` from `next/link`
  - [x] Compact padding: `py-[var(--space-8)]` — should feel lightweight, not dominate the section

- [x] Task 4: Create `RecentGamesSection` component (AC: #1, #2)
  - [x] Create `src/components/dashboard/recent-games-section.tsx` as a Server Component
  - [x] Section heading: "Ván đấu gần đây" (h2, text-base, font-semibold)
  - [x] For MVP (no game data): render `EmptyState` with Swords icon, "Chưa có ván đấu" message, "Chơi ván đầu tiên" action → `/play`
  - [x] Wrapped in a container with border and padding: `border border-[var(--color-border)] p-[var(--space-4)]`

- [x] Task 5: Create `ActiveGamesSection` component (AC: #1, #2)
  - [x] Create `src/components/dashboard/active-games-section.tsx` as a Server Component
  - [x] Section heading: "Ván đấu đang chơi" (h2, text-base, font-semibold)
  - [x] For MVP (no game data): render `EmptyState` with Gamepad2 icon, "Không có ván đấu đang diễn ra" message, "Tìm đối thủ" action → `/play`
  - [x] Same container styling as RecentGamesSection

- [x] Task 6: Create `OnlineFriendsSection` component (AC: #1, #2)
  - [x] Create `src/components/dashboard/online-friends-section.tsx` as a Server Component
  - [x] Section heading: "Bạn bè trực tuyến" (h2, text-base, font-semibold)
  - [x] For MVP (no friends data): render `EmptyState` with Users icon, "Không có bạn trực tuyến" message, "Mời bạn bè chơi" action → `/friends`
  - [x] Same container styling pattern

- [x] Task 7: Create `LeaderboardSection` component (AC: #1, #2)
  - [x] Create `src/components/dashboard/leaderboard-section.tsx` as a Server Component
  - [x] Section heading: "Bảng xếp hạng" (h2, text-base, font-semibold)
  - [x] For MVP (no leaderboard data): render `EmptyState` with Medal icon, "Chơi để lên bảng xếp hạng" message, "Tìm đối thủ" action → `/play`
  - [x] Same container styling pattern

- [x] Task 8: Update `loading.tsx` skeleton to match new dashboard layout (AC: #3)
  - [x] Update `src/app/(app)/dashboard/loading.tsx` to reflect actual dashboard structure
  - [x] Desktop: two-column grid skeleton matching the 60/40 split
  - [x] Left column skeletons: quick-actions grid (4 small cards), recent games block, active games block
  - [x] Right column skeletons: friends block, leaderboard block
  - [x] Mobile: single column stacked skeletons
  - [x] All skeletons use `animate-pulse` and `bg-[var(--color-surface-elevated)]`

- [x] Task 9: Write tests (all ACs)
  - [x] Component test for dashboard page: renders all 5 sections (QuickActions, RecentGames, ActiveGames, OnlineFriends, Leaderboard)
  - [x] Component test for QuickActions: renders 4 action cards with Vietnamese labels, correct hrefs, correct icons
  - [x] Component test for EmptyState: renders icon, message, action link with correct href
  - [x] Component test for RecentGamesSection: renders heading + empty state with correct CTA
  - [x] Component test for ActiveGamesSection: renders heading + empty state with correct CTA
  - [x] Component test for OnlineFriendsSection: renders heading + empty state with correct CTA
  - [x] Component test for LeaderboardSection: renders heading + empty state with correct CTA
  - [x] Test loading.tsx: renders skeleton elements matching new layout (2-column grid skeleton)
  - [x] Test accessibility: all links have aria-labels, headings are semantic h2

- [x] Task 10: Quality gates
  - [x] `pnpm --filter @cotulenh/web run build` succeeds
  - [x] `pnpm --filter @cotulenh/web run test` — all tests pass
  - [x] `pnpm --filter @cotulenh/web run lint` — no errors
  - [x] `pnpm --filter @cotulenh/web run check-types` — no errors

## Dev Notes

### Architecture Compliance

**Route structure — MANDATORY:**
- Dashboard page: `src/app/(app)/dashboard/page.tsx` (MODIFY — replace placeholder with actual dashboard)
- Dashboard loading: `src/app/(app)/dashboard/loading.tsx` (MODIFY — update skeleton to match new layout)
- Dashboard components: `src/components/dashboard/` (CREATE directory)
- Empty state: `src/components/layout/empty-state.tsx` (CREATE — reusable across app)

**Component locations — MANDATORY:**
- Dashboard-specific components go in `src/components/dashboard/`
- Reusable layout components go in `src/components/layout/`
- Do NOT create components inside `src/app/` route directories (only `page.tsx`, `layout.tsx`, `loading.tsx`)

**Naming conventions — MANDATORY:**
- Component files: `kebab-case.tsx` (e.g., `quick-actions.tsx`, `recent-games-section.tsx`)
- Component exports: PascalCase named exports (e.g., `export function QuickActions()`)
- CSS: Use design tokens via `var(--token-name)` from globals.css, NOT hardcoded colors
- Tailwind classes with CSS custom properties: `text-[var(--color-text)]` pattern

**Layout hierarchy — CRITICAL:**
```
src/app/(app)/layout.tsx         → App shell (Sidebar + BottomTabBar) — DO NOT MODIFY
└── src/app/(app)/dashboard/
    ├── page.tsx                 → Dashboard content ← MODIFY THIS
    └── loading.tsx              → Skeleton screen ← MODIFY THIS
```

### Technical Requirements

**Dashboard layout — desktop (>=1024px):**
```
┌──────┬──────────────────────────┬────────────────┐
│      │ Quick Actions (2x2 grid) │ Bạn bè trực    │
│ Side │                          │ tuyến           │
│ bar  │ Ván đấu đang chơi       │ (Online Friends)│
│ 48px │ (Active Games)           │                 │
│      │                          │ Bảng xếp hạng   │
│      │ Ván đấu gần đây         │ (Leaderboard)   │
│      │ (Recent Games)           │                 │
└──────┴──────────────────────────┴────────────────┘
```

**Dashboard layout — mobile (<1024px):**
```
┌────────────────────────────────────────┐
│ Quick Actions (2x2 grid)               │
│ Ván đấu đang chơi (Active Games)      │
│ Ván đấu gần đây (Recent Games)        │
│ Bạn bè trực tuyến (Online Friends)     │
│ Bảng xếp hạng (Leaderboard)           │
├────────────────────────────────────────┤
│  Bottom tab bar (56px)                 │
└────────────────────────────────────────┘
```

**Responsive grid for page layout:**
```tsx
<div className="grid grid-cols-1 gap-[var(--space-4)] p-[var(--space-4)] lg:grid-cols-[1fr_320px]">
  {/* Left column */}
  <div className="space-y-[var(--space-4)]">
    <QuickActions />
    <ActiveGamesSection />
    <RecentGamesSection />
  </div>
  {/* Right column */}
  <div className="space-y-[var(--space-4)]">
    <OnlineFriendsSection />
    <LeaderboardSection />
  </div>
</div>
```

**Section container pattern — consistent across all sections:**
```tsx
<section className="border border-[var(--color-border)] p-[var(--space-4)]">
  <h2 className="mb-[var(--space-3)] text-[var(--text-base)] font-semibold text-[var(--color-text)]">
    Section Title
  </h2>
  {/* Content or EmptyState */}
</section>
```

**Quick Action card pattern:**
```tsx
<Link
  href="/play"
  aria-label="Chơi với AI"
  className="flex min-h-[100px] flex-col items-center justify-center gap-[var(--space-2)] border border-[var(--color-border)] p-[var(--space-4)] hover:bg-[var(--color-surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
>
  <Swords size={24} className="text-[var(--color-primary)]" />
  <span className="text-[var(--text-sm)] font-medium text-[var(--color-text)]">Chơi với AI</span>
</Link>
```

**EmptyState component pattern:**
```tsx
<div className="flex flex-col items-center gap-[var(--space-3)] py-[var(--space-8)]">
  <Icon size={32} className="text-[var(--color-text-muted)]" />
  <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">{message}</p>
  <Link href={actionHref} className="text-[var(--text-sm)] text-[var(--color-primary)] hover:underline">
    {actionLabel}
  </Link>
</div>
```

**MVP scope — CRITICAL understanding:**
- This is Epic 1 — no game, friend, tournament, or leaderboard data exists yet
- ALL data sections show empty states for now — the layout structure and forward-path CTAs are the deliverable
- No Supabase queries needed — no relevant tables exist yet
- No Zustand stores needed — no realtime data to subscribe to
- Components should be structured so future stories can inject real data (props/children pattern)
- Keep components as Server Components (no `"use client"`) — they are purely presentational for MVP

### Library & Framework Requirements

**Already available (do NOT install again):**
- `lucide-react` ^0.577.0 — icons for action cards and empty states
- `next` — `Link` from `next/link`
- `react` 19.2.3
- `@testing-library/react` ^16.3.2
- `vitest` ^1.6.1

**No new dependencies required for this story.**

**Lucide icon imports for dashboard:**
```typescript
import { Swords, Plus, Trophy, BookOpen, Gamepad2, Users, Medal } from 'lucide-react';
```

### File Structure Requirements

**Files to CREATE:**
- `src/components/dashboard/quick-actions.tsx` — quick action card grid
- `src/components/dashboard/recent-games-section.tsx` — recent games with empty state
- `src/components/dashboard/active-games-section.tsx` — active games with empty state
- `src/components/dashboard/online-friends-section.tsx` — online friends with empty state
- `src/components/dashboard/leaderboard-section.tsx` — leaderboard with empty state
- `src/components/layout/empty-state.tsx` — reusable empty state component

**Files to MODIFY:**
- `src/app/(app)/dashboard/page.tsx` — replace PlaceholderPage with actual dashboard
- `src/app/(app)/dashboard/loading.tsx` — update skeleton to match new layout

**Files to ADD (tests):**
- `src/components/dashboard/__tests__/quick-actions.test.tsx`
- `src/components/dashboard/__tests__/recent-games-section.test.tsx`
- `src/components/dashboard/__tests__/active-games-section.test.tsx`
- `src/components/dashboard/__tests__/online-friends-section.test.tsx`
- `src/components/dashboard/__tests__/leaderboard-section.test.tsx`
- `src/components/layout/__tests__/empty-state.test.tsx`
- `src/app/(app)/dashboard/__tests__/dashboard-page.test.tsx`

**DO NOT modify:**
- `src/app/(app)/layout.tsx` — app shell layout
- `src/components/layout/sidebar.tsx` — sidebar navigation
- `src/components/layout/bottom-tab-bar.tsx` — bottom tab bar
- `src/components/layout/placeholder-page.tsx` — still used by other pages
- Any files in `src/app/(auth)/` — auth layouts
- `src/middleware.ts` — route protection

### Testing Requirements

**Testing framework:** Vitest + Testing Library (already configured)
- Test config: `vitest.config.ts` with jsdom environment
- Setup: `vitest.setup.ts`
- Test location: `__tests__/` directories co-located with source

**Mock patterns (established in Stories 1.3–1.5):**
- For components importing other components: mock child components with `data-testid`
- For route-based tests: mock `next/navigation` if needed

**Key test scenarios:**
1. Dashboard page renders all 5 sections as children
2. QuickActions renders 4 cards with Vietnamese labels ("Chơi với AI", "Tạo ván đấu", "Giải đấu", "Học")
3. QuickActions cards have correct hrefs (`/play`, `/play`, `/play`, `/learn`)
4. EmptyState renders icon, message, and action link
5. Each section component renders heading text and EmptyState
6. Each section EmptyState has correct Vietnamese message and action
7. Loading skeleton renders 2-column grid skeleton on desktop
8. All interactive elements have aria-labels or accessible text
9. Section headings are `<h2>` elements

**Test pattern for Server Components:**
```typescript
// Server Components can be tested directly since they return JSX
import { render, screen } from '@testing-library/react';
import { QuickActions } from '../quick-actions';

describe('QuickActions', () => {
  it('renders 4 action cards', () => {
    render(<QuickActions />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
  });
});
```

### Previous Story Intelligence (Story 1.5)

**Key learnings from Story 1.5:**
- Navigation components use `hidden lg:flex` / `flex lg:hidden` responsive pattern
- App layout provides `lg:ml-[48px] pb-[56px] lg:pb-0` offsets — dashboard content fills remaining space
- Design token usage well-established: `var(--color-*)`, `var(--space-*)`, `var(--text-*)`
- Placeholder pages established at `/play`, `/friends`, `/leaderboard`, `/settings` — dashboard links to these
- 96 tests passing as of Story 1.5 completion
- Build, lint, check-types all pass
- Code review corrected nav items to: Dashboard, Play, Friends, Leaderboard, Settings
- No `border-radius` anywhere — design system uses `--radius: 0px`

**Previous story file list for context:**
- `src/app/(app)/layout.tsx` — wraps dashboard with sidebar + bottom bar
- `src/app/(app)/dashboard/loading.tsx` — existing skeleton (3 cards, needs update)
- `src/app/(app)/dashboard/page.tsx` — current placeholder (to be replaced)
- `src/components/layout/sidebar.tsx` — reference for code style
- `src/components/layout/bottom-tab-bar.tsx` — reference for code style

### Git Intelligence

**Recent commit patterns:**
- `cccc89e` feat(web): complete story 1.5 app shell navigation
- `fcabff2` feat(web): finalize story 1.4 password reset flow
- `7512d7e` Implement Story 1.3 auth flows

Conventions: imperative mood, optional scope prefix `(web)`, story references in messages.

### Anti-Pattern Prevention

**DO NOT:**
- Add `"use client"` to dashboard components — they are Server Components (purely presentational for MVP)
- Create Zustand stores — no realtime data exists yet, stores will come in later epics
- Query Supabase — no game/friend/tournament/leaderboard tables exist yet
- Import or use `@cotulenh/core` or `@cotulenh/board` — game packages not needed
- Create barrel exports (`index.ts`) — import directly from component files
- Add `border-radius` to any elements — design system uses `--radius: 0px`
- Use English text in any user-facing UI — Vietnamese only
- Use spinners — skeleton screens only
- Hard-code colors — always use CSS custom properties from design tokens
- Make the dashboard page a client component to fetch data — it's a layout story, data comes later
- Over-engineer empty state with animations or illustrations — keep it minimal
- Create a "welcome banner" or onboarding modal — not in AC scope (can be added in a later story)
- Modify the app layout, sidebar, or bottom tab bar

### Design System — Already Established

**Reuse existing design tokens from `globals.css`:**
- Surface: `var(--color-surface)`, `var(--color-surface-elevated)`
- Text: `var(--color-text)`, `var(--color-text-muted)`
- Primary: `var(--color-primary)` — teal (#0d7377 light / #14b8a6 dark)
- Border: `var(--color-border)`
- Spacing: `var(--space-*)` (4px base)
- Typography: `var(--text-xs)`, `var(--text-sm)`, `var(--text-base)`, `var(--text-lg)`
- Radius: `0px` everywhere — NO border-radius

**Focus indicator pattern (from `landing-nav.tsx`, `sidebar.tsx`):**
```
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]
```

### Project Structure Notes

- Dashboard is under `(app)` route group — requires authentication (handled by middleware)
- Dashboard components go in `src/components/dashboard/` — new directory
- EmptyState goes in `src/components/layout/` — reusable across app sections
- The `PlaceholderPage` component is NOT deleted — still used by `/play`, `/friends`, `/leaderboard`, `/settings`
- Navigation from dashboard cards goes to existing placeholder routes — functional even though content is placeholder

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6] — Acceptance criteria and user story
- [Source: _bmad-output/planning-artifacts/architecture.md#Source Tree] — Dashboard route and component locations
- [Source: _bmad-output/planning-artifacts/architecture.md#Component Organization] — `components/dashboard/` for dashboard components
- [Source: _bmad-output/planning-artifacts/architecture.md#Loading States] — Skeleton screens, never spinners
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Dashboard] — 2-column desktop layout (60/40), quick actions grid, empty states
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty States] — Vietnamese CTAs, always have forward path
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Strategy] — Single column mobile, multi-column desktop
- [Source: _bmad-output/planning-artifacts/prd.md#FR35] — Board-centric home dashboard with single-tap navigation
- [Source: _bmad-output/implementation-artifacts/1-5-app-shell-navigation.md] — Previous story patterns, code style reference

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Replaced dashboard placeholder with responsive two-column grid layout (60/40 split on desktop, stacked on mobile)
- Created QuickActions component with 4 action cards (Chơi với AI, Tạo ván đấu, Giải đấu, Học) using Vietnamese labels
- Created reusable EmptyState component in components/layout for use across the app
- Created 4 section components (RecentGames, ActiveGames, OnlineFriends, Leaderboard) all showing empty states for MVP
- Updated loading.tsx skeleton to match new two-column layout with 4 quick-action card skeletons
- All components are Server Components (no "use client") — purely presentational for MVP
- All design tokens used correctly (no hardcoded colors, no border-radius)
- 28 new tests added (124 total, all passing)
- Build, lint, and type checks all pass
- AI review fixes applied:
  - Added explicit dashboard navigation cards for "Chơi", "Ván đang chơi", and "Ván gần đây" to satisfy AC#1
  - Added section anchors for active/recent games and linked nav cards to these sections
  - Added missing `aria-label` on reusable `EmptyState` action links
  - Added/updated tests for navigation cards and `aria-label` coverage

### Change Log

- 2026-03-13: Implemented Story 1.6 Home Dashboard — replaced placeholder with board-centric layout, created 6 new components, updated loading skeleton, added 28 tests
- 2026-03-13: Senior AI code review fixes — closed AC#1 navigation gap, fixed EmptyState link accessibility labeling, and updated dashboard tests

### File List

**Created:**
- apps/cotulenh/web/src/components/layout/empty-state.tsx
- apps/cotulenh/web/src/components/dashboard/quick-actions.tsx
- apps/cotulenh/web/src/components/dashboard/recent-games-section.tsx
- apps/cotulenh/web/src/components/dashboard/active-games-section.tsx
- apps/cotulenh/web/src/components/dashboard/online-friends-section.tsx
- apps/cotulenh/web/src/components/dashboard/leaderboard-section.tsx
- apps/cotulenh/web/src/components/layout/__tests__/empty-state.test.tsx
- apps/cotulenh/web/src/components/dashboard/__tests__/quick-actions.test.tsx
- apps/cotulenh/web/src/components/dashboard/__tests__/recent-games-section.test.tsx
- apps/cotulenh/web/src/components/dashboard/__tests__/active-games-section.test.tsx
- apps/cotulenh/web/src/components/dashboard/__tests__/online-friends-section.test.tsx
- apps/cotulenh/web/src/components/dashboard/__tests__/leaderboard-section.test.tsx
- apps/cotulenh/web/src/app/(app)/dashboard/__tests__/dashboard-page.test.tsx

**Modified:**
- apps/cotulenh/web/src/app/(app)/dashboard/page.tsx
- apps/cotulenh/web/src/app/(app)/dashboard/loading.tsx
- apps/cotulenh/web/src/app/(app)/dashboard/__tests__/loading.test.tsx
- apps/cotulenh/web/src/components/layout/empty-state.tsx
- apps/cotulenh/web/src/components/dashboard/active-games-section.tsx
- apps/cotulenh/web/src/components/dashboard/recent-games-section.tsx
- apps/cotulenh/web/src/app/(app)/dashboard/__tests__/dashboard-page.test.tsx
- apps/cotulenh/web/src/components/layout/__tests__/empty-state.test.tsx

## Senior Developer Review (AI)

### Review Date

2026-03-13

### Outcome

Changes Requested (resolved in same pass)

### Summary

- Verified implementation against ACs, tasks, and git working tree changes.
- Found and fixed one AC gap (missing explicit Play/Active/Recent navigation cards) and one accessibility gap (missing `aria-label` on EmptyState links).
- Documented git/story discrepancy context for non-source workspace files (`.beads/*`, sprint-status sync).

### Findings

1. [Resolved][CRITICAL] Task claim mismatch: links in shared EmptyState lacked `aria-label`.
2. [Resolved][HIGH] AC#1 navigation-card requirement for Play/Active/Recent was not explicitly implemented.
3. [Resolved][MEDIUM] Story/git transparency gap: extra workspace-tracked files outside app source were not previously documented.

### Resolution

- Implemented required code and tests.
- Re-ran quality gates successfully:
  - `pnpm --filter @cotulenh/web run test` (125 passing)
  - `pnpm --filter @cotulenh/web run lint`
  - `pnpm --filter @cotulenh/web run check-types`
  - `pnpm --filter @cotulenh/web run build`
