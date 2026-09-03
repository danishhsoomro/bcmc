"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveHowYouWorkSection } from "../actions";
import type {
  WorkingStyleContextReasonRow,
  WorkingStyleQuestionOptionRow,
  WorkingStyleQuestionRow,
} from "@/lib/counsellor-workspace/types";
import {
  CLARIFICATION_NOTE_MAX_LENGTH,
  contextLabelMap,
  OTHER_CONTEXT_KEY,
  type WorkingStyleAnswerValue,
  type WorkingStyleFormState,
} from "@/lib/counsellor-workspace/how-you-work";

type HowYouWorkFormProps = {
  contextReasons: WorkingStyleContextReasonRow[];
  initialState: WorkingStyleFormState;
  options: WorkingStyleQuestionOptionRow[];
  questions: WorkingStyleQuestionRow[];
};

type AnswerMap = Map<string, WorkingStyleAnswerValue>;

export function HowYouWorkForm({
  contextReasons,
  initialState,
  options,
  questions,
}: HowYouWorkFormProps) {
  const [state, formAction] = useActionState(
    saveHowYouWorkSection,
    initialState,
  );

  return (
    <HowYouWorkFormFields
      key={state.savedStateKey}
      contextReasons={contextReasons}
      formAction={formAction}
      options={options}
      questions={questions}
      state={state}
    />
  );
}

function HowYouWorkFormFields({
  contextReasons,
  formAction,
  options,
  questions,
  state,
}: {
  contextReasons: WorkingStyleContextReasonRow[];
  formAction: (formData: FormData) => void;
  options: WorkingStyleQuestionOptionRow[];
  questions: WorkingStyleQuestionRow[];
  state: WorkingStyleFormState;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const initialAnswers = useMemo(
    () => answerMap(state.values.responses),
    [state.values.responses],
  );
  const [answers, setAnswers] = useState<AnswerMap>(() => initialAnswers);
  const currentQuestion = questions[currentIndex] ?? null;
  const answeredCount = Array.from(answers.values()).filter(
    (answer) => answer.optionKey,
  ).length;
  const allAnswered = answeredCount === questions.length && questions.length > 0;
  const progressWidth =
    questions.length > 0
      ? `${(((reviewing ? questions.length : currentIndex + 1) / questions.length) * 100).toFixed(2)}%`
      : "0%";

  function selectOption(questionKey: string, option: WorkingStyleQuestionOptionRow) {
    setAnswers((current) => {
      const next = new Map(current);

      next.set(questionKey, {
        questionKey,
        optionKey: option.option_key,
        contextKeys: option.is_varies
          ? (current.get(questionKey)?.contextKeys ?? [])
          : [],
        clarificationNote: option.is_varies
          ? (current.get(questionKey)?.clarificationNote ?? "")
          : "",
      });

      return next;
    });
  }

  function toggleContext(questionKey: string, contextKey: string, checked: boolean) {
    setAnswers((current) => {
      const answer = current.get(questionKey);

      if (!answer) {
        return current;
      }

      const contextKeys = new Set(answer.contextKeys);

      if (checked) {
        contextKeys.add(contextKey);
      } else {
        contextKeys.delete(contextKey);
      }

      const nextContextKeys = Array.from(contextKeys);
      const next = new Map(current);
      next.set(questionKey, {
        ...answer,
        contextKeys: nextContextKeys,
        clarificationNote: nextContextKeys.includes(OTHER_CONTEXT_KEY)
          ? answer.clarificationNote
          : "",
      });

      return next;
    });
  }

  function updateClarificationNote(questionKey: string, clarificationNote: string) {
    setAnswers((current) => {
      const answer = current.get(questionKey);

      if (!answer) {
        return current;
      }

      const next = new Map(current);
      next.set(questionKey, {
        ...answer,
        clarificationNote,
      });

      return next;
    });
  }

  function goPrevious() {
    if (reviewing) {
      setReviewing(false);
      setCurrentIndex(Math.max(0, questions.length - 1));
      return;
    }

    setCurrentIndex((index) => Math.max(0, index - 1));
  }

  function goNext() {
    if (currentIndex >= questions.length - 1) {
      setReviewing(true);
      return;
    }

    setCurrentIndex((index) => Math.min(questions.length - 1, index + 1));
  }

  function editQuestion(index: number) {
    setCurrentIndex(index);
    setReviewing(false);
  }

  return (
    <form action={formAction} className="mt-8 space-y-7">
      <SerializedAnswers answers={answers} />

      {state.message ? (
        <div
          className={`border-l-4 bg-white px-4 py-3 text-sm leading-6 ${
            state.status === "error"
              ? "border-[#8a3324] text-[#8a3324]"
              : "border-[var(--color-champagne)] text-[var(--color-stone)]"
          }`}
          aria-live="polite"
        >
          {state.message}
        </div>
      ) : null}

      <div className="border-y border-[var(--color-border)] py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[var(--color-forest-900)]">
            {reviewing
              ? "Review"
              : `Question ${Math.min(currentIndex + 1, questions.length)} of ${questions.length}`}
          </p>
          <p className="text-sm text-[var(--color-stone)]">
            {answeredCount} answered
          </p>
        </div>
        <div className="mt-3 h-1.5 bg-[var(--color-soft-grey)]" aria-hidden="true">
          <div
            className="h-full bg-[var(--color-leaf)] transition-[width]"
            style={{ width: progressWidth }}
          />
        </div>
      </div>

      {reviewing ? (
        <ReviewStep
          answers={answers}
          contextReasons={contextReasons}
          onEdit={editQuestion}
          options={options}
          questions={questions}
        />
      ) : currentQuestion ? (
        <QuestionStep
          answer={answers.get(currentQuestion.key) ?? null}
          contextReasons={contextReasons}
          fieldError={state.fieldErrors[currentQuestion.key]}
          onClarificationChange={(value) =>
            updateClarificationNote(currentQuestion.key, value)
          }
          onContextChange={(contextKey, checked) =>
            toggleContext(currentQuestion.key, contextKey, checked)
          }
          onOptionSelect={(option) => selectOption(currentQuestion.key, option)}
          options={options.filter(
            (option) => option.question_key === currentQuestion.key,
          )}
          question={currentQuestion}
        />
      ) : (
        <p className="border-l-4 border-[#8a3324] bg-white px-4 py-3 text-sm leading-6 text-[#8a3324]">
          No active working style questions are available yet.
        </p>
      )}

      <div className="flex flex-col gap-4 border-t border-[var(--color-border)] pt-6">
        {!reviewing ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goPrevious}
              disabled={currentIndex === 0}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-forest-900)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              {currentIndex >= questions.length - 1 ? "Review answers" : "Next"}
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {reviewing ? (
            <button
              type="button"
              onClick={goPrevious}
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-forest-900)] hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              Back to questions
            </button>
          ) : null}
          <SubmitButton intent="save">Save</SubmitButton>
          <SubmitButton intent="exit">Save and exit</SubmitButton>
          {reviewing && allAnswered ? (
            <SubmitButton intent="continue">Save and continue</SubmitButton>
          ) : null}
          <p
            className={`text-sm font-medium ${statusClassName(state.status)}`}
            aria-live="polite"
          >
            {state.message || "Your answers are saved only when you choose to save."}
          </p>
        </div>
      </div>
    </form>
  );
}

function QuestionStep({
  answer,
  contextReasons,
  fieldError,
  onClarificationChange,
  onContextChange,
  onOptionSelect,
  options,
  question,
}: {
  answer: WorkingStyleAnswerValue | null;
  contextReasons: WorkingStyleContextReasonRow[];
  fieldError: string | undefined;
  onClarificationChange: (value: string) => void;
  onContextChange: (contextKey: string, checked: boolean) => void;
  onOptionSelect: (option: WorkingStyleQuestionOptionRow) => void;
  options: WorkingStyleQuestionOptionRow[];
  question: WorkingStyleQuestionRow;
}) {
  const selectedOption = options.find(
    (option) => option.option_key === answer?.optionKey,
  );
  const showContext = Boolean(selectedOption?.is_varies);
  const showOtherNote =
    showContext && answer?.contextKeys.includes(OTHER_CONTEXT_KEY);

  return (
    <section className="space-y-6">
      <div>
        <h3 className="font-serif text-2xl leading-tight text-[var(--color-forest-900)] md:text-3xl">
          {question.prompt_text}
        </h3>
        {question.help_text ? (
          <p className="mt-3 text-sm leading-6 text-[var(--color-stone)]">
            {question.help_text}
          </p>
        ) : null}
      </div>

      <fieldset
        className="space-y-3"
        aria-describedby={fieldError ? `${question.key}-error` : undefined}
      >
        <legend className="sr-only">Choose the closest response</legend>
        {options.map((option) => {
          const checked = answer?.optionKey === option.option_key;

          return (
            <label
              key={option.option_key}
              className={`grid min-h-14 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] gap-3 border px-4 py-3 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)] ${
                checked
                  ? "border-[var(--color-leaf)] bg-white text-[var(--color-ink)] shadow-[inset_4px_0_0_var(--color-leaf)]"
                  : "border-[var(--color-border)] bg-white/78 text-[var(--color-ink)] hover:border-[var(--color-sage)]"
              }`}
            >
              <input
                type="radio"
                checked={checked}
                onChange={() => onOptionSelect(option)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-5 items-center justify-center rounded-full border ${
                  checked
                    ? "border-[var(--color-forest-900)]"
                    : "border-[var(--color-sage)]"
                }`}
              >
                {checked ? (
                  <span className="size-2.5 rounded-full bg-[var(--color-forest-900)]" />
                ) : null}
              </span>
              <span className="leading-6">{option.counsellor_label}</span>
            </label>
          );
        })}
      </fieldset>

      {showContext ? (
        <fieldset className="border-l-4 border-[var(--color-champagne)] bg-white px-4 py-4">
          <legend className="text-sm font-semibold text-[var(--color-forest-900)]">
            What does it usually depend on?
          </legend>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {contextReasons.map((reason) => {
              const checked = answer?.contextKeys.includes(reason.key) ?? false;

              return (
                <label
                  key={reason.key}
                  className="flex min-h-11 cursor-pointer items-center gap-3 border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      onContextChange(reason.key, event.target.checked)
                    }
                    className="size-4 accent-[var(--color-forest-900)]"
                  />
                  {reason.label}
                </label>
              );
            })}
          </div>

          {showOtherNote ? (
            <div className="mt-4">
              <label
                htmlFor={`clarificationNote:${question.key}`}
                className="text-sm font-semibold text-[var(--color-forest-900)]"
              >
                What else does it depend on?
              </label>
              <textarea
                id={`clarificationNote:${question.key}`}
                value={answer?.clarificationNote ?? ""}
                maxLength={CLARIFICATION_NOTE_MAX_LENGTH}
                rows={3}
                onChange={(event) => onClarificationChange(event.target.value)}
                className="bcmc-input mt-2 min-h-24 resize-y"
              />
              <p className="mt-1 text-xs text-[var(--color-stone)]">
                {(answer?.clarificationNote ?? "").length} /{" "}
                {CLARIFICATION_NOTE_MAX_LENGTH}
              </p>
            </div>
          ) : null}
        </fieldset>
      ) : null}

      {fieldError ? (
        <p id={`${question.key}-error`} className="text-sm text-[#8a3324]">
          {fieldError}
        </p>
      ) : null}
    </section>
  );
}

function ReviewStep({
  answers,
  contextReasons,
  onEdit,
  options,
  questions,
}: {
  answers: AnswerMap;
  contextReasons: WorkingStyleContextReasonRow[];
  onEdit: (index: number) => void;
  options: WorkingStyleQuestionOptionRow[];
  questions: WorkingStyleQuestionRow[];
}) {
  const labelsByContextKey = contextLabelMap(contextReasons);
  const optionsByQuestionAndKey = new Map(
    options.map((option) => [
      `${option.question_key}:${option.option_key}`,
      option,
    ]),
  );
  const unansweredCount = questions.filter(
    (question) => !answers.get(question.key)?.optionKey,
  ).length;

  return (
    <section className="space-y-6">
      <div>
        <h3 className="font-serif text-2xl leading-tight text-[var(--color-forest-900)] md:text-3xl">
          Review your answers
        </h3>
        <p className="mt-3 text-sm leading-6 text-[var(--color-stone)]">
          This is only a check of what you answered. BCMC is not showing scores
          or public profile statements here.
        </p>
        {unansweredCount > 0 ? (
          <p className="mt-4 border-l-4 border-[var(--color-champagne)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-stone)]">
            You can save your progress now. This section will remain incomplete
            until every scenario has an answer.
          </p>
        ) : null}
      </div>

      <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {questions.map((question, index) => {
          const answer = answers.get(question.key);
          const option = answer
            ? optionsByQuestionAndKey.get(
                `${answer.questionKey}:${answer.optionKey}`,
              )
            : null;
          const contextLabels =
            answer?.contextKeys.map(
              (contextKey) => labelsByContextKey.get(contextKey) ?? contextKey,
            ) ?? [];

          return (
            <article
              key={question.key}
              className="grid gap-4 bg-white/62 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div>
                <p className="text-sm font-semibold leading-6 text-[var(--color-forest-900)]">
                  {question.prompt_text}
                </p>
                {option ? (
                  <div className="mt-2 space-y-1 text-sm leading-6 text-[var(--color-stone)]">
                    <p>{option.counsellor_label}</p>
                    {option.is_varies && contextLabels.length > 0 ? (
                      <p>Depends on: {contextLabels.join(", ")}</p>
                    ) : null}
                    {option.is_varies && answer?.clarificationNote ? (
                      <p>Other context: {answer.clarificationNote}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-[#8a3324]">
                    Not answered
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onEdit(index)}
                className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-forest-900)] hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
              >
                Edit
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SerializedAnswers({ answers }: { answers: AnswerMap }) {
  return (
    <>
      {Array.from(answers.values()).map((answer) => (
        <span key={answer.questionKey}>
          <input type="hidden" name="questionKey" value={answer.questionKey} />
          <input
            type="hidden"
            name={`optionKey:${answer.questionKey}`}
            value={answer.optionKey}
          />
          {answer.contextKeys.map((contextKey) => (
            <input
              key={contextKey}
              type="hidden"
              name={`contextKeys:${answer.questionKey}`}
              value={contextKey}
            />
          ))}
          <input
            type="hidden"
            name={`clarificationNote:${answer.questionKey}`}
            value={answer.clarificationNote}
          />
        </span>
      ))}
    </>
  );
}

function answerMap(values: WorkingStyleAnswerValue[]) {
  return new Map(values.map((value) => [value.questionKey, value]));
}

function SubmitButton({
  children,
  intent,
}: {
  children: React.ReactNode;
  intent: "continue" | "exit" | "save";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className={`inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] disabled:cursor-wait disabled:opacity-70 ${
        intent === "save"
          ? "border border-[var(--color-forest-900)] bg-white text-[var(--color-forest-900)] hover:bg-[var(--color-mist)]"
          : "bg-[var(--color-forest-900)] text-white hover:bg-[var(--color-evergreen)]"
      }`}
    >
      {pending ? "Saving..." : children}
    </button>
  );
}

function statusClassName(status: WorkingStyleFormState["status"]) {
  if (status === "success") {
    return "text-[var(--color-forest-900)]";
  }

  if (status === "error") {
    return "text-[#8a3324]";
  }

  return "text-[var(--color-stone)]";
}
