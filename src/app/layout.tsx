import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PocketMCP — Roblox MCP mobile-first",
  description:
    "Serveur MCP Roblox pour mobile. Branche ton tél Android (Termux + Delta/Hydrogen) sur OpenCode, Codex, Claude. Dashboard live + exécution Lua + RemoteSpy.",
  keywords: [
    "Roblox", "MCP", "Termux", "Delta", "Hydrogen", "OpenCode",
    "mobile", "Android", "Lua", "executor",
  ],
  authors: [{ name: "Aeronscript" }],
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: "/favicon-64.png",
  },
  openGraph: {
    title: "PocketMCP — Roblox MCP mobile-first",
    description: "Serveur MCP Roblox pour mobile. Branche ton tél sur OpenCode, Codex, Claude.",
    images: ["/pocketmcp-logo-optimized.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${jetbrains.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
