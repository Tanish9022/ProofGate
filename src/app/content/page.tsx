'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Seal } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, ArrowRight, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import type { ContentSummary } from '@/server/services/content';

export default function ContentListPage() {
  const [contents, setContents] = useState<ContentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/content');
      if (!res.ok) throw new Error('Could not load content list');
      const data = await res.json() as ContentSummary[];
      setContents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-line-soft pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
            Content
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Track submitted marketing campaigns, posters, and blog posts against approved guidelines and facts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchContents}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Link href="/content/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Check new content
            </Button>
          </Link>
        </div>
      </div>

      {/* Main List */}
      {loading && contents.length === 0 ? (
        <div className="rounded-xl border border-line-soft bg-paper p-12 text-center text-sm text-ink-muted">
          Loading content pieces…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-pen/20 bg-red-pen-light/50 p-8 text-center">
          <p className="text-sm font-semibold text-red-pen mb-2">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchContents}>
            Try again
          </Button>
        </div>
      ) : contents.length === 0 ? (
        <EmptyState
          title="No content submitted yet."
          description="Check copy or upload an asset to run automatic checks against your approved sources."
          action={
            <Link href="/content/new">
              <Button>Check new content</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line-soft bg-paper shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-ink/[0.02] text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Title</th>
                  <th scope="col" className="px-4 py-3.5">Latest Version</th>
                  <th scope="col" className="px-4 py-3.5">State</th>
                  <th scope="col" className="px-4 py-3.5">Issues</th>
                  <th scope="col" className="px-4 py-3.5">Created By</th>
                  <th scope="col" className="px-4 py-3.5">Last Updated</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft/80">
                {contents.map(c => {
                  const latest = c.latestVersion;
                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-ink/[0.02]"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/content/${c.id}`}
                          className="font-medium text-ink hover:text-indigo hover:underline flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4 text-ink-muted shrink-0" />
                          <span>{c.title}</span>
                        </Link>
                      </td>

                      <td className="px-4 py-4 font-mono text-xs text-ink">
                        v{latest.version}
                        {latest.file_name && (
                          <span className="text-[11px] text-ink-muted ml-1.5 truncate max-w-[120px] inline-block">
                            ({latest.file_name})
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <Seal state={latest.state as any} />
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-xs">
                          {latest.blockerCount > 0 ? (
                            <span className="font-semibold text-red-pen">
                              {latest.blockerCount} blocker{latest.blockerCount > 1 ? 's' : ''}
                            </span>
                          ) : latest.warningCount > 0 ? (
                            <span className="font-semibold text-amber">
                              {latest.warningCount} warning{latest.warningCount > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="font-semibold text-verdigris">Clean</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs text-ink-muted">
                        {c.created_by}
                      </td>

                      <td className="px-4 py-4 text-xs text-ink-muted">
                        {new Date(latest.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link href={`/content/${c.id}`}>
                          <Button size="sm" variant="secondary">
                            Inspect
                            <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
