import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the queries module
vi.mock('$lib/friends/queries', () => ({
  searchUsers: vi.fn(),
  sendFriendRequest: vi.fn(),
  getFriendsList: vi.fn(),
  getPendingIncomingRequests: vi.fn(),
  getPendingSentRequests: vi.fn(),
  acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  cancelSentRequest: vi.fn(),
  removeFriend: vi.fn()
}));

import {
  searchUsers,
  sendFriendRequest,
  getFriendsList,
  getPendingIncomingRequests,
  getPendingSentRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelSentRequest,
  removeFriend
} from '$lib/friends/queries';
import { actions, load } from './+page.server';

const mockSearchUsers = vi.mocked(searchUsers);
const mockSendFriendRequest = vi.mocked(sendFriendRequest);
const mockGetFriendsList = vi.mocked(getFriendsList);
const mockGetPendingIncoming = vi.mocked(getPendingIncomingRequests);
const mockGetPendingSent = vi.mocked(getPendingSentRequests);
const mockAcceptFriendRequest = vi.mocked(acceptFriendRequest);
const mockDeclineFriendRequest = vi.mocked(declineFriendRequest);
const mockCancelSentRequest = vi.mocked(cancelSentRequest);
const mockRemoveFriend = vi.mocked(removeFriend);

function createMockLocals(user: { id: string } | null = { id: 'user-1' }) {
  return {
    supabase: {} as never,
    safeGetSession: vi.fn().mockResolvedValue({ user, session: user ? {} : null })
  };
}

function createMockRequest(data: Record<string, string>) {
  return {
    formData: vi.fn().mockResolvedValue(new Map(Object.entries(data)))
  } as unknown as Request;
}

describe('load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns friends list for authenticated user', async () => {
    const friends = [
      { friendshipId: 'f-1', userId: 'user-2', displayName: 'Player Two' }
    ];
    const incomingRequests = [
      {
        friendshipId: 'f-2',
        userId: 'user-3',
        displayName: 'Sender',
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];
    const sentRequests = [
      {
        friendshipId: 'f-3',
        userId: 'user-4',
        displayName: 'Recipient',
        createdAt: '2024-01-02T00:00:00Z'
      }
    ];
    mockGetFriendsList.mockResolvedValue(friends);
    mockGetPendingIncoming.mockResolvedValue(incomingRequests);
    mockGetPendingSent.mockResolvedValue(sentRequests);

    const result = await load({
      locals: createMockLocals()
    } as never);

    expect(result).toEqual({ friends, incomingRequests, sentRequests });
    expect(mockGetFriendsList).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockGetPendingIncoming).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockGetPendingSent).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });
});

describe('actions.search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.search({
      request: createMockRequest({ query: 'test' }),
      locals: createMockLocals(null)
    } as never);

    expect(result).toBeDefined();
    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns empty results for short query', async () => {
    const result = await actions.search({
      request: createMockRequest({ query: 'a' }),
      locals: createMockLocals()
    } as never);

    const data = result as { results: unknown[]; action: string };
    expect(data.results).toEqual([]);
    expect(data.action).toBe('search');
  });

  it('returns search results for valid query', async () => {
    const searchResults = [
      { id: 'user-2', displayName: 'Player Two', relationship: 'none' as const }
    ];
    mockSearchUsers.mockResolvedValue(searchResults);

    const result = await actions.search({
      request: createMockRequest({ query: 'Player' }),
      locals: createMockLocals()
    } as never);

    const data = result as { results: typeof searchResults; action: string };
    expect(data.results).toEqual(searchResults);
    expect(mockSearchUsers).toHaveBeenCalledWith(expect.anything(), 'Player', 'user-1');
  });
});

describe('actions.sendRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.sendRequest({
      request: createMockRequest({ toUserId: 'user-2' }),
      locals: createMockLocals(null)
    } as never);

    expect(result).toBeDefined();
    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for missing toUserId', async () => {
    const result = await actions.sendRequest({
      request: createMockRequest({ toUserId: '' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success for valid request', async () => {
    mockSendFriendRequest.mockResolvedValue({ success: true });

    const result = await actions.sendRequest({
      request: createMockRequest({ toUserId: 'user-2' }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('sendRequest');
    expect(mockSendFriendRequest).toHaveBeenCalledWith(expect.anything(), 'user-1', 'user-2');
  });

  it('returns 400 when send fails', async () => {
    mockSendFriendRequest.mockResolvedValue({ success: false, error: 'alreadyFriends' });

    const result = await actions.sendRequest({
      request: createMockRequest({ toUserId: 'user-2' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});

describe('actions.acceptRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.acceptRequest({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for missing friendshipId', async () => {
    const result = await actions.acceptRequest({
      request: createMockRequest({ friendshipId: '' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success when accept succeeds', async () => {
    mockAcceptFriendRequest.mockResolvedValue({ success: true });

    const result = await actions.acceptRequest({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('acceptRequest');
    expect(mockAcceptFriendRequest).toHaveBeenCalledWith(expect.anything(), 'f-1', 'user-1');
  });

  it('returns 400 when accept fails (not recipient)', async () => {
    mockAcceptFriendRequest.mockResolvedValue({ success: false, error: 'acceptFailed' });

    const result = await actions.acceptRequest({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});

describe('actions.declineRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.declineRequest({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for missing friendshipId', async () => {
    const result = await actions.declineRequest({
      request: createMockRequest({ friendshipId: '' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success when decline succeeds', async () => {
    mockDeclineFriendRequest.mockResolvedValue({ success: true });

    const result = await actions.declineRequest({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('declineRequest');
    expect(mockDeclineFriendRequest).toHaveBeenCalledWith(expect.anything(), 'f-1', 'user-1');
  });

  it('returns 400 when decline fails', async () => {
    mockDeclineFriendRequest.mockResolvedValue({ success: false, error: 'declineFailed' });

    const result = await actions.declineRequest({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});

describe('actions.cancelRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.cancelRequest({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for missing friendshipId', async () => {
    const result = await actions.cancelRequest({
      request: createMockRequest({ friendshipId: '' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success when cancel succeeds', async () => {
    mockCancelSentRequest.mockResolvedValue({ success: true });

    const result = await actions.cancelRequest({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('cancelRequest');
    expect(mockCancelSentRequest).toHaveBeenCalledWith(expect.anything(), 'f-1', 'user-1');
  });

  it('returns 400 when cancel fails (not initiator)', async () => {
    mockCancelSentRequest.mockResolvedValue({ success: false, error: 'cancelFailed' });

    const result = await actions.cancelRequest({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});

describe('actions.removeFriend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.removeFriend({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for missing friendshipId', async () => {
    const result = await actions.removeFriend({
      request: createMockRequest({ friendshipId: '' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success when remove succeeds', async () => {
    mockRemoveFriend.mockResolvedValue({ success: true });

    const result = await actions.removeFriend({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('removeFriend');
    expect(mockRemoveFriend).toHaveBeenCalledWith(expect.anything(), 'f-1', 'user-1');
  });

  it('returns 400 when remove fails (not in friendship)', async () => {
    mockRemoveFriend.mockResolvedValue({ success: false, error: 'removeFailed' });

    const result = await actions.removeFriend({
      request: createMockRequest({ friendshipId: 'f-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});
