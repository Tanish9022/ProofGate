# ProofGate

> **Verify brand and marketing content against approved facts. Keep approvals honest when facts change.**  
> Built for **CodeNexus India 2026** (Round 2) · Problem Owner: **Inkloom AI** · Team **MANTIS** (Tanish Dhende & Khushi Kasar).

[![Tests](https://img.shields.io/badge/Vitest-22%2F22%20Passing-brightgreen.svg)](tests/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20(0%20errors)-blue.svg)](tsconfig.json)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.5%20(App%20Router)-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-Neon%20Serverless%20Postgres-00e599.svg)](https://neon.tech/)
[![AI](https://img.shields.io/badge/AI%20Pipeline-Gemini%20API%20%2B%20Deterministic%20Fallback-orange.svg)](src/server/ai/gemini.ts)

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

## ⚡ The 5-Step Demo Workflow (3 Minutes)

ProofGate includes a built-in **Interactive In-App Tour Guide** that automatically guides any evaluator through the end-to-end lifecycle without requiring any sign-in:

```
[Content Ingestion] ──▶ [Deterministic Check] ──▶ [Creator Fix] ──▶ [Reviewer Clearance] ──▶ [Fact Update] ──▶ [Selective Revalidation]
  Sample A Poster         Flags 3 Blockers         Apply Fixes         Locks Source v1        Price -> Rs. 699       Only Poster Re-opens!
```

1. **Step 1: Check Marketing Copy (`/content/new`)**
   - Click **"★ Sample A: Launch Poster (Recommended - 3 issues)"**.
   - Contains intentional discrepancies: price stated as Rs. 449, free trial as 30 days, and superlative guarantees.
2. **Step 2: Interactive Finding Resolution (`/content/[id]`)**
   - ProofGate highlights claims inline in the document preview.
   - Click **"Apply fix"** on the blocker cards: it automatically updates the text to approved source values (`Rs. 499 / user / month` and `14-day free trial`).
   - Click **"Dismiss with reason"** on the guarantee finding (records a documented legal override into the audit log).
   - Once all blockers are resolved, click **"Submit for Review"**.
3. **Step 3: Independent Human Sign-off (`/review`)**
   - Switch role to **Reviewer** (or click the 1-click switcher).
   - Inspect the submission and evidence.
   - Click **"Approve & Create Clearance"**: mints an immutable clearance certificate locking confirmed source version IDs.
4. **Step 4: Fact Superseding in Library (`/library`)**
   - Switch role to **Admin**.
   - Open **`BrightDesk Pro Monthly`** (`brightdesk.pricing.pro_monthly`).
   - Click **"Add Version"**: notice the **Impact Preview** warning that 1 active clearance depends on this source!
   - Change the price to **Rs. 699** and click **"Publish Version & Trigger Revalidation"**.
5. **Step 5: Selective Revalidation (`/revalidation`)**
   - Open the **Revalidation Queue**: only the dependent poster re-opened!
   - Inspect the side-by-side **Old Value vs New Value** diff.
   - Click **"Re-approve with New Version"** or **"Send Back to Creator"**.
   - Scroll down to the **"Not Affected"** transparency list to see how content with historical context remained safely cleared.

---

## 🛠️ Architecture & Core Principles

| Task | Handled By | Why |
| :--- | :--- | :--- |
| **Claim Extraction** | Gemini API (`gemini-3.5-flash-lite`) | Natural language understanding, parsing PDF/DOCX/images, context labeling. |
| **Verbatim Quote Check** | TypeScript code | Discards any claim where the quote is not an exact substring of the original text. |
| **Numeric & Unit Comparison** | Deterministic TypeScript | Ensures prices, percentages, dates, and units are strictly matched without model drift. |
| **Clearance Decision** | Human Reviewer | The system never publishes or rewrites copy autonomously. |
| **Dependency Graph** | PostgreSQL + TypeScript Service | Maps `clearance_dependencies` exclusively to `confirmed` links on active source versions. |
| **Resilience & Fallbacks** | Regex Extractors | If Gemini experiences rate limits or network issues, ProofGate automatically falls back to deterministic extraction. |

---

## 📂 Project Structure

```
proofgate/
├── docs/                        # Architecture, PRD, Data Model, UX specifications
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── PRD.md
│   ├── SEED_DATA.md
│   └── UX_PLAN.md
├── src/
│   ├── app/                     # Next.js 16 App Router
│   │   ├── api/                 # Thin REST API route handlers
│   │   │   ├── audit/           # Audit trail queries
│   │   │   ├── clearances/      # Clearance certificates & dependencies
│   │   │   ├── content/         # Content versions, document upload, analysis
│   │   │   ├── findings/        # Interactive creator quick-fixes & overrides
│   │   │   ├── revalidation/    # Selective revalidation queue & resolution
│   │   │   ├── review/          # Review queue & sign-off transactions
│   │   │   ├── sources/         # Source library CRUD, impact preview, superseding
│   │   │   └── workspace/       # Per-visitor workspace session & reset
│   │   ├── audit/               # Immutable audit log page
│   │   ├── clearances/          # Clearance certificates view
│   │   ├── content/             # Two-column document & claim inspection workspace
│   │   ├── library/             # Source of truth library with slide-over drawer
│   │   ├── revalidation/        # Old vs New revalidation comparison queue
│   │   └── review/              # Reviewer queue & human sign-off panel
│   ├── components/
│   │   ├── content/             # FindingCard, HighlightedText preview
│   │   ├── library/             # SourceDrawer, AddSourceModal
│   │   └── ui/                  # Button, Badge, Input, DemoTourBanner, TopBar, RoleSwitcher
│   └── server/
│       ├── ai/                  # Gemini client with retry, Zod schemas, regex fallback
│       ├── checker/             # Deterministic math, currency, unit, and terminology checker
│       ├── db/                  # Neon serverless client, schema.sql, seedData.ts
│       └── services/            # Business logic (sources, content, clearance, revalidate)
└── tests/                       # Vitest unit test suites & Playwright E2E spec
    ├── checker.test.ts          # Deterministic rules verification
    ├── clearance.test.ts        # Reviewer sign-off & dependency locking rules
    ├── e2e.spec.ts              # Playwright end-to-end journey
    ├── revalidate.test.ts       # Selective revalidation & unaffected claims isolation
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
GEMINI_MODEL=gemini-3.5-flash-lite
APP_BASE_URL=http://localhost:3000
RATE_LIMIT_ANALYZE_PER_HOUR=20
```
*(Note: If no Gemini key is provided, ProofGate runs smoothly using its built-in deterministic fallback engine).*

### 3. Database Migration & Seeding
Initialize the PostgreSQL schema and load the demo workspace (`BrightDesk` with 7 approved sources):
```bash
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser (or in an incognito window).

---

## 🧪 Testing & Verification

ProofGate includes comprehensive unit tests covering the rules engine, dependency graph, and audit logging:

```bash
# Run Vitest unit tests (all 22 passing)
npm run test

# Run TypeScript strict type-checking (0 errors)
npx tsc --noEmit

# Run Next.js production build
npm run build

# Run Playwright end-to-end test
npm run e2e
```

### Unit Test Highlights
- **`tests/checker.test.ts`**: Verifies exact price tolerances, unit mismatches, currency conversions, banned superlatives, and prompt injection defense.
- **`tests/sources.test.ts`**: Verifies impact preview calculations, source version retirement, and active clearance identification.
- **`tests/clearance.test.ts`**: Verifies blocker submission locks, human approval transactions, and confirmed dependency pointers.
- **`tests/revalidate.test.ts`**: Verifies selective revalidation isolation, historical context exemptions, re-approval state transitions, and audit payload schemas.

---

## 🛡️ Hackathon Submission Details (Round 2)

- **Event**: CodeNexus India 2026 (Round 2)
- **Problem Statement**: Creative & Brand Compliance Checker (Inkloom AI)
- **Team**: MANTIS
  - **Tanish Dhende** (Team Leader): Architecture, database, Gemini pipeline, deterministic rules engine, clearance and revalidation services, test suite.
  - **Khushi Kasar**: UI design system, interactive inspection views, accessibility, responsive guided demo flow.
- **Key Architectural Decisions**:
  1. **Demo Mode & Zero-Login Wall**: Every visitor gets an isolated demo workspace via cookie `pg_ws`, enabling instant evaluation in incognito windows without signup friction.
  2. **Single Next.js Deployment**: Unified App Router API handlers and React 19 frontend—eliminating cold-start latency and multi-service failure points.
  3. **Multi-Model Resilience Cascade**: Automated fallback across `gemini-3.5-flash-lite` $\rightarrow$ `gemini-3.1-flash-lite` $\rightarrow$ deterministic regex to guarantee 100% uptime during judging.

---

## 📄 License
MIT License. Built for CodeNexus India 2026.
