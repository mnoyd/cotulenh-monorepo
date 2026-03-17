import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args)
    },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args)
  })
}));

const loadActions = () => import('../game');

const MOCK_USER_ID = 'user-abc-123';
const MOCK_OTHER_USER_ID = 'user-xyz-789';
const MOCK_INVITATION_ID = '550e8400-e29b-41d4-a716-446655440000';

function mockAuthenticated(userId = MOCK_USER_ID) {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

function mockInvitationQuery(invitation: Record<string, unknown> | null, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: invitation, error })
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe('createGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error for unauthenticated user', async () => {
    mockUnauthenticated();
    const { createGame } = await loadActions();

    const result = await createGame(MOCK_INVITATION_ID);

    expect(result).toEqual({ success: false, error: 'Vui lòng đăng nhập để tạo trận đấu' });
  });

  it('returns error for invalid invitation ID format', async () => {
    mockAuthenticated();
    const { createGame } = await loadActions();

    const result = await createGame('not-a-uuid');

    expect(result).toEqual({ success: false, error: 'ID lời mời không hợp lệ' });
  });

  it('returns error when invitation not found', async () => {
    mockAuthenticated();
    mockInvitationQuery(null, { code: 'PGRST116' });
    const { createGame } = await loadActions();

    const result = await createGame(MOCK_INVITATION_ID);

    expect(result).toEqual({ success: false, error: 'Không tìm thấy lời mời' });
  });

  it('returns error when invitation is not in accepted state', async () => {
    mockAuthenticated();
    mockInvitationQuery({
      id: MOCK_INVITATION_ID,
      from_user: MOCK_OTHER_USER_ID,
      to_user: MOCK_USER_ID,
      status: 'pending',
      game_config: { timeMinutes: 10, incrementSeconds: 5 }
    });
    const { createGame } = await loadActions();

    const result = await createGame(MOCK_INVITATION_ID);

    expect(result).toEqual({ success: false, error: 'Lời mời chưa được chấp nhận' });
  });

  it('returns error when user is not the invitation recipient', async () => {
    mockAuthenticated();
    mockInvitationQuery({
      id: MOCK_INVITATION_ID,
      from_user: MOCK_OTHER_USER_ID,
      to_user: 'someone-else',
      status: 'accepted',
      game_config: { timeMinutes: 10, incrementSeconds: 5 }
    });
    const { createGame } = await loadActions();

    const result = await createGame(MOCK_INVITATION_ID);

    expect(result).toEqual({
      success: false,
      error: 'Bạn không có quyền tạo trận đấu từ lời mời này'
    });
  });

  it('returns error when game already exists for invitation', async () => {
    mockAuthenticated();

    // First call: invitation query
    const invitationChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: MOCK_INVITATION_ID,
          from_user: MOCK_OTHER_USER_ID,
          to_user: MOCK_USER_ID,
          status: 'accepted',
          game_config: { timeMinutes: 10, incrementSeconds: 5 }
        },
        error: null
      })
    };

    // Second call: existing game check
    const gameCheckChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'existing-game-id' },
        error: null
      })
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? invitationChain : gameCheckChain;
    });

    const { createGame } = await loadActions();
    const result = await createGame(MOCK_INVITATION_ID);

    expect(result).toEqual({ success: false, error: 'Trận đấu đã được tạo cho lời mời này' });
  });

  it('creates game successfully and returns gameId', async () => {
    mockAuthenticated();

    const invitationChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: MOCK_INVITATION_ID,
          from_user: MOCK_OTHER_USER_ID,
          to_user: MOCK_USER_ID,
          status: 'accepted',
          game_config: { timeMinutes: 10, incrementSeconds: 5 }
        },
        error: null
      })
    };

    const gameCheckChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? invitationChain : gameCheckChain;
    });

    const newGameId = 'new-game-uuid-456';
    mockRpc.mockResolvedValue({ data: newGameId, error: null });

    const { createGame } = await loadActions();
    const result = await createGame(MOCK_INVITATION_ID);

    expect(result).toEqual({ success: true, data: { gameId: newGameId } });

    // Verify RPC was called with hardened parameters
    expect(mockRpc).toHaveBeenCalledWith('create_game_with_state', {
      p_invitation_id: MOCK_INVITATION_ID,
      p_fen: expect.any(String)
    });
  });

  it('returns error for malformed invitation game_config', async () => {
    mockAuthenticated();

    const invitationChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: MOCK_INVITATION_ID,
          from_user: MOCK_OTHER_USER_ID,
          to_user: MOCK_USER_ID,
          status: 'accepted',
          game_config: { timeMinutes: 'bad-value', incrementSeconds: 2 }
        },
        error: null
      })
    };

    const gameCheckChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? invitationChain : gameCheckChain;
    });

    mockRpc.mockResolvedValue({ data: 'game-id', error: null });

    const { createGame } = await loadActions();
    const result = await createGame(MOCK_INVITATION_ID);

    expect(result).toEqual({
      success: false,
      error: 'Cấu hình thời gian của lời mời không hợp lệ'
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns duplicate error when RPC hits unique invitation constraint', async () => {
    mockAuthenticated();

    const invitationChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: MOCK_INVITATION_ID,
          from_user: MOCK_OTHER_USER_ID,
          to_user: MOCK_USER_ID,
          status: 'accepted',
          game_config: { timeMinutes: 10, incrementSeconds: 5, isRated: true }
        },
        error: null
      })
    };

    const gameCheckChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? invitationChain : gameCheckChain;
    });

    mockRpc.mockResolvedValue({ data: null, error: { code: '23505' } });

    const { createGame } = await loadActions();
    const result = await createGame(MOCK_INVITATION_ID);

    expect(result).toEqual({ success: false, error: 'Trận đấu đã được tạo cho lời mời này' });
  });

  it('returns error when RPC fails', async () => {
    mockAuthenticated();

    const invitationChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: MOCK_INVITATION_ID,
          from_user: MOCK_OTHER_USER_ID,
          to_user: MOCK_USER_ID,
          status: 'accepted',
          game_config: { timeMinutes: 10, incrementSeconds: 5 }
        },
        error: null
      })
    };

    const gameCheckChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? invitationChain : gameCheckChain;
    });

    mockRpc.mockResolvedValue({ data: null, error: { message: 'Database error' } });

    const { createGame } = await loadActions();
    const result = await createGame(MOCK_INVITATION_ID);

    expect(result).toEqual({ success: false, error: 'Không thể tạo trận đấu' });
  });
});
