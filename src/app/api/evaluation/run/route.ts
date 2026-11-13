import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/server/apiHelper';
import { runEvaluation } from '@/server/eval/runner';
import { db } from '@/server/db/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const runEvalSchema = z.object({
  mode: z.enum(['deterministic', 'gemini']).default('deterministic'),
  asOfDate: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const ctx = await getRequestContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    let mode: 'deterministic' | 'gemini' = 'deterministic';
    let asOfDate: Date | undefined;

    try {
      const json = await request.json();
      const parsed = runEvalSchema.safeParse(json);
      if (parsed.success) {
        mode = parsed.data.mode;
        if (parsed.data.asOfDate) {
          asOfDate = new Date(parsed.data.asOfDate);
        }
      }
    } catch {
      // Body is optional
    }

    const summary = await runEvaluation(ctx.workspaceId, { mode, asOfDate });

    // Write audit log
    await db(
      `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'evaluation.run_completed', 'evaluation_run', $3, $4)`,
      [
        ctx.workspaceId,
        ctx.role,
        summary.id,
        JSON.stringify({
          mode: summary.mode,
          precision: summary.metrics.precision_display,
          recall: summary.metrics.recall_display,
          f1: summary.metrics.f1_display,
          accuracy: summary.metrics.accuracy_display,
        }),
      ]
    );

    return NextResponse.json(summary);
  } catch (error) {
    console.error('POST /api/evaluation/run error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'eval_failed',
          message: error instanceof Error ? error.message : 'Evaluation run failed',
        },
      },
      { status: 500 }
    );
  }
}

