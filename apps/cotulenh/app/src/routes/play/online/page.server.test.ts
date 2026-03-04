import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the query modules
vi.mock('$lib/friends/queries', () => ({
  getFriendsList: vi.fn()
}));

vi.mock('$lib/invitations/queries', () => ({
  sendInvitation: vi.fn(),
  getSentInvitations: vi.fn(),
  getReceivedInvitations: vi.fn(),
  cancelInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
  validateGameConfig: vi.fn(),
  createShareableInvitation: vi.fn()
}));

import { getFriendsList } from '$lib/friends/queries';
import {
  sendInvitation,
  getSentInvitations,
  getReceivedInvitations,
  cancelInvitation,
  acceptInvitation,
  declineInvitation,
  validateGameConfig,
  createShareableInvitation
} from '$lib/invitations/queries';
import { actions, load } from './+page.server';

const mockGetFriendsList = vi.mocked(getFriendsList);
const mockSendInvitation = vi.mocked(sendInvitation);
const mockGetSentInvitations = vi.mocked(getSentInvitations);
const mockGetReceivedInvitations = vi.mocked(getReceivedInvitations);
const mockCancelInvitation = vi.mocked(cancelInvitation);
const mockAcceptInvitation = vi.mocked(acceptInvitation);
const mockDeclineInvitation = vi.mocked(declineInvitation);
const mockValidateGameConfig = vi.mocked(validateGameConfig);
const mockCreateShareableInvitation = vi.mocked(createShareableInvitation);

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

  it('returns friends, sent invitations, and received invitations for authenticated user', async () => {
    const friends = [{ friendshipId: 'f-1', userId: 'user-2', displayName: 'Player Two' }];
    const sentInvitations = [
      {
        id: 'inv-1',
        fromUser: { id: 'user-1', displayName: '' },
        toUser: { id: 'user-2', displayName: 'Player Two' },
        gameConfig: { timeMinutes: 5, incrementSeconds: 0 },
        inviteCode: 'abc12345',
        status: 'pending' as const,
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];
    const receivedInvitations = [
      {
        id: 'inv-2',
        fromUser: { id: 'user-3', displayName: 'Player Three' },
        toUser: { id: 'user-1', displayName: '' },
        gameConfig: { timeMinutes: 10, incrementSeconds: 0 },
        inviteCode: 'def67890',
        status: 'pending' as const,
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];
    mockGetFriendsList.mockResolvedValue(friends);
    mockGetSentInvitations.mockResolvedValue(sentInvitations);
    mockGetReceivedInvitations.mockResolvedValue(receivedInvitations);

    const result = await load({
      locals: createMockLocals()
    } as never);

    expect(result).toEqual({ friends, sentInvitations, receivedInvitations });
    expect(mockGetFriendsList).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockGetSentInvitations).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockGetReceivedInvitations).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });

  it('redirects unauthenticated users to login', async () => {
    mockGetFriendsList.mockResolvedValue([]);
    mockGetSentInvitations.mockResolvedValue([]);
    mockGetReceivedInvitations.mockResolvedValue([]);

    await expect(
      load({
        locals: createMockLocals(null)
      } as never)
    ).rejects.toEqual(expect.objectContaining({ status: 303, location: '/auth/login' }));
  });
});

describe('actions.sendInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.sendInvitation({
      request: createMockRequest({
        toUserId: 'user-2',
        gameConfig: JSON.stringify({ timeMinutes: 5, incrementSeconds: 0 })
      }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for missing toUserId', async () => {
    mockValidateGameConfig.mockReturnValue(true);

    const result = await actions.sendInvitation({
      request: createMockRequest({
        toUserId: '',
        gameConfig: JSON.stringify({ timeMinutes: 5, incrementSeconds: 0 })
      }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns 400 for invalid gameConfig JSON', async () => {
    const result = await actions.sendInvitation({
      request: createMockRequest({
        toUserId: 'user-2',
        gameConfig: 'not-json'
      }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns 400 for invalid gameConfig values', async () => {
    mockValidateGameConfig.mockReturnValue(false);

    const result = await actions.sendInvitation({
      request: createMockRequest({
        toUserId: 'user-2',
        gameConfig: JSON.stringify({ timeMinutes: 100, incrementSeconds: 0 })
      }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success for valid invitation', async () => {
    mockValidateGameConfig.mockReturnValue(true);
    mockSendInvitation.mockResolvedValue({ success: true, inviteCode: 'abc12345' });

    const result = await actions.sendInvitation({
      request: createMockRequest({
        toUserId: 'user-2',
        gameConfig: JSON.stringify({ timeMinutes: 5, incrementSeconds: 0 })
      }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('sendInvitation');
    expect(mockSendInvitation).toHaveBeenCalledWith(expect.anything(), 'user-1', 'user-2', {
      timeMinutes: 5,
      incrementSeconds: 0
    });
  });

  it('returns 400 when send fails (already invited)', async () => {
    mockValidateGameConfig.mockReturnValue(true);
    mockSendInvitation.mockResolvedValue({ success: false, error: 'alreadyInvited' });

    const result = await actions.sendInvitation({
      request: createMockRequest({
        toUserId: 'user-2',
        gameConfig: JSON.stringify({ timeMinutes: 5, incrementSeconds: 0 })
      }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});

describe('actions.cancelInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.cancelInvitation({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for missing invitationId', async () => {
    const result = await actions.cancelInvitation({
      request: createMockRequest({ invitationId: '' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success when cancel succeeds', async () => {
    mockCancelInvitation.mockResolvedValue({ success: true });

    const result = await actions.cancelInvitation({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('cancelInvitation');
    expect(mockCancelInvitation).toHaveBeenCalledWith(expect.anything(), 'inv-1', 'user-1');
  });

  it('returns 400 when cancel fails (not sender)', async () => {
    mockCancelInvitation.mockResolvedValue({ success: false, error: 'cancelFailed' });

    const result = await actions.cancelInvitation({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});

describe('actions.acceptInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.acceptInvitation({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for missing invitationId', async () => {
    const result = await actions.acceptInvitation({
      request: createMockRequest({ invitationId: '' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success with gameId', async () => {
    mockAcceptInvitation.mockResolvedValue({ success: true, gameId: 'game-1' });

    const result = await actions.acceptInvitation({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string; gameId: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('acceptInvitation');
    expect(data.gameId).toBe('game-1');
    expect(mockAcceptInvitation).toHaveBeenCalledWith(expect.anything(), 'inv-1', 'user-1');
  });

  it('returns 400 when accept fails (not recipient)', async () => {
    mockAcceptInvitation.mockResolvedValue({ success: false, error: 'acceptFailed' });

    const result = await actions.acceptInvitation({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});

describe('actions.declineInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.declineInvitation({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for missing invitationId', async () => {
    const result = await actions.declineInvitation({
      request: createMockRequest({ invitationId: '' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success when decline succeeds', async () => {
    mockDeclineInvitation.mockResolvedValue({ success: true });

    const result = await actions.declineInvitation({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('declineInvitation');
    expect(mockDeclineInvitation).toHaveBeenCalledWith(expect.anything(), 'inv-1', 'user-1');
  });

  it('returns 400 when decline fails (not recipient)', async () => {
    mockDeclineInvitation.mockResolvedValue({ success: false, error: 'declineFailed' });

    const result = await actions.declineInvitation({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});

describe('actions.createShareableInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.createShareableInvitation({
      request: createMockRequest({
        gameConfig: JSON.stringify({ timeMinutes: 5, incrementSeconds: 0 })
      }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for invalid gameConfig JSON', async () => {
    const result = await actions.createShareableInvitation({
      request: createMockRequest({ gameConfig: 'not-json' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns 400 for invalid gameConfig values', async () => {
    mockValidateGameConfig.mockReturnValue(false);

    const result = await actions.createShareableInvitation({
      request: createMockRequest({
        gameConfig: JSON.stringify({ timeMinutes: 100, incrementSeconds: 0 })
      }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success with inviteCode', async () => {
    mockValidateGameConfig.mockReturnValue(true);
    mockCreateShareableInvitation.mockResolvedValue({ success: true, inviteCode: 'link1234' });

    const result = await actions.createShareableInvitation({
      request: createMockRequest({
        gameConfig: JSON.stringify({ timeMinutes: 10, incrementSeconds: 5 })
      }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string; inviteCode: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('createShareableInvitation');
    expect(data.inviteCode).toBe('link1234');
    expect(mockCreateShareableInvitation).toHaveBeenCalledWith(expect.anything(), 'user-1', {
      timeMinutes: 10,
      incrementSeconds: 5
    });
  });

  it('returns 400 when creation fails', async () => {
    mockValidateGameConfig.mockReturnValue(true);
    mockCreateShareableInvitation.mockResolvedValue({ success: false, error: 'createFailed' });

    const result = await actions.createShareableInvitation({
      request: createMockRequest({
        gameConfig: JSON.stringify({ timeMinutes: 5, incrementSeconds: 0 })
      }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});
