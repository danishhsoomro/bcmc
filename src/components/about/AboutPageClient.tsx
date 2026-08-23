import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  Compass,
  Ear,
  Handshake,
  HeartHandshake,
  Leaf,
  Megaphone,
  Network,
  Search,
  ShieldCheck,
  Sprout,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { aboutContent } from "@/data/about";
import { Button } from "@/components/ui/Button";

type Accent = "sage" | "lavender" | "peach" | "gold";

const accentStyles: Record<Accent, { circle: string; icon: string; surface: string }> = {
  sage: {
    circle: "bg-[var(--color-mist)]",
    icon: "text-[var(--color-evergreen)]",
    surface: "bg-[var(--color-mist)]/70",
  },
  lavender: {
    circle: "bg-[var(--color-pale-iris)]",
    icon: "text-[var(--color-muted-iris)]",
    surface: "bg-[var(--color-pale-iris)]/68",
  },
  peach: {
    circle: "bg-[#F4E5DE]",
    icon: "text-[var(--color-clay)]",
    surface: "bg-[#F7E8DF]/72",
  },
  gold: {
    circle: "bg-[#F3EEE4]",
    icon: "text-[var(--color-antique-gold)]",
    surface: "bg-[#F1E8D8]/78",
  },
};

const audienceIcons = {
  seekers: UserRound,
  counsellors: UsersRound,
  communities: Building2,
} as const;

const audienceAccents = {
  seekers: "sage",
  counsellors: "lavender",
  communities: "peach",
} as const;

const helpIcons = {
  navigate: Compass,
  understand: BookOpen,
  connect: Handshake,
  gaps: Search,
} as const;

const helpAccents = {
  navigate: "sage",
  understand: "lavender",
  connect: "peach",
  gaps: "gold",
} as const;

const changeIcons = {
  listen: Ear,
  learn: Search,
  connect: Network,
  build: Leaf,
  advocate: Megaphone,
} as const;

const distinctionIcons = {
  identity: UserRound,
  culture: UsersRound,
  faith: HeartHandshake,
  integrated: Sprout,
  islamic: BookOpen,
} as const;

const principleIcons = {
  person: UserRound,
  agency: Compass,
  clarity: ShieldCheck,
  diversity: UsersRound,
  connection: Network,
  privacy: Check,
  listen: Ear,
} as const;

export function AboutPageClient() {
  return (
    <>
      <AboutHero />
      <GapSection />
      <BoundariesSection />
      <HowBcmcHelpsSection />
      <ChangeTimelineSection />
      <CentralIdeaSection />
      <PrinciplesSection />
      <WaysInSection />
    </>
  );
}

function AboutHero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#F4EEE6] pt-30 md:pt-34">
      <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--color-forest-900)]/10" />
      <div className="bcmc-container grid min-h-[500px] gap-8 pb-10 md:grid-cols-[minmax(0,0.52fr)_minmax(0,0.48fr)] md:items-center md:pb-12 lg:min-h-[560px]">
        <div className="relative z-10 max-w-[650px]">
          <p className="bcmc-eyebrow text-[var(--color-leaf)]">{aboutContent.hero.eyebrow}</p>
          <h1 className="mt-5 font-serif text-[clamp(2.85rem,5.3vw,4.35rem)] leading-[1.02] text-[var(--color-forest-900)]">
            {aboutContent.hero.humanLine}
          </h1>
          <p className="mt-7 max-w-[620px] text-[clamp(1.15rem,2vw,1.48rem)] leading-snug text-[var(--color-ink)]/78">
            {aboutContent.hero.mission}
          </p>
          <p className="mt-5 max-w-[500px] text-[0.98rem] leading-7 text-[var(--color-stone)]">
            {aboutContent.hero.pathLine}
          </p>
        </div>
        <div className="relative -mx-5 md:mx-0 md:self-end">
          <Image
            src="/illustrations/about_path_line_art.png"
            alt="A winding path leading toward an open arched doorway beside a sage plant."
            width={1672}
            height={941}
            priority
            sizes="(min-width: 1024px) 48vw, 100vw"
            className="h-auto w-full object-contain opacity-95"
          />
        </div>
      </div>
    </section>
  );
}

function GapSection() {
  return (
    <section className="bg-[var(--color-cream)] py-12 md:py-16">
      <div className="bcmc-container">
        <div className="mx-auto max-w-[790px] text-center">
          <h2 className="bcmc-type-section-compact text-[var(--color-forest-900)]">
            {aboutContent.gap.heading}
          </h2>
          <p className="mt-5 text-[1rem] leading-7 text-[var(--color-ink)]/76 md:text-[1.0625rem]">
            {aboutContent.gap.body}
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-[900px] md:min-h-[540px]">
          <div
            className="pointer-events-none absolute inset-x-[17%] top-[18%] bottom-[17%] hidden md:block"
            aria-hidden="true"
          >
            <span className="absolute left-[50%] top-[5%] h-[72%] w-px origin-top rotate-[32deg] border-l border-dashed border-[var(--color-leaf)]/42" />
            <span className="absolute right-[50%] top-[5%] h-[72%] w-px origin-top -rotate-[32deg] border-l border-dashed border-[var(--color-leaf)]/42" />
            <span className="absolute bottom-[7%] left-[13%] right-[13%] border-t border-dashed border-[var(--color-leaf)]/42" />
          </div>
          <div className="grid gap-5 md:grid-cols-2 md:grid-rows-[auto_auto] md:gap-x-12 md:gap-y-6">
            {aboutContent.gap.parts.map((part, index) => {
              const Icon = audienceIcons[part.id];
              const accent = audienceAccents[part.id];

              return (
                <article
                  key={part.id}
                  className={`relative rounded-[var(--radius-md)] p-5 text-center md:bg-[var(--color-cream)]/72 ${
                    index === 0 ? "md:col-span-2 md:mx-auto md:w-[42%]" : ""
                  }`}
                >
                  <IconMarker
                    Icon={Icon}
                    accent={accent}
                    size="xl"
                    className="relative z-10 mx-auto"
                  />
                  <h3 className="mt-5 text-[1rem] font-semibold text-[var(--color-forest-900)]">
                    {part.title}
                  </h3>
                  <p className="mx-auto mt-3 max-w-[290px] text-[0.9rem] leading-6 text-[var(--color-stone)]">
                    {part.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function BoundariesSection() {
  return (
    <section className="bg-[#F4EEE6] py-12 md:py-16">
      <div className="bcmc-container">
        <div className="grid gap-10 lg:grid-cols-[minmax(260px,0.33fr)_minmax(0,0.67fr)] lg:items-start">
          <div className="max-w-[430px]">
            <h2 className="bcmc-type-section-compact text-[var(--color-forest-900)]">
              {aboutContent.boundaries.heading}
            </h2>
            <p className="mt-5 text-[0.98rem] leading-7 text-[var(--color-stone)]">
              {aboutContent.boundaries.intro}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <BoundaryPanel title="BCMC is" items={aboutContent.boundaries.is} Icon={Check} accent="sage" />
            <BoundaryPanel
              title="BCMC is not"
              items={aboutContent.boundaries.isNot}
              Icon={X}
              accent="peach"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function HowBcmcHelpsSection() {
  return (
    <section className="bg-[var(--color-cream)] py-11 md:py-14">
      <div className="bcmc-container">
        <div className="grid gap-10 lg:grid-cols-[minmax(260px,0.3fr)_minmax(0,0.7fr)]">
          <div className="max-w-[420px]">
            <h2 className="bcmc-type-section-compact text-[var(--color-forest-900)]">
              {aboutContent.helps.heading}
            </h2>
            <p className="mt-5 text-[0.96rem] leading-7 text-[var(--color-stone)]">
              {aboutContent.helps.body}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {aboutContent.helps.items.map((item) => {
              const Icon = helpIcons[item.id];
              const accent = helpAccents[item.id];
              const isHinge = item.id === "gaps";

              return (
                <article
                  key={item.id}
                  className={`relative min-h-[210px] rounded-[var(--radius-md)] p-5 md:p-6 ${
                    isHinge
                      ? "bg-[#F1E8D8] shadow-[inset_0_-5px_0_rgba(167,131,72,0.18)]"
                      : accentStyles[accent].surface
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <IconMarker Icon={Icon} accent={accent} size="md" />
                    <span className="rounded-full bg-[var(--color-cream)]/82 px-3 py-1 text-xs font-semibold text-[var(--color-forest-900)]/72">
                      {item.label}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[1.05rem] font-semibold leading-6 text-[var(--color-forest-900)]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[0.9rem] leading-6 text-[var(--color-ink)]/74">
                    {item.body}
                  </p>
                  {isHinge ? (
                    <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-antique-gold)]">
                      <span>Shapes what comes next</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChangeTimelineSection() {
  return (
    <section className="bg-[#F7F2EA] py-13 md:py-17">
      <div className="bcmc-container">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[560px]">
            <h2 className="bcmc-type-section-compact text-[var(--color-forest-900)]">
              {aboutContent.change.heading}
            </h2>
            <p className="mt-4 text-[0.98rem] leading-7 text-[var(--color-stone)]">
              {aboutContent.change.body}
            </p>
          </div>
          <p className="max-w-[320px] rounded-full bg-[var(--color-cream)] px-4 py-2 text-xs font-semibold text-[var(--color-forest-900)]/72">
            Build and advocate are marked “over time.”
          </p>
        </div>

        <ol className="mt-10 grid gap-6 md:grid-cols-5 md:gap-3">
          {aboutContent.change.steps.map((step, index) => {
            const Icon = changeIcons[step.id];
            const isFuture = step.status === "Over time";

            return (
              <li key={step.id} className="relative">
                <div
                  className={`relative min-h-full rounded-[var(--radius-md)] p-5 ${
                    isFuture
                      ? "border border-dashed border-[var(--color-forest-900)]/20 bg-[var(--color-cream)]/42 opacity-75"
                      : "bg-[var(--color-cream)]/82"
                  }`}
                >
                  {index < aboutContent.change.steps.length - 1 ? (
                    <ArrowRight
                      className={`absolute -right-4 top-8 hidden h-5 w-5 md:block ${
                        isFuture
                          ? "text-[var(--color-forest-900)]/20"
                          : "text-[var(--color-leaf)]/58"
                      }`}
                      aria-hidden="true"
                    />
                  ) : null}
                  <IconMarker Icon={Icon} accent={isFuture ? "gold" : "sage"} size="sm" />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-antique-gold)]">
                    {step.status}
                  </p>
                  <h3 className="mt-2 text-[1rem] font-semibold text-[var(--color-forest-900)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[0.84rem] leading-5 text-[var(--color-stone)]">
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function CentralIdeaSection() {
  return (
    <section className="bg-[var(--color-forest-900)] py-18 text-[var(--color-cream)] md:py-24 lg:py-28">
      <div className="bcmc-container">
        <div className="mx-auto max-w-[980px] text-center">
          <p className="bcmc-eyebrow text-[var(--color-champagne)]/78">
            {aboutContent.central.eyebrow}
          </p>
          <h2 className="mt-6 font-serif text-[clamp(2.75rem,6.4vw,5.35rem)] leading-[1.01]">
            {aboutContent.central.heading}
          </h2>
          <div className="mx-auto mt-8 max-w-[760px] space-y-5 text-[1.08rem] leading-8 text-[var(--color-cream)]/78 md:text-[1.2rem]">
            {aboutContent.central.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <div className="mt-13 grid gap-4 md:grid-cols-5">
          {aboutContent.central.distinctions.map((item) => {
            const Icon = distinctionIcons[item.id];

            return (
              <article key={item.id} className="rounded-[var(--radius-md)] bg-[var(--color-cream)]/[0.075] p-5">
                <IconMarker
                  Icon={Icon}
                  accent="sage"
                  size="sm"
                  className="bg-[var(--color-cream)]/[0.1] text-[var(--color-champagne)]"
                />
                <h3 className="mt-4 text-[0.98rem] font-semibold leading-5 text-[var(--color-cream)]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[0.82rem] leading-5 text-[var(--color-cream)]/70">
                  {item.body}
                </p>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-9 max-w-[780px] text-center text-[0.95rem] leading-7 text-[var(--color-champagne)]/88">
          {aboutContent.central.note}
        </p>
      </div>
    </section>
  );
}

function PrinciplesSection() {
  return (
    <section className="bg-[var(--color-cream)] py-11 md:py-14">
      <div className="bcmc-container">
        <div className="grid gap-8 lg:grid-cols-[minmax(260px,0.28fr)_minmax(0,0.72fr)]">
          <div className="max-w-[420px]">
            <h2 className="bcmc-type-section-compact text-[var(--color-forest-900)]">
              {aboutContent.principles.heading}
            </h2>
            <p className="mt-5 text-[0.96rem] leading-7 text-[var(--color-stone)]">
              {aboutContent.principles.body}
            </p>
          </div>
          <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
            {aboutContent.principles.items.map((item) => {
              const Icon = principleIcons[item.id];

              return (
                <article key={item.id} className="grid grid-cols-[2.75rem_1fr] gap-4">
                  <IconMarker Icon={Icon} accent="lavender" size="sm" />
                  <div>
                    <h3 className="text-[0.98rem] font-semibold leading-5 text-[var(--color-forest-900)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[0.84rem] leading-5 text-[var(--color-stone)]">
                      {item.body}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function WaysInSection() {
  return (
    <section className="bg-[#F4EEE6] py-14 md:py-18">
      <div className="bcmc-container">
        <div className="mx-auto max-w-[760px] text-center">
          <h2 className="bcmc-type-section-primary text-[var(--color-forest-900)]">
            {aboutContent.waysIn.heading}
          </h2>
          <p className="mt-4 text-[1.05rem] leading-7 text-[var(--color-stone)]">
            {aboutContent.waysIn.body}
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {aboutContent.waysIn.paths.map((path) => {
            const accent =
              path.id === "support" ? "sage" : path.id === "counsellor" ? "lavender" : "peach";
            const Icon =
              path.id === "support" ? UserRound : path.id === "counsellor" ? UsersRound : Building2;

            return (
              <article key={path.id} className={`rounded-[var(--radius-lg)] p-6 shadow-sm ${accentStyles[accent].surface}`}>
                <IconMarker Icon={Icon} accent={accent} size="lg" />
                <h3 className="mt-5 text-[1.15rem] font-semibold text-[var(--color-forest-900)]">
                  {path.title}
                </h3>
                <p className="mt-3 min-h-12 text-[0.92rem] leading-6 text-[var(--color-stone)]">
                  {path.body}
                </p>
                <div className="mt-7">
                  <Button href={path.href} variant="light">
                    {path.cta}
                    <span className="ml-2" aria-hidden="true">
                      →
                    </span>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BoundaryPanel({
  title,
  items,
  Icon,
  accent,
}: {
  title: string;
  items: readonly string[];
  Icon: LucideIcon;
  accent: Accent;
}) {
  return (
    <article className={`rounded-[var(--radius-lg)] p-6 ${accentStyles[accent].surface}`}>
      <h3 className="text-[1.08rem] font-semibold text-[var(--color-forest-900)]">{title}</h3>
      <ul className="mt-5 grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-[0.9rem] leading-6 text-[var(--color-ink)]/78">
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-cream)]/84">
              <Icon className={`h-3.5 w-3.5 ${accentStyles[accent].icon}`} aria-hidden="true" />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function IconMarker({
  Icon,
  accent,
  size = "md",
  className = "",
}: {
  Icon: LucideIcon;
  accent: Accent;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dimensions = {
    sm: "h-11 w-11",
    md: "h-14 w-14",
    lg: "h-16 w-16",
    xl: "h-20 w-20",
  };
  const iconSize = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-7 w-7",
    xl: "h-8 w-8",
  };

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${dimensions[size]} ${accentStyles[accent].circle} ${accentStyles[accent].icon} ${className}`}
    >
      <Icon className={`${iconSize[size]} stroke-[1.7]`} aria-hidden="true" />
    </span>
  );
}
