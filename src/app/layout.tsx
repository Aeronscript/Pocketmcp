import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "planetscript — Scripts Roblox mobile & PC",
  description:
    "Collection épurée de scripts Roblox pour exécuteurs mobile et PC : visuels avancés, scanner RemoteEvents, détection d'anti-cheat et plus.",
  keywords: [
    "Roblox",
    "scripts",
    "executor",
    "mobile",
    "PC",
    "RemoteEvents",
    "ESP",
    "Lua",
    "planetscript",
  ],
  authors: [{ name: "planetscript" }],
  openGraph: {
    title: "planetscript",
    description: "Scripts Roblox épurés pour mobile & PC",
    siteName: "planetscript",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrains.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
