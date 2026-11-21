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

let priorityLabel = "";
if (priority >= 2) {
  priorityLabel = "Підвищений";
} else {
  priorityLabel = "Звичайний";
}

const secondPriority = 1;
let secondPriorityLabel = "";
if (secondPriority >= 2) {
  secondPriorityLabel = "Підвищений";
} else {
  secondPriorityLabel = "Звичайний";
}

const priorityPreview = `${taskPreview} | пріоритет: ${priorityLabel}`;
