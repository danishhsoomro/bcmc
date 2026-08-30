"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Clipboard,
  Download,
  ExternalLink,
  RotateCcw,
  Timer,
} from "lucide-react";

import {
  narrativeVariants,
  type NarrativeVariant,
} from "@/data/aminaResearchProfile";

type VariantLabel = "Long" | "Structured" | "Hybrid";
type RecallStatus =
  | "Uncoded"
  | "Recalled accurately"
  | "Recalled inaccurately"
  | "Not recalled";
type YesMaybeNo = "Yes" | "Maybe" | "No" | "";
type RemainingUncertainty =
  | "None consequential"
  | "Minor"
  | "Moderate"
  | "Significant"
  | "Unable to decide"
  | "";
type ContactReadiness =
  | "Ready to contact"
  | "Possibly ready"
  | "Not ready because of legitimate mismatch"
  | "Not ready because of unresolved uncertainty"
  | "Not ready for another reason"
  | "";
type DecisionQuality = "High" | "Medium" | "Low / unsupported inference" | "";
type Outcome =
  | "Contact-ready"
  | "Healthy negative resolution"
  | "Healthy comparison / keep looking"
  | "Unresolved comparison"
  | "Failure-mode uncertainty"
  | "Other"
  | "";

type SessionData = {
  participantCode: string;
  variant: NarrativeVariant;
  startedAt: string;
  activePhase: number;
  pastSearchNotes: string;
  profileBehaviourNotes: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  considerSpeaking: YesMaybeNo;
  considerWhy: string;
  recallNotes: string;
  recallCoding: Record<string, RecallStatus>;
  missingInfoNotes: string;
  externalLookupNotes: string;
  externalLookupTags: string[];
  contactBehaviour: string;
  contactBehaviourOther: string;
  contactPrediction: string;
  contactMeaning: string;
  contactCommitment: string;
  contactRecipient: string;
  contactBarrier: string;
  finalReflectionNotes: string;
  profileComprehension: string;
  relationalComprehension: string;
  differentiation: string;
  remainingUncertainty: RemainingUncertainty;
  cognitiveEffort: string;
  contactReadiness: ContactReadiness;
  decisionQuality: DecisionQuality;
  decisionEvidence: string;
  misinterpretationTags: string[];
  misinterpretationOther: string;
  misinterpretationExplanation: string;
  outcome: Outcome;
  moderatorInterpretation: string;
  keyQuotes: string;
};

const storageKey = "bcmc-t1-session-draft";
const assignmentKey = "bcmc-t1-next-assignment-index";
const exportedCodesKey = "bcmc-t1-exported-participant-codes";

const variantLabels: Record<NarrativeVariant, VariantLabel> = {
  long: "Long",
  structured: "Structured",
  hybrid: "Hybrid",
};

const phases = [
  "Setup",
  "Real Search Reconstruction",
  "Amina Profile Task",
  "Comprehension Questions",
  "Recall Test",
  "Missing Information Probe",
  "Contact Readiness",
  "Final Reflection",
  "Scoring",
  "Summary",
] as const;

const searchFollowUps = [
  "Where did you start?",
  "What did you search for?",
  "What made you open one counsellor rather than another?",
  "What made you reject someone?",
  "Did you visit their website or look them up elsewhere?",
  "Was there information you could not find?",
  "At what point did you feel ready to contact someone?",
  "If you did not contact anyone, what happened?",
  "If you contacted someone and it went nowhere, what did you do next?",
] as const;

const recallItems = [
  "RCC / verification",
  "availability",
  "location / format",
  "adult individual scope",
  "therapy languages",
  "fee / duration",
  "consultation",
  "primary practice areas",
  "working style",
  "first-session expectations",
  "faith/culture approach",
  "professional qualification/detail",
  "accessibility",
  "financial access/direct billing",
  "contact next step",
] as const;

const recallStatuses: RecallStatus[] = [
  "Uncoded",
  "Recalled accurately",
  "Recalled inaccurately",
  "Not recalled",
];

const externalDestinationTags = [
  "clinic website",
  "Google",
  "BCACC register",
  "LinkedIn",
  "Instagram",
  "reviews",
  "other",
] as const;

const contactBehaviourOptions = [
  "Contacted / clicked CTA",
  "Returned to search",
  "Continued reading",
  "Opened professional details",
  "Opened additional experience",
  "Did nothing / unsure",
  "Other",
] as const;

const scoreOptions = ["1", "2", "3", "4", "5"] as const;

const remainingUncertaintyOptions: RemainingUncertainty[] = [
  "None consequential",
  "Minor",
  "Moderate",
  "Significant",
  "Unable to decide",
];

const contactReadinessOptions: ContactReadiness[] = [
  "Ready to contact",
  "Possibly ready",
  "Not ready because of legitimate mismatch",
  "Not ready because of unresolved uncertainty",
  "Not ready for another reason",
];

const decisionQualityOptions: DecisionQuality[] = [
  "High",
  "Medium",
  "Low / unsupported inference",
];

const misinterpretationTags = [
  "Islamic counselling",
  "religiosity",
  "insurance coverage",
  "specialist expertise",
  "therapy population",
  "language proficiency",
  "availability certainty",
  "response-time guarantee",
  "personality",
  "other",
] as const;

const outcomeOptions: Outcome[] = [
  "Contact-ready",
  "Healthy negative resolution",
  "Healthy comparison / keep looking",
  "Unresolved comparison",
  "Failure-mode uncertainty",
  "Other",
];

const outcomeDefinitions = [
  "Contact-ready: Participant has enough grounded information to consider contact.",
  "Healthy negative resolution: Participant can explain a legitimate mismatch.",
  "Healthy comparison / keep looking: Amina is plausible, but participant has a reason to compare another counsellor.",
  "Unresolved comparison: Participant cannot tell what distinguishes Amina or how to decide.",
  "Failure-mode uncertainty: Missing/confusing information prevents a viable decision.",
] as const;

function createEmptySession(): SessionData {
  return {
    participantCode: "",
    variant: "long",
    startedAt: "",
    activePhase: 0,
    pastSearchNotes: "",
    profileBehaviourNotes: "",
    q1: "",
    q2: "",
    q3: "",
    q4: "",
    considerSpeaking: "",
    considerWhy: "",
    recallNotes: "",
    recallCoding: Object.fromEntries(
      recallItems.map((item) => [item, "Uncoded"]),
    ) as Record<string, RecallStatus>,
    missingInfoNotes: "",
    externalLookupNotes: "",
    externalLookupTags: [],
    contactBehaviour: "",
    contactBehaviourOther: "",
    contactPrediction: "",
    contactMeaning: "",
    contactCommitment: "",
    contactRecipient: "",
    contactBarrier: "",
    finalReflectionNotes: "",
    profileComprehension: "",
    relationalComprehension: "",
    differentiation: "",
    remainingUncertainty: "",
    cognitiveEffort: "",
    contactReadiness: "",
    decisionQuality: "",
    decisionEvidence: "",
    misinterpretationTags: [],
    misinterpretationOther: "",
    misinterpretationExplanation: "",
    outcome: "",
    moderatorInterpretation: "",
    keyQuotes: "",
  };
}

function createNewSession(): SessionData {
  return {
    ...createEmptySession(),
    startedAt: new Date().toISOString(),
  };
}

function readSavedSession() {
  const savedSession = getStorage()?.getItem(storageKey);

  if (!savedSession) {
    return null;
  }

  try {
    return normalizeLoadedSession(JSON.parse(savedSession));
  } catch {
    return null;
  }
}

export function ResearchSessionRunner() {
  const [session, setSession] = useState<SessionData>(() => createEmptySession());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [usedParticipantCodes, setUsedParticipantCodes] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loadSavedSession = window.setTimeout(() => {
      setSession(readSavedSession() ?? createNewSession());
      setUsedParticipantCodes(readUsedParticipantCodes());
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(loadSavedSession);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    getStorage()?.setItem(storageKey, JSON.stringify(session));
  }, [hydrated, session]);

  useEffect(() => {
    if (!hydrated || !session.startedAt) {
      return;
    }

    const updateElapsedSeconds = () => {
      const startedAt = new Date(session.startedAt).getTime();

      if (!Number.isFinite(startedAt)) {
        setElapsedSeconds(0);
        return;
      }

      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };

    const initialTimer = window.setTimeout(() => {
      updateElapsedSeconds();
    }, 0);
    const interval = window.setInterval(() => {
      updateElapsedSeconds();
    }, 1000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [hydrated, session.startedAt]);

  const profileHref = `/research/profile/amina?variant=${session.variant}`;
  const completeness = useMemo(() => getSessionCompleteness(session), [session]);
  const normalizedParticipantCode = normalizeParticipantCode(session.participantCode);
  const hasDuplicateParticipantCode =
    normalizedParticipantCode !== "" &&
    usedParticipantCodes.includes(normalizedParticipantCode);
  const summary = useMemo(
    () => generateSummary(session, elapsedSeconds, completeness),
    [completeness, elapsedSeconds, session],
  );

  function updateSession(updates: Partial<SessionData>) {
    setSession((current) => ({ ...current, ...updates }));
  }

  function assignNextCondition() {
    const storage = getStorage();
    const savedIndex = Number(storage?.getItem(assignmentKey) ?? "0");
    const safeIndex = Number.isFinite(savedIndex) ? savedIndex : 0;
    const nextVariant = narrativeVariants[safeIndex % narrativeVariants.length];
    storage?.setItem(
      assignmentKey,
      String((safeIndex + 1) % narrativeVariants.length),
    );
    updateSession({ variant: nextVariant });
  }

  function clearSession() {
    if (hasEnteredResearchData(session)) {
      const confirmed = window.confirm(
        "Clear this session? Entered moderator notes and coding will be deleted from this browser.",
      );

      if (!confirmed) {
        return;
      }
    }

    const freshSession = createNewSession();
    getStorage()?.removeItem(storageKey);
    setSession(freshSession);
    setCopyState("idle");
  }

  function launchProfile() {
    window.open(profileHref, "_blank", "noopener,noreferrer");
  }

  async function copySummary() {
    try {
      await window.navigator.clipboard.writeText(summary);
      setCopyState("copied");
      recordParticipantCodeExport();
    } catch {
      setCopyState("failed");
    }
  }

  function downloadSummary() {
    const code = sanitizeFilename(session.participantCode || "unassigned");
    const blob = new Blob([summary], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bcmc-t1-session-${code}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    recordParticipantCodeExport();
  }

  function recordParticipantCodeExport() {
    if (!normalizedParticipantCode) {
      return;
    }

    setUsedParticipantCodes((currentCodes) => {
      if (currentCodes.includes(normalizedParticipantCode)) {
        return currentCodes;
      }

      const nextCodes = [...currentCodes, normalizedParticipantCode];
      getStorage()?.setItem(exportedCodesKey, JSON.stringify(nextCodes));
      return nextCodes;
    });
  }

  return (
    <main className="min-h-screen bg-[var(--color-cream)] px-4 py-6 text-[var(--color-ink)] md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/research/profiles"
            className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
          >
            <span aria-hidden="true" className="mr-2">
              ←
            </span>
            Back to research controls
          </Link>
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white/82 px-3 py-2 text-sm font-semibold text-[var(--color-forest-900)]">
            <Timer className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
            Elapsed: {formatElapsed(elapsedSeconds)}
          </div>
        </div>

        <header className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 p-5 shadow-sm md:p-7">
          <p className="bcmc-eyebrow text-[var(--color-leaf)]">
            Internal moderator tool
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="font-serif text-4xl leading-[1.06] text-[var(--color-forest-900)] md:text-5xl">
                BCMC T1 participant session
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--color-stone)]">
                Local browser draft only. Avoid participant names, contact details,
                diagnosis, religious details, or other identifying information in notes.
              </p>
              <div className="mt-5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4">
                {hydrated ? (
                  <>
                    <p className="text-sm font-semibold text-[var(--color-forest-900)]">
                      Session completeness:{" "}
                      <span
                        className={
                          completeness.complete
                            ? "text-[var(--color-evergreen)]"
                            : "text-[var(--color-clay)]"
                        }
                      >
                        {completeness.complete ? "Complete" : "Incomplete"}
                      </span>
                    </p>
                    {!completeness.complete ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
                        Incomplete phases:{" "}
                        {completeness.incompletePhases.join(", ")}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm font-semibold text-[var(--color-forest-900)]">
                    Session completeness loading...
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4">
              <label className="grid gap-2 text-sm font-semibold text-[var(--color-forest-900)]">
                Participant code
                <input
                  value={session.participantCode}
                  onChange={(event) =>
                    updateSession({ participantCode: event.target.value })
                  }
                  placeholder="S01"
                  className={inputClassName}
                />
              </label>
              {hasDuplicateParticipantCode ? (
                <p className="rounded-[var(--radius-sm)] border border-[var(--color-clay)]/45 bg-white px-3 py-2 text-xs font-semibold leading-5 text-[var(--color-clay)]">
                  This participant code has already been used on this browser.
                </p>
              ) : null}
              <fieldset>
                <legend className="text-sm font-semibold text-[var(--color-forest-900)]">
                  T1 condition
                </legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {narrativeVariants.map((variant) => (
                    <label
                      key={variant}
                      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border px-3 text-sm font-semibold ${
                        session.variant === variant
                          ? "border-[var(--color-forest-900)] bg-[var(--color-forest-900)] text-white"
                          : "border-[var(--color-border)] bg-white text-[var(--color-forest-900)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="variant"
                        value={variant}
                        checked={session.variant === variant}
                        onChange={() => updateSession({ variant })}
                        className="sr-only"
                      />
                      {variantLabels[variant]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={assignNextCondition} className={secondaryButtonClassName}>
                  Assign next condition
                </button>
                <button type="button" onClick={clearSession} className={quietDangerButtonClassName}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Clear session
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <nav
            aria-label="Session phases"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 p-3 shadow-sm lg:sticky lg:top-6"
          >
            <ol className="grid gap-1">
              {phases.map((phase, index) => (
                <li key={phase}>
                  <button
                    type="button"
                    onClick={() => updateSession({ activePhase: index })}
                    className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-antique-gold)] ${
                      session.activePhase === index
                        ? "bg-[var(--color-forest-900)] text-white"
                        : "text-[var(--color-forest-900)] hover:bg-[var(--color-mist)]"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                        session.activePhase === index
                          ? "bg-white/16 text-white"
                          : "bg-[var(--color-mist)] text-[var(--color-leaf)]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {phase}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 space-y-5">
            {session.activePhase === 0 ? (
              <PhaseCard title="Session setup">
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoBlock title="Current participant code">
                    {session.participantCode || "Not set"}
                  </InfoBlock>
                  <InfoBlock title="Assigned condition">
                    {variantLabels[session.variant]}
                  </InfoBlock>
                </div>
                <p className="mt-5 text-sm leading-6 text-[var(--color-stone)]">
                  Use manual assignment or the balanced assignment button before the
                  participant views the profile. Condition labels appear only in this
                  moderator tool.
                </p>
              </PhaseCard>
            ) : null}

            {session.activePhase === 1 ? (
              <PhaseCard
                title="Phase 1 - Real Search Reconstruction"
                target="Target: approximately 8-10 minutes"
              >
                <ModeratorPrompt>
                  Think about the last time you seriously considered finding a
                  counsellor. Walk me through what happened from the beginning.
                </ModeratorPrompt>
                <PromptList items={searchFollowUps} />
                <TextAreaField
                  label="Moderator notes"
                  value={session.pastSearchNotes}
                  onChange={(value) => updateSession({ pastSearchNotes: value })}
                />
              </PhaseCard>
            ) : null}

            {session.activePhase === 2 ? (
              <PhaseCard
                title="Phase 2 - Amina Profile Task"
                target="Target: approximately 8-10 minutes"
              >
                <ModeratorPrompt>
                  Open the assigned Amina profile and give control to the participant.
                </ModeratorPrompt>
                <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4">
                  <h3 className={subheadingClassName}>Participant prompt</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-ink)]/84">
                    Imagine you are looking for a counsellor and this profile appears
                    relevant enough that you opened it. Please look through it as you
                    naturally would. Talk me through what you are noticing and what you
                    are trying to figure out.
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={launchProfile} className={primaryButtonClassName}>
                    Open participant profile
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <Link href={profileHref} target="_blank" className={secondaryButtonClassName}>
                    Open as link
                  </Link>
                </div>
                <TextAreaField
                  label="Initial profile behaviour notes"
                  value={session.profileBehaviourNotes}
                  onChange={(value) =>
                    updateSession({ profileBehaviourNotes: value })
                  }
                />
              </PhaseCard>
            ) : null}

            {session.activePhase === 3 ? (
              <PhaseCard title="Phase 3 - Comprehension Questions">
                <TextAreaField
                  label="Q1: What do you think counselling with Amina would be like?"
                  value={session.q1}
                  onChange={(value) => updateSession({ q1: value })}
                />
                <TextAreaField
                  label="Q2: What kinds of concerns does she seem to work with most?"
                  value={session.q2}
                  onChange={(value) => updateSession({ q2: value })}
                />
                <TextAreaField
                  label="Q3: What makes you think that?"
                  value={session.q3}
                  onChange={(value) => updateSession({ q3: value })}
                />
                <TextAreaField
                  label="Q4: What are you still unsure about?"
                  value={session.q4}
                  onChange={(value) => updateSession({ q4: value })}
                />
                <fieldset className="mt-4">
                  <legend className={labelClassName}>
                    Q5: Based only on this profile, would you consider speaking with her?
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["Yes", "Maybe", "No"] as const).map((answer) => (
                      <RadioPill
                        key={answer}
                        name="considerSpeaking"
                        label={answer}
                        checked={session.considerSpeaking === answer}
                        onChange={() => updateSession({ considerSpeaking: answer })}
                      />
                    ))}
                  </div>
                </fieldset>
                <TextAreaField
                  label="Why?"
                  value={session.considerWhy}
                  onChange={(value) => updateSession({ considerWhy: value })}
                />
              </PhaseCard>
            ) : null}

            {session.activePhase === 4 ? (
              <PhaseCard title="Phase 4 - Recall Test">
                <ModeratorPrompt>
                  Without looking back at the page, tell me what you remember about
                  Amina.
                </ModeratorPrompt>
                <TextAreaField
                  label="Recall notes"
                  value={session.recallNotes}
                  onChange={(value) => updateSession({ recallNotes: value })}
                />
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="border-b border-[var(--color-border)] py-3 pr-4 text-[var(--color-forest-900)]">
                          Recall item
                        </th>
                        {recallStatuses.map((status) => (
                          <th
                            key={status}
                            className="border-b border-[var(--color-border)] px-3 py-3 text-[var(--color-forest-900)]"
                          >
                            {status}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recallItems.map((item) => (
                        <tr key={item}>
                          <td className="border-b border-[var(--color-border)] py-3 pr-4 font-semibold text-[var(--color-ink)]/84">
                            {item}
                          </td>
                          {recallStatuses.map((status) => (
                            <td
                              key={status}
                              className="border-b border-[var(--color-border)] px-3 py-3"
                            >
                              <input
                                type="radio"
                                name={`recall-${item}`}
                                checked={session.recallCoding[item] === status}
                                onChange={() =>
                                  updateSession({
                                    recallCoding: {
                                      ...session.recallCoding,
                                      [item]: status,
                                    },
                                  })
                                }
                                className="h-4 w-4 accent-[var(--color-forest-900)]"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PhaseCard>
            ) : null}

            {session.activePhase === 5 ? (
              <PhaseCard title="Phase 5 - Missing Information Probe">
                <ModeratorPrompt>
                  Is there anything you would need to know before deciding whether to
                  contact Amina?
                </ModeratorPrompt>
                <ModeratorPrompt>
                  If this were a real counsellor, is there anything you would look up
                  somewhere else?
                </ModeratorPrompt>
                <ModeratorPrompt>
                  If yes: Where would you go and what would you try to find?
                </ModeratorPrompt>
                <TextAreaField
                  label="Missing information notes"
                  value={session.missingInfoNotes}
                  onChange={(value) => updateSession({ missingInfoNotes: value })}
                />
                <CheckboxGroup
                  legend="External destination tags"
                  options={externalDestinationTags}
                  values={session.externalLookupTags}
                  onChange={(values) => updateSession({ externalLookupTags: values })}
                />
                <TextAreaField
                  label="External lookup notes"
                  value={session.externalLookupNotes}
                  onChange={(value) => updateSession({ externalLookupNotes: value })}
                />
              </PhaseCard>
            ) : null}

            {session.activePhase === 6 ? (
              <PhaseCard title="Phase 6 - Contact Readiness">
                <ModeratorPrompt>
                  Imagine this is real. Show me what you would do next.
                </ModeratorPrompt>
                <SelectField
                  label="Researcher-recorded behaviour"
                  value={session.contactBehaviour}
                  options={contactBehaviourOptions}
                  onChange={(value) => updateSession({ contactBehaviour: value })}
                />
                {session.contactBehaviour === "Other" ? (
                  <TextField
                    label="Other behaviour"
                    value={session.contactBehaviourOther}
                    onChange={(value) =>
                      updateSession({ contactBehaviourOther: value })
                    }
                  />
                ) : null}
                <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4">
                  <h3 className={subheadingClassName}>
                    If they choose Contact, ask before they proceed
                  </h3>
                  <TextAreaField
                    label="What do you think will happen if you press this?"
                    value={session.contactPrediction}
                    onChange={(value) => updateSession({ contactPrediction: value })}
                  />
                  <TextAreaField
                    label="Do you think you are booking therapy, starting a consultation, or just making contact?"
                    value={session.contactMeaning}
                    onChange={(value) => updateSession({ contactMeaning: value })}
                  />
                  <TextAreaField
                    label="Do you think contacting her commits you to ongoing counselling?"
                    value={session.contactCommitment}
                    onChange={(value) => updateSession({ contactCommitment: value })}
                  />
                  <TextAreaField
                    label="Who do you think will receive what you send?"
                    value={session.contactRecipient}
                    onChange={(value) => updateSession({ contactRecipient: value })}
                  />
                  <TextAreaField
                    label="Is there anything that would stop you from continuing right now?"
                    value={session.contactBarrier}
                    onChange={(value) => updateSession({ contactBarrier: value })}
                  />
                </div>
              </PhaseCard>
            ) : null}

            {session.activePhase === 7 ? (
              <PhaseCard title="Phase 7 - Final Reflection">
                <PromptList
                  items={[
                    "What information mattered most in deciding whether Amina was worth contacting?",
                    "What information felt less useful?",
                    "Was anything repetitive?",
                    "Was anything hard to understand?",
                    "Was there anything you expected to find but could not?",
                    "Did anything make Amina seem different from other counsellors you have seen online?",
                  ]}
                />
                <TextAreaField
                  label="Final reflection notes"
                  value={session.finalReflectionNotes}
                  onChange={(value) =>
                    updateSession({ finalReflectionNotes: value })
                  }
                />
                <TextAreaField
                  label="Key quotes / observations"
                  value={session.keyQuotes}
                  onChange={(value) => updateSession({ keyQuotes: value })}
                />
              </PhaseCard>
            ) : null}

            {session.activePhase === 8 ? (
              <PhaseCard title="Core research scoring">
                <div className="grid gap-4 md:grid-cols-2">
                  <ScoreSelect
                    label="A. How accurately did the participant understand Amina's services and approach?"
                    value={session.profileComprehension}
                    onChange={(value) =>
                      updateSession({ profileComprehension: value })
                    }
                    hint="1 = Poor, 5 = Very strong"
                  />
                  <ScoreSelect
                    label="B. How clearly could the participant describe what counselling with Amina may be like?"
                    value={session.relationalComprehension}
                    onChange={(value) =>
                      updateSession({ relationalComprehension: value })
                    }
                    hint="1 = Poor, 5 = Very strong"
                  />
                  <ScoreSelect
                    label="C. Did the profile give meaningful reasons why Amina might differ from another counsellor?"
                    value={session.differentiation}
                    onChange={(value) => updateSession({ differentiation: value })}
                    hint="1 = Poor, 5 = Very strong"
                  />
                  <ScoreSelect
                    label="E. Cognitive effort"
                    value={session.cognitiveEffort}
                    onChange={(value) => updateSession({ cognitiveEffort: value })}
                    hint="1 = Very easy, 5 = Very difficult"
                  />
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="D. Remaining uncertainty"
                    value={session.remainingUncertainty}
                    options={remainingUncertaintyOptions}
                    onChange={(value) =>
                      updateSession({
                        remainingUncertainty: value as RemainingUncertainty,
                      })
                    }
                  />
                  <SelectField
                    label="F. Contact readiness"
                    value={session.contactReadiness}
                    options={contactReadinessOptions}
                    onChange={(value) =>
                      updateSession({ contactReadiness: value as ContactReadiness })
                    }
                  />
                </div>
                <div className="mt-6 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4">
                  <h3 className={subheadingClassName}>
                    Decision explanation quality
                  </h3>
                  <SelectField
                    label="Coding"
                    value={session.decisionQuality}
                    options={decisionQualityOptions}
                    onChange={(value) =>
                      updateSession({ decisionQuality: value as DecisionQuality })
                    }
                  />
                  <p className="mt-3 text-sm leading-6 text-[var(--color-stone)]">
                    High: grounded in information actually present. Medium: partially
                    grounded but mixed with subjective inference. Low / unsupported:
                    depends heavily on something the profile did not establish.
                  </p>
                  <TextAreaField
                    label="Evidence / rationale for coding"
                    value={session.decisionEvidence}
                    onChange={(value) => updateSession({ decisionEvidence: value })}
                  />
                </div>
                <div className="mt-6 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4">
                  <h3 className={subheadingClassName}>
                    Did the participant infer something the profile did not say?
                  </h3>
                  <CheckboxGroup
                    legend="Misinterpretation tags"
                    options={misinterpretationTags}
                    values={session.misinterpretationTags}
                    onChange={(values) =>
                      updateSession({ misinterpretationTags: values })
                    }
                  />
                  {session.misinterpretationTags.includes("other") ? (
                    <TextField
                      label="Other misinterpretation"
                      value={session.misinterpretationOther}
                      onChange={(value) =>
                        updateSession({ misinterpretationOther: value })
                      }
                    />
                  ) : null}
                  <TextAreaField
                    label="Free-text explanation"
                    value={session.misinterpretationExplanation}
                    onChange={(value) =>
                      updateSession({ misinterpretationExplanation: value })
                    }
                  />
                </div>
                <div className="mt-6 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4">
                  <SelectField
                    label="Healthy exit vs failure outcome"
                    value={session.outcome}
                    options={outcomeOptions}
                    onChange={(value) => updateSession({ outcome: value as Outcome })}
                  />
                  <PromptList items={outcomeDefinitions} />
                </div>
                <TextAreaField
                  label="Moderator interpretation"
                  value={session.moderatorInterpretation}
                  onChange={(value) =>
                    updateSession({ moderatorInterpretation: value })
                  }
                />
              </PhaseCard>
            ) : null}

            {session.activePhase === 9 ? (
              <PhaseCard title="Session summary">
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={copySummary} className={primaryButtonClassName}>
                    <Clipboard className="h-4 w-4" aria-hidden="true" />
                    Copy summary
                  </button>
                  <button type="button" onClick={downloadSummary} className={secondaryButtonClassName}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download .md
                  </button>
                  {copyState === "copied" ? (
                    <p className="self-center text-sm font-semibold text-[var(--color-evergreen)]">
                      Summary copied.
                    </p>
                  ) : null}
                  {copyState === "failed" ? (
                    <p className="self-center text-sm font-semibold text-[var(--color-clay)]">
                      Copy failed. Select the text below instead.
                    </p>
                  ) : null}
                </div>
                <textarea
                  value={summary}
                  readOnly
                  className="mt-5 min-h-[560px] w-full resize-y rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4 font-mono text-xs leading-5 text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-antique-gold)]"
                  aria-label="Markdown session summary"
                />
              </PhaseCard>
            ) : null}

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  updateSession({
                    activePhase: Math.max(0, session.activePhase - 1),
                  })
                }
                className={secondaryButtonClassName}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  updateSession({
                    activePhase: Math.min(phases.length - 1, session.activePhase + 1),
                  })
                }
                className={primaryButtonClassName}
              >
                Next phase
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function PhaseCard({
  title,
  target,
  children,
}: {
  title: string;
  target?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 p-5 shadow-sm md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-serif text-3xl leading-[1.1] text-[var(--color-forest-900)]">
          {title}
        </h2>
        {target ? (
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-mist)] px-3 py-2 text-xs font-semibold text-[var(--color-forest-900)]">
            {target}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ModeratorPrompt({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="mt-4 border-l-4 border-[var(--color-sage)] bg-[var(--color-mist)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-forest-900)]">
      {children}
    </blockquote>
  );
}

function PromptList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 grid gap-2 text-sm leading-6 text-[var(--color-ink)]/84">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-leaf)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-leaf)]">
        {title}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--color-forest-900)]">
        {children}
      </p>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 grid gap-2">
      <span className={labelClassName}>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className={`${inputClassName} min-h-32 resize-y leading-6`}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 grid gap-2">
      <span className={labelClassName}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 grid gap-2">
      <span className={labelClassName}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScoreSelect({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
}) {
  return (
    <label className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4">
      <span className={labelClassName}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      >
        <option value="">Select...</option>
        {scoreOptions.map((score) => (
          <option key={score} value={score}>
            {score}
          </option>
        ))}
      </select>
      <span className="text-xs leading-5 text-[var(--color-stone)]">{hint}</span>
    </label>
  );
}

function RadioPill({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center rounded-[var(--radius-sm)] border px-4 text-sm font-semibold ${
        checked
          ? "border-[var(--color-forest-900)] bg-[var(--color-forest-900)] text-white"
          : "border-[var(--color-border)] bg-[var(--color-cream)] text-[var(--color-forest-900)]"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}

function CheckboxGroup({
  legend,
  options,
  values,
  onChange,
}: {
  legend: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className={labelClassName}>{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option);

          return (
            <label
              key={option}
              className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-3 text-sm font-semibold ${
                checked
                  ? "border-[var(--color-forest-900)] bg-[var(--color-forest-900)] text-white"
                  : "border-[var(--color-border)] bg-white text-[var(--color-forest-900)]"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked
                      ? values.filter((value) => value !== option)
                      : [...values, option],
                  )
                }
                className="h-4 w-4 accent-[var(--color-forest-900)]"
              />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function generateSummary(
  session: SessionData,
  elapsedSeconds: number,
  completeness: SessionCompleteness,
) {
  const date = session.startedAt
    ? new Intl.DateTimeFormat("en-CA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(session.startedAt))
    : "";
  const recallLines = recallItems
    .map((item) => `- ${item}: ${session.recallCoding[item]}`)
    .join("\n");
  const misinterpretations =
    session.misinterpretationTags.length > 0
      ? [
          session.misinterpretationTags.join(", "),
          session.misinterpretationOther
            ? `Other: ${session.misinterpretationOther}`
            : "",
          session.misinterpretationExplanation,
        ]
          .filter(Boolean)
          .join("\n\n")
      : session.misinterpretationExplanation.trim() || "Uncoded";

  return `# BCMC T1 Session - ${session.participantCode || "Unassigned"}

Participant code: ${session.participantCode || "Not recorded"}
T1 condition: ${variantLabels[session.variant]}
Session date: ${date}
Elapsed session time: ${formatElapsed(elapsedSeconds)}
Session completeness: ${completeness.complete ? "Complete" : "Incomplete"}
${completeness.complete ? "" : `Incomplete phases: ${completeness.incompletePhases.join(", ")}\n`}

## Past Search Behaviour
${emptyFallback(session.pastSearchNotes)}

## Initial Profile Behaviour
${emptyFallback(session.profileBehaviourNotes)}

## Comprehension
Q1 - What counselling with Amina would be like:
${emptyFallback(session.q1)}

Q2 - Concerns she seems to work with most:
${emptyFallback(session.q2)}

Q3 - Evidence:
${emptyFallback(session.q3)}

Q4 - Remaining uncertainty:
${emptyFallback(session.q4)}

Would consider speaking with her: ${emptyFallback(session.considerSpeaking)}

Why:
${emptyFallback(session.considerWhy)}

## Recall
${emptyFallback(session.recallNotes)}

${recallLines}

## Missing Information
${emptyFallback(session.missingInfoNotes)}

External lookup tags: ${listFallback(session.externalLookupTags)}

External lookup notes:
${emptyFallback(session.externalLookupNotes)}

## Contact Behaviour
Recorded behaviour: ${emptyFallback(session.contactBehaviour)}
${session.contactBehaviourOther ? `Other behaviour: ${session.contactBehaviourOther}\n` : ""}
What they think will happen:
${emptyFallback(session.contactPrediction)}

Booking, consultation, or contact:
${emptyFallback(session.contactMeaning)}

Commitment understanding:
${emptyFallback(session.contactCommitment)}

Who receives the message:
${emptyFallback(session.contactRecipient)}

Barrier to continuing:
${emptyFallback(session.contactBarrier)}

## Scores
- Profile comprehension: ${scoreFallback(session.profileComprehension)}
- Relational comprehension: ${scoreFallback(session.relationalComprehension)}
- Differentiation: ${scoreFallback(session.differentiation)}
- Cognitive effort: ${scoreFallback(session.cognitiveEffort)}
- Remaining uncertainty: ${emptyFallback(session.remainingUncertainty)}
- Contact readiness: ${emptyFallback(session.contactReadiness)}
- Decision explanation quality: ${emptyFallback(session.decisionQuality)}
- Outcome: ${emptyFallback(session.outcome)}

Decision explanation evidence:
${emptyFallback(session.decisionEvidence)}

## Misinterpretations
${misinterpretations}

## Key Quotes / Observations
${emptyFallback(session.keyQuotes)}

## Final Reflection
${emptyFallback(session.finalReflectionNotes)}

## Moderator Interpretation
${emptyFallback(session.moderatorInterpretation)}
`;
}

function emptyFallback(value: string) {
  return value.trim() || "Not recorded";
}

function listFallback(values: string[]) {
  return values.length > 0 ? values.join(", ") : "None recorded";
}

function scoreFallback(value: string) {
  return value ? `${value}/5` : "Not recorded";
}

function sanitizeFilename(value: string) {
  return value.trim().replace(/[^a-z0-9-]+/gi, "_").replace(/^_+|_+$/g, "");
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

type SessionCompleteness = {
  complete: boolean;
  incompletePhases: string[];
};

function getSessionCompleteness(session: SessionData): SessionCompleteness {
  const incompletePhases = [
    isBlank(session.participantCode) ? "Setup" : "",
    isBlank(session.pastSearchNotes) ? "Real Search Reconstruction" : "",
    isBlank(session.profileBehaviourNotes) ? "Amina Profile Task" : "",
    areAnyBlank([
      session.q1,
      session.q2,
      session.q3,
      session.q4,
      session.considerSpeaking,
      session.considerWhy,
    ])
      ? "Comprehension Questions"
      : "",
    isBlank(session.recallNotes) ||
    recallItems.some((item) => session.recallCoding[item] === "Uncoded")
      ? "Recall Test"
      : "",
    isBlank(session.missingInfoNotes) ? "Missing Information Probe" : "",
    areAnyBlank([
      session.contactBehaviour,
      session.contactPrediction,
      session.contactMeaning,
      session.contactCommitment,
      session.contactRecipient,
      session.contactBarrier,
    ]) ||
    (session.contactBehaviour === "Other" && isBlank(session.contactBehaviourOther))
      ? "Contact Readiness"
      : "",
    isBlank(session.finalReflectionNotes) ? "Final Reflection" : "",
    areAnyBlank([
      session.profileComprehension,
      session.relationalComprehension,
      session.differentiation,
      session.remainingUncertainty,
      session.cognitiveEffort,
      session.contactReadiness,
      session.decisionQuality,
      session.decisionEvidence,
      session.outcome,
      session.moderatorInterpretation,
    ])
      ? "Scoring"
      : "",
  ].filter(Boolean);

  return {
    complete: incompletePhases.length === 0,
    incompletePhases,
  };
}

function normalizeLoadedSession(savedSession: Partial<SessionData>): SessionData {
  const emptySession = createEmptySession();
  const mergedSession = { ...emptySession, ...savedSession };
  const savedRecallCoding = savedSession.recallCoding ?? {};
  const savedRecallValues = Object.values(savedRecallCoding);
  const legacyBlankRecallCoding =
    savedRecallValues.length > 0 &&
    savedRecallValues.every((value) => value === "Not recalled") &&
    isBlank(savedSession.recallNotes ?? "");

  return {
    ...mergedSession,
    recallCoding: Object.fromEntries(
      recallItems.map((item) => [
        item,
        legacyBlankRecallCoding
          ? "Uncoded"
          : savedRecallCoding[item] ?? emptySession.recallCoding[item],
      ]),
    ) as Record<string, RecallStatus>,
  };
}

function hasEnteredResearchData(session: SessionData) {
  const emptySession = createEmptySession();
  const fieldsToIgnore: (keyof SessionData)[] = [
    "activePhase",
    "startedAt",
    "variant",
  ];

  return (Object.keys(emptySession) as (keyof SessionData)[]).some((key) => {
    if (fieldsToIgnore.includes(key)) {
      return false;
    }

    return JSON.stringify(session[key]) !== JSON.stringify(emptySession[key]);
  });
}

function areAnyBlank(values: readonly string[]) {
  return values.some(isBlank);
}

function isBlank(value: string) {
  return value.trim() === "";
}

function normalizeParticipantCode(value: string) {
  return value.trim().toUpperCase();
}

function readUsedParticipantCodes() {
  const storage = getStorage();
  const savedCodes = storage?.getItem(exportedCodesKey);

  if (!savedCodes) {
    return [];
  }

  try {
    const parsedCodes = JSON.parse(savedCodes);

    if (!Array.isArray(parsedCodes)) {
      return [];
    }

    return parsedCodes
      .filter((code): code is string => typeof code === "string")
      .map(normalizeParticipantCode);
  } catch {
    return [];
  }
}

function getStorage() {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

const labelClassName = "text-sm font-semibold text-[var(--color-forest-900)]";
const subheadingClassName =
  "text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-leaf)]";
const inputClassName =
  "w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-antique-gold)]";
const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-forest-900)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]";
const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-forest-900)] shadow-sm transition-colors hover:border-[var(--color-sage)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]";
const quietDangerButtonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-clay)] shadow-sm transition-colors hover:border-[var(--color-clay)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]";
