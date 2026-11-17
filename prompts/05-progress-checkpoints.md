# P05 — durable lesson state


Before changing files:
1. Read `AGENTS.md`, `docs/STATE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/LESSON_CONTRACT.md` and any phase-specific docs. Inspect existing code and `git status`.
2. Summarize the exact limited scope and acceptance criteria. Do not rebuild completed phases.
3. Implement the smallest complete working slice and add tests. Do not make unrelated changes.
4. Run appropriate checks and honestly report what passed/failed/not run.
5. Update `docs/STATE.md` and record material decisions in `docs/DECISIONS.md`.
At the end output: changed files, validated behavior, exact test results, risks, one next recommended task. Do not claim an unverified feature works.


## Exact task
Implement versioned IndexedDB workspace persistence, autosave, lesson progress state, immutable completed checkpoint and resume-after-refresh. Add explicit recovery from official starter checkpoint and a fork mechanism for revisiting previous lessons. No silent resets, no overwriting recent learner edits. Add migration/version metadata. Do not add auth yet.

## Acceptance / stop gate
A modified file survives refresh, lesson can be completed only after successful checks, replay/old-lesson fork cannot alter latest checkpoint, corrupted or version-mismatched snapshot yields a safe recovery path.

If the scope exceeds one focused change-set, stop after a smaller verified vertical slice and explain the follow-up. Do not silently implement later phases.
