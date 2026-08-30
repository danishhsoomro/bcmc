import Link from "next/link";
import {
  Building2,
  Languages,
  MapPin,
  ShieldCheck,
  Video,
} from "lucide-react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { DisclosureTooltip } from "@/components/ui/DisclosureTooltip";
import { evaluateFreshness, freshnessPolicies } from "@/lib/freshness";
import { createProfileImageSignedUrl } from "@/lib/supabase/admin-storage";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { Json, Database } from "../../../supabase/database.types";

type CounsellorCardRow =
  Database["public"]["Views"]["v_counsellor_cards_app"]["Row"];

type JsonRecord = { [key: string]: Json | undefined };

type CardView = {
  availability: {
    label: string;
    tooltip: string | null;
  };
  credential: {
    code: string | null;
    tooltip: string | null;
  };
  displayName: string;
  href: string;
  imageAlt: string;
  imagePosition: string;
  imageUrl: string | null;
  initials: string;
  languages: string[];
  location: string | null;
  modalities: string[];
  preferredName: string;
  practiceAreas: string[];
  scope: string | null;
};

const cardImageSignedUrlTtlSeconds = 60 * 60;

export default async function FindPage() {
  const cards = await getCounsellorCards();
  const cardViews = await Promise.all(cards.map(buildCardView));

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)]">
      <Header />
      <main className="pt-28 md:pt-34">
        <section className="bcmc-container pb-14 md:pb-18">
          <div className="max-w-3xl">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              Back to homepage
            </Link>
            <h1 className="mt-10 font-serif text-5xl leading-[1.05] text-[var(--color-forest-900)] md:text-7xl">
              Find a counsellor
            </h1>
            <p className="mt-6 text-xl leading-8 text-[var(--color-stone)]">
              Browse profiles to learn who they work with, what they support,
              languages, location, availability and more.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cardViews.map((card) => (
              <CounsellorCard key={card.href} card={card} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

async function getCounsellorCards() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("v_counsellor_cards_app")
    .select("*")
    .order("display_name");

  if (error) {
    throw error;
  }

  return data satisfies CounsellorCardRow[];
}

async function buildCardView(card: CounsellorCardRow): Promise<CardView> {
  const displayName = card.display_name ?? "Counsellor";
  const preferredName = card.preferred_name ?? firstName(displayName);
  const image = record(card.profile_image);
  const storagePath = stringValue(image, "storage_path");
  const imageUrl = storagePath
    ? await createProfileImageSignedUrl(storagePath, cardImageSignedUrlTtlSeconds)
    : null;

  return {
    availability: cardAvailability(record(card.availability), preferredName, card),
    credential: cardCredential(record(card.primary_credential)),
    displayName,
    href: card.slug ? `/counsellors/${card.slug}` : "/find",
    imageAlt: stringValue(image, "alt_text") ?? displayName,
    imagePosition: objectPosition(image),
    imageUrl,
    initials: initials(displayName),
    languages: labels(card.therapy_languages),
    location: summarizeCardLocation(records(card.locations)),
    modalities: records(card.delivery_modes)
      .map((mode) => formatDeliveryMode(stringValue(mode, "delivery_mode_key")))
      .filter(isPresent),
    preferredName,
    practiceAreas: labels(card.primary_practice_areas).slice(0, 3),
    scope: joinScope(labels(card.client_groups), labels(card.service_types)),
  };
}

function CounsellorCard({ card }: { card: CardView }) {
  return (
    <article className="overflow-visible rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/78 transition-colors hover:border-[var(--color-sage)]">
      <div className="relative h-56 overflow-hidden rounded-t-[var(--radius-md)] bg-[linear-gradient(180deg,var(--color-mist),var(--color-sand))]">
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt={card.imageAlt}
            className="h-full w-full object-cover"
            style={{ objectPosition: card.imagePosition }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full border border-[var(--color-champagne)] bg-[var(--color-cream)] font-serif text-[1.625rem] text-[var(--color-forest-900)]"
              aria-hidden="true"
            >
              {card.initials}
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={card.href}
              className="font-serif text-3xl leading-tight text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              {card.displayName}
            </Link>
            {card.scope ? (
              <p className="mt-1 text-sm font-medium leading-5 text-[var(--color-leaf)]">
                {card.scope}
              </p>
            ) : null}
          </div>

          {card.credential.code ? (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-cream)] px-2.5 py-1 text-xs font-semibold text-[var(--color-forest-900)]">
              <ShieldCheck
                className="h-3.5 w-3.5 text-[var(--color-leaf)]"
                aria-hidden="true"
              />
              <span>{card.credential.code}</span>
              {card.credential.tooltip ? (
                <DisclosureTooltip label="RCC status information">
                  {card.credential.tooltip}
                </DisclosureTooltip>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-forest-900)]">
          <span
            className="h-2.5 w-2.5 rounded-full bg-[var(--color-leaf)]"
            aria-hidden="true"
          />
          <span>{card.availability.label}</span>
          {card.availability.tooltip ? (
            <DisclosureTooltip label="Availability confirmation information">
              {card.availability.tooltip}
            </DisclosureTooltip>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 border-t border-[var(--color-border)]/35 pt-4 text-sm leading-5 text-[var(--color-stone)]">
          {card.location ? (
            <p className="flex items-center gap-2">
              <MapPin
                className="h-4 w-4 shrink-0 text-[var(--color-leaf)]"
                aria-hidden="true"
              />
              <span>{card.location}</span>
            </p>
          ) : null}
          {card.modalities.length > 0 ? (
            <p className="flex items-center gap-2">
              {card.modalities.some((modality) =>
                modality.toLowerCase().includes("person"),
              ) ? (
                <Building2
                  className="h-4 w-4 shrink-0 text-[var(--color-leaf)]"
                  aria-hidden="true"
                />
              ) : (
                <Video
                  className="h-4 w-4 shrink-0 text-[var(--color-leaf)]"
                  aria-hidden="true"
                />
              )}
              <span>{card.modalities.join(" + ")}</span>
            </p>
          ) : null}
          {card.languages.length > 0 ? (
            <p className="flex items-center gap-2">
              <Languages
                className="h-4 w-4 shrink-0 text-[var(--color-leaf)]"
                aria-hidden="true"
              />
              <span>{card.languages.join(" + ")}</span>
            </p>
          ) : null}
        </div>

        {card.practiceAreas.length > 0 ? (
          <p className="mt-4 text-sm font-medium leading-6 text-[var(--color-ink)]/78">
            {card.practiceAreas.join(" · ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function cardAvailability(
  availability: JsonRecord | null,
  preferredName: string,
  card: CounsellorCardRow,
) {
  const key = stringValue(availability, "status_key");
  const freshness = evaluateFreshness(
    stringValue(availability, "confirmed_at"),
    freshnessPolicies.availability,
  );
  const label =
    freshness.state === "stale"
      ? "Availability needs reconfirmation"
      : freshness.state === "unknown"
        ? "Availability unknown"
      : availabilityLabel(key);

  return {
    label,
    tooltip: availabilityTooltip(preferredName, key, freshness, card.gender_key),
  };
}

function availabilityTooltip(
  preferredName: string,
  key: string | null,
  freshness: ReturnType<typeof evaluateFreshness>,
  genderKey: string | null,
) {
  const status = availabilityStatusPhrase(key);

  if (freshness.state === "fresh" && freshness.confirmedRelativeText && status) {
    return `${preferredName} confirmed ${subjectPronoun(genderKey)} was ${status} ${freshness.confirmedRelativeText}. Availability can change, so we ask counsellors to reconfirm it regularly.`;
  }

  if (freshness.state === "aging" && freshness.confirmedRelativeText && status) {
    return `${preferredName} last confirmed ${subjectPronoun(genderKey)} was ${status} ${freshness.confirmedRelativeText}. ${possessivePronoun(genderKey)} availability may have changed since then.`;
  }

  if (freshness.state === "stale") {
    return `We haven't received a recent availability confirmation from ${preferredName}. This doesn't mean ${subjectPronoun(genderKey)} isn't accepting clients.`;
  }

  return null;
}

function cardCredential(credential: JsonRecord | null) {
  const checkedAt = formatShortDate(stringValue(credential, "checked_at"));
  const isRcc = stringValue(credential, "label")
    ?.toLowerCase()
    .includes("registered clinical counsellor");

  return {
    code: isRcc ? "RCC" : null,
    tooltip: checkedAt ? `RCC status checked by BCMC on ${checkedAt}.` : null,
  };
}

function record(value: Json | null | undefined): JsonRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value;
}

function records(value: Json | null | undefined): JsonRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const itemRecord = record(item);
    return itemRecord ? [itemRecord] : [];
  });
}

function labels(value: Json | null) {
  return records(value)
    .map((item) => stringValue(item, "label"))
    .filter(isPresent);
}

function stringValue(
  source: JsonRecord | null | undefined,
  key: string,
): string | null {
  const value = source?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(
  source: JsonRecord | null | undefined,
  key: string,
): number | null {
  const value = source?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function summarizeCardLocation(locations: JsonRecord[]) {
  const location = locations[0];
  return (
    stringValue(location, "city") ??
    stringValue(location, "label") ??
    stringValue(location, "area")
  );
}

function objectPosition(image: JsonRecord | null) {
  const focalX = numberValue(image, "focal_x") ?? 0.5;
  const focalY = numberValue(image, "focal_y") ?? 0.5;

  return `${Math.round(focalX * 100)}% ${Math.round(focalY * 100)}%`;
}

function availabilityLabel(key: string | null) {
  if (key === "accepting") {
    return "Accepting clients";
  }

  if (key === "limited") {
    return "Limited availability";
  }

  if (key === "waitlist") {
    return "Waitlist available";
  }

  if (key === "not_accepting") {
    return "Not currently accepting clients";
  }

  return "Availability unknown";
}

function availabilityStatusPhrase(key: string | null) {
  if (key === "accepting") {
    return "accepting new clients";
  }

  if (key === "limited") {
    return "offering limited availability";
  }

  if (key === "waitlist") {
    return "offering a waitlist";
  }

  if (key === "not_accepting") {
    return "not currently accepting clients";
  }

  return null;
}

function formatDeliveryMode(key: string | null) {
  if (key === "in_person") {
    return "In person";
  }

  if (key === "virtual") {
    return "Virtual";
  }

  if (key === "hybrid") {
    return "Hybrid";
  }

  return key ? humanizeKey(key) : null;
}

function joinScope(clientGroups: string[], serviceTypes: string[]) {
  const parts = compactStrings([joinList(clientGroups), joinList(serviceTypes)]);
  return parts.length ? parts.join(" · ") : null;
}

function joinList(values: string[]) {
  return values.length ? values.join(" + ") : null;
}

function compactStrings(values: (string | null | undefined)[]) {
  return values.filter(isPresent);
}

function isPresent(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function subjectPronoun(genderKey: string | null) {
  if (genderKey === "woman") {
    return "she";
  }

  if (genderKey === "man") {
    return "he";
  }

  return "they";
}

function possessivePronoun(genderKey: string | null) {
  if (genderKey === "woman") {
    return "Her";
  }

  if (genderKey === "man") {
    return "His";
  }

  return "Their";
}

function humanizeKey(key: string) {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatShortDate(value: string | null) {
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
