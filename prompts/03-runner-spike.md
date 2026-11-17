# P03 — isolated JS runner security prototype


Before changing files:
1. Read `AGENTS.md`, `docs/STATE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/LESSON_CONTRACT.md` and any phase-specific docs. Inspect existing code and `git status`.
2. Summarize the exact limited scope and acceptance criteria. Do not rebuild completed phases.
3. Implement the smallest complete working slice and add tests. Do not make unrelated changes.
4. Run appropriate checks and honestly report what passed/failed/not run.
5. Update `docs/STATE.md` and record material decisions in `docs/DECISIONS.md`.
At the end output: changed files, validated behavior, exact test results, risks, one next recommended task. Do not claim an unverified feature works.


## Exact task
Build the learning runner **in isolation from production lesson authoring**. Provide four fixtures: (A) pure JS with console/return and assertion, (B) DOM manipulation preview, (C) two ES modules importing each other through virtual paths, (D) Promise/async/fetch to a deterministic mock `/mock/tasks.json`. Host student code only in restricted sandboxed contexts; never eval it in app origin or server. Implement per-run message nonce, typed protocol, log/error collection, output limits, and timeout best effort. Test blocked network, top navigation and unsafe messages. Clearly document limits against intentional malicious loops and the remaining security review before public launch.

## Acceptance / stop gate
All four fixtures run deterministically and have a negative test; no server-side or privileged-origin user-code evaluation; document actual security test results and unresolved limitations.

If the scope exceeds one focused change-set, stop after a smaller verified vertical slice and explain the follow-up. Do not silently implement later phases.
