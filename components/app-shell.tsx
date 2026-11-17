"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Braces,
  Compass,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { href: "/", label: "Огляд", icon: LayoutDashboard },
  { href: "/course/javascript", label: "Програма курсу", icon: BookOpen },
  { href: "/project", label: "Мій FocusBoard", icon: Braces },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const menuOpen = openMenuPath === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);
  const current = navigation.find((item) => item.href === pathname);
  const isLesson = pathname.startsWith("/learn/");

  function closeMenu() {
    setOpenMenuPath(null);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Перейти до вмісту
      </a>
      <aside
        className="sidebar"
        aria-label="Навігація платформи"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) {
            closeMenu();
            menuButton.current?.focus();
          }
        }}
      >
        <div className="brand-row">
          <Link
            href="/"
            className="brand"
            aria-label="JavaScript Academy — головна"
            onClick={closeMenu}
          >
            <span className="brand-mark" aria-hidden="true">
              js<span>.</span>
            </span>
            <span>
              JavaScript<span className="brand-subtitle">ACADEMY</span>
            </span>
          </Link>
          <Button
            ref={menuButton}
            variant="ghost"
            size="icon"
            className="mobile-menu"
            aria-label={menuOpen ? "Закрити меню" : "Відкрити меню"}
            aria-expanded={menuOpen}
            aria-controls="sidebar-navigation"
            onClick={() => setOpenMenuPath(menuOpen ? null : pathname)}
          >
            {menuOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>
        </div>
        <div
          id="sidebar-navigation"
          className={`sidebar-content ${menuOpen ? "is-open" : ""}`}
        >
          <div className="nav-label">ВАШ ПРОСТІР</div>
          <nav aria-label="Основна навігація">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href === "/course/javascript" && isLesson);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`nav-item ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={closeMenu}
                >
                  <Icon size={19} aria-hidden="true" />
                  {label}
                  {active && <span className="nav-dot" />}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-course">
            <div className="nav-label">НАВЧАЛЬНИЙ ШЛЯХ</div>
            <div className="course-name">
              <span className="js-tile">JS</span>
              <div>
                JavaScript з нуля<small>Від першого рядка до застосунку</small>
              </div>
            </div>
            <div className="sidebar-path" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <p>6 модулів · 60 уроків · 1 проєкт</p>
          </div>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <Compass size={20} aria-hidden="true" />
              <p>
                Маленькі кроки.
                <br />
                <strong>Справжній результат.</strong>
              </p>
            </div>
            <Link
              href="/course/javascript"
              className="sidebar-bottom-link"
              onClick={closeMenu}
            >
              Дослідити програму <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <div className="sidebar-version">Попередній перегляд платформи</div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Навчальний простір</span>
            <span aria-hidden="true">/</span>
            <strong>
              {isLesson ? "Урок JavaScript" : (current?.label ?? "Сторінка")}
            </strong>
          </div>
          <span className="language-label">
            <span aria-hidden="true" className="language-dot" />
            Українською
          </span>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="page-footer">
          <span>JavaScript Academy</span>
          <span>Вивчай. Створюй. Розумій.</span>
          <span className="mono">&lt;/&gt; Зроблено для допитливих</span>
        </footer>
      </div>
    </div>
  );
}
