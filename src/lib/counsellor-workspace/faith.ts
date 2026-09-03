import type { FaithPracticeProfileRow } from "./types";

export const INITIATION_NOTE_MAX_LENGTH = 250;
export const ISLAMIC_COUNSELLING_DEFINITION_MAX_LENGTH = 500;

export const DISCUSSION_COMFORT_KEYS = ["yes", "no", "depends"] as const;
export const INITIATION_KEYS = [
  "waits_for_client",
  "may_ask_without_assuming_inclusion",
  "depends",
  "other",
] as const;
export const INTEGRATION_KEYS = ["yes", "no", "depends"] as const;
export const INTEGRATION_MODE_KEYS = [
  "available_on_request",
  "distinct_practice_option",
] as const;

export type DiscussionComfortKey = (typeof DISCUSSION_COMFORT_KEYS)[number];
export type InitiationKey = (typeof INITIATION_KEYS)[number];
export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];
export type IntegrationModeKey = (typeof INTEGRATION_MODE_KEYS)[number];

export type FaithProfileValue = {
  claimsIslamicCounselling: boolean | null;
  discussionComfortKey: DiscussionComfortKey | "";
  initiationKey: InitiationKey | "";
  initiationNote: string;
  integrationKey: IntegrationKey | "";
  integrationModeKey: IntegrationModeKey | "";
  islamicCounsellingDefinition: string;
};

export type FaithProfileFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
  savedStateKey: string;
  values: FaithProfileValue;
};

export function buildFaithProfileInitialState(
  profile: FaithPracticeProfileRow | null,
): FaithProfileFormState {
  const values = normalizeFaithProfileValue({
    claimsIslamicCounselling: profile
      ? profile.claims_islamic_counselling
      : null,
    discussionComfortKey: isDiscussionComfortKey(
      profile?.discussion_comfort_key,
    )
      ? profile.discussion_comfort_key
      : "",
    initiationKey: isInitiationKey(profile?.initiation_key)
      ? profile.initiation_key
      : "",
    initiationNote: profile?.initiation_note ?? "",
    integrationKey: isIntegrationKey(profile?.integration_key)
      ? profile.integration_key
      : "",
    integrationModeKey: isIntegrationModeKey(profile?.integration_mode_key)
      ? profile.integration_mode_key
      : "",
    islamicCounsellingDefinition:
      profile?.islamic_counselling_definition ?? "",
  });

  return {
    status: "idle",
    message: "",
    fieldErrors: {},
    savedStateKey: faithProfileStateKey(values),
    values,
  };
}

export function normalizeFaithProfileValue(
  values: FaithProfileValue,
): FaithProfileValue {
  const discussionComfortKey = isDiscussionComfortKey(
    values.discussionComfortKey,
  )
    ? values.discussionComfortKey
    : "";
  const allowsFaithDetails =
    discussionComfortKey === "yes" || discussionComfortKey === "depends";
  const initiationKey =
    allowsFaithDetails && isInitiationKey(values.initiationKey)
      ? values.initiationKey
      : "";
  const integrationKey =
    allowsFaithDetails && isIntegrationKey(values.integrationKey)
      ? values.integrationKey
      : "";

  return {
    claimsIslamicCounselling:
      typeof values.claimsIslamicCounselling === "boolean"
        ? values.claimsIslamicCounselling
        : null,
    discussionComfortKey,
    initiationKey,
    initiationNote:
      initiationKey === "other" ? values.initiationNote.trim() : "",
    integrationKey,
    integrationModeKey:
      integrationKey === "yes" &&
      isIntegrationModeKey(values.integrationModeKey)
        ? values.integrationModeKey
        : "",
    islamicCounsellingDefinition:
      values.claimsIslamicCounselling === true
        ? values.islamicCounsellingDefinition.trim()
        : "",
  };
}

export function validateFaithProfileValue(values: FaithProfileValue) {
  const normalized = normalizeFaithProfileValue(values);
  const fieldErrors: Record<string, string> = {};

  if (!normalized.discussionComfortKey) {
    fieldErrors.discussionComfortKey = "Choose one answer before continuing.";
  }

  const asksFaithDetails =
    normalized.discussionComfortKey === "yes" ||
    normalized.discussionComfortKey === "depends";

  if (asksFaithDetails && !normalized.initiationKey) {
    fieldErrors.initiationKey = "Choose how this usually enters the conversation.";
  }

  if (normalized.initiationKey === "other" && !normalized.initiationNote) {
    fieldErrors.initiationNote = "Add how this usually enters the conversation.";
  }

  if (normalized.initiationNote.length > INITIATION_NOTE_MAX_LENGTH) {
    fieldErrors.initiationNote = `Keep this to ${INITIATION_NOTE_MAX_LENGTH} characters or fewer.`;
  }

  if (asksFaithDetails && !normalized.integrationKey) {
    fieldErrors.integrationKey =
      "Choose whether a client's faith can intentionally shape the work.";
  }

  if (normalized.integrationKey === "yes" && !normalized.integrationModeKey) {
    fieldErrors.integrationModeKey = "Choose how this is available.";
  }

  if (normalized.claimsIslamicCounselling === null) {
    fieldErrors.claimsIslamicCounselling =
      "Choose whether you describe a service as Islamic counselling.";
  }

  if (
    normalized.claimsIslamicCounselling === true &&
    normalized.discussionComfortKey === "no"
  ) {
    fieldErrors.claimsIslamicCounselling =
      "Because you've said that you describe a service as Islamic counselling, we need to understand how faith can be part of counselling itself.";
  }

  if (
    normalized.claimsIslamicCounselling === true &&
    normalized.integrationKey === "no"
  ) {
    fieldErrors.claimsIslamicCounselling =
      "Because you've said that you describe a service as Islamic counselling, we need to understand how faith can be part of the therapeutic work.";
  }

  if (
    normalized.claimsIslamicCounselling === true &&
    !normalized.islamicCounsellingDefinition
  ) {
    fieldErrors.islamicCounsellingDefinition =
      "Add what you mean by Islamic counselling in your practice.";
  }

  if (
    normalized.islamicCounsellingDefinition.length >
    ISLAMIC_COUNSELLING_DEFINITION_MAX_LENGTH
  ) {
    fieldErrors.islamicCounsellingDefinition = `Keep this to ${ISLAMIC_COUNSELLING_DEFINITION_MAX_LENGTH} characters or fewer.`;
  }

  return fieldErrors;
}

export function faithProfileIsComplete(values: FaithProfileValue) {
  return Object.keys(validateFaithProfileValue(values)).length === 0;
}

export function faithProfileStateKey(values: FaithProfileValue) {
  return JSON.stringify(normalizeFaithProfileValue(values));
}

export function isDiscussionComfortKey(
  value: string | null | undefined,
): value is DiscussionComfortKey {
  return DISCUSSION_COMFORT_KEYS.includes(value as DiscussionComfortKey);
}

export function isInitiationKey(
  value: string | null | undefined,
): value is InitiationKey {
  return INITIATION_KEYS.includes(value as InitiationKey);
}

export function isIntegrationKey(
  value: string | null | undefined,
): value is IntegrationKey {
  return INTEGRATION_KEYS.includes(value as IntegrationKey);
}

export function isIntegrationModeKey(
  value: string | null | undefined,
): value is IntegrationModeKey {
  return INTEGRATION_MODE_KEYS.includes(value as IntegrationModeKey);
}
