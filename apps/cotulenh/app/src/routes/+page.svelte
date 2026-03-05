<script lang="ts">
  import { page } from '$app/stores';
  import { getI18n } from '$lib/i18n/index.svelte';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import '$lib/styles/command-center.css';

  const i18n = getI18n();

  let isAuthenticated = $derived(!!$page.data.user);
</script>

{#if isAuthenticated}
  <CommandCenter
    center={centerContent}
    tabs={[
      { id: 'friends', label: i18n.t('nav.friends'), content: friendsTab },
      { id: 'activity', label: i18n.t('tabs.activity'), content: activityTab }
    ]}
  />
{:else}
  <div class="anon-home">
    <p class="anon-desc">{i18n.t('home.tagline')}</p>

    <a href="/play" class="primary-cta">PLAY</a>

    <p class="anon-sub">
      <a href="/auth/register" class="text-link">sign up to play online</a>
    </p>

    <hr class="divider" />

    <div class="anon-links">
      <a href="/learn" class="text-link">learn the game →</a>
      <a href="/board-editor" class="text-link">try the editor →</a>
    </div>
  </div>
{/if}

{#snippet centerContent()}
  <div class="home-center">
    <a href="/play" class="primary-cta">PLAY</a>

    <hr class="divider" />

    <h2 class="section-header">Explore</h2>
    <div class="flat-list">
      <a href="/learn" class="flat-list-item">
        <span>{i18n.t('home.learnToPlay.link')}</span>
      </a>
      <a href="/puzzles" class="flat-list-item">
        <span>{i18n.t('nav.puzzles')}</span>
      </a>
      <a href="/board-editor" class="flat-list-item">
        <span>{i18n.t('nav.editor')}</span>
      </a>
    </div>
  </div>
{/snippet}

{#snippet friendsTab()}
  <div class="tab-placeholder">
    <p class="section-header">{i18n.t('nav.friends')}</p>
    <p class="text-secondary">No friends online</p>
  </div>
{/snippet}

{#snippet activityTab()}
  <div class="tab-placeholder">
    <p class="section-header">Recent</p>
    <p class="text-secondary">No recent activity</p>
  </div>
{/snippet}

<style>
  .home-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding-top: 2rem;
  }

  .anon-home {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem 1rem;
    max-width: 400px;
    margin: 0 auto;
  }

  .anon-desc {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.875rem;
    text-align: center;
    margin: 0;
  }

  .anon-sub {
    margin: 0;
  }

  .anon-links {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
    margin: 0.5rem 0 0;
  }

  .tab-placeholder {
    display: flex;
    flex-direction: column;
  }
</style>
