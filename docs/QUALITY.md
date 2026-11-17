# Перевірки за обсягом зміни

Це правила вибору перевірок, не команда запускати все щоразу. Чинні обмеження користувача див. у дорученні та, під час продовження розробки, STATE.md. Якщо потрібні докази недоступні, залиш gate непідтвердженим.

| Зміна | Достатній початок | Коли розширювати |
|---|---|---|
| Документація / AGENTS / skills | Diff, посилання, узгодженість інструкцій; валідатор змінених skills | Конфігурація build/runtime → відповідна інженерна перевірка |
| Локальні TS/TSX зміни | ESLint змінених файлів, typecheck; адресний тест зміненої поведінки | Shared hooks, контракти, маршрути чи SSR → build та пов’язані інтеграції |
| UI / CSS | Форматування, lint де застосовний, адресна перевірка layout/keyboard/feedback | Спільна оболонка / responsive зміна → відповідні viewport/E2E й accessibility сценарії |
| Контент уроку | validate:content; reference і негативні сценарії вибраного уроку в sandbox | Cumulative основа → залежні checkpoints; схема/registry → відповідні unit та інтеграції |
| IndexedDB / прогрес | Typecheck, lint, міграція/CAS/reload/recovery/fork сценарії зміненої межі | Спільна схема/черга → залежні потоки; build для client/server інтеграції |
| Runner / протокол / checker | Адресні unit + sandbox fixtures і security сценарії за зміненими загрозами | Execution boundary → ширші isolation/egress/loop перевірки й build; невирішений ризик блокує release |
| Залежності, build-конфігурація, суттєва інтеграція / release | Lint, typecheck, build і відповідні suites | Повний unit/E2E набір, усі reference checkpoints та release gate, якщо охоплено фазою |

Для нового важливого behavior додай/зміни тест, що перевіряє результат, не копіює реалізацію. Для виправлення спочатку відтвори причину, якщо це дозволено поточним обсягом. Повний suite потрібен за ризиком регресії, а не через сам факт зміни файла. Відкладені користувачем продуктові тести не скасовують вимог майбутнього gate.

## Команди й особливості репозиторію

- Адресний unit: `npm test -- tests/unit/learning-flow.test.ts` (підстав потрібний файл).
- Адресний E2E: `npm run test:e2e -- tests/e2e/lesson.spec.ts --project=desktop`; потрібна актуальна production-збірка. Playwright сам керує сервером на **3100**, reuseExistingServer=false. Не використовуй користувацьку вкладку або невідомий сервер на 3000 для QA.
- ESLint адресно: `npx eslint components/course/lesson-experience.tsx --max-warnings=0`; типи проєктно: `npm run typecheck`. Повний lint: `npm run lint`.
- Форматування: `npx prettier --check <змінені-файли>`, враховуй .prettierignore. Не форматуйте learner starter/solution автоматично. Для ігнорованих docs перевір diff і посилання; за потреби явно обери Markdown formatter без зміни всього репозиторію.
- `npm run build` вже запускає validate:content, build:runner, build:editor; не дублюй їх перед build без причини. **validate:content не виконує reference JS**, лише перевіряє структуру/hashes.
- Змінився runner/editor entry під час dev → перебудуй відповідний generated asset. Документація не потребує Next build.
- Windows sandbox: відома помилка tsx uv_os_get_passwd під час build. За повторення використай дозволений механізм ескалації для цієї команди; не змінюй залежності чи глобальну безпеку заради обходу. Це не автоматичний дозвіл поза sandbox.

## Приймальні межі

Результат має бути реальним: reload зберігає код, checkpoint відповідає перевіреній ревізії, fork не пошкоджує main, feedback пояснює помилку. Для UI оцінюй keyboard/screen-reader і потрібні ширини. Для schema/ID/starter — сумісність наявних даних. Для runner — hostile loops, мережа, навігація, повідомлення й XSS; деталі в P03_RUNNER.md. Для P11/P12 — перевірений незалежний ZIP FocusBoard із fixture mock data та інструкцією запуску. Ці критерії застосовуються до відповідної задачі/фази, не до кожної правки документації.

Звіт містить команду, результат і важливі пропуски. Старий успішний запуск не підтверджує нову поведінку. Відсутність тестового файла не є доказом коректності.
