import type { CounsellorPracticeAreaRow } from "./types";

export type ConcernEmphasisKey = "primary" | "additional";

export type WhatYouHelpWithValue = {
  practiceAreaKey: string;
  emphasisKey: ConcernEmphasisKey;
};

export type WhatYouHelpWithFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
  savedStateKey: string;
  values: {
    practiceAreas: WhatYouHelpWithValue[];
  };
};

export function buildWhatYouHelpWithInitialState({
  practiceAreas,
}: {
  practiceAreas: CounsellorPracticeAreaRow[];
}): WhatYouHelpWithFormState {
  const values = practiceAreas
    .filter((area) => isConcernEmphasisKey(area.emphasis_key))
    .map((area) => ({
      practiceAreaKey: area.practice_area_key,
      emphasisKey: area.emphasis_key as ConcernEmphasisKey,
    }));

  return {
    status: "idle",
    message: "",
    fieldErrors: {},
    savedStateKey: whatYouHelpWithStateKey(values),
    values: {
      practiceAreas: values,
    },
  };
}

export function whatYouHelpWithStateKey(values: WhatYouHelpWithValue[]) {
  return JSON.stringify(
    values
      .map((value) => ({
        practiceAreaKey: value.practiceAreaKey,
        emphasisKey: value.emphasisKey,
      }))
      .sort((a, b) => a.practiceAreaKey.localeCompare(b.practiceAreaKey)),
  );
}

export function isConcernEmphasisKey(
  value: string | null | undefined,
): value is ConcernEmphasisKey {
  return value === "primary" || value === "additional";
}
