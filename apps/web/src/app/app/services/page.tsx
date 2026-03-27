import { createBrowserClient } from "@vedamatch/api-client";

export default async function ServicesPage() {
  const client = createBrowserClient("admin.vedamatch.ru");
  const services = await client.getServices().catch(() => []);

  return (
    <div className="stack">
      <div className="panel page-card">
        <span className="eyebrow">Utility domain</span>
        <h1>Services core</h1>
        <p className="muted">
          Browser-first services catalog for the new web runtime. This is the entry layer for service discovery, commerce routing, and future detail pages.
        </p>
      </div>
      {services.length === 0 ? (
        <div className="panel page-card">
          <div className="empty-state">No services returned yet.</div>
        </div>
      ) : (
        <div className="content-card-grid">
          {services.map((service, index) => (
            <article className="content-card" key={String(service.id || index)}>
              <div className="content-card__meta">
                <span className="content-pill">Service</span>
                {service.category ? <span className="content-pill">{service.category}</span> : null}
                {service.city ? <span className="content-pill">{service.city}</span> : null}
              </div>
              <div className="stack" style={{ gap: 10 }}>
                <h2>{service.title || "Untitled service"}</h2>
                <p className="content-card__body">{service.description || "Service detail surface can be built on top of this entry."}</p>
              </div>
              <div className="content-card__footer">
                <span className="muted">
                  {typeof service.priceFrom === "number" ? `From ${service.priceFrom}` : "Pricing available in future detail flow."}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
