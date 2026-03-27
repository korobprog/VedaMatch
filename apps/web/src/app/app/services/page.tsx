import { createBrowserClient } from "@vedamatch/api-client";
import { DomainPage } from "@/components/domain-page";

export default async function ServicesPage() {
  const client = createBrowserClient("admin.vedamatch.ru");
  const services = await client.getServices().catch(() => []);

  return (
    <DomainPage
      description="Public services catalog surface for the first web rollout."
      items={services.map((service, index) => ({
        id: String(service.id || index),
        title: service.title || "Untitled service",
        body: service.description || "",
        meta: [service.city, service.category].filter(Boolean).join(", ") || "Service entry"
      }))}
      title="Services core"
    />
  );
}

