import type { MetadataRoute } from "next";

import { SITE, siteUrl } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE.url, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: siteUrl("/cursos"), lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/afiliacion"), lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: siteUrl("/login"), lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/forgot-password"), lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
