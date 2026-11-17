# P02 — typed lesson content engine


Before changing files:
1. Read `AGENTS.md`, `docs/STATE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/LESSON_CONTRACT.md` and any phase-specific docs. Inspect existing code and `git status`.
2. Summarize the exact limited scope and acceptance criteria. Do not rebuild completed phases.
3. Implement the smallest complete working slice and add tests. Do not make unrelated changes.
4. Run appropriate checks and honestly report what passed/failed/not run.
5. Update `docs/STATE.md` and record material decisions in `docs/DECISIONS.md`.
At the end output: changed files, validated behavior, exact test results, risks, one next recommended task. Do not claim an unverified feature works.


## Exact task
Implement a typed lesson registry based on `curriculum/manifest.json`, a Markdown/MDX theory content pipeline with strict allowed rendering, a real lesson detail page, short knowledge questions, and gating of the practice tab until the learner explicitly completes theory check. Create one complete sample lesson (js-01) using `docs/LESSON_CONTRACT.md`. Add validation for duplicated/missing IDs, invalid prerequisites, unknown paths and missing required content. Keep course UI Ukrainian.

## Acceptance / stop gate
Lesson js-01 fully renders from content, complete-theory flow works, invalid content fails validation, a test confirms all manifest IDs are unique and sequential.

If the scope exceeds one focused change-set, stop after a smaller verified vertical slice and explain the follow-up. Do not silently implement later phases.
