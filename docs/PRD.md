# PRD - ProofGate Round 2 (MVP)

## Goal
A judge opens the link, sees a ready demo workspace, submits content, reads clear findings, approves as a reviewer, then changes a source and watches only the dependent approved content get reopened. All without help.

## Users and roles (switch from the top bar, no login)
- **Admin / Knowledge owner:** manages approved sources and versions.
- **Creator:** submits content, reads findings, revises.
- **Reviewer:** approves or rejects, handles the revalidation queue.

## Scope

### MUST (Round 2 fails without these)
1. Demo workspace per visitor, seeded with sources and sample content, plus a "Reset demo" button.
2. Source library: list sources (facts, terms, guidelines, assets) with version, status, owner, validity dates. Admin can add a new version (supersede), withdraw, or mark expired.
3. Content submission: paste text, or upload TXT / PDF / DOCX / PNG / JPG (max 4 MB). Images are read with Gemini vision (promised in the Round 1 plan, so this is MUST).
4. Analysis: extract claims, run deterministic checks, show findings with status, exact text span, source ID and version, explanation, suggested fix.
5. Creator actions on each finding: accept fix, edit text, dismiss with reason. Re-run analysis creates a new content version.
6. Reviewer decision: approve or reject with comment. Approve creates a clearance with dependencies.
7. Clearance record screen: content version, hash, claims, source versions used, reviewer, time.
8. Source change flow: superseding / withdrawing / expiring a source puts only confirmed-dependent clearances into "Revalidation required" and shows them in a queue with a plain reason ("Price changed Rs. 499 -> Rs. 699").
9. Audit log for every mutation.
10. Comments: any role can add a comment on a content version; reviewers see them before deciding (the Round 1 plan promised manager comments).
11. Works with no sign-in, no walkthrough, in incognito.

### SHOULD (if time allows, in this order)
1. "Probable links" review list (items the code could not verify).
2. Revalidation diff: show old vs new claim value next to each other.
3. Guided hint banner ("Step 1 of 5: submit the sample poster").
4. Export clearance record as printable page.

### WON'T (Round 2)
Login, payments, CMS/DAM integrations, auto-publish, rewrite-without-approval, video, crawling, settings pages, multi-language.

## User stories and acceptance criteria
| ID | Story | Acceptance |
|----|-------|-----------|
| U1 | As a creator I submit a poster text and see issues | Findings list appears in under 20 s, each with status, source and fix |
| U2 | As a creator I see why a claim is wrong | Finding shows the exact quote, the approved value, source title and version |
| U3 | As a creator I fix and resubmit | New content version created; old version kept; findings recomputed |
| U4 | As a reviewer I approve | Clearance created; state `current`; dependencies listed |
| U5 | As admin I change the price fact | New source version created; old one `superseded` |
| U6 | As a reviewer I see what to re-check | Only clearances with a confirmed link to the changed source appear, with reason |
| U7 | As anyone I never see made-up evidence | Missing evidence shows `unverifiable`, never an invented source |
| U8 | As a judge I use it unaided | First screen explains the 5-step demo in 3 lines and links to the first action |

## Non-functional
- First load under 3 s on a normal connection. Analysis under 20 s, with a visible progress state.
- If Gemini fails, deterministic checks still return findings and the UI says "AI explanation unavailable".
- Uploaded text is untrusted: it is passed to the model as data only; any instruction-like text inside it is flagged as a finding (`review_needed`, reason "possible prompt injection") and never followed.
- Per-visitor data isolation by workspace id.
