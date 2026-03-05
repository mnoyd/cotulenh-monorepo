<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { onMount } from 'svelte';
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
  import { getI18n, LOCALES, type Locale, type TranslationKey } from '$lib/i18n/index.svelte';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  const i18n = getI18n();

  let soundsEnabled = $state(DEFAULT_SETTINGS.soundsEnabled);
  let soundVolume = $state(DEFAULT_SETTINGS.soundVolume);
  let showMoveHints = $state(DEFAULT_SETTINGS.showMoveHints);
  let confirmReset = $state(DEFAULT_SETTINGS.confirmReset);
  let showDeployButtons = $state(DEFAULT_SETTINGS.showDeployButtons);
  let autoCompleteDeploy = $state(DEFAULT_SETTINGS.autoCompleteDeploy);
  let selectedTheme = $state<ThemeId>(themeStore.current);
  let selectedLocale = $state<Locale>(i18n.locale);

  const themeNameKeys: Record<ThemeId, TranslationKey> = {
    'modern-warfare': 'settings.theme.modernWarfare.name',
    'desert-ops': 'settings.theme.desertOps.name',
    classic: 'settings.theme.classic.name',
    forest: 'settings.theme.forest.name'
  };

  function loadFromStorage() {
    const settings = loadSettings();
    soundsEnabled = settings.soundsEnabled;
    soundVolume = settings.soundVolume;
    showMoveHints = settings.showMoveHints;
    confirmReset = settings.confirmReset;
    showDeployButtons = settings.showDeployButtons;
    autoCompleteDeploy = settings.autoCompleteDeploy;
    selectedTheme = settings.theme;
    selectedLocale = i18n.locale;

    setAudioEnabled(settings.soundsEnabled);
    setAudioVolume(settings.soundVolume);
  }

  async function handleSave() {
    const settings: Settings = {
      soundsEnabled,
      soundVolume,
      showMoveHints,
      confirmReset,
      showDeployButtons,
      autoCompleteDeploy,
      theme: selectedTheme
    };
    persistSettings(settings);

    setAudioEnabled(soundsEnabled);
    setAudioVolume(soundVolume);

    await themeStore.setTheme(selectedTheme);
    i18n.setLocale(selectedLocale);

    toast.success(i18n.t('settings.saved'));
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
      <Dialog.Title>{i18n.t('settings.title')}</Dialog.Title>
      <Dialog.Description>{i18n.t('settings.description')}</Dialog.Description>
    </Dialog.Header>

    <div class="settings-content">
      <!-- Language -->
      <div class="setting-section">
        <h3 class="setting-section-title">{i18n.t('settings.language')}</h3>
        <div class="language-row">
          {#each LOCALES as locale}
            <button
              class="lang-btn"
              class:active={selectedLocale === locale.id}
              onclick={() => (selectedLocale = locale.id)}
            >
              {locale.nativeName}
            </button>
          {/each}
        </div>
      </div>

      <hr class="section-divider" />

      <!-- Theme -->
      <div class="setting-section">
        <h3 class="setting-section-title">{i18n.t('settings.theme')}</h3>
        <div class="theme-list">
          {#each themeStore.themes as theme}
            <button
              class="theme-item"
              class:active={selectedTheme === theme.id}
              disabled={themeStore.isLoading}
              onclick={() => handleThemeChange(theme.id)}
            >
              <div class="theme-swatch theme-swatch-{theme.id}"></div>
              <span>{i18n.t(themeNameKeys[theme.id])}</span>
              {#if themeStore.isLoading && selectedTheme === theme.id}
                <span class="loading-text">…</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <hr class="section-divider" />

      <!-- Gameplay -->
      <div class="setting-section">
        <h3 class="setting-section-title">{i18n.t('settings.gameplay')}</h3>

        <label class="toggle-row">
          <input type="checkbox" bind:checked={soundsEnabled} />
          <span>{i18n.t('settings.soundEffects')}</span>
        </label>

        {#if soundsEnabled}
          <div class="volume-row">
            <span class="muted">{i18n.t('settings.volume')}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              bind:value={soundVolume}
              onchange={() => setAudioVolume(soundVolume)}
              class="volume-slider"
            />
            <span class="muted">{Math.round(soundVolume * 100)}%</span>
            <button
              type="button"
              class="action-link"
              onclick={() => { setAudioVolume(soundVolume); playSound('move'); }}
            >
              {i18n.t('settings.test')}
            </button>
          </div>
        {/if}

        <label class="toggle-row">
          <input type="checkbox" bind:checked={showMoveHints} />
          <span>{i18n.t('settings.showMoveHints')}</span>
        </label>

        <label class="toggle-row">
          <input type="checkbox" bind:checked={confirmReset} />
          <span>{i18n.t('settings.confirmBeforeReset')}</span>
        </label>

        <label class="toggle-row">
          <input type="checkbox" bind:checked={showDeployButtons} />
          <span>{i18n.t('settings.showDeployButtons')}</span>
        </label>

        <label class="toggle-row">
          <input type="checkbox" bind:checked={autoCompleteDeploy} />
          <span>{i18n.t('settings.autoCompleteDeploy')}</span>
        </label>
      </div>
    </div>

    <div class="dialog-actions">
      <button class="action-link" onclick={() => (open = false)}>{i18n.t('common.cancel')}</button>
      <button class="action-link primary" onclick={handleSave}>{i18n.t('settings.save')}</button>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  .settings-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem 0;
  }

  .setting-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .setting-section-title {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
  }

  .section-divider {
    border: none;
    border-top: 1px solid var(--theme-border, #333);
    margin: 0;
  }

  .language-row {
    display: flex;
    gap: 0.75rem;
  }

  .lang-btn {
    background: none;
    border: none;
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
    cursor: pointer;
    padding: 0.125rem 0;
  }

  .lang-btn:hover {
    color: var(--theme-text-primary, #eee);
  }

  .lang-btn.active {
    color: var(--theme-primary, #06b6d4);
    text-decoration: underline;
  }

  .theme-list {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .theme-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    background: none;
    border: none;
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .theme-item:hover {
    color: var(--theme-text-primary, #eee);
  }

  .theme-item.active {
    color: var(--theme-primary, #06b6d4);
  }

  .theme-item:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .theme-swatch {
    width: 14px;
    height: 14px;
    border: 1px solid var(--theme-border, #444);
    flex-shrink: 0;
  }

  .theme-swatch-modern-warfare {
    background: linear-gradient(135deg, #050a14, #00f3ff);
  }

  .theme-swatch-desert-ops {
    background: linear-gradient(135deg, #e6d8c3, #8c3a3a);
  }

  .theme-swatch-classic {
    background: linear-gradient(135deg, #262421, #f0d9b5);
  }

  .theme-swatch-forest {
    background: linear-gradient(135deg, #0a1f0a, #4ade80);
  }

  .loading-text {
    color: var(--theme-primary, #06b6d4);
    font-size: 0.75rem;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.125rem 0;
    font-size: 0.8125rem;
    color: var(--theme-text-primary, #eee);
  }

  .toggle-row input[type='checkbox'] {
    width: 1rem;
    height: 1rem;
    accent-color: var(--theme-primary, #06b6d4);
    cursor: pointer;
  }

  .volume-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-left: 1.5rem;
  }

  .volume-slider {
    flex: 1;
    min-width: 60px;
    height: 4px;
    accent-color: var(--theme-primary, #06b6d4);
    cursor: pointer;
  }

  .muted {
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }

  .action-link {
    background: none;
    border: none;
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
    cursor: pointer;
    padding: 0.25rem 0;
  }

  .action-link:hover {
    color: var(--theme-text-primary, #eee);
    text-decoration: underline;
  }

  .action-link.primary {
    color: var(--theme-primary, #06b6d4);
  }
</style>
