import Image from "next/image";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { homeContent } from "@/data/home";

export function Hero() {
  const { hero } = homeContent;

  return (
    <section className="relative isolate h-[660px] overflow-hidden bg-[var(--color-cream)] md:h-[690px] lg:h-[700px]">
      <div className="absolute inset-y-0 right-0 z-0 w-full overflow-hidden md:w-[58%]">
        <Image
          src="/images/hero/bcmc-door-hero.png"
          alt="A warmly lit counselling room seen through an open door."
          fill
          priority
          sizes="(min-width: 768px) 58vw, 100vw"
          className="translate-y-[3.5%] scale-[1.08] object-cover object-[61%_center] md:object-center"
        />
      </div>
      <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,var(--color-cream)_0%,var(--color-cream)_36%,rgba(248,245,240,0.9)_47%,rgba(248,245,240,0.42)_60%,rgba(248,245,240,0)_76%)]" />
      <div className="relative z-10 mx-auto flex h-full max-w-[1240px] items-center px-5 pb-8 pt-24 md:px-8 md:pt-28">
        <div className="w-full max-w-[560px] md:w-[44%]">
          <h1 className="max-w-[500px] font-serif text-[2.85rem] leading-[1.06] text-[var(--color-forest-900)] md:text-[3.35rem] lg:text-[3.55rem]">
            {hero.headline}
          </h1>
          <p className="mt-5 max-w-[360px] text-base leading-7 text-[var(--color-ink)]/78 md:text-lg">
            {hero.body}
          </p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href={hero.primaryCta.href}
              className="inline-flex min-h-12 w-[235px] items-center justify-center gap-4 rounded-[var(--radius-md)] bg-[var(--color-forest-900)] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              {hero.primaryCta.label}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              {hero.secondaryCta.label}
            </Link>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-[var(--color-stone)]">
            <LockKeyhole className="h-3.5 w-3.5 stroke-[1.6]" aria-hidden="true" />
            {hero.microcopy}
          </p>
        </div>
      </div>
    </section>
  );
}
