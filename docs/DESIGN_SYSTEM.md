# DESIGN_SYSTEM - ProofGate

Owner: Khushi. Where this file and UI_SPEC.md disagree on look and feel, **this file wins**. Screen contents and behaviour stay in UI_SPEC.md; user flows and copy live in UX_PLAN.md.

## 1. Design idea: a proofing desk
ProofGate does what an editor does with a manuscript: reads it, marks what is wrong, points to the reference, and a person signs it off. The interface borrows that world, not the usual SaaS dashboard:
- The content under review is a **sheet of paper** in a serif face, with **proofreader's marks** on the text itself.
- Findings are **margin notes** beside the exact line they refer to.
- An approval is a **sealed record** that lists the exact source versions it stands on.
- When a source changes, the seal on the affected records is visibly **reopened**, with the old value struck through and the new value written in red pen.

Spend the boldness here, in the document view, the seal and the reopen moment. Everything else stays quiet.

### Review against the defaults (done before writing this)
| First instinct | Why it is a default | What we do instead |
|---|---|---|
| Cream background with a terracotta accent and a display serif | The most common "warm editorial" look | Cool, slightly green paper-white canvas with verdigris (aged copper) as the only brand colour |
| Near-black with one acid accent | Common "AI tool" look | Light, calm, high legibility; colour is reserved for status |
| Identical rounded cards with soft shadows | Generic SaaS kit | The paper sheet is the only raised object; lists and panels use 1px rules; radius varies by role |
| All-caps eyebrows, numbered "01 / 02" labels, arrows on buttons, mono labels everywhere | Template chrome | Sentence case; numbers only where there really is a sequence (the 5-step demo); mono only for hashes and IDs |
| Gradient washes, glassmorphism | Decoration | None |

## 2. Colour
Light theme only (no dark mode this round). All text pairs below were checked for contrast.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--canvas` | #F4F6F4 | App background | ink 14.3:1 |
| `--paper` | #FFFFFF | Document sheet, panels, inputs | ink 15.5:1 |
| `--ink` | #1D2433 | Primary text (blue-black, not pure black) | |
| `--ink-2` | #4A5468 | Secondary text | 7.6:1 on paper |
| `--ink-3` | #667085 | Hints, timestamps (minimum 13 px) | 5.0:1 on paper |
| `--line` | #D5DCD9 | Dividers, panel borders (decorative) | |
| `--line-strong` | #7A8783 | Input and control borders | 3.7:1 on paper |
| `--verdigris` | #0B5B5F | Brand, primary buttons, links, focus ring, "supported" | 7.9:1 |
| `--verdigris-tint` | #E3F0EE | Selected rows, supported background | text 6.7:1 |
| `--red-pen` | #B4302A | Contradicted, corrections, destructive | 6.2:1 |
| `--red-tint` | #FBE9E7 | Contradicted background | text 5.3:1 |
| `--amber` | #8A5300 | Outdated source, revalidation | 6.3:1 |
| `--amber-tint` | #FBF0D9 | Amber background | text 5.6:1 |
| `--indigo` | #3A47A0 | Needs review | 8.1:1 |
| `--indigo-tint` | #E8EBFA | Indigo background | text 6.8:1 |
| `--plum` | #6B3FA0 | Conflicting sources | 7.4:1 |
| `--plum-tint` | #F0E9F8 | Plum background | text 6.2:1 |
| `--slate` | #586174 | Unverifiable, draft | 6.2:1 |
| `--slate-tint` | #EDF0F3 | Slate background | text 5.4:1 |

Rules: verdigris and red pen carry the story (verified vs corrected). Do not introduce other hues. Status is never colour alone: each has an icon and a text label.

```css
:root {
  --canvas:#F4F6F4; --paper:#FFFFFF; --ink:#1D2433; --ink-2:#4A5468; --ink-3:#667085;
  --line:#D5DCD9; --line-strong:#7A8783;
  --verdigris:#0B5B5F; --verdigris-tint:#E3F0EE;
  --red-pen:#B4302A; --red-tint:#FBE9E7;
  --amber:#8A5300; --amber-tint:#FBF0D9;
  --indigo:#3A47A0; --indigo-tint:#E8EBFA;
  --plum:#6B3FA0; --plum-tint:#F0E9F8;
  --slate:#586174; --slate-tint:#EDF0F3;
  --radius-control:6px; --radius-paper:3px; --radius-tag:4px;
  --ease:cubic-bezier(.2,.7,.2,1);
}
```

## 3. Typography
Load with `next/font/google` (self-hosted at build, no layout shift).

| Role | Family | Weights | Where |
|---|---|---|---|
| Voice and document | **Source Serif 4** | 400, 600 | Page titles, section titles, the content under review, the clearance statement |
| Interface | **IBM Plex Sans** | 400, 500, 600 | Navigation, buttons, forms, tables, notes |
| Data | **IBM Plex Mono** | 400 | File hashes and IDs only |

| Style | Font, size / line height | Notes |
|---|---|---|
| Page title | Serif 600, 30/38 | Sentence case, one per page |
| Section title | Serif 600, 20/28 | |
| Panel title | Sans 600, 15/22 | |
| Body | Sans 400, 15/24 | Max line length about 70 characters |
| Document text | Serif 400, 17/29 | Max 64 characters per line; this is the "manuscript" |
| Small | Sans 400, 13/20 | Meta, hints |
| Minimum | Sans 400, 12/16 | Tags only, never for sentences |
| Values | Plex Sans with `font-variant-numeric: tabular-nums` | Prices, versions, percentages |

No all-caps labels, no letter-spacing tricks, no italic-one-word headline accents. Headlines are plain sentences ("Check a poster against approved facts").

## 4. Space, shape, elevation
- 4 px base grid: 4, 8, 12, 16, 24, 32, 48, 64. Page gutters 24 (16 on mobile). Max content width 1200.
- Radius by role, not one value everywhere: paper 3 px (documents have near-square corners), controls 6 px, tags 4 px. No pills except the role switcher.
- Elevation: only the paper sheet and overlays (dialog, drawer, toast) get a shadow. Panels and lists use a 1 px `--line` border.
  - Paper: `0 1px 0 rgba(29,36,51,.04), 0 12px 28px -16px rgba(29,36,51,.22)`
  - Overlays: `0 16px 40px -12px rgba(29,36,51,.28)`
- Focus: 2 px verdigris ring with 2 px offset on every interactive element, never removed.

## 5. The proofreader's mark system (the signature)
Marks sit on the quoted text inside the document. They pair with a margin note and a status label, so colour is never the only signal.

| Status | Mark on the text | Icon (Lucide) | Label |
|---|---|---|---|
| supported | thin dotted underline in verdigris | `Check` | Supported |
| contradicted | red strikethrough on the quote, correct value handwritten-style next to it in red (use Source Serif italic here only, as a pen note) | `PenLine` | Contradicted |
| expired_or_superseded | wavy amber underline | `Clock` | Outdated source |
| unverifiable | grey dashed underline | `CircleHelp` | Unverifiable |
| conflicting_evidence | double plum underline | `GitCompareArrows` | Conflicting sources |
| review_needed | indigo outline box around the quote | `Eye` | Needs review |

Behaviour: hover or focus on a mark highlights its margin note; selecting a note scrolls and pulses the mark once (500 ms background tint). Marks are real `<mark>` elements with `aria-describedby` pointing to the note.

## 6. Components

### Shell
- **Top bar** (56 px, paper background, bottom 1 px line). Left: wordmark "ProofGate" in Source Serif 4 600 with a small seal glyph (a 20 px square outline with a verdigris check). Centre: nav text links (Home, Library, Content, Review, Revalidation, Audit); active link has a 2 px verdigris underline. Right: role switcher and "Reset demo" text button.
- **Role switcher**: segmented control, 3 options, radius 6, selected segment filled verdigris with white text; a small caption beside it: "Demo mode, no sign-in". Switching role shows a toast ("Now viewing as Reviewer") and goes to that role's start page.
- **Guided strip** under the top bar on the first visit: one line, "Try the 5-step demo" with a progress count and a dismiss button.

### Buttons
Primary (verdigris fill, white text), Secondary (paper, 1 px `--line-strong`, ink text), Quiet (text only, ink-2), Destructive (paper, red border and text; fills red on hover). Height 36 (default) and 44 (primary page action, touch). Labels are verbs: "Check content", "Apply fix", "Send for review", "Approve", "Reject", "Add new version". No arrows in labels.
States for every button: default, hover, focus, active, disabled (with reason in a tooltip), loading (spinner replaces icon, label stays).

### Paper sheet
White, radius 3, paper shadow, padding 48 desktop / 20 mobile, document text style. A thin header strip inside the sheet shows content title, version selector and a status tag. This is the biggest object on screen.

### Margin note (finding)
Panel with a 3 px left border in the status colour, tinted background only for blockers. Contents in order: status label with icon, the quote in serif (max two lines, "show more"), one sentence explanation, source line "Pro plan price, version 1: Rs. 499 per user per month" (a link that opens the library drawer), suggested fix as a small block, actions **Apply fix** and **Dismiss**. Notes align vertically with their mark; if two collide, the later note shifts down (no overlap). On screens under 1024 px notes move below the paper in document order.

### Source tag
Inline tag: title, then "v2" in tabular numerals; border 1 px line, radius 4, 13 px. A hash or ID, if shown, uses Plex Mono 12 px.

### Seal (clearance tag)
Rectangular stamp, radius 4, double border (1 px outer, 1 px inner with 2 px gap) in verdigris, serif text on two lines: "Cleared" and "Version 2, 5 Nov 2026". State variants: Cleared (verdigris), Needs revalidation (amber, same shape, text "Reopened" and the reason), Rejected (red pen), In review (indigo), Draft (slate). The seal is the single recurring brand object.

### Value change
`<DiffValue old="Rs. 499" new="Rs. 699" />`: old value struck through in ink-3, new value in red pen serif italic beside it, with an accessible label "changed from Rs. 499 to Rs. 699".

### Source ledger (clearance record "Based on")
A table with a left rule, no zebra: claim quote, source title, version tag, value, link status tag (Confirmed / Probable) and, if the source has since changed, an amber line "Source changed to version 2 on 5 Nov". Rows align on a baseline grid; numbers right-aligned and tabular.

### Forms and inputs
Paper background, 1 px `--line-strong` border, radius 6, 40 px height, visible label above (never placeholder-only), helper text under in 13 px, error text in red pen with an icon and a plain instruction. Text areas for content: serif 16/26 so people feel they are writing on the page.

### Overlays
- **Drawer** (library row details): 480 px from the right, slides in 200 ms, traps focus, closes on Escape.
- **Impact preview dialog**: lists "These approvals depend on this source" before confirming a source change; primary button "Add version and reopen 2 approvals" states the consequence in the label.
- **Toast**: bottom left, 5 s, verbs match the action ("Version added", "Approved", "Sent back to creator"), has an Undo only where undo really exists.

### Empty, loading, error
- Loading analysis: indeterminate verdigris bar under the paper header and the text "Checking against 8 approved sources" (use the real count). Skeleton notes in the margin. Announce completion with `aria-live="polite"`: "Check finished: 3 need fixing, 1 checked OK."
- Empty: one sentence of what this is and one button. No illustrations.
- Error: what happened, what to do, retry button. Example: "The AI service did not respond. Checks that need no AI are shown below, and explanations use standard wording."

## 7. Screens (layout intent)

### Home
```
+--------------------------------------------------------------------+
| ProofGate   Home Library Content Review Revalidation Audit  [Role] |
+--------------------------------------------------------------------+
| Check content against approved facts, then keep every approval     |
| honest when the facts change.                      (Serif 30)      |
| Reads with AI. Checks with code. Decided by people.                |
|                                                                    |
| [ Start with the sample poster ]   Browse approved sources         |
|                                                                    |
| Five-step demo                              (this really is a      |
| 1 Look at the price in the library          sequence, so numbers   |
| 2 Check the sample poster                   are justified)         |
| 3 Fix three issues and send for review      each step shows a      |
| 4 Approve as a reviewer                     tick when completed    |
| 5 Change the price and see what reopens                            |
+--------------------------------------------------------------------+
```
Left aligned, one column about 640 px wide with generous whitespace on the right; no hero image.

### Content page (the memorable screen)
```
+----------------------------------------------+---------------------+
| Poster, version 2           [v1|v2] In review|  Margin notes        |
| +------------------------------------------+ |                     |
| |                                          | | [x] Contradicted    |
| |  BrightDesk Pro: now just Rs. 499 per    | |  "free for 30 days" |
| |  user per month.                         | |  Approved: 14 days  |
| |  Try it free for ~~30 days~~ 14 days     |-|  Trial length v1    |
| |  Guaranteed 100% uptime, always.         | |  [Apply fix][Dismiss]|
| |                                          | | [check] Supported   |
| +------------------------------------------+ |  ...                |
+----------------------------------------------+---------------------+
| 2 need fixing   1 checked OK            [ Send for review ]  sticky |
+--------------------------------------------------------------------+
```
Paper sheet takes 7 of 12 columns, notes 5. Left aligned text.

### Clearance record (the document of record)
```
+--------------------------------------------------------------------+
| Clearance for "Pro plan poster", version 2                [SEAL]   |
| Approved by Reviewer on 5 Nov 2026, 14:20. Hash 9f3a...c1 (mono)   |
|                                                                    |
| This approval stands on                                            |
| Claim                     Source              Value        Link    |
| Rs. 499 per user / month  Pro plan price v1   Rs. 499      Confirmed|
| free for 14 days          Trial length v1     14 days      Confirmed|
| ...                                                                |
| History: Approved, Reopened (price changed), ...                   |
+--------------------------------------------------------------------+
```

### Revalidation queue
Each item is a bordered panel: title and the seal in "Reopened" state on the right, the reason in one sentence, the quote with `DiffValue`, buttons **Re-approve with current sources** and **Send back to creator**. Below: "Not affected" group, collapsed, with one line each explaining why ("Mentions Rs. 399 as a 2025 price, so it does not depend on today's price").

## 8. Motion
Keep it rare. Motion answers an action or marks the one moment that matters.
- 120 ms for hover, 200 ms for drawers, dialogs, toasts; easing `var(--ease)`.
- Selecting a note pulses its mark once (500 ms tint).
- **The one orchestrated moment:** after a source change, the affected seal changes from Cleared to Reopened (cross-fade, 300 ms), the old value strikes through (width animation, 300 ms), then the new value appears in red pen (clip-reveal, 300 ms), staged by 150 ms. Plays once, only on the revalidation screen when arriving from a change.
- No entrance animations on page load, no hover lifts, no parallax.
- `prefers-reduced-motion`: replace all of it with instant state changes.

## 9. Responsive
Design at 1440, check 1024 and 390.
- 1024 and below: notes move under the paper in document order; nav collapses into a "Menu" button with a sheet; the sticky action bar stays.
- 390: single column; role switcher moves into the menu; tables become stacked rows with labels; touch targets at least 44 px.
- Approving on a phone must work end to end (judges may check on mobile).

## 10. Accessibility floor
Keyboard reachable everywhere, visible focus, skip link, headings in order, labels on all inputs, status by icon and text, live region for analysis results, focus returns to the trigger when overlays close, zoom to 200% without loss, `lang="en"`, `<mark>` and notes linked with ARIA, no information in colour alone. Run axe (or Lighthouse accessibility) on every screen, target 95 or higher.

## 11. Implementation notes for Next.js
- Tailwind with the tokens above in `tailwind.config.ts` (`theme.extend.colors`, `borderRadius`, `boxShadow`, `fontFamily`). No default Tailwind palette colours in components.
- Headless primitives for accessibility: Radix UI (Dialog, Tooltip, Tabs/ToggleGroup), plus Lucide icons. Style them yourself; do not ship a pre-styled kit look.
- Components live in `src/components/ui` with one story-style page at `/design` (hidden from nav) showing every component and state, used for QA and screenshots.
- Build order: tokens and fonts, TopBar, RoleSwitcher, Button, StatusMark, PaperSheet, MarginNote, Seal, DiffValue, then pages.

## 12. Design QA (do this before Block G, with screenshots)
- [ ] 1440, 1024 and 390 screenshots of every screen reviewed side by side
- [ ] Every component shows default, hover, focus, active, disabled, loading and error states on `/design`
- [ ] No text under 12 px; no sentence in 12 px
- [ ] Text, icon and mark alignment on a 4 px grid; nothing off by a pixel in the margin notes
- [ ] Only the tokens above appear in CSS (search the code for stray hex values)
- [ ] One accent moment (reopen), no stray animation
- [ ] Copy review against the copy deck in UX_PLAN.md
- [ ] Remove one thing from each screen before shipping
