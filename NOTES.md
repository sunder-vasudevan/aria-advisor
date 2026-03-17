


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

### 1. Deploy backend to Render — verify FEAT-101 on production
The Client model schema changed (7 new columns). Render auto-deploys from GitHub but the Supabase production DB needs the migration to run. On first backend startup after deploy, `_run_migrations()` in `main.py` will add the columns automatically. Verify:
- `POST /clients` works on https://aria-advisor.onrender.com
- `PUT /clients/{id}` works
- New client appears in client list

### 2. FEAT-503 — Live goal probability recalculation (next committed backlog item)
- Trigger projection calls automatically as sliders move (debounced, no manual button)
- Keep request load controlled (debounce + last-request-wins)
- Update each goal card instantly with scenario probability and delta

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
