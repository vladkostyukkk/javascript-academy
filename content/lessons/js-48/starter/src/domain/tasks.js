export const formatMinutes = (minutes) => `${minutes} хв`;

export function validateTitle(title) {
  if (typeof title !== "string") {
    return "Назва має бути рядком.";
  }
  if (title.trim() === "") {
    return "Введіть назву задачі.";
  }
  return null;
}
