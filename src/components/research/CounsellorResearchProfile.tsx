import Link from "next/link";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronDown,
  Languages,
  MapPin,
  Phone,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  aminaNarrativeVariants,
  type NarrativeVariant,
} from "@/data/aminaResearchProfile";

type Counsellor = {
  name: string;
  designation: string;
  credentialLabel: string;
  verification: {
    label: string;
    displayDate: string;
    fullDisplayDate: string;
    provenance: string;
  };
  gender: string;
  muslimSelfIdentification: boolean;
  availability: {
    status: string;
    confirmedDisplay: string;
    fullConfirmedDisplay: string;
    waitlist: string;
    broadSchedule: string;
  };
  location: {
    city: string;
    province: string;
    area: string;
    inPerson: boolean;
    virtual: boolean;
    virtualScope: string;
  };
  accessibility: {
    practicalWording: string;
  };
  languages: {
    therapy: readonly string[];
    conversational: readonly string[];
  };
  fees: {
    standard: number;
    currency: string;
    sessionMinutes: number;
    slidingScale: string;
    rccReceipts: boolean;
    directBilling: boolean;
    insuranceWording: string;
  };
  consultation: {
    durationMinutes: number;
  };
  primaryAreas: readonly string[];
  additionalExperience: readonly string[];
  workingStyle: {
    heading: string;
    facts: readonly string[];
  };
  firstSession: {
    heading: string;
    body: string;
  };
  faithCulture: {
    heading: string;
    body: string;
    supportingLine: string;
    culturalFamiliarity: string;
  };
  professional: {
    designation: string;
    credentialStatus: string;
    education: {
      degree: string;
      institution: string;
    };
    experience: string;
    approaches: readonly string[];
  };
  practice: {
    name: string;
    type: string;
  };
  contact: {
    heading: string;
    body: string;
    ctaLabel: string;
    handoff: string;
  };
};

type CounsellorResearchProfileProps = {
  counsellor: Counsellor;
  narrativeVariant: NarrativeVariant;
};

export function CounsellorResearchProfile({
  counsellor,
  narrativeVariant,
}: CounsellorResearchProfileProps) {
  const narrative = aminaNarrativeVariants[narrativeVariant];
  const locationLabel = `${counsellor.location.city}, ${counsellor.location.province}`;
  const formatLabel = [
    counsellor.location.inPerson ? "In person" : null,
    counsellor.location.virtual ? "Virtual" : null,
  ]
    .filter(Boolean)
    .join(" + ");
  const heroFacts = [
    { icon: MapPin, text: `${locationLabel} · ${formatLabel}` },
    { icon: UsersRound, text: "Adults · Individual counselling" },
    {
      icon: Languages,
      text: `Therapy in ${formatList(counsellor.languages.therapy)}`,
    },
    {
      icon: BriefcaseBusiness,
      text: `$${counsellor.fees.standard} · ${counsellor.fees.sessionMinutes} minutes`,
    },
  ] as const;

  return (
    <main
      className="min-h-screen bg-[var(--color-cream)] pb-16 pt-8 text-[var(--color-ink)] md:pb-20 md:pt-10"
      data-narrative-variant={narrativeVariant}
    >
      <div className="bcmc-container">
        <Link
          href="/research/profiles"
          className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
        >
          <span aria-hidden="true" className="mr-2">
            ←
          </span>
          Back to counsellors
        </Link>

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
          <div className="space-y-7">
            <section
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 p-5 shadow-sm md:p-7"
              data-research="profile-hero"
            >
              <div className="grid gap-6 md:grid-cols-[164px_minmax(0,1fr)] md:items-start">
                <div className="flex h-40 w-40 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-mist)] font-serif text-4xl text-[var(--color-forest-900)] md:h-[164px] md:w-[164px]">
                  <span aria-hidden="true">AR</span>
                  <span className="sr-only">Amina Rahman profile placeholder</span>
                </div>

                <div className="min-w-0">
                  <p className="bcmc-eyebrow text-[var(--color-leaf)]">
                    {counsellor.credentialLabel}
                  </p>
                  <h1 className="mt-3 font-serif text-4xl leading-[1.06] text-[var(--color-forest-900)] md:text-5xl">
                    {counsellor.name}, {counsellor.designation}
                  </h1>
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-evergreen)]">
                    <BadgeCheck className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
                    {counsellor.verification.label}
                  </p>

                  <p className="mt-5 inline-flex rounded-[var(--radius-sm)] bg-[var(--color-mist)] px-3 py-2 text-sm font-semibold text-[var(--color-forest-900)]">
                    {counsellor.availability.status} · Confirmed{" "}
                    {counsellor.availability.confirmedDisplay}
                  </p>

                  <dl className="mt-6 grid gap-3 text-sm font-medium leading-6 text-[var(--color-stone)] sm:grid-cols-2">
                    {heroFacts.map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-start gap-2.5">
                        <Icon
                          className="mt-0.5 h-4.5 w-4.5 shrink-0 stroke-[1.7] text-[var(--color-leaf)]"
                          aria-hidden="true"
                        />
                        <dt className="sr-only">{text}</dt>
                        <dd>{text}</dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-6 text-sm font-semibold text-[var(--color-forest-900)]">
                    Free 15-minute consultation
                  </p>
                </div>
              </div>
            </section>

            <SectionCard
              title="Primary practice areas"
              dataResearch="primary-practice-areas"
            >
              <ul className="grid gap-3 sm:grid-cols-3">
                {counsellor.primaryAreas.map((area) => (
                  <li
                    key={area}
                    className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-mist)] px-4 py-3 text-sm font-semibold leading-5 text-[var(--color-forest-900)]"
                  >
                    {area}
                  </li>
                ))}
              </ul>

              <details className="group mt-5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-[var(--color-forest-900)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] [&::-webkit-details-marker]:hidden">
                  Additional experience
                  <ChevronDown
                    className="h-4 w-4 shrink-0 stroke-[1.8] transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <ul className="grid gap-2 border-t border-[var(--color-border)] px-4 py-4 text-sm leading-6 text-[var(--color-stone)] sm:grid-cols-3">
                  {counsellor.additionalExperience.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            </SectionCard>

            <SectionCard title={null} dataResearch="narrative-region">
              <div className="space-y-7">
                {narrative.sections.map((section) => (
                  <section key={section.heading}>
                    <h2 className="font-serif text-3xl leading-[1.1] text-[var(--color-forest-900)]">
                      {section.heading}
                    </h2>
                    <div className="bcmc-type-body mt-4 space-y-5 text-[var(--color-ink)]/84">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title={counsellor.faithCulture.heading}
              dataResearch="faith-culture"
            >
              <div className="bcmc-type-body space-y-4 text-[var(--color-ink)]/84">
                <p>{counsellor.faithCulture.body}</p>
                <p>{counsellor.faithCulture.supportingLine}</p>
                <p>{counsellor.faithCulture.culturalFamiliarity}</p>
              </div>
            </SectionCard>

            <SectionCard title="Practical details" dataResearch="practical-details">
              <dl className="grid gap-4 sm:grid-cols-2">
                <PracticalDetail title="Availability">
                  <p>{counsellor.availability.status}</p>
                  <p>Confirmed {counsellor.availability.confirmedDisplay}</p>
                  <p>{counsellor.availability.waitlist}</p>
                  <p>{counsellor.availability.broadSchedule}</p>
                </PracticalDetail>
                <PracticalDetail title="Format">
                  <p>{formatLabel}</p>
                </PracticalDetail>
                <PracticalDetail title="Location">
                  <p>{locationLabel}</p>
                  <p>{counsellor.location.area}</p>
                  <p>
                    Virtual counselling across{" "}
                    {counsellor.location.virtualScope === "British Columbia"
                      ? "BC"
                      : counsellor.location.virtualScope}
                  </p>
                </PracticalDetail>
                <PracticalDetail title="Client type">
                  <p>Adults</p>
                  <p>Individual counselling</p>
                </PracticalDetail>
                <PracticalDetail title="Therapy languages">
                  {counsellor.languages.therapy.map((language) => (
                    <p key={language}>{language}</p>
                  ))}
                </PracticalDetail>
                <PracticalDetail title="Other language">
                  <p>Punjabi - conversational</p>
                </PracticalDetail>
                <PracticalDetail title="Standard session">
                  <p>
                    ${counsellor.fees.standard} · {counsellor.fees.sessionMinutes}{" "}
                    minutes
                  </p>
                </PracticalDetail>
                <PracticalDetail title="Financial access">
                  <p>{counsellor.fees.insuranceWording}</p>
                </PracticalDetail>
                <PracticalDetail title="Sliding scale">
                  <p>{counsellor.fees.slidingScale}</p>
                </PracticalDetail>
                <PracticalDetail title="Accessibility">
                  <p>{counsellor.accessibility.practicalWording}</p>
                </PracticalDetail>
                <PracticalDetail title="Practice">
                  <p>{counsellor.practice.name}</p>
                  <p>{counsellor.practice.type}</p>
                </PracticalDetail>
                <PracticalDetail title="Consultation">
                  <p>Free · {counsellor.consultation.durationMinutes} minutes</p>
                </PracticalDetail>
              </dl>
            </SectionCard>

            <section
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 shadow-sm"
              data-research="professional-details"
            >
              <details className="group">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-serif text-2xl leading-[1.1] text-[var(--color-forest-900)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] md:px-7 [&::-webkit-details-marker]:hidden">
                  Professional details
                  <ChevronDown
                    className="h-5 w-5 shrink-0 stroke-[1.8] transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="border-t border-[var(--color-border)] px-5 py-5 md:px-7">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <PracticalDetail title="Professional designation">
                      <p>{counsellor.professional.designation}</p>
                    </PracticalDetail>
                    <PracticalDetail title="Credential status">
                      <p>{counsellor.professional.credentialStatus}</p>
                      <p>{counsellor.verification.provenance}</p>
                    </PracticalDetail>
                    <PracticalDetail title="Education">
                      <p>{counsellor.professional.education.degree}</p>
                      <p>{counsellor.professional.education.institution}</p>
                    </PracticalDetail>
                    <PracticalDetail title="Experience">
                      <p>{counsellor.professional.experience}</p>
                    </PracticalDetail>
                    <PracticalDetail title="Approaches">
                      {counsellor.professional.approaches.map((approach) => (
                        <p key={approach}>{approach}</p>
                      ))}
                    </PracticalDetail>
                  </dl>
                </div>
              </details>
            </section>
          </div>

          <aside className="lg:sticky lg:top-8">
            <section
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-forest-900)] p-5 text-[var(--color-cream)] shadow-sm md:p-6"
              data-research="contact-cta"
            >
              <Phone className="h-5 w-5 stroke-[1.8] text-[var(--color-champagne)]" />
              <h2 className="mt-4 font-serif text-3xl leading-[1.1]">
                {counsellor.contact.heading}
              </h2>
              <p className="mt-4 text-sm leading-6 text-[var(--color-cream)]/84">
                {counsellor.contact.body}
              </p>
              <div className="mt-6">
                <Button
                  href={`/research/profile/amina/contact?variant=${narrativeVariant}`}
                  variant="light"
                >
                  {counsellor.contact.ctaLabel}
                </Button>
              </div>
              <p className="mt-5 border-t border-white/14 pt-5 text-xs leading-5 text-[var(--color-cream)]/72">
                {counsellor.contact.handoff}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SectionCard({
  title,
  dataResearch,
  children,
}: {
  title: string | null;
  dataResearch: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 p-5 shadow-sm md:p-7"
      data-research={dataResearch}
    >
      {title ? (
        <h2 className="mb-5 font-serif text-3xl leading-[1.1] text-[var(--color-forest-900)]">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

function PracticalDetail({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-leaf)]">
        {title}
      </dt>
      <dd className="mt-2 text-sm leading-6 text-[var(--color-ink)]/82">
        {children}
      </dd>
    </div>
  );
}

function formatList(items: readonly string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
