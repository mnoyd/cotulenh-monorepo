<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="app-container">
  <nav class="app-nav">
    <div class="nav-content">
      <div class="nav-brand">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M12 22V12"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M2 7L12 12L22 7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <h2 class="nav-title">CoTuLenh</h2>
      </div>
      <div class="nav-links">
        <a href="/" class="nav-link" class:active={$page.url.pathname === '/'}>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Play Game</span>
        </a>
        <a
          href="/board-editor"
          class="nav-link"
          class:active={$page.url.pathname === '/board-editor'}
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Editor</span>
        </a>
      </div>
    </div>
  </nav>

  <div class="app-content">
    <slot />
  </div>
</div>

<style>
  :global(:root) {
    /* Color Palette */
    --color-primary: #2563eb;
    --color-primary-dark: #1e40af;
    --color-primary-light: #3b82f6;
    --color-secondary: #7c3aed;
    --color-accent: #f59e0b;
    --color-success: #10b981;
    --color-error: #ef4444;
    --color-warning: #f59e0b;

    /* Red Team Colors */
    --color-red: #dc2626;
    --color-red-light: #ef4444;
    --color-red-dark: #991b1b;

    /* Blue Team Colors */
    --color-blue: #3b82f6;
    --color-blue-light: #60a5fa;
    --color-blue-dark: #2563eb;

    /* Neutrals */
    --color-bg-base: #f8fafc;
    --color-bg-secondary: #f1f5f9;
    --color-bg-tertiary: #e2e8f0;
    --color-surface: #ffffff;
    --color-surface-raised: #f8fafc;
    --color-surface-overlay: #e2e8f0;

    /* Text Colors */
    --color-text-primary: #0f172a;
    --color-text-secondary: #334155;
    --color-text-tertiary: #64748b;
    --color-text-muted: #94a3b8;

    /* Borders */
    --color-border: #e2e8f0;
    --color-border-light: #cbd5e1;

    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

    /* Border Radius */
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;

    /* Spacing */
    --spacing-xs: 0.5rem;
    --spacing-sm: 0.75rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --spacing-2xl: 3rem;

    /* Transitions */
    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family:
      'Inter',
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      sans-serif;
    background: var(--color-bg-base);
    color: var(--color-text-primary);
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(h1, h2, h3, h4, h5, h6) {
    font-weight: 600;
    line-height: 1.2;
    margin: 0;
  }

  :global(button) {
    font-family: inherit;
  }

  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--app-bg, linear-gradient(180deg, var(--color-bg-base) 0%, #e0e7ef 100%));
  }

  .app-nav {
    background: var(--nav-bg, rgba(255, 255, 255, 0.9));
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--nav-border, var(--color-border));
    box-shadow: var(--shadow-md);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-content {
    max-width: 1600px;
    margin: 0 auto;
    padding: 0 var(--spacing-lg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 70px;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .logo-icon {
    width: 32px;
    height: 32px;
    color: var(--color-primary);
    filter: drop-shadow(0 0 8px rgba(37, 99, 235, 0.5));
  }

  .nav-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--nav-text, var(--color-text-primary));
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .nav-links {
    display: flex;
    gap: var(--spacing-xs);
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--nav-link-text, var(--color-text-secondary));
    font-weight: 500;
    font-size: 0.95rem;
    transition: all var(--transition-base);
    position: relative;
    overflow: hidden;
  }

  .nav-link::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
    opacity: 0;
    transition: opacity var(--transition-base);
    z-index: -1;
  }

  .nav-icon {
    width: 20px;
    height: 20px;
    stroke-width: 2;
  }

  .nav-link:hover {
    color: var(--nav-link-hover, var(--color-text-primary));
    transform: translateY(-1px);
  }

  .nav-link.active {
    color: white;
  }

  .nav-link.active::before {
    opacity: 1;
  }

  .app-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 768px) {
    .nav-content {
      padding: 0 var(--spacing-md);
      height: 60px;
    }

    .logo-icon {
      width: 28px;
      height: 28px;
    }

    .nav-title {
      font-size: 1.35rem;
    }

    .nav-links {
      gap: var(--spacing-xs);
    }

    .nav-link {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: 0.875rem;
    }

    .nav-link span {
      display: none;
    }

    .nav-icon {
      width: 22px;
      height: 22px;
    }
  }

  @media (max-width: 480px) {
    .nav-title {
      font-size: 1.2rem;
    }
  }
</style>
