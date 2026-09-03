"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveFaithSection } from "../actions";
import {
  INITIATION_NOTE_MAX_LENGTH,
  ISLAMIC_COUNSELLING_DEFINITION_MAX_LENGTH,
  normalizeFaithProfileValue,
  validateFaithProfileValue,
  type DiscussionComfortKey,
  type FaithProfileFormState,
  type FaithProfileValue,
  type InitiationKey,
  type IntegrationKey,
  type IntegrationModeKey,
} from "@/lib/counsellor-workspace/faith";

type StepKey =
  | "discussion"
  | "initiation"
  | "integration"
  | "integration_mode"
  | "islamic_counselling"
  | "review";

type Choice<Value extends string | boolean> = {
  label: string;
  value: Value;
};

const discussionChoices: Choice<DiscussionComfortKey>[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "It depends", value: "depends" },
];

const initiationChoices: Choice<InitiationKey>[] = [
  { label: "I wait for the client to bring it up.", value: "waits_for_client" },
  {
    label:
      "I may ask about it when it seems relevant, without assuming they want it included.",
    value: "may_ask_without_assuming_inclusion",
  },
  { label: "It depends.", value: "depends" },
  { label: "Another way.", value: "other" },
];

const integrationChoices: Choice<IntegrationKey>[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "It depends", value: "depends" },
];

const integrationModeChoices: Choice<IntegrationModeKey>[] = [
  {
    label: "As something we can draw on when a client wants it.",
    value: "available_on_request",
  },
  {
    label: "A distinct faith-integrated counselling option that I offer.",
    value: "distinct_practice_option",
  },
];

const islamicCounsellingChoices: Choice<boolean>[] = [
  { label: "Yes", value: true },
  { label: "No", value: false },
];

export function FaithForm({ initialState }: { initialState: FaithProfileFormState }) {
  const [state, formAction] = useActionState(saveFaithSection, initialState);

  return <FaithFormFields formAction={formAction} state={state} />;
}

function FaithFormFields({
  formAction,
  state,
}: {
  formAction: (formData: FormData) => void;
  state: FaithProfileFormState;
}) {
  const initialValue = useMemo(
    () => normalizeFaithProfileValue(state.values),
    [state.values],
  );
  const [value, setValue] = useState<FaithProfileValue>(() => initialValue);
  const [stepKey, setStepKey] = useState<StepKey>("discussion");
  const normalizedValue = normalizeFaithProfileValue(value);
  const fieldErrors = {
    ...validateFaithProfileValue(normalizedValue),
    ...state.fieldErrors,
  };
  const steps = buildSteps(normalizedValue);
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step === stepKey),
  );
  const currentStep = steps[currentIndex] ?? "discussion";
  const isReview = currentStep === "review";
  const canSubmit = isReview && Object.keys(fieldErrors).length === 0;
  const progressWidth = `${(((currentIndex + 1) / steps.length) * 100).toFixed(
    2,
  )}%`;

  function updateValue(updater: (current: FaithProfileValue) => FaithProfileValue) {
    setValue((current) => normalizeFaithProfileValue(updater(current)));
  }

  function chooseDiscussion(discussionComfortKey: DiscussionComfortKey) {
    updateValue((current) => ({
      ...current,
      discussionComfortKey,
      initiationKey: discussionComfortKey === "no" ? "" : current.initiationKey,
      initiationNote:
        discussionComfortKey === "no" ? "" : current.initiationNote,
      integrationKey:
        discussionComfortKey === "no" ? "" : current.integrationKey,
      integrationModeKey:
        discussionComfortKey === "no" ? "" : current.integrationModeKey,
    }));
  }

  function chooseInitiation(initiationKey: InitiationKey) {
    updateValue((current) => ({
      ...current,
      initiationKey,
      initiationNote: initiationKey === "other" ? current.initiationNote : "",
    }));
  }

  function chooseIntegration(integrationKey: IntegrationKey) {
    updateValue((current) => ({
      ...current,
      integrationKey,
      integrationModeKey:
        integrationKey === "yes" ? current.integrationModeKey : "",
    }));
  }

  function chooseIslamicCounselling(claimsIslamicCounselling: boolean) {
    updateValue((current) => ({
      ...current,
      claimsIslamicCounselling,
      islamicCounsellingDefinition: claimsIslamicCounselling
        ? current.islamicCounsellingDefinition
        : "",
    }));
  }

  function goPrevious() {
    setStepKey(steps[Math.max(0, currentIndex - 1)] ?? "discussion");
  }

  function goNext() {
    const stepError = errorForStep(currentStep, fieldErrors);

    if (stepError) {
      return;
    }

    setStepKey(steps[Math.min(steps.length - 1, currentIndex + 1)] ?? "review");
  }

  function editStep(nextStepKey: StepKey) {
    setStepKey(nextStepKey);
  }

  return (
    <form action={formAction} className="mt-8 space-y-7">
      <SerializedValue value={normalizedValue} />

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
            {isReview
              ? "Review"
              : `Question ${Math.min(currentIndex + 1, steps.length - 1)} of ${
                  steps.length - 1
                }`}
          </p>
          <p className="text-sm text-[var(--color-stone)]">
            Saved only when you choose to save
          </p>
        </div>
        <div className="mt-3 h-1.5 bg-[var(--color-soft-grey)]" aria-hidden="true">
          <div
            className="h-full bg-[var(--color-leaf)] transition-[width]"
            style={{ width: progressWidth }}
          />
        </div>
      </div>

      {currentStep === "discussion" ? (
        <QuestionStep
          description="This is about professional practice behaviour, not your personal beliefs."
          error={fieldErrors.discussionComfortKey}
          question="Are you comfortable discussing a client's religion, faith or spirituality when it is relevant to them?"
        >
          <ChoiceGroup
            choices={discussionChoices}
            name="discussion-choice"
            selectedValue={normalizedValue.discussionComfortKey}
            onSelect={chooseDiscussion}
          />
        </QuestionStep>
      ) : null}

      {currentStep === "initiation" ? (
        <QuestionStep
          error={fieldErrors.initiationKey}
          question="If religion, faith or spirituality may be relevant, how would it usually enter the conversation?"
        >
          <ChoiceGroup
            choices={initiationChoices}
            name="initiation-choice"
            selectedValue={normalizedValue.initiationKey}
            onSelect={chooseInitiation}
          />
          {normalizedValue.initiationKey === "other" ? (
            <TextField
              error={fieldErrors.initiationNote}
              id="initiation-note"
              label="How would it usually enter the conversation?"
              maxLength={INITIATION_NOTE_MAX_LENGTH}
              rows={3}
              value={value.initiationNote}
              onChange={(initiationNote) =>
                updateValue((current) => ({ ...current, initiationNote }))
              }
            />
          ) : null}
        </QuestionStep>
      ) : null}

      {currentStep === "integration" ? (
        <QuestionStep
          error={fieldErrors.integrationKey}
          question="Can a client's own faith, beliefs or practices intentionally be drawn on as part of the therapeutic work, if they want that?"
        >
          <ChoiceGroup
            choices={integrationChoices}
            name="integration-choice"
            selectedValue={normalizedValue.integrationKey}
            onSelect={chooseIntegration}
          />
        </QuestionStep>
      ) : null}

      {currentStep === "integration_mode" ? (
        <QuestionStep
          error={fieldErrors.integrationModeKey}
          question="How is this available in your practice?"
        >
          <ChoiceGroup
            choices={integrationModeChoices}
            name="integration-mode-choice"
            selectedValue={normalizedValue.integrationModeKey}
            onSelect={(integrationModeKey) =>
              updateValue((current) => ({ ...current, integrationModeKey }))
            }
          />
        </QuestionStep>
      ) : null}

      {currentStep === "islamic_counselling" ? (
        <QuestionStep
          description="This is not inferred from Muslim identity, faith discussion, integration, training, or cultural familiarity."
          error={fieldErrors.claimsIslamicCounselling}
          question="Do you describe any counselling service you offer as 'Islamic counselling'?"
        >
          <ChoiceGroup
            choices={islamicCounsellingChoices}
            name="islamic-counselling-choice"
            selectedValue={normalizedValue.claimsIslamicCounselling}
            onSelect={chooseIslamicCounselling}
          />
          {normalizedValue.claimsIslamicCounselling === true ? (
            <TextField
              description="Describe what a client can expect when you use this term."
              error={fieldErrors.islamicCounsellingDefinition}
              id="islamic-counselling-definition"
              label="What do you mean by 'Islamic counselling' in your practice?"
              maxLength={ISLAMIC_COUNSELLING_DEFINITION_MAX_LENGTH}
              rows={4}
              value={value.islamicCounsellingDefinition}
              onChange={(islamicCounsellingDefinition) =>
                updateValue((current) => ({
                  ...current,
                  islamicCounsellingDefinition,
                }))
              }
            />
          ) : null}
          {conflictText(fieldErrors) ? (
            <ConflictNotice
              text={conflictText(fieldErrors)}
              onEditDiscussion={() => editStep("discussion")}
              onEditIntegration={() => editStep("integration")}
              showIntegration={steps.includes("integration")}
            />
          ) : null}
        </QuestionStep>
      ) : null}

      {isReview ? (
        <ReviewStep
          errors={fieldErrors}
          value={normalizedValue}
          onEdit={editStep}
        />
      ) : null}

      <div className="flex flex-col gap-4 border-t border-[var(--color-border)] pt-6">
        {!isReview ? (
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
              {currentIndex >= steps.length - 2 ? "Review answers" : "Next"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={goPrevious}
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-forest-900)] hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              Back to questions
            </button>
            <SubmitButton intent="save" disabled={!canSubmit}>
              Save
            </SubmitButton>
            <SubmitButton intent="continue" disabled={!canSubmit}>
              Save and continue
            </SubmitButton>
            <p
              className={`text-sm font-medium ${statusClassName(state.status)}`}
              aria-live="polite"
            >
              {canSubmit
                ? state.message || "Review once, then save when ready."
                : "Complete the highlighted answers before saving."}
            </p>
          </div>
        )}
      </div>
    </form>
  );
}

function QuestionStep({
  children,
  description,
  error,
  question,
}: {
  children: React.ReactNode;
  description?: string;
  error?: string;
  question: string;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h3 className="font-serif text-2xl leading-tight text-[var(--color-forest-900)] md:text-3xl">
          {question}
        </h3>
        {description ? (
          <p className="mt-3 text-sm leading-6 text-[var(--color-stone)]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
      {error ? <p className="text-sm text-[#8a3324]">{error}</p> : null}
    </section>
  );
}

function ChoiceGroup<Value extends string | boolean>({
  choices,
  name,
  onSelect,
  selectedValue,
}: {
  choices: Choice<Value>[];
  name: string;
  onSelect: (value: Value) => void;
  selectedValue: Value | "" | null;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Choose one answer</legend>
      {choices.map((choice) => {
        const checked = selectedValue === choice.value;

        return (
          <label
            key={String(choice.value)}
            className={`grid min-h-14 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] gap-3 border px-4 py-3 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)] ${
              checked
                ? "border-[var(--color-leaf)] bg-white text-[var(--color-ink)] shadow-[inset_4px_0_0_var(--color-leaf)]"
                : "border-[var(--color-border)] bg-white/78 text-[var(--color-ink)] hover:border-[var(--color-sage)]"
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={checked}
              onChange={() => onSelect(choice.value)}
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
            <span className="leading-6">{choice.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

function TextField({
  description,
  error,
  id,
  label,
  maxLength,
  onChange,
  rows,
  value,
}: {
  description?: string;
  error?: string;
  id: string;
  label: string;
  maxLength: number;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <div className="border-l-4 border-[var(--color-champagne)] bg-white px-4 py-4">
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[var(--color-forest-900)]"
      >
        {label}
      </label>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
          {description}
        </p>
      ) : null}
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="bcmc-input mt-2 min-h-24 resize-y"
      />
      <div className="mt-1 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p className={error ? "text-[#8a3324]" : "text-[var(--color-stone)]"}>
          {error ?? " "}
        </p>
        <p className="text-[var(--color-stone)]">
          {value.length} / {maxLength}
        </p>
      </div>
    </div>
  );
}

function ReviewStep({
  errors,
  onEdit,
  value,
}: {
  errors: Record<string, string>;
  onEdit: (step: StepKey) => void;
  value: FaithProfileValue;
}) {
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <section className="space-y-6">
      <div>
        <h3 className="font-serif text-2xl leading-tight text-[var(--color-forest-900)] md:text-3xl">
          Review your answers
        </h3>
        <p className="mt-3 text-sm leading-6 text-[var(--color-stone)]">
          This is a short check of what a client could expect around faith and
          counselling.
        </p>
      </div>

      {hasErrors ? (
        <div className="border-l-4 border-[#8a3324] bg-white px-4 py-3 text-sm leading-6 text-[#8a3324]">
          Some answers need clarification before this section can be saved.
        </div>
      ) : null}

      <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        <ReviewRow
          label="Discussing religion or spirituality"
          value={discussionLabel(value.discussionComfortKey)}
          error={errors.discussionComfortKey}
          onEdit={() => onEdit("discussion")}
        />
        <ReviewRow
          label="How it usually enters the conversation"
          value={
            value.discussionComfortKey === "no"
              ? "Not applicable based on your earlier answer"
              : initiationLabel(value)
          }
          error={errors.initiationKey ?? errors.initiationNote}
          onEdit={() => onEdit("initiation")}
        />
        <ReviewRow
          label="Using a client's faith in the therapeutic work"
          value={
            value.discussionComfortKey === "no"
              ? "Not applicable based on your earlier answer"
              : integrationReviewLabel(value)
          }
          error={errors.integrationKey ?? errors.integrationModeKey}
          onEdit={() => onEdit("integration")}
        />
        <ReviewRow
          label="Islamic counselling"
          value={islamicCounsellingLabel(value)}
          error={
            errors.claimsIslamicCounselling ??
            errors.islamicCounsellingDefinition
          }
          onEdit={() => onEdit("islamic_counselling")}
        />
      </div>
    </section>
  );
}

function ReviewRow({
  error,
  label,
  onEdit,
  value,
}: {
  error?: string;
  label: string;
  onEdit: () => void;
  value: string;
}) {
  return (
    <article className="grid gap-4 bg-white/62 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        <p className="text-sm font-semibold leading-6 text-[var(--color-forest-900)]">
          {label}
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
          {value || "Not answered"}
        </p>
        {error ? <p className="mt-2 text-sm text-[#8a3324]">{error}</p> : null}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-forest-900)] hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
      >
        Edit
      </button>
    </article>
  );
}

function ConflictNotice({
  onEditDiscussion,
  onEditIntegration,
  showIntegration,
  text,
}: {
  onEditDiscussion: () => void;
  onEditIntegration: () => void;
  showIntegration: boolean;
  text: string | null;
}) {
  if (!text) {
    return null;
  }

  return (
    <div className="border-l-4 border-[var(--color-champagne)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-stone)]">
      <p>{text}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onEditDiscussion}
          className="text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
        >
          Edit faith discussion answer
        </button>
        {showIntegration ? (
          <button
            type="button"
            onClick={onEditIntegration}
            className="text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
          >
            Edit therapeutic-work answer
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SubmitButton({
  children,
  disabled,
  intent,
}: {
  children: React.ReactNode;
  disabled: boolean;
  intent: "continue" | "save";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={disabled || pending}
      className={`inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] disabled:cursor-not-allowed disabled:opacity-60 ${
        intent === "save"
          ? "border border-[var(--color-forest-900)] bg-white text-[var(--color-forest-900)] hover:bg-[var(--color-mist)]"
          : "bg-[var(--color-forest-900)] text-white hover:bg-[var(--color-evergreen)]"
      }`}
    >
      {pending ? "Saving..." : children}
    </button>
  );
}

function SerializedValue({ value }: { value: FaithProfileValue }) {
  return (
    <>
      <input
        type="hidden"
        name="discussionComfortKey"
        value={value.discussionComfortKey}
      />
      <input type="hidden" name="initiationKey" value={value.initiationKey} />
      <input type="hidden" name="initiationNote" value={value.initiationNote} />
      <input type="hidden" name="integrationKey" value={value.integrationKey} />
      <input
        type="hidden"
        name="integrationModeKey"
        value={value.integrationModeKey}
      />
      <input
        type="hidden"
        name="claimsIslamicCounselling"
        value={
          value.claimsIslamicCounselling === null
            ? ""
            : String(value.claimsIslamicCounselling)
        }
      />
      <input
        type="hidden"
        name="islamicCounsellingDefinition"
        value={value.islamicCounsellingDefinition}
      />
    </>
  );
}

function buildSteps(value: FaithProfileValue): StepKey[] {
  const steps: StepKey[] = ["discussion"];

  if (value.discussionComfortKey === "yes" || value.discussionComfortKey === "depends") {
    steps.push("initiation", "integration");

    if (value.integrationKey === "yes") {
      steps.push("integration_mode");
    }
  }

  steps.push("islamic_counselling", "review");
  return steps;
}

function errorForStep(step: StepKey, errors: Record<string, string>) {
  if (step === "discussion") {
    return errors.discussionComfortKey;
  }

  if (step === "initiation") {
    return errors.initiationKey ?? errors.initiationNote;
  }

  if (step === "integration") {
    return errors.integrationKey;
  }

  if (step === "integration_mode") {
    return errors.integrationModeKey;
  }

  if (step === "islamic_counselling") {
    return errors.claimsIslamicCounselling ?? errors.islamicCounsellingDefinition;
  }

  return undefined;
}

function conflictText(errors: Record<string, string>) {
  const error = errors.claimsIslamicCounselling;
  return error?.startsWith("Because you've said") ? error : null;
}

function discussionLabel(value: FaithProfileValue["discussionComfortKey"]) {
  if (value === "yes") {
    return "Yes";
  }

  if (value === "no") {
    return "No";
  }

  if (value === "depends") {
    return "It depends";
  }

  return "";
}

function initiationLabel(value: FaithProfileValue) {
  if (value.initiationKey === "waits_for_client") {
    return "I wait for the client to bring it up.";
  }

  if (value.initiationKey === "may_ask_without_assuming_inclusion") {
    return "I may ask about it when it seems relevant, without assuming they want it included.";
  }

  if (value.initiationKey === "depends") {
    return "It depends.";
  }

  if (value.initiationKey === "other") {
    return value.initiationNote;
  }

  return "";
}

function integrationReviewLabel(value: FaithProfileValue) {
  if (value.integrationKey === "yes") {
    if (value.integrationModeKey === "available_on_request") {
      return "Yes - when the client wants it";
    }

    if (value.integrationModeKey === "distinct_practice_option") {
      return "Yes - as a distinct faith-integrated counselling option";
    }

    return "Yes";
  }

  if (value.integrationKey === "no") {
    return "No";
  }

  if (value.integrationKey === "depends") {
    return "It depends";
  }

  return "";
}

function islamicCounsellingLabel(value: FaithProfileValue) {
  if (value.claimsIslamicCounselling === false) {
    return "No";
  }

  if (value.claimsIslamicCounselling === true) {
    return value.islamicCounsellingDefinition
      ? `Yes - ${value.islamicCounsellingDefinition}`
      : "Yes";
  }

  return "";
}

function statusClassName(status: FaithProfileFormState["status"]) {
  if (status === "success") {
    return "text-[var(--color-forest-900)]";
  }

  if (status === "error") {
    return "text-[#8a3324]";
  }

  return "text-[var(--color-stone)]";
}
