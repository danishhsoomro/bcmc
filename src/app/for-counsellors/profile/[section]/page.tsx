import { notFound } from "next/navigation";

import { ContactEnquiriesForm } from "../components/ContactEnquiriesForm";
import { CulturalFamiliarityForm } from "../components/CulturalFamiliarityForm";
import { HowYouWorkForm } from "../components/HowYouWorkForm";
import { FaithForm } from "../components/FaithForm";
import { PracticeForm } from "../components/PracticeForm";
import { ProfessionalBackgroundForm } from "../components/ProfessionalBackgroundForm";
import { PracticalDetailsForm } from "../components/PracticalDetailsForm";
import { WhatYouHelpWithForm } from "../components/WhatYouHelpWithForm";
import { WhoYouWorkWithForm } from "../components/WhoYouWorkWithForm";
import { WorkspaceShell } from "../components/WorkspaceShell";
import { YourProfileForm } from "../components/YourProfileForm";
import {
  ensureOnboardingState,
  getCounsellorWorkspace,
  getContactEnquiriesSectionData,
  getCulturalFamiliaritySectionData,
  getFaithSectionData,
  getFaithStatusFromCanonical,
  getHowYouWorkSectionData,
  getHowYouWorkStatusFromCanonical,
  getPracticeSectionData,
  getPracticeStatusFromCanonical,
  getProfessionalBackgroundSectionData,
  getProfileVoiceSectionData,
  getPracticalDetailsSectionData,
  getWhatYouHelpWithSectionData,
  getWhatYouHelpWithStatusFromCanonical,
  getWhoYouWorkWithSectionData,
  getWhoYouWorkWithStatusFromCanonical,
  updateOnboardingSectionStatus,
} from "@/lib/counsellor-workspace/server";
import { getSectionByRouteSegment } from "@/lib/counsellor-workspace/sections";
import { buildCulturalFamiliarityInitialState } from "@/lib/counsellor-workspace/cultural-familiarity";
import { buildFaithProfileInitialState } from "@/lib/counsellor-workspace/faith";
import { buildHowYouWorkInitialState } from "@/lib/counsellor-workspace/how-you-work";
import { practicalDetailsFormKey } from "@/lib/counsellor-workspace/practical-details";
import { buildWhatYouHelpWithInitialState } from "@/lib/counsellor-workspace/what-you-help-with";
import { buildWhoYouWorkWithInitialState } from "@/lib/counsellor-workspace/who-you-work-with";

type SectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function CounsellorProfileSectionPage({
  params,
}: SectionPageProps) {
  const { section: sectionSegment } = await params;
  const section = getSectionByRouteSegment(sectionSegment);

  if (!section) {
    notFound();
  }

  const workspace = await getCounsellorWorkspace();

  if (workspace.kind !== "linked") {
    const ProfilePage = (await import("../page")).default;
    return <ProfilePage />;
  }

  const onboarding = await ensureOnboardingState(workspace.supabase);

  if (
    section.key !== "practice" &&
    section.key !== "who_you_work_with" &&
    section.key !== "what_you_help_with" &&
    section.key !== "how_you_work" &&
    section.key !== "faith" &&
    section.key !== "cultural_familiarity" &&
    section.key !== "practical_details" &&
    section.key !== "availability_contact" &&
    section.key !== "professional_background" &&
    section.key !== "your_profile"
  ) {
    return (
      <WorkspaceShell
        activeSectionKey={section.key}
        counsellor={workspace.counsellor}
        onboardingUnavailableReason={onboarding.unavailableReason}
        statuses={onboarding.statuses}
      >
        <section className="max-w-3xl">
          <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
            Not available yet
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
            {section.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
            This section is part of the intake map, but BCMC has not opened
            these questions in this version yet.
          </p>
        </section>
      </WorkspaceShell>
    );
  }

  if (section.key === "your_profile") {
    const profileVoiceData = await getProfileVoiceSectionData(
      workspace.supabase,
    );

    return (
      <WorkspaceShell
        activeSectionKey="your_profile"
        counsellor={workspace.counsellor}
        onboardingUnavailableReason={onboarding.unavailableReason}
        statuses={onboarding.statuses}
      >
        <section className="max-w-3xl">
          <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
            Section 10
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
            Your profile
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
            A couple of things are easier to understand in your own words.
          </p>
          <p className="mt-3 text-base leading-7 text-[var(--color-stone)]">
            The rest of your profile is built from the information you&apos;ve
            already given us. These final questions give people a little more
            context about what it may feel like to reach out to you.
          </p>

          <YourProfileForm
            data={profileVoiceData}
            onboardingStatus={onboarding.statuses.your_profile}
          />
        </section>
      </WorkspaceShell>
    );
  }

  if (section.key === "cultural_familiarity") {
    const culturalData = await getCulturalFamiliaritySectionData(
      workspace.supabase,
      workspace.counsellor.counsellor_id,
    );
    const initialState = buildCulturalFamiliarityInitialState({
      onboardingStatus: onboarding.statuses.cultural_familiarity,
      selections: culturalData.culturalFamiliaritySelections,
    });

    return (
      <WorkspaceShell
        activeSectionKey="cultural_familiarity"
        counsellor={workspace.counsellor}
        onboardingUnavailableReason={onboarding.unavailableReason}
        statuses={onboarding.statuses}
      >
        <section className="max-w-3xl">
          <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
            Section 6
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
            Cultural & community familiarity
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
            People sometimes want to know whether a counsellor is familiar with
            cultural, family or community contexts that may shape what they are
            going through.
          </p>

          <CulturalFamiliarityForm
            initialState={initialState}
            taxonomyRows={culturalData.culturalFamiliarityTaxonomy}
          />
        </section>
      </WorkspaceShell>
    );
  }

  if (section.key === "availability_contact") {
    const contactData = await getContactEnquiriesSectionData(
      workspace.supabase,
      workspace.counsellor.counsellor_id,
    );

    return (
      <WorkspaceShell
        activeSectionKey="availability_contact"
        counsellor={workspace.counsellor}
        onboardingUnavailableReason={onboarding.unavailableReason}
        statuses={onboarding.statuses}
      >
        <section className="max-w-3xl">
          <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
            Section 8
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
            Contact & enquiries
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
            Choose where prospective clients should go when they&apos;re ready
            to enquire.
          </p>

          <ContactEnquiriesForm
            data={contactData}
            onboardingStatus={onboarding.statuses.availability_contact}
          />
        </section>
      </WorkspaceShell>
    );
  }

  if (section.key === "practical_details") {
    const practicalData = await getPracticalDetailsSectionData(
      workspace.supabase,
      workspace.counsellor.counsellor_id,
    );
    onboarding.statuses.practical_details = practicalData.completion.status;

    return (
      <WorkspaceShell
        activeSectionKey="practical_details"
        counsellor={workspace.counsellor}
        onboardingUnavailableReason={onboarding.unavailableReason}
        statuses={onboarding.statuses}
      >
        <section className="max-w-4xl">
          <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
            Section 7
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
            Practical details
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--color-stone)]">
            Help people understand how your counselling is offered, what it
            costs, whether a consultation is available, and whether it makes
            sense to reach out right now.
          </p>

          <PracticalDetailsForm
            data={practicalData}
            key={practicalDetailsFormKey(practicalData)}
          />
        </section>
      </WorkspaceShell>
    );
  }

  if (section.key === "professional_background") {
    const professionalData = await getProfessionalBackgroundSectionData(
      workspace.supabase,
      workspace.counsellor.counsellor_id,
    );

    return (
      <WorkspaceShell
        activeSectionKey="professional_background"
        counsellor={workspace.counsellor}
        onboardingUnavailableReason={onboarding.unavailableReason}
        statuses={onboarding.statuses}
      >
        <section className="max-w-3xl">
          <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
            Section 9
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
            Professional background
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
            Add the professional background that helps people understand your
            training and clinical experience.
          </p>

          <ProfessionalBackgroundForm
            data={professionalData}
            onboardingStatus={onboarding.statuses.professional_background}
          />
        </section>
      </WorkspaceShell>
    );
  }

  if (section.key === "faith") {
    const faithData = await getFaithSectionData(
      workspace.supabase,
      workspace.counsellor.counsellor_id,
    );
    const sectionStatus = getFaithStatusFromCanonical(faithData);
    onboarding.statuses.faith = sectionStatus;

    if (!onboarding.unavailableReason && sectionStatus !== "not_started") {
      onboarding.unavailableReason = await updateOnboardingSectionStatus(
        workspace.supabase,
        "faith",
        sectionStatus,
      );
    }

    return (
      <WorkspaceShell
        activeSectionKey="faith"
        counsellor={workspace.counsellor}
        onboardingUnavailableReason={onboarding.unavailableReason}
        statuses={onboarding.statuses}
      >
        <section className="max-w-3xl">
          <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
            Section 5
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
            Faith in counselling
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
            Different people want different things when it comes to faith and
            counselling. These questions help people understand whether religion
            or spirituality can come up in your sessions, and how that might
            happen.
          </p>

          <FaithForm
            initialState={buildFaithProfileInitialState(
              faithData.faithProfile,
            )}
          />
        </section>
      </WorkspaceShell>
    );
  }

  if (section.key === "how_you_work") {
    const howData = await getHowYouWorkSectionData(
      workspace.supabase,
      workspace.counsellor.counsellor_id,
    );
    const sectionStatus = getHowYouWorkStatusFromCanonical(howData);
    onboarding.statuses.how_you_work = sectionStatus;

    if (!onboarding.unavailableReason && sectionStatus !== "not_started") {
      onboarding.unavailableReason = await updateOnboardingSectionStatus(
        workspace.supabase,
        "how_you_work",
        sectionStatus,
      );
    }

    return (
      <WorkspaceShell
        activeSectionKey="how_you_work"
        counsellor={workspace.counsellor}
        onboardingUnavailableReason={onboarding.unavailableReason}
        statuses={onboarding.statuses}
      >
        <section className="max-w-3xl">
          <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
            Section 4
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
            How you work
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
            Counselling can look different from one counsellor to another.
            We&apos;ll show you a few situations that can come up in counselling.
            Choose the response closest to what you would typically do. There
            are no right answers.
          </p>

          <HowYouWorkForm
            contextReasons={howData.contextReasons}
            initialState={buildHowYouWorkInitialState(howData)}
            options={howData.options}
            questions={howData.questions}
          />
        </section>
      </WorkspaceShell>
    );
  }

  if (section.key === "who_you_work_with") {
    const whoData = await getWhoYouWorkWithSectionData(
      workspace.supabase,
      workspace.counsellor.counsellor_id,
    );
    const sectionStatus = getWhoYouWorkWithStatusFromCanonical(whoData);
    onboarding.statuses.who_you_work_with = sectionStatus;

    if (!onboarding.unavailableReason && sectionStatus !== "not_started") {
      onboarding.unavailableReason = await updateOnboardingSectionStatus(
        workspace.supabase,
        "who_you_work_with",
        sectionStatus,
      );
    }

    const initialState = buildWhoYouWorkWithInitialState(whoData);

    return (
      <WorkspaceShell
        activeSectionKey="who_you_work_with"
        counsellor={workspace.counsellor}
        onboardingUnavailableReason={onboarding.unavailableReason}
        statuses={onboarding.statuses}
      >
        <section className="max-w-3xl">
          <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
            Section 2
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
            Who you work with
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
            Tell us about the clients and types of counselling you currently
            work with. Choose what reflects your current practice rather than
            every group you may be qualified to support.
          </p>

          <WhoYouWorkWithForm
            clientGroups={whoData.clientGroups}
            initialState={initialState}
            serviceTypes={whoData.serviceTypes}
          />
        </section>
      </WorkspaceShell>
    );
  }

  if (section.key === "what_you_help_with") {
    const whatData = await getWhatYouHelpWithSectionData(
      workspace.supabase,
      workspace.counsellor.counsellor_id,
    );
    const sectionStatus = getWhatYouHelpWithStatusFromCanonical(whatData);
    onboarding.statuses.what_you_help_with = sectionStatus;

    if (!onboarding.unavailableReason && sectionStatus !== "not_started") {
      onboarding.unavailableReason = await updateOnboardingSectionStatus(
        workspace.supabase,
        "what_you_help_with",
        sectionStatus,
      );
    }

    const serviceTypeKeys = new Set(
      whatData.serviceDeclarations.map(
        (declaration) => declaration.service_type_key,
      ),
    );
    const showRelationshipClarification =
      serviceTypeKeys.has("individual") && !serviceTypeKeys.has("couples");

    return (
      <WorkspaceShell
        activeSectionKey="what_you_help_with"
        counsellor={workspace.counsellor}
        onboardingUnavailableReason={onboarding.unavailableReason}
        statuses={onboarding.statuses}
      >
        <section className="max-w-3xl">
          <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
            Section 3
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
            What you help with
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
            What could someone reasonably come to you for? Choose the concerns
            that reflect the work you currently do and want represented on your
            BCMC profile.
          </p>

          <WhatYouHelpWithForm
            initialState={buildWhatYouHelpWithInitialState(whatData)}
            concernOptions={whatData.practiceAreaTaxonomy}
            showRelationshipClarification={showRelationshipClarification}
          />
        </section>
      </WorkspaceShell>
    );
  }

  const practiceData = await getPracticeSectionData(
    workspace.supabase,
    workspace.counsellor.counsellor_id,
  );
  const primaryCredential = practiceData.credentials[0] ?? null;
  const primaryCredentialType = primaryCredential
    ? practiceData.credentialTypes.find(
        (type) => type.key === primaryCredential.credential_type_key,
      )
    : null;
  const primaryAffiliation = practiceData.practiceAffiliations[0] ?? null;
  const profileIsPublished =
    practiceData.counsellor.lifecycle_status === "active" &&
    practiceData.counsellor.publication_status === "published";
  const practiceStatus = getPracticeStatusFromCanonical(
    practiceData.counsellor,
  );
  onboarding.statuses.practice = practiceStatus;

  if (!onboarding.unavailableReason && practiceStatus !== "not_started") {
    onboarding.unavailableReason = await updateOnboardingSectionStatus(
      workspace.supabase,
      "practice",
      practiceStatus,
    );
  }

  return (
    <WorkspaceShell
      activeSectionKey="practice"
      counsellor={workspace.counsellor}
      onboardingUnavailableReason={onboarding.unavailableReason}
      statuses={onboarding.statuses}
    >
      <section className="max-w-3xl">
        <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
          Section 1
        </p>
        <h2 className="mt-3 font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
          Your practice
        </h2>
        <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
          Confirm your public name, preferred name, pronouns, and self-described
          gender. Practice affiliation and credential verification are shown
          here for context and will move through a reviewed BCMC flow later.
        </p>

        {profileIsPublished ? (
          <p className="mt-5 border-l-4 border-[var(--color-clay)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-ink)]">
            This profile is currently published. Saving these identity fields
            updates the canonical record used by the public profile views.
          </p>
        ) : null}

        <PracticeForm
          initialState={{
            status: "idle",
            message: "",
            fieldErrors: {},
            values: {
              displayName: practiceData.counsellor.display_name,
              preferredName: practiceData.counsellor.preferred_name ?? "",
              pronouns: practiceData.counsellor.pronouns ?? "",
              genderKey: practiceData.counsellor.gender_key ?? "",
              genderSelfDescription:
                practiceData.counsellor.gender_self_description ?? "",
            },
          }}
        />

        <div className="mt-10 grid gap-6 border-t border-[var(--color-border)] pt-8 md:grid-cols-2">
          <ReadOnlyPanel title="Credential">
            {primaryCredential ? (
              <>
                <p className="font-semibold text-[var(--color-forest-900)]">
                  {primaryCredentialType?.label ??
                    primaryCredential.credential_type_key}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
                  Issuer: {primaryCredential.issuer_name}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
                  Status: {primaryCredential.status_key}
                </p>
              </>
            ) : (
              <p className="text-sm leading-6 text-[var(--color-stone)]">
                No credential is available to show yet.
              </p>
            )}
            <p className="mt-4 text-sm leading-6 text-[var(--color-stone)]">
              Credential editing is read-only in this version so counsellors
              cannot self-mark BCMC verification or review state.
            </p>
          </ReadOnlyPanel>

          <ReadOnlyPanel title="Practice affiliation">
            {primaryAffiliation?.practices ? (
              <>
                <p className="font-semibold text-[var(--color-forest-900)]">
                  {primaryAffiliation.practices.name}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
                  Affiliation:{" "}
                  {labelFromKey(primaryAffiliation.affiliation_type_key)}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
                  {[
                    primaryAffiliation.practices.city,
                    primaryAffiliation.practices.province,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Location not shown"}
                </p>
              </>
            ) : (
              <p className="text-sm leading-6 text-[var(--color-stone)]">
                No current practice affiliation is available to show yet.
              </p>
            )}
            <p className="mt-4 text-sm leading-6 text-[var(--color-stone)]">
              Practice creation or changes are read-only here because they may
              require BCMC review and practice governance.
            </p>
          </ReadOnlyPanel>
        </div>
      </section>
    </WorkspaceShell>
  );
}

function ReadOnlyPanel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border-l-4 border-[var(--color-champagne)] bg-white px-5 py-4">
      <h3 className="text-sm font-semibold text-[var(--color-forest-900)]">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function labelFromKey(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
