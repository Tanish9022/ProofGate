import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { createContent, listContents } from '@/server/services/content';
import { extractText } from '@/server/services/extract';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const contents = await listContents(ctx.workspaceId);
    return NextResponse.json(contents);
  } catch (error) {
    console.error('GET /api/content error:', error);
    return NextResponse.json(
      { error: { code: 'fetch_failed', message: 'Could not load content list' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext(request, 'creator');
  if (ctx instanceof NextResponse) return ctx;

  try {
    const contentType = request.headers.get('content-type') || '';

    let title = '';
    let text = '';
    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileHash: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = (formData.get('title') as string) || '';
      const file = formData.get('file') as File | null;
      const textParam = formData.get('text') as string | null;

      if (file && file.size > 0) {
        fileName = file.name;
        fileType = file.type;
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const extracted = await extractText(buffer, file.name, file.type);
        text = extracted.text;
        fileHash = extracted.hash;
        if (!title.trim()) title = file.name.replace(/\.[^.]+$/, '');
      } else if (textParam) {
        text = textParam.trim();
      }
    } else {
      const json = await request.json();
      title = json.title || '';
      text = json.text || '';
    }

    if (!title.trim()) {
      return NextResponse.json(
        { error: { code: 'missing_title', message: 'A content title is required.' } },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: { code: 'missing_text', message: 'Content text or an uploaded file is required.' } },
        { status: 400 }
      );
    }

    const { contentId, versionId } = await createContent(
      ctx.workspaceId,
      { title: title.trim(), text: text.trim(), fileName, fileType, fileHash },
      ctx.role
    );

    return NextResponse.json({ contentId, versionId }, { status: 201 });
  } catch (error) {
    console.error('POST /api/content error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'content_creation_failed',
          message: error instanceof Error ? error.message : 'Could not create content',
        },
      },
      { status: 500 }
    );
  }
}

