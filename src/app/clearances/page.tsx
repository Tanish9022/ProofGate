'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Seal } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldCheck, ArrowRight, RefreshCw, FileText } from 'lucide-react';
import type { ClearanceSummary } from '@/server/services/clearance';

export default function ClearancesListPage() {
  const [clearances, setClearances] = useState<ClearanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClearances = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clearances');
      if (res.ok) {
        const data = await res.json() as ClearanceSummary[];
        setClearances(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClearances();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-line-soft pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
            Official Clearances
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Permanent records of human-approved content and their locked source version dependencies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchClearances}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Link href="/review">
            <Button size="sm">
              Review Queue
            </Button>
          </Link>
        </div>
      </div>

      {loading && clearances.length === 0 ? (
        <div className="rounded-xl border border-line-soft bg-paper p-12 text-center text-sm text-ink-muted">
          Loading clearances…
        </div>
      ) : clearances.length === 0 ? (
        <EmptyState
          title="No clearances issued yet."
          description="When a reviewer approves content in the review queue, its official clearance record and locked source dependencies will appear here."
          action={
            <Link href="/review">
              <Button>Go to Review Queue</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line-soft bg-paper shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-ink/[0.02] text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Content Title</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Version</th>
                  <th scope="col" className="px-4 py-3.5">State</th>
                  <th scope="col" className="px-4 py-3.5">Approved Dependencies</th>
                  <th scope="col" className="px-4 py-3.5">Reviewer</th>
                  <th scope="col" className="px-4 py-3.5">Decision Date</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft/80">
                {clearances.map(c => (
                  <tr key={c.id} className="hover:bg-ink/[0.02] transition-colors">
                    <td className="px-5 py-4 font-medium text-ink">
                      <Link
                        href={`/clearances/${c.id}`}
                        className="hover:text-indigo hover:underline flex items-center gap-2"
                      >
                        <ShieldCheck className="h-4 w-4 text-verdigris shrink-0" />
                        <span>{c.content_title}</span>
                      </Link>
                    </td>

                    <td className="px-3 py-4 text-center font-mono text-xs font-semibold text-ink">
                      v{c.version}
                    </td>

                    <td className="px-4 py-4">
                      <Seal state={c.state} />
                    </td>

                    <td className="px-4 py-4 font-mono text-xs text-ink-muted">
                      {c.dependency_count} source version{c.dependency_count === 1 ? '' : 's'}
                    </td>

                    <td className="px-4 py-4 text-xs text-ink-muted">
                      {c.reviewer}
                    </td>

                    <td className="px-4 py-4 text-xs text-ink-muted">
                      {new Date(c.decided_at).toLocaleString()}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Link href={`/clearances/${c.id}`}>
                        <Button size="sm" variant="secondary">
                          View Certificate
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

