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
          className={`bcmc-eyebrow mb-5 ${
            inverse ? "text-[var(--color-sage)]" : "text-[var(--color-leaf)]"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`bcmc-type-section-primary ${
          inverse ? "text-[var(--color-cream)]" : "text-[var(--color-forest-900)]"
        }`}
      >
        {title}
      </h2>
      {children ? (
        <div
          className={`bcmc-type-lead mt-6 max-w-2xl ${
            inverse ? "text-white/78" : "text-[var(--color-stone)]"
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
