import Image from "next/image";

import { homeContent } from "@/data/home";

export function PermissionSection() {
  const { permission } = homeContent;

  return (
    <section className="bg-[var(--color-cream)] px-5 py-14 md:px-8 md:py-14 lg:py-16">
      <div className="mx-auto grid max-w-[1240px] gap-12 md:min-h-[350px] md:grid-cols-2 md:items-center lg:min-h-[370px]">
        <div data-motion="permission-heading-copy" className="max-w-[520px]">
          <h2 className="max-w-[460px] font-serif text-[2.6rem] leading-[1.08] text-[var(--color-forest-900)] md:text-[3rem] lg:text-[3.25rem]">
            {permission.heading}
          </h2>
          <div
            data-motion="permission-thoughts"
            className="mt-7 space-y-2.5 text-base leading-7 text-[var(--color-stone)] md:text-lg md:leading-8"
          >
            {permission.statements.map((statement) => (
              <p key={statement}>{statement}</p>
            ))}
          </div>
          <p
            data-motion="permission-reassurance"
            className="mt-5 text-base font-semibold leading-7 text-[var(--color-forest-900)] md:text-lg"
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
