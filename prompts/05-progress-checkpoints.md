# P05 — durable lesson state

Керуйся кореневим AGENTS.md. Перед початком фази звір docs/STATE.md і її gate в docs/ROADMAP.md; читай лише релевантні матеріали. Перевірки обирай за docs/QUALITY.md з урахуванням чинного доручення користувача. Не оголошуй неперевірений gate пройденим.

## Exact task
Implement versioned IndexedDB workspace persistence, autosave, lesson progress state, immutable completed checkpoint and resume-after-refresh. Add explicit recovery from official starter checkpoint and a fork mechanism for revisiting previous lessons. No silent resets, no overwriting recent learner edits. Add migration/version metadata. Do not add auth yet.

## Acceptance / stop gate
A modified file survives refresh, lesson can be completed only after successful checks, replay/old-lesson fork cannot alter latest checkpoint, corrupted or version-mismatched snapshot yields a safe recovery path.
