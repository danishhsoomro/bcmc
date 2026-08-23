import Link from "next/link";
import { BadgeInfo, Eye, IdCard, ShieldCheck } from "lucide-react";

import { homeContent } from "@/data/home";

const trustIcons = {
  credentials: ShieldCheck,
  information: IdCard,
  identity: BadgeInfo,
  account: Eye,
} as const;

export function TrustSection() {
  const { trust } = homeContent;

  return (
    <section className="bcmc-section-large bg-[var(--color-forest-900)]">
      <div className="bcmc-container">
        <div data-motion="trust-heading">
          <p className="bcmc-eyebrow text-[var(--color-champagne)]/75">
            {trust.eyebrow}
          </p>
          <h2 className="bcmc-type-section-primary mt-4 max-w-[680px] text-[var(--color-cream)]">
            {trust.heading}
          </h2>
        </div>

        <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-x-16 md:gap-y-14 lg:grid-cols-[repeat(4,minmax(0,1fr))] lg:gap-0">
          {trust.principles.map((principle, index) => (
            <TrustPillar
              key={principle.id}
              principle={principle}
              showDivider={index < trust.principles.length - 1}
            />
          ))}
        </div>

        <Link
          href={trust.supportLink.href}
          className="mt-12 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--color-champagne)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-champagne)]"
        >
          {trust.supportLink.label}
          <span className="ml-2" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}

type TrustPrinciple = (typeof homeContent.trust.principles)[number];

function TrustPillar({
  principle,
  showDivider,
}: {
  principle: TrustPrinciple;
  showDivider: boolean;
}) {
  const Icon = trustIcons[principle.id];

  return (
    <article
      data-motion="trust-pillar"
      className="relative max-w-[300px] lg:max-w-none lg:px-8"
    >
      <div className="flex h-18 w-18 items-center justify-center rounded-full bg-white/[0.08] text-[var(--color-cream)]">
        <Icon className="h-8 w-8 stroke-[1.7]" aria-hidden="true" />
      </div>
      <div className="mt-6 flex min-h-14 items-start">
        <h3 className="bcmc-type-feature max-w-[220px] font-semibold text-[var(--color-cream)] [text-wrap:balance]">
          {principle.title}
        </h3>
      </div>
      <p className="bcmc-type-body-sm mt-4 max-w-[260px] text-[var(--color-cream)]/75">
        {principle.body}
      </p>
      {showDivider ? (
        <span
          className="absolute right-0 top-0 hidden h-[285px] w-px bg-[rgba(244,241,236,0.12)] lg:block"
          aria-hidden="true"
        />
      ) : null}
    </article>
  );
}
