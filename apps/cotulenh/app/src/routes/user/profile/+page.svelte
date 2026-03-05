<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { TranslationKey } from '$lib/i18n/types';
  import { displayNameSchema } from './validation';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import { toast } from 'svelte-sonner';
  import type { ActionData, PageData } from './$types';

  import '$lib/styles/command-center.css';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();
  let form: ActionData = $derived($page.form);

  let displayName = $state('');
  let previousDisplayName = $state('');
  let editing = $state(false);
  let submitting = $state(false);
  let touched = $state(false);
  let clientError = $state('');

  $effect(() => {
    if (!editing) {
      const currentDisplayName = data.profileDetail.displayName;
      displayName = currentDisplayName;
      previousDisplayName = currentDisplayName;
    }
  });

  function validateDisplayName() {
    const result = displayNameSchema.safeParse({ displayName });
    if (result.success) { clientError = ''; return; }
    const issue = result.error.issues.find((i) => i.path[0] === 'displayName');
    clientError = issue?.message ?? '';
  }

  function handleBlur() { touched = true; validateDisplayName(); }

  function startEditing() { previousDisplayName = displayName; editing = true; }

  function cancelEditing() {
    displayName = previousDisplayName;
    editing = false; touched = false; clientError = '';
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
    if (touched && clientError) return i18n.t(getErrorKey(clientError));
    const errors = form?.errors as Record<string, string> | undefined;
    if (errors?.displayName) return i18n.t(getErrorKey(errors.displayName));
    return null;
  });

  let formError = $derived(
    form?.errors?.form ? i18n.t(getErrorKey(form.errors.form as string)) : null
  );

  let hasError = $derived(!!clientError);

  function formatMemberSince(dateStr: string): string {
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString(i18n.getLocale() === 'vi' ? 'vi-VN' : 'en-US', {
      month: 'long', year: 'numeric'
    });
    return i18n.t('profile.memberSince').replace('{date}', formatted);
  }
</script>

<CommandCenter center={centerContent} />

{#snippet centerContent()}
  <div class="profile-center">
    <h1 class="section-header">{i18n.t('profile.title')}</h1>

    {#if editing}
      <form
        method="POST"
        use:enhance={() => {
          touched = true;
          validateDisplayName();
          if (clientError) return async () => {};
          submitting = true;
          return async ({ result, update }) => {
            submitting = false;
            if (result.type === 'success') {
              previousDisplayName = displayName;
              editing = false; touched = false; clientError = '';
              toast.success(i18n.t('profile.displayName.saved'), { duration: 4000 });
            } else if (result.type === 'failure') {
              displayName = previousDisplayName;
            }
            await update();
          };
        }}
        novalidate
      >
        <div class="field">
          <label for="displayName" class="field-label">{i18n.t('profile.displayName.label')}</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autocomplete="username"
            placeholder={i18n.t('profile.displayName.placeholder')}
            bind:value={displayName}
            onblur={handleBlur}
            class="field-input"
            class:field-error={fieldError}
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? 'displayName-error' : undefined}
          />
          {#if fieldError}
            <p id="displayName-error" class="error-text" role="alert">{fieldError}</p>
          {/if}
        </div>

        {#if formError}
          <p class="error-text" role="alert">{formError}</p>
        {/if}

        <div class="form-actions">
          <button type="submit" class="text-link" disabled={hasError || submitting}>
            {submitting ? i18n.t('profile.displayName.saving') : i18n.t('profile.displayName.save')}
          </button>
          <button type="button" class="text-link" onclick={cancelEditing} disabled={submitting}>
            {i18n.t('common.cancel')}
          </button>
        </div>
      </form>
    {:else}
      <div class="name-row">
        <span class="display-name">{displayName || '—'}</span>
        <button class="text-link" onclick={startEditing}>{i18n.t('profile.displayName.edit')}</button>
      </div>
    {/if}

    <span class="text-secondary">{formatMemberSince(data.profileDetail.createdAt)}</span>

    <hr class="divider" />

    <span class="section-header">{i18n.t('profile.stats.title')}</span>
    <div class="stats">
      <div class="stat-row">
        <span class="text-secondary">{i18n.t('profile.stats.gamesPlayed')}</span>
        <span class="stat-value">{data.stats.gamesPlayed}</span>
      </div>
      <div class="stat-row">
        <span class="text-secondary">{i18n.t('profile.stats.wins')}</span>
        <span class="stat-value">{data.stats.wins}</span>
      </div>
      <div class="stat-row">
        <span class="text-secondary">{i18n.t('profile.stats.losses')}</span>
        <span class="stat-value">{data.stats.losses}</span>
      </div>
    </div>
  </div>
{/snippet}

<style>
  .profile-center {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 1rem;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
  }

  .display-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
  }

  .name-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
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

  .form-actions {
    display: flex;
    gap: 0.75rem;
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.125rem 0;
  }

  .stat-value {
    font-family: var(--font-mono, monospace);
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
  }
</style>
