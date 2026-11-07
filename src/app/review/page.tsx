'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/ui/RoleSwitcher';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { CheckCircle2, XCircle, ArrowRight, ShieldCheck, ShieldAlert, FileText, RefreshCw, MessageSquare, Sparkles } from 'lucide-react';
import type { ReviewQueueItem } from '@/server/services/clearance';

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
