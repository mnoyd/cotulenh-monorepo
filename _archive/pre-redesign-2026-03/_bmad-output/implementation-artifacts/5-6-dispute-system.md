# Story 5.6: Dispute System

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want the game to pause and let me report if my opponent sends an illegal move,
so that game integrity is protected and disputes are reviewed fairly.

## Acceptance Criteria (BDD)

1. **Given** a player receives a SAN that `@cotulenh/core` rejects as invalid
   **When** validation fails
   **Then** the game is immediately paused and a `dispute` message is broadcast with the illegal SAN and current PGN (FR28a)

2. **Given** both players see the dispute UI
   **When** they submit their classification
   **Then** they can choose "bug" or "cheat" with optional comments, and a `disputes` row is saved with the PGN, illegal SAN, and both players' reports (FR28b, FR28c)

3. **Given** a dispute is recorded
   **When** the game ends with `status = 'dispute'`
   **Then** the admin can review the PGN, replay the game locally, and assign a result via Supabase dashboard (FR28d)

4. **Given** a dispute occurs
   **When** the dispute record is saved
   **Then** RLS ensures only game participants can insert and only admin can update resolution

## Tasks / Subtasks

- [x]Task 1: Create `007_disputes.sql` migration (AC: 4)
  - [x]1.1 Create `disputes` table:
    ```sql
    CREATE TABLE public.disputes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id uuid NOT NULL REFERENCES public.games(id),
      reporting_user_id uuid NOT NULL REFERENCES public.profiles(id),
      move_san text NOT NULL,
      pgn_at_point text NOT NULL,
      classification text NOT NULL CHECK (classification IN ('bug', 'cheat')),
      comment text,
      resolution text,
      resolved_by uuid REFERENCES public.profiles(id),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    ```
  - [x]1.2 Enable RLS: `ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;`
  - [x]1.3 SELECT policy: game participants can read disputes for their games
    ```sql
    CREATE POLICY "Game participants can view disputes"
      ON public.disputes FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.games
          WHERE id = game_id
          AND (auth.uid() = red_player OR auth.uid() = blue_player)
        )
      );
    ```
  - [x]1.4 INSERT policy: game participants can insert disputes for their games
    ```sql
    CREATE POLICY "Game participants can report disputes"
      ON public.disputes FOR INSERT
      WITH CHECK (
        auth.uid() = reporting_user_id
        AND EXISTS (
          SELECT 1 FROM public.games
          WHERE id = game_id
          AND (auth.uid() = red_player OR auth.uid() = blue_player)
        )
      );
    ```
  - [x]1.5 UPDATE policy: only admin (service_role or future moderator role) can update resolution — skip for MVP (admin uses Supabase dashboard with service_role bypass). No UPDATE policy means no client-side resolution updates.
  - [x]1.6 Indexes: `CREATE INDEX idx_disputes_game_id ON public.disputes (game_id);`
  - [x]1.7 Add `updated_at` trigger (same pattern as 004_games.sql)

- [x]Task 2: Add dispute state fields to `OnlineGameSessionCore` (AC: 1)
  - [x]2.1 Add private fields:
    ```typescript
    #disputeActive = false;
    #disputeInfo: { san: string; pgn: string } | null = null;
    ```
  - [x]2.2 Add public getters:
    ```typescript
    get disputeActive(): boolean { return this.#disputeActive; }
    get disputeInfo(): { san: string; pgn: string } | null { return this.#disputeInfo; }
    ```

- [x]Task 3: Implement dispute detection in `#handleRemoteMove` (AC: 1)
  - [x]3.1 In `#handleRemoteMove` (line ~411-417), replace the current error-log-and-sync fallback with dispute flow:
    ```typescript
    } else {
      // Invalid move — trigger dispute flow (FR28a)
      this.#disputeActive = true;
      this.#disputeInfo = { san: msg.san, pgn: this.session.game.pgn() };
      this.clock.stop();
      sendGameMessage(this.#channel!, {
        event: 'dispute',
        san: msg.san,
        pgn: this.session.game.pgn(),
        senderId: this.#currentUserId,
        seq: this.#localSeq,
        sentAt: Date.now()
      });
      this.#callbacks.onDispute?.({ san: msg.san, pgn: this.session.game.pgn() });
      this.#notifyStateChange();
    }
    ```
  - [x]3.2 Guard: only trigger dispute if `this.#lifecycle === 'playing'` and `!this.#disputeActive` (prevent double-dispute)

- [x]Task 4: Handle incoming `dispute` message (AC: 1)
  - [x]4.1 Add `case 'dispute':` to `#handleGameMessage` switch (after `case 'claim-victory':` on line ~340):
    ```typescript
    case 'dispute':
      this.#handleDisputeMessage(msg as GameMessage & { event: 'dispute' });
      break;
    ```
  - [x]4.2 Implement `#handleDisputeMessage(msg: GameMessage & { event: 'dispute' }): void`:
    - If `this.#lifecycle !== 'playing'` → return (lifecycle guard)
    - If `this.#disputeActive` → return (idempotent guard)
    - `this.#disputeActive = true`
    - `this.#disputeInfo = { san: msg.san, pgn: msg.pgn }`
    - `this.clock.stop()`
    - `this.#callbacks.onDispute?.({ san: msg.san, pgn: msg.pgn })`
    - `this.#notifyStateChange()`

- [x]Task 5: Implement `reportDispute()` public method (AC: 2, 3)
  - [x]5.1 Add `reportDispute(classification: 'bug' | 'cheat', comment?: string): void` method
  - [x]5.2 Guards: `if (!this.#disputeActive || this.#lifecycle !== 'playing' || !this.#disputeInfo) return`
  - [x]5.3 Save dispute row to Supabase:
    ```typescript
    const { error } = await this.#supabase.from('disputes').insert({
      game_id: this.gameId,
      reporting_user_id: this.#currentUserId,
      move_san: this.#disputeInfo.san,
      pgn_at_point: this.#disputeInfo.pgn,
      classification,
      comment: comment || null
    });
    if (error) {
      logger.error('Failed to save dispute', { error, gameId: this.gameId });
    }
    ```
  - [x]5.4 End game: `this.#lifecycle = 'ended'`
  - [x]5.5 Set result: `this.#gameResult = { status: 'dispute', winner: null, resultReason: 'dispute', isLocalPlayerWinner: false }`
  - [x]5.6 Write game result: `this.#writeGameResult('dispute', null, 'dispute')`
  - [x]5.7 Fire callback: `this.#callbacks.onGameEnd?.(this.#gameResult)`
  - [x]5.8 Call `this.#notifyStateChange()`
  - [x]5.9 Make method `async` since it awaits Supabase insert. Return type: `Promise<void>`

- [x]Task 6: Add `dispute` case to `#writeGameResult` (AC: 3)
  - [x]6.1 In `#writeGameResult`, add to the termination string switch (after `case 'timeout':` on line ~777):
    ```typescript
    case 'dispute': terminationString = 'move dispute'; break;
    ```
  - [x]6.2 After the existing timeout Result header block (~line 788), add:
    ```typescript
    if (status === 'dispute') {
      game.setHeader('Result', '*');
    }
    ```
    (Asterisk `*` means "game in progress / result unknown" per PGN spec — appropriate for disputes awaiting admin resolution)

- [x]Task 7: Add `onDispute` callback to constructor options (AC: 1)
  - [x]7.1 Add to the callbacks interface (near `onGameEnd`, `onAbort`, `onSyncError`):
    ```typescript
    onDispute?: (info: { san: string; pgn: string }) => void;
    ```
  - [x]7.2 Store in `this.#callbacks` alongside existing callbacks

- [x]Task 8: Update reactive wrapper `OnlineGameSession` (AC: 1, 2)
  - [x]8.1 Add `reportDispute(classification: 'bug' | 'cheat', comment?: string): Promise<void>` proxy — calls `this.#core.reportDispute(classification, comment)`
  - [x]8.2 Add `get disputeActive(): boolean` reactive getter — `void this.#version; return this.#core.disputeActive;`
  - [x]8.3 Add `get disputeInfo(): { san: string; pgn: string } | null` reactive getter — `void this.#version; return this.#core.disputeInfo;`
  - [x]8.4 Wire `onDispute` callback in constructor to trigger `this.#version++` state change

- [x]Task 9: Add dispute overlay to game page `+page.svelte` (AC: 1, 2)
  - [x]9.1 Add derived state:
    ```typescript
    let disputeActive = $derived(onlineSession?.disputeActive ?? false);
    let disputeInfo = $derived(onlineSession?.disputeInfo);
    ```
  - [x]9.2 Add local state for classification form:
    ```typescript
    let disputeDialogOpen = $derived(disputeActive);
    let disputeComment = $state('');
    ```
  - [x]9.3 Add dispute dialog using existing Dialog components (follows resign dialog pattern):
    ```svelte
    <Dialog.Root open={disputeDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{i18n.t('game.disputeTitle')}</Dialog.Title>
            <Dialog.Description>
              {i18n.t('game.disputeMessage')}
              {#if disputeInfo}
                <br /><code>{disputeInfo.san}</code>
              {/if}
            </Dialog.Description>
          </Dialog.Header>
          <div class="dispute-form">
            <textarea
              class="dispute-comment"
              bind:value={disputeComment}
              placeholder={i18n.t('game.disputeCommentPlaceholder')}
              rows="2"
            />
          </div>
          <Dialog.Footer>
            <button
              class="dispute-btn bug"
              onclick={() => {
                onlineSession?.reportDispute('bug', disputeComment || undefined);
                disputeComment = '';
              }}
            >
              {i18n.t('game.reportBug')}
            </button>
            <button
              class="dispute-btn cheat"
              onclick={() => {
                onlineSession?.reportDispute('cheat', disputeComment || undefined);
                disputeComment = '';
              }}
            >
              {i18n.t('game.reportCheat')}
            </button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    ```
  - [x]9.4 **Cannot be dismissed**: Dialog must NOT have close-on-backdrop-click or close-on-escape when in dispute mode. Pass `closeOnOutsideClick={false}` and `closeOnEscape={false}` (or equivalent bits-ui props) to prevent dismissal without classification. Per UX spec: "Cannot be dismissed by backdrop click — requires explicit action choice"
  - [x]9.5 Style `.dispute-btn`, `.dispute-comment`, `.dispute-form` — use `--color-error` (red) theme for the dialog border/accent to signal severity. Bug button: secondary style. Cheat button: error/red style.
  - [x]9.6 Update board `viewOnly` condition to include dispute state:
    ```typescript
    viewOnly:
      onlineSession.lifecycle !== 'playing' ||
      onlineSession.connectionState !== 'connected' ||
      onlineSession.clockStatus !== 'running' ||
      onlineSession.disputeActive ||
      !isMyTurn
    ```

- [x]Task 10: Add `dispute` result reason to GameResultBanner (AC: 3)
  - [x]10.1 In `GameResultBanner.svelte`, add to the `reasonText` derived switch (after `case 'timeout':` on line ~31):
    ```typescript
    case 'dispute': return i18n.t('game.resultDispute');
    ```

- [x]Task 11: Add i18n strings (AC: 1, 2, 3)
  - [x]11.1 Add to `types.ts`:
    - `'game.disputeTitle'`
    - `'game.disputeMessage'`
    - `'game.disputeCommentPlaceholder'`
    - `'game.reportBug'`
    - `'game.reportCheat'`
    - `'game.resultDispute'`
  - [x]11.2 Add to `en.ts`:
    - `'game.disputeTitle': 'Move Dispute'`
    - `'game.disputeMessage': 'An invalid move was detected. The game is paused for review. Please classify this incident.'`
    - `'game.disputeCommentPlaceholder': 'Optional comment...'`
    - `'game.reportBug': 'Report as Bug'`
    - `'game.reportCheat': 'Report as Cheat'`
    - `'game.resultDispute': 'Move Dispute'`
  - [x]11.3 Add to `vi.ts`:
    - `'game.disputeTitle': 'Tranh Chấp Nước Đi'`
    - `'game.disputeMessage': 'Phát hiện nước đi không hợp lệ. Trò chơi tạm dừng để xem xét. Vui lòng phân loại sự cố.'`
    - `'game.disputeCommentPlaceholder': 'Bình luận (tùy chọn)...'`
    - `'game.reportBug': 'Báo Lỗi'`
    - `'game.reportCheat': 'Báo Gian Lận'`
    - `'game.resultDispute': 'Tranh Chấp'`

- [x]Task 12: Write tests (AC: 1-4)
  - [x]12.1 **Dispute detection test**: Simulate receiving an invalid SAN from opponent → verify `disputeActive` becomes `true`, `disputeInfo` contains the SAN and PGN, clock is stopped, `dispute` message is broadcast, `onDispute` callback fires
  - [x]12.2 **Dispute message receive test**: Receive `{ event: 'dispute', san, pgn }` from opponent → verify `disputeActive` becomes `true`, clock stopped, `onDispute` fires
  - [x]12.3 **Report dispute (bug) test**: Set dispute state, call `reportDispute('bug', 'engine issue')` → verify Supabase INSERT called with correct fields, game status updated to 'dispute', lifecycle becomes 'ended', `onGameEnd` fires with `{ status: 'dispute', winner: null }`
  - [x]12.4 **Report dispute (cheat) test**: Set dispute state, call `reportDispute('cheat')` → verify INSERT called with classification='cheat', comment=null
  - [x]12.5 **Report dispute guard test**: Call `reportDispute()` when `disputeActive === false` → verify nothing happens (no Supabase call, no state change)
  - [x]12.6 **Dispute idempotency test**: Trigger dispute detection twice → verify only one dispute broadcast sent, `disputeActive` stays true
  - [x]12.7 **Dispute lifecycle guard test**: Trigger move validation failure when `lifecycle !== 'playing'` → verify no dispute raised
  - [x]12.8 **PGN dispute test**: Verify PGN includes `Termination: move dispute` header and `Result: *` on dispute
  - [x]12.9 **Dispute receive lifecycle guard test**: Receive `dispute` message when `lifecycle === 'ended'` → verify no state change
  - [x]12.10 **Board read-only during dispute test**: Verify that after dispute is raised, the session state reflects dispute (for UI to set board viewOnly)

## Dev Notes

### Critical: This Story EXTENDS OnlineGameSession — Do NOT Rewrite

Stories 5.1-5.5 built the complete online session system. This story adds dispute detection, reporting, and DB persistence to the EXISTING classes. The composition pattern, core/wrapper split, and message handling architecture remain unchanged.

### What Already Exists (from Stories 5.1-5.5) — DO NOT Recreate

| Feature | Location | Status |
|---------|----------|--------|
| `OnlineGameSessionCore` class | `online-session-core.ts` | Complete — extend, not replace |
| `OnlineGameSession` reactive wrapper | `online-session.svelte.ts` | Complete — extend, not replace |
| `GameMessage` type with `dispute` event | `messages.ts:29` | Already defined: `{ event: 'dispute'; san: string; pgn: string }` |
| `isGameMessage()` guard for `dispute` | `messages.ts:80-81` | Already validates `dispute` event type: `typeof value.san === 'string' && typeof value.pgn === 'string'` |
| `#handleGameMessage` switch | `online-session-core.ts:323-347` | Add `case 'dispute'` |
| `#handleRemoteMove` invalid path | `online-session-core.ts:411-417` | Replace sync fallback with dispute flow — comment says "dispute handling is Story 5.6" |
| `#writeGameResult()` | `online-session-core.ts:758-816` | Reuse — add `dispute` termination string |
| `#checkGameEnd()` pattern | `online-session-core.ts:588-634` | Reference for lifecycle transition pattern |
| `#handleResignMessage()` pattern | `online-session-core.ts:636-651` | Reference for receiving game-end messages |
| `resign()` / `claimVictory()` patterns | `online-session-core.ts:184-205, ...` | Reference for sending game-end messages |
| `GameEndResult` type | `online-session-core.ts:25-30` | Reuse — status, winner, resultReason, isLocalPlayerWinner |
| `GameResultBanner.svelte` | `$lib/components/GameResultBanner.svelte` | Add `dispute` case to reasonText switch |
| DB `games.status` column | `004_games.sql:10` | Already includes `'dispute'` in CHECK constraint |
| `Lifecycle` type | `online-session-core.ts:10` | `'waiting' \| 'playing' \| 'ended'` — no change needed |
| `sendGameMessage` | `messages.ts:112-129` | Reuse for dispute broadcast |
| Dialog component set | `$lib/components/ui/dialog/` | Reuse for dispute classification dialog |
| Resign dialog pattern | `+page.svelte:238-260` | Reference for dispute dialog structure |

### Dispute Detection Flow

Per architecture: when `session.game.move(san)` returns null/false for a remote move, the game pauses and a dispute is broadcast.

```
Opponent sends invalid SAN:
1. #handleRemoteMove receives move message
2. session.game.move(san) → returns null (invalid)
3. #disputeActive = true, #disputeInfo = { san, pgn }
4. clock.stop()
5. Broadcast { event: 'dispute', san, pgn } to opponent
6. #notifyStateChange() → UI re-renders with dispute overlay
7. Player sees dispute dialog: "Report as Bug" / "Report as Cheat"
8. Player classifies → reportDispute() called
9. Dispute row INSERT into disputes table
10. Game status UPDATE to 'dispute', winner=null
11. lifecycle = 'ended', onGameEnd fires
```

```
Receiving dispute message from opponent:
1. #handleGameMessage → case 'dispute'
2. #handleDisputeMessage(msg)
3. #disputeActive = true, #disputeInfo = { san, pgn }
4. clock.stop()
5. #notifyStateChange() → UI shows dispute dialog
6. Player classifies → same reportDispute() flow
```

### Dispute State Design

Use a `#disputeActive` boolean flag (same pattern as `#opponentFlagged` from Story 5.5) rather than adding a new Lifecycle state. During dispute:
- `#lifecycle` remains `'playing'` until classification submitted
- `#disputeActive = true` blocks all game actions
- Board is `viewOnly` (checked in +page.svelte)
- Clock is stopped via `this.clock.stop()`
- When player submits classification → lifecycle transitions to `'ended'`

### Database Migration Numbering

Existing migrations: `001_profiles`, `002_friendships`, `003_game_invitations`, `004_games`, `005_shareable_invite_links`, `006_create_or_accept_friendship`. **New migration is `007_disputes.sql`** (NOT 005 as architecture originally planned — those numbers are taken).

### `reportDispute()` Is Async

Unlike `resign()` and `claimVictory()` which fire-and-forget via Broadcast, `reportDispute()` must `await` the Supabase INSERT to disputes table AND the game status UPDATE. Make the method `async` returning `Promise<void>`. The UI should handle the await (disable buttons during submission). Error handling: log errors but still end the game locally — the dispute is captured in Broadcast history even if DB write fails.

### Optimistic Concurrency for Dispute Game Result

Same pattern as Stories 5.4/5.5. Both clients may attempt to write the dispute result. The `WHERE status = 'started'` clause ensures only one write succeeds:
```typescript
await this.#supabase
  .from('games')
  .update({ status: 'dispute', winner: null, result_reason: 'dispute', pgn, ended_at: new Date().toISOString() }, { count: 'exact' })
  .eq('id', this.gameId)
  .eq('status', 'started');
```

### Dispute Dialog — Non-Dismissible

Per UX spec: "Cannot be dismissed by backdrop click — requires explicit action choice." The dispute dialog must NOT be closeable via Escape or backdrop click. Use bits-ui Dialog props (check the component — likely `closeOnOutsideClick={false}` or `interactOutside` event prevention) to enforce this. The player MUST classify the dispute.

### UX Design Guidance

Per UX specification:
- **DisputeBanner component**: Status icon, message ("Move Dispute — game paused"), classification buttons
- **Emotional design**: "Calm during disputes — Neutral language, clear options, no blame in copy"
- **Color**: Use `--color-error` (red) for dispute accent — signals severity without panic
- **Overlay pattern**: Semi-transparent backdrop over board, content centered, board partially visible
- **Accessibility**: `role="alert"`, focus moved to dialog on appearance, clear action labels

### What NOT To Do

- Do NOT implement admin moderation UI — admin resolves via Supabase dashboard (FR28d MVP)
- Do NOT implement "Accept move / Continue" option — MVP always requires classification (per ACs). The UX spec's "Accept" path is a post-MVP enhancement
- Do NOT implement draw offers or rematch — that's Story 5.7
- Do NOT modify `messages.ts` — `dispute` type and validation already exist
- Do NOT modify `ChessClockState` — clock.stop() already works
- Do NOT add a new Lifecycle state — use `#disputeActive` flag
- Do NOT create an UPDATE RLS policy for disputes — admin uses service_role bypass via Supabase dashboard
- Do NOT modify `004_games.sql` — 'dispute' is already in the status CHECK constraint

### Architecture Constraints (Inherited from 5.2-5.5)

- **Svelte 5 runes only** — `$state`, `$derived`, `$effect`. Never Svelte 4 stores.
- **`.svelte.ts` extension** for files using runes.
- **`$lib/` import alias** — never relative `../../../` paths.
- **Co-located tests** as `filename.test.ts`.
- **i18n required** — all user-facing strings in both `en` and `vi`.
- **Use existing `logger`** from `@cotulenh/common` — never raw `console.log`.
- **Use `isGameMessage()` guard** from `$lib/game/messages.ts`.
- **Check Supabase `{ data, error }` returns** — never assume success.
- **Use typed `GameMessage`** for all broadcast payloads — no raw objects.
- **Core/wrapper split** — plain logic in `.ts`, runes in `.svelte.ts`.

### Dependencies & Imports (No New Packages)

All dependencies are already installed:
- `@supabase/supabase-js` — `SupabaseClient`, `RealtimeChannel`
- `@cotulenh/common` — `logger`
- `$lib/game/messages.ts` — `sendGameMessage`, `onGameMessage`, `isGameMessage`, `GameMessage`
- `$lib/clock/clock.svelte.ts` — `ChessClockState`
- `$lib/game/online-session-core.ts` — `OnlineGameSessionCore`
- `$lib/game/online-session.svelte.ts` — `OnlineGameSession`
- `$lib/components/ui/dialog/` — Dialog, DialogContent, DialogHeader, etc.
- `svelte-sonner` — `toast` (for supplementary notifications if needed)

### Previous Story (5.5) Learnings

- **Composition pattern is critical**: `OnlineGameSession` composes `GameSession`. All game logic flows through GameSession. Do NOT bypass it.
- **Core/wrapper split works well**: Keep all logic in `online-session-core.ts`, reactivity wrapper in `online-session.svelte.ts`.
- **sendGameMessage catches errors**: Safe to call without try/catch.
- **Lifecycle idempotency matters**: Always check `if (this.#lifecycle === 'ended') return` at the start of game-end handlers.
- **Tests use fake timers**: `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync()`.
- **Mock pattern**: `createMockSupabase()` with `simulateGameMessage()` helpers.
- **Code review found lifecycle deadlocks**: Be very careful with lifecycle state transitions. Ensure no double-transitions.
- **PGN type assertion needed**: `(game as unknown as { pgn(opts: { clocks?: string[] }): string }).pgn({ clocks: this.#clockAnnotations })`
- **Optimistic concurrency count**: Use `{ count: 'exact' }` option on Supabase update.

### Project Structure Notes

- `$lib/game/` directory: `messages.ts`, `lag-tracker.ts`, `online-session-core.ts`, `online-session-core.test.ts`, `online-session.svelte.ts`
- `$lib/clock/` directory: `clock.svelte.ts`, `clock.test.ts`
- `$lib/components/`: `GameResultBanner.svelte`, `ReconnectBanner.svelte`
- `$lib/components/ui/dialog/`: Full bits-ui dialog component set
- i18n files: `$lib/i18n/locales/en.ts`, `$lib/i18n/locales/vi.ts`, `$lib/i18n/types.ts`
- Game page: `src/routes/play/online/[gameId]/+page.svelte`
- Migrations: `supabase/migrations/` (next is `007_disputes.sql`)

### File Locations

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/007_disputes.sql` | CREATE | Disputes table with RLS policies |
| `apps/cotulenh/app/src/lib/game/online-session-core.ts` | MODIFY | Add dispute state fields, dispute detection in #handleRemoteMove, case 'dispute' in message handler, reportDispute() method, dispute termination in #writeGameResult |
| `apps/cotulenh/app/src/lib/game/online-session.svelte.ts` | MODIFY | Expose reportDispute(), disputeActive, disputeInfo reactive getters |
| `apps/cotulenh/app/src/lib/game/online-session-core.test.ts` | MODIFY | Tests for dispute detection, dispute message receive, reportDispute, guards, idempotency |
| `apps/cotulenh/app/src/lib/components/GameResultBanner.svelte` | MODIFY | Add `dispute` case to reasonText switch |
| `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte` | MODIFY | Add dispute overlay dialog, disputeActive/disputeInfo derived, viewOnly dispute guard |
| `apps/cotulenh/app/src/lib/i18n/types.ts` | MODIFY | Add dispute i18n key types |
| `apps/cotulenh/app/src/lib/i18n/locales/en.ts` | MODIFY | Add English dispute translations |
| `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` | MODIFY | Add Vietnamese dispute translations |

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Dispute system architecture, dispute table schema, Lines 138]
- [Source: _bmad-output/planning-artifacts/architecture.md — GameMessage dispute type, Line 474]
- [Source: _bmad-output/planning-artifacts/architecture.md — Move validation flow (invalid → dispute), Lines 342-343]
- [Source: _bmad-output/planning-artifacts/architecture.md — Game lifecycle states (includes 'dispute'), Lines 198-199]
- [Source: _bmad-output/planning-artifacts/architecture.md — RLS policies for disputes, Line 808]
- [Source: _bmad-output/planning-artifacts/architecture.md — disputes.classification deferred to implementation, Line 815]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 5.6, Lines 907-932]
- [Source: _bmad-output/planning-artifacts/prd.md — FR28a-d (dispute system), Lines 361-364]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR13 (game integrity via client-side validation), Line 417]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — DisputeBanner component, Lines 918-923]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Dispute sub-flow diagram, Lines 772-782]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Dispute overlay pattern (non-dismissible), Lines 1157-1161]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Emotional design: calm during disputes, Line 195]
- [Source: apps/cotulenh/app/src/lib/game/messages.ts — dispute event type, Line 29]
- [Source: apps/cotulenh/app/src/lib/game/messages.ts — isGameMessage validator for dispute, Lines 80-81]
- [Source: apps/cotulenh/app/src/lib/game/online-session-core.ts — #handleRemoteMove invalid path placeholder, Lines 411-417]
- [Source: supabase/migrations/004_games.sql — games.status CHECK includes 'dispute', Line 10]
- [Source: _bmad-output/implementation-artifacts/5-5-clock-timeout-claim-victory.md — Previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Clock `stop()` sets status to `'idle'` not `'stopped'` — corrected test assertions accordingly.

### Completion Notes List

- Task 1: Created `007_disputes.sql` migration with table, RLS (SELECT/INSERT), index, and updated_at trigger. No UPDATE policy per MVP scope.
- Tasks 2-4: Added `#disputeActive`/`#disputeInfo` state, `onDispute` callback to interface, dispute detection in `#handleRemoteMove` (replaces sync fallback), `case 'dispute'` in message handler, and `#handleDisputeMessage` method with lifecycle/idempotency guards.
- Tasks 5-7: Added async `reportDispute()` method that inserts dispute row to Supabase and ends game with `status='dispute'`, `winner=null`. Added `'dispute'` termination string and `Result: *` header to `#writeGameResult`.
- Task 8: Added `disputeActive`, `disputeInfo` reactive getters and `reportDispute` proxy to `OnlineGameSession` wrapper. Wired `onDispute` callback with version bump.
- Tasks 9-10: Added non-dismissible dispute dialog to game page (prevents Escape/outside click), dispute derived states, board `viewOnly` guard for dispute. Added `'dispute'` case to `GameResultBanner` reasonText switch.
- Task 11: Added 6 i18n keys to types.ts, en.ts, and vi.ts.
- Task 12: Added 10 comprehensive tests covering dispute detection, message receive, reportDispute (bug/cheat), guards, idempotency, lifecycle guards, PGN headers, and board state reflection. All 515 tests pass with zero regressions.
- Code review follow-up (2026-03-03): fixed dispute pause gaps in core logic, ACKed invalid/dispute-phase remote moves to stop retries, added in-flight duplicate-submit guard in `reportDispute()`, added UI submit disabling/await flow, and enforced one-dispute-per-player with DB uniqueness.

### Change Log

- 2026-03-03: Story 5.6 Dispute System — implemented all 12 tasks. Dispute detection on invalid remote moves, dispute broadcast/receive, non-dismissible classification dialog, Supabase persistence, game result writing, i18n in EN/VI, 10 new tests.
- 2026-03-03: Senior review fixes applied — dispute action hard-pause guards, ACK behavior for dispute paths, duplicate-report prevention (core + UI + DB), and added regression tests for these cases.

### File List

- `supabase/migrations/007_disputes.sql` — NEW: disputes table, RLS, index, trigger
- `apps/cotulenh/app/src/lib/game/online-session-core.ts` — MODIFIED: dispute state fields, detection, message handler, reportDispute(), writeGameResult dispute case, onDispute callback
- `apps/cotulenh/app/src/lib/game/online-session.svelte.ts` — MODIFIED: disputeActive/disputeInfo reactive getters, reportDispute proxy, onDispute callback wiring
- `apps/cotulenh/app/src/lib/game/online-session-core.test.ts` — MODIFIED: added insert mock support and dispute regression tests (ACK, idempotency, in-flight duplicate submit)
- `apps/cotulenh/app/src/lib/components/GameResultBanner.svelte` — MODIFIED: added dispute case to reasonText switch
- `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte` — MODIFIED: dispute dialog, derived states, viewOnly guard, styles
- `apps/cotulenh/app/src/lib/i18n/types.ts` — MODIFIED: 6 dispute i18n key types
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts` — MODIFIED: English dispute translations
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` — MODIFIED: Vietnamese dispute translations

## Senior Developer Review (AI)

### Reviewer

GPT-5 Codex

### Date

2026-03-03

### Outcome

Changes Requested (resolved in this pass) -> Approved

### Summary of Findings and Resolutions

- HIGH: Dispute state did not fully pause gameplay actions in core. Fixed by hard guards on local actions and remote move handling while dispute is active.
- HIGH: Invalid move path did not ACK disputed sequence, causing retry pressure. Fixed by ACKing and advancing processed sequence when dispute is raised.
- HIGH: Duplicate dispute submissions were possible during async insert. Fixed with an in-flight guard in core, disabled/awaited UI submission flow, and DB uniqueness on `(game_id, reporting_user_id)`.
- MEDIUM: Idempotency test did not validate second invalid move behavior. Fixed by updating/adding tests for true invalid-move idempotency, dispute-phase ACK behavior, and in-flight duplicate submit prevention.

### Verification

- `pnpm --filter @cotulenh/app test -- src/lib/game/online-session-core.test.ts` (pass, 89 tests)
