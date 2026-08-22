import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  inverse?: boolean;
};

export function SectionHeading({
  eyebrow,
  title,
  children,
  inverse = false,
}: SectionHeadingProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <p
          className={`mb-5 text-xs font-semibold uppercase tracking-[0.18em] ${
            inverse ? "text-[var(--color-sage)]" : "text-[var(--color-leaf)]"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`font-serif text-4xl leading-[1.05] md:text-6xl ${
          inverse ? "text-[var(--color-cream)]" : "text-[var(--color-forest-900)]"
        }`}
      >
        {title}
      </h2>
      {children ? (
        <div
          className={`mt-6 max-w-2xl text-lg leading-8 ${
            inverse ? "text-white/78" : "text-[var(--color-stone)]"
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
