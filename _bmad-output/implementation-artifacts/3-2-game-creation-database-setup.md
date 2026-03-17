# Story 3.2: Game Creation & Database Setup

Status: done

## Story

As a player who has accepted a game invitation,
I want the system to create a game with synchronized state tracking,
so that both players enter a properly initialized game with clocks, deployment phase, and full state persistence.

## Acceptance Criteria

1. **AC1: game_states migration** — A new `game_states` table exists with columns: `id` (uuid PK), `game_id` (uuid FK to games, unique one-to-one), `move_history` (text[]), `fen` (text), `deploy_state` (jsonb), `phase` (text: 'deploying' | 'playing'), `clocks` (jsonb), `updated_at` (timestamptz). RLS: read for game participants, write for service role only.
2. **AC2: is_rated column** — The `games` table gains an `is_rated boolean NOT NULL DEFAULT false` column via ALTER TABLE migration.
3. **AC3: Atomic game creation** — A `createGame` Server Action creates both `games` and `game_states` rows in a single database transaction. If `game_states` insert fails, the entire transaction rolls back (no orphaned games).
4. **AC4: Initial state** — New game has `games.status = 'started'`, `game_states.phase = 'deploying'`, `game_states.clocks` initialized from the invitation's time control preset (milliseconds), `game_states.move_history = '{}'`, `game_states.fen = DEFAULT_POSITION` (from @cotulenh/core), `game_states.deploy_state = null`.
5. **AC5: is_rated flag** — The `is_rated` value is derived from the game invitation's `game_config` field and stored on the `games` row.
6. **AC6: Invitation status update** — On successful game creation, the source `game_invitations` row transitions to `status = 'accepted'` if not already (or verify it is already accepted).
7. **AC7: Validation** — Server Action rejects: missing/invalid invitation, invitation not in 'accepted' state, user not a participant, invitation already linked to an existing game. Returns `{ success: false, error: string }` with descriptive error.
8. **AC8: Redirect** — After successful creation, the action returns `{ success: true, data: { gameId: string } }` so the caller can navigate to `/game/{gameId}`.

## Tasks / Subtasks

- [x] Task 1: Create `game_states` migration (AC: #1)
  - [x] 1.1 Create `supabase/migrations/011_game_states.sql`
  - [x] 1.2 Define table schema with all columns, constraints, and UNIQUE on `game_id`
  - [x] 1.3 Enable RLS with participant-read policy (join through `games` table) and service-role-write policy
  - [x] 1.4 Add `updated_at` auto-trigger (reuse pattern from 004_games.sql)
  - [x] 1.5 Add index on `game_id`
- [x] Task 2: Add `is_rated` to games table (AC: #2)
  - [x] 2.1 Create `supabase/migrations/012_games_add_is_rated.sql`
  - [x] 2.2 `ALTER TABLE public.games ADD COLUMN is_rated boolean NOT NULL DEFAULT false;`
- [x] Task 3: Create `createGame` Server Action (AC: #3, #4, #5, #6, #7, #8)
  - [x] 3.1 Add `createGame(invitationId: string)` to `src/lib/actions/game.ts`
  - [x] 3.2 Authenticate user, validate invitation exists and is accepted
  - [x] 3.3 Verify user is the `to_user` on the invitation (acceptor creates game)
  - [x] 3.4 Verify no game already linked to this invitation (`games.invitation_id`)
  - [x] 3.5 Use Supabase RPC or chained inserts for atomic games + game_states creation
  - [x] 3.6 Initialize clocks from invitation `game_config` time control (convert to ms)
  - [x] 3.7 Set `fen` to DEFAULT_POSITION from `@cotulenh/core`
  - [x] 3.8 Return `{ success: true, data: { gameId } }` or `{ success: false, error }`
- [x] Task 4: Create Zod validation schema (AC: #7)
  - [x] 4.1 Add `src/lib/validators/game.ts` with `createGameSchema` (validates invitationId as UUID)
- [x] Task 5: Write tests (all ACs)
  - [x] 5.1 Unit tests for `createGame` validation logic
  - [x] 5.2 Unit tests for clock initialization from time control presets
  - [x] 5.3 Test error cases: invalid invitation, wrong user, duplicate game

## Dev Notes

### Critical: Missing `is_rated` Column

The existing `getGame` action in `src/lib/actions/game.ts:29` references `game.is_rated`, but the `004_games.sql` migration does NOT include this column. Story 3.2 MUST add it. This is not optional — existing code depends on it.

### Critical: game_states Table Does Not Exist Yet

The `getGame` action already queries `game_states` via nested select (line 31-36). The migration for this table is the primary deliverable of this story. Until it exists, `getGame` returns null for game_state data (handled by fallback defaults on lines 87-91).

### Atomic Transaction Pattern

Supabase JS client does not natively support multi-table transactions. Two approaches:

**Option A (Recommended): Database function (RPC)**
Create a PostgreSQL function `create_game_with_state(...)` that inserts into both tables in a single transaction. Call via `supabase.rpc('create_game_with_state', { ... })`.

**Option B: Sequential inserts with manual rollback**
Insert into `games` first, then `game_states`. If second insert fails, delete the `games` row. Less reliable than Option A.

Use Option A — create the RPC function in the migration file.

### Clock Initialization

The `game_invitations.game_config` stores `{ timeMinutes: number, incrementSeconds: number }`. Convert to milliseconds for `game_states.clocks`:
```
clocks = { red: timeMinutes * 60 * 1000, blue: timeMinutes * 60 * 1000 }
```
The increment is NOT stored in clocks — it's used per-move in later stories (3.5).

### RLS Design for game_states

- **Read policy**: Participants can read their game's state. Join through `games` table:
  ```sql
  USING (EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = game_states.game_id
    AND (games.red_player = auth.uid() OR games.blue_player = auth.uid())
  ))
  ```
- **Write policy**: Service role only (Edge Functions). No direct client writes. For the `createGame` Server Action using RPC, the function runs with `SECURITY DEFINER` to bypass RLS.

### DEFAULT_POSITION Import

Import from `@cotulenh/core`:
```typescript
import { DEFAULT_POSITION } from '@cotulenh/core';
```
This is the starting FEN string before deployment. Do NOT hardcode the FEN.

### Server Action Return Pattern

Follow established pattern from existing `getGame`:
```typescript
type CreateGameResult =
  | { success: true; data: { gameId: string } }
  | { success: false; error: string };
```

### Project Structure Notes

New files:
- `supabase/migrations/011_game_states.sql` — migration with table + RPC function
- `supabase/migrations/012_games_add_is_rated.sql` — ALTER TABLE migration
- `src/lib/validators/game.ts` — Zod schema (new file, follows existing `src/lib/validators/` pattern if it exists, or create directory)

Modified files:
- `src/lib/actions/game.ts` — Add `createGame` Server Action

### Existing Patterns to Reuse

- **Migration pattern**: Follow exact style from `004_games.sql` — table creation, RLS, indexes, trigger, comments
- **Server Action pattern**: `getGame` in `src/lib/actions/game.ts` — auth check, Supabase client, return shape
- **Type definitions**: `src/lib/types/game.ts` — extend if needed (should not need new types for this story)
- **Constants**: `TIME_CONTROL_PRESETS` in `src/lib/constants/game-config.ts` — reference for valid presets
- **RLS trigger pattern**: `update_games_updated_at()` function from 004 — create identical for game_states

### Anti-Patterns to Avoid

- Do NOT create REST API routes — use Server Actions
- Do NOT use `supabase.from('games').insert()` then `supabase.from('game_states').insert()` without transaction safety — use RPC
- Do NOT hardcode the default FEN — import from `@cotulenh/core`
- Do NOT add `is_rated` to `game_config` jsonb — it's a proper column on `games`
- Do NOT throw errors in Server Actions — always return `{ success: false, error }`
- Do NOT create barrel exports (index.ts files)
- Vietnamese error messages for user-facing strings; internal error codes in English

### Naming Conventions

- DB tables/columns: snake_case (`game_states`, `move_history`, `deploy_state`)
- TypeScript types: PascalCase (`GameStateData`, `CreateGameResult`)
- Server Action functions: camelCase (`createGame`)
- Files: kebab-case (`game.ts`, `game-config.ts`)
- Migration files: numbered prefix (`011_game_states.sql`)

### Testing Approach

- Test the `createGame` Server Action logic with mocked Supabase client
- Test validation: UUID format, invitation state checks, participant verification
- Test clock conversion: `timeMinutes` to milliseconds
- Test error paths: invalid invitation, unauthorized user, duplicate game
- Co-locate tests: `src/lib/actions/__tests__/game.test.ts`
- Follow Vitest patterns from `src/stores/__tests__/game-store.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Database Schema, API Patterns, Security]
- [Source: supabase/migrations/004_games.sql — Existing games table schema]
- [Source: supabase/migrations/003_game_invitations.sql — Invitation schema with game_config]
- [Source: src/lib/actions/game.ts — Existing getGame pattern, is_rated reference]
- [Source: src/lib/types/game.ts — GameStateData, GamePhase types already defined]
- [Source: src/lib/constants/game-config.ts — TIME_CONTROL_PRESETS]
- [Source: _bmad-output/implementation-artifacts/3-1-game-page-layout-board-integration.md — Previous story patterns]

### Previous Story Intelligence (3.1)

Key learnings from Story 3.1:
- "Done != done" — ensure ALL ACs are implemented, not just happy path
- Vietnamese text from first commit — no English placeholders
- Server Action `{ success, error? }` return shape — never throw
- 30 tests added in 3.1, all 283 passing — maintain test count
- Board integration uses `useBoard` hook with dynamic import — no changes needed here
- `getGame` already handles missing `game_states` gracefully with fallback defaults

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Created `game_states` table with all required columns (id, game_id, move_history, fen, deploy_state, phase, clocks, updated_at), UNIQUE constraint on game_id, RLS (participant-read via games join, no client writes), updated_at trigger, realtime publication, and game_id index.
- Created `create_game_with_state` RPC function (SECURITY DEFINER) for atomic games + game_states insertion in a single transaction.
- Hardened `create_game_with_state` RPC with server-side invitation/caller validation, row locking (`FOR UPDATE`), and explicit function execute grants (revoke from PUBLIC).
- Added `is_rated boolean NOT NULL DEFAULT false` column to games table via ALTER TABLE migration.
- Added DB uniqueness guarantee for `games.invitation_id` (non-null) to eliminate duplicate game creation race conditions.
- Implemented `createGame` Server Action with full validation: auth check, UUID format validation (Zod), invitation existence/status/recipient checks, duplicate game prevention, and atomic RPC creation.
- Added runtime validation for invitation `game_config` shape before RPC call to prevent malformed clock configuration payloads.
- Clocks initialized from `game_config.timeMinutes` converted to milliseconds. `is_rated` derived from `game_config.isRated` (defaults to false).
- FEN imported from `@cotulenh/core` `DEFAULT_POSITION` — not hardcoded.
- Vietnamese error messages for all user-facing validation errors.
- 16 targeted tests passing for create-game action and validators.

### Senior Developer Review (AI)

- Reviewer: Noy
- Date: 2026-03-17
- Outcome: Approved after fixes
- High issues fixed:
  - Restricted `SECURITY DEFINER` RPC execution scope (no PUBLIC execute).
  - Closed invitation race condition with unique invitation-to-game DB constraint.
- Medium issues fixed:
  - Added invitation `game_config` runtime validation.
  - Synced story file metadata and file list with review changes.

### Change Log

- 2026-03-17: Implemented all tasks (1-5) for Story 3.2 — game_states migration, is_rated column, createGame Server Action, Zod validator, and comprehensive tests.
- 2026-03-17: Applied senior review hardening — RPC authorization constraints, invitation race-condition fix, and stricter input validation.

### File List

New files:
- `supabase/migrations/011_game_states.sql` — game_states table + create_game_with_state RPC
- `supabase/migrations/012_games_add_is_rated.sql` — ALTER TABLE add is_rated
- `supabase/migrations/013_games_unique_invitation_id.sql` — unique invitation-to-game constraint
- `apps/cotulenh/web/src/lib/validators/game.ts` — createGameSchema Zod validator
- `apps/cotulenh/web/src/lib/validators/__tests__/game.test.ts` — validator tests (6 tests)
- `apps/cotulenh/web/src/lib/actions/__tests__/game.test.ts` — createGame action tests (10 tests)

Modified files:
- `apps/cotulenh/web/src/lib/actions/game.ts` — added createGame Server Action + hardened RPC invocation path
