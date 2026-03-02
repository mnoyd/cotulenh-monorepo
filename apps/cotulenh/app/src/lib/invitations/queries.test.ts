import { describe, it, expect, vi } from 'vitest';
import {
  validateGameConfig,
  hasPendingInvitation,
  sendInvitation,
  getSentInvitations,
  cancelInvitation
} from './queries';

/** Build a chain for delete/insert actions where single() is the terminal */
function actionChain(singleResult: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ['insert', 'delete', 'eq', 'select', 'limit', 'order']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(singleResult);
  return chain;
}

function createMockSupabase() {
  const mockFrom = vi.fn();
  const supabase = { from: mockFrom };
  return { supabase, mockFrom };
}

describe('validateGameConfig', () => {
  it('accepts valid config', () => {
    expect(validateGameConfig({ timeMinutes: 5, incrementSeconds: 0 })).toBe(true);
    expect(validateGameConfig({ timeMinutes: 60, incrementSeconds: 30 })).toBe(true);
    expect(validateGameConfig({ timeMinutes: 1, incrementSeconds: 0 })).toBe(true);
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
});

describe('hasPendingInvitation', () => {
  it('returns true when pending invitation exists', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'limit']) {
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
    for (const m of ['select', 'eq', 'limit']) {
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
    for (const m of ['select', 'eq', 'limit']) {
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
        for (const m of ['select', 'eq', 'limit']) {
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
        for (const m of ['select', 'eq', 'limit']) {
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
    for (const m of ['select', 'eq', 'order']) {
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
        for (const m of ['select', 'eq', 'order']) {
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
        for (const m of ['select', 'eq', 'order']) {
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
