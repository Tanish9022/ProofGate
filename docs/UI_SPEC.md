# UI_SPEC (Khushi's main file)

> Look and feel, tokens, components and motion: **DESIGN_SYSTEM.md** (wins on any visual conflict). Flows, states and copy: **UX_PLAN.md**. This file lists screen contents and behaviour.

Goal: a judge understands the product in 10 seconds and completes the main flow without help. Plain, clean, readable. Tailwind only. Accessible: labels on inputs, visible focus, AA contrast, keyboard usable, status shown with text and not colour alone.

## Global layout
- Top bar: product name "ProofGate", nav links (Home, Library, Content, Review, Revalidation, Audit), **Role switcher** (Admin / Creator / Reviewer, segmented control), **Reset demo** button.
- A small label next to the role switcher: "Demo mode: no sign-in needed".
- Right side badge on Revalidation nav item shows the number of open items.
- Toasts for every success and error. Loading spinners with text ("Analysing, up to 20 seconds").

## Status chips (text + icon + colour)
| Status | Label | Colour |
|---|---|---|
| supported | Supported | verdigris |
| contradicted | Contradicted | red pen |
| expired_or_superseded | Outdated source | amber |
| unverifiable | Unverifiable | grey |
| conflicting_evidence | Conflicting sources | purple |
| review_needed | Needs review | blue |
Clearances use the **Seal** component: Cleared (verdigris), Reopened (amber), Rejected (red pen), In review (indigo), Draft (slate).

## Screens

### 1. Home (`/`)
- One-line pitch + the 5-step guided demo as a numbered list, each step a button:
  1. Open the Source library  2. Submit the sample poster  3. Fix the issues and send for review  4. Approve as Reviewer  5. Change the price as Admin and watch what gets reopened.
- A progress tick next to completed steps (derive from data).
- Short "How the checks work" note: AI reads, code checks, humans decide.

### 2. Source library (`/library`)
- Table: Title, Kind, Current value, Version, Status chip, Valid until, Owner, Used by (count of clearances).
- Row click opens a drawer: version history, change notes, clearances depending on it.
- Admin only: "Add new version" (form: new value, change note, valid until) with an **impact preview** ("3 approved items depend on this") before confirming; "Withdraw"; "Mark expired".
- Empty state: button "Add the first source".

### 3. Submit content (`/content/new`)
- Title input, a large textarea, or file upload (drag and drop; shows file name, size; allowed types hint).
- Button "Load sample poster" fills demo text.
- Button label: **Check content**. It goes to the content page and starts the check automatically.

### 4. Content page (`/content/[id]`)
Two columns:
- Left: the text with highlighted spans (colour + underline style by status; click scrolls to the finding). Version selector (v1, v2 ...). Editable textarea mode for creators ("Edit text" -> "Save as new version and re-check").
- Right: findings list, grouped Blockers / Warnings / OK. Each finding card: status chip, quote, one-sentence explanation, "Source: {title} v{n} ({display})" link to the library row, suggested fix, buttons **Apply fix** (replaces the quote in the editor), **Dismiss** (reason required).
- Sticky footer: counts of unresolved blockers, button "Send for review" (disabled with tooltip text while blockers remain).
- Banner when AI was unavailable.

### 5. Review queue (`/review`)
- List of versions in review with blockers resolved/dismissed shown. Open one: same two-column view read-only plus a decision panel: Approve / Reject, comment box (required for reject).
- After approve: link to the clearance record.

### 6. Clearance record (`/clearances/[id]`)
- Header: content title, version, state chip, reviewer, time, file hash (short).
- "Based on" table: claim quote, source title, source version, value, link status (Confirmed / Probable).
- Timeline of events for this clearance (approved, revalidation required, re-approved).
- Print-friendly CSS.

### 7. Revalidation queue (`/revalidation`)
- Cards: content title, "Reason: Price changed Rs. 499 to Rs. 699", old vs new value side by side, quote highlighted, buttons **Re-approve with current sources** / **Send back to creator**.
- Info line: "Only content with a confirmed link to the changed source appears here." Show a collapsed "Not affected" list (content that mentions the topic but was historical or quoted) so judges see the selectivity.
- Empty state: "Nothing needs revalidation."

### 8. Audit (`/audit`)
- Table: time, role, action, entity, details. Filter by action.

## Components to build first
`TopBar`, `RoleSwitcher`, `StatusChip`, `FindingCard`, `HighlightedText`, `SourceDrawer`, `ImpactPreviewDialog`, `ConfirmDialog`, `EmptyState`, `Toast`, `FileDrop`.

## Do not
No login screen, settings page, animations, dark mode, or custom illustrations. Spend the time on empty states, error messages and the guided demo.
