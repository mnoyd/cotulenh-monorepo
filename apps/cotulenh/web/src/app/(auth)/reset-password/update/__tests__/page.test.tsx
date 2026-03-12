import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  }
}));

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser()
    }
  })
}));

const loadPage = () => import('../page');

describe('UpdatePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to reset request when there is no active session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { default: UpdatePasswordPage } = await loadPage();

    await expect(UpdatePasswordPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/reset-password?reason=session_required');
  });

  it('renders update form when there is an active session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { default: UpdatePasswordPage } = await loadPage();

    const page = await UpdatePasswordPage();

    expect(page).toBeDefined();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
