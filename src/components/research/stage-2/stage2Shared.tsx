"use client";

import Link from "next/link";
import { Clipboard, Download, Timer } from "lucide-react";
import type { ReactNode } from "react";

export function getStorage() {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function emptyFallback(value: string) {
  return value.trim() || "Not recorded";
}

export function listFallback(values: readonly string[]) {
  return values.length > 0 ? values.join(", ") : "None recorded";
}

export function sanitizeFilename(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-z0-9-]+/gi, "_")
      .replace(/^_+|_+$/g, "") || "unassigned"
  );
}

export function downloadMarkdown(filename: string, summary: string) {
  const blob = new Blob([summary], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function Stage2Shell({
  eyebrow,
  title,
  description,
  elapsedSeconds,
  participantCode,
  onParticipantCodeChange,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  elapsedSeconds: number;
  participantCode: string;
  onParticipantCodeChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] px-4 py-6 text-[var(--color-ink)] md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/research/stage-2"
            className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]"
          >
            <span aria-hidden="true" className="mr-2">
              ←
            </span>
            Back to Stage 2
          </Link>
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white/82 px-3 py-2 text-sm font-semibold text-[var(--color-forest-900)]">
            <Timer className="h-4 w-4 stroke-[1.8]" aria-hidden="true" />
            Elapsed: {formatElapsed(elapsedSeconds)}
          </div>
        </div>

        <header className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 p-5 shadow-sm md:p-7">
          <p className="bcmc-eyebrow text-[var(--color-leaf)]">{eyebrow}</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="font-serif text-4xl leading-[1.06] text-[var(--color-forest-900)] md:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--color-stone)]">
                {description}
              </p>
            </div>
            <label className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4 text-sm font-semibold text-[var(--color-forest-900)]">
              Participant code
              <input
                value={participantCode}
                onChange={(event) => onParticipantCodeChange(event.target.value)}
                placeholder="S01"
                className={inputClassName}
              />
            </label>
          </div>
        </header>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/82 p-5 shadow-sm md:p-7">
      <h2 className="font-serif text-3xl leading-[1.1] text-[var(--color-forest-900)]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ResearchStatementCard({
  label,
  statement,
  children,
}: {
  label: string;
  statement: string;
  children?: ReactNode;
}) {
  return (
    <article className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-cream)] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-leaf)]">
        {label}
      </h3>
      <p className="mt-3 text-sm leading-6 text-[var(--color-ink)]/84">
        {statement}
      </p>
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className={labelClassName}>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className={`${inputClassName} min-h-24 resize-y leading-6`}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className={labelClassName}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckboxGroup({
  legend,
  options,
  values,
  onChange,
}: {
  legend: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className={labelClassName}>{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option);

          return (
            <label
              key={option}
              className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-3 text-sm font-semibold ${
                checked
                  ? "border-[var(--color-forest-900)] bg-[var(--color-forest-900)] text-white"
                  : "border-[var(--color-border)] bg-white text-[var(--color-forest-900)]"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked
                      ? values.filter((value) => value !== option)
                      : [...values, option],
                  )
                }
                className="h-4 w-4 accent-[var(--color-forest-900)]"
              />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SummaryActions({
  summary,
  filename,
}: {
  summary: string;
  filename: string;
}) {
  async function copySummary() {
    await window.navigator.clipboard.writeText(summary);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={copySummary} className={primaryButtonClassName}>
        <Clipboard className="h-4 w-4" aria-hidden="true" />
        Copy summary
      </button>
      <button
        type="button"
        onClick={() => downloadMarkdown(filename, summary)}
        className={secondaryButtonClassName}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Download .md
      </button>
    </div>
  );
}

export const labelClassName =
  "text-sm font-semibold text-[var(--color-forest-900)]";
export const inputClassName =
  "w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-antique-gold)]";
export const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-forest-900)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-evergreen)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]";
export const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-forest-900)] shadow-sm transition-colors hover:border-[var(--color-sage)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)]";
