<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { toast } from 'svelte-sonner';
  import { CoTuLenh } from '@cotulenh/core';
  import { gameState } from '$lib/stores/game.svelte';

  interface Props {
    open: boolean;
    fen: string;
    game?: CoTuLenh | null;
    onGameLoaded?: (game: CoTuLenh) => void;
  }

  let { open = $bindable(), fen, game = null, onGameLoaded }: Props = $props();

  let pgnInput = $state('');
  let showImport = $state(false);
  let fileInput: HTMLInputElement;

  async function copyFen() {
    try {
      await navigator.clipboard.writeText(fen);
      toast.success('FEN copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }

  function copyShareUrl() {
    const url = `${window.location.origin}/?fen=${encodeURIComponent(fen)}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied!');
  }

  async function copyPgn() {
    if (!game) {
      toast.error('No game available');
      return;
    }
    try {
      const pgn = game.pgn();
      await navigator.clipboard.writeText(pgn);
      toast.success('PGN copied to clipboard');
    } catch {
      toast.error('Failed to copy PGN');
    }
  }

  function downloadPgn() {
    if (!game) {
      toast.error('No game available');
      return;
    }
    try {
      const pgn = game.pgn();
      const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cotulenh-game-${new Date().toISOString().split('T')[0]}.pgn`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PGN downloaded');
    } catch {
      toast.error('Failed to download PGN');
    }
  }

  function loadPgnFromText() {
    if (!pgnInput.trim()) {
      toast.error('Please paste PGN text first');
      return;
    }

    try {
      const newGame = new CoTuLenh();
      newGame.loadPgn(pgnInput);
      gameState.initialize(newGame);

      if (onGameLoaded) {
        onGameLoaded(newGame);
      }

      toast.success('Game loaded from PGN');
      pgnInput = '';
      showImport = false;
      open = false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to load PGN: ${message}`);
    }
  }

  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        pgnInput = content;
        loadPgnFromText();
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);

    // Reset file input
    target.value = '';
  }

  function triggerFileUpload() {
    fileInput?.click();
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="share-dialog">
    <Dialog.Header>
      <Dialog.Title>Share & Import Game</Dialog.Title>
      <Dialog.Description>Share this position or load a saved game</Dialog.Description>
    </Dialog.Header>

    <div class="share-content">
      <div class="share-section">
        <span class="share-label">FEN String</span>
        <code class="fen-display">{fen}</code>
        <Button variant="secondary" size="sm" onclick={copyFen}>Copy FEN</Button>
      </div>

      <Separator />

      <div class="share-section">
        <span class="share-label">Share URL</span>
        <p class="share-desc">Copy a shareable link that will load this position when opened</p>
        <Button variant="default" onclick={copyShareUrl}>Copy Share Link</Button>
      </div>

      {#if game}
        <Separator />

        <div class="share-section">
          <span class="share-label">PGN Export</span>
          <p class="share-desc">Export game notation (includes headers and move history)</p>
          <div class="button-row">
            <Button variant="secondary" size="sm" onclick={copyPgn}>Copy PGN</Button>
            <Button variant="outline" size="sm" onclick={downloadPgn}>Download PGN</Button>
          </div>
        </div>
      {/if}

      <Separator />

      <div class="share-section">
        <span class="share-label">PGN Import</span>
        <p class="share-desc">Load a game from PGN file or text to review moves</p>

        {#if showImport}
          <textarea
            class="pgn-input"
            placeholder="Paste PGN text here..."
            bind:value={pgnInput}
            rows="6"
          ></textarea>
          <div class="button-row">
            <Button variant="default" size="sm" onclick={loadPgnFromText}>Load Game</Button>
            <Button variant="outline" size="sm" onclick={() => (showImport = false)}>Cancel</Button>
          </div>
        {:else}
          <div class="button-row">
            <Button variant="secondary" size="sm" onclick={() => (showImport = true)}>
              Paste PGN
            </Button>
            <Button variant="outline" size="sm" onclick={triggerFileUpload}>
              Upload .pgn File
            </Button>
          </div>
        {/if}

        <input
          bind:this={fileInput}
          type="file"
          accept=".pgn,text/plain"
          class="hidden"
          onchange={handleFileUpload}
        />
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .share-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem 0;
  }

  .share-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .share-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-mw-primary);
    font-family: var(--font-display);
  }

  .share-desc {
    font-size: 0.875rem;
    color: #94a3b8;
    font-family: var(--font-ui);
  }

  .fen-display {
    display: block;
    padding: 0.75rem;
    background: var(--color-mw-bg-dark);
    border: 1px solid var(--color-mw-border);
    border-radius: 0.25rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    word-break: break-all;
    color: #e5e5e5;
    max-height: 80px;
    overflow-y: auto;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
  }

  .pgn-input {
    width: 100%;
    padding: 0.75rem;
    background: var(--color-mw-bg-dark);
    border: 1px solid var(--color-mw-border);
    border-radius: 0.25rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: #e5e5e5;
    resize: vertical;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
  }

  .pgn-input::placeholder {
    color: #64748b;
  }

  .pgn-input:focus {
    outline: none;
    border-color: var(--color-mw-primary);
    box-shadow:
      inset 0 0 10px rgba(0, 0, 0, 0.5),
      0 0 5px rgba(0, 243, 255, 0.3);
  }

  .button-row {
    display: flex;
    gap: 0.5rem;
  }

  .hidden {
    display: none;
  }
</style>
