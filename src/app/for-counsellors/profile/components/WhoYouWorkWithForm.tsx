"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveWhoYouWorkWithSection } from "../actions";
import type { TaxonomyRow } from "@/lib/counsellor-workspace/types";
import type {
  WhoYouWorkWithDeclarationValue,
  WhoYouWorkWithFormState,
} from "@/lib/counsellor-workspace/who-you-work-with";

type WhoYouWorkWithFormProps = {
  clientGroups: TaxonomyRow[];
  initialState: WhoYouWorkWithFormState;
  serviceTypes: TaxonomyRow[];
};

const GENDER_SCOPE_OPTIONS = [
  {
    value: "not_specified",
    label: "Not specified / not yet answered",
  },
  {
    value: "all_genders",
    label: "No gender-specific restriction",
  },
  {
    value: "women_only",
    label: "Women only",
  },
  {
    value: "men_only",
    label: "Men only",
  },
  {
    value: "other",
    label: "Another eligibility arrangement",
  },
] as const;

export function WhoYouWorkWithForm({
  clientGroups,
  initialState,
  serviceTypes,
}: WhoYouWorkWithFormProps) {
  const [state, formAction] = useActionState(
    saveWhoYouWorkWithSection,
    initialState,
  );

  return (
    <WhoYouWorkWithFormFields
      key={state.savedStateKey}
      clientGroups={clientGroups}
      formAction={formAction}
      serviceTypes={serviceTypes}
      state={state}
    />
  );
}

function WhoYouWorkWithFormFields({
  clientGroups,
  formAction,
  serviceTypes,
  state,
}: {
  clientGroups: TaxonomyRow[];
  formAction: (formData: FormData) => void;
  serviceTypes: TaxonomyRow[];
  state: WhoYouWorkWithFormState;
}) {
  const initialByServiceTypeKey = useMemo(
    () => buildDeclarationValueMap(state.values.declarations),
    [state.values.declarations],
  );
  const [selectedServiceTypeKeys, setSelectedServiceTypeKeys] = useState(
    () => selectedServiceTypeKeySet(state.values.declarations),
  );
  const [selectedClientGroups, setSelectedClientGroups] = useState(
    () => selectedClientGroupMap(state.values.declarations),
  );
  const [genderScopes, setGenderScopes] = useState(
    () => genderScopeMap(state.values.declarations),
  );
  const [genderScopeNotes, setGenderScopeNotes] = useState(
    () => genderScopeNoteMap(state.values.declarations),
  );
  const selectedServiceTypes = serviceTypes.filter((serviceType) =>
    selectedServiceTypeKeys.has(serviceType.key),
  );

  function toggleServiceType(serviceTypeKey: string, checked: boolean) {
    setSelectedServiceTypeKeys((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(serviceTypeKey);
      } else {
        next.delete(serviceTypeKey);
      }

      return next;
    });

    if (checked && !genderScopes.has(serviceTypeKey)) {
      setGenderScopes((current) =>
        new Map(current).set(serviceTypeKey, "not_specified"),
      );
    }

    if (checked && !genderScopeNotes.has(serviceTypeKey)) {
      setGenderScopeNotes((current) => new Map(current).set(serviceTypeKey, ""));
    }
  }

  function toggleClientGroup(
    serviceTypeKey: string,
    clientGroupKey: string,
    checked: boolean,
  ) {
    setSelectedClientGroups((current) => {
      const next = new Map(current);
      const groups = new Set(next.get(serviceTypeKey) ?? []);

      if (checked) {
        groups.add(clientGroupKey);
      } else {
        groups.delete(clientGroupKey);
      }

      next.set(serviceTypeKey, groups);
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

      <fieldset
        className="space-y-4"
        aria-describedby={
          state.fieldErrors.serviceTypeKey ? "serviceTypeKey-error" : undefined
        }
      >
        <legend className="text-base font-semibold text-[var(--color-forest-900)]">
          What kinds of counselling do you provide?
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {serviceTypes.map((serviceType) => {
            const checked = selectedServiceTypeKeys.has(serviceType.key);

            return (
              <label
                key={serviceType.key}
                className="flex min-h-12 cursor-pointer items-start gap-3 border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)]"
              >
                <input
                  type="checkbox"
                  name="serviceTypeKey"
                  value={serviceType.key}
                  checked={checked}
                  onChange={(event) =>
                    toggleServiceType(serviceType.key, event.target.checked)
                  }
                  className="mt-0.5 size-4 accent-[var(--color-forest-900)]"
                />
                <span>
                  <span className="block">{serviceType.label}</span>
                  {serviceType.definition ? (
                    <span className="mt-1 block text-xs leading-5 text-[var(--color-stone)]">
                      {serviceType.definition}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
        {state.fieldErrors.serviceTypeKey ? (
          <p id="serviceTypeKey-error" className="text-sm text-[#8a3324]">
            {state.fieldErrors.serviceTypeKey}
          </p>
        ) : null}
      </fieldset>

      <div className="space-y-10">
        {selectedServiceTypes.map((serviceType) => {
          const initialValue = initialByServiceTypeKey.get(serviceType.key);
          const selectedGroups = selectedClientGroups.get(serviceType.key);
          const selectedGenderScope =
            genderScopes.get(serviceType.key) ??
            initialValue?.clientGenderScopeKey ??
            "not_specified";
          const selectedGenderScopeNote =
            genderScopeNotes.get(serviceType.key) ??
            initialValue?.clientGenderScopeNote ??
            "";
          const clientGroupError =
            state.fieldErrors[`clientGroups:${serviceType.key}`];
          const genderScopeError =
            state.fieldErrors[`clientGenderScope:${serviceType.key}`];
          const genderScopeNoteError =
            state.fieldErrors[`clientGenderScopeNote:${serviceType.key}`];

          return (
            <section
              key={serviceType.key}
              className="border-t border-[var(--color-border)] pt-8"
            >
              <div>
                <p className="text-lg font-semibold text-[var(--color-forest-900)]">
                  {serviceType.label}
                </p>
              </div>

              <fieldset
                className="mt-6 space-y-4"
                aria-describedby={
                  clientGroupError
                    ? `clientGroups:${serviceType.key}-error`
                    : undefined
                }
              >
                <legend className="text-sm font-semibold text-[var(--color-forest-900)]">
                  Who do you currently work with for this service?
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {clientGroups.map((group) => {
                    const checked =
                      selectedGroups?.has(group.key) ??
                      initialValue?.clientGroupKeys.includes(group.key) ??
                      false;

                    return (
                      <label
                        key={group.key}
                        className="flex min-h-12 cursor-pointer items-start gap-3 border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)]"
                      >
                        <input
                          type="checkbox"
                          name={`clientGroups:${serviceType.key}`}
                          value={group.key}
                          checked={checked}
                          onChange={(event) =>
                            toggleClientGroup(
                              serviceType.key,
                              group.key,
                              event.target.checked,
                            )
                          }
                          className="mt-0.5 size-4 accent-[var(--color-forest-900)]"
                        />
                        <span>
                          <span className="block">{group.label}</span>
                          {group.definition ? (
                            <span className="mt-1 block text-xs leading-5 text-[var(--color-stone)]">
                              {group.definition}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {clientGroupError ? (
                  <p
                    id={`clientGroups:${serviceType.key}-error`}
                    className="text-sm text-[#8a3324]"
                  >
                    {clientGroupError}
                  </p>
                ) : null}
              </fieldset>

              <fieldset
                className="mt-7 space-y-4"
                aria-describedby={
                  genderScopeError
                    ? `clientGenderScope:${serviceType.key}-error`
                    : undefined
                }
              >
                <legend className="text-sm font-semibold text-[var(--color-forest-900)]">
                  Does this service have any gender-specific eligibility?
                </legend>
                <div className="grid gap-3">
                  {GENDER_SCOPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex min-h-12 cursor-pointer items-center gap-3 border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)]"
                    >
                      <input
                        type="radio"
                        name={`clientGenderScope:${serviceType.key}`}
                        value={option.value}
                        checked={selectedGenderScope === option.value}
                        onChange={() =>
                          setGenderScopes((current) =>
                            new Map(current).set(
                              serviceType.key,
                              option.value,
                            ),
                          )
                        }
                        className="size-4 accent-[var(--color-forest-900)]"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {genderScopeError ? (
                  <p
                    id={`clientGenderScope:${serviceType.key}-error`}
                    className="text-sm text-[#8a3324]"
                  >
                    {genderScopeError}
                  </p>
                ) : null}
              </fieldset>

              <div className="mt-5">
                <label
                  htmlFor={`clientGenderScopeNote:${serviceType.key}`}
                  className="text-sm font-semibold text-[var(--color-forest-900)]"
                >
                  Eligibility note
                </label>
                <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
                  Only used for another eligibility arrangement.
                </p>
                <input
                  id={`clientGenderScopeNote:${serviceType.key}`}
                  name={`clientGenderScopeNote:${serviceType.key}`}
                  type="text"
                  value={selectedGenderScopeNote}
                  maxLength={180}
                  disabled={selectedGenderScope !== "other"}
                  onChange={(event) =>
                    setGenderScopeNotes((current) =>
                      new Map(current).set(serviceType.key, event.target.value),
                    )
                  }
                  aria-describedby={
                    genderScopeNoteError
                      ? `clientGenderScopeNote:${serviceType.key}-error`
                      : undefined
                  }
                  className="bcmc-input mt-2 max-w-xl disabled:bg-[var(--color-soft-grey)] disabled:text-[var(--color-stone)]"
                />
                {genderScopeNoteError ? (
                  <p
                    id={`clientGenderScopeNote:${serviceType.key}-error`}
                    className="mt-2 text-sm text-[#8a3324]"
                  >
                    {genderScopeNoteError}
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

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

function selectedServiceTypeKeySet(values: WhoYouWorkWithDeclarationValue[]) {
  return new Set(values.map((value) => value.serviceTypeKey));
}

function selectedClientGroupMap(values: WhoYouWorkWithDeclarationValue[]) {
  return new Map(
    values.map((value) => [
      value.serviceTypeKey,
      new Set(value.clientGroupKeys),
    ]),
  );
}

function genderScopeMap(values: WhoYouWorkWithDeclarationValue[]) {
  return new Map(
    values.map((value) => [
      value.serviceTypeKey,
      value.clientGenderScopeKey,
    ]),
  );
}

function genderScopeNoteMap(values: WhoYouWorkWithDeclarationValue[]) {
  return new Map(
    values.map((value) => [
      value.serviceTypeKey,
      value.clientGenderScopeNote,
    ]),
  );
}

function buildDeclarationValueMap(
  values: WhoYouWorkWithDeclarationValue[],
) {
  return new Map(values.map((value) => [value.serviceTypeKey, value]));
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

function statusClassName(status: WhoYouWorkWithFormState["status"]) {
  if (status === "success") {
    return "text-[var(--color-forest-900)]";
  }

  if (status === "error") {
    return "text-[#8a3324]";
  }

  return "text-[var(--color-stone)]";
}
