import type { FriendListItem } from './types';

/**
 * Sort friends by online-first, then display name alphabetically.
 * De-duplicates by friendshipId to avoid double entries from optimistic merges.
 */
export function sortFriendsByOnline(
  friends: FriendListItem[],
  onlineUsers: ReadonlySet<string>
): FriendListItem[] {
  const deduped = new Map<string, FriendListItem>();
  for (const friend of friends) {
    if (!deduped.has(friend.friendshipId)) {
      deduped.set(friend.friendshipId, friend);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => {
    const aOnline = onlineUsers.has(a.userId);
    const bOnline = onlineUsers.has(b.userId);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
}
