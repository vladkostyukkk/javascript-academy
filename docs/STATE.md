# Поточний стан — JavaScript Academy

## Продовження
- Фаза продукту: **P05, частини 1–5 реалізовано; поведінковий gate не пройдено.** P00–P04 завершено раніше. До P06 не переходити без gate або явної зміни плану.
- Чинне доручення щодо продукту: **поки не додавати, не змінювати й не запускати продуктові тести**, включно з unit/E2E, browser smoke, axe та ручним QA. Доречні статичні перевірки дозволені. Це тимчасове обмеження користувача, не постійна норма AGENTS.
- Остання задача (2026-11-17): оптимізація правил/skills/workflow, **лише агентні файли й документація**. Архів quiz не реалізовано: початкову неінтегровану заготовку прибрано при переключенні на цей аудит.
- Git: приватний `vladkostyukkk/javascript-academy`, origin, main; початковий коміт `aa0d5ed`. Аудит правил залишено без нового commit/push — попереднє доручення було разовим. Історію деталей див. через Git, не відновлюй її з чату.

## Фактично реалізовано
- Next.js/React/TS shell, roadmap із 60 ID; повний пакет **тільки js-01**, js-02…js-60 заблоковані. Registry/Markdown/quiz та контракти — `lib/lessons/`, `content/lessons/`.
- Monaco, Run/Check, feedback, console, hints, reset; ізольований runner — `components/workspace/`, `lib/runner/`. JS js-01 працює у Worker всередині opaque iframe; HTML/CSS preview не виконує learner JS.
- P05: IndexedDB autosave/recovery/CAS, immutable completed/checkpoint, окремий fork, історія /project; quiz/tab persistence та completed на roadmap. Файлові backups: список/ручна копія/restore/JSON import із підтвердженням, сумісністю й атомарним резервуванням.
- База v3; snapshots v1. Не переписувати старі records, не підміняти read-only основу або відкривати наступні уроки. Details: ADR-013–017 у DECISIONS; авторизація/cloud/ZIP та inheritance між різними уроками ще відсутні.

## Перевірки та ризики
- Остання перевірка **продуктового коду P05.5 до aa0d5ed**: lint, typecheck, format:check, build — успішно; build створив 67 сторінок. Prebuild перевірив 60 ID / 1 пакет / SHA-256 і зібрав assets. Це не підтверджує поведінку P05.
- Останні продуктові тести — P04: 65 unit, 65 E2E passed / 2 skipped; P05 не перевірявся. Для цього документаційного аудиту продукт не запускався; результати перевірки правил — у [WORKFLOW_AUDIT.md](WORKFLOW_AUDIT.md).
- **Release blockers P03:** hostile DOM loop може блокувати host; iframe self-navigation може дати egress. Потрібні сильніша ізоляція/окремий origin, threat model і security review (ADR-010, P03_RUNNER). Local completed — не anti-cheating proof.
- P05 потребує поведінкових доказів migrations/reload/CAS/quota/restore/fork/quiz/import. Немає UI learning-backups; hints/cursor/Undo/Check results після reload не відновлюються. Архів без auto-prune; очищення браузера стирає локальні дані.
- Firefox/Safari та ручний screen-reader аудит не виконані; питання curriculum 07/09 і 46/54 відкриті. Runtime audit востаннє в P04: 0 runtime / 7 moderate dev; ESLint deprecated. Нового audit не робили.
- Windows: build раніше потребував ескалації через tsx uv_os_get_passwd; Git поза sandbox — адресного safe.directory через ownership. Не вмикай глобальні обходи. Доречні команди — QUALITY.

## Наступна дія
**Один bounded subtask P05: перегляд і явне відновлення навчального стану з learning-backups із повторною оцінкою quiz, архівуванням поточного стану й без зміни файлів/completed/checkpoints.** Почни з `lib/progress/learning-store.ts`, `components/course/use-learning-session.ts`, `lesson-experience.tsx`; використовуй існуючий reducer і підхід файлового архіву. Зберігай чинне обмеження на продуктові тести. Не розширюй задачу до нових уроків або решти roadmap.
