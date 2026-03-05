<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { getI18n, LOCALES } from '$lib/i18n/index.svelte';
  import type { TranslationKey, Locale } from '$lib/i18n/types';
  import { emailUpdateSchema, passwordChangeSchema } from './validation';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
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

  import '$lib/styles/command-center.css';

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
  let moveConfirmation = $state(false);
  let selectedTheme = $state<ThemeId>('modern-warfare');
  let selectedLocale = $state<Locale>(i18n.locale);
  let settingsSaving = $state(false);
  let pendingSave = false;

  const themeNameKeys: Record<ThemeId, TranslationKey> = {
    'modern-warfare': 'settings.theme.modernWarfare.name',
    'desert-ops': 'settings.theme.desertOps.name',
    classic: 'settings.theme.classic.name',
    forest: 'settings.theme.forest.name'
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
      moveConfirmation = dbSettings.moveConfirmation ?? localSettings.moveConfirmation;
      selectedTheme = dbSettings.theme ?? localSettings.theme;
    } else {
      soundsEnabled = localSettings.soundsEnabled;
      soundVolume = localSettings.soundVolume;
      showMoveHints = localSettings.showMoveHints;
      confirmReset = localSettings.confirmReset;
      showDeployButtons = localSettings.showDeployButtons;
      autoCompleteDeploy = localSettings.autoCompleteDeploy;
      moveConfirmation = localSettings.moveConfirmation;
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
      theme: selectedTheme,
      moveConfirmation
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

<CommandCenter center={centerContent} />

{#snippet centerContent()}
  <div class="settings-center">
    <h1 class="section-header">{i18n.t('accountSettings.title')}</h1>

    <!-- Account Section -->
    <span class="section-header">{i18n.t('accountSettings.account.title')}</span>

    <!-- Email -->
    <span class="subsection-label">{i18n.t('accountSettings.email.label')}</span>
    <span class="text-secondary">
      {i18n.t('accountSettings.email.current')}: <strong class="text-primary">{data.email || '—'}</strong>
    </span>
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
        <input
          id="email"
          name="email"
          type="email"
          autocomplete="email"
          placeholder={i18n.t('accountSettings.email.placeholder')}
          bind:value={newEmail}
          onblur={() => { emailTouched = true; validateEmail(); }}
          class="field-input"
          class:field-error={emailFieldError}
          aria-invalid={!!emailFieldError}
          aria-describedby={emailFieldError ? 'email-error' : undefined}
        />
        {#if emailFieldError}
          <p id="email-error" class="error-text" role="alert">{emailFieldError}</p>
        {/if}
      </div>
      <button type="submit" class="text-link" disabled={!!emailClientError || emailSubmitting}>
        {emailSubmitting ? i18n.t('accountSettings.email.submitting') : i18n.t('accountSettings.email.submit')}
      </button>
    </form>

    <hr class="divider" />

    <!-- Password -->
    <span class="subsection-label">{i18n.t('accountSettings.password.title')}</span>
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
        <label for="newPassword" class="field-label">{i18n.t('accountSettings.password.new')}</label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autocomplete="new-password"
          placeholder={i18n.t('accountSettings.password.newPlaceholder')}
          bind:value={newPassword}
          onblur={() => { passwordTouched = true; validatePassword(); }}
          class="field-input"
          class:field-error={passwordFieldError}
          aria-invalid={!!passwordFieldError}
          aria-describedby={passwordFieldError ? 'newPassword-error' : undefined}
        />
        {#if passwordFieldError}
          <p id="newPassword-error" class="error-text" role="alert">{passwordFieldError}</p>
        {/if}
      </div>

      <div class="field">
        <label for="confirmPassword" class="field-label">{i18n.t('accountSettings.password.confirm')}</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autocomplete="new-password"
          placeholder={i18n.t('accountSettings.password.confirmPlaceholder')}
          bind:value={confirmPassword}
          onblur={() => { passwordTouched = true; validatePassword(); }}
          class="field-input"
          class:field-error={confirmFieldError}
          aria-invalid={!!confirmFieldError}
          aria-describedby={confirmFieldError ? 'confirmPassword-error' : undefined}
        />
        {#if confirmFieldError}
          <p id="confirmPassword-error" class="error-text" role="alert">{confirmFieldError}</p>
        {/if}
      </div>

      {#if passwordFormError}
        <p class="error-text" role="alert">{passwordFormError}</p>
      {/if}

      <button type="submit" class="text-link" disabled={Object.keys(passwordClientErrors).length > 0 || passwordSubmitting}>
        {passwordSubmitting ? i18n.t('accountSettings.password.submitting') : i18n.t('accountSettings.password.submit')}
      </button>
    </form>

    <hr class="divider" />

    <!-- Preferences -->
    <span class="section-header">{i18n.t('accountSettings.preferences.title')}</span>

    <!-- Language -->
    <span class="subsection-label">{i18n.t('settings.language')}</span>
    <div class="language-row">
      {#each LOCALES as locale}
        <button
          class="text-link"
          class:active={selectedLocale === locale.id}
          onclick={() => handleLocaleChange(locale.id)}
        >
          {locale.nativeName}
        </button>
      {/each}
    </div>

    <hr class="divider" />

    <!-- Theme -->
    <span class="subsection-label">{i18n.t('settings.theme')}</span>
    <div class="theme-list">
      {#each themeStore.themes as theme}
        <button
          class="theme-option"
          class:active={selectedTheme === theme.id}
          disabled={themeStore.isLoading}
          onclick={() => handleThemeChange(theme.id)}
        >
          <div class="theme-swatch theme-swatch-{theme.id}"></div>
          <span class="theme-label">{i18n.t(themeNameKeys[theme.id])}</span>
          {#if themeStore.isLoading && selectedTheme === theme.id}
            <span class="text-secondary">…</span>
          {/if}
        </button>
      {/each}
    </div>

    <hr class="divider" />

    <!-- Gameplay -->
    <span class="subsection-label">{i18n.t('settings.gameplay')}</span>

    <label class="toggle-row">
      <input type="checkbox" bind:checked={soundsEnabled} onchange={handleToggle} />
      <span>{i18n.t('settings.soundEffects')}</span>
    </label>

    {#if soundsEnabled}
      <div class="volume-row">
        <span class="text-secondary">{i18n.t('settings.volume')}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          bind:value={soundVolume}
          onchange={handleVolumeChange}
          class="volume-slider"
        />
        <span class="text-secondary">{Math.round(soundVolume * 100)}%</span>
        <button
          type="button"
          class="text-link"
          onclick={() => { setAudioVolume(soundVolume); playSound('move'); }}
        >
          {i18n.t('settings.test')}
        </button>
      </div>
    {/if}

    <label class="toggle-row">
      <input type="checkbox" bind:checked={showMoveHints} onchange={handleToggle} />
      <span>{i18n.t('settings.showMoveHints')}</span>
    </label>

    <label class="toggle-row">
      <input type="checkbox" bind:checked={confirmReset} onchange={handleToggle} />
      <span>{i18n.t('settings.confirmBeforeReset')}</span>
    </label>

    <label class="toggle-row">
      <input type="checkbox" bind:checked={showDeployButtons} onchange={handleToggle} />
      <span>{i18n.t('settings.showDeployButtons')}</span>
    </label>

    <label class="toggle-row">
      <input type="checkbox" bind:checked={autoCompleteDeploy} onchange={handleToggle} />
      <span>{i18n.t('settings.autoCompleteDeploy')}</span>
    </label>
  </div>
{/snippet}

<style>
  .settings-center {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 1rem;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
  }

  .text-primary {
    color: var(--theme-text-primary, #eee);
  }

  .subsection-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-text-secondary, #aaa);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .field-label {
    font-size: 0.8125rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .field-input {
    padding: 0.375rem 0.5rem;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-primary, #eee);
    font-size: 0.875rem;
  }

  .field-input:focus {
    outline: none;
    border-color: var(--theme-primary, #06b6d4);
  }

  .field-input.field-error {
    border-color: #ef4444;
  }

  .error-text {
    font-size: 0.75rem;
    color: #ef4444;
    margin: 0;
  }

  .language-row {
    display: flex;
    gap: 0.75rem;
  }

  .language-row :global(.text-link.active),
  .language-row button.active {
    color: var(--theme-primary, #06b6d4);
    text-decoration: underline;
  }

  .theme-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .theme-option {
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

  .theme-option:hover {
    color: var(--theme-text-primary, #eee);
  }

  .theme-option.active {
    color: var(--theme-primary, #06b6d4);
  }

  .theme-option:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .theme-swatch {
    width: 16px;
    height: 16px;
    border: 1px solid var(--theme-border, #444);
    flex-shrink: 0;
  }

  .theme-swatch-modern-warfare {
    background: linear-gradient(135deg, #050a14, #00f3ff);
  }

  .theme-swatch-classic {
    background: linear-gradient(135deg, #262421, #f0d9b5);
  }

  .theme-swatch-forest {
    background: linear-gradient(135deg, #0a1f0a, #4ade80);
  }

  .theme-swatch-desert-ops {
    background: linear-gradient(135deg, #1a1207, #d4a574);
  }

  .theme-label {
    font-weight: 600;
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
</style>
