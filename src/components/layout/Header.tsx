"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { homeContent } from "@/data/home";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="absolute inset-x-0 top-0 z-20 bg-[linear-gradient(180deg,rgba(248,245,240,0.88)_0%,rgba(248,245,240,0.58)_58%,rgba(248,245,240,0)_100%)]">
      <div className="bcmc-container flex items-center justify-between gap-10 py-5 md:py-6">
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
        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex items-center gap-4 text-sm font-medium text-[var(--color-ink)]/82 lg:gap-6 xl:gap-8">
            {homeContent.navigation.map((item) => {
              const isActive = item.href.startsWith("/") && pathname === item.href;

              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-sm border-b-2 pb-2 transition-colors hover:text-[var(--color-forest-900)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-antique-gold)] ${
                      isActive
                        ? "border-[var(--color-forest-900)] text-[var(--color-forest-900)]"
                        : "border-transparent"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
