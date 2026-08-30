"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CheckboxGroup,
  ResearchStatementCard,
  SectionCard,
  SelectField,
  Stage2Shell,
  SummaryActions,
  TextAreaField,
  emptyFallback,
  formatElapsed,
  getStorage,
  listFallback,
  primaryButtonClassName,
  sanitizeFilename,
  secondaryButtonClassName,
} from "./stage2Shared";

type YesNoNotSure = "Yes" | "No" | "Not sure" | "";
type Correctness = "Correct" | "Partly correct" | "Incorrect" | "Unclear" | "";
type JudgmentConcern = "None" | "Minor" | "Moderate" | "Strong" | "";

type FaithResponse = {
  counsellingKind: string;
  automaticallyBringReligion: YesNoNotSure;
  needToBeReligious: YesNoNotSure;
  whoDecides: string;
  providesIslamicCounselling: YesNoNotSure;
  clarificationNeeded: string;
  correctness: Correctness;
  falseInferenceTags: string[];
  falseInferenceOther: string;
  perceivedJudgmentConcern: JudgmentConcern;
  comprehensionConfidence: string;
};

type FaithSession = {
  participantCode: string;
  startedAt: string;
  activeStatement: number;
  responses: Record<string, FaithResponse>;
  moreReligious: string;
  moreReligiousReason: string;
  appropriateNoAutomaticReligion: string;
  activelyWantFaithIntegrated: string;
  explicitlyIslamicCounselling: string;
  statementsMisunderstood: string;
  termsMisunderstood: string;
  hierarchyInference: string;
  confusingWording: string;
  accurateTeachBack: string;
  keyQuotes: string;
  moderatorRecommendation: string;
};

const storageKey = "bcmc-stage-2-faith-draft";

const statements = [
  {
    id: "a",
    label: "Counsellor A",
    internalLabel: "Muslim identity, faith discussion welcome",
    text: "I identify as Muslim and am comfortable discussing religion or spirituality when they are relevant to you. I do not assume you want faith included in counselling simply because we are both Muslim.",
  },
  {
    id: "b",
    label: "Counsellor B",
    internalLabel: "Client-led faith inclusion",
    text: "If you want faith or spirituality to play an active role in counselling, I can intentionally include your beliefs, values, or practices in our work. You decide whether and how this happens.",
  },
  {
    id: "c",
    label: "Counsellor C",
    internalLabel: "Muslim but not faith-integrated",
    text: "I identify as Muslim, but I do not specifically practise faith-integrated or Islamic counselling. Religion and spirituality are welcome topics when they matter to you.",
  },
  {
    id: "d",
    label: "Counsellor D",
    internalLabel: "Explicit Islamic counselling",
    text: "I offer Islamic counselling as a defined part of my practice. For clients who choose this approach, Islamic concepts may intentionally form part of the therapeutic work. My profile also explains my relevant training and what I mean by Islamic counselling.",
  },
] as const;

const yesNoNotSureOptions: YesNoNotSure[] = ["Yes", "No", "Not sure"];
const correctnessOptions: Correctness[] = [
  "Correct",
  "Partly correct",
  "Incorrect",
  "Unclear",
];
const judgmentConcernOptions: JudgmentConcern[] = [
  "None",
  "Minor",
  "Moderate",
  "Strong",
];
const confidenceOptions = ["1", "2", "3", "4", "5"] as const;
const falseInferenceOptions = [
  "Assumed Muslim = Islamic counselling",
  "Assumed Islamic counselling = more religious counsellor",
  "Assumed faith discussion = faith automatically introduced",
  "Assumed Muslim identity = cultural competence",
  "Assumed faith integration = theological expertise",
  "Assumed Islamic counselling = only for highly practising Muslims",
  "Other",
] as const;

function createEmptyResponse(): FaithResponse {
  return {
    counsellingKind: "",
    automaticallyBringReligion: "",
    needToBeReligious: "",
    whoDecides: "",
    providesIslamicCounselling: "",
    clarificationNeeded: "",
    correctness: "",
    falseInferenceTags: [],
    falseInferenceOther: "",
    perceivedJudgmentConcern: "",
    comprehensionConfidence: "",
  };
}

function createEmptyFaithSession(): FaithSession {
  return {
    participantCode: "",
    startedAt: new Date().toISOString(),
    activeStatement: 0,
    responses: Object.fromEntries(
      statements.map((statement) => [statement.id, createEmptyResponse()]),
    ) as Record<string, FaithResponse>,
    moreReligious: "",
    moreReligiousReason: "",
    appropriateNoAutomaticReligion: "",
    activelyWantFaithIntegrated: "",
    explicitlyIslamicCounselling: "",
    statementsMisunderstood: "",
    termsMisunderstood: "",
    hierarchyInference: "",
    confusingWording: "",
    accurateTeachBack: "",
    keyQuotes: "",
    moderatorRecommendation: "",
  };
}

export function FaithComprehensionTool() {
  const [session, setSession] = useState<FaithSession>(() => {
    if (typeof window === "undefined") {
      return createEmptyFaithSession();
    }

    const savedSession = getStorage()?.getItem(storageKey);

    if (!savedSession) {
      return createEmptyFaithSession();
    }

    try {
      const parsed = JSON.parse(savedSession) as Partial<FaithSession>;
      return {
        ...createEmptyFaithSession(),
        ...parsed,
        responses: {
          ...createEmptyFaithSession().responses,
          ...parsed.responses,
        },
      };
    } catch {
      return createEmptyFaithSession();
    }
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    getStorage()?.setItem(storageKey, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)),
      );
    }, 1000);

    return () => window.clearInterval(interval);
  }, [session.startedAt]);

  const activeStatement = statements[session.activeStatement];
  const activeResponse = session.responses[activeStatement.id];
  const summary = useMemo(
    () => generateFaithSummary(session, elapsedSeconds),
    [elapsedSeconds, session],
  );

  function updateSession(updates: Partial<FaithSession>) {
    setSession((current) => ({ ...current, ...updates }));
  }

  function updateActiveResponse(updates: Partial<FaithResponse>) {
    setSession((current) => ({
      ...current,
      responses: {
        ...current.responses,
        [activeStatement.id]: {
          ...current.responses[activeStatement.id],
          ...updates,
        },
      },
    }));
  }

  return (
    <Stage2Shell
      eyebrow="Internal T2 moderator tool"
      title="Faith terminology exercise"
      description="Use one statement at a time first. The participant-facing wording should focus on what each description means, not on research labels or hypotheses."
      elapsedSeconds={elapsedSeconds}
      participantCode={session.participantCode}
      onParticipantCodeChange={(participantCode) => updateSession({ participantCode })}
    >
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 p-3 shadow-sm lg:sticky lg:top-6">
          <ol className="grid gap-2">
            {statements.map((statement, index) => (
              <li key={statement.id}>
                <button
                  type="button"
                  onClick={() => updateSession({ activeStatement: index })}
                  className={`w-full rounded-[var(--radius-sm)] px-3 py-3 text-left text-sm font-semibold ${
                    session.activeStatement === index
                      ? "bg-[var(--color-forest-900)] text-white"
                      : "text-[var(--color-forest-900)] hover:bg-[var(--color-mist)]"
                  }`}
                >
                  {statement.label}
                  <span className="block pt-1 text-xs font-normal opacity-80">
                    {statement.internalLabel}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="space-y-6">
          <SectionCard title="Individual statement teach-back">
            <ResearchStatementCard
              label={activeStatement.label}
              statement={activeStatement.text}
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextAreaField
                label="Q1: What kind of counselling do you think this person offers?"
                value={activeResponse.counsellingKind}
                onChange={(value) => updateActiveResponse({ counsellingKind: value })}
              />
              <TextAreaField
                label="Q4: Who decides whether religion becomes part of therapy?"
                value={activeResponse.whoDecides}
                onChange={(value) => updateActiveResponse({ whoDecides: value })}
              />
              <SelectField
                label="Q2: Would they automatically bring religion into therapy?"
                value={activeResponse.automaticallyBringReligion}
                options={yesNoNotSureOptions}
                onChange={(value) =>
                  updateActiveResponse({
                    automaticallyBringReligion: value as YesNoNotSure,
                  })
                }
              />
              <SelectField
                label="Q3: Would a client need to be religious or practising to see them?"
                value={activeResponse.needToBeReligious}
                options={yesNoNotSureOptions}
                onChange={(value) =>
                  updateActiveResponse({ needToBeReligious: value as YesNoNotSure })
                }
              />
              <SelectField
                label="Q5: Does this counsellor provide Islamic counselling?"
                value={activeResponse.providesIslamicCounselling}
                options={yesNoNotSureOptions}
                onChange={(value) =>
                  updateActiveResponse({
                    providesIslamicCounselling: value as YesNoNotSure,
                  })
                }
              />
              <TextAreaField
                label="Q6: What would you want clarified before contacting them?"
                value={activeResponse.clarificationNeeded}
                onChange={(value) =>
                  updateActiveResponse({ clarificationNeeded: value })
                }
              />
            </div>

            <div className="mt-6 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-leaf)]">
                Moderator coding for this statement
              </h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <SelectField
                  label="Correctness"
                  value={activeResponse.correctness}
                  options={correctnessOptions}
                  onChange={(value) =>
                    updateActiveResponse({ correctness: value as Correctness })
                  }
                />
                <SelectField
                  label="Perceived judgment concern"
                  value={activeResponse.perceivedJudgmentConcern}
                  options={judgmentConcernOptions}
                  onChange={(value) =>
                    updateActiveResponse({
                      perceivedJudgmentConcern: value as JudgmentConcern,
                    })
                  }
                />
                <SelectField
                  label="Comprehension confidence"
                  value={activeResponse.comprehensionConfidence}
                  options={confidenceOptions}
                  onChange={(value) =>
                    updateActiveResponse({ comprehensionConfidence: value })
                  }
                />
              </div>
              <div className="mt-4">
                <CheckboxGroup
                  legend="False inference tags"
                  options={falseInferenceOptions}
                  values={activeResponse.falseInferenceTags}
                  onChange={(falseInferenceTags) =>
                    updateActiveResponse({ falseInferenceTags })
                  }
                />
              </div>
              {activeResponse.falseInferenceTags.includes("Other") ? (
                <div className="mt-4">
                  <TextAreaField
                    label="Other false inference"
                    value={activeResponse.falseInferenceOther}
                    onChange={(value) =>
                      updateActiveResponse({ falseInferenceOther: value })
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  updateSession({
                    activeStatement: Math.max(0, session.activeStatement - 1),
                  })
                }
                className={secondaryButtonClassName}
              >
                Previous statement
              </button>
              <button
                type="button"
                onClick={() =>
                  updateSession({
                    activeStatement: Math.min(
                      statements.length - 1,
                      session.activeStatement + 1,
                    ),
                  })
                }
                className={primaryButtonClassName}
              >
                Next statement
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Show all four together">
            <div className="grid gap-4 md:grid-cols-2">
              {statements.map((statement) => (
                <ResearchStatementCard
                  key={statement.id}
                  label={statement.label}
                  statement={statement.text}
                />
              ))}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextAreaField
                label="Which, if any, seems more religious to you?"
                value={session.moreReligious}
                onChange={(moreReligious) => updateSession({ moreReligious })}
              />
              <TextAreaField
                label="What made you think that?"
                value={session.moreReligiousReason}
                onChange={(moreReligiousReason) =>
                  updateSession({ moreReligiousReason })
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Comparison scenarios">
            <div className="grid gap-4">
              <TextAreaField
                label="Want a Muslim counsellor but do not want religion automatically brought into therapy. Which descriptions still feel appropriate?"
                value={session.appropriateNoAutomaticReligion}
                onChange={(appropriateNoAutomaticReligion) =>
                  updateSession({ appropriateNoAutomaticReligion })
                }
              />
              <TextAreaField
                label="Actively want faith integrated into therapy. Which descriptions seem relevant?"
                value={session.activelyWantFaithIntegrated}
                onChange={(activelyWantFaithIntegrated) =>
                  updateSession({ activelyWantFaithIntegrated })
                }
              />
              <TextAreaField
                label="Want explicitly Islamic counselling. Which description would you choose?"
                value={session.explicitlyIslamicCounselling}
                onChange={(explicitlyIslamicCounselling) =>
                  updateSession({ explicitlyIslamicCounselling })
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Faith terminology summary">
            <div className="grid gap-4 md:grid-cols-2">
              <TextAreaField
                label="Statements misunderstood"
                value={session.statementsMisunderstood}
                onChange={(statementsMisunderstood) =>
                  updateSession({ statementsMisunderstood })
                }
              />
              <TextAreaField
                label="Terms misunderstood"
                value={session.termsMisunderstood}
                onChange={(termsMisunderstood) =>
                  updateSession({ termsMisunderstood })
                }
              />
              <TextAreaField
                label="Hierarchy / religiosity inference"
                value={session.hierarchyInference}
                onChange={(hierarchyInference) =>
                  updateSession({ hierarchyInference })
                }
              />
              <TextAreaField
                label="Wording that caused confusion"
                value={session.confusingWording}
                onChange={(confusingWording) =>
                  updateSession({ confusingWording })
                }
              />
              <TextAreaField
                label="Wording participants could accurately teach back"
                value={session.accurateTeachBack}
                onChange={(accurateTeachBack) =>
                  updateSession({ accurateTeachBack })
                }
              />
              <TextAreaField
                label="Key quotes"
                value={session.keyQuotes}
                onChange={(keyQuotes) => updateSession({ keyQuotes })}
              />
            </div>
            <div className="mt-4">
              <TextAreaField
                label="Moderator recommendation"
                value={session.moderatorRecommendation}
                onChange={(moderatorRecommendation) =>
                  updateSession({ moderatorRecommendation })
                }
              />
            </div>
            <div className="mt-5">
              <SummaryActions
                summary={summary}
                filename={`bcmc-stage-2-faith-${sanitizeFilename(
                  session.participantCode,
                )}.md`}
              />
            </div>
            <textarea
              value={summary}
              readOnly
              className="mt-5 min-h-[420px] w-full resize-y rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4 font-mono text-xs leading-5 text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-antique-gold)]"
              aria-label="Faith terminology Markdown summary"
            />
          </SectionCard>
        </div>
      </div>
    </Stage2Shell>
  );
}

function generateFaithSummary(session: FaithSession, elapsedSeconds: number) {
  const responseLines = statements
    .map((statement) => {
      const response = session.responses[statement.id];

      return `### ${statement.label}
Internal description: ${statement.internalLabel}

Kind of counselling:
${emptyFallback(response.counsellingKind)}

Automatically brings religion: ${emptyFallback(response.automaticallyBringReligion)}
Need to be religious/practising: ${emptyFallback(response.needToBeReligious)}
Who decides: ${emptyFallback(response.whoDecides)}
Provides Islamic counselling: ${emptyFallback(response.providesIslamicCounselling)}

Clarification needed:
${emptyFallback(response.clarificationNeeded)}

Moderator coding:
- Correctness: ${emptyFallback(response.correctness)}
- False inference tags: ${listFallback(response.falseInferenceTags)}
- Other false inference: ${emptyFallback(response.falseInferenceOther)}
- Perceived judgment concern: ${emptyFallback(response.perceivedJudgmentConcern)}
- Comprehension confidence: ${response.comprehensionConfidence || "Not recorded"}`;
    })
    .join("\n\n");

  return `# BCMC Stage 2 Faith Terminology Session - ${
    session.participantCode || "Unassigned"
  }

Participant code: ${session.participantCode || "Not recorded"}
Session date: ${new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(session.startedAt))}
Elapsed session time: ${formatElapsed(elapsedSeconds)}

## Individual Teach-Back
${responseLines}

## Four-Statement Comparison
More religious:
${emptyFallback(session.moreReligious)}

Reason:
${emptyFallback(session.moreReligiousReason)}

## Need-Based Comparison Scenarios
Muslim counsellor without automatic religion:
${emptyFallback(session.appropriateNoAutomaticReligion)}

Actively wants faith integrated:
${emptyFallback(session.activelyWantFaithIntegrated)}

Explicitly wants Islamic counselling:
${emptyFallback(session.explicitlyIslamicCounselling)}

## Research Summary
Statements misunderstood:
${emptyFallback(session.statementsMisunderstood)}

Terms misunderstood:
${emptyFallback(session.termsMisunderstood)}

Hierarchy / religiosity inference:
${emptyFallback(session.hierarchyInference)}

Wording that caused confusion:
${emptyFallback(session.confusingWording)}

Wording accurately taught back:
${emptyFallback(session.accurateTeachBack)}

Key quotes:
${emptyFallback(session.keyQuotes)}

Moderator recommendation:
${emptyFallback(session.moderatorRecommendation)}
`;
}
