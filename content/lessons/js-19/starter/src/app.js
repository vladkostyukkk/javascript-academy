const appName = "FocusBoard";
console.log(appName);

const taskTitle = "Вивчити JavaScript";
let priority = 1;
priority = 2;
const minutes = 25;

const category = "Навчання";
const taskLabel = taskTitle + " — " + category;

const secondTaskMinutes = 15;
const totalMinutes = minutes + secondTaskMinutes;

const completed = false;
const isImportant = true;
const taskStatus = "Завершено: " + completed + "; важливо: " + isImportant;

const timeLimit = 20;
const isOverLimit = minutes > timeLimit;
const fitsExactLimit = minutes <= minutes;
const exceedsExactLimit = minutes > minutes;

const taskCount = 4;
const completedCount = 1;
const completionPercent = completedCount / Math.max(taskCount, 1) * 100;
const emptyPercent = 0 / Math.max(0, 1) * 100;

const cardText = `${taskTitle} — ${category} | ${minutes} хв | прогрес: ${completionPercent}%`;
const emptyCardText = `Прогрес порожнього списку: ${emptyPercent}%`;

const minutesInput = "30";
const parsedMinutes = Number(minutesInput);
const invalidMinutes = Number.isNaN(Number("не число"));
const emptyMinutes = Number("");

const remainingMinutes = parsedMinutes - minutes;
const previewOverLimit = parsedMinutes > timeLimit;
const taskPreview = `${cardText} | введено: ${parsedMinutes} хв | запас: ${remainingMinutes} хв | понад ліміт: ${previewOverLimit}`;

function getPriorityLabel(priority) {
  let label = "";
  if (priority >= 2) {
    label = "Підвищений";
  } else {
    label = "Звичайний";
  }
  return label;
}

const priorityLabel = getPriorityLabel(priority);
const secondPriority = 1;
const secondPriorityLabel = getPriorityLabel(secondPriority);

const priorityPreview = `${taskPreview} | пріоритет: ${priorityLabel}`;

const isInProgress = true;
let statusLabel = "";
if (completed) {
  statusLabel = "Готово";
} else if (isInProgress) {
  statusLabel = "У роботі";
} else {
  statusLabel = "Заплановано";
}

const secondCompleted = true;
const secondIsInProgress = true;
let secondStatusLabel = "";
if (secondCompleted) {
  secondStatusLabel = "Готово";
} else if (secondIsInProgress) {
  secondStatusLabel = "У роботі";
} else {
  secondStatusLabel = "Заплановано";
}

const thirdCompleted = false;
const thirdIsInProgress = false;
let thirdStatusLabel = "";
if (thirdCompleted) {
  thirdStatusLabel = "Готово";
} else if (thirdIsInProgress) {
  thirdStatusLabel = "У роботі";
} else {
  thirdStatusLabel = "Заплановано";
}

const canComplete = !completed && (minutes <= timeLimit || isImportant);

const secondIsImportant = true;
const canCompleteSecond = !secondCompleted && (secondTaskMinutes <= timeLimit || secondIsImportant);

const thirdTaskMinutes = 35;
const thirdIsImportant = false;
const canCompleteThird = !thirdCompleted && (thirdTaskMinutes <= timeLimit || thirdIsImportant);

const boundaryMinutes = 20;
const canCompleteAtLimit = !thirdCompleted && (boundaryMinutes <= timeLimit || thirdIsImportant);

const completionLabel = completed ? "Виконана" : "Відкрита";
const secondCompletionLabel = secondCompleted ? "Виконана" : "Відкрита";
const completionPreview = `${priorityPreview} | виконання: ${completionLabel}`;

let kanbanColumn = "";
switch (statusLabel) {
  case "Заплановано":
    kanbanColumn = "До виконання";
    break;
  case "У роботі":
    kanbanColumn = "У процесі";
    break;
  case "Готово":
    kanbanColumn = "Виконано";
    break;
  default:
    kanbanColumn = "Без колонки";
}

let secondKanbanColumn = "";
switch (secondStatusLabel) {
  case "Заплановано":
    secondKanbanColumn = "До виконання";
    break;
  case "У роботі":
    secondKanbanColumn = "У процесі";
    break;
  case "Готово":
    secondKanbanColumn = "Виконано";
    break;
  default:
    secondKanbanColumn = "Без колонки";
}

let thirdKanbanColumn = "";
switch (thirdStatusLabel) {
  case "Заплановано":
    thirdKanbanColumn = "До виконання";
    break;
  case "У роботі":
    thirdKanbanColumn = "У процесі";
    break;
  case "Готово":
    thirdKanbanColumn = "Виконано";
    break;
  default:
    thirdKanbanColumn = "Без колонки";
}

const unknownStatusLabel = "готово";
let unknownKanbanColumn = "";
switch (unknownStatusLabel) {
  case "Заплановано":
    unknownKanbanColumn = "До виконання";
    break;
  case "У роботі":
    unknownKanbanColumn = "У процесі";
    break;
  case "Готово":
    unknownKanbanColumn = "Виконано";
    break;
  default:
    unknownKanbanColumn = "Без колонки";
}

const kanbanPreview = `${completionPreview} | колонка: ${kanbanColumn}`;

function formatTaskText(title, minutes = 30) {
  return `${title} — ${minutes} хв`;
}

const taskText = formatTaskText(taskTitle, minutes);
const quickTaskText = formatTaskText("Перевірити план");

function validateTitle(title) {
  if (typeof title !== "string") {
    return "Назва має бути рядком.";
  }
  if (title.trim() === "") {
    return "Введіть назву задачі.";
  }
  return null;
}

const canUseTaskTitle = validateTitle(taskTitle) === null;
