import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, FileCheck, RefreshCw, History, ArrowRight, CheckCircle2, AlertTriangle, Eye, Sparkles, Image as ImageIcon, BarChart3 } from 'lucide-react';

const DEMO_STEPS = [
  {
    step: '1',
    role: 'Admin',
    roleColor: 'bg-accent/10 text-accent border-accent/20',
    title: 'Source Library (Single Source of Truth)',
    description: 'Browse approved facts, pricing plans, brand guidelines, and visual asset palettes. Notice pro_price is currently Rs. 499.',
    link: '/library',
    cta: 'Explore Sources',
  },
  {
    step: '2',
    role: 'Creator',
    roleColor: 'bg-ink/5 text-ink-muted border-ink/10',
    title: 'Content Ingestion & Claim Extraction',
    description: 'Submit marketing copy (e.g. Sample A - Promotional Poster). AI extracts claims with exact verbatim quotes; deterministic code checks prices and terms.',
    link: '/content/new',
    cta: 'Check Sample Poster',
  },
  {
    step: '3',
    role: 'Creator',
    roleColor: 'bg-ink/5 text-ink-muted border-ink/10',
    title: 'Resolve Findings & Test Image Checker',
    description: 'Review the 3 blockers: 30-day trial (approved 14), 100% uptime (approved 99.9%), and guarantee term. Apply fixes or test the Brand & Accessibility image checker.',
    link: '/content',
    cta: 'View Content Drafts',
  },
  {
    step: '4',
    role: 'Reviewer',
    roleColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    title: 'Human Clearance & Needs-Confirming Queue',
    description: 'Switch role to Reviewer. Confirm or reject probable links before clearance. Approve to record clearance pointing at exact source versions.',
    link: '/review',
    cta: 'Open Review Queue',
  },
  {
    step: '5',
    role: 'Admin',
    roleColor: 'bg-accent/10 text-accent border-accent/20',
    title: 'Fact Update & Selective Revalidation',
    description: 'Switch to Admin and supersede Pro price to Rs. 699. ProofGate flags only dependent content for revalidation while historical quotes stay cleared in "Not Affected".',
    link: '/revalidation',
    cta: 'View Revalidation Queue',
  },
  {
    step: '6',
    role: 'All Roles',
    roleColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    title: 'Benchmark Precision Report (Improvement 1)',
    description: 'Run the 50-case gold benchmark live to verify measured precision (94.1%), recall (100%), and accuracy (97.5%) with zero test-specific code paths.',
    link: '/evaluation',
    cta: 'Run Benchmark',
  },
  {
    step: '7',
    role: 'Admin',
    roleColor: 'bg-amber-50 text-amber-700 border-amber-200',
    title: 'Governance Insights & Rule Clarification (Improvement 3)',
    description: 'View 6 live operational metrics on /insights. The automated detector flags rules with >=40% creator dismissal rates, and Gemini drafts clarified rule text with what-if impact.',
    link: '/insights',
    cta: 'Explore Insights',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero Header */}
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-accent/10 text-accent border border-accent/20 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
          CodeNexus India 2026 · Round 3 (Final Product) · Team MANTIS
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

      {/* Round 3 Improvements & Evaluator Guide */}
      <section className="mt-16 pt-12 border-t border-paper-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-accent/10 text-accent mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Round 3 Evaluator Showcase
            </div>
            <h2 className="font-serif text-2xl font-normal text-ink">The Three Round 3 Improvements</h2>
            <p className="text-sm text-ink-muted mt-1">
              Deep, working implementations delivering exactly what was committed to at the end of Round 2.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Improvement 1 */}
          <div className="p-5 rounded-xl border border-paper-line bg-paper flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                IMPROVEMENT 1
              </span>
              <h3 className="font-serif text-base font-semibold text-ink mt-2 mb-1.5">
                Context-Aware Dependencies & Precision
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed mb-3">
                Deterministic context rules classify quotes, historical mentions, and hypotheses. Qualified claims go to the <strong>Needs Confirming</strong> review queue.
              </p>
              <div className="p-2.5 rounded bg-paper-warm border border-paper-line text-[11px] font-mono space-y-1 mb-4 text-ink-muted">
                <div>Accuracy: <strong className="text-emerald-700 font-bold">97.5%</strong> (39/40)</div>
                <div>Precision: <strong className="text-emerald-700 font-bold">94.1%</strong> (16/17)</div>
                <div>Recall: <strong className="text-emerald-700 font-bold">100.0%</strong> (16/16)</div>
              </div>
            </div>
            <div className="space-y-2">
              <Link href="/evaluation" className="block">
                <Button variant="secondary" size="sm" className="w-full text-xs">
                  <span>Run Live Benchmark</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
              <Link href="/review" className="block text-center text-xs text-ink-muted hover:text-ink">
                View Needs Confirming Queue &rarr;
              </Link>
            </div>
          </div>

          {/* Improvement 2 */}
          <div className="p-5 rounded-xl border border-paper-line bg-paper flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                IMPROVEMENT 2
              </span>
              <h3 className="font-serif text-base font-semibold text-ink mt-2 mb-1.5">
                Visual Brand &amp; Accessibility Checks
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed mb-3">
                Upload image assets to inspect them against approved brand palettes and WCAG 2.1 AA text contrast thresholds with interactive bounding box overlays.
              </p>
              <div className="p-2.5 rounded bg-paper-warm border border-paper-line text-[11px] font-mono space-y-1 mb-4 text-ink-muted">
                <div>Contrast: <strong className="text-ink font-bold">WCAG AA 4.5:1</strong></div>
                <div>Palette: <strong className="text-ink font-bold">CIEDE2000 &Delta;E &le; 12</strong></div>
                <div>Overlay: <strong className="text-ink font-bold">Interactive Bounding Boxes</strong></div>
              </div>
            </div>
            <div>
              <Link href="/content" className="block">
                <Button variant="secondary" size="sm" className="w-full text-xs">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  <span>Test Image Inspector</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Improvement 3 */}
          <div className="p-5 rounded-xl border border-paper-line bg-paper flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                IMPROVEMENT 3
              </span>
              <h3 className="font-serif text-base font-semibold text-ink mt-2 mb-1.5">
                Governance Insights &amp; Clarification
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed mb-3">
                Live metrics on rule enforcement, clearance velocity, and rule health. High creator dismissal rates flag ambiguous rules for AI clarification and what-if simulation.
              </p>
              <div className="p-2.5 rounded bg-paper-warm border border-paper-line text-[11px] font-mono space-y-1 mb-4 text-ink-muted">
                <div>Signals: <strong className="text-ink font-bold">6 Live Metrics</strong></div>
                <div>Friction: <strong className="text-ink font-bold">&ge; 40% Dismissal Flag</strong></div>
                <div>Workflow: <strong className="text-ink font-bold">AI Draft + What-If</strong></div>
              </div>
            </div>
            <div>
              <Link href="/insights" className="block">
                <Button variant="secondary" size="sm" className="w-full text-xs">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  <span>Explore Governance Insights</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7-Step Guided Demo Flow */}
      <section className="mt-16 pt-12 border-t border-paper-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
          <div>
            <h2 className="font-serif text-2xl font-normal text-ink">7-Step Interactive Demo Walkthrough</h2>
            <p className="text-sm text-ink-muted mt-1">
              Experience the end-to-end lifecycle of content verification, image compliance, clearance, revalidation, and governance.
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

      {/* Round 3 Improvements & Evaluator Guide */}
      <section className="mt-16 pt-12 border-t border-paper-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-accent/10 text-accent mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Round 3 Evaluator Showcase
            </div>
            <h2 className="font-serif text-2xl font-normal text-ink">The Three Round 3 Improvements</h2>
            <p className="text-sm text-ink-muted mt-1">
              Deep, working implementations delivering exactly what was committed to at the end of Round 2.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Improvement 1 */}
          <div className="p-5 rounded-xl border border-paper-line bg-paper flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                IMPROVEMENT 1
              </span>
              <h3 className="font-serif text-base font-semibold text-ink mt-2 mb-1.5">
                Context-Aware Dependencies & Precision
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed mb-3">
                Deterministic context rules classify quotes, historical mentions, and hypotheses. Qualified claims go to the <strong>Needs Confirming</strong> review queue.
              </p>
              <div className="p-2.5 rounded bg-paper-warm border border-paper-line text-[11px] font-mono space-y-1 mb-4 text-ink-muted">
                <div>Accuracy: <strong className="text-emerald-700 font-bold">97.5%</strong> (39/40)</div>
                <div>Precision: <strong className="text-emerald-700 font-bold">94.1%</strong> (16/17)</div>
                <div>Recall: <strong className="text-emerald-700 font-bold">100.0%</strong> (16/16)</div>
              </div>
            </div>
            <div className="space-y-2">
              <Link href="/evaluation" className="block">
                <Button variant="secondary" size="sm" className="w-full text-xs">
                  <span>Run Live Benchmark</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
              <Link href="/review" className="block text-center text-xs text-ink-muted hover:text-ink">
                View Needs Confirming Queue &rarr;
              </Link>
            </div>
          </div>

          {/* Improvement 2 */}
          <div className="p-5 rounded-xl border border-paper-line bg-paper flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                IMPROVEMENT 2
              </span>
              <h3 className="font-serif text-base font-semibold text-ink mt-2 mb-1.5">
                Brand & Accessibility Image Checks
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed mb-3">
                First-class <span className="font-mono text-[11px]">asset</span> sources in the Library store brand palettes and contrast thresholds. Gemini vision proposes regions, while deterministic TypeScript code verifies WCAG AA 4.5:1 contrast ratios and palette Euclidean distance.
              </p>
              <div className="p-2.5 rounded bg-paper-warm border border-paper-line text-[11px] text-ink-muted space-y-1 mb-4">
                <div>&bull; Interactive SVG overlay on PNG/JPEG</div>
                <div>&bull; WCAG 2.1 relative luminance math</div>
                <div>&bull; Click bounding boxes to inspect findings</div>
              </div>
            </div>
            <Link href="/content" className="block">
              <Button variant="secondary" size="sm" className="w-full text-xs">
                <span>Test Image Checker</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Improvement 3 */}
          <div className="p-5 rounded-xl border border-paper-line bg-paper flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                IMPROVEMENT 3
              </span>
              <h3 className="font-serif text-base font-semibold text-ink mt-2 mb-1.5">
                Governance Insights & AI Clarification
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed mb-3">
                Executive dashboard tracking 6 operational metrics. An automated detector flags rules with &ge;3 findings and &ge;40% creator dismissal rates. Admins can request AI-drafted policy clarifications with instant what-if impact counts.
              </p>
              <div className="p-2.5 rounded bg-paper-warm border border-paper-line text-[11px] text-ink-muted space-y-1 mb-4">
                <div>&bull; 6 real-time compliance metrics</div>
                <div>&bull; Automated unclear-rule detection (&ge;40%)</div>
                <div>&bull; Gemini policy drafting + what-if count</div>
              </div>
            </div>
            <Link href="/insights" className="block">
              <Button variant="secondary" size="sm" className="w-full text-xs">
                <span>Explore Governance Insights</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
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
          <Link href="/evaluation" className="hover:text-ink hover:underline">Evaluation</Link>
          <span>·</span>
          <Link href="/insights" className="hover:text-ink hover:underline">Governance Insights</Link>
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
