import Image from "next/image";
import Link from "next/link";
import {
  School,
  UserRoundSearch,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { homeContent } from "@/data/home";

const pillarIcons = {
  "support-seekers": UserRoundSearch,
  counsellors: UsersRound,
  communities: School,
} as const;

const pillarStyles = {
  "support-seekers": {
    circle: "bg-[var(--color-mist)]",
    icon: "text-[var(--color-evergreen)]",
  },
  counsellors: {
    circle: "bg-[var(--color-pale-iris)]",
    icon: "text-[var(--color-muted-iris)]",
  },
  communities: {
    circle: "bg-[#F4E5DE]",
    icon: "text-[var(--color-clay)]",
  },
} as const;

export function OrganizationalHeroSection() {
  const { organizationalHero } = homeContent;

  return (
    <section className="overflow-hidden bg-[#F4EEE6]">
      <div className="bcmc-container py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.49fr)_minmax(0,0.51fr)] lg:items-center lg:gap-8">
          <div className="relative z-10 max-w-[590px]">
            <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
              {organizationalHero.eyebrow}
            </p>
            <h2 className="bcmc-type-section-primary mt-4 max-w-[520px] text-[var(--color-forest-900)]">
              {organizationalHero.heading}
            </h2>
            <div className="bcmc-type-body mt-4 max-w-[590px] space-y-3 text-[var(--color-ink)]/78">
              {organizationalHero.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <Link
              href={organizationalHero.link.href}
              className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              {organizationalHero.link.label}
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>
          </div>

          <div className="relative z-0 mt-2 md:mt-3 lg:pointer-events-none lg:-mr-[calc(var(--bcmc-gutter)*1.15)] lg:mt-0 lg:justify-self-stretch">
            <Image
              src="/illustrations/banner_line_art.png"
              alt=""
              width={2172}
              height={724}
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="h-auto w-full object-contain opacity-95"
            />
          </div>
        </div>

        <div className="relative z-10 mt-3 grid gap-8 border-t border-[var(--color-forest-900)]/10 pt-5 md:grid-cols-3 md:gap-0 lg:mt-3 lg:pt-5">
          {organizationalHero.pillars.map((pillar, index) => (
            <OrganizationalPillar
              key={pillar.id}
              pillar={pillar}
              showDivider={index < organizationalHero.pillars.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type OrganizationalPillar = (typeof homeContent.organizationalHero.pillars)[number];

function OrganizationalPillar({
  pillar,
  showDivider,
}: {
  pillar: OrganizationalPillar;
  showDivider: boolean;
}) {
  const Icon = pillarIcons[pillar.id] as LucideIcon;
  const styles = pillarStyles[pillar.id];

  return (
    <article className="relative max-w-[360px] md:max-w-none md:px-8 md:first:pl-0 md:last:pr-0 lg:px-12 lg:first:pl-0 lg:last:pr-0">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full ${styles.circle}`}
      >
        <Icon className={`h-6 w-6 stroke-[1.7] ${styles.icon}`} aria-hidden="true" />
      </div>
      <h3 className="bcmc-type-feature mt-4 max-w-[300px] font-semibold text-[var(--color-forest-900)]">
        {pillar.heading}
      </h3>
      <p className="bcmc-type-body-sm mt-3 max-w-[360px] text-[var(--color-stone)]">
        {pillar.body}
      </p>
      {showDivider ? (
        <span
          className="absolute right-0 top-2 hidden h-[calc(100%-1rem)] w-px bg-[var(--color-forest-900)]/8 md:block"
          aria-hidden="true"
        />
      ) : null}
    </article>
  );
}
