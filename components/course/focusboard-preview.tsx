import { Circle, MoreHorizontal, Plus } from "lucide-react";

// Static illustration of the future learner project. Not a workspace or saved user data.
const demoColumns = [
  {
    title: "Зробити",
    color: "gray",
    tasks: ["Вивчити JavaScript", "Записати нову ідею"],
  },
  { title: "У роботі", color: "yellow", tasks: ["Створити FocusBoard"] },
  { title: "Готово", color: "green", tasks: ["Зробити перший крок"] },
];

export function FocusBoardPreview() {
  return (
    <div
      className="board-preview"
      role="img"
      aria-label="Ілюстрація майбутнього FocusBoard: задачі у колонках Зробити, У роботі та Готово"
    >
      <div aria-hidden="true">
        <div className="board-toolbar">
          <span className="board-logo">
            <span className="board-symbol">▥</span> FocusBoard
            <span className="board-version">/ мій простір</span>
          </span>
          <MoreHorizontal size={18} />
        </div>
        <div className="board-heading">
          <span>Звільни місце для важливого.</span>
          <span className="board-add">
            <Plus size={12} /> Задача
          </span>
        </div>
        <div className="board-columns">
          {demoColumns.map((column) => (
            <div key={column.title} className="board-column">
              <div className="board-column-title">
                <span className={`board-dot ${column.color}`} />
                {column.title}
                <span>{column.tasks.length}</span>
              </div>
              {column.tasks.map((task, index) => (
                <div key={task} className="board-task">
                  <span className={`task-tag ${column.color}`}>
                    {index === 0 ? "Особисте" : "Ідеї"}
                  </span>
                  <p>{task}</p>
                  <span className="task-meta">
                    <Circle size={10} />
                    {column.color === "green" ? "Завершено" : "Крок за кроком"}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
