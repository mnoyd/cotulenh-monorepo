import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import OpenChallengeRow from './OpenChallengeRow.svelte';
import { installMockLocalStorage } from '../../test/local-storage';

const baseChallenge = {
  id: 'challenge-1',
  fromUser: { id: 'creator-1', displayName: 'Creator Name' },
  toUser: null,
  gameConfig: { timeMinutes: 15, incrementSeconds: 10, isRated: true },
  inviteCode: null,
  status: 'pending' as const,
  createdAt: '2026-03-28T00:00:00Z'
};

describe('OpenChallengeRow component', () => {
  let target: HTMLDivElement;
  let component: ReturnType<typeof render> | undefined;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    installMockLocalStorage();
  });

  afterEach(() => {
    if (component) {
      unmount(component);
      component = undefined;
    }
    target.remove();
    vi.clearAllMocks();
  });

  function render(
    overrides: Partial<{
      challenge: typeof baseChallenge;
      currentUserId: string;
      loadingAccept: boolean;
      loadingCancel: boolean;
      onaccept: (id: string) => void;
      oncancel: (id: string) => void;
    }> = {}
  ) {
    const onaccept = overrides.onaccept ?? vi.fn();
    const oncancel = overrides.oncancel ?? vi.fn();
    const mounted = mount(OpenChallengeRow, {
      target,
      props: {
        challenge: overrides.challenge ?? baseChallenge,
        currentUserId: overrides.currentUserId ?? 'viewer-1',
        loadingAccept: overrides.loadingAccept ?? false,
        loadingCancel: overrides.loadingCancel ?? false,
        onaccept,
        oncancel
      }
    });
    flushSync();
    return mounted;
  }

  it('renders another player challenge with time control and rated badge', () => {
    component = render();

    expect(target.textContent).toContain('Creator Name');
    expect(target.textContent).toContain('15+10');
    expect(target.textContent).toContain('Xếp Hạng');
    expect(target.querySelectorAll('button')).toHaveLength(1);
    expect(target.querySelector('button')?.textContent?.trim()).toBe('Chấp Nhận');
  });

  it('invokes onaccept for another player challenge', () => {
    const onaccept = vi.fn();
    component = render({ onaccept });

    target.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onaccept).toHaveBeenCalledWith('challenge-1');
  });

  it('renders own challenge with cancel action instead of accept', () => {
    const oncancel = vi.fn();
    component = render({ currentUserId: 'creator-1', oncancel });

    expect(target.textContent).toContain('Thách đấu của bạn');
    expect(target.querySelector('button')?.textContent?.trim()).toBe('Hủy');

    target.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(oncancel).toHaveBeenCalledWith('challenge-1');
  });

  it('disables accept while accept is loading', () => {
    component = render({ loadingAccept: true });

    const button = target.querySelector('button');
    expect(button?.textContent?.trim()).toBe('...');
    expect(button?.disabled).toBe(true);
  });

  it('disables cancel while cancel is loading', () => {
    component = render({ currentUserId: 'creator-1', loadingCancel: true });

    const button = target.querySelector('button');
    expect(button?.textContent?.trim()).toBe('...');
    expect(button?.disabled).toBe(true);
  });
});
