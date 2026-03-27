import Link from "next/link";
import { notFound } from "next/navigation";
import { createBrowserClient } from "@vedamatch/api-client";
import type { NewsItem } from "@vedamatch/domain-types";
import { getRequestDictionary } from "@/lib/request-surface";

export default async function NewsItemPage({ params }: { params: Promise<{ id: string }> }) {
  const dictionary = await getRequestDictionary();
  const { id } = await params;
  const parsedId = Number.parseInt(id, 10);
  if (!Number.isFinite(parsedId)) {
    notFound();
  }

  const client = createBrowserClient("admin.vedamatch.ru");
  const item = await client.getNewsItem(parsedId).catch((): NewsItem | null => null);
  if (!item) {
    notFound();
  }

  const tags = item.tags
    ? item.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean)
    : [];

  return (
    <div className="stack">
      <article className="panel page-card article-page">
        <Link className="button-secondary" href="/app/news">
          {dictionary.news.backToNews}
        </Link>
        <div className="content-card__meta">
          {item.category ? <span className="content-pill">{item.category}</span> : null}
          {item.isImportant ? <span className="content-pill content-pill--accent">{dictionary.news.important}</span> : null}
          {item.sourceName ? <span className="content-pill">{item.sourceName}</span> : null}
        </div>
        <div className="stack" style={{ gap: 12 }}>
          <h1>{item.title}</h1>
          <p className="muted">{item.publishedAt || item.createdAt}</p>
          {item.summary ? <p className="article-lead">{item.summary}</p> : null}
        </div>
        <div className="article-body">
          {(item.content || item.summary || "")
            .split(/\n{2,}/)
            .map((paragraph: string) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph: string, index: number) => (
              <p key={`${item.id}-${index}`}>{paragraph}</p>
            ))}
        </div>
        <div className="news-card__footer">
          <div className="content-card__meta">
            {tags.map((tag: string) => (
              <span className="content-pill" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
          <div className="actions">
            <span className="muted">{dictionary.news.views}: {item.viewsCount}</span>
            {item.originalUrl ? (
              <a className="button-secondary" href={item.originalUrl} rel="noreferrer" target="_blank">
                {dictionary.news.originalSource}
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
