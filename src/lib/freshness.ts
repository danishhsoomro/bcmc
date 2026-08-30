export type FreshnessState = "fresh" | "aging" | "stale" | "unknown";

export type FreshnessPolicy = {
  agingDays?: number;
  freshDays: number;
};

export type FreshnessResult = {
  ageDays: number | null;
  canAssert: boolean;
  confirmedDateText: string | null;
  confirmedRelativeText: string | null;
  state: FreshnessState;
};

export const freshnessPolicies = {
  availability: {
    agingDays: 60,
    freshDays: 30,
  },
  contactRoute: {
    freshDays: 90,
  },
  feePolicy: {
    freshDays: 90,
  },
} satisfies Record<string, FreshnessPolicy>;

export function evaluateFreshness(
  confirmedAt: string | null | undefined,
  policy: FreshnessPolicy,
  now = new Date(),
): FreshnessResult {
  const confirmedDate = parseConfirmedAt(confirmedAt);

  if (!confirmedDate) {
    return {
      ageDays: null,
      canAssert: false,
      confirmedDateText: null,
      confirmedRelativeText: null,
      state: "unknown",
    };
  }

  const ageDays = Math.max(
    0,
    Math.floor((now.getTime() - confirmedDate.getTime()) / 86_400_000),
  );
  const state = freshnessState(ageDays, policy);

  return {
    ageDays,
    canAssert: state === "fresh" || state === "aging",
    confirmedDateText: formatConfirmedDate(confirmedDate),
    confirmedRelativeText: formatRelativeAge(ageDays),
    state,
  };
}

function parseConfirmedAt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function freshnessState(ageDays: number, policy: FreshnessPolicy): FreshnessState {
  if (ageDays <= policy.freshDays) {
    return "fresh";
  }

  if (policy.agingDays && ageDays <= policy.agingDays) {
    return "aging";
  }

  return "stale";
}

function formatConfirmedDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatRelativeAge(ageDays: number) {
  if (ageDays === 0) {
    return "today";
  }

  if (ageDays === 1) {
    return "1 day ago";
  }

  return `${ageDays} days ago`;
}
