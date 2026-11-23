## Практика FocusBoard

У модулі дошки зроби `stageToStatus(stage)` для `todo`, `doing`, `done` і `null` для невідомого значення. Додай `wireKanbanDrag(container, move)` з делегованими `dragstart`, `dragover` і `drop`.

Познач картки як draggable, а колонки через `data-stage`. На картці додай кнопки «До виконання» і «У роботу» з діями `todo` і `doing`. Використай один обробник зміни статусу для кнопок і drop, залишивши роботу Undo.
