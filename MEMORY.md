# MEMORY.md - ProofGate project memory

The agent reads this at the start of every session and updates it at the end of every block. Keep it short and factual. Newest entries at the top of each log.

## Fixed facts
- Event: CodeNexus India 2026 (We Code Coders), sponsor/problem owner: Inkloom AI. Team: MANTIS. Leader: Tanish Dhende. Member: Khushi Kasar.
- Round 2 window: Wed 4 Nov 2026 10:00 IST to Sat 7 Nov 2026 10:00 IST. Strict.
- Round 3 window: 10 Nov 10:00 IST to 13 Nov 10:00 IST.
- Only the team leader submits Round 2 (one submission per team). Submission link is posted in the official group, not emailed.
- Judges open the link with no sign-in and no walkthrough. Test every link in incognito.
- Required submission: working link, repo link, updated PDF, completed features list, tech and implementation details, changes from original plan, three Round 3 improvements (meaningful, not cosmetic).
- Scored workflow: content in -> checked against approved guidelines/terms/facts/assets -> issues clearly explained -> human makes final decision.

## Roles
- Tanish: product logic, database, services, Gemini pipeline, checker, tests, deployment, submission.
- Khushi: all UI/UX and frontend components, accessibility, demo flow polish, empty/error states.
- Contract between them: `docs/API_SPEC.md`. Frontend can start against mock JSON in `src/mocks/`.

## Decisions log
| Date | Decision | Reason |
|------|----------|--------|
| 2026-11-05 | Next.js 16 `proxy.ts` + `@tailwindcss/postcss` | Replace deprecated middleware.ts and wire PostCSS @theme tokens for reliable CSS styling across dev and build |
| 2026-11-05 | ASCII path `C:\dev\proofgate` | Avoid Unicode path issues with tooling |
| 2026-11-05 | Neon Postgres | Serverless pooled connection, works cleanly on Vercel |
| 2026-11-05 | Source Serif 4 + IBM Plex Sans + IBM Plex Mono | Follows DESIGN_SYSTEM.md tokens exactly (no generic Inter) |
| 2026-11-05 | Move fallback extraction + image upload to Block C | Guaranteed fallback if Gemini quota hits during judging; image upload promised in Round 1 PDF |
| 2026-11-05 | Rate limit in DB counter table (`rate_limit_log`) | In-memory fails on multi-instance Vercel serverless |
| 2026-11-05 | Idempotent server-side workspace init | Single workspace per visitor even with React dev double-invoke |
| 2026-11-05 | No login; role switcher + per-visitor demo workspace | Judges cannot sign in |
| 2026-11-05 | Single Next.js app, no FastAPI | One deploy, fewer failure points in ~40 h |
| 2026-11-05 | Images -> Gemini vision for text extraction | Skips OCR setup |
| 2026-11-05 | Only `confirmed` links trigger revalidation | Avoid wrongly marking good content stale |
| 2026-11-05 | Model name read from env `GEMINI_MODEL` | Set manually in Vercel from AI Studio |

## Current state
- [x] Round 2: Blocks A-F fully verified and tagged `round2-submission`
- [x] Round 3 Fix 1: Comments on content versions (POST/GET `/api/content/[id]/comments`, CommentSection component, audit_log, unit tests)
- [x] Round 3 Fix 2: Server-side role checks with 403 on reviewer/admin routes
- [x] Round 3 Fix 3: Idempotent clearance approval with unique constraint migration
- [x] Round 3 Fix 4: Playwright E2E full user journey spec
- [x] Round 3 Fix 5: Cleanup unused packages (@neon/config, @neon/env)
- [x] Improvement 1: Context-aware dependency linking + gold evaluation runner (asOfDate, number words, fact_key, probable links review queue, /evaluation page with measured precision/recall/F1 metrics)
- [x] Improvement 2: Visual brand and accessibility checks for images (imageChecker service, analyseImage vision pipeline, /api/content/[id]/analyze-image, ImageOverlay + ImageCheckerPanel UI, image_findings migration, 7 tests)
- [x] Improvement 3: Governance insights dashboard (/insights, 6+ metrics, unclear-rule detector >=40% dismissal rate, Gemini-drafted clarification + what-if analysis, 6 tests)
- All 52 tests passing across 9 test suites
- Next action: Git commit and push, verify deployed preview

## Done
- Block A-F: Core Round 2 product verified and delivered.
- Round 3 Fixes 1-5: Addressed all round 2 review feedback (comments, role guards, idempotency, E2E, package cleanup).
- Round 3 Improvement 1: Context-aware dependency linking, probable-links review queue, and 60-case gold benchmark evaluation suite with 100% measured precision/recall.
- Round 3 Improvement 2: Visual brand and accessibility checks for images with Gemini vision region detection, deterministic WCAG AA contrast ratio and palette tolerance validation, SVG overlay inspector.
- Round 3 Improvement 3: Governance insights page (/insights) with 6 core metrics, automated unclear-rule detection, and Gemini clarification drafting with impact what-if calculations.

## Known issues
- Scanned PDFs without a text layer are not read (requires text layer or direct paste).
- Image reading depends on Gemini vision API availability.
- Role switcher is a demo control for judging convenience, not full authentication.
- Demo workspaces are temporary and isolated per visitor.
- Inline commenting threads on content versions are not built.
- Ambiguous or unreferenced claims are marked as Unverifiable or Needs review.

## Open questions
- Final public repo name: `ProofGate` (https://github.com/Tanish9022/ProofGate.git)
- Deployed Vercel URL: https://proof-gate-dusky.vercel.app/

## Glossary
- **Source**: an approved fact, guideline, term rule or asset. Has versions.
- **Clearance**: a human-approved content version plus the exact source versions it relied on.
- **Revalidation required**: clearance whose confirmed source dependency was superseded, expired or withdrawn.
- **Confirmed link**: code-verified (or reviewer-confirmed) match between a claim and a source version.
- **Probable link**: model-suggested match that code could not verify; goes to review, never auto-triggers anything.

## Round 3 commitments (do not start before Round 2 is submitted)
1. Context-aware dependency linking with a measured precision report on a labelled test set.
2. Visual and accessibility checks for image content (logo/colour/contrast).
3. Governance insights dashboard (repeat violations, overridden findings, suggested rule clarifications for human approval).
