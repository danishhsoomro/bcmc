"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCounsellorWorkspace,
  updateOnboardingSectionStatus,
} from "@/lib/counsellor-workspace/server";
import {
  whoYouWorkWithStateKey,
  type WhoYouWorkWithFormState,
} from "@/lib/counsellor-workspace/who-you-work-with";
import {
  isConcernEmphasisKey,
  whatYouHelpWithStateKey,
  type WhatYouHelpWithFormState,
} from "@/lib/counsellor-workspace/what-you-help-with";
import {
  culturalFamiliarityStateKey,
  normalizeCulturalFamiliarityValue,
  validateCulturalFamiliarityValue,
  type CulturalFamiliarityFormState,
} from "@/lib/counsellor-workspace/cultural-familiarity";
import {
  emptyPracticalActionState,
  normalizeCompletion,
  type PracticalActionState,
} from "@/lib/counsellor-workspace/practical-details";
import {
  faithProfileStateKey,
  isDiscussionComfortKey,
  isInitiationKey,
  isIntegrationKey,
  isIntegrationModeKey,
  normalizeFaithProfileValue,
  validateFaithProfileValue,
  type FaithProfileFormState,
} from "@/lib/counsellor-workspace/faith";
import {
  emptyContactEnquiriesActionState,
  handoffKeyForContactRoute,
  isContactRouteTypeKey,
  normalizeContactEnquiriesCompletion,
  type ContactEnquiriesActionState,
  type ContactManagementKey,
} from "@/lib/counsellor-workspace/contact-enquiries";
import {
  emptyProfessionalBackgroundActionState,
  isApproachRelationshipKey,
  normalizeProfessionalBackgroundCompletion,
  type ProfessionalBackgroundActionState,
} from "@/lib/counsellor-workspace/professional-background";
import {
  PROFILE_VOICE_FIRST_MEETING_MAX_LENGTH,
  PROFILE_VOICE_FIRST_MEETING_MIN_LENGTH,
  PROFILE_VOICE_PEOPLE_MAX_LENGTH,
  PROFILE_VOICE_PEOPLE_MIN_LENGTH,
  normalizeProfileVoiceCompletion,
  type ProfileVoiceActionState,
} from "@/lib/counsellor-workspace/profile-voice";
import {
  CLARIFICATION_NOTE_MAX_LENGTH,
  howYouWorkStateKey,
  isVariesOption,
  normalizeWorkingStyleAnswers,
  OTHER_CONTEXT_KEY,
  WORKING_STYLE_QUESTIONNAIRE_VERSION,
  type WorkingStyleAnswerValue,
  type WorkingStyleFormState,
} from "@/lib/counsellor-workspace/how-you-work";
import { getNextSection } from "@/lib/counsellor-workspace/sections";
import type {
  CounsellorAccount,
  IntakeSupabaseClient,
} from "@/lib/counsellor-workspace/types";
import type { Database, Json } from "../../../../supabase/database.types";

type SaveServiceDeclarationsPayload =
  Database["public"]["Functions"]["save_my_counsellor_service_declarations"]["Args"]["p_payload"];
type SavePracticeAreasPayload =
  Database["public"]["Functions"]["save_my_counsellor_practice_areas"]["Args"]["p_payload"];
type SaveWorkingStyleResponsesPayload =
  Database["public"]["Functions"]["save_my_counsellor_working_style_responses"]["Args"]["p_payload"];
type SaveFaithProfilePayload =
  Database["public"]["Functions"]["save_my_counsellor_faith_profile"]["Args"]["p_payload"];
type SaveCulturalFamiliarityPayload =
  Database["public"]["Functions"]["save_my_counsellor_cultural_familiarity"]["Args"]["p_payload"];
type SavePracticalServiceConfigurationsPayload =
  Database["public"]["Functions"]["save_my_practical_service_configurations"]["Args"]["p_payload"];
type UpsertServiceLocationPayload =
  Database["public"]["Functions"]["upsert_my_service_location"]["Args"]["p_payload"];
type SaveServiceFeePoliciesPayload =
  Database["public"]["Functions"]["save_my_service_fee_policies"]["Args"]["p_payload"];
type SaveConsultationPreferencesPayload =
  Database["public"]["Functions"]["save_my_consultation_preferences"]["Args"]["p_payload"];
type SaveAvailabilityPayload =
  Database["public"]["Functions"]["save_my_availability"]["Args"]["p_payload"];
type SaveLocationAccessibilityPayload =
  Database["public"]["Functions"]["save_my_location_accessibility"]["Args"]["p_payload"];
type SaveContactEnquiriesPayload =
  Database["public"]["Functions"]["save_my_contact_enquiries"]["Args"]["p_payload"];
type SaveProfessionalEducationPayload =
  Database["public"]["Functions"]["save_my_professional_education"]["Args"]["p_payload"];
type SaveProfessionalExperiencePayload =
  Database["public"]["Functions"]["save_my_professional_experience"]["Args"]["p_payload"];
type SaveTherapeuticApproachesPayload =
  Database["public"]["Functions"]["save_my_therapeutic_approaches"]["Args"]["p_payload"];
type SaveProfileVoicePayload = {
  first_meeting_expectation: string | null;
  people_often_come_to_me_when: string;
};

type ProfileVoiceRpcClient = {
  rpc(
    functionName: "save_my_profile_voice_intake",
    args: { p_payload: SaveProfileVoicePayload },
  ): Promise<{ data: Json; error: { message: string } | null }>;
  rpc(
    functionName: "get_my_profile_voice_completion",
  ): Promise<{ data: Json; error: { message: string } | null }>;
  rpc(
    functionName: "complete_my_profile_voice",
  ): Promise<{ data: Json; error: { message: string } | null }>;
};

function getProfileVoiceRpcClient(supabase: IntakeSupabaseClient) {
  return supabase as unknown as ProfileVoiceRpcClient;
}

const GENDER_KEYS = [
  "woman",
  "man",
  "nonbinary",
  "self_described",
  "prefer_not_to_say",
] as const;

type GenderKey = (typeof GENDER_KEYS)[number];

const CLIENT_GENDER_SCOPE_KEYS = [
  "not_specified",
  "all_genders",
  "women_only",
  "men_only",
  "other",
] as const;

type ClientGenderScopeKey = (typeof CLIENT_GENDER_SCOPE_KEYS)[number];

const SLIDING_SCALE_KEYS = [
  "available",
  "limited",
  "currently_full",
  "not_offered",
  "ask",
] as const;

const DIRECT_BILLING_KEYS = ["yes", "no", "ask"] as const;

const CONSULTATION_MODE_KEYS = ["phone", "video", "phone_or_video"] as const;

const AVAILABILITY_STATUS_KEYS = [
  "accepting",
  "limited",
  "waitlist",
  "not_accepting",
] as const;

const CONTACT_MANAGEMENT_KEYS = ["practice", "self"] as const;

export type PracticeFormState = {
  status: "idle" | "success" | "error";
  message: string;
  values: {
    displayName: string;
    preferredName: string;
    pronouns: string;
    genderKey: string;
    genderSelfDescription: string;
  };
  fieldErrors: Partial<Record<keyof PracticeFormState["values"], string>>;
};

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveProfileVoiceSection(
  previousState: ProfileVoiceActionState,
  formData: FormData,
): Promise<ProfileVoiceActionState> {
  const values = {
    firstMeetingExpectation: textValue(formData, "firstMeetingExpectation"),
    peopleOftenComeToMeWhen: textValue(formData, "peopleOftenComeToMeWhen"),
  };
  const fieldErrors: ProfileVoiceActionState["fieldErrors"] = {};

  if (!values.peopleOftenComeToMeWhen) {
    fieldErrors.peopleOftenComeToMeWhen =
      "Add 'People often come to me when...' before saving.";
  } else if (
    values.peopleOftenComeToMeWhen.length <
      PROFILE_VOICE_PEOPLE_MIN_LENGTH ||
    values.peopleOftenComeToMeWhen.length > PROFILE_VOICE_PEOPLE_MAX_LENGTH
  ) {
    fieldErrors.peopleOftenComeToMeWhen = `Use ${PROFILE_VOICE_PEOPLE_MIN_LENGTH}-${PROFILE_VOICE_PEOPLE_MAX_LENGTH} characters.`;
  }

  if (
    values.firstMeetingExpectation &&
    (values.firstMeetingExpectation.length <
      PROFILE_VOICE_FIRST_MEETING_MIN_LENGTH ||
      values.firstMeetingExpectation.length >
        PROFILE_VOICE_FIRST_MEETING_MAX_LENGTH)
  ) {
    fieldErrors.firstMeetingExpectation = `Use ${PROFILE_VOICE_FIRST_MEETING_MIN_LENGTH}-${PROFILE_VOICE_FIRST_MEETING_MAX_LENGTH} characters, or leave this blank.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      completion: previousState.completion,
      fieldErrors,
      message: "Please fix the highlighted fields. Nothing was saved yet.",
      savedRevision: previousState.savedRevision,
      status: "error",
      values,
    };
  }

  const workspace = await getSingleWorkspaceForProfileVoiceAction(values);

  if (workspace.status === "error") {
    return workspace.state;
  }

  const payload: SaveProfileVoicePayload = {
    first_meeting_expectation: values.firstMeetingExpectation || null,
    people_often_come_to_me_when: values.peopleOftenComeToMeWhen,
  };
  const profileVoiceClient = getProfileVoiceRpcClient(workspace.supabase);
  const { error } = await profileVoiceClient.rpc(
    "save_my_profile_voice_intake",
    {
      p_payload: payload,
    },
  );

  if (error) {
    return profileVoiceRpcError(values, "profile wording", error.message);
  }

  const completionResult = await profileVoiceClient.rpc(
    "get_my_profile_voice_completion",
  );

  revalidateProfileVoice();

  if (completionResult.error) {
    return {
      completion: previousState.completion,
      fieldErrors: {},
      message:
        "Saved, but we could not refresh the completion check just now. Please reload this page before completing the section.",
      savedRevision: previousState.savedRevision + 1,
      status: "success",
      values,
    };
  }

  return {
    completion: normalizeProfileVoiceCompletion(completionResult.data),
    fieldErrors: {},
    message: "Saved.",
    savedRevision: previousState.savedRevision + 1,
    status: "success",
    values,
  };
}

export async function completeProfileVoice(
  previousState: ProfileVoiceActionState,
): Promise<ProfileVoiceActionState> {
  const workspace = await getSingleWorkspaceForProfileVoiceAction(
    previousState.values,
  );

  if (workspace.status === "error") {
    return workspace.state;
  }

  const profileVoiceClient = getProfileVoiceRpcClient(workspace.supabase);
  const { error } = await profileVoiceClient.rpc("complete_my_profile_voice");

  if (error) {
    return profileVoiceRpcError(
      previousState.values,
      "profile completion",
      error.message,
    );
  }

  const completionResult = await profileVoiceClient.rpc(
    "get_my_profile_voice_completion",
  );

  if (completionResult.error) {
    return profileVoiceRpcError(
      previousState.values,
      "profile completion check",
      completionResult.error.message,
    );
  }

  const completion = normalizeProfileVoiceCompletion(completionResult.data);
  revalidateProfileVoice();

  if (completion.complete) {
    return {
      completion,
      fieldErrors: {},
      message: "Your profile section is complete.",
      savedRevision: previousState.savedRevision,
      status: "success",
      values: previousState.values,
    };
  }

  return {
    completion,
    fieldErrors: {},
    message:
      completion.status === "needs_attention"
        ? "Some saved profile wording needs BCMC review before this section can be completed."
        : "There are still a few details to finish before this section can be completed.",
    savedRevision: previousState.savedRevision,
    status: "error",
    values: previousState.values,
  };
}

function isGenderKey(value: string): value is GenderKey {
  return GENDER_KEYS.includes(value as GenderKey);
}

function isClientGenderScopeKey(value: string): value is ClientGenderScopeKey {
  return CLIENT_GENDER_SCOPE_KEYS.includes(value as ClientGenderScopeKey);
}

function practiceIsComplete(values: PracticeFormState["values"]) {
  return Boolean(values.displayName && isGenderKey(values.genderKey));
}

function isOneOf<T extends readonly string[]>(value: string, keys: T): value is T[number] {
  return keys.includes(value);
}

export async function savePracticeSection(
  previousState: PracticeFormState,
  formData: FormData,
): Promise<PracticeFormState> {
  const values = {
    displayName: textValue(formData, "displayName"),
    preferredName: textValue(formData, "preferredName"),
    pronouns: textValue(formData, "pronouns"),
    genderKey: textValue(formData, "genderKey"),
    genderSelfDescription: textValue(formData, "genderSelfDescription"),
  };

  const fieldErrors: PracticeFormState["fieldErrors"] = {};

  if (!values.displayName) {
    fieldErrors.displayName = "Enter the public name shown on your profile.";
  }

  if (!values.genderKey || !isGenderKey(values.genderKey)) {
    fieldErrors.genderKey = "Choose one of the available gender options.";
  }

  if (
    values.genderKey === "self_described" &&
    !values.genderSelfDescription
  ) {
    fieldErrors.genderSelfDescription =
      "Add the wording you would like BCMC to use.";
  }

  if (
    values.genderSelfDescription &&
    values.genderSelfDescription.length > 120
  ) {
    fieldErrors.genderSelfDescription =
      "Keep the self-description to 120 characters or fewer.";
  }

  if (
    values.genderKey !== "self_described" &&
    values.genderSelfDescription
  ) {
    fieldErrors.genderSelfDescription =
      "Self-description is only used with the self-described option.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields. Nothing was saved yet.",
      values,
      fieldErrors,
    };
  }

  const workspace = await getCounsellorWorkspace();

  if (workspace.kind === "unlinked") {
    return {
      status: "error",
      message: "This account is not connected to a BCMC counsellor profile.",
      values,
      fieldErrors: {},
    };
  }

  if (workspace.kind === "multiple") {
    return {
      status: "error",
      message:
        "This account is connected to more than one profile. Profile selection is required before saving.",
      values,
      fieldErrors: {},
    };
  }

  const { error } = await workspace.supabase
    .from("counsellors")
    .update({
      display_name: values.displayName,
      preferred_name: values.preferredName || null,
      pronouns: values.pronouns || null,
      gender_key: values.genderKey,
      gender_self_description:
        values.genderKey === "self_described"
          ? values.genderSelfDescription
          : null,
    })
    .eq("id", workspace.counsellor.counsellor_id);

  if (error) {
    return {
      status: "error",
      message: `Unable to save your practice details: ${error.message}`,
      values,
      fieldErrors: {},
    };
  }

  const onboardingError = await updateOnboardingSectionStatus(
    workspace.supabase,
    "practice",
    practiceIsComplete(values) ? "complete" : "in_progress",
  );

  revalidatePath("/for-counsellors/profile");
  revalidatePath("/for-counsellors/profile/practice");

  if (!onboardingError && formData.get("intent") === "continue") {
    redirect("/for-counsellors/profile/who-you-work-with");
  }

  return {
    status: onboardingError ? "error" : "success",
    message: onboardingError
      ? `Your profile facts were saved, but progress state was not updated: ${onboardingError}`
      : "Saved.",
    values,
    fieldErrors: {},
  };
}

export async function saveWhoYouWorkWithSection(
  previousState: WhoYouWorkWithFormState,
  formData: FormData,
): Promise<WhoYouWorkWithFormState> {
  const workspace = await getCounsellorWorkspace();

  if (workspace.kind === "unlinked") {
    return {
      status: "error",
      message: "This account is not connected to a BCMC counsellor profile.",
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  if (workspace.kind === "multiple") {
    return {
      status: "error",
      message:
        "This account is connected to more than one profile. Profile selection is required before saving.",
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  const [serviceTypesResult, clientGroupsResult] = await Promise.all([
    workspace.supabase
      .from("service_types")
      .select("key")
      .eq("active", true),
    workspace.supabase
      .from("client_groups")
      .select("key")
      .eq("active", true),
  ]);

  if (serviceTypesResult.error) {
    return {
      status: "error",
      message: `Unable to validate service types: ${serviceTypesResult.error.message}`,
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  if (clientGroupsResult.error) {
    return {
      status: "error",
      message: `Unable to validate client groups: ${clientGroupsResult.error.message}`,
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  const activeServiceTypeKeys = new Set(
    (serviceTypesResult.data ?? []).map((row) => row.key),
  );
  const activeClientGroupKeys = new Set(
    (clientGroupsResult.data ?? []).map((row) => row.key),
  );
  const selectedServiceTypeKeys = uniqueStringValues(
    formData.getAll("serviceTypeKey"),
  );
  const fieldErrors: Record<string, string> = {};

  if (selectedServiceTypeKeys.length === 0) {
    fieldErrors.serviceTypeKey =
      "Choose at least one kind of counselling you provide.";
  }

  const declarations = selectedServiceTypeKeys.map((serviceTypeKey) => {
    const clientGroupKeys = uniqueStringValues(
      formData.getAll(`clientGroups:${serviceTypeKey}`),
    );
    const clientGenderScopeKey = textValue(
      formData,
      `clientGenderScope:${serviceTypeKey}`,
    );
    const clientGenderScopeNote = textValue(
      formData,
      `clientGenderScopeNote:${serviceTypeKey}`,
    );

    if (!activeServiceTypeKeys.has(serviceTypeKey)) {
      fieldErrors.serviceTypeKey =
        "Choose only currently available counselling types.";
    }

    if (clientGroupKeys.length === 0) {
      fieldErrors[`clientGroups:${serviceTypeKey}`] =
        "Choose at least one client group for this service.";
    }

    if (
      clientGroupKeys.some(
        (clientGroupKey) => !activeClientGroupKeys.has(clientGroupKey),
      )
    ) {
      fieldErrors[`clientGroups:${serviceTypeKey}`] =
        "Choose only currently available client groups.";
    }

    if (!isClientGenderScopeKey(clientGenderScopeKey)) {
      fieldErrors[`clientGenderScope:${serviceTypeKey}`] =
        "Choose one of the available gender eligibility options.";
    }

    if (clientGenderScopeKey === "other" && !clientGenderScopeNote) {
      fieldErrors[`clientGenderScopeNote:${serviceTypeKey}`] =
        "Add a brief note for another eligibility arrangement.";
    }

    if (clientGenderScopeNote.length > 180) {
      fieldErrors[`clientGenderScopeNote:${serviceTypeKey}`] =
        "Keep the eligibility note to 180 characters or fewer.";
    }

    return {
      serviceTypeKey,
      clientGroupKeys,
      clientGenderScopeKey,
      clientGenderScopeNote,
    };
  });

  const values = {
    declarations,
  };

  if (Object.keys(fieldErrors).length > 0) {
    await updateOnboardingSectionStatus(
      workspace.supabase,
      "who_you_work_with",
      "needs_attention",
    );

    return {
      status: "error",
      message: "Please fix the highlighted fields. Nothing was saved yet.",
      savedStateKey: previousState.savedStateKey,
      values,
      fieldErrors,
    };
  }

  const payload: SaveServiceDeclarationsPayload = {
    declarations: declarations.map((declaration) => ({
      service_type_key: declaration.serviceTypeKey,
      client_group_keys: declaration.clientGroupKeys,
      client_gender_scope_key: declaration.clientGenderScopeKey,
      client_gender_scope_note:
        declaration.clientGenderScopeKey === "other"
          ? declaration.clientGenderScopeNote
          : null,
    })),
  };

  const { error } = await workspace.supabase.rpc(
    "save_my_counsellor_service_declarations",
    {
      p_payload: payload,
    },
  );

  if (error) {
    console.error("Unable to save counsellor service declarations", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      status: "error",
      message:
        "We could not save this section just now. Please try again, and contact BCMC if it keeps happening.",
      savedStateKey: previousState.savedStateKey,
      values,
      fieldErrors: {},
    };
  }

  revalidatePath("/for-counsellors/profile");
  revalidatePath("/for-counsellors/profile/who-you-work-with");

  if (formData.get("intent") === "continue") {
    redirect("/for-counsellors/profile/what-you-help-with");
  }

  return {
    status: "success",
    message: "Saved.",
    savedStateKey: whoYouWorkWithStateKey(values.declarations),
    values,
    fieldErrors: {},
  };
}

export async function saveWhatYouHelpWithSection(
  previousState: WhatYouHelpWithFormState,
  formData: FormData,
): Promise<WhatYouHelpWithFormState> {
  const workspace = await getCounsellorWorkspace();

  if (workspace.kind === "unlinked") {
    return {
      status: "error",
      message: "This account is not connected to a BCMC counsellor profile.",
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  if (workspace.kind === "multiple") {
    return {
      status: "error",
      message:
        "This account is connected to more than one profile. Profile selection is required before saving.",
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  const { data: taxonomyRows, error: taxonomyError } = await workspace.supabase
    .from("practice_area_taxonomy")
    .select("key")
    .eq("active", true);

  if (taxonomyError) {
    return {
      status: "error",
      message: `Unable to validate concern options: ${taxonomyError.message}`,
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  const activeKeys = new Set((taxonomyRows ?? []).map((row) => row.key));
  const values = parseWhatYouHelpWithFormValues(formData);
  const fieldErrors = validateWhatYouHelpWithValues(values, activeKeys);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields. Nothing was saved yet.",
      savedStateKey: previousState.savedStateKey,
      values: {
        practiceAreas: values,
      },
      fieldErrors,
    };
  }

  const payload: SavePracticeAreasPayload = {
    practice_areas: values.map((value) => ({
      practice_area_key: value.practiceAreaKey,
      emphasis_key: value.emphasisKey,
    })),
  } satisfies Json;

  const { error } = await workspace.supabase.rpc(
    "save_my_counsellor_practice_areas",
    {
      p_payload: payload,
    },
  );

  if (error) {
    console.error("Unable to save counsellor concerns", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      status: "error",
      message:
        "We could not save this section just now. Please try again, and contact BCMC if it keeps happening.",
      savedStateKey: previousState.savedStateKey,
      values: {
        practiceAreas: values,
      },
      fieldErrors: {},
    };
  }

  const normalizedValues = values.sort((a, b) => {
    if (a.emphasisKey !== b.emphasisKey) {
      return a.emphasisKey === "primary" ? -1 : 1;
    }

    return a.practiceAreaKey.localeCompare(b.practiceAreaKey);
  });

  revalidatePath("/for-counsellors/profile");
  revalidatePath("/for-counsellors/profile/what-you-help-with");
  revalidatePath(`/counsellors/${workspace.counsellor.slug}`);
  revalidatePath("/find");

  if (formData.get("intent") === "continue") {
    redirect("/for-counsellors/profile/how-you-work");
  }

  return {
    status: "success",
    message: "Saved.",
    savedStateKey: whatYouHelpWithStateKey(normalizedValues),
    values: {
      practiceAreas: normalizedValues,
    },
    fieldErrors: {},
  };
}

export async function saveHowYouWorkSection(
  previousState: WorkingStyleFormState,
  formData: FormData,
): Promise<WorkingStyleFormState> {
  const workspace = await getCounsellorWorkspace();

  if (workspace.kind === "unlinked") {
    return {
      status: "error",
      message: "This account is not connected to a BCMC counsellor profile.",
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  if (workspace.kind === "multiple") {
    return {
      status: "error",
      message:
        "This account is connected to more than one profile. Profile selection is required before saving.",
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  const [questionsResult, optionsResult, contextReasonsResult] =
    await Promise.all([
      workspace.supabase
        .from("working_style_questions")
        .select(
          "key, construct_key, questionnaire_version, prompt_text, help_text, service_type_key, allows_varies, research_status_key, active, sort_order, created_at",
        )
        .eq("questionnaire_version", WORKING_STYLE_QUESTIONNAIRE_VERSION)
        .eq("active", true)
        .neq("research_status_key", "deprecated")
        .is("service_type_key", null),
      workspace.supabase
        .from("working_style_question_options")
        .select(
          "question_key, option_key, counsellor_label, ordinal_position, is_varies, active, sort_order, created_at",
        )
        .eq("active", true),
      workspace.supabase
        .from("working_style_context_reasons")
        .select("key, label, active, sort_order, created_at")
        .eq("active", true),
    ]);

  if (questionsResult.error) {
    return {
      status: "error",
      message: `Unable to validate working style questions: ${questionsResult.error.message}`,
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  if (optionsResult.error) {
    return {
      status: "error",
      message: `Unable to validate working style options: ${optionsResult.error.message}`,
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  if (contextReasonsResult.error) {
    return {
      status: "error",
      message: `Unable to validate working style context reasons: ${contextReasonsResult.error.message}`,
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  const values = parseHowYouWorkFormValues(formData);
  const fieldErrors = validateHowYouWorkValues({
    contextReasons: contextReasonsResult.data ?? [],
    options: optionsResult.data ?? [],
    questions: questionsResult.data ?? [],
    values,
  });

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields. Nothing was saved yet.",
      savedStateKey: previousState.savedStateKey,
      values: {
        responses: values,
      },
      fieldErrors,
    };
  }

  const options = optionsResult.data ?? [];
  const normalizedValues = normalizeWorkingStyleAnswers(
    values.map((value) => {
      const shouldKeepNote = value.contextKeys.includes(OTHER_CONTEXT_KEY);
      const shouldKeepContexts = isVariesOption(
        value.questionKey,
        value.optionKey,
        options,
      );

      return {
        ...value,
        contextKeys: shouldKeepContexts ? value.contextKeys : [],
        clarificationNote: shouldKeepNote ? value.clarificationNote : "",
      };
    }),
  );
  const payload: SaveWorkingStyleResponsesPayload = {
    questionnaire_version: WORKING_STYLE_QUESTIONNAIRE_VERSION,
    responses: normalizedValues.map((value) => ({
      question_key: value.questionKey,
      option_key: value.optionKey,
      context_keys: value.contextKeys,
      clarification_note: value.contextKeys.includes(OTHER_CONTEXT_KEY)
        ? value.clarificationNote
        : null,
    })),
  } satisfies Json;

  const { error } = await workspace.supabase.rpc(
    "save_my_counsellor_working_style_responses",
    {
      p_payload: payload,
    },
  );

  if (error) {
    console.error("Unable to save counsellor working style responses", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      status: "error",
      message:
        "We could not save this section just now. Please try again, and contact BCMC if it keeps happening.",
      savedStateKey: previousState.savedStateKey,
      values: {
        responses: values,
      },
      fieldErrors: {},
    };
  }

  revalidatePath("/for-counsellors/profile");
  revalidatePath("/for-counsellors/profile/how-you-work");

  if (formData.get("intent") === "exit") {
    redirect("/for-counsellors/profile");
  }

  if (formData.get("intent") === "continue") {
    const nextSection = getNextSection("how_you_work");

    if (nextSection) {
      redirect(nextSection.href);
    }
  }

  return {
    status: "success",
    message: "Saved.",
    savedStateKey: howYouWorkStateKey(normalizedValues),
    values: {
      responses: normalizedValues,
    },
    fieldErrors: {},
  };
}

export async function saveFaithSection(
  previousState: FaithProfileFormState,
  formData: FormData,
): Promise<FaithProfileFormState> {
  const workspace = await getCounsellorWorkspace();

  if (workspace.kind === "unlinked") {
    return {
      status: "error",
      message: "This account is not connected to a BCMC counsellor profile.",
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  if (workspace.kind === "multiple") {
    return {
      status: "error",
      message:
        "This account is connected to more than one profile. Profile selection is required before saving.",
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  const values = normalizeFaithProfileValue(parseFaithFormValues(formData));
  const fieldErrors = validateFaithProfileValue(values);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted answers. Nothing was saved yet.",
      savedStateKey: previousState.savedStateKey,
      values,
      fieldErrors,
    };
  }

  const payload: SaveFaithProfilePayload = {
    discussion_comfort_key: values.discussionComfortKey,
    initiation_key: values.initiationKey || null,
    initiation_note:
      values.initiationKey === "other" ? values.initiationNote : null,
    integration_key: values.integrationKey || null,
    integration_mode_key:
      values.integrationKey === "yes" ? values.integrationModeKey : null,
    claims_islamic_counselling: values.claimsIslamicCounselling === true,
    islamic_counselling_definition:
      values.claimsIslamicCounselling === true
        ? values.islamicCounsellingDefinition
        : null,
  } satisfies Json;

  const { error } = await workspace.supabase.rpc(
    "save_my_counsellor_faith_profile",
    {
      p_payload: payload,
    },
  );

  if (error) {
    console.error("Unable to save counsellor faith profile", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      status: "error",
      message:
        "We could not save this section just now. Please try again, and contact BCMC if it keeps happening.",
      savedStateKey: previousState.savedStateKey,
      values,
      fieldErrors: {},
    };
  }

  revalidatePath("/for-counsellors/profile");
  revalidatePath("/for-counsellors/profile/faith");

  if (formData.get("intent") === "continue") {
    const nextSection = getNextSection("faith");

    if (nextSection) {
      redirect(nextSection.href);
    }
  }

  return {
    status: "success",
    message: "Saved.",
    savedStateKey: faithProfileStateKey(values),
    values,
    fieldErrors: {},
  };
}

export async function saveCulturalFamiliaritySection(
  previousState: CulturalFamiliarityFormState,
  formData: FormData,
): Promise<CulturalFamiliarityFormState> {
  const workspace = await getCounsellorWorkspace();

  if (workspace.kind === "unlinked") {
    return {
      status: "error",
      message: "This account is not connected to a BCMC counsellor profile.",
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  if (workspace.kind === "multiple") {
    return {
      status: "error",
      message:
        "This account is connected to more than one profile. Profile selection is required before saving.",
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  const { data: taxonomyRows, error: taxonomyError } = await workspace.supabase
    .from("cultural_familiarity_taxonomy")
    .select("key")
    .eq("active", true);

  if (taxonomyError) {
    return {
      status: "error",
      message: `Unable to validate cultural familiarity options: ${taxonomyError.message}`,
      savedStateKey: previousState.savedStateKey,
      values: previousState.values,
      fieldErrors: {},
    };
  }

  const activeKeys = new Set((taxonomyRows ?? []).map((row) => row.key));
  const values = normalizeCulturalFamiliarityValue({
    selectedKeys: uniqueStringValues(formData.getAll("familiarityKey")),
    explicitlyNoHighlights:
      textValue(formData, "explicitlyNoHighlights") === "true",
  });
  const fieldErrors = validateCulturalFamiliarityValue(values, activeKeys);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted answer. Nothing was saved yet.",
      savedStateKey: previousState.savedStateKey,
      values,
      fieldErrors,
    };
  }

  const payload: SaveCulturalFamiliarityPayload = {
    familiarity_keys: values.selectedKeys,
  } satisfies Json;

  const { error } = await workspace.supabase.rpc(
    "save_my_counsellor_cultural_familiarity",
    {
      p_payload: payload,
    },
  );

  if (error) {
    console.error("Unable to save counsellor cultural familiarity", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      status: "error",
      message:
        "We could not save this section just now. Please try again, and contact BCMC if it keeps happening.",
      savedStateKey: previousState.savedStateKey,
      values,
      fieldErrors: {},
    };
  }

  if (formData.get("intent") === "continue") {
    const nextSection = getNextSection("cultural_familiarity");

    if (nextSection) {
      revalidatePath("/for-counsellors/profile");
      revalidatePath("/for-counsellors/profile/cultural-familiarity");
      redirect(nextSection.href);
    }
  }

  return {
    status: "success",
    message: "Saved.",
    savedStateKey: culturalFamiliarityStateKey(values),
    values,
    fieldErrors: {},
  };
}

export async function savePracticalServiceConfigurations(
  _previousState: PracticalActionState,
  formData: FormData,
): Promise<PracticalActionState> {
  const workspace = await getSingleWorkspaceForPracticalAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const declarationKeys = uniqueStringValues(formData.getAll("serviceTypeKey"));
  const fieldErrors: Record<string, string> = {};
  const configurations = declarationKeys.flatMap((serviceTypeKey) => {
    const rows: {
      delivery_mode_key: "in_person" | "virtual";
      location_id?: string;
      practice_id?: string | null;
      region_keys?: string[];
      service_type_key: string;
    }[] = [];
    const offersInPerson =
      textValue(formData, `inPerson:${serviceTypeKey}`) === "true";
    const offersVirtual =
      textValue(formData, `virtual:${serviceTypeKey}`) === "true";

    if (!offersInPerson && !offersVirtual) {
      fieldErrors[`service:${serviceTypeKey}`] =
        "Choose in person, online, or both.";
    }

    if (offersInPerson) {
      const locationId = textValue(formData, `location:${serviceTypeKey}`);

      if (!locationId) {
        fieldErrors[`location:${serviceTypeKey}`] =
          "Choose a saved location for this in-person service.";
      }

      rows.push({
        delivery_mode_key: "in_person",
        location_id: locationId,
        service_type_key: serviceTypeKey,
      });
    }

    if (offersVirtual) {
      const practiceId = textValue(formData, `virtualPractice:${serviceTypeKey}`);

      rows.push({
        delivery_mode_key: "virtual",
        practice_id: practiceId || null,
        region_keys: ["bc"],
        service_type_key: serviceTypeKey,
      });
    }

    return rows;
  });

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "Please fix the highlighted service details. Nothing was saved yet.",
      status: "error",
    };
  }

  const payload: SavePracticalServiceConfigurationsPayload = {
    configurations,
  } satisfies Json;
  const { error } = await workspace.supabase.rpc(
    "save_my_practical_service_configurations",
    { p_payload: payload },
  );

  if (error) {
    return practicalRpcError("service configuration", error.message);
  }

  revalidatePracticalDetails(workspace.counsellor.slug);

  return {
    ...emptyPracticalActionState,
    message: "Service options saved.",
    status: "success",
  };
}

export async function savePracticalLocation(
  _previousState: PracticalActionState,
  formData: FormData,
): Promise<PracticalActionState> {
  const workspace = await getSingleWorkspaceForPracticalAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const locationId = textValue(formData, "locationId");
  const city = textValue(formData, "city");
  const neighbourhoodOrArea = textValue(formData, "neighbourhoodOrArea");
  const practiceId = textValue(formData, "practiceId");
  const fieldErrors: Record<string, string> = {};

  if (!city) {
    fieldErrors.city = "Enter the city for this location.";
  }

  if (city.length > 120) {
    fieldErrors.city = "Keep the city to 120 characters or fewer.";
  }

  if (neighbourhoodOrArea.length > 160) {
    fieldErrors.neighbourhoodOrArea =
      "Keep the area or neighbourhood to 160 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "Please fix the highlighted location details.",
      status: "error",
    };
  }

  const payload: UpsertServiceLocationPayload = {
    city,
    location_id: locationId || undefined,
    neighbourhood_or_area: neighbourhoodOrArea || undefined,
    practice_id: practiceId || undefined,
  } satisfies Json;
  const { error } = await workspace.supabase.rpc("upsert_my_service_location", {
    p_payload: payload,
  });

  if (error) {
    return practicalRpcError("location", error.message);
  }

  revalidatePracticalDetails(workspace.counsellor.slug);

  return {
    ...emptyPracticalActionState,
    message: "Location saved.",
    status: "success",
  };
}

export async function savePracticalFeePolicies(
  _previousState: PracticalActionState,
  formData: FormData,
): Promise<PracticalActionState> {
  const workspace = await getSingleWorkspaceForPracticalAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const offeringIds = uniqueStringValues(formData.getAll("offeringId"));
  const fieldErrors: Record<string, string> = {};
  const feePolicies = offeringIds.map((offeringId) => {
    const feeCents = dollarsToCents(textValue(formData, `feeDollars:${offeringId}`));
    const sessionMinutes = positiveInteger(
      textValue(formData, `sessionMinutes:${offeringId}`),
    );
    const slidingScaleKey = textValue(formData, `slidingScale:${offeringId}`);
    const directBillingKey = textValue(formData, `directBilling:${offeringId}`);
    const rccReceiptsValue = textValue(formData, `rccReceipts:${offeringId}`);
    const feeNote = textValue(formData, `feeNote:${offeringId}`);

    if (feeCents === null) {
      fieldErrors[`feeDollars:${offeringId}`] = "Enter the session fee.";
    }

    if (sessionMinutes === null || sessionMinutes > 240) {
      fieldErrors[`sessionMinutes:${offeringId}`] =
        "Enter a session length between 1 and 240 minutes.";
    }

    if (!isOneOf(slidingScaleKey, SLIDING_SCALE_KEYS)) {
      fieldErrors[`slidingScale:${offeringId}`] = "Choose a sliding scale answer.";
    }

    if (rccReceiptsValue !== "true" && rccReceiptsValue !== "false") {
      fieldErrors[`rccReceipts:${offeringId}`] = "Choose yes or no for receipts.";
    }

    if (!isOneOf(directBillingKey, DIRECT_BILLING_KEYS)) {
      fieldErrors[`directBilling:${offeringId}`] =
        "Choose a direct billing answer.";
    }

    if (feeNote.length > 280) {
      fieldErrors[`feeNote:${offeringId}`] =
        "Keep the fee note to 280 characters or fewer.";
    }

    return {
      currency_code: "CAD",
      direct_billing_key: directBillingKey,
      fee_cents: feeCents ?? 0,
      fee_note: feeNote || null,
      rcc_receipts_available: rccReceiptsValue === "true",
      service_offering_id: offeringId,
      session_minutes: sessionMinutes ?? 0,
      sliding_scale_key: slidingScaleKey,
    };
  });

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "Please fix the highlighted fee details. Nothing was saved yet.",
      status: "error",
    };
  }

  const payload: SaveServiceFeePoliciesPayload = {
    policies: feePolicies,
  } satisfies Json;
  const { error } = await workspace.supabase.rpc("save_my_service_fee_policies", {
    p_payload: payload,
  });

  if (error) {
    return practicalRpcError("fees", error.message);
  }

  revalidatePracticalDetails(workspace.counsellor.slug);

  return {
    ...emptyPracticalActionState,
    message: "Fees saved.",
    status: "success",
  };
}

export async function savePracticalConsultation(
  _previousState: PracticalActionState,
  formData: FormData,
): Promise<PracticalActionState> {
  const workspace = await getSingleWorkspaceForPracticalAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const offeredValue = textValue(formData, "consultationOffered");
  const offered = offeredValue === "true";
  const fieldErrors: Record<string, string> = {};

  if (offeredValue !== "true" && offeredValue !== "false") {
    fieldErrors.consultationOffered = "Choose yes or no.";
  }

  let payload: SaveConsultationPreferencesPayload;

  if (!offered) {
    payload = { consultation_offered: false } satisfies Json;
  } else {
    const modeKey = textValue(formData, "consultationModeKey");
    const minutes = positiveInteger(textValue(formData, "consultationMinutes"));
    const costKind = textValue(formData, "consultationCostKind");
    const feeCents =
      costKind === "free"
        ? 0
        : dollarsToCents(textValue(formData, "consultationFeeDollars"));

    if (!isOneOf(modeKey, CONSULTATION_MODE_KEYS)) {
      fieldErrors.consultationModeKey = "Choose how you offer consultations.";
    }

    if (minutes === null || minutes > 120) {
      fieldErrors.consultationMinutes =
        "Enter a consultation length between 1 and 120 minutes.";
    }

    if (costKind !== "free" && costKind !== "paid") {
      fieldErrors.consultationCostKind = "Choose whether the consultation is free.";
    }

    if (feeCents === null) {
      fieldErrors.consultationFeeDollars = "Enter the consultation cost.";
    }

    payload = {
      consultation_fee_cents: feeCents ?? 0,
      consultation_minutes: minutes ?? 0,
      consultation_mode_key: modeKey,
      consultation_offered: true,
    } satisfies Json;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "Please fix the highlighted consultation details.",
      status: "error",
    };
  }

  const { error } = await workspace.supabase.rpc(
    "save_my_consultation_preferences",
    { p_payload: payload },
  );

  if (error) {
    return practicalRpcError("consultation preferences", error.message);
  }

  revalidatePracticalDetails(workspace.counsellor.slug);

  return {
    ...emptyPracticalActionState,
    message: "Consultation preference saved.",
    status: "success",
  };
}

export async function savePracticalAvailability(
  _previousState: PracticalActionState,
  formData: FormData,
): Promise<PracticalActionState> {
  const workspace = await getSingleWorkspaceForPracticalAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const statusKey = textValue(formData, "statusKey");
  const statusNote = textValue(formData, "statusNote");
  const fieldErrors: Record<string, string> = {};

  if (!isOneOf(statusKey, AVAILABILITY_STATUS_KEYS)) {
    fieldErrors.statusKey = "Choose your current availability.";
  }

  if (statusNote.length > 280) {
    fieldErrors.statusNote = "Keep the availability note to 280 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "Please fix the highlighted availability details.",
      status: "error",
    };
  }

  const payload: SaveAvailabilityPayload = {
    status_key: statusKey,
    status_note: statusNote || null,
  } satisfies Json;
  const { error } = await workspace.supabase.rpc("save_my_availability", {
    p_payload: payload,
  });

  if (error) {
    return practicalRpcError("availability", error.message);
  }

  revalidatePracticalDetails(workspace.counsellor.slug);

  return {
    ...emptyPracticalActionState,
    message: "Availability saved and reconfirmed.",
    status: "success",
  };
}

export async function savePracticalLocationAccessibility(
  _previousState: PracticalActionState,
  formData: FormData,
): Promise<PracticalActionState> {
  const workspace = await getSingleWorkspaceForPracticalAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const locationId = textValue(formData, "locationId");
  const featureKeys = uniqueStringValues(formData.getAll("featureKey"));
  const fieldErrors: Record<string, string> = {};

  if (!locationId) {
    fieldErrors.locationId = "Choose the location to review.";
  }

  const features = featureKeys.map((featureKey) => {
    const note = textValue(formData, `featureNote:${featureKey}`);

    if (note.length > 280) {
      fieldErrors[`featureNote:${featureKey}`] =
        "Keep accessibility notes to 280 characters or fewer.";
    }

    return {
      feature_key: featureKey,
      note: note || null,
    };
  });

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "Please fix the highlighted accessibility details.",
      status: "error",
    };
  }

  const payload: SaveLocationAccessibilityPayload = {
    features,
    location_id: locationId,
  } satisfies Json;
  const { error } = await workspace.supabase.rpc(
    "save_my_location_accessibility",
    { p_payload: payload },
  );

  if (error) {
    return practicalRpcError("accessibility", error.message);
  }

  revalidatePracticalDetails(workspace.counsellor.slug);

  return {
    ...emptyPracticalActionState,
    message: "Accessibility reviewed for this location.",
    status: "success",
  };
}

export async function completePracticalDetails(
  previousState: PracticalActionState,
): Promise<PracticalActionState> {
  void previousState;

  const workspace = await getSingleWorkspaceForPracticalAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const { data, error } = await workspace.supabase.rpc(
    "complete_my_practical_details",
  );

  if (error) {
    return practicalRpcError("completion check", error.message);
  }

  const completion = normalizeCompletion(data);
  revalidatePracticalDetails(workspace.counsellor.slug);

  if (completion.complete) {
    return {
      ...emptyPracticalActionState,
      message: "Practical Details complete.",
      status: "success",
    };
  }

  return {
    fieldErrors: {},
    message:
      completion.status === "needs_attention"
        ? "Some saved details no longer line up. Review the highlighted information before completing this section."
        : "There are still a few details to finish before this section can be completed.",
    status: "error",
  };
}

export async function saveContactEnquiries(
  _previousState: ContactEnquiriesActionState,
  formData: FormData,
): Promise<ContactEnquiriesActionState> {
  const workspace = await getSingleWorkspaceForContactAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const routeId = textValue(formData, "routeId");
  const managementKey = textValue(formData, "managementKey");
  const routeTypeKey = textValue(formData, "routeTypeKey");
  const practiceId = textValue(formData, "practiceId");
  const destination = textValue(formData, "destination");
  const displayLabel = textValue(formData, "displayLabel");
  const fieldErrors: Record<string, string> = {};

  if (!isContactManagementKey(managementKey)) {
    fieldErrors.managementKey = "Choose who manages this contact route.";
  }

  if (!isContactRouteTypeKey(routeTypeKey)) {
    fieldErrors.routeTypeKey = "Choose a contact method.";
  }

  if (managementKey === "practice" && !practiceId) {
    fieldErrors.practiceId = "Choose the practice connected to this contact route.";
  }

  if (!destination) {
    fieldErrors.destination = "Enter the contact destination.";
  } else if (isContactRouteTypeKey(routeTypeKey)) {
    const destinationError = validateContactDestination(routeTypeKey, destination);

    if (destinationError) {
      fieldErrors.destination = destinationError;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "Please fix the highlighted contact details.",
      status: "error",
    };
  }

  const safeRouteTypeKey = isContactRouteTypeKey(routeTypeKey)
    ? routeTypeKey
    : "secure_form";
  const safeManagementKey = isContactManagementKey(managementKey)
    ? managementKey
    : "self";
  const payload: SaveContactEnquiriesPayload = {
    destination,
    display_label: displayLabel || null,
    handoff_key: handoffKeyForContactRoute({
      managementKey: safeManagementKey,
      routeTypeKey: safeRouteTypeKey,
    }),
    practice_id: safeManagementKey === "practice" ? practiceId : null,
    route_type_key: safeRouteTypeKey,
    ...(routeId ? { route_id: routeId } : {}),
  } satisfies Json;
  const { error } = await workspace.supabase.rpc("save_my_contact_enquiries", {
    p_payload: payload,
  });

  if (error) {
    return contactRpcError("contact route", error.message);
  }

  revalidateContactEnquiries(workspace.counsellor.slug);

  return {
    ...emptyContactEnquiriesActionState,
    message: "Contact route saved and confirmed.",
    status: "success",
  };
}

export async function completeContactEnquiries(
  previousState: ContactEnquiriesActionState,
): Promise<ContactEnquiriesActionState> {
  void previousState;

  const workspace = await getSingleWorkspaceForContactAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const { data, error } = await workspace.supabase.rpc(
    "complete_my_contact_enquiries",
  );

  if (error) {
    return contactRpcError("completion check", error.message);
  }

  const completion = normalizeContactEnquiriesCompletion(data);
  revalidateContactEnquiries(workspace.counsellor.slug);

  if (completion.complete) {
    return {
      ...emptyContactEnquiriesActionState,
      message: "Contact & enquiries complete.",
      status: "success",
    };
  }

  return {
    fieldErrors: {},
    message:
      completion.status === "needs_attention"
        ? "Some saved contact details need review before this section can be completed."
        : "There is still a contact detail to finish before this section can be completed.",
    status: "error",
  };
}

export async function saveProfessionalEducation(
  _previousState: ProfessionalBackgroundActionState,
  formData: FormData,
): Promise<ProfessionalBackgroundActionState> {
  const workspace = await getSingleWorkspaceForProfessionalBackgroundAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const id = textValue(formData, "educationId");
  const degreeTitle = textValue(formData, "degreeTitle");
  const fieldOfStudy = textValue(formData, "fieldOfStudy");
  const institutionName = textValue(formData, "institutionName");
  const completionYearText = textValue(formData, "completionYear");
  const countryCodeText = textValue(formData, "countryCode").toUpperCase();
  const fieldErrors: Record<string, string> = {};

  if (!degreeTitle) {
    fieldErrors.degreeTitle = "Enter the qualification.";
  } else if (degreeTitle.length > 160) {
    fieldErrors.degreeTitle = "Keep the qualification to 160 characters or fewer.";
  }

  if (!institutionName) {
    fieldErrors.institutionName = "Enter the institution.";
  } else if (institutionName.length > 180) {
    fieldErrors.institutionName = "Keep the institution to 180 characters or fewer.";
  }

  if (fieldOfStudy.length > 120) {
    fieldErrors.fieldOfStudy = "Keep the field of study to 120 characters or fewer.";
  }

  const completionYear = completionYearText
    ? positiveInteger(completionYearText)
    : null;
  const currentYear = new Date().getFullYear();

  if (
    completionYearText &&
    (!completionYear || completionYear < 1950 || completionYear > currentYear)
  ) {
    fieldErrors.completionYear = "Enter a year from 1950 through this year.";
  }

  if (countryCodeText && !/^[A-Z]{2}$/.test(countryCodeText)) {
    fieldErrors.countryCode = "Use a two-letter country code, such as CA or US.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "Please fix the highlighted education details.",
      status: "error",
    };
  }

  const payload: SaveProfessionalEducationPayload = {
    degree_title: degreeTitle,
    field_of_study: fieldOfStudy || null,
    institution_name: institutionName,
    completion_year: completionYear,
    country_code: countryCodeText || null,
    ...(id ? { education_record_id: id } : {}),
  } satisfies Json;
  const { error } = await workspace.supabase.rpc(
    "save_my_professional_education",
    { p_payload: payload },
  );

  if (error) {
    return professionalBackgroundRpcError("education", error.message);
  }

  revalidateProfessionalBackground(workspace.counsellor.slug);

  return {
    ...emptyProfessionalBackgroundActionState,
    message: "Education saved.",
    status: "success",
  };
}

export async function deleteProfessionalEducation(
  _previousState: ProfessionalBackgroundActionState,
  formData: FormData,
): Promise<ProfessionalBackgroundActionState> {
  const workspace = await getSingleWorkspaceForProfessionalBackgroundAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const id = textValue(formData, "educationId");

  if (!id) {
    return {
      fieldErrors: { educationId: "Choose an education record to remove." },
      message: "We could not remove that education record.",
      status: "error",
    };
  }

  const { error } = await workspace.supabase.rpc(
    "delete_my_professional_education",
    { p_education_record_id: id },
  );

  if (error) {
    return professionalBackgroundRpcError("education", error.message);
  }

  revalidateProfessionalBackground(workspace.counsellor.slug);

  return {
    ...emptyProfessionalBackgroundActionState,
    message: "Education removed.",
    status: "success",
  };
}

export async function saveProfessionalExperience(
  _previousState: ProfessionalBackgroundActionState,
  formData: FormData,
): Promise<ProfessionalBackgroundActionState> {
  const workspace = await getSingleWorkspaceForProfessionalBackgroundAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const startYearText = textValue(formData, "postMastersPracticeStartYear");
  const fieldErrors: Record<string, string> = {};
  const currentYear = new Date().getFullYear();
  const startYear = startYearText ? positiveInteger(startYearText) : null;

  if (!startYearText) {
    fieldErrors.postMastersPracticeStartYear =
      "Enter the year your post-master's clinical practice began.";
  }

  if (
    startYearText &&
    (!startYear || startYear < 1950 || startYear > currentYear)
  ) {
    fieldErrors.postMastersPracticeStartYear =
      "Enter a year from 1950 through this year.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "Please fix the highlighted experience details.",
      status: "error",
    };
  }

  const payload: SaveProfessionalExperiencePayload = {
    post_masters_practice_start_year: startYear,
  } satisfies Json;
  const { error } = await workspace.supabase.rpc(
    "save_my_professional_experience",
    { p_payload: payload },
  );

  if (error) {
    return professionalBackgroundRpcError("experience", error.message);
  }

  revalidateProfessionalBackground(workspace.counsellor.slug);

  return {
    ...emptyProfessionalBackgroundActionState,
    message: "Professional experience reviewed.",
    status: "success",
  };
}

export async function saveTherapeuticApproaches(
  _previousState: ProfessionalBackgroundActionState,
  formData: FormData,
): Promise<ProfessionalBackgroundActionState> {
  const workspace = await getSingleWorkspaceForProfessionalBackgroundAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const selectedKeys = uniqueStringValues(formData.getAll("approachKey"));
  const fieldErrors: Record<string, string> = {};
  const approaches = selectedKeys.map((approachKey) => {
    const relationshipKey = textValue(formData, `relationship:${approachKey}`);

    if (!isApproachRelationshipKey(relationshipKey)) {
      fieldErrors[`relationship:${approachKey}`] =
        "Choose how this approach relates to your work.";
    }

    return {
      approach_key: approachKey,
      relationship_key: isApproachRelationshipKey(relationshipKey)
        ? relationshipKey
        : "informed_by",
    };
  });

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: "Please fix the highlighted approach details.",
      status: "error",
    };
  }

  const payload: SaveTherapeuticApproachesPayload = approaches satisfies Json;
  const { error } = await workspace.supabase.rpc(
    "save_my_therapeutic_approaches",
    { p_payload: payload },
  );

  if (error) {
    return professionalBackgroundRpcError("approaches", error.message);
  }

  revalidateProfessionalBackground(workspace.counsellor.slug);

  return {
    ...emptyProfessionalBackgroundActionState,
    message:
      approaches.length > 0
        ? "Therapeutic approaches saved."
        : "Approaches reviewed. No named approaches selected.",
    status: "success",
  };
}

export async function completeProfessionalBackground(
  previousState: ProfessionalBackgroundActionState,
): Promise<ProfessionalBackgroundActionState> {
  void previousState;

  const workspace = await getSingleWorkspaceForProfessionalBackgroundAction();

  if (workspace.status === "error") {
    return workspace.state;
  }

  const { data, error } = await workspace.supabase.rpc(
    "complete_my_professional_background",
  );

  if (error) {
    return professionalBackgroundRpcError("completion check", error.message);
  }

  const completion = normalizeProfessionalBackgroundCompletion(data);
  revalidateProfessionalBackground(workspace.counsellor.slug);

  if (completion.complete) {
    return {
      ...emptyProfessionalBackgroundActionState,
      message: "Professional Background complete.",
      status: "success",
    };
  }

  return {
    fieldErrors: {},
    message:
      completion.status === "needs_attention"
        ? "Some saved professional details need BCMC review before this section can be completed."
        : "There are still a few details to finish before this section can be completed.",
    status: "error",
  };
}

function parseWhatYouHelpWithFormValues(formData: FormData) {
  return uniqueStringValues(formData.getAll("practiceAreaKey")).flatMap(
    (practiceAreaKey) => {
      const emphasisKey = textValue(formData, `emphasis:${practiceAreaKey}`);

      if (!isConcernEmphasisKey(emphasisKey)) {
        return [
          {
            practiceAreaKey,
            emphasisKey: "" as "primary",
          },
        ];
      }

      return [
        {
          practiceAreaKey,
          emphasisKey,
        },
      ];
    },
  );
}

function validateWhatYouHelpWithValues(
  values: ReturnType<typeof parseWhatYouHelpWithFormValues>,
  activeKeys: Set<string>,
) {
  const fieldErrors: Record<string, string> = {};
  const keys = values.map((value) => value.practiceAreaKey);
  const primaryCount = values.filter(
    (value) => value.emphasisKey === "primary",
  ).length;
  const additionalCount = values.filter(
    (value) => value.emphasisKey === "additional",
  ).length;

  if (primaryCount < 1) {
    fieldErrors.primary =
      "Choose at least one main concern before saving this section.";
  }

  if (primaryCount > 3) {
    fieldErrors.primary = "Choose no more than 3 main concerns.";
  }

  if (additionalCount > 5) {
    fieldErrors.additional = "Choose no more than 5 other concerns.";
  }

  if (values.length > 8) {
    fieldErrors.practiceAreaKey = "Choose no more than 8 concerns in total.";
  }

  if (new Set(keys).size !== keys.length) {
    fieldErrors.practiceAreaKey =
      "The same concern can only appear in one group.";
  }

  if (
    values.some(
      (value) =>
        !activeKeys.has(value.practiceAreaKey) ||
        !isConcernEmphasisKey(value.emphasisKey),
    )
  ) {
    fieldErrors.practiceAreaKey =
      "Choose only currently available concern options.";
  }

  return fieldErrors;
}

function parseHowYouWorkFormValues(formData: FormData) {
  return uniqueStringValues(formData.getAll("questionKey")).flatMap(
    (questionKey) => {
      const optionKey = textValue(formData, `optionKey:${questionKey}`);

      if (!optionKey) {
        return [];
      }

      return [
        {
          questionKey,
          optionKey,
          contextKeys: uniqueStringValues(
            formData.getAll(`contextKeys:${questionKey}`),
          ),
          clarificationNote: textValue(
            formData,
            `clarificationNote:${questionKey}`,
          ),
        },
      ];
    },
  );
}

function parseFaithFormValues(formData: FormData) {
  const discussionComfortKey = textValue(formData, "discussionComfortKey");
  const initiationKey = textValue(formData, "initiationKey");
  const integrationKey = textValue(formData, "integrationKey");
  const integrationModeKey = textValue(formData, "integrationModeKey");
  const claimsIslamicCounselling = textValue(
    formData,
    "claimsIslamicCounselling",
  );

  const values: FaithProfileFormState["values"] = {
    claimsIslamicCounselling:
      claimsIslamicCounselling === "true"
        ? true
        : claimsIslamicCounselling === "false"
          ? false
          : null,
    discussionComfortKey: isDiscussionComfortKey(discussionComfortKey)
      ? discussionComfortKey
      : "",
    initiationKey: isInitiationKey(initiationKey) ? initiationKey : "",
    initiationNote: textValue(formData, "initiationNote"),
    integrationKey: isIntegrationKey(integrationKey) ? integrationKey : "",
    integrationModeKey: isIntegrationModeKey(integrationModeKey)
      ? integrationModeKey
      : "",
    islamicCounsellingDefinition: textValue(
      formData,
      "islamicCounsellingDefinition",
    ),
  };

  return values;
}

function validateHowYouWorkValues({
  contextReasons,
  options,
  questions,
  values,
}: {
  contextReasons: { key: string }[];
  options: {
    active: boolean;
    is_varies: boolean;
    option_key: string;
    question_key: string;
  }[];
  questions: {
    allows_varies: boolean;
    key: string;
  }[];
  values: WorkingStyleAnswerValue[];
}) {
  const fieldErrors: Record<string, string> = {};
  const questionKeys = values.map((value) => value.questionKey);
  const activeQuestionKeys = new Set(questions.map((question) => question.key));
  const activeContextKeys = new Set(contextReasons.map((reason) => reason.key));
  const questionsByKey = new Map(questions.map((question) => [question.key, question]));
  const optionsByQuestionAndKey = new Map(
    options.map((option) => [
      `${option.question_key}:${option.option_key}`,
      option,
    ]),
  );

  if (new Set(questionKeys).size !== questionKeys.length) {
    fieldErrors.responses = "Each scenario can only have one answer.";
  }

  for (const value of values) {
    const question = questionsByKey.get(value.questionKey);
    const option = optionsByQuestionAndKey.get(
      `${value.questionKey}:${value.optionKey}`,
    );

    if (!activeQuestionKeys.has(value.questionKey) || !question) {
      fieldErrors[value.questionKey] =
        "This scenario is no longer available. Refresh and try again.";
      continue;
    }

    if (!option?.active) {
      fieldErrors[value.questionKey] =
        "Choose one of the currently available responses.";
      continue;
    }

    if (!option.is_varies) {
      if (value.contextKeys.length > 0 || value.clarificationNote) {
        fieldErrors[value.questionKey] =
          "Context details are only used when the answer varies substantially.";
      }

      continue;
    }

    if (!question.allows_varies) {
      fieldErrors[value.questionKey] =
        "This scenario does not allow an it-varies answer.";
    }

    if (value.contextKeys.length === 0) {
      fieldErrors[value.questionKey] =
        "Choose what this usually depends on before saving.";
    }

    if (value.contextKeys.some((contextKey) => !activeContextKeys.has(contextKey))) {
      fieldErrors[value.questionKey] =
        "Choose only currently available context reasons.";
    }

    if (
      new Set(value.contextKeys).size !== value.contextKeys.length
    ) {
      fieldErrors[value.questionKey] =
        "Choose each context reason only once.";
    }

    if (
      value.contextKeys.includes(OTHER_CONTEXT_KEY) &&
      !value.clarificationNote
    ) {
      fieldErrors[value.questionKey] =
        "Add what else this depends on before saving.";
    }

    if (value.clarificationNote.length > CLARIFICATION_NOTE_MAX_LENGTH) {
      fieldErrors[value.questionKey] =
        `Keep the clarification to ${CLARIFICATION_NOTE_MAX_LENGTH} characters or fewer.`;
    }
  }

  return fieldErrors;
}

function uniqueStringValues(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values.flatMap((value) =>
        typeof value === "string" && value.trim() ? [value.trim()] : [],
      ),
    ),
  );
}

async function getSingleWorkspaceForPracticalAction(): Promise<
  | {
      counsellor: CounsellorAccount;
      status: "ok";
      supabase: IntakeSupabaseClient;
    }
  | { status: "error"; state: PracticalActionState }
> {
  const workspace = await getCounsellorWorkspace();

  if (workspace.kind === "unlinked") {
    return {
      state: {
        fieldErrors: {},
        message: "This account is not connected to a BCMC counsellor profile.",
        status: "error",
      },
      status: "error",
    };
  }

  if (workspace.kind === "multiple") {
    return {
      state: {
        fieldErrors: {},
        message:
          "This account is connected to more than one profile. Profile selection is required before saving.",
        status: "error",
      },
      status: "error",
    };
  }

  return {
    counsellor: workspace.counsellor,
    status: "ok",
    supabase: workspace.supabase,
  };
}

async function getSingleWorkspaceForContactAction(): Promise<
  | {
      counsellor: CounsellorAccount;
      status: "ok";
      supabase: IntakeSupabaseClient;
    }
  | { status: "error"; state: ContactEnquiriesActionState }
> {
  const workspace = await getCounsellorWorkspace();

  if (workspace.kind === "unlinked") {
    return {
      state: {
        fieldErrors: {},
        message: "This account is not connected to a BCMC counsellor profile.",
        status: "error",
      },
      status: "error",
    };
  }

  if (workspace.kind === "multiple") {
    return {
      state: {
        fieldErrors: {},
        message:
          "This account is connected to more than one profile. Profile selection is required before saving.",
        status: "error",
      },
      status: "error",
    };
  }

  return {
    counsellor: workspace.counsellor,
    status: "ok",
    supabase: workspace.supabase,
  };
}

async function getSingleWorkspaceForProfessionalBackgroundAction(): Promise<
  | {
      counsellor: CounsellorAccount;
      status: "ok";
      supabase: IntakeSupabaseClient;
    }
  | { status: "error"; state: ProfessionalBackgroundActionState }
> {
  const workspace = await getCounsellorWorkspace();

  if (workspace.kind === "unlinked") {
    return {
      state: {
        fieldErrors: {},
        message: "This account is not connected to a BCMC counsellor profile.",
        status: "error",
      },
      status: "error",
    };
  }

  if (workspace.kind === "multiple") {
    return {
      state: {
        fieldErrors: {},
        message:
          "This account is connected to more than one profile. Profile selection is required before saving.",
        status: "error",
      },
      status: "error",
    };
  }

  return {
    counsellor: workspace.counsellor,
    status: "ok",
    supabase: workspace.supabase,
  };
}

async function getSingleWorkspaceForProfileVoiceAction(
  values: ProfileVoiceActionState["values"],
): Promise<
  | {
      counsellor: CounsellorAccount;
      status: "ok";
      supabase: IntakeSupabaseClient;
    }
  | { status: "error"; state: ProfileVoiceActionState }
> {
  const workspace = await getCounsellorWorkspace();

  if (workspace.kind === "unlinked") {
    return {
      state: {
        completion: null,
        fieldErrors: {},
        message: "This account is not connected to a BCMC counsellor profile.",
        savedRevision: 0,
        status: "error",
        values,
      },
      status: "error",
    };
  }

  if (workspace.kind === "multiple") {
    return {
      state: {
        completion: null,
        fieldErrors: {},
        message:
          "This account is connected to more than one profile. Profile selection is required before saving.",
        savedRevision: 0,
        status: "error",
        values,
      },
      status: "error",
    };
  }

  return {
    counsellor: workspace.counsellor,
    status: "ok",
    supabase: workspace.supabase,
  };
}

function practicalRpcError(domain: string, message: string): PracticalActionState {
  return {
    fieldErrors: {},
    message: `We could not save ${domain} just now: ${message}`,
    status: "error",
  };
}

function contactRpcError(
  domain: string,
  message: string,
): ContactEnquiriesActionState {
  return {
    fieldErrors: {},
    message: `We could not save ${domain} just now: ${message}`,
    status: "error",
  };
}

function professionalBackgroundRpcError(
  domain: string,
  message: string,
): ProfessionalBackgroundActionState {
  return {
    fieldErrors: {},
    message: `We could not save ${domain} just now: ${message}`,
    status: "error",
  };
}

function profileVoiceRpcError(
  values: ProfileVoiceActionState["values"],
  domain: string,
  message: string,
): ProfileVoiceActionState {
  return {
    completion: null,
    fieldErrors: {},
    message: `We could not save ${domain} just now: ${message}`,
    savedRevision: 0,
    status: "error",
    values,
  };
}

function revalidatePracticalDetails(slug: string) {
  revalidatePath("/for-counsellors/profile");
  revalidatePath("/for-counsellors/profile/practical-details");
  revalidatePath(`/counsellors/${slug}`);
  revalidatePath("/find");
}

function revalidateContactEnquiries(slug: string) {
  revalidatePath("/for-counsellors/profile");
  revalidatePath("/for-counsellors/profile/availability-contact");
  revalidatePath("/for-counsellors/profile/[section]", "page");
  revalidatePath(`/counsellors/${slug}`);
  revalidatePath("/find");
}

function revalidateProfessionalBackground(slug: string) {
  revalidatePath("/for-counsellors/profile");
  revalidatePath("/for-counsellors/profile/professional-background");
  revalidatePath(`/counsellors/${slug}`);
  revalidatePath("/find");
}

function revalidateProfileVoice() {
  revalidatePath("/for-counsellors/profile");
  revalidatePath("/for-counsellors/profile/your-profile");
  revalidatePath("/for-counsellors/profile/[section]", "page");
}

function isContactManagementKey(value: string): value is ContactManagementKey {
  return CONTACT_MANAGEMENT_KEYS.includes(value as ContactManagementKey);
}

function validateContactDestination(
  routeTypeKey: "secure_form" | "website" | "email" | "phone",
  destination: string,
) {
  if (routeTypeKey === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination) ||
      destination.toLowerCase().startsWith("mailto:")
      ? null
      : "Enter a professional email address.";
  }

  if (routeTypeKey === "phone") {
    return destination.replace(/[^\d+]/g, "").length >= 7 ||
      destination.toLowerCase().startsWith("tel:")
      ? null
      : "Enter a professional phone number.";
  }

  try {
    const url = new URL(destination);
    return url.protocol === "http:" || url.protocol === "https:"
      ? null
      : "Enter a website address that starts with http:// or https://.";
  } catch {
    return "Enter a valid website address.";
  }
}

function dollarsToCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return null;
  }

  const cents = Math.round(Number(value) * 100);

  return Number.isFinite(cents) && cents >= 0 ? cents : null;
}

function positiveInteger(value: string) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}
