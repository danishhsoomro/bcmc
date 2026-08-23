import { AgencySection } from "@/components/home/AgencySection";
import { ContactReassuranceSection } from "@/components/home/ContactReassuranceSection";
import { CounsellorPreviewSection } from "@/components/home/CounsellorPreviewSection";
import { Hero } from "@/components/home/Hero";
import { OrientationSection } from "@/components/home/OrientationSection";
import { OrganizationalHeroSection } from "@/components/home/OrganizationalHeroSection";
import { PermissionSection } from "@/components/home/PermissionSection";
import { TrustSection } from "@/components/home/TrustSection";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)]">
      <Header />
      <main>
        <Hero />
        <PermissionSection />
        <OrientationSection />
        <OrganizationalHeroSection />
        <TrustSection />
        <CounsellorPreviewSection />
        <ContactReassuranceSection />
        <AgencySection />
      </main>
      <Footer />
    </div>
  );
}
