import type {
  ServiceDeclarationClientGroupRow,
  ServiceDeclarationRow,
} from "./types";

export type WhoYouWorkWithDeclarationValue = {
  serviceTypeKey: string;
  clientGroupKeys: string[];
  clientGenderScopeKey: string;
  clientGenderScopeNote: string;
};

export type WhoYouWorkWithFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
  savedStateKey: string;
  values: {
    declarations: WhoYouWorkWithDeclarationValue[];
  };
};

export function buildWhoYouWorkWithInitialState({
  serviceDeclarationClientGroups,
  serviceDeclarations,
}: {
  serviceDeclarationClientGroups: ServiceDeclarationClientGroupRow[];
  serviceDeclarations: ServiceDeclarationRow[];
}): WhoYouWorkWithFormState {
  const declarations = serviceDeclarations.map((declaration) => ({
    serviceTypeKey: declaration.service_type_key,
    clientGroupKeys: serviceDeclarationClientGroups
      .filter((row) => row.service_type_key === declaration.service_type_key)
      .map((row) => row.client_group_key)
      .sort(),
    clientGenderScopeKey: declaration.client_gender_scope_key,
    clientGenderScopeNote: declaration.client_gender_scope_note ?? "",
  }));

  return {
    status: "idle",
    message: "",
    fieldErrors: {},
    savedStateKey: whoYouWorkWithStateKey(declarations),
    values: {
      declarations,
    },
  };
}

export function whoYouWorkWithStateKey(
  declarations: WhoYouWorkWithDeclarationValue[],
) {
  return JSON.stringify(
    declarations
      .map((declaration) => ({
        serviceTypeKey: declaration.serviceTypeKey,
        clientGroupKeys: [...declaration.clientGroupKeys].sort(),
        clientGenderScopeKey: declaration.clientGenderScopeKey,
        clientGenderScopeNote: declaration.clientGenderScopeNote,
      }))
      .sort((a, b) => a.serviceTypeKey.localeCompare(b.serviceTypeKey)),
  );
}
