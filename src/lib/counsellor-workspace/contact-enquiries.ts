import type { Json } from "../../../supabase/database.types";
import type {
  ContactProcessRow,
  ContactRouteRow,
  PracticeAffiliationRow,
  ServiceFeePolicyRow,
} from "./types";

export type ContactEnquiriesCompletionItem = {
  code?: string;
  [key: string]: Json | undefined;
};

export type ContactEnquiriesCompletion = {
  complete: boolean;
  counts: Record<string, number | undefined>;
  missing: ContactEnquiriesCompletionItem[];
  needs_attention: ContactEnquiriesCompletionItem[];
  status: "complete" | "in_progress" | "needs_attention";
};

export type ContactEnquiriesData = {
  completion: ContactEnquiriesCompletion;
  contactProcess: ContactProcessRow | null;
  contactRoutes: ContactRouteRow[];
  feePolicies: ServiceFeePolicyRow[];
  practiceAffiliations: PracticeAffiliationRow[];
};

export type ContactEnquiriesActionStatus = "idle" | "success" | "error";

export type ContactEnquiriesActionState = {
  fieldErrors: Record<string, string>;
  message: string;
  status: ContactEnquiriesActionStatus;
};

export const emptyContactEnquiriesActionState: ContactEnquiriesActionState = {
  fieldErrors: {},
  message: "",
  status: "idle",
};

export const CONTACT_ROUTE_TYPE_OPTIONS = [
  { key: "secure_form", label: "Secure contact form" },
  { key: "website", label: "Website" },
  { key: "email", label: "Professional email" },
  { key: "phone", label: "Professional phone" },
] as const;

export type ContactRouteTypeKey =
  (typeof CONTACT_ROUTE_TYPE_OPTIONS)[number]["key"];

export type ContactManagementKey = "practice" | "self";

export function normalizeContactEnquiriesCompletion(
  value: Json,
): ContactEnquiriesCompletion {
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
    counts: isRecord(recordValue.counts)
      ? Object.fromEntries(
          Object.entries(recordValue.counts).flatMap(([key, count]) =>
            typeof count === "number" ? [[key, count]] : [],
          ),
        )
      : {},
    missing: completionItems(recordValue.missing),
    needs_attention: completionItems(recordValue.needs_attention),
    status,
  };
}

export function primaryContactRoute(routes: ContactRouteRow[]) {
  const publicActiveRoutes = routes.filter(
    (route) => route.active && route.public_visible,
  );

  return (
    publicActiveRoutes.find((route) => route.is_primary) ??
    publicActiveRoutes[0] ??
    null
  );
}

export function contactCompletionMessage(item: ContactEnquiriesCompletionItem) {
  switch (item.code) {
    case "contact_route_missing":
      return "Add a contact route for prospective clients.";
    case "preferred_contact_route_missing":
      return "Choose the contact route BCMC should use.";
    case "contact_confirmation_required":
      return "Confirm this contact route is still current.";
    case "contact_confirmation_stale":
      return "Please reconfirm this contact route.";
    case "multiple_preferred_contact_routes":
      return "Some saved contact details need review before this section can be completed.";
    case "unsupported_contact_route_type":
      return "Review the saved contact method before this section can be completed.";
    case "contact_route_invalid":
      return "Review the saved contact destination.";
    case "contact_practice_invalid":
      return "Review the practice linked to this contact route.";
    default:
      return "Review this saved contact detail before completing the section.";
  }
}

export function hasStructuralContactRouteAttention(
  completion: ContactEnquiriesCompletion,
) {
  return completion.needs_attention.some((item) =>
    item.code
      ? [
          "multiple_preferred_contact_routes",
          "unsupported_contact_route_type",
          "contact_route_invalid",
          "contact_practice_invalid",
        ].includes(item.code)
      : false,
  );
}

export function contactRouteTypeLabel(routeTypeKey: string | null | undefined) {
  return (
    CONTACT_ROUTE_TYPE_OPTIONS.find((option) => option.key === routeTypeKey)
      ?.label ?? "Contact route"
  );
}

export function contactManagementFromRoute(
  route: Pick<ContactRouteRow, "handoff_key" | "practice_id"> | null,
): ContactManagementKey {
  return route?.handoff_key === "practice_managed" || route?.practice_id
    ? "practice"
    : "self";
}

export function handoffKeyForContactRoute({
  managementKey,
  routeTypeKey,
}: {
  managementKey: ContactManagementKey;
  routeTypeKey: ContactRouteTypeKey;
}) {
  if (managementKey === "practice") {
    return "practice_managed";
  }

  return routeTypeKey === "email" || routeTypeKey === "phone"
    ? "direct"
    : "external";
}

export function displayContactDestination(
  routeTypeKey: string | null | undefined,
  value: string | null | undefined,
) {
  if (!value) {
    return "";
  }

  if (routeTypeKey === "email" && value.toLowerCase().startsWith("mailto:")) {
    return value.slice("mailto:".length);
  }

  if (routeTypeKey === "phone" && value.toLowerCase().startsWith("tel:")) {
    return value.slice("tel:".length);
  }

  return value;
}

export function confirmedDateLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function consultationReadOnlySummary({
  contactProcess,
  feePolicies,
}: {
  contactProcess: ContactProcessRow | null;
  feePolicies: ServiceFeePolicyRow[];
}) {
  if (!contactProcess?.consultation_offered) {
    return null;
  }

  const feePolicy = feePolicies.find(
    (policy) =>
      policy.consultation_fee_cents !== null ||
      policy.consultation_minutes !== null,
  );
  const minutes = feePolicy?.consultation_minutes;
  const feeCents = feePolicy?.consultation_fee_cents;
  const mode = consultationModeLabel(contactProcess.consultation_mode_key);

  if (feeCents === 0 && minutes && mode) {
    return `Your profile currently says you offer a free ${minutes}-minute ${mode.toLowerCase()} consultation.`;
  }

  if (feeCents === 0 && minutes) {
    return `Your profile currently says you offer a free ${minutes}-minute consultation.`;
  }

  if (minutes && mode) {
    return `Your profile currently says you offer a ${minutes}-minute ${mode.toLowerCase()} consultation.`;
  }

  if (mode) {
    return `Your profile currently says you offer a ${mode.toLowerCase()} consultation.`;
  }

  return "Your profile currently says you offer a consultation.";
}

export function practiceName(
  practiceId: string | null,
  affiliations: PracticeAffiliationRow[],
) {
  if (!practiceId) {
    return null;
  }

  return (
    affiliations.find((affiliation) => affiliation.practice_id === practiceId)
      ?.practices?.name ?? null
  );
}

export function isContactRouteTypeKey(
  value: string,
): value is ContactRouteTypeKey {
  return CONTACT_ROUTE_TYPE_OPTIONS.some((option) => option.key === value);
}

function consultationModeLabel(value: string | null | undefined) {
  if (value === "phone") {
    return "phone";
  }

  if (value === "video") {
    return "video";
  }

  if (value === "phone_or_video") {
    return "phone or video";
  }

  return null;
}

function completionItems(value: Json | undefined): ContactEnquiriesCompletionItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => (isRecord(item) ? [item] : []));
}

function isRecord(value: unknown): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
