# RCA: Login Failure / Client List 401 + CORS Errors

**Date:** 2026-03-21
**App:** ARIA Advisor Workbench — https://a-ria.vercel.app
**Severity:** P1 — All advisors unable to load client lists; login returning 401
**Status:** Resolved (RC-5 mitigation pending)

---

## Summary Table

| ID   | Root Cause                                      | Symptom                              | Status   |
|------|-------------------------------------------------|--------------------------------------|----------|
| RC-1 | SQLAlchemy `== True` broken on Python 3.14      | `/advisor/login` returns 401         | Fixed    |
| RC-2 | `FRONTEND_URL` env var not set on Render        | `GET /clients` blocked by CORS       | Fixed    |
| RC-3 | String-based `order_by` crashes on Python 3.14  | `/clients` returns 500, masked as CORS error | Fixed |
| RC-4 | bcrypt suspected but innocent — hours lost      | Misdirected debug effort             | N/A      |
| RC-5 | No startup validation of env vars               | Silent misconfiguration at deploy    | Pending  |

---

## Incident Timeline

| Time (approx) | Event |
|----------------|-------|
| T+0            | Advisors `rm_demo` and `hamza` report inability to load client lists after login |
| T+0            | Browser console shows 401 on login; dashboard blank |
| T+1h           | bcrypt hash compatibility suspected; DB hashes manually updated, debug endpoints added |
| T+3h           | bcrypt cleared as suspect; SQLAlchemy boolean filter identified as RC-1 |
| T+3.5h         | RC-2 (CORS / missing `FRONTEND_URL`) identified and fixed |
| T+4h           | RC-3 (string-based `order_by` crash) identified as source of masked CORS errors |
| T+4.5h         | All three fixes deployed to Render; login and client list confirmed working |

---

## Root Cause Detail

### RC-1: SQLAlchemy `== True` broken on Python 3.14

**What happened:**
The `/advisor/login` endpoint filtered active advisors with:

```python
Advisor.is_active == True
```

On Python 3.14 (which Render silently upgraded to), SQLAlchemy's `==` operator on Boolean columns generates different SQL than on earlier versions. The filter returned zero rows regardless of the actual data, causing every login attempt to return 401.

**Fix:**
```python
# Before
Advisor.is_active == True

# After
Advisor.is_active.is_(True)
```

`.is_(True)` is the correct SQLAlchemy idiom for boolean column comparisons and is version-stable.

---

### RC-2: `FRONTEND_URL` env var not set on Render

**What happened:**
`main.py` reads `FRONTEND_URL` from the environment to build the CORS `allow_origins` list, defaulting to `localhost:5173` if unset:

```python
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
```

The env var was never set on the Render service. As a result, `https://a-ria.vercel.app` was never in the allowed origins list. POST to `/advisor/login` appeared to work (some POST requests skip preflight and CORS does not block the request itself — only the response read), but `GET /clients` was consistently blocked.

**Fix:**
Hardcode known production origins directly in the CORS config, and supplement with env var if set:

```python
origins = [
    "https://a-ria.vercel.app",
    "https://aria-personal.vercel.app",
]
if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))
```

---

### RC-3: String-based `order_by` in SQLAlchemy relationship broken on Python 3.14

**What happened:**
The `Client.interactions` relationship was declared with a string expression for ordering:

```python
interactions = relationship(
    "ClientInteraction",
    order_by="ClientInteraction.interaction_date.desc()"
)
```

Python 3.14 changed how SQLAlchemy evaluates string-based expressions in relationship declarations. This caused a 500 Internal Server Error whenever `/clients` was accessed.

A 500 response means the CORS middleware never adds the `Access-Control-Allow-Origin` header to the response. The browser therefore reports a CORS error — obscuring the actual server crash.

**Fix:**
Remove `.desc()` from the string expression (Python 3.14 cannot evaluate method calls in this context):

```python
order_by="ClientInteraction.interaction_date"
```

The preferred long-term fix (see Guardrails) is to use a direct column reference instead of a string expression entirely.

---

### RC-4: Misleading error chase — bcrypt suspected but innocent

**What happened:**
The initial 401 symptom pointed toward credential validation. bcrypt hash incompatibility between Python versions was suspected. Multiple hours were spent:

- Manually rehashing passwords directly in the database
- Adding debug endpoints to print hash comparisons
- Testing bcrypt behavior under Python 3.14

bcrypt was functioning correctly throughout. The actual cause of the 401 was RC-1 — the SQLAlchemy boolean filter returning no rows, so no advisor record was ever found to validate against.

**Why the misdirection happened:**
RC-2 caused the browser to see a CORS failure on `GET /clients`. Because the browser was already on the dashboard page (login had technically succeeded from the server's perspective once RC-1 was fixed), the CORS failure on `/clients` was misread as a login-layer problem. This compressed two separate failure modes into one apparent symptom.

---

### RC-5: No env var validation at startup

**What happened:**
`FRONTEND_URL` silently defaulted to `localhost:5173` with no log output. There was no startup check to surface misconfigured or missing env vars.

A one-line log at startup would have made this immediately visible:

```
[startup] FRONTEND_URL not set — CORS will allow localhost:5173 only
```

**Fix (pending):**
Add an explicit env var validation and logging block at application startup. Log all connectivity-relevant config values (`FRONTEND_URL`, `DATABASE_URL` prefix, etc.) so Render's deploy logs show the config state at boot.

---

## Lessons Learnt

1. **Python runtime upgrades on PaaS are silent and breaking.** Render upgraded from 3.11 to 3.14 without notification. SQLAlchemy boolean comparisons and string-based relationship expressions behave differently across versions. Pin the runtime.

2. **CORS errors in the browser mask server 500s.** When a 500 occurs, CORS middleware never runs, so no `Access-Control-Allow-Origin` header is set. The browser reports CORS; the real error is the 500. Always check the raw HTTP status code before assuming a CORS misconfiguration.

3. **A 401 does not mean wrong credentials.** It can mean the query returned zero rows for an entirely unrelated reason (boolean filter, missing record, etc.). Check the query before checking the hash.

4. **Env vars that affect security or connectivity must be validated at startup.** Silent defaults are a trap in production deployments.

5. **Structured logging would have cut this incident to under 30 minutes.** Debug endpoints add noise and are hard to remove. A proper logging setup surfaces the real error at the point it occurs.

---

## Mitigation Plan

| Item | Status |
|------|--------|
| RC-1: Replace `== True` with `.is_(True)` in `Advisor.is_active` filter | Done |
| RC-2: Hardcode Vercel origins in CORS allow list | Done |
| RC-3: Fix string-based `order_by` in `Client.interactions` relationship | Done |
| RC-5: Add startup env var validation and logging | Pending |

---

## Guardrails for Future Work

1. **Always use `.is_(True)` / `.is_(False)` for SQLAlchemy boolean filters.** Never `== True`. This is the correct idiom and is version-stable.

2. **Never rely on env var defaults for CORS origins.** Hardcode known production origins. Read env vars as additions, not replacements.

3. **Never use string-based `order_by` in SQLAlchemy relationships.** Use direct column references:
   ```python
   order_by=ClientInteraction.interaction_date.desc()
   ```

4. **Log env var state at startup.** Print `FRONTEND_URL`, `DATABASE_URL` prefix, and other connectivity config on boot so Render logs capture the config at deploy time.

5. **Pin Python runtime on Render.** Add `runtime.txt` to the backend with an explicit version (e.g., `python-3.11.9`) to prevent silent upgrades.

6. **Smoke test after every deploy.** At minimum: `POST /advisor/login` and `GET /clients` with the correct `Origin` header. Confirm both return 200 and that `Access-Control-Allow-Origin` is present in the response.

7. **Add a CORS smoke test in CI.** Run:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     -H "Origin: https://a-ria.vercel.app" \
     https://<render-url>/clients
   ```
   Assert response includes `access-control-allow-origin: https://a-ria.vercel.app`.
