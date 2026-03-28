import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { installMockLocalStorage } from '../../test/local-storage';

const { goto } = vi.hoisted(() => ({
  goto: vi.fn()
}));

vi.mock('$app/navigation', () => ({
  goto
}));

import LobbyEmptyState from './LobbyEmptyState.svelte';

describe('LobbyEmptyState component', () => {
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

  function render(oncreate = vi.fn()) {
    const mounted = mount(LobbyEmptyState, {
      target,
      props: { oncreate }
    });
    flushSync();
    return mounted;
  }

  it('renders the empty-state copy and both actions', () => {
    component = render();

    expect(target.textContent).toContain('Không có thách đấu');
    const buttons = Array.from(target.querySelectorAll('button'));
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Tạo Ván Đấu',
      'Chơi Với AI'
    ]);
  });

  it('calls oncreate when the create button is clicked', () => {
    const oncreate = vi.fn();
    component = render(oncreate);

    target.querySelectorAll('button')[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(oncreate).toHaveBeenCalledTimes(1);
  });

  it('navigates to practice mode when the AI button is clicked', () => {
    component = render();

    target.querySelectorAll('button')[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(goto).toHaveBeenCalledWith('/play/practice');
  });
});
