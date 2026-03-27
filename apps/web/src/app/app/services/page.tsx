import { createBrowserClient } from "@vedamatch/api-client";
import { LauncherGroups } from "@/components/social-launcher";
import { getRequestSurface } from "@/lib/request-surface";
import { getSocialLauncherModel } from "@/lib/social-launcher";
import { getRequestDictionary } from "@/lib/request-surface";

export default async function ServicesPage() {
  const dictionary = await getRequestDictionary();
  const { language } = await getRequestSurface();
  const launcher = getSocialLauncherModel(language);
  const client = createBrowserClient("admin.vedamatch.ru");
  const services = await client.getServices().catch(() => []);

  return (
    <div className="stack">
      <div className="panel page-card">
        <span className="eyebrow">{dictionary.services.eyebrow}</span>
        <h1>{dictionary.services.title}</h1>
        <p className="muted">{dictionary.services.subtitle}</p>
      </div>
      <div className="panel page-card">
        <div className="section-head">
          <h2>{launcher.copy.shortcutsTitle}</h2>
          <p className="muted">{launcher.copy.shortcutsActionLabel}</p>
        </div>
        <LauncherGroups
          activeId="services_catalog"
          currentLabel={launcher.copy.current}
          groups={launcher.groups}
          soonLabel={launcher.copy.comingSoon}
        />
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
