<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { TranslationKey } from '$lib/i18n/types';
  import { registerSchema } from './validation';
  import { Mail, Lock, User, AlertCircle } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import type { ActionData } from './$types';

  const i18n = getI18n();

  let form: ActionData = $derived($page.form);

  // Initialize from server-returned form data (progressive enhancement for no-JS)
  const _serverForm = $page.form as { email?: string; displayName?: string } | null;
  let email = $state(_serverForm?.email ?? '');
  let password = $state('');
  let displayName = $state(_serverForm?.displayName ?? '');
  let submitting = $state(false);

  let touched: Record<string, boolean> = $state({});
  let clientErrors: Record<string, string> = $state({});

  function validateField(field: string) {
    const data = { email, password, displayName };
    const result = registerSchema.safeParse(data);

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
      emailRequired: 'auth.validation.emailRequired',
      emailInvalid: 'auth.validation.emailInvalid',
      passwordRequired: 'auth.validation.passwordRequired',
      passwordMinLength: 'auth.validation.passwordMinLength',
      displayNameRequired: 'auth.validation.displayNameRequired',
      displayNameMinLength: 'auth.validation.displayNameMinLength',
      displayNameMaxLength: 'auth.validation.displayNameMaxLength',
      displayNameInvalidChars: 'auth.validation.displayNameInvalidChars',
      registrationFailed: 'auth.error.registrationFailed',
      form: 'auth.error.generic'
    };
    return keyMap[code] || 'auth.error.generic';
  }

  function getFieldError(field: string): string | null {
    // Client-side errors take priority
    if (touched[field] && clientErrors[field]) {
      return i18n.t(getErrorKey(clientErrors[field]));
    }
    // Server errors
    const errors = form?.errors as Record<string, string> | undefined;
    if (errors?.[field]) {
      return i18n.t(getErrorKey(errors[field]));
    }
    return null;
  }

  let emailError = $derived(getFieldError('email'));
  let passwordError = $derived(getFieldError('password'));
  let displayNameError = $derived(getFieldError('displayName'));
  let formError = $derived(form?.errors?.form ? i18n.t(getErrorKey(form.errors.form)) : null);
</script>

<div class="register-page">
  <div class="register-card">
    {#if form?.success}
      <div class="verify-email">
        <div class="verify-icon">
          <Mail size={48} />
        </div>
        <h1 class="verify-title">{i18n.t('auth.register.verifyEmail')}</h1>
        <p class="verify-desc">{i18n.t('auth.register.verifyEmailDesc')}</p>
        <Button href="/" variant="outline" size="lg">
          {i18n.t('auth.error.backHome')}
        </Button>
      </div>
    {:else}
      <div class="register-header">
        <img class="register-logo" src="/favicon.svg" alt="CoTuLenh" />
        <h1 class="register-title">{i18n.t('auth.register.title')}</h1>
        <p class="register-subtitle">{i18n.t('auth.register.subtitle')}</p>
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
        class="register-form"
        novalidate
      >
        <div class="field">
          <label for="email" class="field-label">{i18n.t('auth.register.email')}</label>
          <div class="field-input-wrapper" class:field-error={emailError}>
            <Mail size={18} class="field-icon" />
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              placeholder={i18n.t('auth.register.emailPlaceholder')}
              bind:value={email}
              onblur={() => handleBlur('email')}
              class="field-input"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
          </div>
          {#if emailError}
            <p id="email-error" class="field-error-text" role="alert">{emailError}</p>
          {/if}
        </div>

        <div class="field">
          <label for="password" class="field-label">{i18n.t('auth.register.password')}</label>
          <div class="field-input-wrapper" class:field-error={passwordError}>
            <Lock size={18} class="field-icon" />
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="new-password"
              placeholder={i18n.t('auth.register.passwordPlaceholder')}
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
            <p class="field-hint">{i18n.t('auth.register.passwordPlaceholder')}</p>
          {/if}
        </div>

        <div class="field">
          <label for="displayName" class="field-label">{i18n.t('auth.register.displayName')}</label>
          <div class="field-input-wrapper" class:field-error={displayNameError}>
            <User size={18} class="field-icon" />
            <input
              id="displayName"
              name="displayName"
              type="text"
              autocomplete="username"
              placeholder={i18n.t('auth.register.displayNamePlaceholder')}
              bind:value={displayName}
              onblur={() => handleBlur('displayName')}
              class="field-input"
              aria-invalid={!!displayNameError}
              aria-describedby={displayNameError ? 'displayName-error' : undefined}
            />
          </div>
          {#if displayNameError}
            <p id="displayName-error" class="field-error-text" role="alert">{displayNameError}</p>
          {/if}
        </div>

        <Button type="submit" size="lg" disabled={submitting} class="submit-btn">
          {submitting ? i18n.t('auth.register.submitting') : i18n.t('auth.register.submit')}
        </Button>
      </form>

      <p class="login-prompt">
        {i18n.t('auth.register.haveAccount')}
        <a href="/auth/login">{i18n.t('auth.register.loginLink')}</a>
      </p>
    {/if}
  </div>
</div>

<style>
  .register-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
    background:
      radial-gradient(ellipse at center, rgba(6, 182, 212, 0.05) 0%, transparent 70%),
      var(--theme-bg-dark, #111);
  }

  .register-card {
    width: 100%;
    max-width: 420px;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 12px;
    padding: 2rem;
  }

  .register-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .register-logo {
    width: 48px;
    height: 48px;
    margin: 0 auto 0.75rem;
  }

  .register-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    margin: 0 0 0.25rem;
  }

  .register-subtitle {
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

  .register-form {
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

  /* Verify email state */
  .verify-email {
    text-align: center;
    padding: 1rem 0;
  }

  .verify-icon {
    color: var(--theme-primary, #06b6d4);
    margin-bottom: 1rem;
  }

  .verify-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    margin: 0 0 0.5rem;
  }

  .verify-desc {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0 0 1.5rem;
    line-height: 1.5;
  }
</style>
