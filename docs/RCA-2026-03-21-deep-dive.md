# RCA-2026-03-21 — ARIA Advisor Workbench: Failed to Load Clients

**Date:** 2026-03-21
**Severity:** P1 — All advisors locked out; client list unavailable
**Status:** Resolved (4 fixes deployed)
**Author:** Engineering Post-Mortem

---

## Summary Table

| Root Cause | Location | Introduced | Effect | Fixed |
|------------|----------|------------|--------|-------|
| RC-1: `== True` boolean filter | `advisor_auth.py:42` | commit c9ab013 | `GET /advisor/login` → 0 rows → 401 for all advisors | commit b7a0348 |
| RC-2: String-based `order_by` in relationship | `models.py` `Client.interactions` | commit b0228d3 | SQLAlchemy mapper/query crash → 500 on `GET /clients` | commit e0e275d |
| RC-3: `personal_user_id` unmapped in ORM | `models.py` `Client` class | commit ec574c2 | `AttributeError` on `c.personal_user_id` → 500 on `GET /clients` | commit 3546f66 |
| RC-4: `FRONTEND_URL` env var missing on Render | `main.py` CORS config | Deployment gap | Browser CORS error on every request after login | commit 910ad8e |
| RC-5 (trigger): Silent Python 3.11 → 3.14 upgrade | Render free tier | 2026-03-21 | Surfaced all three latent code bugs simultaneously | Pending: pin `runtime.txt` |

---

## 1. Incident Overview

**Symptom reported:** "Failed to load clients for Rahul and Hamza"

The full failure chain was:
1. Advisor login returned 401 (all advisors locked out).
2. After RC-1 was fixed, `/clients` returned 500.
3. Browser devtools showed a CORS error on `/clients` — masking the real server crash.
4. bcrypt was incorrectly suspected for several hours before the actual root causes were isolated.

All failures were triggered by a single external event: Render silently upgraded the backend runtime from Python 3.11 to Python 3.14. Three independent latent code defects existed in the codebase and were hidden by Python 3.11's more permissive behaviour. Python 3.14 broke all three simultaneously.

---

## 2. Feature History — How Each Defect Was Introduced

### 2.1 FEAT-404: Client Interaction Capture (commit b0228d3)

Added the `ClientInteraction` model and the `interactions` relationship on `Client`:

```python
interactions = relationship(
    "ClientInteraction",
    order_by="ClientInteraction.interaction_date.desc()"
)
```

The `order_by` value is a **string expression** that SQLAlchemy evaluates at mapper init time. This worked on Python 3.11. Python 3.14 changed how string expressions are evaluated in this context, causing mapper init failure or a crash at query time.

### 2.2 FEAT: Performance + Advisor Auth (commit c9ab013)

Added the `Advisor` model and the login endpoint. The `is_active` filter was written as:

```python
db.query(Advisor).filter(Advisor.is_active == True)
```

In Python 3.14, SQLAlchemy's evaluation of `Boolean == True` in filter expressions changed. This produced a filter that matched 0 rows, returning no advisor regardless of credentials — causing every login attempt to return 401.

### 2.3 FEAT: portal_active badge (commit ec574c2)

Added `portal_active=c.personal_user_id is not None` to `list_clients`. The `personal_user_id` column was added to the database via `_run_migrations()` in `main.py`, but **was never declared as a `Column()` in `models.py`**.

- **Python 3.11 behaviour:** SQLAlchemy's `__getattr__` on a mapped instance returned `None` for unmapped attribute access — silently incorrect but non-crashing.
- **Python 3.14 behaviour:** Raises `AttributeError` on unmapped attribute access.

This is a column that exists in the database and is invisible to the ORM. The bug survived undetected for the entire 3.11 lifespan of the app.

### 2.4 FEAT: Advisor-Scoped Client List (commit d9ddc73)

Added `X-Advisor-Id` header filtering to `list_clients`. Frontend now sends `X-Advisor-Id` on every request. This change itself was clean — but it ensured that `list_clients` was exercised on every page load, making the RC-3 crash unavoidable once Python 3.14 hit.

### 2.5 Render Python Upgrade (detected 2026-03-21)

Render's free tier upgraded the backend runtime from Python 3.11 to Python 3.14 without notification. This was confirmed via `sys.version` in a debug endpoint added during the incident. Exact upgrade date is unknown — the backend may have been on 3.14 for some time before a deploy triggered a restart that activated the failure.

---

## 3. Root Cause Analysis

### RC-1: SQLAlchemy Boolean Filter `== True` (Python 3.14)

**File:** `backend/app/routers/advisor_auth.py`, line 42
**Introduced:** commit c9ab013
**Trigger:** Python 3.14 runtime

The expression `Advisor.is_active == True` is evaluated by SQLAlchemy's column comparison machinery. Python 3.14 changed the behaviour of this expression such that it no longer produces a valid SQL `WHERE is_active = TRUE` clause in this context. The resulting query returned 0 rows.

**Effect:** Every `POST /advisor/login` returned 401. All advisors were locked out.

**Fix (commit b7a0348):** Replace with `Advisor.is_active.is_(True)`, which uses SQLAlchemy's explicit `.is_()` method and is not subject to Python operator evaluation changes.

---

### RC-2: String-Based `order_by` in Relationship (Python 3.14)

**File:** `backend/app/models.py`, `Client.interactions` relationship definition
**Introduced:** commit b0228d3
**Trigger:** Python 3.14 runtime

`order_by="ClientInteraction.interaction_date.desc()"` is a string expression. SQLAlchemy evaluates it using Python's `eval()` or an internal expression evaluator during mapper configuration or query execution. Python 3.14 changed the evaluation context or scoping rules for this, causing the mapper to fail to resolve the expression — producing a crash on `GET /clients` any time interactions were loaded or the relationship was touched during mapper init.

**Effect:** `GET /clients` returned 500.

**Fix (commit e0e275d):** Remove the `order_by` argument entirely from the relationship. Ordering is handled at the query layer where needed, using an explicit column reference.

---

### RC-3: `personal_user_id` Not Declared in Client ORM Model

**File:** `backend/app/models.py`, `Client` class
**Introduced:** commit ec574c2
**Trigger:** Python 3.14 `AttributeError` on unmapped attribute access

This is the most structurally dangerous defect. The migration in `_run_migrations()` added `personal_user_id` to the `clients` table in the database. The column exists in Postgres. It does not exist in the `Client` SQLAlchemy model. The `list_clients` endpoint accesses `c.personal_user_id` on every `Client` ORM instance to compute the `portal_active` badge.

**Python 3.11:** `__getattr__` on a mapped SQLAlchemy instance returned `None` for any attribute not in the column map. The expression `c.personal_user_id is not None` evaluated to `False` silently — wrong but non-crashing. The `portal_active` badge was always `False` as a result, but the endpoint returned 200.

**Python 3.14:** `__getattr__` behaviour on SQLAlchemy mapped instances changed to raise `AttributeError` for unmapped attributes. The first `c.personal_user_id` access on the first client in the result set raised an unhandled `AttributeError`, crashing the request handler and returning 500.

**Effect:** `GET /clients` returned 500 for every advisor.

**Fix (commit 3546f66):** Add `personal_user_id = Column(Integer, nullable=True)` to the `Client` model. The ORM now maps the column, attribute access works, and the `portal_active` computation is correct.

---

### RC-4: `FRONTEND_URL` Env Var Not Set on Render

**File:** `backend/app/main.py`, CORS middleware configuration
**Introduced:** Deployment gap — CORS was always env-var-driven, but `FRONTEND_URL` was never set on Render

The CORS `allow_origins` list was built from environment variables. With `FRONTEND_URL` unset, `https://a-ria.vercel.app` was not in the allowed origins list. This caused the browser to receive a CORS rejection on any request that crossed origins.

**Compounding effect:** A 500 response from the server does not include CORS headers, because the server crashed before the CORS middleware ran. This made RC-2 and RC-3 appear in the browser as CORS errors rather than server errors. This misdirected debugging for a significant period.

**Fix (commit 910ad8e):** Hardcode known production origins (`https://a-ria.vercel.app`, etc.) as a fallback in addition to the env var. Set `FRONTEND_URL` on Render as a permanent measure.

---

### RC-5: Why All Three Broke At Once

Render's free tier upgraded Python from 3.11 to 3.14 silently. The three code defects (RC-1, RC-2, RC-3) were all latent and had coexisted in the codebase for varying lengths of time:

- RC-2 (string order_by) was the oldest — introduced in FEAT-404.
- RC-3 (unmapped column) was introduced mid-development and had been silently wrong since.
- RC-1 (boolean filter) was introduced with advisor auth.

None were detectable via manual testing on Python 3.11. Python 3.14's stricter behaviour surfaced all three in a single restart.

---

## 4. Failure Mode Analysis

### Why bcrypt Was Suspected

After RC-1 was fixed (login worked), `/clients` still returned 500, which the browser displayed as a CORS error (due to RC-4). The bcrypt library was suspected because it is a compiled C extension that can behave differently across Python minor versions. Debug endpoints confirmed bcrypt hashed and verified passwords correctly on 3.14. This was a dead end that consumed debugging time.

**Root cause of misdirection:** The CORS error in the browser gave no signal about the actual HTTP status or server-side traceback. Without raw HTTP visibility, the symptom was ambiguous.

### Why RC-3 Was Hard to Find

`personal_user_id` appears in the migration SQL in `main.py` but not in `models.py`. A developer reading `models.py` would have no indication that this column exists. A developer reading the migration would not know it was missing from the model. There was no test that crossed the ORM boundary for this attribute.

### The Masking Sequence

```
Python 3.14 upgrade
    → RC-1: login returns 401 (blocks all further investigation of /clients)
    → RC-1 fixed → login works
    → RC-2 + RC-3: /clients returns 500
    → RC-4: 500 has no CORS headers → browser shows CORS error
    → CORS error masks 500 → bcrypt suspected
    → Debug endpoints confirm bcrypt OK
    → Raw curl confirms 500 on /clients
    → RC-2 identified and fixed
    → RC-3 identified and fixed
    → RC-4 identified and fixed
```

Each fix revealed the next failure. The bugs were independent but their failure modes composed into a single confusing symptom chain.

---

## 5. Lessons Learnt

**1. ORM model != DB schema.**
Adding a column via `ALTER TABLE` in `_run_migrations()` without adding it to the SQLAlchemy model is a silent time bomb. On Python 3.11, ORM attribute access on unmapped columns returned `None` via `__getattr__` — wrong but non-crashing. On Python 3.14, it raises `AttributeError`. A migration and its corresponding model change must be in the same commit, always.

**2. PaaS Python upgrades are silent and breaking.**
Render upgraded Python without notification. Code that worked for months can break in subtle, non-obvious ways on a new minor version. The Python runtime must be pinned explicitly, not left to the PaaS default.

**3. A 500 response suppresses CORS headers.**
When the server crashes before CORS middleware runs, the browser receives no `access-control-allow-origin` header and reports a CORS error. The browser devtools CORS error is not a reliable signal that the problem is CORS configuration. Always check the raw HTTP status with `curl` before pursuing CORS as a cause.

**4. Multiple simultaneous bugs compound into false symptoms.**
Fix one (RC-1: login works), reveal the next (RC-3: /clients 500 looks like CORS). Systematic isolation — confirm each layer works independently before moving to the next — beats chasing the composite symptom.

**5. String-based SQLAlchemy expressions are fragile.**
`order_by="ClassName.column.desc()"` works until Python changes `eval()` semantics or SQLAlchemy's internal expression evaluator changes. Always use direct column references: `order_by=MyModel.column.desc()`. If the model is not yet importable at relationship definition time, restructure imports rather than using a string.

**6. `.is_(True)` is not stylistic — it is correct.**
`Advisor.is_active == True` relies on Python's `==` operator and SQLAlchemy's `__eq__` overload behaving consistently across Python versions. `.is_(True)` calls SQLAlchemy's explicit SQL IS method and is version-stable. This applies to all Boolean column comparisons in filter expressions.

---

## 6. Mitigation Plan

| # | Action | Status | Notes |
|---|--------|--------|-------|
| RC-1 | `.is_(True)` for boolean filters | Done (commit b7a0348) | Applied in `advisor_auth.py` |
| RC-2 | Remove string `order_by` from relationship | Done (commit e0e275d) | Removed from `Client.interactions` |
| RC-3 | Add `personal_user_id` to `Client` model | Done (commit 3546f66) | `Column(Integer, nullable=True)` |
| RC-4 | Hardcode Vercel CORS origins in `main.py` | Done (commit 910ad8e) | Fallback to hardcoded origins |
| RC-5 | Pin Python runtime on Render (`runtime.txt`) | Pending | Add `python-3.11.x` to `backend/runtime.txt` |
| RC-6 | Add startup env var validation logging | Pending | Log missing vars at app startup, not silently use defaults |
| RC-7 | Add post-deploy smoke test script | Pending | See Section 7 |

---

## 7. Guardrails for All Future Development

### 7.1 Code Standards

**Rule 1: Never use `== True` or `== False` for SQLAlchemy Boolean filters.**
Always use `.is_(True)` / `.is_(False)`.

```python
# Wrong
db.query(Advisor).filter(Advisor.is_active == True)

# Correct
db.query(Advisor).filter(Advisor.is_active.is_(True))
```

**Rule 2: Never use string-based `order_by` in SQLAlchemy relationships.**
Use direct column references. If a circular import prevents it, sort at the query layer.

```python
# Wrong
interactions = relationship("ClientInteraction", order_by="ClientInteraction.interaction_date.desc()")

# Correct
interactions = relationship("ClientInteraction", order_by=ClientInteraction.interaction_date.desc())

# Also acceptable: omit order_by and sort at query layer
```

**Rule 3: Every DB column added via migration must be declared in the ORM model in the same commit.**
If `_run_migrations()` adds `ALTER TABLE clients ADD COLUMN personal_user_id INT`, the corresponding `personal_user_id = Column(Integer, nullable=True)` must be in `Client` in the same commit. No exceptions.

**Rule 4: Use `ADD COLUMN IF NOT EXISTS` in all migrations.**
Already a project rule. Ensures idempotent migrations on re-deploy.

### 7.2 Infrastructure

**Rule 5: Pin Python version on Render before first deploy.**
Add `runtime.txt` to the backend root:
```
python-3.11.9
```
Render respects this file. Do not leave the runtime to PaaS default.

**Rule 6: Set CORS env vars on Render from day one.**
`FRONTEND_URL` and `PERSONAL_FRONTEND_URL` must be set as environment variables on Render at project creation. Also hardcode known production origins as a fallback in `main.py` so the app functions even if env vars are missing.

### 7.3 Debugging Protocol

**Rule 7: Before blaming CORS, check raw HTTP status.**
Run `curl -v` against the endpoint. A CORS error in the browser often means the server returned 500 before the CORS middleware ran. The browser gives no signal about this distinction. Raw curl does.

**Rule 8: When multiple bugs are suspected, isolate each layer independently.**
Login endpoint → client list endpoint → CORS headers. Confirm each layer returns the expected response before investigating the next. Do not chase the composite symptom.

### 7.4 Post-Deploy Smoke Test

After every Render deploy, run the following before marking the deploy complete:

```bash
BACKEND="https://<backend>.onrender.com"
FRONTEND="https://a-ria.vercel.app"

# Step 1: Login — must return 200 with a token
curl -s -X POST "$BACKEND/advisor/login" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND" \
  -d '{"username":"rm_demo","password":"aria2026"}' | jq .

# Step 2: Client list — must return 200 with access-control-allow-origin header
curl -sv \
  -H "Origin: $FRONTEND" \
  -H "X-Advisor-Id: 1" \
  -H "X-Advisor-Role: advisor" \
  "$BACKEND/clients" 2>&1 | grep -E "(< HTTP|access-control)"
```

Both must return 200 with `access-control-allow-origin: https://a-ria.vercel.app` present.

---

## 8. Commit Reference

| Commit | Description |
|--------|-------------|
| b0228d3 | FEAT-404 Client Interaction Capture — introduced RC-2 (string order_by) |
| c9ab013 | FEAT: performance + advisor auth — introduced RC-1 (boolean filter) |
| ec574c2 | FEAT: portal_active badge — introduced RC-3 (unmapped column) |
| d9ddc73 | FEAT: advisor-scoped client list — ensured RC-3 was exercised on every page load |
| b7a0348 | Fix RC-1: `.is_(True)` for advisor is_active filter |
| e0e275d | Fix RC-2: remove string order_by from Client.interactions relationship |
| 3546f66 | Fix RC-3: add personal_user_id Column to Client model |
| 910ad8e | Fix RC-4: hardcode Vercel CORS origins in main.py |

---

*End of RCA-2026-03-21-deep-dive.md*
