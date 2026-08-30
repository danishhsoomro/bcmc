import Link from "next/link";

const tools = [
  {
    title: "Faith terminology exercise",
    body: "T2 moderator tool for statement teach-back, false-inference coding, and comparison scenarios.",
    href: "/research/stage-2/faith",
  },
  {
    title: "Working-style exercise",
    body: "T4 moderator tool for style statement sorting, priority selection, and forced trade-offs.",
    href: "/research/stage-2/working-style",
  },
] as const;

export default function Stage2IndexPage() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] px-5 py-12 text-[var(--color-ink)] md:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/research/profiles"
          className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
        >
          <span aria-hidden="true" className="mr-2">
            ←
          </span>
          Back to research controls
        </Link>

        <section className="mt-16 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 p-6 shadow-sm md:p-8">
          <p className="bcmc-eyebrow text-[var(--color-leaf)]">
            Internal Stage 2 controls
          </p>
          <h1 className="mt-5 font-serif text-4xl leading-[1.06] text-[var(--color-forest-900)] md:text-5xl">
            BCMC Stage 2 research tools
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--color-stone)]">
            Run the T2 faith terminology exercise or the T4 working-style
            exercise independently. These tools use local browser drafts only.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-5 text-[var(--color-forest-900)] shadow-sm transition-colors hover:border-[var(--color-sage)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
              >
                <h2 className="text-lg font-semibold">{tool.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--color-stone)]">
                  {tool.body}
                </p>
                <span className="mt-5 inline-flex text-sm font-semibold">
                  Open tool <span aria-hidden="true" className="ml-2">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
