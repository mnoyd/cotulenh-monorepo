<script lang="ts">
  import { browser } from '$app/environment';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { toast } from 'svelte-sonner';
  import { isObject } from '$lib/types/type-guards';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  // Settings interface for type safety
  interface Settings {
    soundsEnabled: boolean;
    showMoveHints: boolean;
    confirmReset: boolean;
  }

  // Default settings
  const DEFAULT_SETTINGS: Settings = {
    soundsEnabled: true,
    showMoveHints: true,
    confirmReset: true
  };

  // Settings state with localStorage persistence
  let soundsEnabled = $state(DEFAULT_SETTINGS.soundsEnabled);
  let showMoveHints = $state(DEFAULT_SETTINGS.showMoveHints);
  let confirmReset = $state(DEFAULT_SETTINGS.confirmReset);

  /**
   * Validates settings object from localStorage
   */
  function validateSettings(data: unknown): Settings {
    if (!isObject(data)) {
      throw new Error('Settings must be an object');
    }

    return {
      soundsEnabled: typeof data.soundsEnabled === 'boolean' 
        ? data.soundsEnabled 
        : DEFAULT_SETTINGS.soundsEnabled,
      showMoveHints: typeof data.showMoveHints === 'boolean'
        ? data.showMoveHints
        : DEFAULT_SETTINGS.showMoveHints,
      confirmReset: typeof data.confirmReset === 'boolean'
        ? data.confirmReset
        : DEFAULT_SETTINGS.confirmReset
    };
  }

  function loadSettings() {
    if (!browser) return;
    
    const saved = localStorage.getItem('cotulenh_settings');
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      const validated = validateSettings(parsed);
      
      soundsEnabled = validated.soundsEnabled;
      showMoveHints = validated.showMoveHints;
      confirmReset = validated.confirmReset;
    } catch (e) {
      console.error('Failed to load settings, using defaults:', e);
      // Reset to defaults on error
      soundsEnabled = DEFAULT_SETTINGS.soundsEnabled;
      showMoveHints = DEFAULT_SETTINGS.showMoveHints;
      confirmReset = DEFAULT_SETTINGS.confirmReset;
    }
  }

  function saveSettings() {
    if (!browser) return;
    const settings: Settings = {
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
