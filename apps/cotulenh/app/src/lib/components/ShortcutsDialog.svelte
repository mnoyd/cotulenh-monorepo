<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  const shortcuts = [
    { key: 'Z', action: 'Undo last move' },
    { key: 'Y', action: 'Redo move' },
    { key: 'R', action: 'Reset game' },
    { key: 'Esc', action: 'Cancel deployment' },
    { key: '←/→', action: 'Navigate move history' },
    { key: '?', action: 'Show this help' }
  ];
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="shortcuts-dialog">
    <Dialog.Header>
      <Dialog.Title>⌨️ Keyboard Shortcuts</Dialog.Title>
      <Dialog.Description>Master these shortcuts for faster play</Dialog.Description>
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
      <Button onclick={() => (open = false)}>Got it!</Button>
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
    font-size: 0.875rem;
    color: #94a3b8;
    font-family: var(--font-ui);
  }
</style>
