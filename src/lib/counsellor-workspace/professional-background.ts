import type { Database, Json } from "../../../supabase/database.types";
import type {
  CounsellorTherapeuticApproachRow,
  EducationRecordRow,
  ProfessionalCredentialRow,
  ProfessionalExperienceRow,
  TherapeuticApproachTaxonomyRow,
  TrainingCertificationRow,
} from "./types";

export type ProfessionalBackgroundCompletion = {
  complete: boolean;
  missing: string[];
  needs_attention: string[];
  status: "complete" | "in_progress" | "needs_attention";
};

export type ProfessionalBackgroundData = {
  approachTaxonomy: TherapeuticApproachTaxonomyRow[];
  completion: ProfessionalBackgroundCompletion;
  credentials: ProfessionalCredentialRow[];
  credentialVerifications: Database["public"]["Views"]["v_public_credential_verification"]["Row"][];
  credentialTypes: { active: boolean; issuer_name: string | null; key: string; label: string }[];
  educationRecords: EducationRecordRow[];
  experience: ProfessionalExperienceRow | null;
  selectedApproaches: CounsellorTherapeuticApproachRow[];
  trainingCertifications: TrainingCertificationRow[];
};

export type ProfessionalBackgroundActionState = {
  fieldErrors: Record<string, string>;
  message: string;
  status: "idle" | "success" | "error";
};

export const emptyProfessionalBackgroundActionState: ProfessionalBackgroundActionState =
  {
    fieldErrors: {},
    message: "",
    status: "idle",
  };

export const APPROACH_RELATIONSHIPS = [
  {
    key: "uses",
    label: "Uses this approach",
    description: "I actively use this approach in counselling when appropriate.",
  },
  {
    key: "informed_by",
    label: "Practice informed by this approach",
    description: "This approach informs how I understand or support clients.",
  },
] as const;

export type ApproachRelationshipKey =
  (typeof APPROACH_RELATIONSHIPS)[number]["key"];

export function isApproachRelationshipKey(
  value: string,
): value is ApproachRelationshipKey {
  return APPROACH_RELATIONSHIPS.some((option) => option.key === value);
}

export function normalizeProfessionalBackgroundCompletion(
  value: Json,
): ProfessionalBackgroundCompletion {
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
    missing: completionCodes(recordValue.missing),
    needs_attention: completionCodes(recordValue.needs_attention),
    status,
  };
}

export function professionalBackgroundCompletionMessage(code: string) {
  switch (code) {
    case "education_required":
      return "Add at least one relevant qualification.";
    case "practice_start_year_required":
      return "Add the year your post-master's clinical practice began.";
    case "experience_review_required":
      return "Review your clinical experience.";
    case "approaches_review_required":
      return "Review the approaches section, even if you do not use a named approach.";
    case "rcc_verification_requires_bcmc_review":
      return "BCMC needs to review your RCC credential information.";
    case "multiple_verified_rcc_credentials":
      return "BCMC needs to review your credential information before this section can be completed.";
    case "practice_start_year_invalid":
      return "Review your clinical practice start year.";
    case "therapeutic_approaches_require_review":
      return "Review your saved therapeutic approaches.";
    case "invalid_experience_year":
      return "Review your clinical practice start year.";
    case "inactive_approach":
      return "Review your saved therapeutic approaches.";
    case "credential_attention_required":
      return "BCMC needs to review your RCC credential information.";
    case "counsellor_link_attention_required":
      return "This account needs a single linked counsellor profile before this section can be completed.";
    default:
      return "Review this professional background detail before completing the section.";
  }
}

export function publicApproachName({
  key,
  label,
}: {
  key: string;
  label: string;
}) {
  if (key === "cbt_informed") {
    return "CBT";
  }

  if (key === "act_informed") {
    return "ACT";
  }

  if (key === "attachment_oriented") {
    return "Attachment-oriented";
  }

  return label
    .replace(/-informed$/i, "")
    .replace(/\s+informed$/i, "")
    .trim();
}

export function experiencePreview(
  experience: Pick<
    ProfessionalExperienceRow,
    "post_masters_practice_start_year" | "post_masters_years"
  > | null,
) {
  const startYear = experience?.post_masters_practice_start_year;

  if (typeof startYear === "number") {
    return `Practising post-master's clinical counselling since ${startYear}`;
  }

  const legacyYears = experience?.post_masters_years;

  if (typeof legacyYears === "number" && Number.isFinite(legacyYears)) {
    return `${legacyYears} years of post-master's clinical practice`;
  }

  return null;
}

function completionCodes(value: Json | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) {
      return [item.trim()];
    }

    if (isRecord(item)) {
      const code = stringValue(item.code);
      return code ? [code] : [];
    }

    return [];
  });
}

function isRecord(value: unknown): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
