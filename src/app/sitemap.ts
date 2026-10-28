import { MetadataRoute } from "next";
import { getDb, initDb } from "@/lib/db";
import { AUDIOBOOKS } from "@/lib/audiobook-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.audioteka-pro.ru";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/copyright`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contacts`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  let bookIds: { id: string; date?: Date }[] = [];

  try {
    await initDb();
    const db = getDb();
    const res = await db.execute("SELECT id, created_at FROM books LIMIT 45000");
    if (res.rows.length > 0) {
      bookIds = res.rows.map((r) => ({
        id: String(r.id),
        date: r.created_at ? new Date(Number(r.created_at)) : new Date(),
      }));
    }
  } catch (e) {
    console.warn("Sitemap DB fallback:", e);
  }

  // Fallback to static catalog if DB is empty
  if (bookIds.length === 0) {
    bookIds = AUDIOBOOKS.map((b) => ({ id: b.id, date: new Date() }));
  }

  const bookRoutes: MetadataRoute.Sitemap = bookIds.map((item) => ({
    url: `${baseUrl}/book/${item.id}`,
    lastModified: item.date || new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...bookRoutes];
}
