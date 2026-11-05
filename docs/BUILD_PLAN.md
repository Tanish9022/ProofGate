# BUILD_PLAN - Round 2

Closes **Sat 7 Nov 10:00 IST**. Today is Thu 5 Nov, so you have roughly 40 working hours at most. Treat these as time boxes, not promises. Finish **submission by 06:30 IST on 7 Nov** (3.5 h buffer for broken links and the form). Keep watching the official group for the form link.

## Split
- **Tanish:** DB, services, checker, Gemini, API, tests, deploy, submission.
- **Khushi:** UI per UI_SPEC.md against `src/mocks/`, then wiring to the real API.
- Merge to `main` small and often. Vercel redeploys on push.

## Blocks
| Block | Hours | Tanish | Khushi | Done when |
|---|---|---|---|---|
| A. Foundation | 0-3 | Repo, Next.js app, Vercel deploy, DB created, schema.sql applied, env vars, workspace init + cookie | Design tokens and fonts from DESIGN_SYSTEM.md, `/design` component page, TopBar, RoleSwitcher, Button, StatusMark, routing, mock JSON | Empty app live on Vercel in incognito |
| B. Source library | 3-9 | seed.ts, sources API, versioning (supersede / withdraw / expire) with transactions | Library page, drawer, add-version form | Library shows seeded sources; adding v2 works |
| C. Content and analysis | 9-18 | Text extraction (txt, pdf, docx), Gemini claim extraction, checker, findings saved, fallback mode | Submit page, content page with highlights and finding cards | Sample A shows 4 findings with sources |
| D. Review and clearance | 18-25 | Edit -> new version -> re-analyse, submit-for-review rules, decision endpoint, clearance + dependencies in a transaction | Fix flow, Send for review, review queue, clearance record page | Approve creates clearance with source versions |
| E. Revalidation | 25-31 | Impact preview, revalidation on supersede/withdraw/expire, items + reasons, resolve actions, audit log | Impact dialog, revalidation queue with old vs new, Not affected list, audit page | Price change to Rs. 699 reopens only A |
| F. Harden and polish | 31-36 | Rate limit, size limits, injection finding, error handling, unit tests, one Playwright test | Empty/error states per UX_PLAN, guided demo, usability test x2 with fixes, axe pass, design QA checklist | The 5-step demo runs clean, twice in a row |
| G. Ship | 36-40 | Image upload (if time), README, update PDF, final deploy, incognito test of every link | Cross-device check, screenshots for the PDF | Submission form filled and sent |

## Cut lines (cut from the bottom of this list first)
1. Probable-links list
2. Revalidation old/new diff (keep a plain text reason instead)
3. Print view of the clearance
4. AI explanations (use the templates in AI_PROMPTS.md)
5. DOCX support (keep TXT, PDF and images)
(Image upload stays in: the Round 1 PDF promised it and Gemini vision makes it small. Cut it only as a last resort and say so in the changes section.)

Never cut: comments on content versions, demo mode with no login, findings with sources, human approval, clearance with source versions, selective revalidation, audit log.

## Risk checks
- **Block A:** if per-visitor cloning is slow or buggy, switch to one shared workspace plus Reset, and note it in MEMORY.md.
- **Gemini quota or model id error:** the fallback must already work at the end of block C.
- **Hour 20 checkpoint:** if sample A is not producing correct findings on the live link, stop new features and fix this.
- **Hour 33 checkpoint:** feature freeze. Only bug fixes after this.

## Daily routine for the agent
Start: read AGENTS.md, MEMORY.md, current block. End: run build and tests, push, test in incognito, update MEMORY.md.
