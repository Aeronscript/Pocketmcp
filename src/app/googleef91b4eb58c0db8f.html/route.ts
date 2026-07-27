// src/app/googleef91b4eb58c0db8f.html/route.ts
// Vérification de propriété Google Search Console.
// Google demande de déposer un fichier à cette URL exacte pour prouver
// qu'on contrôle le site. Le contenu est fixe (token de vérification).
//
// Une fois la vérification faite dans Google Search Console, on peut
// supprimer ce fichier (mais le laisser ne pose aucun problème).
//
// URL : https://pocketmcp.onrender.com/googleef91b4eb58c0db8f.html

export const dynamic = "force-static";

export async function GET() {
  // Contenu exact exigé par Google (ne pas modifier)
  const content = "google-site-verification: googleef91b4eb58c0db8f.html";

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
