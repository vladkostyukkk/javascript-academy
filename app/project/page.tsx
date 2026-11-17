import type { Metadata } from "next";
import { Braces, Layers3, MousePointer2, Save } from "lucide-react";
import { FocusBoardPreview } from "@/components/course/focusboard-preview";
import { CheckpointHistory } from "@/components/course/checkpoint-history";

export const metadata: Metadata = { title: "Мій FocusBoard" };

export default function ProjectPage() {
  return (
    <div className="page-content">
      <div className="page-heading">
        <span className="eyebrow">ТВІЙ ПЕРШИЙ ЗАСТОСУНОК</span>
        <h1>
          Маленькі кроки.
          <br />
          <span className="text-accent">Власний FocusBoard.</span>
        </h1>
        <p>
          Один проєкт на весь курс. Від назви в консолі до менеджера задач,
          <br className="desktop-break" /> який можна забрати із собою.
        </p>
      </div>
      <section className="project-showcase">
        <div>
          <span className="small-tag">Ілюстрація майбутнього результату</span>
          <h2>
            Твої задачі.
            <br />
            Твій порядок.
            <br />
            Твій код.
          </h2>
          <p>
            HTML, CSS та JavaScript.
            <br />
            Без залежності від платформи.
          </p>
        </div>
        <FocusBoardPreview />
      </section>
      <div className="project-features">
        {[
          {
            Icon: Braces,
            title: "Побудуй основу",
            description: "Змінні, функції та логіка задач.",
            range: "01—30",
          },
          {
            Icon: MousePointer2,
            title: "Оживи інтерфейс",
            description: "Форми, фільтри та Kanban-дошка.",
            range: "31—40",
          },
          {
            Icon: Save,
            title: "Збережи важливе",
            description: "Модулі, стан та історія змін.",
            range: "41—50",
          },
          {
            Icon: Layers3,
            title: "Підготуй до релізу",
            description: "Запити, доступність та експорт.",
            range: "51—60",
          },
        ].map(({ Icon, title, description, range }) => (
          <div key={range}>
            <Icon size={22} />
            <span className="mono muted">{range}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        ))}
      </div>
      <CheckpointHistory />
    </div>
  );
}
