"use client";

import { Check, CircleAlert, CircleCheck, Pencil, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  completeProfessionalBackground,
  deleteProfessionalEducation,
  saveProfessionalEducation,
  saveProfessionalExperience,
  saveTherapeuticApproaches,
} from "../actions";
import {
  APPROACH_RELATIONSHIPS,
  emptyProfessionalBackgroundActionState,
  experiencePreview,
  professionalBackgroundCompletionMessage,
  publicApproachName,
  type ApproachRelationshipKey,
  type ProfessionalBackgroundActionState,
  type ProfessionalBackgroundData,
} from "@/lib/counsellor-workspace/professional-background";
import type { CounsellorWorkspaceStatus } from "@/lib/counsellor-workspace/types";

type ProfessionalBackgroundFormProps = {
  data: ProfessionalBackgroundData;
  onboardingStatus: CounsellorWorkspaceStatus;
};

type ApproachSelection = {
  selected: boolean;
  relationship: ApproachRelationshipKey;
};

export function ProfessionalBackgroundForm({
  data,
  onboardingStatus,
}: ProfessionalBackgroundFormProps) {
  const [educationState, educationAction] = useActionState(
    saveProfessionalEducation,
    emptyProfessionalBackgroundActionState,
  );
  const [deleteEducationState, deleteEducationAction] = useActionState(
    deleteProfessionalEducation,
    emptyProfessionalBackgroundActionState,
  );
  const [experienceState, experienceAction] = useActionState(
    saveProfessionalExperience,
    emptyProfessionalBackgroundActionState,
  );
  const [approachState, approachAction] = useActionState(
    saveTherapeuticApproaches,
    emptyProfessionalBackgroundActionState,
  );
  const [completionState, completionAction] = useActionState(
    completeProfessionalBackground,
    emptyProfessionalBackgroundActionState,
  );
  const [editingEducationId, setEditingEducationId] = useState<string | null>(
    data.educationRecords.length === 0 ? "new" : null,
  );
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [editingExperience, setEditingExperience] = useState(
    !data.experience?.post_masters_practice_start_year,
  );
  const [editingApproaches, setEditingApproaches] = useState(false);
  const previousEducationStatusRef = useRef(educationState.status);
  const previousDeleteStatusRef = useRef(deleteEducationState.status);
  const previousExperienceStatusRef = useRef(experienceState.status);
  const previousApproachStatusRef = useRef(approachState.status);
  const primaryCredential = data.credentials[0] ?? null;
  const primaryVerification = primaryCredential
    ? data.credentialVerifications.find(
        (verification) => verification.credential_id === primaryCredential.id,
      )
    : null;
  const credentialType = primaryCredential
    ? data.credentialTypes.find(
        (type) => type.key === primaryCredential.credential_type_key,
      )
    : null;
  const requirementCodes = [
    ...data.completion.needs_attention,
    ...data.completion.missing,
  ];

  useEffect(() => {
    const previousStatus = previousEducationStatusRef.current;
    previousEducationStatusRef.current = educationState.status;

    if (previousStatus !== "success" && educationState.status === "success") {
      setEditingEducationId(null);
    }
  }, [educationState.status]);

  useEffect(() => {
    const previousStatus = previousDeleteStatusRef.current;
    previousDeleteStatusRef.current = deleteEducationState.status;

    if (
      previousStatus !== "success" &&
      deleteEducationState.status === "success"
    ) {
      setConfirmingDeleteId(null);
    }
  }, [deleteEducationState.status]);

  useEffect(() => {
    const previousStatus = previousExperienceStatusRef.current;
    previousExperienceStatusRef.current = experienceState.status;

    if (previousStatus !== "success" && experienceState.status === "success") {
      setEditingExperience(false);
    }
  }, [experienceState.status]);

  useEffect(() => {
    const previousStatus = previousApproachStatusRef.current;
    previousApproachStatusRef.current = approachState.status;

    if (previousStatus !== "success" && approachState.status === "success") {
      setEditingApproaches(false);
    }
  }, [approachState.status]);

  return (
    <div className="mt-8 space-y-8">
      <SectionPanel title="Credential & verification">
        <CredentialSummary
          credentialTypeLabel={credentialType?.label}
          primaryCredential={primaryCredential}
          primaryVerification={primaryVerification}
        />
      </SectionPanel>

      <SectionPanel title="Education">
        <div className="space-y-4">
          {data.educationRecords.length > 0 ? (
            <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              {data.educationRecords.map((record) => (
                <div key={record.id} className="py-4">
                  {editingEducationId === record.id ? (
                    <EducationEditor
                      action={educationAction}
                      educationState={educationState}
                      onCancel={() => setEditingEducationId(null)}
                      record={record}
                    />
                  ) : confirmingDeleteId === record.id ? (
                    <EducationDeleteConfirmation
                      action={deleteEducationAction}
                      onCancel={() => setConfirmingDeleteId(null)}
                      recordId={record.id}
                    />
                  ) : (
                    <EducationReadRow
                      onDelete={() => setConfirmingDeleteId(record.id)}
                      onEdit={() => setEditingEducationId(record.id)}
                      record={record}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-[var(--color-stone)]">
              Add at least one relevant qualification.
            </p>
          )}

          {editingEducationId === "new" ? (
            <EducationEditor
              action={educationAction}
              educationState={educationState}
              onCancel={() => setEditingEducationId(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingEducationId("new")}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
            >
              <Pencil className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
              Add another qualification
            </button>
          )}

          <ActionMessage state={educationState} />
          <ActionMessage state={deleteEducationState} />
        </div>
      </SectionPanel>

      <SectionPanel title="Clinical experience">
        {editingExperience ? (
          <ExperienceEditor
            action={experienceAction}
            experience={data.experience}
            experienceState={experienceState}
            onCancel={
              data.experience?.post_masters_practice_start_year
                ? () => setEditingExperience(false)
                : null
            }
          />
        ) : (
          <ExperienceReadSummary
            experience={data.experience}
            onEdit={() => setEditingExperience(true)}
          />
        )}
      </SectionPanel>

      <SectionPanel title="Therapeutic approaches">
        {editingApproaches ? (
          <ApproachesEditor
            action={approachAction}
            approachState={approachState}
            data={data}
            onCancel={() => setEditingApproaches(false)}
          />
        ) : (
          <ApproachesReadSummary
            data={data}
            onEdit={() => setEditingApproaches(true)}
          />
        )}
      </SectionPanel>

      {data.trainingCertifications.length > 0 ? (
        <SectionPanel title="Reviewed training">
          <ul className="space-y-3">
            {data.trainingCertifications.map((record) => (
              <li key={record.id} className="text-sm leading-6">
                <span className="font-semibold text-[var(--color-forest-900)]">
                  {record.title}
                </span>
                <span className="block text-[var(--color-stone)]">
                  {[
                    record.provider_name,
                    record.completion_year,
                    trainingStatusLabel(record.evidence_status_key),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </SectionPanel>
      ) : null}

      <CompletionPanel
        completionAction={completionAction}
        completionState={completionState}
        data={data}
        onboardingStatus={onboardingStatus}
        requirementCodes={requirementCodes}
      />
    </div>
  );
}

function CredentialSummary({
  credentialTypeLabel,
  primaryCredential,
  primaryVerification,
}: {
  credentialTypeLabel?: string;
  primaryCredential: ProfessionalBackgroundData["credentials"][number] | null;
  primaryVerification:
    | ProfessionalBackgroundData["credentialVerifications"][number]
    | null
    | undefined;
}) {
  if (!primaryCredential) {
    return (
      <p className="text-sm leading-6 text-[var(--color-stone)]">
        BCMC needs to review your credential information before this section can
        be completed.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm leading-6 text-[var(--color-stone)]">
      <div>
        <p className="font-semibold text-[var(--color-forest-900)]">
          {credentialTypeLabel ?? primaryCredential.credential_type_key}
        </p>
        <p>{primaryCredential.issuer_name}</p>
      </div>
      {primaryVerification?.currently_verified ? (
        <div>
          <p className="font-semibold text-[var(--color-forest-900)]">
            RCC status checked by BCMC
          </p>
          {primaryVerification.verified_checked_at ? (
            <p>Checked {formatShortDate(primaryVerification.verified_checked_at)}</p>
          ) : null}
        </div>
      ) : (
        <p>
          BCMC needs to review your credential information before this section
          can be completed.
        </p>
      )}
    </div>
  );
}

function EducationReadRow({
  onDelete,
  onEdit,
  record,
}: {
  onDelete: () => void;
  onEdit: () => void;
  record: ProfessionalBackgroundData["educationRecords"][number];
}) {
  const detail = [
    record.field_of_study,
    record.institution_name,
    record.completion_year,
    record.country_code,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="font-semibold text-[var(--color-forest-900)]">
          {record.degree_title}
        </p>
        {detail ? (
          <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
            {detail}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
        >
          <Pencil className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function EducationDeleteConfirmation({
  action,
  onCancel,
  recordId,
}: {
  action: (formData: FormData) => void;
  onCancel: () => void;
  recordId: string;
}) {
  return (
    <div className="bg-white px-4 py-4">
      <p className="text-sm font-semibold text-[var(--color-forest-900)]">
        Remove this qualification from your profile?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={action}>
          <input type="hidden" name="educationId" value={recordId} />
          <SubmitButton styleName="secondary">Remove</SubmitButton>
        </form>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
        >
          <X className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
          Cancel
        </button>
      </div>
    </div>
  );
}

function EducationEditor({
  action,
  educationState,
  onCancel,
  record,
}: {
  action: (formData: FormData) => void;
  educationState: ProfessionalBackgroundActionState;
  onCancel: () => void;
  record?: ProfessionalBackgroundData["educationRecords"][number];
}) {
  return (
    <form action={action} className="space-y-4 bg-white px-4 py-4">
      {record ? <input type="hidden" name="educationId" value={record.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          error={educationState.fieldErrors.degreeTitle}
          id={`degreeTitle-${record?.id ?? "new"}`}
          label="Degree or qualification"
          required
        >
          <input
            id={`degreeTitle-${record?.id ?? "new"}`}
            name="degreeTitle"
            type="text"
            defaultValue={record?.degree_title ?? ""}
            maxLength={160}
            required
            className="bcmc-input"
          />
        </Field>
        <Field
          error={educationState.fieldErrors.institutionName}
          id={`institutionName-${record?.id ?? "new"}`}
          label="Institution"
          required
        >
          <input
            id={`institutionName-${record?.id ?? "new"}`}
            name="institutionName"
            type="text"
            defaultValue={record?.institution_name ?? ""}
            maxLength={180}
            required
            className="bcmc-input"
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field
          error={educationState.fieldErrors.fieldOfStudy}
          hint="Optional."
          id={`fieldOfStudy-${record?.id ?? "new"}`}
          label="Field of study"
        >
          <input
            id={`fieldOfStudy-${record?.id ?? "new"}`}
            name="fieldOfStudy"
            type="text"
            defaultValue={record?.field_of_study ?? ""}
            maxLength={120}
            className="bcmc-input"
          />
        </Field>
        <Field
          error={educationState.fieldErrors.completionYear}
          hint="Optional."
          id={`completionYear-${record?.id ?? "new"}`}
          label="Completion year"
        >
          <input
            id={`completionYear-${record?.id ?? "new"}`}
            name="completionYear"
            type="number"
            min="1950"
            max={new Date().getFullYear()}
            defaultValue={record?.completion_year ?? ""}
            className="bcmc-input"
          />
        </Field>
        <Field
          error={educationState.fieldErrors.countryCode}
          hint="Optional."
          id={`countryCode-${record?.id ?? "new"}`}
          label="Country"
        >
          <input
            id={`countryCode-${record?.id ?? "new"}`}
            name="countryCode"
            type="text"
            defaultValue={record?.country_code ?? ""}
            maxLength={2}
            className="bcmc-input uppercase"
            placeholder="CA"
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <SubmitButton>{record ? "Save changes" : "Add qualification"}</SubmitButton>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
        >
          <X className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
          Cancel
        </button>
      </div>
    </form>
  );
}

function ExperienceReadSummary({
  experience,
  onEdit,
}: {
  experience: ProfessionalBackgroundData["experience"];
  onEdit: () => void;
}) {
  const preview = experience?.post_masters_practice_start_year
    ? experiencePreview(experience)
    : null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {preview ? (
          <p className="font-semibold text-[var(--color-forest-900)]">
            {preview}
          </p>
        ) : (
          <>
            <p className="font-semibold text-[var(--color-forest-900)]">
              Needs counsellor answer
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
              Add the year your post-master&apos;s clinical practice began.
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
      >
        <Pencil className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
        {preview ? "Edit year" : "Add year"}
      </button>
    </div>
  );
}

function ExperienceEditor({
  action,
  experience,
  experienceState,
  onCancel,
}: {
  action: (formData: FormData) => void;
  experience: ProfessionalBackgroundData["experience"];
  experienceState: ProfessionalBackgroundActionState;
  onCancel: (() => void) | null;
}) {
  return (
    <form action={action} className="space-y-4">
      <Field
        error={experienceState.fieldErrors.postMastersPracticeStartYear}
        hint="We use the year to describe when your post-master's clinical practice began. We won't ask you to maintain a running number of years."
        id="postMastersPracticeStartYear"
        label="What year did you begin practising clinically after completing your master's-level counselling training?"
        required
      >
        <input
          id="postMastersPracticeStartYear"
          name="postMastersPracticeStartYear"
          type="number"
          min="1950"
          max={new Date().getFullYear()}
          defaultValue={experience?.post_masters_practice_start_year ?? ""}
          className="bcmc-input max-w-40"
        />
      </Field>
      {!experience?.post_masters_practice_start_year ? (
        <p className="text-sm leading-6 text-[var(--color-stone)]">
          Needs counsellor answer.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <SubmitButton>Save clinical experience</SubmitButton>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
          >
            <X className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
            Cancel
          </button>
        ) : null}
      </div>
      <ActionMessage state={experienceState} />
    </form>
  );
}

function ApproachesReadSummary({
  data,
  onEdit,
}: {
  data: ProfessionalBackgroundData;
  onEdit: () => void;
}) {
  const selectedByKey = selectedApproachMap(data);
  const selectedApproaches = data.approachTaxonomy.flatMap((approach) => {
    const relationship = selectedByKey.get(approach.key);

    return relationship
      ? [
          {
            key: approach.key,
            label: publicApproachName({
              key: approach.key,
              label: approach.label,
            }),
            relationship,
          },
        ]
      : [];
  });

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-[var(--color-stone)]">
        You do not need to list a named therapeutic approach if that is not
        useful or accurate for your practice.
      </p>
      {selectedApproaches.length > 0 ? (
        <ul className="space-y-2 text-sm leading-6">
          {selectedApproaches.map((approach) => (
            <li key={approach.key}>
              <span className="font-semibold text-[var(--color-forest-900)]">
                {approach.label}
              </span>
              <span className="block text-[var(--color-stone)]">
                {approachRelationshipLabel(approach.relationship)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-semibold text-[var(--color-forest-900)]">
          No named therapeutic approaches selected.
        </p>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
      >
        <Pencil className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
        Edit approaches
      </button>
    </div>
  );
}

function ApproachesEditor({
  action,
  approachState,
  data,
  onCancel,
}: {
  action: (formData: FormData) => void;
  approachState: ProfessionalBackgroundActionState;
  data: ProfessionalBackgroundData;
  onCancel: () => void;
}) {
  const initialSelections = useMemo(() => {
    const selectedByKey = selectedApproachMap(data);

    return Object.fromEntries(
      data.approachTaxonomy.map((approach) => [
        approach.key,
        {
          selected: selectedByKey.has(approach.key),
          relationship: selectedByKey.get(approach.key) ?? "informed_by",
        },
      ]),
    ) as Record<string, ApproachSelection>;
  }, [data]);
  const [selections, setSelections] = useState(initialSelections);

  function updateSelection(
    approachKey: string,
    nextSelection: Partial<ApproachSelection>,
  ) {
    setSelections((current) => ({
      ...current,
      [approachKey]: {
        ...(current[approachKey] ?? {
          selected: false,
          relationship: "informed_by",
        }),
        ...nextSelection,
      },
    }));
  }

  return (
    <form action={action} className="space-y-5">
      <p className="text-sm leading-6 text-[var(--color-stone)]">
        Choose only named approaches that actively shape your counselling. These
        are self-reported and do not imply certification, specialization, or
        advanced training.
      </p>

      <div className="space-y-4">
        {data.approachTaxonomy.map((approach) => {
          const selection = selections[approach.key] ?? {
            selected: false,
            relationship: "informed_by" as ApproachRelationshipKey,
          };
          const name = publicApproachName({
            key: approach.key,
            label: approach.label,
          });

          return (
            <div
              key={approach.key}
              className="border border-[var(--color-border)] bg-white p-4"
            >
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="approachKey"
                  value={approach.key}
                  checked={selection.selected}
                  onChange={(event) =>
                    updateSelection(approach.key, {
                      selected: event.target.checked,
                    })
                  }
                  className="mt-1 size-4 accent-[var(--color-forest-900)]"
                />
                <span>
                  <span className="block font-semibold text-[var(--color-forest-900)]">
                    {name}
                  </span>
                  {approach.short_description ? (
                    <span className="mt-1 block text-sm leading-6 text-[var(--color-stone)]">
                      {approach.short_description}
                    </span>
                  ) : null}
                </span>
              </label>

              {selection.selected ? (
                <fieldset className="mt-4 space-y-3 pl-7">
                  <legend className="text-sm font-semibold text-[var(--color-forest-900)]">
                    How does this approach relate to your practice?
                  </legend>
                  <div className="grid gap-3 md:grid-cols-2">
                    {APPROACH_RELATIONSHIPS.map((option) => (
                      <label
                        key={option.key}
                        className="flex cursor-pointer gap-3 border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-3 text-sm leading-5 text-[var(--color-ink)]"
                      >
                        <input
                          type="radio"
                          name={`relationship:${approach.key}`}
                          value={option.key}
                          checked={selection.relationship === option.key}
                          onChange={() =>
                            updateSelection(approach.key, {
                              relationship: option.key,
                            })
                          }
                          className="mt-0.5 size-4 accent-[var(--color-forest-900)]"
                        />
                        <span>
                          <span className="block font-semibold">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-[var(--color-stone)]">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {approachState.fieldErrors[`relationship:${approach.key}`] ? (
                    <p className="text-sm font-medium text-[#8a3324]">
                      {approachState.fieldErrors[`relationship:${approach.key}`]}
                    </p>
                  ) : null}
                </fieldset>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <SubmitButton>Save approaches</SubmitButton>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
        >
          <X className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
          Cancel
        </button>
      </div>
      <ActionMessage state={approachState} />
    </form>
  );
}

function CompletionPanel({
  completionAction,
  completionState,
  data,
  onboardingStatus,
  requirementCodes,
}: {
  completionAction: () => void;
  completionState: ProfessionalBackgroundActionState;
  data: ProfessionalBackgroundData;
  onboardingStatus: CounsellorWorkspaceStatus;
  requirementCodes: string[];
}) {
  const completed =
    onboardingStatus === "complete" || completionState.status === "success";
  const ready = data.completion.complete && !completed;

  return (
    <section className="border-t border-[var(--color-border)] pt-6">
      <div className="bg-white px-5 py-5">
        <div className="flex items-start gap-3">
          {ready || completed ? (
            <CircleCheck
              className="mt-0.5 h-5 w-5 shrink-0 stroke-[1.8] text-[var(--color-leaf)]"
              aria-hidden="true"
            />
          ) : (
            <CircleAlert
              className="mt-0.5 h-5 w-5 shrink-0 stroke-[1.8] text-[#8a3324]"
              aria-hidden="true"
            />
          )}
          <div>
            <h3 className="font-serif text-xl leading-tight text-[var(--color-forest-900)]">
              {completed
                ? "Professional background complete"
                : ready
                  ? "Ready to finish"
                  : "Still needed"}
            </h3>
            {completed ? null : ready ? (
              <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
                Everything required for Professional background is saved.
              </p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--color-stone)]">
                {requirementCodes.length > 0 ? (
                  requirementCodes.map((code, index) => (
                    <li key={`${code}-${index}`}>
                      {professionalBackgroundCompletionMessage(code)}
                    </li>
                  ))
                ) : (
                  <li>Review the required professional background details.</li>
                )}
              </ul>
            )}
          </div>
        </div>

        {completed ? null : (
          <>
            <form action={completionAction} className="mt-5">
              <button
                type="submit"
                disabled={!ready}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-forest-900)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] disabled:cursor-not-allowed disabled:border disabled:border-[var(--color-border)] disabled:bg-[var(--color-mist)] disabled:text-[var(--color-forest-900)]/65"
              >
                <Check className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
                Complete Professional background
              </button>
            </form>
            <ActionMessage state={completionState} />
          </>
        )}
      </div>
    </section>
  );
}

function SectionPanel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-[var(--color-border)] pt-6">
      <h3 className="text-lg font-semibold text-[var(--color-forest-900)]">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
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
  disabled,
  styleName = "primary",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  styleName?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const className =
    styleName === "secondary"
      ? "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)] disabled:cursor-wait disabled:opacity-70"
      : "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-forest-900)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? "Saving..." : children}
    </button>
  );
}

function ActionMessage({
  state,
}: {
  state: { message: string; status: "idle" | "success" | "error" };
}) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`mt-3 text-sm font-medium ${actionStatusClassName(state.status)}`}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

function selectedApproachMap(data: ProfessionalBackgroundData) {
  return new Map(
    data.selectedApproaches.map((approach) => [
      approach.approach_key,
      approach.relationship_key as ApproachRelationshipKey,
    ]),
  );
}

function approachRelationshipLabel(value: ApproachRelationshipKey) {
  return (
    APPROACH_RELATIONSHIPS.find((option) => option.key === value)?.label ??
    "Practice informed by this approach"
  );
}

function trainingStatusLabel(value: string) {
  if (value === "verified") {
    return "Verified by BCMC";
  }

  if (value === "reviewed") {
    return "Reviewed by BCMC";
  }

  return null;
}

function actionStatusClassName(status: "idle" | "success" | "error") {
  if (status === "error") {
    return "text-[#8a3324]";
  }

  if (status === "success") {
    return "text-[var(--color-forest-900)]";
  }

  return "text-[var(--color-stone)]";
}

function formatShortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
