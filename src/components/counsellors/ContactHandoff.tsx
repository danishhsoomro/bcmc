"use client";

import { ArrowRight, CalendarDays, MessageCircle, ShieldCheck, X } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export type ContactHandoffRoute = {
  disabledReason: "staging" | "stale" | "unavailable" | null;
  handoffKey: string | null;
  href: string | null;
  routeTypeKey: string | null;
};

export type ContactHandoffConsultation = {
  isFree: boolean;
  minutes: number;
} | null;

type ContactHandoffProps = {
  children: ReactNode;
  className: string;
  consultation: ContactHandoffConsultation;
  practicePossessivePronoun: string;
  preferredName: string;
  route: ContactHandoffRoute | null;
};

type RouteCopy = {
  action: (name: string) => string;
  destination: (name: string) => string;
};

const routeCopy: Record<string, RouteCopy> = {
  email: {
    action: (name) => `Email ${name}`,
    destination: (name) => `You'll continue to email ${name} directly.`,
  },
  phone: {
    action: (name) => `Call ${name}`,
    destination: (name) => `You'll continue to call ${name}.`,
  },
  secure_form: {
    action: () => "Continue to contact form",
    destination: (name) =>
      `You'll continue to ${name}'s clinic contact form.`,
  },
  website: {
    action: () => "Continue to website",
    destination: (name) => `You'll continue to ${name}'s external website.`,
  },
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function ContactHandoff({
  children,
  className,
  consultation,
  practicePossessivePronoun,
  preferredName,
  route,
}: ContactHandoffProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const copy = useMemo(() => {
    const routeTypeKey = route?.routeTypeKey ?? "";
    return routeCopy[routeTypeKey] ?? {
      action: () => "Continue to preferred contact option",
      destination: (name: string) =>
        `You'll continue to ${name}'s preferred contact option.`,
    };
  }, [route?.routeTypeKey]);

  const isPracticeManaged = route?.handoffKey === "practice_managed";
  const finalActionLabel = actionLabel(route, copy, preferredName);
  const title = dialogTitle(route, preferredName);

  function openDialog() {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setIsOpen(true);
  }

  function closeDialog() {
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      const focusTarget =
        dialogRef.current?.querySelector<HTMLElement>(focusableSelector) ??
        dialogRef.current;
      focusTarget?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      const target = lastFocusedRef.current ?? trigger;
      target?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        onClick={openDialog}
      >
        {children}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-ink)]/48 px-4 py-4 backdrop-blur-[2px] sm:items-center sm:px-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog();
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className="max-h-[calc(100vh-2rem)] w-full max-w-[520px] overflow-y-auto rounded-t-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 shadow-[0_24px_80px_rgba(18,60,50,0.24)] outline-none sm:rounded-[var(--radius-lg)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2
                  id={titleId}
                  className="font-serif text-[1.78rem] leading-[1.08] text-[var(--color-forest-900)]"
                >
                  {title}
                </h2>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-forest-900)] transition-colors hover:bg-[var(--color-mist)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-antique-gold)]"
                onClick={closeDialog}
                aria-label="Close contact handoff"
              >
                <X className="h-5 w-5 stroke-[1.8]" aria-hidden="true" />
              </button>
            </div>

            <p
              id={descriptionId}
              className="mt-4 text-[1rem] font-semibold leading-7 text-[var(--color-forest-900)]"
            >
              {copy.destination(preferredName)}
            </p>

            {route?.disabledReason === "stale" ? (
              <p className="mt-3 text-[0.92rem] leading-6 text-[var(--color-stone)]">
                We haven&apos;t recently reconfirmed this contact option.
              </p>
            ) : null}

            {route?.disabledReason === "unavailable" ? (
              <p className="mt-3 text-[0.92rem] leading-6 text-[var(--color-stone)]">
                This contact option is currently unavailable.
              </p>
            ) : null}

            {consultation?.isFree ? (
              <div className="mt-4 flex items-start gap-2.5 text-[0.9rem] leading-6">
                <CalendarDays
                  className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.8] text-[var(--color-leaf)]"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-[var(--color-forest-900)]">
                    Free {consultation.minutes}-minute consultation available
                  </p>
                  <p className="text-[var(--color-stone)]">
                    A chance to ask questions and get a sense of fit.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 border-t border-[var(--color-border)] pt-5">
              <section className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5">
                <MessageCircle
                  className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.8] text-[var(--color-leaf)]"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-[0.68rem] font-bold uppercase leading-4 tracking-[0.16em] text-[var(--color-leaf)]">
                    You don&apos;t need to explain everything at once
                  </h3>
                  <p className="mt-1.5 text-[0.9rem] leading-6 text-[var(--color-stone)]">
                    You can simply say you&apos;re interested in counselling
                  {consultation?.isFree
                    ? " or would like to ask about the free consultation"
                    : ""}
                    .
                  </p>
                </div>
              </section>

              <section className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.8] text-[var(--color-leaf)]"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-[0.68rem] font-bold uppercase leading-4 tracking-[0.16em] text-[var(--color-leaf)]">
                    Your message doesn&apos;t go through BCMC
                  </h3>
                  <p className="mt-1.5 text-[0.9rem] leading-6 text-[var(--color-stone)]">
                    {isPracticeManaged
                      ? `You'll contact ${preferredName} through ${practicePossessivePronoun} practice's contact system.`
                      : `You'll contact ${preferredName} through this external contact option.`}{" "}
                    BCMC does not receive the message you send there.
                  </p>
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-5 py-3 text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
                onClick={closeDialog}
              >
                Cancel
              </button>
              {route?.href && !route.disabledReason ? (
                <a
                  href={route.href}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-forest-900)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
                >
                  <span>{finalActionLabel}</span>
                  <ArrowRight className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-mist)] px-5 py-3 text-sm font-semibold text-[var(--color-forest-900)]/65"
                >
                  {finalActionLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function dialogTitle(route: ContactHandoffRoute | null, preferredName: string) {
  if (route?.disabledReason === "stale") {
    return "Contact details need reconfirmation";
  }

  if (route?.disabledReason === "unavailable" || !route?.href) {
    return "Contact currently unavailable";
  }

  return `Contact ${preferredName}`;
}

function actionLabel(
  route: ContactHandoffRoute | null,
  copy: RouteCopy,
  preferredName: string,
) {
  if (route?.disabledReason === "staging") {
    return "Contact unavailable in staging";
  }

  if (route?.disabledReason === "stale") {
    return "Contact details need reconfirmation";
  }

  if (route?.disabledReason === "unavailable" || !route?.href) {
    return "Contact currently unavailable";
  }

  return copy.action(preferredName);
}
