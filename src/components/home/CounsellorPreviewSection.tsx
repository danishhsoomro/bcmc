import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Languages,
  Mars,
  MapPin,
  Venus,
  Video,
  type LucideIcon,
} from "lucide-react";

import { homeContent } from "@/data/home";

export function CounsellorPreviewSection() {
  const { humanity } = homeContent;

  return (
    <section className="bg-[var(--color-cream)] px-5 py-20 md:px-5 md:py-24 lg:py-28">
      <div className="mx-auto grid max-w-[1380px] gap-10 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="max-w-[320px]">
          <h2 className="font-serif text-[2.5rem] leading-[1.08] text-[var(--color-forest-900)] md:text-5xl lg:text-[3.125rem]">
            {humanity.heading}
          </h2>
          <p className="mt-6 text-base leading-7 text-[var(--color-stone)]">
            {humanity.body}
          </p>
          <Link
            href={humanity.browseLink.href}
            className="mt-7 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
          >
            {humanity.browseLink.label}
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </Link>
        </div>

        <div className="relative min-w-0">
          <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:mx-0 md:flex md:overflow-x-auto md:px-0 md:pb-4 lg:grid lg:grid-cols-4 lg:gap-3.5 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {humanity.counsellors.map((counsellor) => (
              <CounsellorCard key={counsellor.name} counsellor={counsellor} />
            ))}
          </div>
          <Link
            href={humanity.browseLink.href}
            className="absolute -right-3 top-[40%] hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-forest-900)] shadow-sm transition-colors hover:border-[var(--color-sage)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] xl:flex"
            aria-label="Browse more counsellors"
          >
            <ArrowRight className="h-5 w-5 stroke-[1.7]" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

type CounsellorPreview = (typeof homeContent.humanity.counsellors)[number];

function CounsellorCard({ counsellor }: { counsellor: CounsellorPreview }) {
  const genderMarker = getClientGenderMarker(counsellor.acceptedClientGenders);
  const imageSrc: string | null = counsellor.image ?? null;
  const imagePosition = counsellor.imagePosition ?? "50% 42%";

  return (
    <article
      className="group relative flex h-[356px] w-[82vw] shrink-0 snap-start flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/78 transition-colors hover:border-[var(--color-sage)] sm:w-[58vw] md:w-[260px] lg:w-auto"
    >
      <Link
        href={counsellor.href}
        className="absolute inset-0 z-10 rounded-[var(--radius-md)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
        aria-label={`View ${counsellor.name}'s profile`}
      >
        <span className="sr-only">View {counsellor.name}&apos;s profile</span>
      </Link>

      <div className="pointer-events-none relative h-[174px] shrink-0 overflow-hidden bg-[linear-gradient(180deg,var(--color-mist),var(--color-sand))]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={counsellor.name}
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 768px) 45vw, 82vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            style={{ objectPosition: imagePosition }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full border border-[var(--color-champagne)] bg-[var(--color-cream)] font-serif text-[1.625rem] text-[var(--color-forest-900)]"
              aria-hidden="true"
            >
              {counsellor.initials}
            </div>
          </div>
        )}
        {genderMarker ? (
          <GenderEligibilityMarker
            icon={genderMarker.icon}
            label={genderMarker.label}
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="min-h-[2.5em] text-[1rem] font-semibold leading-[1.25] text-[var(--color-forest-900)]">
          {counsellor.name}
        </h3>
        <p className="mt-0.5 text-[0.75rem] font-medium leading-4 text-[var(--color-leaf)]/85">
          {counsellor.featuredPopulations.slice(0, 2).join(" · ")}
        </p>
        <p className="mt-1 min-h-[2.25em] text-[0.8125rem] font-medium leading-[1.125rem] text-[var(--color-ink)]/78">
          {counsellor.featuredSupportAreas.slice(0, 3).join(" · ")}
        </p>
        <div className="mt-3 space-y-1.5 border-t border-[var(--color-border)]/25 pt-2 text-[0.71875rem] leading-4 text-[var(--color-stone)]/88">
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5">
              <MapPin
                className="h-3.5 w-3.5 shrink-0 stroke-[1.7] text-[var(--color-leaf)]/75"
                aria-hidden="true"
              />
              <span className="truncate">{counsellor.location}</span>
            </p>
            <div className="relative z-30 flex shrink-0 items-center gap-1.5">
              {counsellor.modality.map((modality) => (
                <ModalityIndicator key={modality} modality={modality} />
              ))}
            </div>
          </div>
          <p className="flex items-center gap-1.5">
            <Languages
              className="h-3.5 w-3.5 shrink-0 stroke-[1.7] text-[var(--color-leaf)]/75"
              aria-hidden="true"
            />
            <span>{counsellor.languages.join(" · ")}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

function ModalityIndicator({ modality }: { modality: string }) {
  const normalizedModality = modality.toLowerCase();
  const isInPerson = normalizedModality.includes("person");
  const Icon = isInPerson ? Building2 : Video;
  const label = isInPerson
    ? "In-person appointments"
    : "Online appointments";

  return <TooltipIconButton icon={Icon} label={label} />;
}

function GenderEligibilityMarker({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <TooltipIconButton
      icon={Icon}
      label={label}
      wrapperClassName="pointer-events-auto absolute right-3 top-3 z-30"
      className="h-8 w-8 border-[var(--color-border)] bg-[var(--color-cream)] text-[var(--color-forest-900)] shadow-[0_4px_12px_rgba(18,60,50,0.10)]"
      iconClassName="h-4 w-4 stroke-[1.8]"
      tooltipClassName="right-0 top-full mt-2"
    />
  );
}

function TooltipIconButton({
  icon: Icon,
  label,
  wrapperClassName = "",
  className = "h-6 w-6 border-transparent bg-transparent text-[var(--color-leaf)]/80",
  iconClassName = "h-3.5 w-3.5 stroke-[1.7]",
  tooltipClassName = "right-0 bottom-full mb-2",
}: {
  icon: LucideIcon;
  label: string;
  wrapperClassName?: string;
  className?: string;
  iconClassName?: string;
  tooltipClassName?: string;
}) {
  const wrapperPositionClass = wrapperClassName.includes("absolute")
    ? "group/tooltip inline-flex"
    : "group/tooltip relative inline-flex";

  return (
    <span className={`${wrapperPositionClass} ${wrapperClassName}`}>
      <button
        type="button"
        aria-label={label}
        className={`flex items-center justify-center rounded-full border focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-antique-gold)] ${className}`}
      >
        <Icon className={iconClassName} aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-40 w-max max-w-[11rem] rounded-[var(--radius-sm)] bg-[var(--color-forest-900)] px-3 py-2 text-xs leading-4 text-[var(--color-cream)] opacity-0 shadow-[0_8px_20px_rgba(18,60,50,0.16)] transition-opacity group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 ${tooltipClassName}`}
      >
        {label}
      </span>
    </span>
  );
}

function getClientGenderMarker(
  acceptedClientGenders: readonly string[],
): { icon: LucideIcon; label: string } | null {
  if (acceptedClientGenders.length !== 1) {
    return null;
  }

  const acceptedGender = acceptedClientGenders[0].toLowerCase();

  if (acceptedGender === "women" || acceptedGender === "female") {
    return { icon: Venus, label: "Works with women only" };
  }

  if (acceptedGender === "men" || acceptedGender === "male") {
    return { icon: Mars, label: "Works with men only" };
  }

  return null;
}
