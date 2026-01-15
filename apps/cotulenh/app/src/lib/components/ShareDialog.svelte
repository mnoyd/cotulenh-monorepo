<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { toast } from 'svelte-sonner';
  import type { GameSession } from '$lib/game-session.svelte';

  interface Props {
    open: boolean;
    fen: string;
    session: GameSession;
  }

  let { open = $bindable(), fen, session }: Props = $props();
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

  function downloadPGN() {
    session.exportPGN();
  }

  function triggerFileUpload() {
    fileInput?.click();
  }

  async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    const success = await session.importPGNFile(file);
    
    if (success) {
      // Close dialog after successful import
      open = false;
    }

    // Reset input so same file can be uploaded again
    target.value = '';
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="share-dialog">
    <Dialog.Header>
      <Dialog.Title>Share & Export Game</Dialog.Title>
      <Dialog.Description>Share this position or export/import game data</Dialog.Description>
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

      <Separator />

      <div class="share-section">
        <span class="share-label">PGN Export/Import</span>
        <p class="share-desc">Download or upload game in PGN format (includes all moves and metadata)</p>
        <div class="pgn-buttons">
          <Button variant="default" onclick={downloadPGN}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PGN
          </Button>
          
          <Button variant="secondary" onclick={triggerFileUpload}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload PGN
          </Button>
        </div>
        
        <!-- Hidden file input -->
        <input
          bind:this={fileInput}
          type="file"
          accept=".pgn"
          onchange={handleFileUpload}
          style="display: none;"
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

  .pgn-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .pgn-buttons :global(button) {
    flex: 1;
    min-width: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .pgn-buttons :global(button svg) {
    width: 16px;
    height: 16px;
  }
</style>
