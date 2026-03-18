# ARIA — Test Log

> Records test results per feature. No feature is marked done until tested and logged here.

---

## Format

```
### [TEST-XXX] — Feature Name (FEAT-ID)
**Date:** YYYY-MM-DD
**Phase:**
**Tested by:** Sunny Hayes
**Test type:** Manual / Automated / Both
**Environment:** Local / Render+Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| | | | ✅ Pass / ❌ Fail / ⚠️ Partial |

**Known gaps:**
**Blocked on:**
```

---

### [TEST-001] — Client Book + Urgency Ranking
**Date:** 2026-03-16
**Phase:** 1
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Client list loads with 20 clients | All 20 seeded clients displayed | Loaded correctly | ✅ Pass |
| Urgency ranking orders correctly | High urgency clients at top | Ordered by urgency score | ✅ Pass |
| Search by name filters list | Matching clients shown | Working | ✅ Pass |
| Search by segment filters list | HNI / Retail filter works | Working | ✅ Pass |

**Known gaps:** Advanced filtering (FEAT-401) not yet built

---

### [TEST-002] — Client 360 View
**Date:** 2026-03-16
**Phase:** 1
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Client 360 loads for Priya Sharma (ID 1) | Full profile, portfolio, goals, life events | Loaded correctly | ✅ Pass |
| Holdings table displays allocations | Holdings with drift indicators | Displayed | ✅ Pass |
| Portfolio donut chart renders | Equity/debt/cash split | Rendered | ✅ Pass |
| Goals panel shows probability bars | Color-coded bars (green/amber/red) | Working | ✅ Pass |
| Life events display with timestamps | Events with days-ago | Working | ✅ Pass |

**Known gaps:** Data is static seed — no live NAV (FEAT-201)

---

### [TEST-003] — AI Situation Summary
**Date:** 2026-03-16
**Phase:** 1
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Summary auto-loads on Client 360 open | AI summary appears without prompt | Auto-loaded | ✅ Pass |
| Summary includes client context | Portfolio, goals, flags referenced | Contextually accurate | ✅ Pass |
| Suitability disclaimer present | "Subject to suitability review" | Present | ✅ Pass |

**Known gaps:** None

---

### [TEST-004] — AI Copilot Chat
**Date:** 2026-03-16
**Phase:** 1
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Suggested prompts shown on first load | 5 pre-built prompts visible | Showing | ✅ Pass |
| Demo question: "She needs money in 6 months, what changes?" | Structured 4-section response | Correct format | ✅ Pass |
| Multi-turn conversation maintains context | Follow-up questions reference prior context | Working | ✅ Pass |
| Audit log written per interaction | AuditLog record created | Verified in DB | ✅ Pass |

**Known gaps:** Book-level questions not yet built (FEAT-301)

---

### [TEST-005] — Morning Briefing
**Date:** 2026-03-16
**Phase:** 1
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Briefing loads for RM | Top 8 clients flagged with AI narration | Loaded | ✅ Pass |
| Urgency ranking matches client list | Same order as Client Book | Consistent | ✅ Pass |

**Known gaps:** None

---

### [TEST-006] — Monte Carlo + What-If Sliders (FEAT-501, FEAT-502)
**Date:** 2026-03-16
**Phase:** 2
**Tested by:** Sunny Hayes
**Test type:** Manual
**Environment:** Local + Vercel (prod)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Goal projection endpoint returns data | Monte Carlo result with probability % | Returns correctly | ✅ Pass |
| What-if sliders render in Goals tab | SIP / return / timeline sliders visible | Rendered | ✅ Pass |
| Slider changes update projection | Probability recalculates | ⚠️ Manual trigger only — FEAT-503 pending | ⚠️ Partial |

**Known gaps:** Live debounced recalculation not yet built — FEAT-503 is next
**Blocked on:** FEAT-503
