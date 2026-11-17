# Repository instructions — JavaScript Academy

## Goal
Build a Ukrainian-language JavaScript learning platform with 60 progressive lessons. Every lesson adds to one exportable vanilla-JS pet project, **FocusBoard**. Platform code uses TypeScript; student exercises use JavaScript, HTML, and CSS.

## Read before work
1. `docs/STATE.md` — current phase, blockers, next task.
2. `docs/PRODUCT.md` — UX and scope.
3. `docs/ARCHITECTURE.md` — architecture and security.
4. `docs/ROADMAP.md` — gates and order.
5. `docs/LESSON_CONTRACT.md` — mandatory lesson shape.
6. `docs/CURRICULUM.md` and `curriculum/manifest.json` when working on curriculum.
7. `docs/DECISIONS.md` for previously approved choices.

## Mandatory process
- Work on **one requested phase or one bounded subtask** at a time. If it is large, split and report a small plan before editing.
- Inspect existing code before making changes. Never replace working architecture merely to simplify a prompt.
- Preserve existing user code, lesson solutions, checkpoints, and progress. Schema changes require a migration plan.
- Implement a vertical slice; no fake buttons, placeholder pass messages, or success claims without verification.
- Create/adjust tests for new behavior. Run relevant tests, lint, typecheck, and build when available. Report what actually ran and what failed.
- Prefer simple readable code over clever abstractions. No `any` or disabling lint/types without a documented reason.
- Never execute learner-supplied JS in the Next.js server, app origin, or an unsandboxed iframe. Follow `docs/ARCHITECTURE.md`.
- For each lesson, provide meaningful feedback, 2+ edge cases, reference solution, and a tested cumulative checkpoint.
- Do not automatically unlock later curriculum or silently patch the learner's workspace.
- A stage is complete only after its documented acceptance criteria are satisfied.

## Context handoff after EACH task
Update `docs/STATE.md` with phase, implemented files, verification commands/results, blockers and **one explicit next action**. Record material architectural decisions in `docs/DECISIONS.md`. Keep `AGENTS.md` short; do not paste chat logs here. Show changed files and concise validation report. Commit only if explicitly asked or the current prompt authorizes it.

## Language
User-facing copy, lessons, errors, feedback and docs primarily Ukrainian. Code identifiers and API schemas in English.
