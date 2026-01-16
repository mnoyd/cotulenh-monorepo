<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  const i18n = getI18n();

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  const shortcuts = [
    { key: 'Z', action: i18n.t('shortcuts.undoMove') },
    { key: 'Y', action: i18n.t('shortcuts.redoMove') },
    { key: 'R', action: i18n.t('shortcuts.resetGame') },
    { key: 'Esc', action: i18n.t('shortcuts.cancelDeploy') },
    { key: '←/→', action: i18n.t('shortcuts.navigateHistory') },
    { key: '?', action: i18n.t('shortcuts.showHelp') }
  ];
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="shortcuts-dialog">
    <Dialog.Header>
      <Dialog.Title>⌨️ {i18n.t('shortcuts.title')}</Dialog.Title>
      <Dialog.Description>{i18n.t('shortcuts.description')}</Dialog.Description>
    </Dialog.Header>

    <div class="shortcuts-list">
      {#each shortcuts as shortcut}
        <div class="shortcut-item">
          <kbd class="shortcut-key">{shortcut.key}</kbd>
          <span class="shortcut-action">{shortcut.action}</span>
        </div>
      {/each}
    </div>

    <Dialog.Footer>
      <Button onclick={() => (open = false)}>{i18n.t('shortcuts.gotIt')}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .shortcuts-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem 0;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
  }

  .shortcut-key {
    min-width: 3rem;
    padding: 0.25rem 0.5rem;
    background: rgba(0, 243, 255, 0.1);
    border: 1px solid var(--color-mw-primary);
    border-radius: 0.25rem;
    text-align: center;
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--color-mw-primary);
    box-shadow: 0 0 8px rgba(0, 243, 255, 0.2);
    text-shadow: 0 0 5px rgba(0, 243, 255, 0.5);
  }

  .shortcut-action {
    font-size: 0.8rem;
    color: #94a3b8;
    font-family: var(--font-ui);
    flex: 1;
    min-width: 0;
  }
</style>
