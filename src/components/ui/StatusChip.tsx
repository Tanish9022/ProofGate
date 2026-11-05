import * as React from 'react';

export type FindingStatus =
  | 'supported'
  | 'contradicted'
  | 'expired_or_superseded'
  | 'unverifiable'
  | 'conflicting_evidence'
  | 'review_needed';

export type ClearanceState =
  | 'current'
  | 'revalidation_required'
  | 'review_needed'
  | 'rejected'
  | 'draft'
  | 'in_review'
  | 'cleared';

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; tooltip: string }
> = {
  supported: {
    label: 'Supported',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tooltip: 'Matches an approved source.',
  },
  contradicted: {
    label: 'Contradicted',
    className: 'bg-red-50 text-red-700 border-red-200',
    tooltip: 'Conflicts with an approved source.',
  },
  expired_or_superseded: {
    label: 'Outdated source',
    className: 'bg-amber-50 text-amber-700 border-amber-300',
    tooltip: 'The source behind this is no longer current.',
  },
  unverifiable: {
    label: 'Unverifiable',
    className: 'bg-paper-warm text-ink-muted border-paper-line',
    tooltip: 'No approved source covers this claim.',
  },
  conflicting_evidence: {
    label: 'Conflicting sources',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    tooltip: 'Approved sources disagree. Ask the owner.',
  },
  review_needed: {
    label: 'Needs review',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    tooltip: 'This could not be checked automatically.',
  },
};

interface StatusChipProps {
  status: FindingStatus;
  className?: string;
}

export function StatusChip({ status, className = '' }: StatusChipProps) {
  const config = STATUS_CONFIG[status] || {
    label: String(status || 'Unknown').replace(/_/g, ' '),
    className: 'bg-paper-warm text-ink-muted border-paper-line',
    tooltip: '',
  };
  return (
    <span
      className={[
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      ].join(' ')}
      title={config.tooltip}
      role="status"
    >
      {config.label}
    </span>
  );
}

// Clearance & Content State Seal component
const SEAL_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  current: { label: 'Cleared', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cleared: { label: 'Cleared', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  revalidation_required: { label: 'Reopened', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  review_needed: { label: 'In review', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  in_review: { label: 'In review', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  draft: { label: 'Draft', className: 'bg-paper-warm text-ink-muted border-paper-line' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
};

export type SourceStatus = 'current' | 'superseded' | 'expired' | 'withdrawn';

const SOURCE_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  current: { label: 'Current', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  superseded: { label: 'Superseded', className: 'bg-paper-warm text-ink-muted border-paper-line' },
  expired: { label: 'Expired', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  withdrawn: { label: 'Withdrawn', className: 'bg-red-50 text-red-700 border-red-200' },
};

export function SourceStatusChip({ status, className = '' }: { status: SourceStatus; className?: string }) {
  const config = SOURCE_STATUS_CONFIG[status] || {
    label: String(status || 'Unknown').replace(/_/g, ' '),
    className: 'bg-paper-warm text-ink-muted border-paper-line',
  };
  return (
    <span
      className={[
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize',
        config.className,
        className,
      ].join(' ')}
    >
      {config.label}
    </span>
  );
}

interface SealProps {
  state: ClearanceState | string;
  className?: string;
}

export function Seal({ state, className = '' }: SealProps) {
  const config = SEAL_CONFIG[state] || {
    label: String(state || 'Draft').replace(/_/g, ' '),
    className: 'bg-paper-warm text-ink-muted border-paper-line',
  };
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase',
        config.className,
        className,
      ].join(' ')}
    >
      {config.label}
    </span>
  );
}
