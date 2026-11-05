'use client';

import { useState } from 'react';
import { useRole } from '@/components/ui/RoleSwitcher';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { X, Plus } from 'lucide-react';
import type { SourceKind } from '@/server/services/sources';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceCreated: () => void;
}

export function AddSourceModal({ isOpen, onClose, onSourceCreated }: AddSourceModalProps) {
  const { role } = useRole();
  const showToast = useToast();

  const [kind, setKind] = useState<SourceKind>('fact');
  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Value fields
  const [factNumber, setFactNumber] = useState<number | ''>('');
  const [factUnit, setFactUnit] = useState('');
  const [factDisplay, setFactDisplay] = useState('');
  const [guidelineText, setGuidelineText] = useState('');
  const [termType, setTermType] = useState<'banned' | 'spelling'>('banned');
  const [termPattern, setTermPattern] = useState('');
  const [termMessage, setTermMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let valObject: Record<string, unknown> = {};
    if (kind === 'fact') {
      valObject = {
        number: typeof factNumber === 'number' ? factNumber : 0,
        unit: factUnit,
        display: factDisplay || `${factNumber} ${factUnit}`,
      };
    } else if (kind === 'guideline') {
      valObject = { text: guidelineText };
    } else {
      valObject = {
        type: termType,
        pattern: termPattern,
        message: termMessage,
      };
    }

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': role,
        },
        body: JSON.stringify({
          kind,
          key: key.trim().toLowerCase(),
          title: title.trim(),
          owner: owner.trim(),
          value: valObject,
          validUntil: validUntil || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to create source');
      }

      showToast(`Source "${title}" created successfully.`, 'success');
      onSourceCreated();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error creating source', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-[2px] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-lg rounded-xl border border-line-soft bg-paper shadow-dialog overflow-hidden"
      >
        <div className="border-b border-line-soft p-5 flex items-center justify-between">
          <h2 id="modal-title" className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo" />
            Add New Approved Source
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-ink-muted hover:bg-ink/[0.06] hover:text-ink"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Kind
              </label>
              <select
                value={kind}
                onChange={e => setKind(e.target.value as SourceKind)}
                className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
              >
                <option value="fact">Fact (numeric / SLA / price)</option>
                <option value="term">Term (banned / spelling)</option>
                <option value="guideline">Guideline (tone / style)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Unique Key *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. enterprise_price"
                value={key}
                onChange={e => setKey(e.target.value)}
                className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm font-mono text-ink"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Enterprise Plan Pricing"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Owner / Department *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pricing team"
                value={owner}
                onChange={e => setOwner(e.target.value)}
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
                className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
              />
            </div>
          </div>

          {/* Dynamic Value Fields */}
          <div className="rounded-lg border border-line-soft bg-ink/[0.02] p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Approved Value (Version 1)
            </h3>

            {kind === 'fact' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Number
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 999"
                      value={factNumber}
                      onChange={e => {
                        const n = e.target.value === '' ? '' : parseFloat(e.target.value);
                        setFactNumber(n);
                        if (factUnit) setFactDisplay(`${n} ${factUnit}`);
                      }}
                      className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm font-mono text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INR_per_user_month"
                      value={factUnit}
                      onChange={e => setFactUnit(e.target.value)}
                      className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm font-mono text-ink"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Display String
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rs. 999 per user per month"
                    value={factDisplay}
                    onChange={e => setFactDisplay(e.target.value)}
                    className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
                  />
                </div>
              </>
            )}

            {kind === 'guideline' && (
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Guideline Statement *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Always maintain an encouraging, empathetic tone with clear next steps."
                  value={guidelineText}
                  onChange={e => setGuidelineText(e.target.value)}
                  className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
                />
              </div>
            )}

            {kind === 'term' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Term Rule Type
                  </label>
                  <select
                    value={termType}
                    onChange={e => setTermType(e.target.value as 'banned' | 'spelling')}
                    className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
                  >
                    <option value="banned">Banned pattern</option>
                    <option value="spelling">Spelling / Trademark</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Regex Pattern / Target String *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. guaranteed|100% secure"
                    value={termPattern}
                    onChange={e => setTermPattern(e.target.value)}
                    className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm font-mono text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Guidance Message *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Avoid unprovable guarantees"
                    value={termMessage}
                    onChange={e => setTermMessage(e.target.value)}
                    className="w-full rounded border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line-soft">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Source'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
