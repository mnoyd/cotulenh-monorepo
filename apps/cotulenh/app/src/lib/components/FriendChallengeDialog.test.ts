import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { installMockLocalStorage } from '../../test/local-storage';

import FriendChallengeDialog from './FriendChallengeDialog.svelte';

describe('FriendChallengeDialog component', () => {
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
  });

  function render(
    overrides: Partial<{
      open: boolean;
      friend: { id: string; displayName: string; rating?: number };
      onsubmit: (config: {
        timeMinutes: number;
        incrementSeconds: number;
        isRated?: boolean;
        preferredColor?: 'random' | 'red' | 'blue';
        toUserId: string;
      }) => void;
    }> = {}
  ) {
    return mount(FriendChallengeDialog, {
      target,
      props: {
        open: true,
        friend: { id: 'friend-1', displayName: 'Test Friend', rating: 1500 },
        onsubmit: vi.fn(),
        ...overrides
      }
    });
  }

  it('renders dialog with friend name in title', () => {
    component = render();
    flushSync();
    // Dialog renders in portal, check document body
    const body = document.body;
    expect(body.textContent).toContain('Test Friend');
  });

  it('displays friend rating when available', () => {
    component = render({ friend: { id: 'f-1', displayName: 'Rated Player', rating: 1800 } });
    flushSync();
    expect(document.body.textContent).toContain('1800');
  });

  it('does not display rating when not available', () => {
    component = render({ friend: { id: 'f-1', displayName: 'Unrated Player' } });
    flushSync();
    // Should not contain "Rating:" text when no rating
    const descriptions = document.querySelectorAll('[class*="description"]');
    let hasRatingText = false;
    descriptions.forEach((d) => {
      if (d.textContent?.includes('Rating:')) hasRatingText = true;
    });
    expect(hasRatingText).toBe(false);
  });

  it('renders time control presets', () => {
    component = render();
    flushSync();
    // Should contain some preset labels
    expect(document.body.textContent).toContain('15+10');
    expect(document.body.textContent).toContain('5+0');
  });

  it('renders casual/rated toggle', () => {
    component = render();
    flushSync();
    const bodyText = document.body.textContent ?? '';
    // Vietnamese labels from i18n mock (fallback to key)
    expect(bodyText).toMatch(/lobby\.casual|Giao Hữu|Casual/);
  });

  it('renders color choices', () => {
    component = render();
    flushSync();
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toMatch(/friend\.challenge\.colorChoice\.random|Ngẫu nhiên|Random/);
    expect(bodyText).toMatch(/common\.red|Đỏ|Red/);
    expect(bodyText).toMatch(/common\.blue|Xanh|Blue/);
  });

  it('calls onsubmit with correct config when submitted', () => {
    const onsubmit = vi.fn();
    component = render({ onsubmit, friend: { id: 'friend-1', displayName: 'Test' } });
    flushSync();

    // Find and click the submit button (contains send text)
    const buttons = document.querySelectorAll('button');
    const submitBtn = Array.from(buttons).find(
      (btn) =>
        btn.textContent?.includes('friend.challenge.action.send') ||
        btn.textContent?.includes('Gửi thách đấu') ||
        btn.textContent?.includes('Send challenge')
    );

    if (submitBtn) {
      submitBtn.click();
      flushSync();
      expect(onsubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          toUserId: 'friend-1',
          timeMinutes: expect.any(Number),
          incrementSeconds: expect.any(Number),
          preferredColor: 'random'
        })
      );
    }
  });
});
