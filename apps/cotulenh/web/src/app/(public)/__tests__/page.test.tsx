import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  }
}));

// Mock supabase server client
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser()
    }
  })
}));

// Dynamic import so mocks are applied before module loads
const loadPage = () => import('../page');

describe('Landing page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports metadata with Vietnamese SEO fields', async () => {
    const { metadata } = await loadPage();
    expect(metadata).toBeDefined();
    expect(metadata.title).toContain('Cờ Tư Lệnh');
    expect(metadata.description).toBeTruthy();
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph!.title).toContain('Cờ Tư Lệnh');
  });

  it('redirects authenticated users to /dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { default: LandingPage } = await loadPage();

    await expect(LandingPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('does not redirect unauthenticated visitors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { default: LandingPage } = await loadPage();

    const result = await LandingPage();
    expect(result).toBeDefined();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
