<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { TranslationKey } from '$lib/i18n/types';
  import { displayNameSchema } from './validation';
  import { User, Pencil, Trophy, Swords, XCircle, Loader2 } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { toast } from 'svelte-sonner';
  import type { ActionData, PageData } from './$types';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();
  let form: ActionData = $derived($page.form);

  const initialDisplayName = data.profileDetail.displayName;
  let displayName = $state(initialDisplayName);
  let previousDisplayName = $state(initialDisplayName);
  let editing = $state(false);
  let submitting = $state(false);

  let touched = $state(false);
  let clientError = $state('');

  function validateDisplayName() {
    const result = displayNameSchema.safeParse({ displayName });
    if (result.success) {
      clientError = '';
      return;
    }
    const issue = result.error.issues.find((i) => i.path[0] === 'displayName');
    clientError = issue?.message ?? '';
  }

  function handleBlur() {
    touched = true;
    validateDisplayName();
  }

  function startEditing() {
    previousDisplayName = displayName;
    editing = true;
  }

  function cancelEditing() {
    displayName = previousDisplayName;
    editing = false;
    touched = false;
    clientError = '';
  }

  function getErrorKey(code: string): TranslationKey {
    const keyMap: Record<string, TranslationKey> = {
      displayNameRequired: 'profile.validation.displayNameRequired',
      displayNameMinLength: 'profile.validation.displayNameMinLength',
      displayNameMaxLength: 'profile.validation.displayNameMaxLength',
      displayNameInvalidChars: 'profile.validation.displayNameInvalidChars',
      updateFailed: 'profile.error.updateFailed'
    };
    return keyMap[code] || 'profile.error.updateFailed';
  }

  let fieldError = $derived.by(() => {
    if (touched && clientError) {
      return i18n.t(getErrorKey(clientError));
    }
    const errors = form?.errors as Record<string, string> | undefined;
    if (errors?.displayName) {
      return i18n.t(getErrorKey(errors.displayName));
    }
    return null;
  });

  let formError = $derived(
    form?.errors?.form ? i18n.t(getErrorKey(form.errors.form as string)) : null
  );

  let hasError = $derived(!!clientError);

  function formatMemberSince(dateStr: string): string {
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString(i18n.getLocale() === 'vi' ? 'vi-VN' : 'en-US', {
      month: 'long',
      year: 'numeric'
    });
    return i18n.t('profile.memberSince').replace('{date}', formatted);
  }
</script>

<div class="profile-page">
  <div class="profile-container">
    <h1 class="profile-title">{i18n.t('profile.title')}</h1>

    <div class="profile-layout">
      <!-- Left Panel: Identity -->
      <div class="profile-identity-card">
        <div class="avatar-placeholder" aria-hidden="true">
          <User size={48} />
        </div>

        {#if editing}
          <form
            method="POST"
            use:enhance={() => {
              // AC3: validate on submit (in addition to blur)
              touched = true;
              validateDisplayName();
              if (clientError) {
                return async () => {};
              }
              submitting = true;
              return async ({ result, update }) => {
                submitting = false;
                if (result.type === 'success') {
                  previousDisplayName = displayName;
                  editing = false;
                  touched = false;
                  clientError = '';
                  toast.success(i18n.t('profile.displayName.saved'), { duration: 4000 });
                } else if (result.type === 'failure') {
                  displayName = previousDisplayName;
                }
                await update();
              };
            }}
            class="edit-form"
            novalidate
          >
            <div class="field">
              <label for="displayName" class="field-label">
                {i18n.t('profile.displayName.label')}
              </label>
              <div class="field-input-wrapper" class:field-error={fieldError}>
                <User size={18} class="field-icon" />
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autocomplete="username"
                  placeholder={i18n.t('profile.displayName.placeholder')}
                  bind:value={displayName}
                  onblur={handleBlur}
                  class="field-input"
                  aria-invalid={!!fieldError}
                  aria-describedby={fieldError ? 'displayName-error' : undefined}
                />
              </div>
              {#if fieldError}
                <p id="displayName-error" class="field-error-text" role="alert">{fieldError}</p>
              {/if}
            </div>

            {#if formError}
              <div class="form-error" role="alert">{formError}</div>
            {/if}

            <div class="edit-actions">
              <Button type="submit" size="default" disabled={hasError || submitting}>
                {#if submitting}
                  <Loader2 size={16} class="animate-spin" />
                  {i18n.t('profile.displayName.saving')}
                {:else}
                  {i18n.t('profile.displayName.save')}
                {/if}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="default"
                onclick={cancelEditing}
                disabled={submitting}
              >
                {i18n.t('common.cancel')}
              </Button>
            </div>
          </form>
        {:else}
          <div class="display-name-row">
            <span class="display-name-text">{displayName || '—'}</span>
            <Button
              variant="ghost"
              size="icon"
              class="edit-btn"
              onclick={startEditing}
              aria-label={i18n.t('profile.displayName.edit')}
            >
              <Pencil size={16} />
            </Button>
          </div>
        {/if}

        <p class="member-since">{formatMemberSince(data.profileDetail.createdAt)}</p>
      </div>

      <!-- Right Panel: Stats -->
      <div class="profile-stats-card">
        <h2 class="stats-title">{i18n.t('profile.stats.title')}</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <Swords size={20} class="stat-icon" />
            <span class="stat-value">{data.stats.gamesPlayed}</span>
            <span class="stat-label">{i18n.t('profile.stats.gamesPlayed')}</span>
          </div>
          <div class="stat-item">
            <Trophy size={20} class="stat-icon" />
            <span class="stat-value">{data.stats.wins}</span>
            <span class="stat-label">{i18n.t('profile.stats.wins')}</span>
          </div>
          <div class="stat-item">
            <XCircle size={20} class="stat-icon" />
            <span class="stat-value">{data.stats.losses}</span>
            <span class="stat-label">{i18n.t('profile.stats.losses')}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .profile-page {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
    min-height: 100vh;
  }

  .profile-container {
    width: 100%;
    max-width: 1200px;
  }

  .profile-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    margin: 0 0 1.5rem;
  }

  .profile-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .profile-layout {
      flex-direction: row;
    }

    .profile-identity-card {
      flex: 0 0 30%;
    }

    .profile-stats-card {
      flex: 1;
    }
  }

  .profile-identity-card,
  .profile-stats-card {
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .avatar-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--theme-bg-dark, #111);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--theme-text-secondary, #aaa);
    margin: 0 auto 1rem;
  }

  .display-name-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .display-name-text {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
  }

  .member-since {
    text-align: center;
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0.75rem 0 0;
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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

  .form-error {
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
    font-size: 0.875rem;
  }

  .edit-actions {
    display: flex;
    gap: 0.5rem;
  }

  .stats-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
    margin: 0 0 1rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 1rem;
    background: var(--theme-bg-dark, #111);
    border-radius: 8px;
  }

  :global(.stat-icon) {
    color: var(--theme-text-secondary, #aaa);
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
    text-align: center;
  }

  :global(.edit-btn) {
    min-width: 44px;
    min-height: 44px;
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
