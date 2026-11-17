# P04 — Monaco IDE and evaluation workflow


Before changing files:
1. Read `AGENTS.md`, `docs/STATE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/LESSON_CONTRACT.md` and any phase-specific docs. Inspect existing code and `git status`.
2. Summarize the exact limited scope and acceptance criteria. Do not rebuild completed phases.
3. Implement the smallest complete working slice and add tests. Do not make unrelated changes.
4. Run appropriate checks and honestly report what passed/failed/not run.
5. Update `docs/STATE.md` and record material decisions in `docs/DECISIONS.md`.
At the end output: changed files, validated behavior, exact test results, risks, one next recommended task. Do not claim an unverified feature works.


## Exact task
Integrate Monaco with file tabs/tree, editable virtual files, Run/Check controls, console, preview, test output and progressive hints. Connect to real isolated runner from P03. Implement view state and error boundaries, reset confirmation and readable feedback. Create a non-trivial real learner exercise that fails before edit and passes after solution; make no 'always pass' mocks. Keep student code separate from test code and solutions.

## Acceptance / stop gate
Editing files changes run result; Run displays console/preview; Check reports specific failing/passing assertions in Ukrainian; invalid JS reports syntax error; reset requires confirmation.

If the scope exceeds one focused change-set, stop after a smaller verified vertical slice and explain the follow-up. Do not silently implement later phases.
