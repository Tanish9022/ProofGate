import { db } from '@/server/db/client';

export interface InsightsMetrics {
  /** Metric 1: total content versions cleared vs pending */
  totalCleared: number;
  totalPending: number;
  /** Metric 2: top 5 most violated rules by finding count */
  topViolatedRules: Array<{ sourceVersionId: string; title: string; count: number }>;
  /** Metric 3: dismissal rate per rule (rules with >= 3 findings) */
  dismissalRates: Array<{
    sourceVersionId: string;
    title: string;
    total: number;
    dismissed: number;
    rate: number;
  }>;
  /** Metric 4: sources causing most revalidations */
  topRevalidationSources: Array<{ sourceVersionId: string; title: string; revalCount: number }>;
  /** Metric 5: median clearance time in hours (null if no approved clearances) */
  medianClearanceHours: number | null;
  /** Metric 6: finding severity breakdown */
  severityBreakdown: { blocker: number; warning: number; info: number };
  computedAt: string;
}

export async function getInsightsMetrics(workspaceId: string): Promise<InsightsMetrics> {
  // Metric 1: cleared vs pending
  const stateRows = await db<{ state: string; count: string }>(
    `SELECT cv.state, COUNT(*)::text as count
     FROM content_versions cv
     WHERE cv.workspace_id = $1
     GROUP BY cv.state`,
    [workspaceId]
  );
  let totalCleared = 0;
  let totalPending = 0;
  for (const row of stateRows) {
    if (row.state === 'cleared') totalCleared += parseInt(row.count, 10);
    else totalPending += parseInt(row.count, 10);
  }

  // Metric 2: most violated rules
  const topViolated = await db<{ source_version_id: string; title: string; count: string }>(
    `SELECT f.source_version_id, s.title, COUNT(*)::text as count
     FROM findings f
     JOIN source_versions sv ON sv.id = f.source_version_id
     JOIN sources s ON s.id = sv.source_id
     WHERE f.workspace_id = $1 AND f.source_version_id IS NOT NULL
     GROUP BY f.source_version_id, s.title
     ORDER BY count DESC
     LIMIT 5`,
    [workspaceId]
  );

  // Metric 3: dismissal rates (rules with >= 3 findings)
  const dismissalRows = await db<{
    source_version_id: string;
    title: string;
    total: string;
    dismissed: string;
  }>(
    `SELECT
       f.source_version_id,
       s.title,
       COUNT(*)::text as total,
       COUNT(*) FILTER (WHERE f.creator_action = 'dismissed')::text as dismissed
     FROM findings f
     JOIN source_versions sv ON sv.id = f.source_version_id
     JOIN sources s ON s.id = sv.source_id
     WHERE f.workspace_id = $1 AND f.source_version_id IS NOT NULL
     GROUP BY f.source_version_id, s.title
     HAVING COUNT(*) >= 3
     ORDER BY
       (COUNT(*) FILTER (WHERE f.creator_action = 'dismissed'))::float / COUNT(*) DESC`,
    [workspaceId]
  );

  const dismissalRates = dismissalRows.map((r) => ({
    sourceVersionId: r.source_version_id,
    title: r.title,
    total: parseInt(r.total, 10),
    dismissed: parseInt(r.dismissed, 10),
    rate: parseInt(r.dismissed, 10) / parseInt(r.total, 10),
  }));

  // Metric 4: sources causing most revalidations
  const revalRows = await db<{ source_version_id: string; title: string; count: string }>(
    `SELECT ri.trigger_source_version_id as source_version_id, s.title, COUNT(*)::text as count
     FROM revalidation_items ri
     JOIN source_versions sv ON sv.id = ri.trigger_source_version_id
     JOIN sources s ON s.id = sv.source_id
     WHERE ri.workspace_id = $1
     GROUP BY ri.trigger_source_version_id, s.title
     ORDER BY count DESC
     LIMIT 5`,
    [workspaceId]
  );

  // Metric 5: median clearance time in hours
  const medianRows = await db<{ median_hours: string | null }>(
    `SELECT (EXTRACT(EPOCH FROM
       PERCENTILE_CONT(0.5) WITHIN GROUP (
         ORDER BY cl.decided_at - cv.created_at
       )
     ) / 3600)::text as median_hours
     FROM clearances cl
     JOIN content_versions cv ON cv.id = cl.content_version_id
     WHERE cl.workspace_id = $1 AND cl.decision = 'approved'`,
    [workspaceId]
  );
  const medianClearanceHours =
    medianRows[0]?.median_hours != null ? parseFloat(medianRows[0].median_hours) : null;

  // Metric 6: severity breakdown
  const severityRows = await db<{ severity: string; count: string }>(
    `SELECT severity, COUNT(*)::text as count
     FROM findings
     WHERE workspace_id = $1
     GROUP BY severity`,
    [workspaceId]
  );
  const severityBreakdown = { blocker: 0, warning: 0, info: 0 };
  for (const row of severityRows) {
    if (row.severity === 'blocker') severityBreakdown.blocker = parseInt(row.count, 10);
    else if (row.severity === 'warning') severityBreakdown.warning = parseInt(row.count, 10);
    else if (row.severity === 'info') severityBreakdown.info = parseInt(row.count, 10);
  }

  return {
    totalCleared,
    totalPending,
    topViolatedRules: topViolated.map((r) => ({
      sourceVersionId: r.source_version_id,
      title: r.title,
      count: parseInt(r.count, 10),
    })),
    dismissalRates,
    topRevalidationSources: revalRows.map((r) => ({
      sourceVersionId: r.source_version_id,
      title: r.title,
      revalCount: parseInt(r.count, 10),
    })),
    medianClearanceHours,
    severityBreakdown,
    computedAt: new Date().toISOString(),
  };
}

export interface UnclearRule {
  sourceVersionId: string;
  title: string;
  total: number;
  dismissed: number;
  dismissalRate: number;
  ruleText: string | null;
}

/**
 * Detect unclear rules: source versions with >= 3 findings AND >= 40% dismissal rate.
 * These are candidates for clarification — high dismissal suggests the rule is ambiguous.
 */
export async function getUnclearRules(workspaceId: string): Promise<UnclearRule[]> {
  const rows = await db<{
    source_version_id: string;
    title: string;
    total: string;
    dismissed: string;
    value: Record<string, unknown>;
  }>(
    `SELECT
       f.source_version_id,
       s.title,
       COUNT(*)::text as total,
       COUNT(*) FILTER (WHERE f.creator_action = 'dismissed')::text as dismissed,
       sv.value
     FROM findings f
     JOIN source_versions sv ON sv.id = f.source_version_id
     JOIN sources s ON s.id = sv.source_id
     WHERE f.workspace_id = $1 AND f.source_version_id IS NOT NULL
     GROUP BY f.source_version_id, s.title, sv.value
     HAVING COUNT(*) >= 3
       AND (COUNT(*) FILTER (WHERE f.creator_action = 'dismissed'))::float / COUNT(*) >= 0.4`,
    [workspaceId]
  );

  return rows.map((r) => ({
    sourceVersionId: r.source_version_id,
    title: r.title,
    total: parseInt(r.total, 10),
    dismissed: parseInt(r.dismissed, 10),
    dismissalRate: parseInt(r.dismissed, 10) / parseInt(r.total, 10),
    // Extract rule text from value JSON (supports 'rule', 'description', 'text', 'pattern' keys)
    ruleText:
      typeof r.value?.rule === 'string'
        ? r.value.rule
        : typeof r.value?.description === 'string'
          ? r.value.description
          : typeof r.value?.text === 'string'
            ? r.value.text
            : typeof r.value?.pattern === 'string'
              ? r.value.pattern
              : null,
  }));
}

export interface ClarificationResult {
  draftText: string;
  whatIfCount: number;
  aiAvailable: boolean;
  sourceVersionId: string;
}

/**
 * Draft a Gemini-proposed clarification for a flagged rule.
 * Code computes the what-if impact (number of existing findings affected).
 * Admin must apply the clarification as a new source version via the existing versioning flow.
 */
export async function draftClarification(
  workspaceId: string,
  sourceVersionId: string,
  currentRuleText: string
): Promise<ClarificationResult> {
  let draftText = '';
  let aiAvailable = false;

  // 1. Try Gemini to draft revised rule text
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genai = new GoogleGenerativeAI(apiKey);
      const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are a compliance policy editor. The following rule has been frequently dismissed (marked as inapplicable) by content creators, suggesting it may be unclear or too broad.

Current rule text:
"${currentRuleText}"

Draft a clearer, more specific version of this rule that:
1. Keeps the same intent and compliance requirement
2. Is more precise about when it applies vs. when it does not
3. Gives one concrete example of a violation and one concrete example of an acceptable exception
4. Is under 200 words

Respond with ONLY the revised rule text — no explanations, no preamble.`;

      const timer = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timed out')), 25000)
      );

      const result = await Promise.race([model.generateContent(prompt), timer]);
      draftText = result.response.text().trim();
      aiAvailable = true;
    } catch (err) {
      console.warn('Gemini clarification failed:', err);
      draftText = 'AI unavailable — please draft the clarification manually.';
    }
  } else {
    draftText = 'AI unavailable — please draft the clarification manually.';
  }

  // 2. What-if: how many existing findings reference this source version
  const countRows = await db<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM findings
     WHERE workspace_id = $1 AND source_version_id = $2`,
    [workspaceId, sourceVersionId]
  );
  const whatIfCount = parseInt(countRows[0]?.count ?? '0', 10);

  // 3. Audit log
  await db(
    `INSERT INTO audit_log (workspace_id, actor_role, action, entity_type, entity_id, details)
     VALUES ($1, 'admin', 'rule.clarification_drafted', 'source_version', $2, $3)`,
    [workspaceId, sourceVersionId, JSON.stringify({ aiAvailable, whatIfCount })]
  );

  return { draftText, whatIfCount, aiAvailable, sourceVersionId };
}

