# Architectural decision log

Write **durable** decisions here with date, status, context, selected option and consequences. Do not overwrite history; supersede an entry if necessary.

## ADR-001 — one cumulative learner project (proposed)
Decision: FocusBoard, a vanilla JS task manager built sequentially across all 60 lessons.
Reason: new JS concepts should produce visible value rather than unrelated coding challenges.

## ADR-002 — two separate technology stacks (proposed)
Decision: Next.js + TypeScript for platform; standard HTML/CSS/JS for student project.
Reason: student must learn JavaScript rather than framework-specific APIs.

## ADR-003 — local-first until runner stability (proposed)
Decision: IndexedDB saves drafts/checkpoints first; cloud auth/sync as later standalone phase.
Reason: isolate hardest problem (safe, reliable code evaluation) before full backend work.

## ADR-004 — sandbox isolation (mandatory)
Decision: learner-supplied scripts must not execute in Next.js server or privileged app origin. Isolated iframe with sandbox restrictions and mock network only.
Reason: untrusted code execution has security consequences.

## ADR-005 — межі демонстраційної оболонки P01 (прийнято, 2026-11-13)

Контекст: P01 описував «fake lesson UI», тоді як AGENTS.md забороняє фіктивні кнопки та успішні результати. Користувач погодив P01 після огляду й окремо дозволив `git init`.

Рішення: перший урок має явно позначені демонстраційні вкладки з реальним перемиканням. Приклад коду є текстовою UI-fixture, не виконується та не зберігається. Уроки 02–60 показують лише метадані й блокування; відвідування сторінки не відкриває урок. На `/project` — ілюстрація майбутнього результату та порожній стан, без фіктивного експорту.

Наслідки: P01 можна прийняти незалежно від runner/IndexedDB; це не завершення MVP. Повна теорія, quiz, registry і валідація — P02; runner — P03; редактор — P04; прогрес — P05. Маніфест і стан учнів не змінено. Git ініціалізовано без комітів. Публікація не входить до локального P01.

## ADR-006 — базовий UI та інструменти P01 (прийнято, 2026-11-13)

Контекст: потрібна проста оболонка в наявному корені без перезапису документації генератором.

Рішення: ручне налаштування Next.js App Router 16.4.6, React 19.3.1, TypeScript, Tailwind 4; збережено структуру `app/`, `components/`, `lib/` із ARCHITECTURE.md. Button/Tabs адаптовано за моделлю shadcn/ui на Radix; `components.json` дозволяє подальше додавання компонентів. Manrope та JetBrains Mono постачаються локально. `lib/lessons/catalog.ts` — лише адаптер маніфесту для відображення, не заміна майбутнього валідованого registry.

Наслідки: жодних серверних API, бази, auth або залежностей learner-проєкту на цій фазі. Версії зафіксовано в package-lock.json. Unit — Vitest; браузерні сценарії та axe — Playwright з Edge на Windows/Chromium на інших ОС. ESLint 9.39.5 тимчасово залишено для сумісності з peer-діапазонами плагінів eslint-config-next (спроба ESLint 10 виявила несумісність). ESLint 9 позначено deprecated; аудит dev-залежностей і перехід на підтримуваний узгоджений набір потрібні перед релізом. Не застосовували `--force` або довільні major-overrides транзитивних пакетів.

## ADR-007 — валідовані пакети й безпечна теорія P02 (прийнято, 2026-11-16)

Контекст: P02 потребує реального матеріалу js-01, строгого registry та переходу після перевірки розуміння. Повний runner і durable progress належать наступним фазам.

Рішення: Zod-схеми перевіряють маніфест, 60-ID тип `LessonId`, ланцюжок передумов і пакети з `content/lessons/index.json`. Markdown парситься через mdast-util-from-markdown і рендериться react-markdown з явним allowlist, без raw HTML/MDX/виконуваних компонентів; дозволені тільки HTTPS-посилання. `server-only` loader читає фіксований каталог `content/lessons`, перевіряє пакет і передає клієнту лише публічні матеріали. Reference, checks і контрольні суми залишаються на сервері/в авторських тестах. `validate:content` обов’язково запускається перед build.

Уточнення контракту: `durationMinutes`, `quiz.json`, `checkpoint.json`, мінімум 2 edge cases, строгі відносні virtual paths. `project-export` — дія js-60. Поточні файли маніфесту й curriculum не змінені. Додано перший еталон версії 1; попередніх користувацьких сховищ/checkpoint-ів немає, міграція даних на цій фазі не потрібна. Майбутня зміна опублікованих snapshot-ів потребуватиме нової версії та плану міграції.

Наслідки: доступність пакета й завершення уроку — різні поняття. Quiz перевіряється локально для навчання, правильні відповіді не є секретними. Practice/Tests UI відкриваються після правильних відповідей та явної дії; редагування відповіді скасовує перевірку. Перехід назад зберігає відповіді в компоненті, reload скидає їх; це явно пояснено в UI. Уроки 02–60 залишаються заблокованими. Це замінює демонстраційний js-01 з ADR-005; решта обмежень P01 чинна.

## ADR-008 — авторська перевірка js-01 до runner P03 (прийнято, 2026-11-16)

Рішення: еталон, starter і 6 негативних сценаріїв виконуються тільки в Playwright iframe з opaque origin, без доступу до parent DOM і мережі. Чистий `evaluateChecks` порівнює отримані спостереження, не виконує код. SHA-256 підтверджує відповідність кумулятивного checkpoint еталонним HTML/CSS/JS; поведінку окремо перевіряє браузерний тест.

Наслідки: тестовий harness є вузьким інструментом авторської QA для перевірених fixtures. Його не можна використовувати як публічний learner runner: повний nonce/runId-протокол, hostile-loop limits, modules і mock fetch ще не реалізовані. Сервер Next.js ніколи не виконує learner JS. Playwright використовує окремий порт 3100 і не перевикористовує невідомий сервер на 3000, щоб тестувати саме зібрану версію та не зачіпати локальний preview.

## ADR-009 — одноразовий runner P03 (прийнято для локального прототипу, 2026-11-16)

Контекст: до редактора й масштабного авторингу потрібно довести pure JS, classic DOM, ES modules і async mock fetch. P02 harness лишається окремою авторською перевіркою еталона js-01.

Рішення: `lib/runner/` містить протокол, валідацію/preparation, srcdoc builder, lifecycle controller, TypeScript runtime та fixtures. `/lab/runner` дає реальний Run/Stop/console/preview без зміни уроків і прогресу. Runtime збирається esbuild у згенерований статичний файл; bootstrap та learner source виконуються лише в opaque iframe. Pure mode створює Worker всередині iframe, DOM/classic/module залишаються в iframe. Відносні статичні JS-imports лексично переписуються в virtual IDs і локальну import map; цикли підтримані, dynamic/package imports відхиляються. Mock fetch читає тільки віртуальний `/mock/tasks.json` з контрольованими delay/status/abort.

Наслідки: nonce/runId/source + strict Zod перевіряють повідомлення; ліміти діють у runtime і parent. Worker має terminate, parent — best-effort deadline 2 s і lease preview 10 s. Storage bridge, Monaco, інтеграція checks уроку та durable progress не входять до P03. Існуючі файли учня, ID, checkpoint-и й схеми зберігання не змінено; міграція не потрібна. ES-module lexer 3.0.5 та esbuild 0.28.2 зафіксовані в lockfile.

## ADR-010 — межі безпеки P03 (відкриті release blockers, 2026-11-16)

Спостереження: тести підтвердили відсутність доступу до parent DOM/storage, блокування top navigation/popups і перевірених мережевих API. Водночас справжній DOM infinite loop заблокував host; зовнішній test watchdog закрив окремий браузер. Self-navigation iframe створила запит, перехоплений і скасований Playwright. CSP `connect-src` не є забороною будь-якої навігації.

Рішення: прийняти лише gate дослідного P03, не оголошувати публічний runner безпечним. Локальна інтеграція P04 може використовувати підтверджені сценарії; перед публічним запуском обов’язкові stronger execution isolation, threat model навігацій/egress, окремий sandbox origin без credentials і security review. Результати в sandbox не є anti-cheating proof. Обмеження, фактичні перевірки та первинні джерела описано в `docs/P03_RUNNER.md`; P12 gate лишається обов’язковим.

## ADR-011 — робочі файли й локальна перевірка P04 (прийнято, 2026-11-16)

Контекст: потрібен один повний read/edit/run/check сценарій з наявним js-01, без зміни curriculum та переходу до durable progress P05.

Рішення: стан файлів належить LessonExperience через useWorkspace; Monaco має окрему model для кожного файла, зберігає cursor/view state та undo при перемиканні. Панель практики приховується без демонтажу редактора. Зміна quiz може заблокувати практику, але не стирає draft. Зміна коду, Stop/reset, вихід з практики й unmount скасовують активний запуск; generation guard відхиляє запізнілі async-відповіді. Reset використовує native modal dialog, з явним підтвердженням і поверненням фокуса. Помилка editor asset або React render дає доступ до наявного коду через простий textarea та retry.

Run і Check — різні операції нового режиму `lesson`: Worker всередині opaque iframe виконує JS і повертає обмежений типізований `execution` payload. Декларативні checks передаються окремо від файлової карти; reference solution/hashes лишаються server-only. Це свідомо уточнює суворіше правило P02 щодо client props checks: локальні assertions відкриті для перегляду, як передбачає ARCHITECTURE.md, і не є anti-cheating механізмом. Runtime збирає binding у тому самому lexical scope та порівнює фактичні console arguments. Немає source-string перевірки рішення або автоматичного pass.

Наслідки: js-01 з двома незалежними умовами та шістьма негативними сценаріями є вертикальним зрізом P04. HTML/CSS read-only та перевіряються на цілісність перед запуском; preview показує цю основу, а учнівський JS працює лише у Worker. Чернетка лишається в пам’яті сторінки; UI пояснює межу, beforeunload та звичайні посилання попереджають про незбережені зміни. Це не повний history/navigation blocker і не persistence. P05 має додати IndexedDB, checkpoint і unlock; поточний успіх цього не імітує. ID, starter, solution, hashes і версія контенту не змінені; сховищ для міграції немає.

## ADR-012 — локальний Monaco ESM і patch DOMPurify (прийнято, 2026-11-16)

Рішення: Monaco 0.57.0 постачається з npm як ESM і збирається esbuild у локальні `public/monaco/` assets; CDN та deprecated AMD loader не використовуються. Завантажується тільки при відкритті практики. Core editor і TypeScript language worker — окремі bundles. Ці workers лише аналізують текст, ніколи не виконують учнівський JS. Підключено JS syntax diagnostics, HTML/CSS highlighting, file models, keyboard commands і доступні українські назви. Бібліотечні діагностичні тексти Monaco/JS можуть бути англійськими.

Під час встановлення audit виявив, що Monaco фіксує вразливий DOMPurify 3.4.15. Застосовано адресний patch override `monaco-editor → dompurify 3.4.18`; версії зафіксовано lockfile, без `npm audit fix --force`. Після оновлення Monaco переглянути потребу в override. Згенеровані assets не комітяться й виключені з lint/format; build:editor запускається перед dev/build. Зміни editor-entry потребують повторної генерації assets.

## ADR-013 — перша частина P05: локальні чернетки (2026-11-16)

Контекст: користувач дозволив продовжити розробку, але прямо попросив поки не робити продуктові тести. P05 розбито на bounded subtask автозбереження/відновлення файлів і наступну частину завершення/checkpoint/fork. Unit, E2E та ручні продуктові сценарії цього кроку не виконуються; lint, typecheck, форматування й build залишаються інженерними перевірками. Gate всієї P05 не оголошується пройденим.

Рішення: нативний IndexedDB adapter у lib/progress, без нової залежності. База javascript-academy версії 1 містить drafts за lessonId та append-only draft-backups. Snapshot v1: schemaVersion, lessonId, courseContentVersion, revision, fileMap, updatedAt і випадковий token. До завершення читання та валідації редактор недоступний; пізній read не замінює поточні редагування. Перевіряються розміри/шляхи, версія матеріалів і read-only основа. Автозбереження має debounce 500 ms та послідовну чергу; статус saved змінюється лише після завершення транзакції. Незбережені ревізії залишають beforeunload/link guard активним.

Захист від кількох вкладок: read/compare/write в одній readwrite транзакції порівнює поточний запис з останнім прочитаним/записаним. Token відрізняє навіть однакові ревізії. Конфлікт зупиняє подальші записи, залишає локальний код і пропонує JSON-копію перед reload. Немає автоматичного merge або перезапису новішої вкладки. Немає realtime-синхронізації: конфлікт виявляється при наступному записі.

Recovery: невідомий формат або інша courseContentVersion блокують автоматичний запис. Після явного підтвердження попередній raw record додається до draft-backups, а starter записується в drafts атомарно; помилка архівації скасовує всю транзакцію. Перед recovery доступне завантаження JSON. Збережені дані ніколи не виконуються. Внутрішній архів поки доступний через сховище браузера, UI історії/імпорту ще немає. Ручне пошкодження до несеріалізованих у JSON структур може унеможливити recovery/export, але не запускає видалення запису.

Міграція: P04 не мала persistent schema, тому створення v1 не мігрує і не видаляє попередніх учнівських даних. Для майбутньої v2 потрібен окремий план транзакційної міграції та резервування; поточний adapter не намагається downgrade бази або автоматично конвертувати невідомий snapshot. Інша версія контенту зараз потребує явного recovery, а не silent patch.

Межі: зберігаються тільки файли. Quiz, active tab, cursor/undo та результати checks не відновлюються після reload; статус completed, immutable checkpoint, fork та unlock лишаються наступною частиною P05. Не змінено runner, registry, starter/reference/hashes і версію контенту. Локальні дані не синхронізуються між пристроями й можуть зникнути після очищення браузера. Без браузерних перевірок поточна поведінка лишається непідтвердженою.

## ADR-014 — P05: завершення js-01 та окреме повторення (2026-11-16)

Обсяг: друге обмежене підзавдання P05 — completed, immutable checkpoint, fork повторення та локальна історія. Прохання користувача не робити продуктові тести повторено й залишається чинним. Це реалізація зі статичними перевірками, не підтвердження acceptance gate P05. Наявні продуктові тести не змінювали й не запускали.

План міграції v1 → v2: спільний database.ts відкриває IndexedDB версії 2. У versionchange-транзакції додаються лише три object stores: checkpoints, progress і forks. Існуючі drafts/draft-backups і всі їхні значення лишаються без змін; їх не потрібно переписувати або копіювати. При помилці upgrade IndexedDB відкочує всю зміну схеми. Для порожньої бази послідовно створюються stores v1 і v2. Відкриті з’єднання закриваються при versionchange; blocked показує повідомлення закрити інші вкладки. Старий код, що явно відкриває версію 1 після upgrade, має оновитися; автоматичний downgrade/видалення бази не допускається. Snapshot чернетки лишається schemaVersion 1. Upgrade поведінково не перевірявся.

Завершення: кнопка доступна після успішного Check актуальної ревізії, без активного виконання, pending autosave або помилки сховища. Редагування/reset, новий Run/Check і runtime error скидають підтвердження перевірки. Перед записом повторно перевіряється fileMap/read-only цілісність. Редагування тимчасово блокується на час операції. Очікується завершення черги autosave; порівнюються файли й revision зі збереженим snapshot. Одна readwrite-транзакція повторно звіряє весь snapshot, включно з token, і через add створює checkpoint та completed. У разі конфлікту/помилки жоден із двох записів не додається. Повторне завершення повертає наявний checkpoint без оновлення його файлів/дати. API не містить put/delete для checkpoint або completed.

Ключ завершення: lessonId@courseContentVersion. Checkpoint schemaVersion 1 містить учнівський fileMap, sourceRevision/sourceToken, completedAt і passedCheckIds. Progress schemaVersion 1 містить completed, lessonId, courseContentVersion, completedAt і checkpointId. Обидва записи перевіряються при читанні; неповна/пошкоджена пара дає помилку без автоматичного видалення. Ці записи не є криптографічним доказом або anti-cheating захистом від власника браузера.

Після completed основна чернетка заморожується в adapter, зокрема для застарілих вкладок: writeDraft у тій самій транзакції перевіряє наявність checkpoint/progress. Для повторення користувач явно відкриває один fork на ключ checkpoint. Fork зберігається в окремому store, з тим самим форматом чернетки й CAS-захистом. Перше повторення бере офіційний starter (це пояснено перед дією); наявний fork, навіть пошкоджений, ніколи не підміняється — для нього працює явне recovery. Check/reset повторення не змінюють canonical draft, checkpoint або progress. Зміна між main/fork демонтує сесію тільки після збереження fork; reload відкриває main, і повторення можна відкрити знову без втрати його збережених файлів.

UI: completed видно в самому уроці після reload; /project читає реальну історію та дозволяє завантажити JSON checkpoint. JSON не є ZIP-export, а імпорту ще немає. js-02…js-60 лишаються заблокованими. Проміжні theory/practice/quiz/attempts, відображення completed на карті курсу й checkpoint inheritance між різними уроками залишаються наступною частиною P05. Додаткових залежностей, змін curriculum/reference чи виконання JS поза чинним runner немає.

## ADR-015 — P05: відновлення quiz та completed на карті (2026-11-16)

Обсяг: третє підзавдання P05, без продуктових тестів за повтореним прямим дорученням користувача. Збереження відповідей, quiz-спроб, факту submit і вибраної вкладки плюс позначення completed на roadmap. Немає нового контенту, автоматичного unlock чи зміни runner.

Міграція v2 → v3 адитивна: versionchange-транзакція створює learning-sessions і learning-backups, не переписує та не видаляє попередні stores/records. Помилка upgrade відкочує зміну схеми. Порожня база послідовно створює stores v1–v3. Дані v1/v2 не мають quiz-сесії: перше відкриття показує початкову теорію, зберігаючи всі наявні чернетки/checkpoints. Старі вкладки закривають з’єднання на versionchange; після upgrade мають оновитися. Невідома новіша версія бази не downgrade-иться.

Snapshot schemaVersion 1: lessonId, courseContentVersion, scope main/fork, answers, submitted, tab, quizAttempts, revision, token, updatedAt. Ключ lessonId@courseContentVersion:scope відповідає одному main й одному fork на версію, як у ADR-014. Інша версія матеріалів має окремий ключ; попередні відповіді не видаляються й автоматично не переносяться. Незмінений початковий стан не записується до першої дії користувача.

Hydration блокує quiz і навігацію до практики до завершення читання. Restore перевіряє IDs/options і заново викликає поточний learning reducer: feedback/theoryPassed не беруться з диска. Навіть tab=practice/tests не відкриє gate без правильного submitted quiz. Новий answer скасовує gate як раніше. quizAttempts рахує натискання перевірки quiz; це не лічильник спроб Code Check. Підказки, cursor/undo, результати Check і вибір main/fork не відновлюються.

Autosave: debounce 400 ms, послідовна черга, read/compare/write в одній транзакції й випадковий token. Adapter повертає нормалізований запис для наступного CAS-порівняння. Конфлікт зупиняє записи без втрати поточних відповідей; можна завантажити JSON перед reload. Некоректний snapshot потребує явного підтвердження recovery: raw record архівується і початковий quiz записується атомарно. Файли/checkpoints/completed не зачіпаються. Єдиний beforeunload/link guard враховує і код, і навчальний стан; main/fork кнопки чекають на збереження. Немає auto-merge чи імпорту JSON.

Roadmap отримує з server-only loader лише доступні lessonId/courseContentVersion, без reference/checks/hashes. Клієнт читає валідовані checkpoint/progress пари, фільтрує точну версію й показує completed/лічильник. Loading/error відрізняються від нуля; retry та focus/visibility refresh перечитують IndexedDB. Застарілі відповіді читання відкидаються. Неготові уроки лишаються заблокованими; історія старих версій зберігається в /project. Це локальний стан, не синхронізація між пристроями.

Gate P05 не оголошується пройденим: migration, hydration, stale writes, recovery, fork separation і UI ще не перевірені у браузері. Рішення не скасовує release blockers P03.

## ADR-016 — P05: перегляд і відновлення локальних резервних копій (2026-11-17)

Обсяг: четверте підзавдання P05 — UI draft-backups, створення ручної копії, перегляд файлів, JSON download і явне відновлення. Чинне повторене доручення користувача виключає продуктові тести; виконуються лише lint, typecheck, форматування й build. Це не прийняття gate P05.

Сховище лишається IndexedDB v3, draft snapshot — v1. Міграція/переписування наявних даних не потрібні: використовується вже створений draft-backups. Старі записи без workspace читаються як main; додаткові metadata не змінюють original. Нові reason: manual і backup-restore; останній може містити sourceBackupId. Попередні копії не видаляються й не оновлюються. Cursor читає лише записи поточного уроку, від новіших ключів до старіших, сторінками по 20.

UI доступний у практиці основного уроку та повторення. Відображає джерело main/fork, дату, версію матеріалів і причину архівації. Валідні fileMap показуються тільки React-текстом у pre/code; JS/HTML не запускаються. Невідомий/пошкоджений original доступний для JSON-download, але не для відновлення. Інша courseContentVersion, невідомі шляхи або змінена read-only основа відхиляються без silent patch. Пошкоджені metadata самого архіву дають помилку читання без видалення.

Ручна копія створюється лише зі збереженого snapshot після очікування черги autosave й порівняння запису в транзакції. Відновлення потребує modal-підтвердження; pending edits спочатку мають зберегтися. Сумісні main/fork backups одного уроку можуть бути джерелом для активної чернетки. Завершений main не перезаписується: користувач має відкрити fork; його базовий checkpoint лишається незмінним.

Restore-транзакція охоплює drafts/forks/draft-backups і reads checkpoints/progress. Вона повторно читає вибрану копію, порівнює її з показаним записом і перевіряє expected target, зокрема token. Для main відхиляє будь-який completed; для fork вимагає валідну пару checkpoint/progress відповідного уроку/версії. Попередній raw target архівується перед put нового snapshot в тій самій транзакції; quota/conflict/invalid source скасовує весь запис. Original backup і completed/checkpoint не змінюються. Нова revision більша за поточну, token новий.

Hook блокує одночасні mutation-операції, очікує чергу, відкидає попереднє покоління autosave, синхронно скасовує runner і proof/results Check перед відновленням. Успіх показується лише після commit. Невдала спроба теж вимагає нового Check. Manual backup не змінює код або результат перевірки.

Під час операції редактор лишається змонтованим у режимі читання; manual backup не має скидати Monaco models/Undo. Відновлення оновлює файли через наявний контрольований стан; редактор не виконує їх автоматично.

Межі: це лише файловий архів цього браузера, без імпорту JSON, auto-merge, видалення/очищення, UI learning-backups або синхронізації. Дані зникають при очищенні браузера; JSON-копію можна зберегти окремо. Немає нової залежності, зміни curriculum/reference або runner security. Транзакційні й UI сценарії ще не перевірені поведінково.

## ADR-017 — P05: імпорт зовнішньої JSON-копії чернетки (2026-11-17)

Обсяг: п’яте підзавдання P05, без продуктових тестів за чинним дорученням користувача. Доповнює ADR-016 явним імпортом раніше завантаженої чернетки; не переносить completed, checkpoint, quiz або довільний проєкт.

Формати: DraftSnapshot v1 або строга обгортка draft-backups з id/lessonId/archivedAt/reason/workspace/original та optional sourceBackupId. Старий відсутній workspace означає main. Metadata уроку та workspace обгортки мають узгоджуватися з original. Зовнішній id не використовується як локальний ключ; original проходить чинну строгу snapshot/fileMap схему. Невідомі додаткові поля й формати відхиляються; автоматичної міграції немає.

Ліміт JSON — 2 MiB: перевіряється File.size до читання й UTF-8 розмір перед JSON.parse. Він враховує JSON-екранування максимальної файлової карти; ліміти коду залишаються 64/256 KiB. JSON.parse читає лише дані; ніякого eval, виконання HTML/JS або запиту на сервер. UI показує React-текст і причину несумісності, не переписуючи редактор під час вибору файла. Лічильник читань відкидає застарілу відповідь після іншого вибору або скасування; unmount також відкидає результат. Є скасування вибору й modal підтвердження з поверненням фокуса.

Імпорт і локальний restore використовують спільну restoreDraftFiles-транзакцію. Перед записом перевіряються lessonId/courseContentVersion, шляхи й read-only основа, поточний persisted target через CAS і completed/checkpoint. Для локального restore джерело додатково перечитується з бази; JSON є вже прочитаним валідованим snapshot у пам’яті. Поточний raw target архівується з reason json-import і нові файли записуються атомарно. Зовнішня revision не застосовується: нова більша за поточну локальну; updatedAt і token генеруються локально. Зовнішні metadata не створюють прогрес і не перезаписують локальні архіви.

Pending edits спочатку мають зберегтися. Hook блокує одночасні операції та стару autosave-чергу; workspace скасовує runner і старий Check перед записом. Після commit файли оновлюються в редакторі; до нового Check завершення недоступне. Завершений main не перезаписується; імпорт можливий у сумісний fork. Quiz/completed/checkpoint не змінюються. При помилці транзакції попередні записи залишаються, UI не оголошує успіх.

Міграція не потрібна: IndexedDB v3, draft schemaVersion 1, наявний append-only draft-backups; старі записи не переписуються. Залежності, curriculum, еталони, runner і unlock незмінні. Gate P05 не закрито: транзакції, file picker, race/cancel, modal/focus, quota rollback, fork isolation та повторний Check ще потребують продуктових перевірок після зняття обмеження користувача.
