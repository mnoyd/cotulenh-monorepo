import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actions } from './+page.server';

vi.mock('@cotulenh/common', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('logout form action', () => {
  let mockSupabase: {
    auth: {
      signOut: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        signOut: vi.fn()
      }
    };
  });

  function createMockEvent() {
    return {
      locals: {
        supabase: mockSupabase
      }
    } as unknown as Parameters<typeof actions.default>[0];
  }

  it('calls supabase signOut and redirects to home', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    const event = createMockEvent();

    await expect(actions.default(event)).rejects.toEqual(
      expect.objectContaining({ status: 303, location: '/' })
    );
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('redirects to home even if signOut has an error', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({
      error: { message: 'Sign out failed' }
    });

    const event = createMockEvent();

    await expect(actions.default(event)).rejects.toEqual(
      expect.objectContaining({ status: 303, location: '/' })
    );
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });
});
