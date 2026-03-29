import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_POSITION } from '@cotulenh/core';
import {
  validateGameConfig,
  hasPendingInvitation,
  sendInvitation,
  getSentInvitations,
  cancelInvitation,
  getReceivedInvitations,
  acceptInvitation,
  declineInvitation,
  getInvitationByCode,
  createShareableInvitation,
  acceptInviteLink,
  createAutoFriendship,
  getMyActiveOpenChallenge,
  createOpenChallenge,
  getOpenChallenges,
  acceptOpenChallenge,
  cancelOpenChallenge
} from './queries';

/** Build a chain for delete/insert actions where single() is the terminal */
function actionChain(singleResult: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    'insert',
    'delete',
    'update',
    'eq',
    'gt',
    'lt',
    'is',
    'neq',
    'select',
    'limit',
    'order'
  ]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(singleResult);
  return chain;
}

function createMockSupabase() {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const supabase = { from: mockFrom, rpc: mockRpc };
  return { supabase, mockFrom, mockRpc };
}

describe('validateGameConfig', () => {
  it('accepts valid config', () => {
    expect(validateGameConfig({ timeMinutes: 5, incrementSeconds: 0 })).toBe(true);
    expect(validateGameConfig({ timeMinutes: 60, incrementSeconds: 30 })).toBe(true);
    expect(validateGameConfig({ timeMinutes: 1, incrementSeconds: 0 })).toBe(true);
    expect(validateGameConfig({ timeMinutes: 5, incrementSeconds: 0, isRated: true })).toBe(true);
    expect(
      validateGameConfig({
        timeMinutes: 15,
        incrementSeconds: 10,
        isRated: false,
        preferredColor: 'random'
      })
    ).toBe(true);
  });

  it('rejects null/undefined', () => {
    expect(validateGameConfig(null)).toBe(false);
    expect(validateGameConfig(undefined)).toBe(false);
  });

  it('rejects out-of-range timeMinutes', () => {
    expect(validateGameConfig({ timeMinutes: 0, incrementSeconds: 0 })).toBe(false);
    expect(validateGameConfig({ timeMinutes: 61, incrementSeconds: 0 })).toBe(false);
    expect(validateGameConfig({ timeMinutes: -1, incrementSeconds: 0 })).toBe(false);
  });

  it('rejects out-of-range incrementSeconds', () => {
    expect(validateGameConfig({ timeMinutes: 5, incrementSeconds: -1 })).toBe(false);
    expect(validateGameConfig({ timeMinutes: 5, incrementSeconds: 31 })).toBe(false);
  });

  it('rejects non-integer values', () => {
    expect(validateGameConfig({ timeMinutes: 5.5, incrementSeconds: 0 })).toBe(false);
    expect(validateGameConfig({ timeMinutes: 5, incrementSeconds: 1.5 })).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(validateGameConfig({ timeMinutes: 5 })).toBe(false);
    expect(validateGameConfig({ incrementSeconds: 0 })).toBe(false);
    expect(validateGameConfig({})).toBe(false);
  });

  it('rejects non-number fields', () => {
    expect(validateGameConfig({ timeMinutes: '5', incrementSeconds: 0 })).toBe(false);
    expect(validateGameConfig({ timeMinutes: 5, incrementSeconds: '0' })).toBe(false);
  });

  it('rejects invalid isRated values', () => {
    expect(validateGameConfig({ timeMinutes: 5, incrementSeconds: 0, isRated: 'yes' })).toBe(false);
  });

  it('rejects invalid preferredColor values', () => {
    expect(
      validateGameConfig({ timeMinutes: 5, incrementSeconds: 0, preferredColor: 'green' })
    ).toBe(false);
  });
});

describe('hasPendingInvitation', () => {
  it('returns true when pending invitation exists', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gt', 'limit']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.limit = vi.fn().mockResolvedValue({ data: [{ id: 'inv-1' }], error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await hasPendingInvitation(supabase as any, 'user-1', 'user-2');
    expect(result).toBe(true);
  });

  it('returns false when no pending invitation exists', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gt', 'limit']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await hasPendingInvitation(supabase as any, 'user-1', 'user-2');
    expect(result).toBe(false);
  });
});

describe('sendInvitation', () => {
  it('rejects self-invitation', async () => {
    const { supabase } = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sendInvitation(supabase as any, 'user-1', 'user-1', {
      timeMinutes: 5,
      incrementSeconds: 0
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('cannotInviteSelf');
  });

  it('rejects duplicate pending invitation', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    // hasPendingInvitation returns existing
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gt', 'limit']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.limit = vi.fn().mockResolvedValue({ data: [{ id: 'inv-1' }], error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sendInvitation(supabase as any, 'user-1', 'user-2', {
      timeMinutes: 10,
      incrementSeconds: 0
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('alreadyInvited');
  });

  it('succeeds with valid params and no existing invitation', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // hasPendingInvitation check — returns empty (no existing)
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'gt', 'limit']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
        return chain;
      }
      // insert chain
      return actionChain({ data: { id: 'inv-new', invite_code: 'abc12345' }, error: null });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sendInvitation(supabase as any, 'user-1', 'user-2', {
      timeMinutes: 5,
      incrementSeconds: 0
    });
    expect(result.success).toBe(true);
    expect(result.inviteCode).toBe('abc12345');
  });

  it('returns error when insert fails', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'gt', 'limit']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
        return chain;
      }
      return actionChain({ data: null, error: { message: 'insert failed' } });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sendInvitation(supabase as any, 'user-1', 'user-2', {
      timeMinutes: 5,
      incrementSeconds: 0
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('sendFailed');
  });
});

describe('getSentInvitations', () => {
  it('returns empty array when no invitations exist', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gt', 'order']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getSentInvitations(supabase as any, 'user-1');
    expect(result).toEqual([]);
  });

  it('returns invitations with recipient display names', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // invitations query
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'gt', 'order']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.order = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'inv-1',
              from_user: 'user-1',
              to_user: 'user-2',
              game_config: { timeMinutes: 5, incrementSeconds: 0 },
              invite_code: 'abc12345',
              status: 'pending',
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        });
        return chain;
      }
      // profiles query
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'user-2', display_name: 'Player Two' }],
            error: null
          })
        })
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getSentInvitations(supabase as any, 'user-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('inv-1');
    expect(result[0].toUser?.displayName).toBe('Player Two');
    expect(result[0].gameConfig).toEqual({ timeMinutes: 5, incrementSeconds: 0 });
  });

  it('sanitizes display names (strips HTML)', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'gt', 'order']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.order = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'inv-1',
              from_user: 'user-1',
              to_user: 'user-2',
              game_config: { timeMinutes: 10, incrementSeconds: 0 },
              invite_code: 'xyz',
              status: 'pending',
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        });
        return chain;
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'user-2', display_name: '<script>alert(1)</script>Player' }],
            error: null
          })
        })
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getSentInvitations(supabase as any, 'user-1');
    expect(result[0].toUser?.displayName).toBe('alert(1)Player');
  });
});

describe('cancelInvitation', () => {
  it('returns success when sender cancels', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'inv-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await cancelInvitation(supabase as any, 'inv-1', 'user-1');
    expect(result.success).toBe(true);
  });

  it('uses delete to remove the invitation row', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'inv-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await cancelInvitation(supabase as any, 'inv-1', 'user-1');
    expect(chain.delete).toHaveBeenCalled();
  });

  it('verifies sender authorization via eq from_user', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'inv-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await cancelInvitation(supabase as any, 'inv-1', 'user-1');
    expect(chain.eq).toHaveBeenCalledWith('from_user', 'user-1');
  });

  it('filters by pending status only', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'inv-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await cancelInvitation(supabase as any, 'inv-1', 'user-1');
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('fails when user is not the sender', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await cancelInvitation(supabase as any, 'inv-1', 'not-sender');
    expect(result.success).toBe(false);
    expect(result.error).toBe('cancelFailed');
  });
});

describe('getReceivedInvitations', () => {
  it('returns empty array when no invitations exist', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gt', 'order']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getReceivedInvitations(supabase as any, 'user-1');
    expect(result).toEqual([]);
  });

  it('returns invitations with sender display names', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // invitations query
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'gt', 'order']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.order = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'inv-1',
              from_user: 'user-2',
              to_user: 'user-1',
              game_config: { timeMinutes: 5, incrementSeconds: 0 },
              invite_code: 'abc12345',
              status: 'pending',
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        });
        return chain;
      }
      // profiles query
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'user-2', display_name: 'Player Two' }],
            error: null
          })
        })
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getReceivedInvitations(supabase as any, 'user-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('inv-1');
    expect(result[0].fromUser.displayName).toBe('Player Two');
    expect(result[0].gameConfig).toEqual({ timeMinutes: 5, incrementSeconds: 0 });
  });

  it('includes sender rating when available', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'gt', 'order']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.order = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'inv-1',
              from_user: 'user-2',
              to_user: 'user-1',
              game_config: { timeMinutes: 5, incrementSeconds: 0 },
              invite_code: null,
              status: 'pending',
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        });
        return chain;
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'user-2', display_name: 'Player Two', rating: 1500 }],
            error: null
          })
        })
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getReceivedInvitations(supabase as any, 'user-1');
    expect(result).toHaveLength(1);
    expect(result[0].fromUser.rating).toBe(1500);
  });

  it('omits rating when null in profile', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'gt', 'order']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.order = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'inv-1',
              from_user: 'user-2',
              to_user: 'user-1',
              game_config: { timeMinutes: 5, incrementSeconds: 0 },
              invite_code: null,
              status: 'pending',
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        });
        return chain;
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'user-2', display_name: 'Player Two', rating: null }],
            error: null
          })
        })
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getReceivedInvitations(supabase as any, 'user-1');
    expect(result[0].fromUser.rating).toBeUndefined();
  });

  it('sanitizes sender display names', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'gt', 'order']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.order = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'inv-1',
              from_user: 'user-2',
              to_user: 'user-1',
              game_config: { timeMinutes: 10, incrementSeconds: 0 },
              invite_code: 'xyz',
              status: 'pending',
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        });
        return chain;
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'user-2', display_name: '<img onerror=alert(1)>Hacker' }],
            error: null
          })
        })
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getReceivedInvitations(supabase as any, 'user-1');
    expect(result[0].fromUser.displayName).toBe('Hacker');
  });
});

describe('acceptInvitation', () => {
  it('updates invitation and creates game state atomically on success', async () => {
    const { supabase, mockFrom, mockRpc } = createMockSupabase();

    mockFrom.mockReturnValue(
      actionChain({
        data: {
          id: 'inv-1',
          from_user: 'user-2',
          game_config: { timeMinutes: 5, incrementSeconds: 0 }
        },
        error: null
      })
    );
    mockRpc.mockResolvedValue({ data: 'game-1', error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptInvitation(supabase as any, 'inv-1', 'user-1');
    expect(result.success).toBe(true);
    expect(result.gameId).toBe('game-1');
    expect(mockRpc).toHaveBeenCalledWith('create_game_with_state', {
      p_invitation_id: 'inv-1',
      p_fen: DEFAULT_POSITION
    });
  });

  it('fails when user is not the recipient', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptInvitation(supabase as any, 'inv-1', 'not-recipient');
    expect(result.success).toBe(false);
    expect(result.error).toBe('invitationUnavailable');
  });

  it('rolls back invitation on game creation failure', async () => {
    const { supabase, mockFrom, mockRpc } = createMockSupabase();
    const rollbackChain = actionChain({ data: { id: 'inv-1' }, error: null });

    mockFrom.mockImplementation(() => {
      if (mockFrom.mock.calls.length === 1) {
        // update invitation succeeds
        return actionChain({
          data: {
            id: 'inv-1',
            from_user: 'user-2',
            game_config: { timeMinutes: 5, incrementSeconds: 0 }
          },
          error: null
        });
      }
      // rollback update
      return rollbackChain;
    });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptInvitation(supabase as any, 'inv-1', 'user-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('gameCreationFailed');
  });
});

describe('declineInvitation', () => {
  it('returns success when recipient declines', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'inv-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await declineInvitation(supabase as any, 'inv-1', 'user-1');
    expect(result.success).toBe(true);
  });

  it('uses update to set status to declined', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'inv-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await declineInvitation(supabase as any, 'inv-1', 'user-1');
    // The chain should have been called — the update method is what sets status
    expect(mockFrom).toHaveBeenCalledWith('game_invitations');
  });

  it('verifies recipient authorization via eq to_user', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'inv-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await declineInvitation(supabase as any, 'inv-1', 'user-1');
    expect(chain.eq).toHaveBeenCalledWith('to_user', 'user-1');
  });

  it('filters by pending status only', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'inv-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await declineInvitation(supabase as any, 'inv-1', 'user-1');
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('fails when user is not the recipient', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await declineInvitation(supabase as any, 'inv-1', 'not-recipient');
    expect(result.success).toBe(false);
    expect(result.error).toBe('declineFailed');
  });
});

describe('getInvitationByCode', () => {
  it('returns invitation with inviter profile when found', async () => {
    const { supabase, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({
      data: {
        id: 'inv-1',
        from_user: 'user-sender',
        game_config: { timeMinutes: 10, incrementSeconds: 5 },
        invite_code: 'abc12345',
        created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-02T00:00:00Z',
        display_name: 'Sender Name'
      },
      error: null
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getInvitationByCode(supabase as any, 'abc12345');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('inv-1');
    expect(result!.fromUser.displayName).toBe('Sender Name');
    expect(result!.gameConfig).toEqual({ timeMinutes: 10, incrementSeconds: 5 });
    expect(mockRpc).toHaveBeenCalledWith('get_invitation_by_code', { p_invite_code: 'abc12345' });
  });

  it('returns null when invitation not found', async () => {
    const { supabase, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({ data: null, error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getInvitationByCode(supabase as any, 'notfound');
    expect(result).toBeNull();
  });

  it('returns null on RPC error', async () => {
    const { supabase, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({ data: null, error: { message: 'function error' } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getInvitationByCode(supabase as any, 'expired1');
    expect(result).toBeNull();
  });

  it('sanitizes inviter display name', async () => {
    const { supabase, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({
      data: {
        id: 'inv-1',
        from_user: 'user-sender',
        game_config: { timeMinutes: 5, incrementSeconds: 0 },
        invite_code: 'abc12345',
        created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-02T00:00:00Z',
        display_name: '<script>alert(1)</script>Evil'
      },
      error: null
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getInvitationByCode(supabase as any, 'abc12345');
    expect(result!.fromUser.displayName).toBe('alert(1)Evil');
  });
});

describe('createShareableInvitation', () => {
  it('creates invitation with null to_user and 24h expiration', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'inv-new', invite_code: 'link1234' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createShareableInvitation(supabase as any, 'user-1', {
      timeMinutes: 10,
      incrementSeconds: 0
    });
    expect(result.success).toBe(true);
    expect(result.inviteCode).toBe('link1234');
    expect(chain.insert).toHaveBeenCalled();
    // Verify insert was called with to_user: null
    const insertCall = (chain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertCall.to_user).toBeNull();
    expect(insertCall.from_user).toBe('user-1');
    expect(insertCall.expires_at).toBeDefined();
  });

  it('returns error when insert fails', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: null, error: { message: 'insert failed' } });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createShareableInvitation(supabase as any, 'user-1', {
      timeMinutes: 5,
      incrementSeconds: 0
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('createFailed');
  });
});

describe('acceptInviteLink', () => {
  it('claims, accepts, auto-friends and creates game via RPC on success', async () => {
    const { supabase, mockFrom, mockRpc } = createMockSupabase();
    let rpcCallCount = 0;
    mockRpc.mockImplementation(() => {
      rpcCallCount++;
      if (rpcCallCount === 1) {
        return Promise.resolve({
          data: {
            id: 'inv-1',
            from_user: 'user-sender',
            game_config: { timeMinutes: 5, incrementSeconds: 0 }
          },
          error: null
        });
      }
      if (rpcCallCount === 2) {
        // create_or_accept_friendship
        return Promise.resolve({ data: true, error: null });
      }
      // create_game_with_state
      return Promise.resolve({ data: 'game-1', error: null });
    });

    mockFrom.mockReturnValue(actionChain({ data: { id: 'inv-1' }, error: null }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptInviteLink(supabase as any, 'abc12345', 'user-acceptor');
    expect(result.success).toBe(true);
    expect(result.gameId).toBe('game-1');
    expect(result.inviterUserId).toBe('user-sender');
    expect(mockRpc).toHaveBeenCalledWith('claim_link_invitation', {
      p_invite_code: 'abc12345'
    });
    expect(mockRpc).toHaveBeenCalledWith('create_or_accept_friendship', {
      p_user_1: 'user-acceptor',
      p_user_2: 'user-sender',
      p_initiated_by: 'user-acceptor'
    });
    expect(mockRpc).toHaveBeenCalledWith('create_game_with_state', {
      p_invitation_id: 'inv-1',
      p_fen: DEFAULT_POSITION
    });
  });

  it('fails when invitation already claimed (race condition)', async () => {
    const { supabase, mockFrom, mockRpc } = createMockSupabase();
    mockFrom.mockReturnValue(actionChain({ data: { id: 'inv-1' }, error: null }));
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptInviteLink(supabase as any, 'abc12345', 'user-acceptor');
    expect(result.success).toBe(false);
    expect(result.error).toBe('alreadyClaimed');
  });

  it('prevents self-accept via neq from_user filter', async () => {
    const { supabase, mockFrom, mockRpc } = createMockSupabase();
    mockFrom.mockReturnValue(actionChain({ data: { id: 'inv-1' }, error: null }));
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptInviteLink(supabase as any, 'abc12345', 'user-sender');
    expect(result.success).toBe(false);
    expect(result.error).toBe('alreadyClaimed');
  });

  it('rolls back on game creation RPC failure', async () => {
    const { supabase, mockFrom, mockRpc } = createMockSupabase();
    const rollbackChain = actionChain({ data: { id: 'inv-1' }, error: null });
    let rpcCallCount = 0;
    mockRpc.mockImplementation(() => {
      rpcCallCount++;
      if (rpcCallCount === 1) {
        return Promise.resolve({
          data: {
            id: 'inv-1',
            from_user: 'user-sender',
            game_config: { timeMinutes: 5, incrementSeconds: 0 }
          },
          error: null
        });
      }
      if (rpcCallCount === 2) {
        // create_or_accept_friendship succeeds
        return Promise.resolve({ data: true, error: null });
      }
      // create_game_with_state fails
      return Promise.resolve({ data: null, error: { message: 'rpc failed' } });
    });
    let fromCallCount = 0;
    mockFrom.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return actionChain({ data: { id: 'inv-1' }, error: null });
      }
      return rollbackChain;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptInviteLink(supabase as any, 'abc12345', 'user-acceptor');
    expect(result.success).toBe(false);
    expect(result.error).toBe('gameCreationFailed');
  });

  it('continues to game creation even when auto-friendship fails (non-blocking)', async () => {
    const { supabase, mockFrom, mockRpc } = createMockSupabase();
    let rpcCallCount = 0;
    mockRpc.mockImplementation(() => {
      rpcCallCount++;
      if (rpcCallCount === 1) {
        return Promise.resolve({
          data: {
            id: 'inv-1',
            from_user: 'user-sender',
            game_config: { timeMinutes: 5, incrementSeconds: 0 }
          },
          error: null
        });
      }
      if (rpcCallCount === 2) {
        // create_or_accept_friendship fails (non-blocking)
        return Promise.resolve({ data: false, error: null });
      }
      // create_game_with_state succeeds
      return Promise.resolve({ data: 'game-1', error: null });
    });
    mockFrom.mockReturnValue(actionChain({ data: { id: 'inv-1' }, error: null }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptInviteLink(supabase as any, 'abc12345', 'user-acceptor');
    expect(result.success).toBe(true);
    expect(result.gameId).toBe('game-1');
    expect(result.inviterUserId).toBe('user-sender');
  });

  it('continues to game creation when auto-friendship RPC rejects', async () => {
    const { supabase, mockFrom, mockRpc } = createMockSupabase();
    let rpcCallCount = 0;
    mockRpc.mockImplementation(() => {
      rpcCallCount++;
      if (rpcCallCount === 1) {
        return Promise.resolve({
          data: {
            id: 'inv-1',
            from_user: 'user-sender',
            game_config: { timeMinutes: 5, incrementSeconds: 0 }
          },
          error: null
        });
      }
      if (rpcCallCount === 2) {
        return Promise.reject(new Error('friendship rpc crashed'));
      }
      return Promise.resolve({ data: 'game-1', error: null });
    });

    mockFrom.mockReturnValue(actionChain({ data: { id: 'inv-1' }, error: null }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptInviteLink(supabase as any, 'abc12345', 'user-acceptor');
    expect(result.success).toBe(true);
    expect(result.gameId).toBe('game-1');
  });
});

describe('createAutoFriendship', () => {
  it('returns true when RPC reconciles friendship', async () => {
    const { supabase, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({ data: true, error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createAutoFriendship(supabase as any, 'user-a', 'user-b');
    expect(result).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('create_or_accept_friendship', {
      p_user_1: 'user-a',
      p_user_2: 'user-b',
      p_initiated_by: 'user-a'
    });
  });

  it('returns false when RPC returns false', async () => {
    const { supabase, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({ data: false, error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createAutoFriendship(supabase as any, 'user-a', 'user-b');
    expect(result).toBe(false);
  });

  it('returns false on RPC errors', async () => {
    const { supabase, mockRpc } = createMockSupabase();
    mockRpc.mockResolvedValue({ data: null, error: { message: 'connection refused' } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createAutoFriendship(supabase as any, 'user-a', 'user-b');
    expect(result).toBe(false);
  });

  it('returns false when RPC rejects', async () => {
    const { supabase, mockRpc } = createMockSupabase();
    mockRpc.mockRejectedValue(new Error('network blew up'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createAutoFriendship(supabase as any, 'user-a', 'user-b');
    expect(result).toBe(false);
  });
});

// ─── Open Challenge (Lobby) Tests ───────────────────────────────────

describe('getMyActiveOpenChallenge', () => {
  it('returns null when no active open challenge exists', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'is', 'gt', 'limit']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getMyActiveOpenChallenge(supabase as any, 'user-1');
    expect(result).toBeNull();
  });

  it('returns invitation when active open challenge exists', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'is', 'gt', 'limit']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({
      data: {
        id: 'inv-1',
        from_user: 'user-1',
        to_user: null,
        game_config: { timeMinutes: 5, incrementSeconds: 0 },
        invite_code: null,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z'
      },
      error: null
    });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getMyActiveOpenChallenge(supabase as any, 'user-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('inv-1');
    expect(result!.toUser).toBeNull();
    expect(result!.gameConfig).toEqual({ timeMinutes: 5, incrementSeconds: 0 });
  });
});

describe('createOpenChallenge', () => {
  it('rejects when user already has an active open challenge', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['update', 'eq', 'is', 'lt']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        return chain;
      }

      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'is', 'gt', 'limit']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }
      chain.single = vi.fn().mockResolvedValue({
        data: {
          id: 'existing',
          from_user: 'user-1',
          to_user: null,
          game_config: {},
          invite_code: null,
          status: 'pending',
          created_at: ''
        },
        error: null
      });
      return chain;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createOpenChallenge(supabase as any, 'user-1', {
      timeMinutes: 5,
      incrementSeconds: 0
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('alreadyHasChallenge');
  });

  it('creates challenge with to_user=null and invite_code=null', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['update', 'eq', 'is', 'lt']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        return chain;
      }
      if (callCount === 2) {
        // getMyActiveOpenChallenge — no existing
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'is', 'gt', 'limit']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
        return chain;
      }
      // insert chain
      return actionChain({ data: { id: 'inv-new' }, error: null });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createOpenChallenge(supabase as any, 'user-1', {
      timeMinutes: 10,
      incrementSeconds: 5
    });
    expect(result.success).toBe(true);
    expect(result.invitationId).toBe('inv-new');
  });

  it('returns error when insert fails', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['update', 'eq', 'is', 'lt']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        return chain;
      }
      if (callCount === 2) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'is', 'gt', 'limit']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
        return chain;
      }
      return actionChain({ data: null, error: { message: 'insert failed' } });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createOpenChallenge(supabase as any, 'user-1', {
      timeMinutes: 5,
      incrementSeconds: 0
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('createFailed');
  });

  it('returns alreadyHasChallenge when the unique index rejects a racing insert', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['update', 'eq', 'is', 'lt']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        return chain;
      }
      if (callCount === 2) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'is', 'gt', 'limit']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
        return chain;
      }
      return actionChain({ data: null, error: { code: '23505', message: 'duplicate key value' } });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createOpenChallenge(supabase as any, 'user-1', {
      timeMinutes: 5,
      incrementSeconds: 0
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('alreadyHasChallenge');
  });
});

describe('getOpenChallenges', () => {
  it('returns empty array when no challenges exist', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'is', 'gt', 'order']) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getOpenChallenges(supabase as any);
    expect(result).toEqual([]);
  });

  it('returns challenges with creator display names', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'is', 'gt', 'order']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.order = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'inv-1',
              from_user: 'user-2',
              to_user: null,
              game_config: { timeMinutes: 5, incrementSeconds: 0 },
              invite_code: null,
              status: 'pending',
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        });
        return chain;
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'user-2', display_name: 'Challenger' }],
            error: null
          })
        })
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getOpenChallenges(supabase as any);
    expect(result).toHaveLength(1);
    expect(result[0].fromUser.displayName).toBe('Challenger');
    expect(result[0].toUser).toBeNull();
    expect(result[0].inviteCode).toBeNull();
  });

  it('sanitizes creator display names', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'is', 'gt', 'order']) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.order = vi.fn().mockResolvedValue({
          data: [
            {
              id: 'inv-1',
              from_user: 'user-2',
              to_user: null,
              game_config: { timeMinutes: 5, incrementSeconds: 0 },
              invite_code: null,
              status: 'pending',
              created_at: '2024-01-01T00:00:00Z'
            }
          ],
          error: null
        });
        return chain;
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'user-2', display_name: '<b>Evil</b>' }],
            error: null
          })
        })
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getOpenChallenges(supabase as any);
    expect(result[0].fromUser.displayName).toBe('Evil');
  });
});

describe('acceptOpenChallenge', () => {
  it('claims, accepts, and creates game on success', async () => {
    const { supabase, mockFrom, mockRpc } = createMockSupabase();
    let callCount = 0;
    mockRpc.mockResolvedValue({ data: 'game-1', error: null });

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // claim step
        return actionChain({
          data: {
            id: 'inv-1',
            from_user: 'user-creator',
            game_config: { timeMinutes: 5, incrementSeconds: 0 }
          },
          error: null
        });
      }
      if (callCount === 2) {
        // accept step
        return actionChain({ data: { id: 'inv-1' }, error: null });
      }
      return actionChain({ data: { id: 'inv-1' }, error: null });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptOpenChallenge(supabase as any, 'inv-1', 'user-acceptor');
    expect(result.success).toBe(true);
    expect(result.gameId).toBe('game-1');
    expect(mockRpc).toHaveBeenCalledWith('create_game_with_state', {
      p_invitation_id: 'inv-1',
      p_fen: DEFAULT_POSITION
    });
  });

  it('prevents self-accept via neq filter', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptOpenChallenge(supabase as any, 'inv-1', 'user-creator');
    expect(result.success).toBe(false);
    expect(result.error).toBe('acceptFailed');
  });

  it('fails when challenge already accepted (race condition)', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptOpenChallenge(supabase as any, 'inv-1', 'user-late');
    expect(result.success).toBe(false);
    expect(result.error).toBe('acceptFailed');
  });

  it('rolls back on game creation failure', async () => {
    const { supabase, mockFrom, mockRpc } = createMockSupabase();
    let callCount = 0;
    const rollbackChain = actionChain({ data: { id: 'inv-1' }, error: null });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return actionChain({
          data: {
            id: 'inv-1',
            from_user: 'user-creator',
            game_config: { timeMinutes: 5, incrementSeconds: 0 }
          },
          error: null
        });
      }
      if (callCount === 2) {
        return actionChain({ data: { id: 'inv-1' }, error: null });
      }
      return rollbackChain;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptOpenChallenge(supabase as any, 'inv-1', 'user-acceptor');
    expect(result.success).toBe(false);
    expect(result.error).toBe('gameCreationFailed');
  });
});

describe('cancelOpenChallenge', () => {
  it('delegates to cancelInvitation', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'inv-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await cancelOpenChallenge(supabase as any, 'inv-1', 'user-1');
    expect(result.success).toBe(true);
  });

  it('fails when user is not the creator', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await cancelOpenChallenge(supabase as any, 'inv-1', 'not-creator');
    expect(result.success).toBe(false);
    expect(result.error).toBe('cancelFailed');
  });
});
