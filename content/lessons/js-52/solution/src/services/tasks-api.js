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
