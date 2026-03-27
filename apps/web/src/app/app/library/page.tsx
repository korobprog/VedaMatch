import { createBrowserClient } from "@vedamatch/api-client";
import { DomainPage } from "@/components/domain-page";

export default async function LibraryPage() {
  const client = createBrowserClient("admin.vedamatch.ru");
  const books = await client.getBooks().catch(() => []);

  return (
    <DomainPage
      description="SSR library entry point using the shared web API client."
      items={books.map((book, index) => ({
        id: String(book.id || book.code || index),
        title: book.title || book.title_en || book.title_ru || book.code || "Untitled book",
        body: book.description || "",
        meta: book.code ? `Code: ${book.code}` : "Public library item"
      }))}
      title="Library and reader entry"
    />
  );
}

