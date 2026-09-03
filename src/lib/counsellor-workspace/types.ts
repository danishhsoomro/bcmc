import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "../../../supabase/database.types";

export type CounsellorAccount =
  Database["public"]["Functions"]["get_my_counsellor_accounts"]["Returns"][number];

export type CounsellorWorkspaceStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "needs_attention";

export type CounsellorOverallOnboardingStatus =
  | "not_started"
  | "in_progress"
  | "ready_for_review"
  | "submitted"
  | "needs_changes"
  | "complete";

export type CounsellorWorkspaceSectionKey =
  | "practice"
  | "who_you_work_with"
  | "what_you_help_with"
  | "how_you_work"
  | "faith"
  | "cultural_familiarity"
  | "practical_details"
  | "availability_contact"
  | "professional_background"
  | "your_profile";

export type CounsellorWorkspaceSection = {
  key: CounsellorWorkspaceSectionKey;
  title: string;
  href: string;
  implemented: boolean;
};

export type CounsellorProfileRow = Pick<
  Tables<"counsellors">,
  | "id"
  | "slug"
  | "display_name"
  | "preferred_name"
  | "pronouns"
  | "gender_key"
  | "gender_self_description"
  | "lifecycle_status"
  | "publication_status"
  | "published_at"
>;

export type ProfessionalCredentialRow = Pick<
  Tables<"professional_credentials">,
  | "id"
  | "counsellor_id"
  | "credential_type_key"
  | "issuer_name"
  | "status_key"
  | "is_primary"
  | "public_visible"
>;

export type CredentialTypeRow = Pick<
  Tables<"credential_types">,
  "key" | "label" | "issuer_name" | "active"
>;

export type TaxonomyRow = Pick<
  Tables<"client_groups">,
  "key" | "label" | "definition" | "active" | "sort_order"
>;

export type PracticeAreaTaxonomyRow = Pick<
  Tables<"practice_area_taxonomy">,
  "key" | "label" | "short_description" | "active" | "sort_order"
>;

export type CounsellorPracticeAreaRow = Tables<"counsellor_practice_areas">;

export type WorkingStyleConstructRow = Tables<"working_style_constructs">;

export type WorkingStyleQuestionRow = Tables<"working_style_questions">;

export type WorkingStyleQuestionOptionRow =
  Tables<"working_style_question_options">;

export type WorkingStyleQuestionResponseRow =
  Tables<"working_style_question_responses">;

export type WorkingStyleContextReasonRow =
  Tables<"working_style_context_reasons">;

export type WorkingStyleResponseContextRow =
  Tables<"working_style_response_contexts">;

export type FaithPracticeProfileRow = Pick<
  Tables<"faith_practice_profiles">,
  | "counsellor_id"
  | "discussion_comfort_key"
  | "discussion_comfort_note"
  | "initiation_key"
  | "initiation_note"
  | "integration_key"
  | "integration_note"
  | "integration_mode_key"
  | "claims_islamic_counselling"
  | "islamic_counselling_definition"
>;

export type CulturalFamiliarityTaxonomyRow = Pick<
  Tables<"cultural_familiarity_taxonomy">,
  | "key"
  | "label"
  | "short_description"
  | "context_type_key"
  | "active"
  | "sort_order"
>;

export type CounsellorCulturalFamiliarityRow = Pick<
  Tables<"counsellor_cultural_familiarity">,
  | "counsellor_id"
  | "familiarity_key"
  | "note"
  | "public_visible"
  | "active"
  | "created_at"
  | "updated_at"
>;

export type AccessibilityFeatureRow = Pick<
  Tables<"accessibility_features">,
  "key" | "label" | "definition" | "active" | "sort_order"
>;

export type LocationAccessibilityRow = Pick<
  Tables<"location_accessibility">,
  "location_id" | "feature_key" | "status_key" | "note" | "confirmed_at"
>;

export type ServiceDeclarationRow =
  Tables<"counsellor_service_declarations">;

export type ServiceDeclarationClientGroupRow =
  Tables<"counsellor_service_declaration_client_groups">;

export type ServiceOfferingRow = Pick<
  Tables<"service_offerings">,
  | "id"
  | "counsellor_id"
  | "practice_id"
  | "location_id"
  | "service_type_key"
  | "delivery_mode_key"
  | "scope_note"
  | "active"
  | "public_visible"
  | "client_gender_scope_key"
  | "client_gender_scope_note"
>;

export type ServiceOfferingClientGroupRow = Pick<
  Tables<"service_offering_client_groups">,
  "service_offering_id" | "client_group_key"
>;

export type ServiceLocationRow = Pick<
  Tables<"service_locations">,
  | "id"
  | "counsellor_id"
  | "practice_id"
  | "label"
  | "city"
  | "province"
  | "country_code"
  | "neighbourhood_or_area"
  | "active"
  | "public_visible"
>;

export type ServiceRegionRow = Pick<
  Tables<"service_regions">,
  "key" | "label" | "region_type_key" | "country_code" | "active" | "sort_order"
>;

export type ServiceOfferingVirtualRegionRow = Pick<
  Tables<"service_offering_virtual_regions">,
  "service_offering_id" | "region_key"
>;

export type ServiceFeePolicyRow = Pick<
  Tables<"service_fee_policies">,
  | "id"
  | "service_offering_id"
  | "fee_cents"
  | "currency_code"
  | "session_minutes"
  | "fee_note"
  | "sliding_scale_key"
  | "rcc_receipts_available"
  | "direct_billing_key"
  | "consultation_fee_cents"
  | "consultation_minutes"
  | "public_visible"
  | "active"
  | "confirmed_at"
  | "confirmation_source_key"
>;

export type ContactProcessRow = Pick<
  Tables<"contact_processes">,
  | "counsellor_id"
  | "consultation_offered"
  | "consultation_mode_key"
  | "public_visible"
  | "created_at"
  | "updated_at"
>;

export type ContactRouteRow = Pick<
  Tables<"contact_routes">,
  | "id"
  | "counsellor_id"
  | "practice_id"
  | "route_type_key"
  | "route_value"
  | "display_label"
  | "is_primary"
  | "handoff_key"
  | "confirmed_at"
  | "public_visible"
  | "active"
  | "created_at"
  | "updated_at"
>;

export type CounsellorAvailabilityRow = Pick<
  Tables<"counsellor_availability">,
  | "counsellor_id"
  | "status_key"
  | "status_note"
  | "confirmed_at"
  | "confirmation_source_key"
  | "public_visible"
>;

export type PracticeAffiliationRow = Pick<
  Tables<"counsellor_practice_affiliations">,
  | "id"
  | "counsellor_id"
  | "practice_id"
  | "affiliation_type_key"
  | "is_primary"
  | "public_visible"
  | "ended_on"
> & {
  practices: Pick<
    Tables<"practices">,
    | "id"
    | "name"
    | "slug"
    | "practice_type_key"
    | "website_url"
    | "city"
    | "province"
  > | null;
};

export type EducationRecordRow = Pick<
  Tables<"education_records">,
  | "id"
  | "counsellor_id"
  | "degree_title"
  | "field_of_study"
  | "institution_name"
  | "completion_year"
  | "country_code"
  | "public_visible"
  | "sort_order"
>;

export type ProfessionalExperienceRow = Pick<
  Tables<"professional_experience">,
  | "counsellor_id"
  | "post_masters_practice_start_year"
  | "post_masters_years"
  | "as_of_date"
  | "experience_note"
  | "public_visible"
>;

export type TherapeuticApproachTaxonomyRow = Pick<
  Tables<"therapeutic_approach_taxonomy">,
  "key" | "label" | "short_description" | "active" | "sort_order"
>;

export type CounsellorTherapeuticApproachRow = Pick<
  Tables<"counsellor_therapeutic_approaches">,
  | "counsellor_id"
  | "approach_key"
  | "relationship_key"
  | "public_visible"
  | "active"
>;

export type TrainingCertificationRow = Pick<
  Tables<"training_certifications">,
  | "id"
  | "record_type_key"
  | "title"
  | "provider_name"
  | "completion_year"
  | "expiry_date"
  | "evidence_status_key"
  | "public_visible"
  | "active"
  | "sort_order"
>;

export type OnboardingRpcRow =
  Database["public"]["Functions"]["get_my_counsellor_onboarding"]["Returns"][number];

export type DeclarationOfferingDiscrepancy = {
  serviceTypeKey: string;
  reason: "missing_declaration" | "different_delivery_eligibility";
};

export type IntakeSupabaseClient = SupabaseClient<Database>;
