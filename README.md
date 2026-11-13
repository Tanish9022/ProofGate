# ProofGate

> **Verify brand and marketing content against approved facts. Keep approvals honest when facts change.**  
> Built for **CodeNexus India 2026 · Round 3 (Final Product)** · Problem Owner: **Inkloom AI** · Team **MANTIS** (Tanish Dhende & Khushi Kasar).

🌐 **Live Demo (Zero-Login / Incognito-Ready):** [https://proof-gate-dusky.vercel.app/](https://proof-gate-dusky.vercel.app/)  
📦 **Source Code Repository:** [https://github.com/Tanish9022/ProofGate](https://github.com/Tanish9022/ProofGate)

[![Tests](https://img.shields.io/badge/Vitest-53%2F53%20Passing%20(9%20suites)-brightgreen.svg)](tests/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20(0%20errors)-blue.svg)](tsconfig.json)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.5%20(App%20Router)-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-Neon%20Serverless%20Postgres-00e599.svg)](src/server/db/schema.sql)
[![Precision](https://img.shields.io/badge/Benchmark%20Precision-94.1%25%20(F1%3A%200.97)-indigo.svg)](src/app/evaluation/page.tsx)
[![AI Pipeline](https://img.shields.io/badge/AI%20Pipeline-Gemini%202.0%20Flash%20%2B%20Code%20Decides-orange.svg)](src/server/ai/gemini.ts)

---

## 📌 Executive Summary

Marketing teams move fast—churning out posters, case studies, ad campaigns, and landing pages. But brand compliance is fragile:
- **Pure AI checkers hallucinate**: They invent justifications or fail to do accurate numeric and currency comparisons.
- **Naïve regex checkers miss context**: They flag historical quotes (*"In 2025, price was Rs. 399"*) as active violations.
- **Compliance fatigue kills revalidation**: When a price, discount, or brand rule changes, companies have no way of knowing which previously approved assets are now outdated—forcing teams to re-check everything or let stale copy slip through.

**ProofGate solves this with an architectural separation of concerns:**
1. **AI Proposes**: Gemini parses documents (TXT, PDF, DOCX, images) and extracts factual claims with exact verbatim string quotes and context labels (`current`, `historical`, `quoted`, `hypothetical`).
2. **Code Decides**: Deterministic TypeScript code compares numbers, dates, units, and forbidden terms against approved sources. (Generative AI never decides if a number matches).
3. **People Approve**: Humans make the clearance decision. Every approval locks the exact source version IDs it depended on.
4. **Selective Revalidation**: When an approved fact is superseded, expired, or withdrawn, ProofGate traces the dependency graph and re-opens **only** clearances with a confirmed link to that fact. Historical mentions remain untouched.

---

## 🏆 Round 3 Improvements Delivered

At the end of Round 2, Team MANTIS committed to three major advancements for Round 3. All three are fully built, tested, and verifiable live in the deployed application:

### 1. Context-Aware Dependency Linking & Gold Precision Report
- **"Needs Confirming" Probable-Links Queue (`/review`):** Claims matched with lower confidence or ambiguity are isolated into a dedicated review queue. Unconfirmed probable links **never auto-create clearance dependencies**, preventing false-positive revalidations when sources change.
- **Deterministic Context Rules:** Claims classified as `historical`, `quoted`, or `hypothetical` create zero clearance dependencies on current facts.
- **50-Case Gold Benchmark Evaluation Suite (`/evaluation`):** 40 ground-truth detection test cases + 10 selective revalidation scenarios running live through the exact same production functions (`checker.ts`, `extractClaimsFallback`, `sources`).
- **Live Measured Metrics:**
  - **Accuracy:** **97.5%** (39/40 cases passed)
  - **Precision:** **94.1%** (16/17 dependencies correct)
  - **Recall:** **100.0%** (16/16 real dependencies captured)
  - **F1 Score:** **0.97**
  - *Single False Positive:* Case TC-028 links a brand guideline terminology rule as a conservative dependency, which is safe for production compliance.
- *Holdout Set:* 10-case holdout dataset prepared (`tests/gold/holdout.json`) and kept un-run to prevent benchmark overfitting.

### 2. Visual Brand & Accessibility Engine for Images
- **Multimodal Compliance Engine (`/content/[id]`):** Evaluates image marketing assets (PNG, JPEG up to 4 MB) for visual brand compliance and accessibility standards.
- **WCAG 2.1 AA Contrast Verification:** Calculates relative luminance and verifies contrast ratios ($\ge 4.5:1$ for normal text, $\ge 3.0:1$ for large headings).
- **Brand Color Palette Enforcement:** Computes perceptual color distance ($\Delta E \le 12$ in CIEDE2000 space) between detected image colors and approved brand palette hex codes (`brand_palette` in Source Library).
- **Interactive Bounding Box Overlays:** `ImageOverlay` component renders visual boxes over offending regions with hover tooltips displaying detected hex codes and contrast ratios.
- **1-Click Sample Brand Poster Generator:** Allows evaluators to test the image compliance engine in 1 click without having to upload a local file.

### 3. Governance Insights & Unclear-Rule Clarification
- **Operational Insights Dashboard (`/insights`):** Displays **6 live governance metrics**: Clearance Velocity (median hours to clearance), First-Pass Compliance Rate, Source Dependency Health, Top Violated Rules, Creator Dismissal Breakdown, and Revalidation Turnaround.
- **Automated Unclear Rule Detector:** Continuously identifies rules causing creator friction—flagging guidelines with a $\ge 40\%$ creator dismissal rate.
- **AI-Drafted Clarifications + Code What-If Simulation:** Gemini drafts unambiguous replacement text for flagged rules, while deterministic code simulates the "what-if" impact across historical content versions.
- **1-Click Admin Supersession:** Admins can accept the drafted clarification directly from the dashboard, publishing a new version to the Source Library with full audit logging.

---

## ⚡ The 7-Step Demo Walkthrough (5 Minutes)

ProofGate includes a built-in **Interactive In-App Tour Guide** that guides any evaluator through the complete lifecycle without requiring sign-in or manual setup:

```
[1. Ingest Copy] ──▶ [2. Image Check] ──▶ [3. Review Queue] ──▶ [4. Supersede Fact] ──▶ [5. Selective Reval] ──▶ [6. Benchmark] ──▶ [7. Governance]
  Sample Poster       WCAG & Palette        Needs Confirming       Price -> Rs. 699       Only Poster Re-opens    94.1% Precision      6 Live Metrics
```

1. **Step 1: Ingest Marketing Copy (`/content/new` · Creator)**
   - Click **"★ Sample A: Launch Poster (Recommended - 3 issues)"**.
   - Contains intentional discrepancies: trial stated as 30 days (approved 14), uptime stated as 100% (approved 99.9%), and use of the banned guarantee term; while price Rs. 499 is supported.
2. **Step 2: Interactive Finding Resolution & Image Check (`/content/[id]` · Creator)**
   - Click **"Apply fix"** on blockers: updates text to approved source values (`14-day free trial`, `99.9% uptime`).
   - Click **"Dismiss with reason"** on the guarantee finding (records a documented legal override into the audit log).
   - Test Improvement 2: Scroll to **Visual Brand & Accessibility Image Check** and click **"Load Sample Brand Poster (1-Click Test)"** to inspect WCAG contrast and palette overlays.
   - Click **"Submit for Review"** in the header.
3. **Step 3: Review & Needs-Confirming Queue (`/review` · Reviewer)**
   - Switch role to **Reviewer** via the top-bar switcher.
   - Notice the **"Needs Confirming"** badge on uncertain or ambiguous model links.
   - Click **"Confirm Dependency"** or **"Reject Link"**.
   - Click **"Approve & Create Clearance"**: creates a clearance record locking confirmed source version IDs.
4. **Step 4: Fact Superseding in Library (`/library` · Admin)**
   - Switch role to **Admin**.
   - Open **`BrightDesk Pro Monthly`** (`brightdesk.pricing.pro_monthly`).
   - Click **"Add Version"**: notice the **Impact Preview** warning that active clearances depend on this source!
   - Change price to **Rs. 699** and click **"Publish Version & Trigger Revalidation"**.
5. **Step 5: Selective Revalidation (`/revalidation` · Reviewer)**
   - Open the **Revalidation Queue**: only the dependent poster re-opened!
   - Inspect the side-by-side **Old Value vs New Value** diff.
   - Scroll down to the **"Not Affected"** list to verify that historical case studies (e.g., Acme 2025) quoting past pricing remained safely cleared.
6. **Step 6: Live Benchmark Precision Report (`/evaluation` · All Roles)**
   - Click **"Run Benchmark"** to execute all 40 ground-truth detection test cases live.
   - Verify measured precision (94.1%), recall (100.0%), accuracy (97.5%), and confusion matrix.
7. **Step 7: Governance Insights & Clarification (`/insights` · Admin)**
   - View 6 live compliance signals and dismissal rates.
   - Check the **Unclear Rule Detector** for high-friction guidelines ($\ge 40\%$ dismissal).
   - Click **"Draft Clarification"** to inspect AI-suggested guidance text and simulated historical impact.

---

## 🛠️ Architecture & Core Principles

| Task | Handled By | Why |
| :--- | :--- | :--- |
| **Claim Extraction** | Gemini API (`gemini-2.0-flash` $\rightarrow$ `gemini-1.5-flash`) | Natural language understanding, parsing PDF/DOCX/images, context labeling. |
| **Verbatim Quote Check** | TypeScript code | Discards any claim where the quote is not an exact substring of the original text. |
| **Numeric & Unit Comparison** | Deterministic TypeScript | Ensures prices, percentages, dates, and units are strictly matched without model drift. |
| **Clearance Decision** | Human Reviewer | The system never publishes or rewrites copy autonomously. |
| **Dependency Graph** | PostgreSQL + TypeScript Service | Maps `clearance_dependencies` exclusively to `confirmed` links on active source versions. |
| **Resilience & Fallbacks** | Regex Extractors | If Gemini experiences rate limits or network issues, ProofGate automatically falls back to deterministic extraction. |
| **Image Analysis** | Gemini Vision + Code Math | Gemini locates visual regions; TypeScript calculates relative luminance and CIEDE2000 $\Delta E$. |

---

## 📂 Project Structure

```
proofgate/
├── docs/                        # Architecture, PRD, Data Model, Submission PDF
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── PRD.md
│   ├── ProofGate_Round3_Submission.pdf
│   └── UX_PLAN.md
├── src/
│   ├── app/                     # Next.js 16 App Router
│   │   ├── api/                 # Thin REST API route handlers
│   │   │   ├── audit/           # Audit trail queries
│   │   │   ├── clearances/      # Clearance records & dependencies
│   │   │   ├── content/         # Content versions, document upload, image check
│   │   │   ├── evaluation/      # Gold benchmark runner & history
│   │   │   ├── findings/        # Interactive creator quick-fixes, confirm/reject links
│   │   │   ├── insights/        # Metrics, unclear rules, AI clarification API
│   │   │   ├── revalidation/    # Selective revalidation queue & resolution
│   │   │   ├── review/          # Review queue, decisions, comments
│   │   │   ├── sources/         # Source library CRUD, impact preview, superseding
│   │   │   └── workspace/       # Per-visitor workspace session & reset
│   │   ├── audit/               # Audit log page
│   │   ├── clearances/          # Clearance records view
│   │   ├── content/             # Document & claim inspection workspace
│   │   ├── evaluation/          # Benchmark Precision & Evaluation report (Imp 1)
│   │   ├── insights/            # Governance Insights dashboard (Imp 3)
│   │   ├── library/             # Source of truth library with slide-over drawer
│   │   ├── revalidation/        # Old vs New revalidation comparison queue
│   │   └── review/              # Reviewer queue & human sign-off panel
│   ├── components/
│   │   ├── content/             # FindingCard, HighlightedText, ImageCheckerPanel, ImageOverlay
│   │   ├── insights/            # InsightsDashboard, MetricCard, UnclearRuleCard
│   │   ├── library/             # SourceDrawer, AddSourceModal
│   │   └── ui/                  # Button, Badge, EvaluatorCallout, DemoTourBanner, RoleSwitcher
│   └── server/
│       ├── ai/                  # Gemini client with retry, model cascade, Zod schemas
│       ├── checker/             # Deterministic math, currency, unit, and terminology checker
│       ├── db/                  # Neon serverless client, schema.sql, migrations/
│       ├── eval/                # Benchmark runner, gold dataset loader, metrics math
│       └── services/            # Business logic (sources, content, clearance, revalidate, imageChecker, insights)
└── tests/                       # Vitest test suites (53 passing tests)
    ├── checker.test.ts          # Deterministic rules verification
    ├── clearance.test.ts        # Reviewer sign-off & dependency locking rules
    ├── comments.test.ts         # Role-based commenting audit log
    ├── eval.test.ts             # 40 gold ground-truth cases execution & measured precision
    ├── imageChecker.test.ts     # WCAG contrast, CIEDE2000 palette delta-E, region math
    ├── insights.test.ts         # 6 governance metrics & unclear rule detector math
    ├── revalidate.test.ts       # Selective revalidation & unaffected claims isolation
    ├── roleChecks.test.ts       # Server-side 403 role authorization checks
    └── sources.test.ts          # Versioning, impact previews, and supersede transitions
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.18+ or v20+ (Node v22 tested)
- **PostgreSQL**: Neon serverless database (or any PostgreSQL 14+ instance)

### 1. Installation
```bash
git clone https://github.com/Tanish9022/ProofGate.git
cd ProofGate
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your configuration:
```env
DATABASE_URL=postgresql://user:password@ep-host.neon.tech/neondb?sslmode=require
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
APP_BASE_URL=http://localhost:3000
RATE_LIMIT_ANALYZE_PER_HOUR=20
```
*(Note: If no Gemini key is provided, ProofGate runs smoothly using its built-in deterministic fallback engine).*

### 3. Database Migration & Seeding
```bash
npx tsx src/server/db/migrate.ts   # apply idempotent PostgreSQL migrations
npm run seed                       # populate initial demo workspace and sources
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser (or in an incognito window).

---

## 🧪 Testing & Verification

ProofGate includes **53 automated tests across 9 test suites** covering the deterministic rules engine, dependency graph, image math, benchmark suite, and role authorization:

```bash
# Run Vitest unit & integration tests (all 53 passing)
npm run test

# Run Next.js production build (0 type errors, 0 lint warnings)
npm run build
```

### Test Suite Highlights
- **`tests/eval.test.ts`**: Executes all 40 gold ground-truth test cases through production code, verifying 97.5% accuracy, 94.1% precision, and 100% recall.
- **`tests/imageChecker.test.ts`**: Verifies WCAG 2.1 AA text contrast ratio formulas ($\ge 4.5:1$ passing, $< 4.5:1$ failing) and CIEDE2000 color palette distance calculations.
- **`tests/insights.test.ts`**: Verifies calculation of the 6 governance metrics, clearance velocity math, and the $\ge 40\%$ creator dismissal unclear rule detector.
- **`tests/checker.test.ts`**: Verifies exact price tolerances, unit mismatches, currency conversions, banned superlatives, and prompt injection defense.
- **`tests/clearance.test.ts`**: Verifies blocker submission locks, human approval transactions, and confirmed dependency pointers.
- **`tests/revalidate.test.ts`**: Verifies selective revalidation isolation, historical context exemptions, re-approval state transitions, and audit payload schemas.
- **`tests/roleChecks.test.ts`**: Verifies server-side 403 authorization enforcement on creator, reviewer, and admin endpoints.

---

## ⚠️ Known Limitations & Transparent Disclosures

- **Gold Benchmark Holdout Set:** A 10-case holdout dataset was authored in `tests/gold/holdout.json` to prevent tuning overfitting, and is transparently reported as prepared-but-not-run.
- **OCR on Scanned PDFs:** Text extraction from native PDFs, DOCX, and text files is supported out of the box; scanned image-only PDFs without an embedded text layer require copying and pasting text directly.
- **Demo Mode Isolation:** Workspaces are automatically isolated per browser session using cookie `pg_ws`, ensuring concurrent judges never overwrite each other's test state.

---

## 🛡️ Hackathon Submission Details (Round 3)

- **Event:** CodeNexus India 2026 (Round 3 — Final Product)
- **Problem Statement:** Creative & Brand Compliance Checker (Inkloom AI)
- **Team:** MANTIS
  - **Tanish Dhende** (Team Leader): End-to-end architecture, deterministic rules engine, database migrations, Gemini multimodal pipeline, precision benchmark runner, clearance & revalidation services.
  - **Khushi Kasar**: UI design system, interactive inspection views, image overlay bounding boxes, governance insights dashboard, 7-step guided demo tour.
- **Live Deployment:** [https://proof-gate-dusky.vercel.app/](https://proof-gate-dusky.vercel.app/)
- **Repository:** [https://github.com/Tanish9022/ProofGate](https://github.com/Tanish9022/ProofGate) (Public)

---

## 📄 License
MIT License. Built for CodeNexus India 2026.
