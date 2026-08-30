import "server-only";

import type { Json, Database } from "../../../supabase/database.types";
import { createProfileImageSignedUrl } from "./admin-storage";
import { createServerSupabaseClient } from "./server";

type CounsellorProfileRow =
  Database["public"]["Views"]["v_counsellor_profiles_app"]["Row"];

type ProfileImageMetadata = {
  storage_path: string;
  alt_text?: Json;
  focal_x?: Json;
  focal_y?: Json;
};

function isRecord(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getProfileImageStoragePath(
  profileImage: CounsellorProfileRow["profile_image"],
) {
  if (!profileImage || !isRecord(profileImage)) {
    return null;
  }

  const metadata: ProfileImageMetadata = {
    storage_path: String(profileImage.storage_path ?? ""),
    alt_text: profileImage.alt_text,
    focal_x: profileImage.focal_x,
    focal_y: profileImage.focal_y,
  };

  return metadata.storage_path || null;
}

export async function smokeTestAminaProfileInfrastructure() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("v_counsellor_profiles_app")
    .select("*")
    .eq("slug", "amina-rahman-research")
    .maybeSingle();

  if (error) {
    throw error;
  }

  const profile: CounsellorProfileRow | null = data;
  const storagePath = profile
    ? getProfileImageStoragePath(profile.profile_image)
    : null;
  const signedImageUrl = storagePath
    ? await createProfileImageSignedUrl(storagePath)
    : null;

  return {
    displayName: profile?.display_name ?? null,
    hasProfile: profile !== null,
    signedImageUrl,
    slug: profile?.slug ?? null,
    storagePath,
  };
}
