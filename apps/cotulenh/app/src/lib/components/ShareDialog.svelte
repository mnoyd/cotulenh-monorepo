<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { toast } from 'svelte-sonner';

  interface Props {
    open: boolean;
    fen: string;
  }

  let { open = $bindable(), fen }: Props = $props();

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
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="share-dialog">
    <Dialog.Header>
      <Dialog.Title>Share Game</Dialog.Title>
      <Dialog.Description>Share this position with others</Dialog.Description>
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
</style>
