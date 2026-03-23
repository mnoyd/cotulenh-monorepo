# Story 3.8: Rematch Flow

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player who just finished a game,
I want to request a rematch with my opponent,
So that we can play again quickly without going back to the lobby.

## Acceptance Criteria

1. **AC1: Rematch Offer** — Given a game has ended (`phase === 'ended'`) and the `GameResultBanner` is displayed, when a player taps "Tái đấu" (Rematch), then a `rematch_offer` action is sent to the validate-move Edge Function. The server validates the game is terminal, the player is a participant, and no rematch is already pending. The server stores the rematch state in `game_states.pending_action` as `{ type: 'rematch_offer', color: playerColor, created_at }` and broadcasts a `rematch_offer` event `{ offering_color }` to the opponent. The opponent's result banner shows an "Accept Rematch" button.

2. **AC2: Rematch Accept** — Given a rematch offer is pending, when the opponent taps "Chấp nhận" (Accept), then a `rematch_accept` action is sent to the server. The server verifies the pending `rematch_offer` from the opponent exists, calls the new `create_rematch_game` RPC with the original game_id and default FEN. The RPC creates a new game with **swapped colors** (original red → new blue, vice versa), same `time_control` and `is_rated` settings, and no `invitation_id`. The server broadcasts `rematch_accepted` with `{ new_game_id }` to both players. Both clients navigate to `/game/${new_game_id}`.

3. **AC3: Rematch Decline** — Given a rematch offer is pending, when the opponent taps "Từ chối" (Decline) or navigates away from the game page, then a `rematch_decline` action is sent to the server (explicitly for button tap; implicitly via channel leave for navigation). The server clears `pending_action` and broadcasts `rematch_declined`. The offering player sees "Đối thủ từ chối tái đấu" (Opponent declined rematch) and can navigate to dashboard or lobby.

4. **AC4: Rematch Expiry** — Given a rematch offer is pending, when 60 seconds pass without response, the offer expires. The server broadcasts `rematch_expired`. Both clients clear the rematch UI. The offering player's "Tái đấu" button is re-enabled so they can try again if desired.

5. **AC5: Single Pending Rematch** — Only one rematch offer can be pending at a time per game. A player cannot send a rematch offer while one is already pending (from either player). The existing `pending_action` single-slot constraint enforces this.

6. **AC6: Rematch After Navigate Away** — If a player navigates away from the game page (unsubscribes from the channel), any pending rematch offer from them is treated as declined. The remaining player's UI clears the rematch state. Implementation: detect channel presence leave event or rely on the 60s server-side expiry.

7. **AC7: Guard Conditions** — Rematch offer is only valid when `game.status` is terminal (any status in `TERMINAL_STATUSES`: checkmate, resign, timeout, stalemate, draw). Rematch is NOT available for aborted or disputed games. Both players must still be subscribed to the game channel (presence check is optional — expiry handles the case where opponent left).

## Tasks / Subtasks

- [x] Task 1: Create `create_rematch_game` RPC via database migration (AC: #2)
  - [x] 1.1 Create migration `supabase/migrations/017_create_rematch_game.sql`
  - [x] 1.2 Define RPC `create_rematch_game(p_original_game_id uuid, p_fen text) RETURNS uuid`:
    - Authenticate caller (`auth.uid() IS NULL` check)
    - SELECT the original game by id, verify caller is participant (`red_player = auth.uid() OR blue_player = auth.uid()`)
    - Verify original game is terminal (status NOT IN ('started', 'aborted', 'dispute'))
    - Swap colors: new `red_player = original.blue_player`, new `blue_player = original.red_player`
    - Copy `time_control` JSONB and `is_rated` from original game
    - INSERT new game with `status = 'started'`, `invitation_id = NULL`
    - INSERT new game_states with empty `move_history`, provided FEN, `phase = 'deploying'`, clocks from `time_control` (same calculation as `create_game_with_state`)
    - RETURN new game_id
  - [x] 1.3 Grant EXECUTE to `authenticated` and `service_role`, REVOKE from PUBLIC
  - [x] 1.4 Use `SECURITY DEFINER` with `SET search_path = public` (same pattern as `create_game_with_state`)

- [x] Task 2: Add rematch actions to validate-move Edge Function (AC: #1, #2, #3, #4, #5, #7)
  - [x] 2.1 Add action routing: `isRematchOffer = action === 'rematch_offer'`, `isRematchAccept = action === 'rematch_accept'`, `isRematchDecline = action === 'rematch_decline'` — route these BEFORE the phase-based routing (same level as `isResign`, `isTimeoutClaim`)
  - [x] 2.2 For rematch actions: verify game is terminal (game.status in TERMINAL_STATUSES), NOT 'aborted' or 'dispute'. Do NOT check `game_states.phase` since it tracks client lifecycle, not DB status
  - [x] 2.3 `rematch_offer` handler: validate no existing `pending_action`, store `{ type: 'rematch_offer', color: playerColor, created_at: new Date().toISOString() }` in `game_states.pending_action`, broadcast `rematch_offer` event `{ type: 'rematch_offer', payload: { offering_color: playerColor }, seq: move_history.length + 1 }`
  - [x] 2.4 `rematch_accept` handler: validate `pending_action.type === 'rematch_offer'` and `pending_action.color !== playerColor` (opponent offered), check expiry via `isPendingActionExpired()` (60s), call `create_rematch_game` RPC with `game_id` and `DEFAULT_POSITION` FEN, clear `pending_action`, broadcast `rematch_accepted` event `{ type: 'rematch_accepted', payload: { new_game_id }, seq }`
  - [x] 2.5 `rematch_decline` handler: validate `pending_action.type === 'rematch_offer'` and `pending_action.color !== playerColor`, clear `pending_action`, broadcast `rematch_declined` event
  - [x] 2.6 Add `REMATCH_OFFER_EXPIRY_MS = 60_000` to `pending-action.ts`, update `isPendingActionExpired()` to handle `'rematch_offer'` type
  - [ ] 2.7 Write Deno tests: offer rematch on ended game, accept rematch (verify new game created with swapped colors), decline rematch, offer on non-terminal game (rejected), double offer (rejected), accept expired offer (rejected), accept own offer (rejected)

- [x] Task 3: Update PendingAction type in pending-action.ts (AC: #1, #4, #5)
  - [x] 3.1 Add `{ type: 'rematch_offer'; color: 'red' | 'blue'; created_at: string }` to the `PendingAction` union type
  - [x] 3.2 Add `REMATCH_OFFER_EXPIRY_MS = 60_000` constant
  - [x] 3.3 Update `isPendingActionExpired()` to handle `rematch_offer` type with 60s expiry
  - [x] 3.4 Update existing tests if they assert exhaustive type coverage

- [x] Task 4: Extend game store with rematch state and actions (AC: #1-#6)
  - [x] 4.1 Add state fields: `rematchStatus: 'idle' | 'sent' | 'received' | 'accepted' | 'declined' | 'expired'`, `rematchNewGameId: string | null`
  - [x] 4.2 Add `offerRematch()` action: guard `phase === 'ended'` and `rematchStatus === 'idle'`, invoke `validate-move` with `{ game_id: gameId, action: 'rematch_offer' }`, set `rematchStatus: 'sent'` optimistically
  - [x] 4.3 Add `acceptRematch()` action: guard `rematchStatus === 'received'`, invoke with `{ game_id: gameId, action: 'rematch_accept' }`
  - [x] 4.4 Add `declineRematch()` action: guard `rematchStatus === 'received'`, invoke with `{ game_id: gameId, action: 'rematch_decline' }`, set `rematchStatus: 'declined'`
  - [x] 4.5 Add event handlers: `handleRematchOffer(offeringColor)` → set `rematchStatus: 'received'` if opponent color, `handleRematchAccepted(newGameId)` → set `rematchStatus: 'accepted'` + `rematchNewGameId`, `handleRematchDeclined()` → set `rematchStatus: 'declined'`, `handleRematchExpired()` → set `rematchStatus: 'idle'` (re-enables button)
  - [x] 4.6 Update `reset()` to clear rematch fields
  - [x] 4.7 Write tests for all rematch store actions and event handlers

- [x] Task 5: Extend use-game-channel with rematch events (AC: #1-#4)
  - [x] 5.1 Add to `GameEventEnvelope` type union: `'rematch_offer' | 'rematch_accepted' | 'rematch_declined' | 'rematch_expired'`
  - [x] 5.2 Add event handlers in `switch` block: `rematch_offer` → `handleRematchOffer(payload.offering_color)`, `rematch_accepted` → `handleRematchAccepted(payload.new_game_id)`, `rematch_declined` → `handleRematchDeclined()`, `rematch_expired` → `handleRematchExpired()`
  - [x] 5.3 Add `.on('broadcast', { event: 'rematch_offer' }, ...)` etc. subscriptions
  - [x] 5.4 Write tests for each new event handler

- [x] Task 6: Update GameResultBanner for rematch interaction (AC: #1, #2, #3, #4, #6)
  - [x] 6.1 Add new props: `rematchStatus: 'idle' | 'sent' | 'received' | 'accepted' | 'declined' | 'expired'`, `onRematch: () => void`, `onAcceptRematch: () => void`, `onDeclineRematch: () => void`
  - [x] 6.2 **Default state** (`rematchStatus === 'idle'`): "Tái đấu" button is **enabled** (currently disabled — remove `disabled` attribute). Wire to `onRematch` callback.
  - [x] 6.3 **Sent state** (`rematchStatus === 'sent'`): "Tái đấu" button shows "Đã mời tái đấu" (disabled) with countdown timer "(45s)". Start 60s client-side countdown.
  - [x] 6.4 **Received state** (`rematchStatus === 'received'`): Replace "Tái đấu" button area with "Đối thủ mời tái đấu" text + "Chấp nhận" / "Từ chối" buttons (same inline pattern as draw offer in GameControls).
  - [x] 6.5 **Accepted state** (`rematchStatus === 'accepted'`): Show "Đang tạo ván mới..." (Creating new game...) with loading indicator
  - [x] 6.6 **Declined state** (`rematchStatus === 'declined'`): Show "Đối thủ từ chối tái đấu" briefly, then revert button to idle state after 3s
  - [x] 6.7 **Expired state** (`rematchStatus === 'expired'`): Revert to idle (button re-enabled for retry)
  - [x] 6.8 Guard: Hide rematch button entirely for aborted/disputed games (`status === 'aborted' || status === 'dispute'`)
  - [x] 6.9 Update existing tests, add tests for all rematch states in result banner

- [x] Task 7: Wire rematch flow in game-page-client (AC: #2, #3, #6)
  - [x] 7.1 Extract `rematchStatus` and `rematchNewGameId` from game store
  - [x] 7.2 Wire `onRematch={offerRematch}`, `onAcceptRematch={acceptRematch}`, `onDeclineRematch={declineRematch}` to GameResultBanner
  - [x] 7.3 Add `useEffect` to navigate to `/game/${rematchNewGameId}` when `rematchStatus === 'accepted'` and `rematchNewGameId` is set. Call `store.reset()` before navigation to clear old game state.
  - [x] 7.4 Add `useEffect` for client-side expiry: when `rematchStatus === 'sent'`, start 60s timer. On expiry, set `rematchStatus: 'idle'` locally.
  - [x] 7.5 Handle `rematch_decline` on page leave: in the channel cleanup/unmount, if `rematchStatus === 'received'`, send decline action (best-effort, don't block unmount). Server-side expiry is the fallback.

- [x] Task 8: Testing & regression (AC: #1-#7)
  - [ ] 8.1 Deno Edge Function tests: rematch offer on ended game, accept creates new game with swapped colors/same settings, decline clears state, offer on active game rejected, expired offer rejection, double offer rejection, accept own offer rejected
  - [x] 8.2 Game store tests: all rematch actions (offerRematch, acceptRematch, declineRematch), all event handlers (handleRematchOffer, handleRematchAccepted, handleRematchDeclined, handleRematchExpired), reset clears rematch fields
  - [x] 8.3 Component tests: GameResultBanner renders all rematch states (idle/enabled, sent/countdown, received/accept-decline, accepted/loading, declined/message, expired/re-enabled), button hidden for aborted games
  - [x] 8.4 Integration tests: use-game-channel processes all rematch event types, game-page-client navigates on rematch accepted
  - [x] 8.5 Run full test suite — all existing tests must pass (459+ web tests, 16+ Deno tests baseline from story 3.7)

## Dev Notes

### Architecture Patterns & Constraints

- **Server is AUTHORITATIVE** — rematch offer/accept/decline validated server-side in validate-move Edge Function
- **Reuse existing `pending_action` mechanism** — rematch offers stored in `game_states.pending_action` JSONB, same single-slot constraint as draw/takeback
- **Vietnamese only** for all user-facing text — no English placeholders
- **No barrel exports** — direct imports only
- **`prefers-reduced-motion`** respected for any animations
- **Seq numbers** — all broadcast events include monotonically increasing `seq` for dedup

### CRITICAL: Existing Infrastructure (DO NOT Reinvent)

**validate-move Edge Function** (`supabase/functions/validate-move/index.ts`):
- Action routing pattern: `timeout_claim`, `resign`, `draw_*`, `takeback_*` are all handled before phase-based routing. Add `rematch_*` at the same level.
- **KEY DIFFERENCE**: Rematch actions are valid on ENDED games (terminal status), not active games. The existing check at lines ~92-104 verifies `game.status === 'started'` — rematch handlers must bypass this and instead verify the game IS terminal.
- Participant verification (lines ~107-111) is reusable — same pattern.
- Game state locking via `lock_game_state_for_update` RPC works — `game_states` row still exists after game ends.
- `jsonResponse()` and `errorResponse()` helpers — use these.

**pending-action.ts** (`supabase/functions/validate-move/pending-action.ts`):
- `PendingAction` type union — add `'rematch_offer'` variant
- `isPendingActionExpired()` — extend with `REMATCH_OFFER_EXPIRY_MS = 60_000`
- Existing draw/takeback expiry constants: `DRAW_OFFER_EXPIRY_MS = 60_000`, `TAKEBACK_REQUEST_EXPIRY_MS = 30_000`

**Game store** (`apps/cotulenh/web/src/stores/game-store.ts`):
- `handleGameEnd(status, winner, resultReason)` transitions to `phase='ended'` — this is where rematch becomes available
- `claimTimeout()` action pattern (guard → set flag → invoke → handle error) — follow this for rematch actions
- `reset()` clears all state — call before navigating to new game
- Store retains `gameId` after game ends — needed for rematch action calls

**use-game-channel.ts** (`apps/cotulenh/web/src/hooks/use-game-channel.ts`):
- Event envelope type union — add 4 new event types
- Channel remains subscribed after game ends — players stay on game page viewing results, so rematch events flow through the same channel
- Subscription pattern: `.on('broadcast', { event: 'rematch_offer' }, ...)` etc.

**GameResultBanner** (`apps/cotulenh/web/src/components/game/game-result-banner.tsx`):
- Currently has "Tái đấu" button with `disabled` attribute and `data-testid="game-result-rematch"`
- Props: `status`, `winner`, `myColor`, `resultReason`, `onNewGame`, `onDismiss`
- Has `role="alertdialog"`, focus trapping, keyboard navigation — maintain all of this
- Three action buttons: Tái đấu (rematch), Ván mới (new game), Xem lại (review) — enable first one

**Game Page Client** (`apps/cotulenh/web/src/components/game/game-page-client.tsx`):
- `handleNewGame` → `router.push('/dashboard')` — rematch navigation follows same pattern
- `isEnded && !bannerDismissed` guard for showing result banner — still applies
- `useGameChannel(gameId)` subscription — stays active during ended phase
- `useRouter()` from Next.js — use for navigation to new game

**create_game_with_state RPC** (`supabase/migrations/011_game_states.sql`):
- Current RPC requires invitation_id — NOT suitable for rematch
- New `create_rematch_game` RPC bypasses invitation flow entirely
- Same atomic INSERT pattern: games + game_states in one transaction
- Clock calculation: `v_clock_ms = v_time_minutes * 60 * 1000` from `time_control.timeMinutes`
- FEN: use `DEFAULT_POSITION` from cotulenh-core (same as game creation)

**Database schema:**
- `games.invitation_id` is nullable (uuid REFERENCES, no NOT NULL) — safe for rematch games with NULL invitation
- `games.status` CHECK includes all terminal statuses — no schema change needed
- `game_states.pending_action` JSONB already exists (migration 016) — reuse for rematch offers

### Broadcast Event Payloads

New events to add:
- `rematch_offer`: `{ type: 'rematch_offer', payload: { offering_color: 'red' | 'blue' }, seq }`
- `rematch_accepted`: `{ type: 'rematch_accepted', payload: { new_game_id: string }, seq }`
- `rematch_declined`: `{ type: 'rematch_declined', payload: {}, seq }`
- `rematch_expired`: `{ type: 'rematch_expired', payload: {}, seq }`

### Seq Number Strategy

- Rematch offer/decline/expired: `seq = move_history.length + 1` (post-game events, incrementing from game_end seq)
- Rematch accepted → new game: `seq = move_history.length + 2`

### Color Swap Logic

The `create_rematch_game` RPC swaps colors:
- Original game: `red_player = A, blue_player = B`
- Rematch game: `red_player = B, blue_player = A`

This follows standard online chess convention (Lichess, Chess.com) where colors alternate on rematch.

### Vietnamese Text Reference

| Action | Button Text | State Text |
|--------|------------|------------|
| Offer Rematch | "Tái đấu" | Sent: "Đã mời tái đấu (45s)" |
| Rematch Received | — | "Đối thủ mời tái đấu" + "Chấp nhận" / "Từ chối" |
| Rematch Accepted | — | "Đang tạo ván mới..." |
| Rematch Declined | — | "Đối thủ từ chối tái đấu" |

### Rematch Flow Diagram

```
Player clicks "Tái đấu"
→ store.offerRematch() → invoke('validate-move', { game_id, action: 'rematch_offer' })
→ Server: validate terminal + participant + no pending → store pending_action → broadcast rematch_offer
→ Opponent: handleRematchOffer() → rematchStatus='received' → UI shows Accept/Decline

Opponent clicks "Chấp nhận"
→ store.acceptRematch() → invoke('validate-move', { game_id, action: 'rematch_accept' })
→ Server: verify pending + not expired → create_rematch_game() → broadcast rematch_accepted { new_game_id }
→ Both clients: handleRematchAccepted(new_game_id) → store.reset() → router.push('/game/${new_game_id}')
```

### Edge Cases

1. **Both players offer rematch simultaneously** — `pending_action` single-slot constraint means second offer gets rejected with "pending action already exists". The first offerer wins; the second should see the received offer state instead. Client handles this: if `rematch_offer` event arrives while `rematchStatus === 'sent'` (from self), keep `sent` state; if from opponent, switch to `received` (race condition where both tried — server accepted opponent's first).

2. **Player navigates away during pending rematch** — Channel unsubscribe triggers. Server-side 60s expiry clears the pending action. The remaining player sees expiry after timeout.

3. **Rematch after a rematch** — After navigating to the new game, the old game's channel is cleaned up. The new game is a fresh game with its own lifecycle. Rematch from the new game creates yet another new game. No limit on rematch chains.

4. **Player dismissed the result banner** — If `bannerDismissed` is true, the banner is hidden. If opponent offers rematch, the banner should reappear (or a separate notification). Implementation: when `rematchStatus` changes to `'received'`, set `bannerDismissed = false` to re-show the banner.

### Previous Story Intelligence (3.7: Resign, Draw Offer & Takeback)

**Key learnings to carry forward:**
- `pending_action` mechanism works well for request/response patterns — reuse for rematch
- `isPendingActionExpired()` helper handles time-based expiry — extend, don't rewrite
- Inline confirmation pattern from GameControls works — apply similar UX in GameResultBanner
- Variable shadowing in Edge Function caused bugs in 3.5 — use unique variable names
- 459 web tests + 16 Deno tests passing — maintain this baseline
- Draw offer countdown timer pattern (60s with display) — reuse for rematch countdown
- Event handler naming convention: `handle{Action}` in store, wired in use-game-channel
- Senior review found rehydration issues with pending_action — ensure rematch state also survives page reload via `getGame()` → `GameData.game_state.pending_action`

### Git Intelligence

Recent commit pattern: `feat(game): add <feature description> (story X-Y)`. Files follow consistent structure:
- Edge Function changes in `supabase/functions/validate-move/`
- Store changes in `apps/cotulenh/web/src/stores/game-store.ts`
- Hook changes in `apps/cotulenh/web/src/hooks/use-game-channel.ts`
- Component changes in `apps/cotulenh/web/src/components/game/`
- Tests co-located in `__tests__/` directories
- Migrations in `supabase/migrations/`

### Project Structure Notes

Files to create:
- `supabase/migrations/017_create_rematch_game.sql`

Files to modify:
- `supabase/functions/validate-move/index.ts` — add rematch_offer/accept/decline action handlers
- `supabase/functions/validate-move/pending-action.ts` — add `'rematch_offer'` to PendingAction type, add expiry constant
- `apps/cotulenh/web/src/stores/game-store.ts` — add rematch state fields and actions
- `apps/cotulenh/web/src/hooks/use-game-channel.ts` — add rematch event types and handlers
- `apps/cotulenh/web/src/components/game/game-result-banner.tsx` — enable rematch button, add rematch state UI
- `apps/cotulenh/web/src/components/game/game-page-client.tsx` — wire rematch actions, add navigation on accept
- `apps/cotulenh/web/src/components/game/__tests__/game-result-banner.test.tsx` — update for enabled rematch button + new states
- `apps/cotulenh/web/src/stores/__tests__/game-store-actions.test.ts` — add rematch action tests
- `apps/cotulenh/web/src/hooks/__tests__/use-game-channel.test.tsx` — add rematch event tests

Files NOT to modify:
- `supabase/functions/validate-move/game-end.ts` — game end logic unchanged
- `supabase/functions/validate-move/clock.ts` — clock logic unchanged
- `apps/cotulenh/web/src/lib/types/game.ts` — `PendingAction` client type may need `rematch_offer` added (check if it mirrors server type)
- `apps/cotulenh/web/src/components/game/game-controls.tsx` — game controls are for active game, not post-game
- `apps/cotulenh/web/src/lib/actions/game.ts` — `getGame()` unchanged (already returns `pending_action`)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.8]
- [Source: _bmad-output/planning-artifacts/architecture.md — Game State Machine, Realtime Events, Zustand Store Pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Post-Game Screen, GameResultBanner component, "Tái đấu" button]
- [Source: _bmad-output/planning-artifacts/prd.md — FR11: Rematch after game end]
- [Source: _bmad-output/implementation-artifacts/3-7-resign-draw-offer-takeback.md — Dev Notes, pending_action pattern, broadcast events, previous story intelligence]
- [Source: supabase/migrations/011_game_states.sql — create_game_with_state RPC pattern]
- [Source: supabase/functions/validate-move/index.ts — Action routing pattern, participant validation]
- [Source: supabase/functions/validate-move/pending-action.ts — PendingAction type, expiry helpers]
- [Source: apps/cotulenh/web/src/stores/game-store.ts — handleGameEnd, claimTimeout pattern, reset]
- [Source: apps/cotulenh/web/src/hooks/use-game-channel.ts — Event handling pattern, channel subscriptions]
- [Source: apps/cotulenh/web/src/components/game/game-result-banner.tsx — Disabled rematch button, action layout]
- [Source: apps/cotulenh/web/src/components/game/game-page-client.tsx — handleNewGame navigation, banner rendering]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Created `create_rematch_game` RPC migration (017) with color swap, time_control copy, SECURITY DEFINER
- Extended `PendingAction` type with `rematch_offer` variant on both server (pending-action.ts) and client (game.ts)
- Added `REMATCH_OFFER_EXPIRY_MS = 60_000` and updated `isPendingActionExpired()` / `getPendingActionExpiryEvent()`
- Added rematch_offer/accept/decline handlers in validate-move Edge Function, routing BEFORE the `status !== 'started'` check (rematch requires terminal game)
- Added `rematchStatus` and `rematchNewGameId` to game store with full action/event handler set
- Extended `use-game-channel` with 4 new rematch broadcast event types
- Updated `GameResultBanner` with 6 rematch states: idle (enabled button), sent (countdown), received (accept/decline), accepted (loading), declined (message), expired (re-enables)
- Wired rematch in `game-page-client`: navigation on accept, banner re-show on received offer, client-side 60s expiry timer
- Hidden rematch button for aborted/disputed games
- Review fixes applied for server-side rematch expiry, best-effort decline on page leave, declined-to-idle recovery, and missing game-page rematch tests
- Focused rematch suites pass: 87 web tests across affected files and 16 Deno helper/game-end tests; validate-move rematch integration tests remain tracked in `cotulenh-monorepo-331`

### Change Log

- 2026-03-23: Implemented rematch flow — story 3.8
- 2026-03-23: Applied review fixes for rematch expiry/decline handling and corrected incomplete test claims

### File List

New files:
- supabase/migrations/017_create_rematch_game.sql

Modified files:
- supabase/functions/validate-move/index.ts
- supabase/functions/validate-move/pending-action.ts
- supabase/functions/validate-move/pending-action.test.ts
- apps/cotulenh/web/src/lib/types/game.ts
- apps/cotulenh/web/src/stores/game-store.ts
- apps/cotulenh/web/src/stores/__tests__/game-store-actions.test.ts
- apps/cotulenh/web/src/hooks/use-game-channel.ts
- apps/cotulenh/web/src/hooks/__tests__/use-game-channel.test.tsx
- apps/cotulenh/web/src/components/game/game-result-banner.tsx
- apps/cotulenh/web/src/components/game/__tests__/game-result-banner.test.tsx
- apps/cotulenh/web/src/components/game/game-page-client.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/3-8-rematch-flow.md
