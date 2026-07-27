// src/app/robots.ts
// Génération dynamique du robots.txt
// Docs : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
import type { MetadataRoute } from "next";

const SITE_URL = "https://pocketmcp.onrender.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Google, Bing, etc. : tout indexer
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/mcp"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
