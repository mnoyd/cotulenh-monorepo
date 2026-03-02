import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the queries module
vi.mock('$lib/friends/queries', () => ({
  searchUsers: vi.fn(),
  sendFriendRequest: vi.fn(),
  getFriendsList: vi.fn()
}));

import { searchUsers, sendFriendRequest, getFriendsList } from '$lib/friends/queries';
import { actions, load } from './+page.server';

const mockSearchUsers = vi.mocked(searchUsers);
const mockSendFriendRequest = vi.mocked(sendFriendRequest);
const mockGetFriendsList = vi.mocked(getFriendsList);

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
    mockGetFriendsList.mockResolvedValue(friends);

    const result = await load({
      locals: createMockLocals()
    } as never);

    expect(result).toEqual({ friends });
    expect(mockGetFriendsList).toHaveBeenCalledWith(expect.anything(), 'user-1');
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
