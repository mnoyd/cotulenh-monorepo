<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { getI18n } from '$lib/i18n/index.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Loader2, Clock, Copy, Check, AlertTriangle } from 'lucide-svelte';
  import type { PageData } from './$types';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();
  let submitting = $state(false);
  let copied = $state(false);
  let srAnnouncement = $state('');

  let inviteUrl = $derived(
    typeof window !== 'undefined'
      ? `${window.location.origin}/play/online/invite/${$page.params.code}`
      : `/play/online/invite/${$page.params.code}`
  );

  let timeLabel = $derived(
    data.invitation
      ? `${data.invitation.gameConfig.timeMinutes}+${data.invitation.gameConfig.incrementSeconds}`
      : ''
  );

  let redirectTo = $derived(`/play/online/invite/${$page.params.code}`);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      copied = true;
      srAnnouncement = i18n.t('common.copied');
      setTimeout(() => {
        copied = false;
        srAnnouncement = '';
      }, 2000);
    } catch {
      srAnnouncement = i18n.t('share.toastCopyFailed');
      setTimeout(() => {
        srAnnouncement = '';
      }, 2000);
    }
  }
</script>

<svelte:head>
  <title>{i18n.t('inviteLink.pageTitle')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<div class="invite-page">
  <div class="invite-card">
    {#if !data.invitation}
      <!-- Expired / Invalid / Already accepted -->
      <div class="invite-expired">
        <AlertTriangle size={48} class="expired-icon" />
        <h1 class="invite-title">{i18n.t('inviteLink.expired.title')}</h1>
        <p class="invite-desc">{i18n.t('inviteLink.expired.description')}</p>
        <Button href="/" variant="outline" size="lg">
          {i18n.t('common.backToHome')}
        </Button>
      </div>
    {:else if data.isOwnInvitation}
      <!-- Own invitation -->
      <div class="invite-own">
        <div class="inviter-info">
          <span class="inviter-avatar" aria-hidden="true">
            {data.invitation.fromUser.displayName.charAt(0).toUpperCase() || '?'}
          </span>
          <h1 class="invite-title">{i18n.t('inviteLink.own.title')}</h1>
        </div>
        <p class="invite-desc">{i18n.t('inviteLink.own.description')}</p>
        <div class="time-control">
          <Clock size={18} />
          <span>{timeLabel}</span>
        </div>
        <div class="copy-section">
          <input type="text" readonly value={inviteUrl} class="link-input" aria-label={i18n.t('inviteLink.linkLabel')} />
          <Button
            size="sm"
            class="copy-btn"
            onclick={copyLink}
            aria-label={copied ? i18n.t('common.copied') : i18n.t('inviteLink.copyLink')}
          >
            {#if copied}
              <Check size={16} />
              {i18n.t('common.copied')}
            {:else}
              <Copy size={16} />
              {i18n.t('inviteLink.copyLink')}
            {/if}
          </Button>
        </div>
      </div>
    {:else if data.isAuthenticated}
      <!-- Authenticated user — can accept -->
      <div class="invite-accept">
        <div class="inviter-info">
          <span class="inviter-avatar" aria-hidden="true">
            {data.invitation.fromUser.displayName.charAt(0).toUpperCase() || '?'}
          </span>
          <div class="inviter-details">
            <span class="inviter-name">{data.invitation.fromUser.displayName}</span>
            <span class="inviter-label">{i18n.t('inviteLink.invitedYou')}</span>
          </div>
        </div>
        <div class="time-control">
          <Clock size={18} />
          <span>{timeLabel}</span>
        </div>
        <form
          method="POST"
          action="?/acceptInviteLink"
          use:enhance={() => {
            submitting = true;
            return async ({ update }) => {
              submitting = false;
              await update();
            };
          }}
        >
          <Button type="submit" size="lg" disabled={submitting} class="accept-btn" autofocus>
            {#if submitting}
              <Loader2 size={18} class="animate-spin" />
            {/if}
            {i18n.t('inviteLink.acceptAndPlay')}
          </Button>
        </form>
      </div>
    {:else}
      <!-- Unauthenticated visitor — prompt to sign up or log in -->
      <div class="invite-auth">
        <div class="inviter-info">
          <span class="inviter-avatar" aria-hidden="true">
            {data.invitation.fromUser.displayName.charAt(0).toUpperCase() || '?'}
          </span>
          <div class="inviter-details">
            <span class="inviter-name">{data.invitation.fromUser.displayName}</span>
            <span class="inviter-label">{i18n.t('inviteLink.invitedYou')}</span>
          </div>
        </div>
        <div class="time-control">
          <Clock size={18} />
          <span>{timeLabel}</span>
        </div>
        <div class="auth-actions">
          <Button
            href="/auth/register?redirectTo={encodeURIComponent(redirectTo)}"
            size="lg"
            class="signup-btn"
            autofocus
          >
            {i18n.t('inviteLink.signUpToPlay')}
          </Button>
          <p class="login-prompt">
            {i18n.t('inviteLink.alreadyHaveAccount')}
            <a href="/auth/login?redirectTo={encodeURIComponent(redirectTo)}">
              {i18n.t('inviteLink.logIn')}
            </a>
          </p>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Screen reader announcements -->
<div class="sr-only" aria-live="polite" aria-atomic="true">{srAnnouncement}</div>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .invite-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
    background:
      radial-gradient(ellipse at center, rgba(6, 182, 212, 0.05) 0%, transparent 70%),
      var(--theme-bg-dark, #111);
  }

  .invite-card {
    width: 100%;
    max-width: 420px;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 12px;
    padding: 2rem;
  }

  .inviter-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .inviter-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--theme-primary, #06b6d4);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 700;
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .inviter-details {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .inviter-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
  }

  .inviter-label {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .invite-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    margin: 0;
  }

  .invite-desc {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0 0 1rem;
    line-height: 1.5;
  }

  .time-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #444);
    border-radius: 8px;
    color: var(--theme-text-primary, #eee);
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 1.25rem;
  }

  .auth-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  :global(.signup-btn) {
    width: 100%;
    min-height: 44px;
  }

  :global(.accept-btn) {
    width: 100%;
    min-height: 44px;
  }

  .login-prompt {
    text-align: center;
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
  }

  .login-prompt a {
    color: var(--theme-primary, #06b6d4);
    text-decoration: none;
    font-weight: 500;
  }

  .login-prompt a:hover {
    text-decoration: underline;
  }

  /* Expired state */
  .invite-expired {
    text-align: center;
    padding: 1rem 0;
  }

  :global(.expired-icon) {
    color: var(--theme-text-secondary, #888);
    margin-bottom: 1rem;
  }

  /* Own invitation state */
  .invite-own {
    display: flex;
    flex-direction: column;
  }

  .copy-section {
    display: flex;
    gap: 0.5rem;
  }

  .link-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #444);
    border-radius: 8px;
    color: var(--theme-text-primary, #eee);
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-input:focus {
    outline: 2px solid var(--theme-primary, #06b6d4);
    outline-offset: -2px;
  }

  :global(.copy-btn) {
    min-height: 44px;
    min-width: 44px;
    flex-shrink: 0;
  }

  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
