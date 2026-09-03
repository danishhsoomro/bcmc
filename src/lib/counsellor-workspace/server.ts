import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseSSRServerClient } from "@/lib/supabase/server";

import {
  COUNSELLOR_WORKSPACE_SECTIONS,
  getCanonicalSectionKey,
  getSectionByKey,
} from "./sections";
import {
  normalizeContactEnquiriesCompletion,
  type ContactEnquiriesData,
} from "./contact-enquiries";
import {
  normalizeProfessionalBackgroundCompletion,
  type ProfessionalBackgroundData,
} from "./professional-background";
import {
  normalizeProfileVoiceCompletion,
  normalizeProfileVoiceIntake,
  type ProfileVoiceData,
} from "./profile-voice";
import type {
  AccessibilityFeatureRow,
  ContactProcessRow,
  ContactRouteRow,
  CounsellorTherapeuticApproachRow,
  CounsellorAccount,
  CounsellorAvailabilityRow,
  CounsellorCulturalFamiliarityRow,
  CounsellorProfileRow,
  CounsellorWorkspaceSectionKey,
  CounsellorWorkspaceStatus,
  CulturalFamiliarityTaxonomyRow,
  DeclarationOfferingDiscrepancy,
  FaithPracticeProfileRow,
  IntakeSupabaseClient,
  LocationAccessibilityRow,
  CounsellorPracticeAreaRow,
  PracticeAffiliationRow,
  PracticeAreaTaxonomyRow,
  EducationRecordRow,
  ProfessionalExperienceRow,
  ProfessionalCredentialRow,
  ServiceDeclarationClientGroupRow,
  ServiceDeclarationRow,
  ServiceFeePolicyRow,
  ServiceOfferingClientGroupRow,
  ServiceOfferingRow,
  ServiceLocationRow,
  ServiceOfferingVirtualRegionRow,
  ServiceRegionRow,
  TaxonomyRow,
  TherapeuticApproachTaxonomyRow,
  TrainingCertificationRow,
  WorkingStyleConstructRow,
  WorkingStyleContextReasonRow,
  WorkingStyleQuestionOptionRow,
  WorkingStyleQuestionResponseRow,
  WorkingStyleQuestionRow,
  WorkingStyleResponseContextRow,
} from "./types";
import {
  normalizeCompletion,
  type PracticalDetailsData,
} from "./practical-details";
import {
  faithProfileIsComplete,
  isDiscussionComfortKey,
  isInitiationKey,
  isIntegrationKey,
  isIntegrationModeKey,
  normalizeFaithProfileValue,
  type FaithProfileValue,
} from "./faith";
import {
  isApplicableWorkingStyleQuestion,
  WORKING_STYLE_QUESTIONNAIRE_VERSION,
} from "./how-you-work";
import type { Json } from "../../../supabase/database.types";

export type WorkspaceResolution =
  | {
      kind: "linked";
      supabase: IntakeSupabaseClient;
      counsellor: CounsellorAccount;
    }
  | {
      kind: "unlinked";
    }
  | {
      kind: "multiple";
      counsellors: CounsellorAccount[];
    };

export async function getCounsellorWorkspace(): Promise<WorkspaceResolution> {
  const supabase = await createSupabaseSSRServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/for-counsellors/sign-in");
  }

  const { data: counsellors, error: counsellorsError } = await supabase.rpc(
    "get_my_counsellor_accounts",
  );

  if (counsellorsError) {
    throw new Error("Unable to resolve counsellor account link.");
  }

  if (!counsellors || counsellors.length === 0) {
    return { kind: "unlinked" };
  }

  if (counsellors.length > 1) {
    return {
      kind: "multiple",
      counsellors: counsellors
        .map((counsellor) => ({
          counsellor_id: counsellor.counsellor_id,
          display_name: counsellor.display_name,
          preferred_name: counsellor.preferred_name,
          slug: counsellor.slug,
          link_role: counsellor.link_role,
        }))
        .sort((a, b) =>
          (a.display_name ?? "").localeCompare(b.display_name ?? ""),
        ),
    };
  }

  const counsellor = counsellors[0];

  return {
    kind: "linked",
    supabase,
    counsellor: {
      counsellor_id: counsellor.counsellor_id,
      display_name: counsellor.display_name,
      preferred_name: counsellor.preferred_name,
      slug: counsellor.slug,
      link_role: counsellor.link_role,
    },
  };
}

export type OnboardingModel = {
  unavailableReason: string | null;
  statuses: Record<CounsellorWorkspaceSectionKey, CounsellorWorkspaceStatus>;
};

export function getPracticeStatusFromCanonical(
  counsellor: Pick<CounsellorProfileRow, "display_name" | "gender_key">,
): CounsellorWorkspaceStatus {
  if (counsellor.display_name?.trim() && counsellor.gender_key) {
    return "complete";
  }

  if (counsellor.display_name?.trim() || counsellor.gender_key) {
    return "in_progress";
  }

  return "not_started";
}

export function defaultSectionStatuses(): Record<
  CounsellorWorkspaceSectionKey,
  CounsellorWorkspaceStatus
> {
  return Object.fromEntries(
    COUNSELLOR_WORKSPACE_SECTIONS.map((section) => [
      section.key,
      "not_started",
    ]),
  ) as Record<CounsellorWorkspaceSectionKey, CounsellorWorkspaceStatus>;
}

function normalizeStatus(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLowerCase();

  if (
    normalizedValue === "not_started" ||
    normalizedValue === "in_progress" ||
    normalizedValue === "complete" ||
    normalizedValue === "needs_attention"
  ) {
    return normalizedValue;
  }

  return "not_started";
}

export async function ensureOnboardingState(
  supabase: IntakeSupabaseClient,
): Promise<OnboardingModel> {
  const statuses = defaultSectionStatuses();

  const { error: initializeError } = await supabase.rpc(
    "initialize_my_counsellor_onboarding",
  );

  if (initializeError) {
    return {
      statuses,
      unavailableReason: `Onboarding initialization RPC unavailable: ${initializeError.message}`,
    };
  }

  const { data, error: getError } = await supabase.rpc(
    "get_my_counsellor_onboarding",
  );

  if (getError) {
    return {
      statuses,
      unavailableReason: `Onboarding state RPC unavailable: ${getError.message}`,
    };
  }

  for (const row of data ?? []) {
    const sectionKey = sectionKeyFromRpc(row.section_key);

    if (sectionKey && getSectionByKey(sectionKey)) {
      statuses[sectionKey] = normalizeStatus(row.section_status_key);
    }
  }

  return { statuses, unavailableReason: null };
}

export async function updateOnboardingSectionStatus(
  supabase: IntakeSupabaseClient,
  sectionKey: CounsellorWorkspaceSectionKey,
  status: CounsellorWorkspaceStatus,
) {
  const { error } = await supabase.rpc("update_my_counsellor_onboarding_section", {
    p_section_key: sectionKey,
    p_status_key: status,
  });

  if (error) {
    return `Onboarding update RPC unavailable: ${error.message}`;
  }

  return null;
}

type ProfileVoiceRpcClient = {
  rpc(
    functionName: "get_my_profile_voice_intake",
  ): Promise<{ data: Json; error: { message: string } | null }>;
  rpc(
    functionName: "get_my_profile_voice_completion",
  ): Promise<{ data: Json; error: { message: string } | null }>;
};

function getProfileVoiceRpcClient(supabase: IntakeSupabaseClient) {
  return supabase as unknown as ProfileVoiceRpcClient;
}

function sectionKeyFromRpc(
  value: string | null | undefined,
): CounsellorWorkspaceSectionKey | null {
  return getCanonicalSectionKey(value);
}

export async function getPracticeSectionData(
  supabase: IntakeSupabaseClient,
  counsellorId: string,
) {
  const { data: counsellor, error: counsellorError } = await supabase
    .from("counsellors")
    .select(
      "id, slug, display_name, preferred_name, pronouns, gender_key, gender_self_description, lifecycle_status, publication_status, published_at",
    )
    .eq("id", counsellorId)
    .single<CounsellorProfileRow>();

  if (counsellorError) {
    throw new Error(`Unable to load counsellor profile: ${counsellorError.message}`);
  }

  const { data: credentials, error: credentialsError } = await supabase
    .from("professional_credentials")
    .select(
      "id, counsellor_id, credential_type_key, issuer_name, status_key, is_primary, public_visible",
    )
    .eq("counsellor_id", counsellorId)
    .order("is_primary", { ascending: false })
    .returns<ProfessionalCredentialRow[]>();

  if (credentialsError) {
    throw new Error(
      `Unable to load professional credentials: ${credentialsError.message}`,
    );
  }

  const credentialTypes = credentials?.length
    ? await supabase
        .from("credential_types")
        .select("key, label, issuer_name, active")
        .in(
          "key",
          credentials.map((credential) => credential.credential_type_key),
        )
    : { data: [], error: null };

  if (credentialTypes.error) {
    throw new Error(
      `Unable to load credential types: ${credentialTypes.error.message}`,
    );
  }

  const { data: practiceAffiliations, error: affiliationsError } =
    await supabase
      .from("counsellor_practice_affiliations")
      .select(
        "id, counsellor_id, practice_id, affiliation_type_key, is_primary, public_visible, ended_on, practices(id, name, slug, practice_type_key, website_url, city, province)",
      )
      .eq("counsellor_id", counsellorId)
      .is("ended_on", null)
      .order("is_primary", { ascending: false })
      .returns<PracticeAffiliationRow[]>();

  if (affiliationsError) {
    throw new Error(
      `Unable to load practice affiliations: ${affiliationsError.message}`,
    );
  }

  return {
    counsellor,
    credentials: credentials ?? [],
    credentialTypes: credentialTypes.data ?? [],
    practiceAffiliations: practiceAffiliations ?? [],
  };
}

export async function getProfileVoiceSectionData(
  supabase: IntakeSupabaseClient,
): Promise<ProfileVoiceData> {
  const profileVoiceClient = getProfileVoiceRpcClient(supabase);
  const [intakeResult, completionResult] = await Promise.all([
    profileVoiceClient.rpc("get_my_profile_voice_intake"),
    profileVoiceClient.rpc("get_my_profile_voice_completion"),
  ]);

  if (intakeResult.error) {
    throw new Error(
      `Unable to load profile voice intake: ${intakeResult.error.message}`,
    );
  }

  if (completionResult.error) {
    throw new Error(
      `Unable to load profile voice completion: ${completionResult.error.message}`,
    );
  }

  return {
    completion: normalizeProfileVoiceCompletion(completionResult.data),
    intake: normalizeProfileVoiceIntake(intakeResult.data),
  };
}

export async function getProfessionalBackgroundSectionData(
  supabase: IntakeSupabaseClient,
  counsellorId: string,
): Promise<ProfessionalBackgroundData> {
  const [
    credentialsResult,
    credentialVerificationsResult,
    credentialTypesResult,
    educationResult,
    experienceResult,
    taxonomyResult,
    selectedApproachesResult,
    trainingResult,
    completionResult,
  ] = await Promise.all([
    supabase
      .from("professional_credentials")
      .select(
        "id, counsellor_id, credential_type_key, issuer_name, status_key, is_primary, public_visible",
      )
      .eq("counsellor_id", counsellorId)
      .order("is_primary", { ascending: false })
      .returns<ProfessionalCredentialRow[]>(),
    supabase
      .from("v_public_credential_verification")
      .select(
        "counsellor_id, credential_id, credential_type_key, credential_label, issuer_name, credential_status, verification_status, verified_checked_at, currently_verified",
      )
      .eq("counsellor_id", counsellorId),
    supabase
      .from("credential_types")
      .select("key, label, issuer_name, active")
      .eq("active", true),
    supabase
      .from("education_records")
      .select(
        "id, counsellor_id, degree_title, field_of_study, institution_name, completion_year, country_code, public_visible, sort_order",
      )
      .eq("counsellor_id", counsellorId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<EducationRecordRow[]>(),
    supabase
      .from("professional_experience")
      .select(
        "counsellor_id, post_masters_practice_start_year, post_masters_years, as_of_date, experience_note, public_visible",
      )
      .eq("counsellor_id", counsellorId)
      .maybeSingle<ProfessionalExperienceRow>(),
    supabase
      .from("therapeutic_approach_taxonomy")
      .select("key, label, short_description, active, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true })
      .returns<TherapeuticApproachTaxonomyRow[]>(),
    supabase
      .from("counsellor_therapeutic_approaches")
      .select("counsellor_id, approach_key, relationship_key, public_visible, active")
      .eq("counsellor_id", counsellorId)
      .eq("active", true)
      .returns<CounsellorTherapeuticApproachRow[]>(),
    supabase
      .from("training_certifications")
      .select(
        "id, record_type_key, title, provider_name, completion_year, expiry_date, evidence_status_key, public_visible, active, sort_order",
      )
      .eq("counsellor_id", counsellorId)
      .eq("active", true)
      .eq("public_visible", true)
      .in("evidence_status_key", ["reviewed", "verified"])
      .order("sort_order", { ascending: true })
      .order("completion_year", { ascending: false })
      .returns<TrainingCertificationRow[]>(),
    supabase.rpc("get_my_professional_background_completion"),
  ]);

  if (credentialsResult.error) {
    throw new Error(
      `Unable to load professional credentials: ${credentialsResult.error.message}`,
    );
  }

  if (credentialVerificationsResult.error) {
    throw new Error(
      `Unable to load credential verification: ${credentialVerificationsResult.error.message}`,
    );
  }

  if (credentialTypesResult.error) {
    throw new Error(
      `Unable to load credential types: ${credentialTypesResult.error.message}`,
    );
  }

  if (educationResult.error) {
    throw new Error(
      `Unable to load education records: ${educationResult.error.message}`,
    );
  }

  if (experienceResult.error) {
    throw new Error(
      `Unable to load professional experience: ${experienceResult.error.message}`,
    );
  }

  if (taxonomyResult.error) {
    throw new Error(
      `Unable to load therapeutic approach taxonomy: ${taxonomyResult.error.message}`,
    );
  }

  if (selectedApproachesResult.error) {
    throw new Error(
      `Unable to load therapeutic approaches: ${selectedApproachesResult.error.message}`,
    );
  }

  if (trainingResult.error) {
    throw new Error(
      `Unable to load reviewed training: ${trainingResult.error.message}`,
    );
  }

  if (completionResult.error) {
    throw new Error(
      `Unable to load professional background completion: ${completionResult.error.message}`,
    );
  }

  return {
    approachTaxonomy: taxonomyResult.data ?? [],
    completion: normalizeProfessionalBackgroundCompletion(completionResult.data),
    credentials: credentialsResult.data ?? [],
    credentialVerifications: credentialVerificationsResult.data ?? [],
    credentialTypes: credentialTypesResult.data ?? [],
    educationRecords: educationResult.data ?? [],
    experience: experienceResult.data ?? null,
    selectedApproaches: selectedApproachesResult.data ?? [],
    trainingCertifications: trainingResult.data ?? [],
  };
}

export async function getWhoYouWorkWithSectionData(
  supabase: IntakeSupabaseClient,
  counsellorId: string,
) {
  const [
    clientGroupsResult,
    serviceTypesResult,
    serviceDeclarationsResult,
    serviceDeclarationClientGroupsResult,
    serviceOfferingsResult,
  ] = await Promise.all([
    supabase
      .from("client_groups")
      .select("key, label, definition, active, sort_order")
      .eq("active", true)
      .order("sort_order")
      .order("label")
      .returns<TaxonomyRow[]>(),
    supabase
      .from("service_types")
      .select("key, label, definition, active, sort_order")
      .eq("active", true)
      .order("sort_order")
      .order("label")
      .returns<TaxonomyRow[]>(),
    supabase
      .from("counsellor_service_declarations")
      .select(
        "counsellor_id, service_type_key, client_gender_scope_key, client_gender_scope_note, created_at, updated_at",
      )
      .eq("counsellor_id", counsellorId)
      .order("service_type_key")
      .returns<ServiceDeclarationRow[]>(),
    supabase
      .from("counsellor_service_declaration_client_groups")
      .select("counsellor_id, service_type_key, client_group_key, created_at")
      .eq("counsellor_id", counsellorId)
      .order("service_type_key")
      .order("client_group_key")
      .returns<ServiceDeclarationClientGroupRow[]>(),
    supabase
      .from("service_offerings")
      .select(
        "id, counsellor_id, practice_id, location_id, service_type_key, delivery_mode_key, scope_note, active, public_visible, client_gender_scope_key, client_gender_scope_note",
      )
      .eq("counsellor_id", counsellorId)
      .eq("active", true)
      .order("service_type_key")
      .order("delivery_mode_key")
      .returns<ServiceOfferingRow[]>(),
  ]);

  if (clientGroupsResult.error) {
    throw new Error(
      `Unable to load client groups: ${clientGroupsResult.error.message}`,
    );
  }

  if (serviceTypesResult.error) {
    throw new Error(
      `Unable to load service types: ${serviceTypesResult.error.message}`,
    );
  }

  if (serviceDeclarationsResult.error) {
    throw new Error(
      `Unable to load service declarations: ${serviceDeclarationsResult.error.message}`,
    );
  }

  if (serviceDeclarationClientGroupsResult.error) {
    throw new Error(
      `Unable to load declaration client groups: ${serviceDeclarationClientGroupsResult.error.message}`,
    );
  }

  if (serviceOfferingsResult.error) {
    throw new Error(
      `Unable to load service offerings: ${serviceOfferingsResult.error.message}`,
    );
  }

  const serviceOfferings = serviceOfferingsResult.data ?? [];
  const serviceOfferingIds = serviceOfferings.map((offering) => offering.id);
  const clientGroupLinksResult = serviceOfferingIds.length
    ? await supabase
        .from("service_offering_client_groups")
        .select("service_offering_id, client_group_key")
        .in("service_offering_id", serviceOfferingIds)
        .returns<ServiceOfferingClientGroupRow[]>()
    : { data: [], error: null };

  if (clientGroupLinksResult.error) {
    throw new Error(
      `Unable to load service client groups: ${clientGroupLinksResult.error.message}`,
    );
  }

  return {
    clientGroups: clientGroupsResult.data ?? [],
    declarationOfferingDiscrepancies: findDeclarationOfferingDiscrepancies({
      serviceDeclarationClientGroups:
        serviceDeclarationClientGroupsResult.data ?? [],
      serviceDeclarations: serviceDeclarationsResult.data ?? [],
      serviceOfferingClientGroups: clientGroupLinksResult.data ?? [],
      serviceOfferings,
    }),
    serviceDeclarationClientGroups:
      serviceDeclarationClientGroupsResult.data ?? [],
    serviceDeclarations: serviceDeclarationsResult.data ?? [],
    serviceTypes: serviceTypesResult.data ?? [],
    serviceOfferings,
    serviceOfferingClientGroups: clientGroupLinksResult.data ?? [],
  };
}

export async function getWhatYouHelpWithSectionData(
  supabase: IntakeSupabaseClient,
  counsellorId: string,
) {
  const [taxonomyResult, practiceAreasResult, serviceDeclarationsResult] =
    await Promise.all([
      supabase
        .from("practice_area_taxonomy")
        .select("key, label, short_description, active, sort_order")
        .eq("active", true)
        .order("sort_order")
        .order("label")
        .returns<PracticeAreaTaxonomyRow[]>(),
      supabase
        .from("counsellor_practice_areas")
        .select(
          "counsellor_id, practice_area_key, emphasis_key, counsellor_note, public_visible, active, created_at, updated_at",
        )
        .eq("counsellor_id", counsellorId)
        .eq("active", true)
        .order("emphasis_key", { ascending: false })
        .order("practice_area_key")
        .returns<CounsellorPracticeAreaRow[]>(),
      supabase
        .from("counsellor_service_declarations")
        .select(
          "counsellor_id, service_type_key, client_gender_scope_key, client_gender_scope_note, created_at, updated_at",
        )
        .eq("counsellor_id", counsellorId)
        .returns<ServiceDeclarationRow[]>(),
    ]);

  if (taxonomyResult.error) {
    throw new Error(
      `Unable to load concern options: ${taxonomyResult.error.message}`,
    );
  }

  if (practiceAreasResult.error) {
    throw new Error(
      `Unable to load selected concerns: ${practiceAreasResult.error.message}`,
    );
  }

  if (serviceDeclarationsResult.error) {
    throw new Error(
      `Unable to load service declarations: ${serviceDeclarationsResult.error.message}`,
    );
  }

  return {
    practiceAreaTaxonomy: taxonomyResult.data ?? [],
    practiceAreas: practiceAreasResult.data ?? [],
    serviceDeclarations: serviceDeclarationsResult.data ?? [],
  };
}

export async function getHowYouWorkSectionData(
  supabase: IntakeSupabaseClient,
  counsellorId: string,
) {
  const [
    constructsResult,
    questionsResult,
    optionsResult,
    contextReasonsResult,
    responsesResult,
  ] = await Promise.all([
    supabase
      .from("working_style_constructs")
      .select(
        "key, label, description, research_status_key, version, active, sort_order, created_at",
      )
      .eq("active", true)
      .neq("research_status_key", "deprecated")
      .order("sort_order")
      .order("key")
      .returns<WorkingStyleConstructRow[]>(),
    supabase
      .from("working_style_questions")
      .select(
        "key, construct_key, questionnaire_version, prompt_text, help_text, service_type_key, allows_varies, research_status_key, active, sort_order, created_at",
      )
      .eq("questionnaire_version", WORKING_STYLE_QUESTIONNAIRE_VERSION)
      .eq("active", true)
      .neq("research_status_key", "deprecated")
      .is("service_type_key", null)
      .order("sort_order")
      .order("key")
      .returns<WorkingStyleQuestionRow[]>(),
    supabase
      .from("working_style_question_options")
      .select(
        "question_key, option_key, counsellor_label, ordinal_position, is_varies, active, sort_order, created_at",
      )
      .eq("active", true)
      .order("question_key")
      .order("sort_order")
      .returns<WorkingStyleQuestionOptionRow[]>(),
    supabase
      .from("working_style_context_reasons")
      .select("key, label, active, sort_order, created_at")
      .eq("active", true)
      .order("sort_order")
      .order("key")
      .returns<WorkingStyleContextReasonRow[]>(),
    supabase
      .from("working_style_question_responses")
      .select(
        "id, counsellor_id, question_key, option_key, clarification_note, answered_at, updated_at, active",
      )
      .eq("counsellor_id", counsellorId)
      .eq("active", true)
      .order("question_key")
      .returns<WorkingStyleQuestionResponseRow[]>(),
  ]);

  if (constructsResult.error) {
    throw new Error(
      `Unable to load working style constructs: ${constructsResult.error.message}`,
    );
  }

  if (questionsResult.error) {
    throw new Error(
      `Unable to load working style questions: ${questionsResult.error.message}`,
    );
  }

  if (optionsResult.error) {
    throw new Error(
      `Unable to load working style options: ${optionsResult.error.message}`,
    );
  }

  if (contextReasonsResult.error) {
    throw new Error(
      `Unable to load working style context reasons: ${contextReasonsResult.error.message}`,
    );
  }

  if (responsesResult.error) {
    throw new Error(
      `Unable to load working style responses: ${responsesResult.error.message}`,
    );
  }

  const questionKeys = new Set((questionsResult.data ?? []).map((q) => q.key));
  const options = (optionsResult.data ?? []).filter((option) =>
    questionKeys.has(option.question_key),
  );
  const responses = (responsesResult.data ?? []).filter((response) =>
    questionKeys.has(response.question_key),
  );
  const responseIds = responses.map((response) => response.id);
  const responseContextsResult = responseIds.length
    ? await supabase
        .from("working_style_response_contexts")
        .select("response_id, context_key")
        .in("response_id", responseIds)
        .order("response_id")
        .order("context_key")
        .returns<WorkingStyleResponseContextRow[]>()
    : { data: [], error: null };

  if (responseContextsResult.error) {
    throw new Error(
      `Unable to load working style response contexts: ${responseContextsResult.error.message}`,
    );
  }

  return {
    constructs: constructsResult.data ?? [],
    contextReasons: contextReasonsResult.data ?? [],
    options,
    responseContexts: responseContextsResult.data ?? [],
    responses,
    questions: questionsResult.data ?? [],
  };
}

export async function getFaithSectionData(
  supabase: IntakeSupabaseClient,
  counsellorId: string,
) {
  const { data, error } = await supabase
    .from("faith_practice_profiles")
    .select(
      "counsellor_id, discussion_comfort_key, discussion_comfort_note, initiation_key, initiation_note, integration_key, integration_note, integration_mode_key, claims_islamic_counselling, islamic_counselling_definition",
    )
    .eq("counsellor_id", counsellorId)
    .maybeSingle<FaithPracticeProfileRow>();

  if (error) {
    throw new Error(`Unable to load faith profile: ${error.message}`);
  }

  return {
    faithProfile: data ?? null,
  };
}

export async function getCulturalFamiliaritySectionData(
  supabase: IntakeSupabaseClient,
  counsellorId: string,
) {
  const [taxonomyResult, selectionsResult] = await Promise.all([
    supabase
      .from("cultural_familiarity_taxonomy")
      .select("key, label, short_description, context_type_key, active, sort_order")
      .eq("active", true)
      .order("sort_order")
      .order("label")
      .returns<CulturalFamiliarityTaxonomyRow[]>(),
    supabase
      .from("counsellor_cultural_familiarity")
      .select(
        "counsellor_id, familiarity_key, note, public_visible, active, created_at, updated_at",
      )
      .eq("counsellor_id", counsellorId)
      .eq("active", true)
      .order("familiarity_key")
      .returns<CounsellorCulturalFamiliarityRow[]>(),
  ]);

  if (taxonomyResult.error) {
    throw new Error(
      `Unable to load cultural familiarity options: ${taxonomyResult.error.message}`,
    );
  }

  if (selectionsResult.error) {
    throw new Error(
      `Unable to load selected cultural familiarity: ${selectionsResult.error.message}`,
    );
  }

  return {
    culturalFamiliarityTaxonomy: taxonomyResult.data ?? [],
    culturalFamiliaritySelections: selectionsResult.data ?? [],
  };
}

export async function getPracticalDetailsSectionData(
  supabase: IntakeSupabaseClient,
  counsellorId: string,
): Promise<PracticalDetailsData> {
  const [
    serviceTypesResult,
    declarationsResult,
    declarationClientGroupsResult,
    offeringsResult,
    locationsResult,
    affiliationsResult,
    regionsResult,
    contactProcessResult,
    availabilityResult,
    accessibilityFeaturesResult,
    completionResult,
  ] = await Promise.all([
    supabase
      .from("service_types")
      .select("key, label, definition, active, sort_order")
      .eq("active", true)
      .order("sort_order")
      .order("label")
      .returns<TaxonomyRow[]>(),
    supabase
      .from("counsellor_service_declarations")
      .select(
        "counsellor_id, service_type_key, client_gender_scope_key, client_gender_scope_note, created_at, updated_at",
      )
      .eq("counsellor_id", counsellorId)
      .order("service_type_key")
      .returns<ServiceDeclarationRow[]>(),
    supabase
      .from("counsellor_service_declaration_client_groups")
      .select("counsellor_id, service_type_key, client_group_key, created_at")
      .eq("counsellor_id", counsellorId)
      .order("service_type_key")
      .order("client_group_key")
      .returns<ServiceDeclarationClientGroupRow[]>(),
    supabase
      .from("service_offerings")
      .select(
        "id, counsellor_id, practice_id, location_id, service_type_key, delivery_mode_key, scope_note, active, public_visible, client_gender_scope_key, client_gender_scope_note",
      )
      .eq("counsellor_id", counsellorId)
      .eq("active", true)
      .in("delivery_mode_key", ["in_person", "virtual"])
      .order("service_type_key")
      .order("delivery_mode_key")
      .returns<ServiceOfferingRow[]>(),
    supabase
      .from("service_locations")
      .select(
        "id, counsellor_id, practice_id, label, city, province, country_code, neighbourhood_or_area, active, public_visible",
      )
      .eq("counsellor_id", counsellorId)
      .eq("active", true)
      .order("city")
      .order("neighbourhood_or_area")
      .returns<ServiceLocationRow[]>(),
    supabase
      .from("counsellor_practice_affiliations")
      .select(
        "id, counsellor_id, practice_id, affiliation_type_key, is_primary, public_visible, ended_on, practices(id, name, slug, practice_type_key, website_url, city, province)",
      )
      .eq("counsellor_id", counsellorId)
      .is("ended_on", null)
      .order("is_primary", { ascending: false })
      .returns<PracticeAffiliationRow[]>(),
    supabase
      .from("service_regions")
      .select("key, label, region_type_key, country_code, active, sort_order")
      .eq("active", true)
      .order("sort_order")
      .order("label")
      .returns<ServiceRegionRow[]>(),
    supabase
      .from("contact_processes")
      .select(
        "counsellor_id, consultation_offered, consultation_mode_key, public_visible, created_at, updated_at",
      )
      .eq("counsellor_id", counsellorId)
      .maybeSingle<ContactProcessRow>(),
    supabase
      .from("counsellor_availability")
      .select(
        "counsellor_id, status_key, status_note, confirmed_at, confirmation_source_key, public_visible",
      )
      .eq("counsellor_id", counsellorId)
      .maybeSingle<CounsellorAvailabilityRow>(),
    supabase
      .from("accessibility_features")
      .select("key, label, definition, active, sort_order")
      .eq("active", true)
      .order("sort_order")
      .order("label")
      .returns<AccessibilityFeatureRow[]>(),
    supabase.rpc("get_my_practical_details_completion"),
  ]);

  if (serviceTypesResult.error) {
    throw new Error(
      `Unable to load service types: ${serviceTypesResult.error.message}`,
    );
  }

  if (declarationsResult.error) {
    throw new Error(
      `Unable to load service declarations: ${declarationsResult.error.message}`,
    );
  }

  if (declarationClientGroupsResult.error) {
    throw new Error(
      `Unable to load declaration client groups: ${declarationClientGroupsResult.error.message}`,
    );
  }

  if (offeringsResult.error) {
    throw new Error(
      `Unable to load service delivery details: ${offeringsResult.error.message}`,
    );
  }

  if (locationsResult.error) {
    throw new Error(
      `Unable to load service locations: ${locationsResult.error.message}`,
    );
  }

  if (affiliationsResult.error) {
    throw new Error(
      `Unable to load practice affiliations: ${affiliationsResult.error.message}`,
    );
  }

  if (regionsResult.error) {
    throw new Error(
      `Unable to load virtual coverage regions: ${regionsResult.error.message}`,
    );
  }

  if (contactProcessResult.error) {
    throw new Error(
      `Unable to load consultation preferences: ${contactProcessResult.error.message}`,
    );
  }

  if (availabilityResult.error) {
    throw new Error(
      `Unable to load availability: ${availabilityResult.error.message}`,
    );
  }

  if (accessibilityFeaturesResult.error) {
    throw new Error(
      `Unable to load accessibility options: ${accessibilityFeaturesResult.error.message}`,
    );
  }

  if (completionResult.error) {
    throw new Error(
      `Unable to load Practical Details completion: ${completionResult.error.message}`,
    );
  }

  const v01Offerings = offeringsResult.data ?? [];
  const offeringIds = v01Offerings.map((offering) => offering.id);
  const locationIds = (locationsResult.data ?? []).map((location) => location.id);
  const [virtualRegionsResult, feePoliciesResult, accessibilityRowsResult] =
    await Promise.all([
      offeringIds.length
        ? supabase
            .from("service_offering_virtual_regions")
            .select("service_offering_id, region_key")
            .in("service_offering_id", offeringIds)
            .order("service_offering_id")
            .order("region_key")
            .returns<ServiceOfferingVirtualRegionRow[]>()
        : { data: [], error: null },
      offeringIds.length
        ? supabase
            .from("service_fee_policies")
            .select(
              "id, service_offering_id, fee_cents, currency_code, session_minutes, fee_note, sliding_scale_key, rcc_receipts_available, direct_billing_key, consultation_fee_cents, consultation_minutes, public_visible, active, confirmed_at, confirmation_source_key",
            )
            .in("service_offering_id", offeringIds)
            .eq("active", true)
            .order("service_offering_id")
            .order("session_minutes")
            .returns<ServiceFeePolicyRow[]>()
        : { data: [], error: null },
      locationIds.length
        ? supabase
            .from("location_accessibility")
            .select("location_id, feature_key, status_key, note, confirmed_at")
            .in("location_id", locationIds)
            .order("location_id")
            .order("feature_key")
            .returns<LocationAccessibilityRow[]>()
        : { data: [], error: null },
    ]);

  if (virtualRegionsResult.error) {
    throw new Error(
      `Unable to load virtual coverage: ${virtualRegionsResult.error.message}`,
    );
  }

  if (feePoliciesResult.error) {
    throw new Error(
      `Unable to load fee policies: ${feePoliciesResult.error.message}`,
    );
  }

  if (accessibilityRowsResult.error) {
    throw new Error(
      `Unable to load location accessibility: ${accessibilityRowsResult.error.message}`,
    );
  }

  return {
    accessibilityFeatures: accessibilityFeaturesResult.data ?? [],
    accessibilityRows: accessibilityRowsResult.data ?? [],
    availability: availabilityResult.data ?? null,
    completion: normalizeCompletion(completionResult.data),
    contactProcess: contactProcessResult.data ?? null,
    declarationClientGroups: declarationClientGroupsResult.data ?? [],
    declarations: declarationsResult.data ?? [],
    feePolicies: feePoliciesResult.data ?? [],
    locations: locationsResult.data ?? [],
    practiceAffiliations: affiliationsResult.data ?? [],
    serviceRegions: regionsResult.data ?? [],
    serviceTypes: serviceTypesResult.data ?? [],
    virtualRegions: virtualRegionsResult.data ?? [],
    v01Offerings,
  };
}

export async function getContactEnquiriesSectionData(
  supabase: IntakeSupabaseClient,
  counsellorId: string,
): Promise<ContactEnquiriesData> {
  const [
    affiliationsResult,
    contactRoutesResult,
    contactProcessResult,
    offeringsResult,
    completionResult,
  ] = await Promise.all([
    supabase
      .from("counsellor_practice_affiliations")
      .select(
        "id, counsellor_id, practice_id, affiliation_type_key, is_primary, public_visible, ended_on, practices(id, name, slug, practice_type_key, website_url, city, province)",
      )
      .eq("counsellor_id", counsellorId)
      .is("ended_on", null)
      .order("is_primary", { ascending: false })
      .returns<PracticeAffiliationRow[]>(),
    supabase
      .from("contact_routes")
      .select(
        "id, counsellor_id, practice_id, route_type_key, route_value, display_label, is_primary, handoff_key, confirmed_at, public_visible, active, created_at, updated_at",
      )
      .eq("counsellor_id", counsellorId)
      .eq("active", true)
      .order("is_primary", { ascending: false })
      .order("created_at")
      .returns<ContactRouteRow[]>(),
    supabase
      .from("contact_processes")
      .select(
        "counsellor_id, consultation_offered, consultation_mode_key, public_visible, created_at, updated_at",
      )
      .eq("counsellor_id", counsellorId)
      .maybeSingle<ContactProcessRow>(),
    supabase
      .from("service_offerings")
      .select(
        "id, counsellor_id, practice_id, location_id, service_type_key, delivery_mode_key, scope_note, active, public_visible, client_gender_scope_key, client_gender_scope_note",
      )
      .eq("counsellor_id", counsellorId)
      .eq("active", true)
      .in("delivery_mode_key", ["in_person", "virtual"])
      .order("service_type_key")
      .order("delivery_mode_key")
      .returns<ServiceOfferingRow[]>(),
    supabase.rpc("get_my_contact_enquiries_completion"),
  ]);

  if (affiliationsResult.error) {
    throw new Error(
      `Unable to load practice affiliations: ${affiliationsResult.error.message}`,
    );
  }

  if (contactRoutesResult.error) {
    throw new Error(
      `Unable to load contact routes: ${contactRoutesResult.error.message}`,
    );
  }

  if (contactProcessResult.error) {
    throw new Error(
      `Unable to load consultation preferences: ${contactProcessResult.error.message}`,
    );
  }

  if (offeringsResult.error) {
    throw new Error(
      `Unable to load service delivery details: ${offeringsResult.error.message}`,
    );
  }

  if (completionResult.error) {
    throw new Error(
      `Unable to load Contact & enquiries completion: ${completionResult.error.message}`,
    );
  }

  const offeringIds = (offeringsResult.data ?? []).map((offering) => offering.id);
  const feePoliciesResult = offeringIds.length
    ? await supabase
        .from("service_fee_policies")
        .select(
          "id, service_offering_id, fee_cents, currency_code, session_minutes, fee_note, sliding_scale_key, rcc_receipts_available, direct_billing_key, consultation_fee_cents, consultation_minutes, public_visible, active, confirmed_at, confirmation_source_key",
        )
        .in("service_offering_id", offeringIds)
        .eq("active", true)
        .order("service_offering_id")
        .order("session_minutes")
        .returns<ServiceFeePolicyRow[]>()
    : { data: [], error: null };

  if (feePoliciesResult.error) {
    throw new Error(
      `Unable to load consultation terms: ${feePoliciesResult.error.message}`,
    );
  }

  return {
    completion: normalizeContactEnquiriesCompletion(completionResult.data),
    contactProcess: contactProcessResult.data ?? null,
    contactRoutes: contactRoutesResult.data ?? [],
    feePolicies: feePoliciesResult.data ?? [],
    practiceAffiliations: affiliationsResult.data ?? [],
  };
}

export function getWhatYouHelpWithStatusFromCanonical({
  practiceAreas,
}: {
  practiceAreas: CounsellorPracticeAreaRow[];
}): CounsellorWorkspaceStatus {
  if (practiceAreas.length === 0) {
    return "not_started";
  }

  const primaryCount = practiceAreas.filter(
    (area) => area.emphasis_key === "primary",
  ).length;
  const additionalCount = practiceAreas.filter(
    (area) => area.emphasis_key === "additional",
  ).length;
  const hasInvalidEmphasis = practiceAreas.some(
    (area) =>
      area.emphasis_key !== "primary" && area.emphasis_key !== "additional",
  );

  if (
    primaryCount >= 1 &&
    primaryCount <= 3 &&
    additionalCount <= 5 &&
    practiceAreas.length <= 8 &&
    !hasInvalidEmphasis
  ) {
    return "complete";
  }

  return "in_progress";
}

export function getHowYouWorkStatusFromCanonical({
  options,
  questions,
  responses,
}: {
  options: WorkingStyleQuestionOptionRow[];
  questions: WorkingStyleQuestionRow[];
  responses: WorkingStyleQuestionResponseRow[];
}): CounsellorWorkspaceStatus {
  const applicableQuestions = questions.filter(isApplicableWorkingStyleQuestion);

  if (responses.length === 0) {
    return "not_started";
  }

  const activeOptionKeys = new Set(
    options.map((option) => `${option.question_key}:${option.option_key}`),
  );
  const answeredQuestionKeys = new Set(
    responses.flatMap((response) =>
      activeOptionKeys.has(`${response.question_key}:${response.option_key}`)
        ? [response.question_key]
        : [],
    ),
  );

  if (
    applicableQuestions.length > 0 &&
    applicableQuestions.every((question) => answeredQuestionKeys.has(question.key))
  ) {
    return "complete";
  }

  return "in_progress";
}

export function getWhoYouWorkWithStatusFromCanonical({
  serviceDeclarations,
  serviceDeclarationClientGroups,
}: {
  serviceDeclarations: ServiceDeclarationRow[];
  serviceDeclarationClientGroups: ServiceDeclarationClientGroupRow[];
}): CounsellorWorkspaceStatus {
  if (serviceDeclarations.length === 0) {
    return "not_started";
  }

  const groupCountByDeclaration = new Map<string, number>();

  for (const row of serviceDeclarationClientGroups) {
    groupCountByDeclaration.set(
      row.service_type_key,
      (groupCountByDeclaration.get(row.service_type_key) ?? 0) + 1,
    );
  }

  const everyDeclarationHasClientGroup = serviceDeclarations.every(
    (declaration) =>
      (groupCountByDeclaration.get(declaration.service_type_key) ?? 0) > 0,
  );
  const everyDeclarationHasGenderScope = serviceDeclarations.every(
    (declaration) =>
      isClientGenderScopeKey(declaration.client_gender_scope_key),
  );
  const otherGenderScopeHasMissingNote = serviceDeclarations.some(
    (declaration) =>
      declaration.client_gender_scope_key === "other" &&
      !declaration.client_gender_scope_note?.trim(),
  );

  if (
    everyDeclarationHasClientGroup &&
    everyDeclarationHasGenderScope &&
    !otherGenderScopeHasMissingNote
  ) {
    return "complete";
  }

  return "in_progress";
}

export function getFaithStatusFromCanonical({
  faithProfile,
}: {
  faithProfile: FaithPracticeProfileRow | null;
}): CounsellorWorkspaceStatus {
  if (!faithProfile) {
    return "not_started";
  }

  const value: FaithProfileValue = {
    claimsIslamicCounselling: faithProfile.claims_islamic_counselling,
    discussionComfortKey: isDiscussionComfortKey(
      faithProfile.discussion_comfort_key,
    )
      ? faithProfile.discussion_comfort_key
      : "",
    initiationKey: isInitiationKey(faithProfile.initiation_key)
      ? faithProfile.initiation_key
      : "",
    initiationNote: faithProfile.initiation_note ?? "",
    integrationKey: isIntegrationKey(faithProfile.integration_key)
      ? faithProfile.integration_key
      : "",
    integrationModeKey: isIntegrationModeKey(faithProfile.integration_mode_key)
      ? faithProfile.integration_mode_key
      : "",
    islamicCounsellingDefinition:
      faithProfile.islamic_counselling_definition ?? "",
  };

  return faithProfileIsComplete(normalizeFaithProfileValue(value))
    ? "complete"
    : "in_progress";
}

const CLIENT_GENDER_SCOPE_KEYS = [
  "not_specified",
  "all_genders",
  "women_only",
  "men_only",
  "other",
] as const;

function isClientGenderScopeKey(value: string | null | undefined) {
  return CLIENT_GENDER_SCOPE_KEYS.some((key) => key === value);
}

function findDeclarationOfferingDiscrepancies({
  serviceDeclarationClientGroups,
  serviceDeclarations,
  serviceOfferingClientGroups,
  serviceOfferings,
}: {
  serviceDeclarationClientGroups: ServiceDeclarationClientGroupRow[];
  serviceDeclarations: ServiceDeclarationRow[];
  serviceOfferingClientGroups: ServiceOfferingClientGroupRow[];
  serviceOfferings: ServiceOfferingRow[];
}): DeclarationOfferingDiscrepancy[] {
  const declarationsByType = new Map(
    serviceDeclarations.map((declaration) => [
      declaration.service_type_key,
      declaration,
    ]),
  );
  const offeringsByType = new Map<string, ServiceOfferingRow[]>();

  for (const offering of serviceOfferings) {
    const rows = offeringsByType.get(offering.service_type_key) ?? [];
    rows.push(offering);
    offeringsByType.set(offering.service_type_key, rows);
  }

  const discrepancies: DeclarationOfferingDiscrepancy[] = [];

  for (const [serviceTypeKey, offerings] of offeringsByType) {
    const declaration = declarationsByType.get(serviceTypeKey);

    if (!declaration) {
      discrepancies.push({
        serviceTypeKey,
        reason: "missing_declaration",
      });
      continue;
    }

    const declarationSignatureValue = JSON.stringify({
      clientGroupKeys: clientGroupsForDeclaration(
        serviceTypeKey,
        serviceDeclarationClientGroups,
      ),
      clientGenderScopeKey: declaration.client_gender_scope_key,
      clientGenderScopeNote: declaration.client_gender_scope_note ?? "",
    });

    const hasDifferentOfferingSignature = offerings.some((offering) => {
      const offeringSignatureValue = JSON.stringify({
        clientGroupKeys: clientGroupsForOffering(
          offering.id,
          serviceOfferingClientGroups,
        ),
        clientGenderScopeKey: offering.client_gender_scope_key,
        clientGenderScopeNote: offering.client_gender_scope_note ?? "",
      });

      return offeringSignatureValue !== declarationSignatureValue;
    });

    if (hasDifferentOfferingSignature) {
      discrepancies.push({
        serviceTypeKey,
        reason: "different_delivery_eligibility",
      });
    }
  }

  return discrepancies;
}

function clientGroupsForDeclaration(
  serviceTypeKey: string,
  serviceDeclarationClientGroups: ServiceDeclarationClientGroupRow[],
) {
  return serviceDeclarationClientGroups
    .filter((row) => row.service_type_key === serviceTypeKey)
    .map((row) => row.client_group_key)
    .sort();
}

function clientGroupsForOffering(
  serviceOfferingId: string,
  serviceOfferingClientGroups: ServiceOfferingClientGroupRow[],
) {
  return serviceOfferingClientGroups
    .filter((row) => row.service_offering_id === serviceOfferingId)
    .map((row) => row.client_group_key)
    .sort();
}
