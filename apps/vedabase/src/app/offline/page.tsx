import Link from "next/link";

// PWA offline fallback document (configured in next.config.ts).
export default function OfflinePage() {
  return (
    <div className="vb-shell">
      <div className="vb-auth" style={{ textAlign: "center" }}>
        <h1>Офлайн / Offline</h1>
        <p className="vb-muted">
          Нет подключения к интернету. Сохранённые книги доступны для чтения.
          <br />
          You are offline. Saved books are still available to read.
        </p>
        <Link href="/" className="vb-btn vb-btn-primary" style={{ marginTop: 16 }}>
          К библиотеке / Go to library
        </Link>
      </div>
    </div>
  );
}
