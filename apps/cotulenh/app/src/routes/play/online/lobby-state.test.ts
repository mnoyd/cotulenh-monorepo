import { describe, expect, it } from 'vitest';
import {
  clearMyActiveChallenge,
  hydrateLobbyChallenges,
  resolveLobbyHydration,
  shouldNavigateOnAcceptedSentInvitation
} from './lobby-state';

const currentChallenge = {
  id: 'challenge-1',
  fromUser: { id: 'creator-1', displayName: 'Optimistic Name' },
  toUser: null,
  gameConfig: { timeMinutes: 15, incrementSeconds: 10, isRated: true },
  inviteCode: null,
  status: 'pending' as const,
  createdAt: '2026-03-29T01:00:00Z'
};

describe('lobby-state', () => {
  it('keeps the server snapshot authoritative during hydration', () => {
    const hydrated = hydrateLobbyChallenges(
      [
        {
          ...currentChallenge,
          fromUser: { id: 'creator-1', displayName: '' }
        }
      ],
      [
        currentChallenge,
        {
          ...currentChallenge,
          id: 'stale-local-only',
          createdAt: '2026-03-29T00:00:00Z'
        }
      ],
      new Set()
    );

    expect(hydrated).toHaveLength(1);
    expect(hydrated[0]?.id).toBe('challenge-1');
    expect(hydrated[0]?.fromUser.displayName).toBe('Optimistic Name');
  });

  it('clears the active challenge when the matching invitation is removed', () => {
    expect(clearMyActiveChallenge(currentChallenge, 'challenge-1')).toBeNull();
    expect(clearMyActiveChallenge(currentChallenge, 'other-id')).toEqual(currentChallenge);
  });

  it('navigates for accepted invitations that belong to the creator session', () => {
    expect(
      shouldNavigateOnAcceptedSentInvitation('challenge-1', currentChallenge, [], new Set())
    ).toBe(true);

    expect(
      shouldNavigateOnAcceptedSentInvitation(
        'challenge-2',
        null,
        [{ ...currentChallenge, id: 'challenge-2' }],
        new Set()
      )
    ).toBe(true);

    expect(shouldNavigateOnAcceptedSentInvitation('missing', null, [], new Set())).toBe(false);
  });

  it('navigates for invitations created during the current session', () => {
    expect(
      shouldNavigateOnAcceptedSentInvitation(
        'tracked-invite',
        null,
        [],
        new Set(['tracked-invite'])
      )
    ).toBe(true);
  });

  it('navigates when shareable invite link (toUser=null, inviteCode set) is accepted', () => {
    const shareableInvite = {
      ...currentChallenge,
      id: 'invite-link-1',
      toUser: null,
      inviteCode: 'abc12345'
    };

    expect(
      shouldNavigateOnAcceptedSentInvitation('invite-link-1', null, [shareableInvite], new Set())
    ).toBe(true);
  });

  it('resolves partial lobby hydration without throwing when one stream fails', async () => {
    const resolved = await resolveLobbyHydration(
      Promise.reject(new Error('open challenge query failed')),
      Promise.resolve(currentChallenge)
    );

    expect(resolved.openChallenges).toBeUndefined();
    expect(resolved.myActiveChallenge).toEqual(currentChallenge);
  });
});
