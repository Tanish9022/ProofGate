# SUBMISSION.md - Round 2 (Tanish submits, one per team)

The form link will be posted in the official group. Do not wait for it to start preparing. Do not submit separately from Khushi. Only tick what is really working on the deployed link: a claimed feature that fails for a judge costs more than a missing one.

## Pre-submit checklist (do these in order, 3.5 h before deadline)
- [ ] Deploy final build. URL: ____________________
- [ ] Open the URL in an **incognito window on desktop and on a phone**. No sign-in. Home page explains the steps.
- [ ] Repo link: ____________________  The repo is **public** (or set to the access the form asks for). Open it in incognito to confirm.
- [ ] README has: what it is, live link, demo steps, setup, env vars list, honest limitations. No keys committed. Run a secret scan on the repo.
- [ ] Updated PDF is uploaded to Google Drive, "Anyone with the link can view". Open in incognito. Link: ____________________
- [ ] Run the 5-step demo from SEED_DATA.md twice on the live link.
- [ ] Gemini key has quota left; billing or limits checked.
- [ ] Form link from the official group opened; every URL pasted and re-tested.
- [ ] Team name typed as **MANTIS**; leader name Tanish Dhende.

## 1. Working project link
(paste live URL)

## 2. Source-code repository link
(paste GitHub URL)

## 3. Updated project PDF - what to change in the Round 1 PDF
1. Replace "Round 1 - The Plan" with "Round 2 - Build".
2. Add a "What we built" section with 4 to 6 screenshots: library, findings, clearance record, revalidation queue.
3. Update the technology table to the actual stack (see section 5 below).
4. Add a "Changes from the plan" section (section 6 below).
5. Add the Round 3 section (section 7 below).
6. Keep the limitations honest. Remove anything not built.
7. Keep team name MANTIS and both names on the first page.

## 4. Completed features (tick only what works on the live link, then paste)
- [ ] Demo workspace per visitor, no sign-in, Reset demo
- [ ] Source library with versions, owners, validity dates
- [ ] Add new version / withdraw / mark expired, with impact preview
- [ ] Submit text, PDF, DOCX and images (image text read with Gemini vision)
- [ ] Claim extraction and deterministic checks (price, duration, percentage, date)
- [ ] Brand term and spelling rules
- [ ] Explainable findings: quote, status, source and version, suggested fix
- [ ] Creator actions: apply fix, edit and re-check, dismiss with reason
- [ ] Prompt-injection detection in uploaded content
- [ ] Comments on content versions
- [ ] Human review: approve or reject with comment
- [ ] Clearance record with exact source versions and link status
- [ ] Selective revalidation queue with reason and old/new value
- [ ] Audit log of all actions
- [ ] Works without AI (deterministic fallback) when Gemini is unavailable

## 5. Technology and implementation details (draft; edit to match reality)
Next.js (App Router) with TypeScript and Tailwind CSS for the interface and API route handlers, deployed on Vercel. PostgreSQL holds sources, versions, content versions, claims, findings, clearances, dependencies, revalidation items and the audit log. Gemini API is used only to extract claims from content, label their context (current, historical, quoted, hypothetical), read text from images and write plain-language explanations. Exact comparison of numbers, units, dates and terms, version rules, expiry, permissions, dependency tracing and state changes are done in plain TypeScript, so a model error cannot approve content or invalidate an approval. Each approval stores a clearance with dependencies on exact source versions; only dependencies with a code-verified (confirmed) link can trigger revalidation. Uploaded text is treated as untrusted data and instruction-like text is flagged and ignored. Per-visitor demo workspaces and a role switcher let anyone use the product without signing in.

## 6. Explanation of changes made to the original plan (draft)
- **Removed login; added demo mode.** The product must be usable by judges without signing in, so we use a role switcher and a private demo workspace per visitor.
- **Single Next.js application instead of Next.js plus FastAPI.** One deployment is faster to load and has fewer failure points within the 72-hour window.
- **Images read through Gemini vision instead of a separate OCR pipeline.**
- **Manager and reviewer merged into one Reviewer role**, with comments available to every role.
- **Narrowed scope to one complete path:** sources -> submit -> findings -> human approval -> clearance -> source change -> selective revalidation.
- **Moved to Round 3:** visual brand checks, governance insights, and measured precision for dependency linking.
(Add any other real change. Be specific about what was cut and why.)

## 7. Three major improvements for Round 3 (draft, all are product features, not cosmetic)
1. **Context-aware dependency linking with a measured precision report.** Improve how the system separates current, historical, quoted and hypothetical claims, add a probable-link review queue, and publish precision on a labelled test set of at least 60 scenarios. Automatic revalidation stays gated until precision reaches 95%.
2. **Visual and accessibility checks for images.** Detect logo presence and approved brand colours in uploaded creatives, check text contrast against the asset rules, and read text inside images, all reported as explainable findings with a human decision.
3. **Governance insights.** A dashboard of repeated violations, findings that reviewers often override, and sources that cause the most revalidations, with suggested rule clarifications that a human approves before anything changes.

## 8. Known limitations (state them; judges trust honesty)
- Evidence is only as reliable as the sources the organisation approves.
- Supported content types and checks are limited to those listed above.
- Demo workspaces are temporary and are cleaned up periodically.
- The role switcher is a demo control and is not authentication.

## 9. After you submit
- Re-open the live link and repo once more in incognito.
- Do not push breaking changes before results. If you must fix something, push to a branch and keep `main` stable.
- Keep the Drive PDF and links viewable until the event ends.
