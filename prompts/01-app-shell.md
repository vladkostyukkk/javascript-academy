# P01 — Next app shell and high-fidelity UI


Before changing files:
1. Read `AGENTS.md`, `docs/STATE.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/LESSON_CONTRACT.md` and any phase-specific docs. Inspect existing code and `git status`.
2. Summarize the exact limited scope and acceptance criteria. Do not rebuild completed phases.
3. Implement the smallest complete working slice and add tests. Do not make unrelated changes.
4. Run appropriate checks and honestly report what passed/failed/not run.
5. Update `docs/STATE.md` and record material decisions in `docs/DECISIONS.md`.
At the end output: changed files, validated behavior, exact test results, risks, one next recommended task. Do not claim an unverified feature works.


## Exact task
Initialize a current stable Next.js App Router TypeScript project with Tailwind and shadcn/ui in this repo, preserving existing docs. Implement a thoughtful dark-first learning dashboard and responsive navigation; roadmap of 6 × 10 lessons from the manifest; lesson mock route with theory/practice tabs and fake data clearly labeled in code as fixtures. Define design tokens; useful empty/loading states and keyboard navigation. Do **not** implement actual code execution or fabricate passing tests. Keep UI credible, clear, and accessible.

## Acceptance / stop gate
Working page routes, responsive layout at phone/tablet/desktop, 60 numbered lessons rendered from manifest, no editor fake success, lint/typecheck/build passing.

If the scope exceeds one focused change-set, stop after a smaller verified vertical slice and explain the follow-up. Do not silently implement later phases.
