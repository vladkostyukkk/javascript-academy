export function waitForTasks(milliseconds = 80) {
  const duration = Math.max(0, milliseconds);
  return new Promise((resolve) => {
    setTimeout(() => resolve(duration), duration);
  });
}

export async function loadInitialTasks(tasks, milliseconds = 80) {
  await waitForTasks(milliseconds);
  return Array.isArray(tasks) ? [...tasks] : [];
}

export async function countLoadedTasks(tasks) {
  return (await loadInitialTasks(tasks, 0)).length;
}

export async function fetchTasks(signal) {
  const response = await fetch("/mock/tasks.json", { signal });
  if (!response.ok) throw new Error("Не вдалося завантажити задачі.");
  const tasks = await response.json();
  if (!Array.isArray(tasks)) throw new Error("API має повертати масив задач.");
  return tasks;
}

export async function countRemoteTasks() {
  return (await fetchTasks()).length;
}
