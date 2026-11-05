'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/components/ui/RoleSwitcher';
import { Button } from '@/components/ui/Button';
import { SourceStatusChip } from '@/components/ui/StatusChip';
import { useToast } from '@/components/ui/Toast';
import { X, AlertTriangle, History, Shield, Plus, Archive, AlertCircle } from 'lucide-react';
import type { SourceSummary, SourceDetail, AffectedClearance } from '@/server/services/sources';

interface SourceDrawerProps {
  source: SourceSummary | null;
  onClose: () => void;
  onSourceUpdated: () => void;
}

export function SourceDrawer({ source, onClose, onSourceUpdated }: SourceDrawerProps) {
  const { role } = useRole();
  const showToast = useToast();

  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Add version mode
  const [isAddingVersion, setIsAddingVersion] = useState(false);
  const [newValDisplay, setNewValDisplay] = useState('');
  const [newValNumber, setNewValNumber] = useState<number | ''>('');
  const [newValUnit, setNewValUnit] = useState('');
  const [newValText, setNewValText] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [submittingVersion, setSubmittingVersion] = useState(false);

  // Impact preview state
  const [impactList, setImpactList] = useState<AffectedClearance[]>([]);
  const [loadingImpact, setLoadingImpact] = useState(false);

  // Withdraw state
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Expire state
  const [submittingExpire, setSubmittingExpire] = useState(false);

  useEffect(() => {
    if (!source) return;
    let isMounted = true;
    setLoading(true);
    setIsAddingVersion(false);
    setIsWithdrawing(false);

    fetch(`/api/sources/${source.id}`)
      .then(r => r.json())
      .then(data => {
        if (isMounted) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [source]);

  // Load impact preview when user opens "Add version"
  const handleOpenAddVersion = async () => {
    if (!source) return;
    setIsAddingVersion(true);
    setLoadingImpact(true);

    // Pre-fill form from current version
    const currVal = source.current?.value || {};
    if (typeof currVal.number === 'number') {
      setNewValNumber(currVal.number);
      setNewValUnit(String(currVal.unit || ''));
      setNewValDisplay(String(currVal.display || ''));
    } else if (typeof currVal.text === 'string') {
      setNewValText(currVal.text);
    } else {
      setNewValDisplay(JSON.stringify(currVal));
    }
    setChangeNote('');
    setValidUntil(source.current?.validUntil || '');

    try {
      const res = await fetch(`/api/sources/${source.id}/impact`, {
        headers: { 'x-role': role },
      });
      if (res.ok) {
        const data = await res.json() as { affected: AffectedClearance[] };
        setImpactList(data.affected || []);
      }
    } catch {
      setImpactList([]);
    } finally {
      setLoadingImpact(false);
    }
  };

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source) return;
    setSubmittingVersion(true);

    let valObject: Record<string, unknown> = {};
    if (source.kind === 'fact') {
      valObject = {
        number: typeof newValNumber === 'number' ? newValNumber : 0,
        unit: newValUnit,
        display: newValDisplay || `${newValNumber} ${newValUnit}`,
      };
    } else if (source.kind === 'guideline') {
      valObject = { text: newValText };
    } else {
      // term or other
      try {
        valObject = JSON.parse(newValDisplay);
      } catch {
        valObject = { text: newValDisplay };
      }
    }

    try {
      const res = await fetch(`/api/sources/${source.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': role,
        },
        body: JSON.stringify({
          value: valObject,
          changeNote,
          validUntil: validUntil || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to add version');
      }

      const resData = await res.json() as { newVersion: number; affected: AffectedClearance[] };
      showToast(
        `Version ${resData.newVersion} published. ${resData.affected.length} item(s) moved to revalidation.`,
        'success'
      );
      setIsAddingVersion(false);
      onSourceUpdated();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error adding version', 'error');
    } finally {
      setSubmittingVersion(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !withdrawReason.trim()) return;
    setSubmittingWithdraw(true);

    try {
      const res = await fetch(`/api/sources/${source.id}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': role,
        },
        body: JSON.stringify({ reason: withdrawReason.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to withdraw');
      }

      const resData = await res.json() as { affected: AffectedClearance[] };
      showToast(`Source withdrawn. ${resData.affected.length} item(s) moved to revalidation.`, 'success');
      setIsWithdrawing(false);
      onSourceUpdated();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error withdrawing source', 'error');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const handleExpire = async () => {
    if (!source) return;
    if (!confirm(`Mark "${source.title}" as expired? Dependent clearances will move to revalidation.`)) {
      return;
    }
    setSubmittingExpire(true);

    try {
      const res = await fetch(`/api/sources/${source.id}/expire`, {
        method: 'POST',
        headers: { 'x-role': role },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to expire');
      }

      const resData = await res.json() as { affected: AffectedClearance[] };
      showToast(`Source marked expired. ${resData.affected.length} item(s) moved to revalidation.`, 'success');
      onSourceUpdated();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error expiring source', 'error');
    } finally {
      setSubmittingExpire(false);
    }
  };

  if (!source) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/20 backdrop-blur-[2px] transition-opacity">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          className="w-screen max-w-xl bg-paper shadow-drawer border-l border-line-soft flex flex-col"
        >
          {/* Header */}
          <div className="border-b border-line-soft p-6 flex items-start justify-between bg-paper">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-ink/[0.05] text-ink-muted">
                  {source.kind}
                </span>
                <span className="font-mono text-xs text-ink-muted">
                  {source.key}
                </span>
              </div>
              <h2 id="drawer-title" className="font-serif text-xl font-semibold text-ink">
                {source.title}
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                Owner: <strong className="text-ink">{source.owner}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-ink-muted hover:bg-ink/[0.06] hover:text-ink"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Current status banner */}
            <div className="rounded-lg border border-line-soft bg-paper p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Current Version (v{source.current?.version ?? 1})
                </span>
                {source.current && (
                  <SourceStatusChip status={source.current.status} />
                )}
              </div>
              <div className="text-base font-medium text-ink font-mono bg-ink/[0.02] p-3 rounded border border-line-soft/60">
                {source.current?.value?.display
                  ? String(source.current.value.display)
                  : source.current?.value?.text
                  ? String(source.current.value.text)
                  : JSON.stringify(source.current?.value || {})}
              </div>
              {source.current?.validUntil && (
                <p className="mt-2 text-xs text-amber font-medium">
                  Valid until: {source.current.validUntil}
                </p>
              )}
            </div>

            {/* Admin Actions Bar */}
            {role === 'admin' && source.current?.status === 'current' && !isAddingVersion && !isWithdrawing && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-line-soft bg-ink/[0.02]">
                <Button size="sm" onClick={handleOpenAddVersion}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add new version (v{(source.current?.version ?? 1) + 1})
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsWithdrawing(true)}
                >
                  <Archive className="h-4 w-4 mr-1 text-red-pen" />
                  Withdraw
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExpire}
                  disabled={submittingExpire}
                >
                  <AlertCircle className="h-4 w-4 mr-1 text-amber" />
                  Mark expired
                </Button>
              </div>
            )}

            {role !== 'admin' && (
              <div className="rounded border border-line-soft p-3 text-xs text-ink-muted bg-paper flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo shrink-0" />
                <span>
                  Switch demo role to <strong className="text-ink">Admin</strong> in the top bar to update, supersede, or withdraw this source.
                </span>
              </div>
            )}

            {/* Add New Version Form */}
            {isAddingVersion && (
              <form onSubmit={handleSaveVersion} className="rounded-lg border border-indigo/30 bg-indigo-light/30 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-semibold text-ink flex items-center gap-2">
                    <Plus className="h-4 w-4 text-indigo" />
                    Supersede with version {(source.current?.version ?? 1) + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingVersion(false)}
                    className="text-xs text-ink-muted hover:underline"
                  >
                    Cancel
                  </button>
                </div>

                {/* Impact Preview Callout */}
                {loadingImpact ? (
                  <div className="text-xs text-ink-muted py-1">Checking dependent clearances…</div>
                ) : impactList.length > 0 ? (
                  <div className="rounded border border-amber/40 bg-amber-light p-3 text-xs text-ink space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-amber">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{impactList.length} approved item(s) depend on this source</span>
                    </div>
                    <p className="text-ink-muted">
                      Publishing this version will automatically flag them as <strong>Revalidation required</strong>:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-ink pl-1">
                      {impactList.map(a => (
                        <li key={a.clearanceId}>{a.contentTitle}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-xs text-ink-muted">
                    No approved clearances currently depend on this source.
                  </div>
                )}

                {/* Form fields based on kind */}
                {source.kind === 'fact' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        Number Value
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newValNumber}
                        onChange={e => {
                          const n = e.target.value === '' ? '' : parseFloat(e.target.value);
                          setNewValNumber(n);
                          if (newValUnit) {
                            setNewValDisplay(
                              newValUnit.includes('INR')
                                ? `Rs. ${n} per user per month`
                                : `${n} ${newValUnit}`
                            );
                          }
                        }}
                        className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={newValUnit}
                        onChange={e => setNewValUnit(e.target.value)}
                        className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        Display String
                      </label>
                      <input
                        type="text"
                        required
                        value={newValDisplay}
                        onChange={e => setNewValDisplay(e.target.value)}
                        className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
                      />
                    </div>
                  </div>
                ) : source.kind === 'guideline' ? (
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Guideline Text
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={newValText}
                      onChange={e => setNewValText(e.target.value)}
                      className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Value Definition
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={newValDisplay}
                      onChange={e => setNewValDisplay(e.target.value)}
                      className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Change Note (Reason)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Price updated from Rs. 499 to Rs. 699"
                    value={changeNote}
                    onChange={e => setChangeNote(e.target.value)}
                    className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Valid Until (optional)
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={e => setValidUntil(e.target.value)}
                    className="rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button type="submit" disabled={submittingVersion}>
                    {submittingVersion ? 'Publishing…' : 'Publish Version & Trigger Revalidation'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsAddingVersion(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <p className="text-[11px] text-ink-muted">
                  * Publishing supersedes version {(source.current?.version ?? 1)} and automatically flags any dependent clearances in the Revalidation Queue.
                </p>
              </form>
            )}

            {/* Withdraw Form */}
            {isWithdrawing && (
              <form onSubmit={handleWithdraw} className="rounded-lg border border-red-pen/30 bg-red-pen-light/30 p-5 space-y-3">
                <h3 className="font-serif text-base font-semibold text-red-pen flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Withdraw Source
                </h3>
                <p className="text-xs text-ink-muted">
                  Withdrawing will immediately move all active clearances depending on this source to <strong>Revalidation required</strong>.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Reason for withdrawal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Feature discontinued or policy revoked"
                    value={withdrawReason}
                    onChange={e => setWithdrawReason(e.target.value)}
                    className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button type="submit" variant="danger" disabled={submittingWithdraw}>
                    {submittingWithdraw ? 'Withdrawing…' : 'Confirm Withdrawal'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsWithdrawing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Dependent Clearances */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-ink-muted" />
                Clearances Depending On Current Version ({detail?.clearances.length ?? source.clearanceCount})
              </h3>
              {loading ? (
                <div className="text-xs text-ink-muted py-2">Loading clearances…</div>
              ) : (detail?.clearances.length ?? 0) === 0 ? (
                <p className="text-xs text-ink-muted italic border border-line-soft rounded p-3">
                  No active clearances currently depend on this source version.
                </p>
              ) : (
                <div className="divide-y divide-line-soft border border-line-soft rounded-lg overflow-hidden bg-paper">
                  {detail?.clearances.map(c => (
                    <div key={c.clearance_id} className="p-3 text-xs flex items-center justify-between">
                      <div>
                        <strong className="text-ink text-sm block">{c.content_title}</strong>
                        <span className="text-ink-muted">Version {c.content_version} · Approved by {c.reviewer}</span>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-verdigris-light text-verdigris border border-verdigris/20 font-medium capitalize">
                        {c.state}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Version History */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1.5">
                <History className="h-4 w-4 text-ink-muted" />
                Version History ({detail?.versions.length ?? source.versionCount})
              </h3>
              {loading ? (
                <div className="text-xs text-ink-muted py-2">Loading history…</div>
              ) : (
                <ol className="relative border-l border-line-soft ml-3 space-y-4">
                  {detail?.versions.map(v => (
                    <li key={v.id} className="ml-5">
                      <span className="absolute -left-2 mt-1 h-3.5 w-3.5 rounded-full border-2 border-line-strong bg-paper" />
                      <div className="rounded border border-line-soft bg-paper p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-ink">
                            Version {v.version}
                          </span>
                          <SourceStatusChip status={v.status} />
                        </div>
                        <div className="font-mono text-ink text-xs bg-ink/[0.02] p-1.5 rounded">
                          {v.value.display ? String(v.value.display) : JSON.stringify(v.value)}
                        </div>
                        {v.change_note && (
                          <p className="text-ink-muted italic">
                            Note: {v.change_note}
                          </p>
                        )}
                        <p className="text-[11px] text-ink-muted">
                          Created by {v.created_by} on {v.effective_from || new Date(v.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
