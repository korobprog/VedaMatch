import { createBrowserClient } from "@vedamatch/api-client";
import { DomainPage } from "@/components/domain-page";

export default async function TravelPage() {
  const client = createBrowserClient("admin.vedamatch.ru");
  const yatras = await client.getYatras().catch(() => []);

  return (
    <DomainPage
      description="Travel/yatra public and user entry point in the new web shell."
      items={yatras.map((yatra, index) => ({
        id: String(yatra.id || index),
        title: yatra.title || "Untitled yatra",
        body: yatra.description || "",
        meta: [yatra.city, yatra.startDate, yatra.endDate].filter(Boolean).join(" • ") || "Yatra entry"
      }))}
      title="Travel and yatra"
    />
  );
}

