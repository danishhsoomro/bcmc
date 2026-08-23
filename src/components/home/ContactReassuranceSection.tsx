import Link from "next/link";
import { Sprout } from "lucide-react";

import { homeContent } from "@/data/home";

export function ContactReassuranceSection() {
  const { contactReassurance } = homeContent;

  return (
    <section className="border-y border-[var(--color-forest-900)]/10 bg-[#F4EEE6]">
      <div className="bcmc-container py-8 md:py-10 lg:py-12">
        <div className="flex max-w-[1040px] flex-col gap-5 md:flex-row md:flex-wrap md:items-start md:gap-x-5 md:gap-y-4 lg:flex-nowrap lg:items-center lg:gap-6">
          <div
            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-[var(--color-mist)] text-[var(--color-leaf)]"
            aria-hidden="true"
          >
            <Sprout className="h-5.5 w-5.5 stroke-[1.7]" />
          </div>

          <div className="max-w-[680px] md:flex-1">
            <h2 className="font-serif text-[clamp(1.5rem,1.36rem+0.45vw,1.875rem)] leading-[1.18] text-[var(--color-forest-900)]">
              {contactReassurance.heading}
            </h2>
            <p className="bcmc-type-body-sm mt-3 max-w-[660px] text-[var(--color-stone)]">
              {contactReassurance.body}
            </p>
          </div>

          <div className="md:ml-[calc(3.25rem+1.25rem)] md:basis-full lg:ml-0 lg:basis-auto lg:pt-1">
            <Link
              href={contactReassurance.link.href}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              {contactReassurance.link.label}
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
