import Link from "next/link";

import {
  ensureOnboardingState,
  getCounsellorWorkspace,
  getFaithSectionData,
  getFaithStatusFromCanonical,
  getHowYouWorkSectionData,
  getHowYouWorkStatusFromCanonical,
  getPracticeSectionData,
  getPracticeStatusFromCanonical,
  getWhatYouHelpWithSectionData,
  getWhatYouHelpWithStatusFromCanonical,
  getWhoYouWorkWithSectionData,
  getWhoYouWorkWithStatusFromCanonical,
  updateOnboardingSectionStatus,
} from "@/lib/counsellor-workspace/server";

import {
  AccountStateShell,
  SignOutButton,
  WorkspaceShell,
} from "./components/WorkspaceShell";
import { COUNSELLOR_WORKSPACE_SECTIONS } from "@/lib/counsellor-workspace/sections";

export default async function CounsellorProfilePage() {
  const workspace = await getCounsellorWorkspace();

  if (workspace.kind === "unlinked") {
    return <UnlinkedAccount />;
  }

  if (workspace.kind === "multiple") {
    return <MultipleCounsellorProfiles />;
  }

  const onboarding = await ensureOnboardingState(workspace.supabase);
  const practiceData = await getPracticeSectionData(
    workspace.supabase,
    workspace.counsellor.counsellor_id,
  );
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

  const whoData = await getWhoYouWorkWithSectionData(
    workspace.supabase,
    workspace.counsellor.counsellor_id,
  );
  const whoStatus = getWhoYouWorkWithStatusFromCanonical(whoData);
  onboarding.statuses.who_you_work_with = whoStatus;

  if (!onboarding.unavailableReason && whoStatus !== "not_started") {
    onboarding.unavailableReason = await updateOnboardingSectionStatus(
      workspace.supabase,
      "who_you_work_with",
      whoStatus,
    );
  }

  const whatData = await getWhatYouHelpWithSectionData(
    workspace.supabase,
    workspace.counsellor.counsellor_id,
  );
  const whatStatus = getWhatYouHelpWithStatusFromCanonical(whatData);
  onboarding.statuses.what_you_help_with = whatStatus;

  if (!onboarding.unavailableReason && whatStatus !== "not_started") {
    onboarding.unavailableReason = await updateOnboardingSectionStatus(
      workspace.supabase,
      "what_you_help_with",
      whatStatus,
    );
  }

  const howData = await getHowYouWorkSectionData(
    workspace.supabase,
    workspace.counsellor.counsellor_id,
  );
  const howStatus = getHowYouWorkStatusFromCanonical(howData);
  onboarding.statuses.how_you_work = howStatus;

  if (!onboarding.unavailableReason && howStatus !== "not_started") {
    onboarding.unavailableReason = await updateOnboardingSectionStatus(
      workspace.supabase,
      "how_you_work",
      howStatus,
    );
  }

  const faithData = await getFaithSectionData(
    workspace.supabase,
    workspace.counsellor.counsellor_id,
  );
  const faithStatus = getFaithStatusFromCanonical(faithData);
  onboarding.statuses.faith = faithStatus;

  if (!onboarding.unavailableReason && faithStatus !== "not_started") {
    onboarding.unavailableReason = await updateOnboardingSectionStatus(
      workspace.supabase,
      "faith",
      faithStatus,
    );
  }

  const displayName =
    workspace.counsellor.preferred_name ||
    workspace.counsellor.display_name ||
    "there";
  const nextSection = COUNSELLOR_WORKSPACE_SECTIONS.find(
    (section) =>
      section.implemented && onboarding.statuses[section.key] !== "complete",
  );

  return (
    <WorkspaceShell
      counsellor={workspace.counsellor}
      onboardingUnavailableReason={onboarding.unavailableReason}
      statuses={onboarding.statuses}
    >
      <section className="max-w-3xl">
        <h2 className="font-serif text-3xl leading-tight text-[var(--color-forest-900)] md:text-4xl">
          Welcome, {displayName}
        </h2>
        {nextSection ? (
          <>
            <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
              Continue with the next section that still needs your attention.
              We have prefilled the values BCMC already has where they are
              available.
            </p>
            <div className="mt-8">
              <Link
                href={nextSection.href}
                className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-forest-900)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
              >
                Continue to {nextSection.title}
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-4 text-base leading-7 text-[var(--color-stone)]">
            All available intake sections are complete. BCMC can add the final
            review and submission workflow when it is ready.
          </p>
        )}
      </section>
    </WorkspaceShell>
  );
}

function MultipleCounsellorProfiles() {
  return (
    <AccountStateShell>
      <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
        Multiple profiles
      </p>
      <h1 className="mt-4 font-serif text-4xl leading-[1.08] text-[var(--color-forest-900)] md:text-5xl">
        Your account is connected to more than one BCMC counsellor profile.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--color-stone)]">
        We&apos;ll add profile selection here before intake editing begins.
      </p>
      <div className="mt-10">
        <SignOutButton />
      </div>
    </AccountStateShell>
  );
}

function UnlinkedAccount() {
  return (
    <AccountStateShell>
      <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
        Account connected
      </p>
      <h1 className="mt-4 font-serif text-4xl leading-[1.08] text-[var(--color-forest-900)] md:text-5xl">
        Your account isn&apos;t connected to a BCMC counsellor profile yet.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--color-stone)]">
        If BCMC invited you, make sure you&apos;re signing in with the same
        email/account used for your invitation.
      </p>
      <div className="mt-10">
        <SignOutButton />
      </div>
    </AccountStateShell>
  );
}
