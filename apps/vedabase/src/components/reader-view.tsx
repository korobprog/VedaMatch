"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, CloudOff } from "lucide-react";
import { useSession } from "@/components/session-context";
import { TopBar } from "@/components/top-bar";
import { libraryService, type ChapterInfo, type ScriptureVerse } from "@/lib/library-service";
import { offlineBookService } from "@/lib/offline-book-service";
import { bookmarkService, type Bookmark as VBBookmark } from "@/lib/bookmark-service";
import { progressService } from "@/lib/progress-service";
import { contentLanguage, t } from "@/lib/copy";

export function ReaderView({ bookCode }: { bookCode: string }) {
  const { language } = useSession();
  const lang = contentLanguage(language);

  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [index, setIndex] = useState(0);
  const [verses, setVerses] = useState<ScriptureVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [bookmarks, setBookmarks] = useState<VBBookmark[]>([]);
  const [bookName, setBookName] = useState(bookCode);

  const current = chapters[index];

  // Load chapter structure (online, or from the offline cache) + bookmarks once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const offlineChapters = await offlineBookService.getOfflineChapters(bookCode).catch(() => []);
      let list: ChapterInfo[] = [];
      try {
        list = await libraryService.getChapters(bookCode);
        if (!cancelled) setOffline(false);
      } catch {
        list = offlineChapters;
        if (!cancelled) setOffline(true);
      }
      const saved = await offlineBookService.getSavedBooks().catch(() => []);
      const meta = saved.find((b) => b.code === bookCode);
      if (!cancelled) {
        if (meta) setBookName(language === "ru" ? meta.name_ru : meta.name_en);
        setChapters(list);
        const progress = await progressService.get(bookCode);
        if (progress && list.length) {
          const i = list.findIndex((c) => c.canto === progress.canto && c.chapter === progress.chapter);
          if (i >= 0) setIndex(i);
        }
      }
      setBookmarks(await bookmarkService.list());
    })();
    return () => {
      cancelled = true;
    };
  }, [bookCode, language]);

  const loadVerses = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    try {
      const online = await libraryService.getVerses(bookCode, current.chapter, current.canto, lang);
      setVerses(online);
      setOffline(false);
    } catch {
      const cached = await offlineBookService.getOfflineVerses(bookCode, current.chapter, current.canto, lang);
      setVerses(cached);
      setOffline(true);
    } finally {
      setLoading(false);
    }
    progressService.save({ book_code: bookCode, canto: current.canto, chapter: current.chapter, verse: "1", language: lang });
  }, [bookCode, current, lang]);

  useEffect(() => {
    loadVerses();
  }, [loadVerses]);

  const isBookmarked = useMemo(
    () => (v: ScriptureVerse) =>
      bookmarks.some(
        (b) => b.book_code === bookCode && b.canto === v.canto && b.chapter === v.chapter && b.verse === v.verse,
      ),
    [bookmarks, bookCode],
  );

  const toggleBookmark = async (v: ScriptureVerse) => {
    const entry: VBBookmark = {
      book_code: bookCode,
      canto: v.canto,
      chapter: v.chapter,
      verse: v.verse,
      language: lang,
      book_name: bookName,
    };
    const existing = bookmarks.find(
      (b) => b.book_code === bookCode && b.canto === v.canto && b.chapter === v.chapter && b.verse === v.verse,
    );
    setBookmarks(existing ? await bookmarkService.remove(existing) : await bookmarkService.add(entry));
  };

  const chapterLabel = (c: ChapterInfo) => {
    const title = c.chapter_title ? ` — ${c.chapter_title}` : "";
    const canto = c.canto ? `${c.canto}.` : "";
    return `${t(language, "Глава", "Chapter")} ${canto}${c.chapter}${title}`;
  };

  return (
    <>
      <TopBar />
      <div className="vb-shell vb-reader">
        <div className="vb-reader-head">
          <Link href="/" className="vb-btn vb-btn-ghost">
            <ChevronLeft size={16} /> {t(language, "Все книги", "All books")}
          </Link>
          {offline && (
            <span className="vb-badge">
              <CloudOff size={13} /> {t(language, "Офлайн", "Offline")}
            </span>
          )}
        </div>

        <h1>{bookName}</h1>

        {chapters.length > 0 && (
          <div className="vb-chapter-nav">
            <button className="vb-btn vb-btn-icon" disabled={index <= 0} onClick={() => setIndex((i) => i - 1)} aria-label={t(language, "Предыдущая глава", "Previous chapter")}>
              <ChevronLeft size={18} />
            </button>
            <select className="vb-select" value={index} onChange={(e) => setIndex(Number(e.target.value))}>
              {chapters.map((c, i) => (
                <option key={`${c.canto}-${c.chapter}`} value={i}>
                  {chapterLabel(c)}
                </option>
              ))}
            </select>
            <button
              className="vb-btn vb-btn-icon"
              disabled={index >= chapters.length - 1}
              onClick={() => setIndex((i) => i + 1)}
              aria-label={t(language, "Следующая глава", "Next chapter")}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="vb-skeleton" style={{ marginTop: 24 }} aria-hidden="true" />
        ) : verses.length === 0 ? (
          <p className="vb-empty">
            {t(
              language,
              "В этой главе пока нет текста. Возможно, книга ещё не загружена.",
              "No verses in this chapter yet. The book may not be parsed yet.",
            )}
          </p>
        ) : (
          verses.map((v) => (
            <article key={v.id || `${v.chapter}-${v.verse}`} className="vb-verse">
              <div className="vb-verse-ref">
                <span>{v.verse_reference || `${v.chapter}.${v.verse}`}</span>
                <button
                  className="vb-btn vb-btn-icon"
                  aria-label={t(language, "Закладка", "Bookmark")}
                  onClick={() => toggleBookmark(v)}
                >
                  {isBookmarked(v) ? <BookmarkCheck size={18} color="var(--vb-gold)" /> : <Bookmark size={18} />}
                </button>
              </div>
              {v.devanagari && <p className="vb-verse-sanskrit">{v.devanagari}</p>}
              {v.transliteration && <p className="vb-verse-translit">{v.transliteration}</p>}
              {v.synonyms && (
                <>
                  <p className="vb-verse-section-title">{t(language, "Пословный перевод", "Synonyms")}</p>
                  <p className="vb-muted">{v.synonyms}</p>
                </>
              )}
              {v.translation && (
                <>
                  <p className="vb-verse-section-title">{t(language, "Перевод", "Translation")}</p>
                  <p className="vb-verse-translation">{v.translation}</p>
                </>
              )}
              {v.purport && (
                <>
                  <p className="vb-verse-section-title">{t(language, "Комментарий", "Purport")}</p>
                  <p className="vb-verse-purport">{v.purport}</p>
                </>
              )}
            </article>
          ))
        )}
      </div>
    </>
  );
}
