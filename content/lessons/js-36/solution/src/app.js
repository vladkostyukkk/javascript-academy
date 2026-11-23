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

const formatMinutes = (minutes) => `${minutes} хв`;

function formatTaskText(title, minutes = 30) {
  return `${title} — ${formatMinutes(minutes)}`;
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

function createIdGenerator() {
  let lastId = 0;

  return () => {
    lastId = lastId + 1;
    return lastId;
  };
}

const nextTaskId = createIdGenerator();
const taskId = nextTaskId();
const secondTaskId = nextTaskId();

const taskTitles = [taskTitle, "Перевірити план", "Зробити перерву"];
const taskTitleCount = taskTitles.length;

function getTaskTitleAt(titles, index) {
  return titles[index];
}

const firstTaskTitle = getTaskTitleAt(taskTitles, 0);
const lastTaskTitle = getTaskTitleAt(taskTitles, taskTitleCount - 1);
const missingTaskTitle = getTaskTitleAt(taskTitles, taskTitleCount) === undefined;
const emptyTaskTitle = getTaskTitleAt([], 0) === undefined;

function addTaskTitleAt(titles, index, title) {
  if (!Number.isInteger(index) || index < 0 || index > titles.length) {
    return false;
  }

  titles.splice(index, 0, title);
  return true;
}

function removeTaskTitleAt(titles, index) {
  if (!Number.isInteger(index) || index < 0 || index >= titles.length) {
    return false;
  }

  titles.splice(index, 1);
  return true;
}

const updatedTaskTitles = [taskTitles[0], taskTitles[1], taskTitles[2]];
const taskTitleAdded = addTaskTitleAt(updatedTaskTitles, 1, "Оновити нотатки");
const taskTitleRemoved = removeTaskTitleAt(updatedTaskTitles, 2);

function countCompleted(flags) {
  let count = 0;
  for (const flag of flags) {
    if (flag) {
      count = count + 1;
    }
  }
  return count;
}

function getFirstCompletedIndex(flags) {
  for (let index = 0; index < flags.length; index = index + 1) {
    if (flags[index]) {
      return index;
    }
  }
  return -1;
}

const completionFlags = [completed, secondCompleted, thirdCompleted];
const completedFromFlags = countCompleted(completionFlags);
const firstCompletedIndex = getFirstCompletedIndex(completionFlags);

const thirdTaskId = nextTaskId();

const tasks = [
  {
    id: taskId,
    title: taskTitles[0],
    status: statusLabel,
    priority: priority,
    minutes: minutes,
  },
  {
    id: secondTaskId,
    title: taskTitles[1],
    status: secondStatusLabel,
    priority: secondPriority,
    minutes: secondTaskMinutes,
  },
  {
    id: thirdTaskId,
    title: taskTitles[2],
    status: thirdStatusLabel,
    priority: priority,
    minutes: thirdTaskMinutes,
  },
];

function setTaskStatus(task, status) {
  task.status = status;
}

function hasTaskField(task, field) {
  return Object.hasOwn(task, field);
}

const taskDraft = {
  id: tasks[0].id,
  title: tasks[0].title,
  status: tasks[0].status,
  priority: tasks[0].priority,
  minutes: tasks[0].minutes,
};

setTaskStatus(taskDraft, "Готово");
const taskDraftTitle = taskDraft["title"];

function updateTask(task, status) {
  return { ...task, status: status };
}

function getTaskCardText(task) {
  const { title, minutes } = task;
  return formatTaskText(title, minutes);
}

const updatedTask = updateTask(tasks[2], "У роботі");
const updatedTaskText = getTaskCardText(updatedTask);

function getTaskLabels(list) {
  return list.map(getTaskCardText);
}

const taskLabels = getTaskLabels(tasks);

function filterCompletedTasks(list) {
  return list.filter((task) => task.status === "Готово");
}

function findTaskById(list, id) {
  return list.find((task) => task.id === id);
}

const completedTasks = filterCompletedTasks(tasks);

function sortTasksByPriority(list) {
  const ordered = [...list];
  ordered.sort((first, second) => second.priority - first.priority);
  return ordered;
}

const sortedTasks = sortTasksByPriority(tasks);

function getTaskStats(list) {
  return list.reduce(
    (stats, task) => {
      stats.total = stats.total + 1;
      if (task.status === "Готово") {
        stats.completed = stats.completed + 1;
      }
      stats.totalMinutes = stats.totalMinutes + task.minutes;
      return stats;
    },
    { total: 0, completed: 0, totalMinutes: 0 },
  );
}

const taskStats = getTaskStats(tasks);

const boardHeading = document.querySelector("main h1");
boardHeading.textContent = "FocusBoard — дошка задач";

function createTaskCard(task) {
  const card = document.createElement("article");
  const title = document.createElement("h2");
  const duration = document.createElement("p");

  title.textContent = task.title;
  duration.textContent = formatMinutes(task.minutes);
  card.append(title, duration);


  card.dataset.taskId = task.id;
  const status = document.createElement("span");
  status.className = "task-status";
  status.textContent = task.status;
  const doneButton = document.createElement("button");
  doneButton.type = "button";
  doneButton.dataset.action = "complete";
  const doneLabel = document.createElement("span");
  doneLabel.textContent = "Позначити виконаною";
  doneButton.append(doneLabel);
  card.append(status, doneButton);

  return card;
}

const taskContainer = document.querySelector("#tasks");
function renderTasks(list) {
  taskContainer.textContent = "";
  for (const task of list) {
    taskContainer.append(createTaskCard(task));
  }
}

renderTasks(tasks);

const taskForm = document.createElement("form");
taskForm.id = "task-form";

const taskTitleLabel = document.createElement("label");
taskTitleLabel.htmlFor = "task-title";
taskTitleLabel.textContent = "Назва задачі";

const taskTitleInput = document.createElement("input");
taskTitleInput.id = "task-title";
taskTitleInput.type = "text";

const addTaskButton = document.createElement("button");
addTaskButton.type = "submit";
addTaskButton.textContent = "Додати задачу";

const taskTitleError = document.createElement("p");
taskTitleError.id = "task-title-error";
taskTitleError.setAttribute("aria-live", "polite");
taskTitleInput.setAttribute("aria-describedby", taskTitleError.id);

taskForm.append(taskTitleLabel, taskTitleInput, taskTitleError, addTaskButton);
taskContainer.before(taskForm);

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskTitleInput.value.trim();
  const error = validateTitle(title);
  taskTitleError.textContent = error ?? "";
  if (error) {
    taskTitleInput.focus();
    return;
  }
  tasks.push({
    id: nextTaskId(),
    title,
    status: "Заплановано",
    priority: 1,
    minutes: 0,
  });
  taskTitleInput.value = "";
  renderTasks(tasks);
});

taskContainer.addEventListener("click", (event) => {
  const button = event.target.closest('button[data-action="complete"]');
  if (!button) return;
  const card = button.closest("[data-task-id]");
  if (!card) return;
  const task = findTaskById(tasks, Number(card.dataset.taskId));
  if (!task) return;

  task.status = "Готово";
  renderTasks(tasks);
});
