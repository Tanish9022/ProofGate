import fs from 'fs';
import path from 'path';
import { db } from '@/server/db/client';
import { runDeterministicChecks, SourceLookup } from '@/server/checker/checker';
import { extractClaims, extractClaimsFallback, ExtractedClaim } from '@/server/ai/gemini';

export interface GoldCase {
  id: string;
  text: string;
  fact_key?: string | null;
  context?: string;
  number?: number | null;
  unit?: string | null;
  gold_link_status?: 'confirmed' | 'probable' | null;
  should_reopen: boolean;
  category?: string;
  notes?: string;
}

export interface ReopenCase {
  id: string;
  description: string;
  should_reopen: boolean;
}

export interface CaseEvaluationResult {
  id: string;
  text: string;
  category: string;
  gold_should_reopen: boolean;
  observed_should_reopen: boolean;
  status: string;
  link_status: 'confirmed' | 'probable' | null;
  source_title: string | null;
  source_version: number | null;
  pass: boolean;
  explanation: string;
  notes?: string;
}

export interface EvaluationMetrics {
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  precision: number;
  precision_display: string;
  recall: number;
  recall_display: string;
  f1_score: number;
  f1_display: string;
  accuracy: number;
  accuracy_display: string;
}

export interface EvaluationRunSummary {
  id: string;
  workspace_id: string;
  mode: 'deterministic' | 'gemini';
  as_of_date: string;
  dataset: string;
  cases_count: number;
  passed_count: number;
  failed_count: number;
  metrics: EvaluationMetrics;
  results: CaseEvaluationResult[];
  created_at: string;
}

/**
 * Fixture sources for "Northstar Demo" evaluation fixture workspace
 */
export const NORTHSTAR_SOURCES: SourceLookup[] = [
  {
    id: 'sv-pro-price-1',
    source_id: 's-pro-price',
    kind: 'fact',
    key: 'pro_price',
    title: 'Pro plan price',
    version: 1,
    value: { number: 499, unit: 'INR_per_user_month', display: 'Rs. 499 per user per month' },
    status: 'current',
    effective_from: '2026-01-01',
  },
  {
    id: 'sv-trial-days-1',
    source_id: 's-trial-days',
    kind: 'fact',
    key: 'trial_days',
    title: 'Free trial length',
    version: 1,
    value: { number: 14, unit: 'days', display: '14-day free trial' },
    status: 'current',
    effective_from: '2026-01-01',
  },
  {
    id: 'sv-uptime-sla-1',
    source_id: 's-uptime-sla',
    kind: 'fact',
    key: 'uptime_sla',
    title: 'Uptime commitment',
    version: 1,
    value: { number: 99.9, unit: 'percent', display: '99.9% uptime' },
    status: 'current',
    effective_from: '2026-01-01',
  },
  {
    id: 'sv-festive-discount-1',
    source_id: 's-festive-discount',
    kind: 'fact',
    key: 'festive_discount',
    title: 'Festive annual-plan discount',
    version: 1,
    value: { number: 20, unit: 'percent', display: '20% off annual plans' },
    status: 'current',
    effective_from: '2026-10-01',
    valid_until: '2026-11-10',
  },
  {
    id: 'sv-annual-price-1',
    source_id: 's-annual-price',
    kind: 'fact',
    key: 'annual_price',
    title: 'Annual plan price',
    version: 1,
    value: { number: 5988, unit: 'INR_per_year', display: 'Rs. 5988 per year' },
    status: 'current',
    effective_from: '2026-01-01',
  },
  {
    id: 'sv-term-guarantee-1',
    source_id: 's-term-guarantee',
    kind: 'term',
    key: 'term_no_guarantee',
    title: 'No absolute guarantees',
    version: 1,
    value: {
      type: 'banned',
      pattern: 'guaranteed|100% uptime|always available',
      message: 'Avoid absolute guarantees and unprovable superlatives',
    },
    status: 'current',
  },
  {
    id: 'sv-term-spelling-1',
    source_id: 's-term-spelling',
    kind: 'term',
    key: 'term_spelling',
    title: 'Brand spelling',
    version: 1,
    value: {
      type: 'spelling',
      preferred: 'BrightDesk',
      wrong: ['Bright Desk'],
    },
    status: 'current',
  },
  {
    id: 'sv-guideline-tone-1',
    source_id: 's-guideline-tone',
    kind: 'guideline',
    key: 'guideline_tone',
    title: 'Tone and Voice',
    version: 1,
    value: { text: 'Friendly, professional. No hype.' },
    status: 'current',
  },
];

/**
 * Computes precision, recall, F1, accuracy with sample size annotations
 */
export function computeMetrics(
  tp: number,
  fp: number,
  fn: number,
  tn: number
): EvaluationMetrics {
  const total = tp + fp + fn + tn;
  const precisionDenom = tp + fp;
  const recallDenom = tp + fn;

  const precision = precisionDenom > 0 ? tp / precisionDenom : 1.0;
  const recall = recallDenom > 0 ? tp / recallDenom : 1.0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0.0;
  const accuracy = total > 0 ? (tp + tn) / total : 1.0;

  return {
    total_cases: total,
    passed_cases: tp + tn,
    failed_cases: fp + fn,
    true_positives: tp,
    false_positives: fp,
    true_negatives: tn,
    false_negatives: fn,
    precision,
    precision_display: `${(precision * 100).toFixed(1)}% (${tp}/${precisionDenom})`,
    recall,
    recall_display: `${(recall * 100).toFixed(1)}% (${tp}/${recallDenom})`,
    f1_score: f1,
    f1_display: `${f1.toFixed(2)} (N=${total})`,
    accuracy,
    accuracy_display: `${(accuracy * 100).toFixed(1)}% (${tp + tn}/${total})`,
  };
}

/**
 * Runs the gold set evaluation through the production checker pipeline
 */
export async function runEvaluation(
  workspaceId: string,
  options: {
    mode?: 'deterministic' | 'gemini';
    dataset?: 'detection' | 'reopen' | 'all';
    asOfDate?: Date;
  } = {}
): Promise<EvaluationRunSummary> {
  const mode = options.mode || 'deterministic';
  const asOfDate = options.asOfDate || new Date('2026-11-09'); // Default before festive expiry
  const dataset = options.dataset || 'detection';

  // 1. Load gold detection cases
  const goldPath = path.join(process.cwd(), 'tests', 'gold', 'detection.json');
  if (!fs.existsSync(goldPath)) {
    throw new Error('Gold cases file not found at tests/gold/detection.json');
  }
  const goldCases: GoldCase[] = JSON.parse(fs.readFileSync(goldPath, 'utf-8'));

  const allowedKeys: Record<string, string> = {};
  for (const s of NORTHSTAR_SOURCES) {
    if (s.kind === 'fact') {
      allowedKeys[s.key] = `${s.title}: ${s.value?.display || ''}`;
    }
  }

  const results: CaseEvaluationResult[] = [];
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  for (const tc of goldCases) {
    // Run extraction through production extraction pipeline
    let extractedClaims: ExtractedClaim[] = [];
    let injectionSuspected = false;

    if (mode === 'gemini') {
      const ext = await extractClaims(tc.text, allowedKeys);
      extractedClaims = ext.claims;
      injectionSuspected = ext.injectionSuspected;
    } else {
      const ext = extractClaimsFallback(tc.text, allowedKeys);
      extractedClaims = ext.claims;
      injectionSuspected = ext.injectionSuspected;
    }

    // Run deterministic checks through the production checker
    const findings = await runDeterministicChecks(
      tc.text,
      extractedClaims,
      NORTHSTAR_SOURCES,
      injectionSuspected,
      asOfDate
    );

    // Determine observed outcome for should_reopen:
    // A clearance dependency is created only when finding has link_status === 'confirmed' and status === 'supported' (or confirmed term match)
    // If any confirmed dependency exists, changing the source triggers revalidation -> observed_should_reopen = true.
    const hasConfirmedDependency = findings.some(
      f => f.link_status === 'confirmed' && (f.status === 'supported' || f.kind === 'term')
    );

    const observedShouldReopen = hasConfirmedDependency;
    const goldShouldReopen = tc.should_reopen;

    // Check pass/fail: does observed reopen match gold label?
    const pass = observedShouldReopen === goldShouldReopen;

    if (goldShouldReopen && observedShouldReopen) tp++;
    else if (!goldShouldReopen && observedShouldReopen) fp++;
    else if (goldShouldReopen && !observedShouldReopen) fn++;
    else tn++;

    const primaryFinding = findings[0] || null;
    const matchedSource = primaryFinding?.source_version_id
      ? NORTHSTAR_SOURCES.find(s => s.id === primaryFinding.source_version_id)
      : null;

    results.push({
      id: tc.id,
      text: tc.text,
      category: tc.category || 'general',
      gold_should_reopen: goldShouldReopen,
      observed_should_reopen: observedShouldReopen,
      status: primaryFinding?.status || 'supported',
      link_status: primaryFinding?.link_status || null,
      source_title: matchedSource?.title || null,
      source_version: matchedSource?.version || null,
      pass,
      explanation: primaryFinding?.explanation || 'No findings produced.',
      notes: tc.notes,
    });
  }

  const metrics = computeMetrics(tp, fp, fn, tn);

  // 2. Persist run to evaluation_runs table
  const runRows = await db<{ id: string; created_at: string }>(
    `INSERT INTO evaluation_runs (
       workspace_id, mode, as_of_date, dataset, cases_count, passed_count, failed_count, metrics, results
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, created_at`,
    [
      workspaceId,
      mode,
      asOfDate.toISOString(),
      dataset,
      results.length,
      metrics.passed_cases,
      metrics.failed_cases,
      JSON.stringify(metrics),
      JSON.stringify(results),
    ]
  );

  return {
    id: runRows[0].id,
    workspace_id: workspaceId,
    mode,
    as_of_date: asOfDate.toISOString(),
    dataset,
    cases_count: results.length,
    passed_count: metrics.passed_cases,
    failed_count: metrics.failed_cases,
    metrics,
    results,
    created_at: runRows[0].created_at,
  };
}

/**
 * Fetch all evaluation runs for a workspace
 */
export async function getEvaluationRuns(workspaceId: string): Promise<EvaluationRunSummary[]> {
  const rows = await db<EvaluationRunSummary>(
    `SELECT id, workspace_id, mode, as_of_date, dataset, cases_count, passed_count, failed_count, metrics, results, created_at
     FROM evaluation_runs
     WHERE workspace_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [workspaceId]
  );
  return rows;
}
