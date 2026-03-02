import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canonicalPair, searchUsers, sendFriendRequest, getFriendsList } from './queries';

// Mock Supabase client factory
function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const mockFrom = vi.fn();
  const supabase = { from: mockFrom, ...overrides };
  return { supabase, mockFrom };
}

function chainable(finalResult: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'neq', 'ilike', 'or', 'in', 'limit', 'single', 'insert'];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // The last method in a chain should resolve
  chain.select = vi.fn().mockReturnValue(Object.assign({}, chain, finalResult));
  chain.limit = vi.fn().mockReturnValue(finalResult);
  chain.single = vi.fn().mockReturnValue(finalResult);
  chain.insert = vi.fn().mockReturnValue(finalResult);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.ilike = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  return chain;
}

describe('canonicalPair', () => {
  it('returns sorted pair when first ID is smaller', () => {
    const [a, b] = canonicalPair('aaa', 'bbb');
    expect(a).toBe('aaa');
    expect(b).toBe('bbb');
  });

  it('swaps when first ID is larger', () => {
    const [a, b] = canonicalPair('zzz', 'aaa');
    expect(a).toBe('aaa');
    expect(b).toBe('zzz');
  });

  it('handles equal IDs', () => {
    const [a, b] = canonicalPair('same', 'same');
    expect(a).toBe('same');
    expect(b).toBe('same');
  });
});

describe('searchUsers', () => {
  it('returns empty array for queries shorter than 2 characters', async () => {
    const { supabase } = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await searchUsers(supabase as any, 'a', 'user-1');
    expect(results).toEqual([]);
  });

  it('excludes self from search results', async () => {
    const chain = chainable({ data: [], error: null });
    const { supabase } = createMockSupabase();
    supabase.from.mockReturnValue(chain);
    // Make limit return profiles result
    chain.limit = vi.fn().mockResolvedValue({
      data: [{ id: 'user-2', display_name: 'Player Two' }],
      error: null
    });
    // Make or (for friendships query) return empty
    chain.or = vi.fn().mockReturnValue({
      ...chain,
      select: vi.fn().mockReturnValue({
        ...chain,
        or: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await searchUsers(supabase as any, 'Player', 'user-1');
    // Verify neq was called with self ID
    expect(chain.neq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('returns empty array when no profiles match', async () => {
    const chain = chainable({ data: [], error: null });
    const { supabase } = createMockSupabase();
    supabase.from.mockReturnValue(chain);
    chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await searchUsers(supabase as any, 'nonexistent', 'user-1');
    expect(results).toEqual([]);
  });
});

describe('sendFriendRequest', () => {
  it('rejects self-friending', async () => {
    const { supabase } = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sendFriendRequest(supabase as any, 'user-1', 'user-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('cannotFriendSelf');
  });

  it('uses canonical ordering for insert', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const singleFn = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    const { supabase, mockFrom } = createMockSupabase();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleFn
          })
        })
      }),
      insert: insertFn
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sendFriendRequest(supabase as any, 'zzz-user', 'aaa-user');

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_a: 'aaa-user',
        user_b: 'zzz-user',
        initiated_by: 'zzz-user'
      })
    );
  });

  it('rejects when already friends', async () => {
    const singleFn = vi
      .fn()
      .mockResolvedValue({ data: { id: 'f-1', status: 'accepted' }, error: null });
    const { supabase, mockFrom } = createMockSupabase();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleFn
          })
        })
      })
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sendFriendRequest(supabase as any, 'user-1', 'user-2');
    expect(result.success).toBe(false);
    expect(result.error).toBe('alreadyFriends');
  });

  it('rejects when request already pending', async () => {
    const singleFn = vi
      .fn()
      .mockResolvedValue({ data: { id: 'f-1', status: 'pending' }, error: null });
    const { supabase, mockFrom } = createMockSupabase();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleFn
          })
        })
      })
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sendFriendRequest(supabase as any, 'user-1', 'user-2');
    expect(result.success).toBe(false);
    expect(result.error).toBe('requestAlreadyPending');
  });
});

describe('getFriendsList', () => {
  it('returns empty array when no friendships exist', async () => {
    const { supabase, mockFrom } = createMockSupabase();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getFriendsList(supabase as any, 'user-1');
    expect(result).toEqual([]);
  });
});
