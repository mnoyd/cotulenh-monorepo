# Story 4.2: Friend Challenge

Status: done

## Story

As a player,
I want to send a game challenge directly to a specific friend,
so that I can play with someone I know without using the public lobby.

## Acceptance Criteria

1. **AC1: Send friend challenge from friends list**
   - **Given** a player is on the friends page (`/user/friends`)
   - **When** they tap "Thách đấu" on an online friend's card
   - **Then** a challenge dialog opens with time control preset (Rapid 15+10 default), rated/casual toggle, and color choice (Random/Red/Blue)
   - **And** submitting creates a `game_invitations` row with `to_user` set to the friend's ID
   - **And** the friend sees the incoming challenge via the personal realtime channel (`user:{userId}:invitations`)

2. **AC2: Send friend challenge from play page**
   - **Given** a player is on the play page (`/play/online`)
   - **When** they use a "Challenge Friend" option
   - **Then** they can select from their online friends list
   - **And** after selecting a friend, the same challenge dialog (time control, rated/casual, color) appears
   - **And** submitting creates the invitation identically to AC1

3. **AC3: Receive and view challenge notification**
   - **Given** a friend receives a challenge
   - **When** the invitation INSERT event arrives via Postgres Changes on the personal channel
   - **Then** an actionable toast appears: "{challenger} thách đấu {timeControl} [Chấp nhận] [Từ chối]"
   - **And** the toast persists until acted on or 30s timeout (per UX spec)
   - **And** the received invitations list updates in real time

4. **AC4: Accept friend challenge**
   - **Given** a friend views an incoming challenge
   - **When** they tap "Chấp nhận" (Accept)
   - **Then** the `acceptInvitation` server action is called
   - **And** a new game is created atomically (games + game_states via `create_game_with_state` RPC)
   - **And** both players are navigated to `/game/{gameId}`

5. **AC5: Decline friend challenge**
   - **Given** a friend views an incoming challenge
   - **When** they tap "Từ chối" (Decline)
   - **Then** the `declineInvitation` server action is called
   - **And** the challenger is notified via realtime UPDATE event on their personal channel
   - **And** the challenger sees a toast: "{friend} đã từ chối thách đấu"

6. **AC6: Cancel sent challenge**
   - **Given** a player has a pending friend challenge
   - **When** they cancel it
   - **Then** the `cancelInvitation` server action is called
   - **And** the recipient's realtime channel receives the DELETE event
   - **And** the challenge disappears from both users' views

7. **AC7: Challenge details display**
   - **Given** a challenge is displayed (sent or received)
   - **Then** it shows: challenger's display name, rating, time control preset, and rated/casual flag

8. **AC8: Challenge while in game**
   - **Given** a player receives a friend challenge while in an active game
   - **When** the invitation INSERT event arrives
   - **Then** the toast notification still appears (persists until acted on or 30s timeout)
   - **And** the invitation is visible in the received invitations list
   - **And** if the player accepts after finishing their game, acceptance may fail if the invitation has expired (5-minute TTL) — show appropriate error toast

## Tasks / Subtasks

### Task 0: Extend InvitationItem Type for Rating (AC: 7)
- [x] 0.1 Add `rating?: number` to `fromUser` in `InvitationItem` interface (`$lib/invitations/types.ts`)
- [x] 0.2 Update `getReceivedInvitations()` and `getSentInvitations()` in `$lib/invitations/queries.ts` to join profiles table and include rating
- [x] 0.3 Update realtime event handling in `realtime-core.ts` to include `fromUser.rating` when available

### Task 1: Challenge Dialog Component (AC: 1, 2, 7)
- [x] 1.1 Create `FriendChallengeDialog.svelte` in `src/lib/components/`
  - Props: `friend: { id, displayName, rating? }`, `open: boolean`
  - Form fields: time control preset (Rapid 15+10 default), rated/casual toggle, color choice (Random/Red/Blue)
  - Display friend's rating next to display name in the dialog header
  - Submit calls `sendInvitation` server action via `use:enhance`
  - Uses existing `GameConfig` type from `$lib/invitations/types.ts`
  - Vietnamese labels throughout (see UX spec labels below)
  - Must call `hasPendingInvitation(fromUserId, toUserId)` before submitting to prevent duplicate pending invitations to the same friend
- [x] 1.2 Validate game config client-side with existing `validateGameConfig()` from `$lib/invitations/queries.ts`

### Task 2: Friends Page Integration (AC: 1)
- [x] 2.1 Update `FriendCard` component (or equivalent in friends page) to add "Thách đấu" button for online friends
  - Button disabled for offline friends (per UX spec)
  - On click: opens `FriendChallengeDialog` with friend data
- [x] 2.2 Add a `sendFriendChallenge` server action to `/routes/user/friends/+page.server.ts`
  - Reuse `sendInvitation()` query function from `$lib/invitations/queries.ts`
  - Must call `hasPendingInvitation()` before inserting to prevent duplicate pending invitations
  - Follow same pattern as existing actions in the friends page (safeGetSession, formData, fail on error)
  - This keeps form submissions on the same page — consistent with SvelteKit conventions

### Task 3: Play Page Friend Challenge (AC: 2)
- [x] 3.1 Add "Thách đấu bạn bè" (Challenge Friend) button/section to play page
- [x] 3.2 Create friend selector UI (list of online friends with presence indicators)
  - Reuse friend data already loaded or fetch via `getFriendsList` + presence from `presence-core.ts`
- [x] 3.3 On friend selection, open `FriendChallengeDialog`

### Task 4: Incoming Challenge Toast Notification (AC: 3, 5, 8)
- [x] 4.1 Create `IncomingChallengeToast.svelte` in `src/lib/components/`
  - Shows: "{displayName} ({rating}) thách đấu {timeControl} [Chấp nhận] [Từ chối]"
  - Persists until acted on or 30s timeout
  - Accept triggers `acceptInvitation` action
  - Decline triggers `declineInvitation` action
- [x] 4.2 Wire into the existing personal invitation realtime channel (`user:{userId}:invitations`)
  - The `realtime-core.ts` already fires INSERT events for `to_user = currentUser`
  - Listen for new invitation events and show toast
- [x] 4.3 Handle declined notification for challenger
  - Listen for UPDATE events on sent invitations where status changes to 'declined'
  - Show toast: "{friend} đã từ chối thách đấu" (auto-dismiss 3s)
- [x] 4.4 Handle expired invitation on accept attempt
  - If `acceptInvitation` fails due to expiry, show error toast: "Thách đấu đã hết hạn" (auto-dismiss 3s)

### Task 5: Navigation After Accept (AC: 4)
- [x] 5.1 After successful `acceptInvitation`, navigate acceptor to `/game/{gameId}`
  - `acceptInvitation` in queries.ts already returns `{ gameId }` on success
- [x] 5.2 Challenger navigation: listen for UPDATE event on sent invitation where status = 'accepted'
  - The `shouldNavigateOnAcceptedSentInvitation` pattern from `lobby-state.ts` already handles this for open challenges — adapt for friend challenges
  - Navigate to `/game/{gameId}` (gameId from the invitation's associated game)

### Task 6: Received Invitations UI (AC: 3, 4, 5, 6, 7)
- [x] 6.1 Ensure received friend invitations are visible in the play page
  - `getReceivedInvitations` already exists in queries.ts
  - Play page load already returns `receivedInvitations`
  - Display with accept/decline actions
- [x] 6.2 Ensure sent friend invitations are visible with cancel option
  - `getSentInvitations` already exists
  - Play page load already returns `sentInvitations`
  - Display with cancel action

### Task 7: Testing (All ACs)
- [x] 7.1 Unit tests for `FriendChallengeDialog` component
- [x] 7.2 Unit tests for toast notification behavior (show/dismiss/timeout)
- [x] 7.3 Integration tests for send/accept/decline/cancel flows
- [x] 7.4 Test realtime event handling for both challenger and recipient
- [x] 7.5 Browser E2E test: full dual-player friend challenge flow (send → accept → game starts)

## Dev Notes

### Critical: Most Backend Infrastructure Already Exists

**Do NOT create new query functions, server actions, or database migrations for the core challenge CRUD.** The following already exist and handle friend challenges (`to_user` set to friend's ID):

| Function | File | Purpose |
|----------|------|---------|
| `sendInvitation()` | `$lib/invitations/queries.ts` | Creates `game_invitations` row with `to_user` |
| `acceptInvitation()` | `$lib/invitations/queries.ts` | Accepts + creates game via `create_game_with_state` RPC |
| `declineInvitation()` | `$lib/invitations/queries.ts` | Updates status to 'declined' |
| `cancelInvitation()` | `$lib/invitations/queries.ts` | Cancels pending invitation |
| `getSentInvitations()` | `$lib/invitations/queries.ts` | Lists sent invitations |
| `getReceivedInvitations()` | `$lib/invitations/queries.ts` | Lists received invitations |
| `hasPendingInvitation()` | `$lib/invitations/queries.ts` | Prevents duplicate invitations |
| `validateGameConfig()` | `$lib/invitations/queries.ts` | Server-side config validation |

**Server actions** in `/routes/play/online/+page.server.ts` already include: `sendInvitation`, `cancelInvitation`, `acceptInvitation`, `declineInvitation`.

**Realtime** personal channel (`user:{userId}:invitations`) in `$lib/invitations/realtime-core.ts` already handles INSERT/UPDATE/DELETE events for friend invitations.

**Database** `game_invitations` table with RLS policies already supports friend challenges (`to_user IS NOT NULL, invite_code IS NULL`).

### This Story Is Primarily UI/UX Work

The main deliverables are:
1. **Challenge dialog** — new component for selecting time control and submitting
2. **Friend challenge button** — on friends page and play page
3. **Toast notifications** — for incoming challenges and declined responses
4. **Navigation wiring** — both players navigate to game on accept
5. **Friend selector** — on play page for choosing which friend to challenge

### Architecture Patterns to Follow

- **Svelte 5 runes**: Use `$state`, `$derived`, `$effect`, `$props` — NOT Svelte 4 stores
- **Core + reactive wrapper**: Imperative logic in `*-core.ts`, Svelte reactivity in `*.svelte.ts`
- **Server actions**: Return `{ success, data?, error? }` — never throw. Use `use:enhance` for forms
- **Error format**: `return fail(statusCode, { errors: { form: 'errorKey' }, action: 'actionName' })`
- **Component files**: Match existing naming pattern in `src/lib/components/` (e.g., `FriendChallengeDialog.svelte` like existing `OpenChallengeRow.svelte`, `MatchInvitationToast.svelte`)
- **Vietnamese UI only**: All user-facing strings in Vietnamese. Use i18n keys if pattern exists, inline Vietnamese if not
- **Tests co-located**: Place test files next to source files
- **shadcn/ui**: Use Dialog, Button, Toggle primitives from the existing UI library
- **No barrel exports**: Direct imports only

### UX Labels (Vietnamese)

| Element | Vietnamese |
|---------|-----------|
| Challenge friend button | "Thách đấu" |
| Challenge friend (play page) | "Thách đấu bạn bè" |
| Time control label | Use existing lobby labels |
| Rated toggle | Use existing lobby labels |
| Send challenge | "Gửi thách đấu" |
| Accept | "Chấp nhận" |
| Decline | "Từ chối" |
| Cancel challenge | "Hủy thách đấu" |
| Incoming challenge toast | "{name} ({rating}) thách đấu {timeControl} [Chấp nhận] [Từ chối]" |
| Declined notification | "{name} đã từ chối thách đấu" |
| Expired invitation | "Thách đấu đã hết hạn" |

### i18n Keys to Add

Add the following keys to both Vietnamese and English translation files (check existing i18n pattern):

| Key | Vietnamese | English |
|-----|-----------|---------|
| `friend.challenge.toast.received` | "{name} ({rating}) thách đấu {timeControl}" | "{name} ({rating}) challenges you {timeControl}" |
| `friend.challenge.toast.declined` | "{name} đã từ chối thách đấu" | "{name} declined your challenge" |
| `friend.challenge.toast.expired` | "Thách đấu đã hết hạn" | "Challenge has expired" |
| `friend.challenge.dialog.title` | "Thách đấu {name}" | "Challenge {name}" |
| `friend.challenge.action.send` | "Gửi thách đấu" | "Send challenge" |
| `friend.challenge.action.cancel` | "Hủy thách đấu" | "Cancel challenge" |

### Toast Behavior (UX Spec)

- Actionable toasts (accept/decline) persist until acted on or 30s timeout
- Non-actionable toasts (declined notification, expired) auto-dismiss 3s
- **Positioning**: Existing `MatchInvitationToast.svelte` uses `bottom: 1.5rem; right: 1.5rem` (bottom-right). Use the same positioning for consistency — match the existing toast component's style
- Max 3 stacked. Never overlap board
- Check existing `MatchInvitationToast.svelte` in `src/lib/components/` before creating a new toast component — consider extending or reusing it if the pattern is similar

### Friend Online Status

- Presence tracking uses `$lib/friends/presence-core.ts` with channel `lobby`
- `isUserOnline(userId)` and `getOnlineUsers()` available
- Svelte wrapper in `presence.svelte.ts` provides reactive `onlineUsers` and `isConnected`
- "Thách đấu" button should be disabled for offline friends

### Navigation Pattern After Accept

- **Acceptor**: Direct navigation after successful `acceptInvitation` returns `{ gameId }`
- **Challenger**: Must detect the status change via realtime UPDATE event. Pattern from `lobby-state.ts`:
  - `shouldNavigateOnAcceptedSentInvitation()` checks if a sent invitation was accepted
  - Adapt this for friend challenges (same invitation table, same event pattern)
  - Navigate to `/game/{gameId}` — the game ID is associated with the accepted invitation

### Server Action Architecture

**Friends page** (`/routes/user/friends/+page.server.ts`): Add a `sendFriendChallenge` action that reuses `sendInvitation()` from `$lib/invitations/queries.ts`. This keeps form submissions on the same page, consistent with SvelteKit conventions.

**Toast accept/decline actions**: The toast appears on any page. For accept/decline from toasts, use client-side `fetch` to call the play page's existing `acceptInvitation`/`declineInvitation` actions, since the user may not be on the play page when they act on the toast. This is the same cross-page pattern used by global notifications.

**Play page** (`/routes/play/online/+page.server.ts`): Already has `sendInvitation`, `acceptInvitation`, `declineInvitation` actions — no changes needed for the play page friend challenge flow (Task 3 submits to same page).

### Project Structure Notes

- All paths relative to `/apps/cotulenh/app/src/`
- New components go in `lib/components/` (existing: `OpenChallengeRow.svelte`, `MatchInvitationToast.svelte`, `TimeControlSelector.svelte`, etc.)
- Check exact file names and casing in `lib/components/` before creating new files
- Invitation logic in `lib/invitations/` — DO NOT duplicate
- Friend logic in `lib/friends/` — reuse presence utilities
- Play page route: `routes/play/online/`
- Friends page route: `routes/user/friends/`

### Previous Story (4-1) Key Learnings

- Story 4-1 established the lobby with open challenges using the same `game_invitations` table
- Realtime lobby uses a **global** channel (`lobby:challenges`), while friend challenges use the **personal** channel (`user:{userId}:invitations`) — these are distinct subscriptions
- Atomic game creation via `create_game_with_state` RPC is the established pattern — reuse it
- `lobby-state.ts` contains hydration and navigation helpers — some patterns are reusable
- Browser E2E tests use Playwright with local Supabase — follow same harness for dual-player test
- Senior review feedback on 4-1 addressed: atomic game creation, realtime event handling, rated/casual UI, database-enforced uniqueness. These patterns are now established and tested.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 4, Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md - API & Communication Patterns, Realtime Channel Naming, Data Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Friends Management, Play Lobby, Feedback Patterns (Toasts), Journey 1: Friend Challenge]
- [Source: _bmad-output/implementation-artifacts/4-1-create-browse-open-challenges-lobby.md - Previous story patterns]
- [Source: apps/cotulenh/app/src/lib/invitations/queries.ts - Existing invitation CRUD]
- [Source: apps/cotulenh/app/src/lib/invitations/realtime-core.ts - Personal invitation channel]
- [Source: apps/cotulenh/app/src/lib/friends/presence-core.ts - Online status tracking]
- [Source: apps/cotulenh/app/src/routes/play/online/+page.server.ts - Existing server actions]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
No blocking issues encountered during implementation.

### Completion Notes List
- **Task 0**: Extended `InvitationItem.fromUser` with optional `rating` field. Updated `getReceivedInvitations()` and `getOpenChallenges()` to fetch `rating` from profiles table. Added 2 new unit tests for rating inclusion/omission.
- **Task 1**: Created `FriendChallengeDialog.svelte` with time control presets (default 15+10), rated/casual toggle, friend rating display. Uses existing shadcn/ui Dialog primitives. 6 unit tests pass.
- **Task 2**: Added "Thách đấu" button to friends page friend list (disabled for offline friends). Added `sendFriendChallenge` server action reusing `sendInvitation()` query. Integrated FriendChallengeDialog.
- **Task 3**: Updated play page online friends section to open FriendChallengeDialog on click instead of direct invite. Added `handleFriendChallenge` wrapper that delegates to existing `handleInvite`.
- **Task 4**: Enhanced layout's invitation toast to include rating in display name, added 30s auto-dismiss timeout, handle expired invitation error toast ("Thách đấu đã hết hạn"). All timer cleanup on accept/decline/dismiss/delete.
- **Task 5**: Navigation already handled — acceptor navigates via layout toast accept handler, challenger navigates via realtime UPDATE event handler (both layout and play page).
- **Task 6**: Received invitations display updated to show fromUser rating and rated/casual flag. Sent/received invitation UI was already in place from story 4-1.
- **Task 7**: 13 new unit tests (FriendChallengeDialog: 6, friend-challenge integration: 7), plus 2 rating tests in queries. E2E test for full dual-player friend challenge flow. All 764 unit tests pass, 0 regressions.
- **Senior review fixes**: Accepted friend challenges now create `games` + `game_states` atomically via `create_game_with_state`. Added friend-challenge color choice end to end (`preferredColor` in config, dialog UI, and RPC color assignment), challenger decline toast with recipient name, and explicit expiry handling from both toast and play-page acceptance paths.
- **Data model alignment**: Added nullable `profiles.rating` cache field for social surfaces, threaded rating through friends queries/dialog launch, and updated realtime/profile hydration to preserve ratings on live invitation updates.

### File List
- `supabase/migrations/018_profiles_rating_and_friend_color.sql` — new (adds nullable `profiles.rating` cache field and updates `create_game_with_state` to honor friend challenge color choice)
- `apps/cotulenh/app/src/lib/types/database.ts` — modified (adds `profiles.rating` to generated database types)
- `apps/cotulenh/app/src/lib/friends/types.ts` — modified (adds optional `rating` to `FriendListItem`)
- `apps/cotulenh/app/src/lib/friends/queries.ts` — modified (loads friend ratings for challenge surfaces)
- `apps/cotulenh/app/src/lib/invitations/types.ts` — modified (added `rating?: number` to fromUser)
- `apps/cotulenh/app/src/lib/invitations/queries.ts` — modified (rating loading helper, `preferredColor` validation, atomic friend challenge accept via RPC)
- `apps/cotulenh/app/src/lib/invitations/queries.test.ts` — modified (2 new rating tests)
- `apps/cotulenh/app/src/lib/invitations/friend-challenge.test.ts` — new (7 integration tests)
- `apps/cotulenh/app/src/lib/components/FriendChallengeDialog.svelte` — new (challenge dialog component)
- `apps/cotulenh/app/src/lib/components/FriendChallengeDialog.test.ts` — new (6 component tests)
- `apps/cotulenh/app/src/lib/components/MatchInvitationToast.svelte` — modified (friend challenge toast copy updated to match story wording)
- `apps/cotulenh/app/src/lib/i18n/types.ts` — modified (expanded `friend.challenge.*` translation keys)
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — modified (friend challenge translations)
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` — modified (friend challenge translations)
- `apps/cotulenh/app/src/routes/user/friends/+page.server.ts` — modified (added sendFriendChallenge action)
- `apps/cotulenh/app/src/routes/user/friends/+page.svelte` — modified (challenge button label, friend rating handoff to dialog)
- `apps/cotulenh/app/src/routes/play/online/+page.svelte` — modified (FriendChallengeDialog, live rating hydration, sent/received invitation details, expiry handling)
- `apps/cotulenh/app/src/routes/+layout.svelte` — modified (rating in toast, 30s timeout, named decline toast, expiry handling)
- `apps/cotulenh/app/e2e/friend-challenge.spec.ts` — new (browser E2E test)

## Senior Developer Review (AI)

### Outcome
- Approved after fixes.

### Findings Resolved
- Replaced direct `games` insertion in `acceptInvitation()` with the existing `create_game_with_state` RPC so friend challenge accepts create `games` + `game_states` atomically.
- Removed the broken schema mismatch by adding a nullable `profiles.rating` field, updating generated DB types, and plumbing rating through friends/invitation queries and realtime hydration.
- Implemented the missing friend challenge color choice (`Random` / `Red` / `Blue`) in the dialog, config validation, and database game-creation path.
- Updated the challenger-facing decline toast to include the declining friend's name, and narrowed expired-accept handling so invitation expiry shows the correct toast in both toast and play-page acceptance flows.

### Verification
- `pnpm --filter @cotulenh/app test -- --run src/lib/invitations/queries.test.ts src/lib/invitations/friend-challenge.test.ts src/lib/components/FriendChallengeDialog.test.ts`
- `pnpm --filter @cotulenh/app run check-types`
- `pnpm --filter @cotulenh/app exec eslint src/lib/components/FriendChallengeDialog.svelte src/lib/components/MatchInvitationToast.svelte src/lib/friends/queries.ts src/lib/friends/types.ts src/lib/i18n/types.ts src/lib/i18n/locales/en.ts src/lib/i18n/locales/vi.ts src/lib/invitations/queries.ts src/lib/invitations/queries.test.ts src/lib/invitations/types.ts src/lib/invitations/friend-challenge.test.ts src/lib/types/database.ts src/routes/+layout.svelte src/routes/play/online/+page.svelte src/routes/user/friends/+page.server.ts src/routes/user/friends/+page.svelte`
- `pnpm --filter @cotulenh/app run build`

## Change Log
- 2026-03-29: Implemented story 4-2 Friend Challenge — all 7 tasks complete, 764 unit tests pass, 0 regressions
- 2026-03-29: Senior developer review fixes applied — atomic friend challenge accept, color choice wiring, rating cache alignment, and named decline/expiry toast handling. Focused tests, lint, type-check, and build all pass.
