import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initWorkspace } from '@/server/services/workspace';

const COOKIE_NAME = 'pg_ws';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Skip for static assets, _next internals, and API routes
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return response;
  }

  // Already has a workspace cookie — nothing to do
  if (request.cookies.get(COOKIE_NAME)?.value) {
    return response;
  }

  // No cookie: init a workspace server-side
  try {
    const wsId = await initWorkspace();
    response.cookies.set(COOKIE_NAME, wsId, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      path: '/',
    });
  } catch (error) {
    // DB not configured or unreachable — continue without cookie so page shows setup message
    console.warn('Workspace initialization deferred:', error);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};


