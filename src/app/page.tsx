"use client";

import { Header } from "@/components/pocketmcp/header";
import { Hero } from "@/components/pocketmcp/hero";
import { Dashboard } from "@/components/pocketmcp/dashboard";
import { Bridge } from "@/components/pocketmcp/bridge";
import { SetupGuide } from "@/components/pocketmcp/setup-guide";
import { Tools } from "@/components/pocketmcp/tools";
import { Docs } from "@/components/pocketmcp/docs";
import { FAQ } from "@/components/pocketmcp/faq";
import { Footer } from "@/components/pocketmcp/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Hero />
        <Dashboard />
        <Bridge />
        <SetupGuide />
        <Tools />
        <Docs />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
