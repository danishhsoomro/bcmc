import type {
  WorkingStyleContextReasonRow,
  WorkingStyleQuestionOptionRow,
  WorkingStyleQuestionResponseRow,
  WorkingStyleQuestionRow,
  WorkingStyleResponseContextRow,
} from "./types";

export const WORKING_STYLE_QUESTIONNAIRE_VERSION = 1;
export const OTHER_CONTEXT_KEY = "other";
export const CLARIFICATION_NOTE_MAX_LENGTH = 500;

export type WorkingStyleAnswerValue = {
  questionKey: string;
  optionKey: string;
  contextKeys: string[];
  clarificationNote: string;
};

export type WorkingStyleFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
  savedStateKey: string;
  values: {
    responses: WorkingStyleAnswerValue[];
  };
};

export function buildHowYouWorkInitialState({
  responseContexts,
  responses,
}: {
  responseContexts: WorkingStyleResponseContextRow[];
  responses: WorkingStyleQuestionResponseRow[];
}): WorkingStyleFormState {
  const contextKeysByResponseId = new Map<string, string[]>();

  for (const context of responseContexts) {
    const keys = contextKeysByResponseId.get(context.response_id) ?? [];
    keys.push(context.context_key);
    contextKeysByResponseId.set(context.response_id, keys);
  }

  const values = normalizeWorkingStyleAnswers(
    responses.map((response) => ({
      questionKey: response.question_key,
      optionKey: response.option_key,
      contextKeys: contextKeysByResponseId.get(response.id) ?? [],
      clarificationNote: response.clarification_note ?? "",
    })),
  );

  return {
    status: "idle",
    message: "",
    fieldErrors: {},
    savedStateKey: howYouWorkStateKey(values),
    values: {
      responses: values,
    },
  };
}

export function normalizeWorkingStyleAnswers(
  values: WorkingStyleAnswerValue[],
) {
  return values
    .filter((value) => value.questionKey && value.optionKey)
    .map((value) => ({
      questionKey: value.questionKey,
      optionKey: value.optionKey,
      contextKeys: Array.from(
        new Set(value.contextKeys.filter((key) => Boolean(key))),
      ).sort(),
      clarificationNote: value.clarificationNote.trim(),
    }))
    .sort((a, b) => a.questionKey.localeCompare(b.questionKey));
}

export function howYouWorkStateKey(values: WorkingStyleAnswerValue[]) {
  return JSON.stringify(normalizeWorkingStyleAnswers(values));
}

export function isVariesOption(
  questionKey: string,
  optionKey: string,
  options: WorkingStyleQuestionOptionRow[],
) {
  return Boolean(
    options.find(
      (option) =>
        option.question_key === questionKey &&
        option.option_key === optionKey &&
        option.is_varies,
    ),
  );
}

export function workingStyleQuestionCount(
  questions: WorkingStyleQuestionRow[],
) {
  return questions.filter(isApplicableWorkingStyleQuestion).length;
}

export function isApplicableWorkingStyleQuestion(
  question: WorkingStyleQuestionRow,
) {
  return (
    question.questionnaire_version === WORKING_STYLE_QUESTIONNAIRE_VERSION &&
    question.active &&
    question.research_status_key !== "deprecated" &&
    question.service_type_key === null
  );
}

export function contextLabelMap(contextReasons: WorkingStyleContextReasonRow[]) {
  return new Map(contextReasons.map((reason) => [reason.key, reason.label]));
}
