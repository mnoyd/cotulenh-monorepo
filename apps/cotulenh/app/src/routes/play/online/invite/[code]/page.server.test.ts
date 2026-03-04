import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/invitations/queries', () => ({
  getInvitationByCode: vi.fn(),
  acceptInviteLink: vi.fn()
}));

import { getInvitationByCode, acceptInviteLink } from '$lib/invitations/queries';
import { load, actions } from './+page.server';

const mockGetInvitationByCode = vi.mocked(getInvitationByCode);
const mockAcceptInviteLink = vi.mocked(acceptInviteLink);
type InviteLoadResult = Exclude<Awaited<ReturnType<typeof load>>, void>;

function createMockLocals(user: { id: string } | null = null) {
  return {
    supabase: {} as never,
    safeGetSession: vi.fn().mockResolvedValue({ user, session: user ? {} : null })
  };
}

describe('invite page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns invitation data for valid code (authenticated user)', async () => {
    const invitation = {
      id: 'inv-1',
      fromUser: { id: 'user-sender', displayName: 'Sender' },
      gameConfig: { timeMinutes: 10, incrementSeconds: 5 },
      inviteCode: 'abc12345',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-01-02T00:00:00Z'
    };
    mockGetInvitationByCode.mockResolvedValue(invitation);

    const result = (await load({
      params: { code: 'abc12345' },
      locals: createMockLocals({ id: 'user-acceptor' })
    } as never)) as InviteLoadResult;

    expect(result.invitation).toEqual(invitation);
    expect(result.isAuthenticated).toBe(true);
    expect(result.isOwnInvitation).toBe(false);
  });

  it('returns invitation data for valid code (anonymous user)', async () => {
    const invitation = {
      id: 'inv-1',
      fromUser: { id: 'user-sender', displayName: 'Sender' },
      gameConfig: { timeMinutes: 5, incrementSeconds: 0 },
      inviteCode: 'abc12345',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-01-02T00:00:00Z'
    };
    mockGetInvitationByCode.mockResolvedValue(invitation);

    const result = (await load({
      params: { code: 'abc12345' },
      locals: createMockLocals(null)
    } as never)) as InviteLoadResult;

    expect(result.invitation).toEqual(invitation);
    expect(result.isAuthenticated).toBe(false);
    expect(result.isOwnInvitation).toBe(false);
  });

  it('returns null invitation for invalid code', async () => {
    mockGetInvitationByCode.mockResolvedValue(null);

    const result = (await load({
      params: { code: 'notfound' },
      locals: createMockLocals(null)
    } as never)) as InviteLoadResult;

    expect(result.invitation).toBeNull();
  });

  it('flags own invitation when user is the sender', async () => {
    const invitation = {
      id: 'inv-1',
      fromUser: { id: 'user-sender', displayName: 'Me' },
      gameConfig: { timeMinutes: 5, incrementSeconds: 0 },
      inviteCode: 'abc12345',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-01-02T00:00:00Z'
    };
    mockGetInvitationByCode.mockResolvedValue(invitation);

    const result = (await load({
      params: { code: 'abc12345' },
      locals: createMockLocals({ id: 'user-sender' })
    } as never)) as InviteLoadResult;

    expect(result.isOwnInvitation).toBe(true);
  });
});

describe('actions.acceptInviteLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated user', async () => {
    const result = await actions.acceptInviteLink({
      params: { code: 'abc12345' },
      locals: createMockLocals(null)
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(401);
  });

  it('redirects to game on success', async () => {
    mockAcceptInviteLink.mockResolvedValue({
      success: true,
      gameId: 'game-1',
      inviterUserId: 'user-sender'
    });

    await expect(
      actions.acceptInviteLink({
        params: { code: 'abc12345' },
        locals: createMockLocals({ id: 'user-acceptor' })
      } as never)
    ).rejects.toEqual(
      expect.objectContaining({
        status: 303,
        location: '/play/online/game-1'
      })
    );

    expect(mockAcceptInviteLink).toHaveBeenCalledWith(
      expect.anything(),
      'abc12345',
      'user-acceptor'
    );
  });

  it('returns 400 when accept fails (already claimed)', async () => {
    mockAcceptInviteLink.mockResolvedValue({ success: false, error: 'alreadyClaimed' });

    const result = await actions.acceptInviteLink({
      params: { code: 'abc12345' },
      locals: createMockLocals({ id: 'user-acceptor' })
    } as never);

    const data = result as { status: number };
    expect(data.status).toBe(400);
  });
});
