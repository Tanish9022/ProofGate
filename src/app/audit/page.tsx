'use client';

import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Search, ChevronDown, ChevronRight, FileText, Shield, Sparkles, Database } from 'lucide-react';
import type { AuditLogRow } from '@/server/services/revalidate';

export default function AuditPage() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterActor, setFilterActor] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit?limit=200');
      if (!res.ok) throw new Error('Failed to load audit logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error loading audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterActor !== 'all' && log.actor_role !== filterActor) return false;
      if (filterAction !== 'all') {
        if (!log.action.startsWith(filterAction)) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesEntity = log.entity_type.toLowerCase().includes(q) || (log.entity_id && log.entity_id.toLowerCase().includes(q));
        const matchesDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(q) : false;
        if (!matchesAction && !matchesEntity && !matchesDetails) return false;
      }
      return true;
    });
  }, [logs, filterActor, filterAction, search]);

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('created') || action.includes('approved')) return 'positive';
    if (action.includes('rejected') || action.includes('superseded') || action.includes('withdrawn')) return 'accent';
    return 'subtle';
  };

  const getActorBadgeVariant = (actor: string) => {
    if (actor === 'admin') return 'accent';
    if (actor === 'reviewer') return 'positive';
    return 'subtle';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-paper-line gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-normal text-ink">Audit Log</h1>
            <Badge variant="subtle" size="sm">
              {logs.length} events
            </Badge>
          </div>
          <p className="text-sm text-ink-muted mt-1.5 max-w-2xl">
            Append-only, immutable record of every mutation in this workspace — source updates, clearance approvals, and revalidations.
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="my-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <Input
            placeholder="Search action or entity..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full h-10 px-3 text-sm bg-paper border border-paper-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-ink"
          >
            <option value="all">All Action Types</option>
            <option value="source">Source Actions (source.*)</option>
            <option value="content">Content Actions (content.*)</option>
            <option value="clearance">Clearance Actions (clearance.*)</option>
            <option value="workspace">Workspace Actions (workspace.*)</option>
          </select>
        </div>

        <div>
          <select
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            className="w-full h-10 px-3 text-sm bg-paper border border-paper-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-ink"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="reviewer">Reviewer</option>
            <option value="creator">Creator</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="py-20 text-center text-sm text-ink-muted">Loading audit log...</div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          title="No matching audit events"
          description={logs.length === 0 ? 'No activity has been recorded yet.' : 'Try adjusting your search or filters.'}
        />
      ) : (
        <div className="bg-paper border border-paper-line rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper-warm/50 border-b border-paper-line text-xs font-mono uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Entity ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const date = new Date(log.created_at);
                  const formattedDate = date.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="hover:bg-paper-warm/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-ink-muted">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-ink-muted whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={getActorBadgeVariant(log.actor_role)} size="sm">
                            {log.actor_role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-medium text-ink">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-ink-muted capitalize">
                          {log.entity_type}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-ink-muted">
                          {log.entity_id ? `${log.entity_id.slice(0, 8)}…` : '—'}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-paper-warm/30">
                          <td colSpan={6} className="p-4 pl-12">
                            <div className="text-xs font-mono text-ink-muted uppercase tracking-wider mb-1.5">
                              Payload Details
                            </div>
                            <pre className="p-3 bg-paper border border-paper-line rounded-lg font-mono text-xs text-ink overflow-x-auto">
                              {JSON.stringify(log.details ?? {}, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
