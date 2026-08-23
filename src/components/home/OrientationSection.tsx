import { homeContent } from "@/data/home";
import {
  ArrowDown,
  ArrowRight,
  ContactRound,
  Heart,
  MessagesSquare,
  SlidersHorizontal,
} from "lucide-react";

const stepIcons = {
  tell: MessagesSquare,
  explore: SlidersHorizontal,
  learn: ContactRound,
  decide: Heart,
} as const;

const stepStyles = {
  tell: {
    circle: "bg-[var(--color-mist)]",
    icon: "text-[var(--color-evergreen)]",
  },
  explore: {
    circle: "bg-[var(--color-pale-iris)]",
    icon: "text-[var(--color-muted-iris)]",
  },
  learn: {
    circle: "bg-[#F4E5DE]",
    icon: "text-[var(--color-clay)]",
  },
  decide: {
    circle: "bg-[#F3EEE4]",
    icon: "text-[var(--color-antique-gold)]",
  },
} as const;

export function OrientationSection() {
  const { orientation } = homeContent;

  return (
    <section
      id="orientation"
      className="bcmc-section-large bg-[var(--color-cream)]"
    >
      <div className="bcmc-container">
        <h2 className="bcmc-type-section-primary text-[var(--color-forest-900)]">
          {orientation.heading}
        </h2>

        <ol className="mt-16 grid gap-9 md:grid-cols-2 md:gap-x-14 md:gap-y-16 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-start lg:gap-x-8">
          {orientation.steps.map((step, index) => (
            <StageItem key={step.id} step={step} showConnector={index < orientation.steps.length - 1} />
          ))}
        </ol>
      </div>
    </section>
  );
}

type Stage = (typeof homeContent.orientation.steps)[number];

function StageItem({
  step,
  showConnector,
}: {
  step: Stage;
  showConnector: boolean;
}) {
  const Icon = stepIcons[step.id];
  const styles = stepStyles[step.id];

  return (
    <>
      <li
        data-motion="orientation-stage"
        className="flex flex-col items-center text-center lg:min-w-[175px]"
      >
        <div
          data-motion="orientation-icon"
          className={`flex h-22 w-22 items-center justify-center rounded-full ${styles.circle}`}
        >
          <Icon className={`h-8 w-8 stroke-[1.7] ${styles.icon}`} aria-hidden="true" />
        </div>
        <h3
          data-motion="orientation-title"
          className="bcmc-type-feature mt-7 font-semibold text-[var(--color-forest-900)]"
        >
          {step.title}
        </h3>
        <p
          data-motion="orientation-copy"
          className="bcmc-type-body-sm mt-4 text-[var(--color-stone)]"
        >
          {step.body.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </li>
      {showConnector ? (
        <li
          data-motion="orientation-connector"
          className="flex items-center justify-center text-[#C9C3C9] md:hidden lg:flex lg:pt-8"
          aria-hidden="true"
        >
          <ArrowDown className="h-5 w-5 stroke-[1.6] lg:hidden" />
          <ArrowRight className="hidden h-5 w-5 stroke-[1.6] lg:block" />
        </li>
      ) : null}
    </>
  );
}
