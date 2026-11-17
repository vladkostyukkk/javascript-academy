---
name: academy-code-execution
description: "Зміни ізольованого виконання JS, протоколу runner, інтеграції Monaco Run/Check або оцінювання коду в JavaScript Academy. Не використовуй для суто CSS, Markdown уроку, Git чи звичайного CRUD прогресу."
---

# Editor, runner і перевірка коду

## Вибери змінену межу
- Для execution/security прочитай [ARCHITECTURE](../../../docs/ARCHITECTURE.md) і [P03_RUNNER](../../../docs/P03_RUNNER.md), особливо відкриті release blockers. Не оголошуй браузерний sandbox безпечним для публічного hostile code за фактом timeout/CSP.
- Протокол/ізоляція: `lib/runner/protocol.ts`, `controller.ts`, `document.ts`, `runtime.ts`. Підготовка modules: `prepare.ts`. Завантажуй лише відповідні файли й виклики.
- Monaco/Run/Check: `components/workspace/use-workspace.ts`, `lesson-workspace.tsx`, `monaco-editor.tsx`, `lib/workspace/state.ts`, `lib/lessons/checks.ts`. Рішення ADR-009–012 шукай у DECISIONS за потреби; не перечитуй весь журнал.

## Робота
1. Визнач зміну поведінки та ризик: stale output/proof, module resolution, помилка/console, timeout чи доступ до host/network. Відтворення й тести — лише в дозволеному користувачем обсязі.
2. Збережи одноразовий opaque iframe `sandbox="allow-scripts"` без allow-same-origin. Pure JS працює у Worker всередині нього; DOM виконується за окремим sandbox-контрактом. Не перенось learner eval у сервер, app origin, звичайний host Worker чи editor language worker.
3. На межі повідомлень збережи перевірку source, nonce/runId, typed payload і лімітів. При edit/reset/cancel відкидай застарілі async results. Run не дає автоматичний pass; Check оцінює фактичне виконання, completion потребує актуального proof.
4. Збережи CSP/мережеві обмеження, mock fetch allowlist, path/file/output limits. Не клади reference або checks в editable map; клієнтські checks — не прихований anti-cheating механізм. Вивід показуй як текст.
5. Перевір змінену межу за [QUALITY](../../../docs/QUALITY.md): відповідні unit/fixtures з `tests/unit/runner.test.ts`, `tests/unit/workspace.test.ts`, `tests/e2e/runner*.spec.ts`, `workspace*.spec.ts`. Навмисний DOM infinite loop — лише в існуючому author harness із зовнішнім watchdog, не в користувацькій вкладці.
6. Змінений runtime/editor entry потребує відповідного build:runner/build:editor; production build уже включає їх. Не перебудовуй без зміни цих входів або іншої обґрунтованої потреби.

## Готовність
Змінена поведінка має докази, ізоляція/помилки/скасування не регресують у перевіреному обсязі; код учня та progress збережені. За відкладених продуктових тестів виконай доречні статичні перевірки й явно залиш поведінку/security gate непідтвердженими. Матеріальні зміни межі — ADR; стан/блокери — STATE. Цей skill не дозволяє deployment або сторонні security-атаки.
