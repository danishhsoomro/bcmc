import Link from "next/link";
import { notFound } from "next/navigation";

const resourceTitles = {
  "how-counselling-can-help": "How counselling can help",
  "what-to-expect": "What to expect",
  "finding-the-right-support": "Finding the right kind of support",
} as const;

type ResourceSlug = keyof typeof resourceTitles;

export function generateStaticParams() {
  return Object.keys(resourceTitles).map((slug) => ({ slug }));
}

export default async function ResourcePlaceholder({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!isResourceSlug(slug)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--color-cream)] px-5 py-16 md:px-8">
      <div className="mx-auto max-w-[760px]">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
        >
          ← Back to home
        </Link>
        <h1 className="mt-10 font-serif text-[2.5rem] leading-[1.08] text-[var(--color-forest-900)] md:text-5xl">
          {resourceTitles[slug]}
        </h1>
        <p className="mt-6 text-base leading-7 text-[var(--color-stone)]">
          This resource page is a placeholder for the Phase 1 static homepage.
        </p>
      </div>
    </main>
  );
}

function isResourceSlug(slug: string): slug is ResourceSlug {
  return slug in resourceTitles;
}
