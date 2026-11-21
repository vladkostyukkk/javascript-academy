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
