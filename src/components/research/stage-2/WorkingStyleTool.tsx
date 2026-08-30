"use client";

import { useEffect, useMemo, useState } from "react";

import {
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
  sanitizeFilename,
} from "./stage2Shared";

type SortCategory =
  | "I need to know this before contacting"
  | "Useful to know before contacting"
  | "I would rather find this out by meeting them"
  | "This does not matter to me"
  | "I do not understand what this tells me"
  | "";
type Understood = "Yes" | "Partly" | "No" | "";
type ChoiceImpact = "Yes" | "Maybe" | "No" | "";
type PairPreference = "Counsellor A" | "Counsellor B" | "No preference" | "";

type StyleResponse = {
  sortCategory: SortCategory;
  understood: Understood;
  misinterpretation: string;
  usefulness: string;
  affectsChoice: ChoiceImpact;
};

type WorkingStyleSession = {
  participantCode: string;
  startedAt: string;
  responses: Record<string, StyleResponse>;
  priorityIds: string[];
  priorityRationale: string;
  pairPreferences: Record<string, { preference: PairPreference; reason: string }>;
  misunderstoodStatements: string;
  dimensionsNoDifference: string;
  keyQuotes: string;
  moderatorInterpretation: string;
};

const storageKey = "bcmc-stage-2-working-style-draft";

const styleStatements = [
  {
    id: "active-questioning",
    label: "Active questioning",
    text: "I usually ask questions actively rather than expecting you to lead the entire conversation.",
  },
  {
    id: "flexible-structure",
    label: "Flexible structure",
    text: "Sessions usually have some structure, but we can change direction when something important comes up.",
  },
  {
    id: "practical-strategies",
    label: "Practical strategies",
    text: "I often introduce practical exercises or strategies you can try between sessions when they seem useful.",
  },
  {
    id: "pattern-exploration",
    label: "Pattern exploration",
    text: "I often help you understand recurring patterns in your thoughts, emotions, relationships, or behaviour.",
  },
  {
    id: "goal-setting",
    label: "Goal setting",
    text: "We usually identify what you hope will change and revisit those goals over time.",
  },
  {
    id: "psychoeducation",
    label: "Psychoeducation",
    text: "I often explain psychological concepts, patterns, or skills during sessions.",
  },
  {
    id: "client-uncertainty",
    label: "Client uncertainty",
    text: "You do not need to arrive knowing exactly what you want to talk about.",
  },
  {
    id: "feedback",
    label: "Feedback",
    text: "I invite you to tell me when something in counselling is not working for you so we can adjust.",
  },
] as const;

const sortOptions: SortCategory[] = [
  "I need to know this before contacting",
  "Useful to know before contacting",
  "I would rather find this out by meeting them",
  "This does not matter to me",
  "I do not understand what this tells me",
];
const understoodOptions: Understood[] = ["Yes", "Partly", "No"];
const usefulnessOptions = ["1", "2", "3", "4", "5"] as const;
const choiceImpactOptions: ChoiceImpact[] = ["Yes", "Maybe", "No"];
const pairPreferenceOptions: PairPreference[] = [
  "Counsellor A",
  "Counsellor B",
  "No preference",
];

const tradeOffs = [
  {
    id: "structure",
    label: "Pair 1 - More structured vs more open",
    a: "Sessions usually have some structure and we often identify specific goals.",
    b: "Sessions are more open and exploratory, and you can decide where the conversation goes.",
  },
  {
    id: "tools",
    label: "Pair 2 - Practical tools vs exploration",
    a: "I often introduce practical strategies or exercises.",
    b: "I tend to spend more time helping you understand patterns and experiences before introducing strategies.",
  },
  {
    id: "questioning",
    label: "Pair 3 - Active questioning vs more listening",
    a: "I usually ask questions actively and help move the conversation forward.",
    b: "I tend to give you more space and let you decide where the conversation goes.",
  },
] as const;

function createEmptyStyleResponse(): StyleResponse {
  return {
    sortCategory: "",
    understood: "",
    misinterpretation: "",
    usefulness: "",
    affectsChoice: "",
  };
}

function createEmptyWorkingStyleSession(): WorkingStyleSession {
  return {
    participantCode: "",
    startedAt: new Date().toISOString(),
    responses: Object.fromEntries(
      styleStatements.map((statement) => [statement.id, createEmptyStyleResponse()]),
    ) as Record<string, StyleResponse>,
    priorityIds: [],
    priorityRationale: "",
    pairPreferences: Object.fromEntries(
      tradeOffs.map((pair) => [
        pair.id,
        { preference: "" as PairPreference, reason: "" },
      ]),
    ) as WorkingStyleSession["pairPreferences"],
    misunderstoodStatements: "",
    dimensionsNoDifference: "",
    keyQuotes: "",
    moderatorInterpretation: "",
  };
}

export function WorkingStyleTool() {
  const [session, setSession] = useState<WorkingStyleSession>(() => {
    if (typeof window === "undefined") {
      return createEmptyWorkingStyleSession();
    }

    const savedSession = getStorage()?.getItem(storageKey);

    if (!savedSession) {
      return createEmptyWorkingStyleSession();
    }

    try {
      const parsed = JSON.parse(savedSession) as Partial<WorkingStyleSession>;
      return {
        ...createEmptyWorkingStyleSession(),
        ...parsed,
        responses: {
          ...createEmptyWorkingStyleSession().responses,
          ...parsed.responses,
        },
        pairPreferences: {
          ...createEmptyWorkingStyleSession().pairPreferences,
          ...parsed.pairPreferences,
        },
      };
    } catch {
      return createEmptyWorkingStyleSession();
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

  const summary = useMemo(
    () => generateWorkingStyleSummary(session, elapsedSeconds),
    [elapsedSeconds, session],
  );

  function updateSession(updates: Partial<WorkingStyleSession>) {
    setSession((current) => ({ ...current, ...updates }));
  }

  function updateResponse(id: string, updates: Partial<StyleResponse>) {
    setSession((current) => ({
      ...current,
      responses: {
        ...current.responses,
        [id]: {
          ...current.responses[id],
          ...updates,
        },
      },
    }));
  }

  function updatePair(id: string, updates: Partial<{ preference: PairPreference; reason: string }>) {
    setSession((current) => ({
      ...current,
      pairPreferences: {
        ...current.pairPreferences,
        [id]: {
          ...current.pairPreferences[id],
          ...updates,
        },
      },
    }));
  }

  function togglePriority(id: string) {
    const selected = session.priorityIds.includes(id);

    if (selected) {
      updateSession({
        priorityIds: session.priorityIds.filter((priorityId) => priorityId !== id),
      });
      return;
    }

    if (session.priorityIds.length >= 3) {
      return;
    }

    updateSession({ priorityIds: [...session.priorityIds, id] });
  }

  return (
    <Stage2Shell
      eyebrow="Internal T4 moderator tool"
      title="Working-style exercise"
      description="Start with plain-language statements. Use select controls for sorting and coding; there is no correct preference."
      elapsedSeconds={elapsedSeconds}
      participantCode={session.participantCode}
      onParticipantCodeChange={(participantCode) => updateSession({ participantCode })}
    >
      <div className="space-y-6">
        <SectionCard title="Working-style card sort">
          <div className="grid gap-4">
            {styleStatements.map((statement) => {
              const response = session.responses[statement.id];

              return (
                <ResearchStatementCard
                  key={statement.id}
                  label={statement.label}
                  statement={statement.text}
                >
                  <div className="grid gap-4 md:grid-cols-5">
                    <div className="md:col-span-2">
                      <SelectField
                        label="Sort / classification"
                        value={response.sortCategory}
                        options={sortOptions}
                        onChange={(value) =>
                          updateResponse(statement.id, {
                            sortCategory: value as SortCategory,
                          })
                        }
                      />
                    </div>
                    <SelectField
                      label="Understood?"
                      value={response.understood}
                      options={understoodOptions}
                      onChange={(value) =>
                        updateResponse(statement.id, {
                          understood: value as Understood,
                        })
                      }
                    />
                    <SelectField
                      label="Useful?"
                      value={response.usefulness}
                      options={usefulnessOptions}
                      onChange={(value) =>
                        updateResponse(statement.id, { usefulness: value })
                      }
                    />
                    <SelectField
                      label="Affects choice?"
                      value={response.affectsChoice}
                      options={choiceImpactOptions}
                      onChange={(value) =>
                        updateResponse(statement.id, {
                          affectsChoice: value as ChoiceImpact,
                        })
                      }
                    />
                  </div>
                  <div className="mt-4">
                    <TextAreaField
                      label="Misinterpretation?"
                      value={response.misinterpretation}
                      onChange={(value) =>
                        updateResponse(statement.id, { misinterpretation: value })
                      }
                      rows={2}
                    />
                  </div>
                </ResearchStatementCard>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Forced priority exercise">
          <p className="text-sm leading-6 text-[var(--color-stone)]">
            You may know only three of these things about a counsellor before
            deciding whether to contact them. Which three do you keep?
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--color-forest-900)]">
            Selected: {session.priorityIds.length}/3
          </p>
          {session.priorityIds.length !== 3 ? (
            <p className="mt-1 text-sm leading-6 text-[var(--color-clay)]">
              Select exactly three priority statements before treating this exercise
              as complete.
            </p>
          ) : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {styleStatements.map((statement) => {
              const checked = session.priorityIds.includes(statement.id);
              const disabled = !checked && session.priorityIds.length >= 3;

              return (
                <label
                  key={statement.id}
                  className={`flex min-h-12 cursor-pointer items-center rounded-[var(--radius-sm)] border px-3 text-sm font-semibold ${
                    checked
                      ? "border-[var(--color-forest-900)] bg-[var(--color-forest-900)] text-white"
                      : disabled
                        ? "border-[var(--color-border)] bg-white/55 text-[var(--color-stone)]"
                        : "border-[var(--color-border)] bg-white text-[var(--color-forest-900)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => togglePriority(statement.id)}
                    className="mr-2 h-4 w-4 accent-[var(--color-forest-900)]"
                  />
                  {statement.label}
                </label>
              );
            })}
          </div>
          <div className="mt-4">
            <TextAreaField
              label="Why these three?"
              value={session.priorityRationale}
              onChange={(priorityRationale) =>
                updateSession({ priorityRationale })
              }
            />
          </div>
        </SectionCard>

        <SectionCard title="Working-style trade-offs">
          <div className="grid gap-4">
            {tradeOffs.map((pair) => {
              const response = session.pairPreferences[pair.id];

              return (
                <article
                  key={pair.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4"
                >
                  <h3 className="text-lg font-semibold text-[var(--color-forest-900)]">
                    {pair.label}
                  </h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <ResearchStatementCard
                      label="Counsellor A"
                      statement={pair.a}
                    />
                    <ResearchStatementCard
                      label="Counsellor B"
                      statement={pair.b}
                    />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Which would you be more likely to contact?"
                      value={response.preference}
                      options={pairPreferenceOptions}
                      onChange={(value) =>
                        updatePair(pair.id, { preference: value as PairPreference })
                      }
                    />
                    <TextAreaField
                      label="Why?"
                      value={response.reason}
                      onChange={(reason) => updatePair(pair.id, { reason })}
                      rows={3}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Working-style summary">
          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField
              label="Misunderstood statements"
              value={session.misunderstoodStatements}
              onChange={(misunderstoodStatements) =>
                updateSession({ misunderstoodStatements })
              }
            />
            <TextAreaField
              label="Dimensions that made no difference"
              value={session.dimensionsNoDifference}
              onChange={(dimensionsNoDifference) =>
                updateSession({ dimensionsNoDifference })
              }
            />
            <TextAreaField
              label="Key quotes"
              value={session.keyQuotes}
              onChange={(keyQuotes) => updateSession({ keyQuotes })}
            />
            <TextAreaField
              label="Moderator interpretation"
              value={session.moderatorInterpretation}
              onChange={(moderatorInterpretation) =>
                updateSession({ moderatorInterpretation })
              }
            />
          </div>
          <div className="mt-5">
            <SummaryActions
              summary={summary}
              filename={`bcmc-stage-2-working-style-${sanitizeFilename(
                session.participantCode,
              )}.md`}
            />
          </div>
          <textarea
            value={summary}
            readOnly
            className="mt-5 min-h-[420px] w-full resize-y rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4 font-mono text-xs leading-5 text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-antique-gold)]"
            aria-label="Working-style Markdown summary"
          />
        </SectionCard>
      </div>
    </Stage2Shell>
  );
}

function generateWorkingStyleSummary(
  session: WorkingStyleSession,
  elapsedSeconds: number,
) {
  const classificationLines = styleStatements
    .map((statement) => {
      const response = session.responses[statement.id];

      return `- ${statement.label}: ${emptyFallback(response.sortCategory)}
  - Understood: ${emptyFallback(response.understood)}
  - Useful: ${response.usefulness || "Not recorded"}
  - Would affect choice: ${emptyFallback(response.affectsChoice)}
  - Misinterpretation: ${emptyFallback(response.misinterpretation)}`;
    })
    .join("\n");

  const priorityLabels = session.priorityIds
    .map((id) => styleStatements.find((statement) => statement.id === id)?.label)
    .filter((label) => label !== undefined);

  const tradeOffLines = tradeOffs
    .map((pair) => {
      const response = session.pairPreferences[pair.id];

      return `- ${pair.label}: ${emptyFallback(response.preference)}
  - Reason: ${emptyFallback(response.reason)}`;
    })
    .join("\n");

  return `# BCMC Stage 2 Working-Style Session - ${
    session.participantCode || "Unassigned"
  }

Participant code: ${session.participantCode || "Not recorded"}
Session date: ${new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(session.startedAt))}
Elapsed session time: ${formatElapsed(elapsedSeconds)}

## Classification of All Eight Statements
${classificationLines}

## Three Priority Statements
${listFallback(priorityLabels)}

Why these three:
${emptyFallback(session.priorityRationale)}

## Forced Trade-Off Comparisons
${tradeOffLines}

## Misunderstood Statements
${emptyFallback(session.misunderstoodStatements)}

## Dimensions That Made No Difference
${emptyFallback(session.dimensionsNoDifference)}

## Key Quotes
${emptyFallback(session.keyQuotes)}

## Moderator Interpretation
${emptyFallback(session.moderatorInterpretation)}
`;
}
