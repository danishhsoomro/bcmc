"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

type DisclosureTooltipProps = {
  children: React.ReactNode;
  label: string;
};

export function DisclosureTooltip({ children, label }: DisclosureTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className="group/disclosure relative inline-flex align-middle"
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-leaf)] transition-colors hover:text-[var(--color-forest-900)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-antique-gold)]"
      >
        <Info className="h-3.5 w-3.5 stroke-[1.8]" aria-hidden="true" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute left-1/2 top-full z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 whitespace-normal rounded-[var(--radius-sm)] bg-[var(--color-forest-900)] px-3 py-2 text-left text-xs font-normal normal-case leading-5 tracking-normal text-[var(--color-cream)] shadow-[0_8px_20px_rgba(18,60,50,0.16)] group-hover/disclosure:block group-focus-within/disclosure:block ${
          open ? "block" : "hidden"
        }`}
      >
        {children}
      </span>
    </span>
  );
}
