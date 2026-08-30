import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../../supabase/database.types";

const PROFILE_IMAGES_BUCKET = "profile-images";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createSupabaseStorageAdminClient() {
  return createClient<Database>(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

export async function createProfileImageSignedUrl(
  storagePath: string,
  expiresInSeconds = 60 * 60,
) {
  const supabase = createSupabaseStorageAdminClient();
  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
