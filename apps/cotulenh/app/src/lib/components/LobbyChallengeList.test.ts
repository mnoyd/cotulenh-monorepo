import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { installMockLocalStorage } from '../../test/local-storage';

const { goto } = vi.hoisted(() => ({
  goto: vi.fn()
}));

vi.mock('$app/navigation', () => ({
  goto
}));

import LobbyChallengeList from './LobbyChallengeList.svelte';

const otherChallenge = {
  id: 'challenge-other',
  fromUser: { id: 'creator-2', displayName: 'Other Player' },
  toUser: null,
  gameConfig: { timeMinutes: 10, incrementSeconds: 5, isRated: false },
  inviteCode: null,
  status: 'pending' as const,
  createdAt: '2026-03-28T00:00:00Z'
};

const myChallenge = {
  id: 'challenge-mine',
  fromUser: { id: 'viewer-1', displayName: 'Me' },
  toUser: null,
  gameConfig: { timeMinutes: 15, incrementSeconds: 10, isRated: true },
  inviteCode: null,
  status: 'pending' as const,
  createdAt: '2026-03-28T00:00:00Z'
};

describe('LobbyChallengeList component', () => {
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
    goto.mockReset();
  });

  function render(
    overrides: Partial<{
      challenges: Array<typeof otherChallenge>;
      currentUserId: string;
      loading: boolean;
      loadingAcceptIds: Set<string>;
      loadingCancelIds: Set<string>;
      onaccept: (id: string) => void;
      oncancel: (id: string) => void;
      oncreate: () => void;
    }> = {}
  ) {
    const mounted = mount(LobbyChallengeList, {
      target,
      props: {
        challenges: overrides.challenges ?? [],
        currentUserId: overrides.currentUserId ?? 'viewer-1',
        loading: overrides.loading ?? false,
        loadingAcceptIds: overrides.loadingAcceptIds ?? new Set<string>(),
        loadingCancelIds: overrides.loadingCancelIds ?? new Set<string>(),
        onaccept: overrides.onaccept ?? vi.fn(),
        oncancel: overrides.oncancel ?? vi.fn(),
        oncreate: overrides.oncreate ?? vi.fn()
      }
    });
    flushSync();
    return mounted;
  }

  it('renders skeleton rows while loading', () => {
    component = render({ loading: true });

    expect(target.querySelectorAll('.skeleton-item')).toHaveLength(3);
    expect(target.querySelectorAll('.skeleton-bar')).toHaveLength(9);
  });

  it('renders the empty state and wires both empty-state actions', () => {
    const oncreate = vi.fn();
    component = render({ oncreate });

    expect(target.textContent).toContain('Không có thách đấu');

    const buttons = target.querySelectorAll('button');
    buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(oncreate).toHaveBeenCalledTimes(1);
    expect(goto).toHaveBeenCalledWith('/play/practice');
  });

  it('renders populated challenges and routes accept/cancel callbacks by row ownership', () => {
    const onaccept = vi.fn();
    const oncancel = vi.fn();
    component = render({
      challenges: [otherChallenge, myChallenge],
      onaccept,
      oncancel
    });

    expect(target.textContent).toContain('Other Player');
    expect(target.textContent).toContain('10+5');
    expect(target.textContent).toContain('Giao Hữu');
    expect(target.textContent).toContain('Thách đấu của bạn');
    expect(target.textContent).toContain('Xếp Hạng');

    const buttons = Array.from(target.querySelectorAll('button'));
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Chấp Nhận', 'Hủy']);

    buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onaccept).toHaveBeenCalledWith('challenge-other');
    expect(oncancel).toHaveBeenCalledWith('challenge-mine');
  });

  it('forwards per-row loading state to nested action buttons', () => {
    component = render({
      challenges: [otherChallenge, myChallenge],
      loadingAcceptIds: new Set(['challenge-other']),
      loadingCancelIds: new Set(['challenge-mine'])
    });

    const buttons = Array.from(target.querySelectorAll('button'));
    expect(buttons.every((button) => button.disabled)).toBe(true);
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['...', '...']);
  });
});
