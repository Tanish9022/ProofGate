import { NextResponse } from 'next/server';
import { initWorkspace } from '@/server/services/workspace';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const wsId = await initWorkspace();
    return NextResponse.json({ workspaceId: wsId });
  } catch (error) {
    console.error('workspace/init error:', error);
    return NextResponse.json(
      { error: { code: 'init_failed', message: 'Could not initialise workspace' } },
      { status: 500 }
    );
  }
}
