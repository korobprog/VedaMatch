import { createBrowserClient } from "@vedamatch/api-client";
import { getRequestDictionary } from "@/lib/request-surface";

export default async function TravelPage() {
  const dictionary = await getRequestDictionary();
  const client = createBrowserClient("admin.vedamatch.ru");
  const yatras = await client.getYatras().catch(() => []);

  return (
    <div className="stack">
      <div className="panel page-card">
        <span className="eyebrow">{dictionary.travel.eyebrow}</span>
        <h1>{dictionary.travel.title}</h1>
        <p className="muted">{dictionary.travel.subtitle}</p>
      </div>
      {yatras.length === 0 ? (
        <div className="panel page-card">
          <div className="empty-state">{dictionary.travel.empty}</div>
        </div>
      ) : (
        <div className="news-stack">
          {yatras.map((yatra, index) => (
            <article className="content-card" key={String(yatra.id || index)}>
              <div className="content-card__meta">
                <span className="content-pill">{dictionary.travel.yatraLabel}</span>
                {yatra.city ? <span className="content-pill">{yatra.city}</span> : null}
              </div>
              <div className="stack" style={{ gap: 10 }}>
                <h2>{yatra.title || dictionary.travel.untitled}</h2>
                <p className="content-card__body">{yatra.description || dictionary.travel.detailFallback}</p>
              </div>
              <div className="content-card__footer">
                <span className="muted">
                  {[yatra.startDate, yatra.endDate].filter(Boolean).join(" -> ") || dictionary.travel.datesMissing}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
