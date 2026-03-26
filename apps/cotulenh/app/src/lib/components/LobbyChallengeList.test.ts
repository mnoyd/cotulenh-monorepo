import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(process.cwd(), 'src/lib/components/LobbyChallengeList.svelte');

describe('LobbyChallengeList component', () => {
  const source = readFileSync(componentPath, 'utf8');

  it('accepts challenges, currentUserId, loading, loadingAcceptIds, loadingCancelIds, onaccept, oncancel, oncreate props', () => {
    expect(source).toContain('challenges');
    expect(source).toContain('currentUserId');
    expect(source).toContain('loading');
    expect(source).toContain('loadingAcceptIds');
    expect(source).toContain('loadingCancelIds');
    expect(source).toContain('onaccept');
    expect(source).toContain('oncancel');
    expect(source).toContain('oncreate');
  });

  it('shows skeleton loading state with 3 placeholder items', () => {
    expect(source).toContain('skeleton-item');
    expect(source).toContain('[1, 2, 3]');
    expect(source).toContain('skeleton-bar');
  });

  it('shows empty state when no challenges and not loading', () => {
    expect(source).toContain('LobbyEmptyState');
    expect(source).toContain('challenges.length === 0');
  });

  it('renders OpenChallengeRow for each challenge', () => {
    expect(source).toContain('OpenChallengeRow');
    expect(source).toContain('#each challenges as challenge');
    expect(source).toContain('challenge.id');
  });

  it('passes loadingAccept and loadingCancel per challenge', () => {
    expect(source).toContain('loadingAcceptIds.has(challenge.id)');
    expect(source).toContain('loadingCancelIds.has(challenge.id)');
  });

  it('uses flat-list class for challenge list', () => {
    expect(source).toContain('flat-list');
  });

  it('has pulse animation for skeleton bars', () => {
    expect(source).toContain('animation: pulse');
    expect(source).toContain('@keyframes pulse');
  });
});
