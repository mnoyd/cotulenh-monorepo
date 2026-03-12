import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = normalizeNextPath(searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}

function normalizeNextPath(next: string | null) {
  if (!next) return '/dashboard';
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  return next;
}
