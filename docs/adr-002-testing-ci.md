# ADR-002: Automated testing and CI, over manual testing

## Status
Accepted

## Context
The Jan 2026 prototype relied entirely on manual testing, explicitly
noted in its own write-up as a limitation caused by time constraints.
The Jan feedback separately recommended defining success quantitatively
*before* building, rather than assessing it after the fact by feel.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **Manual testing only (status quo)** | No setup overhead, realistic end-to-end feel for chat-style flows | Doesn't scale as logic grows (validation rules, submission blocking); no regression protection; not repeatable/measurable |
| **Automated tests, run locally only** | Repeatable, fast feedback during development | Relies on the developer remembering to run them before every push — the same "relies on a human remembering" failure mode flagged as a weakness in the MMS dashboard reflection |
| **Automated tests + CI on every push (chosen)** | Repeatable, enforced rather than optional, visible pass/fail history in GitHub, catches regressions before merge | Small setup cost; slightly slower feedback loop than local-only (CI run time vs instant local run) |

## Decision
Vitest (frontend) and Jest + Supertest (backend), run automatically via
GitHub Actions on every push to `main`. This directly answers two things
from the Jan feedback: it defines what "working correctly" means in
concrete, checkable assertions rather than a subjective build-then-review
pass, and it removes the single point of failure of manual testing
depending on someone remembering to do it.

## Consequences
- Every commit's test status is visible in GitHub's Actions tab —
  usable as evidence in the report and presentation.
- Test coverage is currently limited to validation and date logic
  (the highest-risk, most testable parts); UI component testing is a
  reasonable future iteration, noted in the report's recommendations
  rather than attempted under this timeline.
