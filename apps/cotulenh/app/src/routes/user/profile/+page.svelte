<script lang="ts">
  import { enhance } from '$app/forms';
  import { navigating, page } from '$app/stores';
  import type { TranslationKey } from '$lib/i18n/types';
  import { vi } from '$lib/i18n/locales/vi';
  import { displayNameSchema } from './validation';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import { toast } from 'svelte-sonner';
  import type { ActionData, PageData } from './$types';

  import '$lib/styles/command-center.css';

  function t(key: TranslationKey): string {
    return vi[key] ?? key;
  }

  let { data }: { data: PageData } = $props();
  let form: ActionData = $derived($page.form);
  let isLoading = $derived(Boolean($navigating));

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
    if (touched && clientError) return t(getErrorKey(clientError));
    const errors = form?.errors as Record<string, string> | undefined;
    if (errors?.displayName) return t(getErrorKey(errors.displayName));
    return null;
  });

  let formError = $derived(
    form?.errors?.form ? t(getErrorKey(form.errors.form as string)) : null
  );

  let hasError = $derived(!!clientError);

  const ratingDisplay = $derived(
    data.profileDetail.rating != null
      ? String(data.profileDetail.rating)
      : t('profile.rating.unrated')
  );

  function formatMemberSince(dateStr: string): string {
    const date = new Date(dateStr);
    const formatted = new Intl.DateTimeFormat('vi-VN', {
      month: 'long',
      year: 'numeric'
    }).format(date);
    return t('profile.memberSince').replace('{date}', formatted);
  }
</script>

<CommandCenter center={centerContent} loading={isLoading} loadingContent={skeletonContent} />

{#snippet skeletonContent()}
  <div class="profile-center">
    <div class="skeleton-bar" style="width: 100px; height: 1.25rem;"></div>
    <div class="skeleton-bar" style="width: 160px; height: 1rem;"></div>
    <div class="skeleton-bar" style="width: 120px; height: 0.8rem;"></div>
    <div class="skeleton-bar" style="width: 80px; height: 0.8rem;"></div>
    <hr class="divider" />
    {#each [1, 2, 3] as _}
      <div class="stat-row">
        <div class="skeleton-bar" style="width: 80px;"></div>
        <div class="skeleton-bar" style="width: 40px;"></div>
      </div>
    {/each}
  </div>
{/snippet}

{#snippet centerContent()}
  <div class="profile-center">
    <h1 class="section-header">{t('profile.title')}</h1>

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
              toast.success(t('profile.displayName.saved'), { duration: 4000 });
            } else if (result.type === 'failure') {
              displayName = previousDisplayName;
            }
            await update();
          };
        }}
        novalidate
      >
        <div class="field">
          <label for="displayName" class="field-label">{t('profile.displayName.label')}</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autocomplete="username"
            placeholder={t('profile.displayName.placeholder')}
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
            {submitting ? t('profile.displayName.saving') : t('profile.displayName.save')}
          </button>
          <button type="button" class="text-link" onclick={cancelEditing} disabled={submitting}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    {:else}
      <div class="name-row">
        <span class="display-name">{displayName || '—'}</span>
        <button class="text-link" onclick={startEditing}>{t('profile.displayName.edit')}</button>
      </div>
    {/if}

    <span class="text-secondary">{formatMemberSince(data.profileDetail.createdAt)}</span>

    <div class="stat-row">
      <span class="text-secondary">{t('profile.rating')}</span>
      <span class="stat-value">{ratingDisplay}</span>
    </div>

    <a href="/user/settings" class="text-link">{t('profile.settings')}</a>

    <hr class="divider" />

    <span class="section-header">{t('profile.stats.title')}</span>
    <div class="stats">
      <div class="stat-row">
        <span class="text-secondary">{t('profile.stats.gamesPlayed')}</span>
        <span class="stat-value">{data.stats.gamesPlayed}</span>
      </div>
      <div class="stat-row">
        <span class="text-secondary">{t('profile.stats.wins')}</span>
        <span class="stat-value">{data.stats.wins}</span>
      </div>
      <div class="stat-row">
        <span class="text-secondary">{t('profile.stats.losses')}</span>
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

  .skeleton-bar {
    background: var(--theme-bg-dark, #222);
    border-radius: 2px;
    height: 0.875rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-bar {
      animation: none;
      opacity: 0.6;
    }
  }
</style>
