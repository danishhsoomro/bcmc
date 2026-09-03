"use client";

import { Check, CircleAlert, CircleCheck, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { completeProfileVoice, saveProfileVoiceSection } from "../actions";
import {
  PROFILE_VOICE_FIRST_MEETING_MAX_LENGTH,
  PROFILE_VOICE_FIRST_MEETING_MIN_LENGTH,
  PROFILE_VOICE_PEOPLE_MAX_LENGTH,
  PROFILE_VOICE_PEOPLE_MIN_LENGTH,
  buildProfileVoiceInitialActionState,
  profileVoiceCompletionMessage,
  type ProfileVoiceActionState,
  type ProfileVoiceCompletion,
  type ProfileVoiceData,
  type ProfileVoiceSourceKind,
  type ProfileVoiceValues,
} from "@/lib/counsellor-workspace/profile-voice";
import type { CounsellorWorkspaceStatus } from "@/lib/counsellor-workspace/types";

type YourProfileFormProps = {
  data: ProfileVoiceData;
  onboardingStatus: CounsellorWorkspaceStatus;
};

export function YourProfileForm({
  data,
  onboardingStatus,
}: YourProfileFormProps) {
  const router = useRouter();
  const initialActionState = buildProfileVoiceInitialActionState(data.intake);
  const [saveState, saveAction] = useActionState(
    saveProfileVoiceSection,
    initialActionState,
  );
  const [completionState, completionAction] = useActionState(
    completeProfileVoice,
    initialActionState,
  );
  const [displayValues, setDisplayValues] = useState<ProfileVoiceValues>(
    initialActionState.values,
  );
  const [editorValues, setEditorValues] = useState<ProfileVoiceValues>(
    initialActionState.values,
  );
  const [editing, setEditing] = useState(
    !data.intake.peopleOftenComeToMeWhen && !data.intake.firstMeetingExpectation,
  );
  const previousSaveRevisionRef = useRef(saveState.savedRevision);
  const previousCompletionStatusRef = useRef(completionState.status);
  const completion = saveState.completion ?? completionState.completion ?? data.completion;
  const requirementItems = [
    ...completion.needs_attention,
    ...completion.missing,
  ];

  useEffect(() => {
    const previousRevision = previousSaveRevisionRef.current;
    previousSaveRevisionRef.current = saveState.savedRevision;

    if (
      saveState.status === "success" &&
      saveState.savedRevision > previousRevision
    ) {
      setDisplayValues(saveState.values);
      setEditorValues(saveState.values);
      setEditing(false);
      router.refresh();
    }
  }, [router, saveState.savedRevision, saveState.status, saveState.values]);

  useEffect(() => {
    const previousStatus = previousCompletionStatusRef.current;
    previousCompletionStatusRef.current = completionState.status;

    if (previousStatus !== "success" && completionState.status === "success") {
      router.refresh();
    }
  }, [completionState.status, router]);

  function openEditor() {
    setEditorValues(displayValues);
    setEditing(true);
  }

  function closeEditor() {
    setEditorValues(displayValues);
    setEditing(false);
  }

  return (
    <div className="mt-8 space-y-8">
      <SourceNote sourceKind={data.intake.sourceKind} />

      {editing ? (
        <ProfileVoiceEditor
          editorValues={editorValues}
          onCancel={
            displayValues.peopleOftenComeToMeWhen ||
            displayValues.firstMeetingExpectation
              ? closeEditor
              : null
          }
          saveAction={saveAction}
          saveState={saveState}
          setEditorValues={setEditorValues}
        />
      ) : (
        <ProfileVoiceReadSummary
          onEdit={openEditor}
          values={displayValues}
        />
      )}

      <CompletionPanel
        completion={completion}
        completionAction={completionAction}
        completionState={completionState}
        onboardingStatus={onboardingStatus}
        requirementItems={requirementItems}
      />
    </div>
  );
}

function SourceNote({ sourceKind }: { sourceKind: ProfileVoiceSourceKind }) {
  if (sourceKind === "approved_source") {
    return (
      <p className="border-l-4 border-[var(--color-champagne)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-stone)]">
        These answers are currently part of your profile. If you make changes,
        we&apos;ll save them as a new draft. Your current profile won&apos;t
        change yet.
      </p>
    );
  }

  if (sourceKind === "editable_draft") {
    return (
      <p className="border-l-4 border-[var(--color-champagne)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-stone)]">
        Your changes are saved as a draft. They won&apos;t affect your current
        profile until the review process is complete.
      </p>
    );
  }

  return null;
}

function ProfileVoiceReadSummary({
  onEdit,
  values,
}: {
  onEdit: () => void;
  values: ProfileVoiceValues;
}) {
  return (
    <section className="space-y-6 border-y border-[var(--color-border)] py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="bcmc-eyebrow text-[var(--color-leaf)]">
            Personal voice
          </p>
          <h3 className="mt-3 font-serif text-2xl leading-tight text-[var(--color-forest-900)]">
            Your profile wording
          </h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
        >
          <Pencil className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
          Edit
        </button>
      </div>

      <ReadBlock title="People often come to me when...">
        {values.peopleOftenComeToMeWhen ? (
          values.peopleOftenComeToMeWhen
        ) : (
          <span className="text-[var(--color-stone)]">
            This required answer has not been added yet.
          </span>
        )}
      </ReadBlock>

      <ReadBlock title="What can someone expect when you first meet?">
        {values.firstMeetingExpectation ? (
          values.firstMeetingExpectation
        ) : (
          <span className="text-[var(--color-stone)]">
            No first-meeting note added.
          </span>
        )}
      </ReadBlock>
    </section>
  );
}

function ProfileVoiceEditor({
  editorValues,
  onCancel,
  saveAction,
  saveState,
  setEditorValues,
}: {
  editorValues: ProfileVoiceValues;
  onCancel: (() => void) | null;
  saveAction: (formData: FormData) => void;
  saveState: ProfileVoiceActionState;
  setEditorValues: React.Dispatch<React.SetStateAction<ProfileVoiceValues>>;
}) {
  return (
    <form action={saveAction} className="space-y-8">
      <WritingPrompt
        count={editorValues.peopleOftenComeToMeWhen.length}
        error={saveState.fieldErrors.peopleOftenComeToMeWhen}
        helper="Help someone recognize the kinds of experiences they might bring to you. Use everyday language rather than a list of diagnoses or profile categories."
        id="peopleOftenComeToMeWhen"
        label="People often come to me when..."
        maxLength={PROFILE_VOICE_PEOPLE_MAX_LENGTH}
        minLength={PROFILE_VOICE_PEOPLE_MIN_LENGTH}
        required
      >
        <textarea
          id="peopleOftenComeToMeWhen"
          name="peopleOftenComeToMeWhen"
          value={editorValues.peopleOftenComeToMeWhen}
          onChange={(event) =>
            setEditorValues((current) => ({
              ...current,
              peopleOftenComeToMeWhen: event.target.value,
            }))
          }
          rows={8}
          className="bcmc-input min-h-44 resize-y"
        />
        <Guidance />
      </WritingPrompt>

      <WritingPrompt
        count={editorValues.firstMeetingExpectation.length}
        error={saveState.fieldErrors.firstMeetingExpectation}
        helper="Describe how you usually begin with a new client. You might mention what they can share, whether they can ask questions, and how you begin working out whether counselling together feels right."
        id="firstMeetingExpectation"
        label="What can someone expect when you first meet?"
        maxLength={PROFILE_VOICE_FIRST_MEETING_MAX_LENGTH}
        minLength={PROFILE_VOICE_FIRST_MEETING_MIN_LENGTH}
        optional
      >
        <textarea
          id="firstMeetingExpectation"
          name="firstMeetingExpectation"
          value={editorValues.firstMeetingExpectation}
          onChange={(event) =>
            setEditorValues((current) => ({
              ...current,
              firstMeetingExpectation: event.target.value,
            }))
          }
          rows={8}
          className="bcmc-input min-h-44 resize-y"
        />
      </WritingPrompt>

      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-center">
        <SubmitButton>Save profile wording</SubmitButton>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
          >
            <X className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
            Cancel
          </button>
        ) : null}
        <ActionMessage state={saveState} />
      </div>
    </form>
  );
}

function WritingPrompt({
  children,
  count,
  error,
  helper,
  id,
  label,
  maxLength,
  minLength,
  optional,
  required,
}: {
  children: React.ReactNode;
  count: number;
  error?: string;
  helper: string;
  id: string;
  label: string;
  maxLength: number;
  minLength: number;
  optional?: boolean;
  required?: boolean;
}) {
  const requirementLabel = optional
    ? `Optional · ${minLength}-${maxLength} characters when answered`
    : `Required · ${minLength}-${maxLength} characters`;
  const countLabel = optional
    ? count > 0
      ? `${count} / ${maxLength} characters`
      : `Optional, ${minLength}-${maxLength} characters if used`
    : `${count} / ${maxLength} characters`;

  return (
    <section className="border-t border-[var(--color-border)] pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-lg font-semibold text-[var(--color-forest-900)]"
        >
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
        <span className="text-xs font-semibold text-[var(--color-stone)]">
          {requirementLabel}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-stone)]">
        {helper}
      </p>
      <div className="mt-4">{children}</div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-stone)]">{countLabel}</p>
        {error ? (
          <p className="text-sm font-medium text-[#8a3324]">{error}</p>
        ) : null}
      </div>
    </section>
  );
}

function Guidance() {
  return (
    <div className="mt-4 grid gap-4 text-sm leading-6 text-[var(--color-stone)] md:grid-cols-2">
      <div>
        <p className="font-semibold text-[var(--color-forest-900)]">
          Focus on
        </p>
        <ul className="mt-1 space-y-1">
          <li>What someone may be experiencing</li>
          <li>What may be bringing them to counselling</li>
          <li>Language a client might actually use</li>
        </ul>
      </div>
      <div>
        <p className="font-semibold text-[var(--color-forest-900)]">
          Avoid
        </p>
        <ul className="mt-1 space-y-1">
          <li>Repeating your concern list</li>
          <li>Promising outcomes</li>
          <li>Adding services or specializations not elsewhere on your profile</li>
        </ul>
      </div>
    </div>
  );
}

function CompletionPanel({
  completion,
  completionAction,
  completionState,
  onboardingStatus,
  requirementItems,
}: {
  completion: ProfileVoiceCompletion;
  completionAction: () => void;
  completionState: ProfileVoiceActionState;
  onboardingStatus: CounsellorWorkspaceStatus;
  requirementItems: ProfileVoiceCompletion["missing"];
}) {
  const completed =
    onboardingStatus === "complete" || completionState.status === "success";
  const ready = completion.complete && !completed;

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
                ? "Your profile complete"
                : ready
                  ? "Ready to finish"
                  : "Still needed"}
            </h3>
            {completed ? (
              <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
                This intake section is marked complete.
              </p>
            ) : ready ? (
              <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
                Everything required for Your profile is saved. Completing this
                section does not publish or approve profile wording.
              </p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--color-stone)]">
                {requirementItems.length > 0 ? (
                  requirementItems.map((item, index) => (
                    <li key={`${item.code ?? "profile-voice"}-${index}`}>
                      {profileVoiceCompletionMessage(item)}
                    </li>
                  ))
                ) : (
                  <li>Review the profile wording before completing this section.</li>
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
                Complete Your profile
              </button>
            </form>
            <ActionMessage state={completionState} />
          </>
        )}
      </div>
    </section>
  );
}

function ReadBlock({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-[var(--color-forest-900)]">
        {title}
      </h4>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--color-ink)]">
        {children}
      </p>
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-forest-900)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] disabled:cursor-wait disabled:opacity-70"
    >
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
      className={`text-sm font-medium ${actionStatusClassName(state.status)}`}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

function actionStatusClassName(status: ProfileVoiceActionState["status"]) {
  if (status === "success") {
    return "text-[var(--color-forest-900)]";
  }

  if (status === "error") {
    return "text-[#8a3324]";
  }

  return "text-[var(--color-stone)]";
}
