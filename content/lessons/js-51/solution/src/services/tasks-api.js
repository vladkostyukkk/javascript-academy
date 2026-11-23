export function waitForTasks(milliseconds = 80) {
  const duration = Math.max(0, milliseconds);
  return new Promise((resolve) => {
    setTimeout(() => resolve(duration), duration);
  });
}
