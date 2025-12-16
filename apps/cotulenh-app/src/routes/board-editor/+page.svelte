<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { CotulenhBoard } from '@repo/cotulenh-board';
  import type { Api, Piece, Role, Color } from '@repo/cotulenh-board';
  import { validateFenString } from '@repo/cotulenh-core';
  import { goto } from '$app/navigation';
  import PiecePalette from './PiecePalette.svelte';

  import '@repo/cotulenh-board/assets/commander-chess.base.css';
  import '@repo/cotulenh-board/assets/commander-chess.pieces.css';
  import '@repo/cotulenh-board/assets/commander-chess.clasic.css';

  // Mode system: 'hand' | 'drop' | 'delete'
  type EditorMode = 'hand' | 'drop' | 'delete';

  let boardContainerElement: HTMLElement | null = null;
  let boardApi: Api | null = null;
  let fenInput = '';
  let copyButtonText = 'Copy FEN';
  let boardOrientation: 'red' | 'blue' = 'red';
  let editorMode: EditorMode = 'hand';
  let selectedPiece: { role: Role; color: Color; promoted?: boolean } | null = null;
  let ghostPosition = { x: 0, y: 0 };
  let showGhost = false;
  let isOverRelevantArea = false;
  let heroicMode = false;
  let validationError = '';
  let currentTurn: 'red' | 'blue' = 'red';

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
        alert('Invalid FEN: ' + error);
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

    console.log('Setting mode to:', mode);
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

    console.log('afterNewPiece:', role, 'at', key, 'mode:', editorMode);

    // Check if this was a delete action (using our marker)
    if (editorMode === 'delete' && role === DELETE_MARKER.role) {
      console.log('Delete mode detected! Removing piece at', key);
      // Use the proper API to remove the piece
      boardApi.setPieces(new Map([[key, undefined]]));
      boardApi.state.lastMove = undefined; // Clear last move highlight
      updateFEN();
      // Keep delete mode active for multiple deletions
    } else {
      // Normal piece placement in drop mode
      console.log('Normal placement:', role, 'at', key);
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
      target.closest('.controls-container')
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
        copyButtonText = 'Copy FEN';
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
        copyButtonText = 'Copy FEN';
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
          console.error('Error updating turn:', error);
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

  async function screenshot() {
    // Dynamically import html2canvas only when needed
    try {
      // Use a function to defer import and avoid build-time resolution
      const loadHtml2Canvas = new Function('return import("html2canvas")');
      const module = await loadHtml2Canvas();
      const html2canvas = module.default;

      if (boardContainerElement) {
        const canvas = await html2canvas(boardContainerElement);
        const dataUrl = canvas.toDataURL('image/png');

        // Download the image
        const link = document.createElement('a');
        link.download = 'cotulenh-position.png';
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert(
        'Screenshot feature requires html2canvas library.\n\nInstall it with: pnpm add html2canvas --filter cotulenh-app'
      );
    }
  }

  onMount(() => {
    // Check for FEN in URL parameters
    const urlFen = $page.url.searchParams.get('fen');
    let initialFen = EMPTY_FEN;

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
        console.error('Error decoding FEN from URL:', error);
        initialFen = EMPTY_FEN;
      }
    }

    if (boardContainerElement) {
      console.log('Initializing board editor...');

      // Force proper sizing before and after board initialization
      const ensureBoardSize = () => {
        if (!boardContainerElement) return;

        const container = boardContainerElement.querySelector('cg-container') as HTMLElement;
        if (container) {
          const rect = boardContainerElement.getBoundingClientRect();
          // Only set size if the container has proper dimensions
          if (rect.width > 0 && rect.height > 0) {
            container.style.width = rect.width + 'px';
            container.style.height = rect.height + 'px';
          }
        }
      };

      boardApi = CotulenhBoard(boardContainerElement, {
        fen: initialFen,
        orientation: 'red',
        turnColor: currentTurn,
        movable: {
          free: true, // Allow any move - editor mode
          color: 'both', // Allow moving both colors
          showDests: false, // Don't show move destinations
          events: {
            after: (orig, dest) => {
              // Clear last move highlight after moves
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
      });

      // Disable highlighting after initialization
      boardApi.state.highlight.lastMove = false;
      boardApi.state.highlight.check = false;

      // Ensure proper sizing after initialization
      setTimeout(ensureBoardSize, 50);
      setTimeout(ensureBoardSize, 200);

      updateFEN();

      // Add resize observer for better cross-browser compatibility
      let resizeObserver: ResizeObserver | undefined;
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          ensureBoardSize();
        });
        resizeObserver.observe(boardContainerElement);
      }

      // Fallback resize handler
      const handleResize = () => ensureBoardSize();
      window.addEventListener('resize', handleResize);

      return () => {
        console.log('Cleaning up board editor.');
        document.body.style.cursor = 'default';
        if (boardApi) {
          boardApi.state.dropmode = { active: false };
        }
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        window.removeEventListener('resize', handleResize);
        boardApi?.destroy();
      };
    }
  });
</script>

<svelte:body on:mousemove={handleMouseMove} on:click={cancelSelection} />

<main>
  <div class="editor-container">
    <h1>CoTuLenh Board Editor</h1>

    <div class="editor-layout">
      <div class="board-and-palettes">
        <!-- Left Palette (Blue when red orientation, Red when blue orientation) -->
        <div class="palette-section left-palette">
          <h3>{boardOrientation === 'red' ? 'Blue' : 'Red'} Pieces</h3>
          <PiecePalette
            {boardApi}
            color={boardOrientation === 'red' ? 'blue' : 'red'}
            onPieceSelect={handlePieceSelect}
            {selectedPiece}
            {heroicMode}
            {editorMode}
            onHandModeToggle={toggleHandMode}
            onDeleteModeToggle={toggleDeleteMode}
            onHeroicToggle={toggleHeroicMode}
          />
        </div>

        <!-- Board Container -->
        <div class="board-section">
          <div
            bind:this={boardContainerElement}
            class="board-container"
            class:delete-mode={editorMode === 'delete'}
            class:place-mode={selectedPiece !== null}
          >
            {#if !boardApi}<p>Loading board...</p>{/if}
          </div>
        </div>

        <!-- Right Palette (Red when red orientation, Blue when blue orientation) -->
        <div class="palette-section right-palette">
          <h3>{boardOrientation === 'red' ? 'Red' : 'Blue'} Pieces</h3>
          <PiecePalette
            {boardApi}
            color={boardOrientation === 'red' ? 'red' : 'blue'}
            onPieceSelect={handlePieceSelect}
            {selectedPiece}
            {heroicMode}
            {editorMode}
            onHandModeToggle={toggleHandMode}
            onDeleteModeToggle={toggleDeleteMode}
            onHeroicToggle={toggleHeroicMode}
          />
        </div>
      </div>
    </div>

    <!-- Ghost piece that follows mouse (only in relevant areas) -->
    {#if showGhost && selectedPiece && isOverRelevantArea}
      <div class="ghost-piece cg-wrap" style="left: {ghostPosition.x}px; top: {ghostPosition.y}px;">
        <piece
          class="{selectedPiece.role} {selectedPiece.color}"
          class:promoted={selectedPiece.promoted}
        ></piece>
      </div>
    {/if}

    <!-- Ghost recycle bin that follows mouse in delete mode (only in relevant areas) -->
    {#if editorMode === 'delete' && isOverRelevantArea}
      <div class="ghost-recycle-bin" style="left: {ghostPosition.x}px; top: {ghostPosition.y}px;">
        🗑️
      </div>
    {/if}

    <!-- Special Play Button -->
    <div class="play-button-container">
      <button class="btn-play" on:click={validateAndPlay}>
        <span class="play-icon">▶</span>
        <span class="play-text">Play This Position</span>
      </button>
      {#if validationError}
        <div class="validation-error">
          ⚠️ {validationError}
        </div>
      {/if}
    </div>

    <!-- Controls Section at Bottom -->
    <div class="controls-container">
      <div class="button-row">
        <button class="btn btn-primary" on:click={loadStartingPosition}> Starting Position </button>
        <button class="btn btn-secondary" on:click={clearBoard}> Clear Board </button>
        <button class="btn btn-secondary" on:click={flipBoard}> Flip Board </button>
        <button
          class="btn"
          class:btn-turn-red={currentTurn === 'red'}
          class:btn-turn-blue={currentTurn === 'blue'}
          on:click={toggleTurn}
        >
          Turn: {currentTurn === 'red' ? '🔴 Red' : '🔵 Blue'}
        </button>
        <button class="btn btn-secondary" on:click={screenshot} disabled> Screenshot </button>
      </div>

      <div class="fen-section">
        <label for="fen-input">FEN Position:</label>
        <div class="fen-input-group">
          <input
            id="fen-input"
            type="text"
            bind:value={fenInput}
            placeholder="Enter FEN string..."
            class="fen-input"
          />
          <button class="btn btn-small" on:click={applyFEN}> Apply </button>
          <button class="btn btn-small" on:click={copyFEN}>
            {copyButtonText}
          </button>
        </div>
      </div>

      <div class="info-section">
        <h4>Instructions</h4>
        <ul>
          <li><strong>Hand Mode (✋):</strong> Drag pieces on board to move them</li>
          <li>
            <strong>Drop Mode:</strong> Click piece in palette to select, then click squares to place
          </li>
          <li><strong>Delete Mode (🗑️):</strong> Click to delete pieces on board</li>
          <li><strong>Turn Toggle:</strong> Switch between Red and Blue turn</li>
          <li><strong>Drag</strong> pieces from palette to board anytime</li>
          <li>Drag pieces off board to delete them</li>
        </ul>
      </div>
    </div>
  </div>
</main>

<style>
  .editor-container {
    max-width: 1600px;
    margin: 0 auto;
    padding: var(--spacing-lg);
    background-color: var(--mw-bg-dark);
    min-height: calc(100vh - 70px);
    width: 100%;
  }

  /* Special Play Button */
  .play-button-container {
    max-width: 1200px;
    margin: var(--spacing-xl) auto var(--spacing-lg);
    text-align: center;
  }

  .btn-play {
    background: linear-gradient(135deg, var(--mw-primary) 0%, #00aaff 100%);
    color: #000;
    border: 1px solid var(--mw-primary);
    border-radius: var(--radius-sm);
    padding: 1.25rem 3rem;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(0, 243, 255, 0.3);
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    position: relative;
    overflow: hidden;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
    clip-path: polygon(10% 0, 100% 0, 100% 80%, 90% 100%, 0 100%, 0 20%);
  }

  .btn-play::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
    transition: left 0.5s;
    z-index: 10;
  }

  .btn-play:hover::before {
    left: 100%;
  }

  .btn-play:hover {
    transform: scale(1.05);
    box-shadow: 0 0 40px rgba(0, 243, 255, 0.5);
    background: linear-gradient(135deg, #fff 0%, var(--mw-primary) 100%);
  }

  .btn-play:active {
    transform: scale(0.98);
  }

  .play-icon {
    font-size: 1.2rem;
    animation: pulse 2s infinite;
  }

  .validation-error {
    margin-top: 1rem;
    padding: 0.75rem 1.25rem;
    background: rgba(255, 80, 0, 0.2);
    border: 1px solid var(--mw-alert);
    color: var(--mw-alert);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 0.95rem;
    font-weight: 600;
    display: inline-block;
    box-shadow: 0 0 15px rgba(255, 80, 0, 0.3);
    animation: shake 0.5s;
    backdrop-filter: blur(4px);
  }

  h1 {
    text-align: center;
    margin-bottom: var(--spacing-xl);
    font-family: var(--font-display);
    color: var(--mw-primary);
    text-transform: uppercase;
    letter-spacing: 4px;
    text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
    border-bottom: 2px solid var(--mw-border-color);
    padding-bottom: var(--spacing-md);
    position: relative;
    display: inline-block;
    left: 50%;
    transform: translateX(-50%);
  }

  h1::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--mw-primary), transparent);
  }

  .editor-layout {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
  }

  .board-and-palettes {
    display: flex;
    gap: var(--spacing-md);
    align-items: stretch;
    justify-content: center;
    width: 100%;
    max-width: fit-content;
    margin: 0 auto;
    background: rgba(15, 23, 42, 0.6);
    padding: var(--spacing-md);
    border: 1px solid var(--mw-border-color);
    border-radius: var(--radius-md);
    backdrop-filter: blur(10px);
  }

  .palette-section {
    background: var(--mw-bg-panel);
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    width: 240px;
    min-width: 200px;
    flex-shrink: 0;
    border: 1px solid var(--mw-border-color);
    align-self: stretch;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
    position: relative;
    max-height: 80vh;
    overflow-y: auto;
  }

  /* Corner markers for palette */
  .palette-section::before {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    width: 10px;
    height: 10px;
    border-top: 2px solid var(--mw-primary-dim);
    border-left: 2px solid var(--mw-primary-dim);
    pointer-events: none;
  }

  .palette-section::after {
    content: '';
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 10px;
    height: 10px;
    border-bottom: 2px solid var(--mw-primary-dim);
    border-right: 2px solid var(--mw-primary-dim);
    pointer-events: none;
  }

  .left-palette {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
    border-right: none;
  }

  .right-palette {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    border-left: none;
  }

  .palette-section h3 {
    margin: 0 0 1rem 0;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--mw-primary);
    text-align: center;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px dashed var(--mw-border-color);
    padding-bottom: 0.5rem;
  }

  .controls-container {
    background: var(--mw-bg-panel);
    border: 1px solid var(--mw-border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-xl);
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
    position: relative;
  }

  .controls-container::before {
    content: 'SYSTEM CONTROLS';
    position: absolute;
    top: -10px;
    left: 20px;
    background: var(--mw-bg-dark);
    padding: 0 10px;
    color: var(--mw-primary-dim);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    letter-spacing: 2px;
  }

  .board-section {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 1; /* Allow shrinking */
    margin: 0;
    padding: 0 4px;
    background: var(--mw-bg-panel);
    border-top: 1px solid var(--mw-border-color);
    border-bottom: 1px solid var(--mw-border-color);
    overflow: hidden; /* Prevent overflow */
  }

  .board-container {
    /* Use responsive sizing */
    height: min(75vh, 700px);
    width: auto;
    aspect-ratio: 12 / 13;
    max-width: 100%;

    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #000;
    border: none;
    box-shadow: 0 0 50px rgba(0, 243, 255, 0.1);
  }

  /* Ensure minimum size for board rendering */
  @supports (aspect-ratio: 12 / 13) {
    .board-container {
      min-height: 300px;
    }
  }

  /* Fallback for browsers without aspect-ratio support */
  @supports not (aspect-ratio: 1) {
    .board-container {
      height: 600px; /* Fallback fixed height */
      width: calc(600px * 12 / 13);
    }
  }

  .board-container.delete-mode {
    cursor: not-allowed !important;
    box-shadow: 0 0 20px rgba(255, 80, 0, 0.4);
    border: 2px solid var(--mw-alert);
  }

  .board-container.place-mode {
    cursor: crosshair !important;
    box-shadow: 0 0 20px rgba(0, 255, 65, 0.4);
    border: 2px solid var(--mw-secondary);
  }

  .ghost-piece {
    position: fixed;
    pointer-events: none;
    z-index: 1000;
    width: 60px;
    height: 60px;
    transform: translate(-50%, -50%);
    opacity: 0.8;
    filter: drop-shadow(0 0 10px var(--mw-primary));
  }

  .ghost-recycle-bin {
    position: fixed;
    pointer-events: none;
    z-index: 1000;
    transform: translate(-50%, -50%);
    font-size: 2rem;
    filter: drop-shadow(0 0 10px var(--mw-alert));
  }

  /* Updated Control Buttons */
  .button-row {
    display: flex;
    gap: var(--spacing-md);
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: var(--spacing-xl);
    padding-bottom: var(--spacing-lg);
    border-bottom: 1px solid var(--mw-border-color);
  }

  .btn {
    background: rgba(0, 243, 255, 0.05);
    border: 1px solid var(--mw-border-color);
    color: var(--mw-primary);
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:hover:not(:disabled) {
    background: rgba(0, 243, 255, 0.2);
    box-shadow: 0 0 10px var(--mw-primary-dim);
    border-color: var(--mw-primary);
    color: #fff;
  }

  .btn-primary {
    background: rgba(0, 243, 255, 0.15);
    border-color: var(--mw-primary);
    color: #fff;
    font-weight: 700;
  }

  .btn-turn-red {
    background: rgba(255, 80, 0, 0.15);
    border-color: var(--mw-alert);
    color: var(--mw-alert);
  }

  .btn-turn-red:hover {
    background: rgba(255, 80, 0, 0.3);
    box-shadow: 0 0 15px rgba(255, 80, 0, 0.4);
    color: #fff;
  }

  .btn-turn-blue {
    background: rgba(0, 150, 255, 0.15);
    border-color: #0096ff;
    color: #0096ff;
  }

  .btn-turn-blue:hover {
    background: rgba(0, 150, 255, 0.3);
    box-shadow: 0 0 15px rgba(0, 150, 255, 0.4);
    color: #fff;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: var(--color-text-muted);
  }

  /* Input Section */
  .fen-section {
    max-width: 800px;
    margin: 0 auto;
    background: rgba(0, 0, 0, 0.2);
    padding: var(--spacing-md);
    border: 1px solid var(--mw-border-color);
    border-radius: var(--radius-sm);
  }

  .fen-section label {
    display: block;
    margin-bottom: var(--spacing-xs);
    font-family: var(--font-display);
    color: var(--mw-primary);
    font-size: 0.9rem;
  }

  .fen-input-group {
    display: flex;
    gap: var(--spacing-sm);
  }

  .fen-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--mw-border-color);
    color: var(--mw-primary);
    padding: var(--spacing-sm);
    font-family: var(--font-mono);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
  }

  .fen-input:focus {
    outline: none;
    border-color: #007bff;
  }

  .info-section {
    padding-top: 1rem;
    border-top: 1px solid #ddd;
    margin-top: 1rem;
  }

  .info-section h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .info-section ul {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.8rem;
    color: var(--text-secondary, #666);
    line-height: 1.5;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.25rem;
  }

  .info-section li {
    margin-bottom: 0.25rem;
  }

  /* Tablet and below - stack palettes above/below board */
  @media (max-width: 1000px) {
    .board-and-palettes {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      width: 100%;
      max-width: min(600px, calc(100vw - 2rem));
    }

    .left-palette {
      width: 100%;
      border-radius: 8px 8px 0 0 !important;
      border: 2px solid #ddd !important;
      border-bottom: 1px solid #ddd !important;
      order: 1;
    }

    .board-section {
      width: 100%;
      order: 2;
      align-items: center;
    }

    .board-container {
      width: 100% !important;
      max-width: 100%;
      border-radius: 0 !important;
      border-left: 2px solid #ddd;
      border-right: 2px solid #ddd;
      border-top: none;
      border-bottom: none;
      min-height: 300px;
      box-shadow: none;
    }

    .right-palette {
      width: 100%;
      border-radius: 0 0 8px 8px !important;
      border: 2px solid #ddd !important;
      border-top: 1px solid #ddd !important;
      order: 3;
    }

    .controls-container {
      max-width: min(600px, calc(100vw - 2rem));
      margin-top: 1rem;
    }

    .info-section ul {
      grid-template-columns: 1fr;
    }
  }

  /* Mobile landscape and smaller tablets */
  @media (max-width: 768px) {
    .editor-container {
      padding: 0.75rem;
    }

    .board-and-palettes {
      max-width: calc(100vw - 1.5rem);
    }

    .board-container {
      min-height: 280px;
    }

    .controls-container {
      max-width: calc(100vw - 1.5rem);
    }

    .button-row {
      flex-direction: column;
    }

    .button-row .btn {
      width: 100%;
    }

    .fen-input-group {
      flex-direction: column;
    }

    .btn-small {
      width: 100%;
    }

    .btn-play {
      padding: 1rem 2rem;
      font-size: 1.1rem;
    }

    .play-icon {
      font-size: 1.25rem;
    }
  }

  /* Small mobile devices */
  @media (max-width: 480px) {
    .editor-container {
      padding: 0.5rem;
      margin: 0.5rem auto;
    }

    h1 {
      font-size: 1.3rem;
      margin-bottom: 0.75rem;
    }

    .board-and-palettes {
      max-width: calc(100vw - 1rem);
    }

    .board-container {
      min-height: 260px;
    }

    .left-palette,
    .right-palette {
      padding: 0.75rem 0.5rem;
    }

    .palette-section h3 {
      font-size: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .controls-container {
      padding: 0.75rem;
      max-width: calc(100vw - 1rem);
    }

    .info-section ul {
      font-size: 0.7rem;
    }

    .btn {
      padding: 0.6rem 0.8rem;
      font-size: 0.85rem;
    }

    .fen-input {
      font-size: 0.75rem;
    }

    .btn-play {
      padding: 0.9rem 1.75rem;
      font-size: 1rem;
    }

    .play-icon {
      font-size: 1.1rem;
    }

    .validation-error {
      font-size: 0.85rem;
      padding: 0.65rem 1rem;
    }
  }

  /* Very small screens */
  @media (max-width: 360px) {
    .editor-container {
      padding: 0.25rem;
    }

    h1 {
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
    }

    .board-and-palettes {
      max-width: calc(100vw - 0.5rem);
    }

    .board-container {
      min-height: 240px;
      border-width: 1px;
    }

    .left-palette,
    .right-palette {
      padding: 0.5rem 0.25rem;
      border-width: 1px !important;
    }

    .controls-container {
      padding: 0.5rem;
      max-width: calc(100vw - 0.5rem);
    }

    .btn {
      padding: 0.5rem 0.6rem;
      font-size: 0.8rem;
    }
  }
</style>
