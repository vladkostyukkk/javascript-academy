# P03 — прототип ізольованого runner

Дата: 2026-11-16. Межа фази: одна діагностична сторінка `/lab/runner`, без редактора, авторингу нових уроків або зміни прогресу. Це локальний spike, **не дозвіл на публічний запуск довільного коду**.

## Як виконується код

1. `prepareRun` перевіряє file map за чинним контрактом P02: до 50 файлів, 64 KiB на файл, 256 KiB загалом, строгі шляхи. `es-module-lexer/js` читає imports як текст і переписує лише статичні відносні JS-imports у віртуальні `academy:/src/...`. Немає eval, vm або виконання джерела на сервері чи в платформі.
2. `startRunner` створює новий iframe `sandbox="allow-scripts"` без `allow-same-origin`. Генерує UUID runId і випадковий 128-бітний nonce. У srcdoc потрапляє довірений bootstrap і JSON-дані з екранованим `<`; учнівський HTML не вставляється в документ платформи.
3. Runtime відмовляється стартувати поза opaque-origin iframe. CSP дозволяє bootstrap за nonce та локальні blob scripts; забороняє connect, зовнішні scripts/styles, images, frames, objects, forms, base URL. Немає `unsafe-eval` або `unsafe-inline` для scripts. Inline styles дозволені тільки в sandbox.
4. Pure JS виконується як тіло async-функції в Worker, створеному **всередині opaque iframe**, з успадкованою CSP. Worker повертає результат та console-події; його власник викликає `terminate` при завершенні, помилці або після 1,8 s. Це не Worker привілейованого app origin.
5. DOM/classic запускає окремий blob script у sandbox. HTML копіюється через allowlist елементів/атрибутів; event handlers, URL-атрибути, scripts, forms, embeds і meta не копіюються. CSS застосовується в iframe. ES modules отримують blob URLs та import map, створені в цьому самому sandbox; циклічний імпорт двох модулів перевірено браузером.
6. Mock fetch приймає тільки точний рядок `/mock/tasks.json` і GET. Дані беруться з віртуального JSON-файла, підтримано затримку 0–500 ms, HTTP 200/503 та AbortSignal. Інші виклики відхиляються; CSP незалежно блокує перевірені нативні мережеві API.
7. Parent приймає лише точний `event.source`, origin `null`, поточні nonce/runId й allowlisted Zod payload. Невідомі поля, типи, надмірний текст і чужі/прострочені повідомлення відхиляються. Opaque origin потребує `postMessage(..., "*")`; приймач не покладається на origin без перевірки source.

## Ліміти та життєвий цикл

- До 40 console-повідомлень і 16 384 UTF-16 code units виведення; одне повідомлення — до 1024, stack — до 3000. Host повторно обмежує вхід, навіть якщо iframe підробив console-подію. До 80 валідних повідомлень на запуск; після перевищення iframe видаляється.
- Parent timeout — 2 s. DOM-timeout є best-effort: таймер не може перервати цикл у тому самому потоці. Worker-timeout перевірено з реальним `while (true)`.
- Після результату preview залишається до 10 s від запуску, після чого iframe видаляється. Stop, зміна сценарію, новий Run і unmount прибирають попередній запуск, таймери й message listener. Створені runtime blob URLs відкликаються після виконання.
- Після повернення значення/завершення module evaluation є коротке 25 ms вікно для queued error/rejection events. Це не загальний детектор завершення всіх async-задач. Майбутні перевірки P04 мають явно await потрібну поведінку.
- Збірка `scripts/build-runner.mjs` використовує esbuild без minify: обчислювальна гілка `executeSandbox` самодостатня для серіалізації у Worker. DOM-гілка використовує окремий sandbox-only HTML copier. Зміни залежностей або налаштувань збірки вимагають повторення браузерних тестів.

У P04 додано режим `lesson`: статичний HTML/CSS preview у sandbox і JS у його Worker, з окремими Run/Check та типізованим `execution` payload. Старі чотири fixtures не замінено. Це не закриває загальні release blockers P03; подробиці інтеграції — ADR-011.

## Перевірені сценарії

| Сценарій | Позитивний результат | Негативний результат |
|---|---|---|
| A · pure JS | `sum(2,3)` повертає 5, console показує суму | 4 дає пояснення очікуваного/отриманого |
| B · classic DOM | Текст `#output` стає «Задач: 2» | «Задач: 0» не проходить assertion |
| C · modules | app.js ↔ labels.js через відносні imports повертають «Задач: 2» | Відсутній named export дає помилку виконання |
| D · async | Promise/top-level await/mock JSON повертають 2 задачі й оновлюють preview | HTTP 503 дає явну помилку mock API |

Окремо перевірено: runtime/syntax errors, unhandled rejection у Worker, AbortError, незавершений async timeout, повторний запуск після timeout, console flood/довгі рядки, HTML у console як текст, очищення при Stop/navigation, автоматичне закриття preview, parent DOM/storage/top navigation/popups, fetch/XHR/image/iframe/form, нативний XHR Worker, чужий source, неправильні nonce/runId, невідома команда, завеликий payload. Playwright перехоплює зовнішні адреси; у тестах блокованих API жоден запит не доходить до цього перехоплювача.

Axe перевіряє UI платформи лабораторії; student iframe виключено з цього аудиту. Це не автоматична гарантія доступності довільного учнівського preview. Firefox/Safari та ручний screen-reader аудит не виконані.

## Відомі межі — блокери публічного запуску

1. **Hostile DOM loop.** Тест з окремим браузером підтвердив початок реального `while(true)` через зовнішній Playwright binding перед вимірюванням. Host у перевіреному Edge перестав відповідати протягом 750 ms; завершити ізоляцію довелося закриттям власного браузера зовнішнім watchdog. Parent timeout не є hard kill. Потрібне рішення для сильнішої runtime/process isolation, а не обіцянка, що iframe гарантує responsive UI.
2. **Self-navigation.** `location.href` самого iframe створює навігаційний запит попри `connect-src 'none'`; sandbox зберігає обмеження, але не вимикає всю мережу. Тест перехопив і скасував запит до `https://example.invalid/self-navigation`, не відправляючи його назовні. Top navigation окремо заблоковано. До публічного запуску потрібен threat model, окремий sandbox origin без platform credentials і рішення щодо navigation/network egress; окремий origin сам по собі не закриває цей канал.
3. **Не anti-cheating.** Код усередині sandbox може дослідити власний bootstrap, nonce й assertion, підробити власний результат або browser APIs. Протокол захищає маршрутизацію повідомлень, не доводить чесність відповіді. Він не має команд unlock/save/auth або доступу до прогресу.
4. **CPU, пам’ять і message flood.** Ліміти обмежують прийняте виведення, а не ресурси браузера до structured clone, серіалізації або DOM-операцій. Вкладені Workers, getter-и та алокації можуть виснажити ресурси. 10 s lease теж залежить від працездатності event loop.
5. **Обмежений API.** Є статичні відносні імпорти. Dynamic import, import.meta, import attributes, package imports, module Workers і довільні HTML scripts/URL-атрибути лишаються поза контрактом. Native localStorage opaque iframe заборонений. Для Run у P10 додано окремий адаптер одного ключа з перевіркою повідомлень і лімітами. [ADR-029](DECISIONS.md#adr-029--сховище-перегляду-p10)

## Джерела технічних обмежень

- [MDN: iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) — sandbox tokens і обмеження навігації.
- [MDN: srcdoc](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc) — відокремлення документа без allow-same-origin.
- [CSP Level 3](https://www.w3.org/TR/CSP/) — CSP та успадкування для local-scheme contexts.
- [es-module-lexer](https://github.com/guybedford/es-module-lexer) — lexical imports і JS build. Установлено 3.0.5; реалізація використовує фактичні типи `type/specifier/start/end`, а не старий API з прикладів README.

Точні фінальні команди й кількість тестів — у [STATE.md](STATE.md). Перед релізом потрібні окремий security review P12 і закриття перелічених блокерів.
