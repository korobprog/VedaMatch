import type { MetadataRoute } from "next";
import { getRequestSurface } from "@/lib/request-surface";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { origin } = await getRequestSurface();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/login", "/register"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
