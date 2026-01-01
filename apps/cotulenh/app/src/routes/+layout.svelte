<script lang="ts">
  import { page } from '$app/stores';
  import { logger } from '@cotulenh/common';
  import { onMount } from 'svelte';
  import '../app.css';
  import Sonner from '$lib/components/ui/sonner/sonner.svelte';

  onMount(() => {
    logger.info('CoTuLenh App Initialized');
    // Future: Register Sentry processor here
    // logger.registerProcessor(new SentryProcessor());
  });
</script>

<div class="app-container">
  <Sonner />
  <nav class="app-nav">
    <div class="nav-content">
      <div class="nav-brand">
        <svg class="logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <g transform="translate(-128, -170) scale(1.5)">
            <!-- Chin Strap (behind helmet brim) -->
            <path
              d="M 176 340 C 176 420 336 420 336 340"
              fill="none"
              stroke="#2a4d36"
              stroke-width="8"
              stroke-linecap="round"
            />
            <!-- Chin Strap Buckle -->
            <rect
              x="241"
              y="395"
              width="30"
              height="14"
              rx="4"
              fill="#6b7c4b"
              stroke="#2a4d36"
              stroke-width="2"
            />

            <!-- HELMET -->
            <!-- Main Dome (Green) -->
            <path d="M 160 300 C 160 140 352 140 352 300 Z" fill="#3c7a46" />

            <!-- Ribs/Segments on the dome (Dark Green Lines) -->
            <!-- Center Vertical Line -->
            <line x1="256" y1="180" x2="256" y2="300" stroke="#204526" stroke-width="4" />
            <!-- Left Curve -->
            <path d="M 256 182 Q 200 180 196 300" fill="none" stroke="#204526" stroke-width="4" />
            <!-- Right Curve -->
            <path d="M 256 182 Q 312 180 316 300" fill="none" stroke="#204526" stroke-width="4" />

            <!-- Horizontal Band around dome (just above brim) -->
            <path
              d="M 160 280 Q 256 260 352 280 L 352 300 Q 256 280 160 300 Z"
              fill="#33683b"
              stroke="#204526"
              stroke-width="3"
            />

            <!-- Brim (projecting front/sides) -->
            <path
              d="M 130 310 Q 256 270 382 310 L 370 345 Q 256 315 142 345 Z"
              fill="#3c7a46"
              stroke="#204526"
              stroke-width="4"
              stroke-linejoin="round"
            />

            <!-- Yellow Circle with Red Star Emblem -->
            <circle cx="256" cy="245" r="28" fill="#fdd835" stroke="#e65100" stroke-width="2" />
            <!-- Red Star -->
            <polygon
              points="256,227 263,243 280,243 266,254 271,270 256,260 241,270 246,254 232,243 249,243"
              fill="#d32f2f"
            />

            <!-- Little knob on top -->
            <path
              d="M 246 180 Q 256 170 266 180 Z"
              fill="#3c7a46"
              stroke="#204526"
              stroke-width="3"
            />
          </g>
        </svg>
        <h2 class="nav-title">Cờ Tư Lệnh Việt Nam</h2>
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
  :global(body) {
    background-color: var(--color-mw-bg-dark);
    color: #e5e5e5;
    font-family: var(--font-ui);
    margin: 0;
  }

  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--color-mw-bg-dark);
  }

  .app-nav {
    background: var(--color-mw-bg-panel);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-mw-border);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-content {
    max-width: 1600px;
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 70px;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo-icon {
    width: 48px;
    height: 48px;
    color: var(--color-mw-primary);
    filter: drop-shadow(0 0 8px rgba(0, 243, 255, 0.5));
  }

  .nav-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: linear-gradient(135deg, #fff 0%, var(--color-mw-primary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .nav-links {
    display: flex;
    gap: 0.5rem;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
    font-size: 0.95rem;
    transition: all 0.2s ease;
    border: 1px solid transparent;
  }

  .nav-link:hover {
    color: var(--color-mw-primary);
    background: rgba(0, 243, 255, 0.1);
    border-color: var(--color-mw-border);
    box-shadow: 0 0 10px rgba(0, 243, 255, 0.1);
  }

  .nav-link.active {
    color: var(--color-mw-bg-dark);
    background: var(--color-mw-primary);
    border-color: var(--color-mw-primary);
    box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
    font-weight: 700;
  }

  .nav-icon {
    width: 20px;
    height: 20px;
    stroke-width: 2;
  }

  .app-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 768px) {
    .nav-content {
      padding: 0 1rem;
      height: 60px;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
    }

    .nav-title {
      font-size: 1.1rem;
    }

    .nav-link {
      padding: 0.5rem;
      font-size: 0.875rem;
    }

    .nav-link span {
      display: none;
    }
  }
</style>
