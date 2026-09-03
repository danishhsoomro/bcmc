import type { Json } from "../../../supabase/database.types";
import type {
  AccessibilityFeatureRow,
  ContactProcessRow,
  CounsellorAvailabilityRow,
  LocationAccessibilityRow,
  PracticeAffiliationRow,
  ServiceDeclarationClientGroupRow,
  ServiceDeclarationRow,
  ServiceFeePolicyRow,
  ServiceLocationRow,
  ServiceOfferingRow,
  ServiceOfferingVirtualRegionRow,
  ServiceRegionRow,
  TaxonomyRow,
} from "./types";

export type PracticalDetailsCompletionItem = {
  code?: string;
  delivery_mode_key?: string;
  location_id?: string;
  offering_id?: string;
  service_offering_id?: string;
  service_type_key?: string;
  [key: string]: Json | undefined;
};

export type PracticalDetailsCompletion = {
  complete: boolean;
  counts: {
    authored_offerings?: number;
    declarations?: number;
    in_person_locations?: number;
    [key: string]: number | undefined;
  };
  missing: PracticalDetailsCompletionItem[];
  needs_attention: PracticalDetailsCompletionItem[];
  status: "complete" | "in_progress" | "needs_attention";
};

export type PracticalDetailsData = {
  accessibilityFeatures: AccessibilityFeatureRow[];
  accessibilityRows: LocationAccessibilityRow[];
  availability: CounsellorAvailabilityRow | null;
  completion: PracticalDetailsCompletion;
  contactProcess: ContactProcessRow | null;
  declarationClientGroups: ServiceDeclarationClientGroupRow[];
  declarations: ServiceDeclarationRow[];
  feePolicies: ServiceFeePolicyRow[];
  locations: ServiceLocationRow[];
  practiceAffiliations: PracticeAffiliationRow[];
  serviceRegions: ServiceRegionRow[];
  serviceTypes: TaxonomyRow[];
  virtualRegions: ServiceOfferingVirtualRegionRow[];
  v01Offerings: ServiceOfferingRow[];
};

export type PracticalActionStatus = "idle" | "success" | "error";

export type PracticalActionState = {
  fieldErrors: Record<string, string>;
  message: string;
  status: PracticalActionStatus;
};

export const emptyPracticalActionState: PracticalActionState = {
  fieldErrors: {},
  message: "",
  status: "idle",
};

export const SLIDING_SCALE_OPTIONS = [
  { key: "available", label: "Available" },
  { key: "limited", label: "Limited spaces" },
  { key: "currently_full", label: "Currently full" },
  { key: "not_offered", label: "Not offered" },
  { key: "ask", label: "Ask me" },
] as const;

export const DIRECT_BILLING_OPTIONS = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
  { key: "ask", label: "Ask me" },
] as const;

export const CONSULTATION_MODE_OPTIONS = [
  { key: "phone", label: "Phone" },
  { key: "video", label: "Video" },
  { key: "phone_or_video", label: "Phone or video" },
] as const;

export const AVAILABILITY_OPTIONS = [
  { key: "accepting", label: "Accepting new clients" },
  { key: "limited", label: "Limited availability" },
  { key: "waitlist", label: "Waitlist available" },
  { key: "not_accepting", label: "Not currently accepting new clients" },
] as const;

export function normalizeCompletion(value: Json): PracticalDetailsCompletion {
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

export function serviceTypeLabel(
  serviceTypeKey: string,
  serviceTypes: Pick<TaxonomyRow, "key" | "label">[],
) {
  return (
    serviceTypes.find((serviceType) => serviceType.key === serviceTypeKey)
      ?.label ?? labelFromKey(serviceTypeKey)
  );
}

export function locationLabel(location: Pick<
  ServiceLocationRow,
  "city" | "neighbourhood_or_area" | "label"
>) {
  return [location.city, location.neighbourhood_or_area]
    .filter(Boolean)
    .join(" · ") || location.label || "Saved location";
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

export function offeringLabel({
  locations,
  offering,
  serviceTypes,
}: {
  locations: ServiceLocationRow[];
  offering: ServiceOfferingRow;
  serviceTypes: TaxonomyRow[];
}) {
  const service = serviceTypeLabel(offering.service_type_key, serviceTypes);

  if (offering.delivery_mode_key === "virtual") {
    return `${service} · Online`;
  }

  const location = locations.find((row) => row.id === offering.location_id);
  return `${service} · ${location ? locationLabel(location) : "In person"}`;
}

export function formatCents(cents: number | null | undefined) {
  if (typeof cents !== "number" || !Number.isFinite(cents)) {
    return "";
  }

  return cents % 100 === 0
    ? String(cents / 100)
    : (cents / 100).toFixed(2);
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

export function practicalDetailsFormKey(data: PracticalDetailsData) {
  return JSON.stringify({
    accessibility: data.accessibilityRows.map((row) => [
      row.location_id,
      row.feature_key,
      row.status_key,
      row.note,
    ]),
    availability: [
      data.availability?.status_key,
      data.availability?.status_note,
      data.availability?.confirmed_at,
    ],
    consultation: [
      data.contactProcess?.consultation_offered,
      data.contactProcess?.consultation_mode_key,
      data.feePolicies.map((fee) => [
        fee.service_offering_id,
        fee.consultation_fee_cents,
        fee.consultation_minutes,
      ]),
    ],
    fees: data.feePolicies.map((fee) => [
      fee.service_offering_id,
      fee.fee_cents,
      fee.currency_code,
      fee.session_minutes,
      fee.sliding_scale_key,
      fee.rcc_receipts_available,
      fee.direct_billing_key,
      fee.fee_note,
    ]),
    locations: data.locations.map((location) => [
      location.id,
      location.practice_id,
      location.city,
      location.neighbourhood_or_area,
    ]),
    offerings: data.v01Offerings.map((offering) => [
      offering.id,
      offering.service_type_key,
      offering.delivery_mode_key,
      offering.location_id,
      offering.practice_id,
    ]),
  });
}

export function completionMessage(
  item: PracticalDetailsCompletionItem,
  data: Pick<
    PracticalDetailsData,
    "availability" | "locations" | "serviceTypes" | "v01Offerings"
  >,
) {
  const code = item.code;
  const offeringId =
    stringValue(item.offering_id) ?? stringValue(item.service_offering_id);
  const offering = offeringId
    ? data.v01Offerings.find((row) => row.id === offeringId)
    : null;
  const serviceTypeKey =
    stringValue(item.service_type_key) ?? offering?.service_type_key ?? "";
  const service = serviceTypeKey
    ? serviceTypeLabel(serviceTypeKey, data.serviceTypes)
    : "this service";
  const locationId = stringValue(item.location_id) ?? offering?.location_id;
  const location = locationId
    ? data.locations.find((row) => row.id === locationId)
    : null;
  const offeringText = offering
    ? offeringLabel({
        locations: data.locations,
        offering,
        serviceTypes: data.serviceTypes,
      })
    : service;

  if (code === "service_configuration_missing") {
    return `Choose how you offer ${service}.`;
  }

  if (code === "in_person_location_incomplete") {
    return location
      ? `Finish the location details for ${locationLabel(location)}.`
      : "Finish the location used for your in-person service.";
  }

  if (code === "virtual_bc_coverage_missing") {
    return `Confirm online counselling is available in BC for ${service}.`;
  }

  if (code === "fee_policy_missing") {
    return `Add the fee for ${offeringText}.`;
  }

  if (code === "fee_policy_incomplete") {
    return `Finish the fee and payment details for ${offeringText}.`;
  }

  if (code === "fee_confirmation_required") {
    return `Confirm the current fee for ${offeringText}.`;
  }

  if (code === "fee_confirmation_stale") {
    return `Please reconfirm the fee for ${offeringText}.`;
  }

  if (code === "consultation_unanswered") {
    return "Tell us whether you offer a consultation.";
  }

  if (code === "consultation_mode_missing") {
    return "Choose how you offer consultations.";
  }

  if (code === "consultation_terms_missing") {
    return "Add the consultation length and cost.";
  }

  if (code === "availability_confirmation_required") {
    return hasMeaningfulAvailability(data.availability)
      ? "Confirm your current availability."
      : "Add your current availability.";
  }

  if (code === "availability_confirmation_stale") {
    return "Please reconfirm your current availability.";
  }

  if (code === "accessibility_review_required") {
    return location
      ? `Review accessibility for ${locationLabel(location)}.`
      : "Review accessibility for your in-person location.";
  }

  return "Review this saved detail before completing the section.";
}

function hasMeaningfulAvailability(
  availability: Pick<CounsellorAvailabilityRow, "status_key" | "status_note"> | null,
) {
  return Boolean(
    availability &&
      ((availability.status_key && availability.status_key !== "unknown") ||
        availability.status_note?.trim()),
  );
}

function completionItems(value: Json | undefined): PracticalDetailsCompletionItem[] {
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

function labelFromKey(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
