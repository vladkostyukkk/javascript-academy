export function stageToStatus(stage) {
  if (stage === "todo") return "Заплановано";
  if (stage === "doing") return "У роботі";
  if (stage === "done") return "Готово";
  return null;
}

export function wireKanbanDrag(container, move) {
  container.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-task-id]");
    if (card && event.dataTransfer) {
      event.dataTransfer.setData("text/plain", card.dataset.taskId);
    }
  });

  container.addEventListener("dragover", (event) => {
    if (event.target.closest("[data-stage]")) event.preventDefault();
  });

  container.addEventListener("drop", (event) => {
    const column = event.target.closest("[data-stage]");
    if (!column || !event.dataTransfer) return;
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isSafeInteger(id) && id > 0) move(id, column.dataset.stage);
  });
}
