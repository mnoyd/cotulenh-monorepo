<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { toast } from 'svelte-sonner';

  const i18n = getI18n();

  interface Props {
    open: boolean;
    fen: string;
  }

  let { open = $bindable(), fen }: Props = $props();

  async function copyFen() {
    try {
      await navigator.clipboard.writeText(fen);
      toast.success(i18n.t('share.fenCopied'));
    } catch {
      toast.error(i18n.t('share.copyFailed'));
    }
  }

  function copyShareUrl() {
    const url = `${window.location.origin}/?fen=${encodeURIComponent(fen)}`;
    navigator.clipboard.writeText(url);
    toast.success(i18n.t('share.linkCopied'));
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="share-dialog">
    <Dialog.Header>
      <Dialog.Title>{i18n.t('share.title')}</Dialog.Title>
      <Dialog.Description>{i18n.t('share.description')}</Dialog.Description>
    </Dialog.Header>

    <div class="share-content">
      <div class="share-section">
        <span class="share-label">{i18n.t('share.fenString')}</span>
        <code class="fen-display">{fen}</code>
        <Button variant="secondary" size="sm" onclick={copyFen}>{i18n.t('share.copyFen')}</Button>
      </div>

      <Separator />

      <div class="share-section">
        <span class="share-label">{i18n.t('share.shareUrl')}</span>
        <p class="share-desc">{i18n.t('share.shareUrlDesc')}</p>
        <Button variant="default" onclick={copyShareUrl}>{i18n.t('share.copyLink')}</Button>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>{i18n.t('common.close')}</Button>
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
