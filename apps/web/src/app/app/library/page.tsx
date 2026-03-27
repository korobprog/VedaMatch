import Link from "next/link";
import { createBrowserClient } from "@vedamatch/api-client";
import { getRequestDictionary } from "@/lib/request-surface";

export default async function LibraryPage() {
  const dictionary = await getRequestDictionary();
  const client = createBrowserClient("admin.vedamatch.ru");
  const books = await client.getBooks().catch(() => []);

  return (
    <div className="stack">
      <div className="panel page-card">
        <span className="eyebrow">{dictionary.library.eyebrow}</span>
        <h1>{dictionary.library.title}</h1>
        <p className="muted">{dictionary.library.subtitle}</p>
      </div>
      {books.length === 0 ? (
        <div className="panel page-card">
          <div className="empty-state">{dictionary.library.empty}</div>
        </div>
      ) : (
        <div className="content-card-grid">
          {books.map((book, index) => {
            const title = book.title || book.title_en || book.title_ru || book.title_hi || book.code || dictionary.library.untitledBook;
            const translations = [book.title_ru, book.title_en, book.title_hi]
              .filter((value, currentIndex, values) => Boolean(value) && values.indexOf(value) === currentIndex)
              .join(" / ");

            return (
              <article className="content-card" key={String(book.id || book.ID || book.code || index)}>
                <div className="content-card__meta">
                  <span className="content-pill">{dictionary.library.scripture}</span>
                  {book.code ? <span className="content-pill">{book.code}</span> : null}
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  <h2>{title}</h2>
                  {translations ? <p className="muted">{translations}</p> : null}
                  <p className="content-card__body">{book.description || dictionary.library.readerBodyFallback}</p>
                </div>
                <div className="content-card__footer">
                  <span className="muted">{dictionary.library.readerFooter}</span>
                  <Link className="button-secondary" href={`/app/library/${book.code || book.slug || book.id || index}`}>
                    {dictionary.library.openReader}
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
