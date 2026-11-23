export function getLoadMessage(status) {
  if (status === "loading") return "Завантаження…";
  if (status === "empty") return "Задач поки немає";
  if (status === "error") return "Не вдалося завантажити задачі";
  return "Задачі завантажено";
}
