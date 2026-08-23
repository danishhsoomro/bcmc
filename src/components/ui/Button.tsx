import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "quiet" | "light";
};

export function Button({ href, children, variant = "primary" }: ButtonProps) {
  const variants = {
    primary:
      "bg-[var(--color-forest-900)] text-white hover:bg-[var(--color-evergreen)] focus-visible:outline-[var(--color-antique-gold)]",
    quiet:
      "text-[var(--color-forest-900)] underline-offset-4 hover:underline focus-visible:outline-[var(--color-antique-gold)]",
    light:
      "bg-[var(--color-cream)] text-[var(--color-forest-900)] hover:bg-white focus-visible:outline-[var(--color-champagne)]",
  };

  const shared =
    variant === "quiet"
      ? "inline-flex min-h-11 items-center rounded-sm text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4"
      : "inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] px-7 py-3 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4";

  return (
    <Link href={href} className={`${shared} ${variants[variant]}`}>
      {children}
    </Link>
  );
}
