import type {
  CounsellorCulturalFamiliarityRow,
  CounsellorWorkspaceStatus,
} from "./types";

export type CulturalFamiliarityValue = {
  selectedKeys: string[];
  explicitlyNoHighlights: boolean;
};

export type CulturalFamiliarityFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
  savedStateKey: string;
  values: CulturalFamiliarityValue;
};

export function buildCulturalFamiliarityInitialState({
  onboardingStatus,
  selections,
}: {
  onboardingStatus: CounsellorWorkspaceStatus;
  selections: CounsellorCulturalFamiliarityRow[];
}): CulturalFamiliarityFormState {
  const selectedKeys = uniqueSortedKeys(
    selections
      .filter((selection) => selection.active)
      .map((selection) => selection.familiarity_key),
  );
  const values =
    selectedKeys.length > 0
      ? {
          selectedKeys,
          explicitlyNoHighlights: false,
        }
      : {
          selectedKeys: [],
          explicitlyNoHighlights: onboardingStatus === "complete",
        };

  return {
    status: "idle",
    message: "",
    fieldErrors: {},
    savedStateKey: culturalFamiliarityStateKey(values),
    values,
  };
}

export function normalizeCulturalFamiliarityValue(
  value: CulturalFamiliarityValue,
): CulturalFamiliarityValue {
  return {
    selectedKeys: value.explicitlyNoHighlights
      ? []
      : uniqueSortedKeys(value.selectedKeys),
    explicitlyNoHighlights: value.explicitlyNoHighlights,
  };
}

export function validateCulturalFamiliarityValue(
  value: CulturalFamiliarityValue,
  activeKeys: Set<string>,
) {
  const normalized = normalizeCulturalFamiliarityValue(value);
  const fieldErrors: Record<string, string> = {};

  if (
    normalized.selectedKeys.length === 0 &&
    !normalized.explicitlyNoHighlights
  ) {
    fieldErrors.selection =
      "Choose at least one context, or choose that you do not want to highlight any specific cultural or community familiarity.";
  }

  if (normalized.selectedKeys.some((key) => !activeKeys.has(key))) {
    fieldErrors.selection =
      "Choose only currently available cultural or community familiarity options.";
  }

  return fieldErrors;
}

export function culturalFamiliarityStateKey(value: CulturalFamiliarityValue) {
  return JSON.stringify(normalizeCulturalFamiliarityValue(value));
}

function uniqueSortedKeys(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}
