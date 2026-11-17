export default function Loading() {
  return (
    <div
      className="page-content"
      role="status"
      aria-label="Завантаження сторінки"
    >
      <p className="muted">Завантажуємо навчальний простір…</p>
      <div className="loading-line" />
      <div className="loading-block" />
      <div className="loading-block" />
    </div>
  );
}
