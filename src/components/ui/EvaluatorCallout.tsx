'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronDown, ChevronUp, CheckCircle2, ArrowRight, ShieldCheck, Info } from 'lucide-react';

export interface EvaluatorCalloutStep {
  step: number | string;
  title: string;
  instruction: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface EvaluatorCalloutProps {
  title: string;
  badge?: string;
  improvementNumber?: 1 | 2 | 3;
  summary: string;
  steps: EvaluatorCalloutStep[];
  keyInvariant?: string;
  metricBadge?: {
    label: string;
    value: string;
  };
  defaultOpen?: boolean;
}

export function EvaluatorCallout({
  title,
  badge = 'Judge & Evaluator Guide',
  improvementNumber,
  summary,
  steps,
  keyInvariant,
  metricBadge,
  defaultOpen = true,
}: EvaluatorCalloutProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <aside
      aria-label="Judge and Evaluator Guide"
      className="mb-8 rounded-xl border border-accent/20 bg-gradient-to-r from-paper-warm via-paper to-paper-warm shadow-xs overflow-hidden transition-all"
    >
      {/* Banner Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-paper-line/70">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-mono font-semibold text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{badge}</span>
          </div>

          {improvementNumber && (
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
              Improvement {improvementNumber}
            </span>
          )}

          <h2 className="text-sm font-semibold text-ink tracking-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {metricBadge && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="text-ink-muted">{metricBadge.label}:</span>
              <strong>{metricBadge.value}</strong>
            </div>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1 rounded hover:bg-ink/5 transition-colors"
          >
            <span>{isOpen ? 'Collapse' : 'Show Guide'}</span>
            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-5 space-y-4 text-xs">
          <p className="text-sm text-ink leading-relaxed">
            {summary}
          </p>

          {/* Verification Steps Grid */}
          <div>
            <h3 className="text-[11px] font-mono uppercase font-semibold text-ink-muted tracking-wider mb-2.5">
              How to Test in 60 Seconds:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {steps.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-paper-line bg-paper/80 flex flex-col justify-between space-y-2 hover:border-ink/20 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 font-semibold text-ink">
                      <span className="w-5 h-5 rounded-full bg-ink/5 border border-ink/15 font-mono text-[11px] flex items-center justify-center text-ink shrink-0">
                        {s.step}
                      </span>
                      <span>{s.title}</span>
                    </div>
                    <p className="text-ink-muted text-[11px] leading-relaxed">
                      {s.instruction}
                    </p>
                  </div>

                  {s.action && (
                    <div className="pt-2 border-t border-paper-line/60">
                      {s.action.href ? (
                        <Link
                          href={s.action.href}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                        >
                          <span>{s.action.label}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : s.action.onClick ? (
                        <button
                          onClick={s.action.onClick}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                        >
                          <span>{s.action.label}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Key Invariant Callout */}
          {keyInvariant && (
            <div className="mt-3 rounded-lg border border-paper-line/80 bg-paper-warm/50 p-3 flex items-start gap-2.5 text-xs text-ink-muted">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink font-semibold">Architectural Invariant: </strong>
                <span>{keyInvariant}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
