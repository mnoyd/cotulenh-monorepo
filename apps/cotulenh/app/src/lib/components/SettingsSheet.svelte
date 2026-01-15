<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { toast } from 'svelte-sonner';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { slide } from 'svelte/transition';
  import {
    loadSettings,
    saveSettings as persistSettings,
    DEFAULT_SETTINGS,
    type Settings,
    type ThemeId
  } from '$lib/stores/settings';
  import { playSound, setAudioEnabled, setAudioVolume } from '$lib/utils/audio';
  import { onMount } from 'svelte';
  import X from 'lucide-svelte/icons/x';
  import { cn } from '$lib/utils';

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
    // Optional: immediate preview on mobile might be nice, or stick to save-to-apply
    // For now, sticking to logic from Dialog: modify state, apply on Save.
    // However, the original Dialog calls setTheme immediately on change?
    // Let's check original...
    // Original: onclick={() => handleThemeChange(theme.id)}
    // And handleThemeChange calls themeStore.setTheme(themeId) IMMEDIATELY.
    // And then handleSave calls it again.
    // So yes, immediate effect.
    await themeStore.setTheme(themeId);
  }

  onMount(() => {
    loadFromStorage();
  });
</script>

<DialogPrimitive.Root bind:open>
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <DialogPrimitive.Content
      class={cn(
        'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[90%] flex-col rounded-t-[20px] border border-border bg-background shadow-2xl outline-none transition-transform duration-300 ease-in-out',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom'
      )}
    >
      <!-- Drag Handle Area -->
      <div class="mx-auto mt-4 h-1.5 w-12 rounded-full bg-muted/50" />

      <!-- Header -->
      <div class="px-6 py-4 flex items-center justify-between">
        <div>
          <DialogPrimitive.Title
            class="text-xl font-display font-bold text-foreground uppercase tracking-wide"
          >
            Settings
          </DialogPrimitive.Title>
          <DialogPrimitive.Description class="text-sm text-muted-foreground">
            Configure your experience
          </DialogPrimitive.Description>
        </div>
        <DialogPrimitive.Close
          class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
        >
          <X class="h-6 w-6" />
          <span class="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>

      <Separator />

      <!-- Content - Scrollable -->
      <div class="flex-1 overflow-y-auto px-6 py-6 overscroll-contain">
        <!-- Theme Selection -->
        <div class="setting-section mb-8">
          <h3 class="setting-section-title mb-4">Visual Theme</h3>
          <!-- Mobile Theme Grid: 2 cols? or 1 col? Original was 1 col on mobile. -->
          <div class="theme-grid">
            {#each themeStore.themes as theme}
              <button
                class="theme-option group"
                class:selected={selectedTheme === theme.id}
                class:loading={themeStore.isLoading && selectedTheme === theme.id}
                disabled={themeStore.isLoading}
                onclick={() => handleThemeChange(theme.id)}
              >
                <div class="theme-preview-container">
                  <div class="theme-preview theme-preview-{theme.id}"></div>
                  {#if selectedTheme === theme.id}
                    <div class="selected-badge">
                      <div class="active-dot"></div>
                      ACTIVE
                    </div>
                  {/if}
                </div>
                <div class="theme-info">
                  <span class="theme-name">{theme.name}</span>
                  <span class="theme-desc">{theme.description}</span>
                </div>
                {#if themeStore.isLoading && selectedTheme === theme.id}
                  <div class="loading-overlay">
                    <span class="loading-spinner"></span>
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <Separator class="bg-border mb-8" />

        <!-- Gameplay Settings -->
        <div class="setting-section padding-bottom-safe">
          <h3 class="setting-section-title mb-4">Combat Systems</h3>

          <div class="space-y-4">
            <label class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Sound Effects</span>
                <span class="setting-desc">Enable tactical audio cues</span>
              </div>
              <input type="checkbox" class="t-checkbox" bind:checked={soundsEnabled} />
            </label>

            {#if soundsEnabled}
              <div class="volume-control-panel" transition:slide>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-semibold uppercase text-muted-foreground tracking-wider"
                    >Master Volume</span
                  >
                  <span class="text-xs font-mono text-primary"
                    >{Math.round(soundVolume * 100)}%</span
                  >
                </div>
                <div class="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    bind:value={soundVolume}
                    onchange={() => setAudioVolume(soundVolume)}
                    class="t-slider flex-1"
                  />
                  <button
                    type="button"
                    class="test-sound-btn"
                    onclick={() => {
                      setAudioVolume(soundVolume);
                      playSound('move');
                    }}
                  >
                    TEST
                  </button>
                </div>
              </div>
            {/if}

            <label class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Move Hints</span>
                <span class="setting-desc">Show available moves</span>
              </div>
              <input type="checkbox" class="t-checkbox" bind:checked={showMoveHints} />
            </label>

            <label class="setting-row">
              <div class="setting-info">
                <span class="setting-label">Confirm Reset</span>
                <span class="setting-desc">Confirm mission restart</span>
              </div>
              <input type="checkbox" class="t-checkbox" bind:checked={confirmReset} />
            </label>

            <!-- Add extra padding at bottom for mobile scrolling -->
            <div class="h-24"></div>
          </div>
        </div>
      </div>

      <!-- Footer - Fixed at bottom of sheet container, or just end of flow? 
           For a sheet, usually better to have action button sticky at bottom or just part of scroll.
           Sticky bottom is good for "Apply".
       -->
      <div class="p-6 border-t border-border bg-background pb-safe">
        <Button
          class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wide h-12 text-lg"
          onclick={handleSave}>APPLY CHANGES</Button
        >
      </div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
</DialogPrimitive.Root>

<style>
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 20px);
  }

  /* Reuse styles from SettingsDialog */
  .setting-section-title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .setting-section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, var(--theme-border), transparent);
  }

  /* Theme Grid */
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1rem;
  }

  /* Theme Option Card */
  .theme-option {
    display: flex;
    flex-direction: column;
    text-align: left;
    background: var(--theme-bg-panel);
    border: 1px solid var(--theme-border-subtle);
    border-radius: 0.75rem;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .theme-option:hover {
    border-color: var(--theme-border);
    background: var(--theme-bg-elevated);
    transform: translateY(-2px);
  }

  .theme-option.selected {
    border-color: var(--theme-primary);
    background: color-mix(in srgb, var(--theme-primary) 5%, var(--theme-bg-panel));
    box-shadow: 0 0 20px -5px var(--theme-primary);
  }

  .theme-preview-container {
    width: 100%;
    height: 80px;
    position: relative;
    background: #000;
  }

  .theme-preview {
    width: 100%;
    height: 100%;
    opacity: 0.8;
    transition: opacity 0.3s;
  }
  .theme-option:hover .theme-preview {
    opacity: 1;
  }

  /* Theme Gradients */
  .theme-preview-modern-warfare {
    background: linear-gradient(135deg, #09090b 0%, #0e7490 100%);
  }
  .theme-preview-classic {
    background: linear-gradient(135deg, #292524 0%, #a8a29e 100%);
  }
  .theme-preview-forest {
    background: linear-gradient(135deg, #052e16 0%, #15803d 100%);
  }

  .selected-badge {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    background: var(--theme-primary);
    color: var(--theme-text-inverse);
    font-size: 0.6rem;
    font-weight: 800;
    padding: 0.15rem 0.5rem;
    border-radius: 99px;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  }

  .active-dot {
    width: 4px;
    height: 4px;
    background: var(--theme-text-inverse);
    border-radius: 50%;
  }

  .theme-info {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .theme-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--theme-text-primary);
  }

  .theme-desc {
    font-size: 0.7rem;
    color: var(--theme-text-muted);
    line-height: 1.4;
  }

  /* Setting Row Layout */
  .setting-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: var(--theme-bg-panel);
    border: 1px solid transparent;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background 0.2s;
  }
  .setting-row:hover {
    background: var(--theme-bg-elevated);
    border-color: var(--theme-border-subtle);
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  .setting-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--theme-text-primary);
  }
  .setting-desc {
    font-size: 0.75rem;
    color: var(--theme-text-muted);
  }

  /* Custom Checkbox */
  .t-checkbox {
    appearance: none;
    width: 2.75rem;
    height: 1.5rem;
    background: var(--theme-bg-dark);
    border-radius: 99px;
    position: relative;
    cursor: pointer;
    transition: all 0.3s;
    border: 1px solid var(--theme-border-subtle);
  }
  .t-checkbox::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: calc(1.5rem - 6px);
    height: calc(1.5rem - 6px);
    background: var(--theme-text-muted);
    border-radius: 50%;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .t-checkbox:checked {
    background: var(--theme-primary-dim);
    border-color: var(--theme-primary);
  }
  .t-checkbox:checked::after {
    transform: translateX(1.25rem);
    background: var(--theme-primary);
  }

  /* Volume Panel */
  .volume-control-panel {
    margin: 0.5rem 0 1rem 0;
    padding: 1rem;
    background: var(--theme-bg-dark);
    border-radius: 0.5rem;
    border: 1px solid var(--theme-border-subtle);
  }

  /* Custom Range Slider */
  .t-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: var(--theme-border-subtle);
    border-radius: 2px;
    outline: none;
  }
  .t-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--theme-primary);
    cursor: pointer;
    border: 2px solid var(--theme-bg-dark);
    box-shadow: 0 0 10px var(--theme-primary);
    transition: transform 0.1s;
    margin-top: -6px; /* center vertically because track is 4px */
  }
  .t-slider::-webkit-slider-runnable-track {
    height: 4px;
    background: var(--theme-border-subtle);
    border-radius: 2px;
  }
  .t-slider:active::-webkit-slider-thumb {
    transform: scale(1.2);
  }

  .test-sound-btn {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 0.5rem 0.75rem;
    border-radius: 0.25rem;
    background: var(--theme-bg-panel);
    color: var(--theme-text-muted);
    border: 1px solid var(--theme-border-subtle);
    transition: all 0.2s;
  }
  .test-sound-btn:hover {
    color: var(--theme-primary);
    border-color: var(--theme-primary);
    background: var(--theme-primary-dim);
  }

  /* Loading State */
  .loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
  }
  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
