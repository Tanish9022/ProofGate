import { InsightsDashboard } from '@/components/insights/InsightsDashboard';
import { EvaluatorCallout } from '@/components/ui/EvaluatorCallout';

export const dynamic = 'force-dynamic';

export default function InsightsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-ink tracking-tight">Governance Insights</h1>
        <p className="text-sm text-ink-muted mt-1">
          Real-time operational metrics on rule enforcement, clearance velocity, and rule health. Rules with
          high dismissal rates are flagged for clarification.
        </p>
      </div>

      <EvaluatorCallout
        title="Governance Insights & Rule Clarification Engine"
        badge="Round 3 · Improvement 3"
        improvementNumber={3}
        metricBadge={{ label: 'Metrics Monitored', value: '6 Live Signals' }}
        summary="Translates content review patterns into organizational governance. ProofGate analyzes creator friction, flags ambiguous rules causing repeated dismissals or rejections, drafts clear replacement text, and simulates what-if impact before admin approval."
        steps={[
          {
            step: 1,
            title: 'Audit 6 Operational Metrics',
            instruction: 'Examine Clearance Velocity (median hours), First-Pass Compliance, and Dismissal Rate cards below.',
          },
          {
            step: 2,
            title: 'Detect Unclear Rules',
            instruction: 'Scroll to the Unclear Rule Detector. Notice rules with >= 40% creator dismissal rates flagged for ambiguity.',
          },
          {
            step: 3,
            title: 'Draft Clarification & What-If',
            instruction: 'Click "Draft Clarification" on a flagged rule to generate concise guidance text, run what-if simulation, and approve as Admin.',
          },
        ]}
        keyInvariant="Governance changes are transparent: AI proposes improved rule phrasing, deterministic simulation measures past impact, and admins make the final decision to supersede."
      />

      <InsightsDashboard />
    </main>
  );
}
