import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page-content">
      <div className="empty-state">
        <span className="eyebrow">404 / ПОЗА МАРШРУТОМ</span>
        <h1>Цієї сторінки немає</h1>
        <p>Повернімося до програми — там усі 60 кроків на своєму місці.</p>
        <Button asChild>
          <Link href="/course/javascript">
            <ArrowLeft />
            До програми курсу
          </Link>
        </Button>
      </div>
    </div>
  );
}
