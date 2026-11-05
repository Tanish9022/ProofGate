import { describe, it, expect } from 'vitest';

describe('Block D - Review & Clearance Rules', () => {
  it('cannot submit for review if unresolved blocker findings exist', () => {
    interface Finding {
      id: string;
      severity: 'blocker' | 'warning' | 'info';
      creator_action: 'accepted' | 'edited' | 'dismissed' | null;
      dismiss_reason: string | null;
    }

    const findingsWithUnresolvedBlocker: Finding[] = [
      { id: 'f-1', severity: 'blocker', creator_action: null, dismiss_reason: null },
      { id: 'f-2', severity: 'warning', creator_action: null, dismiss_reason: null },
    ];

    const canSubmit = (findings: Finding[]) => {
      const unresolvedBlockers = findings.filter(
        f => f.severity === 'blocker' && (!f.creator_action || (f.creator_action === 'dismissed' && !f.dismiss_reason?.trim()))
      );
      return unresolvedBlockers.length === 0;
    };

    expect(canSubmit(findingsWithUnresolvedBlocker)).toBe(false);
  });

  it('allows submission for review when blockers are dismissed with a reason', () => {
    interface Finding {
      id: string;
      severity: 'blocker' | 'warning' | 'info';
      creator_action: 'accepted' | 'edited' | 'dismissed' | null;
      dismiss_reason: string | null;
    }

    const findingsWithDismissedBlocker: Finding[] = [
      { id: 'f-1', severity: 'blocker', creator_action: 'dismissed', dismiss_reason: 'Approved by legal counsel' },
      { id: 'f-2', severity: 'warning', creator_action: null, dismiss_reason: null },
    ];

    const canSubmit = (findings: Finding[]) => {
      const unresolvedBlockers = findings.filter(
        f => f.severity === 'blocker' && (!f.creator_action || (f.creator_action === 'dismissed' && !f.dismiss_reason?.trim()))
      );
      return unresolvedBlockers.length === 0;
    };

    expect(canSubmit(findingsWithDismissedBlocker)).toBe(true);
  });

  it('approval locks only confirmed dependencies into clearance record', () => {
    interface Finding {
      id: string;
      source_version_id: string | null;
      status: 'supported' | 'contradicted' | 'unverifiable';
      link_status: 'confirmed' | 'probable' | null;
    }

    const findings: Finding[] = [
      { id: 'f-1', source_version_id: 'sv-1', status: 'supported', link_status: 'confirmed' },
      { id: 'f-2', source_version_id: 'sv-2', status: 'supported', link_status: 'confirmed' },
      { id: 'f-3', source_version_id: 'sv-3', status: 'supported', link_status: 'probable' }, // Probable link: NOT locked!
      { id: 'f-4', source_version_id: null, status: 'unverifiable', link_status: null },
    ];

    const lockedDependencies = findings.filter(
      f => f.status === 'supported' && f.source_version_id !== null && f.link_status === 'confirmed'
    );

    expect(lockedDependencies.length).toBe(2);
    expect(lockedDependencies.map(d => d.source_version_id)).toEqual(['sv-1', 'sv-2']);
  });

  it('rejection requires comment and moves clearance to rejected state', () => {
    const handleDecision = (decision: 'approved' | 'rejected', comment: string) => {
      if (decision === 'rejected' && (!comment || !comment.trim())) {
        throw new Error('A comment explaining the rejection is required.');
      }
      return {
        decision,
        state: decision === 'approved' ? 'current' : 'rejected',
        comment: comment.trim(),
      };
    };

    expect(() => handleDecision('rejected', '')).toThrowError(/rejection is required/);

    const result = handleDecision('rejected', 'Please rephrase trial period duration.');
    expect(result.state).toBe('rejected');
    expect(result.comment).toBe('Please rephrase trial period duration.');
  });
});

