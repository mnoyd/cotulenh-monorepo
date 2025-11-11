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
    if (selectedPiece?.role === role && selectedPiece?.color === color && selectedPiece?.promoted === isPromoted) {
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
        <piece class="{selectedPiece.role} {selectedPiece.color}" class:promoted={selectedPiece.promoted}></piece>
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
          <li><strong>Drop Mode:</strong> Click piece in palette to select, then click squares to place</li>
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
    max-width: 1400px;
    margin: 1rem auto;
    padding: 1rem;
  }

  /* Special Play Button */
  .play-button-container {
    max-width: 1200px;
    margin: 2rem auto 1rem;
    text-align: center;
  }

  .btn-play {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 1.25rem 3rem;
    font-size: 1.25rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    position: relative;
    overflow: hidden;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .btn-play::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s;
  }

  .btn-play:hover::before {
    left: 100%;
  }

  .btn-play:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
  }

  .btn-play:active {
    transform: translateY(-1px) scale(1.02);
  }

  .play-icon {
    font-size: 1.5rem;
    display: inline-flex;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .play-text {
    position: relative;
    z-index: 1;
  }

  .validation-error {
    margin-top: 1rem;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: white;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 500;
    display: inline-block;
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
    animation: shake 0.5s;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: var(--text-primary, #333);
  }

  .editor-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .board-and-palettes {
    display: flex;
    gap: 0;
    align-items: stretch;
    justify-content: center;
    width: fit-content;
    margin: 0 auto;
  }

  .palette-section {
    background: var(--bg-secondary, #f5f5f5);
    padding: 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    width: 140px;
    min-width: 120px;
    flex-shrink: 0;
    border: 2px solid #ddd;
    /* Match board height on desktop */
    align-self: stretch;
  }

  .left-palette {
    border-radius: 8px 0 0 8px;
    border-right: none;
  }

  .right-palette {
    border-radius: 0 8px 8px 0;
    border-left: none;
  }

  .palette-section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary, #333);
    text-align: center;
    flex-shrink: 0;
  }

  .controls-container {
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .board-section {
    display: flex;
    justify-content: center;
    align-items: stretch;
    flex-shrink: 0;
  }

  .board-container {
    width: 650px;
    /* Always provide explicit height based on aspect ratio 12:13 */
    aspect-ratio: 12 / 13;
    height: auto;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--bg-primary, white);
    border: 2px solid #ddd;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  /* Ensure minimum size for board rendering */
  @supports (aspect-ratio: 12 / 13) {
    .board-container {
      /* Let aspect-ratio handle the height */
      min-height: 300px;
    }
  }

  /* Fallback for browsers without aspect-ratio support */
  @supports not (aspect-ratio: 1) {
    .board-container {
      height: calc((100vw - 2rem) * 13 / 12);
      max-height: 703px;
      min-height: 300px;
    }
  }

  .board-container.delete-mode {
    cursor: not-allowed !important;
    border-color: #dc3545;
  }

  .board-container.place-mode {
    cursor: crosshair !important;
    border-color: #007bff;
  }

  .ghost-piece {
    position: fixed;
    width: 50px;
    height: 50px;
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    opacity: 0.6;
  }

  .ghost-piece piece {
    display: block;
    width: 100%;
    height: 100%;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }

  .ghost-recycle-bin {
    position: fixed;
    width: 60px;
    height: 60px;
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    opacity: 0.7;
    font-size: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .button-row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .button-row .btn {
    flex: 1;
    min-width: 140px;
  }

  .btn {
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #007bff;
    color: white;
  }

  .btn-primary:hover {
    background: #0056b3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #545b62;
  }

  .btn-small {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
  }

  .btn-danger:hover {
    background: #c82333;
  }

  .btn-turn-red {
    background: #dc3545;
    color: white;
    font-weight: 600;
  }

  .btn-turn-red:hover {
    background: #c82333;
  }

  .btn-turn-blue {
    background: #007bff;
    color: white;
    font-weight: 600;
  }

  .btn-turn-blue:hover {
    background: #0056b3;
  }



  .fen-section {
    margin-bottom: 1.5rem;
  }

  .fen-section label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--text-primary, #333);
  }

  .fen-input-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .fen-input {
    flex: 1;
    padding: 0.6rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.85rem;
    font-family: monospace;
    min-width: 0;
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
