"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveCulturalFamiliaritySection } from "../actions";
import {
  culturalFamiliarityStateKey,
  normalizeCulturalFamiliarityValue,
  validateCulturalFamiliarityValue,
  type CulturalFamiliarityFormState,
  type CulturalFamiliarityValue,
} from "@/lib/counsellor-workspace/cultural-familiarity";
import type { CulturalFamiliarityTaxonomyRow } from "@/lib/counsellor-workspace/types";

type CulturalFamiliarityFormProps = {
  initialState: CulturalFamiliarityFormState;
  taxonomyRows: CulturalFamiliarityTaxonomyRow[];
};

const GROUP_LABELS: Record<string, string> = {
  cultural_community_context: "Cultural & community contexts",
  family_community_dynamic: "Family & community dynamics",
};

const ZERO_SELECTION_LABEL =
  "I don't want to highlight any specific cultural or community familiarity.";

export function CulturalFamiliarityForm({
  initialState,
  taxonomyRows,
}: CulturalFamiliarityFormProps) {
  const [state, formAction] = useActionState(
    saveCulturalFamiliaritySection,
    initialState,
  );

  return (
    <CulturalFamiliarityFormFields
      formAction={formAction}
      state={state}
      taxonomyRows={taxonomyRows}
    />
  );
}

function CulturalFamiliarityFormFields({
  formAction,
  state,
  taxonomyRows,
}: {
  formAction: (formData: FormData) => void;
  state: CulturalFamiliarityFormState;
  taxonomyRows: CulturalFamiliarityTaxonomyRow[];
}) {
  const initialValue = useMemo(
    () => normalizeCulturalFamiliarityValue(state.values),
    [state.values],
  );
  const [value, setValue] = useState<CulturalFamiliarityValue>(
    () => initialValue,
  );
  const editGenerationRef = useRef(0);
  const lastAppliedSuccessKeyRef = useRef(state.savedStateKey);
  const pendingSubmissionRef = useRef<{
    editGeneration: number;
    stateKey: string;
  } | null>(null);
  const activeKeys = useMemo(
    () => new Set(taxonomyRows.map((row) => row.key)),
    [taxonomyRows],
  );
  const normalizedValue = normalizeCulturalFamiliarityValue(value);
  const serverErrorsApply =
    culturalFamiliarityStateKey(normalizedValue) ===
    culturalFamiliarityStateKey(state.values);
  const fieldErrors = {
    ...validateCulturalFamiliarityValue(normalizedValue, activeKeys),
    ...(serverErrorsApply ? state.fieldErrors : {}),
  };
  const canSubmit = Object.keys(fieldErrors).length === 0;
  const selectedKeySet = new Set(normalizedValue.selectedKeys);
  const groups = useMemo(() => groupTaxonomyRows(taxonomyRows), [taxonomyRows]);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    const savedValue = normalizeCulturalFamiliarityValue(state.values);
    const savedStateKey = culturalFamiliarityStateKey(savedValue);

    if (savedStateKey === lastAppliedSuccessKeyRef.current) {
      pendingSubmissionRef.current = null;
      return;
    }

    const pendingSubmission = pendingSubmissionRef.current;

    if (
      pendingSubmission?.stateKey === savedStateKey &&
      pendingSubmission.editGeneration === editGenerationRef.current
    ) {
      setValue(savedValue);
      lastAppliedSuccessKeyRef.current = savedStateKey;
      pendingSubmissionRef.current = null;
    }
  }, [state.status, state.values]);

  function setEditableValue(nextValue: CulturalFamiliarityValue) {
    editGenerationRef.current += 1;
    setValue(normalizeCulturalFamiliarityValue(nextValue));
  }

  function setExplicitZero() {
    setEditableValue({
      selectedKeys: [],
      explicitlyNoHighlights: true,
    });
  }

  function toggleKey(key: string, checked: boolean) {
    editGenerationRef.current += 1;
    setValue((current) => {
      const keys = new Set(current.selectedKeys);

      if (checked) {
        keys.add(key);
      } else {
        keys.delete(key);
      }

      return normalizeCulturalFamiliarityValue({
        selectedKeys: Array.from(keys),
        explicitlyNoHighlights: false,
      });
    });
  }

  function submitAction(formData: FormData) {
    pendingSubmissionRef.current = {
      editGeneration: editGenerationRef.current,
      stateKey: culturalFamiliarityStateKey(normalizedValue),
    };
    formAction(formData);
  }

  return (
    <form action={submitAction} className="mt-8 space-y-8">
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

      <section className="space-y-4">
        <div className="border-b border-[var(--color-border)] pb-4">
          <h3 className="text-lg font-semibold text-[var(--color-forest-900)]">
            Contexts you are familiar engaging with
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
            Select the areas you feel familiar engaging with when they are
            relevant in counselling.
          </p>
        </div>

        {groups.map((group) => (
          <fieldset key={group.contextTypeKey} className="space-y-3">
            <legend className="text-sm font-semibold text-[var(--color-forest-900)]">
              {group.label}
            </legend>
            <div className="grid gap-3">
              {group.rows.map((row) => (
                <FamiliarityOption
                  key={row.key}
                  checked={selectedKeySet.has(row.key)}
                  option={row}
                  onChange={(checked) => toggleKey(row.key, checked)}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </section>

      <fieldset
        className="space-y-3"
        aria-describedby={fieldErrors.selection ? "selection-error" : undefined}
      >
        <legend className="sr-only">No specific familiarity to highlight</legend>
        <label
          className={`grid min-h-14 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] gap-3 border px-4 py-3 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)] ${
            normalizedValue.explicitlyNoHighlights
              ? "border-[var(--color-leaf)] bg-white text-[var(--color-ink)] shadow-[inset_4px_0_0_var(--color-leaf)]"
              : "border-[var(--color-border)] bg-white/78 text-[var(--color-ink)] hover:border-[var(--color-sage)]"
          }`}
        >
          <input
            type="checkbox"
            checked={normalizedValue.explicitlyNoHighlights}
            onChange={(event) => {
              if (event.target.checked) {
                setExplicitZero();
              } else {
                setEditableValue({
                  selectedKeys: [],
                  explicitlyNoHighlights: false,
                });
              }
            }}
            className="mt-1 size-4 accent-[var(--color-forest-900)]"
          />
          <span className="leading-6">{ZERO_SELECTION_LABEL}</span>
        </label>
        {fieldErrors.selection ? (
          <p id="selection-error" className="text-sm text-[#8a3324]">
            {fieldErrors.selection}
          </p>
        ) : null}
      </fieldset>

      <p className="border-l-4 border-[var(--color-champagne)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-stone)]">
        This is about familiarity, not assuming that everyone from a community
        has the same experience.
      </p>

      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-center">
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
            ? state.message || "You can come back to this anytime."
            : "Choose at least one option, or choose that you do not want to highlight anything specific."}
        </p>
      </div>
    </form>
  );
}

function FamiliarityOption({
  checked,
  onChange,
  option,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  option: CulturalFamiliarityTaxonomyRow;
}) {
  return (
    <label
      className={`grid min-h-16 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] gap-3 border px-4 py-3 text-sm transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)] ${
        checked
          ? "border-[var(--color-leaf)] bg-white text-[var(--color-ink)] shadow-[inset_4px_0_0_var(--color-leaf)]"
          : "border-[var(--color-border)] bg-white/78 text-[var(--color-ink)] hover:border-[var(--color-sage)]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 accent-[var(--color-forest-900)]"
      />
      <span>
        <span className="block font-medium text-[var(--color-forest-900)]">
          {option.label}
        </span>
        {option.short_description ? (
          <span className="mt-1 block text-xs leading-5 text-[var(--color-stone)]">
            {option.short_description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function SerializedValue({ value }: { value: CulturalFamiliarityValue }) {
  return (
    <>
      {value.selectedKeys.map((key) => (
        <input key={key} type="hidden" name="familiarityKey" value={key} />
      ))}
      <input
        type="hidden"
        name="explicitlyNoHighlights"
        value={String(value.explicitlyNoHighlights)}
      />
    </>
  );
}

function groupTaxonomyRows(rows: CulturalFamiliarityTaxonomyRow[]) {
  const groups = new Map<string, CulturalFamiliarityTaxonomyRow[]>();

  for (const row of rows) {
    groups.set(row.context_type_key, [
      ...(groups.get(row.context_type_key) ?? []),
      row,
    ]);
  }

  return Array.from(groups).map(([contextTypeKey, groupRows]) => ({
    contextTypeKey,
    label: GROUP_LABELS[contextTypeKey] ?? "Other contexts",
    rows: groupRows,
  }));
}

function SubmitButton({
  children,
  disabled,
  intent,
}: {
  children: React.ReactNode;
  disabled: boolean;
  intent: "save" | "continue";
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

function statusClassName(status: CulturalFamiliarityFormState["status"]) {
  if (status === "success") {
    return "text-[var(--color-forest-900)]";
  }

  if (status === "error") {
    return "text-[#8a3324]";
  }

  return "text-[var(--color-stone)]";
}
