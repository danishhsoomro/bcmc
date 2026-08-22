import Image from "next/image";
import Link from "next/link";

import { homeContent } from "@/data/home";

type SocialLabel = (typeof homeContent.footer.socials)[number]["label"];

export function Footer() {
  const { footer } = homeContent;

  return (
    <footer id="footer" className="bg-[var(--color-forest-900)] text-[var(--color-cream)]">
      <div className="mx-auto max-w-[1240px] px-5 py-11 md:px-8 md:py-13">
        <div className="grid gap-10 md:grid-cols-2 md:gap-x-14 md:gap-y-12 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,0.82fr)_minmax(0,0.92fr)_minmax(0,1.1fr)] lg:gap-10">
          <div className="max-w-[440px] lg:max-w-none">
            <Link
              href="/"
              className="block w-fit rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-champagne)]"
              aria-label="British Columbia Muslim Counsellors home"
            >
              <Image
                src="/brand/bcmc-logo.png"
                alt="BCMC British Columbia Muslim Counsellors"
                width={240}
                height={100}
                className="h-auto w-52 brightness-0 invert md:w-60"
              />
            </Link>

            <p className="mt-5 max-w-[400px] text-base leading-7 text-[rgba(248,245,240,0.84)]">
              {footer.brand.description}
            </p>

            <nav aria-label="Social links" className="mt-5">
              <ul className="flex flex-wrap gap-3">
                {footer.socials.map((social) => {
                  return (
                    <li key={social.label}>
                      <Link
                        href={social.href}
                        aria-label={social.label}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(248,245,240,0.18)] bg-[rgba(248,245,240,0.06)] text-[rgba(248,245,240,0.82)] transition-colors duration-200 hover:border-[rgba(248,245,240,0.34)] hover:bg-[rgba(248,245,240,0.11)] hover:text-[var(--color-cream)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-champagne)]"
                      >
                        <SocialIcon label={social.label} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <p className="mt-5 max-w-[430px] text-[0.8125rem] leading-6 text-[rgba(248,245,240,0.6)]">
              {footer.brand.disclaimer}
            </p>
            <Link
              href={footer.brand.urgent.href}
              className="mt-2 inline-flex rounded-sm text-sm font-medium text-[rgba(248,245,240,0.82)] underline-offset-4 transition-colors hover:text-[var(--color-cream)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-champagne)]"
            >
              {footer.brand.urgent.label}
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>
          </div>

          {footer.columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-sm font-semibold text-[var(--color-cream)]">
                {column.heading}
              </h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6">
                {column.links.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="inline-flex rounded-sm text-[rgba(248,245,240,0.82)] underline-offset-4 transition-colors hover:text-[var(--color-cream)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-champagne)]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-[rgba(248,245,240,0.12)] pt-5 md:mt-12 md:flex md:items-center md:justify-between md:gap-8">
          <p className="text-xs leading-6 text-[rgba(248,245,240,0.56)]">
            {footer.legal.copyright}
          </p>
          <nav aria-label="Legal links" className="mt-4 md:mt-0">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs leading-6">
              {footer.legal.links.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="rounded-sm text-[rgba(248,245,240,0.64)] underline-offset-4 transition-colors hover:text-[var(--color-cream)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-champagne)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ label }: { label: SocialLabel }) {
  const shared = {
    className: "h-4.5 w-4.5",
    "aria-hidden": true,
    fill: "none",
    viewBox: "0 0 24 24",
  } as const;

  if (label === "Instagram") {
    return (
      <svg {...shared}>
        <rect
          x="4.5"
          y="4.5"
          width="15"
          height="15"
          rx="4.2"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="16.5" cy="7.5" r="0.9" fill="currentColor" />
      </svg>
    );
  }

  if (label === "Facebook") {
    return (
      <svg {...shared}>
        <path
          d="M14.5 8.1H13c-.9 0-1.3.5-1.3 1.4v1.4h2.6l-.4 2.5h-2.2v6.1H9.1v-6.1H7.3v-2.5h1.8V9.2c0-2.3 1.4-3.8 3.7-3.8.8 0 1.4.1 1.7.2v2.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (label === "LinkedIn") {
    return (
      <svg {...shared}>
        <rect
          x="4.5"
          y="4.5"
          width="15"
          height="15"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M8 10.4v5.7M8 7.9v.1M11.2 16.1v-5.7M11.2 12.9c.3-1.5 1.2-2.6 2.7-2.6 1.6 0 2.5 1.1 2.5 3v2.8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <rect
        x="3.8"
        y="6.6"
        width="16.4"
        height="10.8"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="m10.5 9.4 4.1 2.6-4.1 2.6V9.4Z" fill="currentColor" />
    </svg>
  );
}
