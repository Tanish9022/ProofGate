'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Seal } from '@/components/ui/StatusChip';
import { useToast } from '@/components/ui/Toast';
import {
  ShieldCheck,
  ArrowLeft,
  Printer,
  Calendar,
  User,
  Hash,
  ExternalLink,
  Layers,
  FileText,
} from 'lucide-react';
import type { ClearanceRecord } from '@/server/services/clearance';

export default function ClearanceRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const clearanceId = resolvedParams.id;

  const showToast = useToast();
  const [clearance, setClearance] = useState<ClearanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clearances/${clearanceId}`)
      .then(res => {
        if (!res.ok) throw new Error('Clearance record not found');
        return res.json();
      })
      .then((data: ClearanceRecord) => {
        setClearance(data);
        setLoading(false);
      })
      .catch(err => {
        showToast(err.message, 'error');
        setLoading(false);
      });
  }, [clearanceId]);

  if (loading && !clearance) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-ink-muted">
        Loading official clearance record…
      </div>
    );
  }

  if (!clearance) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-red-pen font-medium mb-4">Clearance record not found.</p>
        <Link href="/review"><Button variant="secondary">Back to Review</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 print:p-0 print:m-0 print:max-w-none print:w-full">
      {/* Navigation & Print Actions */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/review"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Review queue
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/content/${clearance.content_id}`}>
            <Button size="sm" variant="secondary">
              <FileText className="h-4 w-4 mr-1.5" />
              View Content
            </Button>
          </Link>
          <Button size="sm" variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print Clearance
          </Button>
        </div>
      </div>

      {/* Main Certificate / Record Document */}
      <div className="rounded-2xl border border-line-soft bg-paper shadow-sm overflow-hidden print:border print:border-gray-300 print:rounded-lg print:shadow-none print:bg-white print:text-black">
        {/* Certificate Header Banner */}
        <div className="border-b border-line-soft bg-ink/[0.02] p-8 print:p-6 print:bg-white print:border-b print:border-gray-300 print-avoid-break">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-light text-indigo border border-indigo/20 uppercase tracking-widest print:bg-gray-100 print:text-black print:border-gray-400">
                  Official Clearance Certificate
                </span>
                <span className="font-mono text-xs text-ink-muted print:text-gray-600">
                  ID: {clearance.id.slice(0, 8)}
                </span>
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-ink print:text-black">
                {clearance.content_title}
              </h1>
              <p className="text-sm text-ink-muted mt-1 font-mono print:text-gray-600">
                Content Version {clearance.version}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Seal state={clearance.state} />
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-line-soft text-xs print:border-gray-200">
            <div>
              <span className="text-ink-muted block flex items-center gap-1 print:text-gray-500">
                <User className="h-3.5 w-3.5" /> Reviewer
              </span>
              <strong className="text-ink mt-0.5 block print:text-black">{clearance.reviewer}</strong>
            </div>

            <div>
              <span className="text-ink-muted block flex items-center gap-1 print:text-gray-500">
                <Calendar className="h-3.5 w-3.5" /> Approval Date
              </span>
              <strong className="text-ink mt-0.5 block print:text-black">
                {new Date(clearance.decided_at).toLocaleString()}
              </strong>
            </div>

            <div>
              <span className="text-ink-muted block flex items-center gap-1 print:text-gray-500">
                <Layers className="h-3.5 w-3.5" /> Source Dependencies
              </span>
              <strong className="text-ink mt-0.5 block print:text-black">
                {clearance.dependencies.length} confirmed source{clearance.dependencies.length === 1 ? '' : 's'}
              </strong>
            </div>

            <div>
              <span className="text-ink-muted block flex items-center gap-1 print:text-gray-500">
                <Hash className="h-3.5 w-3.5" /> Content Hash
              </span>
              <span className="font-mono text-[11px] text-ink truncate block print:text-black" title={clearance.file_hash}>
                {clearance.file_hash ? `${clearance.file_hash.slice(0, 12)}…` : 'Direct text'}
              </span>
            </div>
          </div>
        </div>

        {/* Reviewer Comment Sign-off */}
        {clearance.comment && (
          <div className="p-8 border-b border-line-soft bg-paper print:p-6 print:bg-white print:border-b print:border-gray-300 print-avoid-break">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2 print:text-gray-600">
              Reviewer Sign-off Statement
            </h2>
            <blockquote className="rounded-lg border-l-4 border-verdigris bg-verdigris-light/30 p-4 text-sm text-ink italic font-serif print:bg-gray-50 print:border-emerald-700 print:text-black">
              &ldquo;{clearance.comment}&rdquo;
            </blockquote>
          </div>
        )}

        {/* Approved Content Text */}
        <div className="p-8 border-b border-line-soft bg-paper print:p-6 print:bg-white print:border-b print:border-gray-300 print-avoid-break">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2 print:text-gray-600">
            Approved Content Text
          </h2>
          <div className="rounded-lg border border-line-soft bg-ink/[0.02] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink print:bg-gray-50 print:border-gray-300 print:text-black">
            {clearance.text}
          </div>
        </div>

        {/* Locked Dependencies Table */}
        <div className="p-8 space-y-4 bg-paper print:p-6 print:bg-white print-avoid-break">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted print:text-black">
              Source Version Dependencies ({clearance.dependencies.length})
            </h2>
            <p className="text-xs text-ink-muted mt-1 print:text-gray-600">
              This clearance explicitly depends on the exact source versions below. If any of these sources are superseded, expired, or withdrawn, this clearance will automatically reopen for revalidation.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-line-soft print:rounded-md print:border print:border-gray-300">
            <table className="w-full text-left text-sm print:text-xs">
              <thead className="border-b border-line-soft bg-ink/[0.02] text-xs font-semibold uppercase tracking-wider text-ink-muted print:bg-gray-100 print:text-black print:border-b print:border-gray-300">
                <tr>
                  <th scope="col" className="px-4 py-3">Source Title</th>
                  <th scope="col" className="px-3 py-3 text-center">Locked Version</th>
                  <th scope="col" className="px-4 py-3">Value at Approval</th>
                  <th scope="col" className="px-4 py-3">Claim Quote</th>
                  <th scope="col" className="px-3 py-3 text-right">Link Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft text-xs print:divide-gray-200">
                {clearance.dependencies.map(d => {
                  const val = d.source_value?.display
                    ? String(d.source_value.display)
                    : d.source_value?.text
                    ? String(d.source_value.text)
                    : d.source_value?.pattern
                    ? `Pattern: ${d.source_value.pattern}`
                    : JSON.stringify(d.source_value);

                  return (
                    <tr key={d.id} className="hover:bg-ink/[0.01] print:bg-white">
                      <td className="px-4 py-3 font-medium text-ink print:text-black">
                        <Link href="/library" className="hover:text-indigo hover:underline flex items-center gap-1 print:no-underline">
                          {d.source_title}
                          <ExternalLink className="h-3 w-3 text-ink-muted print:hidden" />
                        </Link>
                        <span className="font-mono text-[11px] text-ink-muted block print:text-gray-500">{d.source_key}</span>
                      </td>

                      <td className="px-3 py-3 text-center font-mono font-bold text-ink print:text-black">
                        v{d.source_version}
                      </td>

                      <td className="px-4 py-3 font-mono text-ink print:text-black">
                        {val}
                      </td>

                      <td className="px-4 py-3 font-mono text-ink-muted print:text-gray-700">
                        {d.quote ? `"${d.quote}"` : '—'}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-verdigris-light text-verdigris border border-verdigris/20 font-medium capitalize print:bg-gray-100 print:text-black print:border-gray-400">
                          {d.link_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Seal */}
        <div className="border-t border-line-soft bg-ink/[0.02] p-6 text-center text-xs text-ink-muted print:bg-white print:border-t print:border-gray-300 print:p-4 print:text-gray-600 print-avoid-break">
          ProofGate Verification Engine · Proof of approval and dependency ledger
        </div>
      </div>
    </div>
  );
}

