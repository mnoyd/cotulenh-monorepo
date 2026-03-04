<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { TranslationKey } from '$lib/i18n/types';
  import { resetPasswordSchema } from './validation';
  import { Lock, AlertCircle } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import type { ActionData } from './$types';

  const i18n = getI18n();

  let form: ActionData = $derived($page.form);

  let password = $state('');
  let confirmPassword = $state('');
  let submitting = $state(false);

  let touched: Record<string, boolean> = $state({});
  let clientErrors: Record<string, string> = $state({});

  const expired = $derived($page.url.searchParams.get('expired'));

  function validateField(field: string) {
    const data = { password, confirmPassword };
    const result = resetPasswordSchema.safeParse(data);

    if (result.success) {
      delete clientErrors[field];
      return;
    }

    const fieldError = result.error.issues.find((issue) => issue.path[0] === field);
    if (fieldError) {
      clientErrors[field] = fieldError.message;
    } else {
      delete clientErrors[field];
    }
  }

  function handleBlur(field: string) {
    touched[field] = true;
    validateField(field);
  }

  function getErrorKey(code: string): TranslationKey {
    const keyMap: Record<string, TranslationKey> = {
      passwordRequired: 'auth.validation.passwordRequired',
      passwordMinLength: 'auth.validation.passwordMinLength',
      confirmPasswordRequired: 'auth.validation.confirmPasswordRequired',
      passwordMismatch: 'auth.validation.passwordMismatch',
      resetFailed: 'auth.error.resetFailed',
      form: 'auth.error.generic'
    };
    return keyMap[code] || 'auth.error.generic';
  }

  function getFieldError(field: string): string | null {
    if (touched[field] && clientErrors[field]) {
      return i18n.t(getErrorKey(clientErrors[field]));
    }
    const errors = form?.errors as Record<string, string> | undefined;
    if (errors?.[field]) {
      return i18n.t(getErrorKey(errors[field]));
    }
    return null;
  }

  let passwordError = $derived(getFieldError('password'));
  let confirmPasswordError = $derived(getFieldError('confirmPassword'));
  let formError = $derived(form?.errors?.form ? i18n.t(getErrorKey(form.errors.form)) : null);
</script>

<div class="reset-password-page">
  <div class="reset-password-card">
    {#if expired}
      <div class="expired-message">
        <div class="expired-icon">
          <AlertCircle size={48} />
        </div>
        <h1 class="expired-title">{i18n.t('auth.resetPassword.expiredLink')}</h1>
        <Button href="/auth/forgot-password" variant="outline" size="lg">
          {i18n.t('auth.forgotPassword.submit')}
        </Button>
      </div>
    {:else}
      <div class="reset-password-header">
        <img class="reset-password-logo" src="/favicon.svg" alt="CoTuLenh" />
        <h1 class="reset-password-title">{i18n.t('auth.resetPassword.title')}</h1>
        <p class="reset-password-subtitle">{i18n.t('auth.resetPassword.subtitle')}</p>
      </div>

      {#if formError}
        <div class="form-error" role="alert">
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      {/if}

      <form
        method="POST"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => {
            submitting = false;
            await update();
          };
        }}
        class="reset-password-form"
        novalidate
      >
        <div class="field">
          <label for="password" class="field-label"
            >{i18n.t('auth.resetPassword.newPassword')}</label
          >
          <div class="field-input-wrapper" class:field-error={passwordError}>
            <Lock size={18} class="field-icon" />
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="new-password"
              placeholder={i18n.t('auth.resetPassword.newPasswordPlaceholder')}
              bind:value={password}
              onblur={() => handleBlur('password')}
              class="field-input"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'password-error' : undefined}
            />
          </div>
          {#if passwordError}
            <p id="password-error" class="field-error-text" role="alert">{passwordError}</p>
          {:else}
            <p class="field-hint">{i18n.t('auth.resetPassword.newPasswordPlaceholder')}</p>
          {/if}
        </div>

        <div class="field">
          <label for="confirmPassword" class="field-label"
            >{i18n.t('auth.resetPassword.confirmPassword')}</label
          >
          <div class="field-input-wrapper" class:field-error={confirmPasswordError}>
            <Lock size={18} class="field-icon" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder={i18n.t('auth.resetPassword.confirmPasswordPlaceholder')}
              bind:value={confirmPassword}
              onblur={() => handleBlur('confirmPassword')}
              class="field-input"
              aria-invalid={!!confirmPasswordError}
              aria-describedby={confirmPasswordError ? 'confirmPassword-error' : undefined}
            />
          </div>
          {#if confirmPasswordError}
            <p id="confirmPassword-error" class="field-error-text" role="alert">
              {confirmPasswordError}
            </p>
          {/if}
        </div>

        <Button type="submit" size="lg" disabled={submitting} class="submit-btn">
          {submitting
            ? i18n.t('auth.resetPassword.submitting')
            : i18n.t('auth.resetPassword.submit')}
        </Button>
      </form>

      <p class="login-prompt">
        <a href="/auth/login">{i18n.t('auth.resetPassword.backToLogin')}</a>
      </p>
    {/if}
  </div>
</div>

<style>
  .reset-password-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
    background:
      radial-gradient(ellipse at center, rgba(6, 182, 212, 0.05) 0%, transparent 70%),
      var(--theme-bg-dark, #111);
  }

  .reset-password-card {
    width: 100%;
    max-width: 420px;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 12px;
    padding: 2rem;
  }

  .reset-password-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .reset-password-logo {
    width: 48px;
    height: 48px;
    margin: 0 auto 0.75rem;
  }

  .reset-password-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    margin: 0 0 0.25rem;
  }

  .reset-password-subtitle {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
  }

  .form-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .reset-password-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
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

  .field-hint {
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #888);
    margin: 0;
  }

  .login-prompt {
    text-align: center;
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 1rem 0 0;
  }

  .login-prompt a {
    color: var(--theme-primary, #06b6d4);
    text-decoration: none;
    font-weight: 500;
  }

  .login-prompt a:hover {
    text-decoration: underline;
  }

  :global(.submit-btn) {
    margin-top: 0.5rem;
    width: 100%;
    height: 44px !important;
  }

  /* Expired link state */
  .expired-message {
    text-align: center;
    padding: 1rem 0;
  }

  .expired-icon {
    color: #ef4444;
    margin-bottom: 1rem;
  }

  .expired-title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--theme-text-secondary, #aaa);
    margin: 0 0 1.5rem;
    line-height: 1.5;
  }
</style>
