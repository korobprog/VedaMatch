"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, CloudDownload, CloudOff, Loader2, Trash2 } from "lucide-react";
import { useSession } from "@/components/session-context";
import { TopBar } from "@/components/top-bar";
import { libraryService, type ScriptureBook } from "@/lib/library-service";
import { formatBytes, offlineBookService, type SavedBookInfo } from "@/lib/offline-book-service";
import { t } from "@/lib/copy";

export function LibraryHome() {
  const { language, session } = useSession();
  const router = useRouter();

  const [books, setBooks] = useState<ScriptureBook[]>([]);
  const [saved, setSaved] = useState<SavedBookInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [query, setQuery] = useState("");
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const savedInfo = await offlineBookService.getSavedBooks().catch(() => [] as SavedBookInfo[]);
    setSaved(savedInfo);
    try {
      const online = await libraryService.getBooks();
      setBooks(online);
      setOffline(false);
    } catch {
      // Offline: show whatever is saved locally as readable books.
      setOffline(true);
      setBooks(
        savedInfo.map((b) => ({
          id: 0,
          code: b.code,
          name_ru: b.name_ru,
          name_en: b.name_en,
          description_ru: b.description_ru || "",
          description_en: b.description_en || "",
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isSaved = (code: string) => saved.some((b) => b.code === code);
  const savedInfo = (code: string) => saved.find((b) => b.code === code);

  const handleSave = async (book: ScriptureBook) => {
    setSavingCode(book.code);
    setSaveStatus("");
    await offlineBookService.saveBookOffline(book, ["ru", "en"], (_p, status) => setSaveStatus(status));
    setSaved(await offlineBookService.getSavedBooks());
    setSavingCode(null);
  };

  const handleRemove = async (code: string) => {
    await offlineBookService.removeBook(code);
    setSaved(await offlineBookService.getSavedBooks());
  };

  const filtered = books.filter((b) => {
    const name = `${b.name_ru} ${b.name_en}`.toLowerCase();
    return name.includes(query.trim().toLowerCase());
  });

  return (
    <>
      <TopBar />
      <div className="vb-shell">
        <section className="vb-hero">
          <h1>{t(language, "Ведическая библиотека", "Vedic Library")}</h1>
          <p>
            {t(
              language,
              "Читайте священные писания онлайн и офлайн. Сохраняйте книги на устройство и продолжайте чтение без интернета. Единый аккаунт со всеми сервисами VedaMatch.",
              "Read the scriptures online and offline. Save books to your device and keep reading without a connection. One account across all VedaMatch services.",
            )}
          </p>
          {!session && (
            <div className="vb-hero-cta">
              <button className="vb-btn vb-btn-primary" onClick={() => router.push("/register")}>
                {t(language, "Создать аккаунт", "Create account")}
              </button>
              <button className="vb-btn" onClick={() => router.push("/login")}>
                {t(language, "Войти", "Sign in")}
              </button>
            </div>
          )}
        </section>

        {offline && (
          <p className="vb-badge" role="status">
            <CloudOff size={14} /> {t(language, "Офлайн-режим: показаны сохранённые книги", "Offline: showing saved books")}
          </p>
        )}

        <div className="vb-search">
          <input
            className="vb-input"
            placeholder={t(language, "Поиск книги…", "Search books…")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="vb-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="vb-skeleton" aria-hidden="true" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="vb-empty">{t(language, "Книги не найдены.", "No books found.")}</p>
        ) : (
          <div className="vb-grid">
            {filtered.map((book) => {
              const name = language === "ru" ? book.name_ru : book.name_en;
              const description = language === "ru" ? book.description_ru : book.description_en;
              const info = savedInfo(book.code);
              return (
                <article key={book.code} className="vb-card">
                  <h3>{name || book.code}</h3>
                  <p>{description}</p>
                  {info && (
                    <span className="vb-badge">
                      <CheckCircle2 size={13} /> {info.versesCount} {t(language, "стихов", "verses")} · {formatBytes(info.sizeBytes)}
                    </span>
                  )}
                  <div className="vb-card-actions">
                    <button className="vb-btn vb-btn-primary" onClick={() => router.push(`/read/${book.code}`)}>
                      <BookOpen size={15} /> {t(language, "Читать", "Read")}
                    </button>
                    {isSaved(book.code) ? (
                      <button className="vb-btn" onClick={() => handleRemove(book.code)}>
                        <Trash2 size={15} /> {t(language, "Удалить", "Remove")}
                      </button>
                    ) : (
                      <button
                        className="vb-btn"
                        disabled={savingCode === book.code || offline}
                        onClick={() => handleSave(book)}
                      >
                        {savingCode === book.code ? (
                          <>
                            <Loader2 size={15} className="vb-spin" /> {saveStatus || t(language, "Сохранение…", "Saving…")}
                          </>
                        ) : (
                          <>
                            <CloudDownload size={15} /> {t(language, "Сохранить офлайн", "Save offline")}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
