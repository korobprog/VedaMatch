import Link from "next/link";
import { createBrowserClient } from "@vedamatch/api-client";

export default async function LibraryPage() {
  const client = createBrowserClient("admin.vedamatch.ru");
  const books = await client.getBooks().catch(() => []);

  return (
    <div className="stack">
      <div className="panel page-card">
        <span className="eyebrow">Content domain</span>
        <h1>Library and reader entry</h1>
        <p className="muted">
          SSR content surface for scriptures and reading journeys. This is the browser-first library catalog built on the shared API client.
        </p>
      </div>
      {books.length === 0 ? (
        <div className="panel page-card">
          <div className="empty-state">No books returned yet.</div>
        </div>
      ) : (
        <div className="content-card-grid">
          {books.map((book, index) => {
            const title = book.title || book.title_en || book.title_ru || book.title_hi || book.code || "Untitled book";
            const translations = [book.title_ru, book.title_en, book.title_hi]
              .filter((value, currentIndex, values) => Boolean(value) && values.indexOf(value) === currentIndex)
              .join(" / ");

            return (
              <article className="content-card" key={String(book.id || book.ID || book.code || index)}>
                <div className="content-card__meta">
                  <span className="content-pill">Scripture</span>
                  {book.code ? <span className="content-pill">{book.code}</span> : null}
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  <h2>{title}</h2>
                  {translations ? <p className="muted">{translations}</p> : null}
                  <p className="content-card__body">{book.description || "Reader detail pages can build on top of this catalog entry."}</p>
                </div>
                <div className="content-card__footer">
                  <span className="muted">Prepared for future book, chapter, and verse deep links.</span>
                  <Link className="button-secondary" href={`/app/library/${book.code || book.slug || book.id || index}`}>
                    Open reader
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
