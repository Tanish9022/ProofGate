# UX_PLAN - ProofGate

Visual language is in DESIGN_SYSTEM.md. Screen content is in UI_SPEC.md. This file covers who uses it, how it flows, what it says, and how you prove it works.

## 1. Who we design for
**Primary (this round): the first-time judge.** Opens a link cold, no account, no briefing, maybe 5 minutes, probably on a laptop and sometimes on a phone. Needs to understand the point in 10 seconds and finish the core flow without asking anyone.

Real users the product models:
| Role | Goal | Moment that matters |
|---|---|---|
| Creator | Get content cleared without guessing | Seeing exactly what is wrong and fixing it in one click |
| Reviewer | Decide quickly with evidence | Seeing the claim, the source and the version side by side |
| Admin / knowledge owner | Change a fact safely | Seeing which approvals a change will reopen before confirming |

## 2. Principles
1. **Evidence beside the claim.** Every issue shows the quote, the approved value and the source version in the same place.
2. **People decide.** The product proposes and explains; approval, rejection and exceptions are human buttons.
3. **Calm by default.** Colour and alerts only for things that need action. A clean check should feel quiet and finished.
4. **Show consequences before they happen.** Changing a source previews what it will reopen.
5. **No dead ends.** Every empty, error and blocked state says what to do next.
6. **One word per action.** The button, the toast and the audit log use the same verb.

## 3. Information architecture
```
Home (guided demo)
Library     sources, versions, impact preview
Content     list, new, content page (document + notes), versions
Review      queue (reviewer), decision panel, clearance record
Revalidation  reopened approvals, not affected list
Audit       activity log
```
Role switcher changes what actions show, and where you land:
| Switch to | Lands on | Primary action visible |
|---|---|---|
| Creator | Content | Check content |
| Reviewer | Review | Approve, Reject |
| Admin | Library | Add new version |
Revalidation shows a number badge when items are open. Nothing else gets badges.

## 4. Core flow (what the judge does)
```
Home -> "Start with the sample poster"
  -> Check content (auto-runs)          [creator]
  -> Read notes, Apply fix x3           [creator]
  -> Re-check (new version, all OK)     [creator]
  -> Send for review                    [creator]
  -> switch to Reviewer, Approve        [reviewer]
  -> Clearance record (seal, sources)
  -> switch to Admin, Add new version of price
  -> Impact preview -> confirm
  -> Revalidation: poster reopened, case study not affected
```
Decision points and rules:
- **Send for review** is disabled while a blocker is unresolved. The tooltip says which: "Resolve 2 issues first: free trial length, uptime." Clicking the disabled button scrolls to the first blocker.
- **Apply fix** replaces only the quoted text, shows the change in the document, and does not re-run the check until the creator clicks "Check again", so the creator stays in control.
- **Dismiss** needs a reason (one short field). Dismissed items show as "Dismissed: reason" and are visible to the reviewer.
- **Add new version** always opens the impact preview first, and its confirm button states the consequence.
- **Re-approve** after revalidation creates a new clearance against the current source versions; the old one stays in history.

## 5. First-run and guided demo
- On the first visit show the guided strip (see DESIGN_SYSTEM). Steps tick themselves from real data (a content version exists, a clearance exists, a source has version 2). No manual checkboxes.
- Dismissing the strip is remembered in `localStorage` (try/catch, it may be unavailable).
- "Load sample" buttons exist on the new content screen for samples A to E so a judge never has to invent text.
- Reset demo is always one click away and explains itself: "This clears your demo data and starts again."

## 6. State matrix (every screen needs all of these)
| Screen | Empty | Loading | Error | Partial |
|---|---|---|---|---|
| Library | "No approved sources yet. Add the first one." | skeleton rows | "Could not load sources. Try again." | none |
| New content | n/a | upload progress bar | "This file type is not supported. Use TXT, PDF, DOCX, PNG or JPG." / "File is over 4 MB." | none |
| Content page | "Nothing checked yet. Check this content." | indeterminate bar + "Checking against 8 approved sources" | "The check did not finish. Try again." | AI unavailable banner, code checks still shown |
| Review queue | "Nothing is waiting for review." | skeleton | retry | none |
| Clearance record | n/a | skeleton | "This record was not found. It may have been reset." | none |
| Revalidation | "Nothing needs revalidation." | skeleton | retry | none |
| Audit | "No activity yet." | skeleton | retry | none |

## 7. Copy deck
Voice: plain, specific, sentence case, active verbs, no apologies in errors, no jokes. Words users know first; system terms appear once with an explanation.

| System term | What the UI says |
|---|---|
| Analysis | "Check" / "Check content" |
| Finding | "Note" in the margin; "issues" in counts |
| Clearance | "Clearance" with the first-use help "A clearance is an approval tied to the exact facts it relied on." |
| Revalidation required | "Reopened" on the seal; "Needs revalidation" as a list heading |
| Probable link | "Needs confirming" |

Buttons: Check content, Check again, Apply fix, Dismiss, Send for review, Approve, Reject, Re-approve with current sources, Send back to creator, Add new version, Withdraw source, Mark as expired, Reset demo.

Status help (tooltip text on each label):
- Supported: "Matches an approved source."
- Contradicted: "Conflicts with an approved source."
- Outdated source: "The source behind this is no longer current."
- Unverifiable: "No approved source covers this claim."
- Conflicting sources: "Approved sources disagree. Ask the owner."
- Needs review: "This could not be checked automatically."

Toasts (same verb as the button): "Content checked: 3 issues found", "Fix applied", "Version added", "Sent for review", "Approved", "Rejected", "Sent back to creator", "Demo reset".

Empty and error examples to reuse as the pattern: say what this screen is for, then one action.
- Library empty: "Approved facts, terms and guidelines live here. Add the first source."
- Upload error: "That file is 6 MB. The limit is 4 MB. Compress it or paste the text."
- AI unavailable: "Explanations are unavailable right now. Checks that need no AI are shown with standard wording."
- Blocked send: "Resolve 2 issues before sending for review."

## 8. Accessibility and inclusion
Covered in DESIGN_SYSTEM section 10. UX additions: error messages tell the user how to fix the problem; no time limits; every action has a visible confirmation; the whole flow works with keyboard only.

## 9. Usability test (run twice before Block G, 20 minutes each)
Recruit 3 people who have not seen the product (classmates, family). Do not explain anything. Give one instruction: "You work in marketing. Check this poster and get it approved, then tell me what happens if the price changes." Observe silently.

Record:
| Measure | Target |
|---|---|
| Time to first visible finding | under 60 seconds |
| Completes approval unaided | 3 of 3 |
| Finds the reopen result unaided | 2 of 3 |
| Moments of hesitation or wrong clicks | note each, fix top 3 |
| Can say in their own words what a clearance is | 2 of 3 |

Fix, then re-test on the live link, in incognito, on a laptop and a phone.

## 10. Heuristic pass (10 minutes, before shipping)
Visible system status (progress, toasts). Match to real world (plain words). User control (undo, dismiss, send back). Consistency (verbs). Error prevention (disabled send with reason, impact preview). Recognition over recall (source shown beside claim). Minimal design (remove one thing per screen). Help in context (status tooltips). Recovery from errors (retry, next step).

## 11. Success measures to quote in the PDF (only with real numbers)
Report the actual figures from your two tests: time to first finding, approvals completed unaided, and the three problems you fixed. Do not quote numbers you did not measure.
