


# ARIA — Advisor Relationship Intelligence Assistant — Session Notes

> *"Know before they call. Relationships, backed by intelligence."*

## Current State
**Phase:** 2 — USP Depth 🔶 IN PROGRESS
**Version:** v1.2
**Repo:** https://github.com/sunder-vasudevan/aria-advisor
**Local:** `/Users/sunnyhayes/Daytona/aria-advisor`
**Mobile:** ✅ Fully responsive (iOS + Android web)

## Deployed URLs
- **Frontend:** https://aria-advisor.vercel.app (Vercel)
- **Backend:** https://aria-advisor.onrender.com (Render, free tier)
- **Database:** Supabase PostgreSQL (pooler, port 6543)

## What's Built
- Full FastAPI backend (models, routers, seed data, Claude API integration, audit logging)
- React + Vite frontend (Client List, Client 360, all components)
- 20 Indian clients seeded across HNI and Retail segments
- AI Copilot chat, Morning Briefing, Situation Summary, Meeting Prep Card — all live
- Advisor Login + Client Login + Client Portal (frontend-only auth, localStorage)
- ARIA_USP_WF.md — benchmarking vs Wells Fargo Advisors
- HELP.md — full feature guide and setup docs
- PRD.md v1.1 — updated with WF benchmark, FEAT-308/309 added

## What Shipped This Session (2026-03-17 — Session 7)
- **FEAT-101: Add + Edit Client module** ✅
  - 7 new fields on Client model: phone, email, date_of_birth, address, city, pincode, pan_number
  - `POST /clients` — create new client
  - `PUT /clients/{id}` — update any field (risk_category auto-derived)
  - Startup migration — adds columns to existing DB without data loss
  - `ClientForm.jsx` — single reusable form for add and edit
  - DOB auto-calculates age; risk score slider auto-shows category label
  - "Add Client" button in ClientList header
  - "Edit" button in Client360 sidebar
  - Routes: `/clients/new` and `/clients/:id/edit`
- Commit: `01d1af3` → pushed to GitHub, Vercel auto-deploying

---

## Next Session Agenda ← START HERE NEXT SESSION

### 1. Verify FEAT-101 on production (Render + Supabase)
Client model schema changed — 7 new columns. `_run_migrations()` in `main.py` auto-runs on startup.
- Confirm `POST /clients` and `PUT /clients/{id}` work on https://aria-advisor.onrender.com
- Confirm new client appears in client list after adding

### 2. Complete client onboarding — FEAT-102, FEAT-108, FEAT-109 (full add-client flow)
FEAT-101 is step 1 only (basic info). A newly added client has no portfolio, no holdings, no goals — making them invisible to AI features (briefing, copilot, goal projection).

Full onboarding requires:
- **FEAT-102** — Risk questionnaire (guided Q&A → auto-calculates risk score, replaces manual slider)
- **FEAT-108** — Add portfolio + holdings (fund name, allocation %, value)
- **FEAT-109** — Add goals (name, target amount, target date, monthly SIP → initial probability calculated)

These 3 + FEAT-107 (multi-step wizard) = a complete "Add New Client" flow for the bank demo.

### 3. FEAT-503 — Live goal probability recalculation
- Trigger projection calls automatically as sliders move (debounced)
- Update goal cards in real-time with scenario probability and delta

## What Shipped This Session (2026-03-17)
- Full stack deployed to Render + Supabase + Vercel ✅
- FEAT-308 Meeting Prep Card ✅
- Advisor Login / Client Login / Client Portal ✅
- WF benchmarking + PRD v1.1 ✅
- HELP.md + v1.2 version number in UI ✅
- Anthropic API credits added — Morning Briefing + Meeting Prep confirmed working ✅

## Open Flags
- Supabase production DB needs FEAT-101 migration confirmed on first Render deploy
- Next committed: FEAT-503 (goal probability sliders) → FEAT-301 (book-level copilot)
