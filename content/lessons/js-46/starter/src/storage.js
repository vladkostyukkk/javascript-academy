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

export function saveTasks(tasks) {
  try {
    getStorage().setItem(storageKey, JSON.stringify(tasks));
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
