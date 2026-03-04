import { describe, it, expect } from 'vitest';
import { sortFriendsByOnline } from './sort';
import type { FriendListItem } from './types';

function friend(friendshipId: string, userId: string, displayName: string): FriendListItem {
  return { friendshipId, userId, displayName };
}

describe('sortFriendsByOnline', () => {
  it('sorts online friends first, then alphabetical within groups', () => {
    const friends = [
      friend('f-1', 'u-1', 'Charlie'),
      friend('f-2', 'u-2', 'Alice'),
      friend('f-3', 'u-3', 'Bob')
    ];

    const result = sortFriendsByOnline(friends, new Set(['u-1', 'u-3']));

    expect(result.map((f) => f.displayName)).toEqual(['Bob', 'Charlie', 'Alice']);
  });

  it('de-duplicates by friendshipId', () => {
    const friends = [
      friend('f-1', 'u-1', 'Alice'),
      friend('f-1', 'u-1', 'Alice'),
      friend('f-2', 'u-2', 'Bob')
    ];

    const result = sortFriendsByOnline(friends, new Set());

    expect(result).toHaveLength(2);
    expect(result.map((f) => f.friendshipId)).toEqual(['f-1', 'f-2']);
  });
});
