import { runSmokeChecks } from "./smoke.js";
import { fetchTasks } from "../services/tasks-api.js";

export async function verifyRelease() {
  if (!runSmokeChecks()) return "Є невдалі перевірки";
  try {
    const tasks = await fetchTasks();
    return tasks.length > 0 ? "FocusBoard готовий" : "Перевір стартові дані";
  } catch {
    return "Стартові дані недоступні";
  }
}

export function getReleaseFiles() {
  return "index.html, styles.css, src/, mock/tasks.json";
}
