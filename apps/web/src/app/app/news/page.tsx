import { createBrowserClient } from "@vedamatch/api-client";
import { DomainPage } from "@/components/domain-page";

export default async function NewsPage() {
  const client = createBrowserClient("admin.vedamatch.ru");
  const response = await client.getNews().catch(() => ({ news: [], total: 0, page: 1, totalPages: 1 }));

  return (
    <DomainPage
      description="SSR-friendly public content route for V1 news/feed core."
      items={response.news.map((item) => ({
        id: String(item.id),
        title: item.title,
        body: item.summary || item.content || "",
        meta: item.publishedAt || item.originalUrl || "Published item"
      }))}
      title="News feed core"
    />
  );
}

