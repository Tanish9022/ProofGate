'use client';

import { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useRole } from '@/components/ui/RoleSwitcher';
import { Button } from '@/components/ui/Button';
import { Seal } from '@/components/ui/StatusChip';
import { useToast } from '@/components/ui/Toast';
import { HighlightedText } from '@/components/content/HighlightedText';
import { FindingCard } from '@/components/content/FindingCard';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  RotateCw,
  Send,
  Layers,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import type { ContentDetail, FindingRow } from '@/server/services/content';

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const contentId = resolvedParams.id;

  const { role } = useRole();
  const showToast = useToast();

  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);

  // Re-check / Analyze state
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Send for review state
  const [sendingForReview, setSendingForReview] = useState(false);

  const fetchContent = async (verNum?: number) => {
    setLoading(true);
    try {
      const url = verNum ? `/api/content/${contentId}?v=${verNum}` : `/api/content/${contentId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Could not load content');
      const data = await res.json() as ContentDetail;
      setDetail(data);
      setSelectedVersion(data.activeVersion.version);
      setEditText(data.activeVersion.text);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error loading content', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [contentId]);

  // Apply fix directly into the editor text
  const handleApplyFix = (quote: string, fixText: string) => {
    if (!detail) return;
    // Extract raw text to replace
    // Fix string may be "Change to '...'." -> extract inner or replace
    const cleanFix = fixText.replace(/^Change to "(.*)"\.$/, '$1').replace(/^Replace with "(.*)"\.$/, '$1');
    const newText = editText.replace(quote, cleanFix);
    setEditText(newText);
    setIsEditing(true);
    showToast(`Applied fix: "${cleanFix}". Review and save new version to re-check.`, 'info');
  };

  // Save as new version and run analysis
  const handleSaveAndRecheck = async () => {
    if (!detail || !editText.trim()) return;
    setSavingVersion(true);
    try {
      // 1. Create new version
      const verRes = await fetch(`/api/content/${contentId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': role,
        },
        body: JSON.stringify({ text: editText.trim() }),
      });

      if (!verRes.ok) {
        const err = await verRes.json();
        throw new Error(err.error?.message || 'Failed to create new version');
      }

      const verData = await verRes.json() as { versionId: string; versionNumber: number };

      // 2. Automatically analyze new version
      setIsAnalyzing(true);
      const analyzeRes = await fetch(`/api/content/${contentId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': role,
        },
        body: JSON.stringify({ versionId: verData.versionId }),
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error?.message || 'Failed to analyze new version');
      }

      showToast(`Version ${verData.versionNumber} saved and re-checked!`, 'success');
      setIsEditing(false);
      await fetchContent(verData.versionNumber);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error saving version', 'error');
    } finally {
      setSavingVersion(false);
      setIsAnalyzing(false);
    }
  };

  // Send for review
  const handleSendForReview = async () => {
    if (!detail) return;
    setSendingForReview(true);
    try {
      const res = await fetch(`/api/content/${contentId}/submit-for-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': role,
        },
        body: JSON.stringify({ versionId: activeVer.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to submit for review');
      }

      showToast('Submitted for review! Switch role to Reviewer to approve.', 'success');
      await fetchContent(activeVer.version);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error submitting for review', 'error');
    } finally {
      setSendingForReview(false);
    }
  };

  // Group findings by severity
  const groupedFindings = useMemo(() => {
    if (!detail) return { blockers: [], warnings: [], info: [] };
    const blockers: FindingRow[] = [];
    const warnings: FindingRow[] = [];
    const info: FindingRow[] = [];

    for (const f of detail.findings) {
      if (f.severity === 'blocker') blockers.push(f);
      else if (f.severity === 'warning') warnings.push(f);
      else info.push(f);
    }

    return { blockers, warnings, info };
  }, [detail]);

  const unresolvedBlockers = useMemo(() => {
    return groupedFindings.blockers.filter(
      f => !f.creator_action || f.creator_action === 'edited'
    ).length;
  }, [groupedFindings.blockers]);

  if (loading && !detail) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-ink-muted">
        Loading content piece and running analysis…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-red-pen font-medium mb-4">Content not found.</p>
        <Link href="/content"><Button variant="secondary">Back to content list</Button></Link>
      </div>
    );
  }

  const activeVer = detail.activeVersion;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 pb-24">
      {/* Back Link & Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/content"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to all content
        </Link>

        {/* Version Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-muted">Version:</span>
          {detail.versions.map(v => (
            <button
              key={v.id}
              onClick={() => fetchContent(v.version)}
              className={[
                'rounded px-2.5 py-1 text-xs font-mono font-medium transition-colors',
                v.version === selectedVersion
                  ? 'bg-ink text-paper'
                  : 'bg-paper text-ink border border-line-strong hover:bg-ink/[0.04]',
              ].join(' ')}
            >
              v{v.version}
            </button>
          ))}
        </div>
      </div>

      {/* Title & Metadata Banner */}
      <div className="mb-8 border-b border-line-soft pb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              {detail.title}
            </h1>
            <Seal state={activeVer.state as any} />
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Created by <strong className="text-ink">{detail.created_by}</strong> on {new Date(activeVer.created_at).toLocaleDateString()}
            {activeVer.file_name && (
              <span className="ml-2 font-mono">
                · File: {activeVer.file_name}
              </span>
            )}
          </p>
        </div>

        {/* Quick action: Edit or Re-check */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => { setIsEditing(true); setEditText(activeVer.text); }}
            >
              <Edit3 className="h-4 w-4 mr-1.5" />
              Edit text
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(false)}
            >
              Cancel editing
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleSaveAndRecheck()}
            disabled={isAnalyzing || savingVersion}
          >
            <RotateCw className={`h-4 w-4 mr-1.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Re-check
          </Button>

          {activeVer.state === 'draft' && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleSendForReview}
              disabled={sendingForReview || unresolvedBlockers > 0}
              title={
                unresolvedBlockers > 0
                  ? `${unresolvedBlockers} unresolved blocker(s) must be fixed or dismissed first`
                  : 'Submit this version to the Review Queue'
              }
            >
              <Send className="h-4 w-4 mr-1.5" />
              {sendingForReview ? 'Submitting…' : 'Submit for Review'}
            </Button>
          )}

          {activeVer.state === 'in_review' && (
            <Link href="/review">
              <Button size="sm" variant="primary" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Send className="h-4 w-4 mr-1.5" />
                Open Review Queue
              </Button>
            </Link>
          )}

          {activeVer.state === 'cleared' && (
            <Link href="/clearances">
              <Button size="sm" variant="secondary" className="border-emerald-300 text-emerald-800 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
                View Clearance Certificate
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Content Text */}
        <section className="lg:col-span-7 space-y-4" aria-labelledby="content-view-heading">
          <div className="flex items-center justify-between">
            <h2 id="content-view-heading" className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
              {isEditing ? 'Editing Copy (Will Save as Next Version)' : `Content Copy (v${activeVer.version})`}
            </h2>
            <span className="text-xs text-ink-muted">
              {isEditing ? 'Click Save to re-check' : 'Click highlighted words to jump to finding'}
            </span>
          </div>

          <div className="rounded-xl border border-line-soft bg-paper shadow-sm overflow-hidden">
            {isEditing ? (
              <div className="p-4 space-y-4">
                <textarea
                  rows={10}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="w-full rounded-lg border border-line-strong bg-paper p-3 text-sm font-mono text-ink focus:border-indigo"
                />
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={handleSaveAndRecheck}
                    disabled={savingVersion || isAnalyzing || !editText.trim()}
                  >
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    {savingVersion ? 'Saving & Checking…' : `Save as v${detail.versions[0].version + 1} and re-check`}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { setIsEditing(false); setEditText(activeVer.text); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-paper">
                <HighlightedText
                  text={activeVer.text}
                  findings={detail.findings}
                  selectedFindingId={selectedFindingId}
                  onSelectFinding={id => {
                    setSelectedFindingId(id);
                    const el = document.getElementById(`finding-${id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                />
              </div>
            )}
          </div>

          {/* AI Status Banner */}
          {!activeVer.ai_available && (
            <div className="rounded-lg border border-amber/30 bg-amber-light p-3.5 text-xs text-ink flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink font-semibold">Deterministic mode used:</strong> AI claims pipeline was unavailable, so regex extractors were used. Findings were deterministically verified against approved sources.
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Findings Inspector */}
        <section className="lg:col-span-5 space-y-6" aria-labelledby="findings-heading">
          {/* Summary Box */}
          <div className="rounded-xl border border-line-soft bg-paper p-4 shadow-sm flex items-center justify-between">
            <h2 id="findings-heading" className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
              Findings ({detail.findings.length})
            </h2>

            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-red-pen">
                {groupedFindings.blockers.length} Blocker{groupedFindings.blockers.length === 1 ? '' : 's'}
              </span>
              <span className="text-line-strong">·</span>
              <span className="font-semibold text-amber">
                {groupedFindings.warnings.length} Warning{groupedFindings.warnings.length === 1 ? '' : 's'}
              </span>
              <span className="text-line-strong">·</span>
              <span className="font-semibold text-verdigris">
                {groupedFindings.info.length} OK
              </span>
            </div>
          </div>

          {/* Findings List */}
          {detail.findings.length === 0 ? (
            <div className="rounded-xl border border-verdigris/30 bg-verdigris-light/30 p-8 text-center text-sm text-verdigris">
              <CheckCircle2 className="mx-auto h-8 w-8 mb-2" />
              <p className="font-semibold">All checks passed!</p>
              <p className="text-xs text-ink-muted mt-1">
                No contradicted claims, banned terms, or unverified claims found.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Blockers */}
              {groupedFindings.blockers.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-red-pen flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Blockers — must be fixed or dismissed with reason</span>
                  </div>
                  {groupedFindings.blockers.map(f => (
                    <FindingCard
                      key={f.id}
                      finding={f}
                      isSelected={f.id === selectedFindingId}
                      onApplyFix={handleApplyFix}
                      onActionUpdated={() => fetchContent(selectedVersion || undefined)}
                    />
                  ))}
                </div>
              )}

              {/* Warnings */}
              {groupedFindings.warnings.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Warnings — unverified claims or spelling suggestions</span>
                  </div>
                  {groupedFindings.warnings.map(f => (
                    <FindingCard
                      key={f.id}
                      finding={f}
                      isSelected={f.id === selectedFindingId}
                      onApplyFix={handleApplyFix}
                      onActionUpdated={() => fetchContent(selectedVersion || undefined)}
                    />
                  ))}
                </div>
              )}

              {/* Supported / Info */}
              {groupedFindings.info.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-verdigris flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Supported — confirmed links to approved sources</span>
                  </div>
                  {groupedFindings.info.map(f => (
                    <FindingCard
                      key={f.id}
                      finding={f}
                      isSelected={f.id === selectedFindingId}
                      onActionUpdated={() => fetchContent(selectedVersion || undefined)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Sticky Bottom Bar for Creators */}
      <aside aria-label="Action status" className="fixed bottom-0 inset-x-0 z-30 border-t border-line-soft bg-paper/95 backdrop-blur-sm p-4 shadow-lg">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            {unresolvedBlockers > 0 ? (
              <span className="flex items-center gap-1.5 font-semibold text-red-pen">
                <ShieldAlert className="h-4 w-4" />
                {unresolvedBlockers} unresolved blocker{unresolvedBlockers > 1 ? 's' : ''} remaining. Must be fixed or dismissed before review.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-verdigris">
                <CheckCircle2 className="h-4 w-4" />
                All blockers resolved. Content is ready to submit for review.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSendForReview}
              disabled={unresolvedBlockers > 0 || sendingForReview}
              title={
                unresolvedBlockers > 0
                  ? 'Resolve all blocker findings before sending for review'
                  : 'Send to reviewer'
              }
            >
              <Send className="h-4 w-4 mr-1.5" />
              Send for review
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

