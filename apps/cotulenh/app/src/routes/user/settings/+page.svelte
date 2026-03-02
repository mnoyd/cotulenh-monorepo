<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { getI18n, LOCALES } from '$lib/i18n/index.svelte';
  import type { TranslationKey, Locale } from '$lib/i18n/types';
  import { emailUpdateSchema, passwordChangeSchema } from './validation';
  import {
    Mail,
    Lock,
    Loader2,
    Volume2,
    VolumeX,
    Eye,
    RotateCcw,
    Layers,
    Zap
  } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { toast } from 'svelte-sonner';
  import { themeStore } from '$lib/stores/theme.svelte';
  import {
    loadSettings,
    saveSettings as persistSettings,
    type Settings,
    type ThemeId
  } from '$lib/stores/settings';
  import { playSound, setAudioEnabled, setAudioVolume } from '$lib/utils/audio';
  import type { ActionData, PageData } from './$types';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();
  let form: ActionData = $derived($page.form);

  // --- Email State ---
  let newEmail = $state('');
  let emailSubmitting = $state(false);
  let emailTouched = $state(false);
  let emailClientError = $state('');

  function validateEmail() {
    const result = emailUpdateSchema.safeParse({ email: newEmail });
    if (result.success) {
      emailClientError = '';
      return;
    }
    const issue = result.error.issues.find((i) => i.path[0] === 'email');
    emailClientError = issue?.message ?? '';
  }

  function getEmailErrorKey(code: string): TranslationKey {
    const keyMap: Record<string, TranslationKey> = {
      emailRequired: 'accountSettings.validation.emailRequired',
      emailInvalid: 'accountSettings.validation.emailInvalid',
      emailUpdateFailed: 'accountSettings.error.emailUpdateFailed'
    };
    return keyMap[code] || 'accountSettings.error.emailUpdateFailed';
  }

  let emailFieldError = $derived.by(() => {
    if (emailTouched && emailClientError) {
      return i18n.t(getEmailErrorKey(emailClientError));
    }
    if (form?.action === 'updateEmail') {
      const errors = form?.errors as Record<string, string> | undefined;
      if (errors?.email) return i18n.t(getEmailErrorKey(errors.email));
      if (errors?.form) return i18n.t(getEmailErrorKey(errors.form));
    }
    return null;
  });

  // --- Password State ---
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordSubmitting = $state(false);
  let passwordTouched = $state(false);
  let passwordClientErrors = $state<Record<string, string>>({});

  function validatePassword() {
    const result = passwordChangeSchema.safeParse({
      newPassword,
      confirmPassword
    });
    if (result.success) {
      passwordClientErrors = {};
      return;
    }
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) {
        errors[field] = issue.message;
      }
    }
    passwordClientErrors = errors;
  }

  function getPasswordErrorKey(code: string): TranslationKey {
    const keyMap: Record<string, TranslationKey> = {
      passwordRequired: 'accountSettings.validation.passwordRequired',
      passwordMinLength: 'accountSettings.validation.passwordMinLength',
      confirmPasswordRequired: 'accountSettings.validation.passwordRequired',
      passwordMismatch: 'accountSettings.validation.passwordMismatch',
      passwordUpdateFailed: 'accountSettings.error.passwordUpdateFailed'
    };
    return keyMap[code] || 'accountSettings.error.passwordUpdateFailed';
  }

  let passwordFieldError = $derived.by(() => {
    if (passwordTouched && passwordClientErrors.newPassword) {
      return i18n.t(getPasswordErrorKey(passwordClientErrors.newPassword));
    }
    if (form?.action === 'updatePassword') {
      const errors = form?.errors as Record<string, string> | undefined;
      if (errors?.newPassword) return i18n.t(getPasswordErrorKey(errors.newPassword));
    }
    return null;
  });

  let confirmFieldError = $derived.by(() => {
    if (passwordTouched && passwordClientErrors.confirmPassword) {
      return i18n.t(getPasswordErrorKey(passwordClientErrors.confirmPassword));
    }
    if (form?.action === 'updatePassword') {
      const errors = form?.errors as Record<string, string> | undefined;
      if (errors?.confirmPassword) return i18n.t(getPasswordErrorKey(errors.confirmPassword));
    }
    return null;
  });

  let passwordFormError = $derived.by(() => {
    if (form?.action === 'updatePassword') {
      const errors = form?.errors as Record<string, string> | undefined;
      if (errors?.form) return i18n.t(getPasswordErrorKey(errors.form));
    }
    return null;
  });

  // --- App Preferences State ---
  let soundsEnabled = $state(true);
  let soundVolume = $state(0.5);
  let showMoveHints = $state(true);
  let confirmReset = $state(true);
  let showDeployButtons = $state(true);
  let autoCompleteDeploy = $state(true);
  let selectedTheme = $state<ThemeId>('modern-warfare');
  let selectedLocale = $state<Locale>(i18n.locale);
  let settingsSaving = $state(false);
  let pendingSave = false;

  const themeNameKeys: Record<ThemeId, TranslationKey> = {
    'modern-warfare': 'settings.theme.modernWarfare.name',
    classic: 'settings.theme.classic.name',
    forest: 'settings.theme.forest.name'
  };

  const themeDescriptionKeys: Record<ThemeId, TranslationKey> = {
    'modern-warfare': 'settings.theme.modernWarfare.description',
    classic: 'settings.theme.classic.description',
    forest: 'settings.theme.forest.description'
  };

  // Load settings from DB data (for authenticated users) merged with localStorage
  function initializeSettings() {
    const localSettings = loadSettings();
    const dbSettings = data.settingsJson as Partial<Settings> | null;

    // DB settings take precedence if available
    if (dbSettings && Object.keys(dbSettings).length > 0) {
      soundsEnabled = dbSettings.soundsEnabled ?? localSettings.soundsEnabled;
      soundVolume = dbSettings.soundVolume ?? localSettings.soundVolume;
      showMoveHints = dbSettings.showMoveHints ?? localSettings.showMoveHints;
      confirmReset = dbSettings.confirmReset ?? localSettings.confirmReset;
      showDeployButtons = dbSettings.showDeployButtons ?? localSettings.showDeployButtons;
      autoCompleteDeploy = dbSettings.autoCompleteDeploy ?? localSettings.autoCompleteDeploy;
      selectedTheme = dbSettings.theme ?? localSettings.theme;
    } else {
      soundsEnabled = localSettings.soundsEnabled;
      soundVolume = localSettings.soundVolume;
      showMoveHints = localSettings.showMoveHints;
      confirmReset = localSettings.confirmReset;
      showDeployButtons = localSettings.showDeployButtons;
      autoCompleteDeploy = localSettings.autoCompleteDeploy;
      selectedTheme = localSettings.theme;
    }
    selectedLocale = i18n.locale;
  }

  $effect(() => {
    initializeSettings();
  });

  function getCurrentSettings(): Settings {
    return {
      soundsEnabled,
      soundVolume,
      showMoveHints,
      confirmReset,
      showDeployButtons,
      autoCompleteDeploy,
      theme: selectedTheme
    };
  }

  async function savePreference() {
    const settings = getCurrentSettings();

    // Always save to localStorage immediately
    persistSettings(settings);
    setAudioEnabled(settings.soundsEnabled);
    setAudioVolume(settings.soundVolume);

    // Save to DB for authenticated users
    if (data.email) {
      // If already saving, mark pending so the loop re-saves with latest state
      if (settingsSaving) {
        pendingSave = true;
        return;
      }

      settingsSaving = true;
      try {
        do {
          pendingSave = false;
          const latest = getCurrentSettings();
          const response = await fetch('?/updateSettings', {
            method: 'POST',
            body: new URLSearchParams({ settings: JSON.stringify(latest) })
          });
          if (!response.ok) {
            toast.error(i18n.t('accountSettings.error.settingsUpdateFailed'));
            return;
          }
        } while (pendingSave);
      } catch {
        toast.error(i18n.t('accountSettings.error.settingsUpdateFailed'));
        return;
      } finally {
        settingsSaving = false;
      }
    }

    toast.success(i18n.t('accountSettings.preferences.saved'), { duration: 4000 });
  }

  async function handleToggle() {
    await savePreference();
  }

  async function handleThemeChange(themeId: ThemeId) {
    selectedTheme = themeId;
    await themeStore.setTheme(themeId);
    await savePreference();
  }

  async function handleLocaleChange(locale: Locale) {
    selectedLocale = locale;
    i18n.setLocale(locale);
    await savePreference();
  }

  function handleVolumeChange() {
    setAudioVolume(soundVolume);
    savePreference();
  }
</script>

<svelte:head>
  <title>{i18n.t('accountSettings.title')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<div class="settings-page">
  <div class="settings-container">
    <h1 class="settings-title">{i18n.t('accountSettings.title')}</h1>

    <!-- Account Section -->
    <section class="settings-card" aria-labelledby="account-heading">
      <h2 id="account-heading" class="card-title">{i18n.t('accountSettings.account.title')}</h2>

      <!-- Email Update -->
      <div class="card-section">
        <h3 class="section-subtitle">{i18n.t('accountSettings.email.label')}</h3>
        <p class="current-value">
          {i18n.t('accountSettings.email.current')}: <strong>{data.email || '—'}</strong>
        </p>
        <form
          method="POST"
          action="?/updateEmail"
          use:enhance={() => {
            emailTouched = true;
            validateEmail();
            if (emailClientError) {
              return async () => {};
            }
            emailSubmitting = true;
            return async ({ result, update }) => {
              emailSubmitting = false;
              if (result.type === 'success') {
                newEmail = '';
                emailTouched = false;
                emailClientError = '';
                toast.success(i18n.t('accountSettings.email.success'), { duration: 4000 });
              }
              await update();
            };
          }}
          novalidate
        >
          <div class="field">
            <label for="email" class="field-label">{i18n.t('accountSettings.email.new')}</label>
            <div class="field-input-wrapper" class:field-error={emailFieldError}>
              <Mail size={18} class="field-icon" />
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                placeholder={i18n.t('accountSettings.email.placeholder')}
                bind:value={newEmail}
                onblur={() => {
                  emailTouched = true;
                  validateEmail();
                }}
                class="field-input"
                aria-invalid={!!emailFieldError}
                aria-describedby={emailFieldError ? 'email-error' : undefined}
              />
            </div>
            {#if emailFieldError}
              <p id="email-error" class="field-error-text" role="alert">{emailFieldError}</p>
            {/if}
          </div>
          <div class="form-actions">
            <Button type="submit" size="default" disabled={!!emailClientError || emailSubmitting}>
              {#if emailSubmitting}
                <Loader2 size={16} class="animate-spin" />
                {i18n.t('accountSettings.email.submitting')}
              {:else}
                {i18n.t('accountSettings.email.submit')}
              {/if}
            </Button>
          </div>
        </form>
      </div>

      <!-- Password Change -->
      <div class="card-section">
        <h3 class="section-subtitle">{i18n.t('accountSettings.password.title')}</h3>
        <form
          method="POST"
          action="?/updatePassword"
          use:enhance={() => {
            passwordTouched = true;
            validatePassword();
            if (Object.keys(passwordClientErrors).length > 0) {
              return async () => {};
            }
            passwordSubmitting = true;
            return async ({ result, update }) => {
              passwordSubmitting = false;
              if (result.type === 'success') {
                newPassword = '';
                confirmPassword = '';
                passwordTouched = false;
                passwordClientErrors = {};
                toast.success(i18n.t('accountSettings.password.success'), { duration: 4000 });
              }
              await update();
            };
          }}
          novalidate
        >
          <div class="field">
            <label for="newPassword" class="field-label">
              {i18n.t('accountSettings.password.new')}
            </label>
            <div class="field-input-wrapper" class:field-error={passwordFieldError}>
              <Lock size={18} class="field-icon" />
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autocomplete="new-password"
                placeholder={i18n.t('accountSettings.password.newPlaceholder')}
                bind:value={newPassword}
                onblur={() => {
                  passwordTouched = true;
                  validatePassword();
                }}
                class="field-input"
                aria-invalid={!!passwordFieldError}
                aria-describedby={passwordFieldError ? 'newPassword-error' : undefined}
              />
            </div>
            {#if passwordFieldError}
              <p id="newPassword-error" class="field-error-text" role="alert">
                {passwordFieldError}
              </p>
            {/if}
          </div>

          <div class="field">
            <label for="confirmPassword" class="field-label">
              {i18n.t('accountSettings.password.confirm')}
            </label>
            <div class="field-input-wrapper" class:field-error={confirmFieldError}>
              <Lock size={18} class="field-icon" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                placeholder={i18n.t('accountSettings.password.confirmPlaceholder')}
                bind:value={confirmPassword}
                onblur={() => {
                  passwordTouched = true;
                  validatePassword();
                }}
                class="field-input"
                aria-invalid={!!confirmFieldError}
                aria-describedby={confirmFieldError ? 'confirmPassword-error' : undefined}
              />
            </div>
            {#if confirmFieldError}
              <p id="confirmPassword-error" class="field-error-text" role="alert">
                {confirmFieldError}
              </p>
            {/if}
          </div>

          {#if passwordFormError}
            <div class="form-error" role="alert">{passwordFormError}</div>
          {/if}

          <div class="form-actions">
            <Button
              type="submit"
              size="default"
              disabled={Object.keys(passwordClientErrors).length > 0 || passwordSubmitting}
            >
              {#if passwordSubmitting}
                <Loader2 size={16} class="animate-spin" />
                {i18n.t('accountSettings.password.submitting')}
              {:else}
                {i18n.t('accountSettings.password.submit')}
              {/if}
            </Button>
          </div>
        </form>
      </div>
    </section>

    <!-- App Preferences Section -->
    <section class="settings-card" aria-labelledby="preferences-heading">
      <h2 id="preferences-heading" class="card-title">
        {i18n.t('accountSettings.preferences.title')}
      </h2>

      <!-- Language Selection -->
      <div class="card-section">
        <h3 class="section-subtitle">{i18n.t('settings.language')}</h3>
        <div class="language-grid">
          {#each LOCALES as locale}
            <button
              class="language-option"
              class:selected={selectedLocale === locale.id}
              onclick={() => handleLocaleChange(locale.id)}
            >
              <span class="language-name">{locale.nativeName}</span>
              <span class="language-english">{locale.name}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Theme Selection -->
      <div class="card-section">
        <h3 class="section-subtitle">{i18n.t('settings.theme')}</h3>
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
              <span class="theme-name">{i18n.t(themeNameKeys[theme.id])}</span>
              <span class="theme-desc">{i18n.t(themeDescriptionKeys[theme.id])}</span>
              {#if themeStore.isLoading && selectedTheme === theme.id}
                <span class="loading-indicator">{i18n.t('common.loading')}</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Sound Settings -->
      <div class="card-section">
        <h3 class="section-subtitle">{i18n.t('settings.gameplay')}</h3>

        <label class="setting-item">
          <input
            type="checkbox"
            bind:checked={soundsEnabled}
            onchange={handleToggle}
          />
          {#if soundsEnabled}
            <Volume2 size={18} class="setting-icon" />
          {:else}
            <VolumeX size={18} class="setting-icon" />
          {/if}
          <span>{i18n.t('settings.soundEffects')}</span>
        </label>

        {#if soundsEnabled}
          <div class="setting-item volume-control">
            <span>{i18n.t('settings.volume')}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              bind:value={soundVolume}
              onchange={handleVolumeChange}
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
              {i18n.t('settings.test')}
            </button>
          </div>
        {/if}

        <label class="setting-item">
          <input
            type="checkbox"
            bind:checked={showMoveHints}
            onchange={handleToggle}
          />
          <Eye size={18} class="setting-icon" />
          <span>{i18n.t('settings.showMoveHints')}</span>
        </label>

        <label class="setting-item">
          <input
            type="checkbox"
            bind:checked={confirmReset}
            onchange={handleToggle}
          />
          <RotateCcw size={18} class="setting-icon" />
          <span>{i18n.t('settings.confirmBeforeReset')}</span>
        </label>

        <label class="setting-item">
          <input
            type="checkbox"
            bind:checked={showDeployButtons}
            onchange={handleToggle}
          />
          <Layers size={18} class="setting-icon" />
          <span>{i18n.t('settings.showDeployButtons')}</span>
        </label>

        <label class="setting-item">
          <input
            type="checkbox"
            bind:checked={autoCompleteDeploy}
            onchange={handleToggle}
          />
          <Zap size={18} class="setting-icon" />
          <span>{i18n.t('settings.autoCompleteDeploy')}</span>
        </label>
      </div>
    </section>
  </div>
</div>

<style>
  .settings-page {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
    min-height: 100vh;
  }

  .settings-container {
    width: 100%;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .settings-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    margin: 0;
  }

  .settings-card {
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .card-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
    margin: 0 0 1.25rem;
  }

  .card-section {
    padding: 1rem 0;
    border-top: 1px solid var(--theme-border, #444);
  }

  .card-section:first-of-type {
    border-top: none;
    padding-top: 0;
  }

  .section-subtitle {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-text-secondary, #aaa);
    margin: 0 0 0.75rem;
  }

  .current-value {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0 0 0.75rem;
  }

  .current-value strong {
    color: var(--theme-text-primary, #eee);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin-bottom: 0.75rem;
  }

  .field-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-text-secondary, #aaa);
  }

  .field-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem;
    height: 44px;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #444);
    border-radius: 8px;
    transition: border-color 0.15s;
  }

  .field-input-wrapper:focus-within {
    border-color: var(--theme-primary, #06b6d4);
    outline: 2px solid var(--theme-primary, #06b6d4);
    outline-offset: 2px;
  }

  .field-input-wrapper.field-error {
    border-color: #ef4444;
  }

  :global(.field-icon) {
    color: var(--theme-text-secondary, #aaa);
    flex-shrink: 0;
  }

  .field-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--theme-text-primary, #eee);
    font-size: 0.875rem;
    height: 100%;
  }

  .field-input::placeholder {
    color: var(--theme-text-secondary, #666);
  }

  .field-error-text {
    font-size: 0.75rem;
    color: #ef4444;
    margin: 0;
  }

  .form-error {
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  /* Language Grid */
  .language-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .language-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem;
    min-height: 44px;
    background: transparent;
    border: 1px solid var(--theme-border, #444);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .language-option:hover {
    border-color: var(--theme-primary, #06b6d4);
    background: var(--theme-primary-dim, rgba(6, 182, 212, 0.1));
  }

  .language-option.selected {
    border-color: var(--theme-primary, #06b6d4);
    background: var(--theme-primary-dim, rgba(6, 182, 212, 0.1));
    box-shadow: var(--theme-glow-primary, 0 0 8px rgba(6, 182, 212, 0.3));
  }

  .language-option:focus-visible {
    outline: 2px solid var(--theme-primary, #06b6d4);
    outline-offset: 2px;
  }

  .language-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
  }

  .language-english {
    font-size: 0.7rem;
    color: var(--theme-text-secondary, #aaa);
  }

  /* Theme Grid */
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
    min-height: 44px;
    background: transparent;
    border: 1px solid var(--theme-border, #444);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .theme-option:hover {
    border-color: var(--theme-primary, #06b6d4);
    background: var(--theme-primary-dim, rgba(6, 182, 212, 0.1));
  }

  .theme-option.selected {
    border-color: var(--theme-primary, #06b6d4);
    background: var(--theme-primary-dim, rgba(6, 182, 212, 0.1));
    box-shadow: var(--theme-glow-primary, 0 0 8px rgba(6, 182, 212, 0.3));
  }

  .theme-option:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .theme-option:focus-visible {
    outline: 2px solid var(--theme-primary, #06b6d4);
    outline-offset: 2px;
  }

  .theme-option.loading {
    position: relative;
  }

  .loading-indicator {
    font-size: 0.6rem;
    color: var(--theme-primary, #06b6d4);
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
    color: var(--theme-text-primary, #eee);
  }

  .theme-desc {
    font-size: 0.65rem;
    color: var(--theme-text-secondary, #aaa);
    text-align: center;
    line-height: 1.3;
  }

  /* Settings Items */
  .setting-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.5rem;
    min-height: 44px;
    border-radius: 0.25rem;
    transition: background 0.2s;
  }

  .setting-item:hover {
    background: var(--theme-primary-dim, rgba(6, 182, 212, 0.1));
  }

  .setting-item input[type='checkbox'] {
    width: 1.25rem;
    height: 1.25rem;
    accent-color: var(--theme-primary, #06b6d4);
    cursor: pointer;
  }

  .setting-item span {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-text-primary, #eee);
  }

  :global(.setting-icon) {
    color: var(--theme-text-secondary, #aaa);
    flex-shrink: 0;
  }

  .volume-control {
    padding-left: 2rem;
    flex-wrap: wrap;
  }

  .volume-slider {
    flex: 1;
    min-width: 80px;
    height: 4px;
    accent-color: var(--theme-primary, #06b6d4);
    cursor: pointer;
  }

  .volume-value {
    min-width: 3rem;
    text-align: right;
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .test-sound-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 500;
    min-height: 44px;
    min-width: 44px;
    background: var(--theme-primary-dim, rgba(6, 182, 212, 0.1));
    border: 1px solid var(--theme-border, #444);
    border-radius: 0.25rem;
    color: var(--theme-text-primary, #eee);
    cursor: pointer;
    transition: all 0.2s;
  }

  .test-sound-btn:hover {
    background: var(--theme-primary, #06b6d4);
    border-color: var(--theme-primary, #06b6d4);
  }

  .test-sound-btn:focus-visible {
    outline: 2px solid var(--theme-primary, #06b6d4);
    outline-offset: 2px;
  }

  /* Responsive */
  @media (max-width: 767px) {
    .settings-page {
      padding: 1rem 0.5rem;
    }

    .theme-grid {
      grid-template-columns: 1fr;
    }
  }

  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
