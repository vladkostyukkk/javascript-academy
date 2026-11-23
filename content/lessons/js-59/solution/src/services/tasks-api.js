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

export function normalizeQuery(value) {
  return value.trim().toLowerCase();
}

export function waitForSearch(query, milliseconds = 150, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Пошук скасовано", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Пошук скасовано", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve(normalizeQuery(query));
    }, milliseconds);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function getCanceledSearchResult() {
  const controller = new AbortController();
  const pending = waitForSearch("старий запит", 10, controller.signal);
  controller.abort();
  try {
    await pending;
    return "завершено";
  } catch (error) {
    return error.name;
  }
}
