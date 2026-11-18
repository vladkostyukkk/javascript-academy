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
