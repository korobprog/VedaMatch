import { createBrowserClient } from "@vedamatch/api-client";
import { getRequestDictionary } from "@/lib/request-surface";

export default async function ServicesPage() {
  const dictionary = await getRequestDictionary();
  const client = createBrowserClient("admin.vedamatch.ru");
  const services = await client.getServices().catch(() => []);

  return (
    <div className="stack">
      <div className="panel page-card">
        <span className="eyebrow">{dictionary.services.eyebrow}</span>
        <h1>{dictionary.services.title}</h1>
        <p className="muted">{dictionary.services.subtitle}</p>
      </div>
      {services.length === 0 ? (
        <div className="panel page-card">
          <div className="empty-state">{dictionary.services.empty}</div>
        </div>
      ) : (
        <div className="content-card-grid">
          {services.map((service, index) => (
            <article className="content-card" key={String(service.id || index)}>
              <div className="content-card__meta">
                <span className="content-pill">{dictionary.services.serviceLabel}</span>
                {service.category ? <span className="content-pill">{service.category}</span> : null}
                {service.city ? <span className="content-pill">{service.city}</span> : null}
              </div>
              <div className="stack" style={{ gap: 10 }}>
                <h2>{service.title || dictionary.services.untitled}</h2>
                <p className="content-card__body">{service.description || dictionary.services.detailFallback}</p>
              </div>
              <div className="content-card__footer">
                <span className="muted">
                  {typeof service.priceFrom === "number" ? `${dictionary.services.priceFrom} ${service.priceFrom}` : dictionary.services.pricingFuture}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
