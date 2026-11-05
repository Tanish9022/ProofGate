'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatusChip } from '@/components/ui/StatusChip';
import { Button } from '@/components/ui/Button';
import { FindingRow } from '@/server/services/content';
import { AlertCircle, Check, X, ArrowRight, ShieldAlert, Info, Sparkles } from 'lucide-react';

interface FindingCardProps {
  finding: FindingRow;
  onApplyFix?: (quote: string, fix: string) => void;
  onActionUpdated: () => void;
  isSelected?: boolean;
}

export function FindingCard({
  finding,
  onApplyFix,
  onActionUpdated,
  isSelected = false,
}: FindingCardProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: 'accepted' | 'dismissed') => {
    if (action === 'dismissed' && !dismissReason.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/findings/${finding.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: action === 'dismissed' ? dismissReason.trim() : undefined,
        }),
      });
      if (res.ok) {
        setIsDismissing(false);
        onActionUpdated();
      }
    } catch (e) {
      console.error('Failed to update finding action:', e);
    } finally {
      setLoading(false);
    }
  };

  const severityBadge = {
    blocker: 'bg-red-pen-light text-red-pen border-red-pen/20',
    warning: 'bg-amber-light text-amber border-amber/30',
    info: 'bg-verdigris-light text-verdigris border-verdigris/20',
  }[finding.severity];

  return (
    <article
      id={`finding-${finding.id}`}
      className={[
        'rounded-xl border p-4 transition-all duration-150 bg-paper',
        isSelected
          ? 'ring-2 ring-indigo border-indigo shadow-md'
          : finding.severity === 'blocker'
          ? 'border-red-pen/30 shadow-sm'
          : 'border-line-soft shadow-card',
      ].join(' ')}
    >
      {/* Header chips */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <StatusChip status={finding.status} />
          <span
            className={[
              'inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
              severityBadge,
            ].join(' ')}
          >
            {finding.severity}
          </span>
        </div>

        {finding.creator_action && (
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-ink/[0.05] text-ink-muted capitalize">
            Action: {finding.creator_action}
          </span>
        )}
      </div>

      {/* Quote */}
      <div className="mb-2 font-mono text-xs bg-ink/[0.03] p-2 rounded border border-line-soft text-ink font-medium">
        &ldquo;{finding.quote}&rdquo;
      </div>

      {/* Explanation */}
      <p className="text-sm text-ink mb-2 leading-relaxed">
        {finding.explanation}
      </p>

      {/* Source Reference */}
      {finding.source_title && (
        <div className="text-xs text-ink-muted mb-3 flex items-center gap-1.5">
          <span className="font-medium text-ink">Approved source:</span>
          <Link
            href="/library"
            className="text-indigo hover:underline font-medium inline-flex items-center gap-1"
          >
            {finding.source_title} (v{finding.source_version})
            <ArrowRight className="h-3 w-3" />
          </Link>
          {finding.source_display && (
            <span className="font-mono text-[11px] text-ink-muted">
              [{finding.source_display}]
            </span>
          )}
        </div>
      )}

      {/* Suggested Fix */}
      {finding.suggested_fix && !finding.creator_action && (
        <div className="mt-3 rounded-lg border border-verdigris/30 bg-verdigris-light/40 p-3 text-xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-semibold text-verdigris flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Suggested fix
            </span>
            {onApplyFix && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onApplyFix(finding.quote, finding.suggested_fix!)}
              >
                Apply fix
              </Button>
            )}
          </div>
          <p className="text-ink font-mono">{finding.suggested_fix}</p>
        </div>
      )}

      {/* Dismissal Reason Form */}
      {isDismissing && (
        <div className="mt-3 p-3 rounded-lg border border-amber/30 bg-amber-light/30 space-y-2 text-xs">
          <label className="block font-semibold text-ink">
            Reason for dismissing this {finding.severity} *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Verified with legal / intentional exception"
            value={dismissReason}
            onChange={e => setDismissReason(e.target.value)}
            className="w-full rounded border border-line-strong bg-paper px-2.5 py-1 text-xs text-ink"
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              disabled={loading || !dismissReason.trim()}
              onClick={() => handleAction('dismissed')}
            >
              {loading ? 'Dismissing…' : 'Confirm Dismiss'}
            </Button>
            <button
              onClick={() => setIsDismissing(false)}
              className="text-ink-muted hover:underline ml-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons (when not yet resolved) */}
      {!finding.creator_action && !isDismissing && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-line-soft/60">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleAction('accepted')}
            disabled={loading}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Accept finding
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsDismissing(true)}
            disabled={loading}
          >
            <X className="h-3.5 w-3.5 mr-1 text-red-pen" />
            Dismiss
          </Button>
        </div>
      )}

      {finding.creator_action === 'dismissed' && finding.dismiss_reason && (
        <div className="mt-2 text-xs text-ink-muted italic border-l-2 border-amber pl-2">
          Dismissed: &ldquo;{finding.dismiss_reason}&rdquo;
        </div>
      )}
    </article>
  );
}

