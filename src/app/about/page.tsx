import type { Metadata } from "next";

import { AboutPageClient } from "@/components/about/AboutPageClient";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "About BCMC | BC Muslim Counsellors",
  description:
    "Learn how BCMC strengthens the paths between Muslim communities and mental-health support across British Columbia.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)]">
      <Header />
      <main>
        <AboutPageClient />
      </main>
      <Footer />
    </div>
  );
}
