"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  type PracticeFormState,
  savePracticeSection,
} from "../actions";

type PracticeFormProps = {
  initialState: PracticeFormState;
};

const GENDER_OPTIONS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "nonbinary", label: "Nonbinary" },
  { value: "self_described", label: "Self-described" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function PracticeForm({ initialState }: PracticeFormProps) {
  const [state, formAction] = useActionState(
    savePracticeSection,
    initialState,
  );
  const values = state.values;
  const [selectedGenderKey, setSelectedGenderKey] = useState(values.genderKey);
  const showSelfDescription = selectedGenderKey === "self_described";
  const statusClassName = useMemo(() => {
    if (state.status === "success") {
      return "text-[var(--color-forest-900)]";
    }

    if (state.status === "error") {
      return "text-[#8a3324]";
    }

    return "text-[var(--color-stone)]";
  }, [state.status]);

  return (
    <form action={formAction} className="mt-8 space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Field
          id="displayName"
          label="Public/display name"
          error={state.fieldErrors.displayName}
          required
        >
          <input
            id="displayName"
            name="displayName"
            type="text"
            defaultValue={values.displayName}
            required
            className="bcmc-input"
            autoComplete="name"
          />
        </Field>

        <Field
          id="preferredName"
          label="Preferred first name"
          error={state.fieldErrors.preferredName}
        >
          <input
            id="preferredName"
            name="preferredName"
            type="text"
            defaultValue={values.preferredName}
            className="bcmc-input"
            autoComplete="given-name"
          />
        </Field>
      </div>

      <Field
        id="pronouns"
        label="Pronouns"
        hint="Optional. Leave blank if you do not want pronouns shown."
        error={state.fieldErrors.pronouns}
      >
        <input
          id="pronouns"
          name="pronouns"
          type="text"
          defaultValue={values.pronouns}
          className="bcmc-input max-w-xl"
        />
      </Field>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-[var(--color-forest-900)]">
          Gender
        </legend>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-stone)]">
          This is self-described and separate from who you work with.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {GENDER_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex min-h-12 cursor-pointer items-center gap-3 border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)]"
            >
              <input
                type="radio"
                name="genderKey"
                value={option.value}
                defaultChecked={values.genderKey === option.value}
                onChange={() => setSelectedGenderKey(option.value)}
                required
                className="size-4 accent-[var(--color-forest-900)]"
              />
              {option.label}
            </label>
          ))}
        </div>
        {state.fieldErrors.genderKey ? (
          <p className="text-sm font-medium text-[#8a3324]">
            {state.fieldErrors.genderKey}
          </p>
        ) : null}
      </fieldset>

      <Field
        id="genderSelfDescription"
        label="Self-description"
        hint="Only used when gender is self-described."
        error={state.fieldErrors.genderSelfDescription}
      >
        <input
          id="genderSelfDescription"
          name="genderSelfDescription"
          type="text"
          defaultValue={values.genderSelfDescription}
          maxLength={120}
          disabled={!showSelfDescription}
          className="bcmc-input max-w-xl disabled:bg-[var(--color-soft-grey)] disabled:text-[var(--color-stone)]"
        />
      </Field>

      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-center">
        <SubmitButton intent="save">Save</SubmitButton>
        <SubmitButton intent="continue">Save and continue</SubmitButton>
        <p className={`text-sm font-medium ${statusClassName}`} aria-live="polite">
          {state.message || "You can come back to this anytime."}
        </p>
      </div>
    </form>
  );
}

function Field({
  children,
  error,
  hint,
  id,
  label,
  required,
}: {
  children: React.ReactNode;
  error?: string;
  hint?: string;
  id: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[var(--color-forest-900)]"
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {hint ? (
        <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-2 text-sm font-medium text-[#8a3324]">{error}</p>
      ) : null}
    </div>
  );
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
