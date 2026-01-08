<script lang="ts">
  import { browser } from '$app/environment';
  import * as Dialog from '$lib/components/ui/dialog';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { toast } from 'svelte-sonner';
  import { isObject } from '$lib/types/type-guards';
  import { themeStore, type ThemeId } from '$lib/stores/theme.svelte';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  // Radar effect types
  export type RadarEffectType = 'off' | 'minimal' | 'pulse' | 'scan';

  // Settings interface for type safety
  interface Settings {
    soundsEnabled: boolean;
    showMoveHints: boolean;
    confirmReset: boolean;
    theme: ThemeId;
    radarEffect: RadarEffectType;
  }

  // Default settings
  const DEFAULT_SETTINGS: Settings = {
    soundsEnabled: true,
    showMoveHints: true,
    confirmReset: true,
    theme: 'modern-warfare',
    radarEffect: 'pulse'
  };

  // Settings state with localStorage persistence
  let soundsEnabled = $state(DEFAULT_SETTINGS.soundsEnabled);
  let showMoveHints = $state(DEFAULT_SETTINGS.showMoveHints);
  let confirmReset = $state(DEFAULT_SETTINGS.confirmReset);
  let selectedTheme = $state<ThemeId>(themeStore.current);
  let radarEffect = $state<RadarEffectType>(DEFAULT_SETTINGS.radarEffect);

  /**
   * Validates settings object from localStorage
   */
  function validateSettings(data: unknown): Settings {
    if (!isObject(data)) {
      throw new Error('Settings must be an object');
    }

    const validRadarEffects: RadarEffectType[] = ['off', 'minimal', 'pulse', 'scan'];

    return {
      soundsEnabled:
        typeof data.soundsEnabled === 'boolean'
          ? data.soundsEnabled
          : DEFAULT_SETTINGS.soundsEnabled,
      showMoveHints:
        typeof data.showMoveHints === 'boolean'
          ? data.showMoveHints
          : DEFAULT_SETTINGS.showMoveHints,
      confirmReset:
        typeof data.confirmReset === 'boolean' ? data.confirmReset : DEFAULT_SETTINGS.confirmReset,
      theme:
        typeof data.theme === 'string' && themeStore.themes.some((t) => t.id === data.theme)
          ? (data.theme as ThemeId)
          : DEFAULT_SETTINGS.theme,
      radarEffect:
        typeof data.radarEffect === 'string' &&
        validRadarEffects.includes(data.radarEffect as RadarEffectType)
          ? (data.radarEffect as RadarEffectType)
          : DEFAULT_SETTINGS.radarEffect
    };
  }

  function loadSettings() {
    if (!browser) return;

    const saved = localStorage.getItem('cotulenh_settings');
    if (!saved) {
      selectedTheme = themeStore.current;
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      const validated = validateSettings(parsed);

      soundsEnabled = validated.soundsEnabled;
      showMoveHints = validated.showMoveHints;
      confirmReset = validated.confirmReset;
      selectedTheme = themeStore.current;
      radarEffect = validated.radarEffect;
    } catch (e) {
      console.error('Failed to load settings, using defaults:', e);
      // Reset to defaults on error
      soundsEnabled = DEFAULT_SETTINGS.soundsEnabled;
      showMoveHints = DEFAULT_SETTINGS.showMoveHints;
      confirmReset = DEFAULT_SETTINGS.confirmReset;
      selectedTheme = themeStore.current;
      radarEffect = DEFAULT_SETTINGS.radarEffect;
    }
  }

  async function saveSettings() {
    if (!browser) return;
    const settings: Settings = {
      soundsEnabled,
      showMoveHints,
      confirmReset,
      theme: selectedTheme,
      radarEffect
    };
    localStorage.setItem('cotulenh_settings', JSON.stringify(settings));

    // Apply theme change (async)
    await themeStore.setTheme(selectedTheme);

    // Apply radar effect to document
    if (browser) {
      document.documentElement.setAttribute('data-radar-effect', radarEffect);
    }

    toast.success('Settings saved');
    open = false;
  }

  async function handleThemeChange(themeId: ThemeId) {
    selectedTheme = themeId;
    // Preview theme immediately (async with loading state)
    await themeStore.setTheme(themeId);
  }

  // Load settings when component mounts (browser only)
  onMount(() => {
    loadSettings();
  });

  // Apply radar effect when it changes
  $effect(() => {
    if (browser) {
      document.documentElement.setAttribute('data-radar-effect', radarEffect);
    }
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

      <!-- Performance Settings -->
      <div class="setting-section">
        <h3 class="setting-section-title">Performance</h3>

        <div class="setting-item-vertical">
          <label class="setting-label">Radar Effect</label>
          <div class="radio-group">
            <label class="radio-item">
              <input type="radio" name="radar" value="off" bind:group={radarEffect} />
              <div class="radio-item-content">
                <span>Off</span>
                <small>No effects (best performance)</small>
              </div>
            </label>
            <label class="radio-item">
              <input type="radio" name="radar" value="minimal" bind:group={radarEffect} />
              <div class="radio-item-content">
                <span>Minimal</span>
                <small>Beautiful static tactical design</small>
              </div>
            </label>
            <label class="radio-item">
              <input type="radio" name="radar" value="pulse" bind:group={radarEffect} />
              <div class="radio-item-content">
                <span>Pulse</span>
                <small>Pulsing effect (recommended)</small>
              </div>
            </label>
            <label class="radio-item">
              <input type="radio" name="radar" value="scan" bind:group={radarEffect} />
              <div class="radio-item-content">
                <span>Scan</span>
                <small>Full radar scan (high-end only)</small>
              </div>
            </label>
          </div>
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
      <Button onclick={saveSettings}>Save Settings</Button>
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

  .setting-item-vertical {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .setting-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-text-primary);
    font-family: var(--font-ui);
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .radio-item {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--theme-border-subtle);
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .radio-item:hover {
    border-color: var(--theme-border);
    background: var(--theme-primary-dim);
  }

  .radio-item:has(input:checked) {
    border-color: var(--theme-primary);
    background: var(--theme-primary-dim);
  }

  .radio-item input[type='radio'] {
    width: 1.25rem;
    height: 1.25rem;
    margin-top: 0.125rem;
    accent-color: var(--theme-primary);
    cursor: pointer;
    flex-shrink: 0;
  }

  .radio-item-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .radio-item span {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--theme-text-primary);
  }

  .radio-item small {
    font-size: 0.7rem;
    color: var(--theme-text-muted);
    line-height: 1.3;
  }

  @media (max-width: 480px) {
    .theme-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
