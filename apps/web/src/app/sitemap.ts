import type { MetadataRoute } from "next";
import { getRequestSurface } from "@/lib/request-surface";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { origin } = await getRequestSurface();

  return [
    {
      url: origin,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
