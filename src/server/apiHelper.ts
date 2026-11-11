import { NextRequest, NextResponse } from 'next/server';

export type UserRole = 'admin' | 'creator' | 'reviewer';

export interface RequestContext {
  workspaceId: string;
  role: UserRole;
}

/**
 * Resolves the workspace ID from cookie `pg_ws` and role from header `x-role`.
 * Enforces strict role checks when requiredRole is specified.
 * Returns 403 with a clear message if role does not match.
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

  if (requiredRole && role !== requiredRole) {
    return NextResponse.json(
      {
        error: {
          code: 'forbidden',
          message: `Forbidden: this action requires '${requiredRole}' privileges (current role: '${role}'). Note: x-role header is a demo control, not authentication.`,
        },
      },
      { status: 403 }
    );
  }

  return { workspaceId: wsCookie, role };
}
