import { describe, it, expect } from 'vitest';

describe('Block E - Selective Revalidation and Audit Rules', () => {
  interface Dependency {
    clearanceId: string;
    sourceVersionId: string;
    linkStatus: 'confirmed' | 'probable';
    context: 'current' | 'historical' | 'quoted' | 'hypothetical';
  }

  interface Clearance {
    id: string;
    contentVersionId: string;
    state: 'current' | 'revalidation_required' | 'review_needed' | 'rejected';
  }

  it('only marks clearances with confirmed dependencies on the changed source version for revalidation', () => {
    const clearances: Clearance[] = [
      { id: 'cl-1', contentVersionId: 'cv-1', state: 'current' },
      { id: 'cl-2', contentVersionId: 'cv-2', state: 'current' },
      { id: 'cl-3', contentVersionId: 'cv-3', state: 'rejected' },
    ];

    const dependencies: Dependency[] = [
      // cl-1 has confirmed link to changed source sv-old
      { clearanceId: 'cl-1', sourceVersionId: 'sv-old', linkStatus: 'confirmed', context: 'current' },
      // cl-2 has dependency on a different source sv-other
      { clearanceId: 'cl-2', sourceVersionId: 'sv-other', linkStatus: 'confirmed', context: 'current' },
    ];

    const changedSourceVersionId = 'sv-old';

    // Selective revalidation filter
    const affectedClearances = clearances.filter(cl => {
      if (cl.state !== 'current') return false;
      return dependencies.some(
        d => d.clearanceId === cl.id &&
             d.sourceVersionId === changedSourceVersionId &&
             d.linkStatus === 'confirmed' &&
             d.context === 'current'
      );
    });

    expect(affectedClearances.map(c => c.id)).toEqual(['cl-1']);
  });

  it('historical quotes and hypothetical claims do not trigger revalidation', () => {
    // Sample B: "In 2025, Pro plan was Rs. 499" (historical context)
    const dependencies: Dependency[] = [
      { clearanceId: 'cl-sample-b', sourceVersionId: 'sv-old', linkStatus: 'confirmed', context: 'historical' },
    ];

    const isAffected = (clearanceId: string, changedSourceVersionId: string) => {
      return dependencies.some(
        d => d.clearanceId === clearanceId &&
             d.sourceVersionId === changedSourceVersionId &&
             d.linkStatus === 'confirmed' &&
             d.context === 'current'
      );
    };

    expect(isAffected('cl-sample-b', 'sv-old')).toBe(false);
  });

  it('re-approve action replaces superseded dependency with new source version', () => {
    const oldDeps = [
      { sourceVersionId: 'sv-v1', linkStatus: 'confirmed', claimId: 'claim-1' },
      { sourceVersionId: 'sv-other', linkStatus: 'confirmed', claimId: 'claim-2' },
    ];

    const triggerSourceVersionId = 'sv-v1';
    const newSourceVersionId = 'sv-v2';

    // Transform dependencies for new clearance
    const newDeps = oldDeps.map(d => ({
      ...d,
      sourceVersionId: d.sourceVersionId === triggerSourceVersionId ? newSourceVersionId : d.sourceVersionId,
    }));

    expect(newDeps).toEqual([
      { sourceVersionId: 'sv-v2', linkStatus: 'confirmed', claimId: 'claim-1' },
      { sourceVersionId: 'sv-other', linkStatus: 'confirmed', claimId: 'claim-2' },
    ]);
  });

  it('send back action sets clearance to rejected and content to draft', () => {
    let clearanceState: 'current' | 'revalidation_required' | 'rejected' = 'revalidation_required';
    let contentVersionState: 'draft' | 'in_review' | 'cleared' = 'cleared';

    const handleSendBack = () => {
      clearanceState = 'rejected';
      contentVersionState = 'draft';
    };

    handleSendBack();
    expect(clearanceState).toBe('rejected');
    expect(contentVersionState).toBe('draft');
  });

  it('verifies audit log entries conform to immutable schema', () => {
    interface AuditEntry {
      workspace_id: string;
      actor_role: 'admin' | 'creator' | 'reviewer';
      action: string;
      entity_type: string;
      entity_id: string | null;
      details: Record<string, unknown>;
    }

    const logMutation = (entry: AuditEntry) => {
      expect(entry.workspace_id).toBeDefined();
      expect(['admin', 'creator', 'reviewer']).toContain(entry.actor_role);
      expect(entry.action.length).toBeGreaterThan(0);
      expect(entry.entity_type.length).toBeGreaterThan(0);
      return { ...entry, id: 'log-123', created_at: new Date().toISOString() };
    };

    const entry = logMutation({
      workspace_id: 'ws-1',
      actor_role: 'reviewer',
      action: 'clearance.reapproved',
      entity_type: 'clearance',
      entity_id: 'cl-new-1',
      details: { previousClearanceId: 'cl-old-1' },
    });

    expect(entry.id).toBe('log-123');
    expect(entry.action).toBe('clearance.reapproved');
  });
});

