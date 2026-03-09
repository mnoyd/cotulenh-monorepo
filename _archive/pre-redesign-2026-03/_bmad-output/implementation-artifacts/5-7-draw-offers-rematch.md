# Story 5.7: Draw Offers & Rematch

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to offer a draw during a game and request a rematch after it ends,
so that we have sportsmanlike game flow options.

## Acceptance Criteria (BDD)

1. **Given** a player during an active game
   **When** they click "Offer Draw"
   **Then** a `draw-offer` message is sent and the opponent sees an Accept/Decline prompt

2. **Given** the opponent accepts a draw offer
   **When** they click "Accept"
   **Then** a `draw-accept` message is sent, the game ends with `status = 'draw'`, `winner = null`, and PGN is saved

3. **Given** the opponent declines a draw offer
   **When** they click "Decline"
   **Then** a `draw-decline` message is sent and gameplay continues

4. **Given** a game has just ended
   **When** either player clicks "Rematch"
   **Then** a `rematch` message is sent and the opponent sees a "Rematch?" prompt

5. **Given** the opponent accepts a rematch
   **When** they click "Accept"
   **Then** a new `game_invitations` row is created with swapped colors and the same time control, and both players are navigated to the new game

## Tasks / Subtasks

### Draw Offer Flow

- [x] Task 1: Add draw-offer state fields to `OnlineGameSessionCore` (AC: 1, 3)
  - [x] 1.1 Add private fields:
    ```typescript
    #drawOfferSent = false;     // We sent an offer, waiting for opponent response
    #drawOfferReceived = false; // We received an offer, need to respond
    ```
  - [x] 1.2 Add public getters:
    ```typescript
    get drawOfferSent(): boolean { return this.#drawOfferSent; }
    get drawOfferReceived(): boolean { return this.#drawOfferReceived; }
    ```
  - [x] 1.3 `#pendingDrawOffer` (line 79) already exists for the timeout interaction rule. Continue using it as the "any draw offer is active" flag — set it alongside `#drawOfferSent` / `#drawOfferReceived`. Remove `setPendingDrawOffer()` public method (line 153-155) since draw state is now managed internally by `offerDraw()`, `acceptDraw()`, `declineDraw()`.

- [x] Task 2: Implement `offerDraw()` public method (AC: 1)
  - [x] 2.1 Add `offerDraw(): void` method
  - [x] 2.2 Guards: `if (this.#lifecycle !== 'playing' || this.#disputeActive || this.#drawOfferSent || this.#drawOfferReceived) return`
  - [x] 2.3 Send draw-offer message:
    ```typescript
    sendGameMessage(this.#channel!, {
      event: 'draw-offer',
      senderId: this.#currentUserId
    });
    ```
  - [x] 2.4 Set state: `this.#drawOfferSent = true; this.#pendingDrawOffer = true;`
  - [x] 2.5 Call `this.#notifyStateChange()`

- [x] Task 3: Handle incoming draw messages in `#handleGameMessage` (AC: 1, 2, 3)
  - [x] 3.1 Add switch cases after `case 'abort':` (~line 414):
    ```typescript
    case 'draw-offer':
      this.#handleDrawOfferMessage();
      break;
    case 'draw-accept':
      this.#handleDrawAcceptMessage();
      break;
    case 'draw-decline':
      this.#handleDrawDeclineMessage();
      break;
    ```
  - [x] 3.2 Implement `#handleDrawOfferMessage(): void`:
    - Guard: `if (this.#lifecycle !== 'playing' || this.#disputeActive || this.#drawOfferReceived) return`
    - If `this.#drawOfferSent`: both players offered simultaneously → auto-accept (draw by mutual agreement). Call `this.#endGameAsDraw('draw_by_agreement')` and return.
    - Set state: `this.#drawOfferReceived = true; this.#pendingDrawOffer = true;`
    - Fire callback: `this.#callbacks.onDrawOffer?.()`
    - Call `this.#notifyStateChange()`
  - [x] 3.3 Implement `#handleDrawAcceptMessage(): void`:
    - Guard: `if (!this.#drawOfferSent || this.#lifecycle !== 'playing') return`
    - Call `this.#endGameAsDraw('draw_by_agreement')`
  - [x] 3.4 Implement `#handleDrawDeclineMessage(): void`:
    - Guard: `if (!this.#drawOfferSent) return`
    - Clear state: `this.#drawOfferSent = false; this.#pendingDrawOffer = false;`
    - Fire callback: `this.#callbacks.onDrawDeclined?.()`
    - Call `this.#notifyStateChange()`

- [x] Task 4: Implement `acceptDraw()` and `declineDraw()` public methods (AC: 2, 3)
  - [x] 4.1 `acceptDraw(): void`:
    - Guard: `if (!this.#drawOfferReceived || this.#lifecycle !== 'playing') return`
    - Send `draw-accept` message
    - Call `this.#endGameAsDraw('draw_by_agreement')`
  - [x] 4.2 `declineDraw(): void`:
    - Guard: `if (!this.#drawOfferReceived || this.#lifecycle !== 'playing') return`
    - Send `draw-decline` message
    - Clear state: `this.#drawOfferReceived = false; this.#pendingDrawOffer = false;`
    - Call `this.#notifyStateChange()`

- [x] Task 5: Implement `#endGameAsDraw(resultReason: string)` helper (AC: 2)
  - [x] 5.1 Create private helper (follows `#handleResignMessage` and `claimVictory` lifecycle pattern):
    ```typescript
    #endGameAsDraw(resultReason: string): void {
      this.#lifecycle = 'ended';
      this.clock.stop();
      this.#drawOfferSent = false;
      this.#drawOfferReceived = false;
      this.#pendingDrawOffer = false;
      this.#gameResult = {
        status: 'draw',
        winner: null,
        resultReason,
        isLocalPlayerWinner: false
      };
      this.#writeGameResult('draw', null, resultReason);
      this.#callbacks.onGameEnd?.(this.#gameResult);
      this.#notifyStateChange();
    }
    ```

- [x] Task 6: Add draw auto-cancel on move (AC: 3)
  - [x] 6.1 In `makeMove()` (~line 333), after a successful local move: if `this.#drawOfferReceived` → implicitly decline. Clear `this.#drawOfferReceived = false; this.#pendingDrawOffer = false;` and send `draw-decline` message (so opponent's "Draw Offered" indicator clears).
  - [x] 6.2 In `#handleRemoteMove()`, after a successful opponent move: if `this.#drawOfferSent` → opponent moved without accepting, offer withdrawn. Clear `this.#drawOfferSent = false; this.#pendingDrawOffer = false;` and call `this.#notifyStateChange()` (UI updates to remove "Draw Offered" indicator).

- [x] Task 7: Add `draw_by_agreement` to `#writeGameResult` (AC: 2)
  - [x] 7.1 In `#writeGameResult`, add to terminationString switch (after `case 'dispute':` ~line 896):
    ```typescript
    case 'draw_by_agreement': terminationString = 'draw by agreement'; break;
    ```
  - [x] 7.2 Add Result header for draw-by-agreement (after the existing resign/timeout/dispute Result header blocks, ~line 910):
    ```typescript
    if (status === 'draw') {
      game.setHeader('Result', '1/2-1/2');
    }
    ```
    Note: This covers both `draw_by_agreement` and `draw_by_timeout_with_pending_offer`. Verify the existing `#handleClockTimeout` draw path (line 731-744) doesn't already set a different Result header — if it calls `#writeGameResult('draw', ...)`, this block handles it.

### Rematch Flow

- [x] Task 8: Add rematch state fields to `OnlineGameSessionCore` (AC: 4, 5)
  - [x] 8.1 Add private fields:
    ```typescript
    #rematchSent = false;
    #rematchReceived = false;
    #rematchGameId: string | null = null;
    #acceptingRematch = false; // in-flight guard for async acceptRematch()
    ```
  - [x] 8.2 Add public getters:
    ```typescript
    get rematchSent(): boolean { return this.#rematchSent; }
    get rematchReceived(): boolean { return this.#rematchReceived; }
    get rematchGameId(): string | null { return this.#rematchGameId; }
    ```

- [x] Task 9: Implement `requestRematch()` public method (AC: 4)
  - [x] 9.1 Add `requestRematch(): void` method
  - [x] 9.2 Guards: `if (this.#lifecycle !== 'ended' || this.#rematchSent || this.#rematchReceived) return`
  - [x] 9.3 Send rematch message:
    ```typescript
    sendGameMessage(this.#channel!, {
      event: 'rematch',
      senderId: this.#currentUserId
    });
    ```
  - [x] 9.4 Set state: `this.#rematchSent = true;`
  - [x] 9.5 Call `this.#notifyStateChange()`

- [x] Task 10: Handle incoming rematch messages (AC: 4, 5)
  - [x] 10.1 Add switch cases in `#handleGameMessage` (after draw cases):
    ```typescript
    case 'rematch':
      this.#handleRematchMessage();
      break;
    case 'rematch-accept':
      this.#handleRematchAcceptMessage(msg);
      break;
    case 'rematch-decline':
      this.#handleRematchDeclineMessage();
      break;
    ```
  - [x] 10.2 Implement `#handleRematchMessage(): void`:
    - Guard: `if (this.#lifecycle !== 'ended' || this.#rematchReceived) return`
    - If `this.#rematchSent`: both players want rematch → auto-accept. Call `this.#createAndAcceptRematch()` and return.
    - Set state: `this.#rematchReceived = true;`
    - Fire callback: `this.#callbacks.onRematchRequested?.()`
    - Call `this.#notifyStateChange()`
  - [x] 10.3 Implement `#handleRematchAcceptMessage(msg: GameMessage): void`:
    - Guard: `if (!this.#rematchSent) return`
    - Extract: `const newGameId = (msg as any).newGameId`
    - Guard: `if (!newGameId || typeof newGameId !== 'string') return`
    - Set state: `this.#rematchGameId = newGameId;`
    - Fire callback: `this.#callbacks.onRematchAccepted?.(newGameId)`
    - Call `this.#notifyStateChange()`
  - [x] 10.4 Implement `#handleRematchDeclineMessage(): void`:
    - Guard: `if (!this.#rematchSent) return`
    - Clear state: `this.#rematchSent = false;`
    - Fire callback: `this.#callbacks.onRematchDeclined?.()`
    - Call `this.#notifyStateChange()`

- [x] Task 11: Implement `acceptRematch()` and `declineRematch()` (AC: 5)
  - [x] 11.1 `async acceptRematch(): Promise<void>`:
    - Guard: `if (!this.#rematchReceived || this.#lifecycle !== 'ended' || this.#acceptingRematch) return`
    - Set in-flight guard: `this.#acceptingRematch = true;`
    - Determine swapped colors:
      ```typescript
      const newRedPlayer = this.playerColor === 'red' ? this.#opponentUserId : this.#currentUserId;
      const newBluePlayer = this.playerColor === 'red' ? this.#currentUserId : this.#opponentUserId;
      const gameConfig = { timeMinutes: this.#timeControlMinutes, incrementSeconds: this.#timeControlIncrement };
      ```
    - Create game_invitations row (status='accepted' since both parties agreed):
      ```typescript
      const { data: invitation, error: invError } = await this.#supabase
        .from('game_invitations')
        .insert({
          from_user: this.#opponentUserId,
          to_user: this.#currentUserId,
          status: 'accepted',
          game_config: gameConfig
        })
        .select('id')
        .single();
      if (invError) { logger.error('Failed to create rematch invitation', { error: invError }); this.#acceptingRematch = false; return; }
      ```
    - Create games row:
      ```typescript
      const { data: newGame, error: gameError } = await this.#supabase
        .from('games')
        .insert({
          invitation_id: invitation.id,
          red_player: newRedPlayer,
          blue_player: newBluePlayer,
          status: 'started',
          time_control: gameConfig
        })
        .select('id')
        .single();
      if (gameError) { logger.error('Failed to create rematch game', { error: gameError }); this.#acceptingRematch = false; return; }
      ```
    - Send `rematch-accept` with newGameId:
      ```typescript
      sendGameMessage(this.#channel!, {
        event: 'rematch-accept',
        senderId: this.#currentUserId,
        newGameId: newGame.id
      } as any); // 'as any' because newGameId is an extension field
      ```
    - Set state: `this.#rematchGameId = newGame.id;`
    - Fire callback: `this.#callbacks.onRematchAccepted?.(newGame.id)`
    - Call `this.#notifyStateChange()`
    - Reset guard: `this.#acceptingRematch = false;`
    - Wrap entire body in try/finally to always reset `#acceptingRematch`
  - [x] 11.2 `declineRematch(): void`:
    - Guard: `if (!this.#rematchReceived || this.#lifecycle !== 'ended') return`
    - Send `rematch-decline` message
    - Clear state: `this.#rematchReceived = false;`
    - Call `this.#notifyStateChange()`

### Abort Enhancement

- [x] Task 12: Add early-game abort (scope: abort before both sides have moved)
  - [x] 12.1 Add public getter:
    ```typescript
    get canAbort(): boolean {
      return this.#lifecycle === 'playing' && this.session.game.history().length < 2;
    }
    ```
  - [x] 12.2 Implement `abort(): void` method:
    - Guard: `if (!this.canAbort) return`
    - Reuse existing abort infrastructure: call the same DB update pattern as `#handleNoStartTimeout` (lines 621-645):
      ```typescript
      this.#lifecycle = 'ended';
      this.clock.stop();
      await this.#supabase
        .from('games')
        .update({ status: 'aborted' }, { count: 'exact' })
        .eq('id', this.gameId)
        .eq('status', 'started');
      sendGameMessage(this.#channel!, { event: 'abort', senderId: this.#currentUserId });
      this.#notifyAbortOnce();
      ```
    - Note: `#handleNoStartTimeout` is the reference pattern. The abort method reuses its DB update + abort message + notifyAbortOnce approach.

### Callbacks & Messages Update

- [x] Task 13: Update `OnlineSessionCallbacks` interface (AC: 1-5)
  - [x] 13.1 Add to callbacks interface (~line 45):
    ```typescript
    onDrawOffer?: () => void;
    onDrawDeclined?: () => void;
    onRematchRequested?: () => void;
    onRematchAccepted?: (newGameId: string) => void;
    onRematchDeclined?: () => void;
    ```

- [x] Task 14: Update `rematch-accept` in `messages.ts` (AC: 5)
  - [x] 14.1 Update the GameMessage union type at line 40:
    ```typescript
    // Change from:
    | { event: 'rematch-accept' }
    // To:
    | { event: 'rematch-accept'; newGameId: string }
    ```
  - [x] 14.2 Update `isGameMessage` validator: separate `'rematch-accept'` from the bulk return-true group at lines 91-99:
    ```typescript
    case 'rematch-accept':
      return typeof (value as any).newGameId === 'string';
    ```
    Remove `'rematch-accept'` from the combined case that currently just returns `true`.

### Reactive Wrapper Update

- [x] Task 15: Update `OnlineGameSession` reactive wrapper (AC: 1-5)
  - [x] 15.1 Add reactive getters (all follow `void this.#version; return this.#core.X` pattern):
    - `get drawOfferSent(): boolean`
    - `get drawOfferReceived(): boolean`
    - `get rematchSent(): boolean`
    - `get rematchReceived(): boolean`
    - `get rematchGameId(): string | null`
    - `get canAbort(): boolean`
  - [x] 15.2 Add proxy methods:
    - `offerDraw(): void` → `this.#core.offerDraw()`
    - `acceptDraw(): void` → `this.#core.acceptDraw()`
    - `declineDraw(): void` → `this.#core.declineDraw()`
    - `requestRematch(): void` → `this.#core.requestRematch()`
    - `async acceptRematch(): Promise<void>` → `await this.#core.acceptRematch()`
    - `declineRematch(): void` → `this.#core.declineRematch()`
    - `abort(): void` → `this.#core.abort()`
  - [x] 15.3 Wire new callbacks in constructor to trigger `this.#version++` (same pattern as existing onDispute wiring at line 45-47):
    ```typescript
    onDrawOffer: () => { this.#version++; },
    onDrawDeclined: () => { this.#version++; },
    onRematchRequested: () => { this.#version++; },
    onRematchAccepted: (newGameId) => { this.#version++; },
    onRematchDeclined: () => { this.#version++; },
    ```
  - [x] 15.4 Update constructor signature to accept optional external callbacks for draw/rematch if the page needs them (check if page callbacks are needed or if derived state suffices).

### UI Updates

- [x] Task 16: Add draw-offer UI to game page `+page.svelte` (AC: 1, 3)
  - [x] 16.1 Add derived state (after existing `disputeComment` at line ~70):
    ```typescript
    let drawOfferSent = $derived(onlineSession?.drawOfferSent ?? false);
    let drawOfferReceived = $derived(onlineSession?.drawOfferReceived ?? false);
    let canAbort = $derived(onlineSession?.canAbort ?? false);
    ```
  - [x] 16.2 In status bar (~line 225-252), add "Offer Draw" button. Use inline Accept/Decline prompt (NOT a modal — per UX: no modal stacking). Place before or alongside the resign button:
    ```svelte
    {#if !opponentFlagged && !disputeActive && onlineSession?.lifecycle === 'playing'}
      {#if drawOfferSent}
        <span class="draw-offer-pending">{i18n.t('game.drawOfferSent')}</span>
      {:else if drawOfferReceived}
        <div class="draw-offer-received">
          <span>{i18n.t('game.drawOfferReceived')}</span>
          <button class="accept-draw-btn" onclick={() => onlineSession?.acceptDraw()}>
            {i18n.t('game.acceptDraw')}
          </button>
          <button class="decline-draw-btn" onclick={() => onlineSession?.declineDraw()}>
            {i18n.t('game.declineDraw')}
          </button>
        </div>
      {:else}
        <button class="draw-offer-btn" onclick={() => onlineSession?.offerDraw()}>
          {i18n.t('game.offerDraw')}
        </button>
      {/if}
    {/if}
    ```
  - [x] 16.3 Replace resign button with abort when `canAbort` (~line 241):
    ```svelte
    {#if canAbort}
      <button class="abort-btn" onclick={() => onlineSession?.abort()}>
        {i18n.t('game.abortGame')}
      </button>
    {:else}
      <button class="resign-btn" onclick={() => resignDialogOpen = true}>
        {i18n.t('game.resignButton')}
      </button>
    {/if}
    ```
  - [x] 16.4 Style `.draw-offer-btn`, `.draw-offer-pending`, `.draw-offer-received`, `.accept-draw-btn`, `.decline-draw-btn`, `.abort-btn`. Use neutral/subtle styling for draw offer — this is a sportsmanlike gesture, not an alarm.

- [x] Task 17: Add rematch UI to `GameResultBanner.svelte` (AC: 4, 5)
  - [x] 17.1 Add props (extend existing props at line 8-16):
    ```typescript
    let {
      result, playerColor, onPlayAgain,
      onRematch, rematchSent, rematchReceived,
      onAcceptRematch, onDeclineRematch
    }: {
      result: GameEndResult;
      playerColor: 'red' | 'blue';
      onPlayAgain?: () => void;
      onRematch?: () => void;
      rematchSent?: boolean;
      rematchReceived?: boolean;
      onAcceptRematch?: () => void;
      onDeclineRematch?: () => void;
    } = $props();
    ```
  - [x] 17.2 Add rematch section in `result-actions` div (~line 77):
    ```svelte
    <div class="result-actions">
      {#if rematchReceived}
        <div class="rematch-prompt">
          <span>{i18n.t('game.rematchReceived')}</span>
          <button class="accept-rematch-btn" onclick={() => onAcceptRematch?.()}>
            {i18n.t('game.acceptRematch')}
          </button>
          <button class="decline-rematch-btn" onclick={() => onDeclineRematch?.()}>
            {i18n.t('game.declineRematch')}
          </button>
        </div>
      {:else if rematchSent}
        <button class="rematch-btn" disabled>{i18n.t('game.rematchRequested')}</button>
      {:else}
        <button class="rematch-btn" onclick={() => onRematch?.()}>
          {i18n.t('game.rematch')}
        </button>
      {/if}
      <button class="play-again-btn" onclick={() => onPlayAgain?.()}>
        {i18n.t('game.playAgain')}
      </button>
    </div>
    ```
  - [x] 17.3 Add `'draw_by_agreement'` case to `reasonText` switch (~line 23-33):
    ```typescript
    case 'draw_by_agreement': return i18n.t('game.resultDrawAgreement');
    ```

- [x] Task 18: Wire rematch in `+page.svelte` (AC: 4, 5)
  - [x] 18.1 Add derived state:
    ```typescript
    let rematchSent = $derived(onlineSession?.rematchSent ?? false);
    let rematchReceived = $derived(onlineSession?.rematchReceived ?? false);
    ```
  - [x] 18.2 Add rematch accept handler:
    ```typescript
    async function handleAcceptRematch() {
      await onlineSession?.acceptRematch();
      const newGameId = onlineSession?.rematchGameId;
      if (newGameId) goto(`/play/online/${newGameId}`);
    }
    ```
  - [x] 18.3 Pass `onRematchAccepted` callback in OnlineGameSession constructor:
    ```typescript
    onRematchAccepted: (newGameId: string) => {
      goto(`/play/online/${newGameId}`);
    }
    ```
    This handles navigation for the player who SENT the rematch request (Player A receives rematch-accept from Player B).
  - [x] 18.4 Update `GameResultBanner` usage (~line 209-217):
    ```svelte
    <GameResultBanner
      result={gameResult}
      playerColor={data.playerColor as 'red' | 'blue'}
      onPlayAgain={() => goto('/play/online')}
      onRematch={() => onlineSession?.requestRematch()}
      {rematchSent}
      {rematchReceived}
      onAcceptRematch={handleAcceptRematch}
      onDeclineRematch={() => onlineSession?.declineRematch()}
    />
    ```

### i18n

- [x] Task 19: Add i18n strings (AC: 1-5)
  - [x] 19.1 Add to `types.ts` (after `'game.resultDispute'` at line 635):
    - `'game.offerDraw'`
    - `'game.drawOfferSent'`
    - `'game.drawOfferReceived'`
    - `'game.acceptDraw'`
    - `'game.declineDraw'`
    - `'game.resultDrawAgreement'`
    - `'game.rematch'`
    - `'game.rematchRequested'`
    - `'game.rematchReceived'`
    - `'game.acceptRematch'`
    - `'game.declineRematch'`
    - `'game.abortGame'`
  - [x] 19.2 Add to `en.ts`:
    - `'game.offerDraw': 'Offer Draw'`
    - `'game.drawOfferSent': 'Draw Offered'`
    - `'game.drawOfferReceived': 'Opponent offers a draw'`
    - `'game.acceptDraw': 'Accept'`
    - `'game.declineDraw': 'Decline'`
    - `'game.resultDrawAgreement': 'Draw by Agreement'`
    - `'game.rematch': 'Rematch'`
    - `'game.rematchRequested': 'Rematch Requested...'`
    - `'game.rematchReceived': 'Opponent wants a rematch!'`
    - `'game.acceptRematch': 'Accept'`
    - `'game.declineRematch': 'Decline'`
    - `'game.abortGame': 'Abort'`
  - [x] 19.3 Add to `vi.ts`:
    - `'game.offerDraw': 'Đề Nghị Hòa'`
    - `'game.drawOfferSent': 'Đã Đề Nghị Hòa'`
    - `'game.drawOfferReceived': 'Đối thủ đề nghị hòa'`
    - `'game.acceptDraw': 'Đồng Ý'`
    - `'game.declineDraw': 'Từ Chối'`
    - `'game.resultDrawAgreement': 'Hòa Theo Thỏa Thuận'`
    - `'game.rematch': 'Chơi Lại'`
    - `'game.rematchRequested': 'Đã Yêu Cầu Chơi Lại...'`
    - `'game.rematchReceived': 'Đối thủ muốn chơi lại!'`
    - `'game.acceptRematch': 'Đồng Ý'`
    - `'game.declineRematch': 'Từ Chối'`
    - `'game.abortGame': 'Hủy Ván'`

### Tests

- [x] Task 20: Write tests (AC: 1-5)
  - [x] 20.1 **Draw offer send test**: Call `offerDraw()` → verify `drawOfferSent` is true, `draw-offer` message broadcast, `#pendingDrawOffer` set
  - [x] 20.2 **Draw offer receive test**: Receive `draw-offer` message → verify `drawOfferReceived` is true, `onDrawOffer` callback fires
  - [x] 20.3 **Draw accept test**: Set `drawOfferReceived`, call `acceptDraw()` → verify `draw-accept` message sent, game ends with `status='draw'`, `winner=null`, `resultReason='draw_by_agreement'`, PGN has `Result: 1/2-1/2` and `Termination: draw by agreement`
  - [x] 20.4 **Draw decline test**: Set `drawOfferReceived`, call `declineDraw()` → verify `draw-decline` message sent, `drawOfferReceived` cleared, gameplay continues
  - [x] 20.5 **Draw decline receive test**: Set `drawOfferSent`, receive `draw-decline` → verify `drawOfferSent` cleared, `onDrawDeclined` fires
  - [x] 20.6 **Draw auto-cancel on opponent move test**: Set `drawOfferSent`, opponent makes a move → verify `drawOfferSent` cleared, `#pendingDrawOffer` cleared
  - [x] 20.7 **Draw auto-cancel on local move test**: Set `drawOfferReceived`, make a local move → verify `drawOfferReceived` cleared, `draw-decline` message sent
  - [x] 20.8 **Draw offer guards test**: Try `offerDraw()` during dispute → nothing. Try when already sent → nothing. Try when lifecycle !== 'playing' → nothing
  - [x] 20.9 **Simultaneous draw offer test**: Both players send `draw-offer` → auto-accept, game ends as draw with `draw_by_agreement`
  - [x] 20.10 **Draw + timeout interaction test**: Set `drawOfferSent` + `pendingDrawOffer`, opponent flags → verify game ends as draw with `draw_by_timeout_with_pending_offer` (existing behavior, verify integration)
  - [x] 20.11 **Rematch request test**: After game ends, call `requestRematch()` → verify `rematchSent` is true, `rematch` message broadcast
  - [x] 20.12 **Rematch receive test**: After game ends, receive `rematch` message → verify `rematchReceived` is true, `onRematchRequested` fires
  - [x] 20.13 **Rematch accept test**: Set `rematchReceived`, call `acceptRematch()` → verify `rematch-accept` message sent with `newGameId`, Supabase INSERT calls for invitation and game with swapped colors and same time control
  - [x] 20.14 **Rematch accept receive test**: Set `rematchSent`, receive `rematch-accept` with `newGameId` → verify `rematchGameId` set, `onRematchAccepted` fires with game ID
  - [x] 20.15 **Rematch decline test**: Set `rematchReceived`, call `declineRematch()` → verify `rematch-decline` sent, state cleared
  - [x] 20.16 **Rematch guard test**: Call `requestRematch()` when lifecycle !== 'ended' → nothing happens
  - [x] 20.17 **Simultaneous rematch test**: Both players send `rematch` → auto-accept, new game created
  - [x] 20.18 **Rematch in-flight guard test**: Call `acceptRematch()` twice rapidly → only one set of DB inserts
  - [x] 20.19 **Abort test**: When `history.length < 2`, call `abort()` → verify `abort` message sent, game status set to 'aborted', `onAbort` fires
  - [x] 20.20 **Abort guard test**: When `history.length >= 2`, `canAbort` returns false, `abort()` does nothing

## Dev Notes

### Critical: This Story EXTENDS OnlineGameSession — Do NOT Rewrite

Stories 5.1-5.6 built the complete online session system. This story adds draw offers, rematch, and abort enhancements to the EXISTING classes. The composition pattern, core/wrapper split, and message handling architecture remain unchanged.

### What Already Exists (from Stories 5.1-5.6) — DO NOT Recreate

| Feature | Location | Status |
|---------|----------|--------|
| `OnlineGameSessionCore` class | `online-session-core.ts` | Complete — extend, not replace |
| `OnlineGameSession` reactive wrapper | `online-session.svelte.ts` | Complete — extend, not replace |
| `GameMessage` with `draw-offer/accept/decline` events | `messages.ts:25-27` | Already defined |
| `GameMessage` with `rematch/accept/decline` events | `messages.ts:39-41` | Already defined |
| `isGameMessage()` validator for all 6 events | `messages.ts:91-99` | Returns true (no extra fields) |
| `#pendingDrawOffer` field | `online-session-core.ts:79` | Exists — used in timeout interaction |
| `setPendingDrawOffer()` method | `online-session-core.ts:153-155` | Exists — replace with internal management |
| Draw + timeout = draw path | `online-session-core.ts:731-744` | Complete — uses `#pendingDrawOffer` |
| `#handleGameMessage` switch | `online-session-core.ts:386-419` | Add cases (draw-\*, rematch-\* currently fall to `default: break`) |
| `#handleAbortMessage()` | `online-session-core.ts:545-551` | Complete — handles received abort |
| `#handleNoStartTimeout()` | `online-session-core.ts:621-645` | Reference for abort DB write pattern |
| `#notifyAbortOnce()` | `online-session-core.ts:553-560` | Reuse for abort |
| `#writeGameResult()` | `online-session-core.ts:875-939` | Extend — add `draw_by_agreement` termination |
| `resign()` pattern | `online-session-core.ts:232-263` | Reference for method structure |
| `claimVictory()` pattern | `online-session-core.ts:207-230` | Reference for method structure |
| `reportDispute()` async pattern | `online-session-core.ts:265-295` | Reference for async + in-flight guard |
| `GameEndResult` type | `online-session-core.ts:25-30` | Reuse — status, winner, resultReason |
| `GameResultBanner.svelte` | `$lib/components/GameResultBanner.svelte` | Extend — add rematch, draw-agreement reason |
| DB `games.status = 'draw'` | `004_games.sql:10` | Already in CHECK constraint |
| `game_invitations` table | `003_game_invitations.sql` | Reuse for rematch invitation |
| `sendGameMessage` | `messages.ts:112-129` | Reuse for all messages |

### Constructor Config Fields Available for Rematch

From `OnlineSessionConfig` interface (lines 12-23):
- `#currentUserId` (line 52) — for `from_user`/`to_user` in invitation
- `#opponentUserId` (line 53) — for swapped player assignment
- `playerColor` (line 49) — for determining color swap
- `#timeControlMinutes` (line 56) — for `game_config.timeMinutes`
- `#timeControlIncrement` (line 57) — for `game_config.incrementSeconds`
- `#supabase` — for DB operations

### Draw Offer Flow

```
Player A clicks "Offer Draw":
1. offerDraw() → guards check
2. Send { event: 'draw-offer' } via Broadcast
3. #drawOfferSent = true, #pendingDrawOffer = true
4. UI shows "Draw Offered" indicator

Player B receives draw-offer:
1. #handleDrawOfferMessage()
2. #drawOfferReceived = true, #pendingDrawOffer = true
3. onDrawOffer callback fires
4. UI shows inline Accept/Decline buttons

Player B clicks "Accept":
1. acceptDraw() → send { event: 'draw-accept' }
2. #endGameAsDraw('draw_by_agreement')
3. lifecycle = 'ended', game result written
4. Both players see GameResultBanner

Player B clicks "Decline":
1. declineDraw() → send { event: 'draw-decline' }
2. Clear draw state, gameplay continues

Auto-cancel:
- Player B makes a move while draw offer pending → implicit decline, draw-decline sent
- Player A's opponent makes a move → offer withdrawn, state cleared
```

### Rematch Flow

```
Game has ended. Player A clicks "Rematch":
1. requestRematch() → send { event: 'rematch' }
2. #rematchSent = true, UI shows "Rematch Requested..."

Player B sees "Rematch?" in GameResultBanner:
1. #handleRematchMessage() → #rematchReceived = true
2. UI shows Accept/Decline buttons

Player B clicks "Accept":
1. acceptRematch() → async
2. Create game_invitations row (status='accepted', swapped colors, same time control)
3. Create games row (new game, status='started')
4. Send { event: 'rematch-accept', newGameId: '...' }
5. Player B navigates to /play/online/{newGameId}
6. Player A receives rematch-accept → onRematchAccepted fires → navigates

Player B clicks "Decline":
1. declineRematch() → send { event: 'rematch-decline' }
2. Player A: rematchSent cleared, "Rematch" button re-enabled
```

### Rematch Color Swap Logic

When creating a rematch:
- Current game: Player A = red, Player B = blue
- Rematch: Player A = blue, Player B = red
- The acceptor creates the `games` row with swapped `red_player`/`blue_player`
- `game_config` (time control) is preserved from original game

### Rematch-Accept Needs `newGameId` Field

The `rematch-accept` message needs a `newGameId` field so the requester knows where to navigate. This requires a small update to `messages.ts`:
- Update the type union: `| { event: 'rematch-accept'; newGameId: string }`
- Update `isGameMessage`: validate `typeof newGameId === 'string'`

### Simultaneous Requests (Edge Cases)

- Both players send `draw-offer` simultaneously → when receiving a `draw-offer` while `#drawOfferSent` is true, auto-accept (mutual agreement)
- Both players send `rematch` simultaneously → when receiving `rematch` while `#rematchSent` is true, one player auto-accepts (creates the game). Use `#currentUserId < #opponentUserId` as tiebreaker to decide who creates.

### Draw + Timeout Interaction (Already Implemented)

The `#handleClockTimeout` method (lines 731-744) already checks `#pendingDrawOffer`. When any draw offer is pending and a timeout occurs, the result is a draw (`draw_by_timeout_with_pending_offer`). This story's draw offer flow sets `#pendingDrawOffer = true` via `offerDraw()` / `#handleDrawOfferMessage()`, so the existing timeout path integrates automatically.

### `acceptRematch()` Is Async — In-Flight Guard Required

Same pattern as `reportDispute()`: the `acceptRematch()` method awaits two Supabase INSERT operations. Use `#acceptingRematch` boolean to prevent double-submit. Wrap in try/finally:
```typescript
if (this.#acceptingRematch) return;
this.#acceptingRematch = true;
try { /* DB operations + message send */ }
finally { this.#acceptingRematch = false; }
```

### What NOT To Do

- Do NOT modify `004_games.sql` — `'draw'` is already in the status CHECK constraint
- Do NOT modify `007_disputes.sql` — dispute system is complete
- Do NOT implement rematch with different time controls — same time control only per AC 5
- Do NOT implement spectator or observer features
- Do NOT add server-side draw/rematch validation — client-side only via Broadcast
- Do NOT implement draw offer rate-limiting in DB — client-side guard only
- Do NOT use Dialog (modal) for draw offer UI — use inline Accept/Decline buttons in status bar
- Do NOT add a new Lifecycle state for draw offers — use `#drawOfferSent`/`#drawOfferReceived` flags (same pattern as `#disputeActive`)
- Do NOT modify `ChessClockState` — `clock.stop()` already works
- Do NOT modify existing timeout draw path — it already integrates via `#pendingDrawOffer`

### Architecture Constraints (Inherited from 5.2-5.6)

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
- **Optimistic concurrency** — use `.eq('status', 'started')` guard on game result writes.
- **`{ count: 'exact' }` option** on Supabase update calls.

### Dependencies & Imports (No New Packages)

All dependencies are already installed:
- `@supabase/supabase-js` — `SupabaseClient`, `RealtimeChannel`
- `@cotulenh/common` — `logger`
- `$lib/game/messages.ts` — `sendGameMessage`, `onGameMessage`, `isGameMessage`, `GameMessage`
- `$lib/clock/clock.svelte.ts` — `ChessClockState`
- `$lib/game/online-session-core.ts` — `OnlineGameSessionCore`
- `$lib/game/online-session.svelte.ts` — `OnlineGameSession`
- `svelte-sonner` — `toast` (for optional notifications)

### Previous Story (5.6) Learnings

- **Composition pattern is critical**: `OnlineGameSession` composes `GameSession`. All game logic flows through GameSession.
- **Core/wrapper split works well**: Keep all logic in `online-session-core.ts`, reactivity wrapper in `online-session.svelte.ts`.
- **sendGameMessage catches errors**: Safe to call without try/catch.
- **Lifecycle idempotency matters**: Always check lifecycle at start of handlers.
- **Tests use fake timers**: `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync()`.
- **Mock pattern**: `createMockSupabase()` with `simulateGameMessage()` helpers.
- **Code review found lifecycle deadlocks**: Be careful with lifecycle transitions. Ensure no double-transitions.
- **PGN type assertion needed**: `(game as unknown as { pgn(opts: { clocks?: string[] }): string }).pgn({ clocks: this.#clockAnnotations })`
- **Optimistic concurrency count**: Use `{ count: 'exact' }` option on Supabase update.
- **Duplicate action prevention**: Use in-flight guards for async methods (pattern: `if (this.#reportingDispute) return; this.#reportingDispute = true; try { ... } finally { this.#reportingDispute = false; }`).

### Project Structure Notes

- `$lib/game/` directory: `messages.ts`, `lag-tracker.ts`, `online-session-core.ts`, `online-session-core.test.ts`, `online-session.svelte.ts`
- `$lib/clock/` directory: `clock.svelte.ts`, `clock.test.ts`
- `$lib/components/`: `GameResultBanner.svelte`, `ReconnectBanner.svelte`
- `$lib/components/ui/dialog/`: Full bits-ui dialog component set
- i18n files: `$lib/i18n/locales/en.ts`, `$lib/i18n/locales/vi.ts`, `$lib/i18n/types.ts`
- Game page: `src/routes/play/online/[gameId]/+page.svelte`
- Migrations: `supabase/migrations/` (no new migration needed)

### File Locations

| File | Action | Purpose |
|------|--------|---------|
| `apps/cotulenh/app/src/lib/game/messages.ts` | MODIFY | Update `rematch-accept` type to include `newGameId`, separate its validator |
| `apps/cotulenh/app/src/lib/game/online-session-core.ts` | MODIFY | Add draw state fields, draw/rematch/abort methods, draw/rematch message handlers, `#endGameAsDraw` helper, `draw_by_agreement` termination, new callbacks |
| `apps/cotulenh/app/src/lib/game/online-session.svelte.ts` | MODIFY | Add reactive getters and proxy methods for draw, rematch, abort; wire new callbacks |
| `apps/cotulenh/app/src/lib/game/online-session-core.test.ts` | MODIFY | ~20 new tests covering draw, rematch, abort flows and guards |
| `apps/cotulenh/app/src/lib/components/GameResultBanner.svelte` | MODIFY | Add rematch props/buttons, accept/decline rematch, `draw_by_agreement` reason text |
| `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte` | MODIFY | Draw offer UI, rematch wiring, abort button, new derived states and handlers |
| `apps/cotulenh/app/src/lib/i18n/types.ts` | MODIFY | 12 new i18n key types |
| `apps/cotulenh/app/src/lib/i18n/locales/en.ts` | MODIFY | English draw/rematch/abort translations |
| `apps/cotulenh/app/src/lib/i18n/locales/vi.ts` | MODIFY | Vietnamese draw/rematch/abort translations |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 5.7, Lines 935-963]
- [Source: _bmad-output/planning-artifacts/architecture.md — Draw offer + timeout interaction, Line 211]
- [Source: _bmad-output/planning-artifacts/architecture.md — Rematch flow, Line 214]
- [Source: _bmad-output/planning-artifacts/architecture.md — GameMessage types (draw-*, rematch-*), Lines 470-480]
- [Source: _bmad-output/planning-artifacts/architecture.md — Broadcast event naming (kebab-case), Line 426]
- [Source: _bmad-output/planning-artifacts/architecture.md — Game lifecycle states + abort, Lines 193-214]
- [Source: _bmad-output/planning-artifacts/prd.md — FR29-FR34 (online gameplay FRs), Lines 365-370]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — GameResultBanner component, Lines 902-908]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — "One obvious path forward" principle, Line 147]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — No modal stacking on game end, Line 246]
- [Source: apps/cotulenh/app/src/lib/game/messages.ts — draw-offer/accept/decline types, Lines 25-27]
- [Source: apps/cotulenh/app/src/lib/game/messages.ts — rematch/accept/decline types, Lines 39-41]
- [Source: apps/cotulenh/app/src/lib/game/messages.ts — isGameMessage validator, Lines 91-99]
- [Source: apps/cotulenh/app/src/lib/game/online-session-core.ts — OnlineSessionConfig interface, Lines 12-23]
- [Source: apps/cotulenh/app/src/lib/game/online-session-core.ts — #pendingDrawOffer field, Line 79]
- [Source: apps/cotulenh/app/src/lib/game/online-session-core.ts — setPendingDrawOffer(), Lines 153-155]
- [Source: apps/cotulenh/app/src/lib/game/online-session-core.ts — #handleClockTimeout draw+timeout path, Lines 731-744]
- [Source: apps/cotulenh/app/src/lib/game/online-session-core.ts — #handleGameMessage switch, Lines 386-419]
- [Source: apps/cotulenh/app/src/lib/game/online-session-core.ts — #writeGameResult, Lines 875-939]
- [Source: apps/cotulenh/app/src/lib/game/online-session-core.ts — #handleAbortMessage, Lines 545-551]
- [Source: apps/cotulenh/app/src/lib/game/online-session-core.ts — #handleNoStartTimeout, Lines 621-645]
- [Source: apps/cotulenh/app/src/lib/components/GameResultBanner.svelte — reasonText switch, Lines 23-33]
- [Source: supabase/migrations/003_game_invitations.sql — Schema for rematch invitation]
- [Source: supabase/migrations/004_games.sql — games.status CHECK includes 'draw', Line 10]
- [Source: supabase/migrations/004_games.sql — time_control jsonb field, Line 14]
- [Source: _bmad-output/implementation-artifacts/5-6-dispute-system.md — Previous story learnings]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

- `pnpm --filter @cotulenh/app test`
- `pnpm --filter @cotulenh/app run check-types`

### Completion Notes List

- Implemented full draw offer flow in `OnlineGameSessionCore` and reactive wrapper (`offerDraw`, `acceptDraw`, `declineDraw`, draw message handlers, draw auto-cancel on moves).
- Implemented full rematch flow in `OnlineGameSessionCore` and reactive wrapper (`requestRematch`, `acceptRematch`, `declineRematch`, rematch message handlers, deterministic simultaneous-rematch tiebreak).
- Added `rematch-accept.newGameId` typing and runtime validation in `messages.ts`.
- Added early-game manual abort support (`canAbort`, `abort()`), and surfaced abort UI in online game page.
- Updated game UI for draw offer controls and rematch controls (`+page.svelte`, `GameResultBanner.svelte`) with sender/receiver navigation handling.
- Updated draw PGN result handling (`draw_by_agreement` termination + `Result: 1/2-1/2` for draws).
- Added/updated tests for message validation and draw/rematch/abort session behavior.
- `pnpm --filter @cotulenh/app test` passes.
- `pnpm --filter @cotulenh/app run check-types` fails due pre-existing repository issues unrelated to this story (env exports, existing test typing, and existing Svelte warnings).

### Change Log

- 2026-03-03: Implemented Story 5.7 draw/rematch/abort runtime logic, UI wiring, i18n keys/locales, and regression tests.

### File List

- `apps/cotulenh/app/src/lib/game/messages.ts`
- `apps/cotulenh/app/src/lib/game/messages.test.ts`
- `apps/cotulenh/app/src/lib/game/online-session-core.ts`
- `apps/cotulenh/app/src/lib/game/online-session.svelte.ts`
- `apps/cotulenh/app/src/lib/game/online-session-core.test.ts`
- `apps/cotulenh/app/src/lib/components/GameResultBanner.svelte`
- `apps/cotulenh/app/src/routes/play/online/[gameId]/+page.svelte`
- `apps/cotulenh/app/src/lib/i18n/types.ts`
- `apps/cotulenh/app/src/lib/i18n/locales/en.ts`
- `apps/cotulenh/app/src/lib/i18n/locales/vi.ts`
