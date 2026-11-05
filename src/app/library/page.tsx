'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/components/ui/RoleSwitcher';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SourceStatusChip } from '@/components/ui/StatusChip';
import { SourceDrawer } from '@/components/library/SourceDrawer';
import { AddSourceModal } from '@/components/library/AddSourceModal';
import { Plus, Search, Layers, RefreshCw } from 'lucide-react';
import type { SourceSummary, SourceKind } from '@/server/services/sources';

export default function LibraryPage() {
  const { role } = useRole();
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | SourceKind>('all');

  // Drawer & Modal state
  const [selectedSource, setSelectedSource] = useState<SourceSummary | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sources', {
        headers: { 'x-role': role },
      });
      if (!res.ok) {
        throw new Error('Could not load sources from server');
      }
      const data = await res.json() as SourceSummary[];
      setSources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const filteredSources = useMemo(() => {
    return sources.filter(s => {
      const matchesKind = kindFilter === 'all' || s.kind === kindFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q) ||
        s.owner.toLowerCase().includes(q);
      return matchesKind && matchesSearch;
    });
  }, [sources, kindFilter, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-line-soft pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
              Source Library
            </h1>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-indigo-light text-indigo border border-indigo/20 font-medium">
              {sources.length} approved sources
            </span>
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            The single source of truth for facts, terms, and guidelines. Every approval locks to an exact version.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchSources}
            title="Refresh sources"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {role === 'admin' ? (
            <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Source
            </Button>
          ) : (
            <span
              className="text-xs text-ink-muted italic hidden md:inline"
              title="Switch to Admin role to add or supersede sources"
            >
              (Switch to Admin to add or edit sources)
            </span>
          )}
        </div>
      </div>

      {/* Controls Bar: Search & Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by title, key, or owner…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-line-strong bg-paper pl-9 pr-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-indigo"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'fact', 'term', 'guideline'] as const).map(k => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={[
                'rounded px-3 py-1 text-xs font-medium transition-colors capitalize',
                kindFilter === k
                  ? 'bg-ink text-paper'
                  : 'bg-paper text-ink-muted border border-line-strong hover:bg-ink/[0.04] hover:text-ink',
              ].join(' ')}
            >
              {k === 'all' ? 'All kinds' : `${k}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading && sources.length === 0 ? (
        <div className="rounded-xl border border-line-soft bg-paper p-12 text-center text-sm text-ink-muted">
          Loading approved sources…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-pen/20 bg-red-pen-light/50 p-8 text-center">
          <p className="text-sm font-semibold text-red-pen mb-2">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchSources}>
            Try again
          </Button>
        </div>
      ) : filteredSources.length === 0 ? (
        <EmptyState
          title={search ? 'No matching sources found' : 'No sources in this workspace'}
          description={
            search
              ? 'Try broadening your search or resetting filters.'
              : 'Add your first approved fact, term, or guideline.'
          }
          action={
            search ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setKindFilter('all');
                }}
              >
                Clear filters
              </Button>
            ) : role === 'admin' ? (
              <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add the first source
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line-soft bg-paper shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line-soft bg-ink/[0.02] text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Source & Key</th>
                  <th scope="col" className="px-4 py-3.5">Kind</th>
                  <th scope="col" className="px-4 py-3.5">Approved Value</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Version</th>
                  <th scope="col" className="px-3 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5">Valid Until</th>
                  <th scope="col" className="px-4 py-3.5">Owner</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Used By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft/80">
                {filteredSources.map(s => {
                  const curr = s.current;
                  const valDisplay = curr?.value?.display
                    ? String(curr.value.display)
                    : curr?.value?.text
                    ? String(curr.value.text)
                    : curr?.value?.pattern
                    ? `Pattern: ${curr.value.pattern}`
                    : JSON.stringify(curr?.value || {});

                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSource(s)}
                      className="cursor-pointer transition-colors hover:bg-ink/[0.03] group"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-ink group-hover:text-indigo transition-colors">
                          {s.title}
                        </div>
                        <div className="font-mono text-xs text-ink-muted">
                          {s.key}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-ink/[0.05] text-ink-muted font-medium">
                          {s.kind}
                        </span>
                      </td>

                      <td className="px-4 py-4 max-w-xs truncate font-mono text-xs text-ink">
                        {valDisplay}
                      </td>

                      <td className="px-3 py-4 text-center font-mono font-semibold text-xs text-ink">
                        v{curr?.version ?? 1}
                      </td>

                      <td className="px-3 py-4">
                        {curr ? (
                          <SourceStatusChip status={curr.status} />
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-xs font-mono text-ink-muted">
                        {curr?.validUntil ? (
                          <span className="text-amber font-medium">
                            {curr.validUntil}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-4 py-4 text-xs text-ink-muted">
                        {s.owner}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {s.clearanceCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-verdigris bg-verdigris-light/60 px-2.5 py-0.5 rounded-full">
                            <Layers className="h-3 w-3" />
                            {s.clearanceCount} item{s.clearanceCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted">0 items</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Detail & Edit Drawer */}
      <SourceDrawer
        source={selectedSource}
        onClose={() => setSelectedSource(null)}
        onSourceUpdated={fetchSources}
      />

      {/* Add New Source Modal */}
      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSourceCreated={fetchSources}
      />
    </div>
  );
}
