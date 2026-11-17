# P13 — optional accounts and cloud sync


Before changing files:
1. Read `AGENTS.md`, `docs/STATE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/LESSON_CONTRACT.md` and any phase-specific docs. Inspect existing code and `git status`.
2. Summarize the exact limited scope and acceptance criteria. Do not rebuild completed phases.
3. Implement the smallest complete working slice and add tests. Do not make unrelated changes.
4. Run appropriate checks and honestly report what passed/failed/not run.
5. Update `docs/STATE.md` and record material decisions in `docs/DECISIONS.md`.
At the end output: changed files, validated behavior, exact test results, risks, one next recommended task. Do not claim an unverified feature works.


## Exact task
Only if explicitly approved, implement Auth.js + PostgreSQL + Prisma for authenticated learners. Add server-owned progress and snapshot sync, strict row ownership and race/conflict handling, rate limits, quotas, migrations and safe fallback to local-only mode. **Never execute code on the server.**

## Acceptance / stop gate
Login/logout/session ownership tests pass, sync conflict resolution keeps both revisions, persistence survives logout, local mode still works, rollback documented.

If the scope exceeds one focused change-set, stop after a smaller verified vertical slice and explain the follow-up. Do not silently implement later phases.
