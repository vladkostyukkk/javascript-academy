# P12 — MVP quality gate and deployment

Керуйся кореневим AGENTS.md. Перед початком фази звір docs/STATE.md і її gate в docs/ROADMAP.md; читай лише релевантні матеріали. Перевірки обирай за docs/QUALITY.md з урахуванням чинного доручення користувача. Не оголошуй неперевірений gate пройденим.

## Exact task
Do an end-to-end audit of UX, accessibility, curriculum, export, runner threats, responsiveness, performance, error handling, privacy and tests. Fix isolated issues one at a time; add CI commands and deployment README only after code is stable. Run 60-lesson validator, unit and E2E suites, lint/typecheck/build. Do not claim the app is hardened if sandbox risks remain. Provide a prioritized known-issues list.

## Acceptance / stop gate
All 60 verified reference checkpoints, reliable final export, tests and actual command outputs recorded; unresolved security risks flagged and a no-go recommendation if severe.
