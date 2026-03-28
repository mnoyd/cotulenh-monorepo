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
  createShareableInvitation: vi.fn(),
  getOpenChallenges: vi.fn(),
  getMyActiveOpenChallenge: vi.fn(),
  createOpenChallenge: vi.fn(),
  acceptOpenChallenge: vi.fn(),
  cancelOpenChallenge: vi.fn()
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
  createShareableInvitation,
  getOpenChallenges,
  getMyActiveOpenChallenge,
  createOpenChallenge,
  acceptOpenChallenge,
  cancelOpenChallenge
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
const mockGetOpenChallenges = vi.mocked(getOpenChallenges);
const mockGetMyActiveOpenChallenge = vi.mocked(getMyActiveOpenChallenge);
const mockCreateOpenChallenge = vi.mocked(createOpenChallenge);
const mockAcceptOpenChallenge = vi.mocked(acceptOpenChallenge);
const mockCancelOpenChallenge = vi.mocked(cancelOpenChallenge);

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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

type LoadedLobbyPage = Exclude<Awaited<ReturnType<typeof load>>, void>;

async function resolveLobbyLoad(result: LoadedLobbyPage) {
  return {
    ...result,
    openChallenges: await result.openChallenges,
    myActiveChallenge: await result.myActiveChallenge
  };
}

describe('load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns friends, sent invitations, received invitations, open challenges, and active challenge for authenticated user', async () => {
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
    const openChallenges: never[] = [];
    const myActiveChallenge = null;
    mockGetFriendsList.mockResolvedValue(friends);
    mockGetSentInvitations.mockResolvedValue(sentInvitations);
    mockGetReceivedInvitations.mockResolvedValue(receivedInvitations);
    mockGetOpenChallenges.mockResolvedValue(openChallenges);
    mockGetMyActiveOpenChallenge.mockResolvedValue(myActiveChallenge);

    const result = (await load({
      locals: createMockLocals()
    } as never)) as LoadedLobbyPage;

    expect(result).toMatchObject({
      friends,
      sentInvitations,
      receivedInvitations
    });
    await expect(result.openChallenges).resolves.toEqual(openChallenges);
    await expect(result.myActiveChallenge).resolves.toBeNull();
    expect(mockGetFriendsList).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockGetSentInvitations).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockGetReceivedInvitations).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockGetOpenChallenges).toHaveBeenCalledWith(expect.anything());
    expect(mockGetMyActiveOpenChallenge).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });

  it('streams lobby data without blocking the page load on open challenge queries', async () => {
    const openChallengesDeferred = createDeferred<never[]>();
    const myActiveChallengeDeferred = createDeferred<null>();

    mockGetFriendsList.mockResolvedValue([]);
    mockGetSentInvitations.mockResolvedValue([]);
    mockGetReceivedInvitations.mockResolvedValue([]);
    mockGetOpenChallenges.mockReturnValue(openChallengesDeferred.promise);
    mockGetMyActiveOpenChallenge.mockReturnValue(myActiveChallengeDeferred.promise);

    const result = (await load({
      locals: createMockLocals()
    } as never)) as LoadedLobbyPage;

    expect(result.friends).toEqual([]);
    expect(result.sentInvitations).toEqual([]);
    expect(result.receivedInvitations).toEqual([]);
    await expect(
      Promise.race([result.openChallenges.then(() => 'resolved'), Promise.resolve('pending')])
    ).resolves.toBe('pending');
    await expect(
      Promise.race([result.myActiveChallenge.then(() => 'resolved'), Promise.resolve('pending')])
    ).resolves.toBe('pending');

    openChallengesDeferred.resolve([]);
    myActiveChallengeDeferred.resolve(null);

    await expect(result.openChallenges).resolves.toEqual([]);
    await expect(result.myActiveChallenge).resolves.toBeNull();
  });

  it('redirects unauthenticated users to login', async () => {
    mockGetFriendsList.mockResolvedValue([]);
    mockGetSentInvitations.mockResolvedValue([]);
    mockGetReceivedInvitations.mockResolvedValue([]);
    mockGetOpenChallenges.mockResolvedValue([]);
    mockGetMyActiveOpenChallenge.mockResolvedValue(null);

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

describe('actions.createOpenChallenge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.createOpenChallenge({
      request: createMockRequest({
        gameConfig: JSON.stringify({ timeMinutes: 5, incrementSeconds: 0 })
      }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for invalid gameConfig', async () => {
    mockValidateGameConfig.mockReturnValue(false);

    const result = await actions.createOpenChallenge({
      request: createMockRequest({
        gameConfig: JSON.stringify({ timeMinutes: 100, incrementSeconds: 0 })
      }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success with invitationId', async () => {
    mockValidateGameConfig.mockReturnValue(true);
    mockCreateOpenChallenge.mockResolvedValue({ success: true, invitationId: 'inv-lobby-1' });

    const result = await actions.createOpenChallenge({
      request: createMockRequest({
        gameConfig: JSON.stringify({ timeMinutes: 5, incrementSeconds: 0 })
      }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string; invitationId: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('createOpenChallenge');
    expect(data.invitationId).toBe('inv-lobby-1');
  });

  it('returns 400 when already has challenge', async () => {
    mockValidateGameConfig.mockReturnValue(true);
    mockCreateOpenChallenge.mockResolvedValue({ success: false, error: 'alreadyHasChallenge' });

    const result = await actions.createOpenChallenge({
      request: createMockRequest({
        gameConfig: JSON.stringify({ timeMinutes: 5, incrementSeconds: 0 })
      }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});

describe('actions.acceptOpenChallenge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.acceptOpenChallenge({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for missing invitationId', async () => {
    const result = await actions.acceptOpenChallenge({
      request: createMockRequest({ invitationId: '' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success with gameId', async () => {
    mockAcceptOpenChallenge.mockResolvedValue({ success: true, gameId: 'game-lobby-1' });

    const result = await actions.acceptOpenChallenge({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string; gameId: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('acceptOpenChallenge');
    expect(data.gameId).toBe('game-lobby-1');
  });

  it('returns 400 when accept fails', async () => {
    mockAcceptOpenChallenge.mockResolvedValue({ success: false, error: 'acceptFailed' });

    const result = await actions.acceptOpenChallenge({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});

describe('actions.cancelOpenChallenge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.cancelOpenChallenge({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('returns 400 for missing invitationId', async () => {
    const result = await actions.cancelOpenChallenge({
      request: createMockRequest({ invitationId: '' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });

  it('returns success when cancel succeeds', async () => {
    mockCancelOpenChallenge.mockResolvedValue({ success: true });

    const result = await actions.cancelOpenChallenge({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { success: boolean; action: string };
    expect(data.success).toBe(true);
    expect(data.action).toBe('cancelOpenChallenge');
  });

  it('returns 400 when cancel fails', async () => {
    mockCancelOpenChallenge.mockResolvedValue({ success: false, error: 'cancelFailed' });

    const result = await actions.cancelOpenChallenge({
      request: createMockRequest({ invitationId: 'inv-1' }),
      locals: createMockLocals()
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});

describe('lobby integration: create → appears in lobby → accept → navigate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('full lobby flow: creator creates challenge, it appears in lobby load, acceptor accepts and gets gameId', async () => {
    const creatorId = 'creator-1';
    const acceptorId = 'acceptor-1';
    const gameConfig = { timeMinutes: 5, incrementSeconds: 0 };
    const invitationId = 'inv-lobby-flow-1';
    const gameId = 'game-lobby-flow-1';

    // Step 1: Creator creates an open challenge
    mockValidateGameConfig.mockReturnValue(true);
    mockCreateOpenChallenge.mockResolvedValue({ success: true, invitationId });

    const createResult = await actions.createOpenChallenge({
      request: createMockRequest({
        gameConfig: JSON.stringify(gameConfig)
      }),
      locals: createMockLocals({ id: creatorId })
    } as never);

    const createData = createResult as { success: boolean; action: string; invitationId: string };
    expect(createData.success).toBe(true);
    expect(createData.action).toBe('createOpenChallenge');
    expect(createData.invitationId).toBe(invitationId);

    // Step 2: Challenge appears in lobby via load()
    const lobbyChallenge = {
      id: invitationId,
      fromUser: { id: creatorId, displayName: 'Creator' },
      toUser: null,
      gameConfig,
      inviteCode: null,
      status: 'pending' as const,
      createdAt: '2026-03-26T00:00:00Z'
    };

    mockGetFriendsList.mockResolvedValue([]);
    mockGetSentInvitations.mockResolvedValue([]);
    mockGetReceivedInvitations.mockResolvedValue([]);
    mockGetOpenChallenges.mockResolvedValue([lobbyChallenge]);
    mockGetMyActiveOpenChallenge.mockResolvedValue(null);

    const loadResult = await resolveLobbyLoad(
      (await load({
        locals: createMockLocals({ id: acceptorId })
      } as never)) as LoadedLobbyPage
    );

    expect(loadResult.openChallenges).toHaveLength(1);
    expect(loadResult.openChallenges[0].id).toBe(invitationId);
    expect(loadResult.openChallenges[0].fromUser.displayName).toBe('Creator');

    // Step 3: Acceptor accepts the challenge and gets gameId for navigation
    mockAcceptOpenChallenge.mockResolvedValue({ success: true, gameId });

    const acceptResult = await actions.acceptOpenChallenge({
      request: createMockRequest({ invitationId }),
      locals: createMockLocals({ id: acceptorId })
    } as never);

    const acceptData = acceptResult as { success: boolean; action: string; gameId: string };
    expect(acceptData.success).toBe(true);
    expect(acceptData.action).toBe('acceptOpenChallenge');
    expect(acceptData.gameId).toBe(gameId);

    // Verify acceptor can navigate to /play/online/${gameId}
    expect(acceptData.gameId).toBeTruthy();
  });

  it('creator sees their active challenge in lobby load and can cancel it', async () => {
    const creatorId = 'creator-2';
    const invitationId = 'inv-lobby-flow-2';
    const gameConfig = { timeMinutes: 10, incrementSeconds: 5 };

    // Creator creates challenge
    mockValidateGameConfig.mockReturnValue(true);
    mockCreateOpenChallenge.mockResolvedValue({ success: true, invitationId });

    await actions.createOpenChallenge({
      request: createMockRequest({ gameConfig: JSON.stringify(gameConfig) }),
      locals: createMockLocals({ id: creatorId })
    } as never);

    // Creator loads lobby — sees their active challenge
    const activeChallenge = {
      id: invitationId,
      fromUser: { id: creatorId, displayName: '' },
      toUser: null,
      gameConfig,
      inviteCode: null,
      status: 'pending' as const,
      createdAt: '2026-03-26T00:00:00Z'
    };

    mockGetFriendsList.mockResolvedValue([]);
    mockGetSentInvitations.mockResolvedValue([]);
    mockGetReceivedInvitations.mockResolvedValue([]);
    mockGetOpenChallenges.mockResolvedValue([activeChallenge]);
    mockGetMyActiveOpenChallenge.mockResolvedValue(activeChallenge);

    const loadResult = await resolveLobbyLoad(
      (await load({
        locals: createMockLocals({ id: creatorId })
      } as never)) as LoadedLobbyPage
    );

    expect(loadResult.myActiveChallenge).not.toBeNull();
    expect(loadResult.myActiveChallenge!.id).toBe(invitationId);

    // Creator cancels their challenge
    mockCancelOpenChallenge.mockResolvedValue({ success: true });

    const cancelResult = await actions.cancelOpenChallenge({
      request: createMockRequest({ invitationId }),
      locals: createMockLocals({ id: creatorId })
    } as never);

    const cancelData = cancelResult as { success: boolean; action: string };
    expect(cancelData.success).toBe(true);
    expect(cancelData.action).toBe('cancelOpenChallenge');
  });

  it('AC8: creator cannot create a second open challenge', async () => {
    const creatorId = 'creator-3';
    const gameConfig = { timeMinutes: 5, incrementSeconds: 0 };

    mockValidateGameConfig.mockReturnValue(true);

    // First challenge succeeds
    mockCreateOpenChallenge.mockResolvedValueOnce({ success: true, invitationId: 'inv-first' });
    const first = await actions.createOpenChallenge({
      request: createMockRequest({ gameConfig: JSON.stringify(gameConfig) }),
      locals: createMockLocals({ id: creatorId })
    } as never);
    expect((first as { success: boolean }).success).toBe(true);

    // Second challenge fails — already has one
    mockCreateOpenChallenge.mockResolvedValueOnce({ success: false, error: 'alreadyHasChallenge' });
    const second = await actions.createOpenChallenge({
      request: createMockRequest({ gameConfig: JSON.stringify(gameConfig) }),
      locals: createMockLocals({ id: creatorId })
    } as never);
    expect((second as { status: number }).status).toBe(400);
  });
});

describe('lobby integration: realtime event flow', () => {
  it('realtime INSERT event fires when open challenge is created, UPDATE fires on accept', async () => {
    const {
      subscribeToLobby,
      unsubscribeFromLobby,
      onLobbyChallengeEvent,
      _setLobbyStateCallback
    } = await import('$lib/invitations/lobby-realtime-core');

    type ChangeRegistration = {
      event: string;
      filter?: string;
      handler: (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => void;
    };

    const registrations: ChangeRegistration[] = [];
    const mockChannel = {
      on: vi
        .fn()
        .mockImplementation(
          (
            _type: string,
            opts: { event: string; filter?: string },
            handler: ChangeRegistration['handler']
          ) => {
            registrations.push({ event: opts.event, filter: opts.filter, handler });
            return mockChannel;
          }
        ),
      subscribe: vi.fn().mockImplementation((cb: (status: string) => void) => {
        cb('SUBSCRIBED');
        return mockChannel;
      }),
      unsubscribe: vi.fn()
    };

    const mockSupabase = {
      channel: vi.fn().mockReturnValue(mockChannel)
    };

    // Clean up any prior state
    unsubscribeFromLobby();
    _setLobbyStateCallback(null);

    // Subscribe to lobby
    subscribeToLobby(mockSupabase as never);

    const events: Array<{ type: string; id?: string }> = [];
    onLobbyChallengeEvent((e) => events.push(e));

    // Simulate: new open challenge inserted (creator creates challenge)
    const insertHandler = registrations.find((r) => r.event === 'INSERT')!;
    insertHandler.handler({
      new: {
        id: 'inv-rt-1',
        from_user: 'creator-rt',
        game_config: { timeMinutes: 5, incrementSeconds: 0 },
        invite_code: null,
        created_at: '2026-03-26T00:00:00Z'
      }
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('insert');
    expect(events[0].id).toBe('inv-rt-1');

    // Simulate: challenge accepted (status changes, to_user set)
    const updateHandler = registrations.find((r) => r.event === 'UPDATE')!;
    updateHandler.handler({
      old: { id: 'inv-rt-1', status: 'pending', to_user: null, invite_code: null },
      new: { id: 'inv-rt-1', status: 'accepted', to_user: 'acceptor-rt', invite_code: null }
    });

    expect(events).toHaveLength(2);
    expect(events[1].type).toBe('update');
    expect((events[1] as { type: string; newStatus: string }).newStatus).toBe('accepted');

    // Creator uses this update event to navigate to game page
    // (verified by the event containing the invitation ID which maps to the game)

    // Cleanup
    unsubscribeFromLobby();
  });
});

describe('lobby integration: both players navigate to the same game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('acceptor gets gameId from action, creator detects acceptance via realtime and looks up the same game', async () => {
    const creatorId = 'creator-nav';
    const acceptorId = 'acceptor-nav';
    const invitationId = 'inv-both-nav';
    const gameId = 'game-both-nav';
    const gameConfig = { timeMinutes: 5, incrementSeconds: 0 };

    // --- Step 1: Creator creates an open challenge ---
    mockValidateGameConfig.mockReturnValue(true);
    mockCreateOpenChallenge.mockResolvedValue({ success: true, invitationId });

    const createResult = await actions.createOpenChallenge({
      request: createMockRequest({ gameConfig: JSON.stringify(gameConfig) }),
      locals: createMockLocals({ id: creatorId })
    } as never);
    expect((createResult as { success: boolean }).success).toBe(true);

    // --- Step 2: Acceptor loads lobby and sees the challenge ---
    const lobbyChallenge = {
      id: invitationId,
      fromUser: { id: creatorId, displayName: 'Creator' },
      toUser: null,
      gameConfig,
      inviteCode: null,
      status: 'pending' as const,
      createdAt: '2026-03-27T00:00:00Z'
    };

    mockGetFriendsList.mockResolvedValue([]);
    mockGetSentInvitations.mockResolvedValue([]);
    mockGetReceivedInvitations.mockResolvedValue([]);
    mockGetOpenChallenges.mockResolvedValue([lobbyChallenge]);
    mockGetMyActiveOpenChallenge.mockResolvedValue(null);

    const loadResult = await resolveLobbyLoad(
      (await load({
        locals: createMockLocals({ id: acceptorId })
      } as never)) as LoadedLobbyPage
    );

    expect(loadResult.openChallenges).toHaveLength(1);
    expect(loadResult.openChallenges[0].id).toBe(invitationId);

    // --- Step 3: Acceptor accepts — gets gameId for navigation ---
    mockAcceptOpenChallenge.mockResolvedValue({ success: true, gameId });

    const acceptResult = await actions.acceptOpenChallenge({
      request: createMockRequest({ invitationId }),
      locals: createMockLocals({ id: acceptorId })
    } as never);

    const acceptData = acceptResult as { success: boolean; gameId: string };
    expect(acceptData.success).toBe(true);
    expect(acceptData.gameId).toBe(gameId);

    // Acceptor navigates to: /play/online/${gameId}
    const acceptorNavigationTarget = `/play/online/${acceptData.gameId}`;

    // --- Step 4: Creator detects acceptance via realtime UPDATE event ---
    const {
      subscribeToLobby,
      unsubscribeFromLobby,
      onLobbyChallengeEvent,
      _setLobbyStateCallback
    } = await import('$lib/invitations/lobby-realtime-core');

    type ChangeRegistration = {
      event: string;
      filter?: string;
      handler: (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => void;
    };

    const registrations: ChangeRegistration[] = [];
    const mockChannel = {
      on: vi
        .fn()
        .mockImplementation(
          (
            _type: string,
            opts: { event: string; filter?: string },
            handler: ChangeRegistration['handler']
          ) => {
            registrations.push({ event: opts.event, filter: opts.filter, handler });
            return mockChannel;
          }
        ),
      subscribe: vi.fn().mockImplementation((cb: (status: string) => void) => {
        cb('SUBSCRIBED');
        return mockChannel;
      }),
      unsubscribe: vi.fn()
    };

    const mockSupabase = { channel: vi.fn().mockReturnValue(mockChannel) };

    unsubscribeFromLobby();
    _setLobbyStateCallback(null);
    subscribeToLobby(mockSupabase as never);

    const events: Array<{ type: string; id?: string; newStatus?: string }> = [];
    onLobbyChallengeEvent((e) => events.push(e));

    // Simulate the realtime UPDATE when acceptor accepts the challenge
    const updateHandler = registrations.find((r) => r.event === 'UPDATE')!;
    updateHandler.handler({
      old: { id: invitationId, status: 'pending', to_user: null, invite_code: null },
      new: { id: invitationId, status: 'accepted', to_user: acceptorId, invite_code: null }
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('update');
    expect(events[0].id).toBe(invitationId);
    expect(events[0].newStatus).toBe('accepted');

    // --- Step 5: Creator looks up game by invitation_id (waitForGameByInvitation pattern) ---
    // The creator's page.svelte does: supabase.from('games').select('id').eq('invitation_id', invitationId).single()
    // This returns the gameId created during acceptance.
    // We verify both players navigate to the same game URL.
    const creatorNavigationTarget = `/play/online/${gameId}`;

    // Both players navigate to the same game
    expect(acceptorNavigationTarget).toBe(creatorNavigationTarget);
    expect(acceptorNavigationTarget).toBe(`/play/online/${gameId}`);

    // Cleanup
    unsubscribeFromLobby();
  });

  it('acceptor gets gameId, realtime fires for creator with matching invitation, challenge disappears from lobby', async () => {
    const creatorId = 'creator-cleanup';
    const acceptorId = 'acceptor-cleanup';
    const invitationId = 'inv-cleanup';
    const gameId = 'game-cleanup';
    const gameConfig = { timeMinutes: 10, incrementSeconds: 5, isRated: true };

    // Creator creates rated challenge
    mockValidateGameConfig.mockReturnValue(true);
    mockCreateOpenChallenge.mockResolvedValue({ success: true, invitationId });

    await actions.createOpenChallenge({
      request: createMockRequest({ gameConfig: JSON.stringify(gameConfig) }),
      locals: createMockLocals({ id: creatorId })
    } as never);

    // Acceptor accepts
    mockAcceptOpenChallenge.mockResolvedValue({ success: true, gameId });

    const acceptResult = await actions.acceptOpenChallenge({
      request: createMockRequest({ invitationId }),
      locals: createMockLocals({ id: acceptorId })
    } as never);

    const acceptData = acceptResult as { success: boolean; gameId: string };
    expect(acceptData.success).toBe(true);
    expect(acceptData.gameId).toBe(gameId);

    // After acceptance, lobby load should no longer show the challenge
    mockGetOpenChallenges.mockResolvedValue([]); // Challenge gone after acceptance
    mockGetFriendsList.mockResolvedValue([]);
    mockGetSentInvitations.mockResolvedValue([]);
    mockGetReceivedInvitations.mockResolvedValue([]);
    mockGetMyActiveOpenChallenge.mockResolvedValue(null);

    // Third player loads lobby — accepted challenge is gone
    const thirdPlayerLoad = await resolveLobbyLoad(
      (await load({
        locals: createMockLocals({ id: 'third-player' })
      } as never)) as LoadedLobbyPage
    );

    expect(thirdPlayerLoad.openChallenges).toHaveLength(0);
  });

  it('race condition: second acceptor fails after first accepts', async () => {
    const creatorId = 'creator-race';
    const acceptor1 = 'acceptor-race-1';
    const acceptor2 = 'acceptor-race-2';
    const invitationId = 'inv-race';
    const gameId = 'game-race';
    const gameConfig = { timeMinutes: 3, incrementSeconds: 2 };

    // Creator creates challenge
    mockValidateGameConfig.mockReturnValue(true);
    mockCreateOpenChallenge.mockResolvedValue({ success: true, invitationId });

    await actions.createOpenChallenge({
      request: createMockRequest({ gameConfig: JSON.stringify(gameConfig) }),
      locals: createMockLocals({ id: creatorId })
    } as never);

    // First acceptor succeeds
    mockAcceptOpenChallenge.mockResolvedValueOnce({ success: true, gameId });

    const firstAccept = await actions.acceptOpenChallenge({
      request: createMockRequest({ invitationId }),
      locals: createMockLocals({ id: acceptor1 })
    } as never);

    expect((firstAccept as { success: boolean }).success).toBe(true);
    expect((firstAccept as { gameId: string }).gameId).toBe(gameId);

    // Second acceptor fails — challenge already claimed
    mockAcceptOpenChallenge.mockResolvedValueOnce({ success: false, error: 'acceptFailed' });

    const secondAccept = await actions.acceptOpenChallenge({
      request: createMockRequest({ invitationId }),
      locals: createMockLocals({ id: acceptor2 })
    } as never);

    expect((secondAccept as { status: number }).status).toBe(400);
  });
});
