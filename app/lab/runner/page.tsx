import type { Metadata } from "next";
import { RunnerLab } from "@/components/workspace/runner-lab";

export const metadata: Metadata = {
  title: "Лабораторія runner",
  robots: { index: false, follow: false },
};
export default function RunnerLabPage() {
  return (
    <div className="runner-page">
      <p className="eyebrow">P03 · Технічний прототип</p>
      <h1>Лабораторія JavaScript</h1>
      <p>
        Чотири способи виконання FocusBoard та перевірки ізоляції. Це окрема
        лабораторія; результати не змінюють навчальний прогрес.
      </p>
      <p className="runner-notice">
        Обчислення працюють у Worker усередині sandbox. DOM виконується в
        ізольованому iframe; навмисний синхронний цикл може заблокувати вкладку.
        Перед публічним запуском потрібен окремий аудит безпеки.
      </p>
      <RunnerLab />
    </div>
  );
}
