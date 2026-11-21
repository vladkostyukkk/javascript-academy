# Build roadmap — one gated phase per Codex task

Do not ask Codex to build everything in one response. Each phase has acceptance criteria and a specific prompt in `prompts/`.

## P00 — discovery and acceptance of architecture
Read package, inspect existing repository, identify decisions, propose file/folder layout and phased build plan. **No app code**. Gate: scope, stack and sandbox constraints explicitly acknowledged; doc conflicts listed.

## P01 — design system + app shell
Create Next.js TS app, Tailwind, shadcn/ui, responsive shell, course roadmap layout and an explicitly labeled demonstration lesson UI. Demo tabs may switch real content, but must not simulate code execution, passing checks, saved progress or curriculum unlocks (ADR-005). Gate: navigation works, accessible keyboard flow, working mobile layout, lint/typecheck/build.

## P02 — lesson registry + content renderer
Create typed 60-ID curriculum registry, theory markdown renderer, quiz transition, basic navigation, content validation. Gate: sample theory renders, invalid content rejected, transitions tested.

## P03 — safe runner spike
Prototype isolated code execution for plain JS, DOM preview, module imports and mocked fetch before content scale-up. Gate: all 4 fixtures run; unsafe attempts tested; errors, console, output and timeout behavior reported. Do not call sandbox production-secure without security review.

## P04 — Monaco workspace + checker
Multi-file Monaco, tabs, console, diagnostics, preview, Run, Check, tests, hints and reset confirmation. Gate: read/edit/run/check works for representative exercises; real failures shown.

## P05 — durable progress + snapshots
IndexedDB drafts, auto-save, checkpoints, restore, statuses, course version, previous-lesson forks. Gate: reload restores changes; reset confirmation; previous content not corrupted.

## P06 — first 10 lessons

Статус: прийнято 2026-11-18; докази й межі — [P06_ACCEPTANCE.md](P06_ACCEPTANCE.md).

Fully author, test, and manually review lessons 01–10; validate references and pedagogy. Gate: all reference checkpoints pass, test failures meaningful; no future syntax.

## P07 — lessons 11–20

Статус — прийнято 2026-11-21. Докази й межі — [P07_ACCEPTANCE.md](P07_ACCEPTANCE.md).

Functions, conditions, ID generation, validation, integration. Gate: 20 valid cumulative checkpoints, no regression.

## P08 — lessons 21–30
Collections, objects, functional array transforms and stats. Gate: project domain logic works; 30 cumulative checkpoints.

## P09 — lessons 31–40
DOM app, form, filtering, search and Kanban board. Gate: real interactive preview and Playwright browser flow through lesson 40.

## P10 — lessons 41–50
Modules, state, localStorage bridge, migrations and undo. Gate: virtual file module imports verified; persistence works safely in preview harness; project export replay.

## P11 — lessons 51–60
Async mock API, error/loading, abort, drag/drop, import/export, stats, testing, accessibility and end-to-end project ZIP. Gate: all 60 complete with checkpoints and deterministic tests, finished FocusBoard runs independently.

## P12 — release hardening (MVP)
Final accessibility, security review of runner and CSP, perf, e2e, CI, error boundary, deployment instructions, smoke deploy. Gate: verification results and known risks documented; no placeholder flows.

## Later optional P13 — accounts/cloud sync
Auth.js + Prisma + PostgreSQL, user-owned snapshots and sync conflict resolution. Gate: all protected routes check ownership; migration, backup and local/offline fallback proven.

## Golden rule
Before authoring dozens of lessons, require real, tested runner fixtures for **pure JS, DOM, modules, async mock fetch**. This is the highest-risk technical dependency.
