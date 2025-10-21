<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="app-container">
  <nav class="app-nav">
    <div class="nav-content">
      <h2 class="nav-title">CoTuLenh</h2>
      <div class="nav-links">
        <a 
          href="/" 
          class="nav-link"
          class:active={$page.url.pathname === '/'}
        >
          Play Game
        </a>
        <a 
          href="/board-editor" 
          class="nav-link"
          class:active={$page.url.pathname === '/board-editor'}
        >
          Board Editor
        </a>
      </div>
    </div>
  </nav>
  
  <div class="app-content">
    <slot />
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: var(--bg-base, #fafafa);
    color: var(--text-primary, #333);
  }

  :global(*) {
    box-sizing: border-box;
  }

  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .app-nav {
    background: var(--bg-nav, #ffffff);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
  }

  .nav-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary, #333);
    background: linear-gradient(135deg, #dc3545 0%, #007bff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .nav-links {
    display: flex;
    gap: 0.5rem;
  }

  .nav-link {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    text-decoration: none;
    color: var(--text-secondary, #666);
    font-weight: 500;
    transition: all 0.2s;
    position: relative;
  }

  .nav-link:hover {
    background: var(--bg-hover, #f5f5f5);
    color: var(--text-primary, #333);
  }

  .nav-link.active {
    background: var(--bg-active, #007bff);
    color: white;
  }

  .app-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 768px) {
    .nav-content {
      padding: 0 0.75rem;
    }

    .nav-title {
      font-size: 1.25rem;
    }

    .nav-links {
      gap: 0.25rem;
    }

    .nav-link {
      padding: 0.4rem 0.75rem;
      font-size: 0.9rem;
    }
  }
</style>
