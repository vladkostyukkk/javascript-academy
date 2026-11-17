# P13 — optional accounts and cloud sync

Керуйся кореневим AGENTS.md. Перед початком фази звір docs/STATE.md і її gate в docs/ROADMAP.md; читай лише релевантні матеріали. Перевірки обирай за docs/QUALITY.md з урахуванням чинного доручення користувача. Не оголошуй неперевірений gate пройденим.

## Exact task
Only if explicitly approved, implement Auth.js + PostgreSQL + Prisma for authenticated learners. Add server-owned progress and snapshot sync, strict row ownership and race/conflict handling, rate limits, quotas, migrations and safe fallback to local-only mode. **Never execute code on the server.**

## Acceptance / stop gate
Login/logout/session ownership tests pass, sync conflict resolution keeps both revisions, persistence survives logout, local mode still works, rollback documented.
