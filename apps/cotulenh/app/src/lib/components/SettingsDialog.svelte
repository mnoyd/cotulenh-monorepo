<script lang="ts">
  import { browser } from '$app/environment';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { toast } from 'svelte-sonner';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  // Settings state with localStorage persistence
  let soundsEnabled = $state(true);
  let showMoveHints = $state(true);
  let confirmReset = $state(true);

  function loadSettings() {
    if (!browser) return;
    const saved = localStorage.getItem('cotulenh_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        soundsEnabled = settings.soundsEnabled ?? true;
        showMoveHints = settings.showMoveHints ?? true;
        confirmReset = settings.confirmResetReset ?? true;
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }

  function saveSettings() {
    if (!browser) return;
    const settings = {
      soundsEnabled,
      showMoveHints,
      confirmReset
    };
    localStorage.setItem('cotulenh_settings', JSON.stringify(settings));
    toast.success('Settings saved');
    open = false;
  }

  // Load settings when component mounts (browser only)
  $effect(() => {
    loadSettings();
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="settings-dialog">
    <Dialog.Header>
      <Dialog.Title>Settings</Dialog.Title>
      <Dialog.Description>Configure your game experience</Dialog.Description>
    </Dialog.Header>

    <div class="settings-content">
      <label class="setting-item">
        <input type="checkbox" bind:checked={soundsEnabled} />
        <span>Sound Effects</span>
      </label>

      <Separator />

      <label class="setting-item">
        <input type="checkbox" bind:checked={showMoveHints} />
        <span>Show Move Hints</span>
      </label>

      <Separator />

      <label class="setting-item">
        <input type="checkbox" bind:checked={confirmReset} />
        <span>Confirm Before Reset</span>
      </label>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={saveSettings}>Save Settings</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .settings-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 0;
  }

  .setting-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.25rem;
    transition: background 0.2s;
  }

  .setting-item:hover {
    background: rgba(0, 243, 255, 0.1);
  }

  .setting-item input[type='checkbox'] {
    width: 1.25rem;
    height: 1.25rem;
    accent-color: var(--color-mw-primary);
    cursor: pointer;
  }

  .setting-item span {
    font-size: 0.875rem;
    font-weight: 500;
    color: #e5e5e5;
    font-family: var(--font-ui);
  }
</style>
