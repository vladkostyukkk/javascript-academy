# Architecture / security specification

## Clear boundary
**Learning platform**: Next.js App Router, React, TypeScript, Tailwind, shadcn/ui, Monaco, lesson content, progress storage.
**Learner project**: isolated virtual file system containing `index.html`, `styles.css`, `src/app.js` and later ES modules. Only standard browser JS; it never depends on React, Next, Tailwind, or application secrets.

## Deployment strategy
Build a local-first vertical slice first. `IndexedDB` stores draft file maps and checkpoints. Add database auth/sync as a distinct phase: PostgreSQL + Prisma + Auth.js; the authenticated server stores snapshots and metadata with ownership checks. **Do not delay local functionality for login.**

## Main layers
```
app/                            Next.js routes, UI and server handlers
components/course/              roadmap, lesson UI
components/workspace/           Monaco, file explorer, tests, console, preview
lib/lessons/                    typed lesson registry and content loader
lib/progress/                   storage interfaces + IndexedDB adapter
lib/runner/                     runner protocols and orchestration
content/lessons/js-XX/          theory, challenge, starter, tests, solution
curriculum/manifest.json        canonical ID/order metadata
```
Folder paths may change via an explicit documented decision, not ad-hoc rewrites.

## Runner safety is a release blocker
- Treat learner code and imported JSON as untrusted data.
- Never execute arbitrary learner JS in a Next.js API handler, main app DOM, or same-origin unsandboxed context; do not use server-side `eval`/`vm` as a security boundary.
- Execute DOM preview inside a disposable iframe with `sandbox="allow-scripts"` **without `allow-same-origin`**. Apply restrictive CSP (`connect-src 'none'` by default; block top navigation, forms, popups and external embeds) and avoid sharing auth tokens/cookies.
- Use a Web Worker or isolated evaluator for pure algorithm exercises only if origin/network isolation is appropriately designed. Never treat a plain same-origin Web Worker as a complete hostile-code security boundary.
- Parent/iframe messages require a random per-run nonce, exact `event.source` match, allowlisted typed message names, payload/size validation and runId; an opaque-origin iframe may send origin `null`, so do not rely on checking `event.origin` alone.
- Enforce execution/output limits. Timeout and iframe disposal are best-effort in the browser; test UI responsiveness on infinite loops. Consider stronger origin/runtime isolation before an untrusted public launch.
- For async lessons, use deterministic **mock fetch** in the isolated runner: intercept allowlisted `/mock/tasks.json` (including failures, delay and abort behavior). Deny arbitrary network access. Include a real fixture in project export so the exported app works when served from local dev server.
- Keep tests and reference solutions outside the student-editable file map. Client-only tests can be inspected/spoofed; do **not** market them as secure anti-cheating or hidden grading.
- Sanitize displayed output and user-provided titles, use `textContent` (not dynamic `innerHTML`) in student project exercises.

## Editor / files
- Monaco multi-file workspace: file tree, active tab, unsaved indicator, keyboard shortcuts.
- Files stored as `{ path: string, content: string }[]` with allowed path extensions and path normalization; no path traversal or unlimited size.
- One runner API for classic scripts, ES modules and DOM pages. ES modules require virtual-file bundling or import resolution; **prove this in a prototype before authoring lessons 41–60**.
- `Run` = compile/execute/show console/preview. `Check` = deterministic tests + clear feedback.
- Every lesson holds starter file map, expected target, tests and verified reference checkpoint; support migrations from previous course versions.

## Progress
`LessonProgress`: lessonId, status (locked/theory/practice/completed), updatedAt, completedAt?, attempts.
`WorkspaceSnapshot`: lessonId, revision, fileMap, createdAt, sourceLessonId?, courseContentVersion.
Checkpoint inheritance is explicit and reversible. Avoid overwriting changes when user revisits old lessons.

## Testing
- Vitest for domain utilities, metadata validation, runner protocol, content shape, storage adapters.
- Playwright for roadmap → lesson → editor → test → complete → restore, plus sandbox isolation and mobile layouts.
- Browser smoke fixtures for: plain JS, DOM, ES modules, Promise/fetch, deliberate runtime error and infinite-loop handling.
- Automated curriculum validator checks all 60 IDs, prerequisite chain, no missing files, tests passing for reference solutions, and meaningful failure cases for broken starters.

## Production notes
Add logging without storing user code in analytics, rate limiting and quotas for cloud sync, security headers, privacy/terms, proper migrations and backups, CI for lint/typecheck/build/unit/e2e. Model any cloud execution as a separate security review.
