import Link from "next/link";

import {
  isNarrativeVariant,
  type NarrativeVariant,
} from "@/data/aminaResearchProfile";

type AminaContactPageProps = {
  searchParams: Promise<{ variant?: string | string[] }>;
};

export default async function AminaContactPage({
  searchParams,
}: AminaContactPageProps) {
  const params = await searchParams;
  const variantParam = Array.isArray(params.variant)
    ? params.variant[0]
    : params.variant;
  const narrativeVariant: NarrativeVariant = isNarrativeVariant(variantParam)
    ? variantParam
    : "long";

  return (
    <main className="min-h-screen bg-[var(--color-cream)] px-5 py-12 text-[var(--color-ink)] md:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 p-6 shadow-sm md:p-8">
          <p className="bcmc-eyebrow text-[var(--color-leaf)]">Contact handoff</p>
          <h1 className="mt-5 font-serif text-4xl leading-[1.06] text-[var(--color-forest-900)] md:text-5xl">
            You&apos;re leaving BCMC to contact Amina
          </h1>
          <div className="bcmc-type-body mt-7 space-y-5 text-[var(--color-ink)]/84">
            <p>
              In a real profile, you would continue to the counsellor&apos;s own
              secure clinic contact or booking page.
            </p>
            <p>
              BCMC would not receive the clinical information you send there.
            </p>
          </div>
          <Link
            href={`/research/profile/amina?variant=${narrativeVariant}`}
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-forest-900)] px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
          >
            Return to Amina&apos;s profile
          </Link>
        </section>
      </div>
    </main>
  );
}
