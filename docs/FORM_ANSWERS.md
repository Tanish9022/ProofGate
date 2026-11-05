# FORM_ANSWERS - Round 2 form (Tanish submits once for the team)

This matches the real form field by field. Fill the [BRACKETS] only after the product works. Never paste an answer you have not verified on the live link. The form says unverifiable or misrepresented submissions are disqualified.

## Your Team
- **Hackathon:** CodeNexus India 2026
- **Team Name (exactly as in Round 1):** MANTIS
- **Team Leader - Full Name:** Tanish Dhende
- **Team Leader - Email:** tanishdhende18@gmail.com  (must be the same email used in Round 1)
- **Team Member names, one per line:**
```
Khushi Kasar
```
(If you are unsure whether the leader should also be listed, add `Tanish Dhende` on its own line above her name. Check spelling: these names go on certificates.)

## Your Product
- **Link to the functioning project:** [LIVE VERCEL URL]  (the app itself, not the repo or a video)
- **Source-code repository:** [PUBLIC GITHUB URL]  (confirm "Public" in repo settings; open in incognito)
- **Google Drive link to the updated PDF:** [DRIVE URL]  (Anyone with the link, Viewer; open in incognito)

## The list of features you completed (one per line; delete any line that is not working on the live link)
```
No-login demo workspace per visitor with Reset demo and a role switcher (Admin, Creator, Reviewer)
Source library with approved facts, brand terms and guidelines, each with version, owner, status and validity dates
Add a new source version, withdraw or expire a source, with an impact preview of affected approvals
Submit content as pasted text or upload (TXT, PDF, DOCX, PNG/JPG; image text read with Gemini vision)
Claim extraction from content with current / historical / quoted / hypothetical context labels
Deterministic checks of prices, durations, percentages and dates against the current approved source version
Brand term and spelling rule checks (banned phrases, brand name spelling)
Findings with exact quote, status (Supported, Contradicted, Outdated source, Unverifiable, Conflicting sources, Needs review), source and version, explanation and suggested fix
Creator actions: apply fix, edit and re-check as a new version, dismiss with a reason
Prompt-injection detection: instruction-like text inside uploaded content is flagged and never followed
Comments on content versions
Human review queue: approve or reject with a comment
Clearance record storing the content version, file hash and the exact source versions each claim relied on
Selective revalidation queue: when a source changes, only approvals with a confirmed link to it are reopened, with the reason and old and new value
Audit log of every action
Deterministic fallback: findings still work when the Gemini API is unavailable
```

## Technology and implementation details
```
Stack: Next.js (App Router) with TypeScript and Tailwind CSS; API route handlers for the backend; PostgreSQL ([Supabase/Neon]) for data; deployed on Vercel. Gemini API ([model id]) for AI. pdf-parse and mammoth for PDF and DOCX text; Zod for validating every API input and model output; Vitest for tests.

Architecture: AI reads, code checks, humans decide. Gemini is used only to (1) extract claims from content and label their context, (2) read text from images, and (3) write plain-language explanations. Comparison of numbers, units and dates, term rules, version and expiry rules, permissions, state changes and dependency tracing are plain TypeScript, so a model error cannot approve content or wrongly reopen an approval. Model outputs are schema-validated and any claim whose quote is not found verbatim in the content is dropped.

How the pieces fit: each approved content version creates a clearance with dependency rows pointing at exact source versions. Only dependencies with a confirmed (code-verified) link can trigger revalidation; historical, quoted and hypothetical claims create no dependency. Changing a source runs in one database transaction: mark the old version, create the new one, find confirmed dependent clearances, mark them Revalidation required, record the reason, write the audit log.

Technically hard parts: deciding which content depends on which source version without wrongly reopening good approvals; keeping uploaded text from steering the model (untrusted-data handling plus injection flagging); making the product usable without login for judges (per-visitor workspace cloned from seed data); graceful fallback when the AI call fails.

Development note: [state honestly how the code was written, including any AI coding assistants used, and what each of you built].
```

## What changed from your original proposal, and why?
```
1. Removed login and added demo mode (role switcher and a private demo workspace per visitor) so anyone can use the product without signing in.
2. Single Next.js application instead of Next.js plus FastAPI: one deployment, fewer failure points in a 72-hour build.
3. Images are read through Gemini vision instead of a separate OCR pipeline.
4. Manager and Reviewer roles merged into one Reviewer role; comments are available to every role.
5. Narrowed scope to one complete path: sources -> submit -> findings -> human approval -> clearance -> source change -> selective revalidation.
6. Moved visual checks, governance insights and measured precision to Round 3.
[Add any other real change. Delete any item that is not true.]
```

## What does NOT work yet?
Write only what is true after your final test. Likely honest items (keep the ones that apply, add what you find):
```
- Role switcher is a demo control, not real authentication.
- Demo workspaces are temporary and cleaned up periodically.
- Scanned PDFs without a text layer are not read; the app asks the user to paste the text.
- [Image reading depends on the Gemini API and may fail on low-quality images.]
- [Date checks support limited date formats.]
- [Anything else you saw in your last test.]
```
If nothing is known, write "Nothing known" - but only after two clean runs of the demo.

## Your Three Improvements for Round 3
Judged on delivering exactly these. Each has a measurable "done" so you can prove it.

**Improvement 1**
```
Context-aware dependency linking with a measured precision report. Today a claim is labelled current, historical, quoted or hypothetical and only confirmed links reopen approvals. In Round 3 we add a probable-link review queue for ambiguous matches (different units, near-matches, indirect mentions), reviewer confirm or reject actions that feed back into the link, and an Evaluation page that runs a labelled test set of at least 60 scenarios and reports precision and recall of "should this approval be reopened?". Automatic revalidation stays limited to confirmed links unless precision reaches 95%. For users this means fewer false alarms and proof that reopened approvals are the right ones.
```

**Improvement 2**
```
Visual brand and accessibility checks for image creatives. Posters and banners are checked beyond their text: presence of the approved logo, match of dominant colours to the approved brand palette, text-to-background contrast against a configurable WCAG AA threshold, and text size/legibility warnings, each reported as an explainable finding with the region highlighted on the image and a source rule, and subject to human approval like every other finding. For users this means visual brand violations are caught before publishing, not only wording errors.
```

**Improvement 3**
```
Governance insights dashboard. A new analytics view built from the audit and findings data: most frequently violated rules, findings reviewers most often dismiss or override (a sign a rule is unclear), sources that cause the most revalidations, average time from submission to clearance, and approvals aging in the queue. It suggests rule clarifications (for example, a rewrite of an ambiguous term rule) that a human must approve before any source version is created. For brand managers this turns individual reviews into improvements to the rules themselves.
```
Before submitting, ask: can two people really ship all three in 72 hours, with tests? If not, shrink the scope of each rather than drop one. Do not start any of this before Round 3 opens.

## Final Confirmation (tick only if true)
- [ ] I opened every link above in a private window and all of them worked
- [ ] The source-code repository is PUBLIC
- [ ] The Drive link to the updated PDF is "Anyone with the link" as Viewer
- [ ] The features I listed are finished and working in the live product
- [ ] Only the team leader (Tanish) has submitted this form, once, for the whole team
- [ ] Declaration: the product is our team's own work. If AI tools helped write code, say so plainly in the implementation details and check the event rules on AI-assisted work before you tick this.

Never put passwords or API keys in the form or the repo.
