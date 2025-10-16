<script lang="ts">
  import { onMount } from 'svelte';
  import { CotulenhBoard } from '@repo/cotulenh-board';
  import type { Api, Piece, Role, Color } from '@repo/cotulenh-board';
  import PiecePalette from './PiecePalette.svelte';

  import '@repo/cotulenh-board/assets/commander-chess.base.css';
  import '@repo/cotulenh-board/assets/commander-chess.pieces.css';
  import '@repo/cotulenh-board/assets/commander-chess.clasic.css';

  let boardContainerElement: HTMLElement | null = null;
  let boardApi: Api | null = null;
  let fenInput = '';
  let copyButtonText = 'Copy FEN';
  let boardOrientation: 'red' | 'blue' = 'red';
  let deleteMode = false;
  let selectedPiece: { role: Role; color: Color } | null = null;
  let ghostPosition = { x: 0, y: 0 };
  let showGhost = false;
  
  // Special marker for delete mode
  const DELETE_MARKER: Piece = { role: 'commander', color: 'red' };

  // Initial empty board FEN
  const EMPTY_FEN = '11/11/11/11/11/11/11/11/11/11/11/11';
  const STARTING_FEN = '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4 r - - 0 1';

  function updateFEN() {
    if (boardApi) {
      fenInput = boardApi.getFen();
    }
  }

  function applyFEN() {
    if (boardApi && fenInput) {
      try {
        boardApi.set({ 
          fen: fenInput,
          lastMove: undefined 
        });
      } catch (error) {
        alert('Invalid FEN: ' + error);
      }
    }
  }

  function clearBoard() {
    if (boardApi) {
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

  function toggleDeleteMode() {
    if (!boardApi) return;
    
    // Toggle delete mode only if clicking the same button
    if (deleteMode) {
      console.log('Disabling delete mode');
      deleteMode = false;
      // Disable dropmode
      boardApi.state.dropmode = { active: false };
      document.body.style.cursor = 'default';
    } else {
      console.log('Enabling delete mode with marker:', DELETE_MARKER);
      deleteMode = true;
      selectedPiece = null;
      showGhost = false;
      // Enable dropmode with delete marker
      boardApi.state.dropmode = {
        active: true,
        piece: DELETE_MARKER
      };
      console.log('Dropmode state:', boardApi.state.dropmode);
      document.body.style.cursor = 'not-allowed';
    }
  }

  function handlePieceSelect(role: Role, color: Color) {
    if (!boardApi) return;
    
    // Toggle selection if clicking the same piece
    if (selectedPiece?.role === role && selectedPiece?.color === color) {
      selectedPiece = null;
      showGhost = false;
      // Disable dropmode
      boardApi.state.dropmode = { active: false };
      document.body.style.cursor = 'default';
    } else {
      selectedPiece = { role, color };
      deleteMode = false;
      showGhost = true;
      // Enable dropmode with the selected piece
      boardApi.state.dropmode = {
        active: true,
        piece: { role, color }
      };
      document.body.style.cursor = 'default';
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (selectedPiece || deleteMode) {
      ghostPosition = { x: e.clientX, y: e.clientY };
    }
  }

  function handleAfterNewPiece(role: Role, key: string) {
    if (!boardApi) return;
    
    console.log('afterNewPiece:', role, 'at', key, 'deleteMode:', deleteMode);
    
    // Check if this was a delete action (using our marker)
    if (deleteMode && role === DELETE_MARKER.role) {
      console.log('Delete mode detected! Removing piece at', key);
      // Remove the marker piece that was just placed AND any existing piece
      boardApi.state.pieces.delete(key);
      boardApi.state.lastMove = undefined; // Clear last move highlight
      boardApi.redrawAll();
      updateFEN();
      // Keep delete mode active for multiple deletions
    } else {
      // Normal piece placement
      console.log('Normal placement:', role, 'at', key);
      boardApi.state.lastMove = undefined; // Don't highlight in editor
      updateFEN();
      // Keep selection active for multiple placements
    }
  }

  function cancelSelection(e: MouseEvent) {
    if (!boardApi) return;
    
    // Only cancel if clicking outside the board and palettes
    const target = e.target as HTMLElement;
    if (target.closest('.board-container') || 
        target.closest('.palette-section') || 
        target.closest('.controls-container')) {
      return;
    }
    
    selectedPiece = null;
    showGhost = false;
    deleteMode = false;
    // Disable dropmode
    boardApi.state.dropmode = { active: false };
    document.body.style.cursor = 'default';
  }

  function loadStartingPosition() {
    if (boardApi) {
      boardApi.set({ 
        fen: STARTING_FEN,
        lastMove: undefined 
      });
      updateFEN();
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
      alert('Screenshot feature requires html2canvas library.\n\nInstall it with: pnpm add html2canvas --filter cotulenh-app');
    }
  }

  onMount(() => {
    if (boardContainerElement) {
      console.log('Initializing board editor...');

      boardApi = CotulenhBoard(boardContainerElement, {
        fen: EMPTY_FEN,
        orientation: 'red',
        turnColor: 'red',
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

      updateFEN();

      return () => {
        console.log('Cleaning up board editor.');
        document.body.style.cursor = 'default';
        if (boardApi) {
          boardApi.state.dropmode = { active: false };
        }
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
          />
        </div>

        <!-- Board Container -->
        <div class="board-section">
          <div 
            bind:this={boardContainerElement} 
            class="board-container"
            class:delete-mode={deleteMode}
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
          />
        </div>
      </div>
    </div>

    <!-- Ghost piece that follows mouse -->
    {#if showGhost && selectedPiece}
      <div 
        class="ghost-piece cg-wrap"
        style="left: {ghostPosition.x}px; top: {ghostPosition.y}px;"
      >
        <piece class="{selectedPiece.role} {selectedPiece.color}"></piece>
      </div>
    {/if}

    <!-- Ghost recycle bin that follows mouse in delete mode -->
    {#if deleteMode}
      <div 
        class="ghost-recycle-bin"
        style="left: {ghostPosition.x}px; top: {ghostPosition.y}px;"
      >
        🗑️
      </div>
    {/if}

    <!-- Controls Section at Bottom -->
    <div class="controls-container">
      <div class="button-row">
        <button class="btn btn-primary" on:click={loadStartingPosition}>
          Starting Position
        </button>
        <button class="btn btn-secondary" on:click={clearBoard}>
          Clear Board
        </button>
        <button class="btn btn-secondary" on:click={flipBoard}>
          Flip Board
        </button>
        <button 
          class="btn" 
          class:btn-danger={deleteMode}
          class:btn-secondary={!deleteMode}
          on:click={toggleDeleteMode}
        >
          🗑️ {deleteMode ? 'Delete Mode ON' : 'Delete Mode'}
        </button>
        <button class="btn btn-secondary" on:click={screenshot}>
          Screenshot
        </button>
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
          <button class="btn btn-small" on:click={applyFEN}>
            Apply
          </button>
          <button class="btn btn-small" on:click={copyFEN}>
            {copyButtonText}
          </button>
        </div>
      </div>

      <div class="info-section">
        <h4>Instructions</h4>
        <ul>
          <li><strong>Drag</strong> pieces from palette to board</li>
          <li><strong>Click</strong> piece to select, then click squares to place multiple</li>
          <li><strong>Click same piece</strong> again to deselect</li>
          <li><strong>Delete Mode:</strong> Click 🗑️, then click pieces to delete multiple</li>
          <li><strong>Drag</strong> pieces on board to move them</li>
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
  }

  .palette-section {
    background: var(--bg-secondary, #f5f5f5);
    padding: 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    width: 140px;
    border: 2px solid #ddd;
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
    align-items: center;
  }

  .board-container {
    width: 650px;
    aspect-ratio: 12 / 13;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--bg-primary, white);
    border: 2px solid #ddd;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

  @media (max-width: 1200px) {
    .board-and-palettes {
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .left-palette,
    .right-palette {
      width: 100%;
      max-width: 600px;
      border-radius: 8px !important;
      border: 2px solid #ddd !important;
    }

    .board-container {
      width: 100%;
      max-width: 600px;
      border-radius: 8px;
    }

    .controls-container {
      max-width: 600px;
    }

    .info-section ul {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .board-container {
      width: 100%;
      max-width: 450px;
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
  }
</style>
