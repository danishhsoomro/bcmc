import Link from "next/link";

const variants = [
  {
    label: "Open Long Bio",
    href: "/research/profile/amina?variant=long",
  },
  {
    label: "Open Structured",
    href: "/research/profile/amina?variant=structured",
  },
  {
    label: "Open Hybrid",
    href: "/research/profile/amina?variant=hybrid",
  },
] as const;

export default function ResearchProfilesPage() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] px-5 py-12 text-[var(--color-ink)] md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
        >
          Back to homepage
        </Link>

        <section className="mt-20 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 p-6 shadow-sm md:p-8">
          <p className="bcmc-eyebrow text-[var(--color-leaf)]">
            Internal research controls - not participant-facing.
          </p>
          <h1 className="mt-5 font-serif text-4xl leading-[1.06] text-[var(--color-forest-900)] md:text-5xl">
            Amina Rahman - T1 Narrative Test
          </h1>
          <Link
            href="/research/session"
            className="mt-8 flex min-h-12 items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-forest-900)] bg-[var(--color-forest-900)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
          >
            Start T1 participant session
            <span aria-hidden="true">→</span>
          </Link>
          <ul className="mt-5 grid gap-3">
            {variants.map((variant) => (
              <li key={variant.href}>
                <Link
                  href={variant.href}
                  className="flex min-h-12 items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] px-4 py-3 text-sm font-semibold text-[var(--color-forest-900)] transition-colors hover:border-[var(--color-sage)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
                >
                  {variant.label}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
