<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { logger } from '@cotulenh/common';
  import '../app.css';
  import '@cotulenh/board/assets/commander-chess.pieces.css';
  import Sonner from '$lib/components/ui/sonner/sonner.svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import SettingsDialog from '$lib/components/SettingsDialog.svelte';
  import ShortcutsDialog from '$lib/components/ShortcutsDialog.svelte';
  import { Menu, Home, PenSquare, Settings, Keyboard } from 'lucide-svelte';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let settingsOpen = $state(false);
  let shortcutsOpen = $state(false);

  $effect(() => {
    if (browser) {
      logger.info('CoTuLenh App Initialized');
    }
  });
</script>

<div class="app-container">
  <div class="scanline-overlay"></div>
  <div class="vignette-overlay"></div>
  <Sonner />

  <!-- Desktop Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-brand">
      <svg class="logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <g transform="translate(-128, -170) scale(1.5)">
          <path
            d="M 176 340 C 176 420 336 420 336 340"
            fill="none"
            stroke="#2a4d36"
            stroke-width="8"
            stroke-linecap="round"
          />
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
          <path d="M 160 300 C 160 140 352 140 352 300 Z" fill="#3c7a46" />
          <line x1="256" y1="180" x2="256" y2="300" stroke="#204526" stroke-width="4" />
          <path d="M 256 182 Q 200 180 196 300" fill="none" stroke="#204526" stroke-width="4" />
          <path d="M 256 182 Q 312 180 316 300" fill="none" stroke="#204526" stroke-width="4" />
          <path
            d="M 160 280 Q 256 260 352 280 L 352 300 Q 256 280 160 300 Z"
            fill="#33683b"
            stroke="#204526"
            stroke-width="3"
          />
          <path
            d="M 130 310 Q 256 270 382 310 L 370 345 Q 256 315 142 345 Z"
            fill="#3c7a46"
            stroke="#204526"
            stroke-width="4"
            stroke-linejoin="round"
          />
          <circle cx="256" cy="245" r="28" fill="#fdd835" stroke="#e65100" stroke-width="2" />
          <polygon
            points="256,227 263,243 280,243 266,254 271,270 256,260 241,270 246,254 232,243 249,243"
            fill="#d32f2f"
          />
          <path
            d="M 246 180 Q 256 170 266 180 Z"
            fill="#3c7a46"
            stroke="#204526"
            stroke-width="3"
          />
        </g>
      </svg>
    </div>

    <nav class="sidebar-nav">
      <a href="/" class="sidebar-link" class:active={$page.url.pathname === '/'} title="Deploy">
        <Home class="sidebar-icon" />
        <span class="sidebar-label">Deploy</span>
      </a>
      <a
        href="/board-editor"
        class="sidebar-link"
        class:active={$page.url.pathname === '/board-editor'}
        title="Editor"
      >
        <PenSquare class="sidebar-icon" />
        <span class="sidebar-label">Editor</span>
      </a>
    </nav>

    <div class="sidebar-footer">
      <button
        class="sidebar-link"
        onclick={() => (shortcutsOpen = true)}
        title="Keyboard Shortcuts"
      >
        <Keyboard class="sidebar-icon" />
        <span class="sidebar-label">Shortcuts</span>
      </button>
      <button class="sidebar-link" onclick={() => (settingsOpen = true)} title="Settings">
        <Settings class="sidebar-icon" />
        <span class="sidebar-label">Settings</span>
      </button>
    </div>
  </aside>

  <!-- Mobile Menu Button -->
  {#if browser}
    <div class="mobile-menu">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <button class="mobile-menu-trigger" aria-label="Menu" title="Menu">
            <Menu size={24} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start" side="bottom">
          <DropdownMenu.Item>
            {#snippet child({ props })}
              <a href="/" {...props}>
                <Home size={16} />
                Deploy
              </a>
            {/snippet}
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            {#snippet child({ props })}
              <a href="/board-editor" {...props}>
                <PenSquare size={16} />
                Editor
              </a>
            {/snippet}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={() => (shortcutsOpen = true)}>
            <Keyboard size={16} />
            Keyboard Shortcuts
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => (settingsOpen = true)}>
            <Settings size={16} />
            Settings
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  {/if}

  <!-- Dialogs -->
  <SettingsDialog bind:open={settingsOpen} />
  <ShortcutsDialog bind:open={shortcutsOpen} />

  <main class="app-content">
    {@render children()}
  </main>
</div>

<style>
  /* Global Overlays */
  .scanline-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0) 50%,
      rgba(0, 0, 0, 0.1) 50%,
      rgba(0, 0, 0, 0.1)
    );
    background-size: 100% 4px;
    z-index: 9998;
    opacity: 0.15;
    animation: scanline 8s linear infinite;
  }

  .vignette-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    background: radial-gradient(circle, transparent 50%, rgba(0, 0, 0, 0.7) 100%);
    z-index: 9999;
    animation: vignette-pulse 4s ease-in-out infinite;
  }

  :global(body) {
    background-color: var(--color-mw-bg-dark);
    color: #e5e5e5;
    font-family: var(--font-ui);
    margin: 0;
    overflow-x: hidden;
  }

  .app-container {
    min-height: 100vh;
    display: flex;
    background: radial-gradient(circle at top center, #1e293b 0%, var(--color-mw-bg-dark) 40%);
  }

  /* Desktop Sidebar */
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 72px;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(16px);
    border-right: 1px solid var(--color-mw-border);
    display: flex;
    flex-direction: column;
    z-index: 100;
    padding: 1rem 0;
  }

  .sidebar-brand {
    display: flex;
    justify-content: center;
    padding: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .logo-icon {
    width: 40px;
    height: 40px;
    filter: drop-shadow(0 0 10px rgba(0, 243, 255, 0.3));
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0 0.5rem;
    flex: 1;
  }

  .sidebar-footer {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0 0.5rem;
    border-top: 1px solid var(--color-mw-border);
    padding-top: 0.75rem;
    margin-top: 0.75rem;
  }

  .sidebar-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 0.5rem;
    border-radius: 8px;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
    font-size: 0.65rem;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: transparent;
    cursor: pointer;
  }

  .sidebar-link:hover {
    color: var(--color-mw-primary);
    background: rgba(0, 243, 255, 0.05);
    border-color: rgba(0, 243, 255, 0.2);
  }

  .sidebar-link.active {
    color: var(--color-mw-bg-dark);
    background: var(--color-mw-primary);
    border-color: var(--color-mw-primary);
    box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
    font-weight: 700;
  }

  .sidebar-icon {
    width: 22px;
    height: 22px;
  }

  .sidebar-label {
    white-space: nowrap;
  }

  /* Mobile Menu */
  .mobile-menu {
    display: none;
    position: fixed;
    top: 0.75rem;
    left: 0.75rem;
    z-index: 150;
  }

  .mobile-menu-trigger {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.9);
    color: var(--color-mw-primary);
    border: 1px solid var(--color-mw-border);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(8px);
    transition: all 0.2s ease;
  }

  .mobile-menu-trigger:hover {
    background: rgba(15, 23, 42, 1);
    border-color: var(--color-mw-primary);
    box-shadow: 0 0 15px rgba(0, 243, 255, 0.2);
  }

  .mobile-menu-trigger:active {
    transform: scale(0.95);
  }

  /* Main Content */
  .app-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: 72px;
    min-height: 100vh;
  }

  /* Mobile Styles */
  @media (max-width: 768px) {
    .sidebar {
      display: none;
    }

    .mobile-menu {
      display: block;
    }

    .app-content {
      margin-left: 0;
    }
  }

  @keyframes scanline {
    0% {
      background-position: 0% 0%;
    }
    100% {
      background-position: 0% 100%;
    }
  }

  @keyframes vignette-pulse {
    0%,
    100% {
      opacity: 0.6;
    }
    50% {
      opacity: 0.8;
    }
  }
</style>
