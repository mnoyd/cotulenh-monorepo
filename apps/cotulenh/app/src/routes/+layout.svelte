<script lang="ts">
  import { browser } from '$app/environment';
  import { deserialize } from '$app/forms';
  import { enhance } from '$app/forms';
  import { invalidate } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import '../app.css';
  import '@cotulenh/board/assets/commander-chess.pieces.css';
  import Sonner from '$lib/components/ui/sonner/sonner.svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import SettingsDialog from '$lib/components/SettingsDialog.svelte';
  import ShortcutsDialog from '$lib/components/ShortcutsDialog.svelte';
  import {
    Menu,
    Home,
    PenSquare,
    Settings,
    Keyboard,
    BookOpen,
    Puzzle,
    LogIn,
    LogOut,
    UserCircle,
    Users
  } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { saveSettings as persistSettings, type Settings as AppSettings } from '$lib/stores/settings';
  import { getI18n } from '$lib/i18n/index.svelte';
  import { joinLobby, leaveLobby } from '$lib/friends/presence.svelte';
  import {
    subscribeToInvitations,
    unsubscribeFromInvitations,
    onInvitationRealtimeEvent
  } from '$lib/invitations/realtime.svelte';
  import type { InvitationRealtimeEvent } from '$lib/invitations/realtime.svelte';
  import MatchInvitationToast from '$lib/components/MatchInvitationToast.svelte';
  import { goto } from '$app/navigation';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  const i18n = getI18n();

  let settingsOpen = $state(false);
  let shortcutsOpen = $state(false);
  let dbSettingsSynced = false;

  // Invitation notification state
  let pendingInvitationToast = $state<{
    id: string;
    fromUser: string;
    fromDisplayName: string;
    gameConfig: { timeMinutes: number; incrementSeconds: number };
  } | null>(null);

  let isAuthenticated = $derived(!!$page.data.user);

  let displayName = $derived($page.data.profile?.displayName ?? $page.data.user?.email ?? '');

  let avatarLetter = $derived(displayName ? displayName.charAt(0).toUpperCase() : '?');

  $effect(() => {
    if (browser) {
      themeStore.init();
    }
  });

  // Sync DB settings to localStorage once per page load (AC4: settings persistence across devices)
  $effect(() => {
    if (browser && isAuthenticated && !dbSettingsSynced) {
      const profile = $page.data.profile as { displayName: string; settingsJson?: Record<string, unknown> } | null;
      const dbSettings = profile?.settingsJson as Partial<AppSettings> | undefined;
      if (dbSettings && Object.keys(dbSettings).length > 0) {
        const saved = persistSettings(dbSettings);
        themeStore.setTheme(saved.theme);
        dbSettingsSynced = true;
      }
    }
  });

  // Join/leave lobby based on auth state (AC5, AC6)
  $effect(() => {
    if (browser && isAuthenticated) {
      const user = $page.data.user;
      if (user) {
        joinLobby($page.data.supabase, user.id);
        subscribeToInvitations($page.data.supabase, user.id);
      }
    } else if (browser && !isAuthenticated) {
      leaveLobby();
      unsubscribeFromInvitations();
    }
  });

  // Handle invitation realtime events — show toast for incoming invitations
  $effect(() => {
    if (!browser || !isAuthenticated) return;

    const unsub = onInvitationRealtimeEvent(async (event: InvitationRealtimeEvent) => {
      if (event.type === 'received') {
        // Fetch sender display name
        const { data: profile } = await $page.data.supabase
          .from('profiles')
          .select('display_name')
          .eq('id', event.fromUser)
          .single();

        pendingInvitationToast = {
          id: event.id,
          fromUser: event.fromUser,
          fromDisplayName: profile?.display_name ?? i18n.t('common.loading'),
          gameConfig: event.gameConfig
        };
      } else if (event.type === 'statusChanged') {
        if (event.newStatus === 'accepted') {
          // Look up the game created from this invitation
          const { data: game } = await $page.data.supabase
            .from('games')
            .select('id')
            .eq('invitation_id', event.id)
            .single();
          if (game) {
            toast.success(i18n.t('invitation.toast.accepted'), {
              action: {
                label: i18n.t('game.goToGame'),
                onClick: () => goto(`/play/online/${game.id}`)
              }
            });
          } else {
            toast.success(i18n.t('invitation.toast.accepted'));
          }
        } else if (event.newStatus === 'declined') {
          toast.info(i18n.t('invitation.toast.declined'));
        }
      } else if (event.type === 'deleted') {
        // Sender cancelled — dismiss toast if it's for this invitation
        if (pendingInvitationToast?.id === event.id) {
          pendingInvitationToast = null;
        }
      }
    });

    return unsub;
  });

  onMount(() => {
    const {
      data: { subscription }
    } = $page.data.supabase.auth.onAuthStateChange(
      () => {
        invalidate('supabase:auth');
      }
    );

    // Leave lobby and unsubscribe on page unload (AC6)
    function handleBeforeUnload() {
      leaveLobby();
      unsubscribeFromInvitations();
    }
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      leaveLobby();
      unsubscribeFromInvitations();
    };
  });
</script>

<div class="app-container">
  <Sonner />

  <!-- Invitation notification toast -->
  {#if pendingInvitationToast}
    <MatchInvitationToast
      invitationId={pendingInvitationToast.id}
      fromDisplayName={pendingInvitationToast.fromDisplayName}
      gameConfig={pendingInvitationToast.gameConfig}
      onaccept={async (invitationId) => {
        const response = await fetch('/play/online?/acceptInvitation', {
          method: 'POST',
          body: new URLSearchParams({ invitationId }),
          headers: { 'x-sveltekit-action': 'true' }
        });
        pendingInvitationToast = null;
        const result = deserialize(await response.text());
        if (result.type === 'success' && result.data) {
          const gameId = (result.data as { gameId?: string }).gameId;
          if (gameId) {
            goto(`/play/online/${gameId}`);
          }
        } else {
          toast.error(i18n.t('invitation.toast.acceptFailed'));
        }
      }}
      ondecline={async (invitationId) => {
        const response = await fetch('/play/online?/declineInvitation', {
          method: 'POST',
          body: new URLSearchParams({ invitationId }),
          headers: { 'x-sveltekit-action': 'true' }
        });
        pendingInvitationToast = null;
        const declineResult = deserialize(await response.text());
        if (declineResult.type !== 'success') {
          toast.error(i18n.t('invitation.toast.declineFailed'));
        }
      }}
      ondismiss={() => { pendingInvitationToast = null; }}
    />
  {/if}

  <!-- Desktop Sidebar -->
  <aside class="sidebar max-md:hidden">
    <div class="sidebar-brand">
      <img class="logo-icon" src="/favicon.svg" alt={i18n.t('nav.appName')} />
    </div>

    <nav class="sidebar-nav">
      <a
        href="/"
        class="sidebar-link"
        class:active={$page.url.pathname === '/'}
        title={i18n.t('nav.introduction')}
      >
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
      {#if isAuthenticated}
        <a
          href="/user/friends"
          class="sidebar-link"
          class:active={$page.url.pathname === '/user/friends'}
          title={i18n.t('nav.friends')}
        >
          <Users class="sidebar-icon" />
          <span class="sidebar-label">{i18n.t('nav.friends')}</span>
        </a>
      {/if}
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
      <button
        class="sidebar-link"
        onclick={() => (settingsOpen = true)}
        title={i18n.t('nav.settings')}
      >
        <Settings class="sidebar-icon" />
        <span class="sidebar-label">{i18n.t('nav.settings')}</span>
      </button>

      {#if isAuthenticated}
        <!-- Desktop User Menu -->
        <div class="user-section">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button
                class="user-trigger"
                aria-label={i18n.t('nav.userMenu')}
                title={i18n.t('nav.userMenu')}
              >
                <span class="user-avatar">{avatarLetter}</span>
                <span class="user-name">{displayName}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start" side="right">
              <DropdownMenu.Item>
                {#snippet child({ props })}
                  <a href="/user/profile" {...props}>
                    <UserCircle size={16} />
                    {i18n.t('nav.profile')}
                  </a>
                {/snippet}
              </DropdownMenu.Item>
              <DropdownMenu.Item>
                {#snippet child({ props })}
                  <a href="/user/settings" {...props}>
                    <Settings size={16} />
                    {i18n.t('nav.accountSettings')}
                  </a>
                {/snippet}
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>
                {#snippet child({ props })}
                  <form method="POST" action="/auth/logout" use:enhance>
                    <button type="submit" class="signout-menu-item" {...props}>
                      <LogOut size={16} />
                      {i18n.t('nav.signOut')}
                    </button>
                  </form>
                {/snippet}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      {:else}
        <!-- Desktop Sign In Link -->
        <a
          href="/auth/login"
          class="sidebar-link"
          title={i18n.t('nav.signIn')}
        >
          <LogIn class="sidebar-icon" />
          <span class="sidebar-label">{i18n.t('nav.signIn')}</span>
        </a>
      {/if}
    </div>
  </aside>

  <!-- Mobile Menu Button -->
  {#if browser}
    <div class="mobile-menu hidden max-md:block">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <button
            class="mobile-menu-trigger"
            aria-label={i18n.t('nav.menu')}
            title={i18n.t('nav.menu')}
          >
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
          {#if isAuthenticated}
            <DropdownMenu.Item>
              {#snippet child({ props })}
                <a href="/user/friends" {...props}>
                  <Users size={16} />
                  {i18n.t('nav.friends')}
                </a>
              {/snippet}
            </DropdownMenu.Item>
          {/if}
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={() => (shortcutsOpen = true)}>
            <Keyboard size={16} />
            {i18n.t('nav.keyboardShortcuts')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => (settingsOpen = true)}>
            <Settings size={16} />
            {i18n.t('nav.settings')}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          {#if isAuthenticated}
            <div class="mobile-user-info">
              <span class="user-avatar user-avatar-small">{avatarLetter}</span>
              <span class="mobile-user-name">{displayName}</span>
            </div>
            <DropdownMenu.Item>
              {#snippet child({ props })}
                <a href="/user/profile" {...props}>
                  <UserCircle size={16} />
                  {i18n.t('nav.profile')}
                </a>
              {/snippet}
            </DropdownMenu.Item>
            <DropdownMenu.Item>
              {#snippet child({ props })}
                <form method="POST" action="/auth/logout" use:enhance>
                  <button type="submit" class="signout-menu-item" {...props}>
                    <LogOut size={16} />
                    {i18n.t('nav.signOut')}
                  </button>
                </form>
              {/snippet}
            </DropdownMenu.Item>
          {:else}
            <DropdownMenu.Item>
              {#snippet child({ props })}
                <a href="/auth/login" {...props}>
                  <LogIn size={16} />
                  {i18n.t('nav.signIn')}
                </a>
              {/snippet}
            </DropdownMenu.Item>
          {/if}
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

  /* User Section */
  .user-section {
    margin-top: 0.25rem;
  }

  .user-trigger {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.25rem;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    width: 100%;
    min-height: 44px;
    color: var(--theme-text-secondary, #aaa);
  }

  .user-trigger:hover {
    color: var(--theme-primary, #06b6d4);
    background: var(--theme-bg-elevated, #333);
    border-color: var(--theme-border, #444);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--theme-primary, #06b6d4);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .user-avatar-small {
    width: 24px;
    height: 24px;
    font-size: 0.7rem;
  }

  .user-name {
    font-size: 0.55rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    text-align: center;
  }

  .signout-menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    padding: 0;
  }

  /* Mobile User Info */
  .mobile-user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem 0.25rem;
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.75rem;
  }

  .mobile-user-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-mono);
    font-size: 0.75rem;
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
