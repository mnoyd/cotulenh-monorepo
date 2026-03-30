import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { installMockLocalStorage } from '../../../../test/local-storage';
import type { PageData } from './$types';

const { navigatingStore, setNavigating, isUserOnline } = vi.hoisted(() => {
  let currentValue: unknown = null;
  const subscribers = new Set<(value: unknown) => void>();

  return {
    navigatingStore: {
      subscribe(run: (value: unknown) => void) {
        run(currentValue);
        subscribers.add(run);
        return () => subscribers.delete(run);
      }
    },
    setNavigating(value: unknown) {
      currentValue = value;
      for (const subscriber of subscribers) subscriber(currentValue);
    },
    isUserOnline: vi.fn<[string], boolean>()
  };
});

vi.mock('$app/stores', () => ({
  navigating: navigatingStore
}));

vi.mock('$lib/friends/presence.svelte', () => ({
  isUserOnline
}));

vi.mock('$lib/components/FriendChallengeDialog.svelte', async () => {
  const component = await import('./page.svelte.test.stub.svelte');
  return { default: component.default };
});

import PublicProfilePage from './+page.svelte';

describe('public profile page component', () => {
  let target: HTMLDivElement;
  let component: ReturnType<typeof render> | undefined;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    installMockLocalStorage();
    setNavigating(null);
    isUserOnline.mockReturnValue(false);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    if (component) {
      unmount(component);
      component = undefined;
    }
    vi.unstubAllGlobals();
    target.remove();
  });

  function render(
    overrides: Partial<{
      data: Record<string, unknown>;
    }> = {}
  ) {
    return mount(PublicProfilePage, {
      target,
      props: {
        data: {
          user: null,
          profile: null,
          session: null,
          supabase: {} as PageData['supabase'],
          profileDetail: {
            id: 'profile-1',
            username: 'commander',
            displayName: 'Commander',
            avatarUrl: null,
            createdAt: '2026-01-15T00:00:00Z',
            rating: 1500,
            ratingGamesPlayed: 0
          },
          stats: { gamesPlayed: 12, wins: 7, losses: 5 },
          games: [],
          isOwnProfile: false,
          relationship: 'none',
          currentUserId: 'viewer-1',
          ...(overrides.data ?? {})
        } as PageData
      }
    });
  }

  it('shows add friend and challenge actions in Vietnamese for online visitors', () => {
    isUserOnline.mockReturnValue(true);

    component = render();
    flushSync();

    expect(target.textContent).toContain('Thêm bạn');
    expect(target.textContent).toContain('Thách đấu');
    expect(target.textContent).toContain('Xếp Hạng');
  });

  it('switches to pending state after sending a friend request', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }));

    component = render();
    flushSync();

    const addFriendButton = Array.from(target.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Thêm bạn')
    );

    expect(addFriendButton).toBeTruthy();
    addFriendButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    flushSync();

    expect(fetch).toHaveBeenCalledWith(
      '?/sendRequest',
      expect.objectContaining({ method: 'POST' })
    );
    expect(target.textContent).toContain('Đã gửi lời mời');
    expect(target.textContent).not.toContain('Thêm bạn');
  });

  it('renders skeleton placeholders while navigation is in progress', () => {
    setNavigating({ to: { url: new URL('http://localhost/@commander') } });

    component = render();
    flushSync();

    expect(target.querySelectorAll('.skeleton-bar').length).toBeGreaterThan(0);
    expect(target.textContent).not.toContain('Commander');
  });
});
