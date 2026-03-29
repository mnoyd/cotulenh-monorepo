import { describe, it, expect, vi } from 'vitest';
import {
  sendInvitation,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  getReceivedInvitations
} from './queries';

/** Build a chainable query mock */
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

describe('Friend Challenge Integration', () => {
  describe('send friend challenge', () => {
    it('creates invitation with to_user set to friend ID', async () => {
      const { supabase, mockFrom } = createMockSupabase();
      let callCount = 0;

      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // hasPendingInvitation check
          const chain = actionChain({ data: [], error: null });
          chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
          return chain;
        }
        // insert invitation
        return actionChain({ data: { id: 'inv-new', invite_code: null }, error: null });
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await sendInvitation(supabase as any, 'user-a', 'friend-b', {
        timeMinutes: 15,
        incrementSeconds: 10
      });

      expect(result.success).toBe(true);
    });

    it('prevents duplicate pending invitations to same friend', async () => {
      const { supabase, mockFrom } = createMockSupabase();

      // hasPendingInvitation returns true
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'gt', 'limit']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }
      chain.limit = vi.fn().mockResolvedValue({ data: [{ id: 'existing' }], error: null });
      mockFrom.mockReturnValue(chain);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await sendInvitation(supabase as any, 'user-a', 'friend-b', {
        timeMinutes: 5,
        incrementSeconds: 0
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('alreadyInvited');
    });

    it('prevents self-challenge', async () => {
      const { supabase } = createMockSupabase();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await sendInvitation(supabase as any, 'user-a', 'user-a', {
        timeMinutes: 10,
        incrementSeconds: 0
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('cannotInviteSelf');
    });
  });

  describe('accept friend challenge', () => {
    it('creates game and game state via rpc and returns gameId on success', async () => {
      const { supabase, mockFrom, mockRpc } = createMockSupabase();

      mockFrom.mockReturnValue(
        actionChain({
          data: {
            id: 'inv-1',
            from_user: 'challenger',
            game_config: { timeMinutes: 15, incrementSeconds: 10 }
          },
          error: null
        })
      );
      mockRpc.mockResolvedValue({ data: 'game-1', error: null });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await acceptInvitation(supabase as any, 'inv-1', 'recipient');

      expect(result.success).toBe(true);
      expect(result.gameId).toBe('game-1');
      expect(mockRpc).toHaveBeenCalled();
    });
  });

  describe('decline friend challenge', () => {
    it('updates status to declined', async () => {
      const { supabase, mockFrom } = createMockSupabase();
      mockFrom.mockReturnValue(actionChain({ data: { id: 'inv-1' }, error: null }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await declineInvitation(supabase as any, 'inv-1', 'recipient');

      expect(result.success).toBe(true);
    });
  });

  describe('cancel friend challenge', () => {
    it('deletes the invitation', async () => {
      const { supabase, mockFrom } = createMockSupabase();
      mockFrom.mockReturnValue(actionChain({ data: { id: 'inv-1' }, error: null }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await cancelInvitation(supabase as any, 'inv-1', 'sender');

      expect(result.success).toBe(true);
    });
  });

  describe('received invitations with rating', () => {
    it('includes rating in fromUser for friend challenges', async () => {
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
                from_user: 'friend-1',
                to_user: 'me',
                game_config: { timeMinutes: 15, incrementSeconds: 10, isRated: false },
                invite_code: null,
                status: 'pending',
                created_at: '2026-03-29T00:00:00Z'
              }
            ],
            error: null
          });
          return chain;
        }
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'friend-1', display_name: 'My Friend', rating: 1500 }],
              error: null
            })
          })
        };
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getReceivedInvitations(supabase as any, 'me');

      expect(result).toHaveLength(1);
      expect(result[0].fromUser.displayName).toBe('My Friend');
      expect(result[0].fromUser.rating).toBe(1500);
      expect(result[0].gameConfig).toEqual({
        timeMinutes: 15,
        incrementSeconds: 10,
        isRated: false
      });
    });
  });
});
