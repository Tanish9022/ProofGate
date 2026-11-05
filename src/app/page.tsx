import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, FileCheck, RefreshCw, History, ArrowRight, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

const DEMO_STEPS = [
  {
    step: '1',
    role: 'Admin',
    roleColor: 'bg-accent/10 text-accent border-accent/20',
    title: 'Source Library (Single Source of Truth)',
    description: 'Browse approved facts, pricing plans, and brand guidelines. Notice brightdesk.pricing.pro_monthly is currently Rs. 499.',
    link: '/library',
    cta: 'Explore Sources',
  },
  {
    step: '2',
    role: 'Creator',
    roleColor: 'bg-ink/5 text-ink-muted border-ink/10',
    title: 'Content Ingestion & Deterministic Checking',
    description: 'Submit or paste marketing copy (e.g. Sample A - Promotional Poster). AI extracts claims with verbatim quotes; deterministic code checks prices and terms.',
    link: '/content/new',
    cta: 'Check Sample Poster',
  },
  {
    step: '3',
    role: 'Creator',
    roleColor: 'bg-ink/5 text-ink-muted border-ink/10',
    title: 'Resolve Findings & Submit for Review',
    description: 'Review findings (e.g. outdated price Rs. 449, banned superlative "best"). Fix errors, dismiss with justification if needed, and submit for clearance.',
    link: '/content',
    cta: 'View Content Drafts',
  },
  {
    step: '4',
    role: 'Reviewer',
    roleColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    title: 'Human Clearance & Dependency Tracing',
    description: 'Switch role to Reviewer. Inspect claims and evidence. Approve to mint an immutable Clearance certificate locking confirmed source version dependencies.',
    link: '/review',
    cta: 'Open Review Queue',
  },
  {
    step: '5',
    role: 'Admin',
    roleColor: 'bg-accent/10 text-accent border-accent/20',
    title: 'Fact Update & Selective Revalidation',
    description: 'Switch to Admin and update Pro pricing to Rs. 699. ProofGate traces dependency graphs and flags only dependent content for revalidation while historical quotes stay cleared.',
    link: '/revalidation',
    cta: 'View Revalidation Queue',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero Header */}
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-accent/10 text-accent border border-accent/20 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
          CodeNexus India 2026 · Round 2 · Team MANTIS
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl leading-tight font-normal text-ink tracking-tight">
          Verify marketing content against approved facts.
          <span className="block italic text-ink/70 mt-1">Keep approvals honest when facts change.</span>
        </h1>

        <p className="mt-5 text-lg text-ink-muted leading-relaxed max-w-2xl">
          ProofGate separates probabilistic claim extraction from deterministic verification.
          Every approval records an exact dependency graph—triggering selective revalidation only when underlying sources change.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/content/new">
            <Button size="lg" className="shadow-sm">
              <FileCheck className="w-4 h-4 mr-2" />
              Check Sample Content
            </Button>
          </Link>
          <Link href="/library">
            <Button variant="secondary" size="lg">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Browse Source Library
            </Button>
          </Link>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-paper-line bg-paper shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-mono font-bold text-sm mb-4">
            AI
          </div>
          <h3 className="font-serif text-lg font-medium text-ink mb-2">AI Proposes Claims</h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Gemini parses PDFs, DOCX, images, and text. Extracts claims with exact verbatim quotes and categorizes context (current vs historical vs quote).
          </p>
        </div>

        <div className="p-6 rounded-xl border border-paper-line bg-paper shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-mono font-bold text-sm mb-4">
            TS
          </div>
          <h3 className="font-serif text-lg font-medium text-ink mb-2">Code Decides Truth</h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Strict TypeScript rules compare numbers, currencies, dates, and terminology. A generative model never decides if a number matches.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-paper-line bg-paper shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-mono font-bold text-sm mb-4">
            Graph
          </div>
          <h3 className="font-serif text-lg font-medium text-ink mb-2">Selective Revalidation</h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Clearances lock exact source version IDs. When a source changes, only confirmed active dependencies are reopened. Historical facts stay safe.
          </p>
        </div>
      </div>

      {/* 5-Step Guided Demo Flow */}
      <section className="mt-16 pt-12 border-t border-paper-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
          <div>
            <h2 className="font-serif text-2xl font-normal text-ink">5-Minute Interactive Demo</h2>
            <p className="text-sm text-ink-muted mt-1">
              Experience the end-to-end lifecycle of content verification, clearance, and revalidation.
            </p>
          </div>
          <div className="text-xs font-mono text-ink-muted bg-paper-warm px-3 py-1.5 rounded-lg border border-paper-line">
            Role Switcher active in top right
          </div>
        </div>

        <div className="space-y-4">
          {DEMO_STEPS.map((step) => (
            <div
              key={step.step}
              className="p-5 rounded-xl border border-paper-line bg-paper hover:border-ink/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <span className="w-8 h-8 rounded-full border-2 border-paper-line font-mono font-bold text-sm flex items-center justify-center text-ink shrink-0 mt-0.5">
                  {step.step}
                </span>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold uppercase rounded border ${step.roleColor}`}>
                      Role: {step.role}
                    </span>
                    <h3 className="text-base font-medium text-ink">{step.title}</h3>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed max-w-2xl">
                    {step.description}
                  </p>
                </div>
              </div>

              <div className="md:shrink-0 pl-12 md:pl-0">
                <Link href={step.link}>
                  <Button variant="secondary" size="sm" className="w-full md:w-auto">
                    <span>{step.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Navigation Footer */}
      <div className="mt-16 pt-8 border-t border-paper-line flex flex-wrap items-center justify-between text-xs text-ink-muted gap-4">
        <div className="flex items-center gap-4">
          <Link href="/library" className="hover:text-ink hover:underline">Source Library</Link>
          <span>·</span>
          <Link href="/content" className="hover:text-ink hover:underline">Content Workspace</Link>
          <span>·</span>
          <Link href="/review" className="hover:text-ink hover:underline">Review Queue</Link>
          <span>·</span>
          <Link href="/revalidation" className="hover:text-ink hover:underline">Revalidation</Link>
          <span>·</span>
          <Link href="/audit" className="hover:text-ink hover:underline">Audit Trail</Link>
        </div>

        <div>
          ProofGate · CodeNexus 2026 MANTIS
        </div>
      </div>
    </div>
  );
}
