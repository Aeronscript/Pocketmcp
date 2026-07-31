// src/middleware.ts
// Middleware de maintenance pour PocketMCP.
//
// Si MAINTENANCE_MODE=true dans les variables d'environnement :
// - Toutes les routes web (/) renvoient la page de maintenance
// - Les routes /api/* restent accessibles (pour que les bridges déjà installés
//   chez les users continuent de marcher)
// - Les routes /_next/* (assets) restent accessibles (sinon la page casse)
//
// Activation : Render → Settings → Environment → Add Variable → MAINTENANCE_MODE=true
// Désactivation : supprimer la variable ou mettre MAINTENANCE_MODE=false
//
// Aucun redéploiement nécessaire pour basculer (Render recharge les vars d'env
// automatiquement, mais il faut redémarrer le service pour que le middleware
// les relise — Render le fait tout seul quand on modifie les env vars).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isMaintenance = process.env.MAINTENANCE_MODE === "true";
  if (!isMaintenance) {
    return NextResponse.next();
  }

  const path = req.nextUrl.pathname;

  // Routes qui restent accessibles pendant la maintenance :
  // - /api/* : bridges déjà installés doivent continuer de marcher
  // - /_next/* : assets Next.js (sinon la page maintenance casse)
  // - /favicon*, /logo*, /pocketmcp-logo* : favicons et logos
  // - /google*.html : vérification Google Search Console (ne pas casser)
  // - /robots.txt, /sitemap.xml : SEO (ne pas casser l'indexation)
  const isExempt =
    path.startsWith("/api/") ||
    path.startsWith("/_next/") ||
    path.startsWith("/favicon") ||
    path.startsWith("/logo") ||
    path.startsWith("/pocketmcp-logo") ||
    path.startsWith("/google") ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path === "/maintenance.html";

  if (isExempt) {
    return NextResponse.next();
  }

  // Pour toutes les autres routes : renvoyer la page de maintenance
  // avec le status 503 (Service Unavailable) pour indiquer à Google
  // et aux bots que c'est temporaire.
  const maintenanceUrl = new URL("/maintenance.html", req.url);
  return NextResponse.rewrite(maintenanceUrl, { status: 503 });
}

// Matcher : appliquer le middleware à toutes les routes sauf les exemptées
// (optimisation — on évite de le faire tourner sur les assets statiques)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - google*.html (Google verification)
     * - robots.txt, sitemap.xml
     * - *.png, *.svg, *.jpg (images)
     */
    "/((?!api|_next/static|_next/image|favicon|google|robots\\.txt|sitemap\\.xml|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.ico|maintenance\\.html).*)",
  ],
};
