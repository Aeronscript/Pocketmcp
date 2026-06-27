"use client";

import { Header } from "@/components/planetscript/header";
import { Hero } from "@/components/planetscript/hero";
import { Stats } from "@/components/planetscript/stats";
import { Features } from "@/components/planetscript/features";
import { ScriptGrid } from "@/components/planetscript/script-grid";
import { Footer } from "@/components/planetscript/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Features />
        <ScriptGrid />
      </main>
      <Footer />
    </div>
  );
}
