# TEST_PLAN

## 1. Unit tests (Vitest) - write these in block C/E
**Normalization**
- "Rs. 499 per user per month" -> {499, INR_per_user_month}
- "Rs.499/user/month" -> same
- "30-day", "30 days", "thirty days" -> {30, days}
- "99.9%" -> {99.9, percent}

**Compare**
| Claim | Source | Expected |
|---|---|---|
| 499 INR_per_user_month | pro_price v1 = 499 | supported, confirmed |
| 30 days | trial_days = 14 | contradicted |
| 100 percent | uptime_sla = 99.9 | contradicted |
| 20 percent, source expired | festive_discount expired | expired_or_superseded |
| claim fact_key null | none | unverifiable |
| two current sources with same key | n/a | conflicting_evidence |
| historical claim with 399 | pro_price = 499 | no dependency, no contradiction |

**Terms**: "Guaranteed" flagged; "guarantee" inside another word is not (word boundary); "Bright Desk" flagged, "BrightDesk" not.

**Injection**: "Ignore previous instructions" flagged; normal sentences not.

**Versioning / revalidation**
- supersede creates v2 current, v1 superseded, exactly one current.
- clearance with confirmed dependency on pro_price v1 -> `revalidation_required` after supersede.
- clearance with only `probable` link -> unchanged.
- clearance with a historical claim -> unchanged.
- clearance already `revalidation_required` is not duplicated.
- withdraw and expire behave the same as supersede.

## 2. Integration tests
- POST content A, analyze -> 4 findings as in SEED_DATA.
- Model forced to fail -> findings still returned, `aiAvailable=false`.
- Model returns a claim whose quote is not in the text -> dropped.
- submit-for-review blocked while a blocker is unresolved.
- role `creator` calling decision endpoint -> 403.
- Workspace isolation: workspace 1 cannot read workspace 2 content (404).
- 5 MB upload -> 413 with a clear message. `.exe` -> 415.

## 3. End-to-end (Playwright, one test)
Open site (fresh context) -> Home shows steps -> load sample A -> see 3 blockers -> apply fixes -> send for review -> switch to Reviewer -> approve -> switch to Admin -> add pro_price v2 = 699 -> revalidation queue has A with reason "Price changed" and B is under Not affected.

## 4. Manual checklist on the deployed link (incognito, twice, plus one phone)
- [ ] Opens with no sign-in; Home explains the steps.
- [ ] Reset demo works.
- [ ] Sample A, B, C, D, E all behave as in SEED_DATA.
- [ ] PDF upload with real text produces findings. Scanned PDF shows the friendly message.
- [ ] Turn off the Gemini key in a preview deploy: app still produces deterministic findings with the banner.
- [ ] Two different browsers have separate data.
- [ ] Keyboard: tab through the finding cards and the decision buttons.
- [ ] No console errors on the main flow.
- [ ] README setup works from a clean clone.

## 5. Labelled test set (also used for the Round 3 precision report)
Create `tests/gold.json` with at least 30 short claims now (grow to 60 later). Each item: `text`, expected `fact_key`, expected `context`, expected status, `should_trigger_revalidation_on_price_change` (bool). Include the tricky cases: historical price, competitor price in a quote, hypothetical ("if the price were Rs. 299"), a price with a different unit (annual vs monthly), a number in an unrelated context ("499 customers").

Report: precision of `should_trigger_revalidation` = correct reopens / all reopens. Round 3 target: at least 95% before any automatic stale marking is enabled by default.

## 6. Notes on expected edge behaviour
- Sample D: "Offer ends 10 November" is compared against `valid_until` of festive_discount (2026-11-10). A mismatched date -> contradicted. Keep this rule simple (one date format list); if it costs time, treat the sentence as unverifiable and say so in the notes.
- Claims about the same number appearing twice in one text produce two claims but one dependency per source version.
