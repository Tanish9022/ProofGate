'use client';

import { useEffect, useState } from 'react';

interface InsightsMetrics {
  totalCleared: number;
  totalPending: number;
  topViolatedRules: Array<{ sourceVersionId: string; title: string; count: number }>;
  dismissalRates: Array<{
    sourceVersionId: string;
    title: string;
    total: number;
    dismissed: number;
    rate: number;
  }>;
  topRevalidationSources: Array<{ sourceVersionId: string; title: string; revalCount: number }>;
  medianClearanceHours: number | null;
  severityBreakdown: { blocker: number; warning: number; info: number };
  computedAt: string;
}

interface UnclearRule {
  sourceVersionId: string;
  title: string;
  total: number;
  dismissed: number;
  dismissalRate: number;
  ruleText: string | null;
}

interface ClarificationResult {
  draftText: string;
  whatIfCount: number;
  aiAvailable: boolean;
  sourceVersionId: string;
}

function MetricCard({
  label,
  value,
  sub,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  sub?: string;
  variant?: 'default' | 'accent' | 'danger';
}) {
  const valueClass =
    variant === 'accent'
      ? 'text-accent'
      : variant === 'danger'
        ? 'text-red-600'
        : 'text-ink';

  return (
    <div className="border border-paper-line rounded-lg p-4 bg-paper-warm">
      <p className="text-xs text-ink-muted font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold font-mono mt-1 ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-ink-muted mt-1">{sub}</p>}
    </div>
  );
}

export function InsightsDashboard() {
  const [metrics, setMetrics] = useState<InsightsMetrics | null>(null);
  const [unclearRules, setUnclearRules] = useState<UnclearRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clarifying, setClarifying] = useState<string | null>(null);
  const [clarifications, setClarifications] = useState<Record<string, ClarificationResult>>({});
  const [clarifyError, setClarifyError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const [metricsRes, unclearRes] = await Promise.all([
          fetch('/api/insights'),
          fetch('/api/insights/unclear-rules'),
        ]);
        if (!metricsRes.ok || !unclearRes.ok) throw new Error('Failed to load insights');
        const m = (await metricsRes.json()) as InsightsMetrics;
        const u = (await unclearRes.json()) as { rules: UnclearRule[] };
        setMetrics(m);
        setUnclearRules(u.rules);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  async function handleClarify(rule: UnclearRule) {
    if (!rule.ruleText) return;
    setClarifying(rule.sourceVersionId);
    setClarifyError(null);
    try {
      const res = await fetch('/api/insights/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-role': 'admin' },
        body: JSON.stringify({
          sourceVersionId: rule.sourceVersionId,
          currentRuleText: rule.ruleText,
        }),
      });
      if (!res.ok) {
        const e = (await res.json()) as { error?: string };
        setClarifyError(e.error ?? 'Clarification failed');
      } else {
        const data = (await res.json()) as ClarificationResult;
        setClarifications((prev) => ({ ...prev, [rule.sourceVersionId]: data }));
      }
    } catch {
      setClarifyError('Network error — please try again.');
    } finally {
      setClarifying(null);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-ink-muted animate-pulse" aria-live="polite">
        Loading metrics…
      </p>
    );
  }
  if (error) {
    return (
      <div
        className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-4 py-3"
        role="alert"
      >
        {error}
      </div>
    );
  }
  if (!metrics) return null;

  const totalFindings =
    metrics.severityBreakdown.blocker +
    metrics.severityBreakdown.warning +
    metrics.severityBreakdown.info;

  return (
    <div className="space-y-10">
      {/* 6 Metric cards */}
      <section aria-labelledby="metrics-heading">
        <h2
          id="metrics-heading"
          className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3"
        >
          Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Versions Cleared" value={metrics.totalCleared} variant="accent" />
          <MetricCard label="Versions Pending" value={metrics.totalPending} />
          <MetricCard
            label="Median Clearance Time"
            value={
              metrics.medianClearanceHours != null
                ? `${metrics.medianClearanceHours.toFixed(1)}h`
                : 'N/A'
            }
            sub="Submission to approval"
          />
          <MetricCard
            label="Blockers"
            value={metrics.severityBreakdown.blocker}
            variant="danger"
          />
          <MetricCard label="Warnings" value={metrics.severityBreakdown.warning} />
          <MetricCard
            label="Total Findings"
            value={totalFindings}
            sub={`Info: ${metrics.severityBreakdown.info}`}
          />
        </div>
      </section>

      {/* Top Violated Rules */}
      <section aria-labelledby="top-rules-heading">
        <h2
          id="top-rules-heading"
          className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3"
        >
          Most Violated Rules
        </h2>
        {metrics.topViolatedRules.length === 0 ? (
          <p className="text-sm text-ink-muted">No findings linked to rules yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {metrics.topViolatedRules.map((r) => (
              <li
                key={r.sourceVersionId}
                className="flex items-center justify-between border border-paper-line rounded px-3 py-2 text-sm"
              >
                <span className="text-ink font-medium truncate">{r.title}</span>
                <span className="font-mono text-ink-muted ml-4 shrink-0">
                  {r.count} finding{r.count !== 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Dismissal Rates */}
      <section aria-labelledby="dismissal-heading">
        <h2
          id="dismissal-heading"
          className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1"
        >
          Dismissal Rates
        </h2>
        <p className="text-xs text-ink-muted mb-3">
          Rules with ≥ 3 findings, ranked by dismissal rate. High rates may indicate ambiguous
          rules.
        </p>
        {metrics.dismissalRates.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Not enough findings yet — need ≥ 3 per rule to compute dismissal rates.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {metrics.dismissalRates.map((r) => (
              <li
                key={r.sourceVersionId}
                className="flex items-center justify-between border border-paper-line rounded px-3 py-2 text-sm"
              >
                <div>
                  <span className="text-ink font-medium">{r.title}</span>
                  <span className="ml-2 text-ink-muted text-xs">
                    {r.dismissed}/{r.total} dismissed
                  </span>
                </div>
                <span
                  className={`font-mono font-bold ml-4 shrink-0 ${
                    r.rate >= 0.4 ? 'text-red-600' : 'text-ink-muted'
                  }`}
                >
                  {(r.rate * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Top Revalidation Sources */}
      {metrics.topRevalidationSources.length > 0 && (
        <section aria-labelledby="reval-heading">
          <h2
            id="reval-heading"
            className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3"
          >
            Sources Causing Most Revalidations
          </h2>
          <ul className="space-y-1.5">
            {metrics.topRevalidationSources.map((r) => (
              <li
                key={r.sourceVersionId}
                className="flex items-center justify-between border border-paper-line rounded px-3 py-2 text-sm"
              >
                <span className="text-ink font-medium truncate">{r.title}</span>
                <span className="font-mono text-accent ml-4 shrink-0">
                  {r.revalCount} revalidation{r.revalCount !== 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Unclear Rules with Clarification */}
      <section aria-labelledby="unclear-heading">
        <h2
          id="unclear-heading"
          className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1"
        >
          Unclear Rules
        </h2>
        <p className="text-xs text-ink-muted mb-3">
          Rules with ≥ 3 findings and ≥ 40% dismissal rate. Admins can request an AI-drafted
          clarification. Applying the clarification requires creating a new source version in the
          Source Library.
        </p>

        {unclearRules.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No unclear rules detected.{' '}
            {metrics.dismissalRates.length === 0 &&
              'Needs at least 3 findings per rule to compute dismissal rates.'}
          </p>
        ) : (
          <ul className="space-y-4">
            {unclearRules.map((rule) => {
              const clarification = clarifications[rule.sourceVersionId];
              return (
                <li
                  key={rule.sourceVersionId}
                  className="border border-amber-200 bg-amber-50/50 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-medium text-ink">{rule.title}</span>
                      <span className="ml-2 text-xs font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        {(rule.dismissalRate * 100).toFixed(0)}% dismissed
                      </span>
                      <span className="ml-1 text-xs text-ink-muted">
                        ({rule.dismissed}/{rule.total})
                      </span>
                    </div>
                    {rule.ruleText && !clarification && (
                      <button
                        onClick={() => handleClarify(rule)}
                        disabled={clarifying === rule.sourceVersionId}
                        className="shrink-0 text-xs font-medium px-3 py-1.5 rounded bg-ink text-white hover:bg-ink/90 disabled:opacity-50 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label={`Request AI clarification for ${rule.title}`}
                      >
                        {clarifying === rule.sourceVersionId ? 'Drafting…' : 'Draft Clarification'}
                      </button>
                    )}
                  </div>

                  {rule.ruleText && (
                    <p className="mt-2 text-xs text-ink-muted border-l-2 border-amber-300 pl-2">
                      {rule.ruleText}
                    </p>
                  )}

                  {clarification && (
                    <div className="mt-3 border border-paper-line rounded bg-paper p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink">
                          AI-drafted clarification
                        </span>
                        {!clarification.aiAvailable && (
                          <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            AI unavailable
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ink whitespace-pre-wrap">
                        {clarification.draftText}
                      </p>
                      <p className="text-xs text-ink-muted border-t border-paper-line pt-2">
                        <strong>What-if:</strong> {clarification.whatIfCount} existing finding
                        {clarification.whatIfCount !== 1 ? 's' : ''} reference this rule version.
                        Apply this clarification as a new source version via the Source Library to
                        take effect going forward.
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {clarifyError && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {clarifyError}
          </p>
        )}
      </section>

      <p className="text-xs text-ink-muted text-right">
        Metrics computed at {new Date(metrics.computedAt).toLocaleString()}
      </p>
    </div>
  );
}

