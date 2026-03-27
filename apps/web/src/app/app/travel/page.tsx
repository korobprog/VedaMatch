import { createBrowserClient } from "@vedamatch/api-client";

export default async function TravelPage() {
  const client = createBrowserClient("admin.vedamatch.ru");
  const yatras = await client.getYatras().catch(() => []);

  return (
    <div className="stack">
      <div className="panel page-card">
        <span className="eyebrow">Utility domain</span>
        <h1>Travel and yatra</h1>
        <p className="muted">
          Public and user entrypoint for yatra discovery in the web shell. The layout is ready for a later split into public route pages and protected booking flows.
        </p>
      </div>
      {yatras.length === 0 ? (
        <div className="panel page-card">
          <div className="empty-state">No yatras returned yet.</div>
        </div>
      ) : (
        <div className="news-stack">
          {yatras.map((yatra, index) => (
            <article className="content-card" key={String(yatra.id || index)}>
              <div className="content-card__meta">
                <span className="content-pill">Yatra</span>
                {yatra.city ? <span className="content-pill">{yatra.city}</span> : null}
              </div>
              <div className="stack" style={{ gap: 10 }}>
                <h2>{yatra.title || "Untitled yatra"}</h2>
                <p className="content-card__body">{yatra.description || "Travel detail pages and booking UX can extend this route."}</p>
              </div>
              <div className="content-card__footer">
                <span className="muted">
                  {[yatra.startDate, yatra.endDate].filter(Boolean).join(" -> ") || "Dates not provided"}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
