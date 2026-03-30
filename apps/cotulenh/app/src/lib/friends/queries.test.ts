import { describe, it, expect, vi } from 'vitest';
import {
  canonicalPair,
  searchUsers,
  sendFriendRequest,
  getFriendsList,
  getPendingIncomingRequests,
  getPendingSentRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelSentRequest,
  removeFriend
} from './queries';

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

/** Build a chain for update/delete actions where single() is the terminal */
function actionChain(singleResult: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ['update', 'delete', 'eq', 'or', 'neq', 'select']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(singleResult);
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

  it('searches by display name or username and excludes self', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'user-2', display_name: 'Player Two' }],
        error: null
      })
    };
    const friendshipsChain = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null })
    };

    mockFrom.mockReturnValueOnce(profilesChain).mockReturnValueOnce(friendshipsChain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await searchUsers(supabase as any, 'Player', 'user-1');

    expect(profilesChain.or).toHaveBeenCalledWith(
      'display_name.ilike.%Player%,username.ilike.%Player%'
    );
    expect(profilesChain.neq).toHaveBeenCalledWith('id', 'user-1');
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

  it('rejects when user is blocked', async () => {
    const singleFn = vi
      .fn()
      .mockResolvedValue({ data: { id: 'f-1', status: 'blocked' }, error: null });
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
    expect(result.error).toBe('userBlocked');
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

describe('getPendingIncomingRequests', () => {
  it('returns empty array when no pending incoming requests', async () => {
    const { supabase, mockFrom } = createMockSupabase();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            neq: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getPendingIncomingRequests(supabase as any, 'user-1');
    expect(result).toEqual([]);
  });

  it('returns incoming requests with sender display names', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // friendships query
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'f-1',
                      user_a: 'sender-1',
                      user_b: 'user-1',
                      initiated_by: 'sender-1',
                      created_at: '2024-01-01T00:00:00Z'
                    }
                  ],
                  error: null
                })
              })
            })
          })
        };
      }
      // profiles query
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'sender-1', display_name: 'Sender One', rating: 1725 }],
            error: null
          })
        })
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getPendingIncomingRequests(supabase as any, 'user-1');
    expect(result).toHaveLength(1);
    expect(result[0].friendshipId).toBe('f-1');
    expect(result[0].displayName).toBe('Sender One');
    expect(result[0].userId).toBe('sender-1');
    expect(result[0].rating).toBe(1725);
  });

  it('returns empty when profiles query fails', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'f-1',
                      user_a: 'sender-1',
                      user_b: 'user-1',
                      initiated_by: 'sender-1',
                      created_at: '2024-01-01T00:00:00Z'
                    }
                  ],
                  error: null
                })
              })
            })
          })
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } })
        })
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getPendingIncomingRequests(supabase as any, 'user-1');
    expect(result).toEqual([]);
  });
});

describe('getPendingSentRequests', () => {
  it('returns empty array when no pending sent requests', async () => {
    const { supabase, mockFrom } = createMockSupabase();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getPendingSentRequests(supabase as any, 'user-1');
    expect(result).toEqual([]);
  });

  it('returns sent requests with recipient display names', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // friendships query
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'f-2',
                    user_a: 'recipient-1',
                    user_b: 'user-1',
                    initiated_by: 'user-1',
                    created_at: '2024-01-02T00:00:00Z'
                  }
                ],
                error: null
              })
            })
          })
        };
      }
      // profiles query
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'recipient-1', display_name: 'Recipient One' }],
            error: null
          })
        })
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getPendingSentRequests(supabase as any, 'user-1');
    expect(result).toHaveLength(1);
    expect(result[0].friendshipId).toBe('f-2');
    expect(result[0].displayName).toBe('Recipient One');
    expect(result[0].userId).toBe('recipient-1');
  });
});

describe('acceptFriendRequest', () => {
  it('returns success when recipient accepts via RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const { supabase, mockFrom } = createMockSupabase({ rpc });
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          user_a: 'initiator-user',
          user_b: 'user-1',
          initiated_by: 'initiator-user'
        },
        error: null
      })
    };
    mockFrom.mockReturnValue(selectChain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptFriendRequest(supabase as any, 'f-1', 'user-1');
    expect(result.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith('create_or_accept_friendship', {
      p_user_1: 'initiator-user',
      p_user_2: 'user-1',
      p_initiated_by: 'user-1'
    });
  });

  it('fails when user is the initiator (not recipient)', async () => {
    const rpc = vi.fn();
    const { supabase, mockFrom } = createMockSupabase({ rpc });
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          user_a: 'initiator-user',
          user_b: 'user-1',
          initiated_by: 'initiator-user'
        },
        error: null
      })
    };
    mockFrom.mockReturnValue(selectChain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptFriendRequest(supabase as any, 'f-1', 'initiator-user');
    expect(result.success).toBe(false);
    expect(result.error).toBe('acceptFailed');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails when the RPC cannot accept the friendship', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    const { supabase, mockFrom } = createMockSupabase({ rpc });
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          user_a: 'initiator-user',
          user_b: 'user-1',
          initiated_by: 'initiator-user'
        },
        error: null
      })
    };
    mockFrom.mockReturnValue(selectChain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await acceptFriendRequest(supabase as any, 'f-1', 'user-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('acceptFailed');
  });
});

describe('declineFriendRequest', () => {
  it('returns success when recipient declines', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'f-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await declineFriendRequest(supabase as any, 'f-1', 'user-1');
    expect(result.success).toBe(true);
  });

  it('uses delete to remove the friendship row', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'f-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await declineFriendRequest(supabase as any, 'f-1', 'user-1');
    expect(chain.delete).toHaveBeenCalled();
  });

  it('fails when user is the initiator (not recipient)', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await declineFriendRequest(supabase as any, 'f-1', 'initiator-user');
    expect(result.success).toBe(false);
    expect(result.error).toBe('declineFailed');
  });

  it('verifies recipient authorization via neq initiated_by', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'f-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await declineFriendRequest(supabase as any, 'f-1', 'user-1');
    expect(chain.neq).toHaveBeenCalledWith('initiated_by', 'user-1');
  });
});

describe('cancelSentRequest', () => {
  it('returns success when initiator cancels', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'f-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await cancelSentRequest(supabase as any, 'f-1', 'user-1');
    expect(result.success).toBe(true);
  });

  it('uses delete to remove the friendship row', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'f-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await cancelSentRequest(supabase as any, 'f-1', 'user-1');
    expect(chain.delete).toHaveBeenCalled();
  });

  it('verifies sender authorization via eq initiated_by', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'f-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await cancelSentRequest(supabase as any, 'f-1', 'user-1');
    // Should verify initiated_by = userId (sender only)
    expect(chain.eq).toHaveBeenCalledWith('initiated_by', 'user-1');
  });

  it('fails when user is not the initiator', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await cancelSentRequest(supabase as any, 'f-1', 'not-initiator');
    expect(result.success).toBe(false);
    expect(result.error).toBe('cancelFailed');
  });
});

describe('removeFriend', () => {
  it('returns success when user removes an accepted friend', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'f-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await removeFriend(supabase as any, 'f-1', 'user-1');
    expect(result.success).toBe(true);
  });

  it('uses delete to remove the friendship row', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'f-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await removeFriend(supabase as any, 'f-1', 'user-1');
    expect(chain.delete).toHaveBeenCalled();
  });

  it('filters by accepted status only', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'f-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await removeFriend(supabase as any, 'f-1', 'user-1');
    expect(chain.eq).toHaveBeenCalledWith('status', 'accepted');
  });

  it('verifies user is part of the friendship via or clause', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: { id: 'f-1' }, error: null });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await removeFriend(supabase as any, 'f-1', 'user-1');
    expect(chain.or).toHaveBeenCalledWith('user_a.eq.user-1,user_b.eq.user-1');
  });

  it('fails when user is not part of the friendship', async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = actionChain({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(chain);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await removeFriend(supabase as any, 'f-1', 'not-a-friend');
    expect(result.success).toBe(false);
    expect(result.error).toBe('removeFailed');
  });
});
