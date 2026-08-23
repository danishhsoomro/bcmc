import Image from "next/image";

import { homeContent } from "@/data/home";

export function PermissionSection() {
  const { permission } = homeContent;

  return (
    <section className="bcmc-section-compact bg-[var(--color-cream)]">
      <div className="bcmc-container grid gap-12 md:min-h-[350px] md:grid-cols-2 md:items-center lg:min-h-[370px]">
        <div data-motion="permission-heading-copy" className="max-w-[520px]">
          <h2 className="bcmc-type-section-primary max-w-[520px] text-[var(--color-forest-900)]">
            {permission.heading}
          </h2>
          <div
            data-motion="permission-thoughts"
            className="bcmc-type-body mt-7 space-y-2.5 text-[var(--color-stone)]"
          >
            {permission.statements.map((statement) => (
              <p key={statement}>{statement}</p>
            ))}
          </div>
          <p
            data-motion="permission-reassurance"
            className="bcmc-type-body mt-5 font-semibold text-[var(--color-forest-900)]"
          >
            {permission.reassurance}
          </p>
        </div>
        <div
          data-motion="permission-illustration"
          className="flex items-center justify-center md:justify-end"
        >
          <Image
            src="/images/illustrations/winding-path.png"
            alt=""
            width={620}
            height={310}
            className="h-auto w-full max-w-[430px] object-contain md:max-w-[76%] lg:max-w-[82%]"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
