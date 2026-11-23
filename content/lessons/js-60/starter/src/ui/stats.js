export function completionPercent(completed, total) {
  if (total === 0) return 0;
  return Math.round(completed * 100 / total);
}

export function renderStats(container, tasks) {
  const completed = tasks.filter((task) => task.status === "Готово").length;
  const percent = completionPercent(completed, tasks.length);
  const label = document.createElement("p");
  label.textContent = `Виконано: ${completed} із ${tasks.length} (${percent}%)`;
  const bar = document.createElement("progress");
  bar.max = 100;
  bar.value = percent;
  bar.setAttribute("aria-label", "Частка виконаних задач");
  container.replaceChildren(label, bar);
}
