# Аудит правил і workflow — 2026-11-17

Обсяг: агентні інструкції та документація; функціональний код, package/lock, curriculum і тести не змінюються. Початкова неінтегрована заготовка learning-backups з попереднього підзавдання прибрана; цей функціонал залишається наступною дією STATE.

## Джерела фактів

- package.json: Next 16.4.6, React 19.3.1, TypeScript 6.0.3, Tailwind 4.3.5, Radix/shadcn-style компоненти, Monaco 0.57.0, Zod 4.6.7; esbuild/tsx, ESLint/Prettier, Vitest/Playwright/axe. Версії не змінено.
- lib/lessons/registry.ts та content/lessons/index.json: 60 ID у manifest, повний пакет js-01; canReadTheory відкриває тільки перший наявний пакет. Це не 60 готових уроків.
- lib/progress/database.ts: IndexedDB v3, drafts/draft-backups/checkpoints/progress/forks/learning-sessions/learning-backups. Hooks і adapters підтверджують P05.1–5, не доводять його runtime gate.
- lib/runner/controller.ts/document.ts/runtime.ts: opaque iframe, nonce/source/protocol, Worker для pure JS; відкриті ризики узгоджено з P03_RUNNER та ADR-010.
- playwright.config.ts: власний сервер 3100, reuseExistingServer=false; package.json prebuild уже включає content validator і дві asset-збірки.
- Знайдено один кореневий AGENTS.md; вкладених AGENTS/override, репозиторних skills і .codex/config.toml до аудиту немає. Перевірено також іменовані ancestor/global AGENTS/override і skill roots — додаткових застосовних інструкцій не знайдено. Системні/плагінні skills у поточній сесії залишено без змін; їх не копійовано й не встановлювали масово.

## Знайдене → зміна

| До аудиту | Зміна |
|---|---|
| Обов’язкове читання 6–7 документів перед кожною правкою | Маршрутизація за задачею в AGENTS; STATE для resume/інтеграції, не кожної локальної зміни |
| Однаковий довгий вступ у 14 фазових prompts | Спільні постійні правила лишилися в AGENTS; prompts зберігають свої task/gate |
| P00 read-only prompt одночасно наказував implement/add tests | Суперечливий вступ прибрано; read-only обсяг збережено |
| RESUME змушував чекати нового доручення навіть після «продовжуй» | Виконання вже дорученої наступної задачі без другого approval-кроку |
| QUALITY змішував будь-яку задачу з повним release checklist | Матриця адресних перевірок; широкі suites за integration/security ризиком |
| REPAIR безумовно вимагав тестів, попри тимчасове доручення користувача | Точне розрізнення static evidence і відкладеного QA; gate лишається непідтвердженим |
| STATE був журналом довгих переліків і повторів | Короткий активний handoff; історія в Git, decisions в ADR, немає паралельного PROGRESS |
| Prompts P06–P11 повторювали правила авторингу, жорстку кількість і ZIP поза його фазою | Skill, bounded cumulative slice за складністю; ZIP лишився P11/P12; виправлено діапазон 01..00 |
| P02 дозволяв MDX всупереч ухваленому Markdown-контракту | Посилання на чинний ADR-007 без executable MDX |
| Немає task-specific skills | Два компактні repo skills, посилання на наявні джерела замість дублювання схем |

Generic Focused Debugging не став окремим skill: його процес уже в REPAIR.md, спеціалізований додатковий механізм не потрібен. Для уроків і runner повторюються нетривіальні контракти, cumulative залежності та security boundaries, тому skills виправдані.

## Структура і підтримка

- AGENTS — постійні правила; QUALITY — вибір перевірок; STATE — актуальна фаза/обмеження/блокери/одна наступна дія; DECISIONS — тривалі рішення.
- Skills: .agents/skills/academy-lesson-development/SKILL.md і .agents/skills/academy-code-execution/SKILL.md. Лише name/description у YAML і короткий workflow; supporting docs читаються за умовою. Додаткові скрипти, UI metadata, вкладені AGENTS і hooks не потрібні.
- Цей формат і repo discovery підтверджено [офіційною документацією skills](https://learn.chatgpt.com/docs/build-skills). Постійні правила та override chain — [офіційна документація AGENTS](https://learn.chatgpt.com/docs/agent-configuration/agents-md). Рекомендації взято з установленого skill-creator, його quick_validate.py використовується для структури skills.
- Model/reasoning defaults, sandbox, глобальні налаштування, plugins і ліцензійні ліміти не змінено. Економію токенів або вплив на п’ятигодинний ліміт не вимірювали.

## Перевірка

| Перевірка | Фактичний результат |
|---|---|
| Офіційний skill-creator/scripts/quick_validate.py, Python UTF-8 | Обидва skills: Skill is valid! |
| Локальні Markdown-посилання в змінених/нових файлах, одноразовий Node script | 14 посилань існують |
| Scope/gate фазових prompts, той самий script | Усі 14 збережено; старий повторений вступ відсутній |
| git diff --check | Успішно |
| Git diff + untracked, allowlist агентних/документаційних шляхів | 26 файлів; поза дозволеним обсягом змін немає |
| Diff app/components/lib/content/curriculum/tests/scripts/package/lock | Порожній; функціональний код не змінено |
| Статичне читання manifest та content index | 60 ID, тільки js-01 у повних пакетах |
| Перегляд узгодженості | Тимчасове no-tests, security/data invariants, phase gates та handoff збережені; усунуто суперечності з таблиці вище |

Продуктові тести, lint/typecheck/build застосунку не запускали: зміни лише документаційні. Не вимірювали економію токенів/часу, не перевіряли автоматичне підхоплення skills у новій сесії або їхню поведінкову ефективність. Окрему Codex-сесію для цього не запускали. Якщо skill не з’явиться в наступній сесії, офіційна документація радить перезапустити Codex; до того можна явно назвати шлях SKILL.md.

Завантажувач Codex manual не зміг виконати HTTPS HEAD через мережеве обмеження; потрібні факти перевірено через офіційні web-сторінки. Python у sandbox недоступний; для офіційного валідатора використовується встановлений Python поза sandbox, PyYAML 6.0.3 встановлено тільки в тимчасову папку. Залежності застосунку не змінені.

## Змінені файли

- AGENTS.md; README.md.
- docs/QUALITY.md; docs/STATE.md; docs/DECISIONS.md; новий docs/WORKFLOW_AUDIT.md.
- prompts/00-discovery.md; 01-app-shell.md; 02-lesson-registry.md; 03-runner-spike.md; 04-workspace-checker.md; 05-progress-checkpoints.md.
- prompts/06-lessons-01-10.md; 07-lessons-11-20.md; 08-lessons-21-30.md; 09-lessons-31-40.md; 10-lessons-41-50.md; 11-lessons-51-60.md; 12-release-audit.md; 13-auth-sync-optional.md.
- prompts/RESUME.md; REPAIR.md; REVIEW.md; QUICK_SEQUENCE.md.
- Нові .agents/skills/academy-lesson-development/SKILL.md і .agents/skills/academy-code-execution/SKILL.md.

Commit/push у межах цього аудиту не виконували. Наступна продуктова задача лишається в STATE; цей звіт не є другим журналом прогресу.
