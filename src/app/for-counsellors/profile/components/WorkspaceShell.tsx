import Image from "next/image";
import Link from "next/link";

import { signOutCounsellor } from "../../actions";
import { COUNSELLOR_WORKSPACE_SECTIONS } from "@/lib/counsellor-workspace/sections";
import type {
  CounsellorAccount,
  CounsellorWorkspaceSectionKey,
  CounsellorWorkspaceStatus,
} from "@/lib/counsellor-workspace/types";

type WorkspaceShellProps = {
  activeSectionKey?: CounsellorWorkspaceSectionKey;
  children: React.ReactNode;
  counsellor: CounsellorAccount;
  onboardingUnavailableReason?: string | null;
  statuses: Record<CounsellorWorkspaceSectionKey, CounsellorWorkspaceStatus>;
};

export function WorkspaceShell({
  activeSectionKey,
  children,
  counsellor,
  onboardingUnavailableReason,
  statuses,
}: WorkspaceShellProps) {
  const completedCount = COUNSELLOR_WORKSPACE_SECTIONS.filter(
    (section) => statuses[section.key] === "complete",
  ).length;

  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)]">
      <div className="bcmc-container py-6 md:py-8">
        <header className="flex flex-wrap items-center justify-between gap-5">
          <Link
            href="/"
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            aria-label="BC Muslim Counsellors home"
          >
            <Image
              src="/brand/bcmc-logo.png"
              alt="BCMC British Columbia Muslim Counsellors"
              width={240}
              height={100}
              priority
              className="h-auto w-36 md:w-48"
            />
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/find"
              className="min-h-10 rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            >
              Public directory
            </Link>
            <SignOutButton />
          </div>
        </header>

        <section className="py-10 md:py-12">
          <div className="max-w-4xl">
            <p className="bcmc-eyebrow text-[var(--color-antique-gold)]">
              Your BCMC profile
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-[1.08] text-[var(--color-forest-900)] md:text-6xl">
              Profile workspace
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-stone)] md:text-lg md:leading-8">
              Review the facts BCMC already has, add what is missing, and come
              back whenever you need to continue.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-5 border-y border-[var(--color-border)] py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--color-forest-900)]">
                {completedCount} of {COUNSELLOR_WORKSPACE_SECTIONS.length}{" "}
                sections complete
              </p>
              <div
                className="mt-3 h-2 w-full max-w-sm bg-[var(--color-soft-grey)]"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-[var(--color-leaf)]"
                  style={{
                    width: `${(completedCount / COUNSELLOR_WORKSPACE_SECTIONS.length) * 100}%`,
                  }}
                />
              </div>
              {onboardingUnavailableReason ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8a3324]">
                  Workflow state is unavailable: {onboardingUnavailableReason}
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[var(--color-stone)]">
                  Saved progress is restored when you return.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {counsellor.slug ? (
                <Link
                  href={`/counsellors/${counsellor.slug}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-forest-900)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-forest-900)] hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
                >
                  View published profile
                </Link>
              ) : null}
              <span className="inline-flex min-h-11 items-center justify-center border border-[var(--color-border)] bg-[var(--color-mist)] px-4 py-2 text-sm font-semibold text-[var(--color-stone)]">
                Preview current profile
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            <nav aria-label="Profile sections" className="lg:pt-2">
              <ol className="flex gap-3 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
                {COUNSELLOR_WORKSPACE_SECTIONS.map((section, index) => {
                  const status = statuses[section.key];
                  const active = activeSectionKey === section.key;
                  const secondaryStatus = section.implemented
                    ? statusLabel(status)
                    : "Not available yet";

                  return (
                    <li key={section.key} className="min-w-64 lg:min-w-0">
                      <Link
                        href={section.href}
                        aria-current={active ? "page" : undefined}
                        className={`grid min-h-14 grid-cols-[2rem_minmax(0,1fr)] gap-3 px-3 py-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)] ${
                          active
                            ? "bg-[var(--color-mist)] text-[var(--color-forest-900)]"
                            : "text-[var(--color-ink)] hover:bg-white"
                        }`}
                      >
                        <span
                          className={`flex size-7 items-center justify-center border text-xs font-semibold ${
                            status === "complete"
                              ? "border-[var(--color-leaf)] bg-[var(--color-leaf)] text-white"
                              : "border-[var(--color-border)] bg-white text-[var(--color-stone)]"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span>
                          <span className="block font-semibold">
                            {section.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--color-stone)]">
                            {secondaryStatus}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="min-w-0">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AccountStateShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)]">
      <div className="bcmc-container py-8">
        <header className="flex items-center justify-between gap-6">
          <Link
            href="/"
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
            aria-label="BC Muslim Counsellors home"
          >
            <Image
              src="/brand/bcmc-logo.png"
              alt="BCMC British Columbia Muslim Counsellors"
              width={240}
              height={100}
              priority
              className="h-auto w-36 md:w-48"
            />
          </Link>
          <Link
            href="/find"
            className="hidden min-h-10 items-center rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] sm:inline-flex"
          >
            Public directory
          </Link>
        </header>

        <section className="grid min-h-[calc(100vh-9rem)] items-center py-14">
          <div className="max-w-3xl border-l-4 border-[var(--color-champagne)] pl-6 md:pl-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutCounsellor}>
      <button
        type="submit"
        className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
      >
        Sign out
      </button>
    </form>
  );
}

function statusLabel(status: CounsellorWorkspaceStatus) {
  if (status === "complete") {
    return "Complete";
  }

  if (status === "in_progress") {
    return "In progress";
  }

  if (status === "needs_attention") {
    return "Needs attention";
  }

  return "Not started";
}
