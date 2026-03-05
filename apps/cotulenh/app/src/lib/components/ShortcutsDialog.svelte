<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import * as Dialog from '$lib/components/ui/dialog';

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
      <Dialog.Title>{i18n.t('shortcuts.title')}</Dialog.Title>
      <Dialog.Description>{i18n.t('shortcuts.description')}</Dialog.Description>
    </Dialog.Header>

    <div class="shortcuts-list">
      {#each shortcuts as shortcut}
        <div class="shortcut-row">
          <kbd class="shortcut-key">{shortcut.key}</kbd>
          <span class="shortcut-action">{shortcut.action}</span>
        </div>
      {/each}
    </div>

    <div class="dialog-actions">
      <button class="action-link" onclick={() => (open = false)}>{i18n.t('shortcuts.gotIt')}</button>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  .shortcuts-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem 0;
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.25rem 0;
  }

  .shortcut-key {
    min-width: 2.5rem;
    padding: 0.125rem 0.375rem;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #333);
    text-align: center;
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    font-size: 0.8125rem;
    color: var(--theme-text-primary, #eee);
  }

  .shortcut-action {
    font-size: 0.8125rem;
    color: var(--theme-text-secondary, #aaa);
    flex: 1;
    min-width: 0;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.5rem;
  }

  .action-link {
    background: none;
    border: none;
    color: var(--theme-primary, #06b6d4);
    font-size: 0.8125rem;
    cursor: pointer;
    padding: 0.25rem 0;
  }

  .action-link:hover {
    text-decoration: underline;
  }
</style>
