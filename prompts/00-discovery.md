# P00 — read-only reconnaissance and architecture gate


Before changing files:
1. Read `AGENTS.md`, `docs/STATE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/LESSON_CONTRACT.md` and any phase-specific docs. Inspect existing code and `git status`.
2. Summarize the exact limited scope and acceptance criteria. Do not rebuild completed phases.
3. Implement the smallest complete working slice and add tests. Do not make unrelated changes.
4. Run appropriate checks and honestly report what passed/failed/not run.
5. Update `docs/STATE.md` and record material decisions in `docs/DECISIONS.md`.
At the end output: changed files, validated behavior, exact test results, risks, one next recommended task. Do not claim an unverified feature works.


## Exact task
Do a read-only audit of all project context files and any existing implementation. Cross-check the 60-lesson manifest, curriculum, lesson contract and roadmap. Recommend the concrete folder tree, local storage format, renderer architecture and runner proof-of-concept plan. Flag any implementation/security conflicts, unclear assumptions or disproportionate dependencies. Write a concise proposal **without implementing app code**. You may update `docs/STATE.md` only to record the review; do not change product scope or overwrite content.

## Acceptance / stop gate
A proposal includes: (a) architecture, (b) isolated runner constraints, (c) first vertical slice, (d) milestone tests, (e) explicit phase-01 approval gate. No coding or boilerplate app generation yet.

If the scope exceeds one focused change-set, stop after a smaller verified vertical slice and explain the follow-up. Do not silently implement later phases.
