# ARIA — Decision Log

> Records key design and technical decisions made during development, including the reasoning and alternatives considered. This is the *why* behind the codebase.

---

## Format

```
### [DECISION-XXX] — Title
**Date:** YYYY-MM-DD
**Version / Phase:**
**Decision:** What was decided
**Alternatives considered:** What else was on the table
**Reasoning:** Why this option was chosen
**Trade-offs / known debt:** What we accepted by making this call
```

---

### [DECISION-001] — Stack: FastAPI + React/Vite + Supabase
**Date:** 2026-03-16
**Version / Phase:** Phase 1
**Decision:** FastAPI backend, React 18 + Vite frontend, PostgreSQL via Supabase, Claude API (claude-sonnet-4-6)
**Alternatives considered:** Next.js full-stack, Django REST, Flask
**Reasoning:** FastAPI is lightweight and fast for API-first architecture; React + Vite gives hot-reload DX without Next.js overhead for a dashboard app; Supabase free tier covers demo scale; Claude API is the AI backbone
**Trade-offs / known debt:** Separate frontend/backend adds deployment complexity vs. a monolith; accepted for clean API-first structure

---

### [DECISION-002] — Deployment: Render (backend) + Vercel (frontend) + Supabase (DB)
**Date:** 2026-03-16
**Version / Phase:** Phase 2
**Decision:** Backend on Render free tier, frontend on Vercel, DB on Supabase PostgreSQL (pooler port 6543)
**Alternatives considered:** Railway (full-stack), Fly.io, DigitalOcean
**Reasoning:** All free tier; Vercel is best-in-class for frontend CI/CD; Render handles Python backends without container config; Supabase already chosen for DB
**Trade-offs / known debt:** Render free tier spins down after inactivity — cold start latency on first request; acceptable for demo stage

---

### [DECISION-003] — AI Model: claude-sonnet-4-6 for all copilot features
**Date:** 2026-03-16
**Version / Phase:** Phase 1
**Decision:** Use claude-sonnet-4-6 for Situation Summary, Morning Briefing, and Copilot chat
**Alternatives considered:** GPT-4o, Gemini Pro, Haiku (for cost)
**Reasoning:** Claude Sonnet balances quality and cost; structured 4-section response format (Situation / Risks / Talking Points / Questions) works reliably with Claude's instruction-following; Anthropic API is already the stack
**Trade-offs / known debt:** API cost scales with usage; acceptable at demo scale, revisit at pilot

---

### [DECISION-004] — Middleware positioning (not CBS replacement)
**Date:** 2026-03-16
**Version / Phase:** Phase 1 — product strategy
**Decision:** ARIA sits on top of any core banking system, does not replace it
**Alternatives considered:** Full CBS replacement (out of scope), deep CBS integration
**Reasoning:** Banks won't rip-and-replace CBS; middleware positioning removes the biggest sales blocker and is deployable without touching core systems
**Trade-offs / known debt:** ARIA depends on data quality from upstream CBS; mock data used for v1 demo
