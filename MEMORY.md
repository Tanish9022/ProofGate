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
- [x] Block A: Foundation live (Next.js 16 + TypeScript strict + Tailwind + DB schema + workspace session)
- [x] Block B: Source Library completed (Sources service, CRUD API, versioning, impact preview, supersede/withdraw/expire, slide-over drawer, add-version form, unit tests)
- [x] Block C: Content & Analysis completed (Text & document extraction, Gemini claim extraction with verbatim check, deterministic checker, prompt-injection heuristic, findings persistence, two-column interactive inspection page with highlights and quick fixes, unit tests)
- [x] Block D: Review & Clearance completed (Submit-for-review rules, review queue, human-in-the-loop approve/reject decision transactions, clearance records locking confirmed source dependencies, print certificate view, unit tests)
- [x] Block E: Revalidation & Audit completed (Selective revalidation queue with Old vs New comparison, reapprove vs send-back flows, educational "Not Affected" historical claims section, immutable audit log table with payload inspector, unit tests)
- [x] Block F: Harden & Polish completed (5-step interactive demo flow on Home page, real-time TopBar badge counters, responsive navigation, Playwright E2E spec)
- Next action: Block G: Deployment verification and final checklist

## Done
- Block A: Codebase scaffolded and verified.
- Block B: Source library with versioning, revalidation impact preview, and Neon DB integration verified.
- Block C: Content submission, document parsing, claim extraction pipeline, and deterministic findings verification complete. All unit tests passing.
- Block D: Review queue, reviewer decision transaction, locked clearance dependencies, and printable clearance certificate complete. Unit tests passing.
- Block E: Selective revalidation queue, old vs new diff view, unaffected item transparency list, immutable audit logging with search and role filters. Unit tests passing (22/22).
- Block F: Polished 5-minute demo flow on Home page, real-time review/revalidation badge counters, Playwright E2E test setup.

## Known issues
(none yet)

## Open questions
- Final public repo name: `proofgate`
- Deployed Vercel URL: (pending deploy)

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
