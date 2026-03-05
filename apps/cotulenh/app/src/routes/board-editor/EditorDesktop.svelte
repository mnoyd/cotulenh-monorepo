<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { Trash2 } from 'lucide-svelte';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import PiecePalettesContainer from './PiecePalettesContainer.svelte';
  import { createBoardEditorState } from '$lib/features/board-editor';
  import { getI18n } from '$lib/i18n/index.svelte';

  import '$lib/styles/board.css';
  import '$lib/styles/command-center.css';

  const i18n = getI18n();
  const editor = createBoardEditorState();

  onMount(() => {
    if (!browser) return;
    const urlFen = $page.url.searchParams.get('fen');
    editor.initializeFromUrl(urlFen);
  });

  let tabs = $derived([
    { id: 'pieces', label: i18n.t('tabs.pieces'), content: piecesTab },
    { id: 'setup', label: i18n.t('tabs.setup'), content: setupTab }
  ]);
</script>

<svelte:body onmousemove={editor.handleMouseMove} onclick={editor.cancelSelection} />

<CommandCenter center={centerContent} {tabs} />

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

<!-- Ghost recycle bin in delete mode -->
{#if editor.editorMode === 'delete' && editor.isOverRelevantArea}
  <div
    class="ghost-recycle-bin"
    style="left: {editor.ghostPosition.x}px; top: {editor.ghostPosition.y}px;"
  >
    <Trash2 size={32} />
  </div>
{/if}

{#snippet centerContent()}
  <div class="board-area">
    <div class="board-sizer">
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
        <div class="board-placeholder">
          <span class="text-secondary">{i18n.t('editor.loadingBoard')}</span>
        </div>
      {/if}
    </div>

    <div class="board-actions">
      <button class="text-link" onclick={editor.clearBoard}>{i18n.t('editor.clear')}</button>
      <button class="text-link" onclick={editor.copyFEN}>copy fen</button>
      <button class="text-link" onclick={editor.flipBoard}>{i18n.t('editor.flip')}</button>
    </div>
  </div>
{/snippet}

{#snippet piecesTab()}
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

  <hr class="divider" />

  <div class="editor-controls">
    <button class="text-link" onclick={editor.loadStartingPosition}>{i18n.t('editor.reset')}</button>
    <button class="text-link" onclick={editor.clearBoard}>{i18n.t('editor.clear')}</button>
    <button class="text-link" onclick={editor.flipBoard}>{i18n.t('editor.flip')}</button>
  </div>
{/snippet}

{#snippet setupTab()}
  <div class="setup-tab">
    <span class="section-header">{i18n.t('editor.turn')}</span>
    <button
      class="turn-toggle"
      onclick={editor.toggleTurn}
    >
      <span class="turn-dot {editor.currentTurn}"></span>
      {editor.currentTurn === 'red' ? i18n.t('common.red') : i18n.t('common.blue')}
    </button>

    <hr class="divider" />

    <span class="section-header">{i18n.t('editor.fenPosition')}</span>
    <input
      type="text"
      bind:value={editor.fenInput}
      placeholder={i18n.t('editor.fenPlaceholder')}
      class="fen-input"
    />
    <div class="fen-actions">
      <button class="text-link" onclick={editor.applyFEN}>{i18n.t('editor.apply')}</button>
      <button class="text-link" onclick={editor.copyFEN}>{editor.copyButtonText}</button>
    </div>

    {#if editor.validationError}
      <p class="validation-error">{editor.validationError}</p>
    {/if}

    <hr class="divider" />

    <button
      class="text-link accent"
      onclick={editor.validateAndPlay}
      disabled={!editor.isFenValid}
    >
      {i18n.t('editor.playPosition')}
    </button>

    <hr class="divider" />

    <details class="tips-section">
      <summary class="section-header">Tips</summary>
      <ul class="tips-list">
        <li>{i18n.t('editor.tipDragPieces')}</li>
        <li>{i18n.t('editor.tipClickPiece')}</li>
        <li>{i18n.t('editor.tipClickRemovePieces')}</li>
        <li>{i18n.t('editor.tipTogglePromotionStatus')}</li>
      </ul>
    </details>
  </div>
{/snippet}

<style>
  .board-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-height: 0;
  }

  .board-sizer {
    flex: 1;
    min-height: 0;
    width: 100%;
    container-type: size;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .board-placeholder {
    width: 100%;
    aspect-ratio: 12 / 13;
    background: var(--theme-bg-dark, #111);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
  }

  .board-actions {
    display: flex;
    gap: 0.75rem;
  }

  :global(.board-editor-container.mode-delete) {
    cursor: not-allowed;
  }

  :global(.board-editor-container.mode-drop) {
    cursor: crosshair;
  }

  .editor-controls {
    display: flex;
    gap: 0.75rem;
  }

  .setup-tab {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .turn-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-mono, monospace);
    font-size: 0.8125rem;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0.25rem 0;
  }

  .turn-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .turn-dot.red {
    background: #ef4444;
  }

  .turn-dot.blue {
    background: #3b82f6;
  }

  .fen-input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-primary, #eee);
  }

  .fen-input:focus {
    outline: none;
    border-color: var(--theme-primary, #06b6d4);
  }

  .fen-actions {
    display: flex;
    gap: 0.75rem;
  }

  .validation-error {
    font-size: 0.75rem;
    color: var(--color-error, #ef4444);
    margin: 0;
  }

  .accent {
    color: var(--theme-primary, #06b6d4);
  }

  .tips-section {
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .tips-section summary {
    cursor: pointer;
    list-style: none;
  }

  .tips-section summary::-webkit-details-marker {
    display: none;
  }

  .tips-list {
    margin: 0.25rem 0 0;
    padding-left: 1rem;
    line-height: 1.6;
    color: var(--theme-text-secondary, #aaa);
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
  }

  .ghost-recycle-bin {
    position: fixed;
    z-index: 50;
    pointer-events: none;
    transform: translate(-50%, -50%);
    color: var(--color-error, #ef4444);
  }
</style>
