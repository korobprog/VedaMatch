import Link from "next/link";
import { notFound } from "next/navigation";
import { createBrowserClient } from "@vedamatch/api-client";
import type { ChapterInfo, ScriptureVerse } from "@vedamatch/domain-types";
import { getRequestDictionary } from "@/lib/request-surface";

export default async function LibraryBookPage({ params }: { params: Promise<{ bookCode: string }> }) {
  const dictionary = await getRequestDictionary();
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
  const title = book.title || book.title_en || book.title_ru || book.title_hi || book.code || dictionary.library.untitledBook;

  return (
    <div className="stack">
      <div className="panel page-card">
        <div className="thread-head">
          <div className="stack" style={{ gap: 8 }}>
            <Link className="button-secondary" href="/app/library">
              {dictionary.library.backToLibrary}
            </Link>
            <span className="eyebrow">{dictionary.library.readerDetail}</span>
            <h1>{title}</h1>
            <p className="muted">{book.description || dictionary.library.detailFallback}</p>
          </div>
          <div className="content-card__meta">
            {book.code ? <span className="content-pill">{book.code}</span> : null}
            <span className="content-pill">{dictionary.library.chaptersCount}: {chapters.length}</span>
          </div>
        </div>
      </div>

      <div className="content-detail-grid">
        <section className="panel page-card">
          <h2>{dictionary.library.chaptersTitle}</h2>
          {chapters.length === 0 ? (
            <div className="empty-state">{dictionary.library.chaptersEmpty}</div>
          ) : (
            <div className="content-card__meta">
              {chapters.map((chapter: ChapterInfo, index: number) => {
                const chapterNumber = chapter.number || chapter.chapter || index + 1;
                return (
                  <span className="content-pill" key={String(chapter.id || chapterNumber)}>
                    {dictionary.library.chapterLabel} {chapterNumber}
                  </span>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel page-card">
          <h2>{dictionary.library.firstChapterPreview}</h2>
          <p className="muted">{dictionary.library.firstChapterBody.replace("{chapter}", String(firstChapterNumber))}</p>
          {verses.length === 0 ? (
            <div className="empty-state">{dictionary.library.versesEmpty}</div>
          ) : (
            <div className="reader-stack">
              {verses.slice(0, 12).map((verse: ScriptureVerse, index: number) => (
                <article className="reader-verse" key={String(verse.id || `${firstChapterNumber}-${index}`)}>
                  <strong>{dictionary.library.verseLabel} {verse.verse || index + 1}</strong>
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
