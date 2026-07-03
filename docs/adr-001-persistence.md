# ADR-001: Timesheet data persistence

## Status
Accepted

## Context
The January prototype used browser localStorage for all timesheet data.
This was pragmatic for a UI-focused prototype but was flagged in feedback
as not addressing multi-device access — a real constraint, since
consultants move between a work laptop, a home laptop, and occasionally
a client-site machine.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **localStorage (status quo)** | Zero setup, no network dependency, fastest to build | Data trapped on one device/browser; lost on cache clear; no backup |
| **Firebase / hosted BaaS** | Fast to integrate, real-time sync, managed auth | Vendor lock-in; data leaves organisational control, which matters for internal timesheet/financial data; recurring cost at scale |
| **Postgres + ORM (e.g. Prisma)** | Production-grade, handles concurrency and scale well | Disproportionate operational overhead for a single-user-per-session prototype with no concurrent-write requirement; slower to stand up within the project timeline |
| **Node/Express + SQLite (chosen)** | Real persistence, multi-device access via API, file-based so no separate DB server to provision, trivial to migrate to Postgres later if usage grows | Not horizontally scalable; not a concern at current scope (single team, low request volume) |

## Decision
Node/Express + SQLite. This resolves the multi-device gap the feedback
identified — data lives server-side and is fetched via API regardless of
which device the user is on — without taking on the deployment and
operational complexity of a full production database for what is still,
at this stage, a small-scale internal tool. If usage grew across multiple
teams, the migration path to Postgres is straightforward since the data
access layer is isolated behind a repository pattern (see
`backend/src/db`).

## Consequences
- Requires a running backend process, unlike the fully static
  localStorage version — deployment is now two parts (frontend static
  host + backend host) rather than one.
- Introduces a genuine API layer, which also gives the EPA report real
  material for discussing request validation, error handling, and
  API design — none of which existed in the original prototype.
