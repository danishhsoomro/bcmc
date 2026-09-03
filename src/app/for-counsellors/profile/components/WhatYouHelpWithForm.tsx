"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveWhatYouHelpWithSection } from "../actions";
import type { PracticeAreaTaxonomyRow } from "@/lib/counsellor-workspace/types";
import type {
  ConcernEmphasisKey,
  WhatYouHelpWithFormState,
  WhatYouHelpWithValue,
} from "@/lib/counsellor-workspace/what-you-help-with";

type WhatYouHelpWithFormProps = {
  concernOptions: PracticeAreaTaxonomyRow[];
  initialState: WhatYouHelpWithFormState;
  showRelationshipClarification: boolean;
};

const FAMILY_RELATIONSHIP_STRESS_KEY = "family_relationship_stress";
const MAX_PRIMARY = 3;
const MAX_ADDITIONAL = 5;

export function WhatYouHelpWithForm({
  concernOptions,
  initialState,
  showRelationshipClarification,
}: WhatYouHelpWithFormProps) {
  const [state, formAction] = useActionState(
    saveWhatYouHelpWithSection,
    initialState,
  );

  return (
    <WhatYouHelpWithFormFields
      key={state.savedStateKey}
      concernOptions={concernOptions}
      formAction={formAction}
      showRelationshipClarification={showRelationshipClarification}
      state={state}
    />
  );
}

function WhatYouHelpWithFormFields({
  concernOptions,
  formAction,
  showRelationshipClarification,
  state,
}: {
  concernOptions: PracticeAreaTaxonomyRow[];
  formAction: (formData: FormData) => void;
  showRelationshipClarification: boolean;
  state: WhatYouHelpWithFormState;
}) {
  const initialSelections = useMemo(
    () => selectionMap(state.values.practiceAreas),
    [state.values.practiceAreas],
  );
  const [selections, setSelections] = useState(() => initialSelections);
  const primaryCount = countByEmphasis(selections, "primary");
  const additionalCount = countByEmphasis(selections, "additional");
  const relationshipSelected = selections.get(FAMILY_RELATIONSHIP_STRESS_KEY);

  function toggleConcern(
    practiceAreaKey: string,
    emphasisKey: ConcernEmphasisKey,
    checked: boolean,
  ) {
    setSelections((current) => {
      const next = new Map(current);

      if (!checked) {
        if (next.get(practiceAreaKey) === emphasisKey) {
          next.delete(practiceAreaKey);
        }

        return next;
      }

      const limit = emphasisKey === "primary" ? MAX_PRIMARY : MAX_ADDITIONAL;
      const count = countByEmphasis(next, emphasisKey);
      const previous = next.get(practiceAreaKey);
      const sameGroup = previous === emphasisKey;
      const movingWithinLimit =
        previous && previous !== emphasisKey && count < limit;

      if (!sameGroup && count >= limit && !movingWithinLimit) {
        return next;
      }

      next.set(practiceAreaKey, emphasisKey);
      return next;
    });
  }

  return (
    <form action={formAction} className="mt-8 space-y-9">
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

      {Array.from(selections).map(([practiceAreaKey, emphasisKey]) => (
        <span key={practiceAreaKey}>
          <input type="hidden" name="practiceAreaKey" value={practiceAreaKey} />
          <input
            type="hidden"
            name={`emphasis:${practiceAreaKey}`}
            value={emphasisKey}
          />
        </span>
      ))}

      <fieldset
        className="space-y-4"
        aria-describedby={state.fieldErrors.primary ? "primary-error" : undefined}
      >
        <div className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <legend className="text-lg font-semibold text-[var(--color-forest-900)]">
              Main concerns
            </legend>
            <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
              Choose up to 3 concerns that are most central to the work you
              currently do.
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--color-forest-900)]">
            {primaryCount} / {MAX_PRIMARY} selected
          </p>
        </div>

        <div className="grid gap-3">
          {concernOptions.map((option) => {
            const checked = selections.get(option.key) === "primary";
            const selectedElsewhere = selections.get(option.key) === "additional";
            const limitReached =
              !checked && !selectedElsewhere && primaryCount >= MAX_PRIMARY;

            return (
              <ConcernOption
                key={option.key}
                checked={checked}
                disabled={limitReached}
                disabledReason={
                  limitReached ? "Remove a main concern before adding another." : null
                }
                option={option}
                onChange={(checkedValue) =>
                  toggleConcern(option.key, "primary", checkedValue)
                }
              />
            );
          })}
        </div>
        {state.fieldErrors.primary ? (
          <p id="primary-error" className="text-sm text-[#8a3324]">
            {state.fieldErrors.primary}
          </p>
        ) : null}
      </fieldset>

      {showRelationshipClarification && relationshipSelected ? (
        <p className="border-l-4 border-[var(--color-champagne)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-stone)]">
          Working with relationship or family stress does not mean you offer
          couples counselling. Your service types are managed separately.
        </p>
      ) : null}

      <fieldset
        className="space-y-4"
        aria-describedby={
          state.fieldErrors.additional ? "additional-error" : undefined
        }
      >
        <div className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <legend className="text-lg font-semibold text-[var(--color-forest-900)]">
              Other concerns you also support
            </legend>
            <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
              You can add up to 5 more concerns that are also part of your
              practice.
            </p>
          </div>
          <p className="text-sm font-semibold text-[var(--color-forest-900)]">
            {additionalCount} / {MAX_ADDITIONAL} selected
          </p>
        </div>

        <div className="grid gap-3">
          {concernOptions
            .filter((option) => selections.get(option.key) !== "primary")
            .map((option) => {
              const checked = selections.get(option.key) === "additional";
              const limitReached = !checked && additionalCount >= MAX_ADDITIONAL;

              return (
                <ConcernOption
                  key={option.key}
                  checked={checked}
                  disabled={limitReached}
                  disabledReason={
                    limitReached
                      ? "Remove another concern before adding one here."
                      : null
                  }
                  option={option}
                  onChange={(checkedValue) =>
                    toggleConcern(option.key, "additional", checkedValue)
                  }
                />
              );
            })}
        </div>
        {state.fieldErrors.additional ? (
          <p id="additional-error" className="text-sm text-[#8a3324]">
            {state.fieldErrors.additional}
          </p>
        ) : null}
      </fieldset>

      {state.fieldErrors.practiceAreaKey ? (
        <p className="text-sm text-[#8a3324]">{state.fieldErrors.practiceAreaKey}</p>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-center">
        <SubmitButton intent="save">Save</SubmitButton>
        <SubmitButton intent="continue">Save and continue</SubmitButton>
        <p
          className={`text-sm font-medium ${statusClassName(state.status)}`}
          aria-live="polite"
        >
          {state.message || "You can come back to this anytime."}
        </p>
      </div>
    </form>
  );
}

function ConcernOption({
  checked,
  disabled,
  disabledReason,
  onChange,
  option,
}: {
  checked: boolean;
  disabled: boolean;
  disabledReason: string | null;
  onChange: (checked: boolean) => void;
  option: PracticeAreaTaxonomyRow;
}) {
  return (
    <label
      className={`flex min-h-12 items-start gap-3 border px-4 py-3 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)] ${
        disabled
          ? "cursor-not-allowed border-[var(--color-border)] bg-[var(--color-soft-grey)] text-[var(--color-stone)]"
          : checked
            ? "cursor-pointer border-[var(--color-leaf)] bg-white text-[var(--color-ink)]"
            : "cursor-pointer border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-sage)]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-[var(--color-forest-900)]"
      />
      <span>
        <span className="block font-medium">{option.label}</span>
        {option.short_description ? (
          <span className="mt-1 block text-xs leading-5 text-[var(--color-stone)]">
            {option.short_description}
          </span>
        ) : null}
        {disabledReason ? (
          <span className="mt-1 block text-xs leading-5 text-[#8a3324]">
            {disabledReason}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function selectionMap(values: WhatYouHelpWithValue[]) {
  return new Map(
    values.map((value) => [value.practiceAreaKey, value.emphasisKey]),
  );
}

function countByEmphasis(
  selections: Map<string, ConcernEmphasisKey>,
  emphasisKey: ConcernEmphasisKey,
) {
  return Array.from(selections.values()).filter((value) => value === emphasisKey)
    .length;
}

function SubmitButton({
  children,
  intent,
}: {
  children: React.ReactNode;
  intent: "save" | "continue";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-forest-900)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Saving..." : children}
    </button>
  );
}

function statusClassName(status: WhatYouHelpWithFormState["status"]) {
  if (status === "success") {
    return "text-[var(--color-forest-900)]";
  }

  if (status === "error") {
    return "text-[#8a3324]";
  }

  return "text-[var(--color-stone)]";
}
