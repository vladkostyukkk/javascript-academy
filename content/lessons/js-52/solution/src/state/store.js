export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  const taskHistory = [];

  function getState() {
    return state;
  }

  function setState(nextState, { recordHistory = true } = {}) {
    if (recordHistory && nextState.tasks !== state.tasks) {
      taskHistory.push(state.tasks);
      if (taskHistory.length > 10) taskHistory.shift();
    }
    state = nextState;
    notify();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify() {
    for (const listener of listeners) listener(state);
  }

  function undoTasks() {
    const previous = taskHistory.pop();
    if (!previous) return;
    state = { ...state, tasks: previous };
    notify();
  }

  return { getState, setState, subscribe, undoTasks };
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
