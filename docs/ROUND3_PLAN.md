# ROUND 3 PLAN - ProofGate (Team MANTIS)

This document is copied from the Round 3 build prompts and instructions.
See the top-level ROUND3_AGENT_PROMPT.md for the full prompts.

## Three Improvements (from Round 2 submission form)

### Improvement 1: Context-aware dependency linking with a measured precision report
- Probable links stored when code cannot verify (different units, close derived values, indirect mentions)
- Needs-confirming queue on review page (confirm → confirmed dep, reject → reason stored)
- Better deterministic context labels (past-time phrases, quote markers, hypothetical markers)
- Gold evaluation set (60+ cases) in tests/gold/
- /evaluation page: runs checker on every gold case; reports precision, recall, F1, confusion matrix

### Improvement 2: Visual brand and accessibility checks for images
- Asset source kind: palette (hex list + tolerance), reference logos, contrast thresholds
- Pipeline for PNG/JPG: Gemini vision locates → code measures on real pixels
- Findings: palette_off_brand, contrast_below_aa, logo_missing_or_unapproved, alt_text_missing
- Overlay UI: image with SVG boxes over problem areas linked to finding cards
- Image clearances create dependencies on asset source version; palette change reopens them

### Improvement 3: Governance insights and rule clarification
- /insights page: most violated rules, dismissal rate per rule, sources causing revalidations, median clearance time, daily trend
- Sample history button: 40 synthetic entries clearly labelled as sample data
- Unclear-rule detector: ≥3 dismissals and ≥40% dismissal rate flags a rule
- Clarification suggestions: Gemini drafts revised rule; code runs what-if; admin approves as new version

## Standing Rules (Round 3)
- AI proposes, code decides, humans approve.
- Zod on every input and model output.
- Every mutation writes audit_log.
- Workspace isolation on every query.
- App must keep working with Gemini off.
- No secrets in the repo; never touch .env files.
- Database changes go in idempotent migrations (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
- `npm run build` and `npm run test` must pass before each push.
- Small commits with honest messages.
- Add a dated line to CONTRIBUTIONS.md for every finished item.
- Never show a number you did not measure.

## Cut Lines (cut from bottom first if time runs short)
- Gemini-mode evaluation
- Trend chart
- Mobile polish of image overlay
- Suggestion generation (keep detector and metrics)
- Image logo check (keep palette and contrast)

Never cut: Round 2 fixes, probable-link queue, evaluation page, contrast and palette checks, insights metrics.

## Schedule (T+0 = Round 3 window open: ~10 Nov 2026)
- T+0 to T+2: Round 2 fixes (comments API, Playwright, neon.ts cleanup)
- T+2 to T+14: Improvement 1 (probable links, context rules, gold set, evaluation runner)
- T+14 to T+30: Improvement 2 (asset source, image pipeline, contrast math, tests)
- T+30 to T+44: Improvement 3 (metrics queries, sample history, detector)
- T+44 to T+54: Improvement 3 (suggestions + what-if)
- T+54 to T+62: Integration, security, tests, evaluation numbers, accessibility
- T+62 to T+66: Feature freeze. Bug fixes only. Final deploy.
- T+66 to T+70: Updated PDF, testing notes, submission list
- T+70 to T+72: Submit early. Incognito test.

