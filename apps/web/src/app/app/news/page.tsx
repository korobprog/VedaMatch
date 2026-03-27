import Link from "next/link";
import { createBrowserClient } from "@vedamatch/api-client";

export default async function NewsPage() {
  const client = createBrowserClient("admin.vedamatch.ru");
  const response = await client.getNews().catch(() => ({ news: [], total: 0, page: 1, totalPages: 1 }));

  return (
    <div className="stack">
      <div className="panel page-card">
        <span className="eyebrow">Content domain</span>
        <h1>News feed core</h1>
        <p className="muted">
          SSR-friendly public feed for editorial content, important updates, and future article detail routes.
        </p>
        <div className="actions">
          <span className="content-pill">Items: {response.total}</span>
          <span className="content-pill">Page: {response.page}</span>
          <span className="content-pill">Pages total: {response.totalPages}</span>
        </div>
      </div>
      {response.news.length === 0 ? (
        <div className="panel page-card">
          <div className="empty-state">No news returned yet.</div>
        </div>
      ) : (
        <div className="news-stack">
          {response.news.map((item) => {
            const summary = item.summary || item.content || "No summary";
            const tags = item.tags
              ? item.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
              : [];

            return (
              <article className="news-card" key={item.id}>
                <div className="news-card__header">
                  <div className="content-card__meta">
                    {item.category ? <span className="content-pill">{item.category}</span> : null}
                    {item.isImportant ? <span className="content-pill content-pill--accent">Important</span> : null}
                    {item.sourceName ? <span className="content-pill">{item.sourceName}</span> : null}
                  </div>
                  <span className="muted">{item.publishedAt || item.createdAt}</span>
                </div>
                <div className="stack" style={{ gap: 12 }}>
                  <h2>{item.title}</h2>
                  <p className="content-card__body">{summary}</p>
                </div>
                <div className="news-card__footer">
                  <div className="content-card__meta">
                    {tags.slice(0, 4).map((tag) => (
                      <span className="content-pill" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="actions">
                    <span className="muted">Views: {item.viewsCount}</span>
                    <Link className="button-secondary" href={`/app/news/${item.id}`}>
                      Open article
                    </Link>
                    {item.originalUrl ? (
                      <a className="button-secondary" href={item.originalUrl} rel="noreferrer" target="_blank">
                        Source
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
