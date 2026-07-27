import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ensureAuthFile } from "@/lib/auth-codes";

// Garantit la présence de data/auth-codes.json au démarrage (le fichier est
// gitignoré car il contient le hash du code admin). Idempotent.
ensureAuthFile();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

// ─── SEO : constantes centralisées ────────────────────────────
const SITE_URL = "https://pocketmcp.onrender.com";
const SITE_NAME = "PocketMCP";
const SITE_TITLE = "PocketMCP — Roblox MCP mobile-first";
const SITE_DESCRIPTION =
  "Serveur MCP Roblox pour mobile. Branche ton tél Android (Termux + Delta/Hydrogen) sur OpenCode, Codex, Claude. Dashboard live + exécution Lua + RemoteSpy. 100% local.";
const OG_IMAGE = "/pocketmcp-logo-optimized.png";

export const metadata: Metadata = {
  // metadataBase : obligatoire pour que Next.js résolve les URLs relatives
  // des images Open Graph / Twitter Cards en URLs absolues.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  keywords: [
    "Roblox", "MCP", "Termux", "Delta", "Hydrogen", "OpenCode",
    "Codex", "Claude", "mobile", "Android", "Lua", "executor",
    "RemoteSpy", "bridge", "pocketmcp", "Aeronscript",
  ],
  authors: [{ name: "Aeronscript", url: "mailto:aeronscriptlabs@gmail.com" }],
  creator: "Aeronscript",
  publisher: "Aeronscript",
  // Canonical URL (anti duplicate-content SEO)
  alternates: {
    canonical: "/",
    languages: {
      "fr-FR": "/",
    },
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: "/favicon-64.png",
    shortcut: "/favicon-64.png",
  },
  // Open Graph (Facebook, Discord, LinkedIn, etc.)
  openGraph: {
    title: SITE_TITLE,
    description: "Serveur MCP Roblox pour mobile. Branche ton tél sur OpenCode, Codex, Claude.",
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "PocketMCP — Roblox MCP mobile-first",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: "Serveur MCP Roblox pour mobile. Branche ton tél sur OpenCode, Codex, Claude.",
    images: [OG_IMAGE],
    creator: "@aeronscript",
    site: "@aeronscript",
  },
  // Robots : indexer + suivre les liens
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Favicons pour navigateurs modernes
  manifest: undefined,
  category: "technology",
};

// ─── Structured Data (JSON-LD) ────────────────────────────────
// Aide Google à comprendre que PocketMCP est une application logicielle.
// Schema : https://schema.org/SoftwareApplication
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Android",
  applicationSubCategory: "Game Tools",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  author: {
    "@type": "Person",
    name: "Aeronscript",
    email: "aeronscriptlabs@gmail.com",
    url: SITE_URL,
  },
  publisher: {
    "@type": "Person",
    name: "Aeronscript",
    email: "aeronscriptlabs@gmail.com",
    url: SITE_URL,
  },
  softwareVersion: "0.5.0",
  datePublished: "2026-07-01",
  dateModified: "2026-07-25",
  featureList: [
    "execute_code",
    "decompile_script",
    "get_instances",
    "spy_remotes",
    "list_remotes",
    "click_gui",
    "screenshot",
    "get_player_info",
    "list_clients",
    "get_logs",
    "analyze_game",
    "find_gamepass_logic",
    "stealth_setup",
    "player_control",
  ],
  aggregateRating: undefined, // Pas encore de notes — à ajouter quand tu auras des users
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${jetbrains.variable} antialiased bg-background text-foreground`}
      >
        {/* Structured Data JSON-LD pour Google Rich Results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
