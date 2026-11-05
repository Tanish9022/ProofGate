import { NextRequest, NextResponse } from 'next/server';
import { resetWorkspace } from '@/server/services/workspace';
import { db } from '@/server/db/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const wsId = request.cookies.get('pg_ws')?.value;
  if (!wsId) {
    return NextResponse.json(
      { error: { code: 'no_workspace', message: 'No workspace cookie found' } },
      { status: 400 }
    );
  }

  try {
    await resetWorkspace(wsId);

    // Audit log
    await db(
      `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id)
       VALUES ($1, 'admin', 'workspace.reset', 'workspace', $2)`,
      [wsId, wsId]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('workspace/reset error:', error);
    return NextResponse.json(
      { error: { code: 'reset_failed', message: 'Could not reset workspace' } },
      { status: 500 }
    );
  }
}
