export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(nextState) {
    state = nextState;
    for (const listener of listeners) listener(state);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, setState, subscribe };
}

export function addTask(list, task) {
  return [...list, task];
}

export function updateTask(list, id, changes) {
  return list.map((task) => task.id === id ? { ...task, ...changes } : task);
}

export function removeTask(list, id) {
  return list.filter((task) => task.id !== id);
}

export function sortVisibleTasks(list, order) {
  const sorted = [...list];
  if (order === "newest") sorted.sort((first, second) => second.id - first.id);
  if (order === "priority") sorted.sort((first, second) => second.priority - first.priority);
  return sorted;
}
