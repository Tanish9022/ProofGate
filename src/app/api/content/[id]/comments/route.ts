import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestContext } from '@/server/apiHelper';
import { addComment, getComments } from '@/server/services/content';

export const dynamic = 'force-dynamic';

const createCommentSchema = z.object({
  versionId: z.string().uuid('Invalid versionId format'),
  body: z.string().trim().min(1, 'Comment cannot be empty').max(500, 'Comment cannot exceed 500 characters'),
  findingId: z.string().uuid().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const versionId = searchParams.get('versionId') || undefined;

  try {
    const comments = await getComments(ctx.workspaceId, id, versionId);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('GET /api/content/:id/comments error:', error);
    return NextResponse.json(
      { error: { code: 'get_comments_failed', message: error instanceof Error ? error.message : 'Failed to fetch comments' } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const json = await request.json();
    const parsed = createCommentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'invalid_comment_input',
            message: parsed.error.issues.map((i) => i.message).join(', '),
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const comment = await addComment(
      ctx.workspaceId,
      id,
      parsed.data.versionId,
      ctx.role,
      parsed.data.body,
      parsed.data.findingId
    );

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('POST /api/content/:id/comments error:', error);
    return NextResponse.json(
      { error: { code: 'add_comment_failed', message: error instanceof Error ? error.message : 'Failed to add comment' } },
      { status: 500 }
    );
  }
}
