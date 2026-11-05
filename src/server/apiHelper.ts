import { NextRequest, NextResponse } from 'next/server';
import { getWorkspace } from '@/server/services/workspace';

export type UserRole = 'admin' | 'creator' | 'reviewer';

export interface RequestContext {
  workspaceId: string;
  role: UserRole;
}

/**
 * Resolves the workspace ID from cookie `pg_ws` and role from header `x-role`.
 * Throws a NextResponse 400/401 if missing or invalid.
 */
export async function getRequestContext(
  request: NextRequest,
  requiredRole?: UserRole
): Promise<RequestContext | NextResponse> {
  const wsCookie = request.cookies.get('pg_ws')?.value;
  if (!wsCookie) {
    return NextResponse.json(
      { error: { code: 'missing_workspace', message: 'No workspace session cookie found' } },
      { status: 400 }
    );
  }

  // Resolve role from header, default to 'creator'
  const roleHeader = request.headers.get('x-role') as UserRole | null;
  const role: UserRole = roleHeader && ['admin', 'creator', 'reviewer'].includes(roleHeader)
    ? roleHeader
    : 'creator';

  if (requiredRole) {
    const isAllowed =
      role === requiredRole ||
      (requiredRole === 'reviewer' && role === 'admin') ||
      (requiredRole === 'creator' && (role === 'admin' || role === 'creator'));

    if (!isAllowed) {
      return NextResponse.json(
        {
          error: {
            code: 'forbidden',
            message: `This action requires the '${requiredRole}' role (current role: '${role}')`,
          },
        },
        { status: 403 }
      );
    }
  }

  return { workspaceId: wsCookie, role };
}

