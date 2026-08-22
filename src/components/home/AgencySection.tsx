import Link from "next/link";
import {
  ArrowRight,
  Compass,
  MessagesSquare,
  Sprout,
  type LucideIcon,
} from "lucide-react";

import { homeContent } from "@/data/home";
import { Button } from "@/components/ui/Button";

const resourceIcons = {
  help: Sprout,
  expect: MessagesSquare,
  support: Compass,
} as const;

const resourceIconStyles = {
  help: {
    circle: "bg-[var(--color-mist)]",
    icon: "text-[var(--color-evergreen)]",
  },
  expect: {
    circle: "bg-[var(--color-cream)]",
    icon: "text-[var(--color-muted-iris)]",
  },
  support: {
    circle: "bg-[#F3EEE4]",
    icon: "text-[var(--color-antique-gold)]",
  },
} as const;

export function AgencySection() {
  const { agency } = homeContent;

  return (
    <section className="bg-[var(--color-pale-iris)] px-5 py-18 md:px-8 md:py-20 lg:py-18">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid gap-10 xl:grid-cols-[minmax(430px,0.34fr)_minmax(0,1fr)] xl:gap-18">
          <div className="max-w-[430px]">
            <h2 className="whitespace-pre-line font-serif text-[2.5rem] leading-[1.08] text-[var(--color-forest-900)] md:text-5xl">
              {agency.heading}
            </h2>
            <p className="mt-5 text-base leading-7 text-[var(--color-stone)]">
              {agency.body}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {agency.resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-[var(--color-forest-900)]/12 pt-7 md:mt-8 md:flex md:items-center md:justify-between md:gap-8">
          <div className="max-w-[560px]">
            <p className="text-lg font-semibold leading-6 text-[var(--color-forest-900)]">
              {agency.finalCta.heading}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
              {agency.finalCta.body}
            </p>
          </div>
          <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center md:mt-0 md:shrink-0">
            <Button href={agency.finalCta.primary.href}>
              {agency.finalCta.primary.label}
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Button>
            <Button href={agency.finalCta.secondary.href} variant="quiet">
              {agency.finalCta.secondary.label}
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

type Resource = (typeof homeContent.agency.resources)[number];

function ResourceCard({ resource }: { resource: Resource }) {
  const Icon = resourceIcons[resource.id] as LucideIcon;
  const styles = resourceIconStyles[resource.id];

  return (
    <Link
      href={resource.href}
      aria-label={`Read ${resource.title}`}
      className="group flex min-h-[236px] cursor-pointer flex-col rounded-[var(--radius-lg)] border border-[var(--color-forest-900)]/14 bg-[var(--color-cream)]/60 p-5 transition-[background-color,border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--color-sage)]/70 hover:bg-[var(--color-cream)]/75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] motion-reduce:transform-none motion-reduce:transition-none md:p-5"
    >
      <div
        className={`flex h-13 w-13 items-center justify-center rounded-full ${styles.circle}`}
      >
        <Icon className={`h-5.5 w-5.5 stroke-[1.7] ${styles.icon}`} aria-hidden="true" />
      </div>
      <h3 className="relative mt-5 min-h-[2.9rem] pr-9 text-[1.0625rem] font-semibold leading-[1.35] text-[var(--color-forest-900)]">
        <span className="underline-offset-4 group-hover:underline">
          {resource.title}
        </span>
        <ArrowRight
          className="absolute right-0 top-0.5 h-4.5 w-4.5 stroke-[1.8] transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </h3>
      <p className="mt-3 text-[0.9375rem] leading-6 text-[var(--color-stone)]">
        {resource.body}
      </p>
    </Link>
  );
}
