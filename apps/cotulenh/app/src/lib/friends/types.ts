export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export type RelationshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'blocked';

export interface FriendshipRow {
  id: string;
  userA: string;
  userB: string;
  status: FriendshipStatus;
  initiatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FriendSearchResult {
  id: string;
  displayName: string;
  relationship: RelationshipStatus;
}

export interface FriendListItem {
  friendshipId: string;
  userId: string;
  displayName: string;
}

export interface PendingRequestItem {
  friendshipId: string;
  userId: string;
  displayName: string;
  createdAt: string;
}
