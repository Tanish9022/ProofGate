'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRole } from '@/components/ui/RoleSwitcher';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, CheckCircle2, RotateCcw, ChevronDown, ChevronRight, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import type { RevalidationItemDetail, NotAffectedItem } from '@/server/services/revalidate';

export default function RevalidationPage() {
  const { role } = useRole();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RevalidationItemDetail[]>([]);
  const [notAffected, setNotAffected] = useState<NotAffectedItem[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [showNotAffected, setShowNotAffected] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/revalidation');
      if (!res.ok) throw new Error('Failed to load revalidation queue');
      const data = await res.json();
      setItems(data.items || []);
      setNotAffected(data.notAffected || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error loading revalidation', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResolve = async (id: string, action: 'reapprove' | 'send_back') => {
    setResolvingId(id);
    try {
      const comment = comments[id] || '';
      const res = await fetch(`/api/revalidation/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': role,
        },
        body: JSON.stringify({ action, comment }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Resolution failed');
      }

      showToast(
        action === 'reapprove'
          ? 'Clearance re-approved with latest source version!'
          : 'Content sent back to creator for revision.',
        'success'
      );

      // Refresh list
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to resolve', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  const isReviewerOrAdmin = role === 'reviewer' || role === 'admin';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-paper-line gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-normal text-ink">Revalidation Queue</h1>
            <Badge variant={items.length > 0 ? 'accent' : 'subtle'} size="sm">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
          <p className="text-sm text-ink-muted mt-1.5 max-w-2xl">
            When an approved fact changes, expires, or is superseded, ProofGate traces dependent clearances and flags only affected content for human review.
          </p>
        </div>

        {!isReviewerOrAdmin && items.length > 0 && (
          <div className="bg-paper-warm border border-paper-line rounded-lg p-3 text-xs text-ink-muted flex items-center gap-2">
            <Info className="w-4 h-4 text-accent shrink-0" />
            <span>Switch role to <strong>Reviewer</strong> in the top bar to take action.</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-ink-muted">Loading revalidation queue...</div>
      ) : items.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="All clearances are up to date"
            description="No active clearances have dependencies on outdated, expired, or superseded facts. ProofGate continuously monitors source versions."
          />
        </div>
      ) : (
        <div className="space-y-6 my-8">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-paper border border-paper-line rounded-xl shadow-xs overflow-hidden transition-all hover:border-ink/20"
            >
              {/* Card Header */}
              <div className="p-6 bg-paper-warm/40 border-b border-paper-line flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 text-xs font-mono font-medium uppercase tracking-wider bg-accent/10 text-accent rounded-md border border-accent/20">
                      Revalidation Required
                    </span>
                    <span className="text-xs text-ink-muted font-mono">
                      Clearance: {item.clearance_id.slice(0, 8)}…
                    </span>
                  </div>
                  <h2 className="text-xl font-medium text-ink mt-2">
                    <Link
                      href={`/content/${item.content_id}`}
                      className="hover:underline hover:text-accent flex items-center gap-1.5"
                    >
                      {item.content_title}
                      <span className="text-sm font-normal text-ink-muted font-mono">v{item.version}</span>
                    </Link>
                  </h2>
                  <p className="text-xs text-ink-muted mt-1">
                    {item.reason}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/clearances/${item.clearance_id}`}>
                    <Button variant="secondary" size="sm">
                      View Clearance
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Card Body: Old vs New Comparison */}
              <div className="p-6 space-y-6">
                {/* Quote in question */}
                {item.quote && (
                  <div className="p-4 bg-paper-warm rounded-lg border-l-4 border-amber-500">
                    <div className="text-xs font-mono text-ink-muted uppercase tracking-wider mb-1">
                      Referenced Claim in Content
                    </div>
                    <blockquote className="text-sm font-medium text-ink italic">
                      &ldquo;{item.quote}&rdquo;
                    </blockquote>
                  </div>
                )}

                {/* Diff Comparison Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Old Version */}
                  <div className="p-4 rounded-lg border border-red-200 bg-red-50/40">
                    <div className="flex items-center justify-between text-xs text-red-700 font-mono mb-2">
                      <span className="font-semibold uppercase tracking-wider">Previous Source (v{item.old_version})</span>
                      <span>{item.source_key}</span>
                    </div>
                    <div className="text-lg font-mono font-semibold text-red-900 break-words">
                      {item.old_value}
                    </div>
                    <div className="text-xs text-red-600 mt-2">
                      This version is now superseded or retired.
                    </div>
                  </div>

                  {/* New Version */}
                  <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40">
                    <div className="flex items-center justify-between text-xs text-emerald-700 font-mono mb-2">
                      <span className="font-semibold uppercase tracking-wider">
                        {item.new_version ? `Updated Source (v${item.new_version})` : 'New Source Version'}
                      </span>
                      <span>{item.source_key}</span>
                    </div>
                    <div className="text-lg font-mono font-semibold text-emerald-900 break-words">
                      {item.new_value ?? '(Source withdrawn or expired)'}
                    </div>
                    <div className="text-xs text-emerald-600 mt-2">
                      {item.new_version ? 'Active source fact now in effect.' : 'No replacement provided.'}
                    </div>
                  </div>
                </div>

                {/* Reviewer Actions */}
                <div className="pt-4 border-t border-paper-line flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Resolution comment (optional)"
                      value={comments[item.id] || ''}
                      onChange={(e) => setComments({ ...comments, [item.id]: e.target.value })}
                      disabled={!isReviewerOrAdmin || resolvingId === item.id}
                      className="w-full text-xs px-3 py-2 border border-paper-line rounded-lg bg-paper focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!isReviewerOrAdmin || resolvingId === item.id}
                      onClick={() => handleResolve(item.id, 'send_back')}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1 text-ink-muted" />
                      Send Back to Creator
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!isReviewerOrAdmin || resolvingId === item.id}
                      onClick={() => handleResolve(item.id, 'reapprove')}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Re-approve with New Version
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selective Revalidation Educational Accordion ("Not Affected" items) */}
      <div className="mt-12 pt-8 border-t border-paper-line">
        <button
          onClick={() => setShowNotAffected(!showNotAffected)}
          className="w-full flex items-center justify-between text-left py-2 group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink group-hover:text-accent">
                Selective Revalidation: Why was other content not affected?
              </h3>
              <p className="text-xs text-ink-muted">
                ProofGate only revalidates clearances with confirmed dependencies on the changed fact.
              </p>
            </div>
          </div>
          <div className="text-ink-muted">
            {showNotAffected ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {showNotAffected && (
          <div className="mt-4 p-5 rounded-xl border border-paper-line bg-paper-warm/50 text-xs text-ink space-y-4">
            <div className="leading-relaxed text-ink-muted">
              Unlike naïve tools that flag every document mentioning a keyword, ProofGate’s dependency graph traces exact claims.
              Historical statements (e.g. <em>&ldquo;In 2025, pricing was Rs. 499&rdquo;</em>), quotations, and hypothetical contexts
              are explicitly excluded from active dependencies.
            </div>

            {notAffected.length > 0 ? (
              <div className="space-y-2 pt-2">
                <div className="font-mono uppercase text-[10px] tracking-wider text-ink-muted">
                  Content with no current dependency (Remained Cleared):
                </div>
                {notAffected.map((na, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-paper rounded-lg border border-paper-line flex items-center justify-between gap-4"
                  >
                    <div>
                      <span className="font-medium text-ink">{na.content_title}</span>
                      <span className="ml-2 font-mono text-[11px] text-ink-muted">v{na.version}</span>
                      <div className="text-ink-muted text-[11px] mt-0.5">{na.reason}</div>
                    </div>
                    <Badge variant="subtle" size="sm">
                      Unaffected
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-ink-muted italic pt-1">
                No historical or unaffected clearances in workspace currently.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
