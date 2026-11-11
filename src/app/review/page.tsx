'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/ui/RoleSwitcher';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { CheckCircle2, XCircle, ArrowRight, ShieldCheck, ShieldAlert, FileText, RefreshCw, MessageSquare, Sparkles, HelpCircle, Check, X, Link as LinkIcon } from 'lucide-react';
import type { ReviewQueueItem } from '@/server/services/clearance';
import { CommentSection } from '@/components/content/CommentSection';

interface ReviewFinding {
  id: string;
  quote: string;
  status: string;
  severity: string;
  source_title: string | null;
  source_version: number | null;
  source_display: string | null;
  explanation: string;
  link_status: 'confirmed' | 'probable' | null;
}

export default function ReviewPage() {
  const router = useRouter();
  const { role, setRole } = useRole();
  const showToast = useToast();

  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);

  // Decision state
  const [comment, setComment] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);

  // Findings state for selected item
  const [findings, setFindings] = useState<ReviewFinding[]>([]);
  const [loadingFindings, setLoadingFindings] = useState(false);

  useEffect(() => {
    if (!selectedItem) {
      setFindings([]);
      return;
    }
    const loadFindings = async () => {
      setLoadingFindings(true);
      try {
        const res = await fetch(`/api/content/${selectedItem.contentId}?version=${selectedItem.version}`);
        if (res.ok) {
          const data = await res.json();
          setFindings(data.latestVersion?.findings || []);
        }
      } catch {
        // ignore
      } finally {
        setLoadingFindings(false);
      }
    };
    loadFindings();
  }, [selectedItem]);

  const handleConfirmLink = async (findingId: string) => {
    try {
      const res = await fetch(`/api/findings/${findingId}/confirm-link`, {
        method: 'POST',
        headers: { 'x-role': role },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || 'Failed to confirm link');
      }
      showToast('Link confirmed as dependency', 'success');
      setFindings(prev => prev.map(f => f.id === findingId ? { ...f, link_status: 'confirmed' } : f));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error confirming link', 'error');
    }
  };

  const handleRejectLink = async (findingId: string) => {
    try {
      const res = await fetch(`/api/findings/${findingId}/reject-link`, {
        method: 'POST',
        headers: { 'x-role': role },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || 'Failed to reject link');
      }
      showToast('Link rejected (will not create dependency)', 'info');
      setFindings(prev => prev.map(f => f.id === findingId ? { ...f, link_status: null } : f));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error rejecting link', 'error');
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/review/queue');
      if (!res.ok) throw new Error('Could not fetch review queue');
      const data = await res.json() as ReviewQueueItem[];
      setQueue(data);
      if (data.length > 0 && !selectedItem) {
        setSelectedItem(data[0]);
      } else if (data.length === 0) {
        setSelectedItem(null);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error loading review queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedItem) return;
    if (decision === 'rejected' && !comment.trim()) {
      showToast('A comment is required when rejecting content.', 'error');
      return;
    }

    setIsDeciding(true);
    try {
      const res = await fetch(`/api/review/${selectedItem.versionId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': role,
        },
        body: JSON.stringify({
          decision,
          comment: comment.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Decision failed');
      }

      const resData = await res.json() as { clearanceId: string; state: string };

      if (decision === 'approved') {
        showToast('Content approved! Clearance created with locked source versions.', 'success');
        router.push(`/clearances/${resData.clearanceId}`);
      } else {
        showToast('Content rejected and returned to creator.', 'info');
        setComment('');
        await fetchQueue();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error recording decision', 'error');
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-line-soft pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
              Review Queue
            </h1>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-indigo-light text-indigo border border-indigo/20 font-medium">
              {queue.length} waiting for decision
            </span>
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            Independent human sign-off. Approving locks the clearance to exact current source versions for continuous revalidation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchQueue}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Link href="/clearances">
            <Button variant="secondary" size="sm">
              <ShieldCheck className="h-4 w-4 mr-1.5 text-verdigris" />
              View All Clearances
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Review Area */}
      {loading && queue.length === 0 ? (
        <div className="rounded-xl border border-line-soft bg-paper p-12 text-center text-sm text-ink-muted">
          Loading review queue…
        </div>
      ) : queue.length === 0 ? (
        <EmptyState
          title="Nothing is waiting for review."
          description="Content submitted by creators with all blockers resolved will appear here."
          action={
            <Link href="/content">
              <Button variant="secondary">Go to Content list</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Queue Items List */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
              Pending Submissions ({queue.length})
            </h2>

            <div className="space-y-2.5">
              {queue.map(item => {
                const isSelected = selectedItem?.versionId === item.versionId;
                return (
                  <div
                    key={item.versionId}
                    onClick={() => setSelectedItem(item)}
                    className={[
                      'cursor-pointer rounded-xl border p-4 transition-all duration-120 bg-paper',
                      isSelected
                        ? 'border-indigo ring-2 ring-indigo/20 shadow-sm'
                        : 'border-line-soft hover:border-line-strong hover:bg-ink/[0.01]',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-semibold text-ink">
                        v{item.version}
                      </span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-light text-indigo border border-indigo/20 font-medium">
                        in_review
                      </span>
                    </div>

                    <h3 className="font-medium text-sm text-ink mb-1">
                      {item.contentTitle}
                    </h3>

                    <p className="font-mono text-xs text-ink-muted line-clamp-2 bg-ink/[0.02] p-1.5 rounded border border-line-soft/60">
                      {item.text}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-muted">
                      <span>{item.findingsCount} findings checked</span>
                      <span>{new Date(item.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Item Inspector & Decision Panel */}
          {selectedItem && (
            <div className="lg:col-span-8 space-y-6">
              {/* Submission Header Card */}
              <div className="rounded-xl border border-line-soft bg-paper p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-ink text-paper font-semibold">
                      v{selectedItem.version}
                    </span>
                    <h2 className="font-serif text-xl font-bold text-ink">
                      {selectedItem.contentTitle}
                    </h2>
                  </div>
                  <Link
                    href={`/content/${selectedItem.contentId}`}
                    className="text-xs text-indigo hover:underline flex items-center gap-1 font-medium"
                  >
                    Open full inspection view
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="mt-4 rounded-lg border border-line-soft bg-ink/[0.02] p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-ink">
                  {selectedItem.text}
                </div>
              </div>

              {/* Judge Guide Box */}
              <div className="rounded-xl border border-paper-line bg-paper-warm/60 p-4 text-xs text-ink space-y-1">
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span>Judge Guide · Human Sign-off & Clearance</span>
                </div>
                <p className="text-ink-muted leading-relaxed">
                  In ProofGate, <strong>AI proposes, code verifies, and humans decide</strong>.
                  Clicking <strong>&ldquo;Approve & Create Clearance&rdquo;</strong> below creates a clearance record
                  locking this copy to the exact source versions that verified its claims. This dependency tree enables selective revalidation when facts change in the future.
                </p>
              </div>

              {/* Needs Confirming / Probable Dependency Links */}
              {findings.some(f => f.link_status === 'probable') && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-amber-600" />
                      <h3 className="font-serif text-base font-semibold text-ink">
                        Needs Confirming · Probable Dependency Links ({findings.filter(f => f.link_status === 'probable').length})
                      </h3>
                    </div>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 font-medium">
                      Requires human confirmation
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Deterministic checks identified these claims as probable links (e.g. derived calculation, unit mismatch, or qualifier). <strong>They will NOT create clearance dependencies or auto-revalidate unless confirmed by you.</strong>
                  </p>

                  <div className="space-y-2.5 pt-1">
                    {findings.filter(f => f.link_status === 'probable').map(f => (
                      <div
                        key={f.id}
                        className="rounded-lg border border-amber-200 bg-paper p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-ink">&ldquo;{f.quote}&rdquo;</span>
                            {f.source_title && (
                              <span className="text-[11px] font-mono text-ink-muted">
                                → {f.source_title} (v{f.source_version})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink-muted leading-relaxed">
                            {f.explanation}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleConfirmLink(f.id)}
                            className="bg-verdigris hover:bg-verdigris/90 text-white text-xs py-1 h-8"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Confirm Link
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleRejectLink(f.id)}
                            className="text-xs py-1 h-8 hover:bg-ink/[0.04]"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Reject Link
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmed Dependencies Preview */}
              {findings.some(f => f.link_status === 'confirmed') && (
                <div className="rounded-xl border border-line-soft bg-paper p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-ink">
                    <LinkIcon className="h-4 w-4 text-verdigris" />
                    <span>Confirmed Dependencies ({findings.filter(f => f.link_status === 'confirmed').length})</span>
                  </div>
                  <p className="text-ink-muted">
                    These approved claims have code-verified links and will automatically lock to their source versions upon approval.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {findings.filter(f => f.link_status === 'confirmed').map(f => (
                      <span
                        key={f.id}
                        className="font-mono text-[11px] px-2.5 py-1 rounded-md bg-verdigris/10 text-ink border border-verdigris/20 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="h-3 w-3 text-verdigris" />
                        <span>{f.source_title || f.quote}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Version Comments */}
              <CommentSection
                contentId={selectedItem.contentId}
                versionId={selectedItem.versionId}
                currentRole={role}
              />

              {/* Reviewer Sign-off & Decision Card */}
              <div className="rounded-xl border border-line-soft bg-paper p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-line-soft pb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-verdigris" />
                    <h3 className="font-serif text-lg font-semibold text-ink">
                      Reviewer Decision
                    </h3>
                  </div>
                  <span className="text-xs text-ink-muted">
                    Role: <strong className="text-ink capitalize">{role}</strong>
                  </span>
                </div>

                {role !== 'reviewer' && role !== 'admin' ? (
                  <div className="rounded-lg border border-indigo/20 bg-indigo-light/30 p-4 text-xs text-ink space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-indigo">
                      <ShieldAlert className="h-4 w-4" />
                      <span>Reviewer or Admin role required to record decisions</span>
                    </div>
                    <p className="text-ink-muted">
                      You are currently in <strong>{role}</strong> mode. To sign off or reject content, switch to <strong>Reviewer</strong>.
                    </p>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setRole('reviewer')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Switch to Reviewer Role
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-ink-muted" />
                        Reviewer Sign-off Comment (required for rejection)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. All checks passed against v1 sources. Approved for promotional distribution."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        className="w-full rounded-lg border border-line-strong bg-paper p-3 text-sm text-ink placeholder:text-ink-muted focus:border-indigo"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        onClick={() => handleDecision('approved')}
                        disabled={isDeciding}
                        className="bg-verdigris hover:bg-verdigris/90 text-white"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        {isDeciding ? 'Recording…' : 'Approve & Create Clearance'}
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => handleDecision('rejected')}
                        disabled={isDeciding || !comment.trim()}
                        title={!comment.trim() ? 'Comment required to reject' : ''}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reject with comment
                      </Button>
                    </div>

                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      * Approving automatically registers a <strong>Clearance</strong> linking this content version to every confirmed source version. If an approved source changes in the future, only this clearance will be moved to <strong>Revalidation required</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
