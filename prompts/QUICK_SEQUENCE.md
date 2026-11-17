# Suggested Codex sequence

1. `00-discovery.md` — read-only plan. Review architecture.
2. `01-app-shell.md` — proper UI shell.
3. `02-lesson-registry.md` — content engine & first lesson.
4. `03-runner-spike.md` — hardest technical risk; do not proceed until verified.
5. `04-workspace-checker.md` — functional editor / tests / preview.
6. `05-progress-checkpoints.md` — preserve learner code.
7. `06-lessons-01-10.md` ... `11-lessons-51-60.md` — implement in batches 1–3 each, never automatically one giant 60-lesson code generation.
8. `12-release-audit.md` — tests + deploy readiness.
9. `13-auth-sync-optional.md` — ONLY after approval, if needed.

Every new chat: send `RESUME.md`, inspect report, then send one next phase prompt. If regressions: `REPAIR.md`. Between phases: `REVIEW.md`.
