import Link from "next/link";

export default function FindPage() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] px-5 py-12 text-[var(--color-ink)] md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
        >
          Back to homepage
        </Link>
        <div className="mt-24 border-t border-[var(--color-border)] pt-12">
          <h1 className="font-serif text-5xl leading-[1.05] text-[var(--color-forest-900)] md:text-7xl">
            Find a counsellor
          </h1>
          <p className="mt-8 text-xl leading-8 text-[var(--color-stone)]">
            This is a placeholder for the static Phase 1 homepage. The discovery
            experience will be designed and implemented later.
          </p>
        </div>
      </div>
    </main>
  );
}
