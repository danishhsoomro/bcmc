import { CounsellorResearchProfile } from "@/components/research/CounsellorResearchProfile";
import {
  aminaResearchProfile,
  assertAminaT1SharedBaselineParity,
  isNarrativeVariant,
  type NarrativeVariant,
} from "@/data/aminaResearchProfile";

if (process.env.NODE_ENV !== "production") {
  assertAminaT1SharedBaselineParity();
}

type AminaProfilePageProps = {
  searchParams: Promise<{ variant?: string | string[] }>;
};

export default async function AminaProfilePage({
  searchParams,
}: AminaProfilePageProps) {
  const params = await searchParams;
  const variantParam = Array.isArray(params.variant)
    ? params.variant[0]
    : params.variant;
  const narrativeVariant: NarrativeVariant = isNarrativeVariant(variantParam)
    ? variantParam
    : "long";

  return (
    <CounsellorResearchProfile
      counsellor={aminaResearchProfile}
      narrativeVariant={narrativeVariant}
    />
  );
}
