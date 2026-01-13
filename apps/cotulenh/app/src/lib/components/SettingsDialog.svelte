<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { toast } from 'svelte-sonner';
  import { themeStore } from '$lib/stores/theme.svelte';
  import {
    loadSettings,
    saveSettings as persistSettings,
    DEFAULT_SETTINGS,
    type Settings,
    type ThemeId
  } from '$lib/stores/settings';
  import { playSound, setAudioEnabled, setAudioVolume } from '$lib/utils/audio';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  let soundsEnabled = $state(DEFAULT_SETTINGS.soundsEnabled);
  let soundVolume = $state(DEFAULT_SETTINGS.soundVolume);
  let showMoveHints = $state(DEFAULT_SETTINGS.showMoveHints);
  let confirmReset = $state(DEFAULT_SETTINGS.confirmReset);
  let selectedTheme = $state<ThemeId>(themeStore.current);

  function loadFromStorage() {
    const settings = loadSettings();
    soundsEnabled = settings.soundsEnabled;
    soundVolume = settings.soundVolume;
    showMoveHints = settings.showMoveHints;
    confirmReset = settings.confirmReset;
    selectedTheme = settings.theme;

    setAudioEnabled(settings.soundsEnabled);
    setAudioVolume(settings.soundVolume);
  }

  async function handleSave() {
    const settings: Settings = {
      soundsEnabled,
      soundVolume,
      showMoveHints,
      confirmReset,
      theme: selectedTheme
    };
    persistSettings(settings);

    setAudioEnabled(soundsEnabled);
    setAudioVolume(soundVolume);

    await themeStore.setTheme(selectedTheme);

    toast.success('Settings saved');
    open = false;
  }

  async function handleThemeChange(themeId: ThemeId) {
    selectedTheme = themeId;
    await themeStore.setTheme(themeId);
  }

  onMount(() => {
    loadFromStorage();
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="settings-dialog">
    <Dialog.Header>
      <Dialog.Title>Settings</Dialog.Title>
      <Dialog.Description>Configure your game experience</Dialog.Description>
    </Dialog.Header>

    <div class="settings-content">
      <!-- Theme Selection -->
      <div class="setting-section">
        <h3 class="setting-section-title">Theme</h3>
        <div class="theme-grid">
          {#each themeStore.themes as theme}
            <button
              class="theme-option"
              class:selected={selectedTheme === theme.id}
              class:loading={themeStore.isLoading && selectedTheme === theme.id}
              disabled={themeStore.isLoading}
              onclick={() => handleThemeChange(theme.id)}
            >
              <div class="theme-preview theme-preview-{theme.id}"></div>
              <span class="theme-name">{theme.name}</span>
              <span class="theme-desc">{theme.description}</span>
              {#if themeStore.isLoading && selectedTheme === theme.id}
                <span class="loading-indicator">Loading...</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <Separator />

      <!-- Gameplay Settings -->
      <div class="setting-section">
        <h3 class="setting-section-title">Gameplay</h3>

        <label class="setting-item">
          <input type="checkbox" bind:checked={soundsEnabled} />
          <span>Sound Effects</span>
        </label>

        {#if soundsEnabled}
          <div class="setting-item volume-control">
            <span>Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              bind:value={soundVolume}
              onchange={() => setAudioVolume(soundVolume)}
              class="volume-slider"
            />
            <span class="volume-value">{Math.round(soundVolume * 100)}%</span>
            <button
              type="button"
              class="test-sound-btn"
              onclick={() => {
                setAudioVolume(soundVolume);
                playSound('move');
              }}
            >
              Test
            </button>
          </div>
        {/if}

        <label class="setting-item">
          <input type="checkbox" bind:checked={showMoveHints} />
          <span>Show Move Hints</span>
        </label>

        <label class="setting-item">
          <input type="checkbox" bind:checked={confirmReset} />
          <span>Confirm Before Reset</span>
        </label>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button onclick={handleSave}>Save Settings</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .settings-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1rem 0;
  }

  .setting-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .setting-section-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-text-secondary);
    margin: 0;
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: transparent;
    border: 1px solid var(--theme-border-subtle);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .theme-option:hover {
    border-color: var(--theme-border);
    background: var(--theme-primary-dim);
  }

  .theme-option.selected {
    border-color: var(--theme-primary);
    background: var(--theme-primary-dim);
    box-shadow: var(--theme-glow-primary);
  }

  .theme-option:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .theme-option.loading {
    position: relative;
  }

  .loading-indicator {
    font-size: 0.6rem;
    color: var(--theme-primary);
    opacity: 0.8;
  }

  .theme-preview {
    width: 100%;
    height: 32px;
    border-radius: 0.25rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .theme-preview-modern-warfare {
    background: linear-gradient(135deg, #050a14 0%, #00f3ff 50%, #00ff41 100%);
  }

  .theme-preview-classic {
    background: linear-gradient(135deg, #262421 0%, #b58863 50%, #f0d9b5 100%);
  }

  .theme-preview-forest {
    background: linear-gradient(135deg, #0a1f0a 0%, #4ade80 50%, #86efac 100%);
  }

  .theme-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--theme-text-primary);
  }

  .theme-desc {
    font-size: 0.65rem;
    color: var(--theme-text-muted);
    text-align: center;
    line-height: 1.3;
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
    background: var(--theme-primary-dim);
  }

  .setting-item input[type='checkbox'] {
    width: 1.25rem;
    height: 1.25rem;
    accent-color: var(--theme-primary);
    cursor: pointer;
  }

  .setting-item span {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-text-primary);
    font-family: var(--font-ui);
  }

  .volume-control {
    padding-left: 2rem;
  }

  .volume-slider {
    flex: 1;
    height: 4px;
    accent-color: var(--theme-primary);
    cursor: pointer;
  }

  .volume-value {
    min-width: 3rem;
    text-align: right;
    font-size: 0.75rem;
    color: var(--theme-text-secondary);
  }

  .test-sound-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 500;
    background: var(--theme-primary-dim);
    border: 1px solid var(--theme-border-subtle);
    border-radius: 0.25rem;
    color: var(--theme-text-primary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .test-sound-btn:hover {
    background: var(--theme-primary);
    border-color: var(--theme-primary);
  }

  @media (max-width: 480px) {
    .theme-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
