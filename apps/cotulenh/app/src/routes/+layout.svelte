<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import '../app.css';
  import '@cotulenh/board/assets/commander-chess.pieces.css';
  import Sonner from '$lib/components/ui/sonner/sonner.svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import SettingsDialog from '$lib/components/SettingsDialog.svelte';
  import ShortcutsDialog from '$lib/components/ShortcutsDialog.svelte';
  import { Menu, Home, PenSquare, Settings, Keyboard, BookOpen, Puzzle } from 'lucide-svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  const i18n = getI18n();

  let settingsOpen = $state(false);
  let shortcutsOpen = $state(false);

  $effect(() => {
    if (browser) {
      themeStore.init();
    }
  });
</script>

<div class="app-container">
  <Sonner />

  <!-- Desktop Sidebar -->
  <aside class="sidebar max-md:hidden">
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
      <a href="/" class="sidebar-link" class:active={$page.url.pathname === '/'} title={i18n.t('nav.introduction')}>
        <BookOpen class="sidebar-icon" />
        <span class="sidebar-label">{i18n.t('nav.intro')}</span>
      </a>
      <a
        href="/play"
        class="sidebar-link"
        class:active={$page.url.pathname === '/play'}
        title={i18n.t('nav.play')}
      >
        <Home class="sidebar-icon" />
        <span class="sidebar-label">{i18n.t('nav.play')}</span>
      </a>
      <a
        href="/puzzles"
        class="sidebar-link"
        class:active={$page.url.pathname === '/puzzles'}
        title={i18n.t('nav.puzzles')}
      >
        <Puzzle class="sidebar-icon" />
        <span class="sidebar-label">{i18n.t('nav.puzzles')}</span>
      </a>
      <a
        href="/board-editor"
        class="sidebar-link"
        class:active={$page.url.pathname === '/board-editor'}
        title={i18n.t('nav.editor')}
      >
        <PenSquare class="sidebar-icon" />
        <span class="sidebar-label">{i18n.t('nav.editor')}</span>
      </a>
    </nav>

    <div class="sidebar-footer">
      <button
        class="sidebar-link"
        onclick={() => (shortcutsOpen = true)}
        title={i18n.t('nav.keyboardShortcuts')}
      >
        <Keyboard class="sidebar-icon" />
        <span class="sidebar-label">{i18n.t('nav.shortcuts')}</span>
      </button>
      <button class="sidebar-link" onclick={() => (settingsOpen = true)} title={i18n.t('nav.settings')}>
        <Settings class="sidebar-icon" />
        <span class="sidebar-label">{i18n.t('nav.settings')}</span>
      </button>
    </div>
  </aside>

  <!-- Mobile Menu Button -->
  {#if browser}
    <div class="mobile-menu hidden max-md:block">
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
                <BookOpen size={16} />
                {i18n.t('nav.introduction')}
              </a>
            {/snippet}
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            {#snippet child({ props })}
              <a href="/play" {...props}>
                <Home size={16} />
                {i18n.t('nav.play')}
              </a>
            {/snippet}
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            {#snippet child({ props })}
              <a href="/puzzles" {...props}>
                <Puzzle size={16} />
                {i18n.t('nav.puzzles')}
              </a>
            {/snippet}
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            {#snippet child({ props })}
              <a href="/board-editor" {...props}>
                <PenSquare size={16} />
                {i18n.t('nav.editor')}
              </a>
            {/snippet}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={() => (shortcutsOpen = true)}>
            <Keyboard size={16} />
            {i18n.t('nav.keyboardShortcuts')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => (settingsOpen = true)}>
            <Settings size={16} />
            {i18n.t('nav.settings')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  {/if}

  <!-- Dialogs -->
  <SettingsDialog bind:open={settingsOpen} />
  <ShortcutsDialog bind:open={shortcutsOpen} />

  <main class="app-content max-md:ml-0">
    {@render children()}
  </main>
</div>

<style>
  /* Themeable styles - uses CSS variables from loaded theme */
  :global(body) {
    background-color: var(--theme-bg-dark, #111);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-ui);
    margin: 0;
    overflow-x: hidden;
  }

  .app-container {
    min-height: 100vh;
    display: flex;
    background: var(--theme-bg-dark, #111);
  }

  /* Desktop Sidebar */
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 80px;
    background: var(--theme-bg-panel, #222);
    border-right: 1px solid var(--theme-border, #444);
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
    border-top: 1px solid var(--theme-border, #444);
    padding-top: 0.75rem;
    margin-top: 0.75rem;
  }

  .sidebar-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 0.25rem;
    border-radius: 8px;
    text-decoration: none;
    color: var(--theme-text-secondary, #aaa);
    font-weight: 500;
    font-size: 0.6rem;
    border: 1px solid transparent;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.02em;
    background: transparent;
    cursor: pointer;
  }

  .sidebar-link:hover {
    color: var(--theme-primary, #06b6d4);
    background: var(--theme-bg-elevated, #333);
    border-color: var(--theme-border, #444);
  }

  .sidebar-link.active {
    color: var(--theme-text-inverse, #000);
    background: var(--theme-primary, #06b6d4);
    border-color: var(--theme-primary, #06b6d4);
    font-weight: 700;
  }

  .sidebar-icon {
    width: 22px;
    height: 22px;
  }

  .sidebar-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    text-align: center;
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
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    color: var(--theme-primary, #06b6d4);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    z-index: 151;
  }

  .mobile-menu-trigger:hover {
    background: var(--theme-bg-elevated, #333);
    border-color: var(--theme-primary, #06b6d4);
  }

  /* Main Content */
  .app-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: 80px;
    min-height: 100vh;
  }

  @media (max-width: 768px) {
    .sidebar {
      display: none;
    }

    .app-content {
      margin-left: 0;
    }

    .mobile-menu {
      display: block;
    }
  }
</style>
