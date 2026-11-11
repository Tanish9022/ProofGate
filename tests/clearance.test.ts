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
  it('idempotent approval: double submit or retry returns existing clearance without duplicate record or audit log', () => {
    interface Clearance {
      id: string;
      content_version_id: string;
      decision: 'approved' | 'rejected';
      state: string;
    }

    interface AuditRow {
      id: string;
      action: string;
      entity_id: string;
    }

    const clearanceStore: Clearance[] = [];
    const auditStore: AuditRow[] = [];

    const decideReviewIdempotent = (
      versionId: string,
      decision: 'approved' | 'rejected',
      comment: string
    ) => {
      // 1. Idempotency check: return existing clearance if already decided
      const existing = clearanceStore.find(c => c.content_version_id === versionId);
      if (existing) {
        return { clearanceId: existing.id, state: existing.state, createdNew: false };
      }

      // 2. Create new clearance
      const newClearance: Clearance = {
        id: `cl-${clearanceStore.length + 1}`,
        content_version_id: versionId,
        decision,
        state: decision === 'approved' ? 'current' : 'rejected',
      };
      clearanceStore.push(newClearance);

      // 3. Write audit log
      auditStore.push({
        id: `aud-${auditStore.length + 1}`,
        action: `clearance.${decision}`,
        entity_id: newClearance.id,
      });

      return { clearanceId: newClearance.id, state: newClearance.state, createdNew: true };
    };

    // First submit: creates clearance
    const firstCall = decideReviewIdempotent('ver-101', 'approved', 'Looks good');
    expect(firstCall.createdNew).toBe(true);
    expect(firstCall.clearanceId).toBe('cl-1');
    expect(clearanceStore.length).toBe(1);
    expect(auditStore.length).toBe(1);

    // Second submit (retry / double-click): idempotent, no duplicate clearance or audit entry
    const retryCall = decideReviewIdempotent('ver-101', 'approved', 'Looks good');
    expect(retryCall.createdNew).toBe(false);
    expect(retryCall.clearanceId).toBe('cl-1');
    expect(clearanceStore.length).toBe(1); // Still exactly 1 clearance
    expect(auditStore.length).toBe(1);     // Still exactly 1 audit row
  });

  it('unconfirmed probable links do not create dependencies and never reopen on source changes', () => {
    interface ClearanceDep {
      clearance_id: string;
      source_version_id: string;
      link_status: 'confirmed' | 'probable';
    }

    // 1. Initial findings: one confirmed (499 price), one unconfirmed probable (uptime qualifier)
    const findings = [
      { id: 'f-1', source_version_id: 'sv-price-v1', link_status: 'confirmed' as const },
      { id: 'f-2', source_version_id: 'sv-uptime-v1', link_status: 'probable' as const },
    ];

    // 2. During clearance approval, only confirmed links become clearance dependencies
    const lockedDeps: ClearanceDep[] = findings
      .filter(f => f.link_status === 'confirmed')
      .map(f => ({
        clearance_id: 'cl-1',
        source_version_id: f.source_version_id,
        link_status: f.link_status,
      }));

    expect(lockedDeps.length).toBe(1);
    expect(lockedDeps[0].source_version_id).toBe('sv-price-v1');

    // 3. When uptime source sv-uptime-v1 is superseded by sv-uptime-v2
    const triggerSourceId = 'sv-uptime-v1';
    const revalidationNeeded = lockedDeps.some(
      dep => dep.source_version_id === triggerSourceId && dep.link_status === 'confirmed'
    );

    // Unconfirmed probable link does NOT trigger revalidation!
    expect(revalidationNeeded).toBe(false);

    // 4. If reviewer explicitly confirms the probable link before approval
    findings[1].link_status = 'confirmed';
    const updatedLockedDeps: ClearanceDep[] = findings
      .filter(f => f.link_status === 'confirmed')
      .map(f => ({
        clearance_id: 'cl-2',
        source_version_id: f.source_version_id,
        link_status: f.link_status,
      }));

    expect(updatedLockedDeps.length).toBe(2);
    const revalidationAfterConfirmation = updatedLockedDeps.some(
      dep => dep.source_version_id === triggerSourceId && dep.link_status === 'confirmed'
    );
    expect(revalidationAfterConfirmation).toBe(true);
  });
});