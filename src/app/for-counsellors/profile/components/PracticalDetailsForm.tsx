"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  CircleAlert,
  CircleCheck,
  Pencil,
  Plus,
  X,
} from "lucide-react";

import {
  completePracticalDetails,
  savePracticalAvailability,
  savePracticalConsultation,
  savePracticalFeePolicies,
  savePracticalLocation,
  savePracticalLocationAccessibility,
  savePracticalServiceConfigurations,
} from "../actions";
import {
  AVAILABILITY_OPTIONS,
  CONSULTATION_MODE_OPTIONS,
  DIRECT_BILLING_OPTIONS,
  SLIDING_SCALE_OPTIONS,
  completionMessage,
  confirmedDateLabel,
  emptyPracticalActionState,
  formatCents,
  locationLabel,
  offeringLabel,
  practiceName,
  serviceTypeLabel,
  type PracticalActionState,
  type PracticalDetailsData,
} from "@/lib/counsellor-workspace/practical-details";

type ServiceConfig = {
  inPerson: boolean;
  locationId: string;
  serviceTypeKey: string;
  virtual: boolean;
  virtualPracticeId: string;
};

type FeeValue = {
  directBillingKey: string;
  feeDollars: string;
  feeNote: string;
  offeringId: string;
  rccReceipts: string;
  sessionMinutes: string;
  slidingScaleKey: string;
};

type AccessibilityValue = {
  featureKey: string;
  note: string;
  selected: boolean;
};

type ConsultationValue = ReturnType<typeof consultationValueFromData>;

type FeeSummaryGroup = {
  directBillingLabel: string;
  feeDollars: string;
  feeNote: string;
  key: string;
  offerings: PracticalDetailsData["v01Offerings"];
  rccLabel: string;
  sessionMinutes: number | null;
  slidingScaleLabel: string;
};

type PracticalView =
  | "services"
  | "fees"
  | "availability"
  | "accessibility"
  | "review";

type LocalAreaStatus =
  | "ready"
  | "needs_confirmation"
  | "needs_review"
  | "needs_attention"
  | "not_needed";

const SERVICE_PROBLEM_CODES = new Set([
  "service_configuration_missing",
  "in_person_location_incomplete",
  "virtual_bc_coverage_missing",
]);

const FEE_PROBLEM_CODES = new Set([
  "fee_policy_missing",
  "fee_policy_incomplete",
  "fee_confirmation_required",
  "fee_confirmation_stale",
]);

const CONSULTATION_PROBLEM_CODES = new Set([
  "consultation_unanswered",
  "consultation_mode_missing",
  "consultation_terms_missing",
]);

const AVAILABILITY_PROBLEM_CODES = new Set([
  "availability_confirmation_required",
  "availability_confirmation_stale",
]);

const ACCESSIBILITY_PROBLEM_CODES = new Set(["accessibility_review_required"]);

const LOCAL_VIEWS: {
  key: PracticalView;
  label: string;
  shortLabel: string;
}[] = [
  { key: "services", label: "Services & locations", shortLabel: "Services" },
  { key: "fees", label: "Fees & consultation", shortLabel: "Fees" },
  { key: "availability", label: "Availability", shortLabel: "Availability" },
  { key: "accessibility", label: "Accessibility", shortLabel: "Accessibility" },
  { key: "review", label: "Review", shortLabel: "Review" },
];

export function PracticalDetailsForm({ data }: { data: PracticalDetailsData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [serviceState, serviceAction] = useActionState(
    savePracticalServiceConfigurations,
    emptyPracticalActionState,
  );
  const [locationState, locationAction] = useActionState(
    savePracticalLocation,
    emptyPracticalActionState,
  );
  const [feeState, feeAction] = useActionState(
    savePracticalFeePolicies,
    emptyPracticalActionState,
  );
  const [consultationState, consultationAction] = useActionState(
    savePracticalConsultation,
    emptyPracticalActionState,
  );
  const [availabilityState, availabilityAction] = useActionState(
    savePracticalAvailability,
    emptyPracticalActionState,
  );
  const [accessibilityState, accessibilityAction] = useActionState(
    savePracticalLocationAccessibility,
    emptyPracticalActionState,
  );
  const [completionState, completionAction] = useActionState(
    completePracticalDetails,
    emptyPracticalActionState,
  );
  const previousServiceStatusRef = useRef(serviceState.status);

  const completionCodes = useMemo(() => completionCodeSet(data), [data]);
  const [editingServices, setEditingServices] = useState(() =>
    hasAnyCode(completionCodes, SERVICE_PROBLEM_CODES),
  );
  const [editingFees, setEditingFees] = useState(() =>
    hasAnyCode(completionCodes, FEE_PROBLEM_CODES),
  );
  const [editingConsultation, setEditingConsultation] = useState(() =>
    hasAnyCode(completionCodes, CONSULTATION_PROBLEM_CODES),
  );
  const [editingAvailability, setEditingAvailability] = useState(() =>
    !hasMeaningfulAvailability(data),
  );
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const serviceConfigsInitial = useMemo(() => serviceConfigValues(data), [data]);
  const [serviceConfigs, setServiceConfigs] = useState(serviceConfigsInitial);
  const editingLocation =
    editingLocationId && editingLocationId !== "new"
      ? data.locations.find((location) => location.id === editingLocationId) ?? null
      : null;
  const [feeValues, setFeeValues] = useState(() => feeValuesFromData(data));
  const [consultationValue, setConsultationValue] = useState(() =>
    consultationValueFromData(data),
  );
  const [availabilityValue, setAvailabilityValue] = useState({
    statusKey: data.availability?.status_key ?? "",
    statusNote: data.availability?.status_note ?? "",
  });
  const inPersonLocationIds = uniqueStrings(
    data.v01Offerings
      .filter((offering) => offering.delivery_mode_key === "in_person")
      .map((offering) => offering.location_id)
      .filter(Boolean),
  );
  const inPersonLocations = inPersonLocationIds.flatMap((locationId) => {
    const location = data.locations.find((row) => row.id === locationId);
    return location ? [location] : [];
  });
  const [activeAccessibilityLocationId, setActiveAccessibilityLocationId] =
    useState(() => inPersonLocations[0]?.id ?? "");
  const [accessibilityValues, setAccessibilityValues] = useState(() =>
    accessibilityValuesFromData(data),
  );
  const [openAccessibilityNotes, setOpenAccessibilityNotes] = useState<
    Record<string, boolean>
  >({});
  const localStatuses = useMemo(
    () => localAreaStatuses(data, completionCodes, inPersonLocations.length),
    [completionCodes, data, inPersonLocations.length],
  );
  const defaultView = useMemo(
    () => defaultPracticalView(localStatuses),
    [localStatuses],
  );
  const requestedViewParam = searchParams.get("view");
  const requestedView = practicalViewFromParam(requestedViewParam);
  const activeView = requestedView ?? defaultView;
  const remainingCount =
    data.completion.missing.length + data.completion.needs_attention.length;
  const navigationLocked =
    activeView === "services"
      ? editingServices || Boolean(editingLocationId)
      : activeView === "fees"
        ? editingFees || editingConsultation
        : activeView === "availability"
          ? editingAvailability
          : false;
  const visibleAccessibilityLocation =
    inPersonLocations.find((location) => location.id === activeAccessibilityLocationId) ??
    inPersonLocations[0] ??
    null;

  useEffect(() => {
    if (requestedViewParam && requestedView) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", defaultView);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [defaultView, pathname, requestedView, requestedViewParam, router, searchParams]);

  useEffect(() => {
    const previousStatus = previousServiceStatusRef.current;
    previousServiceStatusRef.current = serviceState.status;

    if (previousStatus !== "success" && serviceState.status === "success") {
      setEditingServices(false);
    }
  }, [serviceState.status]);

  function navigateToView(view: PracticalView) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function updateServiceConfig(
    serviceTypeKey: string,
    patch: Partial<ServiceConfig>,
  ) {
    setServiceConfigs((current) =>
      current.map((config) =>
        config.serviceTypeKey === serviceTypeKey ? { ...config, ...patch } : config,
      ),
    );
  }

  function updateFee(offeringId: string, patch: Partial<FeeValue>) {
    setFeeValues((current) =>
      current.map((fee) => (fee.offeringId === offeringId ? { ...fee, ...patch } : fee)),
    );
  }

  function copyFirstFeeToAll() {
    const first = feeValues[0];

    if (!first) {
      return;
    }

    setFeeValues((current) =>
      current.map((fee) => ({
        ...fee,
        directBillingKey: first.directBillingKey,
        feeDollars: first.feeDollars,
        feeNote: first.feeNote,
        rccReceipts: first.rccReceipts,
        sessionMinutes: first.sessionMinutes,
        slidingScaleKey: first.slidingScaleKey,
      })),
    );
  }

  function updateAccessibility(
    locationId: string,
    featureKey: string,
    patch: Partial<AccessibilityValue>,
  ) {
    setAccessibilityValues((current) => ({
      ...current,
      [locationId]: (current[locationId] ?? []).map((feature) =>
        feature.featureKey === featureKey ? { ...feature, ...patch } : feature,
      ),
    }));
  }

  function toggleAccessibilityNote(locationId: string, featureKey: string) {
    const key = accessibilityNoteKey(locationId, featureKey);
    setOpenAccessibilityNotes((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  const servicesArea = (
    <WorkArea
      support="Services, delivery and where clients can meet with you."
      title="Services & locations"
    >
      <Subsection
        action={
          <EditButton
            label={editingServices ? "Close" : "Edit services"}
            onClick={() => setEditingServices((value) => !value)}
          />
        }
        title="Services"
      >
        <InlineRequirements
          codes={SERVICE_PROBLEM_CODES}
          completionCodes={completionCodes}
          data={data}
        />
        <div className="space-y-4">
          {serviceConfigs.length === 0 ? (
            <EmptyNotice>
              Add at least one service in Who You Work With before setting
              practical details.
            </EmptyNotice>
          ) : (
            serviceConfigs.map((config) => (
              <ServiceSummary
                config={config}
                data={data}
                key={config.serviceTypeKey}
              />
            ))
          )}
        </div>
        {editingServices ? (
          <form action={serviceAction} className="mt-6 space-y-5">
            <InsetSurface>
              <ActionMessage state={serviceState} />
              {serviceConfigs.map((config) => (
                <ServiceConfigPanel
                  config={config}
                  data={data}
                  error={
                    serviceState.fieldErrors[`service:${config.serviceTypeKey}`] ??
                    serviceState.fieldErrors[`location:${config.serviceTypeKey}`]
                  }
                  key={config.serviceTypeKey}
                  onChange={(patch) =>
                    updateServiceConfig(config.serviceTypeKey, patch)
                  }
                />
              ))}
              <ActionRow>
                <SubmitButton>Save services</SubmitButton>
                <SecondaryButton onClick={() => setEditingServices(false)}>
                  Cancel
                </SecondaryButton>
                <StatusText
                  fallback="Save after changing how a service is offered."
                  state={serviceState}
                />
              </ActionRow>
            </InsetSurface>
          </form>
        ) : null}
      </Subsection>

      <Subsection
        action={
          <IconButton onClick={() => setEditingLocationId("new")}>
            <Plus className="size-4" />
            Add location
          </IconButton>
        }
        title="Locations"
      >
        <div className="space-y-3">
          {data.locations.length ? (
            data.locations.map((location) => (
              <LocationSummary
                data={data}
                key={location.id}
                location={location}
                onEdit={() => setEditingLocationId(location.id)}
              />
            ))
          ) : (
            <EmptyNotice>No saved in-person locations yet.</EmptyNotice>
          )}
        </div>
        {editingLocationId ? (
          <LocationEditor
            action={locationAction}
            data={data}
            editingLocation={editingLocation}
            locationState={locationState}
            onCancel={() => setEditingLocationId(null)}
          />
        ) : null}
      </Subsection>
    </WorkArea>
  );

  const feesArea = (
    <WorkArea
      support="Fees and consultation details people usually want before reaching out."
      title="Fees & consultation"
    >
      <Subsection
        action={
          <EditButton
            label={editingFees ? "Close" : "Edit fees"}
            onClick={() => setEditingFees((value) => !value)}
          />
        }
        title="Fees & payment"
      >
        <InlineRequirements
          codes={FEE_PROBLEM_CODES}
          completionCodes={completionCodes}
          data={data}
        />
        <FeeSummary data={data} />
        {editingFees ? (
          <form action={feeAction} className="mt-6 space-y-5">
            <InsetSurface>
              <ActionMessage state={feeState} />
              {feeValues.length > 1 ? (
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:border-[var(--color-sage)] hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
                  type="button"
                  onClick={copyFirstFeeToAll}
                >
                  <Check className="size-4" />
                  Use the same fee for all of these
                </button>
              ) : null}
              {feeValues.length ? (
                feeValues.map((fee) => {
                  const offering = data.v01Offerings.find(
                    (row) => row.id === fee.offeringId,
                  );

                  if (!offering) {
                    return null;
                  }

                  return (
                    <FeePanel
                      data={data}
                      fee={fee}
                      key={fee.offeringId}
                      offering={offering}
                      onChange={(patch) => updateFee(fee.offeringId, patch)}
                      state={feeState}
                    />
                  );
                })
              ) : (
                <EmptyNotice>
                  Save how you offer counselling before adding fees.
                </EmptyNotice>
              )}
              <ActionRow>
                <SubmitButton>Save fees</SubmitButton>
                <SecondaryButton onClick={() => setEditingFees(false)}>
                  Cancel
                </SecondaryButton>
                <StatusText fallback="Amounts are saved as CAD." state={feeState} />
              </ActionRow>
            </InsetSurface>
          </form>
        ) : null}
      </Subsection>

      <Subsection
        action={
          <EditButton
            label={editingConsultation ? "Close" : "Edit consultation"}
            onClick={() => setEditingConsultation((value) => !value)}
          />
        }
        title="Consultation"
      >
        <InlineRequirements
          codes={CONSULTATION_PROBLEM_CODES}
          completionCodes={completionCodes}
          data={data}
        />
        <ConsultationSummary data={data} />
        {editingConsultation ? (
          <form action={consultationAction} className="mt-5">
            <InsetSurface>
              <ConsultationEditor
                consultationState={consultationState}
                consultationValue={consultationValue}
                setConsultationValue={setConsultationValue}
              />
              <ActionRow>
                <SubmitButton>Save consultation</SubmitButton>
                <SecondaryButton onClick={() => setEditingConsultation(false)}>
                  Cancel
                </SecondaryButton>
                <StatusText
                  fallback="This answer applies to your practice overall."
                  state={consultationState}
                />
              </ActionRow>
            </InsetSurface>
          </form>
        ) : null}
      </Subsection>
    </WorkArea>
  );

  const availabilityArea = (
    <WorkArea
      support="Keep this current so people know whether reaching out makes sense."
      title="Current availability"
    >
      <AvailabilitySummary
        availabilityNeedsConfirmation={hasAnyCode(
          completionCodes,
          AVAILABILITY_PROBLEM_CODES,
        )}
        action={availabilityAction}
        availabilityState={availabilityState}
        availabilityValue={availabilityValue}
        data={data}
        editingAvailability={editingAvailability}
        onChange={() => setEditingAvailability(true)}
        onClose={() => setEditingAvailability(false)}
        setAvailabilityValue={setAvailabilityValue}
      />
    </WorkArea>
  );

  const accessibilityArea = (
    <WorkArea
      support="Accessibility information for current in-person locations."
      title="Accessibility"
    >
      {inPersonLocations.length ? (
        <div className="space-y-6">
          {inPersonLocations.length > 1 ? (
            <LocationSelector
              activeLocationId={visibleAccessibilityLocation?.id ?? ""}
              data={data}
              locations={inPersonLocations}
              onSelect={setActiveAccessibilityLocationId}
            />
          ) : null}
          {visibleAccessibilityLocation ? (
            <AccessibilityChecklist
              accessibilityAction={accessibilityAction}
              accessibilityState={accessibilityState}
              completionCodes={completionCodes}
              data={data}
              features={accessibilityValues[visibleAccessibilityLocation.id] ?? []}
              location={visibleAccessibilityLocation}
              onFeatureChange={(featureKey, patch) =>
                updateAccessibility(visibleAccessibilityLocation.id, featureKey, patch)
              }
              onToggleNote={(featureKey) =>
                toggleAccessibilityNote(visibleAccessibilityLocation.id, featureKey)
              }
              openNotes={openAccessibilityNotes}
            />
          ) : null}
        </div>
      ) : (
        <EmptyNotice>
          Accessibility details are only needed when you offer in-person
          counselling.
        </EmptyNotice>
      )}
    </WorkArea>
  );

  const reviewArea = (
    <WorkArea
      endpoint
      support="BCMC checks the saved facts on the server before marking this section complete."
      title="Review practical details"
    >
      <CompletionPanel
        data={data}
        localStatuses={localStatuses}
        onNavigate={navigateToView}
        state={completionState}
      />
      <form
        action={completionAction}
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <SubmitButton disabled={!data.completion.complete}>
          Complete Practical Details
        </SubmitButton>
        <StatusText
          fallback={
            data.completion.complete
              ? "Use this when you are ready to finish this section."
              : `Complete the ${remainingCount || "remaining"} ${
                  remainingCount === 1 ? "item" : "items"
                } above first.`
          }
          state={completionState}
        />
      </form>
    </WorkArea>
  );

  return (
    <div className="mt-10 space-y-8">
      <LocalNavigator
        activeView={activeView}
        disabled={navigationLocked}
        localStatuses={localStatuses}
        onNavigate={navigateToView}
      />

      {activeView === "services" ? servicesArea : null}
      {activeView === "fees" ? feesArea : null}
      {activeView === "availability" ? availabilityArea : null}
      {activeView === "accessibility" ? accessibilityArea : null}
      {activeView === "review" ? reviewArea : null}

      <LocalViewActions
        activeView={activeView}
        disabled={navigationLocked}
        onNavigate={navigateToView}
      />
    </div>
  );
}

function WorkArea({
  children,
  endpoint = false,
  support,
  title,
}: {
  children: ReactNode;
  endpoint?: boolean;
  support: string;
  title: string;
}) {
  return (
    <section
      className={`space-y-7 ${endpoint ? "border-t border-[var(--color-border)] pt-8" : ""}`}
      aria-labelledby={`practical-${slugify(title)}`}
    >
      <div className="max-w-3xl">
        <h2
          className="font-serif text-3xl leading-tight text-[var(--color-forest-900)]"
          id={`practical-${slugify(title)}`}
        >
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-stone)]">
          {support}
        </p>
      </div>
      <div className="max-w-4xl">
        {children}
      </div>
    </section>
  );
}

function Subsection({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="py-8 first:pt-0 last:pb-0">
      <div className="flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-semibold text-[var(--color-forest-900)]">
          {title}
        </h3>
        {action}
      </div>
      <div className="mt-5">
      {children}
      </div>
    </section>
  );
}

function LocalNavigator({
  activeView,
  disabled,
  localStatuses,
  onNavigate,
}: {
  activeView: PracticalView;
  disabled: boolean;
  localStatuses: Record<PracticalView, LocalAreaStatus>;
  onNavigate: (view: PracticalView) => void;
}) {
  return (
    <nav
      aria-label="Practical Details work areas"
      className="max-w-4xl border-y border-[var(--color-border)] py-3"
    >
      <div className="grid gap-1 md:grid-cols-5">
        {LOCAL_VIEWS.map((view) => {
          const active = activeView === view.key;
          const status = localStatuses[view.key];

          return (
            <button
              aria-current={active ? "step" : undefined}
              className={`min-h-14 border-l-2 px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)] md:border-b-2 md:border-l-0 ${
                active
                  ? "border-[var(--color-leaf)] text-[var(--color-forest-900)]"
                  : "border-transparent text-[var(--color-ink)] hover:bg-white"
              } disabled:cursor-not-allowed disabled:opacity-55`}
              disabled={disabled && !active}
              key={view.key}
              type="button"
              onClick={() => onNavigate(view.key)}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{view.label}</span>
                {status === "ready" ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-leaf)]" />
                ) : status === "needs_attention" ||
                  status === "needs_confirmation" ||
                  status === "needs_review" ? (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-antique-gold)]" />
                ) : null}
              </span>
              <span className="mt-1 block text-xs font-medium leading-5 text-[var(--color-stone)]">
                {localStatusLabel(status)}
              </span>
            </button>
          );
        })}
      </div>
      {disabled ? (
        <p className="mt-3 text-xs leading-5 text-[var(--color-stone)]">
          Save or cancel the open editor before moving to another work area.
        </p>
      ) : null}
    </nav>
  );
}

function LocalViewActions({
  activeView,
  disabled,
  onNavigate,
}: {
  activeView: PracticalView;
  disabled: boolean;
  onNavigate: (view: PracticalView) => void;
}) {
  const index = LOCAL_VIEWS.findIndex((view) => view.key === activeView);
  const previous = LOCAL_VIEWS[index - 1];
  const next = LOCAL_VIEWS[index + 1];

  return (
    <div className="flex max-w-4xl flex-col gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {previous ? (
          <NavigationButton
            disabled={disabled}
            label={`Back to ${previous.label}`}
            onClick={() => onNavigate(previous.key)}
          />
        ) : null}
      </div>
      <div>
        {next ? (
          <NavigationButton
            align="end"
            disabled={disabled}
            label={`Continue to ${next.label}`}
            onClick={() => onNavigate(next.key)}
          />
        ) : null}
      </div>
    </div>
  );
}

function LocationSelector({
  activeLocationId,
  data,
  locations,
  onSelect,
}: {
  activeLocationId: string;
  data: PracticalDetailsData;
  locations: PracticalDetailsData["locations"];
  onSelect: (locationId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {locations.map((location) => {
        const active = location.id === activeLocationId;

        return (
          <button
            className={`min-h-10 rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)] ${
              active
                ? "border-[var(--color-leaf)] bg-white text-[var(--color-forest-900)]"
                : "border-[var(--color-border)] text-[var(--color-stone)] hover:border-[var(--color-sage)] hover:bg-white"
            }`}
            key={location.id}
            type="button"
            onClick={() => onSelect(location.id)}
          >
            {locationLabel(location)}
            <span className="sr-only">
              {servicesUsingLocation(location.id, data)
                ? ` used for ${servicesUsingLocation(location.id, data)}`
                : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ServiceSummary({
  config,
  data,
}: {
  config: ServiceConfig;
  data: PracticalDetailsData;
}) {
  const location = config.locationId
    ? data.locations.find((row) => row.id === config.locationId)
    : null;
  const virtualPractice = practiceName(config.virtualPracticeId, data.practiceAffiliations);

  return (
    <div className="max-w-2xl">
      <h4 className="text-base font-semibold text-[var(--color-forest-900)]">
        {serviceTypeLabel(config.serviceTypeKey, data.serviceTypes)}
      </h4>
      <div className="mt-3 grid max-w-xl gap-x-8 gap-y-4 sm:grid-cols-2">
        <SummaryLine
          label="In person"
          muted={!config.inPerson}
          value={
            config.inPerson
              ? location
                ? location.neighbourhood_or_area || location.city
                : "Location needed"
              : "Not listed"
          }
        />
        <SummaryLine
          detail={config.virtual ? virtualPractice ?? undefined : undefined}
          label="Online"
          muted={!config.virtual}
          value={config.virtual ? "British Columbia" : "Not listed"}
        />
      </div>
    </div>
  );
}

function SummaryLine({
  detail,
  label,
  muted,
  value,
}: {
  detail?: string;
  label: string;
  muted?: boolean;
  value: string;
}) {
  return (
    <div className={muted ? "text-[var(--color-stone)]" : ""}>
      <p className="text-sm font-semibold text-[var(--color-forest-900)]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[var(--color-stone)]">
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 text-sm leading-5 text-[var(--color-stone)]">{detail}</p>
      ) : null}
    </div>
  );
}

function LocationSummary({
  data,
  location,
  onEdit,
}: {
  data: PracticalDetailsData;
  location: PracticalDetailsData["locations"][number];
  onEdit: () => void;
}) {
  return (
    <div className="max-w-2xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-semibold text-[var(--color-forest-900)]">
            {location.neighbourhood_or_area || location.city}
          </h4>
          <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
            {[location.city, practiceName(location.practice_id, data.practiceAffiliations)]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--color-stone)]">
            Used for{" "}
            <span className="font-medium text-[var(--color-forest-900)]">
              {servicesUsingLocation(location.id, data) || "not selected yet"}
            </span>
          </p>
        </div>
        <EditButton label="Edit" onClick={onEdit} />
      </div>
    </div>
  );
}

function LocationEditor({
  action,
  data,
  editingLocation,
  locationState,
  onCancel,
}: {
  action: (payload: FormData) => void;
  data: PracticalDetailsData;
  editingLocation: PracticalDetailsData["locations"][number] | null;
  locationState: PracticalActionState;
  onCancel: () => void;
}) {
  return (
    <form action={action} className="mt-5">
      <InsetSurface>
        <ActionMessage state={locationState} />
        <div className="flex items-start justify-between gap-4">
          <h4 className="font-semibold text-[var(--color-forest-900)]">
            {editingLocation ? "Edit location" : "Add a location"}
          </h4>
          <SecondaryButton onClick={onCancel}>
            <X className="size-4" />
            Cancel
          </SecondaryButton>
        </div>
        <input name="locationId" type="hidden" value={editingLocation?.id ?? ""} />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SelectField
            defaultValue={editingLocation?.practice_id ?? ""}
            label="Practice"
            name="practiceId"
          >
            <option value="">No practice selected</option>
            {data.practiceAffiliations.map((affiliation) => (
              <option key={affiliation.id} value={affiliation.practice_id}>
                {affiliation.practices?.name ?? "Practice"}
              </option>
            ))}
          </SelectField>
          <TextField
            defaultValue={editingLocation?.city ?? ""}
            error={locationState.fieldErrors.city}
            label="City"
            name="city"
            required
          />
          <TextField
            className="md:col-span-2"
            defaultValue={editingLocation?.neighbourhood_or_area ?? ""}
            error={locationState.fieldErrors.neighbourhoodOrArea}
            label="Area or neighbourhood"
            name="neighbourhoodOrArea"
          />
        </div>
        <ActionRow>
          <SubmitButton>Save location</SubmitButton>
          <StatusText
            fallback="No exact address is collected here."
            state={locationState}
          />
        </ActionRow>
      </InsetSurface>
    </form>
  );
}

function ServiceConfigPanel({
  config,
  data,
  error,
  onChange,
}: {
  config: ServiceConfig;
  data: PracticalDetailsData;
  error?: string;
  onChange: (patch: Partial<ServiceConfig>) => void;
}) {
  return (
    <section className="border-t border-[var(--color-border)] pt-5 first:border-t-0 first:pt-0">
      <input name="serviceTypeKey" type="hidden" value={config.serviceTypeKey} />
      <input
        name={`inPerson:${config.serviceTypeKey}`}
        type="hidden"
        value={String(config.inPerson)}
      />
      <input
        name={`virtual:${config.serviceTypeKey}`}
        type="hidden"
        value={String(config.virtual)}
      />
      <h4 className="font-semibold text-[var(--color-forest-900)]">
        {serviceTypeLabel(config.serviceTypeKey, data.serviceTypes)}
      </h4>
      <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">How do you offer this service?</legend>
        <CheckboxChoice
          checked={config.inPerson}
          label="In person"
          onChange={(checked) => onChange({ inPerson: checked })}
        />
        <CheckboxChoice
          checked={config.virtual}
          label="Online"
          onChange={(checked) => onChange({ virtual: checked })}
        />
      </fieldset>
      {config.inPerson ? (
        <SelectField
          className="mt-4"
          label="Where do clients meet you?"
          name={`location:${config.serviceTypeKey}`}
          onChange={(value) => onChange({ locationId: value })}
          value={config.locationId}
        >
          <option value="">Choose a saved location</option>
          {data.locations.map((location) => (
            <option key={location.id} value={location.id}>
              {locationLabel(location)}
            </option>
          ))}
        </SelectField>
      ) : null}
      {config.virtual ? (
        <div className="mt-4 grid gap-4 border-l-4 border-[var(--color-champagne)] bg-[var(--color-cream)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--color-forest-900)]">
            Available to clients across British Columbia
          </p>
          <SelectField
            label="Is this online service offered through one of your practices?"
            name={`virtualPractice:${config.serviceTypeKey}`}
            onChange={(value) => onChange({ virtualPracticeId: value })}
            value={config.virtualPracticeId}
          >
            <option value="">Independent / no practice selected</option>
            {data.practiceAffiliations.map((affiliation) => (
              <option key={affiliation.id} value={affiliation.practice_id}>
                {affiliation.practices?.name ?? "Practice"}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-[#8a3324]">{error}</p> : null}
    </section>
  );
}

function FeeSummary({ data }: { data: PracticalDetailsData }) {
  const groups = feeSummaryGroups(data);

  if (groups.length === 0) {
    return <EmptyNotice>Save how you offer counselling before adding fees.</EmptyNotice>;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div
          className="max-w-2xl"
          key={group.key}
        >
          <p className="font-serif text-3xl leading-tight text-[var(--color-forest-900)]">
            {group.feeDollars ? `$${group.feeDollars}` : "Fee needed"}
          </p>
          {group.sessionMinutes ? (
            <p className="mt-1 text-sm font-medium text-[var(--color-stone)]">
              {group.sessionMinutes} minutes
            </p>
          ) : null}
          <div className="mt-4 text-sm leading-6 text-[var(--color-stone)]">
            <p className="font-medium text-[var(--color-forest-900)]">
              {serviceListForOfferings(group.offerings, data)}
            </p>
            <p>{deliveryListForOfferings(group.offerings, data)}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--color-forest-900)]">
            <span>{group.slidingScaleLabel}</span>
            <span className="text-[var(--color-stone)]">·</span>
            <span>{group.rccLabel}</span>
            <span className="text-[var(--color-stone)]">·</span>
            <span>{group.directBillingLabel}</span>
          </div>
          {group.feeNote ? (
            <p className="mt-3 text-sm leading-6 text-[var(--color-stone)]">
              {group.feeNote}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FeePanel({
  data,
  fee,
  offering,
  onChange,
  state,
}: {
  data: PracticalDetailsData;
  fee: FeeValue;
  offering: PracticalDetailsData["v01Offerings"][number];
  onChange: (patch: Partial<FeeValue>) => void;
  state: PracticalActionState;
}) {
  return (
    <section className="border-t border-[var(--color-border)] pt-5 first:border-t-0 first:pt-0">
      <input name="offeringId" type="hidden" value={fee.offeringId} />
      <h4 className="font-semibold text-[var(--color-forest-900)]">
        {offeringLabel({ locations: data.locations, offering, serviceTypes: data.serviceTypes })}
      </h4>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <TextField
          error={state.fieldErrors[`feeDollars:${fee.offeringId}`]}
          label="Session fee"
          name={`feeDollars:${fee.offeringId}`}
          onChange={(value) => onChange({ feeDollars: value })}
          prefix="$"
          value={fee.feeDollars}
        />
        <TextField
          error={state.fieldErrors[`sessionMinutes:${fee.offeringId}`]}
          label="Session length"
          name={`sessionMinutes:${fee.offeringId}`}
          onChange={(value) => onChange({ sessionMinutes: value })}
          suffix="minutes"
          value={fee.sessionMinutes}
        />
        <SelectField
          error={state.fieldErrors[`slidingScale:${fee.offeringId}`]}
          label="Sliding scale"
          name={`slidingScale:${fee.offeringId}`}
          onChange={(value) => onChange({ slidingScaleKey: value })}
          value={fee.slidingScaleKey}
        >
          <option value="">Choose one</option>
          {SLIDING_SCALE_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          error={state.fieldErrors[`directBilling:${fee.offeringId}`]}
          label="Do you bill insurance providers directly?"
          name={`directBilling:${fee.offeringId}`}
          onChange={(value) => onChange({ directBillingKey: value })}
          value={fee.directBillingKey}
        >
          <option value="">Choose one</option>
          {DIRECT_BILLING_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-[var(--color-forest-900)]">
            Can you provide receipts clients may submit to their insurer?
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceRadio
              checked={fee.rccReceipts === "true"}
              label="Yes"
              name={`rccReceipts:${fee.offeringId}`}
              onChange={() => onChange({ rccReceipts: "true" })}
              value="true"
            />
            <ChoiceRadio
              checked={fee.rccReceipts === "false"}
              label="No"
              name={`rccReceipts:${fee.offeringId}`}
              onChange={() => onChange({ rccReceipts: "false" })}
              value="false"
            />
          </div>
          {state.fieldErrors[`rccReceipts:${fee.offeringId}`] ? (
            <p className="text-sm text-[#8a3324]">
              {state.fieldErrors[`rccReceipts:${fee.offeringId}`]}
            </p>
          ) : null}
        </fieldset>
        <TextareaField
          error={state.fieldErrors[`feeNote:${fee.offeringId}`]}
          label="Optional fee note"
          maxLength={280}
          name={`feeNote:${fee.offeringId}`}
          onChange={(value) => onChange({ feeNote: value })}
          value={fee.feeNote}
        />
      </div>
    </section>
  );
}

function ConsultationSummary({ data }: { data: PracticalDetailsData }) {
  const value = consultationValueFromData(data);

  if (!value.offered) {
    return <EmptyNotice>Tell us whether you offer a consultation.</EmptyNotice>;
  }

  if (value.offered === "false") {
    return (
      <p className="text-base font-medium text-[var(--color-forest-900)]">
        No brief consultation listed before a first counselling session.
      </p>
    );
  }

  const mode = CONSULTATION_MODE_OPTIONS.find((option) => option.key === value.modeKey);
  const terms = [
    value.costKind === "free" ? "Free" : value.feeDollars ? `$${value.feeDollars}` : null,
    value.minutes ? `${value.minutes}-minute` : null,
    mode ? `${mode.label.toLowerCase()} consultation` : "consultation",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="max-w-2xl">
      <p className="text-lg font-semibold text-[var(--color-forest-900)]">
        {terms}
      </p>
      {!mode ? (
        <p className="mt-2 text-sm text-[#8a3324]">
          Needs one detail: choose how you offer consultations.
        </p>
      ) : (
        <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
          Before a first counselling session.
        </p>
      )}
    </div>
  );
}

function ConsultationEditor({
  consultationState,
  consultationValue,
  setConsultationValue,
}: {
  consultationState: PracticalActionState;
  consultationValue: ConsultationValue;
  setConsultationValue: Dispatch<SetStateAction<ConsultationValue>>;
}) {
  return (
    <div className="space-y-5">
      <ActionMessage state={consultationState} />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Consultation offered</legend>
        <ChoiceRadio
          checked={consultationValue.offered === "true"}
          label="Yes"
          name="consultationOffered"
          onChange={() =>
            setConsultationValue((current) => ({ ...current, offered: "true" }))
          }
          value="true"
        />
        <ChoiceRadio
          checked={consultationValue.offered === "false"}
          label="No"
          name="consultationOffered"
          onChange={() =>
            setConsultationValue((current) => ({ ...current, offered: "false" }))
          }
          value="false"
        />
      </fieldset>
      {consultationValue.offered === "true" ? (
        <div className="grid gap-4 border-l-4 border-[var(--color-champagne)] bg-white px-4 py-4 md:grid-cols-2">
          <SelectField
            error={consultationState.fieldErrors.consultationModeKey}
            label="How"
            name="consultationModeKey"
            onChange={(value) =>
              setConsultationValue((current) => ({ ...current, modeKey: value }))
            }
            value={consultationValue.modeKey}
          >
            <option value="">Choose one</option>
            {CONSULTATION_MODE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <TextField
            error={consultationState.fieldErrors.consultationMinutes}
            label="Length in minutes"
            name="consultationMinutes"
            onChange={(value) =>
              setConsultationValue((current) => ({ ...current, minutes: value }))
            }
            value={consultationValue.minutes}
          />
          <fieldset className="space-y-2 md:col-span-2">
            <legend className="text-sm font-semibold text-[var(--color-forest-900)]">
              Cost
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceRadio
                checked={consultationValue.costKind === "free"}
                label="Free"
                name="consultationCostKind"
                onChange={() =>
                  setConsultationValue((current) => ({
                    ...current,
                    costKind: "free",
                  }))
                }
                value="free"
              />
              <ChoiceRadio
                checked={consultationValue.costKind === "paid"}
                label="Paid"
                name="consultationCostKind"
                onChange={() =>
                  setConsultationValue((current) => ({
                    ...current,
                    costKind: "paid",
                  }))
                }
                value="paid"
              />
            </div>
          </fieldset>
          {consultationValue.costKind === "paid" ? (
            <TextField
              error={consultationState.fieldErrors.consultationFeeDollars}
              label="Cost in CAD"
              name="consultationFeeDollars"
              onChange={(value) =>
                setConsultationValue((current) => ({
                  ...current,
                  feeDollars: value,
                }))
              }
              value={consultationValue.feeDollars}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AvailabilitySummary({
  action,
  availabilityNeedsConfirmation,
  availabilityState,
  availabilityValue,
  data,
  editingAvailability,
  onChange,
  onClose,
  setAvailabilityValue,
}: {
  action: (payload: FormData) => void;
  availabilityNeedsConfirmation: boolean;
  availabilityState: PracticalActionState;
  availabilityValue: { statusKey: string; statusNote: string };
  data: PracticalDetailsData;
  editingAvailability: boolean;
  onChange: () => void;
  onClose: () => void;
  setAvailabilityValue: Dispatch<
    SetStateAction<{ statusKey: string; statusNote: string }>
  >;
}) {
  const status = AVAILABILITY_OPTIONS.find(
    (option) => option.key === data.availability?.status_key,
  );
  const date = confirmedDateLabel(data.availability?.confirmed_at);

  if (!hasMeaningfulAvailability(data) || editingAvailability) {
    return (
      <form action={action} className="mt-1">
        <InsetSurface>
          <ActionMessage state={availabilityState} />
          <AvailabilityEditor
            availabilityState={availabilityState}
            availabilityValue={availabilityValue}
            setAvailabilityValue={setAvailabilityValue}
          />
          <ActionRow>
            <SubmitButton>Save availability</SubmitButton>
            {hasMeaningfulAvailability(data) ? (
              <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
            ) : null}
            <StatusText
              fallback="Saving reconfirms this status."
              state={availabilityState}
            />
          </ActionRow>
        </InsetSurface>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <ActionMessage state={availabilityState} />
      <div className="max-w-2xl">
        <div>
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="flex items-center gap-2 text-lg font-semibold text-[var(--color-forest-900)]">
                <span className="size-2 rounded-full bg-[var(--color-leaf)]" />
                {status?.label ?? "Availability saved"}
              </p>
              {availabilityNeedsConfirmation ? (
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-antique-gold)]">
                  Needs confirmation
                </p>
              ) : null}
            </div>
            {data.availability?.status_note ? (
              <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
                {data.availability.status_note}
              </p>
            ) : null}
            {date ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-leaf)]">
                Last confirmed {date}
              </p>
            ) : null}
          </div>
        </div>
        {availabilityNeedsConfirmation ? (
          <p className="mt-3 text-sm leading-6 text-[var(--color-stone)]">
            Please confirm this is still current.
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {availabilityNeedsConfirmation ? (
          <form action={action}>
            <input name="statusKey" type="hidden" value={data.availability?.status_key ?? ""} />
            <input name="statusNote" type="hidden" value={data.availability?.status_note ?? ""} />
            <SubmitButton>Confirm still current</SubmitButton>
          </form>
        ) : null}
        <SecondaryButton onClick={onChange}>
          <Pencil className="size-4" />
          Change availability
        </SecondaryButton>
      </div>
    </div>
  );
}

function AvailabilityEditor({
  availabilityState,
  availabilityValue,
  setAvailabilityValue,
}: {
  availabilityState: PracticalActionState;
  availabilityValue: { statusKey: string; statusNote: string };
  setAvailabilityValue: Dispatch<
    SetStateAction<{ statusKey: string; statusNote: string }>
  >;
}) {
  return (
    <div className="space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Current availability</legend>
        {AVAILABILITY_OPTIONS.map((option) => (
          <ChoiceRadio
            checked={availabilityValue.statusKey === option.key}
            key={option.key}
            label={option.label}
            name="statusKey"
            onChange={() =>
              setAvailabilityValue((current) => ({
                ...current,
                statusKey: option.key,
              }))
            }
            value={option.key}
          />
        ))}
      </fieldset>
      {availabilityState.fieldErrors.statusKey ? (
        <p className="text-sm text-[#8a3324]">
          {availabilityState.fieldErrors.statusKey}
        </p>
      ) : null}
      <TextareaField
        error={availabilityState.fieldErrors.statusNote}
        label="Optional context"
        maxLength={280}
        name="statusNote"
        onChange={(value) =>
          setAvailabilityValue((current) => ({ ...current, statusNote: value }))
        }
        placeholder="Limited evening spaces"
        value={availabilityValue.statusNote}
      />
    </div>
  );
}

function AccessibilityChecklist({
  accessibilityAction,
  accessibilityState,
  completionCodes,
  data,
  features,
  location,
  onFeatureChange,
  onToggleNote,
  openNotes,
}: {
  accessibilityAction: (payload: FormData) => void;
  accessibilityState: PracticalActionState;
  completionCodes: Set<string>;
  data: PracticalDetailsData;
  features: AccessibilityValue[];
  location: PracticalDetailsData["locations"][number];
  onFeatureChange: (
    featureKey: string,
    patch: Partial<AccessibilityValue>,
  ) => void;
  onToggleNote: (featureKey: string) => void;
  openNotes: Record<string, boolean>;
}) {
  const needsReview = data.completion.missing.some(
    (item) =>
      item.code === "accessibility_review_required" &&
      item.location_id === location.id,
  );

  return (
    <form
      action={accessibilityAction}
      className="max-w-3xl"
    >
      <ActionMessage state={accessibilityState} />
      <input name="locationId" type="hidden" value={location.id} />
      <div>
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h4 className="text-base font-semibold text-[var(--color-forest-900)]">
              Accessibility at {locationLabel(location)}
            </h4>
            {needsReview || completionCodes.has("accessibility_review_required") ? (
              <StatusPill>Needs review</StatusPill>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
            Select the features you know are available. Leaving
            something unselected does not mean it is unavailable.
          </p>
        </div>
      </div>
      <div className="mt-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {features.map((feature) => {
          const taxonomy = data.accessibilityFeatures.find(
            (row) => row.key === feature.featureKey,
          );
          const noteOpen =
            openNotes[accessibilityNoteKey(location.id, feature.featureKey)];

          if (!taxonomy) {
            return null;
          }

          return (
            <div className="py-3" key={feature.featureKey}>
              <div className="flex items-start justify-between gap-4">
                <label className="flex min-w-0 cursor-pointer items-start gap-3 text-sm">
                  <input
                    checked={feature.selected}
                    className="mt-1 size-4 accent-[var(--color-forest-900)]"
                    name="featureKey"
                    onChange={(event) =>
                      onFeatureChange(feature.featureKey, {
                        selected: event.target.checked,
                      })
                    }
                    type="checkbox"
                    value={feature.featureKey}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-[var(--color-forest-900)]">
                      {taxonomy.label}
                    </span>
                    {feature.note && !noteOpen ? (
                      <span className="mt-1 block text-sm leading-6 text-[var(--color-stone)]">
                        {feature.note}
                      </span>
                    ) : null}
                  </span>
                </label>
                {feature.selected ? (
                  <button
                    className="min-h-9 shrink-0 rounded-[var(--radius-sm)] px-2 text-sm font-medium text-[var(--color-forest-900)] underline-offset-4 hover:bg-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
                    type="button"
                    onClick={() => onToggleNote(feature.featureKey)}
                  >
                    {feature.note ? "Edit note" : "+ Add note"}
                  </button>
                ) : null}
              </div>
              {feature.selected ? (
                <div className="ml-7 mt-2">
                  {noteOpen ? (
                    <TextField
                      error={
                        accessibilityState.fieldErrors[
                          `featureNote:${feature.featureKey}`
                        ]
                      }
                      label="Optional detail"
                      name={`featureNote:${feature.featureKey}`}
                      onChange={(value) =>
                        onFeatureChange(feature.featureKey, { note: value })
                      }
                      placeholder="Step-free entrance at side door."
                      value={feature.note}
                    />
                  ) : (
                    <input
                      name={`featureNote:${feature.featureKey}`}
                      type="hidden"
                      value={feature.note}
                    />
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <ActionRow>
        <SubmitButton>Save accessibility</SubmitButton>
        <StatusText
          fallback="Saving with no boxes selected is okay."
          state={accessibilityState}
        />
      </ActionRow>
    </form>
  );
}

function CompletionPanel({
  data,
  localStatuses,
  onNavigate,
  state,
}: {
  data: PracticalDetailsData;
  localStatuses: Record<PracticalView, LocalAreaStatus>;
  onNavigate: (view: PracticalView) => void;
  state: PracticalActionState;
}) {
  const missing = data.completion.missing.map((item) =>
    completionMessage(item, data),
  );
  const attention = data.completion.needs_attention.map((item) =>
    completionMessage(item, data),
  );
  const count = missing.length + attention.length;

  return (
    <div className="max-w-3xl border-y border-[var(--color-border)] py-6">
      <ActionMessage state={state} />
      {data.completion.complete ? (
        <div className="flex items-start gap-3">
          <CircleCheck className="mt-0.5 size-5 text-[var(--color-leaf)]" />
          <div>
            <h3 className="text-xl font-semibold text-[var(--color-forest-900)]">
              Practical details are ready
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
              Everything required in Practical Details is saved.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 size-5 text-[var(--color-antique-gold)]" />
            <div>
              <h3 className="text-xl font-semibold text-[var(--color-forest-900)]">
                Almost there
              </h3>
              <p className="mt-1 text-sm leading-6 text-[var(--color-stone)]">
                {count
                  ? `${count} ${
                      count === 1 ? "thing needs" : "things need"
                    } your attention before this section is complete.`
                  : "The server will do one final check when you complete this section."}
              </p>
            </div>
          </div>
          <ReviewTaskList
            data={data}
            localStatuses={localStatuses}
            onNavigate={onNavigate}
          />
          {attention.length ? (
            <MessageList
              items={attention}
              title="Some saved details no longer line up."
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ReviewTaskList({
  data,
  localStatuses,
  onNavigate,
}: {
  data: PracticalDetailsData;
  localStatuses: Record<PracticalView, LocalAreaStatus>;
  onNavigate: (view: PracticalView) => void;
}) {
  const unresolved = LOCAL_VIEWS.filter(
    (view) =>
      view.key !== "review" &&
      localStatuses[view.key] !== "ready" &&
      localStatuses[view.key] !== "not_needed",
  );
  const completed = LOCAL_VIEWS.filter(
    (view) =>
      view.key !== "review" &&
      (localStatuses[view.key] === "ready" ||
        localStatuses[view.key] === "not_needed"),
  );

  if (!unresolved.length && !completed.length) {
    return null;
  }

  return (
    <div className="grid gap-5">
      {unresolved.length ? (
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-forest-900)]">
            Still needed
          </h4>
          <div className="mt-3 grid gap-3">
            {unresolved.map((view) => (
              <ReviewTask
                data={data}
                key={view.key}
                onNavigate={onNavigate}
                status={localStatuses[view.key]}
                view={view.key}
              />
            ))}
          </div>
        </div>
      ) : null}
      {completed.length ? (
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-forest-900)]">
            Completed
          </h4>
          <ul className="mt-2 grid gap-1 text-sm leading-6 text-[var(--color-stone)]">
            {completed.map((view) => (
              <li className="flex items-center gap-2" key={view.key}>
                <Check className="size-4 text-[var(--color-leaf)]" />
                {view.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ReviewTask({
  data,
  onNavigate,
  status,
  view,
}: {
  data: PracticalDetailsData;
  onNavigate: (view: PracticalView) => void;
  status: LocalAreaStatus;
  view: PracticalView;
}) {
  const messages = data.completion.missing
    .concat(data.completion.needs_attention)
    .filter((item) => itemBelongsToView(item.code ?? "", view))
    .map((item) => completionMessage(item, data));
  const viewLabel = LOCAL_VIEWS.find((item) => item.key === view)?.label ?? "Section";

  return (
    <div className="border-l-4 border-[var(--color-champagne)] bg-white px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-forest-900)]">
            {viewLabel}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-antique-gold)]">
            {localStatusLabel(status)}
          </p>
          {messages.length ? (
            <ul className="mt-2 grid gap-1 text-sm leading-6 text-[var(--color-stone)]">
              {messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <SecondaryButton onClick={() => onNavigate(view)}>
          Go to {viewLabel.toLowerCase()}
        </SecondaryButton>
      </div>
    </div>
  );
}

function InlineRequirements({
  codes,
  completionCodes,
  data,
}: {
  codes: Set<string>;
  completionCodes: Set<string>;
  data: PracticalDetailsData;
}) {
  if (!hasAnyCode(completionCodes, codes)) {
    return null;
  }

  const items = data.completion.missing
    .concat(data.completion.needs_attention)
    .filter((item) => item.code && codes.has(item.code))
    .map((item) => completionMessage(item, data));

  return (
    <div className="border-l-4 border-[var(--color-champagne)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-stone)]">
      <p className="font-semibold text-[var(--color-forest-900)]">
        {codes === AVAILABILITY_PROBLEM_CODES
          ? "Needs confirmation"
          : codes === FEE_PROBLEM_CODES
            ? "Fee needs attention"
            : codes === CONSULTATION_PROBLEM_CODES
              ? "Needs one detail"
              : "Needs attention"}
      </p>
      <ul className="mt-1 grid gap-1">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MessageList({ items, title }: { items: string[]; title: string }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-[var(--color-forest-900)]">
        {title}
      </h4>
      <ul className="mt-2 grid gap-2 text-sm leading-6 text-[var(--color-stone)]">
        {items.map((item) => (
          <li className="border-l-4 border-[var(--color-champagne)] pl-3" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsetSurface({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[var(--color-cream)] px-4 py-5 shadow-[inset_4px_0_0_var(--color-champagne)] sm:px-5">
      {children}
    </div>
  );
}

function ActionRow({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      {children}
    </div>
  );
}

function EditButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:border-[var(--color-sage)] hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
      type="button"
      onClick={onClick}
    >
      <Pencil className="size-4" />
      {label}
    </button>
  );
}

function IconButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-transparent bg-transparent px-3.5 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:border-[var(--color-border)] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function NavigationButton({
  align = "start",
  disabled = false,
  label,
  onClick,
}: {
  align?: "start" | "end";
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex min-h-10 items-center text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 transition-colors hover:text-[var(--color-evergreen)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] disabled:cursor-not-allowed disabled:opacity-55 ${
        align === "end" ? "sm:text-right" : ""
      }`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function SecondaryButton({
  children,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:border-[var(--color-sage)] hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)] disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-[var(--radius-sm)] bg-[var(--color-cream)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-forest-900)]">
      {children}
    </span>
  );
}

function TextField({
  className,
  defaultValue,
  error,
  label,
  name,
  onChange,
  placeholder,
  prefix,
  required,
  suffix,
  value,
}: {
  className?: string;
  defaultValue?: string;
  error?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  required?: boolean;
  suffix?: string;
  value?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-sm font-semibold text-[var(--color-forest-900)]">
        {label}
      </span>
      <span className="mt-2 flex items-center border border-[var(--color-border)] bg-white focus-within:border-[var(--color-forest-900)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)]">
        {prefix ? (
          <span className="pl-3 text-sm text-[var(--color-stone)]">{prefix}</span>
        ) : null}
        <input
          className="min-h-12 min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
          defaultValue={defaultValue}
          name={name}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          required={required}
          value={value}
        />
        {suffix ? (
          <span className="pr-3 text-sm text-[var(--color-stone)]">{suffix}</span>
        ) : null}
      </span>
      {error ? <span className="mt-1 block text-sm text-[#8a3324]">{error}</span> : null}
    </label>
  );
}

function TextareaField({
  error,
  label,
  maxLength,
  name,
  onChange,
  placeholder,
  value,
}: {
  error?: string;
  label: string;
  maxLength?: number;
  name: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--color-forest-900)]">
        {label}
      </span>
      <textarea
        className="mt-2 min-h-24 w-full border border-[var(--color-border)] bg-white px-3 py-2 text-sm leading-6 text-[var(--color-ink)] outline-none focus-visible:border-[var(--color-forest-900)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
        maxLength={maxLength}
        name={name}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {error ? <span className="mt-1 block text-sm text-[#8a3324]">{error}</span> : null}
    </label>
  );
}

function SelectField({
  children,
  className,
  defaultValue,
  error,
  label,
  name,
  onChange,
  value,
}: {
  children: ReactNode;
  className?: string;
  defaultValue?: string;
  error?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  value?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-sm font-semibold text-[var(--color-forest-900)]">
        {label}
      </span>
      <select
        className="mt-2 min-h-12 w-full border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus-visible:border-[var(--color-forest-900)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
        defaultValue={defaultValue}
        name={name}
        onChange={(event) => onChange?.(event.target.value)}
        value={value}
      >
        {children}
      </select>
      {error ? <span className="mt-1 block text-sm text-[#8a3324]">{error}</span> : null}
    </label>
  );
}

function ChoiceRadio({
  checked,
  label,
  name,
  onChange,
  value,
}: {
  checked: boolean;
  label: string;
  name: string;
  onChange: () => void;
  value: string;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 text-sm transition-colors ${
        checked
          ? "border-[var(--color-leaf)] bg-white shadow-[inset_4px_0_0_var(--color-leaf)]"
          : "border-[var(--color-border)] bg-white hover:border-[var(--color-sage)]"
      }`}
    >
      <input
        checked={checked}
        className="size-4 accent-[var(--color-forest-900)]"
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
      />
      <span className="font-medium text-[var(--color-forest-900)]">{label}</span>
    </label>
  );
}

function CheckboxChoice({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 text-sm transition-colors ${
        checked
          ? "border-[var(--color-leaf)] bg-white shadow-[inset_4px_0_0_var(--color-leaf)]"
          : "border-[var(--color-border)] bg-white hover:border-[var(--color-sage)]"
      }`}
    >
      <input
        checked={checked}
        className="size-4 accent-[var(--color-forest-900)]"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="font-medium text-[var(--color-forest-900)]">{label}</span>
    </label>
  );
}

function SubmitButton({
  children,
  disabled = false,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-forest-900)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] disabled:cursor-not-allowed disabled:opacity-55"
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? "Saving..." : children}
    </button>
  );
}

function ActionMessage({ state }: { state: PracticalActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={`border-l-4 bg-white px-4 py-3 text-sm leading-6 ${
        state.status === "error"
          ? "border-[#8a3324] text-[#8a3324]"
          : "border-[var(--color-champagne)] text-[var(--color-stone)]"
      }`}
    >
      {state.message}
    </div>
  );
}

function StatusText({
  fallback,
  state,
}: {
  fallback: string;
  state: PracticalActionState;
}) {
  return (
    <p
      aria-live="polite"
      className={`text-sm font-medium ${
        state.status === "error"
          ? "text-[#8a3324]"
          : state.status === "success"
            ? "text-[var(--color-forest-900)]"
            : "text-[var(--color-stone)]"
      }`}
    >
      {state.message || fallback}
    </p>
  );
}

function EmptyNotice({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-4 border-[var(--color-champagne)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-stone)]">
      {children}
    </p>
  );
}

function practicalViewFromParam(value: string | null): PracticalView | null {
  return LOCAL_VIEWS.some((view) => view.key === value)
    ? (value as PracticalView)
    : null;
}

function localAreaStatuses(
  data: PracticalDetailsData,
  completionCodes: Set<string>,
  inPersonLocationCount: number,
): Record<PracticalView, LocalAreaStatus> {
  const serviceStatus = hasAnyCode(completionCodes, SERVICE_PROBLEM_CODES)
    ? "needs_attention"
    : "ready";
  const feeStatus =
    hasAnyCode(completionCodes, FEE_PROBLEM_CODES) ||
    hasAnyCode(completionCodes, CONSULTATION_PROBLEM_CODES)
      ? "needs_attention"
      : "ready";
  const availabilityStatus = hasAnyCode(
    completionCodes,
    AVAILABILITY_PROBLEM_CODES,
  )
    ? "needs_confirmation"
    : "ready";
  const accessibilityStatus =
    inPersonLocationCount === 0
      ? "not_needed"
      : hasAnyCode(completionCodes, ACCESSIBILITY_PROBLEM_CODES)
        ? "needs_review"
        : "ready";

  return {
    accessibility: accessibilityStatus,
    availability: availabilityStatus,
    fees: feeStatus,
    review: data.completion.complete ? "ready" : "needs_attention",
    services: serviceStatus,
  };
}

function defaultPracticalView(
  localStatuses: Record<PracticalView, LocalAreaStatus>,
): PracticalView {
  for (const view of LOCAL_VIEWS) {
    if (view.key === "review") {
      continue;
    }

    const status = localStatuses[view.key];

    if (status !== "ready" && status !== "not_needed") {
      return view.key;
    }
  }

  return "review";
}

function localStatusLabel(status: LocalAreaStatus) {
  if (status === "ready") {
    return "Ready";
  }

  if (status === "needs_confirmation") {
    return "Needs confirmation";
  }

  if (status === "needs_review") {
    return "Needs review";
  }

  if (status === "not_needed") {
    return "Not needed";
  }

  return "Needs attention";
}

function itemBelongsToView(code: string, view: PracticalView) {
  if (view === "services") {
    return SERVICE_PROBLEM_CODES.has(code);
  }

  if (view === "fees") {
    return FEE_PROBLEM_CODES.has(code) || CONSULTATION_PROBLEM_CODES.has(code);
  }

  if (view === "availability") {
    return AVAILABILITY_PROBLEM_CODES.has(code);
  }

  if (view === "accessibility") {
    return ACCESSIBILITY_PROBLEM_CODES.has(code);
  }

  return false;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function serviceConfigValues(data: PracticalDetailsData): ServiceConfig[] {
  return data.declarations.map((declaration) => {
    const inPerson = data.v01Offerings.find(
      (offering) =>
        offering.service_type_key === declaration.service_type_key &&
        offering.delivery_mode_key === "in_person",
    );
    const virtual = data.v01Offerings.find(
      (offering) =>
        offering.service_type_key === declaration.service_type_key &&
        offering.delivery_mode_key === "virtual",
    );

    return {
      inPerson: Boolean(inPerson),
      locationId: inPerson?.location_id ?? "",
      serviceTypeKey: declaration.service_type_key,
      virtual: Boolean(virtual),
      virtualPracticeId: virtual?.practice_id ?? "",
    };
  });
}

function feeValuesFromData(data: PracticalDetailsData): FeeValue[] {
  return data.v01Offerings.map((offering) => {
    const fee = data.feePolicies.find(
      (policy) => policy.service_offering_id === offering.id,
    );

    return {
      directBillingKey: fee?.direct_billing_key ?? "",
      feeDollars: formatCents(fee?.fee_cents),
      feeNote: fee?.fee_note ?? "",
      offeringId: offering.id,
      rccReceipts:
        typeof fee?.rcc_receipts_available === "boolean"
          ? String(fee.rcc_receipts_available)
          : "",
      sessionMinutes: fee?.session_minutes ? String(fee.session_minutes) : "",
      slidingScaleKey: fee?.sliding_scale_key ?? "",
    };
  });
}

function consultationValueFromData(data: PracticalDetailsData) {
  const firstConsultationFee = data.feePolicies.find(
    (fee) => fee.consultation_minutes !== null || fee.consultation_fee_cents !== null,
  );
  const feeCents = firstConsultationFee?.consultation_fee_cents;

  return {
    costKind:
      typeof feeCents === "number" && feeCents > 0
        ? "paid"
        : typeof feeCents === "number"
          ? "free"
          : "free",
    feeDollars: formatCents(feeCents),
    minutes: firstConsultationFee?.consultation_minutes
      ? String(firstConsultationFee.consultation_minutes)
      : "",
    modeKey: data.contactProcess?.consultation_mode_key ?? "",
    offered:
      data.contactProcess?.consultation_offered === true
        ? "true"
        : data.contactProcess
          ? "false"
          : "",
  };
}

function accessibilityValuesFromData(data: PracticalDetailsData) {
  const values: Record<string, AccessibilityValue[]> = {};

  for (const location of data.locations) {
    values[location.id] = data.accessibilityFeatures.map((feature) => {
      const row = data.accessibilityRows.find(
        (accessibility) =>
          accessibility.location_id === location.id &&
          accessibility.feature_key === feature.key &&
          accessibility.status_key === "available",
      );

      return {
        featureKey: feature.key,
        note: row?.note ?? "",
        selected: Boolean(row),
      };
    });
  }

  return values;
}

function feeSummaryGroups(data: PracticalDetailsData): FeeSummaryGroup[] {
  const groups = new Map<string, FeeSummaryGroup>();

  for (const offering of data.v01Offerings) {
    const fee = data.feePolicies.find(
      (policy) => policy.service_offering_id === offering.id,
    );
    const key = [
      fee?.fee_cents ?? "missing",
      fee?.currency_code ?? "",
      fee?.session_minutes ?? "",
      fee?.sliding_scale_key ?? "",
      fee?.rcc_receipts_available ?? "",
      fee?.direct_billing_key ?? "",
      fee?.fee_note ?? "",
    ].join("|");
    const group =
      groups.get(key) ??
      ({
        directBillingLabel: directBillingLabel(fee?.direct_billing_key),
        feeDollars: formatCents(fee?.fee_cents),
        feeNote: fee?.fee_note ?? "",
        key,
        offerings: [],
        rccLabel: rccLabel(fee?.rcc_receipts_available),
        sessionMinutes: fee?.session_minutes ?? null,
        slidingScaleLabel: slidingScaleLabel(fee?.sliding_scale_key),
      } satisfies FeeSummaryGroup);

    group.offerings.push(offering);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

function serviceListForOfferings(
  offerings: PracticalDetailsData["v01Offerings"],
  data: PracticalDetailsData,
) {
  return uniqueStrings(
    offerings.map((offering) =>
      serviceTypeLabel(offering.service_type_key, data.serviceTypes),
    ),
  ).join(", ");
}

function deliveryListForOfferings(
  offerings: PracticalDetailsData["v01Offerings"],
  data: PracticalDetailsData,
) {
  const serviceCount = uniqueStrings(
    offerings.map((offering) => offering.service_type_key),
  ).length;
  const deliveries = offerings.map((offering) => {
    if (offering.delivery_mode_key === "virtual") {
      return "online";
    }

    const location = data.locations.find((row) => row.id === offering.location_id);
    const locationText = location
      ? location.neighbourhood_or_area || location.city
      : null;

    return locationText && serviceCount > 1
      ? `in person at ${locationText}`
      : "in person";
  });

  const uniqueDeliveries = uniqueStrings(deliveries);

  if (uniqueDeliveries.length === 2 && uniqueDeliveries.includes("in person")) {
    const other = uniqueDeliveries.find((delivery) => delivery !== "in person");
    return other === "online" ? "In person & online" : uniqueDeliveries.join(" & ");
  }

  return sentenceCase(uniqueDeliveries.join(" & "));
}

function sentenceCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function servicesUsingLocation(locationId: string, data: PracticalDetailsData) {
  return data.v01Offerings
    .filter((offering) => offering.location_id === locationId)
    .map((offering) => serviceTypeLabel(offering.service_type_key, data.serviceTypes))
    .join(", ");
}

function completionCodeSet(data: PracticalDetailsData) {
  return new Set(
    data.completion.missing
      .concat(data.completion.needs_attention)
      .flatMap((item) => (item.code ? [item.code] : [])),
  );
}

function hasAnyCode(completionCodes: Set<string>, targetCodes: Set<string>) {
  for (const code of targetCodes) {
    if (completionCodes.has(code)) {
      return true;
    }
  }

  return false;
}

function hasMeaningfulAvailability(data: PracticalDetailsData) {
  return Boolean(
    data.availability &&
      ((data.availability.status_key && data.availability.status_key !== "unknown") ||
        data.availability.status_note?.trim()),
  );
}

function slidingScaleLabel(value: string | null | undefined) {
  if (value === "limited") {
    return "Limited sliding-scale spaces";
  }

  const label = SLIDING_SCALE_OPTIONS.find((option) => option.key === value)?.label;
  return label ? `Sliding scale: ${label}` : "Sliding scale needs detail";
}

function directBillingLabel(value: string | null | undefined) {
  if (value === "no") {
    return "No direct billing";
  }

  if (value === "yes") {
    return "Direct billing available";
  }

  if (value === "ask") {
    return "Ask about direct billing";
  }

  return "Direct billing needs detail";
}

function rccLabel(value: boolean | null | undefined) {
  if (value === true) {
    return "RCC receipts available";
  }

  if (value === false) {
    return "RCC receipts not listed";
  }

  return "RCC receipts need detail";
}

function accessibilityNoteKey(locationId: string, featureKey: string) {
  return `${locationId}:${featureKey}`;
}

function uniqueStrings(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.filter(isPresent)));
}

function isPresent(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
