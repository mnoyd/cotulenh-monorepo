import type { InvitationItem } from '$lib/invitations/types';

type Awaitable<T> = T | Promise<T>;

function mergeChallengeSnapshot(
  snapshotChallenge: InvitationItem,
  currentChallenge: InvitationItem
): InvitationItem {
  return {
    ...currentChallenge,
    ...snapshotChallenge,
    fromUser: {
      ...currentChallenge.fromUser,
      ...snapshotChallenge.fromUser,
      displayName: snapshotChallenge.fromUser.displayName || currentChallenge.fromUser.displayName
    },
    toUser: snapshotChallenge.toUser ?? currentChallenge.toUser
  };
}

export function hydrateLobbyChallenges(
  snapshot: InvitationItem[],
  currentChallenges: InvitationItem[],
  removedChallengeIds: Set<string>
): InvitationItem[] {
  const currentById = new Map(currentChallenges.map((challenge) => [challenge.id, challenge]));

  return snapshot
    .filter((challenge) => !removedChallengeIds.has(challenge.id))
    .map((challenge) => {
      const currentChallenge = currentById.get(challenge.id);
      return currentChallenge ? mergeChallengeSnapshot(challenge, currentChallenge) : challenge;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function clearMyActiveChallenge(
  activeChallenge: InvitationItem | null,
  invitationId: string
): InvitationItem | null {
  return activeChallenge?.id === invitationId ? null : activeChallenge;
}

export function shouldNavigateOnAcceptedSentInvitation(
  invitationId: string,
  activeChallenge: InvitationItem | null,
  sentInvitations: InvitationItem[]
): boolean {
  return (
    activeChallenge?.id === invitationId ||
    sentInvitations.some((invitation) => invitation.id === invitationId)
  );
}

export async function resolveLobbyHydration(
  openChallengesInput: Awaitable<InvitationItem[]>,
  activeChallengeInput: Awaitable<InvitationItem | null>
): Promise<{
  openChallenges?: InvitationItem[];
  myActiveChallenge?: InvitationItem | null;
}> {
  const [openChallengesResult, activeChallengeResult] = await Promise.allSettled([
    Promise.resolve(openChallengesInput),
    Promise.resolve(activeChallengeInput)
  ]);

  return {
    openChallenges:
      openChallengesResult.status === 'fulfilled' ? openChallengesResult.value : undefined,
    myActiveChallenge:
      activeChallengeResult.status === 'fulfilled' ? activeChallengeResult.value : undefined
  };
}
