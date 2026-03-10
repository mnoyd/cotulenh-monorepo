import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockUpdateSession = vi.fn();

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args)
}));

const loadMiddleware = () => import('@/middleware');

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users away from protected routes', async () => {
    mockUpdateSession.mockResolvedValue({
      response: NextResponse.next(),
      user: null
    });
    const { middleware } = await loadMiddleware();

    const response = await middleware(new NextRequest('http://localhost/dashboard'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login');
  });

  it('redirects authenticated users away from auth routes', async () => {
    mockUpdateSession.mockResolvedValue({
      response: NextResponse.next(),
      user: { id: 'user-1' }
    });
    const { middleware } = await loadMiddleware();

    const response = await middleware(new NextRequest('http://localhost/login'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/dashboard');
  });

  it('allows public routes through unchanged', async () => {
    const passthrough = NextResponse.next();
    mockUpdateSession.mockResolvedValue({
      response: passthrough,
      user: null
    });
    const { middleware } = await loadMiddleware();

    const response = await middleware(new NextRequest('http://localhost/learn'));

    expect(response).toBe(passthrough);
  });
});
