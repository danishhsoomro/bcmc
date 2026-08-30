import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Accessibility,
  ArrowRight,
  Banknote,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Compass,
  CircleDollarSign,
  FileCheck2,
  GraduationCap,
  HeartHandshake,
  Languages,
  ListChecks,
  MapPin,
  MessageCircle,
  Monitor,
  ShieldCheck,
  Video,
} from "lucide-react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import {
  ContactHandoff,
  type ContactHandoffConsultation,
  type ContactHandoffRoute,
} from "@/components/counsellors/ContactHandoff";
import { DisclosureTooltip } from "@/components/ui/DisclosureTooltip";
import { evaluateFreshness, freshnessPolicies } from "@/lib/freshness";
import { createProfileImageSignedUrl } from "@/lib/supabase/admin-storage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { Json, Database } from "../../../../supabase/database.types";

type CounsellorProfileRow =
  Database["public"]["Views"]["v_counsellor_profiles_app"]["Row"];

type JsonRecord = { [key: string]: Json | undefined };

type ProfileImage = {
  altText: string | null;
  focalX: number | null;
  focalY: number | null;
  storagePath: string;
};

type DisplayFact = {
  label: string;
  value: string;
};

type DetailValue = {
  text: string;
  tooltip?: string | null;
};

type ContactRoute = {
  confirmedAt: string | null;
  displayLabel: string | null;
  freshness: ReturnType<typeof evaluateFreshness>;
  href: string | null;
  isInvalid: boolean;
  handoffKey: string | null;
  routeTypeKey: string | null;
};

type PracticeContext = {
  name: string;
  type: string | null;
};

type FaithPresentation = {
  discussion: {
    text: string;
  } | null;
  initiation: string | null;
  integration: {
    support: string | null;
    text: string;
  } | null;
  islamicCounselling: string | null;
  showDecisionRows: boolean;
};

type WorkingStyleItem = {
  definitionLabel: string;
  label: string;
};

type AvailabilityView = {
  label: string;
  tooltip: string | null;
};

type CredentialVerificationView = {
  label: string | null;
  tooltip: string | null;
};

const profileImageSignedUrlTtlSeconds = 60 * 60;

export default async function CounsellorProfilePage(
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  const profile = await getCounsellorProfile(slug);

  if (!profile) {
    notFound();
  }

  const profileImage = getProfileImage(profile.profile_image);
  const portraitUrl = profileImage
    ? await createProfileImageSignedUrl(
        profileImage.storagePath,
        profileImageSignedUrlTtlSeconds,
      )
    : null;

  const view = buildProfileView(profile);

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)]">
      <Header />
      <main>
        <section className="relative isolate overflow-hidden bg-[var(--color-cream)] pt-26 md:pt-32">
          <div className="bcmc-container pb-5 md:pb-7">
            <Link
              href="/find"
              className="inline-flex min-h-10 items-center rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              Back to finding support
            </Link>
          </div>

          <div className="bcmc-container pb-12 md:pb-16">
            <div className="grid overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white/88 shadow-[0_22px_70px_rgba(18,60,50,0.08)] lg:grid-cols-[minmax(310px,0.82fr)_minmax(0,1.28fr)]">
              <div className="relative min-h-[330px] overflow-hidden bg-[linear-gradient(145deg,var(--color-mist),var(--color-sand))] md:min-h-[430px] lg:min-h-[520px]">
                {portraitUrl ? (
                  <>
                    {/* Signed private Storage URLs are intentionally rendered directly. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={portraitUrl}
                      alt={profileImage?.altText ?? view.displayName}
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: getObjectPosition(profileImage),
                      }}
                    />
                  </>
                ) : (
                  <div className="flex h-full min-h-[360px] items-center justify-center">
                    <div
                      className="flex h-28 w-28 items-center justify-center rounded-full border border-[var(--color-champagne)] bg-[var(--color-cream)] font-serif text-4xl text-[var(--color-forest-900)]"
                      aria-hidden="true"
                    >
                      {view.initials}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center px-6 py-8 md:px-9 md:py-10 lg:px-12">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-sage)]/80 bg-[var(--color-mist)] px-3 py-1.5 text-[0.68rem] font-bold uppercase leading-none tracking-[0.16em] text-[var(--color-forest-900)]">
                  <span
                    className="h-2 w-2 rounded-full bg-[var(--color-leaf)]"
                    aria-hidden="true"
                  />
                  <span>{view.availability.label}</span>
                  {view.availability.tooltip ? (
                    <DisclosureTooltip label="Availability confirmation information">
                      {view.availability.tooltip}
                    </DisclosureTooltip>
                  ) : null}
                </div>

                <h1 className="mt-5 font-serif text-[clamp(3rem,2.5rem+2.4vw,4.35rem)] leading-[1.01] tracking-normal text-[var(--color-forest-900)]">
                  {view.displayName}
                </h1>

                {view.credentialSubtitle ? (
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[1.02rem] font-medium leading-7 text-[var(--color-ink)]/74 md:text-[1.12rem]">
                    <span>
                      {view.primaryCredentialCode
                        ? `${view.primaryCredentialCode} · ${view.credentialSubtitle}`
                        : view.credentialSubtitle}
                    </span>
                    {view.credentialVerification.tooltip ? (
                      <DisclosureTooltip label="RCC status information">
                        {view.credentialVerification.tooltip}
                      </DisclosureTooltip>
                    ) : null}
                  </p>
                ) : null}

                <div className="mt-7 grid gap-x-7 gap-y-3.5 text-[0.92rem] leading-5 text-[var(--color-ink)]/82 sm:grid-cols-2">
                  {view.heroFacts.map((fact) => (
                    <HeroFact key={fact.label} fact={fact} />
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <ContactHandoff
                    className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-forest-900)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
                    consultation={view.contactHandoff.consultation}
                    practicePossessivePronoun={view.practicePossessivePronoun}
                    preferredName={view.preferredName}
                    route={view.contactHandoff.route}
                  >
                    Contact {view.preferredName}
                  </ContactHandoff>
                  <a
                    href="#people-often"
                    className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
                  >
                    Read profile
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {view.consultationSummary ? (
          <section className="border-y border-[var(--color-forest-900)]/10 bg-[#F4EEE6]">
            <div className="bcmc-container py-5 md:py-6">
              <div className="flex max-w-[1040px] flex-col gap-3 md:flex-row md:items-center md:gap-5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-mist)] text-[var(--color-leaf)]"
                  aria-hidden="true"
                >
                  <MessageCircle className="h-4.5 w-4.5 stroke-[1.8]" />
                </div>
                <div>
                  <h2 className="font-serif text-[clamp(1.3rem,1.18rem+0.42vw,1.62rem)] leading-[1.18] text-[var(--color-forest-900)]">
                    Reaching out does not commit you to ongoing counselling.
                  </h2>
                  <p className="mt-1.5 max-w-[720px] text-[0.88rem] leading-6 text-[var(--color-stone)]">
                    {view.heroReassuranceSupport}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <div className="bcmc-container py-10 md:py-14 lg:py-16">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="overflow-hidden border-y border-[var(--color-border)] bg-white/72">
              {view.peopleOftenComeToMeWhen ||
              view.primaryPracticeAreas.length > 0 ? (
                <SectionShell id="people-often" title="People often come to me when...">
                  {view.peopleOftenComeToMeWhen ? (
                    <p className="max-w-3xl text-[0.96rem] leading-[1.6] text-[var(--color-stone)]">
                      {view.peopleOftenComeToMeWhen}
                    </p>
                  ) : null}

                  {view.primaryPracticeAreas.length > 0 ? (
                    <div className="mt-7 grid gap-4 lg:grid-cols-3">
                      {view.primaryPracticeAreas.map((area) => (
                        <article
                          key={area.label}
                          className="flex min-h-[150px] flex-col rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)]/70 p-5 shadow-[0_8px_22px_rgba(18,60,50,0.03)]"
                        >
                          <h3 className="text-[1rem] font-semibold leading-[1.35] text-[var(--color-forest-900)]">
                            {area.label}
                          </h3>
                          {area.description ? (
                            <p className="mt-2.5 text-[0.9rem] leading-[1.55] text-[var(--color-stone)]">
                              {area.description}
                            </p>
                          ) : null}
                          {area.scopeClarification ? (
                            <p className="mt-3 text-[0.84rem] leading-[1.5] text-[var(--color-stone)]">
                              {area.scopeClarification}
                            </p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : null}

                  {view.additionalPracticeAreas.length > 0 ? (
                    <div className="mt-7 border-t border-[var(--color-border)] pt-5">
                      <h3 className="text-[0.68rem] font-bold uppercase leading-4 tracking-[0.16em] text-[var(--color-leaf)]">
                        Also supports
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {view.additionalPracticeAreas.map((area) => (
                          <span
                            key={area.label}
                            className="rounded-full border border-[var(--color-border)] bg-white/70 px-3 py-1.5 text-[0.84rem] font-medium leading-5 text-[var(--color-ink)]/76"
                          >
                            {area.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </SectionShell>
              ) : null}

              {view.workingStyleGroups.length > 0 ? (
                <SectionShell title="What working together can feel like" tone="soft-green">
                  <p className="max-w-2xl text-[0.96rem] leading-[1.58] text-[var(--color-stone)]">
                    These are standardized BCMC descriptions based on how this
                    counsellor reports working with clients. They are not rankings
                    or a score.
                  </p>
                  <div className="mt-7 grid gap-4 md:grid-cols-2">
                    {view.workingStyleGroups.map((group) => (
                      <article
                        key={group.label}
                        className="grid min-h-[118px] grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[var(--radius-sm)] border border-[var(--color-sage)]/65 bg-white/78 p-4.5"
                      >
                        <WorkingStyleIcon label={group.label} />
                        <div>
                          <h3 className="text-[0.68rem] font-medium uppercase leading-4 tracking-[0.16em] text-[var(--color-leaf)]">
                            {group.label}
                          </h3>
                          <WorkingStyleValues values={group.values} />
                        </div>
                      </article>
                    ))}
                  </div>
                </SectionShell>
              ) : null}

              {view.firstMeetingExpectation ? (
                <SectionShell
                  title="What you can expect when we first meet"
                  variant="interlude"
                >
                  <p className="max-w-[42rem] text-[1.04rem] leading-[1.68] text-[var(--color-forest-900)]">
                    {view.firstMeetingExpectation}
                  </p>
                </SectionShell>
              ) : null}

              {view.faith ? (
                <SectionShell title="Faith in counselling" tone="warm-cream">
                  {view.faith?.discussion ? (
                    <div>
                      <h3 className="text-[0.9rem] font-semibold leading-[1.42] text-[var(--color-forest-900)]">
                        Can I talk about faith here?
                      </h3>
                      <FaithAnswer text={view.faith.discussion.text} />
                      {view.faith.initiation ? (
                        <p className="mt-2.5 max-w-3xl text-[0.88rem] leading-[1.58] text-[var(--color-stone)]">
                          {view.faith.initiation}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {view.faith.showDecisionRows ? (
                    <>
                      {view.faith.integration ? (
                        <div className="mt-7 border-t border-[var(--color-forest-900)]/12 pt-6">
                          <h3 className="text-[0.9rem] font-semibold leading-[1.42] text-[var(--color-forest-900)]">
                            Can my faith actively shape the therapy itself?
                          </h3>
                          <FaithAnswer text={view.faith.integration.text} />
                          {view.faith.integration.support ? (
                            <p className="mt-2.5 max-w-3xl text-[0.88rem] leading-[1.58] text-[var(--color-stone)]">
                              {view.faith.integration.support}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {view.faith.islamicCounselling ? (
                        <div className="mt-7 grid gap-2 border-t border-[var(--color-forest-900)]/12 pt-6 md:grid-cols-[190px_minmax(0,1fr)] md:gap-5">
                          <h3 className="text-[0.68rem] font-semibold uppercase leading-4 tracking-[0.16em] text-[var(--color-leaf)]">
                            Islamic counselling
                          </h3>
                          <p className="text-[0.88rem] leading-[1.58] text-[var(--color-stone)]">
                            {view.faith.islamicCounselling}
                          </p>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </SectionShell>
              ) : null}

              {view.culturalFamiliarity.length > 0 ? (
                <SectionShell
                  title="Cultural & community familiarity"
                  variant="supporting"
                >
                  <p className="max-w-3xl text-[0.96rem] leading-[1.58] text-[var(--color-stone)]">
                    {view.preferredName} reports familiarity with these cultural,
                    family and community contexts. They can provide useful context
                    without assuming everyone from a community has the same
                    experience.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {view.culturalFamiliarity.map((item) => (
                      <span
                        key={item.label}
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-cream)]/58 px-3 py-1.5 text-[0.86rem] font-medium leading-5 text-[var(--color-ink)]/76"
                      >
                        {item.label}
                      </span>
                    ))}
                  </div>
                </SectionShell>
              ) : null}

              <SectionShell
                title="Practical details"
                tone="green-cream"
                variant="major-spaced"
              >
                <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
                  {view.detailGroups.map((group) => (
                    <PracticalDetailCard key={group.label} group={group} />
                  ))}
                </div>
              </SectionShell>

              <SectionShell title="Professional background" variant="evidence">
                <p className="max-w-2xl text-[0.96rem] leading-[1.58] text-[var(--color-stone)]">
                  Credentials and experience that inform my practice.
                </p>
                <div className="mt-6 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                  {view.professionalGroups.map((group) => (
                    <details key={group.label} className="group">
                      <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[0.98rem] font-semibold text-[var(--color-forest-900)] marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]">
                        <span className="flex items-center gap-3">
                          <ProfessionalIcon label={group.label} />
                          {group.label}
                        </span>
                        <span
                          className="text-xl leading-none text-[var(--color-leaf)] transition-transform group-open:rotate-45"
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </summary>
                      <ul className="grid gap-2 pb-5 pl-8 text-[0.91rem] leading-[1.55] text-[var(--color-ink)]/78 md:pl-9">
                        {group.values.map((value) => (
                          <li key={detailValueText(value)}>
                            {detailValueText(value)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </SectionShell>
            </div>

            <aside className="grid gap-4">
              <SidebarCard title="Thinking about reaching out?">
                {view.contactHandoff.consultation?.isFree ? (
                  <p className="text-[0.9rem] leading-6 text-[var(--color-stone)]">
                    A free {view.contactHandoff.consultation.minutes}-minute
                    consultation is available.
                  </p>
                ) : null}
                <ContactHandoff
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-forest-900)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
                  consultation={view.contactHandoff.consultation}
                  practicePossessivePronoun={view.practicePossessivePronoun}
                  preferredName={view.preferredName}
                  route={view.contactHandoff.route}
                >
                  <span>Contact {view.preferredName}</span>
                  <ArrowRight className="h-3.5 w-3.5 stroke-[1.8]" aria-hidden="true" />
                </ContactHandoff>
                <ContactHandoff
                  className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
                  consultation={view.contactHandoff.consultation}
                  practicePossessivePronoun={view.practicePossessivePronoun}
                  preferredName={view.preferredName}
                  route={view.contactHandoff.route}
                >
                  <span>What happens when I reach out?</span>
                  <ArrowRight className="h-3.5 w-3.5 stroke-[1.8]" aria-hidden="true" />
                </ContactHandoff>
                {view.contactFreshnessNote ? (
                  <p className="mt-3 text-xs leading-5 text-[var(--color-stone)]">
                    {view.contactFreshnessNote}
                  </p>
                ) : null}
              </SidebarCard>

              {view.practiceContext ? (
                <SidebarCard title={`About ${view.preferredName}'s practice`}>
                  <p className="text-[0.9rem] leading-6 text-[var(--color-stone)]">
                    <span className="font-semibold text-[var(--color-forest-900)]">
                      {view.practiceContext.name}
                    </span>
                    {view.practiceContext.type ? (
                      <>
                        <br />
                        {view.practiceContext.type}
                      </>
                    ) : null}
                  </p>
                </SidebarCard>
              ) : null}

            </aside>
          </div>
        </div>

        <section id="contact" className="bg-[var(--color-cream)] pb-12 text-[var(--color-cream)] md:pb-16">
          <div className="bcmc-container">
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-forest-900)] px-6 py-9 shadow-[0_18px_54px_rgba(18,60,50,0.16)] md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8 md:px-9 md:py-10 lg:px-12">
              <div>
                <h2 className="font-serif text-[clamp(2rem,1.74rem+1vw,3rem)] leading-[1.06] tracking-normal">
                  Think {view.preferredName} might be worth talking to?
                </h2>
                <p className="mt-4 max-w-2xl text-[0.98rem] leading-7 text-[var(--color-cream)]/78">
                  You don&apos;t need to decide whether {view.subjectPronoun} is the
                  right counsellor before reaching out.
                </p>
                {view.contactRoute?.isInvalid ? (
                  <p className="mt-4 flex max-w-2xl gap-3 rounded-[var(--radius-md)] border border-[var(--color-champagne)]/25 bg-white/[0.07] px-4 py-3 text-sm leading-6 text-[var(--color-cream)]/78">
                    <CircleAlert
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 stroke-[1.8] text-[var(--color-champagne)]"
                      aria-hidden="true"
                    />
                    This profile is using a staging contact destination, so the
                    contact button is disabled for review.
                  </p>
                ) : null}
                {view.contactFreshnessNote ? (
                  <p className="mt-4 text-sm leading-6 text-[var(--color-cream)]/70">
                    {view.contactFreshnessNote}
                  </p>
                ) : null}
              </div>

              <div className="mt-7 md:mt-0">
                <ContactHandoff
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-cream)] px-7 py-3 text-sm font-semibold text-[var(--color-forest-900)] shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-champagne)] md:w-auto"
                  consultation={view.contactHandoff.consultation}
                  practicePossessivePronoun={view.practicePossessivePronoun}
                  preferredName={view.preferredName}
                  route={view.contactHandoff.route}
                >
                  Contact {view.preferredName}
                </ContactHandoff>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

async function getCounsellorProfile(slug: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("v_counsellor_profiles_app")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data satisfies CounsellorProfileRow | null;
}

function HeroFact({ fact }: { fact: DisplayFact }) {
  return (
    <div className="flex items-start gap-2.5">
      <HeroFactIcon label={fact.label} />
      <p className="font-medium">
        <span className="sr-only">{fact.label}: </span>
        {fact.value}
      </p>
    </div>
  );
}

function HeroFactIcon({ label }: { label: string }) {
  const className =
    "mt-0.5 h-4.5 w-4.5 shrink-0 stroke-[1.8] text-[var(--color-leaf)]";

  if (label === "Location") {
    return <MapPin className={className} aria-hidden="true" />;
  }

  if (label === "Format") {
    return <Video className={className} aria-hidden="true" />;
  }

  if (label === "Works with") {
    return <HeartHandshake className={className} aria-hidden="true" />;
  }

  if (label === "Languages") {
    return <Languages className={className} aria-hidden="true" />;
  }

  if (label === "Fee") {
    return <Banknote className={className} aria-hidden="true" />;
  }

  return <CheckCircle2 className={className} aria-hidden="true" />;
}

function SectionShell({
  children,
  eyebrow,
  id,
  tone = "white",
  title,
  variant = "major",
}: {
  children: React.ReactNode;
  eyebrow?: string;
  id?: string;
  tone?: "green-cream" | "soft-green" | "warm-cream" | "white";
  title: string;
  variant?: "evidence" | "interlude" | "major" | "major-spaced" | "supporting";
}) {
  const toneClass = {
    "green-cream": "bg-[linear-gradient(180deg,rgba(238,245,241,0.5),rgba(248,245,240,0.42))]",
    "soft-green": "bg-[var(--color-mist)]/46",
    "warm-cream": "bg-[#F7F1E8]/42",
    white: "",
  }[tone];
  const variantClass = {
    evidence: "px-5 py-7 md:px-8 md:py-8 lg:px-11",
    interlude: "px-5 py-10 md:px-8 md:py-12 lg:px-11",
    major: "px-5 py-8 md:px-8 md:py-10 lg:px-11",
    "major-spaced": "px-5 py-9 md:px-8 md:py-12 lg:px-11",
    supporting: "px-5 py-7 md:px-8 md:py-8 lg:px-11",
  }[variant];
  const boundaryClass = {
    evidence: "border-t border-[var(--color-border)]",
    interlude: "",
    major: "border-b border-[var(--color-border)]",
    "major-spaced": "border-y border-[var(--color-border)]",
    supporting: "",
  }[variant];
  const headingClass = {
    evidence: "text-[clamp(1.35rem,1.28rem+0.25vw,1.55rem)]",
    interlude: "text-[clamp(1.45rem,1.34rem+0.35vw,1.7rem)]",
    major: "text-[clamp(1.7rem,1.58rem+0.38vw,1.9rem)]",
    "major-spaced": "text-[clamp(1.7rem,1.58rem+0.38vw,1.9rem)]",
    supporting: "text-[clamp(1.35rem,1.28rem+0.25vw,1.55rem)]",
  }[variant];
  const headerGapClass =
    variant === "major" || variant === "major-spaced" ? "gap-4" : "gap-3";
  const contentClass =
    variant === "interlude"
      ? "mt-5 pl-0 md:pl-[3rem]"
      : variant === "supporting" || variant === "evidence"
        ? "mt-4 pl-0 md:pl-[2.6rem]"
        : "mt-6 pl-0 md:pl-[3rem]";

  return (
    <section
      id={id}
      className={`${variantClass} ${boundaryClass} ${toneClass}`}
    >
      <div className={`flex items-start ${headerGapClass}`}>
        <SectionIcon title={title} variant={variant} />
        <div className="min-w-0">
          {eyebrow ? (
            <p className="bcmc-eyebrow text-[var(--color-leaf)]">{eyebrow}</p>
          ) : null}
          <h2 className={`font-serif ${headingClass} leading-[1.12] tracking-normal text-[var(--color-forest-900)]`}>
            {title}
          </h2>
        </div>
      </div>
      <div className={contentClass}>{children}</div>
    </section>
  );
}

function SectionIcon({
  title,
  variant,
}: {
  title: string;
  variant: "evidence" | "interlude" | "major" | "major-spaced" | "supporting";
}) {
  const isMajor = variant === "major" || variant === "major-spaced";
  const className = isMajor
    ? "h-[18px] w-[18px] stroke-[1.8]"
    : "h-4 w-4 stroke-[1.8]";

  let Icon = HeartHandshake;

  if (title.includes("People")) {
    Icon = HeartHandshake;
  } else if (title.includes("working")) {
    Icon = Compass;
  } else if (title.includes("first meet")) {
    Icon = MessageCircle;
  } else if (title.includes("Faith")) {
    Icon = BookOpenCheck;
  } else if (title.includes("Cultural")) {
    Icon = Building2;
  } else if (title.includes("Practical")) {
    Icon = ListChecks;
  } else if (title.includes("Professional")) {
    Icon = ShieldCheck;
  }

  return (
    <span
      className={`${isMajor ? "h-[34px] w-[34px]" : "h-7 w-7"} mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-[var(--color-mist)] text-[var(--color-leaf)]`}
      aria-hidden="true"
    >
      <Icon className={className} />
    </span>
  );
}

function SidebarCard({
  children,
  id,
  title,
}: {
  children: React.ReactNode;
  id?: string;
  title: string;
}) {
  return (
    <section
      id={id}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white/86 p-5 shadow-[0_14px_46px_rgba(18,60,50,0.045)]"
    >
      <h2 className="font-serif text-[1.35rem] leading-tight text-[var(--color-forest-900)]">
        {title}
      </h2>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function WorkingStyleValues({ values }: { values: string[] }) {
  const [primaryValue, ...secondaryValues] = values;

  return (
    <div className="mt-2.5">
      {primaryValue ? (
        <p className="text-[0.875rem] font-semibold leading-[1.45] text-[var(--color-forest-900)]">
          {primaryValue}
        </p>
      ) : null}
      {secondaryValues.length > 0 ? (
        <ul className="mt-2 grid gap-1 text-[0.82rem] font-normal leading-[1.5] text-[var(--color-stone)]">
          {secondaryValues.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FaithAnswer({ text }: { text: string }) {
  const answer = splitFaithAnswer(text);

  return (
    <p className="mt-2.5 max-w-3xl text-[0.9rem] leading-[1.62] text-[var(--color-forest-900)]">
      {answer.lead ? (
        <span className="mr-1.5 font-semibold uppercase tracking-[0.08em] text-[var(--color-leaf)]">
          {answer.lead}
        </span>
      ) : null}
      {answer.rest}
    </p>
  );
}

function splitFaithAnswer(text: string) {
  const match = text.match(/^(Yes(?:, if you want)?\.?)\s*(.*)$/);

  if (!match) {
    return { lead: null, rest: text };
  }

  return {
    lead: match[1],
    rest: match[2],
  };
}

function PracticalDetailCard({
  group,
}: {
  group: { label: string; values: DetailValue[] };
}) {
  const [primaryValue, ...supportingValues] = group.values;

  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-[var(--color-border)] pt-5 first:border-t-0 first:pt-0 sm:[&:nth-child(-n+2)]:border-t-0 sm:[&:nth-child(-n+2)]:pt-0 xl:[&:nth-child(-n+3)]:border-t-0 xl:[&:nth-child(-n+3)]:pt-0">
      <PracticalIcon label={group.label} />
      <div className="min-w-0">
        <h3 className="text-[0.68rem] font-bold uppercase leading-4 tracking-[0.16em] text-[var(--color-leaf)]">
          {group.label}
        </h3>
        {primaryValue ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[0.98rem] font-semibold leading-[1.4] text-[var(--color-forest-900)]">
            <span>{detailValueText(primaryValue)}</span>
            {detailValueTooltip(primaryValue) ? (
              <DisclosureTooltip label={`${group.label} confirmation information`}>
                {detailValueTooltip(primaryValue)}
              </DisclosureTooltip>
            ) : null}
          </p>
        ) : null}
        {supportingValues.length > 0 ? (
          <ul className="mt-2.5 grid gap-1.5 text-[0.9rem] leading-[1.52] text-[var(--color-stone)]">
            {supportingValues.map((value) => (
              <li key={detailValueText(value)} className="inline-flex items-center gap-1.5">
                <span>{detailValueText(value)}</span>
                {detailValueTooltip(value) ? (
                  <DisclosureTooltip label={`${group.label} confirmation information`}>
                    {detailValueTooltip(value)}
                  </DisclosureTooltip>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

function PracticalIcon({ label }: { label: string }) {
  const className = "h-5 w-5 stroke-[1.8]";
  let Icon = ListChecks;

  if (label === "Location") {
    Icon = MapPin;
  } else if (label === "Virtual sessions") {
    Icon = Monitor;
  } else if (label === "Accessibility") {
    Icon = Accessibility;
  } else if (label === "Availability") {
    Icon = CalendarDays;
  } else if (label === "Fees and receipts") {
    Icon = CircleDollarSign;
  } else if (label === "Languages") {
    Icon = Languages;
  } else if (label === "Consultation") {
    Icon = MessageCircle;
  }

  return (
    <span
      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-[var(--color-leaf)]"
      aria-hidden="true"
    >
      <Icon className={className} />
    </span>
  );
}

function WorkingStyleIcon({ label }: { label: string }) {
  const className = "h-4.5 w-4.5 stroke-[1.8]";
  let Icon = Compass;

  if (label === "How sessions work") {
    Icon = ListChecks;
  } else if (label === "Between sessions") {
    Icon = FileCheck2;
  } else if (label === "Goals and feedback") {
    Icon = MessageCircle;
  }

  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-mist)] text-[var(--color-leaf)]"
      aria-hidden="true"
    >
      <Icon className={className} />
    </span>
  );
}

function ProfessionalIcon({ label }: { label: string }) {
  const className = "h-4 w-4 stroke-[1.8] text-[var(--color-leaf)]";
  let Icon = ShieldCheck;

  if (label === "Education") {
    Icon = GraduationCap;
  } else if (label === "Experience") {
    Icon = BriefcaseBusiness;
  } else if (label === "Approaches used") {
    Icon = BookOpenCheck;
  }

  return <Icon className={className} aria-hidden="true" />;
}

function toDetailValue(value: DetailValue | string | null | undefined): DetailValue {
  if (typeof value === "string") {
    return { text: value };
  }

  return value ?? { text: "" };
}

function detailValueText(value: DetailValue) {
  return value.text;
}

function detailValueTooltip(value: DetailValue) {
  return value.tooltip ?? null;
}

function buildProfileView(profile: CounsellorProfileRow) {
  const credentials = records(profile.credentials);
  const primaryCredential = credentials[0] ?? null;
  const locations = records(profile.locations);
  const serviceOfferings = records(profile.service_offerings);
  const feePolicies = records(profile.fee_policies);
  const availability = record(profile.availability);
  const contactProcess = record(profile.contact_process);
  const profileVoice = record(profile.profile_voice);
  const primaryPracticeAreasRaw = records(profile.practice_areas)
    .filter((area) => stringValue(area, "emphasis_key") === "primary")
    .map(readLabeledDescription);
  const additionalPracticeAreas = records(profile.practice_areas)
    .filter((area) => stringValue(area, "emphasis_key") !== "primary")
    .map(readLabeledDescription);
  const workingStyle = records(profile.working_style)
    .map((style) => ({
      definitionLabel: stringValue(style, "definition_label") ?? "Working style",
      label: stringValue(style, "public_label"),
    }))
    .filter((style): style is WorkingStyleItem => Boolean(style.label));
  const therapyLanguages = records(profile.language_capabilities)
    .filter((language) => stringValue(language, "capability_key") === "therapy")
    .map((language) => stringValue(language, "language_label"))
    .filter(isPresent);
  const conversationalLanguages = records(profile.language_capabilities)
    .filter(
      (language) => stringValue(language, "capability_key") === "conversational",
    )
    .map((language) => stringValue(language, "language_label"))
    .filter(isPresent);
  const contactRoute = getPrimaryContactRoute(records(profile.contact_routes));
  const locationSummary = summarizeLocations(locations, serviceOfferings);
  const deliveryModes = summarizeDeliveryModes(serviceOfferings);
  const feeSummary = summarizeFee(feePolicies);
  const clientGroups = uniqueLabelsFromNested(serviceOfferings, "client_groups");
  const serviceTypes = uniqueStrings(
    serviceOfferings.map((service) => stringValue(service, "service_type_label")),
  );
  const appointmentSummary = summarizeAppointmentWindows(
    records(profile.appointment_windows),
  );
  const accessibility = uniqueStrings(
    locations.flatMap((location) =>
      records(location.accessibility)
        .filter((item) => stringValue(item, "status_key") === "available")
        .map((item) => stringValue(item, "label")),
    ),
  );
  const virtualRegions = uniqueStrings(
    serviceOfferings.flatMap((service) =>
      records(service.virtual_regions).map((region) => stringValue(region, "label")),
    ),
  );
  const education = records(profile.education_records)
    .map((item) =>
      joinParts([
        stringValue(item, "degree_title"),
        stringValue(item, "institution_name"),
        numberValue(item, "completion_year")?.toString(),
      ]),
    )
    .filter(isPresent);
  const approaches = records(profile.therapeutic_approaches)
    .map(readLabeledDescription)
    .filter((item) => item.label);
  const professionalExperience = getProfessionalExperience(
    record(profile.professional_experience),
  );
  const trainingCertifications = records(profile.training_certifications)
    .map((item) => stringValue(item, "title"))
    .filter(isPresent);

  const displayName = profile.display_name ?? "Counsellor profile";
  const preferredName = profile.preferred_name ?? firstName(displayName);
  const primaryCredentialCode = formatCredentialCode(
    stringValue(primaryCredential, "credential_type_key"),
  );
  const availabilityView = profileAvailability(availability, preferredName, profile);
  const credentialVerificationView = credentialVerification(primaryCredential);
  const scopeSummary = joinScope(clientGroups, serviceTypes);
  const faith = mapFaithPresentation(record(profile.faith_practice_profile));
  const freeConsultation = getFreeConsultation(feePolicies, contactProcess);
  const primaryPracticeAreas = addPracticeAreaScopeClarification(
    primaryPracticeAreasRaw,
    preferredName,
    subjectPronoun(profile.gender_key),
    hasCouplesCounselling(serviceTypes),
  );

  const detailGroups = compactGroups([
    [
      "Location",
      compactStrings(locationDetails(locations)),
    ],
    [
      "Virtual sessions",
      compactStrings(virtualRegions.map((label) => `Available across ${label}`)),
    ],
    [
      "Accessibility",
      compactStrings(accessibility),
    ],
    [
      "Availability",
      [availabilityDetail(availabilityView), appointmentSummary],
    ],
    [
      "Fees and receipts",
      compactStrings([
        feeSummary.primary,
        feeSummary.freshnessNote,
        feeSummary.slidingScale,
        feeSummary.receipts,
        feeSummary.directBilling,
      ]),
    ],
    [
      "Languages",
      compactStrings([
        therapyLanguages.length ? `Therapy: ${joinList(therapyLanguages)}` : null,
        conversationalLanguages.length
          ? `Conversational: ${joinList(conversationalLanguages)}`
          : null,
      ]),
    ],
    [
      "Consultation",
      compactStrings([feeSummary.consultation, consultationMode(contactProcess)]),
    ],
  ]);

  return {
    additionalPracticeAreas,
    availability: availabilityView,
    contactHandoff: {
      consultation: freeConsultation,
      route: contactHandoffRoute(contactRoute),
    },
    contactRoute,
    contactFreshnessNote: contactFreshnessNote(contactRoute),
    consultationSummary: consultationSummary(feePolicies, contactProcess),
    credentialVerification: credentialVerificationView,
    credentialSubtitle: stringValue(primaryCredential, "credential_label"),
    culturalFamiliarity: records(profile.cultural_familiarity).map(
      readLabeledDescription,
    ),
    detailGroups,
    displayName,
    faith,
    firstMeetingExpectation: stringValue(
      profileVoice,
      "first_meeting_expectation",
    ),
    heroFacts: compactFacts([
      ["Location", locationSummary],
      ["Format", deliveryModes],
      ["Works with", scopeSummary],
      ["Languages", joinList(therapyLanguages)],
      ["Fee", feeSummary.displayPrimary],
    ]),
    initials: initials(displayName),
    heroReassuranceSupport: freeConsultation
      ? `A free ${freeConsultation.minutes}-minute consultation is available to ask questions and get a sense of fit.`
      : "You can ask questions and get a sense of fit before deciding what you would like to do next.",
    peopleOftenComeToMeWhen: stringValue(
      profileVoice,
      "people_often_come_to_me_when",
    ),
    practiceContext: getPracticeContext(records(profile.practice_affiliations)),
    practicePossessivePronoun: possessivePronounLower(profile.gender_key),
    preferredName,
    primaryCredentialCode,
    primaryPracticeAreas,
    subjectPronoun: subjectPronoun(profile.gender_key),
    professionalGroups: compactGroups([
      [
        "Credentials & verification",
        compactStrings([
          stringValue(primaryCredential, "credential_label"),
          stringValue(primaryCredential, "issuer_name"),
          credentialVerificationView.label,
        ]),
      ],
      ["Education", education],
      ["Experience", professionalExperience ? [professionalExperience] : []],
      [
        "Approaches used",
        approaches.map((approach) =>
          approach.description
            ? `${approach.label}: ${approach.description}`
            : approach.label,
        ),
      ],
      ["Training and certifications", trainingCertifications],
    ]),
    workingStyleGroups: groupWorkingStyle(workingStyle),
  };
}

function record(value: Json | null | undefined): JsonRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value;
}

function records(value: Json | null | undefined): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const itemRecord = record(item);
    return itemRecord ? [itemRecord] : [];
  });
}

function stringValue(
  source: JsonRecord | null | undefined,
  key: string,
): string | null {
  const value = source?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(
  source: JsonRecord | null | undefined,
  key: string,
): number | null {
  const value = source?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(
  source: JsonRecord | null | undefined,
  key: string,
): boolean | null {
  const value = source?.[key];
  return typeof value === "boolean" ? value : null;
}

function getProfileImage(value: Json | null): ProfileImage | null {
  const image = record(value);
  const storagePath = stringValue(image, "storage_path");

  if (!storagePath) {
    return null;
  }

  return {
    altText: stringValue(image, "alt_text"),
    focalX: numberValue(image, "focal_x"),
    focalY: numberValue(image, "focal_y"),
    storagePath,
  };
}

function getObjectPosition(image: ProfileImage | null) {
  const focalX = image?.focalX ?? 0.5;
  const focalY = image?.focalY ?? 0.5;

  return `${Math.round(focalX * 100)}% ${Math.round(focalY * 100)}%`;
}

function readLabeledDescription(source: JsonRecord) {
  return {
    description:
      stringValue(source, "short_description") ?? stringValue(source, "note"),
    label: stringValue(source, "label") ?? "",
  };
}

function addPracticeAreaScopeClarification(
  areas: ReturnType<typeof readLabeledDescription>[],
  preferredName: string,
  pronoun: string,
  offersCouplesCounselling: boolean,
): (ReturnType<typeof readLabeledDescription> & {
  scopeClarification?: string;
})[] {
  return areas.map((area) => {
    if (area.label !== "Family and relationship stress" || offersCouplesCounselling) {
      return area;
    }

    return {
      ...area,
      scopeClarification: `${preferredName} works with individuals on these concerns; ${pronoun} does not offer couples counselling.`,
    };
  });
}

function hasCouplesCounselling(serviceTypes: string[]) {
  return serviceTypes.some((label) => label.toLowerCase().includes("couples"));
}

function uniqueLabelsFromNested(sources: JsonRecord[], key: string) {
  return uniqueStrings(
    sources.flatMap((source) =>
      records(source[key]).map((item) => stringValue(item, "label")),
    ),
  );
}

function summarizeLocations(locations: JsonRecord[], services: JsonRecord[]) {
  const place = locations[0];
  const cityProvince = joinParts([
    stringValue(place, "city"),
    stringValue(place, "province"),
  ]);

  if (!cityProvince) {
    return null;
  }

  const hasVirtual = services.some(
    (service) => stringValue(service, "delivery_mode_key") === "virtual",
  );

  return hasVirtual ? `${cityProvince} and virtual` : cityProvince;
}

function locationDetails(locations: JsonRecord[]) {
  return uniqueStrings(
    locations.map((location) => {
      const label = stringValue(location, "label");

      if (label) {
        return label;
      }

      return joinParts([
        stringValue(location, "area"),
        stringValue(location, "city"),
        stringValue(location, "province"),
      ]);
    }),
  );
}

function summarizeDeliveryModes(services: JsonRecord[]) {
  return joinList(
    uniqueStrings(
      services
        .map((service) => formatDeliveryMode(stringValue(service, "delivery_mode_key")))
        .filter(isPresent),
    ),
  );
}

function summarizeFee(fees: JsonRecord[]) {
  const fee = fees[0] ?? null;
  const feeCents = numberValue(fee, "fee_cents");
  const minutes = numberValue(fee, "session_minutes");
  const consultationFeeCents = numberValue(fee, "consultation_fee_cents");
  const consultationMinutes = numberValue(fee, "consultation_minutes");
  const rccReceiptsAvailable = booleanValue(fee, "rcc_receipts_available");
  const freshness = evaluateFreshness(
    stringValue(fee, "confirmed_at"),
    freshnessPolicies.feePolicy,
  );
  const primary =
    feeCents && minutes
      ? `${formatMoney(feeCents)} / ${minutes} minutes`
      : feeCents
        ? formatMoney(feeCents)
        : null;
  const freshnessNote =
    freshness.state === "stale" && freshness.confirmedDateText
      ? `Fee last confirmed ${freshness.confirmedDateText}`
      : null;

  return {
    consultation:
      consultationFeeCents === 0 && consultationMinutes
        ? `Free ${consultationMinutes}-minute consultation`
        : consultationMinutes
          ? `${consultationMinutes}-minute consultation`
          : null,
    consultationFeeCents,
    consultationMinutes,
    directBilling: directBillingLabel(stringValue(fee, "direct_billing_key")),
    displayPrimary:
      primary && freshnessNote ? `${primary} · ${freshnessNote}` : primary,
    freshness,
    freshnessNote,
    primary,
    receipts:
      rccReceiptsAvailable === true
        ? "RCC receipts available"
        : rccReceiptsAvailable === false
          ? "RCC receipts not listed"
          : null,
    slidingScale: slidingScaleLabel(stringValue(fee, "sliding_scale_key")),
  };
}

function summarizeAppointmentWindows(windows: JsonRecord[]) {
  const labels = windows
    .flatMap((window) => appointmentWindowLabels(window))
    .filter(isPresent);

  return joinList(labels);
}

function appointmentWindowLabels(window: JsonRecord) {
  const dayScope = dayScopeLabel(stringValue(window, "day_scope_key"));
  const daypart = daypartLabel(stringValue(window, "daypart_key"));

  if (dayScope === "Weekday" && daypart === "Daytime") {
    return ["Weekday daytime availability"];
  }

  if (daypart === "Evening") {
    return ["Some evening availability"];
  }

  return [joinParts([dayScope, daypart])];
}

function profileAvailability(
  availability: JsonRecord | null,
  preferredName: string,
  profile: CounsellorProfileRow,
): AvailabilityView {
  const key = stringValue(availability, "status_key");
  const freshness = evaluateFreshness(
    stringValue(availability, "confirmed_at"),
    freshnessPolicies.availability,
  );
  const label =
    freshness.state === "stale"
      ? "Availability needs reconfirmation"
      : freshness.state === "unknown"
        ? "Availability unknown"
        : baseAvailabilityLabel(key);

  return {
    label,
    tooltip: availabilityTooltip(
      preferredName,
      key,
      freshness,
      profile.gender_key,
    ),
  };
}

function availabilityTooltip(
  preferredName: string,
  key: string | null,
  freshness: ReturnType<typeof evaluateFreshness>,
  genderKey: string | null,
) {
  const status = availabilityStatusPhrase(key);

  if (freshness.state === "fresh" && freshness.confirmedRelativeText && status) {
    return `${preferredName} confirmed ${subjectPronoun(genderKey)} was ${status} ${freshness.confirmedRelativeText}. Availability can change, so we ask counsellors to reconfirm it regularly.`;
  }

  if (freshness.state === "aging" && freshness.confirmedRelativeText && status) {
    return `${preferredName} last confirmed ${subjectPronoun(genderKey)} was ${status} ${freshness.confirmedRelativeText}. ${possessivePronoun(genderKey)} availability may have changed since then.`;
  }

  if (freshness.state === "stale") {
    return `We haven't received a recent availability confirmation from ${preferredName}. This doesn't mean ${subjectPronoun(genderKey)} isn't accepting clients.`;
  }

  return null;
}

function baseAvailabilityLabel(key: string | null) {
  if (key === "accepting") {
    return "Accepting clients";
  }

  if (key === "limited") {
    return "Limited availability";
  }

  if (key === "waitlist") {
    return "Waitlist available";
  }

  if (key === "not_accepting") {
    return "Not currently accepting clients";
  }

  return "Availability not listed";
}

function availabilityStatusPhrase(key: string | null) {
  if (key === "accepting") {
    return "accepting new clients";
  }

  if (key === "limited") {
    return "offering limited availability";
  }

  if (key === "waitlist") {
    return "offering a waitlist";
  }

  if (key === "not_accepting") {
    return "not currently accepting clients";
  }

  return null;
}

function availabilityDetail(availability: AvailabilityView): DetailValue {
  return {
    text: availability.label,
    tooltip: availability.tooltip,
  };
}

function consultationSummary(fees: JsonRecord[], contactProcess: JsonRecord | null) {
  const feeSummary = summarizeFee(fees);

  if (feeSummary.consultation) {
    return `${feeSummary.consultation} is available to ask questions and get a sense of fit.`;
  }

  if (booleanValue(contactProcess, "consultation_offered")) {
    return "A consultation is available to ask questions and get a sense of fit.";
  }

  return null;
}

function consultationMode(contactProcess: JsonRecord | null) {
  const mode = stringValue(contactProcess, "consultation_mode_key");

  if (!mode) {
    return null;
  }

  return `Consultation by ${humanizeKey(mode).toLowerCase()}`;
}

function getFreeConsultation(
  fees: JsonRecord[],
  contactProcess: JsonRecord | null,
): ContactHandoffConsultation {
  if (!booleanValue(contactProcess, "consultation_offered")) {
    return null;
  }

  const fee = fees[0] ?? null;
  const consultationFeeCents = numberValue(fee, "consultation_fee_cents");
  const consultationMinutes = numberValue(fee, "consultation_minutes");

  if (consultationFeeCents !== 0 || !consultationMinutes) {
    return null;
  }

  return {
    isFree: true,
    minutes: consultationMinutes,
  };
}

function mapFaithPresentation(faith: JsonRecord | null): FaithPresentation | null {
  if (!faith) {
    return null;
  }

  const discussionKey = stringValue(faith, "discussion_comfort_key");
  const integrationKey = stringValue(faith, "integration_key");
  const discussion = mapFaithDiscussion(discussionKey);
  const showDecisionRows = discussionKey !== "no";
  const claimsIslamicCounselling = booleanValue(faith, "claims_islamic_counselling");

  return {
    discussion,
    initiation: showDecisionRows
      ? mapFaithInitiation(stringValue(faith, "initiation_key"))
      : null,
    integration: showDecisionRows ? mapFaithIntegration(integrationKey) : null,
    islamicCounselling:
      claimsIslamicCounselling === true
        ? "Offers Islamic counselling."
        : claimsIslamicCounselling === false
          ? "Does not offer Islamic counselling."
          : null,
    showDecisionRows,
  };
}

function mapFaithDiscussion(key: string | null): FaithPresentation["discussion"] {
  if (key === "yes") {
    return {
      text: "Yes. Religion or spirituality can be part of what you talk about when it's relevant to your experience.",
    };
  }

  if (key === "no") {
    return {
      text: "No. Religion or spirituality is not an area this counsellor works with as part of counselling.",
    };
  }

  if (key === "depends") {
    return {
      text: "In some situations. Religion or spirituality can be part of counselling depending on what you're looking for.",
    };
  }

  return null;
}

function mapFaithInitiation(key: string | null) {
  if (key === "waits_for_client") {
    return "Usually waits for you to raise it.";
  }

  if (key === "may_ask_without_assuming_inclusion") {
    return "May ask whether faith or religion is relevant, then follow your preference.";
  }

  if (key === "depends") {
    return "Approach depends on the client or situation.";
  }

  if (key === "other") {
    return "How this comes up is handled case by case.";
  }

  return null;
}

function mapFaithIntegration(key: string | null) {
  if (key === "yes") {
    return {
      support:
        "That is different from simply talking about faith as part of your life.",
      text: "Yes, if you want. Your own beliefs, values or practices can be intentionally drawn on as part of the therapeutic work.",
    };
  }

  if (key === "no") {
    return {
      support: null,
      text: "You can talk about faith, but it is not intentionally used as a therapeutic resource or framework.",
    };
  }

  if (key === "depends") {
    return {
      support: null,
      text: "Sometimes. This depends on what you are looking for and the kind of work being done.",
    };
  }

  return null;
}

function getPrimaryContactRoute(routes: JsonRecord[]): ContactRoute | null {
  const primary = routes.find((route) => booleanValue(route, "is_primary")) ?? routes[0];

  if (!primary) {
    return null;
  }

  const href = stringValue(primary, "route_value");
  const isInvalid = href ? isInvalidDestination(href) : false;
  const confirmedAt = stringValue(primary, "confirmed_at");

  return {
    confirmedAt,
    displayLabel: stringValue(primary, "display_label"),
    freshness: evaluateFreshness(confirmedAt, freshnessPolicies.contactRoute),
    handoffKey: stringValue(primary, "handoff_key"),
    href,
    isInvalid,
    routeTypeKey: stringValue(primary, "route_type_key"),
  };
}

function contactHandoffRoute(route: ContactRoute | null): ContactHandoffRoute | null {
  if (!route) {
    return {
      disabledReason: "unavailable",
      handoffKey: null,
      href: null,
      routeTypeKey: null,
    };
  }

  return {
    disabledReason: contactDisabledReason(route),
    handoffKey: route.handoffKey,
    href: route.href,
    routeTypeKey: route.routeTypeKey,
  };
}

function contactDisabledReason(
  route: ContactRoute,
): ContactHandoffRoute["disabledReason"] {
  if (!route.href) {
    return "unavailable";
  }

  if (route.isInvalid) {
    return isStagingDestination(route.href) ? "staging" : "unavailable";
  }

  if (!route.freshness.canAssert) {
    return route.freshness.state === "stale" ? "stale" : "unavailable";
  }

  return null;
}

function contactFreshnessNote(route: ContactRoute | null) {
  if (!route?.freshness.confirmedDateText) {
    return null;
  }

  if (route.freshness.state === "stale") {
    return `Contact details last confirmed ${route.freshness.confirmedDateText}.`;
  }

  return null;
}

function getPracticeContext(practices: JsonRecord[]): PracticeContext | null {
  const practice =
    practices.find((item) => booleanValue(item, "is_primary")) ?? practices[0];
  const name = stringValue(practice, "practice_name");

  if (!name) {
    return null;
  }

  return {
    name,
    type: practiceTypeLabel(stringValue(practice, "practice_type_key")),
  };
}

function getProfessionalExperience(experience: JsonRecord | null) {
  const years = numberValue(experience, "post_masters_years");
  const note = stringValue(experience, "experience_note");

  if (years && note) {
    return `${years} years post-master's clinical practice. ${note}`;
  }

  if (years) {
    return `${years} years post-master's clinical practice`;
  }

  return note;
}

function credentialVerification(
  credential: JsonRecord | null,
): CredentialVerificationView {
  const verified = booleanValue(credential, "currently_verified");
  const checkedAt = formatDate(stringValue(credential, "verified_checked_at"));
  const shortCheckedAt = formatShortDate(
    stringValue(credential, "verified_checked_at"),
  );

  if (verified && checkedAt) {
    return {
      label: `RCC status checked by BCMC · ${checkedAt}`,
      tooltip: shortCheckedAt
        ? `RCC status checked by BCMC on ${shortCheckedAt}.`
        : "RCC status checked by BCMC.",
    };
  }

  if (verified) {
    return {
      label: "RCC status checked by BCMC",
      tooltip: "RCC status checked by BCMC.",
    };
  }

  return {
    label: null,
    tooltip: null,
  };
}

function groupWorkingStyle(items: WorkingStyleItem[]) {
  const groups = [
    {
      label: "Direction and structure",
      keys: ["Direction", "Structure"],
    },
    {
      label: "How sessions work",
      keys: ["Pattern exploration", "Practical strategies"],
    },
    {
      label: "Between sessions",
      keys: ["Between-session work"],
    },
    {
      label: "Goals and feedback",
      keys: ["Goals", "Feedback"],
    },
  ];

  return groups.flatMap((group) => {
    const values = items
      .filter((item) => group.keys.includes(item.definitionLabel))
      .map((item) => item.label);

    return values.length ? [{ label: group.label, values }] : [];
  });
}

function formatCredentialCode(key: string | null) {
  return key ? key.toUpperCase() : null;
}

function formatDeliveryMode(key: string | null) {
  if (key === "in_person") {
    return "In person";
  }

  if (key === "virtual") {
    return "Virtual";
  }

  if (key === "hybrid") {
    return "Hybrid";
  }

  return key ? humanizeKey(key) : null;
}

function practiceTypeLabel(key: string | null) {
  if (key === "private_practice") {
    return "Independent/private counselling practice";
  }

  if (key === "group_practice") {
    return "Group counselling practice";
  }

  if (key === "clinic") {
    return "Clinic";
  }

  if (key === "community_organization") {
    return "Community organization";
  }

  return key ? humanizeKey(key) : null;
}

function slidingScaleLabel(key: string | null) {
  if (key === "limited") {
    return "Limited sliding scale";
  }

  if (key === "yes") {
    return "Sliding scale available";
  }

  if (key === "no") {
    return "Sliding scale not listed";
  }

  return key ? humanizeKey(key) : null;
}

function directBillingLabel(key: string | null) {
  if (key === "no") {
    return "No direct billing";
  }

  if (key === "yes") {
    return "Direct billing available";
  }

  return key ? humanizeKey(key) : null;
}

function dayScopeLabel(key: string | null) {
  if (key === "weekday") {
    return "Weekday";
  }

  if (key === "weekend") {
    return "Weekend";
  }

  if (key === "varies") {
    return "Varies";
  }

  return key ? humanizeKey(key) : null;
}

function daypartLabel(key: string | null) {
  return key ? humanizeKey(key) : null;
}

function humanizeKey(key: string) {
  return key
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isInvalidDestination(href: string) {
  try {
    const { hostname } = new URL(href);
    return hostname.endsWith(".invalid");
  } catch {
    return true;
  }
}

function isStagingDestination(href: string) {
  try {
    return new URL(href).hostname.endsWith(".invalid");
  } catch {
    return false;
  }
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-CA", {
    currency: "CAD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function compactFacts(entries: [string, string | null][]): DisplayFact[] {
  return entries.flatMap(([label, value]) => (value ? [{ label, value }] : []));
}

function compactGroups(
  entries: [string, (DetailValue | string | null | undefined)[]][],
) {
  return entries.flatMap(([label, values]) => {
    const detailValues = compactDetailValues(values);
    return detailValues.length ? [{ label, values: detailValues }] : [];
  });
}

function compactDetailValues(values: (DetailValue | string | null | undefined)[]) {
  return values.map(toDetailValue).filter((value) => value.text.trim());
}

function compactStrings(values: (string | null | undefined)[]) {
  return values.filter(isPresent);
}

function uniqueStrings(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.filter(isPresent)));
}

function isPresent(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function subjectPronoun(genderKey: string | null) {
  if (genderKey === "woman") {
    return "she";
  }

  if (genderKey === "man") {
    return "he";
  }

  return "they";
}

function possessivePronoun(genderKey: string | null) {
  if (genderKey === "woman") {
    return "Her";
  }

  if (genderKey === "man") {
    return "His";
  }

  return "Their";
}

function possessivePronounLower(genderKey: string | null) {
  if (genderKey === "woman") {
    return "her";
  }

  if (genderKey === "man") {
    return "his";
  }

  return "their";
}

function joinList(values: string[]) {
  return values.length ? values.join(" + ") : null;
}

function joinScope(clientGroups: string[], serviceTypes: string[]) {
  const parts = compactStrings([joinList(clientGroups), joinList(serviceTypes)]);
  return parts.length ? parts.join(" · ") : null;
}

function joinParts(values: (string | null | undefined)[]) {
  const present = compactStrings(values);
  return present.length ? present.join(", ") : null;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name;
}
