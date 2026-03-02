# Story 4.2: View & Respond to Match Invitations

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to see my pending match invitations and accept or decline them,
So that I can join games my friends want to play.

## Acceptance Criteria

### AC1: Real-time Invitation Notification (Any Page)

```gherkin
Given an authenticated user on any page
When a new match invitation is inserted for them (to_user = me)
Then they receive a real-time toast notification via Postgres Changes subscription (FR19)
And the toast shows the challenger's name, time control, and Accept/Decline buttons
And the toast has role="alertdialog" and is keyboard accessible
And the toast does not block page interaction
```

### AC2: View Received Invitations on Play Page

```gherkin
Given an authenticated user on the /play/online page
When the page loads
Then they see a "Received Invitations" section with pending invitations where to_user = me
And each invitation shows the sender's display name, time control label, and Accept/Decline buttons (FR19)
And received invitations update in real-time when new ones arrive or existing ones are cancelled
```

### AC3: Accept Match Invitation

```gherkin
Given a user clicks "Accept" on a received invitation
When the action completes
Then the invitation status is updated to 'accepted' (FR20)
And a games row is created with status = 'started', both player IDs, and the invitation's time_control
And the accepting user is navigated to /play/online/[gameId]
And the sender receives a real-time notification that their invitation was accepted
```

### AC4: Decline Match Invitation

```gherkin
Given a user clicks "Decline" on a received invitation
When the action completes
Then the invitation status is updated to 'declined' (FR20)
And the invitation disappears from both users' views
And the sender's "Invited" button reverts to "Invite" for that friend
```

### AC5: Sender Notification on Accept/Decline

```gherkin
Given a user has sent a pending invitation
When the recipient accepts or declines
Then the sender sees a toast notification with the outcome
And if accepted, the toast includes a "Go to game" action that navigates to /play/online/[gameId]
And the sent invitation disappears from the sender's view
```

### AC6: Cancelled Invitation Disappears from Recipient

```gherkin
Given a user has received a pending invitation
When the sender cancels it
Then the invitation disappears from the recipient's received invitations in real-time
```

### AC7: Empty States

```gherkin
Given a user has no received invitations
When the page loads
Then the received invitations section is hidden (same pattern as sent invitations)
```

### AC8: Bilingual Support

```gherkin
Given a user views received invitations or notification toasts
Then all labels, buttons, and messages are displayed in the active language (EN/VI)
```

### AC9: Accessibility (WCAG 2.1 AA)

```gherkin
Given a user interacts with invitation notifications and received invitation cards
Then all interactive elements have accessible labels
And MatchInvitationToast has role="alertdialog" with focus management
And Accept/Decline buttons have 44x44px touch targets
And screen readers announce action outcomes via toast aria-live
```

## Tasks / Subtasks

- [x] Task 1: Database migration — games table (AC: 3)
  - [x]1.1 Create `supabase/migrations/004_games.sql` with schema: id (uuid PK), red_player (FK profiles), blue_player (FK profiles), status (started/aborted/checkmate/resign/timeout/stalemate/draw/dispute), winner (red/blue/null), result_reason (text), pgn (text), time_control (jsonb), invitation_id (FK game_invitations), started_at, ended_at, created_at, updated_at
  - [x]1.2 Add RLS policies: both players can SELECT; status updates allowed by either player (UPDATE); no direct INSERT from client (use server action)
  - [x]1.3 Add indexes: red_player, blue_player, status, invitation_id
  - [x]1.4 Add updated_at trigger (same pattern as friendships/game_invitations)
  - [x]1.5 Update `$lib/types/database.ts` with games table types

- [x]Task 2: Received invitation query layer (AC: 2, 3, 4)
  - [x]2.1 Add `getReceivedInvitations(supabase, userId)` to `$lib/invitations/queries.ts` — returns pending invitations where to_user = userId, joined with profiles for sender display name
  - [x]2.2 Add `acceptInvitation(supabase, invitationId, userId)` — verifies to_user = userId, updates status to 'accepted', creates games row with status='started', returns gameId
  - [x]2.3 Add `declineInvitation(supabase, invitationId, userId)` — verifies to_user = userId, updates status to 'declined'

- [x]Task 3: Server actions update (AC: 2, 3, 4)
  - [x]3.1 Update `/play/online/+page.server.ts` load function to also return receivedInvitations
  - [x]3.2 Add `acceptInvitation` action — validates auth, invitationId; calls acceptInvitation query; returns gameId on success
  - [x]3.3 Add `declineInvitation` action — validates auth, invitationId; calls declineInvitation query; returns success/error

- [x]Task 4: Realtime invitation subscription module (AC: 1, 5, 6)
  - [x]4.1 Create `$lib/invitations/realtime.svelte.ts` — Postgres Changes subscription on `game_invitations` table
  - [x]4.2 Subscribe to INSERT where `to_user = me` (new invitation received)
  - [x]4.3 Subscribe to UPDATE where `from_user = me` (sent invitation status changed — accepted/declined)
  - [x]4.4 Subscribe to DELETE where `to_user = me` (sender cancelled invitation)
  - [x]4.5 Export reactive state: `pendingReceivedInvitations` and callback hooks for events
  - [x]4.6 Integrate subscription lifecycle in root layout (subscribe on auth, unsubscribe on logout)

- [x]Task 5: MatchInvitationToast component (AC: 1, 9)
  - [x]5.1 Create `$lib/components/MatchInvitationToast.svelte` — shows challenger name, time control, Accept/Decline buttons
  - [x]5.2 role="alertdialog", keyboard accessible (tab between Accept/Decline), auto-focus on appearance
  - [x]5.3 Does NOT auto-dismiss (stays until user acts or invitation expires/is cancelled)
  - [x]5.4 44px touch targets on Accept/Decline buttons
  - [x]5.5 Accept navigates to /play/online/[gameId]; Decline dismisses the toast

- [x]Task 6: Update online play page UI (AC: 2, 3, 4, 6, 7)
  - [x]6.1 Add "Received Invitations" section to `/play/online/+page.svelte` — shows pending received invitations
  - [x]6.2 Each received invitation shows sender name, time control label, Accept/Decline buttons
  - [x]6.3 Optimistic updates: invitation disappears immediately on accept/decline
  - [x]6.4 Accept navigates to /play/online/[gameId] after server confirms
  - [x]6.5 Realtime updates: new received invitations appear, cancelled ones disappear
  - [x]6.6 Sender's "Invited" button reverts to "Invite" when recipient declines

- [x]Task 7: Game page placeholder (AC: 3)
  - [x]7.1 Create `/play/online/[gameId]/+page.server.ts` — load function fetches game by ID, verifies current user is a player
  - [x]7.2 Create `/play/online/[gameId]/+page.svelte` — placeholder showing game info (players, time control, "Game starting..." message)
  - [x]7.3 Protected route (use existing layout auth guard)

- [x]Task 8: i18n translations (AC: 8)
  - [x]8.1 Add received invitation translation keys to `$lib/i18n/types.ts`
  - [x]8.2 Add English translations (accept, decline, received invitations, notification messages, game page placeholder)
  - [x]8.3 Add Vietnamese translations

- [x]Task 9: Tests (AC: all)
  - [x]9.1 Query tests: getReceivedInvitations, acceptInvitation, declineInvitation — success paths, authorization, error handling
  - [x]9.2 Server action tests: acceptInvitation (auth, validation, success, not-recipient failure), declineInvitation (auth, validation, success, not-recipient failure)
  - [x]9.3 Realtime subscription tests: verify channel setup, event handling callbacks
  - [x]9.4 Game page server tests: load function (auth, player verification, game not found)

## Dev Notes

### Critical Architecture Patterns (MUST FOLLOW)

**Tech Stack:** SvelteKit + Svelte 5 runes + Supabase + TypeScript + Vitest

**Supabase Client Access:**
- Server: `locals.supabase` from `+page.server.ts` (created per-request in `hooks.server.ts`)
- Browser: singleton client for realtime subscriptions — needed in this story for Postgres Changes
- Always check `{ data, error }` returns — never assume success

**Realtime Channel Architecture (from architecture.md):**
- `user:{user_id}` notifications channel — Postgres Changes on `game_invitations`
- Listen for INSERT (new invitation), UPDATE (accept/decline), DELETE (cancel)
- Persistent — works even if recipient was briefly offline
- Subscribe in root layout so it works on any page

**Supabase Postgres Changes Pattern:**

```typescript
const channel = supabase
  .channel(`user:${userId}:invitations`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'game_invitations',
      filter: `to_user=eq.${userId}`
    },
    (payload) => {
      // Handle new incoming invitation
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'game_invitations',
      filter: `from_user=eq.${userId}`
    },
    (payload) => {
      // Handle sent invitation status change (accepted/declined)
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'game_invitations',
      filter: `to_user=eq.${userId}`
    },
    (payload) => {
      // Handle sender cancelled an invitation to me
    }
  )
  .subscribe();
```

**Database Schema — games table:**

```sql
CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  red_player uuid NOT NULL REFERENCES public.profiles(id),
  blue_player uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'aborted', 'checkmate', 'resign', 'timeout', 'stalemate', 'draw', 'dispute')),
  winner text CHECK (winner IN ('red', 'blue') OR winner IS NULL),
  result_reason text,
  pgn text,
  time_control jsonb NOT NULL,
  invitation_id uuid REFERENCES public.game_invitations(id),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Accept Invitation Flow (server-side):**

```typescript
// 1. Verify recipient
// 2. Update invitation status to 'accepted'
// 3. Determine colors (sender = red, recipient = blue — or random)
// 4. Create games row
// 5. Return gameId for navigation
```

**Color Assignment:** Sender is red (first to move in CoTuLenh), recipient is blue. This follows the convention that the challenger gets the initiative.

**Query Patterns for received invitations:**

```typescript
// Get received pending invitations
const { data, error } = await supabase
  .from('game_invitations')
  .select('id, from_user, to_user, game_config, invite_code, status, created_at')
  .eq('to_user', userId)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });

// Accept invitation
const { data: updated, error: updateError } = await supabase
  .from('game_invitations')
  .update({ status: 'accepted' })
  .eq('id', invitationId)
  .eq('to_user', userId)
  .eq('status', 'pending')
  .select('id, from_user, game_config')
  .single();

// Decline invitation
const { data, error } = await supabase
  .from('game_invitations')
  .update({ status: 'declined' })
  .eq('id', invitationId)
  .eq('to_user', userId)
  .eq('status', 'pending')
  .select('id')
  .single();
```

### Existing Code to Reuse (DO NOT REINVENT)

1. **Auth guard**: `/play/online/+layout.server.ts` already has `requireAuth` — page is protected
2. **Invitation queries**: `$lib/invitations/queries.ts` — extend with received invitation functions
3. **Invitation types**: `$lib/invitations/types.ts` — GameConfig, InvitationItem already defined
4. **Toast**: svelte-sonner — follow patterns from `/play/online/+page.svelte`
5. **Form actions**: SvelteKit form actions with `x-sveltekit-action` header — follow existing `postAction` pattern
6. **i18n module**: `$lib/i18n/index.svelte` + `types.ts` + `locales/en.ts` + `locales/vi.ts`
7. **PlayerCard**: `$lib/components/PlayerCard.svelte` — reuse for sender display
8. **InvitationCard**: `$lib/components/InvitationCard.svelte` — extend pattern for received invitation card
9. **Presence module**: `$lib/friends/presence-core.ts` + `presence.svelte.ts` — follow same core + reactive wrapper pattern for invitation realtime
10. **sanitizeName**: `$lib/invitations/queries.ts` — already defined, reuse for sender display names
11. **Root layout**: `+layout.svelte` — already manages lobby presence, add invitation subscription alongside

### Supabase Realtime Prerequisites

Postgres Changes requires `supabase_realtime` publication to include the `game_invitations` table. Add to migration:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invitations;
```

This must be in the existing `003_game_invitations.sql` migration or a new migration. Since 003 is already applied, add it to `004_games.sql`.

### Browser Supabase Client

The root layout accesses the Supabase client via `$page.data.supabase` (passed from layout server). For Postgres Changes subscriptions in the browser, use this same client instance. Do NOT create a separate browser client — the layout already provides one.

### Dependencies

- **Story 4.1 must be completed** — this story extends the invitation infrastructure built in 4.1
- **Presence system (Story 3.3)** — already integrated in 4.1, continues to work here

### Security Requirements

- RLS: recipients can only accept/decline invitations where to_user = their ID
- Accept authorization: server must verify `to_user == currentUser` (recipient only)
- Decline authorization: server must verify `to_user == currentUser` (recipient only)
- Games table RLS: only players of a game can read it; no direct client INSERT (created via server action only)
- Sanitize sender display names in received invitation rendering
- Prevent accepting already-accepted/declined invitations (status = 'pending' check)

### Performance Considerations

- Postgres Changes subscription is persistent — no polling needed
- Optimistic UI updates for accept/decline — don't wait for server before updating UI
- Only one realtime channel per user for invitation notifications (not one per invitation)
- Unsubscribe from invitation channel on logout to prevent leaked connections

### Common Mistakes to Prevent

1. **DO NOT** use Svelte 4 stores — use Svelte 5 runes only ($state, $derived, $effect, $props)
2. **DO NOT** hardcode strings — all text through i18n
3. **DO NOT** skip optimistic updates — invitation should disappear immediately on accept/decline
4. **DO NOT** create a separate browser Supabase client — use `$page.data.supabase`
5. **DO NOT** forget to add `game_invitations` to `supabase_realtime` publication
6. **DO NOT** allow accepting an invitation that isn't pending (race condition)
7. **DO NOT** allow accepting an invitation meant for another user
8. **DO NOT** use `console.log` — use `logger` from `@cotulenh/common`
9. **DO NOT** use relative imports `../../../` — always use `$lib/` alias
10. **DO NOT** forget 44px touch targets on Accept/Decline buttons
11. **DO NOT** auto-dismiss the MatchInvitationToast — it stays until user acts or invitation is cancelled/expired
12. **DO NOT** create game via client-side insert — use server action to ensure both invitation update and game creation are atomic

### Project Structure Notes

**New files to create:**

```
supabase/migrations/
  004_games.sql                              <- Games table + RLS + supabase_realtime publication

apps/cotulenh/app/src/lib/invitations/
  realtime.svelte.ts                         <- Postgres Changes subscription (reactive wrapper)
  realtime-core.ts                           <- Core subscription logic (non-reactive)

apps/cotulenh/app/src/lib/components/
  MatchInvitationToast.svelte                <- Real-time incoming invitation toast
  ReceivedInvitationCard.svelte              <- Received invitation display with accept/decline

apps/cotulenh/app/src/routes/play/online/
  [gameId]/+page.server.ts                   <- Game page load function
  [gameId]/+page.svelte                      <- Game page placeholder
```

**Files to modify:**

```
apps/cotulenh/app/src/lib/invitations/queries.ts      <- Add getReceivedInvitations, acceptInvitation, declineInvitation
apps/cotulenh/app/src/lib/invitations/queries.test.ts <- Add tests for new queries
apps/cotulenh/app/src/lib/types/database.ts           <- Add games table types
apps/cotulenh/app/src/routes/play/online/+page.server.ts   <- Add receivedInvitations to load, new actions
apps/cotulenh/app/src/routes/play/online/page.server.test.ts <- Add tests for new actions
apps/cotulenh/app/src/routes/play/online/+page.svelte      <- Add received invitations section + realtime
apps/cotulenh/app/src/routes/+layout.svelte                <- Add invitation realtime subscription
apps/cotulenh/app/src/lib/i18n/types.ts                    <- Add received invitation keys
apps/cotulenh/app/src/lib/i18n/locales/en.ts               <- Add English translations
apps/cotulenh/app/src/lib/i18n/locales/vi.ts               <- Add Vietnamese translations
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4 - Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schema, #RLS Policies, #Realtime Channels]
- [Source: _bmad-output/planning-artifacts/prd.md#FR19, #FR20, #FR23]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#MatchInvitationToast, #Invitation Cards, #Button Hierarchy]
- [Source: _bmad-output/implementation-artifacts/4-1-send-match-invitation-to-friend.md — predecessor story]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Fixed `actionChain` test helper missing `update` method — 8 test failures
- Fixed missing `toast` import in +layout.svelte — svelte-check error
- Fixed database.ts structural bug — games table placed after extra `};` closing Tables block
- Fixed `error()`/`redirect()` not typed as never-returning — added `throw` prefix in [gameId]/+page.server.ts
- Fixed test type assertions for void union from parent layout load

### Completion Notes List

- All 329 tests pass across 29 test files (13 new realtime-core tests)
- svelte-check shows only pre-existing `$env/static/public` errors (4 errors) — no new errors
- Realtime subscription follows established presence pattern (core + reactive wrapper)
- Accept flow includes rollback logic if game creation fails after invitation update
- Color assignment: sender = red (first to move), recipient = blue

### Code Review Fixes Applied

- H1: Added "Go to Game" action button to sender's accept toast in layout (query games by invitation_id)
- H2: Fixed optimisticInvited Set not clearing on realtime statusChanged (decline/accept)
- H3: Created realtime-core.test.ts with 13 tests covering subscriptions, events, callbacks, cleanup
- M1: Added focus management to MatchInvitationToast (onMount focus, tabindex="-1", bind:this)
- M2: Fixed realtime received invitations showing blank name — now fetches sender profile async
- M3: Tightened games INSERT RLS to require auth.uid()=blue_player, invitation_id NOT NULL, and EXISTS accepted invitation
- M4: Replaced fragile JSON.parse response parsing with SvelteKit's deserialize() in both layout and page

### File List

New files:
- `supabase/migrations/004_games.sql`
- `apps/cotulenh/app/src/lib/invitations/realtime-core.ts`
- `apps/cotulenh/app/src/lib/invitations/realtime.svelte.ts`
- `apps/cotulenh/app/src/lib/invitations/realtime-core.test.ts`
- `apps/cotulenh/app/src/lib/components/MatchInvitationToast.svelte`
- `apps/cotulenh/app/src/lib/components/ReceivedInvitationCard.svelte`
- `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.server.ts`
- `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte`
- `apps/cotulenh/app/src/routes/play/online/[gameId]/page.server.test.ts`

Modified files:
- `apps/cotulenh/app/src/lib/invitations/queries.ts`
- `apps/cotulenh/app/src/lib/invitations/queries.test.ts`
- `apps/cotulenh/app/src/lib/types/database.ts`
- `apps/cotulenh/app/src/routes/play/online/+page.server.ts`
- `apps/cotulenh/app/src/routes/play/online/page.server.test.ts`
- `apps/cotulenh/app/src/routes/play/online/+page.svelte`
- `apps/cotulenh/app/src/routes/+layout.svelte`
- `apps/cotulenh/app/src/lib/i18n/types.ts`
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts`
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/4-2-view-respond-to-match-invitations.md`
