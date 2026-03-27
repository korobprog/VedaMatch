import Link from "next/link";
import { notFound } from "next/navigation";
import { createBrowserClient } from "@vedamatch/api-client";
import type { ChapterInfo, ScriptureVerse } from "@vedamatch/domain-types";

export default async function LibraryBookPage({ params }: { params: Promise<{ bookCode: string }> }) {
  const { bookCode } = await params;
  const client = createBrowserClient("admin.vedamatch.ru");
  const books = await client.getBooks().catch(() => []);
  const book = books.find((item) => item.code === bookCode || item.slug === bookCode);

  if (!book) {
    notFound();
  }

  const resolvedCode = book.code || bookCode;
  const chapters = await client.getBookChapters(resolvedCode).catch((): ChapterInfo[] => []);
  const firstChapterNumber = chapters[0]?.number || chapters[0]?.chapter || 1;
  const verses = await client.getVerses(resolvedCode, firstChapterNumber).catch((): ScriptureVerse[] => []);
  const title = book.title || book.title_en || book.title_ru || book.title_hi || book.code || "Untitled book";

  return (
    <div className="stack">
      <div className="panel page-card">
        <div className="thread-head">
          <div className="stack" style={{ gap: 8 }}>
            <Link className="button-secondary" href="/app/library">
              Back to library
            </Link>
            <span className="eyebrow">Reader detail</span>
            <h1>{title}</h1>
            <p className="muted">{book.description || "Book detail page generated from the shared library API."}</p>
          </div>
          <div className="content-card__meta">
            {book.code ? <span className="content-pill">{book.code}</span> : null}
            <span className="content-pill">Chapters: {chapters.length}</span>
          </div>
        </div>
      </div>

      <div className="content-detail-grid">
        <section className="panel page-card">
          <h2>Chapters</h2>
          {chapters.length === 0 ? (
            <div className="empty-state">No chapters returned for this book.</div>
          ) : (
            <div className="content-card__meta">
              {chapters.map((chapter: ChapterInfo, index: number) => {
                const chapterNumber = chapter.number || chapter.chapter || index + 1;
                return (
                  <span className="content-pill" key={String(chapter.id || chapterNumber)}>
                    Chapter {chapterNumber}
                  </span>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel page-card">
          <h2>First chapter preview</h2>
          <p className="muted">
            Showing chapter {firstChapterNumber} as the initial browser reader preview. Next step can split this into chapter routes.
          </p>
          {verses.length === 0 ? (
            <div className="empty-state">No verses returned yet.</div>
          ) : (
            <div className="reader-stack">
              {verses.slice(0, 12).map((verse: ScriptureVerse, index: number) => (
                <article className="reader-verse" key={String(verse.id || `${firstChapterNumber}-${index}`)}>
                  <strong>Verse {verse.verse || index + 1}</strong>
                  {verse.text ? <p>{verse.text}</p> : null}
                  {verse.translation ? <p className="muted">{verse.translation}</p> : null}
                  {verse.commentary ? <small className="muted">{verse.commentary}</small> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
