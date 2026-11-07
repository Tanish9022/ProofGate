'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/components/ui/RoleSwitcher';
import { Sparkles, ArrowRight, CheckCircle2, ChevronRight, ChevronDown, RotateCcw, X, Info } from 'lucide-react';

const TOUR_STEPS = [
  {
    step: 1,
    title: '1. Check Marketing Copy',
    role: 'creator',
    roleBadge: 'Creator',
    desc: 'Load the sample poster to see claims extracted and 3 blockers flagged (trial length, uptime SLA, and guarantee term).',
    href: '/content/new',
    cta: 'Check Sample Poster',
  },
  {
    step: 2,
    title: '2. Resolve Blockers & Submit',
    role: 'creator',
    roleBadge: 'Creator',
    desc: 'Click "Apply fix" on blockers, then click "Submit for Review" in the header.',
    href: '/content',
    cta: 'Go to Content',
  },
  {
    step: 3,
    title: '3. Human Review & Clearance',
    role: 'reviewer',
    roleBadge: 'Reviewer',
    desc: 'Switch role to Reviewer and click "Approve" to lock source dependencies.',
    href: '/review',
    cta: 'Open Review Queue',
  },
  {
    step: 4,
    title: '4. Update Approved Fact',
    role: 'admin',
    roleBadge: 'Admin',
    desc: 'Switch to Admin, open Library, and supersede Pro price from Rs. 499 to Rs. 699.',
    href: '/library',
    cta: 'Open Source Library',
  },
  {
    step: 5,
    title: '5. Selective Revalidation',
    role: 'reviewer',
    roleBadge: 'Reviewer',
    desc: 'See ProofGate re-open only dependent clearances while historical facts stay cleared.',
    href: '/revalidation',
    cta: 'View Revalidation',
  },
];

export function DemoTourBanner() {
  const pathname = usePathname();
  const { role, setRole } = useRole();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Auto-detect step based on current page
  useEffect(() => {
    if (pathname === '/content/new') setCurrentStep(1);
    else if (pathname.startsWith('/content/') && pathname !== '/content/new') setCurrentStep(2);
    else if (pathname === '/review') setCurrentStep(3);
    else if (pathname === '/library') setCurrentStep(4);
    else if (pathname === '/revalidation') setCurrentStep(5);
  }, [pathname]);

  if (isDismissed) return null;

  const activeTour = TOUR_STEPS.find(s => s.step === currentStep) || TOUR_STEPS[0];
  const isCorrectRole = role === activeTour.role || role === 'admin';

  return (
    <aside aria-label="Interactive Demo Guide" className="bg-paper-warm border-b border-paper-line text-ink transition-all">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Guide Label & Progress */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-ink/5 border border-ink/10 text-xs font-mono font-semibold text-ink">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Guided Tour · Step {activeTour.step} of 5</span>
            </div>

            {/* Quick Step Indicators (dots) */}
            <div className="hidden sm:flex items-center gap-1">
              {TOUR_STEPS.map(s => (
                <button
                  key={s.step}
                  onClick={() => setCurrentStep(s.step)}
                  className={[
                    'h-2 rounded-full transition-all',
                    s.step === activeTour.step
                      ? 'w-6 bg-accent'
                      : s.step < activeTour.step
                      ? 'w-2 bg-emerald-600'
                      : 'w-2 bg-ink/20 hover:bg-ink/40',
                  ].join(' ')}
                  title={`Step ${s.step}: ${s.title}`}
                />
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1 rounded hover:bg-ink/5"
            >
              <span>{isCollapsed ? 'Show Tour Guide' : 'Collapse'}</span>
              {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 rotate-90" />}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-ink-muted hover:text-ink p-1 rounded hover:bg-ink/5"
              title="Dismiss Guide"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded Tour Body */}
        {!isCollapsed && (
          <div className="mt-2.5 pt-2.5 border-t border-paper-line/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <span>{activeTour.title}</span>
                <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded bg-ink/10 text-ink">
                  Role: {activeTour.roleBadge}
                </span>
              </div>
              <p className="text-ink-muted leading-tight max-w-xl">
                {activeTour.desc}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Role Helper if in wrong role */}
              {!isCorrectRole && (
                <button
                  onClick={() => setRole(activeTour.role as any)}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  Switch to {activeTour.roleBadge}
                </button>
              )}

              {/* Direct Next Link */}
              <Link
                href={activeTour.href}
                className="px-3 py-1 text-xs font-semibold rounded bg-ink text-paper hover:bg-ink/90 transition-colors inline-flex items-center gap-1 shadow-xs"
              >
                <span>{activeTour.cta}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

