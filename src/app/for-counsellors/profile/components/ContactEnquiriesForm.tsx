"use client";

import Link from "next/link";
import { Check, CircleAlert, CircleCheck, Pencil, RotateCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  completeContactEnquiries,
  saveContactEnquiries,
} from "../actions";
import {
  CONTACT_ROUTE_TYPE_OPTIONS,
  contactCompletionMessage,
  contactManagementFromRoute,
  contactRouteTypeLabel,
  consultationReadOnlySummary,
  confirmedDateLabel,
  displayContactDestination,
  emptyContactEnquiriesActionState,
  hasStructuralContactRouteAttention,
  practiceName,
  primaryContactRoute,
  type ContactEnquiriesActionState,
  type ContactEnquiriesData,
  type ContactManagementKey,
  type ContactRouteTypeKey,
} from "@/lib/counsellor-workspace/contact-enquiries";
import type { CounsellorWorkspaceStatus } from "@/lib/counsellor-workspace/types";

type ContactEnquiriesFormProps = {
  data: ContactEnquiriesData;
  onboardingStatus: CounsellorWorkspaceStatus;
};

const CONFIRMATION_CODES = new Set([
  "contact_confirmation_required",
  "contact_confirmation_stale",
]);

export function ContactEnquiriesForm({
  data,
  onboardingStatus,
}: ContactEnquiriesFormProps) {
  const router = useRouter();
  const primaryRoute = primaryContactRoute(data.contactRoutes);
  const [saveState, saveAction] = useActionState(
    saveContactEnquiries,
    emptyContactEnquiriesActionState,
  );
  const [completionState, completionAction] = useActionState(
    completeContactEnquiries,
    emptyContactEnquiriesActionState,
  );
  const [editing, setEditing] = useState(() => !primaryRoute);
  const [managementKey, setManagementKey] = useState<ContactManagementKey>(() =>
    contactManagementFromRoute(primaryRoute),
  );
  const [routeTypeKey, setRouteTypeKey] = useState<ContactRouteTypeKey>(() =>
    routeTypeFromRoute(primaryRoute?.route_type_key),
  );
  const previousSaveStatusRef = useRef(saveState.status);
  const previousCompletionStatusRef = useRef(completionState.status);
  const consultationSummary = consultationReadOnlySummary({
    contactProcess: data.contactProcess,
    feePolicies: data.feePolicies,
  });
  const requirementItems = [
    ...data.completion.needs_attention,
    ...data.completion.missing,
  ];
  const hasStructuralAttention = hasStructuralContactRouteAttention(
    data.completion,
  );
  const confirmationRequired = requirementItems.some((item) =>
    item.code ? CONFIRMATION_CODES.has(item.code) : false,
  );

  function resetEditorState() {
    setManagementKey(contactManagementFromRoute(primaryRoute));
    setRouteTypeKey(routeTypeFromRoute(primaryRoute?.route_type_key));
  }

  function closeEditor() {
    resetEditorState();
    setEditing(false);
  }

  useEffect(() => {
    const previousStatus = previousSaveStatusRef.current;
    previousSaveStatusRef.current = saveState.status;

    if (previousStatus !== "success" && saveState.status === "success") {
      closeEditor();
    }
  });

  useEffect(() => {
    const previousStatus = previousCompletionStatusRef.current;
    previousCompletionStatusRef.current = completionState.status;

    if (previousStatus !== "success" && completionState.status === "success") {
      router.refresh();
    }
  }, [completionState.status, router]);

  return (
    <div className="mt-8 space-y-8">
      <section className="border-y border-[var(--color-border)] py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="bcmc-eyebrow text-[var(--color-leaf)]">
              Where people will go
            </p>
            {primaryRoute && !hasStructuralAttention ? (
              <ContactRouteReadSummary
                data={data}
                primaryRoute={primaryRoute}
              />
            ) : primaryRoute ? (
              <NeedsAttentionRouteSummary requirementItems={requirementItems} />
            ) : (
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-stone)]">
                Add a contact route so BCMC can point prospective clients to
                the right place when they are ready to enquire.
              </p>
            )}
          </div>

          {primaryRoute && !editing ? (
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
              Edit contact route
            </button>
          ) : null}
        </div>

        {primaryRoute &&
        confirmationRequired &&
        !hasStructuralAttention &&
        !editing ? (
          <form action={saveAction} className="mt-5">
            <RouteHiddenFields route={primaryRoute} />
            <input
              type="hidden"
              name="managementKey"
              value={contactManagementFromRoute(primaryRoute)}
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-forest-900)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              <RotateCw className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
              Confirm still current
            </button>
          </form>
        ) : null}
      </section>

      {editing ? (
        <ContactRouteEditor
          data={data}
          managementKey={managementKey}
          onCancel={primaryRoute ? closeEditor : null}
          routeTypeKey={routeTypeKey}
          saveAction={saveAction}
          saveState={saveState}
          setManagementKey={setManagementKey}
          setRouteTypeKey={setRouteTypeKey}
        />
      ) : null}

      <section className="grid gap-6 border-t border-[var(--color-border)] pt-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)]">
        <div>
          <p className="bcmc-eyebrow text-[var(--color-leaf)]">
            When someone contacts you
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-stone)]">
            Before someone leaves BCMC, we&apos;ll make it clear that they are
            contacting you outside BCMC, BCMC does not receive their message,
            and contacting you does not guarantee that you can take them on.
          </p>
          {consultationSummary ? (
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-stone)]">
              {consultationSummary}{" "}
              <Link
                href="/for-counsellors/profile/practical-details?view=fees"
                className="font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline"
              >
                Edit in Practical details
              </Link>
            </p>
          ) : null}
        </div>

        <CompletionPanel
          completionAction={completionAction}
          completionState={completionState}
          data={data}
          onboardingStatus={onboardingStatus}
          requirementItems={requirementItems}
        />
      </section>

      {saveState.message && !editing ? (
        <p className="sr-only" role="status">
          {saveState.message}
        </p>
      ) : null}
    </div>
  );
}

function NeedsAttentionRouteSummary({
  requirementItems,
}: {
  requirementItems: ContactEnquiriesData["completion"]["missing"];
}) {
  return (
    <div className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-stone)]">
      <p className="font-semibold text-[var(--color-forest-900)]">
        Some saved contact details need review before this section can be
        completed.
      </p>
      <ul className="mt-2 space-y-1">
        {requirementItems.map((item, index) => (
          <li key={`${item.code ?? "contact"}-${index}`}>
            {contactCompletionMessage(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactRouteReadSummary({
  data,
  primaryRoute,
}: {
  data: ContactEnquiriesData;
  primaryRoute: NonNullable<ReturnType<typeof primaryContactRoute>>;
}) {
  const managementKey = contactManagementFromRoute(primaryRoute);
  const linkedPracticeName = practiceName(
    primaryRoute.practice_id,
    data.practiceAffiliations,
  );
  const heading =
    managementKey === "practice"
      ? linkedPracticeName ?? "Practice-managed contact"
      : "Your public contact route";
  const confirmedAt = confirmedDateLabel(primaryRoute.confirmed_at);
  const destinationLabel = contactDestinationLabel(primaryRoute.route_type_key);
  const destination = displayContactDestination(
    primaryRoute.route_type_key,
    primaryRoute.route_value,
  );
  const isUrl =
    primaryRoute.route_type_key === "secure_form" ||
    primaryRoute.route_type_key === "website";

  return (
    <div className="mt-4">
      <h3 className="font-serif text-2xl leading-tight text-[var(--color-forest-900)]">
        {heading}
      </h3>
      <div className="mt-3 space-y-1 text-sm leading-6 text-[var(--color-stone)]">
        <p className="font-semibold text-[var(--color-forest-900)]">
          {contactRouteTypeLabel(primaryRoute.route_type_key)}
        </p>
        <p>
          {managementKey === "practice"
            ? "Managed by the practice"
            : "Managed by you"}
        </p>
        <p className="font-semibold text-[var(--color-forest-900)]">
          {destinationLabel}
        </p>
        {isUrl ? (
          <a
            className="break-words text-[var(--color-ink)] underline-offset-4 hover:underline"
            href={destination}
          >
            {destination}
          </a>
        ) : (
          <p className="break-words text-[var(--color-ink)]">{destination}</p>
        )}
        {confirmedAt ? <p>Last confirmed {confirmedAt}</p> : null}
      </div>
    </div>
  );
}

function ContactRouteEditor({
  data,
  managementKey,
  onCancel,
  routeTypeKey,
  saveAction,
  saveState,
  setManagementKey,
  setRouteTypeKey,
}: {
  data: ContactEnquiriesData;
  managementKey: ContactManagementKey;
  onCancel: (() => void) | null;
  routeTypeKey: ContactRouteTypeKey;
  saveAction: (payload: FormData) => void;
  saveState: ContactEnquiriesActionState;
  setManagementKey: (value: ContactManagementKey) => void;
  setRouteTypeKey: (value: ContactRouteTypeKey) => void;
}) {
  const primaryRoute = primaryContactRoute(data.contactRoutes);
  const destinationLabel =
    routeTypeKey === "secure_form"
      ? "Contact form URL"
      : routeTypeKey === "website"
        ? "Website URL"
        : routeTypeKey === "email"
          ? "Professional email address"
          : "Professional phone number";
  const destinationType =
    routeTypeKey === "email" ? "email" : routeTypeKey === "phone" ? "tel" : "url";

  return (
    <form action={saveAction} className="space-y-6 border-l-4 border-[var(--color-champagne)] bg-white px-5 py-5">
      <input type="hidden" name="routeId" value={primaryRoute?.id ?? ""} />
      <input
        type="hidden"
        name="displayLabel"
        value={primaryRoute?.display_label ?? ""}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--color-forest-900)]">
          Who manages this contact route?
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <RadioBox
            checked={managementKey === "practice"}
            label="My practice / clinic"
            name="managementKey"
            onChange={() => setManagementKey("practice")}
            value="practice"
          />
          <RadioBox
            checked={managementKey === "self"}
            label="I manage it myself"
            name="managementKey"
            onChange={() => setManagementKey("self")}
            value="self"
          />
        </div>
        <FieldError message={saveState.fieldErrors.managementKey} />
      </fieldset>

      {managementKey === "practice" ? (
        <Field
          error={saveState.fieldErrors.practiceId}
          id="practiceId"
          label="Practice / clinic"
          required
        >
          <select
            id="practiceId"
            name="practiceId"
            className="bcmc-input max-w-xl"
            defaultValue={primaryRoute?.practice_id ?? ""}
            required
          >
            <option value="">Choose a practice</option>
            {data.practiceAffiliations.map((affiliation) =>
              affiliation.practices ? (
                <option
                  key={affiliation.practice_id}
                  value={affiliation.practice_id}
                >
                  {affiliation.practices.name}
                </option>
              ) : null,
            )}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="practiceId" value="" />
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[var(--color-forest-900)]">
          Contact method
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTACT_ROUTE_TYPE_OPTIONS.map((option) => (
            <RadioBox
              checked={routeTypeKey === option.key}
              key={option.key}
              label={option.label}
              name="routeTypeKey"
              onChange={() => setRouteTypeKey(option.key)}
              value={option.key}
            />
          ))}
        </div>
        <FieldError message={saveState.fieldErrors.routeTypeKey} />
      </fieldset>

      <Field
        error={saveState.fieldErrors.destination}
        id="destination"
        label={destinationLabel}
        required
      >
        <input
          id="destination"
          name="destination"
          type={destinationType}
          defaultValue={displayContactDestination(
            primaryRoute?.route_type_key,
            primaryRoute?.route_value,
          )}
          required
          className="bcmc-input max-w-2xl"
        />
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-stone)]">
          This contact route may be shown to people using BCMC. Only enter
          professional contact information you&apos;re comfortable using for
          enquiries.
        </p>
      </Field>

      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:items-center">
        <SubmitButton>Save contact route</SubmitButton>
        {onCancel ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            onClick={onCancel}
          >
            <X className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
            Cancel
          </button>
        ) : null}
        <p
          className={`text-sm font-medium ${actionStatusClassName(saveState.status)}`}
          aria-live="polite"
        >
          {saveState.message || "Saving reconfirms this contact route."}
        </p>
      </div>
    </form>
  );
}

function CompletionPanel({
  completionAction,
  completionState,
  data,
  onboardingStatus,
  requirementItems,
}: {
  completionAction: () => void;
  completionState: ContactEnquiriesActionState;
  data: ContactEnquiriesData;
  onboardingStatus: CounsellorWorkspaceStatus;
  requirementItems: ContactEnquiriesData["completion"]["missing"];
}) {
  const completed =
    onboardingStatus === "complete" || completionState.status === "success";
  const ready = data.completion.complete && !completed;

  return (
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
              ? "Contact & enquiries complete"
              : ready
                ? "Your contact details are ready"
                : "Still needed"}
          </h3>
          {completed ? null : ready ? (
            <p className="mt-2 text-sm leading-6 text-[var(--color-stone)]">
              Complete this section when you&apos;re finished reviewing how
              people should contact you.
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--color-stone)]">
              {requirementItems.length > 0 ? (
                requirementItems.map((item, index) => (
                  <li key={`${item.code ?? "item"}-${index}`}>
                    {contactCompletionMessage(item)}
                  </li>
                ))
              ) : (
                <li>Add or review the contact route before completing.</li>
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
              Complete Contact & enquiries
            </button>
          </form>
          {completionState.message ? (
            <p
              className={`mt-3 text-sm font-medium ${actionStatusClassName(completionState.status)}`}
              aria-live="polite"
            >
              {completionState.message}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function RouteHiddenFields({
  route,
}: {
  route: NonNullable<ReturnType<typeof primaryContactRoute>>;
}) {
  return (
    <>
      <input type="hidden" name="routeId" value={route.id} />
      <input type="hidden" name="practiceId" value={route.practice_id ?? ""} />
      <input type="hidden" name="routeTypeKey" value={route.route_type_key} />
      <input
        type="hidden"
        name="destination"
        value={displayContactDestination(route.route_type_key, route.route_value)}
      />
      <input type="hidden" name="displayLabel" value={route.display_label ?? ""} />
    </>
  );
}

function RadioBox({
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
    <label className="flex min-h-12 cursor-pointer items-center gap-3 border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-antique-gold)]">
      <input
        checked={checked}
        className="size-4 accent-[var(--color-forest-900)]"
        name={name}
        onChange={onChange}
        required
        type="radio"
        value={value}
      />
      {label}
    </label>
  );
}

function Field({
  children,
  error,
  id,
  label,
  required,
}: {
  children: React.ReactNode;
  error?: string;
  id: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[var(--color-forest-900)]"
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className="mt-2">{children}</div>
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-2 text-sm font-medium text-[#8a3324]">{message}</p>
  ) : null;
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

function routeTypeFromRoute(
  value: string | null | undefined,
): ContactRouteTypeKey {
  return CONTACT_ROUTE_TYPE_OPTIONS.some((option) => option.key === value)
    ? (value as ContactRouteTypeKey)
    : "secure_form";
}

function contactDestinationLabel(routeTypeKey: string | null | undefined) {
  if (routeTypeKey === "secure_form") {
    return "Contact form";
  }

  if (routeTypeKey === "website") {
    return "Website";
  }

  if (routeTypeKey === "email") {
    return "Email";
  }

  if (routeTypeKey === "phone") {
    return "Phone";
  }

  return "Contact destination";
}

function actionStatusClassName(status: ContactEnquiriesActionState["status"]) {
  if (status === "success") {
    return "text-[var(--color-forest-900)]";
  }

  if (status === "error") {
    return "text-[#8a3324]";
  }

  return "text-[var(--color-stone)]";
}
