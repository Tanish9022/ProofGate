import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { getSources, createSource } from '@/server/services/sources';
import { createSourceSchema } from '@/server/validators/sources';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const sources = await getSources(ctx.workspaceId);
    return NextResponse.json(sources);
  } catch (error) {
    console.error('GET /api/sources error:', error);
    return NextResponse.json(
      { error: { code: 'sources_fetch_failed', message: 'Could not load sources' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext(request, 'admin');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const json = await request.json();
    const parsed = createSourceSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'invalid_input',
            message: parsed.error.issues.map(i => i.message).join(', '),
          },
        },
        { status: 400 }
      );
    }

    const id = await createSource(ctx.workspaceId, parsed.data, ctx.role);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('POST /api/sources error:', error);
    return NextResponse.json(
      { error: { code: 'source_create_failed', message: 'Could not create source' } },
      { status: 500 }
    );
  }
}

