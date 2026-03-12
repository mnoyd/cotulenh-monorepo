import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockExchangeCodeForSession = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args)
    }
  })
}));

const loadHandler = () => import('../callback/route');

describe('auth callback route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exchanges code and redirects to next param', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const { GET } = await loadHandler();
    const request = new NextRequest(
      'http://localhost:3000/auth/callback?code=abc123&next=/reset-password/update'
    );

    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/reset-password/update');
  });

  it('redirects to /dashboard when next param is missing', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const { GET } = await loadHandler();
    const request = new NextRequest('http://localhost:3000/auth/callback?code=abc123');

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('redirects to /dashboard when next is an external URL', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const { GET } = await loadHandler();
    const request = new NextRequest(
      'http://localhost:3000/auth/callback?code=abc123&next=https://evil.example/phish'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('redirects to /dashboard when next is protocol-relative', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const { GET } = await loadHandler();
    const request = new NextRequest(
      'http://localhost:3000/auth/callback?code=abc123&next=//evil.example/phish'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('redirects to login with error when code is missing', async () => {
    const { GET } = await loadHandler();
    const request = new NextRequest('http://localhost:3000/auth/callback');

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?error=auth_callback_failed'
    );
  });

  it('redirects to login with error when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: 'Invalid code' }
    });
    const { GET } = await loadHandler();
    const request = new NextRequest(
      'http://localhost:3000/auth/callback?code=invalid&next=/reset-password/update'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?error=auth_callback_failed'
    );
  });
});
