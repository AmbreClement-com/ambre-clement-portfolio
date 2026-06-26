import type { MetadataRoute } from "next";
import { getPublishedSlugs, getNavCategories } from "@/server/db/queries/projects";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, cats] = await Promise.all([
    getPublishedSlugs().catch(() => []),
    getNavCategories().catch(() => []),
  ]);

  const categoryRoutes: MetadataRoute.Sitemap = cats.map((c, i) => ({
    url: i === 0 ? SITE_URL : `${SITE_URL}/${c.slug}`,
    changeFrequency: "weekly",
    priority: i === 0 ? 1 : 0.8,
  }));

  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
    {
      url: `${SITE_URL}/mentions-legales`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const projectRoutes: MetadataRoute.Sitemap = slugs.map((s) => ({
    url: `${SITE_URL}/projects/${s.slug}`,
    lastModified: s.updatedAt ?? undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...categoryRoutes, ...fixed, ...projectRoutes];
}
