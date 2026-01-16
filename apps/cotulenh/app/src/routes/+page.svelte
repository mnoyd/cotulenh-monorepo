<script lang="ts">
  import { Info, Users, Share2, Puzzle, Bot, Gamepad2, BookOpen } from 'lucide-svelte';
  import { getI18n } from '$lib/i18n';

  const i18n = getI18n();
</script>

<main class="intro-page">
  <div class="intro-container">
    <header class="intro-header">
      <div class="demo-badge">
        <Info size={16} />
        <span>{i18n.t('home.demoBadge')}</span>
      </div>
      <h1>
        <span class="title-green">{i18n.t('home.title')}</span>
        <span class="title-cyan">{i18n.t('home.titleOnline')}</span>
      </h1>
      <p class="tagline">
        {i18n.t('home.tagline')}
      </p>
    </header>

    <section class="features-section">
      <h2>{i18n.t('home.whatYouCanDo')}</h2>

      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon learn-icon">
            <BookOpen size={32} />
          </div>
          <h3>Learn to Play</h3>
          <p>Interactive lessons to master Cờ Tư Lệnh step by step. Perfect for beginners!</p>
          <a href="/learn" class="feature-link">Start Learning →</a>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <Gamepad2 size={32} />
          </div>
          <h3>{i18n.t('home.reviewGames.title')}</h3>
          <p>{i18n.t('home.reviewGames.desc')}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <Share2 size={32} />
          </div>
          <h3>{i18n.t('home.shareWithFriends.title')}</h3>
          <p>{i18n.t('home.shareWithFriends.desc')}</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <Puzzle size={32} />
          </div>
          <h3>{i18n.t('home.createPuzzles.title')}</h3>
          <p>{i18n.t('home.createPuzzles.desc')}</p>
        </div>
      </div>
    </section>

    <section class="coming-soon-section">
      <h2>{i18n.t('home.comingSoon')}</h2>

      <div class="coming-soon-grid">
        <div class="coming-soon-card">
          <div class="coming-icon">
            <Users size={28} />
          </div>
          <div class="coming-content">
            <h3>{i18n.t('home.multiplayer.title')}</h3>
            <p>{i18n.t('home.multiplayer.desc')}</p>
          </div>
        </div>

        <div class="coming-soon-card">
          <div class="coming-icon">
            <Bot size={28} />
          </div>
          <div class="coming-content">
            <h3>{i18n.t('home.aiBot.title')}</h3>
            <p>{i18n.t('home.aiBot.desc')}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="cta-section">
      <a href="/play" class="cta-button">{i18n.t('home.startPlaying')}</a>
      <a href="/board-editor" class="cta-button secondary">{i18n.t('home.openEditor')}</a>
    </div>
  </div>
</main>

<style>
  .intro-page {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background: var(--theme-bg-dark, #000);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-ui);
    padding: 2rem 1rem;
  }

  .intro-container {
    width: 100%;
    max-width: 800px;
  }

  .intro-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .demo-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--theme-bg-elevated, #333);
    border: 1px solid var(--theme-border, #444);
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin-bottom: 1.5rem;
  }

  .intro-header h1 {
    font-size: 2.5rem;
    margin: 0 0 1rem 0;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .title-green {
    color: #22c55e;
  }

  .title-cyan {
    color: #06b6d4;
    font-weight: 300;
  }

  .tagline {
    font-size: 1.125rem;
    color: var(--theme-text-secondary, #aaa);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .tagline strong {
    color: var(--theme-text-primary, #eee);
  }

  .features-section,
  .coming-soon-section {
    margin-bottom: 3rem;
  }

  h2 {
    font-size: 1.25rem;
    color: var(--theme-text-secondary, #aaa);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1.5rem;
    font-weight: 500;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .feature-card {
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .feature-icon {
    color: var(--theme-success, #22c55e);
    margin-bottom: 1rem;
  }

  .feature-icon.learn-icon {
    color: var(--theme-primary, #06b6d4);
  }

  .feature-link {
    display: inline-block;
    margin-top: 0.75rem;
    color: var(--theme-primary, #06b6d4);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .feature-link:hover {
    text-decoration: underline;
  }

  .feature-card h3 {
    font-size: 1.125rem;
    margin: 0 0 0.5rem 0;
    color: var(--theme-text-primary, #eee);
  }

  .feature-card p {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
    line-height: 1.5;
  }

  .coming-soon-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .coming-soon-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--theme-bg-panel, #222);
    border: 1px dashed var(--theme-border, #444);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .coming-icon {
    color: var(--theme-primary, #06b6d4);
    opacity: 0.7;
  }

  .coming-content h3 {
    font-size: 1rem;
    margin: 0 0 0.25rem 0;
    color: var(--theme-text-primary, #eee);
  }

  .coming-content p {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
  }

  .cta-section {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .cta-button {
    display: inline-flex;
    align-items: center;
    padding: 0.875rem 2rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    text-decoration: none;
    background: var(--theme-success, #22c55e);
    color: var(--theme-text-inverse, #000);
    border: 1px solid var(--theme-success, #22c55e);
  }

  .cta-button:hover {
    background: color-mix(in srgb, var(--theme-success) 85%, black);
    border-color: color-mix(in srgb, var(--theme-success) 85%, black);
  }

  .cta-button.secondary {
    background: transparent;
    color: var(--theme-primary, #06b6d4);
    border-color: var(--theme-primary, #06b6d4);
  }

  .cta-button.secondary:hover {
    background: var(--theme-primary-dim, rgba(6, 182, 212, 0.2));
  }

  @media (max-width: 640px) {
    .intro-header h1 {
      font-size: 1.75rem;
    }

    .tagline {
      font-size: 1rem;
    }
  }
</style>
