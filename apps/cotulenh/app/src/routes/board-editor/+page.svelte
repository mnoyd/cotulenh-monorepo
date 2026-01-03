<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { logger } from '@cotulenh/common';
  import type { Api, Piece, Role, Color, Config } from '@cotulenh/board';
  import { validateFenString } from '@cotulenh/core';
  import { goto } from '$app/navigation';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import PiecePalettesContainer from './PiecePalettesContainer.svelte';
  import { toast } from 'svelte-sonner';

  import '$lib/styles/modern-warfare.css';

  // Mode system: 'hand' | 'drop' | 'delete'
  type EditorMode = 'hand' | 'drop' | 'delete';

  let boardComponent: BoardContainer | null = $state(null);
  let boardApi: Api | null = $state(null);
  // State that needs reactivity for child components or template bindings
  let fenInput = $state('');
  let copyButtonText = $state('Copy');
  let boardOrientation: 'red' | 'blue' = $state('red');
  let editorMode: EditorMode = $state('hand');
  let selectedPiece: { role: Role; color: Color; promoted?: boolean } | null = $state(null);
  let ghostPosition = $state({ x: 0, y: 0 });
  let showGhost = $state(false);
  let isOverRelevantArea = $state(false);
  let heroicMode = $state(false);
  let validationError = $state('');
  let currentTurn: 'red' | 'blue' = $state('red');
  let initialFen = $state('');
  let boardReady = $state(false);

  // Special marker for delete mode
  const DELETE_MARKER: Piece = { role: 'commander', color: 'red' };

  // Initial empty board FEN
  const EMPTY_FEN = '11/11/11/11/11/11/11/11/11/11/11/11 r - - 0 1';
  const STARTING_FEN =
    '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1';

  function updateFEN() {
    if (boardApi) {
      let rawFen = boardApi.getFen();

      // Ensure FEN has correct format: [board] [turn] - - 0 1
      const fenParts = rawFen.split(' ');
      const boardPart = fenParts[0];

      // Parse turn (default to current turn if not in FEN)
      if (fenParts.length >= 2) {
        currentTurn = fenParts[1] === 'b' ? 'blue' : 'red';
      }

      // Reconstruct FEN with proper format
      const turnChar = currentTurn === 'red' ? 'r' : 'b';
      fenInput = `${boardPart} ${turnChar} - - 0 1`;
    }
  }

  function applyFEN() {
    if (boardApi && fenInput) {
      try {
        // Parse and normalize FEN
        const fenParts = fenInput.split(' ');
        const boardPart = fenParts[0];

        // Parse turn (default to red if not specified)
        if (fenParts.length >= 2) {
          currentTurn = fenParts[1] === 'b' ? 'blue' : 'red';
        } else {
          currentTurn = 'red';
        }

        // Normalize to proper format: [board] [turn] - - 0 1
        const turnChar = currentTurn === 'red' ? 'r' : 'b';
        const normalizedFen = `${boardPart} ${turnChar} - - 0 1`;

        boardApi.set({
          fen: normalizedFen,
          lastMove: undefined
        });

        // Update fenInput with normalized FEN
        fenInput = normalizedFen;
      } catch (error) {
        toast.error('Invalid FEN: ' + error);
      }
    }
  }

  function clearBoard() {
    if (boardApi) {
      // Reset turn to red when clearing
      currentTurn = 'red';
      // Set to empty FEN
      boardApi.set({
        fen: EMPTY_FEN,
        lastMove: undefined
      });
      updateFEN();
    }
  }

  function flipBoard() {
    if (boardApi) {
      boardApi.toggleOrientation();
      // Toggle orientation state to swap palettes
      boardOrientation = boardOrientation === 'red' ? 'blue' : 'red';
    }
  }

  function setMode(mode: EditorMode) {
    if (!boardApi) return;

    logger.debug('Setting mode to:', { mode });
    editorMode = mode;

    if (mode === 'hand') {
      // Hand mode: can drag pieces on board
      selectedPiece = null;
      showGhost = false;
      boardApi.state.dropmode = { active: false };
      boardApi.state.movable.color = 'both';
      document.body.style.cursor = 'default';
    } else if (mode === 'delete') {
      // Delete mode: click pieces to delete
      selectedPiece = null;
      showGhost = false;
      boardApi.state.dropmode = {
        active: true,
        piece: DELETE_MARKER
      };
      document.body.style.cursor = 'not-allowed';
    } else if (mode === 'drop') {
      // Drop mode: place selected piece
      // This is set when a piece is selected
      document.body.style.cursor = 'default';
    }
  }

  function toggleHandMode() {
    // Always set to hand mode when clicked
    setMode('hand');
  }

  function toggleDeleteMode() {
    setMode(editorMode === 'delete' ? 'hand' : 'delete');
  }

  function scrollToBoard() {
    // Scroll the board section into view
    const boardSection = document.querySelector('.board-section');
    if (boardSection) {
      boardSection.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }

  function handlePieceSelect(role: Role, color: Color) {
    if (!boardApi) return;

    // Toggle selection if clicking the same piece
    const isPromoted = heroicMode && role !== 'commander';
    if (
      selectedPiece?.role === role &&
      selectedPiece?.color === color &&
      selectedPiece?.promoted === isPromoted
    ) {
      // Deselect piece - return to hand mode
      selectedPiece = null;
      showGhost = false;
      setMode('hand');
    } else {
      // Select piece - enter drop mode
      selectedPiece = { role, color, promoted: isPromoted ? true : undefined };
      editorMode = 'drop';
      showGhost = true;
      scrollToBoard();

      // Enable dropmode with the selected piece (including promoted/heroic status)
      const piece: Piece = { role, color };
      if (isPromoted) {
        piece.promoted = true;
      }
      boardApi.state.dropmode = {
        active: true,
        piece
      };
      document.body.style.cursor = 'default';
    }
  }

  function toggleHeroicMode() {
    heroicMode = !heroicMode;
    // If a piece is already selected, reselect it with new promoted status
    if (selectedPiece) {
      const { role, color } = selectedPiece;
      selectedPiece = null;
      handlePieceSelect(role, color);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (selectedPiece || editorMode === 'delete') {
      ghostPosition = { x: e.clientX, y: e.clientY };

      // Check if mouse is over palette or board area
      const target = e.target as HTMLElement;
      isOverRelevantArea = !!(
        target.closest('.palette-section') ||
        target.closest('.board-container') ||
        target.closest('.board-section')
      );
    }
  }

  function handleAfterNewPiece(role: Role, key: string) {
    if (!boardApi) return;

    logger.debug('afterNewPiece:', { role, at: key, mode: editorMode });

    // Check if this was a delete action (using our marker)
    if (editorMode === 'delete' && role === DELETE_MARKER.role) {
      logger.debug('Delete mode detected! Removing piece at', { key });
      // Use the proper API to remove the piece
      boardApi.setPieces(new Map([[key, undefined]]));
      boardApi.state.lastMove = undefined; // Clear last move highlight
      updateFEN();
      // Keep delete mode active for multiple deletions
    } else {
      // Normal piece placement in drop mode
      logger.debug('Normal placement:', { role, at: key });
      boardApi.state.lastMove = undefined; // Don't highlight in editor
      updateFEN();
      // Keep selection active for multiple placements (stay in drop mode)
    }
  }

  function cancelSelection(e: MouseEvent) {
    if (!boardApi) return;

    // Only cancel if clicking outside the board and palettes
    const target = e.target as HTMLElement;
    if (
      target.closest('.board-container') ||
      target.closest('.palette-section') ||
      target.closest('.sidebar')
    ) {
      return;
    }

    // Return to hand mode
    selectedPiece = null;
    showGhost = false;
    setMode('hand');
  }

  function loadStartingPosition() {
    if (boardApi) {
      boardApi.set({
        fen: STARTING_FEN,
        lastMove: undefined
      });
      updateFEN(); // This will also update currentTurn
    }
  }

  async function copyFEN() {
    try {
      await navigator.clipboard.writeText(fenInput);
      copyButtonText = 'Copied!';
      setTimeout(() => {
        copyButtonText = 'Copy';
      }, 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fenInput;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      copyButtonText = 'Copied!';
      setTimeout(() => {
        copyButtonText = 'Copy';
      }, 2000);
    }
  }

  function toggleTurn() {
    currentTurn = currentTurn === 'red' ? 'blue' : 'red';

    // Update FEN with new turn
    if (fenInput) {
      const fenParts = fenInput.split(' ');
      const boardPart = fenParts[0];
      const turnChar = currentTurn === 'red' ? 'r' : 'b';

      // Reconstruct FEN with proper format: [board] [turn] - - 0 1
      fenInput = `${boardPart} ${turnChar} - - 0 1`;

      // Apply the updated FEN to the board
      if (boardApi) {
        try {
          boardApi.set({
            fen: fenInput,
            lastMove: undefined
          });
        } catch (error) {
          logger.error(error, 'Error updating turn:');
        }
      }
    }
  }

  function validateAndPlay() {
    validationError = '';

    if (!fenInput) {
      validationError = 'Please enter a FEN position first';
      return;
    }

    // Try to validate using cotulenh-core
    try {
      const isValid = validateFenString(fenInput);

      if (!isValid) {
        validationError = 'Invalid FEN format';
        return;
      }

      // If validation passes, navigate to play mode with this FEN
      // Encode FEN for URL
      const encodedFen = encodeURIComponent(fenInput);
      goto(`/?fen=${encodedFen}`);
    } catch (error) {
      // If validation throws an error, show it
      validationError = error instanceof Error ? error.message : 'Invalid FEN';
    }
  }

  function createEditorConfig(): Config {
    return {
      fen: initialFen || EMPTY_FEN,
      orientation: 'red',
      turnColor: currentTurn,
      movable: {
        free: true,
        color: 'both',
        showDests: false,
        events: {
          after: (_orig: any, _dest: any) => {
            if (boardApi) {
              boardApi.state.lastMove = undefined;
            }
            updateFEN();
          },
          afterNewPiece: handleAfterNewPiece
        }
      },
      events: {
        change: updateFEN
      }
    } as Config;
  }

  function handleBoardReady(api: Api) {
    boardApi = api;
    boardReady = true;

    // Disable highlighting for editor mode
    api.state.highlight.lastMove = false;
    api.state.highlight.check = false;

    updateFEN();
    logger.debug('Board editor ready');
  }

  function handleBoardDestroy() {
    logger.debug('Cleaning up board editor.');
    document.body.style.cursor = 'default';
    if (boardApi) {
      boardApi.state.dropmode = { active: false };
    }
  }

  onMount(() => {
    // Check for FEN in URL parameters
    const urlFen = $page.url.searchParams.get('fen');

    if (urlFen) {
      try {
        let decodedFen = decodeURIComponent(urlFen);

        // Parse turn from FEN
        const fenParts = decodedFen.split(' ');
        const boardPart = fenParts[0];

        if (fenParts.length >= 2) {
          currentTurn = fenParts[1] === 'b' ? 'blue' : 'red';
        }

        // Normalize FEN to proper format: [board] [turn] - - 0 1
        const turnChar = currentTurn === 'red' ? 'r' : 'b';
        initialFen = `${boardPart} ${turnChar} - - 0 1`;
        fenInput = initialFen;
      } catch (error) {
        logger.error(error, 'Error decoding FEN from URL:');
        initialFen = EMPTY_FEN;
      }
    } else {
      initialFen = EMPTY_FEN;
    }
  });
</script>

<svelte:body onmousemove={handleMouseMove} onclick={cancelSelection} />

<main class="editor-page">
  <!-- Header -->
  <header class="editor-header">
    <h1>
      <span class="text-mw-secondary">Board</span>
      <span class="text-mw-primary font-light">Editor</span>
    </h1>
  </header>

  <div class="editor-layout">
    <!-- Board Section (Left) -->
    <section class="board-section">
      {#if initialFen}
        <BoardContainer
          bind:this={boardComponent}
          config={createEditorConfig()}
          onApiReady={handleBoardReady}
          onDestroy={handleBoardDestroy}
          class="board-editor-container
                 {editorMode === 'delete' ? 'mode-delete' : ''}
                 {selectedPiece !== null && editorMode !== 'delete' ? 'mode-drop' : ''}"
        />
      {:else}
        <div class="board-container">
          <p class="text-mw-primary">Loading board...</p>
        </div>
      {/if}
    </section>

    <!-- Sidebar (Right) -->
    <aside class="sidebar">
      <!-- Palettes Container -->
      <PiecePalettesContainer
        {boardApi}
        {selectedPiece}
        {heroicMode}
        {editorMode}
        onPieceSelect={handlePieceSelect}
        onHandModeToggle={toggleHandMode}
        onDeleteModeToggle={toggleDeleteMode}
        onHeroicToggle={toggleHeroicMode}
      />

      <!-- Controls Section -->
      <div class="controls-section">
        <div class="control-row">
          <button
            class="ctrl-btn"
            onclick={loadStartingPosition}
            title="Reset to starting position"
          >
            ↺ Reset
          </button>
          <button class="ctrl-btn" onclick={clearBoard} title="Clear all pieces"> 🧹 Clear </button>
          <button class="ctrl-btn" onclick={flipBoard} title="Flip board orientation">
            ⇅ Flip
          </button>
        </div>

        <button class="turn-btn {currentTurn}" onclick={toggleTurn} title="Toggle current turn">
          <span class="turn-indicator {currentTurn}"></span>
          Turn: {currentTurn === 'red' ? 'Red' : 'Blue'}
        </button>
      </div>

      <!-- FEN Section -->
      <div class="fen-section">
        <label for="fen-input">FEN Position</label>
        <input
          id="fen-input"
          type="text"
          bind:value={fenInput}
          placeholder="Enter FEN string..."
          class="fen-input"
        />
        <div class="fen-buttons">
          <button class="fen-btn" onclick={applyFEN}>Apply</button>
          <button class="fen-btn" onclick={copyFEN}>{copyButtonText}</button>
        </div>
      </div>

      <!-- Play Button -->
      <button class="play-btn" onclick={validateAndPlay}>
        <span class="play-icon">▶</span>
        Play This Position
      </button>

      {#if validationError}
        <div class="validation-error">
          ⚠️ {validationError}
        </div>
      {/if}

      <!-- Quick Tips (collapsible) -->
      <details class="tips-section">
        <summary>Quick Tips</summary>
        <ul>
          <li><strong>✋ Hand:</strong> Drag pieces on board</li>
          <li><strong>Click piece:</strong> Select, then click to place</li>
          <li><strong>🗑️ Delete:</strong> Click to remove pieces</li>
          <li><strong>⭐ Heroic:</strong> Toggle promotion status</li>
        </ul>
      </details>
    </aside>
  </div>

  <!-- Ghost piece that follows mouse (only in relevant areas) -->
  {#if showGhost && selectedPiece && isOverRelevantArea}
    <div class="ghost-piece cg-wrap" style="left: {ghostPosition.x}px; top: {ghostPosition.y}px;">
      <piece
        class="{selectedPiece.role} {selectedPiece.color}"
        class:heroic={selectedPiece.promoted}
      ></piece>
    </div>
  {/if}

  <!-- Ghost recycle bin that follows mouse in delete mode (only in relevant areas) -->
  {#if editorMode === 'delete' && isOverRelevantArea}
    <div class="ghost-recycle-bin" style="left: {ghostPosition.x}px; top: {ghostPosition.y}px;">
      🗑️
    </div>
  {/if}
</main>

<style lang="postcss">
  @reference "../../app.css";

  .editor-page {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--color-mw-bg-dark);
  }

  .editor-header {
    flex-shrink: 0;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-mw-border);
    background: var(--color-mw-bg-panel);
  }

  .editor-header h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 3px;
    text-align: center;
  }

  .editor-layout {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 0;
    min-height: 0;
    overflow: hidden;
  }

  @media (max-width: 1024px) {
    .editor-layout {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr auto;
      overflow-y: auto; /* Allow scrolling on mobile */
    }
  }

  /* Board Section */
  .board-section {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: rgba(0, 0, 0, 0.4);
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    /* Enable container queries for the board */
    container-type: size;
    width: 100%;
    height: 100%;
  }

  /* Fallback loading container - only used when BoardContainer hasn't loaded */
  .board-container {
    position: relative;
    aspect-ratio: 12 / 13;
    width: min(100cqw, 100cqh * 12 / 13);
    height: min(100cqh, 100cqw * 13 / 12);
    background: #000;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Editor-specific board styling - use :global for component class */
  .board-section :global(.board-editor-container) {
    width: min(100cqw, 100cqh * 12 / 13);
    height: min(100cqh, 100cqw * 13 / 12);
    border-radius: 4px;
  }

  /* Border/glow effect for editor modes */
  .board-section :global(.board-editor-container)::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    border: 2px solid var(--color-mw-border);
    border-radius: 4px;
    z-index: 10;
    transition:
      box-shadow 0.2s,
      border-color 0.2s;
  }

  .board-section :global(.board-editor-container.mode-delete) {
    cursor: not-allowed;
  }

  .board-section :global(.board-editor-container.mode-delete)::after {
    border-color: var(--color-mw-alert);
    box-shadow: 0 0 20px rgba(255, 171, 0, 0.4);
  }

  .board-section :global(.board-editor-container.mode-drop) {
    cursor: crosshair;
  }

  .board-section :global(.board-editor-container.mode-drop)::after {
    border-color: var(--color-mw-secondary);
    box-shadow: 0 0 20px rgba(0, 255, 65, 0.4);
  }

  /* Sidebar */
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-mw-bg-panel);
    border-left: 1px solid var(--color-mw-border);
    overflow-y: auto;
    overflow-x: hidden;
  }

  .palette-section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 0.5rem;
  }

  .palette-title {
    font-family: var(--font-display);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 0.5rem 0;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .palette-title.red {
    color: #ff6b6b;
  }

  .palette-title.blue {
    color: #4dabf7;
  }

  /* Controls */
  .controls-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .ctrl-btn {
    padding: 0.5rem;
    font-family: var(--font-ui);
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(0, 243, 255, 0.05);
    border: 1px solid var(--color-mw-border);
    color: var(--color-mw-primary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .ctrl-btn:hover {
    background: rgba(0, 243, 255, 0.15);
    color: #fff;
  }

  .turn-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem;
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .turn-btn.red {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.5);
    color: #ff6b6b;
  }

  .turn-btn.blue {
    background: rgba(77, 171, 247, 0.1);
    border: 1px solid rgba(77, 171, 247, 0.5);
    color: #4dabf7;
  }

  .turn-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .turn-indicator.red {
    background: #ff6b6b;
  }

  .turn-indicator.blue {
    background: #4dabf7;
  }

  /* FEN Section */
  .fen-section {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 0.5rem;
  }

  .fen-section label {
    display: block;
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mw-primary);
    margin-bottom: 0.25rem;
  }

  .fen-input {
    width: 100%;
    padding: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--color-mw-border);
    color: var(--color-mw-primary);
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }

  .fen-input:focus {
    outline: none;
    border-color: var(--color-mw-secondary);
  }

  .fen-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .fen-btn {
    padding: 0.4rem;
    font-family: var(--font-ui);
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    background: rgba(0, 243, 255, 0.1);
    border: 1px solid var(--color-mw-border);
    color: var(--color-mw-primary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .fen-btn:hover {
    background: rgba(0, 243, 255, 0.2);
    color: #fff;
  }

  /* Play Button */
  .play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    background: linear-gradient(135deg, var(--color-mw-primary), #00aaff);
    border: 1px solid var(--color-mw-primary);
    color: #000;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
  }

  .play-btn:hover {
    transform: scale(1.02);
    box-shadow: 0 0 25px rgba(0, 243, 255, 0.5);
  }

  .play-icon {
    animation: pulse 2s infinite;
  }

  .validation-error {
    padding: 0.5rem;
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 600;
    background: rgba(255, 171, 0, 0.1);
    border: 1px solid var(--color-mw-alert);
    color: var(--color-mw-alert);
    border-radius: 4px;
    text-align: center;
  }

  /* Tips */
  .tips-section {
    font-size: 0.7rem;
    color: #666;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    padding: 0.5rem;
  }

  .tips-section summary {
    cursor: pointer;
    font-family: var(--font-ui);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
  }

  .tips-section ul {
    margin: 0.5rem 0 0;
    padding-left: 1rem;
    line-height: 1.6;
  }

  .tips-section li {
    margin-bottom: 0.25rem;
  }

  /* Ghost elements */
  .ghost-piece {
    position: fixed;
    z-index: 50;
    width: 50px;
    height: 50px;
    opacity: 0.8;
    pointer-events: none;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 0 10px var(--color-mw-primary));
  }

  .ghost-recycle-bin {
    position: fixed;
    z-index: 50;
    font-size: 2rem;
    pointer-events: none;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 0 10px var(--color-mw-alert));
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* Responsive: Mobile Layout */
  @media (max-width: 900px) {
    .editor-layout {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }

    .board-section {
      padding: 0.5rem;
      /* Assign explicit height for container queries to work on mobile */
      height: 50vh;
      flex: none;
    }

    /* .board-container size is automatically handled by container queries! */

    .sidebar {
      border-left: none;
      border-top: 1px solid var(--color-mw-border);
      padding: 0.75rem;
      overflow-y: auto;
    }

    .palette-section {
      padding: 0.25rem;
    }

    .palette-title {
      font-size: 0.65rem;
      margin-bottom: 0.25rem;
    }
  }

  /* Very small screens */
  @media (max-width: 480px) {
    .editor-header {
      padding: 0.5rem;
    }

    .editor-header h1 {
      font-size: 1rem;
      letter-spacing: 2px;
    }

    /* Adjust board height slightly if needed */
    .board-section {
      height: 45vh;
    }

    .control-row {
      grid-template-columns: repeat(3, 1fr);
    }

    .ctrl-btn {
      font-size: 0.6rem;
      padding: 0.4rem;
    }
  }
</style>
