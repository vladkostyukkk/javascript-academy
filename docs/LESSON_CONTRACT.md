# Lesson content contract (version 1)

## Required properties of each lesson
```
content/lessons/js-01/
  meta.json           # id, number, title, module, durationMinutes, objectives, prerequisites
  theory.md           # clear Ukrainian explanation and small runnable examples
  challenge.md        # scenario, requirements, acceptance criteria, no full solution
  starter/            # virtual file map for new/fallback workspace
  tests/              # deterministic checks, including 2+ edge cases
  solution/           # verified reference files, not delivered to editor by default
  hints.json          # progressive hints (concept -> approach -> near-solution)
  quiz.json           # knowledge questions, options, correct option and explanations
  checkpoint.json     # lesson ID, course-content version, SHA-256 of reference files
```
This is a target contract; implementations can choose one machine-validated equivalent after documenting decision.

## Fields
- `id`: one of `js-01`..`js-60` matching manifest.
- `durationMinutes`: realistic estimate; optional adjustment based on trial learners.
- `objectives`: 2-4 concrete verbs, not vague «зрозуміти JS».
- `prerequisites`: immediate previous lesson, except `js-01`.
- `theory`: short intro, worked examples, common mistakes, knowledge check; avoid future-syntax dependency.
- `challenge`: specific desired user-visible result, editable paths, steps, success criteria, hints.
- `verification`: tests that inspect behavior, not only source string matches. Include valid input, empty/invalid input and at least two edge cases.
- `reference`: complete cumulative checkpoint of FocusBoard at this lesson.
- `starter`: previous verified checkpoint plus only the intentional gap (or official approved recovery checkpoint); NEVER overwrite live user workspace to apply a starter silently.

## Приклад уроку 16

- Учень оголошує `getPriorityLabel(priority)` у `src/app.js` і замінює два повторені обчислення викликами функції.
- Для числового пріоритету від 2 включно функція повертає «Підвищений». Для менших значень повертає «Звичайний».
- Перевірки викликають функцію з різними числами, зокрема по обидва боки порога. Попередні позначки й текст картки зберігаються.

## Critical pipeline
1. Validate metadata and lesson text.
2. Instantiate empty learner workspace from starter; verify tests fail for the intended missing implementation (not necessarily ALL tests).
3. Run reference solution; verify every test passes.
4. Run regression for all previous solution checkpoints or the cumulative final app at the current stage.
5. Prove UI feedback explains the failure in Ukrainian.
6. Save an immutable checkpoint and course-content version.

## Content teaching style
1 concept per main lesson; 10–20 min theory, 15–35 min hands-on as a starting heuristic. Prioritize understanding over completing exactly 60 pages. 3 progressive hints, not instant spoilers. Supply learner-facing error messages that say what behavior failed and how to think, without exposing the full answer.

## Машинний контракт P02 (ADR-007, 2026-11-16)

- `content/lessons/index.json` містить унікальні ID пакетів, які вже мають усі обов’язкові матеріали. Маніфест зберігає всі 60 ID. Відсутні пакети дозволені лише для `planned`; `published` без пакета відхиляється. Наявність пакета не відкриває урок учню.
- `meta.json` додатково має `editablePaths` і `courseContentVersion`; `durationMinutes` — єдина назва поля тривалості. ID, номер, назва, модуль і prerequisites точно відповідають маніфесту.
- `quiz.json` — 2–5 запитань з унікальними ID. У кожному: `prompt`, 2–5 `options` (id/label/explanation), `correctOptionId`, який існує серед варіантів. Пояснення обов’язкове для кожного варіанта.
- Markdown має непорожній текст до 32 KiB, заголовки h2–h4, абзаци, списки, виділення, цитати, код і HTTPS-посилання. HTML, JSX/MDX-компоненти, зображення та довільні плагіни не виконуються й не приймаються як розмітка. Приклади коду рендеряться лише текстом.
- Канонічні відносні шляхи проєкту: `index.html`, `styles.css`, `src/**.js`, `mock/*.json` з простими латинськими сегментами. Заборонено абсолютні шляхи, `..`, зворотні слеші, URL і кодування `%`. До 50 файлів, 64 KiB на файл, 256 KiB на карту. `editablePaths` посилається лише на наявні starter-файли.
- `primaryFile: project-export` у маніфесті — спеціальна дія лише js-60; це не шлях у файловій карті.
- Starter і solution мають однакові шляхи; `checkpoint.json` містить SHA-256 кожного solution-файла після нормалізації CRLF → LF. Еталонні файли та hashes не передаються клієнту. У P04 декларативні checks передаються окремими публічними props для локальної перевірки (ADR-011); вони ніколи не є файлами редактора або прихованим grading-секретом.
- У js-01 `tests/checks.json` описує перевірки значення `appName` та точного виведення консолі. `tests/negative-cases.json` містить порожній/некоректний код і 4 крайові сценарії: пробіл наприкінці, регістр, повторний log, буквальний текст замість значення. Очікувані невдалі перевірки явно перелічено.
- `npm run validate:content` перевіряє структуру та контрольні суми, але **не виконує JS**. Ця команда є `prebuild`. `tests/e2e/reference.author.spec.ts` окремо запускає лише репозиторні еталонні/негативні fixtures у disposable iframe `sandbox="allow-scripts"` без `allow-same-origin`, на `about:blank`, з CSP без мережі. Це авторський тест js-01, не готовий learner runner P03.
- Вихідні учнівські файли у `content/` не форматуються автоматично й не перевіряються правилами Next.js ESLint: їх перевіряють валідатор та браузерні поведінкові тести. Це зберігає навмисні прогалини starter-а й стабільність checkpoint-ів.

Перший урок коротко пояснює наданий шаблон `const`, необхідний для `appName`; порівняння `let`/`const` і повні правила змінних залишаються уроку 2. Повна перевірка цілісності інших 59 уроків відбудеться під час їхнього авторингу.

## Інтеграція P04

- `editablePaths` визначає, які файли можна змінювати. Для js-01 це лише `src/app.js`; HTML/CSS можна читати у Monaco. Перед Run/Check перевіряються дозволені шляхи, розміри й незмінність решти starter-файлів.
- Run виконує код і показує console та HTML/CSS основу FocusBoard, але не оголошує проходження завдання. Check запускає окреме виконання та порівнює фактичні `appName`/console з декларативними checks. Код виконується у Worker всередині opaque iframe; HTML/CSS preview не виконує учнівський JS.
- Файли й cursor/view state переживають перемикання вкладок уроку в цій сторінці. Будь-яке редагування або reset скасовує попередній run і результати checks. Reset потребує підтвердження, еталон ніколи не підставляється в робочий файл.
- Успішні checks не створюють checkpoint, не зберігають draft і не відкривають наступний урок: це P05. Формат контенту й еталон js-01 не змінені; оновлено лише фінальний абзац challenge для чинного UI.

## Перша частина P05 — чернетки

Файли зберігаються незалежно від результату Check: IndexedDB snapshot містить schemaVersion, lessonId, courseContentVersion, revision, fileMap, updatedAt і token. Після читання перевіряються схема, версія контенту, шляхи та цілісність read-only файлів. Невідповідність не виправляється автоматично: учень може завантажити запис або явно відновити starter зі збереженням локального архіву. Це уточнює обмеження P04 щодо draft; завершення, immutable checkpoint та unlock поки не реалізовано. Поведінкові тести цієї частини P05 відкладено за прямим дорученням користувача.

## Друга частина P05 — завершення і повторення

Після актуального успішного Check і завершення автозбереження учень явно підтверджує завершення. Заново перевіряється цілісність файлів; транзакція порівнює збережену чернетку з перевіреною ревізією та записує completed і checkpoint разом. Checkpoint містить учнівські файли, sourceRevision/sourceToken, lessonId/courseContentVersion, completedAt і пройдені ID checks. Reference solution ніколи не підставляється. Подальше редагування відбувається в окремій копії повторення, прив’язаній до checkpoint; ні повторення, ні reset не оновлюють завершену версію. Перший fork створюється зі starter після явного вибору, наявна копія не перезаписується. Нові матеріали автоматично не відкриваються. Це замінює обмеження попередніх підрозділів щодо відсутності completed/checkpoint; поведінкові перевірки P05 досі відкладені.

## Третя частина P05 — навчальний стан і карта

Quiz snapshot зберігає answers, submitted, tab, quizAttempts, revision/token, lessonId/courseContentVersion та scope main/fork. Feedback і theoryPassed не зберігаються як довірені значення: вони відновлюються через поточний reducer/quiz. Невідомі question/option IDs дають явне recovery; некоректна спроба відкрити практику повертає до теорії. Зміна відповіді й надалі скасовує quiz gate. Код і результати Run/Check не виконуються при відновленні. Перехід між main/fork очікує збереження відповідей. На карті completed враховується лише для валідного checkpoint поточної версії доступного пакета; readiness і unlock не змінено. Поведінкові перевірки цього кроку також відкладені.

## Четверта частина P05 — локальний архів файлів

Перед відновленням з draft-backups перевіряються lessonId/courseContentVersion, schemaVersion/розміри/шляхи і read-only основа. Відновлення змінює тільки активну main/fork чернетку: архівування її попереднього raw record і запис вибраних файлів атомарні. Завершений main захищений; сумісні main/fork копії цього уроку можна явно перенести в повторення. Вибрана копія повторно читається перед записом; при зміні копії або поточної чернетки операція відхиляється. Revision збільшується, token оновлюється, попередні результати Check і старі autosave-запити скасовуються. Відновлення не виконує код і не завершує урок. Імпорт JSON, автоматичне виправлення несумісних копій та видалення архіву не реалізовані. Поведінкові перевірки відкладено за дорученням користувача.

## П’ята частина P05 — явний імпорт JSON чернетки

Уточнює попередню відсутність імпорту: приймаються два наявні формати завантаження — строгий DraftSnapshot v1 або обгортка запису draft-backups з валідним original. Файл обмежено 2 MiB до читання; ліміти fileMap лишаються 64 KiB на файл і 256 KiB разом. Після перевірки формату показується лише текст; несумісність lessonId/courseContentVersion, шляхів або read-only основи блокує підтвердження. Перед записом сумісність перевіряється повторно. Зовнішні id/revision/token не стають ключами чи доказами прогресу: локальні revision/token генеруються заново. Архівування попереднього raw record (reason json-import) і запис чернетки виконуються однією транзакцією з CAS. Завершений main захищений; fork вимагає валідний checkpoint. Quiz, completed і checkpoint не змінюються. Новий код потребує нового Check; JSON не виконується й не надсилається на сервер. Продуктові перевірки залишаються відкладеними.

## P06 — готові послідовні пакети

Повні пакети js-01 і js-02 доступні через registry; js-02 відкривається лише після валідного завершення js-01 поточної версії. Новий draft атомарно успадковує checkpoint попереднього уроку. Наявні файли не замінюються; нові starter paths додаються. Несумісна read-only основа вимагає явного вибору офіційного starter або майбутньої міграції. Існуюча target-чернетка та source checkpoint не перезаписуються. Деталі — ADR-020–021.

bindingEquals приймає string, finite number або boolean; порівняння строге. js-02 перевіряє appName, taskTitle, priority, minutes і попереднє console-виведення. Тип декларації let/const не перевіряється автоматично, про це повідомляє challenge. Пакет має 5 негативних сценаріїв; tests/e2e/transition.author.spec.ts виконує їх та reference у фактичному learner runner після проходження prerequisite й quiz. Check сам по собі не завершує урок: потрібна явна дія з атомарним записом checkpoint/progress.

js-03 «Рядки» продовжує solution js-02 без зміни read-only основи. Додає category та taskLabel через +, без залежності від шаблонних рядків js-08. Сім checks контролюють кінцеві значення та попередню консоль; шість negative fixtures охоплюють порожній/невалідний код, пропущені пробіли, буквальне ім’я змінної, порожню категорію і зайвий пробіл. Перехід, reference та fixtures перевірено у tests/e2e/transition.author.spec.ts через фактичний runner.

js-04 «Числа» продовжує solution js-03 без змін старих файлів основи. Додає числові secondTaskMinutes і totalMinutes, зберігаючи попередні результати. Дев’ять checks оцінюють значення, шість negative fixtures охоплюють порожній/невалідний код, текстову, від’ємну та нульову другу тривалість і текстову суму. Нуль коректний як число, але не відповідає заданій тривалості 15. Check не доводить використання формули: це явно пояснюється в challenge.

js-05 «Булеві значення» продовжує solution js-04. Додає completed = false, isImportant = true і taskStatus через знайоме об’єднання рядків, без умов/тернарного оператора майбутніх уроків. Текст true/false у статусі є навчальним представленням даних; людські назви станів вводитимуться пізніше. Дванадцять checks перевіряють також тип прапорців; сім negative fixtures включають рядкові/числові заміни, інверсію та помилку роздільника. Попередні схеми та файли основи незмінні.

Місткість набору перевірок обмежена спільним MAX_LESSON_CHECKS = 32 у контенті, протоколі runner і checkpoint (ADR-022). Надмірний пакет відхиляється статично, а не лише при першому Check. Розширення сумісне зі старими збереженнями й не змінює інших лімітів виконання.

## Авторинг js-06–js-10 (приймання відкладено)

Пакети продовжують попередній solution без зміни HTML/CSS основи. js-06 додає порівняння; js-07 — відсоток із захищеним знаменником; js-08 — текст картки; js-09 — Number/Number.isNaN; js-10 — підсумковий текстовий preview. Обмеження навчального домену — ADR-023. Набори checks накопичуються до 29 у js-10, нижче межі 32.

Reference, negative fixtures, hashes і starters підготовлено, але не перевірено командами або браузером. Author harness потребує розширення на js-06–js-10. Наявність пакетів не підтверджує gate P06; відкриття наступного уроку й далі потребує валідного попереднього checkpoint/progress.

## Приймання P06 — 2026-11-18

Попередній статус відкладених перевірок js-06–js-10 замінено: структура й hashes валідні; reference, negative fixtures та переходи 01–10 перевірено в ізольованому runner. Авторський harness розширено до js-10. Педагогічний перегляд завершено; докази та межі — P06_ACCEPTANCE.md.

## P07 — умови та функції

Пакети успадковують попередній еталон і ту саму HTML/CSS основу. Спільна межа становить 32 checks на урок. Після js-11 кожний новий пакет покриває поточну тему та ключові накопичувальні результати, а повна регресія всіх еталонів лишається окремим критерієм приймання P07.

У js-16–js-20 Check може викликати функції за декларативним контрактом [ADR-024](DECISIONS.md#adr-024--перевірка-функцій-і-замикань-у-p07-2026-11-21). Закладай і звичайні, і крайові аргументи. У завданні пояснюй очікуваний тип повернення і збереження виведення програми. Для `validateTitle` успішна валідація повертає значення `null`. Для `createIdGenerator` кожен виклик фабрики створює власну послідовність чисел із 1. Функції під час Check викликає тільки уроковий Worker.

## P08 — масиви, об’єкти та перетворення

Для колекцій застосовуй `bindingStructure` або `callStructure`. Перевіряй повну структуру, порядок масиву, типи й точні власні поля запису. Задавай крайові аргументи, зокрема порожній масив, нуль і відсутній результат пошуку, коли це частина поведінки уроку. Для вправ зі зміною даних використовуй `firstArgAfter`. Для вправ із копією `returnsCopy` має підтвердити нове посилання на результат і початковий стан першого аргументу. [ADR-025](DECISIONS.md#adr-025--структурні-перевірки-p08)

JS24 збирає `tasks` із полями `id`, `title`, `status`, `priority` і `minutes`. Наступні уроки зберігають цю колекцію, а нові результати використовують її для підписів, пошуку, фільтрації, сортування та статистики. Еталон js-30 проходить попередні набори перевірок окремими запусками в уроковому Worker. Межа 32 діє для кожного запуску.

### P09 — перевірка тексту DOM

У js-31 початкова версія збігається з checkpoint js-30. Новий код додається до `src/app.js`. HTML і CSS зберігають ті самі шляхи та вміст, щоб перехід міг успадкувати файли учня.

Перевірки `domTextEquals` звіряють точний текст першого елемента за CSS-селектором. Відсутній елемент не проходить перевірку. Пакет із DOM-перевірками використовує їх для всього Check. Попередні обчислювальні еталони перевіряються окремо під час накопичувального браузерного прогону. [ADR-026](DECISIONS.md#adr-026--запуск-dom-уроків-p09)
