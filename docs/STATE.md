# Поточний стан — JavaScript Academy

## Продовження
- **P06 завершено в обсязі [P06_ACCEPTANCE.md](P06_ACCEPTANCE.md): 10 послідовних пакетів і перевірених cumulative checkpoints.** P00–P04 завершено раніше; базовий P05 прийнято в обсязі [P05_ACCEPTANCE.md](P05_ACCEPTANCE.md).
- Останнє доручення — повністю завершити P06 покроково; воно дозволило необхідні тести й QA замість попередньої заборони. P07 ще не розпочато.
- Git: main, приватний vladkostyukkk/javascript-academy. Попередні незакомічені зміни збережено; commit/push не виконано й окремо не доручено.

## Реалізовано
- Next.js/React/TypeScript, roadmap 60 ID; повні пакети js-01–js-10. js-11–js-60 не мають пакетів і заблоковані.
- Українські теорія → quiz → практика → Check; Monaco та ізольований runner. 01–10 послідовно створюють дані й текстовий preview FocusBoard; DOM ще не вводиться.
- IndexedDB v3: autosave/CAS, recovery, immutable checkpoint/completed, fork для повторення, історія /project, quiz/tab persistence, backups/restore/JSON import. Snapshots v1; міграції цього приймання немає.
- Наступний урок потребує валідного checkpoint/progress попереднього. Перехід атомарно переносить учнівські файли, додає нові starter paths, не перезаписує target-чернетку. Несумісна основа має явний підтверджений fallback; source зберігається.
- Check підтримує строгі string/number/boolean очікування; спільна межа 32 checks. У js-10 — 29. ADR-022 описує сумісність; ADR-023 — Math.max та Number/isNaN без ранніх умов.

## Останній крок — приймання P06, 2026-11-18
- Розширено transition.author на js-06–js-10; unit перевіряє всі 10 пакетів та спадковість starter. Оновлено застарілі UI-тести після P05: quiz зберігається, статуси мають точні області пошуку, історія має актуальний порожній стан.
- Проведено педагогічний перегляд матеріалів 01–10 та візуальний перегляд desktop theory/mobile practice screenshots. Еталони й негативні fixtures виконані в ізольованому браузерному runner, не в Node.
- Оновлено README, ROADMAP, LESSON_CONTRACT, цей STATE і P06_ACCEPTANCE. Навчальні файли та runtime під час приймання не змінювалися.

## Фактичні перевірки
- npm run build: успішно; 60 ID / 10 пакетів, структура/Markdown/quiz/SHA-256, 67 сторінок. Після відомої Windows sandbox помилки uv_os_get_passwd повторено поза sandbox.
- npm test: 70 passed / 6 файлів після виправлення застарілого очікування 5 пакетів.
- npm run lint, npm run typecheck; адресний ESLint змінених тестів; git diff --check — успішно.
- Desktop reference.author + transition.author + runner: усі 17 сценаріїв успішні в завершеному розширеному запуску. Підтверджено reference/negative fixtures 01–10, starter failures, transitions, completion/reload, незмінність source, pure/DOM/modules/async та Stop/navigation.
- Розширений desktop прогін: 22 passed / 4 failed / 1 skipped. Усі 4 помилки в застарілих UI-тестах виправлено. Повторний lesson + shell на desktop/tablet/mobile: **28 passed / 2 skipped**, exit 0. Skips стосуються narrow-phone на desktop/tablet; mobile пройшов.
- Перший sandbox E2E завис після 17 успішних сценаріїв на завершенні сервера; перервано й повторено поза sandbox. Докази gate — завершені запуски, а не перерваний процес.

## Відомі межі
- Release blockers P03: hostile DOM loop може блокувати host; iframe self-navigation може дати egress. Публічний запуск довільного коду потребує посилення ізоляції/security review (ADR-010, P03_RUNNER). P06 не закриває security gate.
- Check перевіряє значення, не AST чи захист від списування; обмеження пояснено у challenge. Формула 07 має обмежений домен лічильників; NaN-перевірка 09 не замінює повну валідацію вводу.
- Firefox/Safari, повний ручний screen-reader аудит і тестування з реальними учнями не виконані. Неприйнятий обсяг P05 — P05_ACCEPTANCE.
- Архів без auto-prune; очищення браузера видаляє дані. Cloud, ZIP export, курс 11–60 ще не реалізовані. Версії контенту потребують явної політики міграції; пошкоджені записи не виправляються автоматично. Відкрите curriculum питання 46/54.

## Наступна дія
Розпочати P07 з пакета js-11 «if / else»: словесний пріоритет на основі checkpoint js-10, із перевіркою накопичувальної регресії та плануванням місткості checks перед перевищенням 32.
