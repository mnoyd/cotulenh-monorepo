# Story 8.2: Arena Tournament Lobby & Registration

Status: done

## Story

As a player,
I want to browse and join arena tournaments,
So that I can compete in organized events with other players.

## Acceptance Criteria

1. **Database Migration**
   - Given a new `tournaments` migration is applied
   - When the migration runs
   - Then the `tournaments` table exists with columns for tournament ID, title, time control, start time, duration, status (upcoming/active/completed), and standings (jsonb)
   - And a `tournament_participants` join table tracks registrations (tournament_id, user_id, joined_at)
   - And RLS policies allow all authenticated users to read tournaments and only service role to write tournament rows
   - And RLS policies allow authenticated users to insert/delete their own participant rows

2. **Tournament List Page**
   - Given an authenticated player navigates to `/tournament`
   - When the page loads
   - Then upcoming, active, and recently completed tournaments are displayed
   - And each tournament shows title, time control, start time, duration, and participant count
   - And tournaments are grouped/sorted: active first, then upcoming (by start time), then recently completed

3. **Join Tournament**
   - Given a player wants to join an upcoming tournament
   - When they tap "Tham gia" (Join)
   - Then they are registered via `joinTournament` Server Action
   - And the participant count updates in real-time via Postgres Changes
   - And the button changes to "Rời giải" (Leave)

4. **Leave Tournament**
   - Given a player wants to leave a tournament they joined (before it starts)
   - When they tap "Rời giải" (Leave)
   - Then they are unregistered via `leaveTournament` Server Action
   - And the participant count updates in real-time

5. **Loading State**
   - Given the tournament lobby is loading
   - When data is being fetched
   - Then skeleton screens are shown for the tournament list (no spinners)

## Tasks / Subtasks

- [x] Task 1: Database migration `026_tournaments.sql` (AC: #1)
  - [x] Create `tournaments` table with all required columns
  - [x] Create `tournament_participants` join table
  - [x] Add RLS policies for both tables
  - [x] Add `updated_at` trigger
  - [x] Enable Realtime for `tournaments` table (participant_count column)
- [x] Task 2: TypeScript types and validators (AC: #1, #3, #4)
  - [x] Add tournament types to `src/lib/types/tournament.ts`
  - [x] Add Zod validators to `src/lib/validators/tournament.ts`
- [x] Task 3: Server Actions `src/lib/actions/tournament.ts` (AC: #3, #4)
  - [x] `getTournaments()` — fetch tournaments with participant counts
  - [x] `joinTournament(tournamentId)` — register current user
  - [x] `leaveTournament(tournamentId)` — unregister current user
- [x] Task 4: Zustand store `src/stores/tournament-store.ts` (AC: #2, #3, #4)
  - [x] State: tournaments list, loading, error
  - [x] Actions: fetchTournaments, joinTournament, leaveTournament
  - [x] Realtime subscription via Postgres Changes on `tournaments` table
- [x] Task 5: UI components `src/components/tournament/` (AC: #2, #3, #4, #5)
  - [x] `tournament-card.tsx` — card with title, time control, start time, duration, participant count, join/leave button
  - [x] `tournament-list.tsx` — grouped list (active, upcoming, completed)
  - [x] `tournament-skeleton.tsx` — skeleton loading state
- [x] Task 6: Route page `src/app/(app)/tournament/page.tsx` (AC: #2, #5)
  - [x] Server Component fetching initial tournaments
  - [x] Client wrapper subscribing to real-time updates
  - [x] `loading.tsx` with skeleton

## Dev Notes

### Database Schema

**`tournaments` table:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `title` | text NOT NULL | Tournament name |
| `time_control` | text NOT NULL | e.g., `'3+2'`, `'5+0'` |
| `start_time` | timestamptz NOT NULL | Scheduled start |
| `duration_minutes` | integer NOT NULL | Tournament duration |
| `status` | text NOT NULL DEFAULT 'upcoming' | `'upcoming' \| 'active' \| 'completed'` |
| `participant_count` | integer NOT NULL DEFAULT 0 | Denormalized count for real-time display |
| `standings` | jsonb DEFAULT '[]' | Final standings (populated by Story 8.3) |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | Via trigger |

**`tournament_participants` table:**

| Column | Type | Notes |
|--------|------|-------|
| `tournament_id` | uuid FK → tournaments | ON DELETE CASCADE |
| `user_id` | uuid FK → auth.users | ON DELETE CASCADE |
| `joined_at` | timestamptz DEFAULT now() | |
| PK | (tournament_id, user_id) | Composite — prevents double-join |

**RLS policies:**
- `tournaments`: SELECT for all authenticated. INSERT/UPDATE/DELETE for service_role only.
- `tournament_participants`: SELECT for all authenticated. INSERT where `auth.uid() = user_id` AND tournament status = 'upcoming'. DELETE where `auth.uid() = user_id` AND tournament status = 'upcoming'.

**Participant count sync:** Use a PostgreSQL trigger on `tournament_participants` INSERT/DELETE to increment/decrement `tournaments.participant_count`. This avoids race conditions and keeps the count accurate for real-time Postgres Changes broadcasts.

**Realtime:** Enable Postgres Changes on the `tournaments` table. The `participant_count` column updates trigger Postgres Changes events that the client subscribes to via `tournament:{tournamentId}` or a single `tournaments` channel for the lobby.

### Architecture Compliance

**Technical Stack (must match):**
- TypeScript 5, React 19, Next.js 15 App Router
- Tailwind CSS 4 + shadcn/ui primitives
- Zustand for client state
- Supabase (PostgreSQL, Auth, Realtime, RLS)
- Zod for runtime validation
- Vitest for unit tests

**API Pattern — Server Actions for mutations:**
```typescript
// src/lib/actions/tournament.ts
'use server';
import { createClient } from '@/lib/supabase/server';

export async function joinTournament(tournamentId: string): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Vui lòng đăng nhập' };
  // Insert into tournament_participants (RLS enforces user_id match + upcoming status)
  const { error } = await supabase.from('tournament_participants').insert({
    tournament_id: tournamentId,
    user_id: user.id
  });
  if (error) return { success: false, error: 'Không thể tham gia giải đấu' };
  return { success: true };
}
```

**Realtime Pattern — Postgres Changes for live participant counts:**
Follow existing pattern from `use-game-channel.ts`. Subscribe to `postgres_changes` on `tournaments` table filtered by status or unfiltered for lobby view. Update Zustand store on change events.

**Naming conventions:**
- DB columns: snake_case (e.g., `participant_count`, `start_time`)
- TypeScript interfaces: snake_case matching DB (no camelCase transform)
- Component files: kebab-case (e.g., `tournament-card.tsx`)
- Store files: kebab-case (e.g., `tournament-store.ts`)
- Tests co-located: `__tests__/tournament-card.test.tsx`

### File Structure Requirements

**New files to create:**
```
supabase/migrations/026_tournaments.sql

apps/cotulenh/web/src/
├── lib/
│   ├── types/tournament.ts
│   ├── validators/tournament.ts
│   └── actions/tournament.ts
├── stores/
│   ├── tournament-store.ts
│   └── __tests__/tournament-store.test.ts
├── hooks/
│   └── use-tournament-channel.ts
├── components/
│   └── tournament/
│       ├── tournament-card.tsx
│       ├── tournament-list.tsx
│       ├── tournament-skeleton.tsx
│       └── __tests__/
│           ├── tournament-card.test.tsx
│           └── tournament-list.test.tsx
└── app/(app)/
    └── tournament/
        ├── page.tsx
        └── loading.tsx
```

**No files to modify** — this is a greenfield feature. Do NOT touch existing game, lobby, or dashboard components. Navigation integration (sidebar/bottom bar links) is NOT in scope for this story.

### Library & Framework Requirements

- **Supabase JS client:** Use existing `createClient` from `@/lib/supabase/browser` (client) and `@/lib/supabase/server` (server actions)
- **Zustand:** `create()` pattern with flat state, no nested objects
- **shadcn/ui:** Reuse existing `Button`, `Card`, `Badge`, `Skeleton` from `@/components/ui/`
- **Zod:** Validate `tournamentId` as UUID in server actions
- **date-fns or Intl:** For formatting start times and countdown — check what's already in the project before adding a new dep

### Testing Requirements

**Unit tests (Vitest):**
- `tournament-store.test.ts`: State transitions (fetch, join, leave, error handling, reset)
- `tournament-card.test.tsx`: Renders correct info, join/leave button state, callback triggers
- `tournament-list.test.tsx`: Grouping logic (active first, then upcoming, then completed)

**Test patterns to follow (from Story 8.1):**
- Co-located tests in `__tests__/` directories
- Mock Supabase client for store tests
- Component tests with React Testing Library
- No E2E tests required for this story

**Quality gates:**
- `pnpm check-types` must pass
- `pnpm lint` must pass (or match pre-existing warning count)
- All new Vitest suites must pass

### Previous Story Intelligence (8.1 AI Opponent)

**Key learnings to apply:**
- Feature flag pattern exists at `src/lib/constants/feature-flags.ts` — can add `ARENA_TOURNAMENTS: true` if needed
- Tests co-located in `__tests__/` folders (NOT alongside source files directly)
- Vietnamese-only strings throughout UI (no English)
- `check-types` must pass — be strict with TypeScript types from the start
- Review from 8.1 caught dead link references — ensure all navigation links point to existing routes only
- Skeleton screens for loading (not spinners) — consistent with project pattern

**Reusable patterns from 8.1:**
- Zustand store creation pattern (flat state, async actions, reset method)
- Feature flag simple const export pattern
- Component test patterns with React Testing Library

### Git Intelligence

Recent commits show consistent patterns:
- Commit messages: `feat(web):`, `fix(game):`, `chore(beads):`
- Feature work lands on `main` directly
- Story implementation is typically one commit per story

### Vietnamese UI Strings

| Key | Vietnamese | Context |
|-----|-----------|---------|
| Page title | Giải đấu | Tournament lobby page |
| Join button | Tham gia | Join upcoming tournament |
| Leave button | Rời giải | Leave before start |
| Status: upcoming | Sắp diễn ra | Tournament not started |
| Status: active | Đang diễn ra | Tournament in progress |
| Status: completed | Đã kết thúc | Tournament finished |
| Participants | người chơi | e.g., "12 người chơi" |
| Empty state | Không có giải đấu sắp tới | No upcoming tournaments |
| Empty CTA | Quay lại sau | Come back later |
| Loading error | Không thể tải giải đấu | Failed to load |
| Join error | Không thể tham gia giải đấu | Failed to join |
| Leave error | Không thể rời giải đấu | Failed to leave |
| Auth required | Vui lòng đăng nhập | Please log in |

### Scope Boundaries

**In scope:**
- Database schema for tournaments and participants
- Tournament list page with real-time participant counts
- Join/leave upcoming tournaments
- Skeleton loading states

**Out of scope (Story 8.3):**
- Tournament-pair Edge Function
- Automatic pairing logic
- Live standings during active tournament
- Tournament game flow
- Tournament detail page (`/tournament/[id]`) — only needed for live standings in 8.3

**Out of scope (other stories):**
- Dashboard tournament widget / quick action card
- Sidebar/bottom bar navigation links to `/tournament`
- Tournament creation admin UI (tournaments seeded via migration or admin script for now)

### Project Structure Notes

- Migration numbering: next is `026_tournaments.sql` (after existing `025_ratings.sql`)
- No existing tournament files in the codebase — fully greenfield
- No `routes.ts` constants file exists — do NOT create one; use string literals like the rest of the project
- No `lobby-store.ts` exists despite architecture doc mentioning it — real-time patterns come from `use-game-channel.ts` hook

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Database schemas, Realtime patterns, Edge Functions, RLS, Server Actions]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Tournament UI, TournamentCard, TournamentStandings, navigation, Vietnamese strings]
- [Source: _bmad-output/implementation-artifacts/8-1-ai-opponent.md — Previous story learnings, code patterns, file structure]
- [Source: supabase/migrations/ — Migration numbering (025 is latest)]
- [Source: apps/cotulenh/web/src/lib/actions/game.ts — Server Action patterns]
- [Source: apps/cotulenh/web/src/stores/game-store.ts — Zustand store patterns]
- [Source: apps/cotulenh/web/src/hooks/use-game-channel.ts — Realtime subscription patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Initial type check failure: `@testing-library/user-event` not installed — switched to `fireEvent`
- Tournament list test: `getByText('Đang diễn ra')` found multiple elements (section heading + card status) — switched to `getAllByText`

### Completion Notes List

- Task 1: Created `026_tournaments.sql` migration with `tournaments` table, `tournament_participants` join table, RLS policies (read all authenticated, self-manage participant rows for upcoming tournaments only), `updated_at` trigger, participant count sync trigger (increment/decrement on join/leave), status CHECK constraint, and Realtime publication
- Task 2: Created TypeScript types (`Tournament`, `TournamentParticipant`, `TournamentStatus`) and Zod validator (`tournamentIdSchema` for UUID validation in Vietnamese)
- Task 3: Created Server Actions (`getTournaments`, `joinTournament`, `leaveTournament`) following existing discriminated union return type pattern with Zod validation and auth checks
- Task 4: Created Zustand store with flat state (tournaments, loading, error), async actions with optimistic updates for join/leave, `updateTournament` for realtime updates, and `reset` method. Created `use-tournament-channel.ts` hook subscribing to Postgres Changes on `tournaments` table
- Task 5: Created `tournament-card.tsx` (displays tournament info, join/leave button for upcoming status, Vietnamese status labels), `tournament-list.tsx` (groups by active/upcoming/completed with proper sorting, loads joined state from client, empty/error states), `tournament-skeleton.tsx` (4 skeleton cards with animate-pulse)
- Task 6: Created Server Component page at `/tournament` with initial server-side fetch, `TournamentList` client wrapper for real-time, and `loading.tsx` with skeleton
- All tests pass: 23 new tests across 3 test files (tournament-store, tournament-card, tournament-list)
- Quality gates: `pnpm check-types` passes, `pnpm lint` passes with same 3 pre-existing warnings, full regression suite 673/673 tests pass
- Senior review fixes applied: scoped tournament read policies to authenticated users, removed participant_count optimistic race by refreshing from server after join/leave, fixed completed sorting to use `updated_at`, cleared stale error state on initial seed, and hardened tests to avoid `act(...)` warnings

### Change Log

- 2026-04-02: Implemented Story 8.2 Arena Tournament Lobby & Registration — database migration, types, validators, server actions, Zustand store with realtime, UI components, route page, and 22 unit tests
- 2026-04-02: Senior code review fixes — RLS policy scope hardening, participant_count synchronization race fix, completed sorting correction, stale error handling fix, and test stability improvements

### Senior Developer Review (AI)

- Outcome: **Changes requested** items addressed and verified
- High issues fixed:
  - RLS read policies now target authenticated users (`TO authenticated`)
  - Participant count race removed by replacing optimistic count mutation with server refresh after join/leave
- Medium issues fixed:
  - Stale store error cleared on initial tournament seed
  - Completed tournament ordering now uses `updated_at` descending
  - Tournament tests updated to avoid async `act(...)` warnings
- Verification:
  - `pnpm --filter @cotulenh/web check-types` ✅
  - `pnpm --filter @cotulenh/web lint` ✅ (3 pre-existing warnings)
  - `pnpm --filter @cotulenh/web test` ✅ (673/673)

### File List

- `supabase/migrations/026_tournaments.sql` (new)
- `apps/cotulenh/web/src/lib/types/tournament.ts` (new)
- `apps/cotulenh/web/src/lib/validators/tournament.ts` (new)
- `apps/cotulenh/web/src/lib/actions/tournament.ts` (new)
- `apps/cotulenh/web/src/stores/tournament-store.ts` (new)
- `apps/cotulenh/web/src/hooks/use-tournament-channel.ts` (new)
- `apps/cotulenh/web/src/components/tournament/tournament-card.tsx` (new)
- `apps/cotulenh/web/src/components/tournament/tournament-list.tsx` (new)
- `apps/cotulenh/web/src/components/tournament/tournament-skeleton.tsx` (new)
- `apps/cotulenh/web/src/components/tournament/__tests__/tournament-card.test.tsx` (new)
- `apps/cotulenh/web/src/components/tournament/__tests__/tournament-list.test.tsx` (new)
- `apps/cotulenh/web/src/stores/__tests__/tournament-store.test.ts` (new)
- `apps/cotulenh/web/src/app/(app)/tournament/page.tsx` (new)
- `apps/cotulenh/web/src/app/(app)/tournament/loading.tsx` (new)
