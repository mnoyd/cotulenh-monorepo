import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutePrefixes = [
  '/dashboard',
  '/play',
  '/game',
  '/friends',
  '/settings',
  '/tournament',
  '/leaderboard',
  '/profile'
] as const;

const authRoutes = new Set(['/login', '/signup']);

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (
    !user &&
    protectedRoutePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return redirectWithCookies(request, response, '/login');
  }

  if (user && authRoutes.has(pathname)) {
    return redirectWithCookies(request, response, '/dashboard');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};

function redirectWithCookies(request: NextRequest, response: NextResponse, pathname: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = '';

  const redirectResponse = NextResponse.redirect(redirectUrl);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}
