// src/app/sitemap.ts
// Génération dynamique du sitemap.xml
// Docs : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
import type { MetadataRoute } from "next";

const SITE_URL = "https://pocketmcp.onrender.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    // Le site est un SPA avec une seule page (/) — pas d'autres URLs à indexer.
    // Si on ajoute des pages dédiées (/docs, /faq, /pricing) à l'avenir,
    // les ajouter ici.
  ];
}
