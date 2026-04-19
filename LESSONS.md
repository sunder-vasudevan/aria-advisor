# LESSONS.md — ARIA Advisor

*Decisions that turned out wrong, attempts that failed, things we'd do differently.*

---

| Date | What we tried | What happened | What we learned |
|------|--------------|---------------|-----------------|
| | | | |


## 2026-04-19 — Session 38

- **fpdf2 API breaking change:** `FPDF.rotate()` was removed; use `with pdf.rotation(angle, x, y):` context manager. Always test PDF generation in the exact target environment — local pip install may be a different version.
- **Helvetica is Latin-1 only:** Any em-dash `—`, curly quotes, or non-ASCII in Helvetica text will crash fpdf2 with a charset error. Scan all PDF text strings for Unicode chars before shipping.
- **SQLAlchemy Client360 constructor pattern is fragile:** Manually building schema objects in each endpoint means new model fields are silently dropped. Prefer `model_from_orm()` or a single helper that maps all fields in one place.
- **Render webhook miss:** Render's GitHub webhook occasionally fails silently. If 5+ minutes pass after a push with no deploy, trigger manually from the Render dashboard.
