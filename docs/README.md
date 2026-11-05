# ProofGate - Round 2 Build Pack (Team MANTIS)

Deadline: **Saturday 7 Nov 2026, 10:00 AM IST** (strict). Judges must open the link and use the core product with no sign-in and no walkthrough.

## What to build (one sentence)
Content goes in -> it is checked against approved facts, terms and guidelines -> issues are explained with the exact source -> a human approves -> the approval is stored with exact source versions -> when a source changes, only the dependent content is sent back for review.

## Files and the order to use them
| # | File | Use |
|---|------|-----|
| 1 | AGENTS.md | Put in repo root. Rules for the coding agent (Claude Code / Cursor). Read first, every session. |
| 2 | MEMORY.md | Put in repo root. Decisions, current state, deadlines. Agent updates it as it works. |
| 3 | PRD.md | Scope: must / should / won't, user stories, acceptance criteria. |
| 4 | ARCHITECTURE.md | Stack, folder layout, demo-mode (no login), deployment, fallbacks. |
| 5 | DATA_MODEL.md | Full SQL schema. |
| 6 | API_SPEC.md | Route handlers, request and response shapes. |
| 7 | AI_PROMPTS.md | Gemini prompts, JSON schemas, the deterministic checker rules. |
| 8 | UI_SPEC.md | Screens and components (Khushi's main file). |
| 9 | SEED_DATA.md | Demo workspace data and the exact demo script. |
| 10 | BUILD_PLAN.md | Time-boxed plan, split between Tanish and Khushi, cut lines. |
| 11 | TEST_PLAN.md | Acceptance tests and the labelled test set. |
| 12 | SUBMISSION.md | Everything to paste into the Round 2 form, plus the final checklist. |
| 15 | UX_PLAN.md | User flows, states, copy deck and the usability test. |
| 16 | DESIGN_SYSTEM.md | Visual identity, tokens, components, motion, design QA (Khushi). |
| 14 | FORM_ANSWERS.md | Field-by-field answers for the real Round 2 form. Fill after the build works. |
| 13 | PLAN_ALIGNMENT.md | Round 1 PDF promises vs the build, and a strict self-score before you submit. |

## How to start with a coding agent
1. Create the repo, copy all 13 files into it (AGENTS.md and MEMORY.md in the root, the rest in /docs).
2. Tell the agent: "Read AGENTS.md, MEMORY.md and docs/PRD.md. Then follow docs/BUILD_PLAN.md block by block. After each block, update MEMORY.md."
3. Deploy an empty app to Vercel in the first hour, and redeploy after every block. Never leave deployment to the end.

## Three decisions that differ from the Round 1 plan (explain these in the submission)
1. **No login.** A role switcher (Admin / Creator / Reviewer) plus a per-visitor demo workspace, because judges cannot sign in.
2. **One Next.js app** (API route handlers) instead of Next.js + FastAPI. One deployment, no cold-starting second server, less to break in about 40 hours.
3. **Images go straight to Gemini vision** instead of a separate OCR step.
