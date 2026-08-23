import Image from "next/image";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { homeContent } from "@/data/home";

export function Hero() {
  const { hero } = homeContent;

  return (
    <section className="relative isolate min-h-[650px] overflow-hidden bg-[var(--color-cream)] md:min-h-[690px] lg:min-h-[clamp(700px,76vh,740px)]">
      <div className="absolute inset-y-0 right-0 z-0 w-full overflow-hidden md:w-[52%] lg:w-[58%]">
        <Image
          src="/images/hero/bcmc-door-hero.png"
          alt="A warmly lit counselling room seen through an open door."
          fill
          priority
          sizes="(min-width: 768px) 58vw, 100vw"
          className="translate-y-[4.5%] scale-[1.08] object-cover object-[61%_57%] md:object-[50%_60%]"
        />
      </div>
      <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,var(--color-cream)_0%,var(--color-cream)_36%,rgba(248,245,240,0.9)_47%,rgba(248,245,240,0.42)_60%,rgba(248,245,240,0)_76%)]" />
      <div className="bcmc-container relative z-10 flex min-h-[650px] items-center pb-10 pt-34 md:min-h-[690px] md:pt-38 lg:min-h-[clamp(700px,76vh,740px)] lg:pt-42">
        <div className="w-full max-w-[610px] md:w-[54%] md:translate-y-8 lg:w-[48%] lg:translate-y-10">
          <h1 className="bcmc-type-display max-w-[610px] text-[var(--color-forest-900)]">
            {hero.headline}
          </h1>
          <p className="bcmc-type-lead mt-6 max-w-[450px] text-[var(--color-ink)]/78">
            {hero.body}
          </p>
          <div className="mt-8 flex flex-col items-start gap-4 lg:flex-row lg:items-center">
            <Link
              href={hero.primaryCta.href}
              className="inline-flex min-h-13 w-[248px] shrink-0 items-center justify-center gap-4 rounded-[var(--radius-md)] bg-[var(--color-forest-900)] px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
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
