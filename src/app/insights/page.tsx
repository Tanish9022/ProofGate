import { InsightsDashboard } from '@/components/insights/InsightsDashboard';

export const dynamic = 'force-dynamic';

export default function InsightsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-ink">Governance Insights</h1>
        <p className="text-sm text-ink-muted mt-1">
          Real-time metrics on rule enforcement, clearance velocity, and rule health. Rules with
          high dismissal rates are flagged for clarification.
        </p>
      </div>
      <InsightsDashboard />
    </main>
  );
}

