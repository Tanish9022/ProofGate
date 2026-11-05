# PLAN_ALIGNMENT - Round 1 PDF promises vs the Round 2 build

Judges have the Round 1 PDF. Whatever it promised for Round 2 should exist on the live link, or be listed as a change with a reason in the submission.

## Round 2 promises in the Round 1 PDF
| PDF promise (72 h plan) | Build pack | Status |
|---|---|---|
| Repository, schema, workspaces and roles | A. Foundation | Kept. Roles via switcher instead of login |
| Register facts, guidelines, assets with versions; approve and supersede a fact | B. Source library | Kept |
| Upload and extraction for text, PDF, DOCX and images | C. Content | Kept (images via Gemini vision) |
| Claim extraction, policy checks, evidence matching, explainable findings | C. Content | Kept |
| Revision, comments, manager and reviewer approval with logs | D. Review | Kept. Manager merged into Reviewer; comments for all roles; audit log |
| Clearance record and dependency registry | D. Review | Kept |
| Source-change event and selective revalidation queue | E. Revalidation | Kept (the core differentiator) |
| Integration, security and regression checks, deployment, README, test data | F, G | Kept: tests, injection handling, isolation, seed data |
| Next.js, FastAPI, PostgreSQL, Supabase Auth/Storage | Architecture | **Changed**: single Next.js app, Postgres only, no auth, no FastAPI. Explain in the submission |

## Round 3 promises (candidates in the PDF)
| PDF candidate | Round 3 commitment | Why it is a real addition |
|---|---|---|
| Better context handling (current / historical / hypothetical / quoted) | Measured precision on a labelled set, probable-link review queue, precision gate before auto stale-marking | Round 2 labels context; Round 3 proves and tunes it |
| Stronger visual and accessibility checks | Logo/colour/contrast findings on image creatives | Round 2 only reads text from images |
| Governance insights | Repeat violations, overridden findings, sources causing most revalidations, suggested clarifications for human approval | New dashboard and data, not a restyle |

## What judges are likely to weigh (inferred from the invitation email; weights are not published)
1. Core workflow works end to end on the live link, unaided.
2. Issues are clearly explained with the exact source.
3. A human makes the final decision.
4. The project matches the Round 1 plan, or changes are explained honestly.
5. Round 3 improvements are meaningful.
6. Every submitted link opens without sign-in.

## Self-score before submitting (be strict)
| Check | Pass? |
|---|---|
| A stranger completes the 5-step demo in 3 minutes with no help | |
| Every finding shows quote, status, source, version, fix | |
| Price change reopens only the right clearance and shows why | |
| No fake evidence anywhere (unknown shows Unverifiable) | |
| Works with Gemini turned off | |
| Every PDF promise is live, or listed under changes | |
| Repo, live link, Drive PDF all open in incognito | |
| Submitted at least 3 hours before the deadline | |
