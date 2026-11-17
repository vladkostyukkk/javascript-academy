"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-content">
      <div className="empty-state" role="alert">
        <h1>Не вдалося завантажити сторінку</h1>
        <p>Спробуй ще раз або повернися до програми курсу.</p>
        <Button onClick={reset}>Спробувати ще раз</Button>
        <Link className="text-link" href="/course/javascript">
          До програми курсу
        </Link>
      </div>
    </div>
  );
}
