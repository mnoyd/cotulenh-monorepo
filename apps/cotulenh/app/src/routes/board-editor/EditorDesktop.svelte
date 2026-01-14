<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Trash2, Hand, Star } from 'lucide-svelte';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import PiecePalettesContainer from './PiecePalettesContainer.svelte';
  import { createBoardEditorState } from '$lib/features/board-editor';

  import '$lib/styles/board.css';

  const editor = createBoardEditorState();

  onMount(() => {
    const urlFen = $page.url.searchParams.get('fen');
    editor.initializeFromUrl(urlFen);
  });
</script>

<svelte:body onmousemove={editor.handleMouseMove} onclick={editor.cancelSelection} />

<main class="editor-page">
  <!-- Header -->
  <header class="editor-header">
    <h1>
      <span class="text-mw-secondary">Board</span>
      <span class="text-mw-primary font-light">Editor</span>
    </h1>
  </header>

  <div class="editor-layout">
    <!-- Board and Sidebar wrapper -->
    <div class="board-wrapper">
      <!-- Board Section -->
      <section class="board-section">
        {#if editor.initialFen}
          <BoardContainer
            config={editor.createEditorConfig()}
            onApiReady={editor.handleBoardReady}
            onDestroy={editor.handleBoardDestroy}
            class="board-editor-container
                 {editor.editorMode === 'delete' ? 'mode-delete' : ''}
                 {editor.selectedPiece !== null && editor.editorMode !== 'delete'
              ? 'mode-drop'
              : ''}"
          />
        {:else}
          <div class="board-container">
            <p class="text-mw-primary">Loading board...</p>
          </div>
        {/if}
      </section>

      <!-- Piece Panel (next to board) -->
      <aside class="editor-panel">
        <!-- Palettes Container -->
        <PiecePalettesContainer
          boardApi={editor.boardApi}
          selectedPiece={editor.selectedPiece}
          heroicMode={editor.heroicMode}
          editorMode={editor.editorMode}
          onPieceSelect={editor.handlePieceSelect}
          onHandModeToggle={editor.toggleHandMode}
          onDeleteModeToggle={editor.toggleDeleteMode}
          onHeroicToggle={editor.toggleHeroicMode}
        />

        <!-- Controls Section -->
        <div class="controls-section">
          <div class="control-row">
            <button
              class="ctrl-btn"
              onclick={editor.loadStartingPosition}
              title="Reset to starting position"
            >
              ↺ Reset
            </button>
            <button class="ctrl-btn" onclick={editor.clearBoard} title="Clear all pieces">
              🧹 Clear
            </button>
            <button class="ctrl-btn" onclick={editor.flipBoard} title="Flip board orientation">
              ⇅ Flip
            </button>
          </div>

          <button
            class="turn-btn {editor.currentTurn}"
            onclick={editor.toggleTurn}
            title="Toggle current turn"
          >
            <span class="turn-indicator {editor.currentTurn}"></span>
            Turn: {editor.currentTurn === 'red' ? 'Red' : 'Blue'}
          </button>
        </div>

        <!-- FEN Section -->
        <div class="fen-section">
          <label for="fen-input">FEN Position</label>
          <input
            id="fen-input"
            type="text"
            bind:value={editor.fenInput}
            placeholder="Enter FEN string..."
            class="fen-input"
          />
          <div class="fen-buttons">
            <button class="fen-btn" onclick={editor.applyFEN}>Apply</button>
            <button class="fen-btn" onclick={editor.copyFEN}>{editor.copyButtonText}</button>
          </div>
        </div>

        <!-- Play Button -->
        <button class="play-btn" onclick={editor.validateAndPlay} disabled={!editor.isFenValid}>
          <span class="play-icon">▶</span>
          Play This Position
        </button>

        {#if editor.validationError}
          <div class="validation-error">
            ⚠️ {editor.validationError}
          </div>
        {/if}

        <!-- Quick Tips (collapsible) -->
        <details class="tips-section">
          <summary>Quick Tips</summary>
          <ul>
            <li class="flex items-center gap-1">
              <strong><Hand size={14} class="inline" /> Hand:</strong> Drag pieces on board
            </li>
            <li class="flex items-center gap-1">
              <strong>Click piece:</strong> Select, then click to place
            </li>
            <li class="flex items-center gap-1">
              <strong><Trash2 size={14} class="inline" /> Delete:</strong> Click to remove pieces
            </li>
            <li class="flex items-center gap-1">
              <strong><Star size={14} class="inline" /> Heroic:</strong> Toggle promotion status
            </li>
          </ul>
        </details>
      </aside>
    </div>
  </div>

  <!-- Ghost piece that follows mouse -->
  {#if editor.showGhost && editor.selectedPiece && editor.isOverRelevantArea}
    <div
      class="ghost-piece cg-wrap"
      style="left: {editor.ghostPosition.x}px; top: {editor.ghostPosition.y}px;"
    >
      <piece
        class="{editor.selectedPiece.role} {editor.selectedPiece.color}"
        class:heroic={editor.selectedPiece.promoted}
      ></piece>
    </div>
  {/if}

  <!-- Ghost recycle bin that follows mouse in delete mode -->
  {#if editor.editorMode === 'delete' && editor.isOverRelevantArea}
    <div
      class="ghost-recycle-bin"
      style="left: {editor.ghostPosition.x}px; top: {editor.ghostPosition.y}px;"
    >
      <Trash2 size={32} />
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
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: 0;
    overflow: hidden;
    padding: 1rem;
  }

  .board-wrapper {
    display: flex;
    gap: 1rem;
    align-items: stretch;
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
    container-type: size;
    width: 600px;
    height: 650px;
    flex-shrink: 0;
  }

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

  .board-section :global(.board-editor-container) {
    width: min(100cqw, 100cqh * 12 / 13);
    height: min(100cqh, 100cqw * 13 / 12);
    border-radius: 4px;
  }

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
  .editor-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-mw-bg-panel);
    border: 1px solid var(--color-mw-border);
    border-radius: 4px;
    overflow-y: auto;
    overflow-x: hidden;
    width: 320px;
    flex-shrink: 0;
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

  .play-btn:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 0 25px rgba(0, 243, 255, 0.5);
  }

  .play-btn:disabled {
    background: rgba(128, 128, 128, 0.3);
    border-color: rgba(128, 128, 128, 0.5);
    color: #666;
    cursor: not-allowed;
    box-shadow: none;
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
    pointer-events: none;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 0 10px var(--color-mw-alert));
    color: var(--color-mw-alert);
  }
</style>
