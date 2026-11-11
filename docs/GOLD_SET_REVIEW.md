# GOLD SET REVIEW — ProofGate (Team MANTIS)

## Overview
This document defines the labelling criteria and structure for the 60-case gold evaluation set used in Improvement 1 (context-aware dependency linking).

The gold set evaluates the question: **"Should this approval reopen when the referenced source changes?"**

## 1. Labels

Each case gets a binary gold label:

| Label | Meaning |
|-------|---------|
| `should_reopen: true` | The claim creates a confirmed dependency. If the source changes, the clearance should reopen. |
| `should_reopen: false` | The claim does NOT create a confirmed dependency. Source changes should NOT reopen it. |

## 2. Category Definitions

### TC-001 to TC-010: Current price (should_reopen: true)
Direct current-tense assertion of a price that exactly matches an approved source.
- Code can verify: number and unit match exactly.
- Link status: `confirmed`.
- Reopen on source change: YES.

### TC-011 to TC-020: Historical / quoted / hypothetical price (should_reopen: false)
Price mentioned in past tense, quoted speech, or hypothetical context.
- Context labels: `historical`, `quoted`, or `hypothetical`.
- Deterministic context rules can detect most of these.
- Reopen on source change: NO.
- Note: TC-018 and TC-019 are edge cases added to the reopen test suite.

### TC-021 to TC-030: Different unit / derived value (should_reopen: false → probable)
Price in a different billing period (annual vs monthly), or a derived value (12 × monthly = annual).
- Code cannot verify the link exactly (unit mismatch or derived math).
- Link status: `probable` (goes to needs-confirming queue).
- Reopen on source change: NO (until reviewer confirms).

### TC-031 to TC-040: Unrelated number / unverifiable (should_reopen: false)
A number with no matching source key, or a banned term that is NOT a numeric fact.
- Link status: null (unverifiable) or confirmed (banned term → confirmed but no dependency).
- Reopen on source change: NO.

### TC-041 to TC-050 (Governance): Rule dismissal patterns
Used for Improvement 3 (governance insights). These cases test whether the unclear-rule detector correctly flags rules with ≥3 dismissals and ≥40% dismissal rate.

### TC-051 to TC-060 (Security/Reliability)
Cross-workspace access attempts, injection tests, rate limit boundary cases.

## 3. Image Cases (TC-021 to TC-040 in Improvement 2 runner)
Image fixture cases use synthetic PNG files from scripts/make-fixtures.ts.
- Expected findings are deterministic (known colours, known contrast ratios).
- Cases marked "Not run" until Improvement 2 ships.

## 4. REV Set (Revalidation end-to-end)
REV-001 to REV-030: Tests that after a source change, only clearances with CONFIRMED dependencies reopen.

| REV ID | Description | Expected |
|--------|-------------|----------|
| REV-001 | Current price claim → source superseded | Reopen |
| REV-002 | Historical price claim → source superseded | No reopen |
| REV-003 | Confirmed uptime link → SLA changes | Reopen |
| REV-004 | Probable uptime link (not confirmed) → SLA changes | No reopen |
| REV-005 | Banned term confirmed → term rule withdrawn | Reopen |
| REV-006 | Spelling term confirmed → term rule superseded | Reopen |
| REV-007 | Historical mention of old price → new version published | No reopen |
| REV-008 | Quoted competitor price → source changes | No reopen |
| REV-009 | Clearance with two confirmed deps → one source superseded | Reopen |
| REV-010 | Clearance with two confirmed deps → neither superseded | No reopen |
| REV-011 | Hypothetical price → source changes | No reopen |
| REV-012 | Clearance from different workspace → source changes in workspace A | No reopen |
| REV-013 | Annual price (probable link) → monthly source superseded | No reopen (probable) |
| REV-014 | Annual price (reviewer-confirmed link) → monthly source superseded | Reopen |
| REV-015 | Rejected link → source superseded | No reopen |
| REV-016 | Multiple clearances: one confirmed, one probable → source superseded | Only confirmed reopens |
| REV-017 | Source expires (valid_until passed) → clearance with confirmed dep | Reopen |
| REV-018 | Source expires → clearance with probable dep | No reopen |
| REV-019 | Source withdrawn → clearance with confirmed dep | Reopen |
| REV-020 | Source withdrawn → clearance with historical mention | No reopen |
| REV-021 | Clearance re-approved after revalidation → original source superseded again | Reopen |
| REV-022 | Clearance sent back to creator after revalidation → state check | revalidation_required stays open |
| REV-023 | Guideline source superseded → confirmed dep on guideline | Reopen |
| REV-024 | Guideline source superseded → no dep (unverifiable claim) | No reopen |
| REV-025 | Image clearance → palette source changed | Reopen (Improvement 2) |
| REV-026 | Image clearance → logo retired | Reopen (Improvement 2) |
| REV-027 | Festive discount expired (valid_until) → confirmed dep | Reopen (expired) |
| REV-028 | Festive discount expired → no dep (mentioned in disclaimer) | No reopen |
| REV-029 | Double supersede: source v1 → v2 → v3; clearance locked to v1 | Reopen on v2 publish |
| REV-030 | Clearance locked to v2 → v3 published | Reopen only if dep to v2 |

## 5. Known Edge Cases and Labelling Notes

- **TC-018 and TC-019** (annual vs monthly price): These are ambiguous. The same Rs. 5988 figure could be derived (12 × 499) or coincidental. Label: `should_reopen: false` (probable, not confirmed until reviewer acts). Added to reopen suite to verify no auto-reopen.

- **Banned term findings**: Banned term checks always create a `confirmed` link to the term rule source version. If the term rule is superseded or withdrawn, clearances that accepted/dismissed the finding should reopen. This IS a dependency.

- **Spelling term dismissals**: Unlike banned terms, a spelling error that the creator dismisses with a reason (e.g., "this is a quotation") does NOT create a confirmed dependency on the spelling rule.

- **Injection findings**: `review_needed` status, never creates a dependency.

## 6. Precision / Recall Target
- Target precision ≥ 95% on the question "does this claim create a confirmed dependency?"
- Report precision, recall, F1 and sample size alongside the target on the /evaluation page.
- If below target, explain what changed and why.
- Do NOT tune the checker to specific gold case inputs.

## 7. How to Add Cases
1. Add the case to the appropriate JSON file in tests/gold/.
2. Run `npm run eval` (or use the /evaluation page) in deterministic mode.
3. If the case fails, investigate the checker, not the gold label.
4. If you believe a gold label is wrong, document it in this file and leave the label unchanged.

