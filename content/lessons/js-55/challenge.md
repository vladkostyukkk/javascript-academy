## Практика FocusBoard

Експортуй `normalizeQuery(value)`, `waitForSearch(query, milliseconds, signal)` та `getCanceledSearchResult()` для перевірки скасування. Після затримки повертай нормалізований запит, а при скасуванні відхиляй Promise з `AbortError`.

У слухачі `input` скасуй попередній контролер, створи новий і виклич `waitForSearch`. Оновлюй стан лише для чинного запиту. Скасований результат не повинен перемальовувати дошку.
