# P02 — typed lesson content engine

Керуйся кореневим AGENTS.md. Перед початком фази звір docs/STATE.md і її gate в docs/ROADMAP.md; читай лише релевантні матеріали. Перевірки обирай за docs/QUALITY.md з урахуванням чинного доручення користувача. Не оголошуй неперевірений gate пройденим. Це початковий фазовий prompt: перед повторним використанням перевір, чи фазу вже завершено; не запускай її заново автоматично.

## Exact task
Implement a typed lesson registry based on `curriculum/manifest.json`, the existing restricted Markdown pipeline (ADR-007), without raw HTML or executable MDX, a real lesson detail page, short knowledge questions, and gating of the practice tab until the learner explicitly completes theory check. Create one complete sample lesson (js-01) using `docs/LESSON_CONTRACT.md`. Add validation for duplicated/missing IDs, invalid prerequisites, unknown paths and missing required content. Keep course UI Ukrainian.

## Acceptance / stop gate
Lesson js-01 fully renders from content, complete-theory flow works, invalid content fails validation, a test confirms all manifest IDs are unique and sequential.
