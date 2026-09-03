import Image from "next/image";
import Link from "next/link";

import { SignInForm } from "./SignInForm";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function CounsellorSignInPage({
  searchParams,
}: SignInPageProps) {
  const params = await searchParams;
  const hasAuthError = params.error === "auth";

  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)]">
      <section className="bcmc-container grid min-h-screen items-center py-10 md:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.58fr)] md:gap-14 lg:gap-20">
        <div className="max-w-2xl">
          <Link
            href="/"
            className="inline-flex w-fit rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            aria-label="BC Muslim Counsellors home"
          >
            <Image
              src="/brand/bcmc-logo.png"
              alt="BCMC British Columbia Muslim Counsellors"
              width={240}
              height={100}
              priority
              className="h-auto w-42 md:w-52"
            />
          </Link>
          <p className="bcmc-eyebrow mt-14 text-[var(--color-antique-gold)]">
            Counsellor access
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05] text-[var(--color-forest-900)] md:text-7xl">
            Sign in to your BCMC profile space
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--color-stone)]">
            This area is for counsellors invited by BCMC. Seeker access stays
            public and does not require an account.
          </p>
          <Link
            href="/find"
            className="mt-8 inline-flex min-h-10 items-center rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
          >
            Back to find a counsellor
          </Link>
        </div>

        <div className="mt-10 border-t border-[var(--color-border)] pt-8 md:mt-0 md:border-l md:border-t-0 md:pl-10 lg:pl-12">
          <div className="max-w-md">
            <h2 className="font-serif text-3xl leading-tight text-[var(--color-forest-900)]">
              Continue securely
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-stone)]">
              Use the same email or Google account BCMC used for your
              invitation.
            </p>

            {hasAuthError ? (
              <p className="mt-5 rounded-[var(--radius-sm)] bg-[#fff4ef] px-4 py-3 text-sm leading-6 text-[#7d3320]">
                We could not complete sign-in. Please try again.
              </p>
            ) : null}

            <SignInForm />
          </div>
        </div>
      </section>
    </main>
  );
}
