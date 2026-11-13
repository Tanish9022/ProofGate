import { describe, it, expect } from 'vitest';
import { computeMetrics, runEvaluation, NORTHSTAR_SOURCES } from '@/server/eval/runner';

describe('Improvement 1 - Gold Evaluation Runner & Metrics', () => {
  it('computes exact precision, recall, F1, and accuracy with sample sizes', () => {
    // 14 TP, 0 FP, 0 FN, 26 TN -> 40 total
    const metrics = computeMetrics(14, 0, 0, 26);

    expect(metrics.total_cases).toBe(40);
    expect(metrics.passed_cases).toBe(40);
    expect(metrics.failed_cases).toBe(0);
    expect(metrics.precision).toBe(1.0);
    expect(metrics.precision_display).toBe('100.0% (14/14)');
    expect(metrics.recall).toBe(1.0);
    expect(metrics.recall_display).toBe('100.0% (14/14)');
    expect(metrics.f1_score).toBe(1.0);
    expect(metrics.f1_display).toBe('1.00 (N=40)');
    expect(metrics.accuracy).toBe(1.0);
    expect(metrics.accuracy_display).toBe('100.0% (40/40)');
  });

  it('accurately reports lower precision and recall when errors occur', () => {
    // 10 TP, 2 FP, 4 FN, 24 TN -> 40 total
    // Precision: 10 / (10 + 2) = 83.3%
    // Recall: 10 / (10 + 4) = 71.4%
    const metrics = computeMetrics(10, 2, 4, 24);

    expect(metrics.precision).toBeCloseTo(0.833, 2);
    expect(metrics.precision_display).toBe('83.3% (10/12)');
    expect(metrics.recall).toBeCloseTo(0.714, 2);
    expect(metrics.recall_display).toBe('71.4% (10/14)');
    expect(metrics.accuracy_display).toBe('85.0% (34/40)');
  });

  it('verifies fixture sources contain all required Northstar demo sources', () => {
    const keys = NORTHSTAR_SOURCES.map(s => s.key);
    expect(keys).toContain('pro_price');
    expect(keys).toContain('trial_days');
    expect(keys).toContain('uptime_sla');
    expect(keys).toContain('festive_discount');
    expect(keys).toContain('annual_price');
    expect(keys).toContain('term_no_guarantee');
    expect(keys).toContain('term_spelling');
    expect(keys).toContain('guideline_tone');
  });

  it('runs genuine gold detection cases through production pipeline and measures real performance', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { extractClaimsFallback } = await import('@/server/ai/gemini');
    const { runDeterministicChecks } = await import('@/server/checker/checker');

    const goldPath = path.join(process.cwd(), 'tests', 'gold', 'detection.json');
    const cases = JSON.parse(fs.readFileSync(goldPath, 'utf8'));

    const allowedKeys: Record<string, string> = {};
    for (const s of NORTHSTAR_SOURCES) {
      if (s.kind === 'fact') {
        allowedKeys[s.key] = `${s.title}: ${s.value?.display || ''}`;
      }
    }

    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;

    for (const tc of cases) {
      const ext = extractClaimsFallback(tc.text, allowedKeys);
      const findings = await runDeterministicChecks(
        tc.text,
        ext.claims,
        NORTHSTAR_SOURCES,
        ext.injectionSuspected,
        new Date('2026-11-09')
      );

      const hasDep = findings.some(
        f => f.link_status === 'confirmed' && (f.status === 'supported' || f.kind === 'term')
      );

      if (tc.should_reopen && hasDep) tp++;
      else if (!tc.should_reopen && hasDep) fp++;
      else if (tc.should_reopen && !hasDep) fn++;
      else tn++;
    }

    const metrics = computeMetrics(tp, fp, fn, tn);

    // Measured metrics on the 40 detection gold cases:
    expect(metrics.total_cases).toBe(40);
    expect(metrics.passed_cases).toBe(40); // 40/40 passed (100% accuracy)
    expect(metrics.true_positives).toBe(16);
    expect(metrics.false_positives).toBe(0);
    expect(metrics.false_negatives).toBe(0); // 100% recall
    expect(metrics.true_negatives).toBe(24);
    expect(metrics.precision).toBe(1.0); // 100.0% (16/16)
    expect(metrics.recall).toBe(1.0); // 100.0% (16/16)
    expect(metrics.f1_score).toBe(1.0);
  });
});

