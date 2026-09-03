import type { Json } from "../../../supabase/database.types";

export const PROFILE_VOICE_PEOPLE_MIN_LENGTH = 250;
export const PROFILE_VOICE_PEOPLE_MAX_LENGTH = 700;
export const PROFILE_VOICE_FIRST_MEETING_MIN_LENGTH = 250;
export const PROFILE_VOICE_FIRST_MEETING_MAX_LENGTH = 800;

export type ProfileVoiceSourceKind =
  | "editable_draft"
  | "approved_source"
  | "empty";

export type ProfileVoiceCompletionStatus =
  | "complete"
  | "in_progress"
  | "needs_attention";

export type ProfileVoiceRequirementItem = {
  code?: string;
  [key: string]: Json | undefined;
};

export type ProfileVoiceIntake = {
  firstMeetingExpectation: string;
  firstMeetingReviewedAt: string | null;
  moderationStatus: string | null;
  peopleOftenComeToMeWhen: string;
  sourceKind: ProfileVoiceSourceKind;
  version: number | null;
  voiceId: string | null;
};

export type ProfileVoiceCompletion = {
  complete: boolean;
  editableDraftCount: number;
  firstMeetingReviewedAt: string | null;
  missing: ProfileVoiceRequirementItem[];
  needs_attention: ProfileVoiceRequirementItem[];
  status: ProfileVoiceCompletionStatus;
};

export type ProfileVoiceData = {
  completion: ProfileVoiceCompletion;
  intake: ProfileVoiceIntake;
};

export type ProfileVoiceValues = {
  firstMeetingExpectation: string;
  peopleOftenComeToMeWhen: string;
};

export type ProfileVoiceActionState = {
  completion: ProfileVoiceCompletion | null;
  fieldErrors: Partial<Record<keyof ProfileVoiceValues, string>>;
  message: string;
  savedRevision: number;
  status: "idle" | "success" | "error";
  values: ProfileVoiceValues;
};

export function buildProfileVoiceInitialActionState(
  intake: ProfileVoiceIntake,
): ProfileVoiceActionState {
  return {
    completion: null,
    fieldErrors: {},
    message: "",
    savedRevision: 0,
    status: "idle",
    values: {
      firstMeetingExpectation: intake.firstMeetingExpectation,
      peopleOftenComeToMeWhen: intake.peopleOftenComeToMeWhen,
    },
  };
}

export function normalizeProfileVoiceIntake(value: Json): ProfileVoiceIntake {
  const recordValue = isRecord(value) ? value : {};
  const sourceKindValue = stringValue(recordValue.source_kind);

  return {
    firstMeetingExpectation:
      stringValue(recordValue.first_meeting_expectation) ?? "",
    firstMeetingReviewedAt:
      stringValue(recordValue.first_meeting_reviewed_at) ?? null,
    moderationStatus: stringValue(recordValue.moderation_status) ?? null,
    peopleOftenComeToMeWhen:
      stringValue(recordValue.people_often_come_to_me_when) ?? "",
    sourceKind: isProfileVoiceSourceKind(sourceKindValue)
      ? sourceKindValue
      : "empty",
    version: numberValue(recordValue.version),
    voiceId: stringValue(recordValue.voice_id) ?? null,
  };
}

export function normalizeProfileVoiceCompletion(
  value: Json,
): ProfileVoiceCompletion {
  const recordValue = isRecord(value) ? value : {};
  const statusValue = stringValue(recordValue.status);
  const status =
    statusValue === "complete" ||
    statusValue === "needs_attention" ||
    statusValue === "in_progress"
      ? statusValue
      : "in_progress";

  return {
    complete: recordValue.complete === true,
    editableDraftCount: numberValue(recordValue.editable_draft_count) ?? 0,
    firstMeetingReviewedAt:
      stringValue(recordValue.first_meeting_reviewed_at) ?? null,
    missing: completionItems(recordValue.missing),
    needs_attention: completionItems(recordValue.needs_attention),
    status,
  };
}

export function profileVoiceCompletionMessage(
  item: ProfileVoiceRequirementItem,
) {
  switch (item.code) {
    case "people_often_come_to_me_when":
      return "Add 'People often come to me when...'";
    case "first_meeting_review":
    case "first_meeting_reviewed_at":
      return "Review the first-meeting question.";
    default:
      return "Review the saved profile wording before completing this section.";
  }
}

function completionItems(value: Json | undefined): ProfileVoiceRequirementItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) {
      return [{ code: item }];
    }

    return isRecord(item) ? [item] : [];
  });
}

function isProfileVoiceSourceKind(
  value: string | null,
): value is ProfileVoiceSourceKind {
  return (
    value === "editable_draft" ||
    value === "approved_source" ||
    value === "empty"
  );
}

function isRecord(value: unknown): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
