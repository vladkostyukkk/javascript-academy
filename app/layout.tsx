import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: {
    default: "JavaScript Academy — твій шлях до першого застосунку",
    template: "%s | JavaScript Academy",
  },
  description:
    "60 послідовних уроків українською. Вивчай JavaScript і крок за кроком створюй власний FocusBoard.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" className="dark">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
