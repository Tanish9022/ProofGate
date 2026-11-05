# AGENTS.md - ProofGate

You are building **ProofGate** for CodeNexus India 2026, Round 2 (team MANTIS). Read this file, MEMORY.md and docs/PRD.md before any task.

## Product in one paragraph
ProofGate checks brand/marketing content against a company's approved facts, terminology and guidelines before publishing. Findings are explained with the exact source and version. A human approves. Each approval (a "clearance") stores which exact source versions it depended on. If a source is superseded, expired or withdrawn, only clearances with a CONFIRMED dependency on it move to "Revalidation required". The system never publishes or rewrites content by itself.

## Hard constraints
- Deadline: Sat 7 Nov 2026 10:00 IST. A working end-to-end flow beats any extra feature.
- The deployed link must work in an incognito window with NO sign-in and no explanation. Use demo mode (role switcher), never a login wall.
- Every visitor gets their own copy of the seed workspace (cookie `pg_ws`). Shared state between judges is a bug.
- Do not invent facts, sources or version IDs. If evidence is missing, the finding status is `unverifiable`.
- AI may propose; deterministic code decides. See "Division of labour" below.

## Stack (do not change without writing a decision in MEMORY.md)
Next.js (App Router) + TypeScript + Tailwind CSS, API route handlers, PostgreSQL (Supabase or Neon, DB only, no Supabase Auth), Gemini API via server-side env var, `pdf-parse` or `pdfjs-dist` for PDF, `mammoth` for DOCX, Zod for validation, Vitest for unit tests, Playwright for one end-to-end test. Deploy on Vercel.

## Division of labour (the key architectural rule)
| Task | Done by |
|------|---------|
| Extract claims from content, label context (current / historical / quoted / hypothetical), write plain-language explanations, read text from images | Gemini (JSON output validated by Zod) |
| Compare numbers, units, dates, terms; version checks; expiry; permissions; state transitions; dependency tracing | Plain TypeScript code |
| Approve / reject | Human only |

Never let a model output set a finding status for numeric facts. The model gives `fact_key` + `value`; code compares to the approved source.

## Finding statuses (exact strings)
`supported`, `contradicted`, `expired_or_superseded`, `unverifiable`, `conflicting_evidence`, `review_needed`.
Clearance states: `current`, `revalidation_required`, `review_needed`, `rejected`.
Source version statuses: `current`, `superseded`, `expired`, `withdrawn`.

## Dependency rules
- A clearance dependency is created only when a claim is linked to a source version with `link_status = confirmed` (code-verified match, or reviewer confirmed).
- `probable` links (model guess, ambiguous) go to a review queue and NEVER auto-trigger revalidation.
- Claims with context `historical`, `quoted` or `hypothetical` create no dependency on current facts.

## Code conventions
- TypeScript strict. No `any` without a comment. Validate every API input and every model output with Zod.
- All DB access in `src/server/db/*`. Route handlers stay thin; logic lives in `src/server/services/*`.
- Every mutation writes a row to `audit_log`.
- Gemini calls: server-side only, timeout 25 s, one retry, then fall back to deterministic-only mode and mark findings with `review_needed` where the model was required. The app must still work with no model.
- Limit uploads to 4 MB and PDF/DOCX/PNG/JPG/plain text. Rate limit analysis to 20 requests per workspace per hour.
- UI: follow docs/DESIGN_SYSTEM.md exactly (tokens, fonts, components, marks) and docs/UX_PLAN.md (flows, states, copy). Tailwind only, accessible (labels, focus rings, contrast AA), mobile usable. Plain, clean look. No lorem ipsum, no empty screens: every list has seed data or an empty-state message with a button.

## Commands (keep these working)
```
npm run dev        # local
npm run build      # must pass before every deploy
npm run test       # vitest: checker, versioning, dependency tracing
npm run seed       # create/reset the demo workspace in the DB
npm run e2e        # one Playwright test for the main flow
```

## Definition of done for any task
1. `npm run build` and `npm run test` pass.
2. Works in the deployed Vercel preview in an incognito window.
3. Audit log row written for mutations.
4. MEMORY.md "Current state" and "Done" updated.

## Do not
- Add login, payments, email, integrations, video support, crawling or auto-publish.
- Spend time on logos, animations or settings pages.
- Put API keys in the repo. Use `.env.local` and Vercel env vars; keep `.env.example` current.
- Claim a feature in the README that is not working in the deployed link.

## When unsure
Choose the smaller option that keeps the main flow working, write the decision in MEMORY.md, and continue.
