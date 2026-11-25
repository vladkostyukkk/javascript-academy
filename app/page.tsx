import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Braces,
  Code2,
  Layers3,
  MoveUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FocusBoardPreview } from "@/components/course/focusboard-preview";
import { courseModules, formatNumber, lessons } from "@/lib/lessons/catalog";

export default function HomePage() {
  return (
    <div className="page-content">
      <section className="welcome-heading">
        <span className="eyebrow">Курс JavaScript українською</span>
        <h1>
          Від першого рядка.
          <br />
          <span className="text-accent">До власного застосунку.</span>
        </h1>
        <p>
          Відкрий перший урок, напиши свою команду й крок за кроком створи
          FocusBoard, власну дошку задач.
        </p>
        <div className="hero-actions">
          <Button asChild>
            <Link href="/learn/javascript/js-01">
              Переглянути перший урок <ArrowRight />
            </Link>
          </Button>
          <Link href="/course/javascript" className="text-link">
            Програма курсу <ArrowDown size={16} />
          </Link>
        </div>
        <span className="preview-caption">
          Перший урок · теорія та перевірка розуміння
        </span>
        <figure className="hero-code">
          <figcaption>Перша команда · src/app.js</figcaption>
          <pre>
            <code>
              <span>console</span>.log(<span>&quot;FocusBoard&quot;</span>);
            </code>
          </pre>
          <p>
            <span>Консоль</span> FocusBoard
          </p>
        </figure>
      </section>
      <div className="course-facts" aria-label="Про курс">
        <div>
          <span className="fact-icon">
            <BookOpen />
          </span>
          <strong>{lessons.length}</strong>
          <span>послідовних уроків</span>
        </div>
        <div>
          <span className="fact-icon">
            <Layers3 />
          </span>
          <strong>{courseModules.length}</strong>
          <span>змістовних модулів</span>
        </div>
        <div>
          <span className="fact-icon">
            <Code2 />
          </span>
          <strong>1</strong>
          <span>твій власний проєкт</span>
        </div>
      </div>
      <section className="overview-grid" aria-label="Курс і проєкт">
        <div className="start-card">
          <div className="section-kicker">
            <span>ПОЧНЕМО З ОСНОВ</span>
            <span className="small-tag">Модуль 01</span>
          </div>
          <div className="lesson-visual" aria-hidden="true">
            <span className="large-js">
              JS<span>_</span>
            </span>
            <span className="code-line">
              <span>console</span>.log(<em>&quot;Привіт, світе!&quot;</em>);
            </span>
          </div>
          <h2>
            Усе починається
            <br />з першої команди
          </h2>
          <p>
            Познайомся з мовою, яка оживляє веб.
            <br />І зроби перший крок до FocusBoard.
          </p>
          <div className="card-bottom">
            <span className="muted">Урок 01 / 60</span>
            <Link
              href="/learn/javascript/js-01"
              className="round-link"
              aria-label="Переглянути перший урок"
            >
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
        <div className="project-card">
          <div className="section-kicker">
            <span>ТВІЙ НАСКРІЗНИЙ ПРОЄКТ</span>
            <span className="project-status">
              <span />
              Vanilla JavaScript
            </span>
          </div>
          <div className="project-card-heading">
            <h2>
              Знайомся, FocusBoard<span className="text-accent">.</span>
            </h2>
            <p>Менеджер задач, який ростиме разом із тобою.</p>
          </div>
          <FocusBoardPreview />
          <div className="project-card-bottom">
            <span>
              <Braces size={16} />
              Від змінних до власної Kanban-дошки
            </span>
            <Link href="/project" className="text-link">
              Про проєкт <MoveUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="learning-path">
        <div className="section-heading">
          <div>
            <h2>Модулі курсу</h2>
          </div>
          <Link className="text-link" href="/course/javascript">
            Усі уроки <ArrowRight size={16} />
          </Link>
        </div>
        <div className="module-overview">
          {courseModules.map((module) => (
            <Link
              key={module.number}
              href={`/course/javascript#module-${module.number}`}
              className="module-tile"
            >
              <span className="module-number">
                {formatNumber(module.number)}
              </span>
              <h3>{module.title}</h3>
              <span>
                10 уроків <ArrowUpRightIcon />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <div className="learning-note">
        <span className="note-symbol" aria-hidden="true">
          ↳
        </span>
        <p>
          <strong>
            Не просто читати про код. Розуміти його через практику.
          </strong>
          <br />
          Теорія, власне рішення, перевірка — і ще одна можливість у твоєму
          проєкті.
        </p>
      </div>
    </div>
  );
}

function ArrowUpRightIcon() {
  return <MoveUpRight size={15} aria-hidden="true" />;
}
