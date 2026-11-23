const storageKey = "focusboard";
let memory = null;

function getStorage() {
  if (globalThis.focusBoardStorage) return globalThis.focusBoardStorage;
  try {
    return globalThis.localStorage;
  } catch {
    return {
      getItem: () => memory,
      setItem: (key, value) => { memory = value; },
    };
  }
}

export function saveTasks(tasks, order = "original") {
  try {
    getStorage().setItem(storageKey, JSON.stringify({ version: 2, tasks, order }));
    return "Збережено";
  } catch {
    return "Сховище недоступне";
  }
}

export function readTasksJSON() {
  try {
    return getStorage().getItem(storageKey);
  } catch {
    return null;
  }
}

export function restoreTasks(raw) {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw);
    const version = readSnapshotVersion(value);
    if (version === null) return null;
    const list = version === 1 ? value : value.tasks;
    if (!Array.isArray(list) || list.length > 100) return null;
    const ids = new Set();
    for (const task of list) {
      if (!task || !Number.isSafeInteger(task.id) || task.id < 1 || ids.has(task.id) ||
          typeof task.title !== "string" || task.title.trim() === "" ||
          !["Заплановано", "У роботі", "Готово"].includes(task.status) ||
          !Number.isFinite(task.minutes) || task.minutes < 0 ||
          !Number.isFinite(task.priority)) return null;
      ids.add(task.id);
    }
    return list;
  } catch {
    return null;
  }
}

export function isTaskSnapshot(raw) {
  return restoreTasks(raw) !== null;
}

export function readSnapshotVersion(value) {
  if (Array.isArray(value)) return 1;
  return value?.version === 2 ? 2 : null;
}

export function readTaskOrder(raw) {
  try {
    const value = JSON.parse(raw);
    if (value?.version === 2 && ["original", "newest", "priority"].includes(value.order)) {
      return value.order;
    }
  } catch {
    return "original";
  }
  return "original";
}
