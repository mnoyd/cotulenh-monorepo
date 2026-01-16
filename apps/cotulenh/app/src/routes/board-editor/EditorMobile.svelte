<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { Trash2, RotateCcw, Eraser, ArrowUpDown, Copy, Play, ChevronUp, ChevronDown } from 'lucide-svelte';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import PiecePalette from './PiecePalette.svelte';
  import PaletteControls from './PaletteControls.svelte';
  import { createBoardEditorState } from '$lib/features/board-editor';
  import { getI18n } from '$lib/i18n/index.svelte';

  import '$lib/styles/board.css';

  const i18n = getI18n();
  const editor = createBoardEditorState();

  // Reactive translations for aria-labels
  let tResetToStarting = $derived.by(() => i18n.t('a11y.resetToStarting'));
  let tClearBoard = $derived.by(() => i18n.t('a11y.clearBoard'));
  let tFlipBoard = $derived.by(() => i18n.t('a11y.flipBoard'));
  let tToggleTurn = $derived.by(() => i18n.t('a11y.toggleTurn'));
  let tCurrentTurn = $derived.by(() => i18n.t('a11y.currentTurn'));
  let tPiecePalettePanel = $derived.by(() => i18n.t('a11y.piecePalettePanel'));
  let tCollapsePiecePalette = $derived.by(() => i18n.t('a11y.collapsePiecePalette'));
  let tExpandPiecePalette = $derived.by(() => i18n.t('a11y.expandPiecePalette'));
  let tSelectTeamPieces = $derived.by(() => i18n.t('a11y.selectTeamPieces'));
  let tRedTeamPieces = $derived.by(() => i18n.t('a11y.redTeamPieces'));
  let tBlueTeamPieces = $derived.by(() => i18n.t('a11y.blueTeamPieces'));
  let tRed = $derived.by(() => i18n.t('common.red'));
  let tBlue = $derived.by(() => i18n.t('common.blue'));

  let bottomSheetExpanded = $state(true);
  let activeTeam = $state<'red' | 'blue'>('red');
  let showFenPanel = $state(false);

  $effect(() => {
    if (bottomSheetExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  });

  onMount(() => {
    if (!browser) return;
    
    const urlFen = $page.url.searchParams.get('fen');
    editor.initializeFromUrl(urlFen);
  });

  function toggleBottomSheet() {
    bottomSheetExpanded = !bottomSheetExpanded;
  }

  function handleTouchMove(e: TouchEvent) {
    if (editor.selectedPiece || editor.editorMode === 'delete') {
      const touch = e.touches[0];
      editor.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }
  }
</script>

<svelte:body
  ontouchmove={handleTouchMove}
  onmousemove={editor.handleMouseMove}
  onclick={editor.cancelSelection}
/>

<main class="editor-mobile">
  <!-- Compact Header -->
  <header class="mobile-header">
    <h1>
      <span class="text-mw-secondary">{i18n.t('editor.board')}</span>
      <span class="text-mw-primary font-light">{i18n.t('editor.title')}</span>
    </h1>
    <div class="header-actions">
      <button
        class="header-btn"
        class:active={showFenPanel}
        onclick={() => (showFenPanel = !showFenPanel)}
        title="FEN"
      >
        FEN
      </button>
    </div>
  </header>

  <!-- FEN Panel (slides down when active) -->
  {#if showFenPanel}
    <div class="fen-panel">
      <input
        type="text"
        bind:value={editor.fenInput}
        placeholder={i18n.t('editor.fenPlaceholder')}
        class="fen-input"
      />
      <div class="fen-actions">
        <button class="fen-btn" onclick={editor.applyFEN}>{i18n.t('editor.apply')}</button>
        <button class="fen-btn" onclick={editor.copyFEN}>
          <Copy size={14} />
          {editor.copyButtonText}
        </button>
      </div>
      {#if editor.validationError}
        <div class="validation-error">⚠️ {editor.validationError}</div>
      {/if}
    </div>
  {/if}

  <!-- Board Section - Takes remaining space -->
  <section class="board-section">
    {#if editor.initialFen}
      <BoardContainer
        config={editor.createEditorConfig()}
        onApiReady={editor.handleBoardReady}
        onDestroy={editor.handleBoardDestroy}
        class="board-editor-container
             {editor.editorMode === 'delete' ? 'mode-delete' : ''}
             {editor.selectedPiece !== null && editor.editorMode !== 'delete' ? 'mode-drop' : ''}"
      />
    {:else}
      <div class="board-loading">
        <p>{i18n.t('editor.loadingBoard')}</p>
      </div>
    {/if}
  </section>

  <!-- Bottom Sheet -->
  <div
    class="bottom-sheet"
    class:expanded={bottomSheetExpanded}
    role="region"
    aria-label={tPiecePalettePanel}
  >
    <!-- Handle bar -->
    <button
      class="sheet-handle"
      onclick={toggleBottomSheet}
      aria-label={bottomSheetExpanded ? tCollapsePiecePalette : tExpandPiecePalette}
    >
      <div class="handle-bar"></div>
      {#if bottomSheetExpanded}
        <ChevronDown size={16} />
      {:else}
        <ChevronUp size={16} />
      {/if}
    </button>

    <!-- Quick Actions Bar (always visible) -->
    <div class="quick-actions">
      <PaletteControls
        heroicMode={editor.heroicMode}
        editorMode={editor.editorMode}
        onHandModeToggle={editor.toggleHandMode}
        onDeleteModeToggle={editor.toggleDeleteMode}
        onHeroicToggle={editor.toggleHeroicMode}
      />

      <div class="action-divider"></div>

      <button
        class="action-btn"
        onclick={editor.loadStartingPosition}
        title={tResetToStarting}
        aria-label={tResetToStarting}
      >
        <RotateCcw size={18} />
      </button>
      <button
        class="action-btn"
        onclick={editor.clearBoard}
        title={tClearBoard}
        aria-label={tClearBoard}
      >
        <Eraser size={18} />
      </button>
      <button
        class="action-btn"
        onclick={editor.flipBoard}
        title={tFlipBoard}
        aria-label={tFlipBoard}
      >
        <ArrowUpDown size={18} />
      </button>

      <div class="action-divider"></div>

      <button
        class="turn-btn-compact {editor.currentTurn}"
        onclick={editor.toggleTurn}
        title="{tToggleTurn}: {editor.currentTurn === 'red' ? tRed : tBlue}"
        aria-label="{tToggleTurn}. {tCurrentTurn.replace('{color}', editor.currentTurn === 'red' ? tRed : tBlue)}"
      >
        <span class="turn-dot {editor.currentTurn}"></span>
      </button>
    </div>

    <!-- Expandable Content -->
    {#if bottomSheetExpanded}
      <div class="sheet-content">
        <!-- Team Tabs -->
        <div class="team-tabs" role="tablist" aria-label={tSelectTeamPieces}>
          <button
            class="team-tab red"
            class:active={activeTeam === 'red'}
            onclick={() => (activeTeam = 'red')}
            role="tab"
            aria-selected={activeTeam === 'red'}
            aria-label={tRedTeamPieces}
          >
            🔴 {i18n.t('common.red')}
          </button>
          <button
            class="team-tab blue"
            class:active={activeTeam === 'blue'}
            onclick={() => (activeTeam = 'blue')}
            role="tab"
            aria-selected={activeTeam === 'blue'}
            aria-label={tBlueTeamPieces}
          >
            🔵 {i18n.t('common.blue')}
          </button>
        </div>

        <!-- Piece Palette -->
        <div class="palette-area">
          {#if activeTeam === 'red'}
            <PiecePalette
              boardApi={editor.boardApi}
              color="red"
              onPieceSelect={editor.handlePieceSelect}
              selectedPiece={editor.selectedPiece}
              heroicMode={editor.heroicMode}
              compact={true}
            />
          {:else}
            <PiecePalette
              boardApi={editor.boardApi}
              color="blue"
              onPieceSelect={editor.handlePieceSelect}
              selectedPiece={editor.selectedPiece}
              heroicMode={editor.heroicMode}
              compact={true}
            />
          {/if}
        </div>

        <!-- Play Button -->
        <button
          class="play-btn"
          onclick={editor.validateAndPlay}
          disabled={!editor.isFenValid}
        >
          <Play size={18} />
          {i18n.t('common.play')}
        </button>
      </div>
    {/if}
  </div>

  <!-- Ghost piece -->
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

  <!-- Ghost recycle bin -->
  {#if editor.editorMode === 'delete' && editor.isOverRelevantArea}
    <div
      class="ghost-recycle-bin"
      style="left: {editor.ghostPosition.x}px; top: {editor.ghostPosition.y}px;"
    >
      <Trash2 size={28} />
    </div>
  {/if}
</main>

<style lang="postcss">
  @reference "../../app.css";

  .editor-mobile {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--color-mw-bg-dark);
  }

  /* Header */
  .mobile-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    padding-left: 60px; /* Space for mobile menu button */
    border-bottom: 1px solid var(--color-mw-border);
    background: var(--color-mw-bg-panel);
  }

  .mobile-header h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .header-btn {
    padding: 0.35rem 0.75rem;
    font-family: var(--font-ui);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    background: rgba(0, 243, 255, 0.1);
    border: 1px solid var(--color-mw-border);
    color: var(--color-mw-primary);
    border-radius: 4px;
    cursor: pointer;
  }

  .header-btn.active {
    background: rgba(0, 243, 255, 0.25);
    border-color: var(--color-mw-primary);
  }

  /* FEN Panel */
  .fen-panel {
    flex-shrink: 0;
    padding: 0.75rem;
    background: var(--color-mw-bg-panel);
    border-bottom: 1px solid var(--color-mw-border);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .fen-input {
    width: 100%;
    padding: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--color-mw-border);
    color: var(--color-mw-primary);
    border-radius: 4px;
  }

  .fen-input:focus {
    outline: none;
    border-color: var(--color-mw-secondary);
  }

  .fen-actions {
    display: flex;
    gap: 0.5rem;
  }

  .fen-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.4rem 0.25rem;
    font-family: var(--font-ui);
    font-size: 0.65rem;
    font-weight: 500;
    text-transform: uppercase;
    background: rgba(0, 243, 255, 0.1);
    border: 1px solid var(--color-mw-border);
    color: var(--color-mw-primary);
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .validation-error {
    padding: 0.4rem;
    font-size: 0.7rem;
    font-weight: 600;
    background: rgba(255, 171, 0, 0.1);
    border: 1px solid var(--color-mw-alert);
    color: var(--color-mw-alert);
    border-radius: 4px;
    text-align: center;
  }

  /* Board Section */
  .board-section {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
    container-type: size;
    padding: 0.5rem;
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
    transition: box-shadow 0.2s, border-color 0.2s;
  }

  .board-section :global(.board-editor-container.mode-delete)::after {
    border-color: var(--color-mw-alert);
    box-shadow: 0 0 15px rgba(255, 171, 0, 0.4);
  }

  .board-section :global(.board-editor-container.mode-drop)::after {
    border-color: var(--color-mw-secondary);
    box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
  }

  .board-loading {
    color: var(--color-mw-primary);
    font-size: 0.9rem;
  }

  /* Bottom Sheet */
  .bottom-sheet {
    flex-shrink: 0;
    background: var(--color-mw-bg-panel);
    border-top: 1px solid var(--color-mw-border);
    transition: max-height 0.3s ease;
    max-height: 60px;
    overflow: hidden;
  }

  .bottom-sheet.expanded {
    max-height: 45vh;
  }

  .sheet-handle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.35rem;
    background: transparent;
    border: none;
    color: #666;
    cursor: pointer;
  }

  .handle-bar {
    width: 40px;
    height: 4px;
    background: #444;
    border-radius: 2px;
  }

  /* Quick Actions */
  .quick-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0 0.75rem 0.5rem;
    flex-wrap: wrap;
  }

  .action-divider {
    width: 1px;
    height: 24px;
    background: var(--color-mw-border);
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(0, 243, 255, 0.05);
    border: 1px solid var(--color-mw-border);
    color: var(--color-mw-primary);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn:hover,
  .action-btn:active {
    background: rgba(0, 243, 255, 0.15);
  }

  .turn-btn-compact {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .turn-btn-compact.red {
    background: rgba(255, 107, 107, 0.15);
    border: 1px solid rgba(255, 107, 107, 0.5);
  }

  .turn-btn-compact.blue {
    background: rgba(77, 171, 247, 0.15);
    border: 1px solid rgba(77, 171, 247, 0.5);
  }

  .turn-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
  }

  .turn-dot.red {
    background: #ff6b6b;
  }

  .turn-dot.blue {
    background: #4dabf7;
  }

  /* Sheet Content */
  .sheet-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0 0.75rem 0.75rem;
    overflow-y: auto;
    max-height: calc(45vh - 100px);
  }

  /* Team Tabs */
  .team-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .team-tab {
    padding: 0.5rem 0.25rem;
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #666;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .team-tab.red.active {
    background: rgba(255, 107, 107, 0.15);
    border-color: #ff6b6b;
    color: #ff6b6b;
  }

  .team-tab.blue.active {
    background: rgba(77, 171, 247, 0.15);
    border-color: #4dabf7;
    color: #4dabf7;
  }

  /* Palette Area */
  .palette-area {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    padding: 0.5rem;
  }

  /* Play Button */
  .play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    background: linear-gradient(135deg, var(--color-mw-primary), #00aaff);
    border: 1px solid var(--color-mw-primary);
    color: #000;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 0 10px rgba(0, 243, 255, 0.3);
  }

  .play-btn:disabled {
    background: rgba(128, 128, 128, 0.3);
    border-color: rgba(128, 128, 128, 0.5);
    color: #666;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* Ghost elements */
  .ghost-piece {
    position: fixed;
    z-index: 100;
    width: 44px;
    height: 44px;
    opacity: 0.85;
    pointer-events: none;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 0 8px var(--color-mw-primary));
  }

  .ghost-recycle-bin {
    position: fixed;
    z-index: 100;
    pointer-events: none;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 0 8px var(--color-mw-alert));
    color: var(--color-mw-alert);
  }
</style>
