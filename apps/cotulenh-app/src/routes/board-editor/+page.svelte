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
  import '$lib/styles/modern-warfare.css';

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
      // Extra safety check for layout shifts
      setTimeout(ensureBoardSize, 500);

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
  <div class="editor-container max-w-[1600px] mx-auto p-6 min-h-[calc(100vh-70px)] w-full">
    <h1
      class="text-center mb-8 font-display text-white text-3xl font-bold uppercase tracking-[4px] relative inline-block left-1/2 -translate-x-1/2 pb-4 border-b border-mw-border"
    >
      <span class="text-mw-secondary">Board</span>
      <span class="text-mw-primary font-light">Editor</span>
    </h1>

    <div class="editor-layout flex flex-col gap-6 mb-8">
      <div
        class="board-and-palettes flex gap-4 items-stretch justify-center w-full max-w-fit mx-auto bg-mw-bg-panel p-4 border border-mw-border rounded-sm backdrop-blur-md flex-col lg:flex-row shadow-2xl"
      >
        <!-- Left Palette -->
        <div
          class="palette-section bg-black/40 p-4 flex flex-col w-[240px] min-w-[200px] shrink-0 border border-mw-border/50 relative max-h-[80vh] overflow-y-auto lg:w-[240px] w-full rounded-sm"
        >
          <h3
            class="font-display font-semibold text-mw-primary text-center uppercase tracking-wider border-b border-mw-border/50 pb-2 mb-4 text-sm"
          >
            {boardOrientation === 'red' ? 'Blue' : 'Red'} Pieces
          </h3>
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
        <div
          class="board-section flex justify-center items-center grow min-w-0 p-1 bg-black/60 border border-mw-border/50 rounded-sm overflow-hidden lg:w-auto w-full"
        >
          <div
            bind:this={boardContainerElement}
            class="board-container cg-wrap relative flex justify-center items-center bg-black border-none transition-all
                   aspect-[11/12] w-[calc(85vh*11/12)] max-w-full mx-auto
                   {editorMode === 'delete'
              ? 'cursor-not-allowed ring-2 ring-mw-alert shadow-[0_0_20px_rgba(255,171,0,0.4)]'
              : ''}
                   {selectedPiece !== null && editorMode !== 'delete'
              ? 'cursor-crosshair ring-2 ring-mw-secondary shadow-[0_0_20px_rgba(0,255,65,0.4)]'
              : ''}
                   {!editorMode && !selectedPiece ? 'shadow-[0_0_30px_rgba(0,243,255,0.05)]' : ''}"
          >
            {#if !boardApi}<p class="text-mw-primary">Loading board...</p>{/if}
          </div>
        </div>

        <!-- Right Palette -->
        <div
          class="palette-section bg-black/40 p-4 flex flex-col w-[240px] min-w-[200px] shrink-0 border border-mw-border/50 relative max-h-[80vh] overflow-y-auto lg:w-[240px] w-full rounded-sm"
        >
          <h3
            class="font-display font-semibold text-mw-primary text-center uppercase tracking-wider border-b border-mw-border/50 pb-2 mb-4 text-sm"
          >
            {boardOrientation === 'red' ? 'Red' : 'Blue'} Pieces
          </h3>
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
    <div class="play-button-container max-w-[1200px] mx-auto my-8 text-center">
      <button
        class="group relative inline-flex items-center gap-3 overflow-hidden rounded-sm px-10 py-4 font-display text-xl font-bold uppercase tracking-widest text-black shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] active:scale-95 bg-gradient-to-br from-mw-primary to-[#00aaff] border border-mw-primary"
        on:click={validateAndPlay}
      >
        <span
          class="absolute top-0 left-[-100%] z-10 h-full w-full bg-linear-to-r from-transparent via-[rgba(255,255,255,0.5)] to-transparent transition-[left] duration-500 group-hover:left-full"
        ></span>
        <span class="animate-pulse">▶</span>
        <span class="drop-shadow-sm">Play This Position</span>
      </button>
      {#if validationError}
        <div
          class="validation-error mt-4 inline-block rounded-sm border border-mw-alert bg-mw-alert/10 px-5 py-3 font-ui font-semibold text-mw-alert shadow-[0_0_15px_rgba(255,171,0,0.2)] backdrop-blur-sm animate-[shake_0.5s]"
        >
          ⚠️ {validationError}
        </div>
      {/if}
    </div>

    <!-- Controls Section at Bottom -->
    <div
      class="controls-container bg-mw-bg-panel border border-mw-border rounded-sm p-8 max-w-[1200px] mx-auto w-full shadow-2xl relative mt-8"
    >
      <div
        class="absolute -top-3 left-6 px-3 bg-black text-mw-border text-xs font-mono tracking-widest uppercase"
      >
        System_Controls
      </div>

      <div
        class="button-row flex gap-4 flex-wrap justify-center border-b border-mw-border/50 pb-6 mb-8"
      >
        <button
          class="px-6 py-2 rounded-sm font-ui uppercase tracking-widest transition-all bg-mw-primary/5 border border-mw-border text-mw-primary hover:bg-mw-primary/20 hover:text-white"
          on:click={loadStartingPosition}
        >
          Starting Position
        </button>
        <button
          class="px-6 py-2 rounded-sm font-ui uppercase tracking-widest transition-all bg-mw-primary/5 border border-mw-border text-mw-primary hover:bg-mw-primary/20 hover:text-white"
          on:click={clearBoard}
        >
          Clear Board
        </button>
        <button
          class="px-6 py-2 rounded-sm font-ui uppercase tracking-widest transition-all bg-mw-primary/5 border border-mw-border text-mw-primary hover:bg-mw-primary/20 hover:text-white"
          on:click={flipBoard}
        >
          Flip Board
        </button>
        <button
          class="px-6 py-2 rounded-sm font-ui uppercase tracking-widest transition-all border
                 {currentTurn === 'red'
            ? 'bg-amber-500/10 border-mw-alert text-mw-alert hover:bg-mw-alert/20 hover:text-white'
            : 'bg-blue-500/10 border-blue-500 text-blue-500 hover:bg-blue-500/20 hover:text-white'}"
          on:click={toggleTurn}
        >
          Turn: {currentTurn === 'red' ? '🔴 Red' : '🔵 Blue'}
        </button>
        <button
          class="px-6 py-2 rounded-sm font-ui uppercase tracking-widest transition-all bg-mw-primary/5 border border-mw-border text-mw-primary opacity-50 cursor-not-allowed"
          on:click={screenshot}
          disabled
        >
          Screenshot
        </button>
      </div>

      <div
        class="fen-section max-w-[800px] mx-auto bg-black/30 p-4 border border-mw-border/50 rounded-sm"
      >
        <label for="fen-input" class="block mb-2 font-display text-mw-primary text-sm font-semibold"
          >FEN Position:</label
        >
        <div class="fen-input-group flex gap-2 flex-col md:flex-row">
          <input
            id="fen-input"
            type="text"
            bind:value={fenInput}
            placeholder="Enter FEN string..."
            class="fen-input flex-1 bg-black/50 border border-mw-border text-mw-primary p-2 font-mono rounded-sm text-sm focus:outline-none focus:border-mw-secondary transition-colors"
          />
          <button
            class="px-4 py-2 rounded-sm font-ui uppercase text-sm bg-mw-primary/10 border border-mw-border text-mw-primary hover:bg-mw-primary/20 hover:text-white transition-colors"
            on:click={applyFEN}
          >
            Apply
          </button>
          <button
            class="px-4 py-2 rounded-sm font-ui uppercase text-sm bg-mw-primary/10 border border-mw-border text-mw-primary hover:bg-mw-primary/20 hover:text-white transition-colors"
            on:click={copyFEN}
          >
            {copyButtonText}
          </button>
        </div>
      </div>

      <div class="info-section pt-4 border-t border-mw-border/30 mt-6">
        <h4 class="mb-2 text-sm font-semibold text-slate-400 font-display uppercase tracking-wider">
          Instructions
        </h4>
        <ul
          class="text-xs text-slate-500 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-2 list-disc pl-4"
        >
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
  /* Local styles for complex animations or specific overrides not easily handled by Tailwind */
  @reference "../../app.css";

  .ghost-piece {
    @apply fixed z-50 w-[60px] h-[60px] opacity-80 pointer-events-none;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 0 10px var(--color-mw-primary));
  }

  .ghost-recycle-bin {
    @apply fixed z-50 text-4xl pointer-events-none;
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

  .animate-pulse {
    animation: pulse 2s infinite;
  }
</style>
