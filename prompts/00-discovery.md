# P00 — read-only reconnaissance and architecture gate

Керуйся кореневим AGENTS.md. Перед початком фази звір docs/STATE.md і її gate в docs/ROADMAP.md; читай лише релевантні матеріали. Перевірки обирай за docs/QUALITY.md з урахуванням чинного доручення користувача. Не оголошуй неперевірений gate пройденим. Це початковий фазовий prompt: перед повторним використанням перевір, чи фазу вже завершено; не запускай її заново автоматично.

## Exact task
Do a read-only audit of all project context files and any existing implementation. Cross-check the 60-lesson manifest, curriculum, lesson contract and roadmap. Recommend the concrete folder tree, local storage format, renderer architecture and runner proof-of-concept plan. Flag any implementation/security conflicts, unclear assumptions or disproportionate dependencies. Write a concise proposal **without implementing app code**. You may update `docs/STATE.md` only to record the review; do not change product scope or overwrite content.

## Acceptance / stop gate
A proposal includes: (a) architecture, (b) isolated runner constraints, (c) first vertical slice, (d) milestone tests, (e) explicit phase-01 approval gate. No coding or boilerplate app generation yet.
