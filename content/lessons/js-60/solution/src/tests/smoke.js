import { completionPercent } from "../ui/stats.js";
import { restoreTasks } from "../storage.js";
import { updateTask } from "../state/store.js";

export function checksEmpty() {
  return completionPercent(0, 0) === 0;
}

export function checksBrokenSnapshot() {
  return restoreTasks("{") === null;
}

export function checksImmutableEdit() {
  const initial = [{ id: 1, title: "Старий план" }];
  const edited = updateTask(initial, 1, { title: "Новий план" });
  return initial[0].title === "Старий план" && edited[0].title === "Новий план" &&
    edited !== initial && edited[0] !== initial[0];
}

export function runSmokeChecks() {
  return [checksEmpty, checksBrokenSnapshot, checksImmutableEdit].every((test) => test());
}
