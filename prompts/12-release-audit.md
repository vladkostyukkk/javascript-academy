# P12 — MVP quality gate and deployment


Before changing files:
1. Read `AGENTS.md`, `docs/STATE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/LESSON_CONTRACT.md` and any phase-specific docs. Inspect existing code and `git status`.
2. Summarize the exact limited scope and acceptance criteria. Do not rebuild completed phases.
3. Implement the smallest complete working slice and add tests. Do not make unrelated changes.
4. Run appropriate checks and honestly report what passed/failed/not run.
5. Update `docs/STATE.md` and record material decisions in `docs/DECISIONS.md`.
At the end output: changed files, validated behavior, exact test results, risks, one next recommended task. Do not claim an unverified feature works.


## Exact task
Do an end-to-end audit of UX, accessibility, curriculum, export, runner threats, responsiveness, performance, error handling, privacy and tests. Fix isolated issues one at a time; add CI commands and deployment README only after code is stable. Run 60-lesson validator, unit and E2E suites, lint/typecheck/build. Do not claim the app is hardened if sandbox risks remain. Provide a prioritized known-issues list.

## Acceptance / stop gate
All 60 verified reference checkpoints, reliable final export, tests and actual command outputs recorded; unresolved security risks flagged and a no-go recommendation if severe.

If the scope exceeds one focused change-set, stop after a smaller verified vertical slice and explain the follow-up. Do not silently implement later phases.
